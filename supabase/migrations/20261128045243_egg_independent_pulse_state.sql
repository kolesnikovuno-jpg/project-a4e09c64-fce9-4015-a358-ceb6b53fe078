create table public.egg_object_pulse_state(node_id uuid primary key references public.egg_object_nodes(id) on delete cascade, fingerprint text not null, revision bigint not null default 1, diagnosis text not null, next_iteration text not null, changed_at timestamptz not null default now());
alter table public.egg_object_pulse_state enable row level security;
revoke all on public.egg_object_pulse_state from anon,authenticated;
create function passport_internal.scan_object_pulses() returns integer language plpgsql security definer set search_path='' as $$
declare changed integer;
begin
 insert into public.egg_object_pulse_state(node_id,fingerprint,diagnosis,next_iteration)
 select s.node_id,md5(jsonb_build_object('level',s.level,'goal',s.goal,'matrix',s.sphere_matrix,'gaps',s.information_gaps,'children',s.child_states,'handoffs',s.child_handoffs,'tasks',s.next_tasks,'state',s.synthesis_state)::text),s.synthesis_state,s.next_iteration
 from public.egg_yolk_synthesis_v1 s
 join public.egg_passport_registry r on r.id=s.root_passport_id where r.source_kind='operational'
 on conflict(node_id) do update set fingerprint=excluded.fingerprint,revision=egg_object_pulse_state.revision+1,diagnosis=excluded.diagnosis,next_iteration=excluded.next_iteration,changed_at=now()
 where egg_object_pulse_state.fingerprint is distinct from excluded.fingerprint;
 get diagnostics changed=row_count; return changed;
end $$;
revoke all on function passport_internal.scan_object_pulses() from public;
