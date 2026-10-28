-- Schnelles, rein lesendes Medieninventar über storage.objects (nur Bucket cms-assets).
-- Additiv: keine Änderung an Storage-Schema, Policies, Rechten oder Inhalten.

CREATE OR REPLACE FUNCTION public.rpc_internal_storage_inventory_page(
  p_after text DEFAULT NULL,
  p_limit integer DEFAULT 1000
)
RETURNS TABLE (
  object_path text,
  object_size bigint,
  mime_type text,
  etag text,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, storage, pg_temp
AS $$
  SELECT
    o.name::text,
    NULLIF(o.metadata->>'size', '')::bigint,
    o.metadata->>'mimetype',
    o.metadata->>'eTag',
    o.updated_at
  FROM storage.objects o
  WHERE o.bucket_id = 'cms-assets'
    AND o.metadata IS NOT NULL
    AND (o.metadata ? 'size')
    AND (p_after IS NULL OR p_after = '' OR o.name > p_after)
  ORDER BY o.name ASC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 1000), 1), 1000)
$$;

CREATE OR REPLACE FUNCTION public.rpc_internal_storage_inventory_summary()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, storage, pg_temp
AS $$
  SELECT jsonb_build_object(
    'bucket', 'cms-assets',
    'object_count', count(*),
    'total_bytes', COALESCE(sum(NULLIF(o.metadata->>'size', '')::bigint), 0),
    'max_updated_at', max(o.updated_at)
  )
  FROM storage.objects o
  WHERE o.bucket_id = 'cms-assets'
    AND o.metadata IS NOT NULL
    AND (o.metadata ? 'size')
$$;

REVOKE ALL ON FUNCTION public.rpc_internal_storage_inventory_page(text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_internal_storage_inventory_page(text, integer) FROM anon;
REVOKE ALL ON FUNCTION public.rpc_internal_storage_inventory_page(text, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_internal_storage_inventory_page(text, integer) TO service_role;

REVOKE ALL ON FUNCTION public.rpc_internal_storage_inventory_summary() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_internal_storage_inventory_summary() FROM anon;
REVOKE ALL ON FUNCTION public.rpc_internal_storage_inventory_summary() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_internal_storage_inventory_summary() TO service_role;

COMMENT ON FUNCTION public.rpc_internal_storage_inventory_page(text, integer) IS
  'Nur lesend: Seite des Medieninventars (Bucket cms-assets) per Keyset. Nur service_role.';
COMMENT ON FUNCTION public.rpc_internal_storage_inventory_summary() IS
  'Nur lesend: Summe/Anzahl/letzte Änderung des Medieninventars (Bucket cms-assets). Nur service_role.';