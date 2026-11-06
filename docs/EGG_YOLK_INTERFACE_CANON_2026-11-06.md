# EGG — Author's Yolk interface / interaction canon (2026-11-06)

Status: approved product concept; implementation pending in actual EGG application. This document does not claim the UI or iteration engine is deployed.

## Core purpose
Human–AI symbiosis: the author governs the evolution of a form through observation, feedback and approval. The system handles operational analysis. Preserve authorship, reversibility, and traceability.

## Main screen
- Central large rotatable 3D object (or meaningful visual placeholder when no model exists), visually analogous to the project's initial EGG screen.
- Eight sphere nodes arranged around the object: Design, Production, Commerce, Retail, Marketing, Test Drive, Legal, Procurement/Complectation.
- A small persistent author dialogue input with Send, concise activity indication, and cycle status. On mobile, keep the model prominent and make panels collapsible.
- Clicking a sphere opens a lightweight popup showing current parameters, last findings, status, open questions, effects on the form, and affected related spheres; optional expand to full dated history.
- Clicking a form element should reveal which sphere decisions contributed to it where provenance exists. Sphere selection highlights relevant parts of the model where mappings exist; never fabricate mappings.
- Show a compact change summary / before-after diff for each iteration, with reasons and evidence confidence.

## Iteration protocol
1. Author enters natural-language instruction into small dialogue and sends.
2. Save message in project history and associate it with current approved DNA/seed and revision.
3. Orchestrator assesses relevance and dependencies of all eight spheres and selects participating spheres dynamically. Do not always force all eight to execute.
4. Record participating, skipped, and blocked spheres with reasons. Route cross-sphere dependencies explicitly.
5. Each participating sphere returns structured proposals: parameter changes, impact on form, rationale, uncertainty, evidence, and links to other spheres.
6. Merge proposals into a candidate revision. Do not silently overwrite approved author decisions or source DNA.
7. Display proposed form / visual update and concise impact summary in Yolk. A 3D model changes only if actual geometry/assets were produced; otherwise show a pending model update, not a fake result.
8. Author accepts, revises, rejects, or requests another iteration. Persist immutable revision history and allow rollback.
9. Repeat until the author judges maturity sufficient. No claim of automated production without verified manufacturing output.

## Information architecture
- DNA: durable original intent, values, constraints, explicit author approvals.
- Phenotype: evolving current model, parameters and assets.
- Sphere state: current status and structured parameter set.
- Provenance graph: sphere -> decision -> parameter -> model feature, with version IDs.
- Iteration history: author prompt, selection rationale, sphere results, diffs, approvals and timestamps.

## Safety / boundaries
- Author is final decision maker; agent autonomy is bounded by author-approved scope.
- Automatic sphere selection is a design requirement, not yet a confirmed implemented feature.
- Distinguish verified calculations and tested constraints from hypotheses.
- Preserve existing login, project routing, sphere data, and prior revisions.
- Test on iPad/Safari, desktop, and mobile; check read-only and authorized edit states.

## Acceptance checks
- Main view shows centered model, 8 spheres, and compact dialogue.
- Every sphere opens a current-state popup and expandable full history.
- Sending a message starts one auditable iteration, with selective sphere involvement and reasons.
- No false geometry updates; explicit author review before canonical revision.
- Full history and provenance persist after refresh and re-login.
