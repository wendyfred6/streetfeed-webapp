# Streetfeed

Hyper-local street communication platform for the Reyer Anslostraat, Amsterdam.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, served via Nginx |
| Backend | Node.js 20 + Express |
| Database | PostgreSQL 16 |
| Auth | Magic links via Resend (or SMTP) |
| Photos | Local disk, mounted as a Docker volume |
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

Super-admin is not granted automatically — it's a one-off ops action, not baked
into the schema migration. After Wendy has logged in via magic link at least
once (so her `users` row exists):

```bash
# Local / without Docker:
cd backend && node scripts/grant-super-admin.js wendy@fred6.nl

# Against a running container:
docker-compose exec backend node scripts/grant-super-admin.js wendy@fred6.nl
```

`is_super_admin` bypasses per-street membership checks entirely (see
`middleware/auth.js`), so no separate membership row/role needs to be granted.

### Generate VAPID keys for push notifications

```bash
npx web-push generate-vapid-keys
# Copy the output to .env
```

---

## Production deployment on NASi (Synology DSM 7)

Production runs on the NAS through **Portainer**, not a manual `docker-compose up`.
The stack definition is `docker-compose.nas.yml` (repo root) — read its header
comment first, it's the authoritative source for how prod is actually configured.

### 1. Build & publish images

Handled automatically: every push to `main` triggers `.github/workflows/docker.yml`,
which builds and pushes `ghcr.io/wendyfred6/streetfeed-frontend` and
`streetfeed-backend`. No manual build step on the NAS.

### 2. Deploy / redeploy

1. In Portainer: **Stacks** → paste the contents of `docker-compose.nas.yml`
2. Fill in the required environment variables (see `.env.example` — at minimum
   `POSTGRES_PASSWORD`, `RESEND_API_KEY`, `VAPID_*`, `CLOUDFLARE_TUNNEL_TOKEN`)
3. Deploy the stack
4. After every subsequent push to `main` (once CI is green, ~45s): Portainer →
   Stack → **Pull and Redeploy**

### 3. TLS / DNS

TLS is terminated by **Cloudflare Tunnel** (the `cloudflared` service in
`docker-compose.nas.yml`), not by a Synology DSM reverse proxy or local
certificates. DNS for `streetfeed.nl` points at Cloudflare's nameservers;
Cloudflare Universal SSL handles the certificate.

### 4. Auto-restart after reboot

The `restart: unless-stopped` policy on every service in `docker-compose.nas.yml`
restarts containers automatically after a NAS reboot.

### 5. Photo storage

Photos are stored on local disk inside the backend container, at `/data/photos`
(configurable via `UPLOAD_DIR`), mounted as the `photos:` Docker volume in
`docker-compose.nas.yml` — this volume is required, without it uploaded photos
are lost on every redeploy.

Retention/auto-deletion per category (packages: 7d, incidents: 30d, etc., per
the briefing) is not yet implemented — tracked as a follow-up, not required
for the pilot.

Cloudflare R2 was the original plan (see `docs/DECISIONS.md`) but was dropped
for the pilot in favor of local disk: simpler, already fully implemented
(resize/compress + HEIC conversion), and no external account/API keys needed
at single-NAS scale. Revisit if Streetfeed needs to scale beyond one NAS
instance.

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
