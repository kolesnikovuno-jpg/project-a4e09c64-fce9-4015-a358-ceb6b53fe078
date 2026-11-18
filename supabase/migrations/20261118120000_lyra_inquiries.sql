-- Independent Kolesnikov.studio database; EGG remains in its own Supabase project.
create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin')),
  primary key (user_id, role)
);
alter table public.user_roles enable row level security;
revoke all on public.user_roles from anon, authenticated;
grant select on public.user_roles to authenticated;
create policy "read_own_roles" on public.user_roles for select to authenticated using (user_id = (select auth.uid()));
-- Commercial Lyra requests. Apply to the Supabase project used by Kolesnikov.studio.
create table if not exists public.lyra_inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 255),
  location text not null check (char_length(location) between 1 and 200),
  intent text not null check (intent in ('purchase','custom','production')),
  message text check (char_length(message) <= 1500),
  locale text not null default 'en' check (locale in ('en','ru','uk')),
  status text not null default 'new' check (status in ('new','contacted','in_discussion','closed')),
  operator_notes text
);
create index if not exists lyra_inquiries_created_at_idx on public.lyra_inquiries (created_at desc);
alter table public.lyra_inquiries enable row level security;
revoke all on public.lyra_inquiries from anon, authenticated;
grant insert on public.lyra_inquiries to anon, authenticated;
grant select, update on public.lyra_inquiries to authenticated;
create policy "lyra_public_submit" on public.lyra_inquiries for insert to anon, authenticated with check (
  status = 'new' and operator_notes is null and
  char_length(trim(name)) > 0 and char_length(trim(location)) > 0
);
create policy "lyra_admin_read" on public.lyra_inquiries for select to authenticated using (
  exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role = 'admin')
);
create policy "lyra_admin_update" on public.lyra_inquiries for update to authenticated using (
  exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role = 'admin')
) with check (
  exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role = 'admin')
);
