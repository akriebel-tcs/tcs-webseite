-- =====================================================================
-- Etappe 2B: additiver, idempotenter, standardmäßig lesender Abgleich
-- des Bedienungstext-Katalogs. Übernahme des geprüften Entwurfs
-- docs/04-betrieb/sql-entwurf-ui-katalog-abgleich-2026-09-14.md.
-- Protokollversion 2. Keine Datenänderung, kein Import.
-- =====================================================================

-- 1) Trigger: transaktionslokale Unterdrückung für den Katalogimport.
--    Ohne gesetzte Kennung verhält sich der Trigger exakt wie bisher.
CREATE OR REPLACE FUNCTION public.cms_autopilot_trg_ui_strings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Nur der geschützte Katalogimport setzt diese Kennung, und zwar
  -- transaktionslokal. Redaktionelle Änderungen sind nicht betroffen.
  IF coalesce(current_setting('cms.suppress_ui_string_autopilot', true), '') = 'on' THEN
    RETURN NULL;
  END IF;

  IF NEW.is_active AND (TG_OP = 'INSERT' OR coalesce(OLD.source_text, '') <> coalesce(NEW.source_text, '')) THEN
    PERFORM public.cms_autopilot_enqueue_unit(
      'ui_string', NEW.id, '~ui', NEW.namespace, NEW.string_key, NEW.source_text);
  END IF;
  RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.cms_autopilot_trg_ui_strings() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cms_autopilot_trg_ui_strings() TO service_role;

-- 2) Protokollstand: nur lesend, service_role-only. Existiert erst mit
--    diesem SQL. Serverdienst und Skript prüfen ihn VOR jedem Abgleich.
CREATE OR REPLACE FUNCTION public.rpc_admin_ui_catalog_sync_capabilities()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT jsonb_build_object(
    'protocol_version', 2,
    'contract', 'ui_catalog_sync_additive',
    'dry_run_default', true,
    'writes', 'insert_only',
    'trigger_suppression_supported', EXISTS (
      SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public'
         AND p.proname = 'cms_autopilot_trg_ui_strings'
         AND p.prosrc LIKE '%cms.suppress_ui_string_autopilot%'));
$function$;

REVOKE ALL ON FUNCTION public.rpc_admin_ui_catalog_sync_capabilities() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_ui_catalog_sync_capabilities() TO service_role;

-- 3) Abgleich: gleiche Signatur, neue Semantik.
CREATE OR REPLACE FUNCTION public.rpc_admin_sync_ui_strings(p_manifest jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
SET statement_timeout TO '120s'
SET lock_timeout TO '5s'
AS $function$
DECLARE
  v_dry boolean := true;
  v_version text;
  v_entries jsonb;
  v_norm jsonb;
  v_count int;
  v_problems jsonb;
  v_dupes jsonb;
  v_prev text;
  v_trigger_ok boolean;
  v_inserted_strings int := 0;
  v_inserted_seeds int := 0;
  v_state_rows int := 0;
  v_report jsonb;
BEGIN
  -- ---------------------------------------------------------------- Form
  IF p_manifest IS NULL OR jsonb_typeof(p_manifest) IS DISTINCT FROM 'object' THEN
    RETURN jsonb_build_object('success', false, 'applied', false,
      'error', 'manifest_invalid',
      'message', 'Erwartet wird ein Manifest-Objekt mit Version und Einträgen.');
  END IF;

  IF p_manifest ? 'dry_run' THEN
    IF jsonb_typeof(p_manifest->'dry_run') IS DISTINCT FROM 'boolean' THEN
      RETURN jsonb_build_object('success', false, 'applied', false,
        'error', 'dry_run_invalid',
        'message', 'dry_run muss true oder false sein.');
    END IF;
    v_dry := (p_manifest->>'dry_run')::boolean;
  END IF;

  -- Version muss ein JSON-Text sein: eine Zahl wird abgelehnt.
  IF jsonb_typeof(p_manifest->'version') IS DISTINCT FROM 'string' THEN
    RETURN jsonb_build_object('success', false, 'applied', false,
      'error', 'version_invalid',
      'message', 'Die Manifest-Version fehlt oder ist kein Text.');
  END IF;

  v_version := btrim(p_manifest->>'version');
  IF v_version = '' OR length(v_version) > 200 THEN
    RETURN jsonb_build_object('success', false, 'applied', false,
      'error', 'version_invalid',
      'message', 'Die Manifest-Version ist leer oder zu lang.');
  END IF;

  IF jsonb_typeof(p_manifest->'entries') IS DISTINCT FROM 'array' THEN
    RETURN jsonb_build_object('success', false, 'applied', false,
      'error', 'entries_invalid',
      'message', 'entries fehlt oder ist keine Liste.');
  END IF;

  v_entries := p_manifest->'entries';
  v_count := jsonb_array_length(v_entries);

  IF v_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'applied', false,
      'error', 'entries_empty',
      'message', 'Das Manifest enthält keinen einzigen Bedienungstext.');
  END IF;

  IF v_count > 20000 THEN
    RETURN jsonb_build_object('success', false, 'applied', false,
      'error', 'entries_too_many',
      'message', format('Das Manifest hat %s Einträge; erlaubt sind höchstens 20000.', v_count));
  END IF;

  -- ------------------------------------------------------------- Inhalte
  -- Jede Zeile wird geprüft. Ungültige Zeilen werden NICHT gefiltert,
  -- sondern führen vor jeder Änderung zum Abbruch mit klarer Meldung.
  -- Alle Pflichtfeld-Prüfungen mit IS DISTINCT FROM, weil jsonb_typeof
  -- bei fehlendem Schlüssel NULL liefert.
  SELECT jsonb_agg(p ORDER BY (p->>'entry')::int)
    INTO v_problems
    FROM (
      SELECT jsonb_build_object('entry', t.ord, 'problem', c.problem) AS p
        FROM jsonb_array_elements(v_entries) WITH ORDINALITY AS t(val, ord)
        CROSS JOIN LATERAL (
          SELECT CASE
            WHEN jsonb_typeof(t.val) IS DISTINCT FROM 'object' THEN 'Eintrag ist kein Objekt'
            WHEN jsonb_typeof(t.val->'namespace') IS DISTINCT FROM 'string' THEN 'namespace fehlt oder ist kein Text'
            WHEN btrim(t.val->>'namespace') = '' THEN 'namespace ist leer'
            WHEN jsonb_typeof(t.val->'key') IS DISTINCT FROM 'string' THEN 'key fehlt oder ist kein Text'
            WHEN btrim(t.val->>'key') = '' THEN 'key ist leer'
            WHEN jsonb_typeof(t.val->'de') IS DISTINCT FROM 'string' THEN 'de fehlt oder ist kein Text'
            WHEN btrim(t.val->>'de') = '' THEN 'de ist leer'
            WHEN t.val ? 'seed' AND jsonb_typeof(t.val->'seed') IS DISTINCT FROM 'object' THEN 'seed ist kein Objekt'
            WHEN EXISTS (
              SELECT 1 FROM jsonb_each(coalesce(t.val->'seed', '{}'::jsonb)) s
               WHERE jsonb_typeof(s.value) IS DISTINCT FROM 'string'
                  OR btrim(s.value #>> '{}') = ''
            ) THEN 'Startwert ist leer oder kein Text'
            WHEN EXISTS (
              SELECT 1 FROM jsonb_each(coalesce(t.val->'seed', '{}'::jsonb)) s
               WHERE NOT EXISTS (
                 SELECT 1 FROM public.cms_locales l
                  WHERE l.locale = s.key AND l.is_active AND NOT l.is_source)
            ) THEN 'Startwert für eine nicht aktive Zielsprache'
            ELSE NULL
          END AS problem
        ) c
       WHERE c.problem IS NOT NULL
       LIMIT 25
    ) q;

  IF v_problems IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'applied', false,
      'error', 'entries_invalid_rows',
      'message', 'Einzelne Manifest-Einträge sind ungültig. Es wurde nichts geändert.',
      'problems', v_problems);
  END IF;

  -- Normalisieren (nur Kleinschreibung des Bereichs und Randleerzeichen).
  SELECT jsonb_agg(jsonb_build_object(
           'namespace', lower(btrim(t.val->>'namespace')),
           'string_key', btrim(t.val->>'key'),
           'source_text', t.val->>'de',
           'seed', coalesce(t.val->'seed', '{}'::jsonb)))
    INTO v_norm
    FROM jsonb_array_elements(v_entries) AS t(val);

  SELECT jsonb_agg(d.id ORDER BY d.id)
    INTO v_dupes
    FROM (
      SELECT m.namespace || '|' || m.string_key AS id
        FROM jsonb_to_recordset(v_norm) AS m(namespace text, string_key text, source_text text, seed jsonb)
       GROUP BY 1 HAVING count(*) > 1
       LIMIT 25
    ) d;

  IF v_dupes IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'applied', false,
      'error', 'entries_duplicate_keys',
      'message', 'Das Manifest enthält denselben Schlüssel mehrfach. Es wurde nichts geändert.',
      'duplicates', v_dupes);
  END IF;

  -- Gemeinsam installierter Trigger-Vertrag (Grundlage für die Aussage
  -- über die Unterdrückung des EIGENEN Imports).
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = 'cms_autopilot_trg_ui_strings'
       AND p.prosrc LIKE '%cms.suppress_ui_string_autopilot%')
    INTO v_trigger_ok;

  -- -------------------------------------------------------------- Bericht
  -- Ausschließlich lesend. Die Kandidaten sind DIESELBEN wie beim
  -- Anwenden, einschließlich der Startwerte neuer Schlüssel.
  WITH m AS (
    SELECT * FROM jsonb_to_recordset(v_norm)
      AS x(namespace text, string_key text, source_text text, seed jsonb)
  ), joined AS (
    SELECT m.*, u.id AS ui_id, u.source_text AS db_source,
           coalesce(u.is_active, true) AS is_active
      FROM m LEFT JOIN public.cms_ui_strings u
        ON u.namespace = m.namespace AND u.string_key = m.string_key
  ), seedrows AS (
    SELECT j.namespace, j.string_key, j.ui_id, j.db_source, j.source_text,
           j.is_active, s.key AS locale
      FROM joined j
      CROSS JOIN LATERAL jsonb_each_text(j.seed) s(key, value)
  ), classified AS (
    SELECT sr.*,
      -- Reihenfolge ist Teil des Vertrags: der verwaiste Prüfzustand wird
      -- AUCH bei noch fehlender Quellzeile geprüft. Sonst meldete der
      -- Bericht einen Startwert-Kandidaten, den das Anwenden überspringt.
      CASE
        WHEN sr.ui_id IS NOT NULL AND sr.db_source IS DISTINCT FROM sr.source_text
          THEN 'quellkonflikt'
        WHEN sr.ui_id IS NOT NULL AND NOT sr.is_active THEN 'stillgelegt'
        WHEN sr.ui_id IS NOT NULL AND EXISTS (
               SELECT 1 FROM public.cms_ui_string_translations t
                WHERE t.ui_string_id = sr.ui_id AND t.locale = sr.locale)
          THEN 'vorhanden'
        WHEN EXISTS (SELECT 1 FROM public.cms_translation_unit_state st
                      WHERE st.area = 'ui_string'
                        AND st.ref_key = sr.namespace || '|' || sr.string_key
                        AND st.unit_key = sr.string_key
                        AND st.locale = sr.locale)
          THEN 'verwaister_pruefzustand'
        WHEN sr.ui_id IS NULL THEN 'neu'
        ELSE 'kandidat'
      END AS kind
      FROM seedrows sr
  )
  SELECT jsonb_build_object(
    'manifest_entries', v_count,
    'catalog_rows_total', (SELECT count(*) FROM public.cms_ui_strings),
    'catalog_rows_active', (SELECT count(*) FROM public.cms_ui_strings WHERE is_active),
    'missing_sources', (SELECT count(*) FROM joined WHERE ui_id IS NULL),
    'missing_sources_sample', coalesce((
      SELECT jsonb_agg(namespace || ':' || string_key)
        FROM (SELECT namespace, string_key FROM joined WHERE ui_id IS NULL
               ORDER BY namespace, string_key LIMIT 25) s), '[]'::jsonb),
    'source_conflicts', (SELECT count(*) FROM joined
                          WHERE ui_id IS NOT NULL AND db_source IS DISTINCT FROM source_text),
    'source_conflicts_sample', coalesce((
      SELECT jsonb_agg(namespace || ':' || string_key)
        FROM (SELECT namespace, string_key FROM joined
               WHERE ui_id IS NOT NULL AND db_source IS DISTINCT FROM source_text
               ORDER BY namespace, string_key LIMIT 25) s), '[]'::jsonb),
    'skipped_inactive_sources', (SELECT count(*) FROM joined
                                  WHERE ui_id IS NOT NULL AND NOT is_active),
    'skipped_inactive_seeds', (SELECT count(*) FROM classified WHERE kind = 'stillgelegt'),
    'review_state_conflicts', (SELECT count(*) FROM classified
                                WHERE kind = 'verwaister_pruefzustand'),
    'review_state_conflicts_sample', coalesce((
      SELECT jsonb_agg(namespace || ':' || string_key || '@' || locale)
        FROM (SELECT namespace, string_key, locale FROM classified
               WHERE kind = 'verwaister_pruefzustand'
               ORDER BY namespace, string_key, locale LIMIT 25) s), '[]'::jsonb),
    'db_only_active', (SELECT count(*) FROM public.cms_ui_strings u
                        WHERE u.is_active AND NOT EXISTS (
                          SELECT 1 FROM m WHERE m.namespace = u.namespace
                             AND m.string_key = u.string_key)),
    'db_only_inactive', (SELECT count(*) FROM public.cms_ui_strings u
                          WHERE NOT u.is_active AND NOT EXISTS (
                            SELECT 1 FROM m WHERE m.namespace = u.namespace
                               AND m.string_key = u.string_key)),
    'existing_translations', (SELECT count(*) FROM public.cms_ui_string_translations),
    'seed_candidates', (SELECT count(*) FROM classified WHERE kind IN ('neu', 'kandidat')),
    'missing_translations', coalesce((
      SELECT jsonb_object_agg(locale, n) FROM (
        SELECT c.locale, count(*) AS n FROM classified c
         WHERE c.kind IN ('neu', 'kandidat')
         GROUP BY c.locale) q), '{}'::jsonb))
    INTO v_report;

  IF v_dry THEN
    RETURN jsonb_build_object(
      'success', true, 'applied', false, 'dry_run', true,
      'protocol_version', 2,
      'manifest_version', v_version,
      'trigger_suppression_supported', v_trigger_ok,
      'report', v_report,
      'message', 'Nur Bericht. Es wurde nichts geändert.');
  END IF;

  -- ------------------------------------------------------------ Anwenden
  -- Fail-closed: ohne den gemeinsam installierten Trigger-Vertrag wird
  -- nicht geschrieben, weil dann Übersetzungsaufträge entstehen könnten.
  IF NOT v_trigger_ok THEN
    RETURN jsonb_build_object('success', false, 'applied', false,
      'error', 'trigger_contract_missing',
      'message', 'Der Trigger-Vertrag für die transaktionslokale Unterdrückung fehlt. Es wurde nichts geändert.');
  END IF;

  v_prev := coalesce(current_setting('cms.suppress_ui_string_autopilot', true), '');
  PERFORM set_config('cms.suppress_ui_string_autopilot', 'on', true);

  -- a) fehlende Katalogschlüssel: nur einfügen
  INSERT INTO public.cms_ui_strings
    (namespace, string_key, source_text, source_hash, manifest_version)
  SELECT m.namespace, m.string_key, m.source_text,
         public.cms_translation_hash(m.source_text), v_version
    FROM jsonb_to_recordset(v_norm)
      AS m(namespace text, string_key text, source_text text, seed jsonb)
   WHERE NOT EXISTS (
     SELECT 1 FROM public.cms_ui_strings u
      WHERE u.namespace = m.namespace AND u.string_key = m.string_key)
   ORDER BY m.namespace, m.string_key
  ON CONFLICT (namespace, string_key) DO NOTHING;
  GET DIAGNOSTICS v_inserted_strings = ROW_COUNT;

  -- b) betroffene Katalogzeilen kurz und gezielt sperren (feste
  --    Reihenfolge, kein Tabellen-Lock, keine Auftrags-/Inhaltstabellen).
  --    Danach werden Quelltext, Sichtbarkeit und das Fehlen der Zielzeile
  --    erneut geprüft.
  PERFORM u.id
     FROM public.cms_ui_strings u
    WHERE (u.namespace, u.string_key) IN (
            SELECT m.namespace, m.string_key
              FROM jsonb_to_recordset(v_norm)
                AS m(namespace text, string_key text, source_text text, seed jsonb))
    ORDER BY u.namespace, u.string_key
      FOR UPDATE;

  -- c) fehlende Startwerte: nur einfügen, nur bei gleichem Quelltext,
  --    nur bei aktiver Katalogzeile, nur ohne bestehende Zielzeile und
  --    nur ohne bestehenden Prüfzustand (sonst erschiene der Startwert
  --    als freigegeben).
  WITH m AS (
    SELECT * FROM jsonb_to_recordset(v_norm)
      AS x(namespace text, string_key text, source_text text, seed jsonb)
  ), candidate AS (
    SELECT u.id AS ui_id, u.namespace, u.string_key, u.source_hash,
           s.key AS locale, s.value AS seed_value
      FROM m
      JOIN public.cms_ui_strings u
        ON u.namespace = m.namespace AND u.string_key = m.string_key
      CROSS JOIN LATERAL jsonb_each_text(m.seed) s(key, value)
     WHERE u.source_text = m.source_text
       AND u.is_active
       AND NOT EXISTS (
         SELECT 1 FROM public.cms_ui_string_translations t
          WHERE t.ui_string_id = u.id AND t.locale = s.key)
       AND NOT EXISTS (
         SELECT 1 FROM public.cms_translation_unit_state st
          WHERE st.area = 'ui_string'
            AND st.ref_key = u.namespace || '|' || u.string_key
            AND st.unit_key = u.string_key
            AND st.locale = s.key)
     ORDER BY u.namespace, u.string_key, s.key
  ), ins AS (
    INSERT INTO public.cms_ui_string_translations (ui_string_id, locale, value)
    SELECT c.ui_id, c.locale, c.seed_value FROM candidate c
    ON CONFLICT (ui_string_id, locale) DO NOTHING
    RETURNING ui_string_id, locale
  ), state AS (
    INSERT INTO public.cms_translation_unit_state
      (area, ref_key, unit_key, locale, review_status, source_hash)
    SELECT 'ui_string', u.namespace || '|' || u.string_key, u.string_key,
           i.locale, 'maschinell', u.source_hash
      FROM ins i JOIN public.cms_ui_strings u ON u.id = i.ui_string_id
    ON CONFLICT (area, ref_key, unit_key, locale) DO NOTHING
    RETURNING 1
  )
  SELECT (SELECT count(*) FROM ins), (SELECT count(*) FROM state)
    INTO v_inserted_seeds, v_state_rows;

  -- Startwert und Prüfzustand entstehen paarweise. Weicht die Zahl ab,
  -- bricht die gesamte Transaktion ab (kein halber Zustand).
  IF v_state_rows IS DISTINCT FROM v_inserted_seeds THEN
    RAISE EXCEPTION
      'Startwerte und Prüfzustände weichen ab (% zu %). Es wird nichts geschrieben.',
      v_inserted_seeds, v_state_rows;
  END IF;

  -- alte Einstellung wiederherstellen (die Kennung ist ohnehin nur
  -- innerhalb dieser Transaktion gültig)
  PERFORM set_config('cms.suppress_ui_string_autopilot', v_prev, true);

  RETURN jsonb_build_object(
    'success', true, 'applied', true, 'dry_run', false,
    'protocol_version', 2,
    'manifest_version', v_version,
    'inserted_strings', v_inserted_strings,
    'inserted_translations', v_inserted_seeds,
    'inserted_review_states', v_state_rows,
    'trigger_suppression_supported', v_trigger_ok,
    -- Aussage nur über DIESE Transaktion. Über Aufträge anderer
    -- Transaktionen (z. B. gleichzeitige Redaktion) wird nichts behauptet.
    'own_import_autopilot_suppressed', true,
    'report', v_report);
END;
$function$;

REVOKE ALL ON FUNCTION public.rpc_admin_sync_ui_strings(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_sync_ui_strings(jsonb) TO service_role;