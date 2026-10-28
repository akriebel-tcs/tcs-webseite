CREATE OR REPLACE FUNCTION public.rpc_admin_locale_release_readiness(p_locale text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_loc text := lower(btrim(coalesce(p_locale, '')));
  v_row public.cms_locales;
  v_payload jsonb;
  v_ui jsonb;
  v_stale boolean;
  v_computed timestamptz;
  v_content_total bigint := 0;
  v_content_missing bigint := 0;
  v_ui_total bigint := 0;
  v_ui_missing bigint := 0;
  v_ui_seen boolean := false;
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

  -- Bewusst KEINE teure Neuberechnung an dieser Stelle: die Prüfung muss in
  -- Millisekunden antworten. Neuberechnet wird über den Serverdienst
  -- (Zahlen neu berechnen / Sprachstand neu prüfen).
  SELECT c.payload, c.is_stale, c.computed_at
    INTO v_payload, v_stale, v_computed
    FROM public.cms_translation_coverage_locale_cache c
   WHERE c.locale = v_loc;

  IF v_payload IS NULL
     OR coalesce(v_stale, true)
     OR v_computed IS NULL
     OR v_computed < now() - interval '6 hours' THEN
    -- Sprache zur Neuberechnung vormerken und ehrlich „unbekannt" melden.
    INSERT INTO public.cms_translation_coverage_locale_cache
      (locale, payload, computed_at, compute_ms, is_stale, updated_at)
    VALUES (v_loc, coalesce(v_payload, '{}'::jsonb), coalesce(v_computed, now() - interval '1 day'), 0, true, now())
    ON CONFLICT (locale) DO UPDATE SET is_stale = true, updated_at = now();
    RETURN jsonb_build_object('success', false, 'error', 'coverage_pending', 'locale', v_loc);
  END IF;

  FOR v_area IN SELECT key, value FROM jsonb_each(coalesce(v_payload->'by_area', '{}'::jsonb))
  LOOP
    IF v_area.key = 'ui_string' THEN
      v_ui_seen := true;
      v_ui := v_area.value;
      v_ui_total := coalesce((v_area.value->>'total')::bigint, 0);
      v_ui_missing := greatest(v_ui_total - coalesce((v_area.value->>'filled')::bigint, 0), 0)
                    + coalesce((v_area.value->>'stale')::bigint, 0);
    ELSE
      v_content_total := v_content_total + coalesce((v_area.value->>'total')::bigint, 0);
      v_content_missing := v_content_missing
        + greatest(coalesce((v_area.value->>'total')::bigint, 0)
                   - coalesce((v_area.value->>'filled')::bigint, 0), 0)
        + coalesce((v_area.value->>'stale')::bigint, 0);
    END IF;
  END LOOP;

  IF NOT v_ui_seen THEN
    SELECT count(*)::bigint INTO v_ui_total FROM public.cms_ui_strings WHERE is_active;
    SELECT v_ui_total - count(*)::bigint INTO v_ui_missing
      FROM public.cms_ui_string_translations t
      JOIN public.cms_ui_strings s ON s.id = t.ui_string_id AND s.is_active
     WHERE t.locale = v_loc AND coalesce(btrim(t.value), '') <> '';
    v_ui_missing := greatest(coalesce(v_ui_missing, v_ui_total), 0);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'locale', v_loc,
    'is_source', false,
    'is_active', v_row.is_active,
    'is_public', v_row.is_public,
    'computed_at', v_computed,
    'by_area', coalesce(v_payload->'by_area', '{}'::jsonb),
    'content', jsonb_build_object('total', v_content_total, 'missing', v_content_missing),
    'ui', jsonb_build_object('total', v_ui_total, 'missing', v_ui_missing, 'detail', coalesce(v_ui, '{}'::jsonb)),
    'ready', (v_ui_total > 0 AND v_ui_missing = 0 AND v_content_missing = 0));
END;
$function$;