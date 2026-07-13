# Decisions log

Short entries for decisions worth not re-litigating. Newest first.

---

## 2026-07-13 — Photo storage: local disk, not Cloudflare R2

**Decision:** Keep local disk storage (`backend/src/services/storage.js`) as the photo storage backend for the v1.0 pilot. Removed the unused `services/r2.js` and its `@aws-sdk/*` dependencies.

**Why:** Docs and env vars (`.env.example`, `docker-compose.nas.yml`) assumed R2, but the actual upload path already used local disk — `services/r2.js` was dead code, never imported. Local disk is fully implemented (resize/compress via `sharp`, HEIC→JPEG conversion, working upload endpoint) and sufficient at pilot scale (single NAS, ~111 households). Switching to R2 would have meant restructuring the upload flow to presigned direct-to-R2 uploads (not a config swap), reworking the frontend `AttachmentUpload` component, and setting up a Cloudflare bucket/API token — real work with no benefit until Streetfeed needs to scale beyond one backend instance.

**Found in the process:** `docker-compose.nas.yml` (the config actually running in production) had no `photos:` volume mounted at all — meaning uploaded photos were being lost on every "Pull and Redeploy" in Portainer, regardless of this decision. Fixed as part of the same change (Linear FRE-292).

**Still open:** Photo retention/auto-deletion per category (packages: 7d, incidents: 30d, etc., per the product briefing) is not implemented for local disk either — R2's dead code had a `RETENTION` schedule that was never wired to anything. Not required for pilot launch; needs a follow-up issue before real user photos accumulate indefinitely.

**Revisit when:** Streetfeed needs multiple backend instances or storage decoupled from the NAS.

[[project-streetfeed-v1-plan]]
