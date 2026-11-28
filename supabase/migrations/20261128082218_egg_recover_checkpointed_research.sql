create table public.egg_operational_result_recovery_history(run_id uuid primary key references public.egg_operational_auto_runs(id), original_outcome text not null, recovered_at timestamptz not null default now());
alter table public.egg_operational_result_recovery_history enable row level security;
revoke all on public.egg_operational_result_recovery_history from anon,authenticated;
create function public.egg_recover_checkpointed_research(p_run_id uuid) returns boolean language plpgsql set search_path='' as $$
declare r public.egg_operational_auto_runs%rowtype; f jsonb;
begin
select * into r from public.egg_operational_auto_runs where id=p_run_id and operation_kind='sphere' and status='blocked' and outcome_code='atomic_commit_failed' for update;
if not found then return false; end if;
select finding into f from public.egg_operational_result_recovery where run_id=r.id;
if f is null or not exists(select 1 from public.egg_ai_reservations where run_id=r.id and state='settled') then return false; end if;
update public.egg_operational_activations set status='researching' where id=r.activation_id and status='blocked' and finding->>'code'='atomic_commit_failed';
if not found then return false; end if;
insert into public.egg_operational_result_recovery_history(run_id,original_outcome) values(r.id,r.outcome_code);
update public.egg_operational_auto_runs set status='claimed' where id=r.id;
if not public.egg_complete_operational_auto_run(r.id,r.activation_id,r.operational_project_id,f,r.run_day) then raise exception 'recovery_failed'; end if;
return true;
end $$;
revoke all on function public.egg_recover_checkpointed_research(uuid) from public,anon,authenticated;
grant execute on function public.egg_recover_checkpointed_research(uuid) to service_role;
grant select,insert on public.egg_operational_result_recovery_history to service_role;
