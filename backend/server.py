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
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

from models import (
    AdminUser, LoginPayload, TokenResponse,
    SiteContent, Service, GalleryItem, Testimonial, FAQ, BlogPost,
    Inquiry, Client, Consultation, Availability, NewsletterSubscriber,
)
from auth import hash_password, verify_password, create_token, require_admin
from email_service import send_email, inquiry_confirmation_html, consultation_confirmation_html
from crypto_utils import encrypt, decrypt
import google_calendar as gcal
import instagram_service as ig
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
        existing = await db.admin_users.find_one({"email": admin_email}, {"_id": 0})
        if not existing:
            await db.admin_users.insert_one({
                "id": "admin_root",
                "email": admin_email,
                "name": admin_name,
                "password_hash": hash_password(admin_password),
                "role": "admin",
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            logger.info("Seeded admin user %s at startup", admin_email)
        else:
            await db.admin_users.update_one(
                {"email": admin_email},
                {"$set": {"password_hash": hash_password(admin_password), "name": admin_name}},
            )

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


# =========================================================
# Uploads
# =========================================================
@api.post("/uploads")
async def upload_file(file: UploadFile = File(...)):
    ext = Path(file.filename or "").suffix.lower() or ".bin"
    if ext not in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".pdf"}:
        raise HTTPException(status_code=400, detail="Unsupported file type")
    name = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOAD_DIR / name
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)
    return {"url": f"/api/uploads/{name}", "filename": name}


@api.get("/uploads/{name}")
async def get_upload(name: str):
    dest = UPLOAD_DIR / name
    if not dest.exists() or not dest.is_file():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(str(dest))


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
    obj = Inquiry(**payload)
    doc = to_doc(obj.model_dump())
    await db.inquiries.insert_one(doc)

    # Auto-create client
    client_id = await _get_or_create_client(obj.client_name, obj.client_email, obj.client_phone, obj.id)
    if client_id:
        await db.inquiries.update_one({"id": obj.id}, {"$set": {"client_id": client_id}})

    # Send confirmation emails (best-effort)
    if obj.client_email:
        send_email(
            to=obj.client_email,
            subject="We received your inquiry — swell design + media",
            html=inquiry_confirmation_html(obj.client_name or "friend", obj.event_type or ""),
        )
    biz_email = os.environ.get("BUSINESS_EMAIL", "")
    if biz_email:
        send_email(
            to=biz_email,
            subject=f"New inquiry: {obj.event_type or 'event'} — {obj.client_name}",
            html=f"<pre style='font-family: Menlo, monospace;'>{obj.model_dump_json(indent=2)}</pre>",
        )

    return {"id": obj.id, "ok": True}


@api.get("/admin/inquiries")
async def admin_list_inquiries(status: Optional[str] = None, admin=Depends(require_admin)):
    query: Dict[str, Any] = {}
    if status and status != "all":
        query["status"] = status
    docs = await db.inquiries.find(query, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return docs


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

    if date_str in av.get("blackout_dates", []):
        return {"date": date_str, "slots": []}

    if d < date.today():
        return {"date": date_str, "slots": []}

    ranges = av.get("weekly", {}).get(_day_key(d), [])
    slot_minutes = int(av.get("slot_minutes", 30))
    buffer_minutes = int(av.get("buffer_minutes", 15))

    duration = slot_minutes
    for ct in av.get("consultation_types", []):
        if ct.get("key") == consultation_type:
            duration = int(ct.get("duration", slot_minutes))
            break

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
                # Convert to naive local for comparison (approximation OK for slot blocking)
                if s.tzinfo:
                    s = s.astimezone().replace(tzinfo=None)
                if e.tzinfo:
                    e = e.astimezone().replace(tzinfo=None)
                # Only block if same date
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
    return {
        "connected": connected,
        "email": doc.get("email", ""),
        "name": doc.get("name", ""),
        "client_id": doc.get("client_id", ""),
        "has_client_secret": bool(doc.get("client_secret_enc")),
        "connected_at": doc.get("connected_at"),
        "updated_at": doc.get("updated_at"),
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
