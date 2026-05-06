UPDATE storage.objects
SET metadata = jsonb_set(metadata, '{mimetype}', '"model/vnd.usdz+zip"')
WHERE bucket_id = 'models' AND name LIKE '%.usdz';

UPDATE storage.objects
SET metadata = jsonb_set(metadata, '{mimetype}', '"model/gltf-binary"')
WHERE bucket_id = 'models' AND name LIKE '%.glb';