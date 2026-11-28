alter table public.egg_operational_auto_runs
 alter column activation_id drop not null,
 add column operation_kind text not null default 'sphere',
 add column synthesis_node_id uuid,
 add column synthesis_revision bigint,
 add constraint egg_run_operation_target_check check (
 (operation_kind='sphere' and activation_id is not null and synthesis_node_id is null and synthesis_revision is null)
 or (operation_kind='yolk' and activation_id is null and synthesis_node_id is not null and synthesis_revision is not null)),
 add constraint egg_run_synthesis_revision_fk foreign key(synthesis_node_id,synthesis_revision) references public.egg_yolk_synthesis_revisions(node_id,revision);
create unique index egg_run_active_synthesis_unique on public.egg_operational_auto_runs(synthesis_node_id,synthesis_revision) where operation_kind='yolk' and status in ('claimed','proposed');
