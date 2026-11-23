-- EGG field / albumen: additive extension of the EXISTING EGG project model.
-- Target: egg-engine-test. Not yet deployed. Review and test before applying.
-- Existing project ownership: egg_private.is_project_author(project_id)
-- Existing memberships: public.egg_project_members (role author/contributor).
-- No new independent access registry and no duplicate Storage bucket.
create table if not exists public.egg_field_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.egg_engine_projects(id) on delete cascade,
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
  project_id uuid not null references public.egg_engine_projects(id) on delete cascade,
  asset_id uuid not null,
  selected_by uuid not null references auth.users(id),
  annotations jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (project_id,id),
  foreign key (project_id,asset_id) references public.egg_field_assets(project_id,id) on delete restrict
);
create table if not exists public.egg_albumen_facts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.egg_engine_projects(id) on delete cascade,
  source_asset_id uuid,
  selection_id uuid,
  sphere text not null,
  claim text not null,
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified','author_confirmed','source_verified','disputed')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (project_id,source_asset_id) references public.egg_field_assets(project_id,id) on delete restrict,
  foreign key (project_id,selection_id) references public.egg_material_selections(project_id,id)
);
create index if not exists egg_assets_project_idx on public.egg_field_assets(project_id,created_at desc);
create index if not exists egg_facts_project_idx on public.egg_albumen_facts(project_id,created_at desc);
create index if not exists egg_selections_project_idx on public.egg_material_selections(project_id,created_at desc);
alter table public.egg_field_assets enable row level security;
alter table public.egg_material_selections enable row level security;
alter table public.egg_albumen_facts enable row level security;
-- Conservative initial rollout: only the project author may access medical originals.
-- Extend to scoped contributors after a per-asset confidentiality model is tested.
create policy egg_assets_author_read on public.egg_field_assets for select to authenticated
using (egg_private.is_project_author(project_id));
create policy egg_assets_author_insert on public.egg_field_assets for insert to authenticated
with check (egg_private.is_project_author(project_id) and created_by=(select auth.uid()));
create policy egg_assets_author_update on public.egg_field_assets for update to authenticated
using (egg_private.is_project_author(project_id))
with check (egg_private.is_project_author(project_id));
create policy egg_selections_author_read on public.egg_material_selections for select to authenticated
using (egg_private.is_project_author(project_id));
create policy egg_selections_author_insert on public.egg_material_selections for insert to authenticated
with check (egg_private.is_project_author(project_id) and selected_by=(select auth.uid()));
create policy egg_facts_author_read on public.egg_albumen_facts for select to authenticated
using (egg_private.is_project_author(project_id));
create policy egg_facts_author_insert on public.egg_albumen_facts for insert to authenticated
with check (egg_private.is_project_author(project_id) and created_by=(select auth.uid()));
create policy egg_facts_author_update on public.egg_albumen_facts for update to authenticated
using (egg_private.is_project_author(project_id))
with check (egg_private.is_project_author(project_id));
-- Reuse existing private bucket 'egg-author-media' only after inspecting
-- existing storage.objects policies; do not add conflicting policies here.
-- App must ensure the storage path is project_id/asset_id/original_filename.
