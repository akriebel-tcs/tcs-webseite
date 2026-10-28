DROP POLICY IF EXISTS "cms_assets bucket anon insert" ON storage.objects;
DROP POLICY IF EXISTS "cms_assets bucket anon update" ON storage.objects;
DROP POLICY IF EXISTS "cms_assets bucket anon delete" ON storage.objects;

CREATE POLICY "cms_assets bucket authenticated insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'cms-assets');

CREATE POLICY "cms_assets bucket authenticated update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'cms-assets')
WITH CHECK (bucket_id = 'cms-assets');

CREATE POLICY "cms_assets bucket authenticated delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'cms-assets');