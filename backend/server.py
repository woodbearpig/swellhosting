"""swell design + media — API server."""
import os
import re
import uuid
import shutil
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta, date, time as dt_time
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Query, Form
import io
import csv
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

from models import (
    AdminUser, LoginPayload, TokenResponse,
    SiteContent, Service, GalleryItem, Testimonial, FAQ, BlogPost,
    Inquiry, Client, Consultation, Availability, NewsletterSubscriber,
    CustomPalette,
)
from auth import hash_password, verify_password, create_token, require_admin
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

        if not await db.availability.find_one({"id": "availability_singleton"}, {"_id": 0}):
            await db.availability.insert_one(to_doc(Availability().model_dump()))
            logger.info("Seeded availability at startup")
    except Exception as e:
        logger.error("Startup seed failed: %s", e)


@app.on_event("shutdown")
async def _shutdown():
    mongo_client.close()


# =========================================================
# Auth
# =========================================================
@api.post("/auth/login", response_model=TokenResponse)
async def login(payload: LoginPayload):
    user = await db.admin_users.find_one({"email": payload.email.lower().strip()}, {"_id": 0})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user)
    return TokenResponse(token=token, user={"id": user["id"], "email": user["email"], "name": user.get("name", ""), "role": user.get("role", "admin")})


@api.get("/auth/me")
async def me(admin=Depends(require_admin)):
    user = await db.admin_users.find_one({"id": admin["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Not found")
    return user


@api.post("/admin/auth/change-credentials")
async def change_credentials(payload: Dict[str, Any], admin=Depends(require_admin)):
    """Allow the logged-in admin to change their email/password/name.

    Requires the current password for verification. Any of new_email/new_password/new_name
    may be omitted (only fields that are provided will change).
    """
    current_password = (payload.get("current_password") or "").strip()
    if not current_password:
        raise HTTPException(status_code=400, detail="Current password is required")

    user = await db.admin_users.find_one({"id": admin["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Admin not found")
    if not verify_password(current_password, user["password_hash"]):
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
async def get_site_content():
    doc = await db.site_content.find_one({"id": "site_content_singleton"}, {"_id": 0})
    if not doc:
        sc = SiteContent()
        await db.site_content.insert_one(to_doc(sc.model_dump()))
        return sc.model_dump()
    return doc


@api.put("/admin/site-content")
async def update_site_content(payload: Dict[str, Any], admin=Depends(require_admin)):
    payload["id"] = "site_content_singleton"
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.site_content.update_one({"id": "site_content_singleton"}, {"$set": to_doc(payload)}, upsert=True)
    doc = await db.site_content.find_one({"id": "site_content_singleton"}, {"_id": 0})
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
async def list_services(published: Optional[bool] = None):
    query: Dict[str, Any] = {}
    if published is not None:
        query["published"] = published
    docs = await db.services.find(query, {"_id": 0}).sort("order", 1).to_list(500)
    return docs


@api.get("/services/{slug}")
async def get_service(slug: str):
    doc = await db.services.find_one({"slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Service not found")
    return doc


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
async def list_gallery(category: Optional[str] = None, featured: Optional[bool] = None):
    query: Dict[str, Any] = {}
    if category and category != "all":
        query["category"] = category
    if featured is not None:
        query["featured"] = featured
    docs = await db.gallery.find(query, {"_id": 0}).sort("order", 1).to_list(1000)
    return docs


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


# =========================================================
# Testimonials
# =========================================================
@api.get("/testimonials")
async def list_testimonials(featured: Optional[bool] = None):
    query: Dict[str, Any] = {}
    if featured is not None:
        query["featured"] = featured
    docs = await db.testimonials.find(query, {"_id": 0}).sort("order", 1).to_list(500)
    return docs


@api.post("/admin/testimonials")
async def create_testimonial(payload: Dict[str, Any], admin=Depends(require_admin)):
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
# FAQs
# =========================================================
@api.get("/faqs")
async def list_faqs():
    docs = await db.faqs.find({}, {"_id": 0}).sort("order", 1).to_list(500)
    return docs


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


@api.get("/instagram/feed")
async def instagram_feed_public():
    posts = await ig.public_feed(db, limit=12)
    return posts



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
async def get_active_palette():
    pid = await _effective_palette_id()
    return await _resolve_palette(pid)


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
# Mount
# =========================================================
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
