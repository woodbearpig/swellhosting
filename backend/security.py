"""
security.py — lightweight, dependency-free security helpers.

Contains:
  • Cloudflare Turnstile server-side verification (bot protection for forms/login)
  • Real client-IP extraction that is correct behind Cloudflare + nginx

No third-party SDKs are used (only `requests`, already a dependency). Turnstile
keys are read from the environment so nothing sensitive ever lives in code:
    TURNSTILE_SITE_KEY   — public, safe to expose to the browser
    TURNSTILE_SECRET_KEY — private, backend only (never logged or returned)
"""
import os
import ipaddress
import logging

import requests
from starlette.concurrency import run_in_threadpool

logger = logging.getLogger("swell")

TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


def turnstile_site_key() -> str:
    return (os.environ.get("TURNSTILE_SITE_KEY") or "").strip()


def turnstile_secret_key() -> str:
    return (os.environ.get("TURNSTILE_SECRET_KEY") or "").strip()


def turnstile_enabled() -> bool:
    """Protection is active only when BOTH keys are configured. If either is
    missing (e.g. a fresh install), verification is skipped gracefully so the
    site keeps working — it simply isn't bot-protected until keys are set."""
    return bool(turnstile_site_key() and turnstile_secret_key())


def client_ip(request) -> str | None:
    """Best-effort real visitor IP.

    Order: Cloudflare's `CF-Connecting-IP` (authoritative when traffic flows
    through Cloudflare) → first hop of `X-Forwarded-For` → the socket peer.
    The value is validated so a spoofed/garbage header can't poison anything.
    """
    hdr = request.headers
    cand = (hdr.get("cf-connecting-ip") or "").strip()
    if not cand:
        xff = hdr.get("x-forwarded-for") or ""
        cand = xff.split(",")[0].strip() if xff else ""
    if not cand and request.client:
        cand = request.client.host
    if not cand:
        return None
    try:
        ipaddress.ip_address(cand)
        return cand
    except ValueError:
        return None


async def verify_turnstile(token: str | None, request) -> bool:
    """Validate a Turnstile token with Cloudflare.

    Returns True when the request should be ALLOWED.

    Policy:
      • Not configured        → allow (feature effectively off).
      • Missing token         → reject (challenge wasn't completed).
      • Cloudflare says fail  → reject.
      • Cloudflare says ok    → allow.
      • siteverify UNREACHABLE (network/timeout) → allow (fail-open), so a
        Cloudflare outage can never lock out real customers or the owner.
    """
    if not turnstile_enabled():
        return True
    if not token:
        return False

    data = {"secret": turnstile_secret_key(), "response": token}
    ip = client_ip(request)
    if ip:
        data["remoteip"] = ip

    def _post():
        return requests.post(TURNSTILE_VERIFY_URL, data=data, timeout=8)

    try:
        resp = await run_in_threadpool(_post)
        result = resp.json()
    except Exception as exc:  # network error, timeout, bad JSON, etc.
        logger.warning("Turnstile siteverify unreachable (%s) — allowing request", type(exc).__name__)
        return True

    if not result.get("success"):
        # Log only the non-sensitive error codes — never the token or secret.
        logger.info("Turnstile verification failed: %s", result.get("error-codes"))
        return False
    return True
