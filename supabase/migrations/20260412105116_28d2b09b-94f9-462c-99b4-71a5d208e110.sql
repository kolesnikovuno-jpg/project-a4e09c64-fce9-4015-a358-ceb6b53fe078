
INSERT INTO storage.buckets (id, name, public)
VALUES ('models', 'models', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access for models"
ON storage.objects
FOR SELECT
USING (bucket_id = 'models');

CREATE POLICY "Authenticated users can upload models"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'models' AND auth.role() = 'authenticated');
