# plan.md — Swell Design LA (V1)

## 1) Objectives
- Ship a **presentable luxury website + lightweight client management platform** for Swell Design LA.
- Deliver **core lead flow**: visitor browses → submits smart inquiry (with uploads) → admin reviews/updates status → visitor can book consultation.
- Provide **admin-managed CMS** so the owner can update content without code.
- Make deployment to **Hostinger AlmaLinux 10** easy: GitHub push + SSH + **single deploy command** using Docker Compose.

## 2) Implementation Steps

### Phase 1 — Core Workflow POC (Isolation)
> Core = Inquiry Wizard submission + file uploads + persistence + admin can view.
- Implement minimal FastAPI + MongoDB models for: Inquiry, Upload (metadata).
- Build isolated endpoints:
  - `POST /api/inquiries` (accept wizard payload)
  - `POST /api/uploads` (image upload)
  - `GET /api/admin/inquiries` + `GET /api/admin/inquiries/{id}`
- Implement storage strategy:
  - V1: store uploads on server disk (Docker volume) + save URLs in MongoDB.
- Create minimal React POC pages:
  - Public: stripped-down Inquiry Wizard (2–3 steps) + upload + submit success state
  - Admin: simple inquiry list + detail view
- Validate data flow end-to-end until stable (submit, refresh, persists, uploads display).

**User stories (Phase 1)**
1. As a visitor, I can complete an inquiry in a few steps without confusion.
2. As a visitor, I can upload inspiration photos and see them attached to my inquiry.
3. As an owner, I can open an admin list and see new inquiries immediately.
4. As an owner, I can open an inquiry and view all details and uploaded images.
5. As an owner, I can change an inquiry status so I know what to follow up on.

---

### Phase 2 — V1 App Development (Full Build)
- Frontend (React + Tailwind + shadcn/ui + Framer Motion):
  - Public pages: Home, About, Services (list + detail), Gallery, Testimonials, FAQ, Blog (list + detail), Contact, Privacy/Terms, 404.
  - Inquiry Wizard: full multi-step + conditional branching + localStorage draft + review/submit.
  - Consultation booking: pick type + slot from availability + confirmation screen.
  - Luxury theme: palette + Playfair/Inter + light/dark toggle + responsive.
- Backend (FastAPI + Motor):
  - CRUD for Services, Gallery items, Testimonials, FAQs, Blog posts, SiteContent, Inquiries, Clients, Consultations, Availability/Blackouts.
  - CRM-lite: auto-create Client from inquiry; notes/tags/status pipeline.
  - Email (SMTP): configurable settings; send inquiry + consultation confirmations; fallback to DB-log when not configured.
- Admin app:
  - Dashboard (basic stats), Inquiries, Clients, Consultations + availability editor, CMS sections (Services/Gallery/Testimonials/FAQ/Blog/Site Content).
- Seed demo content (services, gallery, testimonials, FAQs, blog posts, home content).
- Conclude with 1 full E2E test pass (public browse → inquire with upload → admin review/update → booking).

**User stories (Phase 2)**
1. As a visitor, I can quickly understand services and pricing packages from the Services pages.
2. As a visitor, I can filter the Gallery and view photos in a lightbox on mobile.
3. As a visitor, I can submit a detailed inquiry and receive an on-screen confirmation.
4. As a visitor, I can book a consultation time that matches the owner’s availability.
5. As an owner, I can update the homepage hero/promo/banner and see it live immediately.

---

### Phase 3 — Stabilization + Deployment Package
- Dockerize:
  - Backend Dockerfile, Frontend Dockerfile, MongoDB service, Nginx reverse proxy.
- Add Certbot (Let’s Encrypt) and production Nginx config for `swelldesignla.com`.
- Provide `deploy.sh` (single command): pull, build, restart, basic health checks.
- Provide `.env.example` + README for AlmaLinux 10 setup (Docker install, firewall ports, first run, SSL).
- Backups: simple Mongo dump/restore commands documented.
- Conclude with 1 E2E test pass on a production-like compose run.

**User stories (Phase 3)**
1. As the developer, I can deploy updates by running one SSH command.
2. As the owner, the site loads fast and reliably over HTTPS.
3. As the owner, uploaded images remain available after redeploys.
4. As the owner, admin pages remain usable on a phone/tablet.
5. As the developer, I can restore the database from a backup if needed.

---

### Phase 4 — Post‑V1 (After Client Meeting)
- Decide and implement integrations (each gated behind a small POC):
  - Google Calendar sync (OAuth) and/or Outlook sync.
  - SMTP finalization (Hostinger email or Gmail relay).
  - Instagram feed, Google Maps API.
  - Payments (Stripe) if needed.

**User stories (Phase 4)**
1. As an owner, I can connect Google/Outlook calendar so bookings appear automatically.
2. As an owner, I can avoid double-booking because availability updates from my real calendar.
3. As a visitor, I can see a live Instagram portfolio feed.
4. As an owner, I can accept deposits online for confirmed bookings.
5. As an owner, I can receive automated reminders for upcoming consultations.

## 3) Next Actions
- Start Phase 1 immediately (Inquiry+Upload+Admin POC).
- You provide (when available): logo file, preferred phone/email copy, and any must-have service/package names.
- After tonight’s client meeting: confirm whether calendar/email integrations are needed for Phase 4.

## 4) Success Criteria
- Public site is visually premium, mobile-first, and content is editable via admin.
- Inquiry Wizard works end-to-end with conditional logic + uploads + persistence.
- Booking works with admin availability + blackout dates.
- Admin can manage services/gallery/testimonials/FAQ/blog/site content and track inquiries/clients.
- Docker Compose deployment runs on Hostinger AlmaLinux 10 with HTTPS; updates deploy via a single command.