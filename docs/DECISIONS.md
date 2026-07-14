# Decisions log

Short entries for decisions worth not re-litigating. Newest first.

---

## 2026-07-14 — Backend Dockerfile runs as non-root via a chown-then-drop entrypoint, not a plain USER directive

**Decision:** `backend/Dockerfile` now installs `su-exec`, copies a new `backend/docker-entrypoint.sh`, and sets it as `ENTRYPOINT`. The container still starts as root, but the entrypoint's first and only job is `chown -R node:node "$UPLOAD_DIR"` before it `exec`s `su-exec node "$@"` to drop to the image's built-in non-root `node` user for the actual `node src/index.js` process. `.dockerignore` added to both `backend/` and `frontend/` (the two actual Docker build contexts — a repo-root one would never be read by anything). Both Dockerfiles now `COPY package.json package-lock.json` + `npm ci` instead of `COPY package.json` + `npm install`.

**Why not a plain `USER node` line:** the production `photos` named volume (`docker-compose.nas.yml`, `UPLOAD_DIR=/data/photos`) was created under the old root-running container, so its on-disk ownership is root's. A bare `USER node` would make the very next `Pull and Redeploy` in Portainer fail every photo upload/read/delete with EACCES, silently, until someone thought to check volume permissions — exactly the kind of "looks fine until a real deploy" gap this whole milestone (M6 — Pilot Readiness) exists to close. Chowning at container start, every start, before dropping privileges, fixes both a fresh volume and this repo's actual already-existing one, with no manual one-time step required in Portainer.

**Frontend left as-is on the USER question:** the final `nginx:alpine` stage already drops its worker processes to the non-root `nginx` user by default via the base image's own `nginx.conf` (`user nginx;`) — only the master process stays root, which it needs to bind port 80. No Dockerfile change was needed there; only `npm ci` in the discarded `builder` stage.

**Revisit when:** photo storage moves off a local Docker volume (see the local-disk-vs-R2 decision below) — at that point the chown-on-start step becomes dead weight and can be dropped along with the volume-ownership concern it exists for.

---

## 2026-07-14 — node-pg-migrate replaces re-running schema.sql on every boot

**Decision:** `backend/src/db/schema.sql` is deleted. `backend/migrations/` now holds tracked, timestamped migration files, applied via `node-pg-migrate`'s programmatic `runner()` from `runMigrations()` (`backend/src/db/index.js`), same call site and call pattern as before (still invoked once at boot, before the HTTP server starts listening). Applied migrations are recorded in a `pgmigrations` table, so each migration only ever runs once per database.

The entire previous `schema.sql` (188 lines, all idempotent `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` / `ON CONFLICT DO NOTHING` statements, accumulated migration-comment-by-migration-comment over M0–M3) became one baseline migration (`1720900000000_baseline.js`), byte-for-byte the same SQL, unedited. Every future schema change is a new migration file — the baseline is never touched again.

**Why:** `runMigrations()` used to just re-run all of `schema.sql` on every container start — no version tracking, no rollback, and nothing preventing a future non-idempotent statement from silently re-corrupting data on redeploy (the original problem statement, FRE-330). Squashing the existing idempotent history into one baseline migration, rather than splitting it into one migration per historical `-- Migratie:` comment, means adopting the tool requires no manual reconciliation step against the already-migrated production database: the baseline is a no-op there (every statement in it already matches production's actual state) and a real bootstrap on a fresh database (CI, local dev). Confirmed locally against a fresh Postgres — first boot applies the baseline and logs `MIGRATION 1720900000000_baseline (UP)`; second boot logs `No migrations to run!` instead of re-executing DDL.

**Also changed:** `backend/Dockerfile` now `COPY`s `migrations/` alongside `src/` (needed at runtime, not just build time). `.claude/skills/verify/SKILL.md`'s local-Postgres recipe dropped its manual `psql -f schema.sql` step — the backend now applies its own schema on boot, same as it will in any real environment.

**Revisit when:** a schema change needs an actual rollback (`down()` migrations are stubbed as errors on the baseline and unused so far — this project has never needed one) or multiple developers start writing migrations concurrently on divergent branches (`checkOrder` is left at its default `true`, which will start rejecting out-of-order timestamps at that point — that's the intended behavior, not a bug to work around).

---

## 2026-07-13 — Milestone branches: main only moves at milestone boundaries

**Decision:** Starting with M4, each milestone is developed on its own branch (`feature/m<N>-<short-name>`, e.g. `feature/m4-notifications`) instead of directly on `main`. Individual issues are committed and pushed to that branch, verified against CI on the branch, exactly as before. `main` only receives a milestone at the end, via the gate below.

**Milestone-complete gate** (in order): CI green on the branch → Product Owner smoke test (Wendy, manually) → fix anything found and repeat → merge to `main` (regular merge commit, not squash, so per-issue history survives) → CI green on `main` → deploy via Portainer (Pull and Redeploy) → short production smoke test → `/clear`.

**Hotfix exception:** if a production issue surfaces while a milestone branch is still open, it does not wait for that branch. Branch the hotfix directly off `main`, merge it to `main` on its own fast lane, deploy it immediately, then merge/rebase `main` back into the open milestone branch so the fix carries forward instead of being silently overwritten when that branch eventually merges.

**Why:** `.github/workflows/docker.yml` rebuilds and pushes the `:latest` backend/frontend images on every push to `main`, and `docker-compose.nas.yml` pins `:latest` in production. With all work landing directly on `main`, `:latest` moved on every single issue's commit — not just at milestone boundaries — so the only thing standing between a half-finished milestone and production was remembering not to click "Pull and Redeploy" in Portainer too early. That's exactly the kind of gap that bites eventually; M0–M3 didn't hit it, but there was no technical reason M4+ wouldn't. Milestone branches make "mergeable" and "deployable" the same thing again: `main` is always a complete, PO-smoke-tested milestone, and `:latest` only ever moves when that's true.

**Also changed:** `.github/workflows/docker.yml` now triggers on `feature/**` pushes too (`test-backend`/`test-frontend` run there, giving branch work the same CI-green discipline as `main` always had), but `build-backend`/`build-frontend` (the jobs that push `:latest`) are gated with `if: github.ref == 'refs/heads/main'` so only a merge to `main` can move `:latest`.

**Revisit when:** the project gains a second collaborator (branch isolation between people becomes a real additional benefit, not just the deploy-gating one this decision is actually about), or the milestone cadence changes enough that per-milestone branches stop mapping cleanly to a single deploy unit.

[[project-streetfeed-v1-plan]] [[feedback-challenge-proposals]]

---

## 2026-07-13 — docker-compose.yml and docker-compose.nas.yml are not duplicates

**Decision:** Keep both files, with clarified roles instead of picking one and deleting the other:
- `docker-compose.yml` (+ `docker-compose.dev.yml` override) = **local development only**, never deployed
- `docker-compose.nas.yml` = **the sole production config**, deployed via Portainer on the NAS

Added header comments to both files stating this explicitly.

**Why:** The original framing ("two divergent prod configs, pick one") didn't hold up under investigation — they're not actually competing for the same role. `docker-compose.nas.yml` is confirmed as what Portainer actually runs (per the deploy pipeline: git push → GitHub Actions → ghcr.io → Portainer Pull and Redeploy). `docker-compose.yml` is the base local-dev stack, only ever run with `-f docker-compose.dev.yml` layered on top. Deleting either would break one of the two legitimate use cases. Port/volume-name differences between them (8088 vs 8080, `pgdata2`/`photos` vs `pgdata`) are expected — different environments, not drift.

**Found in the process:** `docker-compose.dev.yml` had a real bug — it hardcoded the backend's `DATABASE_URL` to password `devpassword`, but the `db` service's actual `POSTGRES_PASSWORD` came from whatever was in the developer's `.env` (via root `docker-compose.yml`). Unless those happened to match, local dev couldn't connect to its own database out of the box. Fixed by making `docker-compose.dev.yml` set `POSTGRES_PASSWORD: devpassword` explicitly for `db` too, so local dev is self-contained and doesn't depend on `.env` at all.

**Also fixed:** README's "Production deployment on NASi" section documented a completely different, abandoned deployment method (SSH + manual `git pull` + bare `docker-compose up -d` + local SSL certs via DSM reverse proxy) that actively contradicted the real Portainer/Cloudflare Tunnel flow — dangerous if followed literally (risk of standing up a second, conflicting deployment). Rewritten to describe the real flow. The architecture diagram further down the README (which still shows a standalone nginx proxy container that doesn't run) was left as-is — that's in scope for FRE-332, not this issue.

**Revisit when:** never, unless the dev/prod split itself changes (e.g. moving off the NAS — see the storage decision above for the trigger condition that would also prompt revisiting this).

[[project-streetfeed-v1-plan]]

---

## 2026-07-13 — Photo storage: local disk, not Cloudflare R2

**Decision:** Keep local disk storage (`backend/src/services/storage.js`) as the photo storage backend for the v1.0 pilot. Removed the unused `services/r2.js` and its `@aws-sdk/*` dependencies.

**Why:** Docs and env vars (`.env.example`, `docker-compose.nas.yml`) assumed R2, but the actual upload path already used local disk — `services/r2.js` was dead code, never imported. Local disk is fully implemented (resize/compress via `sharp`, HEIC→JPEG conversion, working upload endpoint) and sufficient at pilot scale (single NAS, ~111 households). Switching to R2 would have meant restructuring the upload flow to presigned direct-to-R2 uploads (not a config swap), reworking the frontend `AttachmentUpload` component, and setting up a Cloudflare bucket/API token — real work with no benefit until Streetfeed needs to scale beyond one backend instance.

**Found in the process:** `docker-compose.nas.yml` (the config actually running in production) had no `photos:` volume mounted at all — meaning uploaded photos were being lost on every "Pull and Redeploy" in Portainer, regardless of this decision. Fixed as part of the same change (Linear FRE-292).

**Still open:** Photo retention/auto-deletion per category (packages: 7d, incidents: 30d, etc., per the product briefing) is not implemented for local disk either — R2's dead code had a `RETENTION` schedule that was never wired to anything. Not required for pilot launch; needs a follow-up issue before real user photos accumulate indefinitely.

**Revisit when:** Streetfeed needs multiple backend instances or storage decoupled from the NAS.

[[project-streetfeed-v1-plan]]
