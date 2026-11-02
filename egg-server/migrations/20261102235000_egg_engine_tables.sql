-- Egg engine v0.2: isolated server-owned records.
-- IMPORTANT: apply ONLY to a separate, independently managed Egg Supabase database.
-- This file deliberately lives OUTSIDE supabase/migrations so Lovable Cloud
-- cannot apply it as part of the existing website's database migrations.
-- Preparation only: apply deliberately to the intended TEST Supabase project
-- after review. Do not run against production as part of a preview deployment.

create table if not exists public.egg_engine_projects (
  id uuid primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  document jsonb not null,
  revision integer not null default 1 check (revision >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint egg_engine_document_object check (jsonb_typeof(document) = 'object')
);
create index if not exists egg_engine_projects_owner_idx
  on public.egg_engine_projects (owner_id, updated_at desc);

-- Never allow arbitrary browser clients to write engine documents.
-- Backend checks Supabase session tokens or scoped Egg access keys; database
-- access uses the service role only inside server functions.
alter table public.egg_engine_projects enable row level security;
revoke all on public.egg_engine_projects from public, anon, authenticated;
grant all on public.egg_engine_projects to service_role;

create table if not exists public.egg_engine_access_keys (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.egg_engine_projects (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  key_hash text not null unique,
  label text not null default 'External AI',
  scopes text[] not null default array['read', 'contribute']::text[],
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  constraint egg_engine_key_scopes_allowed check (scopes <@ array['read','contribute']::text[]),
  constraint egg_engine_key_label_nonempty check (char_length(trim(label)) between 1 and 60)
);
create index if not exists egg_engine_keys_project_idx
  on public.egg_engine_access_keys (project_id);
alter table public.egg_engine_access_keys enable row level security;
revoke all on public.egg_engine_access_keys from public, anon, authenticated;
grant all on public.egg_engine_access_keys to service_role;

-- Atomic optimistic concurrency: prevents parallel AI and Author requests
-- from silently overwriting each other's accepted decisions or history.
create or replace function public.egg_engine_cas_update(
  p_project_id uuid,
  p_owner_id uuid,
  p_expected_revision integer,
  p_document jsonb
)
returns table (new_revision integer)
language sql
security definer
set search_path = ''
as $$
  update public.egg_engine_projects
     set document = p_document,
         revision = revision + 1,
         updated_at = now()
   where id = p_project_id
     and owner_id = p_owner_id
     and revision = p_expected_revision
  returning revision as new_revision;
$$;

revoke all on function public.egg_engine_cas_update(uuid, uuid, integer, jsonb)
  from public, anon, authenticated;
grant execute on function public.egg_engine_cas_update(uuid, uuid, integer, jsonb)
  to service_role;

comment on table public.egg_engine_projects is
  'Author-owned Egg project snapshots; only protected server API may mutate';
comment on table public.egg_engine_access_keys is
  'Hashed, expiring project-scoped API keys for external AI, never Author approval';
