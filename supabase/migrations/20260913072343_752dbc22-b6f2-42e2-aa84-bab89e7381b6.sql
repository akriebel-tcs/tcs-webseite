-- 1) Sprachstand je Sprache: keine feste EN/PL-Liste mehr.
CREATE OR REPLACE FUNCTION public.rpc_internal_translation_coverage_locale(p_locale text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_loc record;
  v_by_area jsonb;
BEGIN
  SELECT l.locale, l.label_de, l.is_active, l.is_source, l.is_public
    INTO v_loc
    FROM public.cms_locales l
   WHERE l.locale = lower(coalesce(p_locale, ''));

  IF v_loc.locale IS NULL THEN
    RETURN jsonb_build_object('error', 'locale_unknown');
  END IF;

  IF v_loc.is_source THEN
    SELECT coalesce(jsonb_object_agg(a.area, jsonb_build_object(
             'total', a.n, 'filled', a.n, 'machine', 0, 'stale', 0,
             'reviewed', a.n, 'todo', 0, 'not_whitelisted', 0)), '{}'::jsonb)
      INTO v_by_area
      FROM (
        SELECT u.area, count(*)::bigint AS n
          FROM public.cms_translation_units('en', NULL, NULL) u
         GROUP BY u.area
      ) a;
  ELSE
    SELECT coalesce(jsonb_object_agg(x.area, jsonb_build_object(
             'total', x.total, 'filled', x.filled, 'machine', x.machine,
             'stale', x.stale, 'reviewed', x.reviewed, 'todo', x.todo,
             'not_whitelisted', x.not_whitelisted)), '{}'::jsonb)
      INTO v_by_area
      FROM (
        SELECT u.area,
               count(*)::bigint AS total,
               count(*) FILTER (WHERE coalesce(btrim(u.target_value), '') <> '')::bigint AS filled,
               count(*) FILTER (WHERE u.target_status = 'maschinell')::bigint AS machine,
               count(*) FILTER (WHERE u.target_status = 'maschinell_veraltet')::bigint AS stale,
               count(*) FILTER (WHERE u.target_status = 'geprueft')::bigint AS reviewed,
               count(*) FILTER (WHERE u.is_todo)::bigint AS todo,
               count(*) FILTER (WHERE NOT u.whitelisted)::bigint AS not_whitelisted
          FROM public.cms_translation_units(v_loc.locale, NULL, NULL) u
         GROUP BY u.area
      ) x;
  END IF;

  RETURN jsonb_build_object(
    'locale', v_loc.locale,
    'label_de', v_loc.label_de,
    'is_active', v_loc.is_active,
    'is_source', v_loc.is_source,
    'is_public', v_loc.is_public,
    'total', (SELECT coalesce(sum((e.value->>'total')::bigint), 0) FROM jsonb_each(v_by_area) e),
    'filled', (SELECT coalesce(sum((e.value->>'filled')::bigint), 0) FROM jsonb_each(v_by_area) e),
    'machine', (SELECT coalesce(sum((e.value->>'machine')::bigint), 0) FROM jsonb_each(v_by_area) e),
    'stale', (SELECT coalesce(sum((e.value->>'stale')::bigint), 0) FROM jsonb_each(v_by_area) e),
    'reviewed', (SELECT coalesce(sum((e.value->>'reviewed')::bigint), 0) FROM jsonb_each(v_by_area) e),
    'todo', (SELECT coalesce(sum((e.value->>'todo')::bigint), 0) FROM jsonb_each(v_by_area) e),
    'not_whitelisted', (SELECT coalesce(sum((e.value->>'not_whitelisted')::bigint), 0) FROM jsonb_each(v_by_area) e),
    'open_runs', (SELECT count(*) FROM public.cms_translation_runs r
                   WHERE r.target_locale = v_loc.locale
                     AND r.status IN ('queued','running','paused')),
    'failed_jobs', (SELECT count(*) FROM public.cms_translation_jobs j
                     WHERE j.target_locale = v_loc.locale AND j.status = 'failed'),
    -- Generisch: alle Bereiche werden über die Sprachtabellen gezählt,
    -- sobald die Sprache im CMS aktiv ist (kein EN/PL-Sonderweg mehr).
    'columns_supported', (v_loc.is_source OR v_loc.is_active),
    'pending', false,
    'by_area', v_by_area
  );
END;
$function$;

-- 2) Freigabereife: niemals veraltete Zahlen melden.
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
  v_ms integer;
  v_t0 timestamptz;
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

  PERFORM public.rpc_internal_translation_coverage_refresh_one(900, v_loc);

  SELECT c.payload, c.is_stale, c.computed_at
    INTO v_payload, v_stale, v_computed
    FROM public.cms_translation_coverage_locale_cache c
   WHERE c.locale = v_loc;

  -- Wahrheit vor Geschwindigkeit: veraltete oder fehlende Zusammenfassung wird
  -- hier frisch berechnet, damit die Freigabe nie auf alten Zahlen beruht.
  IF v_payload IS NULL
     OR coalesce(v_stale, true)
     OR v_computed IS NULL
     OR v_computed < now() - interval '15 minutes' THEN
    v_t0 := clock_timestamp();
    v_payload := public.rpc_internal_translation_coverage_locale(v_loc);
    v_ms := (extract(epoch FROM clock_timestamp() - v_t0) * 1000)::int;
    IF v_payload IS NULL OR v_payload ? 'error' THEN
      RETURN jsonb_build_object('success', false, 'error', 'coverage_pending', 'locale', v_loc);
    END IF;
    INSERT INTO public.cms_translation_coverage_locale_cache
      (locale, payload, computed_at, compute_ms, is_stale, updated_at)
    VALUES (v_loc, v_payload, now(), v_ms, false, now())
    ON CONFLICT (locale) DO UPDATE
       SET payload = excluded.payload,
           computed_at = excluded.computed_at,
           compute_ms = excluded.compute_ms,
           is_stale = false,
           updated_at = now();
    v_computed := now();
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

-- 3) Laufabschluss: erledigt nie über geplant; Plan wird abgeglichen.
CREATE OR REPLACE FUNCTION public.rpc_internal_translation_progress(
  p_run_id uuid,
  p_done integer,
  p_skipped integer,
  p_failed integer,
  p_model_calls integer,
  p_memory_hits integer,
  p_chars integer,
  p_cost numeric,
  p_cursor_page_key text,
  p_cursor_section_key text,
  p_cursor_field_key text,
  p_status text,
  p_error text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_run public.cms_translation_runs;
  v_before public.cms_translation_runs;
  v_status text := p_status;
  v_error text := p_error;
  v_open integer := 0;
  v_processed integer := 0;
  v_reset_cursor boolean := false;
  v_reconciled integer := 0;
  v_overshoot integer := 0;
BEGIN
  IF p_status IS NOT NULL
     AND p_status <> ALL (ARRAY['queued','running','paused','cancelled','done','error']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'status_invalid');
  END IF;

  SELECT * INTO v_before FROM public.cms_translation_runs WHERE id = p_run_id;
  IF v_before.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'run_not_found');
  END IF;

  IF v_status = 'done' THEN
    v_processed := greatest(coalesce(v_before.fields_done, 0) + greatest(coalesce(p_done, 0), 0), 0)
                 + greatest(coalesce(v_before.fields_skipped, 0) + greatest(coalesce(p_skipped, 0), 0), 0)
                 + greatest(coalesce(v_before.fields_failed, 0) + greatest(coalesce(p_failed, 0), 0), 0);
    v_open := public.rpc_internal_translation_open_units(p_run_id);

    IF v_open > 0 THEN
      IF coalesce(v_before.cursor_page_key, '') = ''
         AND coalesce(p_done, 0) + coalesce(p_skipped, 0) + coalesce(p_failed, 0) = 0 THEN
        v_status := 'done';
        v_error := 'incomplete_unresolved_units:' || v_open;
      ELSE
        v_status := 'running';
        v_reset_cursor := true;
        v_error := 'rescan_open_units:' || v_open;
      END IF;
    ELSIF v_processed < coalesce(v_before.fields_planned, 0) THEN
      v_reconciled := coalesce(v_before.fields_planned, 0) - v_processed;
    ELSIF v_processed > coalesce(v_before.fields_planned, 0) THEN
      -- Mehr verarbeitet als geplant (z. B. erneut geprüfte Einheiten nach
      -- einem Rescan): Plan nach oben abgleichen, damit nie über 100 % steht.
      v_overshoot := v_processed - coalesce(v_before.fields_planned, 0);
    END IF;
  END IF;

  UPDATE public.cms_translation_runs r
     SET fields_done = r.fields_done + greatest(coalesce(p_done, 0), 0),
         fields_skipped = r.fields_skipped + greatest(coalesce(p_skipped, 0), 0),
         fields_failed = r.fields_failed + greatest(coalesce(p_failed, 0), 0),
         batches_done = r.batches_done + CASE WHEN coalesce(p_done, 0) + coalesce(p_skipped, 0) + coalesce(p_failed, 0) > 0 THEN 1 ELSE 0 END,
         model_calls = r.model_calls + greatest(coalesce(p_model_calls, 0), 0),
         memory_hits = r.memory_hits + greatest(coalesce(p_memory_hits, 0), 0),
         chars_source = r.chars_source + greatest(coalesce(p_chars, 0), 0),
         cost_estimate = r.cost_estimate + greatest(coalesce(p_cost, 0), 0),
         cursor_page_key = CASE WHEN v_reset_cursor THEN NULL ELSE coalesce(p_cursor_page_key, r.cursor_page_key) END,
         cursor_section_key = CASE WHEN v_reset_cursor THEN NULL ELSE coalesce(p_cursor_section_key, r.cursor_section_key) END,
         cursor_field_key = CASE WHEN v_reset_cursor THEN NULL ELSE coalesce(p_cursor_field_key, r.cursor_field_key) END,
         fields_planned = CASE WHEN v_reconciled > 0 OR v_overshoot > 0
                               THEN greatest(v_processed, 0)
                               ELSE r.fields_planned END,
         status = coalesce(v_status, r.status),
         last_error = CASE
                        WHEN v_reconciled > 0
                          THEN 'plan_reconciled:' || v_reconciled || ' (bereits vorhandene Zieltexte, nichts mehr offen)'
                        WHEN v_overshoot > 0
                          THEN 'plan_reconciled_up:' || v_overshoot || ' (erneut geprüfte Einheiten)'
                        ELSE coalesce(v_error, r.last_error)
                      END,
         finished_at = CASE WHEN coalesce(v_status, r.status) IN ('done','cancelled','error')
                            THEN now() ELSE NULL END
   WHERE r.id = p_run_id
  RETURNING * INTO v_run;

  -- Sprachstand nach Abschluss sicher neu berechnen lassen.
  IF coalesce(v_status, v_run.status) IN ('done','cancelled','error') THEN
    UPDATE public.cms_translation_coverage_locale_cache c
       SET is_stale = true, updated_at = now()
     WHERE c.locale = v_run.target_locale AND NOT c.is_stale;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'run', to_jsonb(v_run),
    'open_units', v_open,
    'plan_reconciled', v_reconciled,
    'plan_reconciled_up', v_overshoot,
    'rescan', v_reset_cursor
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.rpc_internal_translation_progress(uuid,integer,integer,integer,integer,integer,integer,numeric,text,text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_internal_translation_progress(uuid,integer,integer,integer,integer,integer,integer,numeric,text,text,text,text,text) FROM anon;
REVOKE ALL ON FUNCTION public.rpc_internal_translation_progress(uuid,integer,integer,integer,integer,integer,integer,numeric,text,text,text,text,text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_internal_translation_progress(uuid,integer,integer,integer,integer,integer,integer,numeric,text,text,text,text,text) TO service_role;

REVOKE ALL ON FUNCTION public.rpc_internal_translation_coverage_locale(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_internal_translation_coverage_locale(text) FROM anon;
REVOKE ALL ON FUNCTION public.rpc_internal_translation_coverage_locale(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_internal_translation_coverage_locale(text) TO service_role;