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

**Active milestone: M0 — Foundation & Safety.**

## What to do this session

1. Fetch M0's open issues from Linear (project "Streetfeed v1.0", milestone "M0 — Foundation & Safety"). Work them one at a time — this includes two `[Decision]`-prefixed issues (R2-vs-local-disk storage, docker-compose consolidation) that block other M0 work and should be resolved first.
2. Update each issue's status in Linear as you go (don't batch status updates to the end).
3. When every M0 issue is closed: file one `Retro: M0 — Foundation & Safety` issue in that milestone using this template:
   ```
   - What went well
   - What took longer than expected / was harder than it looked
   - Scope added or cut during the milestone (and why)
   - Follow-up issues filed as a result (links)
   - Issues closed / commits or PRs merged (links)
   ```
4. Edit this file: change "Active milestone" to **M1 — Auth, Onboarding & Approval**, and move this line's target in step 1 forward accordingly. Then stop and tell the user to `/clear`.

## Background

- Memory files worth checking for broader context: `project-streetfeed.md` (product/architecture), `project-deploy-pipeline.md` (git push → GitHub Actions → ghcr.io → Portainer Pull and Redeploy), `feedback-challenge-proposals.md` (Wendy wants real pushback on structural proposals, not agreement-then-comply).
- This file and the milestone structure were set up 2026-07-13 after an audit of the whole codebase (backend, frontend, infra) plus a full pre-existing Linear backlog audit (37 issues classified: 4 migrated, 1 merged, 18 moved to Post-Pilot Backlog, 12 already canceled from a prior cleanup, 2 done).
- Don't assume this file's "Active milestone" is still accurate if it looks stale — cross-check against Linear directly, since Linear is the actual source of truth and this file is just a pointer to it.
