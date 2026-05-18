-- The `models` bucket is public, so files are served via public URLs without
-- consulting RLS. The broad SELECT policy below only enabled directory listing,
-- which is not needed and exposes the file index to anyone.
DROP POLICY IF EXISTS "Public read access for models" ON storage.objects;