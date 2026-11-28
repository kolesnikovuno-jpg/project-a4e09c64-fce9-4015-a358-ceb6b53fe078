create or replace function passport_internal.route_evidence_receipt() returns trigger language plpgsql security definer set search_path='' as $$
declare x record; eid uuid;
begin
select a.sphere,e.operational_project_id,l.node_id into strict x from public.egg_operational_information_gaps g join public.egg_operational_activations a on a.id=g.source_activation_id join public.egg_operational_events e on e.id=a.event_id join public.egg_object_activation_links l on l.activation_id=a.id where g.id=new.gap_id;
insert into public.egg_operational_events(operational_project_id,source,external_event_id,kind,observed_at,summary,evidence_status,facts)
values(x.operational_project_id,'egg_object_research_v1','evidence-receipt:'||new.id,'supplies_changed',now(),'Получены сведения для проверки информационного дефицита','verified_source',jsonb_build_object('node_id',x.node_id,'retry_sphere',x.sphere,'gap_id',new.gap_id,'receipt_id',new.id,'source_uri',new.source_uri,'evidence',new.evidence,'approval_status','unapproved','evidence_review_required',true)) on conflict do nothing returning id into eid;
if eid is null then select id into strict eid from public.egg_operational_events where operational_project_id=x.operational_project_id and source='egg_object_research_v1' and external_event_id='evidence-receipt:'||new.id; end if;
insert into public.egg_operational_activations(event_id,sphere,task) values(eid,x.sphere,'Проверить полученные сведения относительно исходного дефицита; отделить факты от гипотез и определить достаточность доказательств') on conflict(event_id,sphere) do update set task=excluded.task where egg_operational_activations.status='pending';
return new;
end $$;;
