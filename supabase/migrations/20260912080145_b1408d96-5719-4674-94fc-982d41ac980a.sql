-- Suchhilfen: die Freigabeliste wurde bei jeder Berechnung komplett durchsucht.
CREATE INDEX IF NOT EXISTS idx_cms_admin_editable_fields_locale
  ON public.cms_admin_editable_fields (locale);
CREATE INDEX IF NOT EXISTS idx_cms_translation_unit_state_locale
  ON public.cms_translation_unit_state (locale, area);
CREATE INDEX IF NOT EXISTS idx_cms_assets_active
  ON public.cms_assets (is_active);

-- Zusammenfassung je Sprache
CREATE TABLE IF NOT EXISTS public.cms_translation_coverage_locale_cache (
  locale text PRIMARY KEY,
  payload jsonb NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  compute_ms integer NOT NULL DEFAULT 0,
  is_stale boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.cms_translation_coverage_locale_cache TO service_role;
ALTER TABLE public.cms_translation_coverage_locale_cache ENABLE ROW LEVEL SECURITY;

-- Eine Sprache berechnen (teuerster Einzelschritt, klar begrenzt)
CREATE OR REPLACE FUNCTION public.rpc_internal_translation_coverage_locale(p_locale text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '60s'
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
    -- Quelle: Gesamtmenge je Bereich (Referenz EN, weil die spaltenbasierten
    -- Bereiche nur für Nicht-Quellsprachen existieren).
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
    'columns_supported', (v_loc.is_source OR v_loc.locale IN ('en','pl')),
    'pending', false,
    'by_area', v_by_area
  );
END
$function$;

REVOKE ALL ON FUNCTION public.rpc_internal_translation_coverage_locale(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_internal_translation_coverage_locale(text) FROM anon;
REVOKE ALL ON FUNCTION public.rpc_internal_translation_coverage_locale(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_internal_translation_coverage_locale(text) TO service_role;

-- Genau eine fällige Sprache erneuern (inkrementelles Aufwärmen)
CREATE OR REPLACE FUNCTION public.rpc_internal_translation_coverage_refresh_one(
  p_max_age_seconds integer DEFAULT 900,
  p_locale text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '90s'
AS $function$
DECLARE
  v_target text;
  v_payload jsonb;
  v_t0 timestamptz;
  v_ms integer;
  v_max_age integer := greatest(coalesce(p_max_age_seconds, 900), 0);
BEGIN
  IF p_locale IS NOT NULL THEN
    v_target := lower(p_locale);
  ELSE
    SELECT l.locale INTO v_target
      FROM public.cms_locales l
      LEFT JOIN public.cms_translation_coverage_locale_cache c ON c.locale = l.locale
     WHERE c.locale IS NULL
        OR c.is_stale
        OR c.computed_at < now() - make_interval(secs => v_max_age)
     ORDER BY (c.locale IS NULL) DESC, l.is_source DESC, c.computed_at NULLS FIRST, l.sort_order
     LIMIT 1;
  END IF;

  IF v_target IS NULL THEN
    RETURN jsonb_build_object('refreshed', NULL);
  END IF;

  v_t0 := clock_timestamp();
  v_payload := public.rpc_internal_translation_coverage_locale(v_target);
  v_ms := (extract(epoch FROM clock_timestamp() - v_t0) * 1000)::int;

  IF v_payload ? 'error' THEN
    RETURN jsonb_build_object('refreshed', v_target, 'error', v_payload->>'error');
  END IF;

  INSERT INTO public.cms_translation_coverage_locale_cache
    (locale, payload, computed_at, compute_ms, is_stale, updated_at)
  VALUES (v_target, v_payload, now(), v_ms, false, now())
  ON CONFLICT (locale) DO UPDATE
     SET payload = excluded.payload,
         computed_at = excluded.computed_at,
         compute_ms = excluded.compute_ms,
         is_stale = false,
         updated_at = now();

  RETURN jsonb_build_object('refreshed', v_target, 'compute_ms', v_ms);
END
$function$;

REVOKE ALL ON FUNCTION public.rpc_internal_translation_coverage_refresh_one(integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_internal_translation_coverage_refresh_one(integer, text) FROM anon;
REVOKE ALL ON FUNCTION public.rpc_internal_translation_coverage_refresh_one(integer, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_internal_translation_coverage_refresh_one(integer, text) TO service_role;

-- Zusammengesetzte Antwort: immer schnell, erneuert höchstens eine Sprache
CREATE OR REPLACE FUNCTION public.rpc_internal_translation_coverage_cached(
  p_max_age_seconds integer DEFAULT 900,
  p_force boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '100s'
AS $function$
DECLARE
  v_areas text[] := ARRAY['section_field','page_title','nav_label','nav_description','asset_alt'];
  v_max_age integer := greatest(coalesce(p_max_age_seconds, 900), 0);
  v_locales jsonb := '[]'::jsonb;
  v_source jsonb := '{}'::jsonb;
  v_total bigint := 0;
  v_loc record;
  v_pending text[] := ARRAY[]::text[];
  v_oldest timestamptz;
  v_any_stale boolean := false;
  v_refresh jsonb;
BEGIN
  -- Höchstens eine Sprache je Aufruf neu berechnen (kein Zeitüberschuss).
  v_refresh := public.rpc_internal_translation_coverage_refresh_one(
    CASE WHEN coalesce(p_force, false) THEN 0 ELSE v_max_age END, NULL);

  FOR v_loc IN
    SELECT l.locale, l.label_de, l.is_active, l.is_source, l.is_public,
           c.payload, c.computed_at, c.is_stale
      FROM public.cms_locales l
      LEFT JOIN public.cms_translation_coverage_locale_cache c ON c.locale = l.locale
     ORDER BY l.sort_order, l.locale
  LOOP
    IF v_loc.payload IS NULL THEN
      v_pending := v_pending || v_loc.locale;
      v_locales := v_locales || jsonb_build_object(
        'locale', v_loc.locale, 'label_de', v_loc.label_de,
        'is_active', v_loc.is_active, 'is_source', v_loc.is_source,
        'is_public', v_loc.is_public,
        'total', 0, 'filled', 0, 'machine', 0, 'stale', 0, 'reviewed', 0,
        'todo', 0, 'not_whitelisted', 0, 'open_runs', 0, 'failed_jobs', 0,
        'columns_supported', (v_loc.is_source OR v_loc.locale IN ('en','pl')),
        'pending', true,
        'by_area', '{}'::jsonb);
      CONTINUE;
    END IF;

    v_locales := v_locales || (v_loc.payload || jsonb_build_object('pending', false));
    IF v_loc.is_source THEN
      v_source := coalesce(v_loc.payload->'by_area', '{}'::jsonb);
      v_total := coalesce((v_loc.payload->>'total')::bigint, 0);
    END IF;
    IF v_oldest IS NULL OR v_loc.computed_at < v_oldest THEN
      v_oldest := v_loc.computed_at;
    END IF;
    v_any_stale := v_any_stale OR coalesce(v_loc.is_stale, false);
  END LOOP;

  -- Falls die Quellsprache noch nicht berechnet ist: Gesamtmenge aus der
  -- ersten vorhandenen Sprache ableiten, damit keine Null-Anzeige entsteht.
  IF v_total = 0 THEN
    SELECT coalesce((c.payload->>'total')::bigint, 0), coalesce(c.payload->'by_area', '{}'::jsonb)
      INTO v_total, v_source
      FROM public.cms_translation_coverage_locale_cache c
      JOIN public.cms_locales l ON l.locale = c.locale AND NOT l.is_source
     ORDER BY c.computed_at DESC
     LIMIT 1;
    v_source := coalesce(v_source, '{}'::jsonb);
    IF v_source <> '{}'::jsonb THEN
      SELECT coalesce(jsonb_object_agg(e.key, (e.value->>'total')::bigint), '{}'::jsonb)
        INTO v_source FROM jsonb_each(v_source) e;
    END IF;
  ELSE
    SELECT coalesce(jsonb_object_agg(e.key, (e.value->>'total')::bigint), '{}'::jsonb)
      INTO v_source FROM jsonb_each(v_source) e;
  END IF;

  RETURN jsonb_build_object(
    'de_translatable_fields', coalesce(v_total, 0),
    'areas', to_jsonb(v_areas),
    'source_by_area', coalesce(v_source, '{}'::jsonb),
    'locales', v_locales,
    'cache', jsonb_build_object(
      'hit', (v_refresh->>'refreshed') IS NULL,
      'is_stale', v_any_stale OR array_length(v_pending, 1) > 0,
      'computed_at', coalesce(v_oldest, now()),
      'compute_ms', coalesce((v_refresh->>'compute_ms')::int, 0),
      'age_seconds', CASE WHEN v_oldest IS NULL THEN 0
                          ELSE floor(extract(epoch FROM now() - v_oldest))::int END,
      'refreshed_locale', v_refresh->>'refreshed',
      'pending_locales', to_jsonb(v_pending)
    ));
END
$function$;

REVOKE ALL ON FUNCTION public.rpc_internal_translation_coverage_cached(integer, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_internal_translation_coverage_cached(integer, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.rpc_internal_translation_coverage_cached(integer, boolean) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_internal_translation_coverage_cached(integer, boolean) TO service_role;

-- Veraltet-Markierung wirkt jetzt auf die Sprachzeilen
CREATE OR REPLACE FUNCTION public.cms_trg_coverage_invalidate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.cms_translation_coverage_locale_cache
     SET is_stale = true, updated_at = now()
   WHERE NOT is_stale;
  RETURN NULL;
END
$function$;

REVOKE ALL ON FUNCTION public.cms_trg_coverage_invalidate() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.rpc_internal_translation_coverage_invalidate()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  UPDATE public.cms_translation_coverage_locale_cache
     SET is_stale = true, updated_at = now()
$function$;

REVOKE ALL ON FUNCTION public.rpc_internal_translation_coverage_invalidate() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_internal_translation_coverage_invalidate() FROM anon;
REVOKE ALL ON FUNCTION public.rpc_internal_translation_coverage_invalidate() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_internal_translation_coverage_invalidate() TO service_role;