# plan.md — swell design + media (V7)

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
  - Add **simple conditional display rules** to inquiry fields (show field X only if a previous field equals value)
  - Export inquiries as CSV
  - Author **Blog** posts with rich text + image embeds
  - Present an **Instagram-style Blog gallery** (image-first grid with filtering)
  - Reuse images site-wide via a central Media Library (“upload once, use everywhere”)
  - Manage homepage “Recent Work” images from the **Portfolio** (curated gallery items)
  - Show a live **Instagram feed** on the homepage with **admin-editable labels** and **launch-day traffic protection** (server-side cache)
- Keep deployment to **AlmaLinux 10 VPS** simple and repeatable via **Docker Compose** + `deploy.sh` (single-command deploy).
- Maintain strict white‑labeling:
  - No references to any third-party builder brand in UI/content
  - Automatically purge any non-owned hosted asset URLs from SiteContent
- Improve perceived UX:
  - Eliminate “flash of full site” when **Coming Soon mode** is enabled
  - Keep admin editing pages **fast and focused** (avoid mega-page lag)

**New/updated objective (current milestone)**
- Ensure the **Admin Site Content editing experience is fast** (no keystroke lag) while preserving save correctness.

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
- Reusable picker UI (“Insert from library”) integrated into all existing admin image fields (see Phase K3).

---

### Phase K (P0/P1) — Session Enhancements (COMPLETED ✅)
All items were implemented and validated (curl + browser automation screenshots). No known regressions.

#### K1 — Admin Integrations: downloadable OAuth PDF guide (P0) (COMPLETED ✅)
- Produced the client-facing guide PDF:
  - `/app/deploy/Google_Calendar_Setup_Guide.pdf` (12-page, client-ready)
- Added a download link in `/admin/integrations` (Google Calendar section):
  - Label: **“OAuth setup guide for client (PDF)”**
  - Served from: `frontend/public/docs/oauth-setup-guide.pdf`

#### K2 — Inquiry CSV Export (P1) (COMPLETED ✅)
- Added **Export CSV** button to `/admin/inquiries`.
- Added backend endpoint `GET /api/admin/inquiries.csv` with `?status=` filter and `extra_*` field flattening.

#### K3 — Media Library picker integration (P0) (COMPLETED ✅)
- Implemented reusable picker component `MediaPickerDialog.jsx`.
- Wired the picker into all existing image fields (7 total).

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
**Goal:** Eliminate laggy mega “Site content” page, make homepage media sources clearer, and improve Media Library operations for real-world use.

#### M1 — Bug fix: input icon overlap (COMPLETED ✅)
**Issue**
- Icons overlapped text in:
  - `/admin/settings` (Display Name + Email)
  - `/admin/media` (Search input)

**Root cause**
- `.input-cream` CSS specificity overrode Tailwind padding utilities (e.g., `pl-9`).

**Fix**
- Updated `frontend/src/index.css`:
  - Switched selector to `:where(.input-cream)` so specificity drops to 0 and Tailwind utilities win.

#### M2 — Major refactor: split the monolithic Site Content editor (COMPLETED ✅)
**Why**
- The old `AdminSiteContent.jsx` (753 lines, 13 tabs) mounted all tabs at once and re-rendered on every keystroke → laggy UX.

**Completed work**
- Deleted:
  - `frontend/src/pages/admin/AdminSiteContent.jsx`
- Created focused admin pages under:
  - `frontend/src/pages/admin/site/`
  - `_shared.jsx` (shared hook + atoms)
  - `AdminHomePage.jsx`
  - `AdminBrandPage.jsx`
  - `AdminAboutPage.jsx`
  - `AdminHeaderNavPage.jsx`
  - `AdminFooterPage.jsx`
  - `AdminSocialContactPage.jsx`
  - `AdminComingSoonPage.jsx`

**Key architecture**
- `_shared.jsx` exports `useSiteAdminData()`:
  - Reuses `site` from SiteContext (avoids re-fetch on every mount)
  - Edits local snapshot
  - Saves via `PUT /api/admin/site-content`
  - Calls SiteContext `refresh()` after save

#### M3 — Admin routing + sidebar IA refresh (COMPLETED ✅)
- Updated routes in `frontend/src/App.js`:
  - New pages: `/admin/home`, `/admin/brand`, `/admin/about`, `/admin/nav`, `/admin/footer`, `/admin/social-contact`, `/admin/coming-soon`
  - Back-compat: `/admin/site-content` now redirects → `/admin/home`
- Updated `AdminLayout.jsx` sidebar with grouped sections:
  - **Pages** / **Content** / **Site chrome** / **System**

#### M4 — Inline “Recent Work” portfolio preview on Home admin (COMPLETED ✅)
- New inline preview inside `/admin/home` → Recent Work:
  - Fetches from `/api/gallery`
  - Shows current featured items (up to 6)
  - Shows non-featured thumbnails to promote
  - Click-to-promote / click-to-remove toggles `featured` via `PUT /api/admin/gallery/{id}`
  - “Manage full portfolio” deep-link to `/admin/gallery`

#### M5 — Gallery → Portfolio rename (COMPLETED ✅)
- Admin sidebar and admin page heading now say **Portfolio**.
- Routes remain unchanged for compatibility:
  - `/admin/gallery` and `/gallery` still exist.

#### M6 — Instagram feed: fully editable + launch-day cache (COMPLETED ✅)
**Admin editability**
- Added SiteContent fields (backend `models.py`):
  - `home_instagram_active`
  - `home_instagram_eyebrow`
  - `home_instagram_title`
  - `home_instagram_subtitle`
  - `home_instagram_count`
- `/admin/home` includes inputs for eyebrow/title/subtitle/count + hide toggle.
- Public component `InstagramFeed.jsx` now:
  - Reads labels + post count from SiteContent
  - Uses `site.instagram_url` to derive the button label `@handle` (no hardcoding)

**Traffic protection**
- Backend `GET /api/instagram/feed` now uses an in-process 5-minute cache (`_IG_CACHE`).
- If Meta request fails, serves stale cache (or empty list if none).

#### M7 — Media Library bulk actions (COMPLETED ✅)
- Added **Select mode** to `/admin/media`:
  - Per-tile checkbox indicator
  - Select all / clear
  - Floating bulk action bar when 1+ selected
- Added bulk operations:
  - **Bulk tag modal** (Add vs Replace modes)
  - **Bulk delete** via **in-app confirm modal** (no `window.confirm`) for reliability and testability

#### M8 — Testing (COMPLETED ✅)
- Testing agent iterations:
  - `iteration_13.json` (initial refactor verification)
  - `iteration_14.json` (CSS overlap fixed; bulk delete flagged due to confirm-dialog)
  - `iteration_15.json` (bulk delete modal fix verified)

---

### Phase N (P0) — Admin Site Content keystroke lag elimination (COMPLETED ✅)
**Goal:** Make all Site Content admin pages responsive while typing, without breaking save behavior.

**Problem**
- Even after splitting the monolithic site-content page, typing into admin text fields was still laggy.
- Root causes:
  - `useSiteAdminData` re-fetching or re-seeding causing avoidable renders on mount.
  - Updating one giant `data` object on every keystroke caused page-wide reconciliation.

**Completed work**
1. **Introduced locally-controlled inputs** in `frontend/src/pages/admin/site/_shared.jsx`:
   - `TextField` and `TextArea` maintain local state while typing.
   - Only commit to global state via `onCommit` (on blur).
2. **Converted all 7 site-content admin pages** to use `TextField`/`TextArea`:
   - Home, About, Brand, Header/Nav, Social & Contact, Footer, Coming Soon.
3. **Hardened save logic** in `_shared.jsx`:
   - Refactored `save()` to read from a `dataRef` (avoids React anti-pattern: async side-effects inside a `setState` updater).

**Testing**
- `/app/test_reports/iteration_16.json`
  - Keystroke responsiveness: **1–41ms per character**
  - Save-on-blur verified
  - Data persistence after refresh verified
  - Toggles and dropdowns verified

**Outcome**
- Admin content editing is now fast and usable for real client workflows.

---

## 4) Testing & QA
- After each phase item: quick smoke test in browser.
- Automated validation included:
  - Auth guard on CSV export
  - Media picker shows assets, inserts URLs into fields, and respects filters
  - Conditional logic persists and hides fields + required validation honors visibility
  - Rich editor saves HTML and public blog detail renders correctly
  - Blog gallery shows correct tile layout, filtering, and featured behavior
  - Admin refactor: new routes + sidebar + save flows + media bulk actions + Instagram caching
  - **Admin lag fix verification:** iteration 16 confirms performance + persistence
- Test reports remain in `/app/test_reports/`.

---

## 5) Deploy
**Deploy one-liner (AlmaLinux VPS)**
```bash
cd /var/www/swell && ./deploy.sh
```

---

## 6) Success Criteria (current)
- Owner can:
  - Connect Google Calendar with a single click and block busy times.
  - Run the inquiry wizard with a final optional phone-consult booking step.
  - Send confirmation emails including a calendar invite (.ics) when a consult is scheduled.
  - Upload media once and reuse anywhere via a media library + picker.
  - Bulk-manage media assets (tagging + deletion) without one-by-one cleanup.
  - Download a client-friendly OAuth PDF guide from `/admin/integrations`.
  - Export inquiries to CSV.
  - Configure **simple conditional logic** in the inquiry form builder.
  - Create **Blog** posts with rich text and embedded images.
  - Curate the public Blog gallery with **tags** and **featured** tiles.
  - Manage the homepage “Recent Work” images via Portfolio featured toggles.
  - Configure homepage Instagram feed text + count, with server-side caching for traffic spikes.
  - **Edit site content in admin with no keystroke lag** while preserving correct save behavior.
- Strict white-labeling maintained.
- Docker deployment remains one-command and stable on AlmaLinux 10 VPS.

---

## 7) Explicitly Deferred / Out of Scope (for now)
- Social feed / Facebook posts on homepage: user will use a paid specialist embed service (e.g., Juicer.io).
- CRM Enhancements (notes/tags/pipeline): deferred to the next session (primary next milestone).
- Blog post drag-reorder and featured-tile autoplay: deferred to future session.
- Bulk inquiry actions and auto-reply templates: deferred to future session.
