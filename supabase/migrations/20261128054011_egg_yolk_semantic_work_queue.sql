create view public.egg_yolk_semantic_work_v1 with (security_invoker=true) as
select s.node_id,s.revision,s.fingerprint,r.snapshot,n.root_passport_id,n.title,
case when (r.snapshot->>'diagnosis')='evidence_blocked' then 'partial_synthesis' else 'synthesis' end as operation
from public.egg_yolk_semantic_state_v1 s
join public.egg_yolk_synthesis_revisions r on r.node_id=s.node_id and r.revision=s.revision
join public.egg_object_nodes n on n.id=s.node_id
join public.egg_yolk_synthesis_v1 y on y.node_id=s.node_id
where s.semantic_status in ('not_evaluated','stale') and (y.covered_spheres>0 or y.child_handoffs <> '[]'::jsonb);
revoke all on public.egg_yolk_semantic_work_v1 from anon,authenticated;
grant select on public.egg_yolk_semantic_work_v1 to service_role;
