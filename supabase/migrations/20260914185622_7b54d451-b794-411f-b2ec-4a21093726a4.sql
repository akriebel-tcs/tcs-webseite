-- Additive, rein lesende Struktur-Auskunft für den geschützten CMS-Export.
-- Keine Datenänderung, keine Policy-Änderung, kein generisches SQL.
CREATE OR REPLACE FUNCTION public.rpc_internal_cms_schema_snapshot()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
  WITH scope AS (
    SELECT c.oid, c.relname::text AS table_name, c.relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r','v','m')
      AND c.relname LIKE 'cms\_%'
      AND c.relname NOT IN ('cms_provider_credentials','cms_provider_credential_audit')
  )
  SELECT jsonb_build_object(
    'generated_at', now(),
    'source', 'pg_catalog/information_schema (live)',
    'scope_note', 'Nur public.cms_* ohne Anbieter-Zugangsdaten. Keine Zeilendaten.',
    'objects', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'name', s.table_name,
        'kind', CASE s.relkind WHEN 'r' THEN 'table' WHEN 'v' THEN 'view' ELSE 'matview' END,
        'columns', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'name', a.attname,
            'type', format_type(a.atttypid, a.atttypmod),
            'not_null', a.attnotnull,
            'default', pg_get_expr(ad.adbin, ad.adrelid),
            'position', a.attnum
          ) ORDER BY a.attnum), '[]'::jsonb)
          FROM pg_attribute a
          LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
          WHERE a.attrelid = s.oid AND a.attnum > 0 AND NOT a.attisdropped
        ),
        'constraints', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'name', con.conname,
            'type', con.contype,
            'definition', pg_get_constraintdef(con.oid)
          ) ORDER BY con.conname), '[]'::jsonb)
          FROM pg_constraint con WHERE con.conrelid = s.oid
        ),
        'indexes', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'name', ci.relname,
            'definition', pg_get_indexdef(i.indexrelid)
          ) ORDER BY ci.relname), '[]'::jsonb)
          FROM pg_index i
          JOIN pg_class ci ON ci.oid = i.indexrelid
          WHERE i.indrelid = s.oid
        ),
        'rls_enabled', (SELECT c2.relrowsecurity FROM pg_class c2 WHERE c2.oid = s.oid),
        'policies', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'name', p.polname,
            'command', p.polcmd,
            'roles', (SELECT COALESCE(jsonb_agg(r.rolname ORDER BY r.rolname), '[]'::jsonb)
                      FROM pg_roles r WHERE r.oid = ANY(p.polroles)),
            'using', pg_get_expr(p.polqual, p.polrelid),
            'check', pg_get_expr(p.polwithcheck, p.polrelid)
          ) ORDER BY p.polname), '[]'::jsonb)
          FROM pg_policy p WHERE p.polrelid = s.oid
        ),
        'grants', (
          SELECT COALESCE(jsonb_agg(DISTINCT jsonb_build_object(
            'grantee', g.grantee, 'privilege', g.privilege_type
          )), '[]'::jsonb)
          FROM information_schema.role_table_grants g
          WHERE g.table_schema = 'public' AND g.table_name = s.table_name
        ),
        'view_definition', CASE WHEN s.relkind IN ('v','m')
          THEN pg_get_viewdef(s.oid, true) ELSE NULL END
      ) ORDER BY s.table_name), '[]'::jsonb)
      FROM scope s
    ),
    'routines', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'name', p.proname,
        'signature', pg_get_function_identity_arguments(p.oid),
        'returns', pg_get_function_result(p.oid),
        'security_definer', p.prosecdef,
        'volatility', p.provolatile,
        'definition', CASE
          WHEN p.proname ~ '(secret|credential|vault|password)' THEN NULL
          ELSE pg_get_functiondef(p.oid) END,
        'definition_withheld_reason', CASE
          WHEN p.proname ~ '(secret|credential|vault|password)'
          THEN 'Zugangsdaten-nah: Quelltext bewusst nicht exportiert.' ELSE NULL END
      ) ORDER BY p.proname, pg_get_function_identity_arguments(p.oid)), '[]'::jsonb)
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND (p.proname LIKE 'cms\_%' OR p.proname LIKE 'rpc\_admin\_%' OR p.proname LIKE 'rpc\_internal\_%')
    )
  );
$$;

REVOKE ALL ON FUNCTION public.rpc_internal_cms_schema_snapshot() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_internal_cms_schema_snapshot() FROM anon;
REVOKE ALL ON FUNCTION public.rpc_internal_cms_schema_snapshot() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_internal_cms_schema_snapshot() TO service_role;

COMMENT ON FUNCTION public.rpc_internal_cms_schema_snapshot() IS
  'Read-only Live-Struktur der public.cms_*-Objekte für den geschützten Snapshot-Export. Nur service_role.';