from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Any, Dict
from datetime import datetime, timezone
import uuid


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uid() -> str:
    return str(uuid.uuid4())


class Base(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)


# =========================
# Auth
# =========================
class AdminUser(Base):
    id: str = Field(default_factory=_uid)
    email: str
    name: str = ""
    password_hash: str
    role: str = "admin"
    created_at: datetime = Field(default_factory=_now)


class LoginPayload(Base):
    email: str
    password: str


class TokenResponse(Base):
    token: str
    user: Dict[str, Any]


# =========================
# Site Content (singleton)
# =========================
class SiteContent(Base):
    id: str = Field(default_factory=lambda: "site_content_singleton")
    business_name: str = "swell design + media"
    tagline: str = "Custom balloon installations & event styling in Los Angeles"
    logo_url: str = "https://customer-assets-v7afamib.emergentagent.net/job_balloon-decor-cms/artifacts/ql3sxydk_image.png"

    # Hero
    hero_eyebrow: str = "LOS ANGELES • BALLOON INSTALLATIONS • EVENT STYLING"
    hero_headline: str = "Dreamy balloon installations for celebrations that feel like you."
    hero_subhead: str = "Custom design, thoughtful details, and a calm process — from inquiry to install."
    hero_image_url: str = "https://images.unsplash.com/photo-1649615644622-6d83f48e69c5?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85"
    hero_primary_cta_label: str = "Start your inquiry"
    hero_primary_cta_href: str = "/inquire"
    hero_secondary_cta_label: str = "View the gallery"
    hero_secondary_cta_href: str = "/gallery"

    # About
    about_short: str = "A boutique LA-based studio designing dreamy, custom event installations — from intimate showers to weddings and brand launches."
    about_full: str = "swell design + media is a boutique event styling studio based in Los Angeles. We specialize in custom balloon installations, thoughtful florals, and full-service event decor for weddings, birthdays, baby & bridal showers, corporate gatherings, grand openings, and holiday celebrations. Every design is made just for you — no cookie-cutter kits, no rushing. Just a calm, collaborative process from first inquiry to the moment your guests walk in."
    about_image_url: str = "https://images.unsplash.com/photo-1649615644613-758b850399c1?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85"
    designer_name: str = "Meet the designer"
    designer_bio: str = "Hi, I'm the heart behind swell design + media. I fell in love with balloons after decorating my daughter's first birthday — and haven't stopped since. I care deeply about the small details that make an event feel unmistakably you."

    # Promo
    promo_active: bool = True
    promo_title: str = "Autumn celebrations, thoughtfully styled"
    promo_text: str = "Book any full-service install in October or November and receive a complimentary welcome sign design."
    promo_cta_label: str = "See seasonal offer"
    promo_cta_href: str = "/inquire"

    # Contact
    contact_email: str = "hello@swelldesignla.com"
    contact_phone: str = "(310) 555-0134"
    contact_location: str = "Los Angeles, CA & surrounding"
    contact_hours: str = "Tue–Sat • by appointment"

    # Social
    instagram_url: str = "https://instagram.com/swelldesignla"
    facebook_url: str = ""
    pinterest_url: str = ""
    tiktok_url: str = ""

    # Footer
    footer_blurb: str = "Custom event styling & balloon installations. Los Angeles, California."

    # Newsletter
    newsletter_title: str = "Stay in the loop"
    newsletter_subtitle: str = "Seasonal offers, styling tips, and behind-the-scenes."

    # Coming Soon / Maintenance mode
    coming_soon_active: bool = False
    coming_soon_eyebrow: str = "SOMETHING BEAUTIFUL IS COMING"
    coming_soon_title: str = "We\u2019re styling something dreamy."
    coming_soon_script: str = "stay tuned"
    coming_soon_message: str = "A boutique event styling studio launching soon in Los Angeles \u2014 custom balloon installations, thoughtful florals, and dreamy details for weddings, showers, birthdays, and brand moments."
    coming_soon_launch_date: str = ""

    # Coming Soon page — independent visibility toggles + custom content
    coming_soon_show_logo: bool = True
    coming_soon_show_newsletter: bool = True
    coming_soon_show_email: bool = True
    coming_soon_show_phone: bool = True
    coming_soon_show_instagram: bool = True
    coming_soon_show_footer: bool = True
    coming_soon_show_admin_link: bool = True
    # Optional overrides (leave empty to fall back to main contact fields)
    coming_soon_email_override: str = ""
    coming_soon_phone_override: str = ""
    coming_soon_instagram_override: str = ""
    coming_soon_instagram_label: str = "Follow along"
    coming_soon_footer_text: str = ""  # empty = auto-generate "© {year} {business_name} · {location}"
    coming_soon_newsletter_placeholder: str = "you@email.com"
    coming_soon_newsletter_button: str = "Notify me"

    updated_at: datetime = Field(default_factory=_now)


# =========================
# Service
# =========================
class ServicePackage(Base):
    id: str = Field(default_factory=_uid)
    name: str
    price_from: Optional[str] = None
    description: str = ""
    features: List[str] = Field(default_factory=list)


class ServiceFAQ(Base):
    id: str = Field(default_factory=_uid)
    question: str
    answer: str


class Service(Base):
    id: str = Field(default_factory=_uid)
    slug: str
    title: str
    subtitle: str = ""
    short_description: str = ""
    description: str = ""
    price_from: Optional[str] = None
    hero_image_url: str = ""
    images: List[str] = Field(default_factory=list)
    features: List[str] = Field(default_factory=list)
    packages: List[ServicePackage] = Field(default_factory=list)
    faqs: List[ServiceFAQ] = Field(default_factory=list)
    related_slugs: List[str] = Field(default_factory=list)
    seo_title: str = ""
    seo_description: str = ""
    order: int = 0
    published: bool = True
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


# =========================
# Gallery
# =========================
class GalleryItem(Base):
    id: str = Field(default_factory=_uid)
    title: str = ""
    caption: str = ""
    image_url: str
    category: str = "weddings"  # weddings | birthdays | corporate | showers | holidays | grand-openings | other
    tags: List[str] = Field(default_factory=list)
    featured: bool = False
    order: int = 0
    created_at: datetime = Field(default_factory=_now)


# =========================
# Testimonial
# =========================
class Testimonial(Base):
    id: str = Field(default_factory=_uid)
    name: str
    event_type: str = ""
    quote: str
    rating: int = 5
    photo_url: str = ""
    featured: bool = False
    order: int = 0
    created_at: datetime = Field(default_factory=_now)


# =========================
# FAQ
# =========================
class FAQ(Base):
    id: str = Field(default_factory=_uid)
    category: str = "General"
    question: str
    answer: str
    order: int = 0


# =========================
# Blog
# =========================
class BlogPost(Base):
    id: str = Field(default_factory=_uid)
    slug: str
    title: str
    excerpt: str = ""
    content: str = ""
    cover_image_url: str = ""
    tags: List[str] = Field(default_factory=list)
    author: str = "swell design + media"
    published: bool = True
    published_at: datetime = Field(default_factory=_now)
    created_at: datetime = Field(default_factory=_now)


# =========================
# Inquiry
# =========================
class Inquiry(Base):
    id: str = Field(default_factory=_uid)

    # Client
    client_name: str = ""
    client_email: str = ""
    client_phone: str = ""
    preferred_contact: str = "email"  # email | phone | text

    # Event
    event_type: str = ""  # wedding | birthday | corporate | baby_shower | bridal_shower | grand_opening | holiday | other
    event_date: Optional[str] = None
    event_backup_date: Optional[str] = None
    event_start_time: Optional[str] = None
    event_end_time: Optional[str] = None
    venue_name: str = ""
    venue_address: str = ""
    indoor_outdoor: str = ""  # indoor | outdoor | both | unsure
    guest_count: str = ""
    theme: str = ""
    color_palette: List[str] = Field(default_factory=list)
    budget_range: str = ""
    must_haves: str = ""

    # Services needed
    services_needed: List[str] = Field(default_factory=list)
    service_details: Dict[str, Any] = Field(default_factory=dict)  # per-service options

    # Inspiration
    inspiration_notes: str = ""
    inspiration_links: List[str] = Field(default_factory=list)
    upload_urls: List[str] = Field(default_factory=list)

    # Venue / Install details
    venue_details: Dict[str, Any] = Field(default_factory=dict)

    # Event-type specific answers
    extra: Dict[str, Any] = Field(default_factory=dict)

    # Meta
    status: str = "new"  # new | needs_follow_up | consult_scheduled | proposal_sent | booked | archived | lost
    admin_notes: str = ""
    tags: List[str] = Field(default_factory=list)
    source: str = "website"
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


# =========================
# Client (CRM lite)
# =========================
class Client(Base):
    id: str = Field(default_factory=_uid)
    name: str
    email: str = ""
    phone: str = ""
    address: str = ""
    tags: List[str] = Field(default_factory=list)
    status: str = "lead"  # lead | consult | proposal | booked | past | archived
    notes: str = ""
    inquiry_ids: List[str] = Field(default_factory=list)
    consultation_ids: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


# =========================
# Consultation Booking
# =========================
class Consultation(Base):
    id: str = Field(default_factory=_uid)
    client_name: str
    client_email: str
    client_phone: str = ""
    consultation_type: str = "phone"  # phone | video | in_person
    date: str  # YYYY-MM-DD
    time: str  # HH:MM (24h)
    duration_minutes: int = 30
    notes: str = ""
    status: str = "scheduled"  # scheduled | completed | cancelled | no_show
    client_id: Optional[str] = None
    inquiry_id: Optional[str] = None
    created_at: datetime = Field(default_factory=_now)


class Availability(Base):
    """Weekly availability rules (singleton doc)."""
    id: str = Field(default_factory=lambda: "availability_singleton")
    # Per-weekday hours ranges. Days: mon..sun
    weekly: Dict[str, List[Dict[str, str]]] = Field(default_factory=lambda: {
        "mon": [],
        "tue": [{"start": "10:00", "end": "17:00"}],
        "wed": [{"start": "10:00", "end": "17:00"}],
        "thu": [{"start": "10:00", "end": "17:00"}],
        "fri": [{"start": "10:00", "end": "17:00"}],
        "sat": [{"start": "11:00", "end": "15:00"}],
        "sun": [],
    })
    blackout_dates: List[str] = Field(default_factory=list)  # YYYY-MM-DD list
    slot_minutes: int = 30
    buffer_minutes: int = 15
    consultation_types: List[Dict[str, Any]] = Field(default_factory=lambda: [
        {"key": "phone", "label": "Phone consult", "duration": 20},
        {"key": "video", "label": "Video consult", "duration": 30},
        {"key": "in_person", "label": "In-person / site visit", "duration": 60},
    ])
    updated_at: datetime = Field(default_factory=_now)


# =========================
# Newsletter
# =========================
class NewsletterSubscriber(Base):
    id: str = Field(default_factory=_uid)
    email: str
    source: str = "footer"
    created_at: datetime = Field(default_factory=_now)
