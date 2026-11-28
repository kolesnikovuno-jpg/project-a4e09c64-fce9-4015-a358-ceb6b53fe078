create table public.egg_sphere_evidence_receipts(
id uuid primary key default gen_random_uuid(), gap_id uuid not null references public.egg_operational_information_gaps(id), source_uri text not null check(length(source_uri) between 1 and 2048), evidence jsonb not null check(jsonb_typeof(evidence)='object'), received_at timestamptz not null default now(), unique(gap_id,source_uri,evidence));
alter table public.egg_sphere_evidence_receipts enable row level security;
revoke all on public.egg_sphere_evidence_receipts from anon,authenticated;
grant select,insert on public.egg_sphere_evidence_receipts to service_role;
create function passport_internal.route_evidence_receipt() returns trigger language plpgsql security definer set search_path='' as $$
declare x record;
begin
select a.sphere,e.operational_project_id,l.node_id into strict x from public.egg_operational_information_gaps g join public.egg_operational_activations a on a.id=g.source_activation_id join public.egg_operational_events e on e.id=a.event_id join public.egg_object_activation_links l on l.activation_id=a.id where g.id=new.gap_id;
insert into public.egg_operational_events(operational_project_id,source,external_event_id,kind,observed_at,summary,evidence_status,facts)
values(x.operational_project_id,'egg_object_research_v1','evidence-receipt:'||new.id,'supplies_changed',now(),'Получены сведения для проверки информационного дефицита','verified_source',jsonb_build_object('node_id',x.node_id,'retry_sphere',x.sphere,'gap_id',new.gap_id,'receipt_id',new.id,'source_uri',new.source_uri,'evidence',new.evidence,'approval_status','unapproved','evidence_review_required',true)) on conflict do nothing;
return new;
end $$;
revoke all on function passport_internal.route_evidence_receipt() from public;
create trigger egg_route_evidence_receipt after insert on public.egg_sphere_evidence_receipts for each row execute function passport_internal.route_evidence_receipt();;
