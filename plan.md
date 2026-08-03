# plan.md — swell design + media (V1)

## 1) Objectives
- Ship a **presentable, luxury public website** + **white‑labeled client management platform** for **swell design + media**.
- Deliver the **core lead flow** end‑to‑end:
  - Visitor browses → submits inquiry → admin reviews/updates status → visitor books consultation.
- Provide an **admin-managed CMS** so the owner can:
  - Edit text/images/sections,
  - **Toggle visibility of site elements** (“hide element X”),
  - Switch **seasonal/holiday/wedding palettes** without code,
  - Schedule palettes to auto-switch for seasons/holidays.
- Keep deployment to **AlmaLinux 10 VPS** simple and repeatable via **Docker Compose** + `deploy.sh`.
- Maintain strict white‑labeling (no third‑party branding references).
- Improve perceived UX:
  - Eliminate “flash of full site” when **Coming Soon mode** is enabled (render gate until CMS config is loaded).

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

### Phase A (P0) — Palette wiring + dynamic Home Page & Footer editors (COMPLETED ✅)
**Goal:** Enable site-wide seasonal/holiday/wedding color themes and make Home/Footer sections fully editable & toggleable from admin.

**Completed work**
1) Frontend wiring
- `frontend/src/App.js`
  - App wrapped in `<PaletteProvider>` **inside** `<SiteProvider>`.
  - Added route: `/admin/palettes`.

2) Admin navigation
- `frontend/src/pages/admin/AdminLayout.jsx`
  - Added **Palettes** link under Content.

3) Home page dynamic content + toggles
- `frontend/src/pages/HomePage.jsx`
  - Uses `site.home_*` eyebrow/title/subtitle fields.
  - Honors section visibility toggles:
    - `home_services_active`, `home_gallery_active`, `home_process_active`, `home_testimonials_active`, `home_designer_active`, `home_faq_active`, `home_final_cta_active`.
  - Renders timeline from `site.home_process_steps`.

4) Admin Site Content updates
- `frontend/src/pages/admin/AdminSiteContent.jsx`
  - Added **Home page** tab:
    - Section visibility toggles.
    - Eyebrow/title/subtitle editing.
    - Process steps editor (add/remove/reorder/edit).
  - Expanded **Footer & newsletter** tab:
    - Footer visibility toggles.
    - Copyright override.

5) Palette library expansion
- `backend/palettes.py`
  - Expanded with major US holidays + seasons + wedding season presets.

6) Testing
- Testing agent report: `/app/test_reports/iteration_6.json` (100% backend + frontend flows)

**Exit criteria (met)**
- Admin can set palette → public site CSS variables update immediately.
- Home page sections can be hidden/shown and process steps are editable.
- Footer blocks can be hidden/shown and saved.

---

### Phase B (P1) — FOUC fix + Site-wide “hide element X” toggles + Custom Nav Bar (NEXT)
**Goal:** Remove Coming Soon flash-of-content and let the owner hide/show core public sections and fully customize header navigation.

#### B1) FOUC fix (Coming Soon)
- **Frontend: `PublicLayout.jsx`**
  - If `site === null`, render a full-screen **neutral cream splash** (no logo) until site content loads (~200–400ms).
  - Once loaded, immediately render either Coming Soon page or the real site.

**Exit criteria**
- When `coming_soon_active=true`, visitors never see the full site “flash” before Coming Soon.

#### B2) Hide Element Toggles (per-section scope)
**User-confirmed scope:** per-section toggles for **About, Services list, Gallery, Contact, Header**.

**Backend: `models.py` → `SiteContent` fields to add**
- Header
  - `header_show_logo: bool = True`
  - `header_show_theme_toggle: bool = True`
  - `header_show_inquire_cta: bool = True`
- About page
  - `about_show_image: bool = True`
  - `about_show_designer: bool = True`
  - `about_show_ctas: bool = True`
- Services page
  - `services_page_show_header: bool = True`
  - `services_page_show_grid: bool = True`
- Gallery page
  - `gallery_page_show_header: bool = True`
  - `gallery_page_show_filters: bool = True`
  - `gallery_page_show_grid: bool = True`
- Contact page
  - `contact_page_show_header: bool = True`
  - `contact_page_show_info_block: bool = True`
  - `contact_page_show_form: bool = True`

**Frontend: honor toggles**
- `Header.jsx`: hide logo/theme toggle/CTA based on site fields.
- `StaticPages.jsx` (AboutPage): hide image/designer/ctas.
- `ServicesPage.jsx`: hide header and/or services grid.
- `GalleryPage.jsx`: hide header and/or category filters and/or grid.
- `ContactPage.jsx`: hide header and/or contact info and/or form.

**Admin UI**
- `AdminSiteContent.jsx`
  - Add tabs/sections:
    - “Header” (logo/theme toggle/CTA toggles)
    - “About page”
    - “Services page”
    - “Gallery page”
    - “Contact page”

**Exit criteria**
- Owner can hide each of these page sections without code.
- Layout remains stable when sections are hidden.

#### B3) Custom Nav Bar (CMS-driven)
**User-confirmed scope:** internal + external URLs + per-link “open in new tab”.

**Backend: `models.py` → `SiteContent` field to add**
- `header_nav_items: List[Dict[str, Any]]`
  - Each item: `{ id, label, href, visible, new_tab }`
  - Defaulted to current links (Services/Gallery/About/Testimonials/Journal/FAQ/Contact).

**Frontend**
- `Header.jsx`
  - Render nav from `site.header_nav_items` when present.
  - Support internal links (`<NavLink to>` for `/path`) and external links (`<a href target="_blank" rel="noreferrer">` when `new_tab`).
  - Mobile menu uses the same list.

**Admin UI**
- `AdminSiteContent.jsx`
  - Add “Header & Nav” tab:
    - Add/remove items
    - Rename label
    - Edit href
    - Toggle visible
    - Toggle new_tab
    - Reorder via Up/Down buttons (no drag requirement)

**Exit criteria**
- Owner can add/reorder/hide/rename links, including external URLs, and control new-tab behavior.

**Testing (required for Phase B)**
- Verify Coming Soon no longer flashes.
- Verify header toggles and nav config apply on desktop + mobile.
- Verify About/Services/Gallery/Contact toggles persist and render correctly.

---

### Phase C (P1) — Season Auto‑Switch (Scheduled palettes)
**Goal:** Allow palettes to auto-activate by date rules (yearly recurring or one-off).

**Backend**
- Add to `SiteContent`:
  - `palette_schedules: List[Dict[str, Any]]`
  - Rule shape: `{ id, label, enabled, palette_id, start_date, end_date, repeats_yearly, year? }`
    - If `repeats_yearly=true`: ignore `year`, apply annually.
    - If `repeats_yearly=false`: require `year` (or ISO date strings for start/end).
- Update `/api/palettes/active`
  - Compute “effective palette” by scanning enabled schedules and returning the highest-priority match (define priority: one-off > yearly > manual active).
  - Fallback to `active_palette_id` when no schedule matches.

**Frontend (Admin)**
- `AdminPalettes.jsx`
  - Add “Schedules” UI:
    - List existing rules
    - Add/edit/delete
    - Toggle enabled
    - Choose palette + schedule type + date(s)
    - Display which rule is active “today”

**Exit criteria**
- Admin can set date rules; public site palette changes automatically based on date.

**Testing**
- Unit-ish tests for schedule matching.
- Manual test by temporarily setting a schedule covering today.

---

### Phase D (P1/P2) — Palette From Photo (on-device)
**Goal:** Owner can generate a custom palette from an uploaded inspiration image and save it as a reusable theme.

**User-confirmed approach:** on-device extraction (ColorThief).

**Backend**
- New Mongo collection: `custom_palettes`
  - Doc shape: `{ id, name, category: 'custom', mood, colors, is_preset: false, created_at }`
- New endpoints (admin-protected)
  - `POST /api/admin/palettes/custom` (create/update)
  - `DELETE /api/admin/palettes/custom/{pid}`
- Update `/api/palettes`
  - Merge presets + custom palettes.
  - Add “Custom” category filter.
- Update palette resolution
  - Ensure active palette lookup can return either preset or custom palette.

**Frontend**
- Add dependency: `colorthief` (frontend)
- `AdminPalettes.jsx`
  - “Create palette from photo” workflow:
    - Upload/select image
    - Extract dominant colors
    - Map to brand keys (cream/sage/rose/etc.)
    - Allow naming + minor adjustments (optional)
    - Save to backend
  - Show “Custom” category
  - Allow apply/delete

**Exit criteria**
- Admin can create custom palette from a photo and apply it site-wide.

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
1) Implement **Phase B1** (FOUC fix) first.
2) Implement **Phase B2** (per-section hide toggles: Header/About/Services/Gallery/Contact) + admin UI.
3) Implement **Phase B3** (Custom Nav Bar) + admin UI.
4) Implement **Phase C** (Season Auto-Switch schedules).
5) Implement **Phase D** (Palette From Photo + custom palette persistence).
6) After each phase: run backend + frontend tests.

**Deploy one-liner (Hostinger VPS)**
```bash
cd /var/www/swell && ./deploy.sh
```

## 4) Success Criteria
- Owner can:
  - Switch seasonal/holiday/wedding palettes from admin.
  - Hide/show and edit Home + Footer sections without coding.
  - Hide/show key sections on Header/About/Services/Gallery/Contact.
  - Customize header navigation (internal/external, reorder, new-tab toggles).
  - Schedule palettes to switch automatically.
  - Create palettes from photos and reuse them.
- Coming Soon mode has **no flash-of-content**.
- Inquiry and booking flows remain fully functional.
- Docker deployment remains one-command and stable on AlmaLinux 10 VPS.
