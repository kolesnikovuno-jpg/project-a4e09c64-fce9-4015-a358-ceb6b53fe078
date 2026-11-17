# EGG · Sphere Runtime Contracts v1

Status: implementation foundation, **not connected to production execution**.

## Purpose
Each of the eight spheres is a persistent process controller. AI is a replaceable, scoped executor, not the owner of the sphere. The configuration lives in `src/lib/eggSphereRuntimeContracts.ts`.

## Contract
`buildSphereAssignment(sphere, mode, dnaVersion, iteration, scopedContext)` creates a deterministic role/instruction package, acceptance criteria, forbidden claims, and two routing targets. Modes: manual (human), symbiosis (AI draft with human review), auto (AI draft with policy review). **Auto does not bypass Author approval.**

`SphereOutput` records facts, hypotheses, proposals, unknowns, visual artifact references, questions, DNA version and explicit Author approval. `canPublishSphereOutput` rejects outputs without an explicit approved identity/time and matching DNA version.

## Graph
Idea/Concept DNA → Yolk (independent baseline).
Branch 1: marketing → design → testDrive → commerce → Yolk.
Branch 2: legal → production → procurement → retail → Yolk.
Every sphere also contributes radially to Yolk. The existing engine remains the authority for actual flow routing and iteration state.

## Integration checklist
1. Map these contracts to existing `eggSphereIntelligence.ts` and `eggFlowCycle.ts` without replacing the working UI.
2. Bind assignments to authenticated project state and a specific approved DNA version.
3. Store drafts and explicit approvals transactionally; do not trust AI-generated approval fields.
4. Add server-side provider budget, rate limiting, retries, and schema validation.
5. Test branch isolation, human approval gates, provider failure, and radial Yolk synthesis.
6. Verify in preview before deploying. No production migration or provider calls are introduced by this change.

## Important
This is a configuration/runtime contract layer. It does not claim that all eight spheres now autonomously execute, that an AI provider is connected, or that production was deployed.
