# plan.md — swell design + media (V4)

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
  - Author Journal posts with rich text + image embeds
  - Reuse images site-wide via a central Media Library (“upload once, use everywhere”)
- Keep deployment to **AlmaLinux 10 VPS** simple and repeatable via **Docker Compose** + `deploy.sh` (single-command deploy).
- Maintain strict white‑labeling:
  - No references to any third-party builder brand in UI/content
  - Automatically purge any non-owned hosted asset URLs from SiteContent
- Improve perceived UX:
  - Eliminate “flash of full site” when **Coming Soon mode** is enabled

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
  - Public pages: Home, About, Services, Gallery, Testimonials, FAQ, Blog/Journal, Contact, Privacy/Terms, 404.
  - Coming Soon mode with render gate (no FOUC).
  - Dynamic inquiry form renderer.
- Backend (FastAPI + Motor)
  - CRUD for Services, Gallery, Testimonials, FAQs, Blog, SiteContent.
  - Google Calendar OAuth integration endpoints.
  - Instagram Graph API integration.
  - Email confirmations (best-effort via SMTP).
- Admin
  - Auth-protected dashboard.
  - Site Content editor (Home/Footer/Header/About/Services/Gallery/Contact toggles + navigation editor).
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
**Goal:** Provide a polished, client-ready PDF setup guide accessible in the admin.

**Completed work**
- Produced the client-facing guide PDF:
  - `/app/deploy/Google_Calendar_Setup_Guide.pdf` (12-page, client-ready)
- Added a download link in `/admin/integrations` (Google Calendar section):
  - Label: **“OAuth setup guide for client (PDF)”**
  - Served from: `frontend/public/docs/oauth-setup-guide.pdf`
- Kept `/app/OAUTH_SETUP.md` as the developer/ops reference.

**Acceptance criteria met**
- Admin can click link and download/open the PDF.
- Link is visible near the Google Calendar connection UI.

#### K2 — Inquiry CSV Export (P1) (COMPLETED ✅)
**Goal:** One-click export of inquiries for reporting/backup.

**Completed work**
- Added **Export CSV** button to `/admin/inquiries`.
- Added backend endpoint:
  - `GET /api/admin/inquiries.csv` (auth-protected)
  - Supports `?status=` filter (matches UI filter)
  - Exports core columns + flattens dynamic fields as `extra_<key>` columns

**Acceptance criteria met**
- Admin clicks Export → downloads a `.csv`.

#### K3 — Media Library picker integration (P0) (COMPLETED ✅)
**Goal:** Fulfill the promise: reuse uploaded media without re-uploading.

**Completed work**
- Implemented reusable picker component:
  - `frontend/src/components/admin/MediaPickerDialog.jsx`
  - Provides search, tag filter, selection, and insert
- Wired the picker into all existing image fields (7 total):
  - `AdminSiteContent.jsx` (Logo, Hero Image, About Image)
  - `AdminBlog.jsx` (Cover Image)
  - `AdminGallery.jsx` (Gallery Item Image)
  - `AdminServices.jsx` (Service Hero Image, Service Gallery Images)

**Acceptance criteria met**
- Any image field can pick an existing library asset.

#### K4 — Conditional Logic in Inquiry Form Builder (SIMPLE mode) (P1) (COMPLETED ✅)
**Goal:** Show/hide a field based on another field value.

**Scope (simple only)**
- Rule type: **Show field X only if field Y equals value Z**
- Single condition per field initially (no AND/OR groups).

**Completed work**
- Schema support: `field.conditional = { field: <triggerFieldId>, equals: <value> }`
- Backend: updated sanitizer in `PUT /api/admin/inquiry-form` to preserve `conditional`.
- Admin UI: added “Show only if…” section per field with dropdowns.
- Public runtime: `InquiryWizardPage.jsx`:
  - Hides fields when condition not met
  - Excludes hidden fields from required validation

**Acceptance criteria met**
- Admin sets rule → public inquiry wizard immediately respects it.

#### K5 — Rich-text Blog Editor + image embeds (P2) (COMPLETED ✅)
**Goal:** Upgrade Journal authoring.

**Completed work**
- Installed TipTap and added rich editor component:
  - `frontend/src/components/admin/RichTextEditor.jsx`
- Rich editor supports: headings, bold/italic/strike, lists, quote, horizontal rule, links, undo/redo.
- Image embeds: integrates Media Library picker to insert images into post content.
- Public rendering updated to support both:
  - New HTML content (`dangerouslySetInnerHTML` gated by “looks like HTML” heuristic)
  - Legacy plain-text posts (rendered with `whitespace-pre-line`)
- Added lightweight CSS styling for `.tiptap-content` in `frontend/src/index.css`.

**Acceptance criteria met**
- Admin can format text and embed images.

---

## 4) Testing & QA
- After each Phase K item: quick smoke test in browser.
- Completed validation included:
  - Auth guard on CSV export
  - Media picker shows assets, inserts URLs into fields, and respects filters
  - Conditional logic persists and hides fields + required validation honors visibility
  - Rich editor saves HTML and public blog detail renders correctly
- Prior test reports remain in `/app/test_reports/`.

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
  - Download a client-friendly OAuth PDF guide from `/admin/integrations`.
  - Export inquiries to CSV.
  - Configure **simple conditional logic** in the inquiry form builder.
  - Create Journal posts with rich text and embedded images.
- Strict white-labeling maintained.
- Docker deployment remains one-command and stable on AlmaLinux 10 VPS.

---

## 7) Explicitly Deferred / Out of Scope (for now)
- Social feed / Facebook posts on homepage: user will use a paid specialist embed service (e.g., Juicer.io).
- CRM Enhancements (notes/tags/pipeline): deferred to the next session (primary next milestone).
