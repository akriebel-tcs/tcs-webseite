-- Transaktionaler Test für den ADDITIVEN Katalogabgleich (Etappe 2B).
--
-- WICHTIG: Dieser Test setzt voraus, dass der Entwurf aus
-- docs/04-betrieb/sql-entwurf-ui-katalog-abgleich-2026-09-14.md
-- eingespielt wurde. Solange der Entwurf NICHT ANGEWENDET ist, schlägt
-- dieser Test erwartungsgemäß fehl — er ist kein Nachweis für den
-- Live-Zustand.
--
-- Der Test läuft vollständig in einer Transaktion und rollt am Ende
-- zurück (ROLLBACK). Er verändert keine Daten dauerhaft.
--
-- Aufruf (nur mit service_role-Verbindung, nicht automatisch):
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rpc_admin_sync_ui_strings_additiv.sql

BEGIN;

DO $$
DECLARE
  v_ns text := 'test_2b_' || substr(md5(random()::text), 1, 8);
  v_locale text;
  v_out jsonb;
  v_id uuid;
  v_jobs_before bigint;
  v_jobs_after bigint;
  v_manifest jsonb;
BEGIN
  SELECT l.locale INTO v_locale
    FROM public.cms_locales l
   WHERE l.is_active AND NOT l.is_source
   ORDER BY l.sort_order, l.locale
   LIMIT 1;
  IF v_locale IS NULL THEN
    RAISE EXCEPTION 'Kein aktives Ziel-Sprachkürzel vorhanden — Test nicht durchführbar';
  END IF;

  -- ------------------------------------------------- 1) ungültige Eingaben
  v_out := public.rpc_admin_sync_ui_strings(NULL);
  ASSERT v_out->>'error' = 'manifest_invalid', 'NULL muss abgelehnt werden';

  v_out := public.rpc_admin_sync_ui_strings(jsonb_build_object('version', 'v1', 'entries', '[]'::jsonb));
  ASSERT v_out->>'error' = 'entries_empty', 'Leere Liste muss abgelehnt werden';

  v_out := public.rpc_admin_sync_ui_strings(jsonb_build_object(
    'version', '', 'entries', jsonb_build_array(jsonb_build_object('namespace','a','key','b','de','c'))));
  ASSERT v_out->>'error' = 'version_invalid', 'Fehlende Version muss abgelehnt werden';

  v_out := public.rpc_admin_sync_ui_strings(jsonb_build_object(
    'version', 'v1', 'dry_run', 'ja',
    'entries', jsonb_build_array(jsonb_build_object('namespace','a','key','b','de','c'))));
  ASSERT v_out->>'error' = 'dry_run_invalid', 'dry_run muss boolean sein';

  v_out := public.rpc_admin_sync_ui_strings(jsonb_build_object(
    'version', 'v1',
    'entries', jsonb_build_array(jsonb_build_object('namespace', v_ns, 'key', 'k1', 'de', '   '))));
  ASSERT v_out->>'error' = 'entries_invalid_rows', 'Leerer deutscher Text muss abbrechen, nicht filtern';

  v_out := public.rpc_admin_sync_ui_strings(jsonb_build_object(
    'version', 'v1',
    'entries', jsonb_build_array(
      jsonb_build_object('namespace', v_ns, 'key', 'k1', 'de', 'Eins'),
      jsonb_build_object('namespace', v_ns, 'key', 'k1', 'de', 'Eins'))));
  ASSERT v_out->>'error' = 'entries_duplicate_keys', 'Doppelter Schlüssel muss abbrechen';

  v_out := public.rpc_admin_sync_ui_strings(jsonb_build_object(
    'version', 'v1',
    'entries', jsonb_build_array(jsonb_build_object(
      'namespace', v_ns, 'key', 'k1', 'de', 'Eins',
      'seed', jsonb_build_object('xx', 'Wert')))));
  ASSERT v_out->>'error' = 'entries_invalid_rows', 'Startwert für unbekannte Sprache muss abbrechen';

  -- ------------------------------------------------------- 2) Dry-run
  v_manifest := jsonb_build_object(
    'version', 'v1',
    'entries', jsonb_build_array(jsonb_build_object(
      'namespace', v_ns, 'key', 'k1', 'de', 'Eins',
      'seed', jsonb_build_object(v_locale, 'One'))));

  v_out := public.rpc_admin_sync_ui_strings(v_manifest);
  ASSERT (v_out->>'success')::boolean, 'Dry-run muss gelingen';
  ASSERT NOT (v_out->>'applied')::boolean, 'Dry-run darf nichts anwenden';
  ASSERT (v_out->'report'->>'missing_sources')::int >= 1, 'Fehlende Quelle muss berichtet werden';
  ASSERT NOT EXISTS (SELECT 1 FROM public.cms_ui_strings WHERE namespace = v_ns),
    'Dry-run darf keine Katalogzeile anlegen';

  -- --------------------------------------------- 3) Anwenden (INSERT-only)
  SELECT count(*) INTO v_jobs_before FROM public.cms_translation_jobs WHERE area = 'ui_string';

  v_out := public.rpc_admin_sync_ui_strings(v_manifest || jsonb_build_object('dry_run', false));
  ASSERT (v_out->>'applied')::boolean, 'Anwenden muss greifen';
  ASSERT (v_out->>'inserted_strings')::int = 1, 'Genau eine neue Katalogzeile';
  ASSERT (v_out->>'inserted_translations')::int = 1, 'Genau eine neue Übersetzungszeile';
  ASSERT (v_out->>'autopilot_suppressed')::boolean, 'Es darf kein Auftrag entstehen';
  ASSERT (v_out->>'ui_jobs_created')::int = 0, 'Auftragszahl muss unverändert bleiben';

  SELECT count(*) INTO v_jobs_after FROM public.cms_translation_jobs WHERE area = 'ui_string';
  ASSERT v_jobs_after = v_jobs_before, 'Keine neuen Übersetzungsaufträge beim Katalogimport';

  SELECT id INTO v_id FROM public.cms_ui_strings WHERE namespace = v_ns AND string_key = 'k1';
  ASSERT v_id IS NOT NULL, 'Katalogzeile muss existieren';

  -- Neue Startwerte dürfen KEINE Freigabe erhalten
  ASSERT EXISTS (
    SELECT 1 FROM public.cms_translation_unit_state s
     WHERE s.area = 'ui_string' AND s.ref_key = v_ns || '|k1'
       AND s.locale = v_locale AND s.review_status = 'maschinell'),
    'Neuer Startwert muss unkuratiert (maschinell) sein';

  -- ------------------------------------------------- 4) Wiederholung
  v_out := public.rpc_admin_sync_ui_strings(v_manifest || jsonb_build_object('dry_run', false));
  ASSERT (v_out->>'inserted_strings')::int = 0, 'Wiederholung legt nichts erneut an';
  ASSERT (v_out->>'inserted_translations')::int = 0, 'Wiederholung ersetzt keinen Zieltext';

  -- --------------------------- 5) redaktionelle Werte bleiben unberührt
  UPDATE public.cms_ui_string_translations SET value = 'Von Hand'
   WHERE ui_string_id = v_id AND locale = v_locale;
  UPDATE public.cms_translation_unit_state SET review_status = 'geprueft'
   WHERE area = 'ui_string' AND ref_key = v_ns || '|k1' AND locale = v_locale;
  UPDATE public.cms_ui_strings SET source_text = 'Redaktionell geändert', is_active = false
   WHERE id = v_id;

  v_out := public.rpc_admin_sync_ui_strings(v_manifest || jsonb_build_object('dry_run', false));
  ASSERT (v_out->'report'->>'source_conflicts')::int >= 1, 'Quellenkonflikt muss berichtet werden';
  ASSERT (SELECT source_text FROM public.cms_ui_strings WHERE id = v_id) = 'Redaktionell geändert',
    'Deutsche Quelle darf nicht überschrieben werden';
  ASSERT (SELECT is_active FROM public.cms_ui_strings WHERE id = v_id) = false,
    'Sichtbarkeit darf nicht reaktiviert werden';
  ASSERT (SELECT value FROM public.cms_ui_string_translations
           WHERE ui_string_id = v_id AND locale = v_locale) = 'Von Hand',
    'Redaktioneller Zieltext bleibt';
  ASSERT (SELECT review_status FROM public.cms_translation_unit_state
           WHERE area = 'ui_string' AND ref_key = v_ns || '|k1' AND locale = v_locale) = 'geprueft',
    'Bestehende Freigabe bleibt';

  -- ------------------- 6) bewusst leere Übersetzung wird nicht ersetzt
  UPDATE public.cms_ui_strings SET source_text = 'Eins', is_active = true WHERE id = v_id;
  UPDATE public.cms_ui_string_translations SET value = '' WHERE ui_string_id = v_id AND locale = v_locale;
  v_out := public.rpc_admin_sync_ui_strings(v_manifest || jsonb_build_object('dry_run', false));
  ASSERT (SELECT value FROM public.cms_ui_string_translations
           WHERE ui_string_id = v_id AND locale = v_locale) = '',
    'Bewusst leere Übersetzung bleibt leer';

  -- --------------------- 7) bestehende DB-only-Zeilen bleiben erhalten
  ASSERT (v_out->'report'->>'db_only_active') IS NOT NULL, 'DB-only-Zeilen müssen berichtet werden';
  ASSERT (SELECT count(*) FROM public.cms_ui_strings WHERE namespace <> v_ns AND NOT is_active)
       = (SELECT count(*) FROM public.cms_ui_strings WHERE namespace <> v_ns AND NOT is_active),
    'Stillgelegte Fremdzeilen bleiben unverändert';

  RAISE NOTICE 'Alle Prüfungen bestanden (Transaktion wird zurückgerollt).';
END $$;

ROLLBACK;
