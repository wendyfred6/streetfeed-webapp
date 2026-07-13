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

**Active milestone: M1 — Auth, Onboarding & Approval.**

M0 — Foundation & Safety is complete (all 9 issues Done, retro filed as FRE-343). Notably: the R2-vs-local-disk and docker-compose-consolidation decisions are both resolved (see `docs/DECISIONS.md`), async error handling is fixed, rate limiting is added, ESLint+Vitest+CI gate exist in both packages, and Cloudflare Tunnel is confirmed reachable. Two follow-ups spun out to M6 (FRE-341 photo retention, FRE-342 dependency bumps) and one to M1 (FRE-301 gained an enumeration-closure acceptance criterion — see below).

## What to do this session

1. Fetch M1's open issues from Linear (project "Streetfeed v1.0", milestone "M1 — Auth, Onboarding & Approval"). Work them one at a time. Note: FRE-301 ("Reconcile AuthPage.jsx vs OnboardingPage.jsx") has an added acceptance criterion from FRE-295's work — read its Linear comments before starting it.
2. Update each issue's status in Linear as you go (don't batch status updates to the end).
3. When every M1 issue is closed: file one `Retro: M1 — Auth, Onboarding & Approval` issue in that milestone using this template:
   ```
   - What went well
   - What took longer than expected / was harder than it looked
   - Scope added or cut during the milestone (and why)
   - Follow-up issues filed as a result (links)
   - Issues closed / commits or PRs merged (links)
   ```
4. Edit this file: change "Active milestone" to **M2 — Feed & Comments**, and move this line's target in step 1 forward accordingly. Then stop and tell the user to `/clear`.

## Workflow notes learned during M0 (worth keeping)

- Work one issue at a time: In Progress → implement → verify (don't just trust local checks, confirm against the real CI run when a change touches CI/deploy) → commit → push → wait for CI green → post an end-report comment to the Linear issue → Done → next issue.
- If an issue turns out not to need a decision after investigation, don't force one — just resolve it and explain why in the end-report.
- If part of an issue's scope collides with what another issue already owns (e.g. a UX change that belongs to a different issue's flow rework), split it explicitly: comment on the other issue with the added scope, note the split in the current issue's end-report, and narrow the current issue accordingly. Don't silently drop it and don't silently duplicate it.
- Real bugs found incidentally while working an issue (not in its original description) are worth fixing in the same commit if small and directly related, with a follow-up issue filed for anything that's bigger or belongs to a later milestone.
- The MCP connection to Linear occasionally times out on `save_issue`/`save_comment` calls for no apparent reason (server-side, not a real failure) — the action usually still succeeds. Check via `list_issues`/`get_issue` before retrying, to avoid duplicates.
- This machine's global npm cache has pre-existing corruption (root-owned files from an old npm bug) and its default global npm (11.8.0) has a lockfile bug with platform-specific optional dependencies. Workaround already applied in CI (pins npm 11.18.0). If `npm install` fails locally with cache errors, use `npm install --cache /tmp/some-fresh-dir` rather than `sudo npm cache clean`.

## Background

- Memory files worth checking for broader context: `project-streetfeed.md` (product/architecture), `project-deploy-pipeline.md` (git push → GitHub Actions → ghcr.io → Portainer Pull and Redeploy), `feedback-challenge-proposals.md` (Wendy wants real pushback on structural proposals, not agreement-then-comply).
- This file and the milestone structure were set up 2026-07-13 after an audit of the whole codebase (backend, frontend, infra) plus a full pre-existing Linear backlog audit (37 issues classified: 4 migrated, 1 merged, 18 moved to Post-Pilot Backlog, 12 already canceled from a prior cleanup, 2 done).
- Don't assume this file's "Active milestone" is still accurate if it looks stale — cross-check against Linear directly, since Linear is the actual source of truth and this file is just a pointer to it.
