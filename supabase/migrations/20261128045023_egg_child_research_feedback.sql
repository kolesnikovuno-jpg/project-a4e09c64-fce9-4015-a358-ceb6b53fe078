create or replace function passport_internal.project_child_research_result() returns trigger language plpgsql security definer set search_path='' as $$
declare parent uuid; payload jsonb;
begin
 select parent_id into parent from public.egg_object_nodes where id=new.node_id;
 if parent is null or new.result->>'status' not in ('proposed','verified') then return new; end if;
 perform pg_advisory_xact_lock(hashtextextended(new.node_id::text||':child-research',0));
 payload:=jsonb_build_object('kind','research_feedback','approval_status','unapproved','source_result_id',new.id,'sphere',new.sphere,'iteration',new.iteration,'finding',new.result->'finding');
 if not exists(select 1 from public.egg_object_handoffs where child_id=new.node_id and parent_id=parent and result=payload) then
 insert into public.egg_object_handoffs(child_id,parent_id,level,result) values(new.node_id,parent,new.level,payload);
 end if;
 return new;
end $$;
revoke all on function passport_internal.project_child_research_result() from public;
create trigger egg_project_child_research_result after insert or update of result on public.egg_object_sphere_results for each row execute function passport_internal.project_child_research_result();
update public.egg_object_sphere_results set result=result where operational_activation_id='58beb621-0422-4d52-8f3a-004d5bc20222';
