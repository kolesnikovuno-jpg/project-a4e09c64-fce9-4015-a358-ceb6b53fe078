create or replace function public.egg_publish_semantic_handoff() returns trigger language plpgsql set search_path='' as $$
begin
 insert into public.egg_object_handoffs(child_id,parent_id,level,result)
 select n.id,n.parent_id,n.level,jsonb_build_object('kind','semantic_synthesis','revision',new.revision,'approval_status','proposed','finding',new.result)
 from public.egg_object_nodes n where n.id=new.node_id and n.parent_id is not null
 and not exists(select 1 from public.egg_object_handoffs h where h.child_id=n.id and h.parent_id=n.parent_id and h.result->>'kind'='semantic_synthesis' and h.result->>'revision'=new.revision::text);
 return new;
end $$;
create trigger egg_semantic_handoff_after_insert after insert on public.egg_yolk_semantic_results for each row execute function public.egg_publish_semantic_handoff();

