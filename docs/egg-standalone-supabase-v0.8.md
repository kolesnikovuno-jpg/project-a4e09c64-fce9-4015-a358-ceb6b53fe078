# Яйцо v0.8 — независимый Supabase создан и проверен

Дата проверки: 03.11.2026 (по проектному часовому поясу).
Рабочий сайт, его Lovable Cloud и существующая база не изменялись.

## Установлено на Supabase

- **Организация:** info@kolesnikov.design's Org
- **Проект:** egg-engine-test
- **Supabase project ref:** daluvgoonhgzomckxqnj
- **Регион:** eu-central-1 (Frankfurt)
- **Статус:** ACTIVE_HEALTHY
- **Стоимость, показанная Supabase при создании:** 0 USD/мес.; это не гарантия отсутствия расходов при последующем росте нагрузки.
- **SQL:** миграция egg_engine_initial_isolated_tables установлена ТОЛЬКО в этот проект из egg-server/migrations/20261102235000_egg_engine_tables.sql.

Фактические проверки базы:
1. public.egg_engine_projects и public.egg_engine_access_keys существуют, обе пусты.
2. На обеих таблицах RLS включён; anon не может читать, authenticated не может напрямую добавлять записи.
3. Только service_role имеет серверное разрешение чтения.
4. public.egg_engine_cas_update выполняется как SECURITY INVOKER (не SECURITY DEFINER); EXECUTE запрещён anon и authenticated, разрешён service_role.
5. Security advisor вернул два INFO \`rls_enabled_no_policy\`. Это ожидаемо для данного архитектурного решения: доступ клиентов к таблицам намеренно полностью закрыт; разрешён только серверный API.

## Подключение к Vercel

В существующем Vercel-проекте по **тестовой ветке** \`prototype/design-brief-sketch-gates\` заданы только preview-переменные:

- \`EGG_SUPABASE_URL\` — URL **нового**, независимого проекта;
- \`EGG_SUPABASE_PUBLISHABLE_KEY\` — publishable key нового проекта.

Это не production env. Ключ \`sb_publishable_...\` не содержит привилегий сервера, но хранится в Vercel env для конфигурации.

**Ещё НЕ установлен** \`EGG_SUPABASE_SECRET_KEY\` (\`sb_secret_...\`). В чате этот ключ не передавать. Его необходимо назначить непосредственно в Vercel Dashboard → Project → Settings → Environment Variables → Preview, Git branch \`prototype/design-brief-sketch-gates\`, тип Secret/Encrypted. Значение взять в Supabase Dashboard → egg-engine-test → Project Settings → API Keys → Secret keys. Никогда не задавать как \`VITE_*\`, не добавлять в GitHub и не передавать стороннему ИИ.

Поскольку этот ключ пока отсутствует, \`/api/egg\` и \`/api/mcp\` должны продолжать возвращать \`503 egg_engine_not_configured\`. Такая недоступность — **запланированная защитная мера**. После добавления потребуется новый preview deployment; только затем можно запускать тест авторизации пользователя, выдачи ограниченных ключей MCP, регистрации документа и ревокации.

## Принцип владения

GitHub хранит код; Vercel размещает сервис; отдельный Supabase/Postgres хранит состояние «Яйца»; документы остаются в личном Google Drive. Ни Lovable, ни его Supabase не должны участвовать в контуре работы движка.

## Ещё необходимо проверить до настоящего использования

- Регистрация пользователя в новом Supabase Auth и интерфейс входа Автора.
- Тест реальных HTTP-запросов к развернутым \`/api/egg\` и \`/api/mcp\`, включая повторную запись с operationId.
- Тест отказа для другого пользователя, истёкшего и отозванного ключа.
- Нагрузочные ограничения, резервное копирование, аудит и синхронизация браузерной панели Автора с серверной записью.
- Безопасная организация server-only secrets на отдельном выделенном Vercel-проекте (по мере отделения Egg от нынешней страницы сайта).
