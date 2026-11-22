# EGG operational pilot: Lyra — 2026-11-23

## Реализовано в пилоте 23.11.2026 — операционная запись, события и очередь

- В EGG Supabase (`daluvgoonhgzomckxqnj`) реально применены миграции `egg_operational_lyra_registry_v1` и `egg_operational_event_activation_v1`; воспроизводимая схема закоммичена в `supabase/migrations/20261123000000_egg_operational_lyra_v1.sql`.
- Создан операционный проект Lyra для единственного текущего владельца EGG. Авторская цель: 2 подтверждённых заказа за календарный месяц. Авторский потолок рекламных расходов: 100 грн за день и 3 000 грн за **любые скользящие 30 дней**. Рекламные операции выключены на уровне данных (`ads_operation_allowed=false`), это не команда на оплату.
- RLS: читать может только соответствующий владелец; публичная запись, изменение лимитов и запись внешних событий из браузера запрещены. События может записывать только доверенный сервисный слой.
- Один фактический не-PII снимок данных из Lyra Supabase перенесён в общее поле: 110 событий, 33 идентификатора сессий, 3 заявки (2 со статусом new), 1 событие с меткой google, 36 с меткой campaign. Это **не** число реальных клиентов, платёжеспособного спроса или оплаченных заказов; старые посещения Автора могли войти в события. Источник: один раз прочитан через подключённую базу, не автоматический коннектор.
- После вставки снимка **триггер БД самостоятельно создал три ожидающих задания**: Маркетинг, Ритейл, Тестдрайв. Проверено SQL. Задачи ещё не исполнены моделью.
- Созданы read-only страница `/egg/operations` и ссылка в аккаунте EGG; данные защищены тем же EGG Auth/RLS, что другие проекты, и не видны анонимному посетителю.
- В кодовом экономическом коридоре и тестах термин `spentRolling30Days` теперь явно обозначает скользящее окно, не календарный месяц; тестирует превышение лимита.
- Следующий разрыв: автоматический защищённый источник Lyra Supabase, проверенная статистика Google Ads, исполнитель задач сфер, надёжный учет расходов с учётом временной зоны рекламного аккаунта. До этого `/egg/operations` — живой просмотр **сохранённого снимка и очереди**, а не постоянно обновляемая внешняя аналитика.


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
