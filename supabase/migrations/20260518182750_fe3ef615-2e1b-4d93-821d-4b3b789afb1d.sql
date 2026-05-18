
-- 1) clarity-attachments: make private, restrict policies
UPDATE storage.buckets SET public = false WHERE id = 'clarity-attachments';

DROP POLICY IF EXISTS "Public read clarity attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload clarity attachments" ON storage.objects;

CREATE POLICY "Anon can upload to intake folder only"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (
  bucket_id = 'clarity-attachments'
  AND (storage.foldername(name))[1] = 'intake'
);

CREATE POLICY "Admins can read clarity attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'clarity-attachments'
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Service role manages clarity attachments"
ON storage.objects FOR ALL TO public
USING (bucket_id = 'clarity-attachments' AND auth.role() = 'service_role')
WITH CHECK (bucket_id = 'clarity-attachments' AND auth.role() = 'service_role');

-- 2) models: admins only can write
DROP POLICY IF EXISTS "Authenticated users can upload models" ON storage.objects;

CREATE POLICY "Admins can upload models"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'models' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update models"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'models' AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'models' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete models"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'models' AND has_role(auth.uid(), 'admin'::app_role));

-- 3) participation_requests: explicit admin-only read/update/delete
CREATE POLICY "Admins can read participation requests"
ON public.participation_requests FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update participation requests"
ON public.participation_requests FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete participation requests"
ON public.participation_requests FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 4) Fix search_path on email queue helper functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, extensions;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, extensions;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, extensions;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, extensions;

-- 5) Revoke EXECUTE on internal email queue functions from public roles
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;
