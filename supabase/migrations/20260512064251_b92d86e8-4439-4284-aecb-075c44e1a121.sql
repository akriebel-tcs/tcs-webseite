
-- Etappe: Kurz-IDs in Read-RPCs sichtbar machen.
-- Idempotent: CREATE OR REPLACE der drei bestehenden SECURITY-DEFINER-Funktionen.

CREATE OR REPLACE FUNCTION public.rpc_admin_read_navigation_nodes()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', n.id,
        'node_no', n.node_no,
        'nav_area', n.nav_area,
        'node_key', n.node_key,
        'parent_id', n.parent_id,
        'parent_node_key', p.node_key,
        'page_key', n.page_key,
        'label', n.label,
        'label_de', n.label_de,
        'label_en', n.label_en,
        'description_de', n.description_de,
        'description_en', n.description_en,
        'node_type', n.node_type,
        'external_url', n.external_url,
        'route_path', n.route_path,
        'sort_order', n.sort_order,
        'is_active', n.is_active,
        'show_in_public_nav', n.show_in_public_nav
      )
      ORDER BY n.nav_area, n.sort_order, n.node_key
    ),
    '[]'::jsonb
  )
  FROM public.cms_navigation_nodes n
  LEFT JOIN public.cms_navigation_nodes p ON p.id = n.parent_id;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_admin_read_assets(p_page_key text)
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
        'storage_path', a.storage_path,
        'public_url', a.public_url,
        'file_name', a.file_name,
        'mime_type', a.mime_type,
        'alt_de', a.alt_de,
        'alt_en', a.alt_en,
        'is_active', a.is_active,
        'updated_at', a.updated_at
      ) ORDER BY a.section_key, a.field_key, a.is_active DESC, a.updated_at DESC
    ),
    '[]'::jsonb
  )
  FROM public.cms_assets a
  WHERE a.page_key = p_page_key;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_admin_read_pilot_pflege(p_page_key text DEFAULT 'anwendungen.pflege'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _page jsonb;
  _sections jsonb;
  _fields jsonb;
begin
  select to_jsonb(p) - 'title_de' - 'title_en' - 'id' - 'created_at' - 'updated_at'
    into _page
  from public.cms_pages p
  where p.page_key = p_page_key
  limit 1;

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'page_key', s.page_key,
             'section_key', s.section_key,
             'section_uid', s.section_uid,
             'section_no', s.section_no,
             'section_type', s.section_type,
             'sort_order', s.sort_order,
             'is_active', s.is_active
           )
           order by s.sort_order, s.section_key
         ), '[]'::jsonb)
    into _sections
  from public.cms_sections s
  where s.page_key = p_page_key;

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'page_key', f.page_key,
             'section_key', f.section_key,
             'field_key', f.field_key,
             'locale', f.locale,
             'value', f.value
           )
           order by f.section_key, f.field_key, f.locale
         ), '[]'::jsonb)
    into _fields
  from public.cms_section_fields f
  where f.page_key = p_page_key;

  return jsonb_build_object(
    'page', _page,
    'sections', _sections,
    'fields', _fields
  );
end;
$function$;
