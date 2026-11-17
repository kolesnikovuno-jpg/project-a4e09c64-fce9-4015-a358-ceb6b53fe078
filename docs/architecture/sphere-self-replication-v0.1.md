# EGG — Sphere self-replication contract (draft v0.1)

Status: architecture specification; not yet runtime integration.

## Principle
Each of the eight functional spheres is a versioned, reproducible processing unit. Self-replication means producing a new instance with the same validated role, rules, interfaces and provenance. Self-improvement is separate: a proposed change must be tested and approved before promotion.

## Required sphere package
- identity: sphere_id, role, purpose, version, schema_version
- contract: accepted inputs, outputs, invariants, forbidden actions
- execution: instructions, deterministic local rules, optional AI provider/model configuration
- interfaces: sequential sphere-to-sphere output and radial sphere-to-yolk contribution from the SAME evaluated result (no duplicate AI pass)
- memory: references to validated examples, decisions, known failure patterns
- evaluation: checks for completeness, consistency, fidelity to source intent, downstream compatibility, cost, iteration count
- lineage: parent version, change proposal, test results, approval record

## Replication lifecycle
1. Snapshot a validated sphere package and immutable dependencies.
2. Instantiate a candidate clone in isolation; copy configuration and references, not credentials or user-private data by default.
3. Run a fixed regression suite and representative project cases.
4. Compare against parent: output quality must not regress; record tokens, latency, number of corrective iterations and errors.
5. Require explicit author/operator approval to promote candidate.
6. Preserve rollback to previous version.

## Iteration diagnostics
Number of iterations is an indicator, never a standalone quality score. Record initial uncertainty, unresolved contradictions, author acceptance, costs and material changes. Three rounds may be a useful initial benchmark, not a mandatory limit or proof of optimality.

## Safety and economy
- No autonomous production code edits, credential duplication, unbounded recursive clones or uncontrolled AI calls.
- Limit clone depth and per-run budgets; cache identical inputs and validated outputs.
- Replication is triggered by an explicit request or validated improvement proposal, not by every ordinary iteration.
- Keep a full audit trail: source package hash, version, diff, evaluation, approval.

## Integration plan
1. Inventory actual eight sphere IDs, runtime orchestration and schemas in repository.
2. Implement a common SpherePackage schema and validation.
3. Add cloneCandidate, evaluateCandidate, approvePromotion and rollback operations.
4. Bind sphere-specific contracts without changing current project workflow.
5. Test one sphere end-to-end, then apply to remaining seven.

Acceptance: a sphere clone can be created, compared and rolled back without changing live outputs; no change can reach production without approval.
