-- 1) cms_navigation_nodes: RLS-Read-Policy nur für aktive Knoten
ALTER TABLE public.cms_navigation_nodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cms_navigation_nodes public read active" ON public.cms_navigation_nodes;
CREATE POLICY "cms_navigation_nodes public read active"
ON public.cms_navigation_nodes
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- 2) Storage-Bucket cms-assets: Listing schließen, Einzel-Read erlauben
-- Alte/zu offene SELECT-Policies auf dem Bucket entfernen
DROP POLICY IF EXISTS "cms-assets public read" ON storage.objects;
DROP POLICY IF EXISTS "cms-assets public select" ON storage.objects;
DROP POLICY IF EXISTS "Public read cms-assets" ON storage.objects;
DROP POLICY IF EXISTS "cms_assets_public_read" ON storage.objects;
DROP POLICY IF EXISTS "cms-assets read" ON storage.objects;

-- Single-object read by exact name (verhindert Listing über LIST/Prefix-Suchen mit leerem Pfad)
CREATE POLICY "cms-assets read single object"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'cms-assets'
  AND name IS NOT NULL
  AND length(name) > 0
);