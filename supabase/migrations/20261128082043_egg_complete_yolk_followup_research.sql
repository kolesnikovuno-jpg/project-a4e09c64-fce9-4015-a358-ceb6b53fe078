CREATE OR REPLACE FUNCTION public.egg_complete_operational_auto_run(p_run_id uuid, p_activation_id uuid, p_project_id uuid, p_finding jsonb, p_baseline_day date) RETURNS boolean LANGUAGE plpgsql SET search_path TO 'public', 'pg_temp' AS $function$
declare event_source text;
begin
if p_finding is null or jsonb_typeof(p_finding)<>'object' or p_baseline_day is null then raise exception 'invalid_auto_result'; end if;
select e.source into strict event_source from public.egg_operational_activations a join public.egg_operational_events e on e.id=a.event_id where a.id=p_activation_id and e.operational_project_id=p_project_id and (e.source<>'egg_yolk_followup_v1' or (e.kind='yolk_followup' and e.evidence_status='hypothesis' and e.facts->>'research_only'='true' and e.facts->>'approval_status'='unapproved'));
if event_source not in ('egg_object_research_v1','lyra_supabase_daily_v1','egg_yolk_followup_v1') then raise exception 'unsupported_auto_source'; end if;
update public.egg_operational_auto_runs set status='proposed',completed_at=now(),outcome_code='research_saved' where id=p_run_id and operational_project_id=p_project_id and activation_id=p_activation_id and status='claimed';
if not found then raise exception 'invalid_auto_run_claim'; end if;
update public.egg_operational_activations set status='proposed',finding=p_finding,completed_at=now() where id=p_activation_id and status='researching';
if not found then raise exception 'activation_not_researching'; end if;
if event_source='lyra_supabase_daily_v1' then insert into public.egg_operational_followups (operational_project_id,activation_id,baseline_day,action_type,status) values(p_project_id,p_activation_id,p_baseline_day,'observe_next_closed_day','waiting') on conflict(activation_id) do nothing; end if;
return true;
end;
$function$;
