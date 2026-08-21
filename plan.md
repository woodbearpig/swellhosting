# plan.md — swell design + media (V11)

## 1) Objectives
- Ship a **presentable, luxury public website** + **100% white‑labeled client management platform** for **swell design + media**.
- Deliver the **core lead flow** end‑to‑end:
  - Visitor browses → submits inquiry (wizard) → (optional) schedules phone consultation → admin reviews/updates status.
- Provide an **admin-managed CMS** so the owner can:
  - Edit text/images/sections
  - Toggle visibility of site elements (“hide element X”)
  - Switch **seasonal/holiday/wedding palettes** without code
  - Schedule palettes to auto-switch for seasons/holidays
  - Create custom palettes from inspiration photos
  - Customize typography (headline/body/script fonts)
  - Customize header navigation (internal + external links)
  - Customize the inquiry wizard steps/fields (bubble-chip options)
  - Add **simple conditional display rules** to inquiry fields (show field if previous field equals value)
  - Export inquiries as CSV
  - Author **Blog** posts with rich text + image embeds
  - Present an **Instagram-style Blog gallery** (image-first grid with filtering)
  - Reuse images site-wide via a central Media Library (“upload once, use everywhere”)
  - Manage homepage “Recent Work” images from the **Portfolio** (curated gallery items)
  - Show a live **Instagram feed** on the homepage with **admin-editable labels** and **launch-day traffic protection** (server-side cache)
  - **Paste and render third-party widgets (Facebook feed, reviews, etc.) on the homepage without coding**
  - Manage a **Backdrops & Designs** catalog and present it publicly in separate sections
  - Use **Quick Reply Templates** to respond to inquiries via one-click Gmail compose
  - Adjust **Hero banner readability** by setting headline/subhead/button colors over the hero image
- Keep deployment to **AlmaLinux 10 VPS** simple and repeatable via **Docker Compose** + `deploy.sh` (single-command deploy).
- Maintain strict white‑labeling:
  - No references to any third-party builder brand in UI/content
  - Automatically purge any non-owned hosted asset URLs from SiteContent
- Improve perceived UX:
  - Eliminate “flash of full site” when **Coming Soon mode** is enabled
  - Keep admin editing pages **fast and focused**

**Updated objectives (current milestone)**
- Enable safe pre-launch review and social proof:
  - **Coming Soon preview link**: public sees Coming Soon; private `/?preview=<token>` bypass works; token is never exposed publicly.
  - **Homepage social widget slot**: admin can paste an embed snippet (Elfsight Facebook feed or other) and place it on the homepage.

---

## 2) Implementation Steps

### Phase 1 — Core Workflow POC (Completed)
> Core = inquiry submission + file uploads + persistence + admin can view.
- Implemented FastAPI + MongoDB models for: Inquiry, Clients, Consultations, Availability, Newsletter.
- Built endpoints:
  - `POST /api/inquiries`
  - `POST /api/uploads`
  - `GET/PUT/DELETE /api/admin/inquiries`
- Built minimal React flow and validated persistence & uploads.

**User stories (Phase 1)**
1. As a visitor, I can complete an inquiry in a few steps.
2. As a visitor, I can upload inspiration photos.
3. As an owner, I can review inquiries in an admin dashboard.
4. As an owner, I can update inquiry status.

---

### Phase 2 — V1 App Development (Completed + ongoing enhancements)
#### What is already implemented
- Frontend (React + Tailwind + Framer Motion)
  - Public pages: Home, About, Services, Gallery, Testimonials, FAQ, Blog, Contact, Privacy/Terms, 404.
  - Coming Soon mode with render gate (no FOUC).
  - Dynamic inquiry form renderer.
- Backend (FastAPI + Motor)
  - CRUD for Services, Gallery, Testimonials, FAQs, Blog, SiteContent.
  - Google Calendar OAuth integration endpoints.
  - Instagram Graph API integration.
  - Email confirmations (best-effort via SMTP).
- Admin
  - Auth-protected dashboard.
  - Palettes admin (manual apply + schedules + photo-to-palette + custom palettes).
  - Inquiry form builder.
  - Admin credentials change.
- Deployment
  - Docker-based deploy scripts working on AlmaLinux 10 VPS.
  - `deploy.sh` fails loudly on git auth failures and prints PAT instructions.

---

### Phase A (P0) — Palette wiring + dynamic Home Page & Footer editors (COMPLETED ✅)
**Goal:** Enable site-wide seasonal/holiday/wedding color themes and make Home/Footer sections fully editable & toggleable from admin.

**Completed work**
- Palettes provider wired + `/admin/palettes` route + nav.
- Home page dynamic content/toggles + process steps editor.
- Footer visibility toggles + copyright override.
- Expanded palette library (US holidays/seasons/wedding).

**Testing**
- `/app/test_reports/iteration_6.json`

---

### Phase B (P1) — FOUC fix + Site-wide hide toggles + Custom Nav Bar (COMPLETED ✅)
**Goal:** Remove Coming Soon flash-of-content and let the owner hide/show core public sections and fully customize header navigation.

**Completed work**
- FOUC fix via `PublicLayout` neutral splash until SiteContent loads.
- Per-section hide toggles for Header/About/Services/Gallery/Contact.
- CMS-driven nav items (internal/external + new tab).

---

### Phase C (P1) — Season Auto‑Switch (Scheduled palettes) (COMPLETED ✅)
- Schedule rules stored in `SiteContent.palette_schedules`.
- `/api/palettes/active` computes effective palette by date rules.

---

### Phase D (P1/P2) — Palette From Photo (COMPLETED ✅)
- On-device extraction using ColorThief.
- Custom palettes stored in `custom_palettes` and merged into `/api/palettes`.

---

### Phase E (P0/P1) — Admin Credentials + Dynamic Inquiry Form Builder (COMPLETED ✅)
**Goal:** Owner can change admin login safely + fully customize the inquiry wizard.

**Completed work**
- Admin credentials change flow in `/admin/settings` with current-password verification.
- Seed logic updated so password isn’t overwritten on restart (emergency `ADMIN_FORCE_RESET=1`).
- Inquiry form schema stored in `SiteContent.inquiry_form_schema` with:
  - Public endpoint: `GET /api/inquiry-form`
  - Admin endpoints: `PUT /api/admin/inquiry-form`, `POST /api/admin/inquiry-form/reset`
- InquiryWizardPage renders from schema.
- Unknown custom fields stored in `Inquiry.extra`.

---

### Phase F (P1) — Typography + Hero Badges (COMPLETED ✅)
- Typography selector in Site Content:
  - `font_serif_id`, `font_sans_id`, `font_script_id`
  - Google Fonts loaded dynamically via FontProvider
- Hero badges now editable:
  - `hero_badges_active`, `hero_badges[]`

---

### Phase G (P0) — White‑label asset purge (COMPLETED ✅)
**Goal:** Ensure no non-owned hosted asset URLs remain in live content.

**Completed work**
- Default `logo_url` no longer points to any third-party builder CDN.
- Startup migration clears legacy hosted URLs from: `logo_url`, `hero_image_url`, `about_image_url`, `coming_soon_bg_url`, `og_image_url`, `favicon_url`.

---

## 3) Client-Requested Enhancements (Delivered)

### Phase H (P0) — Google Calendar “one-click connect” polish (COMPLETED ✅)
**Goal:** Owner connects Google Calendar by clicking “Sign in with Google”.

**Completed work**
- OAuth redirect + token storage/refresh.
- Busy-time blocking in availability.
- Consult booking creates Google Calendar events.
- Added setup guide: `/app/OAUTH_SETUP.md`.

**Exit criteria met**
- She clicks “Sign in with Google” → chooses Gmail → Allow → admin shows Connected.

---

### Phase I (P0) — Consultation becomes last step of inquiry (phone-only) (COMPLETED ✅)
**Goal:** Replace standalone `/book` with an optional final inquiry step to schedule a phone consult.

**Completed work**
- Removed standalone booking route.
- InquiryWizard final step can schedule consult or skip with confirmation.
- Booking rules enforced (lead time, buffer, window, daily max, blocked dates).
- `.ics` calendar invites attached to confirmation emails.
- Admin includes “Scheduled calls” view.

---

### Phase J (P1) — Media Library (uploads hub) (COMPLETED ✅)
**Goal:** One central upload library to reuse media anywhere, with tags and compression.

**Completed work**
- New `media_library` collection (MediaAsset model).
- `/api/uploads` auto-compresses images via Pillow and indexes assets.
- Admin endpoints:
  - `GET /api/admin/media` (search + tag filter)
  - `PATCH /api/admin/media/{id}`
  - `DELETE /api/admin/media/{id}`
- Admin page `/admin/media` with upload, grid, tags, delete.
- Reusable picker UI (“Insert from library”) integrated into all existing admin image fields.

---

### Phase K (P0/P1) — Session Enhancements (COMPLETED ✅)
All items were implemented and validated (curl + browser automation screenshots). No known regressions.

#### K1 — Admin Integrations: downloadable OAuth PDF guide (P0) (COMPLETED ✅)
- Produced the client-facing guide PDF:
  - `/app/deploy/Google_Calendar_Setup_Guide.pdf` (client-ready)
- Added a download link in `/admin/integrations`:
  - Label: **“OAuth setup guide for client (PDF)”**

#### K2 — Inquiry CSV Export (P1) (COMPLETED ✅)
- Added **Export CSV** button to `/admin/inquiries`.
- Added backend endpoint `GET /api/admin/inquiries.csv` with `?status=` filter and `extra_*` field flattening.

#### K3 — Media Library picker integration (P0) (COMPLETED ✅)
- Implemented reusable picker component `MediaPickerDialog.jsx`.
- Wired the picker into all existing admin image fields (7 total).

#### K4 — Conditional Logic in Inquiry Form Builder (SIMPLE mode) (P1) (COMPLETED ✅)
- Added `field.conditional = { field, equals }`.
- Backend sanitizer preserves `conditional`.
- Wizard runtime hides fields + removes hidden required fields from validation.

#### K5 — Rich-text Blog Editor + image embeds (P2) (COMPLETED ✅)
- Installed TipTap.
- Rich editor supports headings/bold/italic/lists/quote/hr/links/undo/redo.
- Media Library images can be embedded.
- Public renderer supports HTML + legacy plain text.

---

### Phase L (P1/P2) — Blog naming + Instagram-style Blog gallery + Integration copy polish (COMPLETED ✅)

#### L1 — Integrations copy clarification (COMPLETED ✅)
- Rewrote Google OAuth “manual credentials” copy to clarify recommended `.env` setup vs browser fallback.

#### L2 — Rename “Journal” → “Blog” across the product (COMPLETED ✅)
- Updated header/footer/admin labels.
- Startup migration renames `header_nav_items[].label` for `id="nav-blog"`.

#### L3 — Instagram-style Blog gallery (COMPLETED ✅)
- Added `featured: bool` to BlogPost.
- Admin Blog: tags + featured toggle.
- Public `/blog`: image-first tile grid + tag filter pills + featured 2×2 tile behavior.

---

### Phase M (P0/P1) — Admin performance refactor + Portfolio clarity + Instagram polish + Media bulk actions (COMPLETED ✅)
**Goal:** Eliminate laggy mega “Site content” page, make homepage media sources clearer, and improve Media Library operations.

#### M1 — Bug fix: input icon overlap (COMPLETED ✅)
- Updated `frontend/src/index.css` to use `:where(.input-cream)` so Tailwind padding utilities win.

#### M2 — Major refactor: split the monolithic Site Content editor (COMPLETED ✅)
- Replaced `AdminSiteContent.jsx` with focused pages under `frontend/src/pages/admin/site/`.

#### M3 — Admin routing + sidebar IA refresh (COMPLETED ✅)
- Added `/admin/home`, `/admin/brand`, `/admin/about`, `/admin/nav`, `/admin/footer`, `/admin/social-contact`, `/admin/coming-soon`.
- Back-compat: `/admin/site-content` redirects → `/admin/home`.

#### M4 — Inline “Recent Work” portfolio preview on Home admin (COMPLETED ✅)
- Inline featured/unfeatured toggles for portfolio items.

#### M5 — Gallery → Portfolio rename (COMPLETED ✅)
- UI wording updated; routes remain for compatibility.

#### M6 — Instagram feed: fully editable + launch-day cache (COMPLETED ✅)
- SiteContent-driven labels + server-side cache for Meta API requests.

#### M7 — Media Library bulk actions (COMPLETED ✅)
- Select mode + bulk tagging + bulk delete confirmation modal.

#### M8 — Testing (COMPLETED ✅)
- `/app/test_reports/iteration_13.json` to `iteration_15.json`.

---

### Phase N (P0) — Admin input keystroke lag elimination (COMPLETED ✅, but not sufficient alone)
**Goal:** Make admin Site Content pages responsive while typing, without breaking save behavior.

**Completed work**
- Added local-state `TextField`/`TextArea` that commit on blur.
- Converted all 7 site-content pages to use these components.
- Refactored `save()` in `_shared.jsx` to use a ref (`dataRef`) for correctness.

**Testing**
- `/app/test_reports/iteration_16.json` verified no keystroke lag + saving + persistence.

**Note (new info)**
- User still reported lag on production VPS, especially **scroll jank**. This indicated a paint/compositing bottleneck rather than state-churn.

---

### Phase O (P0) — Admin scroll performance fix (CSS compositor pressure) (COMPLETED ✅ → READY FOR VPS DEPLOY)
**Goal:** Remove scroll jank across admin pages on production VPS, including fresh servers with minimal content.

**Root cause (confirmed)**
- `.card-cream` used:
  - `background: rgba(255,255,255,0.85)` (semi-transparent)
  - `backdrop-filter: blur(2px)`
- Admin pages render **15–30+** `.card-cream` elements.
- On scroll, browsers must snapshot pixels behind each card, blur, and composite → classic jank.

**Fix implemented**
- Updated `frontend/src/index.css`:
  - `.card-cream` is now fully opaque (`background: #ffffff`)
  - removed `backdrop-filter`
  - softened shadow slightly to preserve the luxury look

**Rollout instructions (critical)**
- Include this CSS change in the VPS build output:
  ```bash
  cd /var/www/swell && ./deploy.sh
  ```

**Verification checklist (on VPS)**
- Open admin and test smoothness:
  - `/admin/home` scroll up/down quickly
  - `/admin/inquiries` scroll list
  - `/admin/media` scroll grid
- Confirm there is **no input lag** + **no scroll stutter**.

---

### Phase P (P0) — Backdrops & Designs split + Quick Reply Templates + Hero color controls (COMPLETED ✅)
**Goal:** Finish the interrupted feature work and add requested customization + reliability improvements.

#### P1 — Backdrop → Backdrops & Designs (COMPLETED ✅)
- Backdrop model updated to include `kind: 'backdrop' | 'design'`.
- API supports filtering: `GET /api/backdrops?kind=design`.
- Admin UI: `/admin/backdrops` includes tabs **All / Backdrops / Designs**.
- Public site groups content into separate sections.

#### P2 — Quick Reply Templates (COMPLETED ✅)
- Backend endpoints:
  - `GET/POST/PUT/DELETE /api/admin/reply-templates`
  - `POST /api/admin/reply-templates/reorder`
- Admin Settings:
  - Added **Quick reply templates** card with CRUD + reorder.
- Inquiries:
  - Added `ReplyWithTemplateButton` that opens **Gmail compose** with subject/body filled.
  - Supports placeholder substitution: `{client_name}`, `{first_name}`, `{event_type}`, `{event_date}`, `{guest_count}`, `{venue}`, `{business_name}`.

#### P3 — Hero banner: font color + button color overrides (COMPLETED ✅)
- Added 7 SiteContent fields:
  - `hero_headline_color`, `hero_subhead_color`, `hero_eyebrow_color`
  - `hero_primary_btn_bg`, `hero_primary_btn_text`
  - `hero_secondary_btn_bg`, `hero_secondary_btn_text`
- Admin Home page:
  - Added **HeroColorsPanel** with `ColorSwatchField` (native picker + hex + Reset).
- Public Home page:
  - SplitHero + FullBleedHero apply overrides when set.

#### P4 — Admin navigation reliability (COMPLETED ✅)
- Implemented defensive fix to prevent stale route rendering:
  - `key={location.pathname}` on admin content container
  - scroll-to-top on route change

**Testing**
- `/app/test_reports/iteration_18.json`

---

### Phase Q (P0) — Coming Soon **Preview Token Bypass** (Option A) (COMPLETED ✅)
**Goal:** Allow a secret `/?preview=<token>` URL to bypass the Coming Soon curtain, without exposing the token publicly.

**What shipped**
- Backend (FastAPI)
  - Public endpoint `GET /api/site-content` continues to **strip** `preview_token` (security-critical).
  - Added admin-only endpoint: `GET /api/admin/preview-token` (requires admin JWT) to fetch the current token.
  - Public verifier endpoint: `POST /api/preview/verify` returns `{ ok: true/false }` using constant-time compare.
  - Admin rotation endpoint: `POST /api/admin/preview/regenerate` rotates and returns the new token.
- Frontend (React)
  - `PublicLayout.jsx`:
    - If `site.coming_soon_active` and viewer is not authorized → show Coming Soon.
    - If `?preview=<token>` validates → store `sw_preview_ok=1` in `sessionStorage` and bypass Coming Soon.
    - Shows a floating banner (`data-testid="preview-mode-banner"`) with an **Exit preview** button that clears session storage.
  - `AdminComingSoonPage.jsx`:
    - Preview Link card fetches token via `/api/admin/preview-token`.
    - Copy/Open buttons.
    - Regenerate uses Shadcn `AlertDialog` (no native `window.confirm`).

**Acceptance criteria verified (end-to-end)**
- Public with Coming Soon enabled sees Coming Soon.
- Valid preview URL renders full site and shows preview banner.
- Preview session persists across navigation without the token query.
- Invalid tokens are rejected.
- Exit preview clears session and returns viewer to Coming Soon.
- Admin card displays link, supports copy/open/regenerate, and rotation invalidates old links.

**Testing**
- `/app/test_reports/iteration_22.json` — 14/14 tests passed, 0 bugs.

---

### Phase R (P1) — Homepage **Embed Widget / Elfsight Facebook Feed** (COMPLETED ✅)
**Goal:** Let the owner paste an Elfsight Facebook feed snippet (or any third-party widget embed) into the admin panel and render it on the homepage, with no coding.

**What shipped**
- Backend (SiteContent)
  - Added 6 new SiteContent fields:
    - `home_widget_active` (default false)
    - `home_widget_eyebrow`, `home_widget_heading`, `home_widget_subheading`
    - `home_widget_snippet` (raw HTML snippet string)
    - `home_widget_position` (one of 8 homepage slots)
- Frontend (Public)
  - `EmbedWidget.jsx`: parses the snippet, hoists external ` <script src="…">` into `<head>` exactly once (deduped), executes inline scripts if present, and renders the remaining HTML.
  - `HomeEmbedSection.jsx`: renders the section ONLY when `home_widget_active` is true and the section’s slot matches `home_widget_position`.
  - `HomePage.jsx`: includes 8 safe “slots”:
    - `after-hero`, `after-services`, `after-portfolio`, `after-backdrops`, `after-testimonials` (default), `after-designer`, `after-faq`, `before-cta`
  - When active but snippet is blank, a tasteful **placeholder card** appears so the client can approve placement before the final snippet exists.
- Frontend (Admin)
  - `/admin/home` includes a new “Facebook feed / embed widget” card:
    - Toggle on/off
    - Eyebrow/heading/subheading
    - Position dropdown (8 options)
    - Snippet textarea
    - Security warning: “Only paste code from trusted sources — this runs live on your site.”
    - “Load Elfsight template” button that inserts the correct snippet shape for easy copy/paste later.

**Acceptance criteria verified (end-to-end)**
- Widget hidden when `home_widget_active=false`.
- Placeholder shown when active but snippet is blank.
- Pasted Elfsight-style snippet injects platform.js into `<head>` and renders the target div.
- Only one widget section renders at a time.
- Position changes move the section to the correct part of the homepage.
- No regressions in other homepage sections or Coming Soon preview bypass.

**Testing**
- `/app/test_reports/iteration_23.json` — 33/33 tests passed, 0 bugs.

---

### Phase S (P1) — **Drag-and-Drop Portfolio Reordering** (COMPLETED ✅)
**Goal:** Let the owner rearrange the order photos appear in the public Portfolio grid, straight from the admin — no coding, no re-uploading.

**What shipped**
- Backend
  - New endpoint `POST /api/admin/gallery/reorder` (`server.py` line 1543).
  - Payload `{items: [{id, order}, ...]}` — updates each item's `order` field atomically per doc.
  - Auth-gated (`require_admin`); rejects empty lists (400) and >1000 items (400); silently skips malformed entries.
  - **Category-slot preservation trick**: when the admin reorders a filtered subset (e.g., only "Weddings"), the frontend reassigns those items to the SAME set of `order` numbers they already occupied — so other categories are never renumbered and keep their positions untouched.
- Frontend
  - New generic wrapper `components/SortableGrid.jsx` built on `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` (yarn-installed).
  - Accessible (keyboard-sortable) drag handles rendered as Lucide `GripVertical` icons.
  - `pages/admin/AdminGallery.jsx` gets a **Reorder Mode** toggle:
    - Enters Reorder Mode → hides Select/Bulk buttons, shows drag handles + "Done reordering" button.
    - Preserves the currently-active category filter while reordering.
    - "Save Order" POSTs the new mapping; "Cancel" discards local changes.
    - Helper text explains that reordering within a filter only affects the visible category.

**Acceptance criteria verified (end-to-end)**
- Endpoint auth + validation (401 without token, 400 for empty/oversized payloads).
- Valid batch reorder persists to Mongo and reflects on public `GET /api/gallery`.
- Category-slot preservation confirmed — reordering "Weddings" does not disturb other categories.
- Admin UI drag/drop works and Save/Cancel behave correctly.
- All previously-shipped admin features (Gallery CRUD, testimonials, CRM, media library, cache headers, super admin, Coming Soon bypass, embed widget) remain functional — no regressions.

**Testing**
- `/app/test_reports/iteration_25.json` — 18/18 backend tests passed, all frontend UI tests passed, 0 bugs.

---

## 4) Testing & QA
- After each phase item: quick smoke test in browser.
- Automated validation included:
  - Auth guard on CSV export
  - Media picker works across all image fields
  - Conditional logic persists and required validation honors visibility
  - TipTap blog editor saves and renders correctly
  - Blog gallery layout + tags + featured behavior
  - Admin refactor routes and save flows
  - Admin performance (keystroke + scroll)
  - Backdrops/Designs split
  - Reply templates CRUD + inquiry reply button
  - Hero color override end-to-end
  - **Preview token bypass** (Coming Soon staging)
  - **Homepage embed widget** (Elfsight / third-party)
  - **Drag-and-drop portfolio reordering** (category-slot preservation)

**Latest report**
- `/app/test_reports/iteration_25.json`

---

## 5) Deploy
**Deploy one-liner (AlmaLinux VPS)**
```bash
cd /var/www/swell && ./deploy.sh
```

**Operational note (observed in production today)**
- After deploy, the site briefly returned **502** until nginx was restarted.
- Manual fix that worked immediately:
  ```bash
  cd /var/www/swell && docker compose restart nginx
  ```
- (Optional future improvement) add an nginx restart into `deploy.sh` after containers update to avoid any post-deploy upstream caching issues.

---

## 6) Success Criteria (current)
- Owner can:
  - Connect Google Calendar with a single click and block busy times.
  - Run the inquiry wizard with a final optional phone-consult booking step.
  - Upload media once and reuse anywhere via a media library + picker.
  - Bulk-manage media assets.
  - Export inquiries to CSV.
  - Configure conditional logic in the inquiry form builder.
  - Create Blog posts with rich text and embedded images.
  - Curate the public Blog gallery with tags and featured tiles.
  - Manage homepage “Recent Work” images via Portfolio featured toggles.
  - Configure homepage Instagram feed text + count, with server-side caching.
  - Manage **Backdrops & Designs** separately.
  - Reply to inquiries quickly using **Gmail compose templates**.
  - Ensure hero readability by adjusting **Hero headline/subhead/button colors**.
  - **Paste a Facebook feed (Elfsight) or other widget snippet into Admin → Home and have it render on the homepage**.
  - **Use the admin comfortably**:
    - Typing is responsive (no keystroke lag)
    - Scrolling is smooth across page editors and lists on the VPS
    - Navigation between admin sections updates content immediately and reliably
  - **Keep the public site in Coming Soon while sharing a private preview link**:
    - Public sees Coming Soon
    - `/?preview=<token>` bypass works
    - Token can be rotated anytime
    - No token leakage in public JSON
- Strict white-labeling maintained.
- Docker deployment remains one-command and stable on AlmaLinux 10 VPS.

---

## 7) Explicitly Deferred / Out of Scope (for now)

### Next active task (post-widget)
- **Payments & invoicing (Stripe/PayPal)**
  - Deposits, payment plans, invoices linked to CRM/client profiles.

### Other deferred items
- CRM Enhancements (P1):
  - Client tags
  - Lead pipeline status tracking on client profiles
- Bulk inquiry actions (P2)
- Twilio SMS Notifications (P3)
- SEO polish (sitemap.xml, robots.txt, schema) (P2/P3)
- Backend refactor of `server.py` into routers (recommended but deferred unless requested)
