-- 1) Kennzeichnung „veraltet" darf nichts blockieren: gesperrte Zeilen auslassen.
CREATE OR REPLACE FUNCTION public.cms_trg_coverage_invalidate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.cms_translation_coverage_locale_cache c
     SET is_stale = true, updated_at = now()
   WHERE c.locale IN (
     SELECT x.locale
       FROM public.cms_translation_coverage_locale_cache x
      WHERE NOT x.is_stale
      FOR UPDATE SKIP LOCKED);
  RETURN NULL;
END
$function$;

CREATE OR REPLACE FUNCTION public.rpc_internal_translation_coverage_invalidate()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.cms_translation_coverage_locale_cache c
     SET is_stale = true, updated_at = now()
   WHERE c.locale IN (
     SELECT x.locale
       FROM public.cms_translation_coverage_locale_cache x
      WHERE NOT x.is_stale
      FOR UPDATE SKIP LOCKED);
END
$function$;

-- 2) Höchstens eine schwere Neuberechnung gleichzeitig (kein Verbindungsstau).
CREATE OR REPLACE FUNCTION public.rpc_internal_translation_coverage_refresh_one(
  p_max_age_seconds integer DEFAULT 900, p_locale text DEFAULT NULL::text)
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
  IF NOT pg_try_advisory_xact_lock(hashtext('cms_translation_coverage_refresh')::bigint) THEN
    RETURN jsonb_build_object('refreshed', NULL, 'busy', true);
  END IF;

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

-- 3) Statusabruf rechnet nur noch auf ausdrücklichen Wunsch oder wenn eine
--    Sprache noch überhaupt keine gespeicherten Zahlen hat.
CREATE OR REPLACE FUNCTION public.rpc_internal_translation_coverage_cached(
  p_max_age_seconds integer DEFAULT 900, p_force boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '100s'
AS $function$
DECLARE
  v_areas text[] := ARRAY['section_field','page_title','nav_label','nav_description','asset_alt','ui_string'];
  v_max_age integer := greatest(coalesce(p_max_age_seconds, 900), 0);
  v_locales jsonb := '[]'::jsonb;
  v_source jsonb := '{}'::jsonb;
  v_total bigint := 0;
  v_loc record;
  v_pending text[] := ARRAY[]::text[];
  v_oldest timestamptz;
  v_any_stale boolean := false;
  v_refresh jsonb := '{}'::jsonb;
  v_missing boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.cms_locales l
     LEFT JOIN public.cms_translation_coverage_locale_cache c ON c.locale = l.locale
     WHERE c.locale IS NULL)
    INTO v_missing;

  IF coalesce(p_force, false) THEN
    v_refresh := public.rpc_internal_translation_coverage_refresh_one(0, NULL);
  ELSIF v_missing THEN
    v_refresh := public.rpc_internal_translation_coverage_refresh_one(v_max_age, NULL);
  ELSE
    v_refresh := jsonb_build_object('refreshed', NULL);
  END IF;

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

  IF v_total = 0 THEN
    SELECT coalesce((c.payload->>'total')::bigint, 0), coalesce(c.payload->'by_area', '{}'::jsonb)
      INTO v_total, v_source
      FROM public.cms_translation_coverage_locale_cache c
      JOIN public.cms_locales l ON l.locale = c.locale AND NOT l.is_source
     ORDER BY c.computed_at DESC
     LIMIT 1;
    v_source := coalesce(v_source, '{}'::jsonb);
  END IF;

  IF v_source <> '{}'::jsonb THEN
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
      'busy', coalesce((v_refresh->>'busy')::boolean, false),
      'is_stale', coalesce(v_any_stale, false) OR coalesce(array_length(v_pending, 1), 0) > 0,
      'computed_at', coalesce(v_oldest, now()),
      'compute_ms', coalesce((v_refresh->>'compute_ms')::int, 0),
      'age_seconds', CASE WHEN v_oldest IS NULL THEN 0
                          ELSE floor(extract(epoch FROM now() - v_oldest))::int END,
      'refreshed_locale', v_refresh->>'refreshed',
      'pending_locales', to_jsonb(v_pending)
    ));
END
$function$;

-- 4) Sichtbarkeitsschalter: kurze, idempotente Einzeländerung ohne schwere Arbeit.
CREATE OR REPLACE FUNCTION public.rpc_admin_set_locale_visibility(
  p_locale text, p_is_active boolean DEFAULT NULL::boolean,
  p_is_public boolean DEFAULT NULL::boolean, p_reason text DEFAULT NULL::text)
RETURNS TABLE(locale text, is_active boolean, is_public boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '15s'
SET lock_timeout TO '3s'
AS $function$
DECLARE
  v_locale text := lower(btrim(coalesce(p_locale, '')));
  v_row public.cms_locales;
  v_active boolean;
  v_public boolean;
  v_run uuid;
BEGIN
  IF v_locale = '' THEN
    RAISE EXCEPTION 'locale_required';
  END IF;

  SELECT * INTO v_row FROM public.cms_locales c WHERE c.locale = v_locale;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'locale_unknown';
  END IF;

  v_active := coalesce(p_is_active, v_row.is_active);
  v_public := coalesce(p_is_public, v_row.is_public);

  IF v_row.is_source THEN
    v_active := true;
    v_public := true;
  END IF;

  IF NOT v_active THEN
    v_public := false;
  END IF;

  IF v_active IS DISTINCT FROM v_row.is_active OR v_public IS DISTINCT FROM v_row.is_public THEN
    UPDATE public.cms_locales c
       SET is_active = v_active,
           is_public = v_public,
           updated_at = now()
     WHERE c.locale = v_locale;

    INSERT INTO public.cms_locale_visibility_audit
      (locale, was_active, was_public, is_active, is_public, reason)
    VALUES
      (v_locale, v_row.is_active, v_row.is_public, v_active, v_public,
       nullif(btrim(coalesce(p_reason, '')), ''));
  END IF;

  -- Die Vorbereitung der Zielsprache (Freischalten aller deutschen Textfelder)
  -- ist eine Massenoperation und laeuft bewusst NICHT hier, sondern im Schritt
  -- „Fehlende Texte pruefen" (rpc_internal_translation_prepare_and_dry_run).
  -- Der Schalter bleibt dadurch kurz und sperrfrei.

  -- Neu auf der Website sichtbar: fehlende/veraltete Texte serverseitig einplanen.
  IF v_active AND v_public AND NOT v_row.is_source AND NOT coalesce(v_row.is_public, false) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.cms_translation_runs r
       WHERE r.target_locale = v_locale
         AND r.status IN ('queued','running')
    ) THEN
      INSERT INTO public.cms_translation_runs
        (source_locale, target_locale, scope_kind, scope_signature, page_keys, provider, model, status)
      SELECT 'de', v_locale, 'locale', 'locale:' || v_locale, '{}',
             coalesce(r.provider, 'lovable_ai'), coalesce(r.model, 'google/gemini-3.6-flash'), 'queued'
        FROM (SELECT provider, model FROM public.cms_translation_provider_rates
               WHERE is_enabled AND is_default ORDER BY updated_at DESC LIMIT 1) r
      RETURNING id INTO v_run;

      IF v_run IS NULL THEN
        INSERT INTO public.cms_translation_runs
          (source_locale, target_locale, scope_kind, scope_signature, page_keys, provider, model, status)
        VALUES ('de', v_locale, 'locale', 'locale:' || v_locale, '{}',
                'lovable_ai', 'google/gemini-3.6-flash', 'queued')
        RETURNING id INTO v_run;
      END IF;
    END IF;
    PERFORM public.rpc_internal_translation_worker_arm();
  END IF;

  RETURN QUERY
    SELECT c.locale, c.is_active, c.is_public FROM public.cms_locales c WHERE c.locale = v_locale;
END;
$function$;