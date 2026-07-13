# Streetfeed v1.0 — resume prompt

Read this cold, with no prior conversation context, and you should be able to pick up exactly where the last session left off.

## What this project is

Streetfeed is a hyper-local street PWA for Reyer Anslostraat, Amsterdam (~111 households). The current push is **not code cleanup for its own sake — it's shipping a releasable pilot as fast as possible.** Everything is tracked in Linear.

- **Linear project:** [Streetfeed v1.0](https://linear.app/fred6/project/streetfeed-v10-43a2eaf7863e) (team: Fred6)
- **Full plan/rationale:** see memory `project-streetfeed-v1-plan.md` (or ask — the reasoning for why milestones are scoped this way, not by technical layer, is worth reading before changing the structure)

## Milestones (in order)

| Milestone | Scope |
|---|---|
| M0 — Foundation & Safety | Blocking/live-risk items only: async error handling, storage & docker-compose decisions, secrets/CI hygiene, lint+test scaffolding |
| M1 — Auth, Onboarding & Approval | Registration, login, and the minimum admin-approval queue needed for registration to work end-to-end |
| M2 — Feed & Comments | Merged deliberately — comment thread renders inside PostCard, not a separate screen |
| M3 — New Post | Package/Container/Nuisance/Lost & Found categories; RDW references stripped not built |
| M4 — Notifications | Thin slice: reliable push delivery with visible failures, not settings polish |
| M5 — Profile & Settings | Profile basics, notification/language toggles, accessibility |
| M6 — Pilot Readiness | Cross-cutting polish that doesn't attach to one feature: docs, Dockerfile hardening, migration tooling, final accessibility/i18n sweep, legal/privacy, acceptance test |
| Post-Pilot Backlog | Filed, not scheduled: Events & RSVP, Streets view, Hall of Fame, full moderation/role management, RDW live lookup, other non-essential polish |

**Active milestone: M5 — Profile & Settings.**
**Active branch:** `feature/m5-profile-settings` (not created yet — that's this session's step 0).

## Development workflow: milestone branches

Adopted starting M4 — see `docs/DECISIONS.md` for the full rationale. Short version: every push to `main` rebuilds and publishes the `:latest` Docker images that `docker-compose.nas.yml` pins in production, so working directly on `main` meant `:latest` moved on every single issue's commit, not just at milestone boundaries — the only thing preventing a half-finished milestone from reaching production was remembering not to click "Pull and Redeploy" in Portainer too early.

- Each milestone starts from a fresh branch off `main`: `feature/m<N>-<short-name>` (e.g. `feature/m4-notifications`).
- Work issues one at a time on that branch exactly as before (In Progress → implement → verify → commit → push → CI green **on the branch** → end-report comment → Done → next issue). CI (`.github/workflows/docker.yml`) runs full lint/test on any `feature/**` branch push, same as on `main` — only `main` triggers the Docker build/publish jobs that push `:latest`.
- File the retro when all issues are closed, same as before.
- **Milestone-complete gate**, in order:
  1. CI green on the branch.
  2. Product Owner smoke test (Wendy, manually).
  3. Fix anything found, push to the branch, repeat 1–2 until clean.
  4. Merge the branch into `main` (a regular merge commit, not squash, so the per-issue commit history survives).
  5. CI green on `main`.
  6. Deploy via Portainer (Pull and Redeploy) — the actual moment `:latest` reaches production, even though it already moved in the registry as soon as `main`'s CI finished.
  7. Short production smoke test.
  8. `/clear`.
- **Hotfix exception:** if a production issue surfaces while a milestone branch is still open (as FRE-345/346 did right after the M1 redeploy), branch the hotfix directly off `main`, merge it to `main` on its own fast lane without waiting for the milestone branch, deploy it, then merge/rebase `main` back into the open milestone branch so the fix isn't lost when that branch eventually merges. Full detail in `docs/DECISIONS.md`.

M0 — Foundation & Safety is complete (all 9 issues Done, retro filed as FRE-343). Notably: the R2-vs-local-disk and docker-compose-consolidation decisions are both resolved (see `docs/DECISIONS.md`), async error handling is fixed, rate limiting is added, ESLint+Vitest+CI gate exist in both packages, and Cloudflare Tunnel is confirmed reachable. Two follow-ups spun out to M6 (FRE-341 photo retention, FRE-342 dependency bumps).

M1 — Auth, Onboarding & Approval is complete (all 9 issues Done, retro filed as FRE-344). Notably: AuthPage/OnboardingPage duplicate registration flows are reconciled and the FRE-295 user-enumeration oracle is closed (FRE-301); the admin approval queue is actually wired end-to-end for the first time — new registrations land pending instead of auto-approving, and a real bug in the pending-queue endpoint (returned membership id instead of user id, making approve/reject silently no-op) is fixed (FRE-304); the onboarding wizard is synced to Figma including removing its back button (FRE-303, FRE-302); onboarding/auth pages have real i18n coverage and a way to pick English before login (FRE-305); accessibility pass done on onboarding/auth forms (FRE-306); iOS home-screen tip added to the magic-link email (FRE-307); hardcoded super-admin grant moved out of schema.sql (FRE-308); and a real CI smoke test now covers the registration→approval→login critical path against a live Postgres (FRE-309, first CI infra change of the project — added a postgres service container to `test-backend`).

M2 — Feed & Comments is complete (all 6 issues Done, retro filed as FRE-349). Notably: `PostCard` (and its embedded comment thread) is extracted out of `App.jsx` into `components/PostCard.jsx`, with shared helpers split into `utils/{categories,time,eventDate}.js` and `components/AutoTextarea.jsx` to avoid a circular import — `App.jsx` drops from 2149 to ~1660 lines (FRE-310); the post-card expand/collapse gesture gets `role="button"`/keyboard support (FRE-314, bundled into FRE-310's commit); the four drifting category/type-label sources (`catLabel`/`LEGACY_LABELS`, `PICKER_DATA`, `TYPE_META`/`typeLabel`, PostCard's per-render inline maps) are consolidated into one `CATEGORY_TREE` in `utils/categories.js`, incidentally fixing a real bug where `lostandfound` sub-types had no label at all (FRE-311); comment thread strings are routed through `t()` (FRE-312); a shared `useToast`/`Toast` hook replaces three duplicated fixed-position toast divs and is applied to feed/comment error states, including PostCard's previously-silent comment load/submit failures (FRE-313, with FRE-348 filed to M6 for the remaining secondary-view swallowed catches); and an `App.smoke.test.jsx` covers the feed-load → expand → comment-post flow end to end (FRE-315).

M3 — New Post is complete (all 7 issues Done, retro filed as FRE-350). Notably: `CategoryPicker`/`NewPostSheet`/`EditPostSheet` are extracted out of `App.jsx` into `components/`, with their near-duplicate field sets unified into one `PostFormFields` component driven by category/subType/mode, backed by a single `postCategoryFlags()` helper and a shared `usePostFormState()` hook (FRE-316) — incidentally fixing a real bug where EditPostSheet never recognized the current CategoryPicker sub_type keys, only legacy aliases, so editing a Package post created through the current picker showed no house-number field at all; the `lostandfound` category gets real form fields for the first time, closing a genuine gap the milestone's own scope required (FRE-317), and incidentally fixing a house-row visibility bug that predated lostandfound existing as a category; RDW/license-plate references (a spec'd-and-abandoned feature, live lookup deferred to Post-Pilot Backlog FRE-233) are stripped from the schema (with a real migration for already-deployed DBs, not just the CREATE statement), docs, and dead demo/i18n code (FRE-318); the backend's `posts.js` fat router is split into `posts/{crud,interactions,comments}.js` plus two shared helpers replacing 3x-copy-pasted authorization checks and a duplicated like/join toggle pattern (FRE-319); all six post-mutating endpoints get real `zod` schema validation replacing ad hoc manual checks (FRE-320); `AttachmentUpload`'s raw `fetch` is routed through the centralized `api` client (which now supports FormData bodies), with upload failures surfaced to the user instead of only `console.error` — incidentally also fixing a stale demo-mode upload path that meant photo uploads never actually respected demo-mode isolation, and a photoKey-never-cleared-on-retry bug (FRE-321); and a real Definition-of-Done smoke test creates a post in each pilot category (Package/Container/Nuisance/Lost & Found) against a live Postgres, surfacing and fixing a genuine Vitest parallel-file-execution race between two full-app-boot smoke tests (FRE-322). One pre-existing pre-audit backlog issue (FRE-226, an old "Melding/Incident" ticket with a kenteken/RDW field) was canceled as superseded by FRE-317/FRE-318/FRE-341 rather than worked, since implementing it as written would have resurrected exactly what FRE-318 removes.

M4 — Notifications is complete (all 3 issues Done, retro filed as FRE-353) — the first milestone run on the new milestone-branch workflow (`feature/m4-notifications`), end to end. Notably: every fire-and-forget push/notification path that previously discarded errors with `.catch(() => {})` or an unchecked `Promise.allSettled` (`services/push.js`'s `sendPushToStreet`/`sendPushToUser`/`notifyUser`/`notifyStreet`/`notifyStreetAdmins`, plus call sites in `posts/crud.js`, `posts/comments.js`, and `auth.js`) now logs with context instead of swallowing silently, verified live against a real failing delivery rather than just by reading the diff (FRE-323); a smoke test reusing that same bogus-VAPID-key technique now covers the regression in CI (FRE-325); and the pre-built push infra (`usePush.jsx`, `sw.js`, backend push routes) was confirmed working end-to-end on Wendy's actual iPhone — add to home screen, enable notifications, receive a live push (FRE-324). FRE-324 surfaced a real production gap, not a code bug: `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` were never actually set in the Portainer stack, silently breaking push subscription with no error anywhere until a user hit the feature — the same failure class as FRE-345. Fixed by generating a fresh production VAPID keypair and setting it in Portainer; FRE-352 filed to M6 to make this class of failure (blank-but-not-erroring required env var) loud instead of silent going forward. Merged to `main` via a regular merge commit (`5721815`), CI green on `main`, redeployed via Portainer, and both the general (feed/login) and push-specific production smoke tests confirmed clean by Wendy.

**Post-M1 production incident (found by Wendy's own Product Owner smoke test on streetfeed.nl right after the M1 redeploy, both now resolved):**
- **FRE-345** — magic link requests 500'd in production. Root cause: the `RESEND_API_KEY` in the Portainer stack was invalid (a copy-paste error from setup). Pure config fix via Portainer, no code change — see the issue for the full Portainer navigation trail (it's non-obvious: the stack's "Environment variables" form doesn't show existing values when reopened, so it looked empty even though `POSTGRES_PASSWORD`/etc. had compose-file-level defaults keeping things running). Verified fixed live in production.
- **FRE-346** — the auth rate limiter was keying on `req.ip` with no `trust proxy` configured, so behind Cloudflare Tunnel + nginx every visitor shared one 5-requests/15-min bucket site-wide, not a per-user limit. Fixed by keying on `CF-Connecting-IP` instead (`backend/src/middleware/rateLimit.js`) — deployed, code merged as `54d1711`.
- **FRE-347** filed as a M6 backlog follow-up: `/auth/request` shouldn't 500 the whole request when email delivery fails — needs graceful degradation, not urgent.

## What to do this session

0. If not already on it, create/checkout the active milestone's branch (see "Active branch" above) off `main`. All work this session happens on that branch, not `main`.
1. Fetch M5's open issues from Linear (project "Streetfeed v1.0", milestone "M5 — Profile & Settings"). Work them one at a time.
2. Update each issue's status in Linear as you go (don't batch status updates to the end). Push to the milestone branch and confirm CI green there per issue — same discipline as before, just targeting the branch instead of `main`.
3. When every M5 issue is closed: file one `Retro: M5 — Profile & Settings` issue in that milestone using this template:
   ```
   - What went well
   - What took longer than expected / was harder than it looked
   - Scope added or cut during the milestone (and why)
   - Follow-up issues filed as a result (links)
   - Issues closed / commits or PRs merged (links)
   ```
4. Run the milestone-complete gate from "Development workflow: milestone branches" above: CI green on the branch → tell Wendy it's ready for her PO smoke test → fix anything she finds → merge to `main` → CI green on `main` → tell her to deploy via Portainer → short production smoke test.
5. Once Wendy confirms the production smoke test is clean: edit this file — change "Active milestone" to **M6 — Pilot Readiness**, update "Active branch" to `feature/m6-pilot-readiness` (not created yet — that's the next session's step 0), and move this line's target in step 1 forward accordingly. Then stop and tell the user to `/clear`.

## Workflow notes learned during M0 (worth keeping)

- Work one issue at a time: In Progress → implement → verify (don't just trust local checks, confirm against the real CI run when a change touches CI/deploy) → commit → push → wait for CI green → post an end-report comment to the Linear issue → Done → next issue.
- If an issue turns out not to need a decision after investigation, don't force one — just resolve it and explain why in the end-report.
- If part of an issue's scope collides with what another issue already owns (e.g. a UX change that belongs to a different issue's flow rework), split it explicitly: comment on the other issue with the added scope, note the split in the current issue's end-report, and narrow the current issue accordingly. Don't silently drop it and don't silently duplicate it.
- Real bugs found incidentally while working an issue (not in its original description) are worth fixing in the same commit if small and directly related, with a follow-up issue filed for anything that's bigger or belongs to a later milestone.
- The MCP connection to Linear occasionally times out on `save_issue`/`save_comment` calls for no apparent reason (server-side, not a real failure) — the action usually still succeeds. Check via `list_issues`/`get_issue` before retrying, to avoid duplicates.
- This machine's global npm cache has pre-existing corruption (root-owned files from an old npm bug) and its default global npm (11.8.0) has a lockfile bug with platform-specific optional dependencies. Workaround already applied in CI (pins npm 11.18.0). If `npm install` fails locally with cache errors, use `npm install --cache /tmp/some-fresh-dir` rather than `sudo npm cache clean`.

## Workflow notes learned during M1 (worth keeping)

- This machine has no Docker and no system Postgres — for anything backend/API-touching, don't trust code review alone. See `.claude/skills/verify/SKILL.md` for the throwaway local-Postgres + in-process-SMTP-stub recipe used throughout M1; it caught two real bugs (an auto-approve regression and a smoke-test idempotency gap) that reading the diff wouldn't have.
- Figma has more than one page relevant to this project — the "🌸 Streetfeed Pattern Library v0.1" page covers the Category Picker/New Post Sheet system; a separate "🌸 Streetfeed Onboarding v0.1" page (node `251:2740`) covers registration/login and is M1's actual source of truth. If a Figma-sync issue's frames aren't where you expect, ask before assuming they don't exist — see `project-figma-design-system.md`.
- When Figma and code genuinely conflict for a security- or architecture-relevant reason (not just taste), stop and ask rather than picking a side — Wendy explicitly wants this per her own instruction, and it surfaced a real case in FRE-301/FRE-302 (Figma's "unknown email" interstitial vs. the enumeration-oracle fix).
- CI's `test-backend` job now has a real `postgres` service container (added for FRE-309's smoke test). If M2 needs more integration-style tests, this is already available — no new CI plumbing needed, just point `DATABASE_URL` at `localhost:5432`.

## Workflow notes learned during M2 (worth keeping)

- No Docker/Postgres needed for frontend-only milestones — `npm run build`/`lint`/`test` plus ad-hoc React Testing Library renders (mocking `api`/`useAuth` with `vi.mock`) were enough to verify every M2 issue, including the accessibility fix (`fireEvent.keyDown(header, { key: 'Enter' })`).
- This sandbox has no browser-driving tool (no Playwright, no chromium-cli) and no project skill for launching the frontend — confirmed by checking `.claude/skills/*/SKILL.md` (only `verify`, which is backend/Postgres-focused) and searching for `chromium-cli`/`playwright` on the machine. Ad-hoc RTL renders substitute for a real visual check in this environment; if that changes, `/run-skill-generator` would be worth running to capture a real one.
- When extracting a component that depends on module-level helpers also used elsewhere (e.g. `PostCard` needing `catLabel`/`timeAgo`/`formatEventDate` that `App.jsx` also uses), move the helpers to a shared `utils/` module rather than importing them back from the extraction target — avoids a circular import between the two files.
- `useCallback`/`useEffect` dependency arrays are evaluated at the *call site's position in render order*, not "whatever's in scope by the end of the function." Defining a memoized helper (`showError`) after another `useCallback` that lists it as a dependency is a real temporal-dead-zone bug, not just a lint nit — order these definitions the same way the dependencies actually resolve.
- Jest-dom matchers (`toBeInTheDocument`, etc.) aren't globally wired into this project's Vitest config — each test file needs its own `import '@testing-library/jest-dom/vitest'`.
- jsdom doesn't implement `scrollTo` (element or window) — any component test that mounts something calling it (this app's `SegmentedControl`/App on mount) needs `window.scrollTo = vi.fn()` / `Element.prototype.scrollTo = vi.fn()` in the test, not an app-side fix.
- When a "consolidate N drifting sources" issue turns up entries that exist in one source but not another, don't assume it's automatically a bug to fix by adding the missing entry everywhere — check which source is the current design intent (here, the Figma-driven `PICKER_DATA` tree) before deciding whether a gap is "stale/legacy" (keep for backward-compat label lookup only) or "actually broken" (fix for real, as with the `lostandfound` case).

## Workflow notes learned during M3 (worth keeping)

- Before working an issue that touches a pre-existing (pre-audit) backlog item, actually read it and check it against the codebase — FRE-226 looked like real remaining scope on its face, but was a leftover from before the milestone's own scope decisions and directly contradicted a sibling issue (FRE-318) in the same milestone. Cross-checking against the actual current code (the Melding form already existed without the field FRE-226 asked for) confirmed it was fully superseded, not partially open.
- When unifying two components that duplicate a field set (like M2's category-label consolidation), watch for divergent tolerance/allowlists between the two copies, not just divergent rendering — the real bug here (FRE-316) was that EditPostSheet's sub_type alias list had silently drifted from NewPostSheet's, not that the field layout differed.
- Backend-only refactors (extracting a fat router, adding a new validation library) still need the local-Postgres verify loop, not just lint/build — a route split or a table-name-driven toggle helper looks obviously correct on the page but is exactly the kind of change where a live curl pass against every affected endpoint (including negative/403 cases) catches what reading the diff won't.
- Adding a second full-app-boot smoke test file (one that calls `runMigrations()` against a real Postgres) can race with an existing one under Vitest's default parallel-file execution — two concurrent `CREATE TABLE IF NOT EXISTS` runs aren't guaranteed atomic on Postgres's catalog. If a future milestone adds another full-boot smoke test, this is already handled by `backend/vitest.config.js`'s `fileParallelism: false` — no new plumbing needed, but worth remembering *why* that setting is there before "simplifying" it away.
- This sandbox's Bash tool hit a transient "model unavailable" classifier outage mid-session (intermittent, resolved on its own) — if a command mysteriously reports "cannot determine the safety of Bash", it's an environment issue, not a real permission denial; retrying (with small gaps) is the right move, not switching approach. One background command picked up a wildly inflated wall-clock duration as a side effect of the stall (the process was genuinely suspended, not actually slow) — worth a sanity re-run rather than trusting a suspicious-looking duration number at face value.

## Workflow notes learned during M4 (worth keeping)

- The milestone-branch workflow (branch → work issues → CI green on branch → merge → CI green on `main` → deploy) worked cleanly on its first real run — no friction, no need to revisit the mechanics documented in `docs/DECISIONS.md`.
- When a fire-and-forget path needs a "does this actually fail visibly" check, a syntactically valid but cryptographically bogus push-subscription key (any P-256-shaped base64url string that isn't on the curve) makes `web-push` throw synchronously during encryption, before any real network call. That's fast, deterministic, and doesn't depend on network egress from a CI runner — reuse this technique rather than mocking `web-push` itself if a future milestone needs to test another push failure path.
- A production "confirm X works end-to-end" issue involving a physical device (iOS push, in this case) can't be finished from this sandbox — no device, no browser-driving tool. The right move is a thorough code-level review first (so the manual test is only checking what genuinely can't be checked otherwise), then handing off precise numbered steps to Wendy, then diagnosing whatever she reports back using whatever's remotely checkable (here, `curl`ing the public `/api/push/vapid-key` endpoint immediately pinpointed a blank Portainer env var without needing device access at all).
- Confirmed for a second time (see FRE-345 in M1) that a Portainer stack's environment-variable form doesn't show existing values when reopened, and a blank or wrong required var doesn't stop the app from booting — it just silently degrades one feature until a user hits it. FRE-352 (filed to M6) proposes an actual fix; until then, when a feature that depends on a specific env var is being verified, checking the var's effect directly (e.g. curling the endpoint that echoes it) is faster than trusting the Portainer UI at face value.

## Background

- Memory files worth checking for broader context: `project-streetfeed.md` (product/architecture), `project-deploy-pipeline.md` (git push → GitHub Actions → ghcr.io → Portainer Pull and Redeploy), `feedback-challenge-proposals.md` (Wendy wants real pushback on structural proposals, not agreement-then-comply).
- This file and the milestone structure were set up 2026-07-13 after an audit of the whole codebase (backend, frontend, infra) plus a full pre-existing Linear backlog audit (37 issues classified: 4 migrated, 1 merged, 18 moved to Post-Pilot Backlog, 12 already canceled from a prior cleanup, 2 done).
- Don't assume this file's "Active milestone" is still accurate if it looks stale — cross-check against Linear directly, since Linear is the actual source of truth and this file is just a pointer to it.
