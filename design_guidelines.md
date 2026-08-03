{
  "brand": {
    "name": "swell design + media",
    "domain": "swelldesignla.com",
    "attributes": [
      "boutique dreamy luxury",
      "watercolor + hand-crafted",
      "warm + feminine",
      "editorial + airy",
      "approachable (not corporate)"
    ],
    "logo": {
      "url": "https://customer-assets-v7afamib.emergentagent.net/job_balloon-decor-cms/artifacts/ql3sxydk_image.png",
      "usage": [
        "Keep logo on warm cream backgrounds in public site header/footer.",
        "In dark mode, place logo inside a soft-cream pill container (avoid recoloring the watercolor).",
        "Never place logo on gradients or busy photography; use a solid surface token." 
      ]
    }
  },

  "palette": {
    "notes": [
      "Palette is derived from the watercolor balloon logo: dusty rose/coral + warm peach/blush + sage green accents + warm cream base + deep charcoal text.",
      "Keep the UI mostly solid warm neutrals; use color as accents (badges, chips, active nav, small highlights).",
      "Gradients are allowed only as subtle section backgrounds (<=20% viewport) and must be light/desaturated." 
    ],

    "light_mode": {
      "background": "#FBF6EF",
      "surface": "#FFFFFF",
      "surface_2": "#F6EFE6",
      "text": "#1F1E1C",
      "text_muted": "#5E5A55",
      "border": "#E7D9CC",
      "ring": "#8FAE97",

      "sage_primary": "#8FAE97",
      "sage_deep": "#6F8F7A",
      "sage_tint": "#E6F0EA",

      "dusty_rose": "#C98F9B",
      "coral": "#D98A7A",
      "peach": "#E9B39A",
      "blush_tint": "#F7E3DD",

      "gold_foil_hint": "#C9A46A",

      "success": "#2F7D5A",
      "warning": "#B7791F",
      "destructive": "#B84A4A"
    },

    "dark_mode": {
      "background": "#141312",
      "surface": "#1B1917",
      "surface_2": "#23201D",
      "text": "#F4EFE8",
      "text_muted": "#C9C0B6",
      "border": "#3A332D",
      "ring": "#A9C7B2",

      "sage_primary": "#A9C7B2",
      "sage_deep": "#7FA58E",
      "sage_tint": "#223028",

      "dusty_rose": "#D7A3AE",
      "coral": "#E3A091",
      "peach": "#F0C2AA",
      "blush_tint": "#2A2321",

      "gold_foil_hint": "#D6B57A",

      "success": "#4CC38A",
      "warning": "#F2B35A",
      "destructive": "#F07A7A"
    },

    "allowed_gradients": {
      "hero_wash_light": "linear-gradient(135deg, rgba(233,179,154,0.22) 0%, rgba(201,143,155,0.18) 45%, rgba(143,174,151,0.18) 100%)",
      "hero_wash_dark": "linear-gradient(135deg, rgba(240,194,170,0.10) 0%, rgba(215,163,174,0.08) 45%, rgba(169,199,178,0.08) 100%)",
      "rules": [
        "Use only as section background overlays (hero top band, gallery header band).",
        "Max 20% viewport height.",
        "Never behind long paragraphs, tables, or forms.",
        "Never on small elements (<100px)."
      ]
    },

    "css_tokens_to_set_in_index_css": {
      "light": {
        "--background": "34 56% 96%",
        "--foreground": "30 10% 12%",
        "--card": "0 0% 100%",
        "--card-foreground": "30 10% 12%",
        "--popover": "0 0% 100%",
        "--popover-foreground": "30 10% 12%",
        "--primary": "145 18% 62%",
        "--primary-foreground": "34 56% 96%",
        "--secondary": "32 33% 93%",
        "--secondary-foreground": "30 10% 12%",
        "--muted": "32 33% 93%",
        "--muted-foreground": "28 8% 36%",
        "--accent": "12 38% 86%",
        "--accent-foreground": "30 10% 12%",
        "--destructive": "0 45% 50%",
        "--destructive-foreground": "34 56% 96%",
        "--border": "26 33% 86%",
        "--input": "26 33% 86%",
        "--ring": "145 18% 62%",
        "--radius": "0.9rem"
      },
      "dark": {
        "--background": "30 7% 8%",
        "--foreground": "34 40% 94%",
        "--card": "30 8% 10%",
        "--card-foreground": "34 40% 94%",
        "--popover": "30 8% 10%",
        "--popover-foreground": "34 40% 94%",
        "--primary": "145 22% 72%",
        "--primary-foreground": "30 7% 8%",
        "--secondary": "30 10% 14%",
        "--secondary-foreground": "34 40% 94%",
        "--muted": "30 10% 14%",
        "--muted-foreground": "30 12% 74%",
        "--accent": "10 18% 18%",
        "--accent-foreground": "34 40% 94%",
        "--destructive": "0 70% 70%",
        "--destructive-foreground": "30 7% 8%",
        "--border": "30 12% 20%",
        "--input": "30 12% 20%",
        "--ring": "145 22% 72%",
        "--radius": "0.9rem"
      }
    }
  },

  "typography": {
    "google_fonts": {
      "accent_script": {
        "name": "Allura",
        "fallback": "cursive",
        "usage": "Small brand accents only: section eyebrow, pull quotes, subtle labels (never long paragraphs).",
        "tailwind": "font-[var(--font-script)]"
      },
      "headings_serif": {
        "name": "Cormorant Garamond",
        "fallback": "serif",
        "usage": "H1/H2/H3, service titles, blog titles. Elegant editorial feel.",
        "tailwind": "font-[var(--font-serif)]"
      },
      "body_sans": {
        "name": "Manrope",
        "fallback": "sans-serif",
        "usage": "Body, UI labels, admin dashboard, forms.",
        "tailwind": "font-[var(--font-sans)]"
      }
    },
    "type_scale": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl font-[var(--font-serif)] tracking-[-0.02em] leading-[1.05]",
      "h2": "text-base md:text-lg font-[var(--font-sans)] text-muted-foreground leading-relaxed",
      "h3_section_title": "text-2xl sm:text-3xl font-[var(--font-serif)] tracking-[-0.01em]",
      "body": "text-sm sm:text-base font-[var(--font-sans)] leading-relaxed",
      "small": "text-xs sm:text-sm font-[var(--font-sans)] text-muted-foreground",
      "eyebrow": "text-xs tracking-[0.18em] uppercase font-[var(--font-sans)] text-muted-foreground",
      "script_accent": "text-2xl sm:text-3xl font-[var(--font-script)] text-[color:var(--brand-rose)]"
    },
    "css_variables_to_define": {
      "--font-sans": "Manrope",
      "--font-serif": "Cormorant Garamond",
      "--font-script": "Allura"
    }
  },

  "layout_system": {
    "grid": {
      "container": "max-w-6xl mx-auto px-4 sm:px-6 lg:px-8",
      "public_page_sections": "py-14 sm:py-18 lg:py-24",
      "admin_shell": "min-h-screen bg-background",
      "bento": "grid grid-cols-1 md:grid-cols-12 gap-6"
    },
    "spacing_scale_px": {
      "2": 8,
      "3": 12,
      "4": 16,
      "6": 24,
      "8": 32,
      "10": 40,
      "12": 48,
      "14": 56,
      "16": 64,
      "18": 72,
      "24": 96
    },
    "radius": {
      "card": "rounded-2xl",
      "button": "rounded-xl",
      "pill": "rounded-full",
      "media": "rounded-2xl"
    },
    "shadows": {
      "soft": "shadow-[0_10px_30px_rgba(31,30,28,0.08)]",
      "lift": "shadow-[0_18px_50px_rgba(31,30,28,0.12)]",
      "inset": "shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
    }
  },

  "component_guidelines": {
    "shadcn_primary_components": {
      "buttons": "/app/frontend/src/components/ui/button.jsx",
      "cards": "/app/frontend/src/components/ui/card.jsx",
      "forms": "/app/frontend/src/components/ui/form.jsx",
      "inputs": "/app/frontend/src/components/ui/input.jsx",
      "textarea": "/app/frontend/src/components/ui/textarea.jsx",
      "select": "/app/frontend/src/components/ui/select.jsx",
      "radio_group": "/app/frontend/src/components/ui/radio-group.jsx",
      "checkbox": "/app/frontend/src/components/ui/checkbox.jsx",
      "switch": "/app/frontend/src/components/ui/switch.jsx",
      "dialog": "/app/frontend/src/components/ui/dialog.jsx",
      "sheet": "/app/frontend/src/components/ui/sheet.jsx",
      "drawer": "/app/frontend/src/components/ui/drawer.jsx",
      "tabs": "/app/frontend/src/components/ui/tabs.jsx",
      "table": "/app/frontend/src/components/ui/table.jsx",
      "pagination": "/app/frontend/src/components/ui/pagination.jsx",
      "progress": "/app/frontend/src/components/ui/progress.jsx",
      "carousel": "/app/frontend/src/components/ui/carousel.jsx",
      "accordion": "/app/frontend/src/components/ui/accordion.jsx",
      "tooltip": "/app/frontend/src/components/ui/tooltip.jsx",
      "sonner_toasts": "/app/frontend/src/components/ui/sonner.jsx",
      "calendar": "/app/frontend/src/components/ui/calendar.jsx"
    },

    "buttons": {
      "shape": "Luxury/Elegant: tall-ish, rounded-xl, subtle shadow.",
      "variants": {
        "primary": {
          "use": "Primary CTAs: Start Inquiry, Book Consultation, Submit.",
          "classes": "h-11 px-5 rounded-xl bg-[color:var(--brand-sage)] text-[color:var(--brand-cream)] shadow-[0_10px_24px_rgba(111,143,122,0.25)] hover:bg-[color:var(--brand-sage-deep)] focus-visible:ring-2 focus-visible:ring-[color:var(--brand-sage)] focus-visible:ring-offset-2",
          "data_testid_examples": [
            "hero-start-inquiry-button",
            "booking-submit-button",
            "inquiry-next-step-button"
          ]
        },
        "secondary": {
          "use": "Secondary CTAs: View Gallery, See Services.",
          "classes": "h-11 px-5 rounded-xl bg-[color:var(--brand-surface-2)] text-foreground border border-[color:var(--brand-border)] hover:bg-white",
          "data_testid_examples": [
            "hero-view-gallery-button"
          ]
        },
        "ghost": {
          "use": "Tertiary actions: Learn more, Back.",
          "classes": "h-11 px-4 rounded-xl hover:bg-[color:var(--brand-sage-tint)]",
          "data_testid_examples": [
            "inquiry-back-step-button"
          ]
        }
      },
      "micro_interactions": [
        "Hover: slight lift (translate-y-[-1px]) + shadow increase; do NOT use transition-all.",
        "Active: scale-95.",
        "Loading: show spinner left of label; keep width stable." 
      ]
    },

    "cards": {
      "public_site": {
        "style": "Warm cream surfaces, rounded-2xl, soft shadow, thin border.",
        "classes": "rounded-2xl border border-[color:var(--brand-border)] bg-white/80 backdrop-blur-[2px] shadow-[0_10px_30px_rgba(31,30,28,0.08)]"
      },
      "admin": {
        "style": "Slightly denser, higher contrast borders, less decorative.",
        "classes": "rounded-2xl border border-border bg-card shadow-sm"
      }
    },

    "forms": {
      "style": [
        "Inputs should feel like stationery: warm surface, crisp border, generous padding.",
        "Use helper text for expectations (budget ranges, venue, inspiration links).",
        "Always show validation inline + toast summary on submit failure." 
      ],
      "input_classes": "h-11 rounded-xl bg-white border border-[color:var(--brand-border)] focus-visible:ring-2 focus-visible:ring-[color:var(--brand-sage)]",
      "textarea_classes": "min-h-28 rounded-xl bg-white border border-[color:var(--brand-border)] focus-visible:ring-2 focus-visible:ring-[color:var(--brand-sage)]",
      "file_upload": {
        "pattern": "Use a Card with dashed border + drag/drop affordance; show thumbnails in a horizontal ScrollArea.",
        "classes": "rounded-2xl border border-dashed border-[color:var(--brand-border)] bg-[color:var(--brand-surface-2)] p-5"
      },
      "data_testid_rules": [
        "Every input/select/textarea must include data-testid.",
        "Errors must include data-testid like inquiry-budget-error-text.",
        "Progress bar must include data-testid like inquiry-progress-bar." 
      ]
    },

    "hero_section_direction": {
      "layout": "Split editorial: left copy + CTAs, right tall image card (or carousel) with rounded-3xl mask.",
      "background": "Warm cream base with a subtle watercolor wash overlay (allowed_gradients.hero_wash_*). Add a faint noise texture.",
      "copy": {
        "eyebrow": "LOS ANGELES • BALLOON INSTALLATIONS • EVENT STYLING",
        "headline": "Dreamy balloon installations for celebrations that feel like you.",
        "subhead": "Custom design, thoughtful details, and a calm process—from inquiry to install."
      },
      "cta": [
        "Primary: Start Inquiry",
        "Secondary: View Gallery"
      ],
      "trust_row": "Below CTAs: 3 small chips: 'Fully custom', 'On-site install', 'LA + surrounding'.",
      "data_testid_examples": [
        "home-hero-section",
        "home-hero-primary-cta",
        "home-hero-secondary-cta"
      ]
    },

    "gallery": {
      "public_gallery": {
        "layout": "Masonry-like grid using CSS columns on mobile->md, switch to 12-col grid on lg for editorial rhythm.",
        "filters": "Use Tabs for categories (Weddings, Birthdays, Corporate, Showers, Holidays).",
        "lightbox": "Use Dialog for lightbox; include prev/next controls and keyboard navigation.",
        "image_treatment": [
          "Always rounded-2xl.",
          "Hover: subtle zoom (scale-105) inside overflow-hidden container.",
          "Overlay: bottom gradient scrim is NOT allowed (too dark). Use a soft cream label chip instead." 
        ],
        "data_testid_examples": [
          "gallery-category-tabs",
          "gallery-grid",
          "gallery-image-card",
          "gallery-lightbox-dialog"
        ]
      }
    },

    "testimonials": {
      "card": "Use Card with a small script accent quote mark (SVG) + serif name.",
      "layout": "Carousel on mobile, 3-column grid on lg.",
      "data_testid_examples": [
        "testimonials-carousel",
        "testimonial-card"
      ]
    },

    "process_timeline": {
      "pattern": "Vertical timeline on mobile; horizontal steps on lg.",
      "components": ["/app/frontend/src/components/ui/card.jsx", "/app/frontend/src/components/ui/separator.jsx"],
      "steps": [
        "Inquiry",
        "Design Call",
        "Proposal + Deposit",
        "Build + Install",
        "Takedown (optional)"
      ],
      "data_testid_examples": [
        "home-process-timeline"
      ]
    },

    "faq_preview": {
      "component": "/app/frontend/src/components/ui/accordion.jsx",
      "behavior": "One open at a time; keep answers short; link to full FAQ.",
      "data_testid_examples": [
        "faq-accordion",
        "faq-item"
      ]
    },

    "inquiry_wizard": {
      "structure": [
        "Step 1: Event type (Wedding / Birthday / Corporate / Shower / Holiday / Other)",
        "Step 2: Date + location + venue (conditional)",
        "Step 3: Guest count + install type (arch, garland, backdrop, ceiling, stage)",
        "Step 4: Style + colors (chips) + inspiration uploads",
        "Step 5: Budget range + must-haves",
        "Step 6: Contact info + preferred contact method",
        "Review + Submit"
      ],
      "conditional_branching": {
        "wedding": ["ceremony/reception", "planner?", "venue name", "floral add-on"],
        "birthday": ["age milestone", "theme", "indoor/outdoor"],
        "corporate": ["brand colors", "logo placement", "deliverables", "COI required?"]
      },
      "components": [
        "/app/frontend/src/components/ui/progress.jsx",
        "/app/frontend/src/components/ui/card.jsx",
        "/app/frontend/src/components/ui/select.jsx",
        "/app/frontend/src/components/ui/radio-group.jsx",
        "/app/frontend/src/components/ui/checkbox.jsx",
        "/app/frontend/src/components/ui/dialog.jsx",
        "/app/frontend/src/components/ui/sonner.jsx"
      ],
      "draft_saving": "Auto-save to localStorage every 800ms debounce; show 'Saved' microcopy with timestamp.",
      "data_testid_examples": [
        "inquiry-wizard",
        "inquiry-event-type-step",
        "inquiry-file-upload",
        "inquiry-save-status-text",
        "inquiry-submit-button"
      ]
    },

    "booking": {
      "calendar": {
        "must_use": "/app/frontend/src/components/ui/calendar.jsx",
        "pattern": "Two-step: choose consultation type -> choose date -> choose time slot list.",
        "availability_editor_admin": "Admin uses Calendar + Table for time slots; add quick 'Add availability' Dialog."
      },
      "data_testid_examples": [
        "booking-consultation-type-select",
        "booking-calendar",
        "booking-time-slot-button"
      ]
    },

    "admin_panel": {
      "direction": [
        "Feels like the brand, but productivity-first: warm neutrals, sage as active state, minimal decorative watercolor.",
        "Use shadcn Sidebar pattern (collapsible icon rail).",
        "Keep density slightly higher than marketing site; reduce shadows." 
      ],
      "navigation": {
        "groups": {
          "work": ["Dashboard", "Inquiries", "Clients", "Consultations"],
          "content": ["Services", "Gallery", "Testimonials", "FAQ", "Blog", "Site Content"],
          "system": ["Settings"]
        },
        "components": [
          "(Add shadcn Sidebar component if missing in repo)",
          "/app/frontend/src/components/ui/collapsible.jsx",
          "/app/frontend/src/components/ui/tooltip.jsx"
        ],
        "data_testid_examples": [
          "admin-sidebar",
          "admin-sidebar-nav-item",
          "admin-sidebar-toggle"
        ]
      },
      "tables": {
        "component": "/app/frontend/src/components/ui/table.jsx",
        "pattern": "Sticky header, row hover, status badge column, row click opens detail drawer.",
        "data_testid_examples": [
          "admin-inquiries-table",
          "admin-clients-table"
        ]
      },
      "status_pipeline": {
        "statuses": ["New", "Needs Follow-up", "Consult Scheduled", "Proposal Sent", "Booked", "Archived"],
        "ui": "Use Tabs as pipeline filter + Badge for status."
      }
    }
  },

  "motion": {
    "library": "framer-motion",
    "principles": [
      "Subtle, slow, airy. Avoid bouncy spring.",
      "Use scroll-based fade/slide for section entrances.",
      "Respect prefers-reduced-motion." 
    ],
    "durations_ms": {
      "fast": 160,
      "base": 240,
      "slow": 420
    },
    "easing": {
      "standard": "[0.22, 1, 0.36, 1]",
      "soft": "[0.16, 1, 0.3, 1]"
    },
    "recipes": {
      "section_enter": "initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6, ease: [0.16,1,0.3,1] }}",
      "card_hover": "whileHover={{ y: -2 }} transition={{ duration: 0.2, ease: [0.22,1,0.36,1] }}",
      "image_hover": "whileHover={{ scale: 1.03 }} transition={{ duration: 0.25, ease: [0.22,1,0.36,1] }}"
    }
  },

  "watercolor_integration": {
    "how_to_use_without_childish": [
      "Use watercolor as a background wash (very low opacity) and as corner accents, never as repeated patterns.",
      "Keep typography editorial and spacing generous; the luxury comes from restraint.",
      "Use one hand-drawn element per section max (e.g., a thin brushstroke divider or a soft blob behind a photo).",
      "Prefer real photography for credibility; watercolor is supporting texture." 
    ],
    "implementation": {
      "noise_overlay_css": "background-image: radial-gradient(rgba(31,30,28,0.04) 1px, transparent 1px); background-size: 18px 18px;",
      "watercolor_blob": "Create 2–3 SVG blobs (peach/rose/sage at 10–18% opacity) and reuse across hero, promo, and footer. Position absolute, blur-sm, pointer-events-none."
    }
  },

  "imagery": {
    "direction": [
      "Editorial photography: close-ups of textures (ribbons, florals, table settings), wide shots of installs, and a few human moments.",
      "Avoid cheesy party stock; choose warm, natural light.",
      "Use consistent color grading: warm highlights, soft contrast." 
    ],
    "image_urls": [
      {
        "category": "hero",
        "description": "Editorial wedding table setting (neutral, airy).",
        "url": "https://images.unsplash.com/photo-1649615644622-6d83f48e69c5?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85"
      },
      {
        "category": "gallery",
        "description": "Wedding table setting alt angle.",
        "url": "https://images.unsplash.com/photo-1649615644613-758b850399c1?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85"
      },
      {
        "category": "gallery",
        "description": "Balloon celebration scene (use sparingly; crop to decor details).",
        "url": "https://images.unsplash.com/photo-1758738181955-3f917d756275?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85"
      },
      {
        "category": "gallery",
        "description": "Balloon installation / milestone decor (detail crop).",
        "url": "https://images.unsplash.com/photo-1758870041148-31d28fdf34d9?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85"
      }
    ]
  },

  "accessibility": {
    "wcag": [
      "Ensure text contrast >= AA on cream backgrounds (use deep charcoal for body).",
      "Focus states: visible ring using sage_primary; never remove outlines.",
      "Hit targets: min 44px height for primary controls.",
      "Reduced motion: disable scroll animations and hover scale when prefers-reduced-motion." 
    ],
    "forms": [
      "Always pair Label with input.",
      "Error messages must be programmatically associated (aria-describedby).",
      "Use clear, non-jargon microcopy in admin." 
    ]
  },

  "libraries": {
    "recommended": [
      {
        "name": "framer-motion",
        "why": "Premium subtle motion + scroll entrances.",
        "install": "npm i framer-motion",
        "usage": "Use motion.section and motion.div for hero/sections/cards; respect prefers-reduced-motion."
      }
    ],
    "optional": [
      {
        "name": "yet-another-react-lightbox",
        "why": "Best-in-class lightbox UX; if avoiding extra deps, use shadcn Dialog instead.",
        "install": "npm i yet-another-react-lightbox",
        "usage": "Wrap gallery images; keep controls minimal and match brand colors."
      }
    ]
  },

  "instructions_to_main_agent": [
    "Replace default shadcn tokens in /app/frontend/src/index.css with the provided HSL tokens (light + dark).",
    "Add Google Fonts (Allura, Cormorant Garamond, Manrope) in index.html or via CSS import; map to CSS variables and Tailwind font usage.",
    "Do NOT keep /app/frontend/src/App.css centered header styles; remove CRA defaults.",
    "Implement public pages with editorial spacing, split hero, gallery-first sections, and inquiry-first CTAs.",
    "Inquiry Wizard must be multi-step with conditional branching, progress bar, draft saving, and file uploads; every interactive element must include data-testid.",
    "Admin should use shadcn Sidebar pattern (collapsible) and Tables/Dialogs/Drawers for CRUD; keep it mobile-friendly.",
    "Use gradients only as subtle hero/section washes (<=20% viewport). No dark/saturated gradients anywhere." 
  ]
}

<General UI UX Design Guidelines>  
    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms
    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text
   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json

 **GRADIENT RESTRICTION RULE**
NEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc
NEVER use dark gradients for logo, testimonial, footer etc
NEVER let gradients cover more than 20% of the viewport.
NEVER apply gradients to text-heavy content or reading areas.
NEVER use gradients on small UI elements (<100px width).
NEVER stack multiple gradient layers in the same viewport.

**ENFORCEMENT RULE:**
    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors

**How and where to use:**
   • Section backgrounds (not content backgrounds)
   • Hero section header content. Eg: dark to light to dark color
   • Decorative overlays and accent elements only
   • Hero section with 2-3 mild color
   • Gradients creation can be done for any angle say horizontal, vertical or diagonal

- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**

</Font Guidelines>

- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. 
   
- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.

- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.
   
- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly
    Eg: - if it implies playful/energetic, choose a colorful scheme
           - if it implies monochrome/minimal, choose a black–white/neutral scheme

**Component Reuse:**
	- Prioritize using pre-existing components from src/components/ui when applicable
	- Create new components that match the style and conventions of existing components when needed
	- Examine existing components to understand the project's component patterns before creating new ones

**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component

**Best Practices:**
	- Use Shadcn/UI as the primary component library for consistency and accessibility
	- Import path: ./components/[component-name]

**Export Conventions:**
	- Components MUST use named exports (export const ComponentName = ...)
	- Pages MUST use default exports (export default function PageName() {...})

**Toasts:**
  - Use `sonner` for toasts"
  - Sonner component are located in `/app/src/components/ui/sonner.tsx`

Use 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals.
</General UI UX Design Guidelines>
