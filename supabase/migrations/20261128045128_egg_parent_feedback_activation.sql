create or replace function passport_internal.queue_parent_research_feedback() returns trigger language plpgsql security definer set search_path='' as $$
declare project uuid; parent_level smallint; eid uuid;
begin
 if new.result->>'kind' is distinct from 'research_feedback' or new.result->>'sphere' not in ('retail','commerce') then return new; end if;
 select r.source_project_id,n.level into project,parent_level from public.egg_object_nodes n join public.egg_passport_registry r on r.id=n.root_passport_id where n.id=new.parent_id and r.source_kind='operational';
 if project is null then return new; end if;
 insert into public.egg_operational_events(operational_project_id,source,external_event_id,kind,observed_at,summary,evidence_status,facts)
 values(project,'egg_object_research_v1','child-feedback:'||new.id,'product_feedback',now(),'Внутренний сигнал: результат дочернего исследования требует проверки родительской конструкции','verified_source',jsonb_build_object('node_id',new.parent_id,'child_id',new.child_id,'handoff_id',new.id,'retry_sphere','design','approval_status','unapproved','research_feedback',new.result))
 on conflict do nothing returning id into eid;
 return new;
end $$;
revoke all on function passport_internal.queue_parent_research_feedback() from public;
create trigger egg_queue_parent_research_feedback after insert on public.egg_object_handoffs for each row execute function passport_internal.queue_parent_research_feedback();
