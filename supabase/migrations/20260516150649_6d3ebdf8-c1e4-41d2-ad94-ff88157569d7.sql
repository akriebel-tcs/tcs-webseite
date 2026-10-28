CREATE OR REPLACE FUNCTION public.rpc_admin_read_page_sections(p_page_key text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'page_key', s.page_key,
        'section_key', s.section_key,
        'section_type', s.section_type,
        'section_no', s.section_no,
        'section_uid', s.section_uid,
        'sort_order', s.sort_order,
        'is_active', s.is_active,
        'parent_section_id', s.parent_section_id,
        'parent_section_key', p.section_key,
        'updated_at', s.updated_at,
        'display_label_de', (
          SELECT f.value
          FROM public.cms_section_fields f
          WHERE f.page_key = s.page_key
            AND f.section_key = s.section_key
            AND f.locale = 'de'
            AND f.value IS NOT NULL
            AND length(btrim(f.value)) > 0
            AND f.field_key IN ('eyebrow','headline','title','label','intro')
          ORDER BY array_position(
            ARRAY['eyebrow','headline','title','label','intro']::text[],
            f.field_key
          )
          LIMIT 1
        )
      )
      ORDER BY s.sort_order, s.section_key
    ),
    '[]'::jsonb
  )
  FROM public.cms_sections s
  LEFT JOIN public.cms_sections p ON p.id = s.parent_section_id
  WHERE s.page_key = p_page_key;
$function$;