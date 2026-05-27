# Streetfeed

Hyper-local street communication platform for the Reyer Anslostraat, Amsterdam.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, served via Nginx |
| Backend | Node.js 20 + Express |
| Database | PostgreSQL 16 |
| Auth | Magic links via Resend (or SMTP) |
| Photos | Cloudflare R2 (presigned upload) |
| Push | Web Push API + service worker |
| Hosting | Docker on Synology NAS (DSM 7) |

---

## Local development

### Prerequisites
- Node.js 20+
- Docker + Docker Compose

### First run

```bash
# Clone the repo
git clone <repo-url>
cd streetfeed-webapp

# Copy and fill in secrets
cp .env.example .env
# Edit .env — at minimum set POSTGRES_PASSWORD

# Start everything
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Or run without Docker:
cd backend && npm install && npm run dev   # API on :3001
cd frontend && npm install && npm run dev  # App on :5173
```

### First-time super admin setup

After the database is running, create Wendy's account and set her as super admin:

```bash
# Access the DB container
docker-compose exec db psql -U streetfeed streetfeed

-- Insert Wendy as super admin (after she logs in via magic link):
UPDATE users SET is_super_admin = TRUE WHERE email = 'wendy@streetfeed.nl';

-- Also approve her Reyer Anslostraat membership:
UPDATE memberships SET status = 'approved', role = 'admin'
  WHERE user_id = (SELECT id FROM users WHERE email = 'wendy@streetfeed.nl');
```

### Generate VAPID keys for push notifications

```bash
npx web-push generate-vapid-keys
# Copy the output to .env
```

---

## Production deployment on NASi (Synology DSM 7)

### 1. Prerequisites on NASi

1. Install **Container Manager** from Synology Package Center
2. Install **Git Server** (or use SSH to pull from GitHub)
3. Enable SSH: Control Panel → Terminal → SSH

### 2. Clone the repo

```bash
ssh admin@NASi
cd /volume1/docker
git clone <repo-url> streetfeed
cd streetfeed
cp .env.example .env
nano .env   # fill in all secrets
```

### 3. SSL Certificates

Place your SSL certificates at:
```
nginx/certs/fullchain.pem
nginx/certs/privkey.pem
```

Option A — Let's Encrypt via Synology:
- Control Panel → Security → Certificate → Add → Let's Encrypt
- Export the certificate to `nginx/certs/`

Option B — Manual cert from your CA.

### 4. DNS configuration

At TransIP, point the `streetfeed.nl` A record to your NASi's public IP address.
Also add a CNAME for `www` pointing to `streetfeed.nl`.

If NASi is behind NAT, forward ports 80 and 443 in your router to NASi's local IP.

### 5. Start the application

```bash
cd /volume1/docker/streetfeed
docker-compose up -d
```

The app will be reachable at https://streetfeed.nl.

### 6. Auto-restart after reboot

The `restart: unless-stopped` policy in docker-compose.yml ensures all containers
restart automatically when NASi reboots.

### 7. Cloudflare R2 setup

1. Create a Cloudflare account and enable R2
2. Create a bucket named `streetfeed`
3. Create an API token with R2 read/write permissions
4. Enable "Public access" on the bucket and note the public URL
5. Fill in the R2 variables in `.env`

Lifecycle rules for auto-deletion are handled by the backend using the
retention schedule from the briefing (packages: 7d, incidents: 30d, etc.).

Note: Cloudflare R2 currently does not support native lifecycle rules via API.
To enforce deletion, set up a nightly cron that runs:
```bash
docker-compose exec backend node src/scripts/cleanup-r2.js
```
(See `backend/src/scripts/cleanup-r2.js` — TODO: implement if needed)

### 8. Auto-deploy on push to main

Add this script to your CI/CD (GitHub Actions example):

```yaml
# .github/workflows/deploy.yml
name: Deploy to NASi
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.NASI_HOST }}
          username: ${{ secrets.NASI_USER }}
          key: ${{ secrets.NASI_SSH_KEY }}
          script: |
            cd /volume1/docker/streetfeed
            git pull origin main
            docker-compose build --no-cache
            docker-compose up -d
```

---

## Architecture

```
                  ┌─────────────────────────────┐
                  │   streetfeed.nl (HTTPS)      │
                  └─────────────┬───────────────┘
                                │
                    ┌───────────▼───────────┐
                    │     nginx (proxy)     │  :443
                    └──────┬────────────────┘
                           │
          ┌────────────────▼──────────────────┐
          │          frontend (Nginx)          │  :80
          │    React SPA + service worker     │
          └────────────────┬──────────────────┘
                           │ /api/*
          ┌────────────────▼──────────────────┐
          │          backend (Node.js)         │  :3001
          │   Express API — auth, posts, push  │
          └────────────────┬──────────────────┘
                           │
          ┌────────────────▼──────────────────┐
          │         PostgreSQL 16              │  :5432
          │         (Docker volume)            │
          └───────────────────────────────────┘

External services:
  - Resend (or SMTP) — magic link email
  - Cloudflare R2    — photo storage
  - RDW open data    — license plate lookup
```

---

## Role system

| Role | Access |
|---|---|
| 👑 Super Admin | Full access to all streets, creates new streets |
| 🔑 Street Admin | Own street: pin/delete posts, approve members |
| 🛡️ Moderator | Delete posts, handle reports |
| 👤 Resident | Post, react, RSVP, notifications |
| ⏳ Pending | Registered, awaiting admin approval |

---

## iOS PWA push notifications

iOS 16.4+ supports web push **only when the app is added to the Home Screen**.
The Settings tab shows a banner explaining this. Steps:
1. Open streetfeed.nl in Safari
2. Tap the Share button → "Add to Home Screen"
3. Open the app from the Home Screen icon
4. Tap "Enable push notifications" in Settings

---

## License

Private — Wendy Fredzess / Streetfeed
