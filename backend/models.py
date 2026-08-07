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
    logo_url: str = ""

    # Hero
    hero_eyebrow: str = "LOS ANGELES • BALLOON INSTALLATIONS • EVENT STYLING"
    hero_headline: str = "Dreamy balloon installations for celebrations that feel like you."
    hero_subhead: str = "Custom design, thoughtful details, and a calm process — from inquiry to install."
    hero_image_url: str = "https://images.unsplash.com/photo-1649615644622-6d83f48e69c5?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85"
    hero_primary_cta_label: str = "Start your inquiry"
    hero_primary_cta_href: str = "/inquire"
    hero_secondary_cta_label: str = "View the gallery"
    hero_secondary_cta_href: str = "/gallery"
    # Small chip badges below the hero CTA buttons ("Fully custom", "On-site install", etc.)
    hero_badges_active: bool = True
    hero_badges: List[str] = Field(default_factory=lambda: ["Fully custom", "On-site install", "LA + surrounding"])

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

    # Palette
    active_palette_id: str = "signature"

    # Home page section labels (editable eyebrows + titles)
    home_services_eyebrow: str = "WHAT WE DO"
    home_services_title: str = "Designed for the moments that matter"
    home_services_subtitle: str = "We style celebrations end-to-end \u2014 from balloons to florals, backdrops to signage."
    home_gallery_eyebrow: str = "RECENT WORK"
    home_gallery_title: str = "Moments we\u2019ve styled"
    home_gallery_subtitle: str = "A glimpse into the celebrations we\u2019ve been lucky to design."
    home_process_eyebrow: str = "THE PROCESS"
    home_process_title: str = "A calm, collaborative process"
    home_process_subtitle: str = "No overwhelm, no cookie-cutter kits \u2014 just thoughtful design from first inquiry to install."
    home_testimonials_eyebrow: str = "KIND WORDS"
    home_testimonials_title: str = "Loved by families & brands"
    home_faq_eyebrow: str = "COMMON QUESTIONS"
    home_faq_title: str = "Good things to know"

    # Home process timeline (editable list)
    home_process_steps: List[Dict[str, str]] = Field(default_factory=lambda: [
        {"title": "Inquiry", "description": "Tell us about your event via our smart form."},
        {"title": "Design call", "description": "A relaxed conversation to align on the vision."},
        {"title": "Proposal", "description": "A tailored proposal with pricing + palette."},
        {"title": "Install", "description": "We handle the build, delivery, and on-site setup."},
        {"title": "Enjoy", "description": "You show up and take it all in. That\u2019s it."},
    ])
    # Home section visibility
    home_services_active: bool = True
    home_gallery_active: bool = True
    home_process_active: bool = True
    home_testimonials_active: bool = True
    home_designer_active: bool = True
    home_faq_active: bool = True
    home_final_cta_active: bool = True

    # Footer element visibility + copyright override
    footer_show_logo: bool = True
    footer_show_explore: bool = True
    footer_show_contact_block: bool = True
    footer_show_email: bool = True
    footer_show_phone: bool = True
    footer_show_location: bool = True
    footer_show_hours: bool = True
    footer_show_social: bool = True
    footer_show_newsletter: bool = True
    footer_show_legal_links: bool = True
    footer_copyright_override: str = ""

    # Header element visibility
    header_show_logo: bool = True
    header_show_theme_toggle: bool = True
    header_show_inquire_cta: bool = True

    # Header navigation items (CMS-driven, ordered)
    header_nav_items: List[Dict[str, Any]] = Field(default_factory=lambda: [
        {"id": "nav-services", "label": "Services", "href": "/services", "visible": True, "new_tab": False},
        {"id": "nav-gallery", "label": "Gallery", "href": "/gallery", "visible": True, "new_tab": False},
        {"id": "nav-about", "label": "About", "href": "/about", "visible": True, "new_tab": False},
        {"id": "nav-testimonials", "label": "Testimonials", "href": "/testimonials", "visible": True, "new_tab": False},
        {"id": "nav-blog", "label": "Blog", "href": "/blog", "visible": True, "new_tab": False},
        {"id": "nav-faq", "label": "FAQ", "href": "/faq", "visible": True, "new_tab": False},
        {"id": "nav-contact", "label": "Contact", "href": "/contact", "visible": True, "new_tab": False},
    ])

    # About page visibility toggles
    about_show_image: bool = True
    about_show_designer: bool = True
    about_show_ctas: bool = True

    # Services listing page visibility toggles
    services_page_show_header: bool = True
    services_page_show_grid: bool = True

    # Gallery page visibility toggles
    gallery_page_show_header: bool = True
    gallery_page_show_filters: bool = True
    gallery_page_show_grid: bool = True

    # Contact page visibility toggles
    contact_page_show_header: bool = True
    contact_page_show_info_block: bool = True
    contact_page_show_form: bool = True

    # Season Auto-Switch palette schedules
    # Each item: { id, label, enabled, palette_id, start_month, start_day, end_month, end_day,
    #              repeats_yearly (bool), year (optional int for one-off) }
    palette_schedules: List[Dict[str, Any]] = Field(default_factory=list)

    # Dynamic inquiry form schema (CMS-driven multi-step wizard)
    # Structure: { version: int, steps: [ { id, title, description, fields: [ {id, type, label, ...} ] } ] }
    # An empty dict means "use the default 8-step template".
    inquiry_form_schema: Dict[str, Any] = Field(default_factory=dict)

    # Typography — preset ids that map to Google Fonts (see frontend fonts.js)
    font_serif_id: str = "cormorant"   # Headings / display font
    font_sans_id: str = "manrope"      # Body font
    font_script_id: str = "allura"     # Accent / script font ("" to disable)

    updated_at: datetime = Field(default_factory=_now)


# =========================


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
    featured: bool = False   # if True, gets a bigger 2x2 tile in the public grid
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

    # Consult (optional phone consultation booked as final step of the inquiry)
    consult_date: Optional[str] = None       # YYYY-MM-DD
    consult_time: Optional[str] = None       # HH:MM (24h) in the site's timezone
    consult_duration_minutes: Optional[int] = None
    consult_status: str = ""                 # "" | scheduled | completed | cancelled | no_show
    consult_calendar_event_id: str = ""      # Google Calendar event id, if created

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

    # NEW booking rules (owner-editable in Admin → Settings)
    advance_booking_days: int = 60      # how far in the future people can book
    minimum_lead_hours: int = 2         # min notice before a booking (blocks last-minute)
    daily_max_consults: int = 6         # cap on same-day bookings
    consult_duration_minutes: int = 30  # default consult length
    block_sundays: bool = True          # simple no-Sundays toggle

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


# =========================
# Custom Palette (user-created, e.g. from photo)
# =========================
class CustomPalette(Base):
    id: str = Field(default_factory=_uid)
    name: str
    category: str = "custom"
    mood: str = ""
    colors: Dict[str, str] = Field(default_factory=dict)
    is_preset: bool = False
    source_image_url: str = ""
    created_at: datetime = Field(default_factory=_now)
