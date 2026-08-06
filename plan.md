# plan.md — swell design + media (V2)

## 1) Objectives
- Ship a **presentable, luxury public website** + **white‑labeled client management platform** for **swell design + media**.
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
- Keep deployment to **AlmaLinux 10 VPS** simple and repeatable via **Docker Compose** + `deploy.sh`.
- Maintain strict white‑labeling:
  - No Emergent references in UI/content
  - Automatically purge any Emergent-hosted asset URLs from SiteContent
- Improve perceived UX:
  - Eliminate “flash of full site” when **Coming Soon mode** is enabled

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
  - Google Calendar OAuth integration endpoints exist.
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
  - `deploy.sh` now fails loudly on git auth failures and prints PAT instructions.

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
**Goal:** Owner can change admin login safely + fully customize the inquiry wizard, especially bubble-shaped chip options.

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
**Goal:** Ensure no Emergent-hosted asset URLs remain in live content.

**Completed work**
- Default `logo_url` no longer points to Emergent CDN.
- Startup migration clears Emergent URLs from: `logo_url`, `hero_image_url`, `about_image_url`, `coming_soon_bg_url`, `og_image_url`, `favicon_url`.

---

## 3) NEXT: Client-Requested Enhancements (Planned)
Ordering confirmed by user: **Google Calendar polish → merged consults → media library**

### Phase H (P0) — Google Calendar “one-click connect” polish (Path A)
**Goal:** Owner connects Google Calendar by clicking “Sign in with Google” (no manual client_id/secret entry in normal use).

**Backend**
- Confirm OAuth redirect + token refresh behavior is robust.
- Ensure availability computation can block time slots based on Google Calendar busy events.
- Ensure event creation works for consult bookings.

**Frontend Admin**
- Improve `AdminIntegrations` UX:
  - If env vars `GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET` exist: hide the manual paste UI by default.
  - Keep manual credential entry as fallback.
- Add “5-minute setup guide” in the UI and as `/app/OAUTH_SETUP.md`.

**Exit criteria**
- She clicks “Connect Google Calendar” → chooses `swellballoons@gmail.com` → Allow → status shows Connected.

---

### Phase I (P0) — Consultation becomes last step of inquiry (phone-only)
**Goal:** Replace standalone /book with an optional final inquiry step to schedule a phone consult.

**Requirements confirmed**
- Delete standalone **/book** page.
- Final inquiry step offers:
  - “Schedule a phone consultation” (shows calendar + time slots)
  - “Submit inquiry without phone consultation” (with confirm modal notice: consult may still be required)
- Phone number is required.
- Success screen shows consult time if scheduled.
- Send confirmation email with **.ics calendar invite attachment**.
- Admin keeps a separate filtered view for consult-booked inquiries ("Scheduled calls").

**Backend**
- Extend Inquiry with consult metadata (or store consult meta in `extra` but surfaced explicitly):
  - `consult_date`, `consult_time`, `consult_duration_minutes`, `consult_status`.
- Keep Consultation model for compatibility, but treat it as derived from Inquiry.
- Add **Booking rules** to Availability singleton:
  - `advance_booking_days` (default 60)
  - `minimum_lead_hours` (default 2)
  - `daily_max_consults` (default 6)
  - `buffer_minutes` (default 15)
  - `consult_duration_minutes` (default 30)
  - `block_sundays` (default True)
  - `blocked_dates: List[str]` (YYYY-MM-DD)
- Availability computation returns slots for next N days honoring:
  - weekly hours, blocked_dates, lead time, booking window, daily max, buffer, and Google Calendar busy.
- Email service:
  - Add `.ics` generator and attach to confirmation emails.

**Frontend**
- InquiryWizardPage:
  - Add final hard-coded consult step (separate from schema) that reuses Booking UI.
  - Add confirm modal for skipping consult.
  - Make `client_phone` required.
- Remove `/book` route and update nav/CTAs to point to `/inquire`.

**Admin**
- Remove “Consultations” tab.
- Add “Scheduled calls” view (filtered inquiries with consult scheduled).
- Add Booking rules UI under Admin → Settings.

---

### Phase J (P1) — Media Library (uploads hub)
**Goal:** One central upload library to reuse media anywhere, with tags and compression.

**Backend**
- New collection: `media_library` (MediaAsset)
  - `{ id, url, filename, alt_text, tags[], width, height, size_bytes, created_at }`
- Enhance `/api/uploads`:
  - Auto-compress + resize (max 2400px width, JPEG q80) via Pillow.
  - Index each uploaded file into `media_library`.
- Admin endpoints:
  - `GET /api/admin/media` (search + tag filter)
  - `PATCH /api/admin/media/{id}` (alt/tags/filename)
  - `DELETE /api/admin/media/{id}`
- Startup migration:
  - Scan existing SiteContent images + Services + Gallery + Blog covers and index them if not present.

**Frontend Admin**
- New page: `/admin/media`
  - Thumbnail grid, search, tag filter, drag-to-upload.
  - Edit alt + tags.
  - Delete.
- Add “Insert from library” modal anywhere an image URL exists.
- Sidebar: add “Media” between Gallery and Testimonials.

---

## 4) Testing & QA
- After each phase (H/I/J): run **testing_agent** for backend + frontend.
- Specific regression focus:
  - Calendar OAuth connect/disconnect and busy-time blocking
  - Inquiry submission with/without consult + email + .ics
  - Media compression integrity + library indexing + picker modal
  - White-label purge remains intact

## 5) Deploy
**Deploy one-liner (Hostinger VPS)**
```bash
cd /var/www/swell && ./deploy.sh
```

## 6) Success Criteria (updated)
- Owner can:
  - Connect Google Calendar with a single click and block busy times.
  - Run the inquiry wizard with a final optional phone-consult booking step.
  - Send confirmation emails that include a calendar invite (.ics) when a consult is scheduled.
  - Manage booking rules in admin.
  - Upload media once and reuse anywhere via a media library.
- Strict white-labeling maintained (no Emergent URLs, automatic purge).
- Docker deployment remains one-command and stable on AlmaLinux 10 VPS.
