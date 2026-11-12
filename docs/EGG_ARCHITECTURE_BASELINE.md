# EGG — architecture baseline (draft 0.1)

Status: **design baseline, not yet implemented**. Preserve all project records and media. Do not merge into production without author approval.

## Invariants
1. Author workspace captures raw sketches, images, fragments, observations and notes; AI assists conceptually but does not approve decisions.
2. Idea sphere converts author material into a proposed concept, with explicit author approval.
3. **Three independent outputs originate in Idea**: DNA directly to Yolk; Stream I through its assigned spheres; Stream II through its assigned spheres.
4. Stream I and Stream II never pass information directly to one another. Both may read the approved concept and DNA; each sends its output to Yolk.
5. Yolk combines approved DNA and both stream outputs, surfaces agreements/conflicts, and proposes visual solutions. Author approval is required for changing DNA.
6. Every sphere is a role protocol (inputs, task, tools, evidence rules, output contract, review gates), not merely a chat label.
7. All evidence is typed fact / hypothesis / proposal / question, sourced and versioned. New information augments the project, never silently overwrites approved decisions.

## Sphere order (existing working map; validate against historical UI before enforcement)
Stream I: marketing → design → testDrive → commerce.
Stream II: legal → production → procurement → retail.
Sphere names used by existing backend: marketing, legal, design, production, testDrive, procurement, commerce, retail.

## Suggested canonical entities (proposal; no schema migration yet)
- Project: owner, state, revision
- AuthorMaterial: id, projectId, media refs, note, provenance, timestamp
- IdeaConcept: id, source refs, description, status, author decision
- DNA: id, conceptId, version, immutable approved core, constraints, approval
- SphereRun: id, sphere, stream, input revision, role protocol version, status
- SphereFinding: id, runId, claim type, evidence refs, recommendation, uncertainty
- StreamResult: stream, input DNA version, ordered sphere results, status
- YolkSynthesis: DNA version, stream result versions, contradictions, visual artifacts, author decision
- DecisionEvent: actor, action, target, timestamp, rationale

## Role protocol template
Role / mission / accepted inputs / tools / processing steps / evidence requirements / output schema / prohibitions / handoff / author review.

## Existing implementation audit (2026-11-12)
- Supabase egg_engine_projects.document keys: id, seed, level, tasks, events, schema, concepts, artifacts, iteration, archivedAt, nextSequence. No top-level spheres or flows.
- egg_field_items already stores user canvas fragments and agent proposals including role-engine experiments.
- Authenticated EGG API and private media storage exist.
- Test deployment exists; image-to-ChatGPT connector read tool is **not** yet exposed by installed EGG v4.0 connector.
- No production changes or deletions authorized.

## Migration discipline
1. Inventory actual routes, schemas, APIs, data and deployed behavior.
2. Mark duplicate/obsolete elements; do not delete records or files until dependencies are checked.
3. Add versioned structures and read-only compatibility adapter for existing project documents.
4. Test role contracts and stream isolation with a sample project.
5. Validate Yolk synthesis and visual object flow.
6. Request author review before production release or destructive cleanup.

## Open validation
The sphere grouping above is taken from the established working map, not independently verified against the complete historical UI implementation. Confirm it before wiring irreversible execution logic.
