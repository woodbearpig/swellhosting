# Google Calendar OAuth Setup Guide (5 minutes, free)

**When to do this:** ONCE, before your client's first Google Calendar connection. After this, she just clicks "Sign in with Google" in the admin — no console visits, no forms.

**Cost:** $0. Google Calendar API is free and does not require billing.

---

## Step 1 — Create a Google Cloud project (60 seconds)

1. Go to **[Google Cloud Console](https://console.cloud.google.com/)**
2. Sign in with any Google account (yours or hers — either works)
3. In the top bar, click the project dropdown → **New Project**
4. Project name: `Swell design bookings` (or anything)
5. Click **Create**, wait ~10 seconds, then select the new project from the dropdown

---

## Step 2 — Enable the Google Calendar API (30 seconds)

1. In the search bar at top, type `Calendar API` → click **Google Calendar API**
2. Click **Enable**

---

## Step 3 — Configure OAuth consent screen (2 minutes)

1. Left sidebar: **APIs & Services → OAuth consent screen**
2. **User Type:** External → **Create**
3. **App information:**
   - App name: `Swell design + media`
   - User support email: (any email — hers or yours)
   - App logo: optional
4. **App domain (all optional but recommended):**
   - Application home page: `https://swelldesignla.com` (your prod domain)
   - Application privacy policy link: `https://swelldesignla.com/privacy`
   - Application terms of service link: `https://swelldesignla.com/terms`
5. **Authorized domains:** add `swelldesignla.com`
6. **Developer contact:** your email
7. Click **Save and continue**
8. **Scopes:** click **Add or remove scopes**, search for and tick:
   - `.../auth/calendar.events`
   - `.../auth/calendar.readonly`
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
9. Click **Update** → **Save and continue**
10. **Test users:** click **Add users** → add `swellballoons@gmail.com` (and any other Gmail accounts that need to connect)
11. Click **Save and continue** → **Back to dashboard**

> ⚠️ **Publishing status:** Leave as "Testing". This restricts to test users you list (up to 100), which is perfect for a single-designer site. You do NOT need Google verification.

---

## Step 4 — Create OAuth Client ID (60 seconds)

1. Left sidebar: **APIs & Services → Credentials**
2. **+ Create Credentials** → **OAuth client ID**
3. **Application type:** Web application
4. **Name:** `Swell backend`
5. **Authorized redirect URIs:** click **+ Add URI** and paste **BOTH** of these:
   - `https://swelldesignla.com/api/integrations/google/callback`
   - Also add your preview URL if you use one for testing: `https://balloon-decor-cms.preview.emergentagent.com/api/integrations/google/callback`
6. Click **Create**
7. A popup shows your **Client ID** and **Client Secret** — copy them both (or click Download JSON)

---

## Step 5 — Add credentials to your VPS (30 seconds)

SSH into your Hostinger VPS:

```bash
ssh root@your-vps-ip
cd /var/www/swell
nano backend/.env
```

Add or update these two lines with the values from step 4:

```
GOOGLE_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxx
PUBLIC_BACKEND_URL=https://swelldesignla.com
PUBLIC_FRONTEND_URL=https://swelldesignla.com
```

Save (Ctrl+O, Enter, Ctrl+X), then:

```bash
./deploy.sh
```

---

## Step 6 — Client's one-click experience (10 seconds)

1. She logs into `/admin/integrations`
2. Under "Google Calendar" she sees a big green box: **"OAuth is pre-configured — one-click connect available"**
3. She clicks **Sign in with Google**
4. Google redirects her to `accounts.google.com`, she picks `swellballoons@gmail.com`, clicks Allow
5. She's redirected back to `/admin/integrations` — status now shows **✅ Connected as swellballoons@gmail.com**

Done! From here on, any calendar events on `swellballoons@gmail.com` block booking slots, and every consult booked on the site auto-creates an event in her calendar.

---

## Troubleshooting

**"Access blocked: swell design has not completed the Google verification process"**
- She's not in the Test users list. Go back to Step 3.10 and add her Gmail.

**"redirect_uri_mismatch"**
- The exact URL you're hitting must match one in Step 4.5. Copy the URL from the error page and add it to Authorized redirect URIs.

**"invalid_client"**
- The `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` in `.env` doesn't match what's in Google Cloud. Re-copy them.

**Nothing happens on click**
- Check `docker compose logs backend | tail -50` for a `Google Client ID not configured` error, which means the .env values didn't load. Restart backend: `docker compose restart backend`.

---

## Alternative: give her the manual flow

If for any reason you can't run Step 5 on the VPS (e.g. no SSH access at the moment), you can also just paste the Client ID + Client Secret directly into `/admin/integrations` — the "Advanced setup" section accepts them. Less clean but works the same.
