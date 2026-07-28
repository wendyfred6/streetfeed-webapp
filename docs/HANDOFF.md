# Streetfeed — Handoff

> **Read this first in any new session.** This is a pointer document, not a
> second documentation source — Linear stays the source of truth for
> project/issue status. This file exists so a fresh Claude Code session, or
> Chappy, can get oriented in one read.
>
> Supersedes `resume_prompt.md` (closed out 2026-07-14 as the v1.0
> completion record — historical only) and `docs/streetfeed-cc-briefing.md`
> (the original pre-Figma product briefing — historical only).

## What Streetfeed is

A hyper-local street communication platform — Nextdoor-style, but for a
single street. First community: Reyer Anslostraat, Amsterdam (~111
households). Full-stack PWA (React frontend, Node/Express backend,
PostgreSQL), self-hosted via Docker on a Synology NAS. Domain:
streetfeed.nl. Magic-link auth only, no passwords.

## Where things stand

- **Streetfeed v1.0** (Linear project, Completed) — the original MVP build,
  M0–M6, shipped 2026-07-14.
- **Streetfeed Pilot Excellence** (Linear project, active) —
  https://linear.app/fred6/project/streetfeed-pilot-excellence-6043d9b61f44
  — making the shipped product trustworthy for a real pilot before
  inviting Founding Residents. 10 milestones. **Check Linear directly for
  current issue/milestone status** — do not rely on a memory or chat
  summary for this.
- The project's own Linear documents (11 of them: Delivery Handoff, Category
  Tree, Post Type Specs, Interaction Principles, Feed Structure, Resident
  Access Model, Pilot Strategy, Pilot Feedback Loop, Operational Readiness,
  Audit Log, Product Vocabulary, Street-not-Neighborhood decision) hold the
  actual product decisions and reasoning. Read those, not a paraphrase.

## Access map

| What | Where |
|---|---|
| Code | this repo, `main` branch |
| Figma | file key `W65VpyQHr5Zy5121TZk05t`, file "Streetfeed" |
| Linear | team **Fred6**, project **Streetfeed Pilot Excellence** |
| Deploy | git push to `main` → GitHub Actions builds & pushes `ghcr.io/wendyfred6/streetfeed-{frontend,backend}` → Portainer "Pull and Redeploy" per container (never the whole stack unless all three changed) |
| Prod access | Portainer web UI only — Wendy has no SSH to the NAS |

## Working conventions (the part Linear can't hold)

- **Figma is the source of truth** for any visual/UI work. Pull the actual
  node (`get_design_context`/`get_metadata`), don't reason from memory or a
  screenshot impression. If code and Figma disagree, flag it as a decision
  — don't silently pick a side.
- **Small, tight deploy loop:** one change → commit → push → wait for CI →
  ask before Portainer recreate → verify in production → only then the next
  change. Never commit or push without an explicit instruction.
- **Always state which container(s)** need Re-pull + Recreate after a push
  — frontend, backend, or both. Never assume "the whole stack."
- **Terminology:** "Category Path" not breadcrumb, "New Post Sheet" not
  Place Post, "Terminal Row" (opens a form) vs "Navigation Row" (drills
  deeper) — see Product Vocabulary doc in Linear for the full list.
- **Verify against real data before asserting a fix is correct** — for
  external-source values (BAG/PDOK etc.) check the source matches the
  product's own definition; for local dev/backend work, run it against a
  real local Postgres, not just a diff review.
- Wendy wants genuine pushback on structural/workflow proposals when she
  asks for it — not agreement-then-comply.

## Not yet decided (as of 2026-07-28)

- **Color palette:** a full alternative palette ("Moleskine + Koraal") was
  built as three new, additive Figma Variable Collections
  (Foundation/Semantic/Component) for side-by-side comparison against the
  existing "Streetfeed Colors v0.1." No decision made — see FRE-409 in
  Linear for the live thread.
- If a new palette is adopted, `tokens.js`'s flat `COLORS`/`ALPHA`/`GLASS`
  structure is worth upgrading to the same Foundation→Semantic→Component
  tiering at the same time — not scheduled, just flagged.
- Dark mode: moved from "not now" to "maybe near future" — still not an
  active build request.
