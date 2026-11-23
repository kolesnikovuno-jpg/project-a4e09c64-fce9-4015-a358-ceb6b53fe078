-- Operational EGG v0.2 — autonomous source-grounded research with bounded paid calls.
-- Independent of formation DNA. No external purchases or Ads permissions.
alter table public.egg_operational_projects
  add column if not exists auto_research_enabled boolean not null default false;
alter table public.egg_operational_projects
  add column if not exists auto_research_daily_limit smallint not null default 2
  check (auto_research_daily_limit between 0 and 2);

create table if not exists public.egg_operational_auto_runs (
 id uuid primary key default gen_random_uuid(),
 operational_project_id uuid not null references public.egg_operational_projects(id) on delete cascade,
 run_day date not null,
 slot smallint not null check(slot between 1 and 2),
 activation_id uuid not null unique references public.egg_operational_activations(id),
 status text not null default 'claimed' check(status in ('claimed','proposed','blocked')),
 outcome_code text,
 attempted_at timestamptz not null default now(),
 completed_at timestamptz,
 unique(operational_project_id,run_day,slot)
);
alter table public.egg_operational_auto_runs enable row level security;
revoke all on public.egg_operational_auto_runs from anon,authenticated;
grant select on public.egg_operational_auto_runs to authenticated;
grant all on public.egg_operational_auto_runs to service_role;
create policy egg_operational_auto_runs_owner_read
 on public.egg_operational_auto_runs for select to authenticated
 using(exists(select 1 from public.egg_operational_projects p
 where p.id=operational_project_id and p.owner_id=(select auth.uid())));

create table if not exists public.egg_operational_followups (
 id uuid primary key default gen_random_uuid(),
 operational_project_id uuid not null references public.egg_operational_projects(id) on delete cascade,
 activation_id uuid not null unique references public.egg_operational_activations(id),
 source_name text not null default 'lyra_supabase_daily_v1' check(source_name='lyra_supabase_daily_v1'),
 baseline_day date not null,
 action_type text not null default 'observe_next_closed_day' check(action_type='observe_next_closed_day'),
 status text not null default 'waiting' check(status in ('waiting','completed')),
 resolved_day date,
 created_at timestamptz not null default now(),
 completed_at timestamptz,
 check((status='waiting' and completed_at is null and resolved_day is null) or
       (status='completed' and completed_at is not null and resolved_day>baseline_day))
);
alter table public.egg_operational_followups enable row level security;
revoke all on public.egg_operational_followups from anon,authenticated;
grant select on public.egg_operational_followups to authenticated;
grant all on public.egg_operational_followups to service_role;
create policy egg_operational_followups_owner_read
 on public.egg_operational_followups for select to authenticated
 using(exists(select 1 from public.egg_operational_projects p
 where p.id=operational_project_id and p.owner_id=(select auth.uid())));

create or replace function public.egg_resolve_operational_followups()
returns trigger language plpgsql security invoker set search_path=public,pg_temp
as $fn$
begin
 if new.source='lyra_supabase_daily_v1' and new.status in ('ok','no_activity') then
   update public.egg_operational_followups f
      set status='completed',resolved_day=new.source_day,completed_at=now()
    where f.operational_project_id=new.operational_project_id
      and f.source_name=new.source and f.status='waiting'
      and f.baseline_day<new.source_day;
 end if;
 return new;
end;
$fn$;
revoke all on function public.egg_resolve_operational_followups() from public,anon,authenticated;
grant execute on function public.egg_resolve_operational_followups() to service_role;
drop trigger if exists egg_operational_followups_source_check on public.egg_operational_source_checks;
create trigger egg_operational_followups_source_check
 after insert or update on public.egg_operational_source_checks
 for each row execute function public.egg_resolve_operational_followups();

create or replace function public.egg_complete_operational_auto_run(
 p_run_id uuid,p_activation_id uuid,p_project_id uuid,p_finding jsonb,p_baseline_day date
) returns boolean
language plpgsql security invoker set search_path=public,pg_temp
as $fn$
begin
 if p_finding is null or jsonb_typeof(p_finding)<>'object' or p_baseline_day is null
 then raise exception 'invalid_auto_result'; end if;
 update public.egg_operational_auto_runs
    set status='proposed',completed_at=now(),outcome_code='research_saved'
  where id=p_run_id and operational_project_id=p_project_id
    and activation_id=p_activation_id and status='claimed';
 if not found then raise exception 'invalid_auto_run_claim'; end if;
 update public.egg_operational_activations
    set status='proposed',finding=p_finding,completed_at=now()
  where id=p_activation_id and status='researching';
 if not found then raise exception 'activation_not_researching'; end if;
 insert into public.egg_operational_followups
   (operational_project_id,activation_id,baseline_day,action_type,status)
 values(p_project_id,p_activation_id,p_baseline_day,'observe_next_closed_day','waiting')
 on conflict(activation_id) do nothing;
 return true;
end;
$fn$;
revoke all on function public.egg_complete_operational_auto_run(uuid,uuid,uuid,jsonb,date)
 from public,anon,authenticated;
grant execute on function public.egg_complete_operational_auto_run(uuid,uuid,uuid,jsonb,date)
 to service_role;
