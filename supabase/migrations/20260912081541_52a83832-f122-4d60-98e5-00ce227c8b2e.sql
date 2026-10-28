CREATE OR REPLACE FUNCTION public.rpc_admin_sync_ui_strings(p_manifest jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '120s'
AS $function$
DECLARE
  v_version text := coalesce(p_manifest->>'version', 'unbekannt');
  v_inserted int := 0;
  v_source_updated int := 0;
  v_deactivated int := 0;
  v_reactivated int := 0;
  v_seeded jsonb := '{}'::jsonb;
  v_seed_locale text;
  v_seed_count int;
BEGIN
  IF p_manifest IS NULL OR jsonb_typeof(p_manifest->'entries') <> 'array' THEN
    RETURN jsonb_build_object('success', false, 'error', 'manifest_invalid');
  END IF;

  CREATE TEMP TABLE tmp_ui_manifest ON COMMIT DROP AS
  SELECT lower(btrim(e->>'namespace')) AS namespace,
         btrim(e->>'key') AS string_key,
         e->>'de' AS source_text,
         coalesce(e->'seed', '{}'::jsonb) AS seed
    FROM jsonb_array_elements(p_manifest->'entries') e
   WHERE coalesce(btrim(e->>'namespace'), '') <> ''
     AND coalesce(btrim(e->>'key'), '') <> ''
     AND coalesce(btrim(e->>'de'), '') <> '';

  INSERT INTO public.cms_ui_strings (namespace, string_key, source_text, source_hash, manifest_version)
  SELECT m.namespace, m.string_key, m.source_text,
         public.cms_translation_hash(m.source_text), v_version
    FROM tmp_ui_manifest m
   WHERE NOT EXISTS (
     SELECT 1 FROM public.cms_ui_strings u
      WHERE u.namespace = m.namespace AND u.string_key = m.string_key);
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  -- geänderte deutsche Quelltexte; Zieltexte bleiben unberührt und gelten
  -- über den Fingerabdruck automatisch als "muss aktualisiert werden"
  UPDATE public.cms_ui_strings u
     SET source_text = (SELECT m.source_text FROM tmp_ui_manifest m
                         WHERE m.namespace = u.namespace AND m.string_key = u.string_key),
         source_hash = (SELECT public.cms_translation_hash(m.source_text) FROM tmp_ui_manifest m
                         WHERE m.namespace = u.namespace AND m.string_key = u.string_key),
         manifest_version = v_version,
         updated_at = now()
   WHERE u.id IN (
     SELECT u2.id FROM public.cms_ui_strings u2
      JOIN tmp_ui_manifest m ON m.namespace = u2.namespace AND m.string_key = u2.string_key
     WHERE u2.source_text <> m.source_text);
  GET DIAGNOSTICS v_source_updated = ROW_COUNT;

  UPDATE public.cms_ui_strings u
     SET is_active = true, manifest_version = v_version, updated_at = now()
   WHERE u.id IN (
     SELECT u2.id FROM public.cms_ui_strings u2
      JOIN tmp_ui_manifest m ON m.namespace = u2.namespace AND m.string_key = u2.string_key
     WHERE u2.is_active = false);
  GET DIAGNOSTICS v_reactivated = ROW_COUNT;

  -- entfallene Schlüssel: nur stilllegen, nie löschen
  UPDATE public.cms_ui_strings u
     SET is_active = false, updated_at = now()
   WHERE u.id IN (
     SELECT u2.id FROM public.cms_ui_strings u2
      WHERE u2.is_active
        AND NOT EXISTS (SELECT 1 FROM tmp_ui_manifest m
                         WHERE m.namespace = u2.namespace AND m.string_key = u2.string_key));
  GET DIAGNOSTICS v_deactivated = ROW_COUNT;

  -- Startwerte nur dort, wo in der Datenbank noch kein Zieltext steht
  FOR v_seed_locale IN
    SELECT l.locale FROM public.cms_locales l WHERE NOT l.is_source
  LOOP
    INSERT INTO public.cms_ui_string_translations (ui_string_id, locale, value)
    SELECT u.id, v_seed_locale, m.seed->>v_seed_locale
      FROM tmp_ui_manifest m
      JOIN public.cms_ui_strings u
        ON u.namespace = m.namespace AND u.string_key = m.string_key
     WHERE coalesce(btrim(m.seed->>v_seed_locale), '') <> ''
       AND NOT EXISTS (
         SELECT 1 FROM public.cms_ui_string_translations t
          WHERE t.ui_string_id = u.id AND t.locale = v_seed_locale)
    ON CONFLICT (ui_string_id, locale) DO NOTHING;
    GET DIAGNOSTICS v_seed_count = ROW_COUNT;

    -- Startwerte aus den Sprachdateien sind von Hand gepflegt: als geprüft
    -- markieren, damit automatische Läufe sie nicht ersetzen
    INSERT INTO public.cms_translation_unit_state (area, ref_key, unit_key, locale, review_status, source_hash)
    SELECT 'ui_string', u.namespace || '|' || u.string_key, u.string_key, v_seed_locale,
           'geprueft', u.source_hash
      FROM public.cms_ui_strings u
      JOIN public.cms_ui_string_translations t
        ON t.ui_string_id = u.id AND t.locale = v_seed_locale
     WHERE coalesce(btrim(t.value), '') <> ''
    ON CONFLICT (area, ref_key, unit_key, locale) DO NOTHING;

    v_seeded := v_seeded || jsonb_build_object(v_seed_locale, v_seed_count);
  END LOOP;

  PERFORM public.rpc_internal_translation_coverage_invalidate();

  RETURN jsonb_build_object(
    'success', true,
    'manifest_version', v_version,
    'manifest_entries', (SELECT count(*) FROM tmp_ui_manifest),
    'inserted', v_inserted,
    'source_updated', v_source_updated,
    'reactivated', v_reactivated,
    'deactivated', v_deactivated,
    'seeded', v_seeded,
    'catalog_active', (SELECT count(*) FROM public.cms_ui_strings WHERE is_active));
END;
$function$;