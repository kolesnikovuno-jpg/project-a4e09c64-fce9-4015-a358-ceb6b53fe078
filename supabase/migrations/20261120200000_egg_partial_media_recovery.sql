-- Owner-scoped partial media recovery without modifying the live Field snapshot.
-- Stores independently copied images from the same owner's older EGG projects.
CREATE TABLE IF NOT EXISTS public.egg_field_recovery_media (
  project_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  filename text NOT NULL,
  source_project_id uuid NOT NULL,
  card jsonb NOT NULL,
  recovered_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(project_id, filename),
  CONSTRAINT egg_field_recovery_owner_fk FOREIGN KEY(project_id,owner_id)
    REFERENCES public.egg_engine_projects(id,owner_id) ON DELETE CASCADE,
  CONSTRAINT egg_field_recovery_card_is_image CHECK (
    jsonb_typeof(card)='object' AND card->>'type'='image'
    AND LEFT(COALESCE(card->>'src',''),10)='data:image'
  ),
  CONSTRAINT egg_field_recovery_limit CHECK(octet_length(card::text) <= 900000)
);
ALTER TABLE public.egg_field_recovery_media ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.egg_field_recovery_media TO authenticated;
DROP POLICY IF EXISTS "Read only own recovered images" ON public.egg_field_recovery_media;
CREATE POLICY "Read only own recovered images"
 ON public.egg_field_recovery_media FOR SELECT TO authenticated USING(owner_id=auth.uid());
