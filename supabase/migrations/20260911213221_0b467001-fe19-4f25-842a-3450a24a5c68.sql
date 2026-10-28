-- ===========================================================================
-- Übersetzungs-Automatik (Autopilot) für CMS-Light
-- Additiv, idempotent. Erweitert die bestehende Übersetzungsstrecke
-- (cms_translation_runs / cms_translation_jobs / Arbeiter) — keine zweite
-- Warteschlange, keine zweite Inhaltswahrheit.
-- ===========================================================================

-- 1) Laufart 'auto' erlauben ------------------------------------------------
ALTER TABLE public.cms_translation_runs DROP CONSTRAINT IF EXISTS cms_translation_runs_scope_chk;
ALTER TABLE public.cms_translation_runs
  ADD CONSTRAINT cms_translation_runs_scope_chk
  CHECK (scope_kind = ANY (ARRAY['page','pages','locale','auto']));

-- 2) Auftragszeilen um Bereichsangaben erweitern ---------------------------
ALTER TABLE public.cms_translation_jobs
  ADD COLUMN IF NOT EXISTS area text NOT NULL DEFAULT 'section_field',
  ADD COLUMN IF NOT EXISTS ref_id uuid,
  ADD COLUMN IF NOT EXISTS unit_key text,
  ADD COLUMN IF NOT EXISTS source_text text;

ALTER TABLE public.cms_translation_jobs DROP CONSTRAINT IF EXISTS cms_translation_jobs_area_chk;
ALTER TABLE public.cms_translation_jobs
  ADD CONSTRAINT cms_translation_jobs_area_chk
  CHECK (area = ANY (ARRAY['section_field','page_title','nav_label','nav_description','asset_alt']));

CREATE INDEX IF NOT EXISTS cms_translation_jobs_auto_idx
  ON public.cms_translation_jobs (target_locale, status, created_at)
  WHERE batch_id = 'auto';

-- 3) Einstellung: Automatik ein/aus ----------------------------------------
CREATE TABLE IF NOT EXISTS public.cms_translation_autopilot (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  is_enabled boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cms_translation_autopilot TO anon, authenticated;
GRANT ALL ON public.cms_translation_autopilot TO service_role;
ALTER TABLE public.cms_translation_autopilot ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cms_translation_autopilot_read ON public.cms_translation_autopilot;
CREATE POLICY cms_translation_autopilot_read
  ON public.cms_translation_autopilot FOR SELECT
  TO anon, authenticated USING (true);

DROP TRIGGER IF EXISTS trg_cms_translation_autopilot_updated_at ON public.cms_translation_autopilot;
CREATE TRIGGER trg_cms_translation_autopilot_updated_at
  BEFORE UPDATE ON public.cms_translation_autopilot
  FOR EACH ROW EXECUTE FUNCTION public.cms_set_updated_at();

INSERT INTO public.cms_translation_autopilot (singleton, is_enabled, notes)
VALUES (true, true, 'Automatik für neue/geänderte deutsche CMS-Texte')
ON CONFLICT (singleton) DO NOTHING;

-- 4) Offenen Automatik-Lauf sicherstellen ----------------------------------
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
BEGIN
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
REVOKE ALL ON FUNCTION public.cms_autopilot_ensure_run(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cms_autopilot_ensure_run(text) FROM anon, authenticated;

-- 5) Kern: eine Texteinheit für alle öffentlichen Zielsprachen einplanen ---
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
  v_enabled boolean;
  v_hash text;
  v_loc text;
  v_page text := coalesce(p_page_key, '~nav');
  v_section text := coalesce(nullif(p_section_key, ''), '-');
  v_field text;
  v_ref_key text;
  v_current text;
  v_status text;
  v_hash_target text;
  v_queued boolean := false;
BEGIN
  SELECT is_enabled INTO v_enabled FROM public.cms_translation_autopilot WHERE singleton;
  IF NOT coalesce(v_enabled, false) THEN
    RETURN;
  END IF;

  IF NOT public.cms_text_is_translatable(p_source_text) THEN
    RETURN;
  END IF;
  IF p_area = 'section_field' AND NOT public.cms_field_is_translatable(p_unit_key) THEN
    RETURN;
  END IF;

  v_hash := public.cms_translation_hash(p_source_text);
  v_field := CASE WHEN p_area = 'section_field'
                  THEN p_unit_key
                  ELSE p_area || ':' || coalesce(p_ref_id::text, v_page) || ':' || p_unit_key END;
  v_ref_key := CASE WHEN p_area = 'page_title' THEN p_page_key ELSE p_ref_id::text END;

  FOR v_loc IN
    SELECT l.locale FROM public.cms_locales l
     WHERE l.is_active AND l.is_public AND NOT l.is_source
     ORDER BY l.sort_order, l.locale
  LOOP
    -- aktuellen Zielzustand feststellen
    IF p_area = 'section_field' THEN
      SELECT f.value, f.review_status, f.source_hash
        INTO v_current, v_status, v_hash_target
        FROM public.cms_section_fields f
       WHERE f.page_key = p_page_key AND f.section_key = p_section_key
         AND f.field_key = p_unit_key AND f.locale = v_loc;
      -- Freigabeliste für diese Sprache mitführen (sonst greift der Schreibweg nicht)
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

    -- Unveränderte Quelle mit vorhandenem Zieltext: kein Auftrag.
    IF coalesce(btrim(v_current), '') <> '' AND v_hash_target = v_hash THEN
      CONTINUE;
    END IF;

    -- Von Hand gepflegter Zieltext: NIE überschreiben, nur protokollieren.
    IF coalesce(btrim(v_current), '') <> '' AND coalesce(v_status, 'geprueft') = 'geprueft' THEN
      INSERT INTO public.cms_translation_jobs
        (batch_id, page_key, section_key, field_key, target_locale, source_hash,
         status, last_error, area, ref_id, unit_key, source_text)
      VALUES ('auto', v_page, v_section, v_field, v_loc, v_hash,
         'skipped_manual', 'manual_value_source_changed', p_area, p_ref_id, p_unit_key, p_source_text)
      ON CONFLICT (batch_id, page_key, section_key, field_key, target_locale)
        DO UPDATE SET source_hash = EXCLUDED.source_hash,
                      source_text = EXCLUDED.source_text,
                      status = 'skipped_manual',
                      last_error = 'manual_value_source_changed',
                      run_id = NULL,
                      updated_at = now();
      CONTINUE;
    END IF;

    -- Fehlender oder maschineller (veralteter) Zieltext: Auftrag einplanen.
    INSERT INTO public.cms_translation_jobs
      (batch_id, page_key, section_key, field_key, target_locale, source_hash,
       status, attempts, last_error, area, ref_id, unit_key, source_text)
    VALUES ('auto', v_page, v_section, v_field, v_loc, v_hash,
       'pending', 0, NULL, p_area, p_ref_id, p_unit_key, p_source_text)
    ON CONFLICT (batch_id, page_key, section_key, field_key, target_locale)
      DO UPDATE SET source_hash = EXCLUDED.source_hash,
                    source_text = EXCLUDED.source_text,
                    status = 'pending',
                    attempts = 0,
                    last_error = NULL,
                    run_id = NULL,
                    updated_at = now();
    v_queued := true;
    PERFORM public.cms_autopilot_ensure_run(v_loc);
  END LOOP;

  IF v_queued THEN
    PERFORM public.rpc_internal_translation_worker_arm();
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.cms_autopilot_enqueue_unit(text, uuid, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cms_autopilot_enqueue_unit(text, uuid, text, text, text, text) FROM anon, authenticated;

-- 6) Auslöser auf den deutschen Quellspalten -------------------------------
CREATE OR REPLACE FUNCTION public.cms_autopilot_trg_section_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.locale <> 'de' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE'
     AND public.cms_translation_normalize(NEW.value) = public.cms_translation_normalize(OLD.value) THEN
    RETURN NEW;
  END IF;
  PERFORM public.cms_autopilot_enqueue_unit(
    'section_field', NULL, NEW.page_key, NEW.section_key, NEW.field_key, NEW.value);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cms_autopilot_trg_pages()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND public.cms_translation_normalize(NEW.title_de) = public.cms_translation_normalize(OLD.title_de) THEN
    RETURN NEW;
  END IF;
  PERFORM public.cms_autopilot_enqueue_unit(
    'page_title', NEW.id, NEW.page_key, '-', 'title', NEW.title_de);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cms_autopilot_trg_nav()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT'
     OR public.cms_translation_normalize(NEW.label_de) <> public.cms_translation_normalize(OLD.label_de) THEN
    PERFORM public.cms_autopilot_enqueue_unit(
      'nav_label', NEW.id, NEW.page_key, NEW.nav_area, 'label', NEW.label_de);
  END IF;
  IF TG_OP = 'INSERT'
     OR public.cms_translation_normalize(NEW.description_de) <> public.cms_translation_normalize(OLD.description_de) THEN
    PERFORM public.cms_autopilot_enqueue_unit(
      'nav_description', NEW.id, NEW.page_key, NEW.nav_area, 'description', NEW.description_de);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cms_autopilot_trg_assets()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND public.cms_translation_normalize(NEW.alt_de) = public.cms_translation_normalize(OLD.alt_de) THEN
    RETURN NEW;
  END IF;
  IF coalesce(NEW.is_active, true) = false THEN RETURN NEW; END IF;
  PERFORM public.cms_autopilot_enqueue_unit(
    'asset_alt', NEW.id, NEW.page_key, NEW.section_key, 'alt', NEW.alt_de);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cms_autopilot_section_fields ON public.cms_section_fields;
CREATE TRIGGER trg_cms_autopilot_section_fields
  AFTER INSERT OR UPDATE OF value ON public.cms_section_fields
  FOR EACH ROW EXECUTE FUNCTION public.cms_autopilot_trg_section_fields();

DROP TRIGGER IF EXISTS trg_cms_autopilot_pages ON public.cms_pages;
CREATE TRIGGER trg_cms_autopilot_pages
  AFTER INSERT OR UPDATE OF title_de ON public.cms_pages
  FOR EACH ROW EXECUTE FUNCTION public.cms_autopilot_trg_pages();

DROP TRIGGER IF EXISTS trg_cms_autopilot_nav ON public.cms_navigation_nodes;
CREATE TRIGGER trg_cms_autopilot_nav
  AFTER INSERT OR UPDATE OF label_de, description_de ON public.cms_navigation_nodes
  FOR EACH ROW EXECUTE FUNCTION public.cms_autopilot_trg_nav();

DROP TRIGGER IF EXISTS trg_cms_autopilot_assets ON public.cms_assets;
CREATE TRIGGER trg_cms_autopilot_assets
  AFTER INSERT OR UPDATE OF alt_de ON public.cms_assets
  FOR EACH ROW EXECUTE FUNCTION public.cms_autopilot_trg_assets();

-- 7) Nächster Stapel: Automatik-Läufe lesen aus den Aufträgen --------------
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
             j.created_at AS ord
        FROM public.cms_translation_jobs j
        LEFT JOIN public.cms_translation_memory m
               ON m.source_hash = j.source_hash
              AND m.target_locale = j.target_locale
              AND coalesce(btrim(m.target_text), '') <> ''
       WHERE j.batch_id = 'auto'
         AND j.status = 'pending'
         AND j.target_locale = v_run.target_locale
         AND coalesce(btrim(j.source_text), '') <> ''
       ORDER BY j.created_at
       LIMIT greatest(1, least(coalesce(p_limit, 25), 25))
    ) q;

    RETURN jsonb_build_object('run', to_jsonb(v_run), 'items', v_rows);
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

  RETURN jsonb_build_object('run', to_jsonb(v_run), 'items', v_rows);
END;
$$;

-- 8) Auftrag abschließen (nur Serverdienst) --------------------------------
CREATE OR REPLACE FUNCTION public.rpc_internal_translation_job_finish(
  p_job_id uuid, p_status text, p_error text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_status text := coalesce(p_status, 'failed');
BEGIN
  IF v_status NOT IN ('pending','memory_hit','translated','skipped_manual','failed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'status_invalid');
  END IF;
  UPDATE public.cms_translation_jobs
     SET status = v_status,
         last_error = p_error,
         attempts = CASE WHEN v_status = 'failed' THEN attempts + 1 ELSE attempts END,
         updated_at = now()
   WHERE id = p_job_id;
  RETURN jsonb_build_object('success', true);
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_internal_translation_job_finish(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_internal_translation_job_finish(uuid, text, text) FROM anon, authenticated;

-- 9) Statusauswertung für die Oberfläche ----------------------------------
CREATE OR REPLACE FUNCTION public.rpc_admin_translation_autopilot_status()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'is_enabled', (SELECT is_enabled FROM public.cms_translation_autopilot WHERE singleton),
    'updated_at', (SELECT updated_at FROM public.cms_translation_autopilot WHERE singleton),
    'locales', (SELECT coalesce(jsonb_agg(jsonb_build_object(
                         'locale', l.locale, 'label', l.label_de) ORDER BY l.sort_order, l.locale), '[]'::jsonb)
                  FROM public.cms_locales l
                 WHERE l.is_active AND l.is_public AND NOT l.is_source),
    'pending', (SELECT count(*) FROM public.cms_translation_jobs WHERE batch_id = 'auto' AND status = 'pending'),
    'failed', (SELECT count(*) FROM public.cms_translation_jobs WHERE batch_id = 'auto' AND status = 'failed'),
    'skipped_manual', (SELECT count(*) FROM public.cms_translation_jobs WHERE batch_id = 'auto' AND status = 'skipped_manual'),
    'translated', (SELECT count(*) FROM public.cms_translation_jobs WHERE batch_id = 'auto' AND status IN ('translated','memory_hit')),
    'runs_open', (SELECT count(*) FROM public.cms_translation_runs WHERE scope_kind = 'auto' AND status IN ('queued','running')),
    'last_success_at', (SELECT max(finished_at) FROM public.cms_translation_runs WHERE scope_kind = 'auto' AND status = 'done'),
    'last_activity_at', (SELECT max(updated_at) FROM public.cms_translation_runs WHERE scope_kind = 'auto')
  );
$$;
GRANT EXECUTE ON FUNCTION public.rpc_admin_translation_autopilot_status() TO anon, authenticated, service_role;

-- 10) Automatik schalten (Admin) ------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_admin_set_translation_autopilot(p_enabled boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_enabled IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'enabled_required');
  END IF;
  INSERT INTO public.cms_translation_autopilot (singleton, is_enabled)
  VALUES (true, p_enabled)
  ON CONFLICT (singleton) DO UPDATE SET is_enabled = EXCLUDED.is_enabled, updated_at = now();
  RETURN jsonb_build_object('success', true, 'is_enabled', p_enabled);
END;
$$;
GRANT EXECUTE ON FUNCTION public.rpc_admin_set_translation_autopilot(boolean) TO anon, authenticated, service_role;
