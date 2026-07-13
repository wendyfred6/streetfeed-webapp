# Decisions log

Short entries for decisions worth not re-litigating. Newest first.

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
