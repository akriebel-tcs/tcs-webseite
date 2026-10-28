-- Sprint 1b: Read-only Diagnose-RPC für Contract-Drift-Audit.
-- SECURITY DEFINER, stable, kein INSERT/UPDATE/DELETE. Gibt nur CMS-Light-Lesedaten zurück.
-- Idempotent: CREATE OR REPLACE.

CREATE OR REPLACE FUNCTION public.rpc_admin_export_contract_drift()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'generated_at', now(),
    'pages', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'page_key', page_key,
        'route_path', route_path,
        'page_type', page_type,
        'status', status,
        'is_active', is_active
      ) ORDER BY page_key)
      FROM public.cms_pages
    ), '[]'::jsonb),
    'sections', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'page_key', page_key,
        'section_key', section_key,
        'section_type', section_type,
        'parent_section_id', parent_section_id,
        'id', id,
        'sort_order', sort_order,
        'is_active', is_active
      ) ORDER BY page_key, sort_order, section_key)
      FROM public.cms_sections
    ), '[]'::jsonb),
    'section_fields', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'page_key', page_key,
        'section_key', section_key,
        'field_key', field_key,
        'locale', locale,
        'has_value', (value IS NOT NULL AND length(value) > 0) OR value_json IS NOT NULL
      ) ORDER BY page_key, section_key, field_key, locale)
      FROM public.cms_section_fields
    ), '[]'::jsonb),
    'assets', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'page_key', page_key,
        'section_key', section_key,
        'asset_role', asset_role,
        'field_key', field_key,
        'locale', locale,
        'viewport', viewport,
        'is_active', is_active
      ) ORDER BY page_key, section_key, field_key NULLS LAST, asset_role)
      FROM public.cms_assets
    ), '[]'::jsonb),
    'editable_fields', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'page_key', page_key,
        'section_key', section_key,
        'field_key', field_key,
        'locale', locale,
        'is_enabled', is_enabled
      ) ORDER BY page_key, section_key, field_key, locale)
      FROM public.cms_admin_editable_fields
    ), '[]'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION public.rpc_admin_export_contract_drift() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_admin_export_contract_drift() TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.rpc_admin_export_contract_drift() IS
  'Sprint 1b: Read-only Diagnose-RPC für aggregiertes Contract-Drift-Audit. Liefert kompakte Strukturdaten aus cms_pages/sections/section_fields/assets/admin_editable_fields. Keine Werte, keine Storage-Inhalte, keine Mutationen.';
