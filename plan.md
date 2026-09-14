# plan.md — swell design + media (V13)

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

**Updated objectives (current milestone / deploy-ready)**
- Enable safe pre-launch review and social proof:
  - **Coming Soon preview link**: public sees Coming Soon; private `/?preview=<token>` bypass works; token is never exposed publicly.
  - **Homepage social widget slot**: admin can paste an embed snippet (Elfsight Facebook feed or other) and place it on the homepage.
  - **Dedicated Facebook page (`/facebook`)**:
    - Fully separate from the homepage widget
    - Controlled by a **single site-wide toggle** (`social_page_active`)
    - **OFF by default**
  - **Blog removed entirely**:
    - No public `/blog` routes
    - No admin Blog section
    - No Blog model/endpoints
- Improve launch-day polish and admin control:
  - **Hero CTAs moved under the hero** (side-by-side), freeing hero text placement
  - **Site-wide “Gallery” → “Portfolio”** naming consistency
  - **Desktop wordmark/logo sizing** improved (responsive) + admin slider
  - **About page header editable** (eyebrow/title/subtitle)
  - **Contact fields optional** and clearer in admin (blank hides)
  - **Hero rating badge editable** (split hero)
  - **Full-bleed hero image display modes** cover/contain/auto (admin-controlled)
- Add owner-requested automation:
  - **Instant inquiry auto-reply** uses an **owner-selected Reply Template** (toggle + template selection), with placeholder rendering.

**Important architectural decisions (confirmed)**
- **VPS local uploads remain** (persistent Docker volume `uploads_data` on AlmaLinux VPS).
  - To satisfy platform checks while keeping VPS persistence, raw upload staging now uses OS temp dir; final processed files still persist to the Docker volume.
- **Deploy safety**: startup migration only adds **missing fields** (does not overwrite existing live settings).

**Email testing note (important)**
- Preview environment has **no SMTP host/user**, so emails are **skipped and logged** in preview.
- Live VPS SMTP is configured (Hostinger) and will send after deploy.

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
  - Public pages: Home, About, Services, Portfolio, Testimonials, FAQ, Contact, Privacy/Terms, 404.
  - Coming Soon mode with render gate (no FOUC).
  - Dynamic inquiry form renderer.
  - Dedicated Facebook page: `/facebook` (toggle-gated, OFF by default).
- Backend (FastAPI + Motor)
  - CRUD for Services, Gallery, Testimonials, FAQs, SiteContent.
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

---

### Phase A (P0) — Palette wiring + dynamic Home Page & Footer editors (COMPLETED ✅)
(unchanged)

---

### Phase B (P1) — FOUC fix + Site-wide hide toggles + Custom Nav Bar (COMPLETED ✅)
(unchanged)

---

### Phase C (P1) — Season Auto‑Switch (Scheduled palettes) (COMPLETED ✅)
(unchanged)

---

### Phase D (P1/P2) — Palette From Photo (COMPLETED ✅)
(unchanged)

---

### Phase E (P0/P1) — Admin Credentials + Dynamic Inquiry Form Builder (COMPLETED ✅)
(unchanged)

---

### Phase F (P1) — Typography + Hero Badges (COMPLETED ✅)
(unchanged)

---

### Phase G (P0) — White‑label asset purge (COMPLETED ✅)
(unchanged)

---

## 3) Client-Requested Enhancements (Delivered)

### Phase H (P0) — Google Calendar “one-click connect” polish (COMPLETED ✅)
(unchanged)

---

### Phase I (P0) — Consultation becomes last step of inquiry (phone-only) (COMPLETED ✅)
(unchanged)

---

### Phase J (P1) — Media Library (uploads hub) (COMPLETED ✅)
(unchanged)

---

### Phase K (P0/P1) — Session Enhancements (COMPLETED ✅)
(unchanged)

---

### Phase M/N/O/P/Q/R/S (COMPLETED ✅)
(unchanged; see earlier versions)

---

### Phase T (P0) — Blog removal + Dedicated Facebook Page (COMPLETED ✅)
**Goal:** Remove Blog entirely, and provide a dedicated Facebook page that is OFF by default and fully white-labeled.

**Important confirmations**
- **VPS local upload storage remains** (Docker volume backed).
- Dedicated Facebook page is **completely separate** from the homepage widget:
  - Homepage widget: `home_widget_active` + `home_widget_snippet`
  - Dedicated Facebook page: `social_page_active` + `social_page_snippet`

**What shipped**
- Dedicated Facebook page (public): `/facebook` gated by `social_page_active` (default false)
- Full Blog removal (backend + frontend + seed)
- Idempotent DB cleanup migration on deploy:
  - `$unset` legacy `blog_page_active`
  - remove leftover `/blog*` nav items
  - drop `blog_posts` collection

---

### Phase U (P0) — Portfolio naming consistency (COMPLETED ✅)
**Goal:** Ensure the site consistently uses “Portfolio” (not “Gallery”) in user-facing copy.

**Shipped**
- Updated public labels/copy:
  - Hero secondary CTA default now “View the portfolio”
  - Recent work section link “Full portfolio”
  - Portfolio page eyebrow “PORTFOLIO”
  - Services/inquiry/utility copy updated accordingly
- Startup migration updates stored values:
  - Nav item label/href `/gallery` → `/portfolio`
  - Hero CTA label “View the gallery” → “View the portfolio”

---

### Phase V (P0) — Hero CTA bar under full-bleed hero (COMPLETED ✅)
**Goal:** Prevent hero overlay crowding and allow the owner to lower hero text freely.

**Shipped**
- Hero primary/secondary buttons moved **below** the full-bleed slideshow in a bar.
- Buttons are side-by-side on desktop and wrap gracefully on small screens.

---

### Phase W (P0) — Responsive wordmark/logo size + admin slider (COMPLETED ✅)
**Goal:** Make the text wordmark feel appropriately sized on desktop without quality loss.

**Shipped**
- `logo_text_scale` multiplier stored in `SiteContent`.
- Public Header/Footer wordmark scales via `clamp()` and remains crisp.
- Admin slider: **Brand & fonts → Logo size (wordmark)**.

---

### Phase X (P0) — About header editable (COMPLETED ✅)
**Goal:** Make the About page header sentence (“boutique LA…”) editable in admin.

**Shipped**
- New SiteContent fields:
  - `about_page_eyebrow`, `about_page_title`, `about_page_subtitle`
- Admin UI: **Admin → About page → Page header (/about)**.
- Eyebrow/subtitle blank = hidden.

---

### Phase Y (P0) — Contact fields optional clarity (COMPLETED ✅)
**Goal:** Allow hiding phone/hours/etc by leaving blank.

**Shipped**
- Confirmed behavior: blank `contact_*` fields are not rendered publicly.
- Admin helper copy + placeholders: “Leave blank to hide (don’t type N/A)”.

---

### Phase Z (P1) — Hero rating badge editable (COMPLETED ✅)
**Goal:** Let owner edit/hide the rating snippet on split-hero image.

**Shipped**
- New SiteContent fields:
  - `hero_rating_active`, `hero_rating_value`, `hero_rating_text`
- Admin controls added under Hero settings.

---

### Phase AA (P1) — Full-bleed hero image fit modes (COMPLETED ✅)
**Goal:** Address mixed portrait/landscape hero images with admin-controlled fit.

**Shipped**
- New `hero_image_fit` values:
  - `cover` (Fill the frame)
  - `contain` (Fit whole photo with blurred fill)
  - `auto` (Automatic per-photo decision: landscape fills, portrait fits)
- Admin control under Full-width background.

**Known limitation / UX note (deferred)**
- Mixed portrait images may still look visually busy in contain/auto due to blurred fill.
- Recommended operational workaround: use wide/landscape hero photos for the full-bleed hero.
- Future (optional): add focal-point controls (top/center/bottom) + “hide hero text overlay” toggle.

---

### Phase AB (P0) — Instant inquiry auto-reply via chosen template (COMPLETED ✅ → READY FOR LIVE TEST)
**Goal:** Send a client-facing automatic reply on inquiry submit using an owner-selected Reply Template.

**Shipped**
- New `SiteContent` fields:
  - `auto_reply_active` (default true)
  - `auto_reply_template_id` (default empty = use built-in confirmation)
- Backend:
  - On `POST /api/inquiries`, if `auto_reply_active` and a template is selected, send that template to the client (placeholders substituted identically to manual Reply-with).
  - Falls back to the existing built-in confirmation email when no template is chosen.
  - Owner “New inquiry” notification remains unchanged.
- Email rendering:
  - Added `template_email_html()` wrapper for consistent branded email styling.
  - Placeholder substitution mirrors `ReplyWithTemplateButton.jsx`.
- Admin UI:
  - **Admin → Settings → Quick reply templates** now includes:
    - Auto-reply On/Off toggle
    - Template dropdown

**Testing notes**
- Preview environment does not send real emails (SMTP not configured) — emails are logged as skipped.
- Live VPS SMTP is configured (Hostinger), so delivery can be verified post-deploy.
- Test address provided: `wfamaccounts@protonmail.me`.

---

## 4) Testing & QA
- After each phase item: quick smoke test in browser.
- Automated validation included:
  - Auth guard on CSV export
  - Media picker works across all image fields
  - Conditional logic persists and required validation honors visibility
  - Admin refactor routes and save flows
  - Admin performance (keystroke + scroll)
  - Backdrops/Designs split
  - Reply templates CRUD + inquiry reply button
  - Hero color override end-to-end
  - Preview token bypass
  - Homepage embed widget
  - Drag-and-drop portfolio reordering
  - Blog removal + dedicated Facebook page gating
  - New builds compile:
    - `esbuild` bundle OK
    - backend files parse OK

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

**Post-deploy validation checklist (recommended)**
1. Visit admin → confirm no Blog section exists.
2. Confirm nav shows “Portfolio” (not “Gallery”).
3. Home hero CTA bar shows “View the portfolio”.
4. Settings → Quick reply templates → configure Auto-reply:
   - Turn On
   - Choose “Thanks for your inquiry”
5. Submit a test inquiry (with your test email `wfamaccounts@protonmail.me`). Confirm email arrives.

---

## 6) Success Criteria (current)
- Owner can:
  - Connect Google Calendar with a single click and block busy times.
  - Run the inquiry wizard with a final optional phone-consult booking step.
  - Upload media once and reuse anywhere via a media library + picker.
  - Bulk-manage media assets.
  - Export inquiries to CSV.
  - Configure conditional logic in the inquiry form builder.
  - Manage homepage “Recent Work” images via Portfolio featured toggles.
  - Configure homepage Instagram feed text + count, with server-side caching.
  - Manage **Backdrops & Designs** separately.
  - Reply to inquiries quickly using **Gmail compose templates**.
  - Enable an **instant automatic inquiry reply** using a chosen template (optional).
  - Ensure hero readability by adjusting **Hero headline/subhead/button colors**.
  - Paste a Facebook feed (Elfsight) or other widget snippet into Admin → Home and have it render on the homepage.
  - Use a separate dedicated Facebook page at `/facebook` when ready (OFF by default).
  - Keep the public site in Coming Soon while sharing a private preview link.
- Blog is fully removed (no public routes, no admin section, DB cleaned).
- Strict white-labeling maintained.
- Docker deployment remains one-command and stable on AlmaLinux 10 VPS.

---

## 7) Explicitly Deferred / Out of Scope (for now)

### Next active task candidates (post-deploy)
- CRM Enhancements (P1):
  - Client tags
  - Lead pipeline status chips tracking on client profiles
- Payments & invoicing (Stripe/PayPal) (P2):
  - Deposits, payment plans, invoices linked to CRM/client profiles.
- SEO polish (P2/P3):
  - sitemap.xml, robots.txt, schema.
- VPS hardening script (optional) (P3):
  - `harden.sh` (fail2ban, automatic updates, basic hardening).

### Other deferred items
- Hero portrait handling polish:
  - focal point control (top/center/bottom)
  - optional “hide hero text overlay” toggle
- Stage-based automated follow-ups (pipeline-triggered emails)
- Bulk inquiry actions
- Twilio SMS Notifications
- Backend refactor of `server.py` into routers
