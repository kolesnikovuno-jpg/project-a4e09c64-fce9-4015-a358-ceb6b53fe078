-- Keep completed historical research rounds, not every partial 1/8 write.
CREATE OR REPLACE FUNCTION public.egg_archive_exterior_snapshot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
BEGIN
 IF OLD.scope='exterior' AND OLD.payload IS DISTINCT FROM NEW.payload
   AND jsonb_typeof(OLD.payload)='object'
   AND LENGTH(COALESCE(OLD.payload->>'idea',''))>0
   AND jsonb_array_length(COALESCE(OLD.payload->'findings','[]'::jsonb))=8 THEN
  INSERT INTO public.egg_workspace_snapshot_history
    (project_id,owner_id,scope,revision,payload)
  VALUES(OLD.project_id,OLD.owner_id,OLD.scope,OLD.revision,OLD.payload)
  ON CONFLICT(project_id,scope,revision) DO NOTHING;
  DELETE FROM public.egg_workspace_snapshot_history h
   WHERE h.project_id=OLD.project_id AND h.scope='exterior'
     AND h.revision NOT IN(
       SELECT v.revision FROM public.egg_workspace_snapshot_history v
       WHERE v.project_id=OLD.project_id AND v.scope='exterior'
       ORDER BY v.revision DESC LIMIT 12
     );
 END IF;
 RETURN NEW;
END;
$$;