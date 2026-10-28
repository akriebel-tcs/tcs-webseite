-- Reactivate anon write access on the cms-assets bucket for the prototype /admin phase.
-- Will be replaced with role-based policies once Login/Admin-Rolle is introduced.

DROP POLICY IF EXISTS "cms_assets bucket anon insert" ON storage.objects;
DROP POLICY IF EXISTS "cms_assets bucket anon update" ON storage.objects;
DROP POLICY IF EXISTS "cms_assets bucket anon delete" ON storage.objects;

CREATE POLICY "cms_assets bucket anon insert"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'cms-assets');

CREATE POLICY "cms_assets bucket anon update"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'cms-assets')
WITH CHECK (bucket_id = 'cms-assets');

CREATE POLICY "cms_assets bucket anon delete"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'cms-assets');