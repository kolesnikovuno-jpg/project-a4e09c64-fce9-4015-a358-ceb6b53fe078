-- EGG: external eight-sphere studies are a distinct project-owned workspace.
-- They must not overwrite the accepted research map in scope='research'.
-- The table already enforces owner-scoped RLS and (project_id, owner_id)
-- project ownership constraints; this change only extends the scope enum.
ALTER TABLE public.egg_workspace_snapshots
  DROP CONSTRAINT IF EXISTS egg_workspace_snapshots_scope_check;
ALTER TABLE public.egg_workspace_snapshots
  ADD CONSTRAINT egg_workspace_snapshots_scope_check
  CHECK (scope = ANY (ARRAY[
    'idea'::text,'field'::text,'matter'::text,'research'::text,'exterior'::text
  ]));
