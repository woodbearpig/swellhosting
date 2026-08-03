# swell design + media

A custom event decorator website + client management platform for **swell design + media** (swelldesignla.com).

## Stack
- **Backend**: FastAPI (Python 3.11) + MongoDB (Motor)
- **Frontend**: React 19 + TailwindCSS + Framer Motion + shadcn/ui
- **Deployment**: Docker Compose (backend + frontend + MongoDB + Nginx + Certbot)
- **Target host**: AlmaLinux 10 VPS (Hostinger or similar), 1 GB RAM minimum

## Features

### Public site
- Home, About, Services (list + detail), Gallery (filtered + lightbox), Testimonials, FAQ, Journal (blog), Contact
- Smart multi-step Inquiry Wizard with conditional branching (wedding / birthday / corporate / shower etc.), file uploads, draft auto-save
- Consultation Booking with availability + blackout dates + time-slot generation
- Light + dark modes, fully responsive, elegant luxury design

### Admin
- Secure JWT login
- Dashboard with key stats
- Manage Services, Gallery, Testimonials, FAQs, Blog posts, Site content (hero, about, promo, contact, footer)
- Manage Inquiries (status pipeline + notes + internal), Clients (CRM lite), Consultations + Availability
- Newsletter subscribers list

### Emails
- SMTP configurable via `.env`
- Sends confirmation emails to clients + notification to business email
- Falls back gracefully when SMTP is not configured

---

## Local development (macOS / Linux)

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # if you have one, otherwise create one
# Ensure MongoDB is running locally (or via Docker: `docker run -d -p 27017:27017 mongo:7`)
uvicorn server:app --reload --port 8001
```

### Frontend
```bash
cd frontend
yarn install
# .env should have REACT_APP_BACKEND_URL pointing to your backend (http://localhost:8001)
yarn start
```

---

## Deploy to Hostinger AlmaLinux 10 VPS

### 1) First-time server setup (once)
```bash
ssh root@your-vps-ip
yum install -y git
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git /opt/swell
cd /opt/swell
chmod +x deploy.sh deploy/*.sh
sudo ./deploy/install-almalinux.sh   # Installs Docker + configures firewall
```

### 2) Configure environment
```bash
cp .env.example .env
nano .env   # Fill in JWT_SECRET (use `openssl rand -hex 48`), admin password, SMTP if you have it
```

### 3) Point DNS
In your Hostinger DNS panel, add A records for `swelldesignla.com` and `www.swelldesignla.com` pointing to your VPS IP.

### 4) First deploy
```bash
./deploy.sh
```
This will build the images, start the stack, and expose the site on **port 80**. Visit `http://swelldesignla.com` to verify.

### 5) Issue HTTPS certificates (once DNS is live)
```bash
./deploy/issue-ssl.sh
```
This requests a Let's Encrypt certificate via HTTP-01 challenge, swaps the nginx config to HTTPS, and reloads.

### 6) Ongoing deploys (updates from GitHub)
```bash
cd /opt/swell
./deploy.sh   # pulls, builds, restarts
```

**That's it.** The certbot container automatically renews the certificate every 12 hours if needed.

---

## Admin access
- URL: `https://swelldesignla.com/admin/login`
- Email: value of `ADMIN_EMAIL` in `.env` (default `admin@swelldesignla.com`)
- Password: value of `ADMIN_PASSWORD` in `.env`

> The admin password is refreshed on every backend startup from `ADMIN_PASSWORD`. To change it, edit `.env` and re-run `./deploy.sh`.

---

## Backup & restore

### Backup MongoDB + uploaded files
```bash
./deploy/backup.sh /path/to/backups
```
This creates two files:
- `mongo_YYYYMMDD_HHMMSS.gz` — MongoDB archive
- `uploads_YYYYMMDD_HHMMSS.tar.gz` — all uploaded images

Copy them off the server (rsync/scp) for safe-keeping.

### Restore
```bash
./deploy/restore.sh /path/to/mongo_YYYYMMDD_HHMMSS.gz
```

Schedule a nightly backup with cron:
```bash
0 3 * * * cd /opt/swell && ./deploy/backup.sh /var/backups/swell >> /var/log/swell-backup.log 2>&1
```

---

## Common commands

```bash
# Check logs
docker compose logs -f backend
docker compose logs -f frontend

# Restart just the backend after env changes
docker compose restart backend

# Shell into MongoDB
docker compose exec mongo mongosh swell_design_media

# Rebuild and restart everything after a code change
./deploy.sh
```

---

## Security notes
- **Change** `JWT_SECRET` and `ADMIN_PASSWORD` before your first deploy.
- Keep your `.env` file out of git (it is already in `.gitignore`).
- Enable a firewall (already handled by `install-almalinux.sh` — opens 80/443/22 only).
- Consider setting up fail2ban for SSH.
- Rotate backups off-server regularly (e.g., to a private S3 bucket or your local machine).

---

## Customizing content
- Log into `/admin/login`
- Almost everything is editable there — hero, promo banner, about, contact info, services, gallery, testimonials, FAQs, blog, and more.
- Upload your own logo, hero image, and gallery photos from within the admin panel.

---

## Support
For updates and issues, coordinate with your developer. Full source lives in this repository.

---

## Integrations (Google Calendar + Instagram)

Both integrations are **plug-and-play from the admin panel** — no code changes required.

### Google Calendar
- Log into `/admin/integrations`
- Follow the inline step-by-step guide (creates a Google Cloud OAuth app, ~5 min)
- Paste Client ID + Client Secret
- Click **Connect Google Calendar** and authorize
- Done — new consultations auto-sync to her calendar; existing calendar events block conflicting time slots on the booking form

### Instagram Feed
- Log into `/admin/integrations`
- Follow the inline step-by-step guide (creates a Meta developer app + long-lived access token, ~10 min)
- Paste access token → click **Look up ID** to auto-detect her IG Business Account
- Click **Save & fetch posts** — latest 12 Instagram posts appear on the homepage
- Long-lived tokens last ~60 days; renew via the same flow when Instagram section shows an error

**Required env vars for these (already in `.env.example`):**
- `FERNET_KEY` — encrypts OAuth tokens at rest in MongoDB
- `PUBLIC_BACKEND_URL` — used to build the OAuth redirect_uri (e.g. `https://swelldesignla.com`)
- `PUBLIC_FRONTEND_URL` — where the user is redirected after Google authorizes (e.g. `https://swelldesignla.com`)

---

## GitHub push workflow (Emergent → GitHub → Hostinger)

### One-time setup

**In Emergent (this project):**
1. Click **Save to GitHub** in the chat interface
2. Authorize GitHub if prompted
3. Choose **Create new repo** (e.g. `swell-design-media`) or select an existing one
4. Push to `main`
5. Note your repo URL: `https://github.com/YOUR_USERNAME/swell-design-media`

**On your Hostinger VPS (AlmaLinux 10):**
```bash
ssh root@your-vps-ip
cd /var/www
git clone https://github.com/YOUR_USERNAME/swell-design-media.git swell
cd swell
chmod +x deploy.sh deploy/*.sh

# Bootstrap the server (installs Docker + firewall)
sudo ./deploy/install-almalinux.sh

# Configure environment
cp .env.example .env
nano .env
#   → JWT_SECRET: run `openssl rand -hex 48` and paste
#   → FERNET_KEY: run `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` and paste
#   → ADMIN_PASSWORD: change to something strong
#   → PUBLIC_BACKEND_URL + PUBLIC_FRONTEND_URL: both set to https://swelldesignla.com
#   → CORS_ORIGINS: https://swelldesignla.com,https://www.swelldesignla.com

# Deploy
./deploy.sh

# After DNS is live, issue SSL certificate
./deploy/issue-ssl.sh
```

Site is now live at `https://swelldesignla.com`.

### Ongoing updates
Every time you change code in Emergent and push to GitHub:
```bash
ssh root@your-vps-ip
cd /var/www/swell
git pull && ./deploy.sh
```
That's it — 2 commands. New code is built and deployed with zero downtime.
