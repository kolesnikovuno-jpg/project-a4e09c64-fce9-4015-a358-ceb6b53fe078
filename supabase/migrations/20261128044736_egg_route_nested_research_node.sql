CREATE OR REPLACE FUNCTION passport_internal.route_operational_activation(aid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare a public.egg_operational_activations%rowtype; e public.egg_operational_events%rowtype; root_id uuid; target_id uuid; lvl smallint; sp text; it integer; key_name text; begin
 select * into a from public.egg_operational_activations where id=aid;
 if not found then return; end if;
 select * into e from public.egg_operational_events where id=a.event_id;
 select n.id into root_id from public.egg_passport_registry r join public.egg_object_nodes n on n.root_passport_id=r.id and n.parent_id is null where r.source_kind='operational' and r.source_project_id=e.operational_project_id;
 if root_id is null then return; end if;
 key_name:=case e.kind when 'ads_metrics' then 'advertising' when 'site_metrics' then 'website' when 'product_feedback' then 'chair' when 'legal_conditions_changed' then 'contract' else null end;
 select id into target_id from public.egg_object_nodes where parent_id=root_id and element_key=key_name;
 if e.source='egg_object_research_v1' then
 select n.id into target_id from public.egg_object_nodes n join public.egg_object_nodes root on root.id=root_id and root.root_passport_id=n.root_passport_id where n.id::text=e.facts->>'node_id';
 if target_id is null then raise exception 'invalid_object_research_node'; end if;
 else target_id:=coalesce(target_id,root_id); end if;
 select level into lvl from public.egg_object_nodes where id=target_id;
 insert into public.egg_object_activation_links(activation_id,node_id,level) values(a.id,target_id,lvl) on conflict(activation_id) do nothing;
 select node_id,level into target_id,lvl from public.egg_object_activation_links where activation_id=a.id;
 if a.finding is null or a.status not in ('proposed','verified') then return; end if;
 sp:=case a.sphere when 'legal' then 'law' when 'procurement' then 'assembly' else a.sphere end;
 perform pg_advisory_xact_lock(hashtextextended(target_id::text||sp||lvl::text,0));
 select coalesce(max(iteration),0)+1 into it from public.egg_object_sphere_results where node_id=target_id and sphere=sp and level=lvl;
 insert into public.egg_object_sphere_results(node_id,sphere,level,iteration,result,operational_activation_id)
 values(target_id,sp,lvl,it,jsonb_build_object('status',a.status,'source_event_id',e.id,'evidence_status',e.evidence_status,'finding',a.finding),a.id)
 on conflict(operational_activation_id) do update set result=excluded.result where egg_object_sphere_results.result is distinct from excluded.result;
end $function$
; update public.egg_object_activation_links l set node_id=n.id,level=n.level from public.egg_operational_activations a join public.egg_operational_events e on e.id=a.event_id join public.egg_object_nodes n on n.id::text=e.facts->>'node_id' join public.egg_passport_registry r on r.id=n.root_passport_id and r.source_project_id=e.operational_project_id and r.source_kind='operational' where l.activation_id=a.id and e.source='egg_object_research_v1' and a.status='pending' and not exists(select 1 from public.egg_object_sphere_results s where s.operational_activation_id=a.id);
