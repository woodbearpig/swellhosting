"""Default 8-step inquiry form schema. Used as the seed value for
SiteContent.inquiry_form_schema and as fallback if the schema is empty.

Field types supported by the wizard renderer:
  - chips_single    : Bubble-shaped buttons, single choice
  - chips_multi     : Bubble-shaped buttons, multi choice
  - text            : Single-line text
  - textarea        : Multi-line text
  - email           : Email input
  - phone           : Phone input
  - date            : Date picker
  - time            : Time picker
  - number          : Numeric input
  - select          : Dropdown
  - radio           : Radio group (traditional, non-chip)
  - checkbox        : Boolean checkbox
  - file_upload     : Multi-file upload (image inspiration)
  - links_list      : Repeatable URL inputs (inspiration links)
  - section_note    : Rich-text-style help paragraph (no input)

Certain field ids are treated as "standard" and get mapped to Inquiry columns.
Everything else is stored under Inquiry.extra so submissions never lose data.
"""

STANDARD_FIELD_IDS = {
    "client_name", "client_email", "client_phone", "preferred_contact",
    "event_type", "event_date", "event_backup_date", "event_start_time", "event_end_time",
    "venue_name", "venue_address", "indoor_outdoor",
    "guest_count", "theme", "color_palette", "budget_range", "must_haves",
    "services_needed", "service_details",
    "inspiration_notes", "inspiration_links", "upload_urls",
    "venue_details",
}


def default_inquiry_form_schema():
    """Return the default 8-step inquiry form schema (deep-copied dict)."""
    return {
        "version": 1,
        "steps": [
            {
                "id": "step-event",
                "title": "The occasion",
                "description": "What are we celebrating?",
                "fields": [
                    {
                        "id": "event_type",
                        "type": "chips_single",
                        "label": "Event type",
                        "help": "Pick the closest match — we'll take it from there.",
                        "required": True,
                        "options": [
                            {"value": "wedding", "label": "Wedding"},
                            {"value": "birthday", "label": "Birthday"},
                            {"value": "corporate", "label": "Corporate"},
                            {"value": "baby_shower", "label": "Baby shower"},
                            {"value": "bridal_shower", "label": "Bridal shower"},
                            {"value": "grand_opening", "label": "Grand opening"},
                            {"value": "holiday", "label": "Holiday"},
                            {"value": "other", "label": "Other / not sure"},
                        ],
                    },
                ],
            },
            {
                "id": "step-contact",
                "title": "About you",
                "description": "So we know how to reach you.",
                "fields": [
                    {"id": "client_name", "type": "text", "label": "Your name", "required": True, "placeholder": "Full name"},
                    {"id": "client_email", "type": "email", "label": "Email", "required": True, "placeholder": "you@email.com"},
                    {"id": "client_phone", "type": "phone", "label": "Phone (optional)", "required": False, "placeholder": "(310) 555-0134"},
                    {
                        "id": "preferred_contact", "type": "chips_single", "label": "Preferred contact",
                        "required": False,
                        "options": [
                            {"value": "email", "label": "Email"},
                            {"value": "phone", "label": "Phone call"},
                            {"value": "text", "label": "Text"},
                        ],
                    },
                ],
            },
            {
                "id": "step-when",
                "title": "When",
                "description": "Give us a rough date — we'll confirm availability.",
                "fields": [
                    {"id": "event_date", "type": "date", "label": "Event date"},
                    {"id": "event_backup_date", "type": "date", "label": "Backup date (optional)"},
                    {"id": "event_start_time", "type": "time", "label": "Start time"},
                    {"id": "event_end_time", "type": "time", "label": "End time"},
                ],
            },
            {
                "id": "step-venue",
                "title": "Where",
                "description": "Venue details help us plan the install.",
                "fields": [
                    {"id": "venue_name", "type": "text", "label": "Venue name", "placeholder": "e.g. The Fig House"},
                    {"id": "venue_address", "type": "text", "label": "Venue address"},
                    {
                        "id": "indoor_outdoor", "type": "chips_single", "label": "Indoor or outdoor?",
                        "options": [
                            {"value": "indoor", "label": "Indoor"},
                            {"value": "outdoor", "label": "Outdoor"},
                            {"value": "both", "label": "Both"},
                            {"value": "unsure", "label": "Not sure yet"},
                        ],
                    },
                    {"id": "guest_count", "type": "text", "label": "Guest count (optional)", "placeholder": "e.g. 80"},
                ],
            },
            {
                "id": "step-style",
                "title": "The vision",
                "description": "Tell us the vibe — colors, mood, must-haves.",
                "fields": [
                    {"id": "theme", "type": "text", "label": "Theme or vibe (optional)", "placeholder": "e.g. Garden romance, boho-modern"},
                    {
                        "id": "color_palette", "type": "chips_multi", "label": "Color palette",
                        "help": "Pick as many as you like — or add your own in the notes.",
                        "options": [
                            {"value": "blush", "label": "Blush"},
                            {"value": "sage", "label": "Sage"},
                            {"value": "terracotta", "label": "Terracotta"},
                            {"value": "cream", "label": "Cream"},
                            {"value": "gold", "label": "Gold"},
                            {"value": "sand", "label": "Sand"},
                            {"value": "dusty blue", "label": "Dusty blue"},
                            {"value": "lavender", "label": "Lavender"},
                            {"value": "burgundy", "label": "Burgundy"},
                            {"value": "black", "label": "Black"},
                            {"value": "white", "label": "White"},
                            {"value": "coral", "label": "Coral"},
                        ],
                    },
                    {"id": "must_haves", "type": "textarea", "label": "Any must-haves?", "placeholder": "Anything you absolutely want us to include or avoid"},
                ],
            },
            {
                "id": "step-services",
                "title": "What you need",
                "description": "Pick the pieces you'd like us to design.",
                "fields": [
                    {
                        "id": "services_needed", "type": "chips_multi", "label": "Services",
                        "options": [
                            {"value": "balloon_garland", "label": "Balloon garland"},
                            {"value": "balloon_arch", "label": "Balloon arch"},
                            {"value": "balloon_wall", "label": "Balloon wall / backdrop"},
                            {"value": "columns", "label": "Balloon columns"},
                            {"value": "ceiling", "label": "Ceiling balloons"},
                            {"value": "organic_install", "label": "Organic install"},
                            {"value": "photo_backdrop", "label": "Photo backdrop"},
                            {"value": "centerpieces", "label": "Centerpieces"},
                            {"value": "florals", "label": "Florals"},
                            {"value": "custom_signs", "label": "Custom signage"},
                            {"value": "dessert_table", "label": "Dessert table"},
                            {"value": "lighting", "label": "Lighting"},
                            {"value": "custom", "label": "Something else"},
                        ],
                    },
                ],
            },
            {
                "id": "step-budget",
                "title": "Budget",
                "description": "So we can tailor the proposal to your comfort level.",
                "fields": [
                    {
                        "id": "budget_range", "type": "chips_single", "label": "Budget range",
                        "options": [
                            {"value": "$500 – $1,000", "label": "$500 – $1,000"},
                            {"value": "$1,000 – $2,500", "label": "$1,000 – $2,500"},
                            {"value": "$2,500 – $5,000", "label": "$2,500 – $5,000"},
                            {"value": "$5,000 – $10,000", "label": "$5,000 – $10,000"},
                            {"value": "$10,000+", "label": "$10,000+"},
                            {"value": "flexible", "label": "Flexible — open to suggestions"},
                        ],
                    },
                ],
            },
            {
                "id": "step-inspiration",
                "title": "Inspiration",
                "description": "Photos or links help us match your vision.",
                "fields": [
                    {"id": "inspiration_notes", "type": "textarea", "label": "Notes (optional)", "placeholder": "Anything else we should know"},
                    {"id": "inspiration_links", "type": "links_list", "label": "Inspiration links", "help": "Pinterest, Instagram, etc."},
                    {"id": "upload_urls", "type": "file_upload", "label": "Upload photos", "help": "JPG, PNG, HEIC or WebP."},
                ],
            },
        ],
    }
