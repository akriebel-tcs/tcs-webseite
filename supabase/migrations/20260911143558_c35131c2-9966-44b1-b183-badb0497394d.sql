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
             'value', f.value,
             'review_status', f.review_status
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