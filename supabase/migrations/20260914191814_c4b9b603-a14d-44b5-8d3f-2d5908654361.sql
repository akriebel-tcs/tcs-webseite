CREATE OR REPLACE FUNCTION public.rpc_internal_cms_schema_snapshot()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  WITH scope AS (
    SELECT c.oid, c.relname::text AS table_name, c.relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r','v','m')
      AND c.relname LIKE 'cms\_%'
      AND c.relname NOT IN ('cms_provider_credentials','cms_provider_credential_audit')
  ),
  routines AS (
    SELECT p.oid, p.proname::text AS name, p.prosecdef, p.provolatile, p.proacl
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND (p.proname LIKE 'cms\_%' OR p.proname LIKE 'rpc\_admin\_%' OR p.proname LIKE 'rpc\_internal\_%')
  ),
  trigger_fns AS (
    SELECT DISTINCT t.tgfoid AS oid
    FROM pg_trigger t
    JOIN scope s ON s.oid = t.tgrelid
    WHERE NOT t.tgisinternal
  )
  SELECT jsonb_build_object(
    'generated_at', now(),
    'source', 'pg_catalog/information_schema (live)',
    'scope_note', 'Nur public.cms_* ohne Anbieter-Zugangsdaten. Keine Zeilendaten. Kein pg_dump.',
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
            'identity', a.attidentity,
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
        'rls_forced', (SELECT c2.relforcerowsecurity FROM pg_class c2 WHERE c2.oid = s.oid),
        'policies', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'name', p.polname,
            'command', p.polcmd,
            'permissive', p.polpermissive,
            'kind', CASE WHEN p.polpermissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
            'applies_to_public', (0 = ANY(p.polroles)),
            'roles', CASE
              WHEN 0 = ANY(p.polroles) THEN '["PUBLIC"]'::jsonb
              ELSE (SELECT COALESCE(jsonb_agg(r.rolname ORDER BY r.rolname), '[]'::jsonb)
                    FROM pg_roles r WHERE r.oid = ANY(p.polroles))
            END,
            'using', pg_get_expr(p.polqual, p.polrelid),
            'check', pg_get_expr(p.polwithcheck, p.polrelid)
          ) ORDER BY p.polname), '[]'::jsonb)
          FROM pg_policy p WHERE p.polrelid = s.oid
        ),
        'triggers', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'name', t.tgname,
            'definition', pg_get_triggerdef(t.oid, true),
            'function', (SELECT tp.proname FROM pg_proc tp WHERE tp.oid = t.tgfoid),
            'enabled', t.tgenabled
          ) ORDER BY t.tgname), '[]'::jsonb)
          FROM pg_trigger t WHERE t.tgrelid = s.oid AND NOT t.tgisinternal
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
    'enum_types', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'name', t.typname,
        'labels', (SELECT COALESCE(jsonb_agg(e.enumlabel ORDER BY e.enumsortorder), '[]'::jsonb)
                   FROM pg_enum e WHERE e.enumtypid = t.oid)
      ) ORDER BY t.typname), '[]'::jsonb)
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typtype = 'e'
    ),
    'sequences', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'name', sq.sequencename,
        'data_type', sq.data_type::text,
        'start_value', sq.start_value,
        'increment_by', sq.increment_by,
        'min_value', sq.min_value,
        'max_value', sq.max_value,
        'cycle', sq.cycle,
        'last_value', sq.last_value
      ) ORDER BY sq.sequencename), '[]'::jsonb)
      FROM pg_sequences sq WHERE sq.schemaname = 'public'
    ),
    'trigger_functions', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'name', p.proname,
        'security_definer', p.prosecdef,
        'definition', CASE
          WHEN p.proname ~ '(secret|credential|vault|password)' THEN NULL
          ELSE pg_get_functiondef(p.oid) END,
        'definition_withheld_reason', CASE
          WHEN p.proname ~ '(secret|credential|vault|password)'
          THEN 'Zugangsdaten-nah: Quelltext bewusst nicht exportiert.' ELSE NULL END
      ) ORDER BY p.proname), '[]'::jsonb)
      FROM trigger_fns tf JOIN pg_proc p ON p.oid = tf.oid
    ),
    'routines', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'name', r.name,
        'signature', pg_get_function_identity_arguments(r.oid),
        'returns', pg_get_function_result(r.oid),
        'security_definer', r.prosecdef,
        'volatility', r.provolatile,
        'execute_grants', (
          SELECT COALESCE(jsonb_agg(DISTINCT jsonb_build_object(
            'grantee', CASE WHEN acl.grantee = 0 THEN 'PUBLIC'
                            ELSE (SELECT g.rolname FROM pg_roles g WHERE g.oid = acl.grantee) END,
            'privilege', acl.privilege_type
          )), '[]'::jsonb)
          FROM aclexplode(COALESCE(r.proacl, acldefault('f', (SELECT proowner FROM pg_proc WHERE oid = r.oid)))) AS acl
        ),
        'definition', CASE
          WHEN r.name ~ '(secret|credential|vault|password)' THEN NULL
          ELSE pg_get_functiondef(r.oid) END,
        'definition_withheld_reason', CASE
          WHEN r.name ~ '(secret|credential|vault|password)'
          THEN 'Zugangsdaten-nah: Quelltext bewusst nicht exportiert.' ELSE NULL END
      ) ORDER BY r.name, pg_get_function_identity_arguments(r.oid)), '[]'::jsonb)
      FROM routines r
    )
  );
$function$;

REVOKE ALL ON FUNCTION public.rpc_internal_cms_schema_snapshot() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_internal_cms_schema_snapshot() FROM anon;
REVOKE ALL ON FUNCTION public.rpc_internal_cms_schema_snapshot() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_internal_cms_schema_snapshot() TO service_role;