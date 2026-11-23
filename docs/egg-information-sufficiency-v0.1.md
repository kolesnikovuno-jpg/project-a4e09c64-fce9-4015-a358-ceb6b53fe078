# EGG Information Sufficiency v0.1 — implementation boundary

Author decision 2026-11-23: spheres generate demand for missing information, using the shared project information field (белок) and scenario-dependent needs.

Implemented pure evaluator: `src/lib/eggInformationSufficiency.ts`.
- Evidence: verified / estimate / hypothesis / missing, with provenance refs and sphere ownership.
- Readiness is computed **per next action** (ready / conditional / blocked), not as a fictional overall project percentage.
- Missing blocking facts are distinct from estimates; open verification requests are routed to responsible spheres.
- Scenario selection uses observed IDs and does not pretend to forecast which future occurs.
- Author approval, expense ceilings and irreversible decisions remain outside the evaluator.

Lyra example:
- Marketing delivery: zero impressions reported by author => demand test has not yet yielded market evidence; check delivery diagnostics.
- Materials: plywood, finish and cord are concept inputs, but quantities, supplier offers and availability remain to verify.
- Legal: contracts for manufacturing, customer sales, prepayments, delivery, IP and returns need scenario-specific review; no legal sufficiency is implied.
- Production: preliminary fabrication cost is not a verified lead time, capacity or delivery commitment.

Not implemented yet: automatic ingestion from external field into persisted белок, background research execution, sphere-to-sphere request queue, action-specific readiness UI, yolk aggregation, authenticated end-to-end test. The pure module and tests do not claim these capabilities. Next step: wire evaluator into existing flow result and project storage with versioned evidence and safe permissions, then run egg:verify and verify Vercel alias.
