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
    """Return available time slots for a date string YYYY-MM-DD."""
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
