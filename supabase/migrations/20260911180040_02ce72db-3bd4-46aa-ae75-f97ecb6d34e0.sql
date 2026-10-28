CREATE OR REPLACE FUNCTION public.rpc_admin_list_translation_units(p_target_locale text, p_areas text[] DEFAULT NULL::text[], p_status text DEFAULT 'alle'::text, p_page_key text DEFAULT NULL::text, p_search text DEFAULT NULL::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '25s'
AS $function$
DECLARE
  v jsonb;
  v_limit int := greatest(1, least(coalesce(p_limit, 50), 200));
  v_offset int := greatest(0, coalesce(p_offset, 0));
  v_status text := lower(coalesce(nullif(btrim(p_status), ''), 'alle'));
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
BEGIN
  IF p_target_locale IS NULL OR p_target_locale = 'de' THEN
    RETURN jsonb_build_object('error', 'target_locale_invalid');
  END IF;

  WITH u AS (
    SELECT * FROM public.cms_translation_units(
      p_target_locale,
      CASE WHEN p_page_key IS NULL OR btrim(p_page_key) = '' THEN NULL ELSE ARRAY[p_page_key] END,
      p_areas)
  ),
  searched AS (
    SELECT * FROM u
     WHERE v_search IS NULL
        OR source_text ILIKE '%' || v_search || '%'
        OR coalesce(target_value, '') ILIKE '%' || v_search || '%'
        OR page_key ILIKE '%' || v_search || '%'
        OR unit_key ILIKE '%' || v_search || '%'
  ),
  filtered AS (
    SELECT * FROM searched
     WHERE CASE v_status
             WHEN 'alle' THEN true
             WHEN 'fehlt' THEN coalesce(btrim(target_value), '') = ''
             WHEN 'vorhanden' THEN coalesce(btrim(target_value), '') <> ''
                                   AND target_status <> 'maschinell_veraltet'
             WHEN 'maschinell' THEN target_status = 'maschinell'
             WHEN 'veraltet' THEN target_status = 'maschinell_veraltet'
             WHEN 'geprueft' THEN target_status = 'geprueft'
             WHEN 'offen' THEN is_todo
             WHEN 'gesperrt' THEN NOT whitelisted
             ELSE true
           END
  )
  SELECT jsonb_build_object(
    'target_locale', p_target_locale,
    'total', (SELECT count(*) FROM filtered),
    'total_unfiltered', (SELECT count(*) FROM u),
    'counts', jsonb_build_object(
      'fehlt', (SELECT count(*) FROM searched WHERE coalesce(btrim(target_value), '') = ''),
      'vorhanden', (SELECT count(*) FROM searched
                     WHERE coalesce(btrim(target_value), '') <> ''
                       AND target_status <> 'maschinell_veraltet'),
      'maschinell', (SELECT count(*) FROM searched WHERE target_status = 'maschinell'),
      'veraltet', (SELECT count(*) FROM searched WHERE target_status = 'maschinell_veraltet'),
      'geprueft', (SELECT count(*) FROM searched WHERE target_status = 'geprueft'),
      'offen', (SELECT count(*) FROM searched WHERE is_todo),
      'gesperrt', (SELECT count(*) FROM searched WHERE NOT whitelisted)
    ),
    'by_area', (SELECT coalesce(jsonb_object_agg(area, n), '{}'::jsonb)
                  FROM (SELECT area, count(*) AS n FROM searched GROUP BY area) a),
    'limit', v_limit,
    'offset', v_offset,
    'items', (SELECT coalesce(jsonb_agg(jsonb_build_object(
                       'area', area,
                       'ref_id', ref_id,
                       'ref_key', ref_key,
                       'page_key', page_key,
                       'section_key', section_key,
                       'unit_key', unit_key,
                       'label', label,
                       'source_text', source_text,
                       'source_hash', source_hash,
                       'target_value', target_value,
                       'target_status', target_status,
                       'whitelisted', whitelisted,
                       'is_todo', is_todo
                     ) ORDER BY sort_a, sort_b, sort_c), '[]'::jsonb)
                FROM (SELECT * FROM filtered
                       ORDER BY sort_a, sort_b, sort_c
                       LIMIT v_limit OFFSET v_offset) p)
  ) INTO v;

  RETURN v;
END;
$function$;