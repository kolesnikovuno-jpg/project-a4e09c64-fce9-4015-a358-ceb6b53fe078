# EGG · Постоянный MCP-адрес (2026-11-04)

**Канонический адрес для ChatGPT:** `https://egg.kolesnikov.studio/api/mcp`
**Страница EGG:** `https://egg.kolesnikov.studio/egg/connect`
**Сфера «Идея»:** `https://egg.kolesnikov.studio/egg?project=<uuid>&start=idea`

## Как устроено

- В Vercel project `prj_MOCOZSUXa2golJMo4n8Nug5ZeMRz` отдельный домен `egg.kolesnikov.studio` подключён к **preview Git branch** `prototype/design-brief-sketch-gates`.
- Основные домены `www.kolesnikov.studio`, `kolesnikov.studio` и production-ветка **не переназначались**.
- DNS зоны `kolesnikov.studio` обслуживаются Vercel DNS (nameservers `ns1.vercel-dns.com`, `ns2.vercel-dns.com`) и уже содержат wildcard-запись, поэтому домен был подтверждён без ручного изменения DNS.
- **EGG_MCP_PUBLIC_ORIGIN** задаётся в Vercel **для этой конкретной preview-ветки** в значение `https://egg.kolesnikov.studio`. Остальные настройки EGG Supabase остаются branch-scoped и секретами.
- В `src/pages/EggConnect.tsx` именно постоянный endpoint показывается пользователю при подключении ChatGPT.
- `/api/oauth-resource` (rewrite из `/.well-known/oauth-protected-resource`) должен возвращать `resource: https://egg.kolesnikov.studio/api/mcp`, а `authorization_servers` — действительный Supabase Auth issuer.
- В `api/mcp.ts` ответ HTTP 401 на неавторизованный запрос должен иметь `WWW-Authenticate: Bearer resource_metadata="https://egg.kolesnikov.studio/.well-known/oauth-protected-resource"`.

## Два вида проверки

**Публичные серверные проверки (без пользовательских данных):**
1. GET `/api/mcp-health`: HTTP 200, `checks.protocol:true`, `checks.storageConfigured:true`.
2. GET `/.well-known/oauth-protected-resource`: HTTP 200 с каноническим `resource` (должен совпадать с адресом MCP).
3. GET `/api/egg-config`: HTTP 200, возвращается только публичная конфигурация; `sb_secret_` никогда не передавать.
4. GET `/api/mcp` без авторизации: штатный HTTP 401 с корректным заголовком `WWW-Authenticate`; этот ответ означает, что MCP не открыт посторонним.
5. Проверить TLS и DNS на `egg.kolesnikov.studio`.

**Сквозная проверка со стороны ChatGPT:**
- Пользователь подключает или переподключает EGG по **новому URL** в ChatGPT. Самостоятельно переназначить URL существующего установленного коннектора из репозитория или через Vercel нельзя.
- Выполнить `egg_get_project_state` для авторизованного тестового проекта, удостовериться в ревизии и отсутствии ошибок.
- Важно: успешно выполненный ранее запрос к старому URL не подтверждает работоспособность нового OAuth flow в клиенте ChatGPT.

## Режим деплоя и ограничения

- В `vercel.json` auto-deploy для этой preview-ветки выключен: `git.deploymentEnabled.prototype/design-brief-sketch-gates = false`. Новые релизы необходимо **явно** разворачивать в эту ветку через Vercel после тестов.
- Кастомный branch domain сохраняет одно имя и переназначается на новое развертывание той же ветки; не зависит от случайного deployment hostname, **но не является гарантией вечной доступности**, если удалён проект/ветка/домен или провайдер испытывает сбой.
- Оригинальные project access keys и OAuth токены не изменять только из-за смены публичного адреса. Новая интеграция ChatGPT может потребовать авторизацию заново.
- Область конфигурации содержит реальный тестовый проект, не public production. Не копировать branch-scoped секреты в GitHub, chat или общие Vercel Preview переменные.
- Утверждённое ядро EGG и проекты не меняются при настройке MCP DNS/OAuth.

## Если ChatGPT сообщает «deployment removed»

1. Сверить Vercel branch domain `egg.kolesnikov.studio` с `prototype/design-brief-sketch-gates`.
2. Проверить, что последний preview deployment имеет `READY`.
3. Проверить /api/mcp-health и /.well-known/oauth-protected-resource (последний должен указывать на постоянный домен).
4. Проверить, что **в самом ChatGPT** выбран новый `https://egg.kolesnikov.studio/api/mcp`, а не старый `...-git-e8febd-...vercel.app`.
5. Переподключить приложение EGG, если его конфигурация хранит прежний серверный URL; это действие требует участия пользователя.
