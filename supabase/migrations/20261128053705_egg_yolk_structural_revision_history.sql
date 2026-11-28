create table public.egg_yolk_synthesis_revisions (
 node_id uuid not null references public.egg_object_nodes(id) on delete cascade,
 revision bigint not null, fingerprint text not null, snapshot jsonb not null,
 created_at timestamptz not null default now(), primary key(node_id,revision)
);
alter table public.egg_yolk_synthesis_revisions enable row level security;
revoke all on public.egg_yolk_synthesis_revisions from anon,authenticated;
grant select on public.egg_yolk_synthesis_revisions to service_role;
create function passport_internal.capture_yolk_revision() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.egg_yolk_synthesis_revisions(node_id,revision,fingerprint,snapshot)
 select new.node_id,new.revision,new.fingerprint,jsonb_build_object('level',s.level,'goal',s.goal,'sphere_matrix',s.sphere_matrix,'information_gaps',s.information_gaps,'child_states',s.child_states,'child_handoffs',s.child_handoffs,'next_tasks',s.next_tasks,'diagnosis',s.synthesis_state,'next_iteration',s.next_iteration,'semantic_conflict_status','not_evaluated','approval_status','unapproved','synthesis_kind','structural')
 from public.egg_yolk_synthesis_v1 s where s.node_id=new.node_id
 on conflict(node_id,revision) do nothing;
 return new;
end $$;
revoke all on function passport_internal.capture_yolk_revision() from public;
create trigger egg_capture_yolk_revision after insert or update of revision on public.egg_object_pulse_state for each row execute function passport_internal.capture_yolk_revision();
update public.egg_object_pulse_state set revision=revision;
