-- Preserve earlier eight-sphere findings when a new reference set starts.
-- Reuse owner-only history storage rather than overwriting external studies.
ALTER TABLE public.egg_workspace_snapshot_history
 DROP CONSTRAINT egg_workspace_snapshot_history_field_scope;
ALTER TABLE public.egg_workspace_snapshot_history
 ADD CONSTRAINT egg_workspace_snapshot_history_field_scope CHECK (scope IN ('field','exterior'));
ALTER TABLE public.egg_workspace_snapshot_history
 DROP CONSTRAINT egg_workspace_snapshot_history_nonempty;
ALTER TABLE public.egg_workspace_snapshot_history
 ADD CONSTRAINT egg_workspace_snapshot_history_nonempty CHECK (
  (scope='field' AND jsonb_typeof(payload)='array' AND jsonb_array_length(payload)>0)
  OR (scope='exterior' AND jsonb_typeof(payload)='object'
      AND jsonb_array_length(COALESCE(payload->'findings','[]'::jsonb))>0)
 );
CREATE OR REPLACE FUNCTION public.egg_archive_exterior_snapshot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
BEGIN
 IF OLD.scope='exterior' AND OLD.payload IS DISTINCT FROM NEW.payload
   AND jsonb_typeof(OLD.payload)='object'
   AND jsonb_array_length(COALESCE(OLD.payload->'findings','[]'::jsonb))>0 THEN
  INSERT INTO public.egg_workspace_snapshot_history
    (project_id,owner_id,scope,revision,payload)
  VALUES(OLD.project_id,OLD.owner_id,OLD.scope,OLD.revision,OLD.payload)
  ON CONFLICT(project_id,scope,revision) DO NOTHING;
  DELETE FROM public.egg_workspace_snapshot_history h
   WHERE h.project_id=OLD.project_id AND h.scope='exterior'
     AND h.revision NOT IN(
       SELECT v.revision FROM public.egg_workspace_snapshot_history v
       WHERE v.project_id=OLD.project_id AND v.scope='exterior'
       ORDER BY v.revision DESC LIMIT 4
     );
 END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS egg_archive_exterior_before_update ON public.egg_workspace_snapshots;
CREATE TRIGGER egg_archive_exterior_before_update
 BEFORE UPDATE OF payload ON public.egg_workspace_snapshots
 FOR EACH ROW EXECUTE FUNCTION public.egg_archive_exterior_snapshot();
