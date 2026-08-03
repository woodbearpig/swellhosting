# plan.md — swell design + media (V1)

## 1) Objectives
- Ship a **presentable, luxury public website** + **white‑labeled client management platform** for **swell design + media**.
- Deliver the **core lead flow** end‑to‑end:
  - Visitor browses → submits inquiry → admin reviews/updates status → visitor books consultation.
- Provide an **admin-managed CMS** so the owner can:
  - Edit text/images/sections,
  - **Toggle visibility of site elements** (“hide element X”),
  - Switch **seasonal/holiday/wedding palettes** without code.
- Keep deployment to **AlmaLinux 10 VPS** simple and repeatable via **Docker Compose** + `deploy.sh`.
- Maintain strict white-labeling (no third-party branding references).

## 2) Implementation Steps

### Phase 1 — Core Workflow POC (Completed)
> Core = inquiry submission + file uploads + persistence + admin can view.
- Implemented FastAPI + MongoDB models for: Inquiry, Upload metadata, Clients, Consultations, Availability.
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

### Phase 2 — V1 App Development (Mostly Completed; ongoing enhancements)
#### What is already implemented
- Frontend (React + Tailwind + Framer Motion)
  - Public pages: Home, About, Services, Gallery, Testimonials, FAQ, Blog, Contact, Privacy/Terms, 404.
  - Inquiry Wizard + Consultation booking.
  - Coming Soon mode with granular element toggles.
- Backend (FastAPI + Motor)
  - CRUD for Services, Gallery, Testimonials, FAQs, Blog, SiteContent.
  - CRM-lite: Client auto-create and linkage.
  - Email confirmations (best-effort).
- Admin
  - Auth-protected dashboard.
  - Site Content editor.
  - Integrations: Google Calendar + Instagram Graph API.
- Deployment
  - Docker-based deploy scripts working on AlmaLinux 10 VPS.

#### Current focus (enhancements)

### Phase A (P0) — Palette wiring + dynamic Home Page & Footer editors (IN PROGRESS)
**Goal:** Enable site-wide seasonal/holiday/wedding color themes and make Home/Footer sections fully editable & toggleable from admin.

1) **Frontend wiring (routing + providers)**
- Update `frontend/src/App.js`
  - Wrap app in `<PaletteProvider>` **inside** `<SiteProvider>` (so `useSite()` is available to PaletteContext).
  - Add route: `/admin/palettes`.

2) **Admin navigation**
- Update `frontend/src/pages/admin/AdminLayout.jsx`
  - Add **Palettes** link under the Content group.

3) **Home page: make content dynamic + honor visibility toggles**
- Update `frontend/src/pages/HomePage.jsx`
  - Replace hardcoded eyebrow/title/subtitle strings with `site.home_*` fields.
  - Honor these visibility toggles:
    - `home_services_active`, `home_gallery_active`, `home_process_active`, `home_testimonials_active`, `home_designer_active`, `home_faq_active`, `home_final_cta_active`.
  - Render process timeline from `site.home_process_steps`.

4) **Admin Site Content: expose the new fields**
- Update `frontend/src/pages/admin/AdminSiteContent.jsx`
  - Add new tab: **Home page**
    - Edit eyebrow/title/subtitle fields for each section.
    - Edit visibility toggles for each home section.
    - Add a small editor UI for `home_process_steps` (add/remove/reorder + title/description fields).
  - Extend **Footer** tab
    - Add footer visibility toggles (logo/explore/contact/newsletter/legal/social etc.).
    - Add copyright override.

5) **Palettes library expansion (major US holidays + seasons + wedding season)**
- Expand `backend/palettes.py` preset list to include:
  - Seasons: Spring, Summer, Fall, Winter.
  - Major US holidays (as palettes): Valentine’s Day, Easter, Mother’s Day, Independence Day, Halloween, Thanksgiving, Christmas, New Year.
  - Wedding season set: multiple wedding looks (blush/ivory/garden/moody).

6) **Testing (required)**
- Backend
  - Verify `/api/palettes`, `/api/palettes/active`, `/api/admin/palettes/active`.
  - Verify SiteContent auto-migration maintains `active_palette_id` (already present) and no breaking changes.
- Frontend
  - Admin → Palettes: hover preview applies variables; Apply persists + survives refresh.
  - Home page updates reflect toggles + step edits.
  - Footer visibility toggles behave as expected.

**Exit criteria (Phase A)**
- Admin can set palette → public site color variables update immediately.
- Home page sections can be hidden/shown and the process steps are editable.
- Footer blocks can be hidden/shown and saved.

---

### Phase B (P1a) — Site-wide “hide element X” toggle system (NEXT)
**Goal:** Every visible component on the public site can be toggled via SiteContent, without code changes.

- Add/extend SiteContent fields (as needed) for:
  - Header element toggles (theme toggle, inquiry CTA, etc.).
  - Per-page section toggles (About, Services listing/detail blocks, Gallery sections, Contact blocks, Blog blocks, Testimonials blocks).
  - Global blocks like Instagram feed visibility.
- Update public components to honor toggles:
  - `Header.jsx`, `InstagramFeed.jsx`, key page sections.
- Add admin UI to `AdminSiteContent.jsx` to manage these toggles with clear labeling.

**Exit criteria (Phase B)**
- Admin can hide/show each major section without code.
- No broken layouts when sections are disabled.

---

### Phase C (P1b) — Global header nav customization (AFTER Phase B)
**Goal:** Admin can add/remove/reorder/rename header links.

- Add `header_nav_items` to SiteContent (list of `{to,label,visible,order}`) with sensible defaults.
- Update `Header.jsx` to render from `site.header_nav_items` (fallback to defaults if missing).
- Add admin UI in `AdminSiteContent.jsx`:
  - CRUD for nav items.
  - Reordering (up/down) and visibility toggles.

**Exit criteria (Phase C)**
- Header is fully CMS-driven and stable across mobile/desktop.

---

### Phase 3 — Stabilization + Deployment Package (Completed; maintenance ongoing)
- Docker Compose deployment on AlmaLinux 10 VPS is working.
- HTTPS issuance scripts and environment setup workflow exist.
- Continue to keep deploy workflow stable while adding features (no breaking env changes).

**User stories (Phase 3)**
1. As the developer, I can deploy updates via a single command.
2. As the owner, the site loads reliably over HTTPS.

---

### Phase 4 — Post‑V1 / Future Enhancements (Planned)
- P2: Dynamic Form Builder (visual multi-step wizard creation in admin).
- P2: CRM upgrades (internal notes, tags, pipeline stages).
- P3: Twilio SMS notifications.
- P3: Stripe/PayPal payments.

## 3) Next Actions
1) Complete **Phase A (P0)** wiring + Admin UI changes.
2) Run tests for palettes + CMS updates.
3) Begin **Phase B** site-wide toggles.
4) Then **Phase C** header nav customization.

## 4) Success Criteria
- Owner can:
  - Switch seasonal/holiday/wedding palettes from admin.
  - Hide/show and edit Home + Footer sections without coding.
  - Progressively manage visibility across the entire site (Phase B).
  - Customize header navigation (Phase C).
- Inquiry and booking flows remain fully functional.
- Docker deployment remains one-command and stable on AlmaLinux 10 VPS.
