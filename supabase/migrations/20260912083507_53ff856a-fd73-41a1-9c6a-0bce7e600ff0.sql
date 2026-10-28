CREATE OR REPLACE FUNCTION public.rpc_admin_locale_release_readiness(p_locale text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '60s'
AS $function$
DECLARE
  v_loc text := lower(btrim(coalesce(p_locale, '')));
  v_row public.cms_locales;
  v_payload jsonb;
  v_ui jsonb;
  v_content_total bigint := 0;
  v_content_missing bigint := 0;
  v_ui_total bigint := 0;
  v_ui_missing bigint := 0;
  v_area record;
BEGIN
  SELECT * INTO v_row FROM public.cms_locales WHERE locale = v_loc;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'locale_unknown');
  END IF;
  IF v_row.is_source THEN
    RETURN jsonb_build_object('success', true, 'locale', v_loc, 'is_source', true,
      'ready', true, 'content', '{}'::jsonb, 'ui', '{}'::jsonb);
  END IF;

  -- Schnell: gemeinsame, zwischengespeicherte Sprachstands-Uebersicht nutzen.
  PERFORM public.rpc_internal_translation_coverage_refresh_one(900, v_loc);

  SELECT c.payload INTO v_payload
    FROM public.cms_translation_coverage_locale_cache c
   WHERE c.locale = v_loc;

  IF v_payload IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'coverage_pending', 'locale', v_loc);
  END IF;

  FOR v_area IN SELECT key, value FROM jsonb_each(coalesce(v_payload->'by_area', '{}'::jsonb))
  LOOP
    IF v_area.key = 'ui_string' THEN
      v_ui := v_area.value;
      v_ui_total := coalesce((v_area.value->>'total')::bigint, 0);
      v_ui_missing := coalesce((v_area.value->>'todo')::bigint, 0)
                    + coalesce((v_area.value->>'stale')::bigint, 0);
    ELSE
      v_content_total := v_content_total + coalesce((v_area.value->>'total')::bigint, 0);
      v_content_missing := v_content_missing
                    + coalesce((v_area.value->>'todo')::bigint, 0)
                    + coalesce((v_area.value->>'stale')::bigint, 0);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'locale', v_loc,
    'is_source', false,
    'is_active', v_row.is_active,
    'is_public', v_row.is_public,
    'computed_at', (SELECT computed_at FROM public.cms_translation_coverage_locale_cache WHERE locale = v_loc),
    'content', jsonb_build_object('total', v_content_total, 'missing', v_content_missing),
    'ui', jsonb_build_object('total', v_ui_total, 'missing', v_ui_missing, 'detail', coalesce(v_ui, '{}'::jsonb)),
    'ready', (v_ui_total > 0 AND v_ui_missing = 0 AND v_content_missing = 0));
END;
$function$;

REVOKE ALL ON FUNCTION public.rpc_admin_locale_release_readiness(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_admin_locale_release_readiness(text) TO anon, authenticated, service_role;