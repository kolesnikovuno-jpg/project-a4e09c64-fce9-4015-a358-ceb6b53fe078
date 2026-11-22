-- EGG operating mode: infrastructure only. Author decisions and source snapshots
-- are data records, NOT seeded into arbitrary future accounts by this migration.
-- Live applied separately on EGG Supabase project daluvgoonhgzomckxqnj, 2026-11-23.
create table if not exists public.egg_operational_projects (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),
 slug text not null check (slug ~ '^[a-z0-9][a-z0-9_-]{1,79}$'),
 title text not null check (char_length(title) between 1 and 160),
 mode text not null default 'operating' check (mode='operating'),
 goal_metric text not null check (goal_metric='confirmed_orders_per_month'),
 goal_target integer not null check (goal_target > 0),
 goal_author_approved_at timestamptz not null,
 goal_revision integer not null default 1 check (goal_revision > 0),
 currency text not null default 'UAH' check (currency='UAH'),
 ads_daily_limit_uah numeric(12,2) not null check (ads_daily_limit_uah >= 0),
 ads_rolling_30d_limit_uah numeric(12,2) not null check (ads_rolling_30d_limit_uah >= 0),
 ads_author_approved_at timestamptz not null,
 ads_operation_allowed boolean not null default false check (ads_operation_allowed=false),
 ads_approval_note text not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(owner_id,slug),unique(id,owner_id)
);
alter table public.egg_operational_projects enable row level security;
revoke all on public.egg_operational_projects from anon,authenticated;
grant select on public.egg_operational_projects to authenticated;
grant all on public.egg_operational_projects to service_role;
create policy egg_operational_project_owner_read on public.egg_operational_projects
 for select to authenticated using (owner_id=(select auth.uid()));

create table if not exists public.egg_operational_events (
 id uuid primary key default gen_random_uuid(),
 operational_project_id uuid not null references public.egg_operational_projects(id) on delete cascade,
 source text not null check (char_length(source) between 3 and 120),
 external_event_id text not null check (char_length(external_event_id) between 3 and 180),
 kind text not null check (kind in (
 'ads_metrics','site_metrics','inquiry_received','order_confirmed',
 'commercial_terms_changed','capacity_changed','supplies_changed',
 'legal_conditions_changed','product_feedback')),
 observed_at timestamptz not null,
 recorded_at timestamptz not null default now(),
 summary text not null check (char_length(summary) between 3 and 900),
 evidence_status text not null check (evidence_status in ('verified_source','hypothesis','incomplete')),
 facts jsonb not null default '{}'::jsonb check (jsonb_typeof(facts)='object'),
 unique (operational_project_id,source,external_event_id)
);
alter table public.egg_operational_events enable row level security;
revoke all on public.egg_operational_events from anon,authenticated;
grant select on public.egg_operational_events to authenticated;
grant all on public.egg_operational_events to service_role;
create policy egg_operational_event_owner_read on public.egg_operational_events
 for select to authenticated using (exists (
  select 1 from public.egg_operational_projects p
  where p.id=operational_project_id and p.owner_id=(select auth.uid())
 ));

create table if not exists public.egg_operational_activations (
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null references public.egg_operational_events(id) on delete cascade,
 sphere text not null check (sphere in (
 'marketing','design','testDrive','commerce','legal',
 'production','procurement','retail')),
 task text not null check (char_length(task) between 8 and 900),
 status text not null default 'pending' check (status in (
 'pending','researching','proposed','verified','blocked')),
 created_at timestamptz not null default now(),
 unique(event_id,sphere)
);
alter table public.egg_operational_activations enable row level security;
revoke all on public.egg_operational_activations from anon,authenticated;
grant select on public.egg_operational_activations to authenticated;
grant all on public.egg_operational_activations to service_role;
create policy egg_operational_activation_owner_read on public.egg_operational_activations
 for select to authenticated using (exists (
  select 1 from public.egg_operational_events e
  join public.egg_operational_projects p on p.id=e.operational_project_id
  where e.id=event_id and p.owner_id=(select auth.uid())
 ));

-- One database event creates ONLY relevant sphere tasks. This does not run AI.
create or replace function public.egg_queue_operational_activations()
returns trigger language plpgsql security invoker
set search_path=public,pg_temp
as $$
begin
 insert into public.egg_operational_activations(event_id,sphere,task)
 select new.id, v.sphere, v.task from (values
 ('ads_metrics','marketing','Исследовать фактическую реакцию на рекламный эксперимент'),
 ('ads_metrics','commerce','Сопоставить фактические рекламные затраты с экономикой'),
 ('ads_metrics','retail','Оценить работу канала привлечения'),
 ('ads_metrics','testDrive','Проверить, что именно подтвердил эксперимент'),
 ('site_metrics','marketing','Исследовать поведение и интерес на сайте'),
 ('site_metrics','retail','Оценить путь пользователя до обращения'),
 ('site_metrics','testDrive','Сопоставить гипотезу с наблюдаемым поведением'),
 ('inquiry_received','retail','Обработать обращение по действующим условиям'),
 ('inquiry_received','marketing','Уточнить гипотезу спроса по новому обращению'),
 ('inquiry_received','commerce','Отличить обращение от подтверждённого заказа'),
 ('order_confirmed','commerce','Обновить выполнение цели по подтверждённым заказам'),
 ('order_confirmed','production','Проверить возможности изготовления заказа'),
 ('order_confirmed','procurement','Уточнить доступность необходимых компонентов'),
 ('order_confirmed','retail','Проверить передачу заказа на исполнение'),
 ('order_confirmed','legal','Проверить необходимые договорные условия'),
 ('commercial_terms_changed','commerce','Пересчитать экономические ограничения'),
 ('commercial_terms_changed','marketing','Пересмотреть допустимые варианты исследования спроса'),
 ('commercial_terms_changed','retail','Актуализировать экономику каналов'),
 ('capacity_changed','production','Сопоставить загрузку с целью'),
 ('capacity_changed','commerce','Учесть ограничения производственного объёма'),
 ('capacity_changed','retail','Актуализировать обещаемые сроки'),
 ('supplies_changed','procurement','Проверить цены и наличие компонентов'),
 ('supplies_changed','production','Проверить совместимость и сроки'),
 ('supplies_changed','commerce','Пересчитать затраты при необходимости'),
 ('legal_conditions_changed','legal','Уточнить применимые условия и договоры'),
 ('legal_conditions_changed','retail','Сверить публичное предложение с условиями'),
 ('legal_conditions_changed','commerce','Учесть обязательства и связанные затраты'),
 ('product_feedback','testDrive','Разобрать проверенный пользовательский опыт'),
 ('product_feedback','design','Оценить влияние обратной связи на форму'),
 ('product_feedback','production','Проверить последствия возможного изменения')
 ) as v(kind,sphere,task)
 where v.kind=new.kind
 on conflict(event_id,sphere) do nothing;
 return new;
end;
$$;
revoke all on function public.egg_queue_operational_activations() from public,anon,authenticated;
grant execute on function public.egg_queue_operational_activations() to service_role;
create trigger egg_operational_event_activate after insert on public.egg_operational_events
for each row execute function public.egg_queue_operational_activations();
