# EGG operational pilot: Lyra — 2026-11-23

**Author's goal:** two **confirmed orders** per month. This is neither two inquiries nor two clicks. Only Author may revise the goal, as a separately authenticated and versioned action.

**Implementation status:** The code in src/lib/eggOperationalKernel.ts is a standalone, deterministic, executable **pure operational kernel** with Vitest coverage. This is NOT yet a complete live operational engine: connectors, persistent common field, scheduler, AI executors, authenticated action execution and UI remain to be integrated.

## Sources inspected, NOT production-order proof

- EGG application: GitHub repository kolesnikovuno-jpg/project-a4e09c64-fce9-4015-a358-ceb6b53fe078, EGG branch integration/egg-unified-2026-11-12; data in EGG Supabase project daluvgoonhgzomckxqnj.
- Lyra inquiries/website events are in a **separate** Supabase project gdsvwiemdggxboxzbdqd. Its inquiry table contained three records at inspection, not three confirmed paid orders. Do not expose private contact data to EGG's common field.
- The Google Ads account kolesnikov.studio is connected to ChatGPT through Windsor.ai. Queries for recent 7 days and 30 days yielded no rows on 2026-11-23. This does NOT demonstrate that there was no advertising activity. EGG does not inherit access to the user's ChatGPT connected account.

## Operational contract

Author goal × Sphere role × Common field = local decision in each sphere.

**Event → source validation → deduplication → changed common field → activation of affected sphere skills → research / wait / bounded proposal → verified outcome → new event.**

routeEggOperationalEvent implements a conservative validated, idempotent, project-specific event router. Nine event kinds map to specialist spheres. It does **not** start the existing 8-sphere formation cycle on every click.

assessEggAdExperiment implements only an initial domain-specific economic guardrail, NOT the mathematical balance of all eight spheres. It requires a separately author-approved budget, recent verified spend, and valid unit economics. At missing or conflicting values, a paid experiment is **not initiated**; research remains possible. At permitted values a bounded **candidate** can be returned, but no external write occurs. Discussion of a 100 UAH/day or 3,000 UAH/month budget **is not approval** to spend it. AI presence does not override constraints.

The kernel works only on supplied, trusted, **in-memory** data. Its output is not persisted and does not certify real demand, legality or production readiness. The existing EGG five-level Idea-to-Product formation machinery remains unchanged.

## Operational completion checklist

1. Register the existing Lyra as an operating **product** in EGG (do not fabricate its past idea/concept or overwrite any existing DNA). Persist goal with author identity and version; enter financial constraints separately after verification.
2. Implement private project-scoped append-only event storage, with RLS, (project_id, source, external_event_id) uniqueness, a cross-source time standard, and no PII in common-field event summaries.
3. Bridge Lyra Supabase read-only inquiry and **aggregate** website events to the EGG common field using server-side, least-privilege access; differentiate inquiry from actual order.
4. Resolve the empty Google Ads connector result before drawing paid-demand conclusions; connect EGG runtime independently through appropriate credentials or a secure read-only ingest adapter.
5. Run event processors on source changes/scheduled bounded polls. Persist sphere activation and outcomes, use existing sphere skills, and keep the author's goal immutable to the engine.
6. Enforce critical constraints and real action permissions in authenticated server code and log every action and response. Do not enable ads management or financial writes before a real integration test.
7. Acceptance: two-orders goal -> real source event -> only relevant sphere activation -> clear research, wait or bounded proposal -> observable next state; include tests for missing data, stale data, duplicate event, over-budget, cross-project isolation and 100% AI presence.

Run npm run egg:verify: the new test lives in src/test/Egg. Unit tests do not prove end-to-end readiness; deploy only after successful build and explicit environment checks.
