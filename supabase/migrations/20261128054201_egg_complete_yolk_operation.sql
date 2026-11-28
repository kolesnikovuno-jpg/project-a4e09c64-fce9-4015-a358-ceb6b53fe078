create function public.egg_complete_yolk_operation(p_run_id uuid,p_result jsonb) returns boolean language plpgsql set search_path='' as $$
declare r public.egg_operational_auto_runs%rowtype;
begin
 select * into r from public.egg_operational_auto_runs where id=p_run_id and operation_kind='yolk' and status='claimed' for update;
 if not found then return false; end if;
 if not exists(select 1 from public.egg_ai_reservations where run_id=r.id and state='settled') then return false; end if;
 insert into public.egg_yolk_semantic_results(node_id,revision,result) values(r.synthesis_node_id,r.synthesis_revision,p_result);
 update public.egg_operational_auto_runs set status='proposed',outcome_code='semantic_synthesis_saved',completed_at=now() where id=r.id;
 return true;
end $$;
revoke all on function public.egg_complete_yolk_operation(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.egg_complete_yolk_operation(uuid,jsonb) to service_role;
