-- Read-only RPC: liefert alle CMS-Assets mit Page-/Section-Kontext für die
-- Bildredaktion-Workbench im Admin. Kein Schreibzugriff.
CREATE OR REPLACE FUNCTION public.rpc_admin_read_assets_overview()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'asset_no', a.asset_no,
        'page_key', a.page_key,
        'section_key', a.section_key,
        'field_key', a.field_key,
        'asset_role', a.asset_role,
        'viewport', a.viewport,
        'storage_path', a.storage_path,
        'public_url', a.public_url,
        'file_name', a.file_name,
        'mime_type', a.mime_type,
        'alt_de', a.alt_de,
        'alt_en', a.alt_en,
        'is_active', a.is_active,
        'updated_at', a.updated_at,
        'page_title_de', p.title_de,
        'page_title_en', p.title_en,
        'page_status', p.status,
        'page_is_active', p.is_active,
        'page_route_path', p.route_path,
        'section_type', s.section_type,
        'section_is_active', s.is_active
      )
      ORDER BY a.page_key, a.section_key, a.field_key, a.viewport, a.is_active DESC, a.updated_at DESC
    ),
    '[]'::jsonb
  )
  FROM public.cms_assets a
  LEFT JOIN public.cms_pages p ON p.page_key = a.page_key
  LEFT JOIN public.cms_sections s
    ON s.page_key = a.page_key AND s.section_key = a.section_key;
$function$;
