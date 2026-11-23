# EGG — Continuity / Handoff
Updated: 2026-11-23. Source: author-supplied end-of-chat transcript plus read-only GitHub/Vercel/Supabase checks. This file is an operational handoff, NOT a claim that every historical decision has been independently verified.

## Architectural intent (author-approved discussion)
EGG is a goal-directed, self-regulating engine, not merely a chat or UI. Author defines and controls the goal; each of eight specialized spheres evaluates the common project field according to its role, proposes and performs only authorized actions, and returns evidence to the common field/yolk. Formula: Author goal × sphere role × common information field → decision/action. Levels: Idea → Concept → Project → Prototype → Object. Streams: Marketing → Design → Testdrive → Commerce; Law → Production → Complectation → Retail. Vertical: Idea / Material; center: Yolk. Each sphere has its own AI participation control. Keep approved architecture distinct from code implementation.

## First operational pilot: Lyra
Goal: 2 confirmed orders/month. Advertising ceilings: 100 UAH/day and 3000 UAH/30 days; ceilings are NOT permission to spend. External ad changes and budget changes remain prohibited absent explicit authorization. Initial AI auto-research cap: 2 paid calls/day. Previous transcript reports one successful server-side research_saved cycle: event/task → Marketing → AI → saved research → internal followup awaiting a verified new day. A Retail attempt failed on model response formatting and was recorded as blocked; subsequent fix reportedly deployed but not retested. These are historical transcript claims, not new independent live tests.

## Verified 2026-11-23 read-only checks
- Supabase project daluvgoonhgzomckxqnj contains public tables egg_operational_auto_runs, egg_operational_events, egg_operational_activations, egg_operational_followups, egg_operational_source_checks, egg_operational_projects and others. Row-level operational state NOT yet independently reverified.
- Vercel project prj_MOCOZSUXa2golJMo4n8Nug5ZeMRz: latest five listed deployments on integration/egg-unified-2026-11-12 have state ERROR (including commit e5f087122d140e2784504b727344ab6ec59e888e). Thus the earlier READY statement is not proof that the latest changes are deployed.
- Build logs for latest failed deployment contain React test warnings about act() in EggWorkspaceSync; root build failure NOT yet isolated.
- GitHub repo kolesnikovuno-jpg/project-a4e09c64-fce9-4015-a358-ceb6b53fe078 is active; more recent default-branch commits also concern Lyra site and inquiry handling.

## Next work, in order
1. Inspect latest failed Vercel build logs to isolate fatal failure, fix in integration branch, and verify READY without disrupting working production.
2. Inspect live auto_runs, source_checks, followups and operational events using read-only SQL with actual table columns; verify real state and new-data followup closure.
3. End-to-end test authorized internal executor with evidence, idempotency, error records and spending guards. Do not trigger paid AI calls merely to test without checking limits and costs.
4. Extend from research/wait to narrow, auditable safe internal actions. No Google Ads mutations, spending, contacting suppliers or other external actions without separate authorization.
5. Update this file after each substantive decision, implementation, verification and unresolved issue. Record links/commit SHAs and distinguish APPROVED / IMPLEMENTED / VERIFIED / BLOCKED.

## Continuity rule
Do not reconstruct the architecture from memory alone. Read this handoff and current code/DB state. Preserve why decisions were made; avoid changing the eight-sphere model or author's goal without explicit approval. Prior PDFs/chat exports may contain additional decisions not yet transcribed here.

## 2026-11-23 follow-on execution (verified)
- Isolated exact fatal build issue in Vercel logs: EggActionExecutor.test.ts failed the valid ISO date evidence test (351 passed, 1 failed, 5 skipped). The root cause was double-escaped \\d in datePattern within src/server/eggActionExecutor.ts.
- Corrected regex to /^\\d{4}-\\d{2}-\\d{2}$/ in branch integration/egg-unified-2026-11-12, commit ee3b19bd389ffd621cd1846439f32ef12991498a. Vercel preview deployment dpl_AZokkZMHrUKVrrmdDNhCDiH6GoXk was BUILDING at last check, not yet confirmed READY.
- Read-only database status: auto_runs = 1 proposed, 1 blocked; followups = 1 waiting; source_checks = 5 ok, 2 no_activity. These statuses alone do not establish full feedback-loop completion. No external action was authorized or executed in this session.
- Next: verify deployment READY, inspect test/build logs if not, then investigate followup completion after new source day.
