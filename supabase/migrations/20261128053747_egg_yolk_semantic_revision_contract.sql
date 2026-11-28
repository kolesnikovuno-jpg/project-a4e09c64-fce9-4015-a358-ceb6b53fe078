create table public.egg_yolk_semantic_results (
 node_id uuid not null, revision bigint not null,
 result jsonb not null check(jsonb_typeof(result)='object' and result ?& array['summary','conflicts','decisions','next_actions','evidence_refs'] and jsonb_typeof(result->'summary')='string' and jsonb_typeof(result->'conflicts')='array' and jsonb_typeof(result->'decisions')='array' and jsonb_typeof(result->'next_actions')='array' and jsonb_typeof(result->'evidence_refs')='array'),
 created_at timestamptz not null default now(),
 primary key(node_id,revision),
 foreign key(node_id,revision) references public.egg_yolk_synthesis_revisions(node_id,revision) on delete cascade
);
alter table public.egg_yolk_semantic_results enable row level security;
revoke all on public.egg_yolk_semantic_results from anon,authenticated;
grant select,insert on public.egg_yolk_semantic_results to service_role;
create view public.egg_yolk_semantic_state_v1 with(security_invoker=true) as
select p.node_id,p.revision,p.fingerprint,
case when s.node_id is not null then 'review_required' when exists(select 1 from public.egg_yolk_semantic_results old where old.node_id=p.node_id) then 'stale' else 'not_evaluated' end as semantic_status,
s.result, 'unapproved'::text as approval_status
from public.egg_object_pulse_state p left join public.egg_yolk_semantic_results s on s.node_id=p.node_id and s.revision=p.revision;
revoke all on public.egg_yolk_semantic_state_v1 from anon,authenticated;
grant select on public.egg_yolk_semantic_state_v1 to service_role;
