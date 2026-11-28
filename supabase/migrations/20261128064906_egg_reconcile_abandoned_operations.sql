create function passport_internal.reconcile_abandoned_operations() returns integer language plpgsql security definer set search_path='' as $$
declare r record; n integer:=0; code text;
begin
 for r in select * from public.egg_operational_auto_runs where status='claimed' and attempted_at<now()-interval '30 minutes' for update skip locked loop
 code:=case when exists(select 1 from public.egg_ai_reservations where run_id=r.id) then 'abandoned_run_cost_review_required' else 'abandoned_run_no_reservation' end;
 update public.egg_operational_auto_runs set status='blocked',outcome_code=code,completed_at=now() where id=r.id;
 if r.activation_id is not null then
 update public.egg_operational_activations set status='blocked',finding=jsonb_build_object('kind','worker_error','code',code),completed_at=now() where id=r.activation_id and status='researching';
 end if;
 n:=n+1;
 end loop;
 return n;
end $$;
revoke all on function passport_internal.reconcile_abandoned_operations() from public,anon,authenticated;
select cron.alter_job(4,command:='select passport_internal.reconcile_abandoned_operations(); select passport_internal.reconcile_object_activations(); select passport_internal.scan_object_pulses();');
