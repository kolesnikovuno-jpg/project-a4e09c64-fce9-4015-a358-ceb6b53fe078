create view public.egg_sphere_evidence_work_v1 with (security_invoker=true) as
select g.id as gap_id,l.node_id,l.level,a.sphere,g.source_type,g.priority,g.status,g.detail,
case when g.source_type='authorial' or g.detail->>'authorActionRequired'='true' then 'await_author'
when g.source_type='external' then 'external_research'
else 'shared_field_review' end as action_kind,
n.goal,n.context,y.sphere_results,y.child_handoffs
from public.egg_operational_information_gaps g
join public.egg_operational_activations a on a.id=g.source_activation_id
join public.egg_object_activation_links l on l.activation_id=a.id
join public.egg_object_nodes n on n.id=l.node_id
join public.egg_object_yolk_state y on y.node_id=n.id
where g.status in ('open','awaiting_external','awaiting_author');
revoke all on public.egg_sphere_evidence_work_v1 from anon,authenticated;
grant select on public.egg_sphere_evidence_work_v1 to service_role;;
