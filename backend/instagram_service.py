"""Instagram Graph API (Facebook Login flow) helpers.

Admin pastes:
  - IG Business Account ID (numeric)
  - Long-lived access token (Facebook User token, 60d)

We fetch her latest media via graph.facebook.com/{ig_id}/media, cache in MongoDB for 1 hour.
"""
import os
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

import requests

from crypto_utils import encrypt, decrypt

log = logging.getLogger("instagram")

GRAPH_VERSION = os.environ.get("META_GRAPH_VERSION", "v20.0")
GRAPH_HOST = "https://graph.facebook.com"


async def load_settings(db) -> Optional[Dict[str, Any]]:
    return await db.integrations.find_one({"id": "instagram"}, {"_id": 0})


async def save_settings(db, patch: Dict[str, Any]):
    patch["id"] = "instagram"
    patch["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.integrations.update_one({"id": "instagram"}, {"$set": patch}, upsert=True)


def _fetch_media(ig_id: str, token: str, limit: int = 12) -> List[Dict[str, Any]]:
    fields = "id,media_type,media_url,thumbnail_url,permalink,caption,timestamp"
    r = requests.get(
        f"{GRAPH_HOST}/{GRAPH_VERSION}/{ig_id}/media",
        params={"fields": fields, "limit": limit, "access_token": token},
        timeout=15,
    )
    body = r.json() if r.headers.get("content-type", "").startswith("application/json") else {"error": {"message": r.text}}
    if r.status_code >= 400 or "error" in body:
        raise RuntimeError(body.get("error", {}).get("message", "Instagram Graph API error"))
    return body.get("data", [])


def _validate(ig_id: str, token: str) -> Dict[str, Any]:
    r = requests.get(
        f"{GRAPH_HOST}/{GRAPH_VERSION}/{ig_id}",
        params={"fields": "id,username,account_type", "access_token": token},
        timeout=10,
    )
    body = r.json() if r.headers.get("content-type", "").startswith("application/json") else {"error": {"message": r.text}}
    if r.status_code >= 400 or "error" in body:
        raise RuntimeError(body.get("error", {}).get("message", "Instagram validation failed"))
    return body


async def refresh_cache(db) -> Dict[str, Any]:
    cfg = await load_settings(db)
    if not cfg:
        raise RuntimeError("Instagram is not configured")
    ig_id = cfg.get("ig_business_account_id", "")
    token = decrypt(cfg.get("access_token_enc", ""))
    if not ig_id or not token:
        raise RuntimeError("Instagram credentials missing")

    items = _fetch_media(ig_id, token, limit=12)
    now_iso = datetime.now(timezone.utc).isoformat()
    posts = []
    for it in items[:12]:
        posts.append({
            "id": it.get("id"),
            "media_type": it.get("media_type"),
            "media_url": it.get("media_url"),
            "thumbnail_url": it.get("thumbnail_url"),
            "permalink": it.get("permalink"),
            "caption": it.get("caption"),
            "timestamp": it.get("timestamp"),
            "cached_at": now_iso,
        })

    await db.instagram_posts.delete_many({})
    if posts:
        await db.instagram_posts.insert_many(posts)

    await save_settings(db, {"last_success_at": now_iso, "last_error": "", "post_count": len(posts)})
    return {"count": len(posts)}


async def public_feed(db, limit: int = 12) -> List[Dict[str, Any]]:
    docs = await db.instagram_posts.find({}, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    return docs


async def try_lookup_ig_id(user_token: str) -> List[Dict[str, Any]]:
    """Try to resolve IG Business Account IDs from the user's Pages. Helpful for setup."""
    r = requests.get(
        f"{GRAPH_HOST}/{GRAPH_VERSION}/me/accounts",
        params={"fields": "id,name,instagram_business_account{id,username}", "access_token": user_token},
        timeout=15,
    )
    body = r.json() if r.headers.get("content-type", "").startswith("application/json") else {"error": {"message": r.text}}
    if r.status_code >= 400 or "error" in body:
        raise RuntimeError(body.get("error", {}).get("message", "Failed to list Pages"))
    results = []
    for page in body.get("data", []):
        ig = page.get("instagram_business_account") or {}
        if ig.get("id"):
            results.append({"page_name": page.get("name"), "page_id": page.get("id"), "ig_business_account_id": ig["id"], "username": ig.get("username", "")})
    return results
