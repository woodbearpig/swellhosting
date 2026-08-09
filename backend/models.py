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
    # Hero layout: "split" (current: text-left, portrait-right) or "full_bleed" (Canva-style: photo behind headline)
    hero_layout_mode: str = "split"
    # Only used in full_bleed mode — the wide background photo. If empty, falls back to hero_image_url.
    hero_background_image_url: str = ""
    # Overlay intensity for full_bleed hero: 0.0 (none) to 1.0 (fully black). Default gives cream text good legibility.
    hero_overlay_intensity: float = 0.45
    hero_primary_cta_label: str = "Start your inquiry"
    hero_primary_cta_href: str = "/inquire"
    hero_secondary_cta_label: str = "View the gallery"
    hero_secondary_cta_href: str = "/portfolio"
    # Small chip badges below the hero CTA buttons ("Fully custom", "On-site install", etc.)
    hero_badges_active: bool = True
    hero_badges: List[str] = Field(default_factory=lambda: ["Fully custom", "On-site install", "LA + surrounding"])

    # Hero text & button color overrides (applies to BOTH layout modes).
    # Empty string = use theme defaults (Full-bleed defaults to cream, Split uses standard body text color).
    # These are especially useful in Full-bleed mode where the background photo can clash with default text colors.
    hero_headline_color: str = ""      # e.g. "#F7EFE1" (cream) or "#111111" (dark)
    hero_subhead_color: str = ""
    hero_eyebrow_color: str = ""
    hero_primary_btn_bg: str = ""      # background of primary CTA button
    hero_primary_btn_text: str = ""    # text/label color of primary CTA
    hero_secondary_btn_bg: str = ""    # background of secondary CTA (transparent-ish by default in fullbleed)
    hero_secondary_btn_text: str = ""  # text/label color of secondary CTA

    # About
    about_short: str = "A boutique LA-based studio designing dreamy, custom event installations — from intimate showers to weddings and brand launches."
    about_full: str = "swell design + media is a boutique event styling studio based in Los Angeles. We specialize in custom balloon installations, thoughtful florals, and full-service event decor for weddings, birthdays, baby & bridal showers, corporate gatherings, grand openings, and holiday celebrations. Every design is made just for you — no cookie-cutter kits, no rushing. Just a calm, collaborative process from first inquiry to the moment your guests walk in."
    about_image_url: str = "https://images.unsplash.com/photo-1649615644613-758b850399c1?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85"
    # Same ratio + fit knobs as the Meet-the-Designer photo, applied to the
    # About page hero image. Defaults kept safe for the current image.
    about_image_aspect: str = "portrait"  # 'portrait'|'landscape'|'wide'|'square'|'auto'|'fill'
    about_image_fit: str = "cover"        # 'cover' | 'contain'
    # How the About image sits relative to the bio text.
    #   'side'    – classic two-column, image left, text right (current default)
    #   'stacked' – single column, image spans full width ABOVE the text.
    #               Ideal for wide diptych photos so both halves stay visible.
    #   'sticky'  – two-column, but the image pins to the viewport and follows
    #               the reader as they scroll a longer bio.
    about_image_layout: str = "side"
    designer_name: str = "Meet the designer"
    designer_bio: str = "Hi, I'm the heart behind swell design + media. I fell in love with balloons after decorating my daughter's first birthday — and haven't stopped since. I care deeply about the small details that make an event feel unmistakably you."
    # Optional overrides for the homepage "Meet the designer" section. Any
    # blank value falls back to a sensible default in the template.
    designer_eyebrow: str = "MEET THE DESIGNER"
    designer_image_url: str = ""  # Falls back to about_image_url when empty
    # How the designer photo is framed on the homepage. `image_aspect` controls
    # the container's aspect ratio; `image_fit` controls whether the photo is
    # cropped ("cover") or shown in full with subtle letterboxing ("contain").
    # Wide diptych images (like the client's silver-balloons + portrait combo)
    # look best with aspect="wide" + fit="cover", or aspect="auto" + fit="contain"
    # to preserve the whole composition.
    designer_image_aspect: str = "portrait"  # 'portrait' | 'landscape' | 'wide' | 'square' | 'auto' | 'fill'
    designer_image_fit: str = "cover"        # 'cover' | 'contain'
    # Layout mode – see about_image_layout above for semantics.
    designer_image_layout: str = "side"      # 'side' | 'stacked' | 'sticky'    designer_cta_primary_label: str = "Start your inquiry"
    designer_cta_primary_href: str = "/inquire"
    designer_cta_secondary_label: str = "Read the story"
    designer_cta_secondary_href: str = "/about"
    # Optional hand-signed signature rendered under the bio in the script font
    # (e.g. "— Sam" or the owner's first name). Leave blank to hide.
    designer_signature: str = ""

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
    home_backdrops_eyebrow: str = "BUILDING BLOCKS"
    home_backdrops_title: str = "Backdrops"
    home_backdrops_subtitle: str = "The standalone pieces that anchor an install. Mix, match, and add florals or balloons."
    home_designs_eyebrow: str = "COMPLETE LOOKS"
    home_designs_title: str = "Designs"
    home_designs_subtitle: str = "Ready-to-book themed setups \u2014 palette, florals, balloons, and accents chosen together."
    home_faq_eyebrow: str = "COMMON QUESTIONS"
    home_faq_title: str = "Good things to know"

    # Value Pillars — a Canva-style narrative section for the homepage.
    # Left column: a large italic-accent headline + a tagline. The headline
    # supports **word emphasis** by wrapping words in asterisks: use *word*
    # for italic-serif accents (matches the client's Canva reference layout).
    # Right column: a repeatable list of short essays (title + longer body).
    #
    # Defaults are inspired by the client's own Canva site copy so she has
    # meaningful placeholder content the moment she enables the section.
    home_pillars_active: bool = False
    home_pillars_eyebrow: str = "OUR PROMISE"
    home_pillars_headline: str = "We create *long-lasting pieces* that make a difference"
    home_pillars_tagline: str = "We take pride in our products."
    home_pillars_items: List[Dict[str, str]] = Field(default_factory=lambda: [
        {"title": "Sustainable and Durable", "body": "Our designs are able to last for up to 4 weeks if left indoors. It is important to us at swell design + media that you get the most use you can out of our designs."},
        {"title": "Taking your stress away", "body": "Party planning, designing and decorating can be overwhelming. Let us take the reins for you. By providing us with a few details of what you have in mind, we are able to bring your vision to life."},
    ])

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
    home_instagram_active: bool = True
    home_process_active: bool = True
    home_testimonials_active: bool = True
    home_backdrops_active: bool = True
    home_designer_active: bool = True
    home_faq_active: bool = True
    home_final_cta_active: bool = True

    # Editable copy for the "Ready to plan something dreamy?" call-to-action
    # block at the bottom of the homepage. Every string is optional — blank
    # eyebrow/subtitle simply hide themselves, and a blank secondary label
    # hides the second button entirely (which fixes the duplicate-button bug
    # where an unused secondary was rendering with the primary's label).
    home_final_cta_show_heart: bool = True
    home_final_cta_eyebrow: str = ""
    home_final_cta_title: str = "Ready to plan something dreamy?"
    home_final_cta_subtitle: str = "Take two minutes to share your vision. We'll be in touch within 1–2 business days."
    home_final_cta_primary_label: str = "Start your inquiry"
    home_final_cta_primary_href: str = "/inquire"
    home_final_cta_secondary_label: str = ""     # blank = hide the secondary button
    home_final_cta_secondary_href: str = "/portfolio"

    # Hero-specific font overrides. Empty string = use the site-wide font
    # for that role (serif for headline, sans for eyebrow + subtitle). These
    # let the owner pick a dramatic display font for the hero without
    # affecting section headings or body copy across the rest of the site.
    # Values are IDs from FONT_PRESETS (see frontend/src/lib/fonts.js).
    hero_eyebrow_font_id: str = ""     # e.g. "montserrat" — falls back to site sans
    hero_headline_font_id: str = ""    # e.g. "dmserif"     — falls back to site serif
    hero_subhead_font_id: str = ""     # e.g. "figtree"     — falls back to site sans

    # Social / SEO share metadata – governs how the site's URL renders when
    # pasted into iMessage, Instagram DMs, Slack, Twitter, etc. Blank falls
    # back to the base <title>/<meta description> so the site still looks
    # decent out of the box.
    share_title: str = ""             # <title>-style headline for link previews
    share_description: str = ""       # 1-2 sentence description
    share_image_url: str = ""         # 1200×630 recommended
    share_twitter_handle: str = ""    # optional, e.g. "@swelldesignla"
    favicon_url: str = ""             # optional PNG/ICO/SVG uploaded via admin; falls back to /favicon.ico

    # Services page — governs whether the standalone /services PAGE is enabled
    # site-wide. When false: (1) the "Services" nav item is hidden from header &
    # footer, (2) /services and /services/:slug redirect to the home page.
    # This is separate from `home_services_active` which only controls the
    # services grid *on the homepage*. Owners can turn the whole services
    # experience off (e.g. while they figure out their pricing) without losing
    # their configuration.
    services_page_active: bool = True

    # Blog — off by default. Most event stylists don't blog, or use their IG
    # feed as their "blog". When false: /blog and /blog/:slug redirect to home,
    # the "Blog" item is hidden from header & footer nav. Owner can flip it on
    # anytime; her existing blog posts are preserved.
    blog_page_active: bool = False

    # FAQ — off by default until the client fills in her Q&As. When false:
    # /faq redirects to home, the "FAQ" item is hidden from header & footer.
    # Homepage FAQ preview section is separately governed by home_faq_active.
    faq_page_active: bool = False

    # Home Instagram feed (editable labels + post count)
    home_instagram_eyebrow: str = "LATEST FROM INSTAGRAM"
    home_instagram_title: str = "Follow along"
    home_instagram_subtitle: str = ""
    home_instagram_count: int = 12

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
        {"id": "nav-backdrops", "label": "Backdrops", "href": "/backdrops", "visible": True, "new_tab": False},
        {"id": "nav-gallery", "label": "Portfolio", "href": "/portfolio", "visible": True, "new_tab": False},
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

    # Editable list of portfolio category filter "bubbles" shown on the public
    # /portfolio page AND used as the category dropdown when the owner uploads
    # or edits a photo in Admin → Portfolio. Each entry is {key, label}:
    #   - `key`   – stable, url-safe slug stored on each GalleryItem.category
    #   - `label` – human display name shown on the filter chip
    # Fully manageable from Admin → Portfolio → "Manage categories". Order in
    # this list controls the chip order on the public page.
    gallery_categories: List[Dict[str, str]] = Field(default_factory=lambda: [
        {"key": "weddings",       "label": "Weddings"},
        {"key": "birthdays",      "label": "Birthdays"},
        {"key": "corporate",      "label": "Corporate"},
        {"key": "showers",        "label": "Showers"},
        {"key": "holidays",       "label": "Holidays"},
        {"key": "grand-openings", "label": "Grand openings"},
        {"key": "other",          "label": "Other"},
    ])

    # Backdrops page visibility toggles + editable copy for both the top
    # "Backdrops" section header AND the (optional) "Designs" section header
    # that appears below it on the same page.
    backdrops_page_show_header: bool = True
    backdrops_page_show_grid: bool = True
    backdrops_page_eyebrow: str = "BUILDING BLOCKS"
    backdrops_page_title: str = "Backdrops"
    backdrops_page_subtitle: str = "Our reusable structures — the anchor of every install. Add florals, balloons, and signage to make each one yours."
    # Designs group on the /backdrops page (rendered as a second labeled
    # section below the Backdrops group). Set show_designs=false to hide.
    backdrops_page_show_designs: bool = True
    backdrops_page_designs_eyebrow: str = "COMPLETE LOOKS"
    backdrops_page_designs_title: str = "Designs"
    backdrops_page_designs_subtitle: str = "Fully-styled setups combining florals, balloons, and signage — themed and ready to go."

    # Legal / utility pages — Terms & Privacy. Both pages are fully editable
    # from the admin: title, an optional short eyebrow line, and a long-form
    # body. The body preserves line breaks and blank lines as paragraphs and
    # supports `**bold**` and simple bullet lines starting with `- `. Defaults
    # match the client's existing Canva Terms + Conditions copy so the page
    # is meaningful out of the box.
    terms_page_eyebrow: str = ""
    terms_page_title: str = "Terms + Conditions"
    terms_page_body: str = (
        "By purchasing our balloon garland, you agree to the following terms and conditions:\n\n"
        "**1. Final Sale:** All sales are final. Once your order is placed, it cannot be canceled or refunded.\n\n"
        "**2. Responsibility Upon Receipt:** The balloon artist is not responsible for any deflation or damage to the balloon garland once it is in your possession. Please handle the garland with care to ensure its longevity.\n\n"
        "By completing your purchase, you acknowledge that you have read, understood, and agree to these terms and conditions. Thank you for your understanding and support!"
    )
    terms_page_updated_at: str = ""  # e.g. "Updated Oct 2025" — optional display line

    privacy_page_eyebrow: str = ""
    privacy_page_title: str = "Privacy Policy"
    privacy_page_body: str = (
        "swell design + media respects your privacy. We collect only the information you voluntarily provide through inquiries and consultations — your name, contact details, event details, and any inspiration you choose to share — in order to design a proposal and communicate with you about your event.\n\n"
        "We never sell your information. We may use it to reach out about your inquiry, send confirmations, and share seasonal offers if you opt in to our newsletter. You can request removal of your information at any time by emailing us.\n\n"
        "This policy may be updated periodically. For questions, please contact us."
    )
    privacy_page_updated_at: str = ""

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
    # Moderation status: "approved" (visible on site) | "pending" (in admin queue, not public) | "rejected"
    # Legacy rows without this field default to "approved" so nothing hides after migration.
    status: str = "approved"
    # Optional email captured on public submission — visible ONLY in admin, never returned publicly.
    reviewer_email: str = ""
    order: int = 0
    created_at: datetime = Field(default_factory=_now)


# =========================
# Backdrop — catalog item (a reusable structure the studio offers, e.g. Trio Rounded Arch, Hoop)
# =========================
class Backdrop(Base):
    id: str = Field(default_factory=_uid)
    name: str
    subtitle: str = ""            # short helper text like "(can fit 160 champagne flutes)"
    description: str = ""         # optional longer description shown on detail card
    image_url: str = ""
    price_from: Optional[str] = None
    featured: bool = False        # show on homepage featured section
    # Kind: 'backdrop' (physical structure) or 'design' (themed setup / complete look).
    # Both share the same schema; the frontend groups them in separate sections.
    kind: str = "backdrop"
    order: int = 0
    active: bool = True           # hide from public without deleting
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


# =========================
# Reply template — pre-written email bodies for inquiries.
# Templates support placeholders: {client_name}, {first_name}, {event_type},
# {event_date}, {guest_count}, {venue}, {business_name}
# =========================
class ReplyTemplate(Base):
    id: str = Field(default_factory=_uid)
    name: str                     # short label shown in the "Reply with..." dropdown
    subject: str                  # email subject line (supports placeholders)
    body: str                     # email body — plain text with newlines; placeholders substituted client-side
    order: int = 0
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


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
