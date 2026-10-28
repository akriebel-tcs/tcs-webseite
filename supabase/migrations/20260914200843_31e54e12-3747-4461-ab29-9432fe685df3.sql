CREATE OR REPLACE FUNCTION public.rpc_internal_storage_inventory_page(p_after text DEFAULT NULL::text, p_limit integer DEFAULT 1000)
 RETURNS TABLE(object_path text, object_size bigint, mime_type text, etag text, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SECURITY INVOKER
 SET search_path TO 'public', 'storage', 'pg_temp'
AS $function$
  SELECT
    o.name::text,
    CASE
      WHEN o.metadata IS NOT NULL
       AND (o.metadata ? 'size')
       AND (o.metadata->>'size') ~ '^[0-9]+$'
      THEN (o.metadata->>'size')::bigint
      ELSE NULL
    END,
    CASE WHEN o.metadata IS NOT NULL THEN o.metadata->>'mimetype' ELSE NULL END,
    CASE WHEN o.metadata IS NOT NULL THEN o.metadata->>'eTag' ELSE NULL END,
    o.updated_at
  FROM storage.objects o
  WHERE o.bucket_id = 'cms-assets'
    AND (p_after IS NULL OR p_after = '' OR o.name > p_after)
  ORDER BY o.name ASC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 1000), 1), 1000)
$function$;

CREATE OR REPLACE FUNCTION public.rpc_internal_storage_inventory_summary()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SECURITY INVOKER
 SET search_path TO 'public', 'storage', 'pg_temp'
AS $function$
  SELECT jsonb_build_object(
    'bucket', 'cms-assets',
    'object_count', count(*),
    'total_bytes', COALESCE(sum(
      CASE
        WHEN o.metadata IS NOT NULL
         AND (o.metadata ? 'size')
         AND (o.metadata->>'size') ~ '^[0-9]+$'
        THEN (o.metadata->>'size')::bigint
        ELSE 0
      END
    ), 0),
    'invalid_size_count', count(*) FILTER (
      WHERE o.metadata IS NULL
         OR NOT (o.metadata ? 'size')
         OR (o.metadata->>'size') !~ '^[0-9]+$'
    ),
    'max_updated_at', max(o.updated_at)
  )
  FROM storage.objects o
  WHERE o.bucket_id = 'cms-assets'
$function$;

REVOKE ALL ON FUNCTION public.rpc_internal_storage_inventory_page(text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_internal_storage_inventory_page(text, integer) FROM anon;
REVOKE ALL ON FUNCTION public.rpc_internal_storage_inventory_page(text, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_internal_storage_inventory_page(text, integer) TO service_role;

REVOKE ALL ON FUNCTION public.rpc_internal_storage_inventory_summary() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_internal_storage_inventory_summary() FROM anon;
REVOKE ALL ON FUNCTION public.rpc_internal_storage_inventory_summary() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_internal_storage_inventory_summary() TO service_role;