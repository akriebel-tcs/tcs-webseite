-- ============================================================================
-- Übersetzungswerkzeug CMS-Light: Sprachregistry, Kostensätze, fortsetzbare Läufe
-- Idempotent. Keine Inhaltsmutation. Keine Product-Base-Berührung.
-- ============================================================================

-- 1) Sprachregistry -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cms_locales (
  locale text PRIMARY KEY,
  label_de text NOT NULL,
  label_native text NOT NULL,
  is_source boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT false,
  is_public boolean NOT NULL DEFAULT false,
  fallback_locale text,
  sort_order integer NOT NULL DEFAULT 100,
  deepl_supported boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cms_locales TO anon, authenticated;
GRANT ALL ON public.cms_locales TO service_role;
ALTER TABLE public.cms_locales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cms_locales public read" ON public.cms_locales;
CREATE POLICY "cms_locales public read" ON public.cms_locales
  FOR SELECT TO anon, authenticated USING (true);

DROP TRIGGER IF EXISTS trg_cms_locales_updated_at ON public.cms_locales;
CREATE TRIGGER trg_cms_locales_updated_at BEFORE UPDATE ON public.cms_locales
  FOR EACH ROW EXECUTE FUNCTION public.cms_set_updated_at();

INSERT INTO public.cms_locales
  (locale, label_de, label_native, is_source, is_active, is_public, fallback_locale, sort_order, deepl_supported, notes)
VALUES
  ('de','Deutsch','Deutsch', true,  true,  true,  NULL, 10, true,  'Verbindliche Quellsprache. Wird nie maschinell überschrieben.'),
  ('en','Englisch','English', false, true,  true,  'de', 20, true,  'Redaktionell im Einsatz.'),
  ('pl','Polnisch','Polski',  false, true,  false, 'de', 30, true,  'Pilotphase, interner Arbeitsstand.'),
  ('nl','Niederländisch','Nederlands', false, false, false, 'de', 40, true, 'Vorbereitet, bewusst nicht aktiviert.'),
  ('da','Dänisch','Dansk',    false, false, false, 'de', 50, true,  'Vorbereitet, bewusst nicht aktiviert.')
ON CONFLICT (locale) DO NOTHING;

-- 2) Kostensätze / Schätzgrundlage -------------------------------------------
CREATE TABLE IF NOT EXISTS public.cms_translation_provider_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  model text NOT NULL,
  label text NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  cost_per_1k_source_chars numeric NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  is_enabled boolean NOT NULL DEFAULT true,
  requires_secret text,
  basis_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, model)
);

GRANT SELECT ON public.cms_translation_provider_rates TO anon, authenticated;
GRANT ALL ON public.cms_translation_provider_rates TO service_role;
ALTER TABLE public.cms_translation_provider_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cms_translation_provider_rates public read" ON public.cms_translation_provider_rates;
CREATE POLICY "cms_translation_provider_rates public read" ON public.cms_translation_provider_rates
  FOR SELECT TO anon, authenticated USING (true);

DROP TRIGGER IF EXISTS trg_cms_translation_provider_rates_updated_at ON public.cms_translation_provider_rates;
CREATE TRIGGER trg_cms_translation_provider_rates_updated_at BEFORE UPDATE ON public.cms_translation_provider_rates
  FOR EACH ROW EXECUTE FUNCTION public.cms_set_updated_at();

INSERT INTO public.cms_translation_provider_rates
  (provider, model, label, cost_per_1k_source_chars, is_default, is_enabled, requires_secret, basis_note)
VALUES
  ('lovable_ai','google/gemini-2.5-flash','Lovable AI · Gemini 2.5 Flash', 0.0009, true, true, NULL,
   'Schätzung: gemittelte Ein-/Ausgabe-Token je 1.000 Quellzeichen, Abrechnung über Lovable-AI-Credits.'),
  ('lovable_ai','google/gemini-2.5-flash-lite','Lovable AI · Gemini 2.5 Flash Lite', 0.0004, false, true, NULL,
   'Schätzung, Ersatzmodell bei leerer Antwort.'),
  ('google_gemini','gemini-2.5-flash','Google Gemini (eigener Schlüssel)', 0.0009, false, false, 'GOOGLE_GEMINI_API_KEY',
   'Schätzung nach Google-Preisliste; nur aktiv, wenn Schlüssel als Secret hinterlegt ist.'),
  ('anthropic','claude-sonnet-4-5','Anthropic Claude (eigener Schlüssel)', 0.0060, false, false, 'ANTHROPIC_API_KEY',
   'Schätzung nach Anthropic-Preisliste; nur aktiv, wenn Schlüssel als Secret hinterlegt ist.'),
  ('deepl','deepl-api','DeepL API (eigener Schlüssel)', 0.0200, false, false, 'DEEPL_API_KEY',
   'Schätzung nach DeepL-API-Preisliste (pro Zeichen). Nicht jede Sprache wird von DeepL unterstützt.')
ON CONFLICT (provider, model) DO NOTHING;

-- 3) Fortsetzbare Läufe -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cms_translation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_locale text NOT NULL DEFAULT 'de',
  target_locale text NOT NULL,
  scope_kind text NOT NULL,
  scope_signature text NOT NULL,
  page_keys text[] NOT NULL DEFAULT '{}',
  provider text NOT NULL DEFAULT 'lovable_ai',
  model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  status text NOT NULL DEFAULT 'queued',
  fields_planned integer NOT NULL DEFAULT 0,
  fields_done integer NOT NULL DEFAULT 0,
  fields_skipped integer NOT NULL DEFAULT 0,
  fields_failed integer NOT NULL DEFAULT 0,
  batches_done integer NOT NULL DEFAULT 0,
  model_calls integer NOT NULL DEFAULT 0,
  memory_hits integer NOT NULL DEFAULT 0,
  chars_source integer NOT NULL DEFAULT 0,
  cost_estimate numeric NOT NULL DEFAULT 0,
  cost_limit numeric,
  dry_run jsonb,
  limits jsonb,
  cursor_page_key text,
  cursor_section_key text,
  cursor_field_key text,
  last_error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cms_translation_runs_status_chk
    CHECK (status = ANY (ARRAY['queued','running','paused','cancelled','done','error'])),
  CONSTRAINT cms_translation_runs_scope_chk
    CHECK (scope_kind = ANY (ARRAY['page','pages','locale']))
);

CREATE INDEX IF NOT EXISTS cms_translation_runs_status_idx
  ON public.cms_translation_runs (status, target_locale);
-- Nur EIN aktiver Lauf je Ziel-Sprache und Umfangs-Signatur.
CREATE UNIQUE INDEX IF NOT EXISTS cms_translation_runs_active_uniq
  ON public.cms_translation_runs (target_locale, scope_signature)
  WHERE status IN ('queued','running','paused');

GRANT SELECT ON public.cms_translation_runs TO anon, authenticated;
GRANT ALL ON public.cms_translation_runs TO service_role;
ALTER TABLE public.cms_translation_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cms_translation_runs public read" ON public.cms_translation_runs;
CREATE POLICY "cms_translation_runs public read" ON public.cms_translation_runs
  FOR SELECT TO anon, authenticated USING (true);

DROP TRIGGER IF EXISTS trg_cms_translation_runs_updated_at ON public.cms_translation_runs;
CREATE TRIGGER trg_cms_translation_runs_updated_at BEFORE UPDATE ON public.cms_translation_runs
  FOR EACH ROW EXECUTE FUNCTION public.cms_set_updated_at();

-- 4) Job-Tabelle minimal erweitern -------------------------------------------
ALTER TABLE public.cms_translation_jobs ADD COLUMN IF NOT EXISTS run_id uuid;
CREATE INDEX IF NOT EXISTS cms_translation_jobs_run_idx
  ON public.cms_translation_jobs (run_id, status);

-- 5) Interne Funktionen (nur service_role) -----------------------------------

-- 5a) Vorschau (Dry-run) — reine Zählung, keine Mutation.
CREATE OR REPLACE FUNCTION public.rpc_internal_translation_dry_run(
  p_target_locale text,
  p_page_keys text[]
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v jsonb;
BEGIN
  IF p_target_locale IS NULL OR p_target_locale = 'de' THEN
    RETURN jsonb_build_object('error', 'target_locale_invalid');
  END IF;

  WITH src AS (
    SELECT f.page_key, f.section_key, f.field_key, f.value,
           public.cms_translation_hash(f.value) AS src_hash
      FROM public.cms_section_fields f
      JOIN public.cms_sections s
        ON s.page_key = f.page_key AND s.section_key = f.section_key
     WHERE f.locale = 'de'
       AND coalesce(btrim(f.value), '') <> ''
       AND public.cms_field_is_translatable(f.field_key)
       AND (p_page_keys IS NULL OR array_length(p_page_keys, 1) IS NULL OR f.page_key = ANY (p_page_keys))
  ),
  tgt AS (
    SELECT s.*,
           t.value AS target_value,
           t.review_status AS target_status,
           t.source_hash AS target_hash,
           w.is_enabled AS whitelisted
      FROM src s
      LEFT JOIN public.cms_section_fields t
        ON t.page_key = s.page_key AND t.section_key = s.section_key
       AND t.field_key = s.field_key AND t.locale = p_target_locale
      LEFT JOIN public.cms_admin_editable_fields w
        ON w.page_key = s.page_key AND w.section_key = s.section_key
       AND w.field_key = s.field_key AND w.locale = p_target_locale
  )
  SELECT jsonb_build_object(
    'target_locale', p_target_locale,
    'pages', (SELECT count(DISTINCT page_key) FROM tgt),
    'fields', (SELECT count(*) FROM tgt),
    'source_nonempty', (SELECT count(*) FROM tgt),
    'source_unique', (SELECT count(DISTINCT src_hash) FROM tgt),
    'targets_existing', (SELECT count(*) FROM tgt WHERE coalesce(btrim(target_value), '') <> ''),
    'protected_manual', (SELECT count(*) FROM tgt
                          WHERE coalesce(btrim(target_value), '') <> ''
                            AND target_status = 'geprueft'),
    'not_whitelisted', (SELECT count(*) FROM tgt WHERE coalesce(whitelisted, false) = false),
    'todo_fields', (SELECT count(*) FROM tgt
                     WHERE coalesce(whitelisted, false) = true
                       AND NOT (coalesce(btrim(target_value), '') <> '' AND target_status = 'geprueft')
                       AND (coalesce(btrim(target_value), '') = ''
                            OR target_hash IS NULL
                            OR target_hash <> src_hash)),
    'todo_unique', (SELECT count(DISTINCT src_hash) FROM tgt
                     WHERE coalesce(whitelisted, false) = true
                       AND NOT (coalesce(btrim(target_value), '') <> '' AND target_status = 'geprueft')
                       AND (coalesce(btrim(target_value), '') = ''
                            OR target_hash IS NULL
                            OR target_hash <> src_hash)),
    'memory_ready', (SELECT count(DISTINCT t.src_hash) FROM tgt t
                      JOIN public.cms_translation_memory m
                        ON m.source_hash = t.src_hash AND m.target_locale = p_target_locale
                       AND coalesce(btrim(m.target_text), '') <> ''),
    'chars_source', (SELECT coalesce(sum(length(value)), 0) FROM tgt
                      WHERE coalesce(whitelisted, false) = true
                        AND NOT (coalesce(btrim(target_value), '') <> '' AND target_status = 'geprueft')
                        AND (coalesce(btrim(target_value), '') = ''
                             OR target_hash IS NULL
                             OR target_hash <> src_hash)),
    'chars_unique', (SELECT coalesce(sum(length(value)), 0) FROM (
                        SELECT DISTINCT ON (src_hash) src_hash, value FROM tgt
                         WHERE coalesce(whitelisted, false) = true
                           AND NOT (coalesce(btrim(target_value), '') <> '' AND target_status = 'geprueft')
                           AND (coalesce(btrim(target_value), '') = ''
                                OR target_hash IS NULL
                                OR target_hash <> src_hash)
                      ) d)
  ) INTO v;

  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_internal_translation_dry_run(text, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_internal_translation_dry_run(text, text[]) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_internal_translation_dry_run(text, text[]) TO service_role;

-- 5b) Lauf starten / bestehenden aktiven Lauf zurückgeben (idempotent).
CREATE OR REPLACE FUNCTION public.rpc_internal_translation_start_run(
  p_target_locale text,
  p_scope_kind text,
  p_page_keys text[],
  p_scope_signature text,
  p_provider text,
  p_model text,
  p_dry_run jsonb,
  p_limits jsonb,
  p_cost_limit numeric
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing public.cms_translation_runs;
  v_run public.cms_translation_runs;
  v_active boolean;
BEGIN
  SELECT is_active INTO v_active FROM public.cms_locales WHERE locale = p_target_locale;
  IF NOT coalesce(v_active, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'locale_not_active');
  END IF;
  IF p_target_locale = 'de' THEN
    RETURN jsonb_build_object('success', false, 'error', 'source_locale_not_target');
  END IF;

  SELECT * INTO v_existing FROM public.cms_translation_runs
   WHERE target_locale = p_target_locale
     AND scope_signature = p_scope_signature
     AND status IN ('queued','running','paused')
   LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'reused', true, 'run_id', v_existing.id,
                              'status', v_existing.status);
  END IF;

  INSERT INTO public.cms_translation_runs
    (target_locale, scope_kind, scope_signature, page_keys, provider, model,
     status, fields_planned, dry_run, limits, cost_limit, started_at)
  VALUES
    (p_target_locale, p_scope_kind, p_scope_signature, coalesce(p_page_keys, '{}'),
     coalesce(p_provider, 'lovable_ai'), coalesce(p_model, 'google/gemini-2.5-flash'),
     'running', coalesce((p_dry_run->>'todo_fields')::int, 0), p_dry_run, p_limits, p_cost_limit, now())
  RETURNING * INTO v_run;

  RETURN jsonb_build_object('success', true, 'reused', false, 'run_id', v_run.id, 'status', v_run.status);
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_internal_translation_start_run(text, text, text[], text, text, text, jsonb, jsonb, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_internal_translation_start_run(text, text, text[], text, text, text, jsonb, jsonb, numeric) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_internal_translation_start_run(text, text, text[], text, text, text, jsonb, jsonb, numeric) TO service_role;

-- 5c) Nächste Arbeitsportion holen (Cursor-basiert, deterministisch).
CREATE OR REPLACE FUNCTION public.rpc_internal_translation_next_batch(
  p_run_id uuid,
  p_limit integer
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_run public.cms_translation_runs;
  v_rows jsonb;
BEGIN
  SELECT * INTO v_run FROM public.cms_translation_runs WHERE id = p_run_id;
  IF v_run.id IS NULL THEN
    RETURN jsonb_build_object('error', 'run_not_found');
  END IF;

  SELECT coalesce(jsonb_agg(x ORDER BY x->>'page_key', x->>'section_key', x->>'field_key'), '[]'::jsonb)
    INTO v_rows
  FROM (
    SELECT jsonb_build_object(
             'page_key', f.page_key,
             'section_key', f.section_key,
             'field_key', f.field_key,
             'source_text', f.value,
             'source_hash', public.cms_translation_hash(f.value),
             'memory_text', m.target_text
           ) AS x
      FROM public.cms_section_fields f
      JOIN public.cms_sections s
        ON s.page_key = f.page_key AND s.section_key = f.section_key
      JOIN public.cms_admin_editable_fields w
        ON w.page_key = f.page_key AND w.section_key = f.section_key
       AND w.field_key = f.field_key AND w.locale = v_run.target_locale
       AND w.is_enabled = true
      LEFT JOIN public.cms_section_fields t
        ON t.page_key = f.page_key AND t.section_key = f.section_key
       AND t.field_key = f.field_key AND t.locale = v_run.target_locale
      LEFT JOIN public.cms_translation_memory m
        ON m.source_hash = public.cms_translation_hash(f.value)
       AND m.target_locale = v_run.target_locale
       AND coalesce(btrim(m.target_text), '') <> ''
     WHERE f.locale = 'de'
       AND coalesce(btrim(f.value), '') <> ''
       AND public.cms_field_is_translatable(f.field_key)
       AND (array_length(v_run.page_keys, 1) IS NULL OR f.page_key = ANY (v_run.page_keys))
       AND NOT (coalesce(btrim(t.value), '') <> '' AND t.review_status = 'geprueft')
       AND (coalesce(btrim(t.value), '') = ''
            OR t.source_hash IS NULL
            OR t.source_hash <> public.cms_translation_hash(f.value))
       AND (v_run.cursor_page_key IS NULL
            OR (f.page_key, f.section_key, f.field_key)
               > (v_run.cursor_page_key, coalesce(v_run.cursor_section_key, ''), coalesce(v_run.cursor_field_key, '')))
     ORDER BY f.page_key, f.section_key, f.field_key
     LIMIT greatest(1, least(coalesce(p_limit, 25), 25))
  ) q;

  RETURN jsonb_build_object('run', to_jsonb(v_run), 'items', v_rows);
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_internal_translation_next_batch(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_internal_translation_next_batch(uuid, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_internal_translation_next_batch(uuid, integer) TO service_role;

-- 5d) Fortschritt/Checkpoint schreiben.
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
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_run public.cms_translation_runs;
BEGIN
  IF p_status IS NOT NULL
     AND p_status <> ALL (ARRAY['queued','running','paused','cancelled','done','error']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'status_invalid');
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
         cursor_page_key = coalesce(p_cursor_page_key, r.cursor_page_key),
         cursor_section_key = coalesce(p_cursor_section_key, r.cursor_section_key),
         cursor_field_key = coalesce(p_cursor_field_key, r.cursor_field_key),
         status = coalesce(p_status, r.status),
         last_error = coalesce(p_error, r.last_error),
         finished_at = CASE WHEN coalesce(p_status, r.status) IN ('done','cancelled','error')
                            THEN now() ELSE r.finished_at END
   WHERE r.id = p_run_id
  RETURNING * INTO v_run;

  IF v_run.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'run_not_found');
  END IF;
  RETURN jsonb_build_object('success', true, 'run', to_jsonb(v_run));
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_internal_translation_progress(uuid, integer, integer, integer, integer, integer, integer, numeric, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_internal_translation_progress(uuid, integer, integer, integer, integer, integer, integer, numeric, text, text, text, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_internal_translation_progress(uuid, integer, integer, integer, integer, integer, integer, numeric, text, text, text, text, text) TO service_role;

-- 5e) Qualitätsbericht (Prüflauf) --------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_internal_translation_qa(
  p_target_locale text,
  p_page_keys text[],
  p_limit integer
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v jsonb;
BEGIN
  WITH pair AS (
    SELECT d.page_key, d.section_key, d.field_key,
           d.value AS de_value,
           t.value AS target_value,
           t.review_status,
           t.source_hash AS target_hash,
           public.cms_translation_hash(d.value) AS src_hash
      FROM public.cms_section_fields d
      LEFT JOIN public.cms_section_fields t
        ON t.page_key = d.page_key AND t.section_key = d.section_key
       AND t.field_key = d.field_key AND t.locale = p_target_locale
     WHERE d.locale = 'de'
       AND coalesce(btrim(d.value), '') <> ''
       AND public.cms_field_is_translatable(d.field_key)
       AND (p_page_keys IS NULL OR array_length(p_page_keys, 1) IS NULL OR d.page_key = ANY (p_page_keys))
  ),
  flagged AS (
    SELECT p.*,
           CASE
             WHEN coalesce(btrim(p.target_value), '') = '' THEN 'ziel_leer'
             WHEN public.cms_translation_normalize(p.target_value) = public.cms_translation_normalize(p.de_value) THEN 'unveraendert_deutsch'
             WHEN p.de_value ~ '\{\{?[a-z0-9_]+\}?\}' AND p.target_value !~ '\{\{?[a-z0-9_]+\}?\}' THEN 'platzhalter_fehlt'
             WHEN p.de_value ~ '<[a-z]+' AND p.target_value !~ '<[a-z]+' THEN 'html_fehlt'
             WHEN p.de_value ~* '(https?://|www\.)' AND p.target_value !~* '(https?://|www\.)' THEN 'link_fehlt'
             WHEN p.de_value ~ '\mTCS\M' AND p.target_value !~ '\mTCS\M' THEN 'markenbegriff_fehlt'
             WHEN length(p.target_value) > 0
                  AND (length(p.target_value)::numeric / greatest(length(p.de_value), 1) > 2.5
                       OR length(p.target_value)::numeric / greatest(length(p.de_value), 1) < 0.4) THEN 'laenge_auffaellig'
             WHEN p.target_hash IS NOT NULL AND p.target_hash <> p.src_hash THEN 'quelle_geaendert'
             ELSE NULL
           END AS issue
      FROM pair p
  )
  SELECT jsonb_build_object(
    'target_locale', p_target_locale,
    'checked', (SELECT count(*) FROM flagged),
    'ok', (SELECT count(*) FROM flagged WHERE issue IS NULL),
    'issues_total', (SELECT count(*) FROM flagged WHERE issue IS NOT NULL),
    'by_issue', (SELECT coalesce(jsonb_object_agg(issue, cnt), '{}'::jsonb)
                   FROM (SELECT issue, count(*) AS cnt FROM flagged WHERE issue IS NOT NULL GROUP BY issue) g),
    'failed_batches', (SELECT count(*) FROM public.cms_translation_jobs j
                        WHERE j.target_locale = p_target_locale AND j.status = 'error'),
    'items', (SELECT coalesce(jsonb_agg(jsonb_build_object(
                        'page_key', page_key, 'section_key', section_key, 'field_key', field_key,
                        'issue', issue, 'review_status', review_status,
                        'de_value', left(de_value, 300),
                        'target_value', left(coalesce(target_value, ''), 300)
                      ) ORDER BY page_key, section_key, field_key), '[]'::jsonb)
                 FROM (SELECT * FROM flagged WHERE issue IS NOT NULL
                        ORDER BY page_key, section_key, field_key
                        LIMIT greatest(1, least(coalesce(p_limit, 500), 2000))) i)
  ) INTO v;

  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_internal_translation_qa(text, text[], integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_internal_translation_qa(text, text[], integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_internal_translation_qa(text, text[], integer) TO service_role;

-- 5f) Abdeckung je Sprache (für die Übersicht) -------------------------------
CREATE OR REPLACE FUNCTION public.rpc_internal_translation_coverage()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH base AS (
    SELECT count(*) AS de_fields
      FROM public.cms_section_fields f
     WHERE f.locale = 'de'
       AND coalesce(btrim(f.value), '') <> ''
       AND public.cms_field_is_translatable(f.field_key)
  ),
  per AS (
    SELECT l.locale,
           l.label_de,
           l.is_active,
           l.is_source,
           l.is_public,
           (SELECT count(*) FROM public.cms_section_fields t
             WHERE t.locale = l.locale AND coalesce(btrim(t.value), '') <> '') AS filled,
           (SELECT count(*) FROM public.cms_section_fields t
             WHERE t.locale = l.locale AND t.review_status = 'maschinell') AS machine,
           (SELECT count(*) FROM public.cms_section_fields t
             WHERE t.locale = l.locale AND t.review_status = 'maschinell_veraltet') AS stale,
           (SELECT count(*) FROM public.cms_section_fields t
             WHERE t.locale = l.locale AND t.review_status = 'geprueft'
               AND coalesce(btrim(t.value), '') <> '') AS reviewed,
           (SELECT count(*) FROM public.cms_translation_runs r
             WHERE r.target_locale = l.locale AND r.status IN ('queued','running','paused')) AS open_runs,
           (SELECT count(*) FROM public.cms_translation_jobs j
             WHERE j.target_locale = l.locale AND j.status = 'error') AS failed_jobs
      FROM public.cms_locales l
  )
  SELECT jsonb_build_object(
    'de_translatable_fields', (SELECT de_fields FROM base),
    'locales', (SELECT coalesce(jsonb_agg(to_jsonb(per) ORDER BY locale), '[]'::jsonb) FROM per)
  );
$$;

REVOKE ALL ON FUNCTION public.rpc_internal_translation_coverage() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_internal_translation_coverage() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_internal_translation_coverage() TO service_role;