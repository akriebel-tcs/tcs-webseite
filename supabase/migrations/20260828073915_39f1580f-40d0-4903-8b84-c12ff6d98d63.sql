DO $$
BEGIN
  -- idempotent: alte Varianten entfernen
  DROP POLICY IF EXISTS "cms_assets_anon_insert" ON storage.objects;
  DROP POLICY IF EXISTS "cms_assets_anon_update" ON storage.objects;
  DROP POLICY IF EXISTS "cms_assets_anon_delete" ON storage.objects;
END $$;

CREATE POLICY "cms_assets_anon_insert"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'cms-assets');

CREATE POLICY "cms_assets_anon_update"
ON storage.objects FOR UPDATE TO anon
USING (bucket_id = 'cms-assets')
WITH CHECK (bucket_id = 'cms-assets');

CREATE POLICY "cms_assets_anon_delete"
ON storage.objects FOR DELETE TO anon
USING (bucket_id = 'cms-assets');