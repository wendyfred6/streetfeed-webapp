---
name: verify
description: Run the Streetfeed backend + a real Postgres locally to verify backend/API changes end-to-end (no Docker required)
---

This machine has no Docker and no system Postgres installed by default.
docker-compose.dev.yml assumes Docker — don't rely on it for local verification.

## Setup (repeatable recipe)

```bash
brew install postgresql@16   # if not already installed
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"

# Unix socket path has a length limit — don't put PGDATA/socket dir under the
# long claude-501 scratchpad path, it'll fail with "socket path too long".
PGDATA=/tmp/sf-verify-pgdata
mkdir -p /tmp/sf-verify-sock
initdb -D "$PGDATA" -U streetfeed --auth=trust -E UTF8 --locale=en_US.UTF-8
pg_ctl -D "$PGDATA" -o "-p 5433 -k /tmp/sf-verify-sock" -l /tmp/sf-verify-pg.log start

createdb -h 127.0.0.1 -p 5433 -U streetfeed streetfeed
psql -h 127.0.0.1 -p 5433 -U streetfeed -d streetfeed -f backend/src/db/schema.sql
# schema.sql seeds one row in `streets` (id=1, Reyer Anslostraat) automatically.
```

Backend has no email service configured locally (no RESEND_API_KEY/SMTP_*) —
`sendMagicLink` throws unless something is configured. Point it at a throwaway
local SMTP stub instead of patching email.js:

```bash
# minimal SMTP stub good enough for nodemailer (net.createServer, EHLO/MAIL/RCPT/DATA/QUIT)
# see conversation history 2026-07-13 (FRE-301) for the ~30-line script if it's not around;
# recreate it in scratch — it's throwaway, not worth committing.
node /tmp/fake-smtp.js &   # listens on 127.0.0.1:1025
```

Start the backend:

```bash
cd backend
DATABASE_URL="postgresql://streetfeed@127.0.0.1:5433/streetfeed" \
APP_URL="http://localhost:5173" FRONTEND_URL="http://localhost:5173" \
SMTP_HOST=127.0.0.1 SMTP_PORT=1025 SMTP_USER=test SMTP_PASS=test \
NODE_ENV=development PORT=3099 \
node src/index.js
```

Then curl `http://localhost:3099/api/...` directly, and inspect state with
`psql -h 127.0.0.1 -p 5433 -U streetfeed -d streetfeed -c "..."`.

Watch out for `authRequestLimiter` (rate limiting on `/api/auth/request`) —
rapid-fire probing trips it (429) after a handful of requests within the window.

## Teardown

```bash
pkill -f "node src/index.js"
pkill -f "fake-smtp.js"
pg_ctl -D /tmp/sf-verify-pgdata stop -m fast
rm -rf /tmp/sf-verify-pgdata /tmp/sf-verify-sock
```

## Frontend

No Playwright installed in this repo and no time budget to install it fresh
each session — for frontend-only changes, `npm run build` (vite build) catches
syntax/import errors, and `npm run lint`/`npm run test` cover the rest. For a
true browser-driven check, install Playwright first (`npm i -D playwright && npx playwright install chromium`) — that's a real setup cost, so only do it
when the change is UI-interaction-heavy enough to justify it.
