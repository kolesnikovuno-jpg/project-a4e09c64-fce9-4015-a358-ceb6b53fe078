-- EGG shared project field / albumen, phase 1.
-- Apply only after reviewing the existing auth/project ownership model.
-- This migration does not grant ChatGPT or external experts access.
create table if not exists public.egg_project_access (
  project_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','editor','viewer')),
  created_at timestamptz not null default now(),
  primary key (project_id,user_id)
);
create table if not exists public.egg_field_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  checksum_sha256 text,
  source_type text not null default 'upload',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  unique (project_id,id),
  check (storage_path like project_id::text || '/%')
);
create table if not exists public.egg_material_selections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  asset_id uuid not null,
  selected_by uuid not null references auth.users(id),
  annotations jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (project_id,asset_id) references public.egg_field_assets(project_id,id) on delete restrict
);
create table if not exists public.egg_albumen_facts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  source_asset_id uuid,
  selection_id uuid references public.egg_material_selections(id) on delete set null,
  sphere text not null check (sphere in ('marketing','design','testdrive','commerce','law','production','complectation','retail','material')),
  claim text not null,
  verification_status text not null default 'unverified' check (verification_status in ('unverified','author_confirmed','source_verified','disputed')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (project_id,source_asset_id) references public.egg_field_assets(project_id,id) on delete restrict
);
create index if not exists egg_assets_project_idx on public.egg_field_assets(project_id,created_at desc);
create index if not exists egg_facts_project_idx on public.egg_albumen_facts(project_id,created_at desc);
create index if not exists egg_selections_project_idx on public.egg_material_selections(project_id,created_at desc);
create or replace function public.egg_can_access(p_project uuid, p_write boolean default false)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.egg_project_access a
    where a.project_id=p_project and a.user_id=(select auth.uid())
    and (not p_write or a.role in ('owner','editor'))
  );
$$;
revoke all on function public.egg_can_access(uuid,boolean) from public;
grant execute on function public.egg_can_access(uuid,boolean) to authenticated;
alter table public.egg_project_access enable row level security;
alter table public.egg_field_assets enable row level security;
alter table public.egg_material_selections enable row level security;
alter table public.egg_albumen_facts enable row level security;
create policy egg_access_read on public.egg_project_access for select to authenticated
using (user_id=(select auth.uid()));
create policy egg_assets_read on public.egg_field_assets for select to authenticated
using (public.egg_can_access(project_id,false));
create policy egg_assets_insert on public.egg_field_assets for insert to authenticated
with check (public.egg_can_access(project_id,true) and created_by=(select auth.uid()));
create policy egg_assets_update on public.egg_field_assets for update to authenticated
using (public.egg_can_access(project_id,true)) with check (public.egg_can_access(project_id,true));
create policy egg_selections_read on public.egg_material_selections for select to authenticated
using (public.egg_can_access(project_id,false));
create policy egg_selections_insert on public.egg_material_selections for insert to authenticated
with check (public.egg_can_access(project_id,true) and selected_by=(select auth.uid()));
create policy egg_facts_read on public.egg_albumen_facts for select to authenticated
using (public.egg_can_access(project_id,false));
create policy egg_facts_insert on public.egg_albumen_facts for insert to authenticated
with check (public.egg_can_access(project_id,true) and created_by=(select auth.uid()));
create policy egg_facts_update on public.egg_albumen_facts for update to authenticated
using (public.egg_can_access(project_id,true)) with check (public.egg_can_access(project_id,true));
insert into storage.buckets (id,name,public,file_size_limit)
values ('egg-private-field','egg-private-field',false,52428800)
on conflict (id) do nothing;
-- Storage object name: {project_id}/{asset_uuid}/{original_filename}
create policy egg_field_storage_read on storage.objects for select to authenticated
using (bucket_id='egg-private-field' and public.egg_can_access((split_part(name,'/',1))::uuid,false));
create policy egg_field_storage_write on storage.objects for insert to authenticated
with check (bucket_id='egg-private-field' and public.egg_can_access((split_part(name,'/',1))::uuid,true));
-- No direct delete: preserve source originals; controlled archival is metadata-only.
