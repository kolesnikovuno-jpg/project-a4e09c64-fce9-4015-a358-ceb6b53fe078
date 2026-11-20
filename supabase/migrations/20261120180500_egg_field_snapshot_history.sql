-- Preserve previous non-empty Field/Material card snapshots before any change.
-- All five chosen Matter cards share the owner's Field snapshot, so keeping
-- historical versions is essential when Safari evicts a local browser copy.
CREATE TABLE IF NOT EXISTS public.egg_workspace_snapshot_history (
  project_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  scope text NOT NULL,
  revision bigint NOT NULL,
  payload jsonb NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, scope, revision),
  CONSTRAINT egg_workspace_snapshot_history_project_owner_fk
    FOREIGN KEY (project_id, owner_id)
    REFERENCES public.egg_engine_projects(id,owner_id) ON DELETE CASCADE,
  CONSTRAINT egg_workspace_snapshot_history_field_scope
    CHECK (scope = 'field'),
  CONSTRAINT egg_workspace_snapshot_history_nonempty
    CHECK (jsonb_typeof(payload)='array' AND jsonb_array_length(payload)>0),
  CONSTRAINT egg_workspace_snapshot_history_payload_limit
    CHECK (octet_length(payload::text) <= 3000000)
);

ALTER TABLE public.egg_workspace_snapshot_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read own field history" ON public.egg_workspace_snapshot_history;
CREATE POLICY "Read own field history" ON public.egg_workspace_snapshot_history
  FOR SELECT TO authenticated USING (owner_id=auth.uid());

CREATE OR REPLACE FUNCTION public.egg_archive_field_snapshot()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
BEGIN
  IF OLD.scope = 'field'
     AND OLD.payload IS DISTINCT FROM NEW.payload
     AND jsonb_typeof(OLD.payload) = 'array'
     AND jsonb_array_length(OLD.payload) > 0 THEN
    INSERT INTO public.egg_workspace_snapshot_history
      (project_id, owner_id, scope, revision, payload)
    VALUES (OLD.project_id, OLD.owner_id, OLD.scope, OLD.revision, OLD.payload)
    ON CONFLICT (project_id,scope,revision) DO NOTHING;
    -- Keep the four most recent non-empty revisions per project.
    DELETE FROM public.egg_workspace_snapshot_history h
     WHERE h.project_id = OLD.project_id AND h.scope = 'field'
       AND h.revision NOT IN (
         SELECT v.revision
         FROM public.egg_workspace_snapshot_history v
         WHERE v.project_id=OLD.project_id AND v.scope='field'
         ORDER BY v.revision DESC LIMIT 4
       );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS egg_archive_field_before_update ON public.egg_workspace_snapshots;
CREATE TRIGGER egg_archive_field_before_update
  BEFORE UPDATE OF payload ON public.egg_workspace_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.egg_archive_field_snapshot();
