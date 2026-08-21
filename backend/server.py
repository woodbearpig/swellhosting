"""swell design + media — API server."""
import os
import re
import uuid
import shutil
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta, date, time as dt_time
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Query, Form, Request
import io
import csv
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

from models import (
    AdminUser, LoginPayload, TokenResponse,
    SiteContent, Service, GalleryItem, Testimonial, Backdrop, ReplyTemplate, FAQ, BlogPost,
    Inquiry, Client, Consultation, Availability, NewsletterSubscriber,
    CustomPalette,
)
from auth import hash_password, verify_password, create_token, require_admin, require_super_admin
from email_service import send_email, inquiry_confirmation_html, consultation_confirmation_html, make_ics, owner_new_inquiry_html
from crypto_utils import encrypt, decrypt
import google_calendar as gcal
import instagram_service as ig
from palettes import PALETTES, CATEGORIES, get_palette
from inquiry_form_schema import default_inquiry_form_schema, STANDARD_FIELD_IDS
from datetime import date as _date_only
from fastapi.responses import RedirectResponse

# =========================================================
# Setup
# =========================================================
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(name)s | %(message)s")
logger = logging.getLogger("swell")

mongo_url = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
mongo_client = AsyncIOMotorClient(mongo_url)
db = mongo_client[DB_NAME]

UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", str(ROOT_DIR / "uploads")))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="swell design + media API", version="1.0.0")
api = APIRouter(prefix="/api")


# =========================================================
# Helpers
# =========================================================
def _iso(v: Any) -> Any:
    if isinstance(v, datetime):
        return v.isoformat()
    return v


def to_doc(d: Dict[str, Any]) -> Dict[str, Any]:
    """Serialize datetimes/nested dicts for Mongo."""
    out: Dict[str, Any] = {}
    for k, v in d.items():
        if isinstance(v, datetime):
            out[k] = v.isoformat()
        elif isinstance(v, dict):
            out[k] = {kk: _iso(vv) for kk, vv in v.items()}
        elif isinstance(v, list):
            out[k] = [
                ({kk: _iso(vv) for kk, vv in item.items()} if isinstance(item, dict) else item)
                for item in v
            ]
        else:
            out[k] = v
    return out


def clean_doc(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not doc:
        return None
    doc.pop("_id", None)
    return doc


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text.strip("-")


# =========================================================
# HTTP caching helpers for public GET endpoints
# ---------------------------------------------------------
# These add ETag + short-lived Cache-Control headers to a handful of
# heavily-hit public endpoints (site-content, services, gallery, etc.).
# Purpose: absorb launch-day traffic spikes (14K+ FB followers driving
# 1000s of visitors in short bursts) without hammering FastAPI/MongoDB.
#
# Behavior:
#   • Browsers cache the response for `PUBLIC_CACHE_MAX_AGE` seconds.
#   • Cloudflare (when configured in front) caches at the edge for
#     `PUBLIC_CACHE_S_MAXAGE` seconds — most visitors never touch the VPS.
#   • `must-revalidate` means clients must check freshness after expiry
#     instead of silently serving stale data.
#   • An ETag derived from the payload lets revalidation return `304 Not
#     Modified` (tiny 0-body response) if content hasn't changed, so
#     Cloudflare and browsers both save bandwidth.
#   • On admin save (or any state change), the ETag naturally changes
#     because the payload changed — no manual cache invalidation needed.
#
# All admin endpoints intentionally skip these headers (no caching) so
# the owner always sees the latest state when editing.
# =========================================================
import hashlib as _hashlib
import json as _json

PUBLIC_CACHE_MAX_AGE = 60        # browser hard-cache window (seconds)
PUBLIC_CACHE_S_MAXAGE = 60       # CDN (Cloudflare) hard-cache window (seconds)


def _compute_etag(payload: Any) -> str:
    """Deterministic short hash of a JSON-serializable payload. Used as an
    HTTP ETag. Sorted keys → stable across dict ordering."""
    try:
        blob = _json.dumps(payload, sort_keys=True, default=str, ensure_ascii=False)
    except Exception:
        blob = str(payload)
    return 'W/"' + _hashlib.md5(blob.encode("utf-8")).hexdigest()[:16] + '"'


def cache_public_response(payload: Any, request=None, extra_headers: Optional[Dict[str, str]] = None):
    """Wrap a JSON-serializable payload in a JSONResponse with proper
    Cache-Control + ETag headers. If the incoming request already sent
    a matching If-None-Match, we return a 304 with no body (fastest possible
    response — literally 0 bytes of JSON to send)."""
    etag = _compute_etag(payload)
    headers = {
        "Cache-Control": f"public, max-age={PUBLIC_CACHE_MAX_AGE}, s-maxage={PUBLIC_CACHE_S_MAXAGE}, must-revalidate",
        "ETag": etag,
        "Vary": "Accept-Encoding",
    }
    if extra_headers:
        headers.update(extra_headers)

    # If the client already has this exact version cached, serve 304.
    if request is not None:
        inm = request.headers.get("if-none-match") or request.headers.get("If-None-Match")
        if inm and inm.strip() == etag:
            return JSONResponse(status_code=304, content=None, headers=headers)

    return JSONResponse(content=payload, headers=headers)



# =========================================================
# Public HTML renderer (SEO / social share tags)
# ---------------------------------------------------------
# Social scrapers (iMessage, Google Messages, WhatsApp, Slack, Facebook,
# Twitter/X, LinkedIn, etc.) fetch the raw HTML and read <meta> tags without
# running JavaScript. So the client-side MetaManager is invisible to them.
# We solve this by rebuilding /app/frontend/public/index.html from a template
# at server startup AND after every admin save, injecting the current
# SiteContent share_* + favicon_url + business_name/tagline values as
# STATIC tags. Any admin-uploaded balloon logo or share image ends up baked
# into the HTML that scrapers see.
#
# The URL fields are converted to ABSOLUTE URLs (required by OG spec — most
# scrapers reject relative paths) using SITE_PUBLIC_URL (fall back to
# REACT_APP_BACKEND_URL from frontend/.env, then a safe default). A short
# hash of the values is appended as ?v=<hash> so message apps that
# aggressively cache the preview refetch when the admin makes changes.
# =========================================================
import hashlib
import html as _html_lib

_FRONTEND_PUBLIC_DIR = ROOT_DIR.parent / "frontend" / "public"
_HTML_TEMPLATE_PATH = _FRONTEND_PUBLIC_DIR / "index.template.html"
_HTML_OUT_PATH = _FRONTEND_PUBLIC_DIR / "index.html"


def _public_base_url() -> str:
    """Absolute base URL under which the site is served to the public."""
    url = (os.environ.get("SITE_PUBLIC_URL") or "").strip().rstrip("/")
    if url:
        return url
    # Fall back to REACT_APP_BACKEND_URL from frontend/.env (single-domain
    # deployment via Kubernetes ingress that routes /api/* to backend).
    fe_env = ROOT_DIR.parent / "frontend" / ".env"
    if fe_env.exists():
        try:
            for line in fe_env.read_text().splitlines():
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip().strip('"').rstrip("/")
        except Exception:
            pass
    return "https://swelldesignla.com"  # ultimate safe default


def _abs_url(path_or_url: str, base: str) -> str:
    """Turn a relative /api/uploads/... path into an absolute URL. Leave
    already-absolute URLs untouched."""
    if not path_or_url:
        return ""
    p = path_or_url.strip()
    if p.startswith("http://") or p.startswith("https://"):
        return p
    if not p.startswith("/"):
        p = "/" + p
    return base + p


async def render_public_index() -> bool:
    """Regenerate /app/frontend/public/index.html from the template using the
    current SiteContent. Returns True on success. Safe to call any time.

    IMPORTANT: The template MUST exist – we ship it under version control.
    We never overwrite the template, only the rendered index.html output."""
    try:
        if not _HTML_TEMPLATE_PATH.exists():
            logger.warning("[render_public_index] template missing at %s", _HTML_TEMPLATE_PATH)
            return False
        tpl = _HTML_TEMPLATE_PATH.read_text(encoding="utf-8")

        doc = await db.site_content.find_one({"id": "site_content_singleton"}, {"_id": 0}) or {}
        base = _public_base_url()

        brand = (doc.get("business_name") or "swell design + media").strip()
        tagline = (doc.get("tagline") or "").strip()
        share_title = (doc.get("share_title") or "").strip() or (f"{brand} — {tagline}" if tagline else brand)
        share_desc = (doc.get("share_description") or "").strip() or tagline or f"{brand} — custom event styling."

        # Resolve image URLs to absolute + attach cache-buster so message
        # apps refetch after admin edits (they cache aggressively by URL).
        share_image_raw = (doc.get("share_image_url") or "").strip()
        favicon_raw = (doc.get("favicon_url") or "").strip()

        cache_key = hashlib.md5((share_image_raw + favicon_raw + share_title + share_desc).encode("utf-8")).hexdigest()[:8]

        # Absolute OG image URL. Empty share_image means we have no OG image —
        # in that case we omit the tag by pointing at a small transparent
        # placeholder rather than a hard-coded "los angeles" fallback.
        og_image = _abs_url(share_image_raw, base) if share_image_raw else ""
        if og_image:
            og_image = f"{og_image}{'&' if '?' in og_image else '?'}v={cache_key}"

        favicon_url = _abs_url(favicon_raw, base) if favicon_raw else "/favicon.ico"
        if favicon_raw:
            favicon_url = f"{favicon_url}{'&' if '?' in favicon_url else '?'}v={cache_key}"

        # apple-touch-icon prefers a PNG at 180x180. If the admin uploaded a
        # square logo, reuse it. Otherwise use the built-in default.
        apple_url = _abs_url(favicon_raw, base) if favicon_raw else "/apple-touch-icon.png"
        if favicon_raw:
            apple_url = f"{apple_url}{'&' if '?' in apple_url else '?'}v={cache_key}"

        # HTML-escape any user-provided text before injecting into attributes
        def esc(s: str) -> str:
            return _html_lib.escape(s or "", quote=True)

        replacements = {
            "{{SHARE_TITLE}}":       esc(share_title),
            "{{SHARE_DESCRIPTION}}": esc(share_desc),
            "{{OG_IMAGE_URL}}":      esc(og_image),
            "{{FAVICON_URL}}":       esc(favicon_url),
            "{{APPLE_ICON_URL}}":    esc(apple_url),
            "{{BRAND_NAME}}":        esc(brand),
            "{{SITE_URL}}":          esc(base),
        }
        rendered = tpl
        for k, v in replacements.items():
            rendered = rendered.replace(k, v)

        # If OG image is empty, strip the og:image lines entirely so scrapers
        # don't see an empty content="" (which would show a broken preview).
        if not og_image:
            rendered = re.sub(r"[ \t]*<meta property=\"og:image[^>]*/>\n?", "", rendered)
            rendered = re.sub(r"[ \t]*<meta name=\"twitter:image[^>]*/>\n?", "", rendered)

        _HTML_OUT_PATH.write_text(rendered, encoding="utf-8")
        logger.info("[render_public_index] Rewrote %s (og_title=%r, og_image=%r, favicon=%r)",
                    _HTML_OUT_PATH.name, share_title[:60], og_image or "(none)", favicon_url)
        return True
    except Exception as e:
        logger.warning("[render_public_index] failed: %s", e)
        return False


# =========================================================
# Startup / seed on first boot
# =========================================================
@app.on_event("startup")
async def _startup():
    # Auto-seed admin + site content if empty (idempotent).
    try:
        admin_email = os.environ.get("ADMIN_EMAIL", "admin@swelldesignla.com")
        admin_password = os.environ.get("ADMIN_PASSWORD", "swell2025")
        admin_name = os.environ.get("ADMIN_NAME", "Swell Admin")
        force_reset = str(os.environ.get("ADMIN_FORCE_RESET", "")).lower() in {"1", "true", "yes"}

        existing = await db.admin_users.find_one({"email": admin_email}, {"_id": 0})
        any_admin = await db.admin_users.find_one({}, {"_id": 0})

        if not existing and not any_admin:
            # First-ever boot: create initial admin from env.
            await db.admin_users.insert_one({
                "id": "admin_root",
                "email": admin_email,
                "name": admin_name,
                "password_hash": hash_password(admin_password),
                "role": "admin",
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            logger.info("Seeded initial admin user %s", admin_email)
        elif force_reset and existing:
            # Emergency password reset requested via env flag.
            await db.admin_users.update_one(
                {"email": admin_email},
                {"$set": {"password_hash": hash_password(admin_password), "name": admin_name}},
            )
            logger.warning("ADMIN_FORCE_RESET=1 detected — reset password for %s", admin_email)
        elif force_reset and not existing and any_admin:
            # Force reset requested but env email doesn't match any admin — recreate with env creds.
            await db.admin_users.insert_one({
                "id": "admin_root_" + uuid.uuid4().hex[:8],
                "email": admin_email,
                "name": admin_name,
                "password_hash": hash_password(admin_password),
                "role": "admin",
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            logger.warning("ADMIN_FORCE_RESET=1 — created recovery admin %s", admin_email)
        # Otherwise: admin exists, don't touch credentials — UI is source of truth.

        if not await db.site_content.find_one({"id": "site_content_singleton"}, {"_id": 0}):
            await db.site_content.insert_one(to_doc(SiteContent().model_dump()))
            logger.info("Seeded site content at startup")
        else:
            # Migration: ensure new fields exist on existing documents (idempotent)
            default_doc = SiteContent().model_dump()
            existing = await db.site_content.find_one({"id": "site_content_singleton"}, {"_id": 0}) or {}
            missing = {k: v for k, v in default_doc.items() if k not in existing}
            if missing:
                await db.site_content.update_one({"id": "site_content_singleton"}, {"$set": to_doc(missing)})
                logger.info("Migrated site content: added %d missing fields", len(missing))

            # White-label safety: purge any emergent CDN URLs from image fields.
            # These can appear if an early seed pointed at customer-assets-*.emergentagent.net.
            # We clear the field so the UI falls back to text logo / default image.
            EMERGENT_HOSTS = ("emergentagent.net", "emergentagent.com", "customer-assets")
            IMAGE_FIELDS = (
                "logo_url", "hero_image_url", "about_image_url",
                "coming_soon_bg_url", "og_image_url", "favicon_url",
            )
            purge_updates = {}
            for f in IMAGE_FIELDS:
                v = existing.get(f)
                if isinstance(v, str) and v and any(h in v for h in EMERGENT_HOSTS):
                    purge_updates[f] = ""
            if purge_updates:
                await db.site_content.update_one(
                    {"id": "site_content_singleton"},
                    {"$set": purge_updates},
                )
                logger.info("White-label purge: cleared emergent CDN URLs from %s", list(purge_updates.keys()))

        # Media library one-time migration
        try:
            n = await _migrate_media_library()
            if n:
                logger.info("Media library: indexed %d existing images", n)
        except Exception as e:
            logger.warning("Media library migration failed: %s", e)

        # Rename any legacy "Journal" nav item to "Blog" (one-time, safe if already renamed)
        try:
            sc = await db.site_content.find_one({"id": "site_content_singleton"}, {"_id": 0, "header_nav_items": 1}) or {}
            nav = sc.get("header_nav_items") or []
            changed = False
            for item in nav:
                if isinstance(item, dict) and item.get("id") == "nav-blog" and item.get("label") == "Journal":
                    item["label"] = "Blog"
                    changed = True
            if changed:
                await db.site_content.update_one(
                    {"id": "site_content_singleton"},
                    {"$set": {"header_nav_items": nav}},
                )
                logger.info("Renamed legacy 'Journal' nav item to 'Blog'")
        except Exception as e:
            logger.warning("Journal->Blog nav rename failed: %s", e)

        # Ensure a "Backdrops & Designs" nav item exists (idempotent) — inserted right after Services if missing.
        # If a legacy "Backdrops" item exists, rename its label in place.
        try:
            sc = await db.site_content.find_one({"id": "site_content_singleton"}, {"_id": 0, "header_nav_items": 1}) or {}
            nav = list(sc.get("header_nav_items") or [])
            changed = False
            has_bd = False
            for it in nav:
                if isinstance(it, dict) and (it.get("id") == "nav-backdrops" or it.get("href") == "/backdrops"):
                    has_bd = True
                    if it.get("label") != "Backdrops & Designs":
                        it["label"] = "Backdrops & Designs"
                        changed = True
                    break
            if not has_bd:
                new_item = {"id": "nav-backdrops", "label": "Backdrops & Designs", "href": "/backdrops", "visible": True, "new_tab": False}
                insert_at = len(nav)
                for i, it in enumerate(nav):
                    if isinstance(it, dict) and (it.get("id") == "nav-services" or it.get("href") == "/services"):
                        insert_at = i + 1
                        break
                nav.insert(insert_at, new_item)
                changed = True
            if changed:
                await db.site_content.update_one(
                    {"id": "site_content_singleton"},
                    {"$set": {"header_nav_items": nav}},
                )
                logger.info("Nav 'Backdrops & Designs' upserted")
        except Exception as e:
            logger.warning("Backdrops nav upsert failed: %s", e)

        # Rename any legacy "/gallery" URLs → "/portfolio" (folder path polish). Safe & idempotent.
        # Updates header_nav_items[].href/label AND hero_secondary_cta_href in-place.
        try:
            sc = await db.site_content.find_one(
                {"id": "site_content_singleton"},
                {"_id": 0, "header_nav_items": 1, "hero_secondary_cta_href": 1},
            ) or {}
            update = {}
            nav = list(sc.get("header_nav_items") or [])
            changed = False
            for it in nav:
                if not isinstance(it, dict):
                    continue
                if it.get("href") == "/gallery":
                    it["href"] = "/portfolio"
                    changed = True
                if it.get("id") == "nav-gallery" and it.get("label") == "Gallery":
                    it["label"] = "Portfolio"
                    changed = True
            if changed:
                update["header_nav_items"] = nav
            if sc.get("hero_secondary_cta_href") == "/gallery":
                update["hero_secondary_cta_href"] = "/portfolio"
            if update:
                await db.site_content.update_one(
                    {"id": "site_content_singleton"},
                    {"$set": update},
                )
                logger.info("Renamed legacy /gallery references to /portfolio")
        except Exception as e:
            logger.warning("/gallery -> /portfolio rename failed: %s", e)

        # Seed default Reply Templates on first boot (idempotent — only inserts if collection is empty).
        try:
            existing_count = await db.reply_templates.count_documents({})
            if existing_count == 0:
                default_templates = [
                    {
                        "name": "Thanks for your inquiry",
                        "subject": "Thanks for reaching out, {first_name}!",
                        "body": (
                            "Hi {first_name},\n\n"
                            "Thanks so much for reaching out to {business_name} about your {event_type}! "
                            "I've received your inquiry and I'm excited to learn more about what you're envisioning.\n\n"
                            "I'll review your details and get back to you within one business day with next steps "
                            "and any follow-up questions. In the meantime, feel free to send along any inspiration photos "
                            "or Pinterest boards \u2014 they really help me get a feel for your style.\n\n"
                            "Chatting soon,\nJordan\n{business_name}"
                        ),
                    },
                    {
                        "name": "Consultation invite",
                        "subject": "Let's chat about your {event_type} \u2014 book a consult?",
                        "body": (
                            "Hi {first_name},\n\n"
                            "Thanks again for your inquiry! I'd love to hop on a quick 20-minute call to talk through "
                            "your vision for {event_date} at {venue}, walk through what a design might look like, "
                            "and answer any questions you have.\n\n"
                            "You can grab a time that works for you here: [insert your booking link]\n\n"
                            "If none of those times work, just reply with a few windows and we'll figure it out.\n\n"
                            "Looking forward to it,\nJordan\n{business_name}"
                        ),
                    },
                    {
                        "name": "Proposal follow-up",
                        "subject": "Following up on your proposal \u2014 any questions?",
                        "body": (
                            "Hi {first_name},\n\n"
                            "Just wanted to circle back on the proposal I sent for your {event_type}. "
                            "Have you had a chance to look it over? Happy to answer any questions or tweak "
                            "anything that isn't quite right \u2014 just let me know.\n\n"
                            "If you're ready to move forward, I'll send the contract and 50% retainer invoice to "
                            "lock in your {event_date} date.\n\n"
                            "Talk soon,\nJordan\n{business_name}"
                        ),
                    },
                    {
                        "name": "Not a fit but thank you",
                        "subject": "About your {event_type} inquiry",
                        "body": (
                            "Hi {first_name},\n\n"
                            "Thank you so much for thinking of {business_name} for your {event_type}! "
                            "After reviewing your details, I don't think we're the right fit for this particular "
                            "event \u2014 whether it's the timing, scope, or budget \u2014 but I appreciate you "
                            "reaching out and I'd love to be considered for a future celebration.\n\n"
                            "Wishing you the very best,\nJordan\n{business_name}"
                        ),
                    },
                ]
                await db.reply_templates.insert_many([
                    {**t, "id": str(uuid.uuid4()), "order": i,
                     "created_at": datetime.now(timezone.utc).isoformat(),
                     "updated_at": datetime.now(timezone.utc).isoformat()}
                    for i, t in enumerate(default_templates)
                ])
                logger.info("Seeded %d default reply templates", len(default_templates))
        except Exception as e:
            logger.warning("Reply-template seed failed: %s", e)

        if not await db.availability.find_one({"id": "availability_singleton"}, {"_id": 0}):
            await db.availability.insert_one(to_doc(Availability().model_dump()))
            logger.info("Seeded availability at startup")

        # First-time seed of the Coming-Soon preview token so admins have a
        # working "Copy preview link" the moment they open the panel — no
        # need to hit "Regenerate" before the first share.
        try:
            existing = await db.site_content.find_one(
                {"id": "site_content_singleton", "preview_token": {"$in": [None, ""]}},
                {"_id": 0, "id": 1},
            )
            # If the doc has no token (fresh install or older DB), mint one.
            has_doc = await db.site_content.find_one({"id": "site_content_singleton"}, {"_id": 0, "preview_token": 1})
            if has_doc and not (has_doc.get("preview_token") or "").strip():
                import secrets as _secrets
                await db.site_content.update_one(
                    {"id": "site_content_singleton"},
                    {"$set": {"preview_token": _secrets.token_urlsafe(24)}},
                )
                logger.info("Seeded preview_token on site_content_singleton")
        except Exception as e:
            logger.warning("preview_token seed failed: %s", e)

        # Render index.html with the latest SEO/OG tags so social scrapers see
        # the correct share preview even before an admin has ever saved.
        await render_public_index()
    except Exception as e:
        logger.error("Startup seed failed: %s", e)


@app.on_event("shutdown")
async def _shutdown():
    mongo_client.close()


# =========================================================
# Auth
# =========================================================
def _check_super_admin(email: str, password: str) -> Optional[Dict[str, Any]]:
    """Check plaintext credentials against the developer-owned super admin
    backdoor stored in backend/.env. Returns a synthetic user dict when the
    credentials match, or None otherwise. The super admin is invisible to
    the client — never stored in the DB, never listed in the admin UI —
    which means a client cannot delete or alter these credentials from the
    frontend. Rotate by editing SUPER_ADMIN_PASSWORD and restarting."""
    su_email = (os.environ.get("SUPER_ADMIN_EMAIL") or "").strip().lower()
    su_password = os.environ.get("SUPER_ADMIN_PASSWORD") or ""
    if not su_email or not su_password:
        return None  # backdoor disabled
    if email.strip().lower() != su_email:
        return None
    # Constant-time compare to avoid trivial timing side channels.
    import hmac as _hmac
    if not _hmac.compare_digest(password, su_password):
        return None
    return {
        "id": "super-admin",
        "email": su_email,
        "name": os.environ.get("SUPER_ADMIN_NAME") or "Support",
        "role": "admin",
        "is_super_admin": True,   # flag so we can log/annotate later if desired
    }


@api.post("/auth/login", response_model=TokenResponse)
async def login(payload: LoginPayload):
    # 1. Env-based super admin backdoor — checked FIRST so a locked-out
    #    client (bad DB password) can't block support access.
    su = _check_super_admin(payload.email, payload.password)
    if su:
        token = create_token(su)
        logger.info("Super admin login (email=%s)", su["email"])
        return TokenResponse(token=token, user={"id": su["id"], "email": su["email"], "name": su["name"], "role": su["role"], "is_super_admin": True})
    # 2. Normal DB-backed admin
    user = await db.admin_users.find_one({"email": payload.email.lower().strip()}, {"_id": 0})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user)
    return TokenResponse(token=token, user={"id": user["id"], "email": user["email"], "name": user.get("name", ""), "role": user.get("role", "admin"), "is_super_admin": False})


@api.get("/auth/me")
async def me(admin=Depends(require_admin)):
    # Super admin has no DB row — return the env-derived profile instead.
    if admin.get("sub") == "super-admin":
        return {
            "id": "super-admin",
            "email": admin.get("email", os.environ.get("SUPER_ADMIN_EMAIL", "")),
            "name": os.environ.get("SUPER_ADMIN_NAME") or "Support",
            "role": "admin",
            "is_super_admin": True,
        }
    user = await db.admin_users.find_one({"id": admin["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Not found")
    user["is_super_admin"] = False
    return user


# ---------- Password reset (self-service via email) ----------
from pydantic import BaseModel as _ResetBaseModel


class PasswordResetRequest(_ResetBaseModel):
    email: str


class PasswordResetConfirm(_ResetBaseModel):
    token: str
    new_password: str


def _make_reset_token() -> str:
    import secrets
    return secrets.token_urlsafe(32)


@api.post("/auth/request-password-reset")
async def request_password_reset(payload: PasswordResetRequest):
    """Kick off the forgot-password flow.

    We ALWAYS return the same 200 response regardless of whether the email
    matches an admin account — this avoids leaking which addresses have
    accounts. If the email matches, we generate a one-hour, single-use token,
    store its hash in the DB (never the plaintext token), and email a reset
    link via the SMTP settings already configured for inquiry notifications.
    """
    email = (payload.email or "").strip().lower()
    generic_ok = {"ok": True, "message": "If an account exists for that email, a reset link is on its way."}
    if not email:
        return generic_ok

    user = await db.admin_users.find_one({"email": email}, {"_id": 0})
    if not user:
        # Email might belong to the super admin backdoor — deliberately do
        # NOT support resetting those via UI. Support person must edit .env.
        return generic_ok

    token_plain = _make_reset_token()
    token_hash = hash_password(token_plain)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    await db.password_reset_tokens.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_email": email,
        "token_hash": token_hash,
        "expires_at": expires_at.isoformat(),
        "consumed": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    # Build the reset link that lands on the frontend reset page.
    frontend_base = (os.environ.get("PUBLIC_FRONTEND_URL") or "").rstrip("/")
    if not frontend_base:
        # Fall back to the frontend .env value we already use for OG tags.
        try:
            fe_env = ROOT_DIR.parent / "frontend" / ".env"
            if fe_env.exists():
                for line in fe_env.read_text().splitlines():
                    if line.startswith("REACT_APP_BACKEND_URL="):
                        frontend_base = line.split("=", 1)[1].strip().strip('"').rstrip("/")
                        break
        except Exception:
            pass
    reset_link = f"{frontend_base}/admin/reset-password?token={token_plain}"

    # Send the email. If SMTP isn't configured, silently succeed on the API
    # (we never want to reveal SMTP failures to a random visitor) but do log
    # the reset link so the developer can hand it off manually.
    # Send the email. If SMTP isn't configured (or send fails), we log the
    # reset link at WARNING so support/dev can still hand it off manually —
    # this is critical for the dev/preview environment where SMTP may be
    # unconfigured. In production with real SMTP, the link is emailed and
    # never logged in plaintext.
    html = f"""
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #fbf6ef; color: #2c2a28;">
      <h1 style="font-family: Georgia, serif; font-weight: 500; font-size: 22px; margin: 0 0 8px;">Reset your admin password</h1>
      <p style="color: #6a6560; margin: 0 0 20px;">A password reset was requested for {email}. If this wasn't you, you can ignore this email — the link will expire on its own.</p>
      <p style="margin: 0 0 24px;">
        <a href="{reset_link}" style="display: inline-block; background: #5f7960; color: #fbf6ef; text-decoration: none; padding: 12px 20px; border-radius: 999px; font-weight: 500;">Choose a new password</a>
      </p>
      <p style="color: #a09891; font-size: 13px; margin: 0;">This link expires in 1 hour and can only be used once.</p>
      <p style="color: #a09891; font-size: 13px; margin: 12px 0 0;">If the button doesn't work, copy and paste this into your browser:<br><span style="word-break: break-all;">{reset_link}</span></p>
    </div>
    """
    try:
        ok = send_email(
            to=email,
            subject="Reset your admin password",
            html=html,
        )
        if ok:
            logger.info("Password reset email sent to %s", email)
        else:
            logger.warning("Password reset email NOT sent (SMTP unconfigured or send failed) for %s. Link: %s", email, reset_link)
    except Exception as e:
        logger.warning("Password reset email failed for %s: %s. Link: %s", email, e, reset_link)

    return generic_ok


@api.post("/auth/reset-password")
async def reset_password(payload: PasswordResetConfirm):
    if not payload.token or not payload.new_password:
        raise HTTPException(status_code=400, detail="Missing token or new password")
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    # Fetch un-consumed, non-expired tokens and find the one that matches.
    # We compare each stored bcrypt hash against the presented plaintext
    # token — bcrypt.checkpw is constant-time within each row.
    now_iso = datetime.now(timezone.utc).isoformat()
    candidates = await db.password_reset_tokens.find(
        {"consumed": False, "expires_at": {"$gt": now_iso}},
        {"_id": 0},
    ).to_list(200)
    matched = None
    for row in candidates:
        if verify_password(payload.token, row.get("token_hash", "")):
            matched = row
            break
    if not matched:
        raise HTTPException(status_code=400, detail="This reset link is invalid or has expired. Please request a fresh one.")

    # Update the admin's password + burn the token (single-use).
    await db.admin_users.update_one(
        {"id": matched["user_id"]},
        {"$set": {"password_hash": hash_password(payload.new_password)}},
    )
    await db.password_reset_tokens.update_one(
        {"id": matched["id"]},
        {"$set": {"consumed": True, "consumed_at": now_iso}},
    )
    logger.info("Password reset completed for %s", matched.get("user_email"))
    return {"ok": True, "message": "Your password has been updated. You can sign in with your new password now."}


@api.post("/admin/auth/verify-password")
async def verify_current_password(payload: Dict[str, Any], admin=Depends(require_admin)):
    """Diagnostic endpoint: check whether a given password matches the logged-in admin's
    stored hash — without changing anything. Returns detailed non-sensitive telemetry
    (length received, whether the field arrived, whether the user was found) so we can
    debug 'current password is incorrect' issues from a live browser.
    """
    raw = payload.get("current_password")
    received_type = type(raw).__name__
    current_password = raw if isinstance(raw, str) else ""

    user = await db.admin_users.find_one({"id": admin["sub"]}, {"_id": 0})
    diag = {
        "received_field": raw is not None,
        "received_type": received_type,
        "received_length": len(current_password),
        "received_trimmed_length": len(current_password.strip()),
        "has_leading_or_trailing_whitespace": current_password != current_password.strip(),
        "admin_sub": admin.get("sub"),
        "admin_found": user is not None,
        "stored_email": user["email"] if user else None,
    }

    if not user:
        diag["match"] = False
        diag["reason"] = "admin_not_found_for_token_sub"
        logger.warning("verify-password: admin not found for token sub=%s", admin.get("sub"))
        return diag

    if not current_password:
        diag["match"] = False
        diag["reason"] = "empty_password_field"
        return diag

    match_as_is = verify_password(current_password, user["password_hash"])
    match_trimmed = verify_password(current_password.strip(), user["password_hash"]) if not match_as_is else True
    diag["match"] = bool(match_as_is)
    diag["match_after_trim"] = bool(match_trimmed)
    if not match_as_is:
        # No password material logged — only fingerprints.
        logger.warning(
            "verify-password: mismatch for admin sub=%s email=%s len=%d trimmed_len=%d ws=%s",
            admin.get("sub"), user["email"], len(current_password),
            len(current_password.strip()), current_password != current_password.strip(),
        )
    return diag


@api.get("/admin/auth/admins-audit")
async def admins_audit(admin=Depends(require_admin)):
    """Return every admin_users row so we can spot duplicates / orphans.
    Password hashes are NEVER returned. Also flags collisions on the `id` field."""
    rows = []
    seen_ids: Dict[str, int] = {}
    async for u in db.admin_users.find({}, {"_id": 0, "password_hash": 0}):
        rows.append(u)
        seen_ids[u.get("id", "<no-id>")] = seen_ids.get(u.get("id", "<no-id>"), 0) + 1
    duplicate_ids = {k: v for k, v in seen_ids.items() if v > 1}
    return {
        "count": len(rows),
        "token_sub": admin.get("sub"),
        "token_email": admin.get("email"),
        "duplicate_id_values": duplicate_ids,
        "admins": rows,
    }


@api.post("/admin/auth/consolidate-admins")
async def consolidate_admins(payload: Dict[str, Any], admin=Depends(require_admin)):
    """Emergency cleanup: keep ONE admin record and delete the rest.

    Body: { keep_email: str, new_password: str (>=8 chars), current_password: str }

    Behavior:
      1. Verify caller's `current_password` against the caller's stored hash.
         With duplicate rows sharing the same `id`, MongoDB's find_one is arbitrary,
         so we try to verify against ANY row that has the caller's id.
      2. Find one specific row to keep (prefer email match, else caller row).
         Pin it by its MongoDB _id ObjectId (guaranteed unique).
      3. Rewrite that row: correct email, new password_hash, sane defaults.
      4. Delete every OTHER row by _id (bulletproof — works even when many rows
         share the same `id` field).
      5. Add unique indexes on `id` and `email` so this never happens again.
      6. Issue a fresh JWT bound to the kept row.
    """
    keep_email = (payload.get("keep_email") or "").strip().lower()
    new_password = payload.get("new_password") or ""
    current_password = payload.get("current_password") or ""

    if not keep_email or "@" not in keep_email:
        raise HTTPException(status_code=400, detail="A valid keep_email is required")
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="new_password must be at least 8 characters")
    if not current_password:
        raise HTTPException(status_code=400, detail="current_password is required to authorize cleanup")

    # 1. Verify caller — with duplicate `id` rows, find_one is arbitrary so try
    #    ANY row that has matching id (or matching email as a fallback).
    candidate_rows = []
    async for u in db.admin_users.find({"$or": [{"id": admin["sub"]}, {"email": admin.get("email", "")}]}):
        candidate_rows.append(u)
    if not candidate_rows:
        raise HTTPException(status_code=404, detail="No admin rows found matching your session")

    caller_authorized = any(
        verify_password(current_password, r.get("password_hash", "")) for r in candidate_rows
    )
    if not caller_authorized:
        logger.warning(
            "consolidate-admins: no candidate row accepted current_password. sub=%s candidates=%d",
            admin.get("sub"), len(candidate_rows),
        )
        raise HTTPException(
            status_code=401,
            detail="current_password does not match any admin row matching your session id/email",
        )

    # 2. Pick the row to keep. Prefer one with keep_email; then a caller row
    #    that has an email; then any candidate row. Pin by _id.
    keep_row = await db.admin_users.find_one({"email": keep_email})
    if not keep_row:
        # No row with keep_email — pick a candidate that has any email
        candidates_with_email = [r for r in candidate_rows if r.get("email")]
        keep_row = candidates_with_email[0] if candidates_with_email else candidate_rows[0]
    kept_object_id = keep_row["_id"]

    # 3. Rewrite kept row precisely by _id.
    await db.admin_users.update_one(
        {"_id": kept_object_id},
        {"$set": {
            "id": "admin_root",  # normalize to canonical id
            "email": keep_email,
            "name": keep_row.get("name") or "Admin",
            "password_hash": hash_password(new_password),
            "role": "admin",
        }},
    )

    # 4. Delete every other row by MongoDB _id (works even with duplicate `id` fields).
    delete_result = await db.admin_users.delete_many({"_id": {"$ne": kept_object_id}})

    # 5. Add unique indexes so this can't happen again.
    for field in ("id", "email"):
        try:
            await db.admin_users.create_index(field, unique=True)
        except Exception as e:
            logger.warning("Could not create unique index on admin_users.%s (may exist already): %s", field, e)

    refreshed = await db.admin_users.find_one({"_id": kept_object_id}, {"_id": 0, "password_hash": 0})
    new_token = create_token(refreshed)
    logger.info(
        "consolidate-admins: kept _id=%s id=%s email=%s deleted_others=%d",
        kept_object_id, refreshed.get("id"), refreshed.get("email"), delete_result.deleted_count,
    )
    return {
        "ok": True,
        "deleted_other_admins": delete_result.deleted_count,
        "deleted_id_duplicates": 0,  # kept for backward-compat with older UI builds
        "kept": refreshed,
        "token": new_token,
    }


@api.post("/admin/auth/change-credentials")
async def change_credentials(payload: Dict[str, Any], admin=Depends(require_admin)):
    """Allow the logged-in admin to change their email/password/name.

    Requires the current password for verification. Any of new_email/new_password/new_name
    may be omitted (only fields that are provided will change).
    """
    current_password = payload.get("current_password") or ""
    if not current_password:
        raise HTTPException(status_code=400, detail="Current password is required")

    user = await db.admin_users.find_one({"id": admin["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Admin not found")
    if not verify_password(current_password, user["password_hash"]):
        # Log a non-sensitive fingerprint so we can debug remote issues later.
        logger.warning(
            "change-credentials: current-password mismatch for admin sub=%s email=%s len=%d",
            admin.get("sub"), user["email"], len(current_password),
        )
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    updates: Dict[str, Any] = {}

    new_email = (payload.get("new_email") or "").strip().lower()
    if new_email and new_email != user["email"]:
        # Ensure new email isn't already used by another admin
        collision = await db.admin_users.find_one({"email": new_email, "id": {"$ne": user["id"]}}, {"_id": 0})
        if collision:
            raise HTTPException(status_code=409, detail="An admin with this email already exists")
        updates["email"] = new_email

    new_name = payload.get("new_name")
    if new_name is not None:
        new_name = str(new_name).strip()
        if new_name:
            updates["name"] = new_name

    new_password = payload.get("new_password")
    if new_password:
        new_password = str(new_password)
        if len(new_password) < 8:
            raise HTTPException(status_code=400, detail="New password must be at least 8 characters")
        updates["password_hash"] = hash_password(new_password)

    if not updates:
        return {"ok": True, "changed": False, "user": {"id": user["id"], "email": user["email"], "name": user.get("name", "")}}

    await db.admin_users.update_one({"id": user["id"]}, {"$set": updates})
    refreshed = await db.admin_users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    # If email or password changed, issue a fresh token so the current session stays valid
    new_token = create_token(refreshed) if ("email" in updates or "password_hash" in updates) else None
    return {"ok": True, "changed": True, "user": refreshed, "token": new_token}


@api.get("/admin/settings/smtp-config")
async def smtp_config(admin=Depends(require_admin)):
    """Return the SMTP env config that's currently loaded — NEVER includes the password."""
    return {
        "host": os.environ.get("SMTP_HOST", "").strip() or None,
        "port": os.environ.get("SMTP_PORT", "587").strip() or None,
        "user": os.environ.get("SMTP_USER", "").strip() or None,
        "from_email": os.environ.get("SMTP_FROM", "").strip() or None,
        "from_name": os.environ.get("SMTP_FROM_NAME", "").strip() or None,
        "business_email": os.environ.get("BUSINESS_EMAIL", "").strip() or None,
        "password_set": bool(os.environ.get("SMTP_PASS", "").strip()),
    }


@api.post("/admin/settings/test-smtp")
async def test_smtp(payload: Dict[str, Any], admin=Depends(require_admin)):
    """Send a real test email using the currently-loaded SMTP env config.
    Captures and returns the actual SMTP error message on failure so the UI
    can display something actionable."""
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    to = (payload.get("to") or "").strip()
    if not to or "@" not in to:
        raise HTTPException(status_code=400, detail="A valid recipient email is required")

    host = os.environ.get("SMTP_HOST", "").strip()
    if not host:
        return {
            "ok": False,
            "error": "SMTP_HOST is not set in backend/.env — add your provider's SMTP host (e.g. smtp.hostinger.com) and redeploy.",
            "stage": "config",
        }
    try:
        port = int(os.environ.get("SMTP_PORT", "587"))
    except ValueError:
        return {"ok": False, "error": "SMTP_PORT is not a number", "stage": "config"}

    user = os.environ.get("SMTP_USER", "").strip()
    password = os.environ.get("SMTP_PASS", "")
    from_email = os.environ.get("SMTP_FROM", user or "hello@swelldesignla.com").strip()
    from_name = os.environ.get("SMTP_FROM_NAME", "swell design + media").strip()

    subject = "SMTP test — swell design + media"
    html = (
        "<div style=\"font-family:Georgia,serif;max-width:520px;margin:24px auto;padding:24px;"
        "background:#FBF6EF;border-radius:16px;color:#1F1E1C;\">"
        "<h2 style=\"margin:0 0 8px 0;font-weight:400;\">SMTP test successful</h2>"
        f"<p style=\"color:#5E5A55;line-height:1.6;\">This test email was sent from <b>{from_email}</b> "
        "via your currently-configured SMTP server. Inquiry and consultation confirmation emails will send successfully too.</p>"
        "<p style=\"color:#6F8F7A;font-style:italic;margin-top:20px;\">— swell design + media</p>"
        "</div>"
    )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{from_name} <{from_email}>"
    msg["To"] = to
    msg.attach(MIMEText("SMTP test successful — the site is configured to send email.", "plain"))
    msg.attach(MIMEText(html, "html"))

    stage = "connect"
    try:
        with smtplib.SMTP(host, port, timeout=15) as server:
            server.ehlo()
            stage = "starttls"
            try:
                server.starttls()
                server.ehlo()
            except Exception:
                pass
            stage = "auth"
            if user and password:
                server.login(user, password)
            stage = "send"
            server.sendmail(from_email, [to], msg.as_string())
        logger.info("SMTP test email sent OK to %s via %s:%s as %s", to, host, port, user or from_email)
        return {"ok": True, "delivered_to": to, "from": from_email, "host": host, "port": port}
    except smtplib.SMTPAuthenticationError as e:
        return {
            "ok": False,
            "stage": stage,
            "error": (
                f"SMTP authentication failed ({e.smtp_code}). Check SMTP_USER and SMTP_PASS in backend/.env. "
                "For Hostinger, SMTP_USER must be the full mailbox address (e.g. info@swelldesignla.com) and "
                "SMTP_PASS is the mailbox password set in the Hostinger email panel."
            ),
        }
    except smtplib.SMTPConnectError as e:
        return {"ok": False, "stage": stage, "error": f"Could not connect to {host}:{port} — {e}"}
    except smtplib.SMTPException as e:
        return {"ok": False, "stage": stage, "error": f"SMTP error at stage '{stage}': {e}"}
    except OSError as e:
        return {"ok": False, "stage": stage, "error": f"Network error connecting to {host}:{port} — {e}"}
    except Exception as e:
        logger.exception("Unexpected SMTP test failure")
        return {"ok": False, "stage": stage, "error": f"Unexpected error: {e}"}


# =========================================================
# Uploads + Media Library
# =========================================================
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic"}
MAX_IMAGE_WIDTH = 2400  # auto-resize wider images to this on upload


def _process_image(src_path: Path, dest_path: Path) -> Dict[str, Any]:
    """Compress + resize an uploaded image. Returns {width, height, size}.
    Falls back to raw copy if PIL isn't available or processing fails."""
    try:
        from PIL import Image
    except ImportError as e:
        logger.warning(
            "Pillow not installed — skipping image compression (%s). "
            "Add 'Pillow>=10.0' to backend/requirements.txt and rebuild.", e
        )
        if src_path.resolve() != dest_path.resolve():
            shutil.copy(src_path, dest_path)
        return {"width": 0, "height": 0, "size_bytes": dest_path.stat().st_size}
    try:
        img = Image.open(src_path)
        # Preserve transparency for PNGs; convert others to RGB
        if img.mode in ("P", "RGBA") and dest_path.suffix.lower() in {".png", ".webp"}:
            pass
        elif img.mode != "RGB":
            img = img.convert("RGB")
        # Resize if wider than MAX
        if img.width > MAX_IMAGE_WIDTH:
            new_h = int(img.height * (MAX_IMAGE_WIDTH / img.width))
            img = img.resize((MAX_IMAGE_WIDTH, new_h), Image.LANCZOS)
        # Save with sensible defaults
        save_kwargs = {}
        ext = dest_path.suffix.lower()
        if ext in {".jpg", ".jpeg"}:
            save_kwargs = {"quality": 82, "optimize": True, "progressive": True}
        elif ext == ".webp":
            save_kwargs = {"quality": 82, "method": 6}
        elif ext == ".png":
            save_kwargs = {"optimize": True}
        img.save(dest_path, **save_kwargs)
        return {"width": img.width, "height": img.height, "size_bytes": dest_path.stat().st_size}
    except Exception as e:
        logger.warning("Image processing failed for %s: %s", src_path, e)
        # Fall back to raw copy
        if src_path.resolve() != dest_path.resolve():
            shutil.copy(src_path, dest_path)
        return {"width": 0, "height": 0, "size_bytes": dest_path.stat().st_size}


@api.post("/uploads")
async def upload_file(file: UploadFile = File(...)):
    ext = Path(file.filename or "").suffix.lower() or ".bin"
    if ext not in IMAGE_EXTS and ext != ".pdf":
        raise HTTPException(status_code=400, detail="Unsupported file type")
    name = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOAD_DIR / name

    # Save raw first
    tmp_path = UPLOAD_DIR / f".tmp_{name}"
    with tmp_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    meta = {"width": 0, "height": 0, "size_bytes": tmp_path.stat().st_size}
    if ext in IMAGE_EXTS:
        meta = _process_image(tmp_path, dest)
        try:
            tmp_path.unlink(missing_ok=True)
        except Exception:
            pass
    else:
        tmp_path.rename(dest)

    url = f"/api/uploads/{name}"

    # Index in media library
    try:
        asset = {
            "id": uuid.uuid4().hex,
            "url": url,
            "filename": file.filename or name,
            "alt_text": "",
            "tags": [],
            "width": meta.get("width", 0),
            "height": meta.get("height", 0),
            "size_bytes": meta.get("size_bytes", 0),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.media_library.insert_one(asset)
    except Exception as e:
        logger.warning("Media library indexing failed: %s", e)

    return {"url": url, "filename": name, "width": meta.get("width", 0), "height": meta.get("height", 0)}


@api.get("/uploads/{name}")
async def get_upload(name: str):
    dest = UPLOAD_DIR / name
    if not dest.exists() or not dest.is_file():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(str(dest))


# ---- Media Library CRUD ----
@api.get("/admin/media")
async def list_media(q: str = "", tag: str = "", admin=Depends(require_admin)):
    query: Dict[str, Any] = {}
    if q:
        query["$or"] = [
            {"filename": {"$regex": q, "$options": "i"}},
            {"alt_text": {"$regex": q, "$options": "i"}},
        ]
    if tag:
        query["tags"] = tag
    docs = await db.media_library.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return docs


@api.patch("/admin/media/{mid}")
async def update_media(mid: str, payload: Dict[str, Any], admin=Depends(require_admin)):
    updates: Dict[str, Any] = {}
    if "alt_text" in payload:
        updates["alt_text"] = str(payload["alt_text"])[:500]
    if "tags" in payload:
        tags = payload["tags"]
        if isinstance(tags, list):
            updates["tags"] = [str(t).strip().lower() for t in tags if str(t).strip()]
    if "filename" in payload:
        updates["filename"] = str(payload["filename"])[:200]
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
    await db.media_library.update_one({"id": mid}, {"$set": updates})
    doc = await db.media_library.find_one({"id": mid}, {"_id": 0})
    return doc


@api.delete("/admin/media/{mid}")
async def delete_media(mid: str, admin=Depends(require_admin)):
    doc = await db.media_library.find_one({"id": mid}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    # Best-effort delete underlying file
    try:
        name = doc["url"].split("/")[-1]
        (UPLOAD_DIR / name).unlink(missing_ok=True)
    except Exception:
        pass
    await db.media_library.delete_one({"id": mid})
    return {"ok": True}


async def _migrate_media_library() -> int:
    """One-time index of pre-existing images (SiteContent, Services, Gallery, Blog) into media_library.
    Idempotent — only inserts records for URLs not already indexed.
    """
    indexed_urls = set()
    async for doc in db.media_library.find({}, {"_id": 0, "url": 1}):
        indexed_urls.add(doc.get("url", ""))

    to_index: List[Dict[str, Any]] = []

    def maybe_add(url: str, tag: str, filename: str = ""):
        if not url or not isinstance(url, str):
            return
        if not url.startswith("/api/uploads/"):
            return  # only track locally-hosted assets
        if url in indexed_urls:
            return
        indexed_urls.add(url)
        to_index.append({
            "id": uuid.uuid4().hex,
            "url": url,
            "filename": filename or url.split("/")[-1],
            "alt_text": "",
            "tags": [tag],
            "width": 0, "height": 0, "size_bytes": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    sc = await db.site_content.find_one({"id": "site_content_singleton"}, {"_id": 0}) or {}
    for f in ("logo_url", "hero_image_url", "about_image_url", "coming_soon_bg_url", "favicon_url", "og_image_url"):
        maybe_add(sc.get(f, ""), tag=f.replace("_url", ""))

    async for s in db.services.find({}, {"_id": 0}):
        maybe_add(s.get("hero_image_url", ""), tag="service")
        for u in (s.get("gallery_image_urls") or []):
            maybe_add(u, tag="service")

    async for g in db.gallery.find({}, {"_id": 0}):
        maybe_add(g.get("image_url", ""), tag="gallery")

    async for b in db.blog_posts.find({}, {"_id": 0}):
        maybe_add(b.get("cover_image_url", ""), tag="blog")

    if to_index:
        await db.media_library.insert_many(to_index)
    return len(to_index)


# =========================================================
# Site Content
# =========================================================
@api.get("/site-content")
async def get_site_content(request: Request):
    doc = await db.site_content.find_one({"id": "site_content_singleton"}, {"_id": 0})
    if not doc:
        sc = SiteContent()
        await db.site_content.insert_one(to_doc(sc.model_dump()))
        doc = sc.model_dump()
    # NEVER expose the preview token through the public endpoint — that would
    # let anyone bypass the Coming Soon curtain.
    doc.pop("preview_token", None)
    return cache_public_response(doc, request=request)


@api.post("/preview/verify")
async def verify_preview_token(payload: Dict[str, Any]):
    """Constant-time check that a preview token matches the current secret.
    Called by the frontend when a visitor lands with ?preview=<token>. Public
    (no auth) because the whole point is to let a shareable link work."""
    import hmac as _hmac
    supplied = (payload.get("token") or "").strip()
    if not supplied:
        return {"ok": False}
    doc = await db.site_content.find_one({"id": "site_content_singleton"}, {"preview_token": 1}) or {}
    stored = (doc.get("preview_token") or "").strip()
    return {"ok": bool(stored) and _hmac.compare_digest(supplied, stored)}


@api.get("/admin/preview-token")
async def get_preview_token(admin=Depends(require_admin)):
    """Admin-only read of the current preview token.
    We can't expose it through the public `/site-content` endpoint (anyone
    could then bypass Coming Soon), so the admin panel fetches it here."""
    doc = await db.site_content.find_one(
        {"id": "site_content_singleton"}, {"preview_token": 1}
    ) or {}
    return {"preview_token": (doc.get("preview_token") or "").strip()}


@api.post("/admin/preview/regenerate")
async def regenerate_preview_token(admin=Depends(require_admin)):
    """Rotate the preview token — any previously-shared preview links stop
    working immediately. Returns the fresh token so the admin UI can build
    a copy-friendly URL."""
    import secrets
    new_token = secrets.token_urlsafe(24)
    await db.site_content.update_one(
        {"id": "site_content_singleton"},
        {"$set": {"preview_token": new_token}},
        upsert=True,
    )
    return {"ok": True, "preview_token": new_token}


@api.put("/admin/site-content")
async def update_site_content(payload: Dict[str, Any], admin=Depends(require_admin)):
    payload["id"] = "site_content_singleton"
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.site_content.update_one({"id": "site_content_singleton"}, {"$set": to_doc(payload)}, upsert=True)
    doc = await db.site_content.find_one({"id": "site_content_singleton"}, {"_id": 0})
    # Rebuild static index.html so social scrapers see the latest OG tags
    # (they don't run JS, so MetaManager wouldn't be visible to them).
    await render_public_index()
    return doc


# =========================================================
# Dynamic Inquiry Form (CMS-driven wizard schema)
# =========================================================
@api.get("/inquiry-form")
async def get_inquiry_form():
    """Public: returns the current inquiry-form schema, or the default template if none saved."""
    doc = await db.site_content.find_one({"id": "site_content_singleton"}, {"_id": 0, "inquiry_form_schema": 1}) or {}
    schema = doc.get("inquiry_form_schema") or {}
    if not schema or not schema.get("steps"):
        return default_inquiry_form_schema()
    return schema


@api.put("/admin/inquiry-form")
async def update_inquiry_form(payload: Dict[str, Any], admin=Depends(require_admin)):
    """Admin: replace the inquiry form schema. Payload = full schema {version, steps: [...]}."""
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="schema must be an object")
    steps = payload.get("steps")
    if not isinstance(steps, list):
        raise HTTPException(status_code=400, detail="schema.steps must be a list")
    # Basic sanitization
    cleaned_steps = []
    for s in steps:
        if not isinstance(s, dict):
            continue
        fields = []
        for f in (s.get("fields") or []):
            if not isinstance(f, dict) or not f.get("id") or not f.get("type"):
                continue
            fld = {
                "id": str(f["id"]).strip(),
                "type": str(f["type"]),
                "label": str(f.get("label") or ""),
                "help": str(f.get("help") or ""),
                "placeholder": str(f.get("placeholder") or ""),
                "required": bool(f.get("required", False)),
            }
            if "options" in f and isinstance(f["options"], list):
                opts = []
                for o in f["options"]:
                    if isinstance(o, dict) and "value" in o and "label" in o:
                        opts.append({"value": str(o["value"]), "label": str(o["label"])})
                fld["options"] = opts
            # Conditional display rule (simple mode): { field: <id>, equals: <value> }
            cond = f.get("conditional")
            if isinstance(cond, dict) and cond.get("field") and cond.get("equals") not in (None, ""):
                fld["conditional"] = {
                    "field": str(cond["field"]).strip(),
                    "equals": str(cond["equals"]),
                }
            fields.append(fld)
        cleaned_steps.append({
            "id": str(s.get("id") or f"step-{uuid.uuid4().hex[:8]}"),
            "title": str(s.get("title") or ""),
            "description": str(s.get("description") or ""),
            "fields": fields,
        })
    schema = {"version": int(payload.get("version") or 1), "steps": cleaned_steps}
    await db.site_content.update_one(
        {"id": "site_content_singleton"},
        {"$set": {"inquiry_form_schema": schema, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return schema


@api.post("/admin/inquiry-form/reset")
async def reset_inquiry_form(admin=Depends(require_admin)):
    """Admin: replace the schema with the default 8-step template."""
    schema = default_inquiry_form_schema()
    await db.site_content.update_one(
        {"id": "site_content_singleton"},
        {"$set": {"inquiry_form_schema": schema, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return schema


# =========================================================
# Services
# =========================================================
@api.get("/services")
async def list_services(request: Request, published: Optional[bool] = None):
    query: Dict[str, Any] = {}
    if published is not None:
        query["published"] = published
    docs = await db.services.find(query, {"_id": 0}).sort("order", 1).to_list(500)
    return cache_public_response(docs, request=request)


@api.get("/services/{slug}")
async def get_service(slug: str, request: Request):
    doc = await db.services.find_one({"slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Service not found")
    return cache_public_response(doc, request=request)


@api.post("/admin/services")
async def create_service(payload: Dict[str, Any], admin=Depends(require_admin)):
    payload.setdefault("slug", slugify(payload.get("title", "service")))
    if not payload.get("slug"):
        payload["slug"] = slugify(payload.get("title", "service"))
    obj = Service(**payload)
    doc = to_doc(obj.model_dump())
    await db.services.insert_one(doc)
    return await db.services.find_one({"id": obj.id}, {"_id": 0})


@api.put("/admin/services/{sid}")
async def update_service(sid: str, payload: Dict[str, Any], admin=Depends(require_admin)):
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()
    if "title" in payload and not payload.get("slug"):
        payload["slug"] = slugify(payload["title"])
    r = await db.services.update_one({"id": sid}, {"$set": to_doc(payload)})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    return await db.services.find_one({"id": sid}, {"_id": 0})


@api.delete("/admin/services/{sid}")
async def delete_service(sid: str, admin=Depends(require_admin)):
    await db.services.delete_one({"id": sid})
    return {"ok": True}


# =========================================================
# Gallery
# =========================================================
@api.get("/gallery")
async def list_gallery(request: Request, category: Optional[str] = None, featured: Optional[bool] = None):
    query: Dict[str, Any] = {}
    if category and category != "all":
        query["category"] = category
    if featured is not None:
        query["featured"] = featured
    docs = await db.gallery.find(query, {"_id": 0}).sort("order", 1).to_list(1000)
    return cache_public_response(docs, request=request)


@api.post("/admin/gallery")
async def create_gallery(payload: Dict[str, Any], admin=Depends(require_admin)):
    obj = GalleryItem(**payload)
    await db.gallery.insert_one(to_doc(obj.model_dump()))
    return await db.gallery.find_one({"id": obj.id}, {"_id": 0})


@api.put("/admin/gallery/{gid}")
async def update_gallery(gid: str, payload: Dict[str, Any], admin=Depends(require_admin)):
    r = await db.gallery.update_one({"id": gid}, {"$set": to_doc(payload)})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return await db.gallery.find_one({"id": gid}, {"_id": 0})


@api.delete("/admin/gallery/{gid}")
async def delete_gallery(gid: str, admin=Depends(require_admin)):
    await db.gallery.delete_one({"id": gid})
    return {"ok": True}


@api.post("/admin/gallery/bulk-delete")
async def bulk_delete_gallery(payload: Dict[str, Any], admin=Depends(require_admin)):
    """Delete multiple gallery items in one shot. Payload: {ids: [str, ...]}."""
    ids = payload.get("ids") or []
    if not isinstance(ids, list) or not ids:
        raise HTTPException(status_code=400, detail="ids required")
    r = await db.gallery.delete_many({"id": {"$in": ids}})
    return {"ok": True, "deleted": r.deleted_count}


@api.post("/admin/gallery/bulk-update")
async def bulk_update_gallery(payload: Dict[str, Any], admin=Depends(require_admin)):
    """Bulk-set fields on multiple gallery items.
    Payload: {ids: [str,...], patch: {category?: str, featured?: bool, ...}}.
    Only whitelisted fields can be mass-updated to avoid accidental clobbering.
    """
    ids = payload.get("ids") or []
    patch = payload.get("patch") or {}
    if not isinstance(ids, list) or not ids:
        raise HTTPException(status_code=400, detail="ids required")
    allowed = {"category", "featured", "tags"}
    safe = {k: v for k, v in patch.items() if k in allowed}
    if not safe:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    r = await db.gallery.update_many({"id": {"$in": ids}}, {"$set": safe})
    return {"ok": True, "matched": r.matched_count, "modified": r.modified_count}


# =========================================================
# Testimonials
# =========================================================
# Never expose these internal fields on public GET responses.
_TESTIMONIAL_PUBLIC_PROJECTION = {"_id": 0, "reviewer_email": 0}


@api.get("/testimonials")
async def list_testimonials(request: Request, featured: Optional[bool] = None):
    """Public list. Only 'approved' rows are ever returned to the public API.
    reviewer_email is hidden."""
    query: Dict[str, Any] = {"$or": [{"status": "approved"}, {"status": {"$exists": False}}]}
    if featured is not None:
        query["featured"] = featured
    docs = await db.testimonials.find(query, _TESTIMONIAL_PUBLIC_PROJECTION).sort("order", 1).to_list(500)
    return cache_public_response(docs, request=request)


@api.post("/testimonials/submit")
async def submit_testimonial_public(payload: Dict[str, Any]):
    """PUBLIC endpoint — anyone can submit. Always lands as 'pending' for moderation.
    Simple honeypot spam prevention: if `website` (or `nickname`) is filled, silently drop."""
    if (payload.get("website") or payload.get("nickname") or "").strip():
        # Silent success so bots don't retry — but nothing hits the DB.
        logger.info("Testimonial submit: honeypot triggered, dropping silently")
        return {"ok": True, "queued": True}

    name = (payload.get("name") or "").strip()
    quote = (payload.get("quote") or "").strip()
    if not name or not quote:
        raise HTTPException(status_code=400, detail="Name and review text are required")
    try:
        rating = int(payload.get("rating") or 5)
    except (TypeError, ValueError):
        rating = 5
    rating = max(1, min(5, rating))

    obj = Testimonial(
        name=name[:120],
        event_type=(payload.get("event_type") or "")[:80],
        quote=quote[:4000],
        rating=rating,
        photo_url=(payload.get("photo_url") or "").strip(),
        reviewer_email=(payload.get("reviewer_email") or "").strip().lower()[:200],
        featured=False,
        status="pending",
    )
    await db.testimonials.insert_one(to_doc(obj.model_dump()))

    # Fire admin alert email — non-blocking, best-effort.
    biz_email = os.environ.get("BUSINESS_EMAIL", "").strip()
    if biz_email:
        try:
            star = "\u2605"
            middot = " \u00b7 "
            event_part = (middot + obj.event_type) if obj.event_type else ""
            email_line = (
                f'<p style="font-size:13px;color:#5E5A55;">Reviewer email (private): '
                f'<b>{obj.reviewer_email}</b></p>'
            ) if obj.reviewer_email else ""
            body = (
                '<div style="font-family:Georgia,serif;max-width:520px;margin:24px auto;padding:24px;background:#FBF6EF;border-radius:16px;">'
                '<h2 style="font-weight:400;">New review submitted &mdash; pending approval</h2>'
                f'<p style="color:#5E5A55;"><b>{obj.name}</b>{event_part}{middot}{rating}{star}</p>'
                f'<blockquote style="border-left:3px solid #6F8F7A;padding-left:12px;color:#5E5A55;font-style:italic;">{quote[:1000]}</blockquote>'
                f'{email_line}'
                '<p style="margin-top:20px;"><a href="#" style="color:#6F8F7A;">Review it in Admin &rarr; Testimonials</a></p>'
                '</div>'
            )
            send_email(to=biz_email, subject=f"New review: {obj.name} ({rating}{star})", html=body,
                       reply_to=obj.reviewer_email or None)
        except Exception as e:
            logger.warning("Failed to send new-review admin alert: %s", e)

    return {"ok": True, "queued": True, "id": obj.id}


@api.get("/admin/testimonials")
async def admin_list_testimonials(status: Optional[str] = None, admin=Depends(require_admin)):
    """Admin list — sees ALL fields including pending items and reviewer_email."""
    query: Dict[str, Any] = {}
    if status:
        query["status"] = status
    docs = await db.testimonials.find(query, {"_id": 0}).sort([("status", 1), ("order", 1), ("created_at", -1)]).to_list(1000)
    return docs


@api.get("/admin/testimonials/pending-count")
async def pending_reviews_count(admin=Depends(require_admin)):
    n = await db.testimonials.count_documents({"status": "pending"})
    return {"count": n}


@api.post("/admin/testimonials/{tid}/approve")
async def approve_testimonial(tid: str, admin=Depends(require_admin)):
    r = await db.testimonials.update_one({"id": tid}, {"$set": {"status": "approved"}})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return await db.testimonials.find_one({"id": tid}, {"_id": 0})


@api.post("/admin/testimonials/{tid}/reject")
async def reject_testimonial(tid: str, admin=Depends(require_admin)):
    r = await db.testimonials.update_one({"id": tid}, {"$set": {"status": "rejected"}})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return await db.testimonials.find_one({"id": tid}, {"_id": 0})


@api.post("/admin/testimonials")
async def create_testimonial(payload: Dict[str, Any], admin=Depends(require_admin)):
    payload.setdefault("status", "approved")  # Admin-created rows are approved by default.
    obj = Testimonial(**payload)
    await db.testimonials.insert_one(to_doc(obj.model_dump()))
    return await db.testimonials.find_one({"id": obj.id}, {"_id": 0})


@api.put("/admin/testimonials/{tid}")
async def update_testimonial(tid: str, payload: Dict[str, Any], admin=Depends(require_admin)):
    r = await db.testimonials.update_one({"id": tid}, {"$set": to_doc(payload)})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return await db.testimonials.find_one({"id": tid}, {"_id": 0})


@api.delete("/admin/testimonials/{tid}")
async def delete_testimonial(tid: str, admin=Depends(require_admin)):
    await db.testimonials.delete_one({"id": tid})
    return {"ok": True}


# =========================================================
# Backdrops
# =========================================================
@api.get("/backdrops")
async def list_backdrops(request: Request, featured: Optional[bool] = None, kind: Optional[str] = None):
    """Public list — only active items. Optional filter by kind ('backdrop' or 'design')."""
    query: Dict[str, Any] = {"$or": [{"active": True}, {"active": {"$exists": False}}]}
    if featured is not None:
        query["featured"] = featured
    if kind:
        # Handle legacy rows missing the field: treat as 'backdrop' by default.
        if kind == "backdrop":
            query["$and"] = [{"$or": [{"kind": "backdrop"}, {"kind": {"$exists": False}}]}]
        else:
            query["kind"] = kind
    docs = await db.backdrops.find(query, {"_id": 0}).sort("order", 1).to_list(500)
    return cache_public_response(docs, request=request)


@api.get("/admin/backdrops")
async def admin_list_backdrops(admin=Depends(require_admin)):
    docs = await db.backdrops.find({}, {"_id": 0}).sort("order", 1).to_list(500)
    return docs


@api.post("/admin/backdrops")
async def create_backdrop(payload: Dict[str, Any], admin=Depends(require_admin)):
    obj = Backdrop(**payload)
    await db.backdrops.insert_one(to_doc(obj.model_dump()))
    return await db.backdrops.find_one({"id": obj.id}, {"_id": 0})


@api.put("/admin/backdrops/{bid}")
async def update_backdrop(bid: str, payload: Dict[str, Any], admin=Depends(require_admin)):
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()
    r = await db.backdrops.update_one({"id": bid}, {"$set": to_doc(payload)})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return await db.backdrops.find_one({"id": bid}, {"_id": 0})


@api.delete("/admin/backdrops/{bid}")
async def delete_backdrop(bid: str, admin=Depends(require_admin)):
    await db.backdrops.delete_one({"id": bid})
    return {"ok": True}


@api.post("/admin/backdrops/reorder")
async def reorder_backdrops(payload: Dict[str, Any], admin=Depends(require_admin)):
    """Body: { order: [id1, id2, ...] } — persists list index as `order` field."""
    order = payload.get("order") or []
    for idx, bid in enumerate(order):
        await db.backdrops.update_one({"id": bid}, {"$set": {"order": idx}})
    return {"ok": True}


@api.post("/admin/backdrops/bulk-delete")
async def bulk_delete_backdrops(payload: Dict[str, Any], admin=Depends(require_admin)):
    """Delete multiple backdrops/designs at once. Payload: {ids: [str, ...]}."""
    ids = payload.get("ids") or []
    if not isinstance(ids, list) or not ids:
        raise HTTPException(status_code=400, detail="ids required")
    r = await db.backdrops.delete_many({"id": {"$in": ids}})
    return {"ok": True, "deleted": r.deleted_count}


@api.post("/admin/backdrops/bulk-update")
async def bulk_update_backdrops(payload: Dict[str, Any], admin=Depends(require_admin)):
    """Bulk-set whitelisted fields on multiple backdrops.
    Payload: {ids: [str,...], patch: {kind?: 'backdrop'|'design', featured?: bool, active?: bool}}.
    """
    ids = payload.get("ids") or []
    patch = payload.get("patch") or {}
    if not isinstance(ids, list) or not ids:
        raise HTTPException(status_code=400, detail="ids required")
    allowed = {"kind", "featured", "active"}
    safe = {k: v for k, v in patch.items() if k in allowed}
    if not safe:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    if "kind" in safe and safe["kind"] not in ("backdrop", "design"):
        raise HTTPException(status_code=400, detail="kind must be 'backdrop' or 'design'")
    r = await db.backdrops.update_many({"id": {"$in": ids}}, {"$set": safe})
    return {"ok": True, "matched": r.matched_count, "modified": r.modified_count}


# =========================================================
# Reply templates — pre-written email bodies for inquiries.
# =========================================================
@api.get("/admin/reply-templates")
async def list_reply_templates(admin=Depends(require_admin)):
    docs = await db.reply_templates.find({}, {"_id": 0}).sort("order", 1).to_list(500)
    return docs


@api.post("/admin/reply-templates")
async def create_reply_template(payload: Dict[str, Any], admin=Depends(require_admin)):
    obj = ReplyTemplate(**payload)
    await db.reply_templates.insert_one(to_doc(obj.model_dump()))
    return await db.reply_templates.find_one({"id": obj.id}, {"_id": 0})


@api.put("/admin/reply-templates/{tid}")
async def update_reply_template(tid: str, payload: Dict[str, Any], admin=Depends(require_admin)):
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()
    r = await db.reply_templates.update_one({"id": tid}, {"$set": to_doc(payload)})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return await db.reply_templates.find_one({"id": tid}, {"_id": 0})


@api.delete("/admin/reply-templates/{tid}")
async def delete_reply_template(tid: str, admin=Depends(require_admin)):
    await db.reply_templates.delete_one({"id": tid})
    return {"ok": True}


@api.post("/admin/reply-templates/reorder")
async def reorder_reply_templates(payload: Dict[str, Any], admin=Depends(require_admin)):
    order = payload.get("order") or []
    for idx, tid in enumerate(order):
        await db.reply_templates.update_one({"id": tid}, {"$set": {"order": idx}})
    return {"ok": True}


# =========================================================
# FAQs
# =========================================================
@api.get("/faqs")
async def list_faqs(request: Request):
    docs = await db.faqs.find({}, {"_id": 0}).sort("order", 1).to_list(500)
    return cache_public_response(docs, request=request)


@api.post("/admin/faqs")
async def create_faq(payload: Dict[str, Any], admin=Depends(require_admin)):
    obj = FAQ(**payload)
    await db.faqs.insert_one(to_doc(obj.model_dump()))
    return await db.faqs.find_one({"id": obj.id}, {"_id": 0})


@api.put("/admin/faqs/{fid}")
async def update_faq(fid: str, payload: Dict[str, Any], admin=Depends(require_admin)):
    r = await db.faqs.update_one({"id": fid}, {"$set": to_doc(payload)})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return await db.faqs.find_one({"id": fid}, {"_id": 0})


@api.delete("/admin/faqs/{fid}")
async def delete_faq(fid: str, admin=Depends(require_admin)):
    await db.faqs.delete_one({"id": fid})
    return {"ok": True}


# =========================================================
# Blog
# =========================================================
@api.get("/blog")
async def list_blog(published: Optional[bool] = True):
    query: Dict[str, Any] = {}
    if published is not None:
        query["published"] = published
    docs = await db.blog_posts.find(query, {"_id": 0}).sort("published_at", -1).to_list(500)
    return docs


@api.get("/blog/{slug}")
async def get_blog(slug: str):
    doc = await db.blog_posts.find_one({"slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Post not found")
    return doc


@api.post("/admin/blog")
async def create_blog(payload: Dict[str, Any], admin=Depends(require_admin)):
    if not payload.get("slug"):
        payload["slug"] = slugify(payload.get("title", "post"))
    obj = BlogPost(**payload)
    await db.blog_posts.insert_one(to_doc(obj.model_dump()))
    return await db.blog_posts.find_one({"id": obj.id}, {"_id": 0})


@api.put("/admin/blog/{bid}")
async def update_blog(bid: str, payload: Dict[str, Any], admin=Depends(require_admin)):
    if "title" in payload and not payload.get("slug"):
        payload["slug"] = slugify(payload["title"])
    r = await db.blog_posts.update_one({"id": bid}, {"$set": to_doc(payload)})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return await db.blog_posts.find_one({"id": bid}, {"_id": 0})


@api.delete("/admin/blog/{bid}")
async def delete_blog(bid: str, admin=Depends(require_admin)):
    await db.blog_posts.delete_one({"id": bid})
    return {"ok": True}


# =========================================================
# Inquiries
# =========================================================
async def _get_or_create_client(name: str, email: str, phone: str, inquiry_id: str) -> str:
    if not email and not phone:
        # still create by name if provided
        if not name:
            return ""
    query: Dict[str, Any] = {}
    if email:
        query["email"] = email.lower()
    elif phone:
        query["phone"] = phone
    else:
        query["name"] = name

    existing = await db.clients.find_one(query, {"_id": 0}) if query else None
    if existing:
        await db.clients.update_one(
            {"id": existing["id"]},
            {"$addToSet": {"inquiry_ids": inquiry_id}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}},
        )
        return existing["id"]
    obj = Client(
        name=name or (email or phone or "Unknown"),
        email=(email or "").lower(),
        phone=phone or "",
        inquiry_ids=[inquiry_id],
        status="lead",
    )
    await db.clients.insert_one(to_doc(obj.model_dump()))
    return obj.id


@api.post("/inquiries")
async def create_inquiry(payload: Dict[str, Any]):
    # Split known Inquiry fields from unknown custom form fields.
    # Unknown fields land in `extra` so the dynamic form builder never loses data.
    known: Dict[str, Any] = {}
    extra: Dict[str, Any] = dict(payload.get("extra") or {})
    for k, v in payload.items():
        if k == "extra":
            continue
        if k in STANDARD_FIELD_IDS or k in {"source", "status", "admin_notes", "tags",
                                             "consult_date", "consult_time",
                                             "consult_duration_minutes", "consult_status"}:
            known[k] = v
        else:
            extra[k] = v
    known["extra"] = extra

    # Detect a scheduled phone consult
    has_consult = bool(known.get("consult_date") and known.get("consult_time"))
    if has_consult:
        av = await db.availability.find_one({"id": "availability_singleton"}, {"_id": 0}) or {}
        known.setdefault("consult_duration_minutes", int(av.get("consult_duration_minutes", 30) or 30))
        known["consult_status"] = "scheduled"
        known["status"] = "consult_scheduled"

    obj = Inquiry(**known)
    doc = to_doc(obj.model_dump())
    await db.inquiries.insert_one(doc)

    # Auto-create client
    client_id = await _get_or_create_client(obj.client_name, obj.client_email, obj.client_phone, obj.id)
    if client_id:
        await db.inquiries.update_one({"id": obj.id}, {"$set": {"client_id": client_id}})

    # If a consult was booked, mirror to Consultation collection + GCal + .ics
    gcal_event_id = ""
    if has_consult:
        # Create Consultation record for legacy tooling / calendar view
        consult_doc = to_doc(Consultation(
            client_name=obj.client_name,
            client_email=obj.client_email,
            client_phone=obj.client_phone,
            date=obj.consult_date,
            time=obj.consult_time,
            duration_minutes=obj.consult_duration_minutes or 30,
            consultation_type="phone",
            notes=(obj.must_haves or "")[:500],
            inquiry_id=obj.id,
            client_id=client_id or "",
            status="scheduled",
        ).model_dump())
        await db.consultations.insert_one(consult_doc)
        if client_id:
            await db.clients.update_one({"id": client_id}, {"$addToSet": {"consultation_ids": consult_doc["id"]}})

        # Sync to Google Calendar (best-effort)
        try:
            start_dt = datetime.fromisoformat(f"{obj.consult_date}T{obj.consult_time}:00")
            end_dt = start_dt + timedelta(minutes=obj.consult_duration_minutes or 30)
            event = await gcal.create_event(
                db,
                summary=f"Phone consult with {obj.client_name}",
                description=(
                    f"Booked via swelldesignla.com\n"
                    f"Client: {obj.client_name}\n"
                    f"Phone: {obj.client_phone or '-'}\n"
                    f"Email: {obj.client_email}\n"
                    f"Event: {(obj.event_type or '').replace('_', ' ')}\n"
                    f"Notes: {(obj.must_haves or obj.inspiration_notes or '-')[:1000]}"
                ),
                start_iso=start_dt.isoformat(),
                end_iso=end_dt.isoformat(),
                attendee_email=obj.client_email or None,
            )
            if event and event.get("id"):
                gcal_event_id = event["id"]
                await db.inquiries.update_one({"id": obj.id}, {"$set": {"consult_calendar_event_id": gcal_event_id}})
                await db.consultations.update_one({"id": consult_doc["id"]}, {"$set": {"gcal_event_id": gcal_event_id}})
        except Exception as e:
            logger.warning("Google Calendar sync failed on inquiry consult: %s", e)

    # Build .ics attachment if consult was booked
    ics_content = None
    if has_consult:
        try:
            start_dt = datetime.fromisoformat(f"{obj.consult_date}T{obj.consult_time}:00")
            organizer = os.environ.get("BUSINESS_EMAIL", os.environ.get("SMTP_FROM", "hello@swelldesignla.com"))
            ics_content = make_ics(
                summary="Phone consultation — swell design + media",
                description=(
                    f"We'll call you at {obj.client_phone or 'the number you provided'} to chat about your "
                    f"{(obj.event_type or 'event').replace('_', ' ')}."
                ),
                start_local=start_dt,
                duration_minutes=obj.consult_duration_minutes or 30,
                organizer_email=organizer,
                attendee_email=obj.client_email or organizer,
                location="Phone call",
            )
        except Exception as e:
            logger.warning("Failed to generate .ics: %s", e)
            ics_content = None

    # Send client confirmation email
    if obj.client_email:
        send_email(
            to=obj.client_email,
            subject="We received your inquiry — swell design + media",
            html=inquiry_confirmation_html(
                obj.client_name or "friend",
                obj.event_type or "",
                obj.consult_date or "",
                obj.consult_time or "",
            ),
            ics_content=ics_content,
            ics_filename="phone-consultation.ics",
            reply_to=os.environ.get("BUSINESS_EMAIL", None),
        )

    # Notify owner
    biz_email = os.environ.get("BUSINESS_EMAIL", "")
    if biz_email:
        admin_url = os.environ.get("PUBLIC_FRONTEND_URL", "") + "/admin/inquiries" if os.environ.get("PUBLIC_FRONTEND_URL") else ""
        subject = f"New inquiry: {obj.event_type or 'event'} — {obj.client_name}"
        if has_consult:
            subject += f" (📞 consult booked {obj.consult_date} {obj.consult_time})"
        send_email(
            to=biz_email,
            subject=subject,
            html=owner_new_inquiry_html(
                obj.client_name or "New inquiry",
                obj.client_email or "",
                obj.client_phone or "",
                obj.event_type or "",
                obj.consult_date or "",
                obj.consult_time or "",
                admin_url,
            ),
            reply_to=obj.client_email or None,
        )

    return {"id": obj.id, "ok": True, "consult_scheduled": has_consult}


@api.get("/admin/inquiries")
async def admin_list_inquiries(status: Optional[str] = None, admin=Depends(require_admin)):
    query: Dict[str, Any] = {}
    if status and status != "all":
        query["status"] = status
    docs = await db.inquiries.find(query, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return docs


@api.get("/admin/inquiries.csv")
async def admin_export_inquiries_csv(
    status: Optional[str] = None,
    admin=Depends(require_admin),
):
    """Export inquiries as CSV. Accepts same ?status filter as the list endpoint.
    Flattens the `extra` (dynamic form) fields into extra_<key> columns so that
    every custom question the owner adds via the Inquiry Form Builder ends up in
    its own column in the spreadsheet."""
    query: Dict[str, Any] = {}
    if status and status != "all":
        query["status"] = status
    docs = await db.inquiries.find(query, {"_id": 0}).sort("created_at", -1).to_list(5000)

    # Core columns (stable order, first)
    core_cols = [
        "id",
        "created_at",
        "status",
        "client_name",
        "client_email",
        "client_phone",
        "event_type",
        "event_date",
        "event_start_time",
        "event_backup_date",
        "guest_count",
        "venue_name",
        "venue_address",
        "indoor_outdoor",
        "theme",
        "color_palette",
        "budget_range",
        "services_needed",
        "inspiration_notes",
        "inspiration_links",
        "upload_urls",
        "has_consult",
        "consult_date",
        "consult_time",
        "consult_duration_minutes",
        "consult_status",
        "admin_notes",
        "referral_source",
    ]

    # Collect all extra_* keys across the batch (deterministic order)
    extra_keys: List[str] = []
    seen_extra = set()
    for d in docs:
        ex = d.get("extra") or {}
        if isinstance(ex, dict):
            for k in ex.keys():
                if k not in seen_extra:
                    seen_extra.add(k)
                    extra_keys.append(k)

    headers = core_cols + [f"extra_{k}" for k in extra_keys]

    def _fmt(v):
        if v is None:
            return ""
        if isinstance(v, list):
            return "; ".join(str(x) for x in v)
        if isinstance(v, dict):
            # Compact dict → JSON-ish inline
            try:
                import json as _json
                return _json.dumps(v, ensure_ascii=False)
            except Exception:
                return str(v)
        if isinstance(v, bool):
            return "yes" if v else "no"
        return str(v)

    buf = io.StringIO()
    writer = csv.writer(buf, quoting=csv.QUOTE_MINIMAL)
    writer.writerow(headers)
    for d in docs:
        ex = d.get("extra") or {}
        row = [_fmt(d.get(col)) for col in core_cols]
        for k in extra_keys:
            row.append(_fmt(ex.get(k)))
        writer.writerow(row)

    buf.seek(0)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    filename = f"swell-inquiries-{ts}.csv"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@api.get("/admin/inquiries/{iid}")
async def admin_get_inquiry(iid: str, admin=Depends(require_admin)):
    doc = await db.inquiries.find_one({"id": iid}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    return doc


@api.put("/admin/inquiries/{iid}")
async def admin_update_inquiry(iid: str, payload: Dict[str, Any], admin=Depends(require_admin)):
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()
    r = await db.inquiries.update_one({"id": iid}, {"$set": to_doc(payload)})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return await db.inquiries.find_one({"id": iid}, {"_id": 0})


@api.delete("/admin/inquiries/{iid}")
async def admin_delete_inquiry(iid: str, admin=Depends(require_admin)):
    await db.inquiries.delete_one({"id": iid})
    return {"ok": True}


# =========================================================
# Clients (CRM lite)
# =========================================================
@api.get("/admin/clients")
async def admin_list_clients(admin=Depends(require_admin)):
    docs = await db.clients.find({}, {"_id": 0}).sort("updated_at", -1).to_list(2000)
    return docs


@api.get("/admin/clients/{cid}")
async def admin_get_client(cid: str, admin=Depends(require_admin)):
    doc = await db.clients.find_one({"id": cid}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    inquiries = await db.inquiries.find({"id": {"$in": doc.get("inquiry_ids", [])}}, {"_id": 0}).to_list(500)
    consultations = await db.consultations.find({"id": {"$in": doc.get("consultation_ids", [])}}, {"_id": 0}).to_list(500)
    return {**doc, "inquiries": inquiries, "consultations": consultations}


@api.put("/admin/clients/{cid}")
async def admin_update_client(cid: str, payload: Dict[str, Any], admin=Depends(require_admin)):
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()
    r = await db.clients.update_one({"id": cid}, {"$set": to_doc(payload)})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return await db.clients.find_one({"id": cid}, {"_id": 0})


@api.delete("/admin/clients/{cid}")
async def admin_delete_client(cid: str, admin=Depends(require_admin)):
    await db.clients.delete_one({"id": cid})
    return {"ok": True}


# =========================================================
# Consultations
# =========================================================
DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


def _day_key(d: date) -> str:
    return DAY_KEYS[d.weekday()]


def _parse_time(hhmm: str) -> dt_time:
    h, m = hhmm.split(":")
    return dt_time(int(h), int(m))


@api.get("/availability")
async def get_availability():
    doc = await db.availability.find_one({"id": "availability_singleton"}, {"_id": 0})
    if not doc:
        av = Availability()
        await db.availability.insert_one(to_doc(av.model_dump()))
        return av.model_dump()
    return doc


@api.put("/admin/availability")
async def update_availability(payload: Dict[str, Any], admin=Depends(require_admin)):
    payload["id"] = "availability_singleton"
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.availability.update_one({"id": "availability_singleton"}, {"$set": to_doc(payload)}, upsert=True)
    return await db.availability.find_one({"id": "availability_singleton"}, {"_id": 0})


@api.get("/availability/slots")
async def get_available_slots(date_str: str = Query(..., alias="date"), consultation_type: str = "phone"):
    """Return available time slots for a date string YYYY-MM-DD.

    Also consults Google Calendar (if connected) to prevent double-booking against
    existing calendar events on that day.
    """
    try:
        d = date.fromisoformat(date_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date format, expected YYYY-MM-DD")

    av = await db.availability.find_one({"id": "availability_singleton"}, {"_id": 0}) or Availability().model_dump()
    today = date.today()

    # Rule: advance booking window
    advance_days = int(av.get("advance_booking_days", 60) or 60)
    if (d - today).days > advance_days:
        return {"date": date_str, "slots": []}

    # Rule: blackout dates
    if date_str in av.get("blackout_dates", []):
        return {"date": date_str, "slots": []}

    # Rule: no past dates
    if d < today:
        return {"date": date_str, "slots": []}

    # Rule: block Sundays if configured
    if bool(av.get("block_sundays", True)) and d.weekday() == 6:
        return {"date": date_str, "slots": []}

    # Rule: daily max consults
    daily_max = int(av.get("daily_max_consults", 6) or 6)
    booked_today_count = await db.consultations.count_documents({"date": date_str, "status": {"$ne": "cancelled"}})
    if booked_today_count >= daily_max:
        return {"date": date_str, "slots": []}

    ranges = av.get("weekly", {}).get(_day_key(d), [])
    slot_minutes = int(av.get("slot_minutes", 30))
    buffer_minutes = int(av.get("buffer_minutes", 15))

    # Default duration prefers new booking rule, then per-type override
    duration = int(av.get("consult_duration_minutes", slot_minutes) or slot_minutes)
    for ct in av.get("consultation_types", []):
        if ct.get("key") == consultation_type:
            duration = int(ct.get("duration", duration))
            break

    # Rule: minimum lead hours from now
    minimum_lead_hours = int(av.get("minimum_lead_hours", 2) or 0)
    earliest_allowed = datetime.now() + timedelta(hours=minimum_lead_hours)

    # Existing bookings for the day
    existing = await db.consultations.find({"date": date_str, "status": {"$ne": "cancelled"}}, {"_id": 0}).to_list(500)
    booked = []
    for b in existing:
        try:
            t = _parse_time(b["time"])
            start = datetime.combine(d, t)
            end = start + timedelta(minutes=int(b.get("duration_minutes", slot_minutes)))
            booked.append((start, end))
        except Exception:
            continue

    # Google Calendar busy times
    try:
        gcal_busy = await gcal.list_busy(db, date_str)
        for gb in gcal_busy:
            try:
                s = datetime.fromisoformat(gb["start"].replace("Z", "+00:00"))
                e = datetime.fromisoformat(gb["end"].replace("Z", "+00:00"))
                if s.tzinfo:
                    s = s.astimezone().replace(tzinfo=None)
                if e.tzinfo:
                    e = e.astimezone().replace(tzinfo=None)
                if s.date() == d or e.date() == d:
                    booked.append((s, e))
            except Exception:
                continue
    except Exception:
        pass

    slots: List[str] = []
    for rg in ranges:
        try:
            rstart = datetime.combine(d, _parse_time(rg["start"]))
            rend = datetime.combine(d, _parse_time(rg["end"]))
        except Exception:
            continue
        cur = rstart
        while cur + timedelta(minutes=duration) <= rend:
            slot_end = cur + timedelta(minutes=duration)
            # Enforce minimum lead time
            if cur < earliest_allowed:
                cur += timedelta(minutes=slot_minutes)
                continue
            overlap = any(not (slot_end + timedelta(minutes=buffer_minutes) <= bs or cur >= be + timedelta(minutes=buffer_minutes)) for bs, be in booked)
            if not overlap:
                slots.append(cur.strftime("%H:%M"))
            cur += timedelta(minutes=slot_minutes)

    return {"date": date_str, "slots": slots, "duration_minutes": duration}


@api.post("/consultations")
async def create_consultation(payload: Dict[str, Any]):
    # Basic validation
    for req in ["client_name", "client_email", "date", "time"]:
        if not payload.get(req):
            raise HTTPException(status_code=400, detail=f"Missing field: {req}")

    ctype = payload.get("consultation_type", "phone")
    av = await db.availability.find_one({"id": "availability_singleton"}, {"_id": 0}) or Availability().model_dump()
    duration = av.get("slot_minutes", 30)
    for ct in av.get("consultation_types", []):
        if ct.get("key") == ctype:
            duration = int(ct.get("duration", duration))
            break
    payload["duration_minutes"] = payload.get("duration_minutes") or duration

    obj = Consultation(**payload)
    doc = to_doc(obj.model_dump())
    await db.consultations.insert_one(doc)

    # Link to client
    cid = await _get_or_create_client(obj.client_name, obj.client_email, obj.client_phone or "", inquiry_id="")
    if cid:
        await db.clients.update_one({"id": cid}, {"$addToSet": {"consultation_ids": obj.id}})
        await db.consultations.update_one({"id": obj.id}, {"$set": {"client_id": cid}})

    if obj.client_email:
        send_email(
            to=obj.client_email,
            subject="Your consultation is confirmed — swell design + media",
            html=consultation_confirmation_html(obj.client_name, obj.date, obj.time, obj.consultation_type),
        )

    biz_email = os.environ.get("BUSINESS_EMAIL", "")
    if biz_email:
        send_email(
            to=biz_email,
            subject=f"New consultation booked: {obj.client_name} — {obj.date} {obj.time}",
            html=f"<pre style='font-family: Menlo, monospace;'>{obj.model_dump_json(indent=2)}</pre>",
        )

    # Sync to Google Calendar (if connected)
    try:
        start_dt = datetime.fromisoformat(f"{obj.date}T{obj.time}:00")
        end_dt = start_dt + timedelta(minutes=obj.duration_minutes)
        event = await gcal.create_event(
            db,
            summary=f"Consult ({obj.consultation_type.replace('_', ' ')}) with {obj.client_name}",
            description=f"Booked via swelldesignla.com\nEmail: {obj.client_email}\nPhone: {obj.client_phone or '-'}\nNotes: {obj.notes or '-'}",
            start_iso=start_dt.isoformat(),
            end_iso=end_dt.isoformat(),
            attendee_email=obj.client_email or None,
        )
        if event and event.get("id"):
            await db.consultations.update_one({"id": obj.id}, {"$set": {"gcal_event_id": event["id"]}})
    except Exception as e:
        logger.warning("Google Calendar sync failed: %s", e)

    return {"id": obj.id, "ok": True}


@api.get("/admin/consultations")
async def admin_list_consultations(admin=Depends(require_admin)):
    docs = await db.consultations.find({}, {"_id": 0}).sort("date", 1).to_list(2000)
    return docs


@api.put("/admin/consultations/{cid}")
async def admin_update_consultation(cid: str, payload: Dict[str, Any], admin=Depends(require_admin)):
    r = await db.consultations.update_one({"id": cid}, {"$set": to_doc(payload)})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return await db.consultations.find_one({"id": cid}, {"_id": 0})


@api.delete("/admin/consultations/{cid}")
async def admin_delete_consultation(cid: str, admin=Depends(require_admin)):
    await db.consultations.delete_one({"id": cid})
    return {"ok": True}


# =========================================================
# Newsletter
# =========================================================
@api.post("/newsletter")
async def subscribe(payload: Dict[str, Any]):
    email = (payload.get("email") or "").strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Please enter a valid email")
    existing = await db.newsletter.find_one({"email": email}, {"_id": 0})
    if existing:
        return {"ok": True, "already": True}
    obj = NewsletterSubscriber(email=email, source=payload.get("source", "footer"))
    await db.newsletter.insert_one(to_doc(obj.model_dump()))
    return {"ok": True}


@api.get("/admin/newsletter")
async def list_subscribers(admin=Depends(require_admin)):
    docs = await db.newsletter.find({}, {"_id": 0}).sort("created_at", -1).to_list(5000)
    return docs


# =========================================================
# Dashboard stats
# =========================================================
@api.get("/admin/stats")
async def admin_stats(admin=Depends(require_admin)):
    today = date.today().isoformat()
    total_inquiries = await db.inquiries.count_documents({})
    new_inquiries = await db.inquiries.count_documents({"status": "new"})
    booked = await db.inquiries.count_documents({"status": "booked"})
    upcoming_consults = await db.consultations.count_documents({"date": {"$gte": today}, "status": "scheduled"})
    today_consults = await db.consultations.count_documents({"date": today, "status": "scheduled"})
    total_clients = await db.clients.count_documents({})
    conversion = round((booked / total_inquiries * 100), 1) if total_inquiries else 0
    return {
        "total_inquiries": total_inquiries,
        "new_inquiries": new_inquiries,
        "booked_inquiries": booked,
        "conversion_rate": conversion,
        "upcoming_consultations": upcoming_consults,
        "today_consultations": today_consults,
        "total_clients": total_clients,
    }



# =========================================================
# Integrations: Google Calendar
# =========================================================
@api.get("/admin/integrations/google/status")
async def gcal_status(admin=Depends(require_admin)):
    doc = await db.integrations.find_one({"id": "google_calendar"}, {"_id": 0}) or {}
    connected = bool(doc.get("refresh_token_enc"))
    env_client_id = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
    env_client_secret = os.environ.get("GOOGLE_CLIENT_SECRET", "").strip()
    return {
        "connected": connected,
        "email": doc.get("email", ""),
        "name": doc.get("name", ""),
        "client_id": doc.get("client_id", ""),
        "has_client_secret": bool(doc.get("client_secret_enc")),
        "env_configured": bool(env_client_id and env_client_secret),
        "connected_at": doc.get("connected_at"),
        "updated_at": doc.get("updated_at"),
        "last_error": doc.get("last_error", ""),
    }


@api.post("/admin/integrations/google/settings")
async def gcal_save_settings(payload: Dict[str, Any], admin=Depends(require_admin)):
    """Save OAuth client credentials (client_id + client_secret) provided by the admin."""
    client_id = (payload.get("client_id") or "").strip()
    client_secret = (payload.get("client_secret") or "").strip()
    if not client_id or not client_secret:
        raise HTTPException(status_code=400, detail="Both client_id and client_secret are required")
    patch = {
        "id": "google_calendar",
        "client_id": client_id,
        "client_secret_enc": encrypt(client_secret),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.integrations.update_one({"id": "google_calendar"}, {"$set": patch}, upsert=True)
    return {"ok": True}


@api.get("/admin/integrations/google/authorize")
async def gcal_authorize(admin=Depends(require_admin)):
    doc = await db.integrations.find_one({"id": "google_calendar"}, {"_id": 0}) or {}
    client_id = doc.get("client_id") or os.environ.get("GOOGLE_CLIENT_ID", "")
    if not client_id:
        raise HTTPException(status_code=400, detail="Google Client ID not configured. Save your OAuth credentials first.")
    # Build redirect_uri from public URL header via env fallback
    public_backend = os.environ.get("PUBLIC_BACKEND_URL", "").rstrip("/")
    redirect_uri = f"{public_backend}/api/integrations/google/callback" if public_backend else "/api/integrations/google/callback"
    state = uuid.uuid4().hex
    await db.integrations.update_one({"id": "google_calendar"}, {"$set": {"oauth_state": state, "oauth_redirect_uri": redirect_uri}}, upsert=True)
    url = gcal.build_auth_url(client_id, redirect_uri, state)
    return {"authorization_url": url, "redirect_uri": redirect_uri}


@api.get("/integrations/google/callback")
async def gcal_callback(code: Optional[str] = None, state: Optional[str] = None, error: Optional[str] = None):
    """Public callback endpoint (redirected to by Google). Exchanges code, stores refresh token, then redirects to /admin/integrations."""
    frontend_url = os.environ.get("PUBLIC_FRONTEND_URL", "").rstrip("/") or "/"
    if error:
        return RedirectResponse(f"{frontend_url}/admin/integrations?gcal_error={error}")
    if not code or not state:
        return RedirectResponse(f"{frontend_url}/admin/integrations?gcal_error=missing_code")

    doc = await db.integrations.find_one({"id": "google_calendar"}, {"_id": 0}) or {}
    if state != doc.get("oauth_state"):
        return RedirectResponse(f"{frontend_url}/admin/integrations?gcal_error=state_mismatch")

    client_id = doc.get("client_id") or os.environ.get("GOOGLE_CLIENT_ID", "")
    client_secret = decrypt(doc.get("client_secret_enc", "")) or os.environ.get("GOOGLE_CLIENT_SECRET", "")
    redirect_uri = doc.get("oauth_redirect_uri", "")
    if not client_id or not client_secret or not redirect_uri:
        return RedirectResponse(f"{frontend_url}/admin/integrations?gcal_error=missing_credentials")

    try:
        tokens = gcal.exchange_code_for_tokens(client_id, client_secret, redirect_uri, code)
        access_token = tokens.get("access_token", "")
        refresh_token = tokens.get("refresh_token", "")
        info = gcal.get_userinfo(access_token) if access_token else {}
        await db.integrations.update_one(
            {"id": "google_calendar"},
            {"$set": {
                "access_token_enc": encrypt(access_token) if access_token else "",
                "refresh_token_enc": encrypt(refresh_token) if refresh_token else doc.get("refresh_token_enc", ""),
                "email": info.get("email", ""),
                "name": info.get("name", ""),
                "connected_at": datetime.now(timezone.utc).isoformat(),
                "oauth_state": "",
                "last_error": "",
            }},
            upsert=True,
        )
        return RedirectResponse(f"{frontend_url}/admin/integrations?gcal_connected=1")
    except Exception as e:
        logger.error("Google OAuth callback failed: %s", e)
        await db.integrations.update_one({"id": "google_calendar"}, {"$set": {"last_error": str(e)}}, upsert=True)
        return RedirectResponse(f"{frontend_url}/admin/integrations?gcal_error=exchange_failed")


@api.post("/admin/integrations/google/disconnect")
async def gcal_disconnect(admin=Depends(require_admin)):
    await db.integrations.update_one(
        {"id": "google_calendar"},
        {"$set": {"access_token_enc": "", "refresh_token_enc": "", "email": "", "name": "", "connected_at": None}},
    )
    return {"ok": True}


# =========================================================
# Integrations: Instagram Graph API
# =========================================================
@api.get("/admin/integrations/instagram/status")
async def ig_status(admin=Depends(require_admin)):
    doc = await db.integrations.find_one({"id": "instagram"}, {"_id": 0}) or {}
    return {
        "configured": bool(doc.get("access_token_enc") and doc.get("ig_business_account_id")),
        "ig_business_account_id": doc.get("ig_business_account_id", ""),
        "username": doc.get("username", ""),
        "post_count": doc.get("post_count", 0),
        "last_success_at": doc.get("last_success_at"),
        "last_error": doc.get("last_error", ""),
        "updated_at": doc.get("updated_at"),
    }


@api.post("/admin/integrations/instagram/settings")
async def ig_save_settings(payload: Dict[str, Any], admin=Depends(require_admin)):
    ig_id = (payload.get("ig_business_account_id") or "").strip()
    token = (payload.get("access_token") or "").strip()
    if not ig_id or not token:
        raise HTTPException(status_code=400, detail="Both IG Business Account ID and access token are required")
    try:
        info = ig._validate(ig_id, token)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Validation failed: {e}")
    await ig.save_settings(db, {
        "ig_business_account_id": ig_id,
        "access_token_enc": encrypt(token),
        "username": info.get("username", ""),
        "account_type": info.get("account_type", ""),
    })
    try:
        result = await ig.refresh_cache(db)
        return {"ok": True, "username": info.get("username", ""), "post_count": result.get("count", 0)}
    except Exception as e:
        return {"ok": True, "warning": str(e)}


@api.post("/admin/integrations/instagram/refresh")
async def ig_refresh(admin=Depends(require_admin)):
    try:
        result = await ig.refresh_cache(db)
        return {"ok": True, **result}
    except Exception as e:
        logger.warning("Instagram refresh failed: %s", e)
        raise HTTPException(status_code=502, detail=str(e))


@api.post("/admin/integrations/instagram/lookup")
async def ig_lookup(payload: Dict[str, Any], admin=Depends(require_admin)):
    """Helper to resolve IG Business Account ID from a user token by listing Pages."""
    token = (payload.get("access_token") or "").strip()
    if not token:
        raise HTTPException(status_code=400, detail="access_token is required")
    try:
        results = await ig.try_lookup_ig_id(token)
        return {"ok": True, "pages": results}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@api.post("/admin/integrations/instagram/disconnect")
async def ig_disconnect(admin=Depends(require_admin)):
    await db.integrations.update_one(
        {"id": "instagram"},
        {"$set": {"access_token_enc": "", "ig_business_account_id": "", "username": "", "post_count": 0}},
    )
    await db.instagram_posts.delete_many({})
    return {"ok": True}


# In-process cache for the public Instagram feed to shield Meta rate limits
# during traffic spikes (e.g. announcement / launch day).
_IG_CACHE: Dict[str, Any] = {"ts": 0.0, "posts": None}
_IG_CACHE_TTL_SECONDS = 300  # 5 minutes


@api.get("/instagram/feed")
async def instagram_feed_public():
    import time as _t
    now = _t.time()
    if _IG_CACHE["posts"] is not None and (now - _IG_CACHE["ts"]) < _IG_CACHE_TTL_SECONDS:
        return _IG_CACHE["posts"]
    try:
        posts = await ig.public_feed(db, limit=24)
        _IG_CACHE["posts"] = posts
        _IG_CACHE["ts"] = now
        return posts
    except Exception as e:
        logger.warning("Instagram feed fetch failed: %s", e)
        # Serve stale cache if we have one, otherwise empty list
        return _IG_CACHE["posts"] or []



# =========================================================
# Palettes
# =========================================================
async def _resolve_palette(pid: str) -> Dict[str, Any]:
    """Resolve a palette id to a palette dict, checking presets then custom palettes."""
    # Check presets first
    for p in PALETTES:
        if p["id"] == pid:
            return p
    # Then custom palettes
    doc = await db.custom_palettes.find_one({"id": pid}, {"_id": 0})
    if doc:
        return doc
    return PALETTES[0]  # signature default


def _schedule_matches_today(rule: Dict[str, Any], today: _date_only) -> bool:
    """Return True if the given schedule rule is active on the provided date."""
    if not rule.get("enabled", True):
        return False
    try:
        sm = int(rule.get("start_month", 0))
        sd = int(rule.get("start_day", 0))
        em = int(rule.get("end_month", 0))
        ed = int(rule.get("end_day", 0))
    except (TypeError, ValueError):
        return False
    if not (1 <= sm <= 12 and 1 <= sd <= 31 and 1 <= em <= 12 and 1 <= ed <= 31):
        return False

    repeats = bool(rule.get("repeats_yearly", True))
    if not repeats:
        year = rule.get("year")
        if year is None:
            return False
        try:
            start = _date_only(int(year), sm, sd)
            end_year = int(year) if (em, ed) >= (sm, sd) else int(year) + 1
            end = _date_only(end_year, em, ed)
        except ValueError:
            return False
        return start <= today <= end
    # Yearly recurring — match by month/day, allowing wrap-around (e.g. Dec 20 → Jan 5)
    md_today = (today.month, today.day)
    md_start = (sm, sd)
    md_end = (em, ed)
    if md_start <= md_end:
        return md_start <= md_today <= md_end
    # Wraps year end (e.g. start Dec 15, end Jan 10)
    return md_today >= md_start or md_today <= md_end


async def _effective_palette_id() -> str:
    """Compute currently effective palette id, honoring schedules > active_palette_id."""
    doc = await db.site_content.find_one({"id": "site_content_singleton"}, {"_id": 0}) or {}
    schedules = doc.get("palette_schedules", []) or []
    today = _date_only.today()
    # Priority: one-off (with year) > yearly-recurring, in insertion order
    matched_oneoff = None
    matched_yearly = None
    for rule in schedules:
        if _schedule_matches_today(rule, today):
            if rule.get("repeats_yearly", True):
                if matched_yearly is None:
                    matched_yearly = rule
            else:
                if matched_oneoff is None:
                    matched_oneoff = rule
    chosen = matched_oneoff or matched_yearly
    if chosen and chosen.get("palette_id"):
        return chosen["palette_id"]
    return doc.get("active_palette_id", "signature")


@api.get("/palettes")
async def list_palettes():
    custom = await db.custom_palettes.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    # Ensure custom palettes carry the "custom" category
    for c in custom:
        c["category"] = c.get("category") or "custom"
        c.setdefault("is_preset", False)
    categories = list(CATEGORIES)
    if custom and not any(c.get("key") == "custom" for c in categories):
        categories.append({"key": "custom", "label": "Custom"})
    return {"categories": categories, "palettes": PALETTES + custom}


@api.get("/palettes/active")
async def get_active_palette(request: Request):
    pid = await _effective_palette_id()
    resolved = await _resolve_palette(pid)
    return cache_public_response(resolved, request=request)


@api.put("/admin/palettes/active")
async def set_active_palette(payload: Dict[str, Any], admin=Depends(require_admin)):
    pid = (payload.get("palette_id") or "").strip()
    if not pid:
        raise HTTPException(status_code=400, detail="palette_id is required")
    # Verify id exists in presets OR custom
    exists_preset = any(p["id"] == pid for p in PALETTES)
    exists_custom = False
    if not exists_preset:
        exists_custom = bool(await db.custom_palettes.find_one({"id": pid}, {"_id": 0}))
    if not (exists_preset or exists_custom):
        raise HTTPException(status_code=404, detail="Unknown palette")
    await db.site_content.update_one(
        {"id": "site_content_singleton"},
        {"$set": {"active_palette_id": pid, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    resolved = await _resolve_palette(pid)
    return {"ok": True, "palette": resolved}


# ---- Palette schedules ----
@api.get("/admin/palettes/schedules")
async def list_schedules(admin=Depends(require_admin)):
    doc = await db.site_content.find_one({"id": "site_content_singleton"}, {"_id": 0}) or {}
    return {"schedules": doc.get("palette_schedules", []) or []}


@api.put("/admin/palettes/schedules")
async def replace_schedules(payload: Dict[str, Any], admin=Depends(require_admin)):
    """Replace the full schedule list. Payload: {schedules: [rule, ...]}."""
    schedules = payload.get("schedules")
    if not isinstance(schedules, list):
        raise HTTPException(status_code=400, detail="schedules must be a list")
    # Basic sanitization
    cleaned = []
    for r in schedules:
        if not isinstance(r, dict):
            continue
        rid = str(r.get("id") or uuid.uuid4().hex)
        cleaned.append({
            "id": rid,
            "label": str(r.get("label") or "Schedule"),
            "enabled": bool(r.get("enabled", True)),
            "palette_id": str(r.get("palette_id") or "signature"),
            "start_month": int(r.get("start_month") or 1),
            "start_day": int(r.get("start_day") or 1),
            "end_month": int(r.get("end_month") or 1),
            "end_day": int(r.get("end_day") or 1),
            "repeats_yearly": bool(r.get("repeats_yearly", True)),
            "year": int(r["year"]) if r.get("year") not in (None, "", 0) else None,
        })
    await db.site_content.update_one(
        {"id": "site_content_singleton"},
        {"$set": {"palette_schedules": cleaned, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"ok": True, "schedules": cleaned}


# ---- Custom palettes ----
@api.get("/admin/palettes/custom")
async def list_custom_palettes(admin=Depends(require_admin)):
    docs = await db.custom_palettes.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


@api.post("/admin/palettes/custom")
async def create_custom_palette(payload: Dict[str, Any], admin=Depends(require_admin)):
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    colors = payload.get("colors") or {}
    if not isinstance(colors, dict) or not colors:
        raise HTTPException(status_code=400, detail="colors dict is required")
    obj = CustomPalette(
        name=name,
        mood=(payload.get("mood") or "").strip(),
        colors={str(k): str(v) for k, v in colors.items()},
        source_image_url=(payload.get("source_image_url") or "").strip(),
    )
    await db.custom_palettes.insert_one(to_doc(obj.model_dump()))
    return await db.custom_palettes.find_one({"id": obj.id}, {"_id": 0})


@api.delete("/admin/palettes/custom/{pid}")
async def delete_custom_palette(pid: str, admin=Depends(require_admin)):
    # If the palette being deleted is the active one, fall back to signature
    active = await db.site_content.find_one({"id": "site_content_singleton"}, {"_id": 0, "active_palette_id": 1}) or {}
    if active.get("active_palette_id") == pid:
        await db.site_content.update_one({"id": "site_content_singleton"}, {"$set": {"active_palette_id": "signature"}})
    await db.custom_palettes.delete_one({"id": pid})
    return {"ok": True}


# =========================================================
# Health
# =========================================================
@api.get("/")
async def root():
    return {"service": "swell design + media API", "status": "ok"}


@api.get("/health")
async def health():
    return {"ok": True, "time": datetime.now(timezone.utc).isoformat()}


# =========================================================
# System stats (super admin only)
# ---------------------------------------------------------
# Read-only diagnostic endpoint. Returns server resource usage
# (RAM/CPU/disk), app-level volume metrics (inquiry counts, media
# library size, etc.), and MongoDB storage stats. Gated by
# `require_super_admin` which returns 404 (not 401/403) for anyone
# else so the endpoint appears not to exist to non-super admins.
# Uses only Python stdlib (no psutil dep).
# =========================================================
def _read_meminfo() -> Dict[str, int]:
    """Parse /proc/meminfo. Values are in bytes. Linux-only; returns
    empty dict on other platforms so callers can degrade gracefully."""
    out: Dict[str, int] = {}
    try:
        with open("/proc/meminfo", "r") as f:
            for line in f:
                parts = line.split(":")
                if len(parts) != 2:
                    continue
                key = parts[0].strip()
                # Values are like "12345 kB"
                val = parts[1].strip().split()
                if not val:
                    continue
                try:
                    n = int(val[0]) * (1024 if len(val) > 1 and val[1].lower() == "kb" else 1)
                    out[key] = n
                except ValueError:
                    continue
    except FileNotFoundError:
        pass
    return out


def _read_uptime_seconds() -> float:
    try:
        with open("/proc/uptime", "r") as f:
            return float(f.read().split()[0])
    except (FileNotFoundError, ValueError):
        return 0.0


def _dir_size_bytes(path: Path) -> tuple:
    """Recursively total size + file count. Ignores unreadable entries so
    a single permission error doesn't fail the whole call."""
    total = 0
    files = 0
    if not path.exists():
        return 0, 0
    for root, _dirs, filenames in os.walk(path):
        for name in filenames:
            try:
                total += (Path(root) / name).stat().st_size
                files += 1
            except OSError:
                continue
    return total, files


@api.get("/admin/system-stats")
async def get_system_stats(_su=Depends(require_super_admin)):
    """Point-in-time snapshot of server + app health. Cheap enough to
    poll from the admin UI every 30s. Returns everything the super admin
    needs to spot an incoming problem (RAM/CPU/disk pressure, DB bloat,
    uploads folder runaway growth)."""
    now = datetime.now(timezone.utc)

    # --- Server: RAM ---
    mem = _read_meminfo()
    ram_total = mem.get("MemTotal", 0)
    ram_available = mem.get("MemAvailable", 0)
    ram_used = max(0, ram_total - ram_available) if ram_total else 0
    ram_pct = round(100 * ram_used / ram_total, 1) if ram_total else 0.0

    # --- Server: CPU (load average / cores as a % proxy) ---
    try:
        load1, load5, load15 = os.getloadavg()
    except (OSError, AttributeError):
        load1 = load5 = load15 = 0.0
    try:
        cores = os.cpu_count() or 1
    except Exception:
        cores = 1
    # Rough approximation: load / cores ≈ CPU utilization ratio.
    cpu_pct_1m = round(100 * load1 / cores, 1)
    cpu_pct_5m = round(100 * load5 / cores, 1)
    cpu_pct_15m = round(100 * load15 / cores, 1)

    # --- Server: Disk (root filesystem) ---
    try:
        du = shutil.disk_usage("/")
        disk_total = du.total
        disk_used = du.used
        disk_free = du.free
        disk_pct = round(100 * disk_used / disk_total, 1) if disk_total else 0.0
    except Exception:
        disk_total = disk_used = disk_free = 0
        disk_pct = 0.0

    # --- Server: uptime ---
    uptime_seconds = _read_uptime_seconds()

    # --- App volume: inquiries ---
    since_7d = (now - timedelta(days=7)).isoformat()
    since_30d = (now - timedelta(days=30)).isoformat()
    inquiries_total = await db.inquiries.count_documents({})
    inquiries_7d = await db.inquiries.count_documents({"created_at": {"$gte": since_7d}})
    inquiries_30d = await db.inquiries.count_documents({"created_at": {"$gte": since_30d}})

    # Status breakdown (top statuses only)
    status_pipe = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]
    status_breakdown = []
    async for row in db.inquiries.aggregate(status_pipe):
        status_breakdown.append({"status": row.get("_id") or "new", "count": row["count"]})

    # --- App volume: content counts ---
    counts = {
        "clients": await db.clients.count_documents({}),
        "consultations": await db.consultations.count_documents({}),
        "services": await db.services.count_documents({}),
        "gallery_items": await db.gallery.count_documents({}),
        "backdrops": await db.backdrops.count_documents({}),
        "testimonials": await db.testimonials.count_documents({}),
        "faqs": await db.faqs.count_documents({}),
        "blog_posts": await db.blog_posts.count_documents({}),
        "media_assets": await db.media_library.count_documents({}),
        "admin_users": await db.admin_users.count_documents({}),
        "newsletter_subscribers": await db.newsletter_subscribers.count_documents({}),
    }

    # --- Uploads folder size on disk ---
    uploads_dir = ROOT_DIR / "uploads"
    uploads_bytes, uploads_files = _dir_size_bytes(uploads_dir)

    # --- MongoDB storage stats ---
    mongo_stats: Dict[str, Any] = {}
    try:
        raw = await db.command("dbStats")
        mongo_stats = {
            "collections": raw.get("collections", 0),
            "objects": raw.get("objects", 0),
            "data_size": int(raw.get("dataSize", 0)),
            "storage_size": int(raw.get("storageSize", 0)),
            "index_size": int(raw.get("indexSize", 0)),
        }
    except Exception as e:
        mongo_stats = {"error": str(e)}

    return {
        "generated_at": now.isoformat(),
        "server": {
            "ram_total_bytes": ram_total,
            "ram_used_bytes": ram_used,
            "ram_available_bytes": ram_available,
            "ram_pct": ram_pct,
            "cpu_cores": cores,
            "cpu_load_1m": load1,
            "cpu_load_5m": load5,
            "cpu_load_15m": load15,
            "cpu_pct_1m": cpu_pct_1m,
            "cpu_pct_5m": cpu_pct_5m,
            "cpu_pct_15m": cpu_pct_15m,
            "disk_total_bytes": disk_total,
            "disk_used_bytes": disk_used,
            "disk_free_bytes": disk_free,
            "disk_pct": disk_pct,
            "uptime_seconds": uptime_seconds,
        },
        "app": {
            "inquiries_total": inquiries_total,
            "inquiries_last_7d": inquiries_7d,
            "inquiries_last_30d": inquiries_30d,
            "status_breakdown": status_breakdown,
            "counts": counts,
            "uploads_bytes": uploads_bytes,
            "uploads_files": uploads_files,
        },
        "mongo": mongo_stats,
    }


# =========================================================
# Mount
# =========================================================
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
    # Expose caching headers so browser dev tools + Cloudflare can see them.
    expose_headers=["ETag", "Cache-Control", "X-Content-Version"],
)
