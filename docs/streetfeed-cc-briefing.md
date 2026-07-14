# Streetfeed — Claude Code Briefing

> **Note (2026-07-14, FRE-334):** this is the original project briefing,
> kept for product/history context. It is no longer current in two ways:
> the "UI Reference" / "preserve the design language" section below
> describes the initial JSX prototype (dark theme, accent `#E8FF47`),
> which was superseded by the Figma-driven design system early in the
> project — the actual source of truth is now
> `frontend/src/design/tokens.js` (light theme, accent `#FF0066`). The
> prototype file itself (`streetfeed.jsx`) was dead code (never imported)
> and has been deleted. See `resume_prompt.md` at the repo root for the
> current milestone-based plan this briefing predates.

## What is Streetfeed?
Streetfeed is a hyper-local street communication platform. Think Nextdoor, but for a single street — structured, private, and actually useful. No more WhatsApp chaos where important messages drown in noise.

The first community will be the Reyer Anslostraat in Amsterdam (~111 households). The platform is built to scale to multiple streets over time.

The domain **streetfeed.nl** has been registered.

---

## The Problem It Solves
Currently managed via a WhatsApp group, which has two core problems:
1. Important messages (blocked street, misdelivered packages, incidents) drown in general chat
2. Joining requires sharing phone numbers — a privacy issue

Streetfeed replaces this with structured, categorized posts, time-based pinned alerts, and an approval-based onboarding flow.

---

## Core Features

### Post Categories
- 📦 **Package** — misdelivered parcel, notify the right resident
- 🚧 **Blockage** — road works, street closure (pinnable with end date)
- 🏗️ **Container** — skip/container placed (pinnable with end date)
- 🗑️ **Bulk waste** — illegal dumping near bins
- 🎉 **Event** — street party with RSVP, bring-list, guest list
- 🚨 **Incident** — hit and run, vandalism etc.
- 💬 **General** — anything else

### Feed
- Pinned posts shown at top, auto-expire after their end date
- Filter by category
- Like + comment on posts
- Report button for residents, delete button for admins/moderators

### Events & RSVP
- Event posts have date, time, location, bring-list
- Inline RSVP: Yes / Maybe / No
- RSVP counter visible on the card without opening
- Full guest list in detail view

---

## Role System
| Role | Permissions |
|---|---|
| 👑 Super Admin | Everything. Create streets, assign admins, global override |
| 🔑 Street Admin | Manage own street, pin/delete posts, approve residents |
| 🛡️ Moderator | Delete posts, handle reports. Cannot manage residents |
| 👤 Resident | Post, react, set notification preferences |
| 👀 Pending | Registered but not yet approved |

**Current Super Admin:** Wendy (Reyer Anslostraat) — also Street Admin of Reyer Anslostraat, but only Super Admin of other streets.

### New Street Flow
1. Someone requests a new street
2. Super Admin approves
3. Requester automatically becomes Street Admin of that street

### New Resident Flow
1. Resident signs up with name + house number
2. Street Admin gets notification
3. Admin approves or rejects
4. Only then: access to the feed

---

## Tech Stack Requirements

### Authentication
- **Magic link only** — no passwords
- User enters email → receives email with one-click login link
- Token expires after 15 minutes
- Session stays active on device after login
- Use **Resend** or Nodemailer for email delivery

### Photo Storage
- **Cloudflare R2** for all photo uploads (not stored on NAS)
- Automatic lifecycle deletion rules per category:
  - 📦 Package: 7 days
  - 🚨 Incident: 30 days
  - 🗑️ Bulk waste: 14 days
  - 🚧 Blockage/Container: end date + 3 days
  - 🎉 Event: 30 days
- App uploads directly to R2 via presigned URLs

### Push Notifications
- PWA push notifications via service worker
- Per-category toggles in Settings
- iOS requires app added to homescreen (iOS 16.4+) — onboarding must explain this clearly

### Database
- **PostgreSQL** (preferred) or SQLite for simplicity
- Hosted in a separate Docker container on NASi

### Hosting
- **Docker on Synology NAS** (DSM 7), device name: NASi
- Provide a `docker-compose.yml` with:
  - The app container
  - PostgreSQL container
  - Reverse proxy config (Nginx or Traefik)
- App should start with a single `docker-compose up` command
- Include `.env` file template for secrets (magic link token, R2 credentials, DB URL)
- Include instructions for deployment via Synology Container Manager
- App must restart automatically after NAS reboot

### Language
- Dutch default, English toggle
- All UI strings must be structured for easy translation (i18n-ready)
- Language toggle in Settings

---

## Multi-Street Architecture
- Each street = its own closed community with its own feed
- Streets list / overview screen
- One Super Admin across all streets
- Each street has its own Street Admin (different person per street)
- Streets are created by Super Admin approval only

---

## Privacy & Legal
- No phone numbers stored anywhere
- Photos auto-deleted per schedule (see above)
- Only Street Admin can see the full member list
- GDPR compliant: explicit consent at signup
- Terms of Service must include: users are responsible for what they voluntarily post
- Privacy & Data section in Settings (plain language, not legal jargon)

---

## UI Reference
A fully working React prototype (JSX) is attached. Use it as the UI foundation — all screens, flows, and interactions are already designed and tested:
- Feed with pinned items, category filters, like/comment/report
- Event card with inline RSVP
- New post sheet with category-specific fields
- Admin view: approval queue, member list with role management, street management
- Settings: notification toggles per category, language toggle, privacy & data info
- Streets overview

**Please preserve the design language** — dark theme, accent color `#E8FF47`, DM Sans font.
*(Superseded — see the note at the top of this file. Current design system: `frontend/src/design/tokens.js`, light theme, accent `#FF0066`.)*

---

## What to Build (M3 — MVP)
1. Backend API (Node.js / Express or similar)
2. Database schema (users, streets, posts, memberships, roles, RSVPs, reports)
3. Magic link auth flow
4. Push notification service worker
5. Cloudflare R2 integration with lifecycle rules
6. Docker setup for NASi
7. Connect the existing React frontend to the real backend

---

## Out of Scope for MVP
- Native iOS / Android apps (PWA first)
- Payments
- Public profiles
- Street-to-street communication

---

## Git & Deployment

- Set up a Git repository for Streetfeed
- Configure auto-deploy to NASi via Docker on push to `main`
- Use the attached JSX prototype as the starting point for the frontend
- Include a `README.md` with setup instructions for NASi deployment

## Domain

**streetfeed.nl** — registered at TransIP. Configure the reverse proxy so the app is reachable via streetfeed.nl once DNS is pointed at NASi.
