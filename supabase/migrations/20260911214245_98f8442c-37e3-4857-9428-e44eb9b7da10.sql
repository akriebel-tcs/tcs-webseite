-- 1) Ruhezeit je Auftrag + getrennte Pause ---------------------------------
ALTER TABLE public.cms_translation_jobs
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS cms_translation_jobs_auto_due_idx
  ON public.cms_translation_jobs (target_locale, scheduled_at)
  WHERE batch_id = 'auto' AND status = 'pending';

ALTER TABLE public.cms_translation_autopilot
  ADD COLUMN IF NOT EXISTS is_paused boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS debounce_seconds integer NOT NULL DEFAULT 90;

ALTER TABLE public.cms_translation_autopilot DROP CONSTRAINT IF EXISTS cms_translation_autopilot_debounce_chk;
ALTER TABLE public.cms_translation_autopilot
  ADD CONSTRAINT cms_translation_autopilot_debounce_chk
  CHECK (debounce_seconds BETWEEN 5 AND 3600);

-- 2) Lauf nur anlegen, wenn die Verarbeitung nicht pausiert ist ------------
CREATE OR REPLACE FUNCTION public.cms_autopilot_ensure_run(p_locale text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
  v_provider text;
  v_model text;
  v_paused boolean;
BEGIN
  SELECT is_paused INTO v_paused FROM public.cms_translation_autopilot WHERE singleton;
  IF coalesce(v_paused, false) THEN
    RETURN NULL;  -- Planung läuft weiter, Verarbeitung ruht.
  END IF;

  SELECT id INTO v_id
    FROM public.cms_translation_runs
   WHERE scope_kind = 'auto'
     AND target_locale = p_locale
     AND status IN ('queued','running')
   ORDER BY created_at DESC
   LIMIT 1;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  SELECT r.provider, r.model INTO v_provider, v_model
    FROM public.cms_translation_provider_rates r
   WHERE r.is_enabled AND r.is_default
   ORDER BY r.updated_at DESC
   LIMIT 1;

  INSERT INTO public.cms_translation_runs
    (source_locale, target_locale, scope_kind, scope_signature, page_keys,
     provider, model, status)
  VALUES ('de', p_locale, 'auto', 'auto:' || p_locale, '{}',
     coalesce(v_provider, 'lovable_ai'), coalesce(v_model, 'google/gemini-3.6-flash'), 'queued')
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.cms_autopilot_ensure_run(text) FROM PUBLIC, anon, authenticated;

-- 3) Planung mit Ruhezeit; Markierung bleibt auch bei Pause aktiv ----------
CREATE OR REPLACE FUNCTION public.cms_autopilot_enqueue_unit(
  p_area text,
  p_ref_id uuid,
  p_page_key text,
  p_section_key text,
  p_unit_key text,
  p_source_text text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cfg public.cms_translation_autopilot;
  v_hash text;
  v_loc text;
  v_page text := coalesce(p_page_key, '~nav');
  v_section text := coalesce(nullif(p_section_key, ''), '-');
  v_field text;
  v_ref_key text;
  v_current text;
  v_status text;
  v_hash_target text;
  v_due timestamptz;
  v_queued boolean := false;
BEGIN
  SELECT * INTO v_cfg FROM public.cms_translation_autopilot WHERE singleton;
  IF NOT coalesce(v_cfg.is_enabled, false) THEN
    RETURN;
  END IF;

  IF NOT public.cms_text_is_translatable(p_source_text) THEN
    RETURN;
  END IF;
  IF p_area = 'section_field' AND NOT public.cms_field_is_translatable(p_unit_key) THEN
    RETURN;
  END IF;

  v_hash := public.cms_translation_hash(p_source_text);
  v_due := now() + make_interval(secs => coalesce(v_cfg.debounce_seconds, 90));
  v_field := CASE WHEN p_area = 'section_field'
                  THEN p_unit_key
                  ELSE p_area || ':' || coalesce(p_ref_id::text, v_page) || ':' || p_unit_key END;
  v_ref_key := CASE WHEN p_area = 'page_title' THEN p_page_key ELSE p_ref_id::text END;

  FOR v_loc IN
    SELECT l.locale FROM public.cms_locales l
     WHERE l.is_active AND l.is_public AND NOT l.is_source
     ORDER BY l.sort_order, l.locale
  LOOP
    IF p_area = 'section_field' THEN
      SELECT f.value, f.review_status, f.source_hash
        INTO v_current, v_status, v_hash_target
        FROM public.cms_section_fields f
       WHERE f.page_key = p_page_key AND f.section_key = p_section_key
         AND f.field_key = p_unit_key AND f.locale = v_loc;
      INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
      VALUES (p_page_key, p_section_key, p_unit_key, v_loc, true)
      ON CONFLICT (page_key, section_key, field_key, locale)
        DO UPDATE SET is_enabled = true, updated_at = now();
    ELSE
      SELECT s.review_status, s.source_hash INTO v_status, v_hash_target
        FROM public.cms_translation_unit_state s
       WHERE s.area = p_area AND s.ref_key = v_ref_key
         AND s.unit_key = p_unit_key AND s.locale = v_loc;
      v_current := CASE p_area
        WHEN 'page_title' THEN (SELECT coalesce(t.title, CASE v_loc WHEN 'en' THEN pg.title_en WHEN 'pl' THEN pg.title_pl END)
                                  FROM public.cms_pages pg
                                  LEFT JOIN public.cms_page_translations t ON t.page_id = pg.id AND t.locale = v_loc
                                 WHERE pg.page_key = p_page_key)
        WHEN 'nav_label' THEN (SELECT coalesce(t.label, CASE v_loc WHEN 'en' THEN n.label_en WHEN 'pl' THEN n.label_pl END)
                                 FROM public.cms_navigation_nodes n
                                 LEFT JOIN public.cms_navigation_node_translations t ON t.node_id = n.id AND t.locale = v_loc
                                WHERE n.id = p_ref_id)
        WHEN 'nav_description' THEN (SELECT coalesce(t.description, CASE v_loc WHEN 'en' THEN n.description_en WHEN 'pl' THEN n.description_pl END)
                                 FROM public.cms_navigation_nodes n
                                 LEFT JOIN public.cms_navigation_node_translations t ON t.node_id = n.id AND t.locale = v_loc
                                WHERE n.id = p_ref_id)
        ELSE (SELECT coalesce(t.alt_text, CASE v_loc WHEN 'en' THEN a.alt_en WHEN 'pl' THEN a.alt_pl END)
                FROM public.cms_assets a
                LEFT JOIN public.cms_asset_translations t ON t.asset_id = a.id AND t.locale = v_loc
               WHERE a.id = p_ref_id)
      END;
    END IF;

    IF coalesce(btrim(v_current), '') <> '' AND v_hash_target = v_hash THEN
      CONTINUE;
    END IF;

    IF coalesce(btrim(v_current), '') <> '' AND coalesce(v_status, 'geprueft') = 'geprueft' THEN
      INSERT INTO public.cms_translation_jobs
        (batch_id, page_key, section_key, field_key, target_locale, source_hash,
         status, last_error, area, ref_id, unit_key, source_text, scheduled_at)
      VALUES ('auto', v_page, v_section, v_field, v_loc, v_hash,
         'skipped_manual', 'manual_value_source_changed', p_area, p_ref_id, p_unit_key, p_source_text, now())
      ON CONFLICT (batch_id, page_key, section_key, field_key, target_locale)
        DO UPDATE SET source_hash = EXCLUDED.source_hash,
                      source_text = EXCLUDED.source_text,
                      status = 'skipped_manual',
                      last_error = 'manual_value_source_changed',
                      run_id = NULL,
                      updated_at = now();
      CONTINUE;
    END IF;

    -- Auftrag planen; Ruhezeit verschiebt bei erneuter Änderung nach hinten,
    -- sodass nur die letzte deutsche Fassung übersetzt wird.
    INSERT INTO public.cms_translation_jobs
      (batch_id, page_key, section_key, field_key, target_locale, source_hash,
       status, attempts, last_error, area, ref_id, unit_key, source_text, scheduled_at)
    VALUES ('auto', v_page, v_section, v_field, v_loc, v_hash,
       'pending', 0, NULL, p_area, p_ref_id, p_unit_key, p_source_text, v_due)
    ON CONFLICT (batch_id, page_key, section_key, field_key, target_locale)
      DO UPDATE SET source_hash = EXCLUDED.source_hash,
                    source_text = EXCLUDED.source_text,
                    status = 'pending',
                    attempts = 0,
                    last_error = NULL,
                    run_id = NULL,
                    scheduled_at = EXCLUDED.scheduled_at,
                    updated_at = now();
    v_queued := true;
    PERFORM public.cms_autopilot_ensure_run(v_loc);
  END LOOP;

  IF v_queued AND NOT coalesce(v_cfg.is_paused, false) THEN
    PERFORM public.rpc_internal_translation_worker_arm();
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.cms_autopilot_enqueue_unit(text, uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;

-- 4) Nächster Stapel: nur fällige Automatik-Aufträge, plus Wartehinweis ----
CREATE OR REPLACE FUNCTION public.rpc_internal_translation_next_batch(p_run_id uuid, p_limit integer)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '60s'
AS $$
DECLARE
  v_run public.cms_translation_runs;
  v_rows jsonb;
  v_later int := 0;
  v_next timestamptz;
BEGIN
  SELECT * INTO v_run FROM public.cms_translation_runs WHERE id = p_run_id;
  IF v_run.id IS NULL THEN
    RETURN jsonb_build_object('error', 'run_not_found');
  END IF;

  IF v_run.scope_kind = 'auto' THEN
    SELECT coalesce(jsonb_agg(x ORDER BY ord), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT jsonb_build_object(
               'job_id', j.id,
               'area', j.area,
               'ref_id', j.ref_id,
               'ref_key', coalesce(j.ref_id::text, j.page_key),
               'page_key', CASE WHEN j.area = 'section_field' THEN j.page_key
                                WHEN j.page_key = '~nav' THEN NULL ELSE j.page_key END,
               'section_key', j.section_key,
               'unit_key', j.unit_key,
               'sort_a', j.page_key,
               'sort_b', j.section_key,
               'sort_c', j.field_key,
               'source_text', j.source_text,
               'source_hash', j.source_hash,
               'memory_text', m.target_text
             ) AS x,
             j.scheduled_at AS ord
        FROM public.cms_translation_jobs j
        LEFT JOIN public.cms_translation_memory m
               ON m.source_hash = j.source_hash
              AND m.target_locale = j.target_locale
              AND coalesce(btrim(m.target_text), '') <> ''
       WHERE j.batch_id = 'auto'
         AND j.status = 'pending'
         AND j.target_locale = v_run.target_locale
         AND j.scheduled_at <= now()
         AND coalesce(btrim(j.source_text), '') <> ''
       ORDER BY j.scheduled_at
       LIMIT greatest(1, least(coalesce(p_limit, 25), 25))
    ) q;

    SELECT count(*), min(scheduled_at) INTO v_later, v_next
      FROM public.cms_translation_jobs
     WHERE batch_id = 'auto' AND status = 'pending'
       AND target_locale = v_run.target_locale
       AND scheduled_at > now();

    RETURN jsonb_build_object('run', to_jsonb(v_run), 'items', v_rows,
      'pending_later', v_later, 'next_due_at', v_next);
  END IF;

  SELECT coalesce(jsonb_agg(x ORDER BY sa, sb, sc), '[]'::jsonb)
    INTO v_rows
  FROM (
    SELECT jsonb_build_object(
             'area', u.area,
             'ref_id', u.ref_id,
             'ref_key', u.ref_key,
             'page_key', u.page_key,
             'section_key', u.section_key,
             'unit_key', u.unit_key,
             'sort_a', u.sort_a,
             'sort_b', u.sort_b,
             'sort_c', u.sort_c,
             'source_text', u.source_text,
             'source_hash', u.source_hash,
             'memory_text', m.target_text
           ) AS x,
           u.sort_a AS sa, u.sort_b AS sb, u.sort_c AS sc
      FROM public.cms_translation_units(
             v_run.target_locale,
             CASE WHEN array_length(v_run.page_keys, 1) IS NULL THEN NULL ELSE v_run.page_keys END,
             NULL) u
      LEFT JOIN public.cms_translation_memory m
             ON m.source_hash = u.source_hash
            AND m.target_locale = v_run.target_locale
            AND coalesce(btrim(m.target_text), '') <> ''
     WHERE u.is_todo
       AND (v_run.cursor_page_key IS NULL
            OR (u.sort_a, u.sort_b, u.sort_c)
               > (v_run.cursor_page_key, coalesce(v_run.cursor_section_key, ''), coalesce(v_run.cursor_field_key, '')))
     ORDER BY u.sort_a, u.sort_b, u.sort_c
     LIMIT greatest(1, least(coalesce(p_limit, 25), 25))
  ) q;

  RETURN jsonb_build_object('run', to_jsonb(v_run), 'items', v_rows, 'pending_later', 0);
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_internal_translation_next_batch(uuid, integer) FROM PUBLIC, anon, authenticated;

-- 5) Automatik schalten: Erkennung und Verarbeitung getrennt ---------------
CREATE OR REPLACE FUNCTION public.rpc_admin_set_translation_autopilot(
  p_enabled boolean DEFAULT NULL, p_paused boolean DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cfg public.cms_translation_autopilot;
BEGIN
  IF p_enabled IS NULL AND p_paused IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'nothing_to_change');
  END IF;

  UPDATE public.cms_translation_autopilot
     SET is_enabled = coalesce(p_enabled, is_enabled),
         is_paused = coalesce(p_paused, is_paused),
         updated_at = now()
   WHERE singleton
  RETURNING * INTO v_cfg;

  IF p_paused IS TRUE THEN
    -- Nur die Verarbeitung ruht; Erkennung und Planung laufen weiter.
    UPDATE public.cms_translation_runs
       SET status = 'paused', updated_at = now()
     WHERE scope_kind = 'auto' AND status IN ('queued','running');
  ELSIF p_paused IS FALSE THEN
    UPDATE public.cms_translation_runs
       SET status = 'queued', lease_owner = NULL, lease_until = NULL, updated_at = now()
     WHERE scope_kind = 'auto' AND status = 'paused';
    PERFORM public.rpc_internal_translation_worker_arm();
  END IF;

  RETURN jsonb_build_object('success', true,
    'is_enabled', v_cfg.is_enabled, 'is_paused', v_cfg.is_paused,
    'debounce_seconds', v_cfg.debounce_seconds);
END;
$$;
GRANT EXECUTE ON FUNCTION public.rpc_admin_set_translation_autopilot(boolean, boolean) TO anon, authenticated, service_role;

-- 6) Statusauswertung: je Sprache getrennte Zahlen -------------------------
CREATE OR REPLACE FUNCTION public.rpc_admin_translation_autopilot_status()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH cfg AS (SELECT * FROM public.cms_translation_autopilot WHERE singleton),
  loc AS (
    SELECT l.locale, l.label_de
      FROM public.cms_locales l
     WHERE l.is_active AND l.is_public AND NOT l.is_source
  ),
  per AS (
    SELECT loc.locale, loc.label_de,
      (SELECT count(*) FROM public.cms_translation_jobs j
        WHERE j.batch_id = 'auto' AND j.target_locale = loc.locale
          AND j.status = 'pending' AND j.scheduled_at > now()) AS planned_waiting,
      (SELECT count(*) FROM public.cms_translation_jobs j
        WHERE j.batch_id = 'auto' AND j.target_locale = loc.locale
          AND j.status = 'pending' AND j.scheduled_at <= now()) AS planned_due,
      (SELECT count(*) FROM public.cms_translation_jobs j
        WHERE j.batch_id = 'auto' AND j.target_locale = loc.locale AND j.status = 'failed') AS failed,
      (SELECT count(*) FROM public.cms_translation_jobs j
        WHERE j.batch_id = 'auto' AND j.target_locale = loc.locale AND j.status = 'skipped_manual') AS skipped_manual,
      (SELECT count(*) FROM public.cms_translation_jobs j
        WHERE j.batch_id = 'auto' AND j.target_locale = loc.locale
          AND j.status IN ('translated','memory_hit')) AS translated,
      (SELECT count(*) FROM public.cms_translation_runs r
        WHERE r.target_locale = loc.locale AND r.status IN ('queued','running')) AS runs_open,
      (SELECT max(r.updated_at) FROM public.cms_translation_runs r
        WHERE r.target_locale = loc.locale AND r.status IN ('queued','running')) AS run_activity,
      (SELECT max(coalesce(r.finished_at, r.updated_at)) FROM public.cms_translation_runs r
        WHERE r.target_locale = loc.locale AND r.status = 'done') AS last_success_at,
      (SELECT min(j.scheduled_at) FROM public.cms_translation_jobs j
        WHERE j.batch_id = 'auto' AND j.target_locale = loc.locale
          AND j.status = 'pending' AND j.scheduled_at > now()) AS next_due_at
      FROM loc
  )
  SELECT jsonb_build_object(
    'is_enabled', (SELECT is_enabled FROM cfg),
    'is_paused', (SELECT is_paused FROM cfg),
    'debounce_seconds', (SELECT debounce_seconds FROM cfg),
    'updated_at', (SELECT updated_at FROM cfg),
    'locales', (SELECT coalesce(jsonb_agg(jsonb_build_object(
                    'locale', p.locale, 'label', p.label_de) ORDER BY p.locale), '[]'::jsonb) FROM per p),
    'per_locale', (SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.locale), '[]'::jsonb) FROM per p),
    'pending', (SELECT coalesce(sum(planned_waiting + planned_due), 0) FROM per),
    'failed', (SELECT coalesce(sum(failed), 0) FROM per),
    'skipped_manual', (SELECT coalesce(sum(skipped_manual), 0) FROM per),
    'translated', (SELECT coalesce(sum(translated), 0) FROM per),
    'runs_open', (SELECT coalesce(sum(runs_open), 0) FROM per),
    'last_success_at', (SELECT max(last_success_at) FROM per),
    'last_activity_at', (SELECT greatest(max(run_activity), max(last_success_at)) FROM per)
  );
$$;
GRANT EXECUTE ON FUNCTION public.rpc_admin_translation_autopilot_status() TO anon, authenticated, service_role;

-- 7) Bestandszahlen je Sprache (vorhanden / fehlt / veraltet) --------------
CREATE OR REPLACE FUNCTION public.rpc_admin_translation_locale_counts(p_locale text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '60s'
AS $$
  SELECT jsonb_build_object(
    'locale', lower(btrim(p_locale)),
    'existing', count(*) FILTER (WHERE coalesce(btrim(u.target_value), '') <> '' AND NOT u.is_todo),
    'missing', count(*) FILTER (WHERE u.is_todo AND coalesce(btrim(u.target_value), '') = ''),
    'outdated', count(*) FILTER (WHERE u.is_todo AND coalesce(btrim(u.target_value), '') <> ''),
    'manual_protected', count(*) FILTER (WHERE NOT u.is_todo AND u.target_status = 'geprueft'
                                          AND coalesce(btrim(u.target_value), '') <> ''),
    'not_prepared', count(*) FILTER (WHERE NOT u.whitelisted),
    'total', count(*)
  )
  FROM public.cms_translation_units(lower(btrim(p_locale)), NULL, NULL) u;
$$;
GRANT EXECUTE ON FUNCTION public.rpc_admin_translation_locale_counts(text) TO anon, authenticated, service_role;