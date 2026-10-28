-- =====================================================================
-- Etappe 3A: Vollstaendige Seitenkopie (Fassung 2).
-- Additiv: ersetzt sechs vorhandene Funktionskoerper. Keine neue
-- Funktion, kein neues Ausfuehrungsrecht. Keine Tabellen-, Policy-,
-- Rechte-, Scheduler- oder Datenaenderung.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Transaktionslokale Kennung fuer die Seitenkopie.
--    Die Pruefung steht direkt in den vorhandenen Triggerfunktionen;
--    es gibt bewusst KEINE zusaetzliche Hilfsfunktion.
--    Ausserhalb der Kopie ist das Verhalten unveraendert.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cms_autopilot_trg_pages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF coalesce(current_setting('cms.suppress_page_copy_autopilot', true), '') = 'on' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE'
     AND public.cms_translation_normalize(NEW.title_de) = public.cms_translation_normalize(OLD.title_de) THEN
    RETURN NEW;
  END IF;
  PERFORM public.cms_autopilot_enqueue_unit(
    'page_title', NEW.id, NEW.page_key, '-', 'title', NEW.title_de);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cms_autopilot_trg_assets()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF coalesce(current_setting('cms.suppress_page_copy_autopilot', true), '') = 'on' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE'
     AND public.cms_translation_normalize(NEW.alt_de) = public.cms_translation_normalize(OLD.alt_de) THEN
    RETURN NEW;
  END IF;
  IF coalesce(NEW.is_active, true) = false THEN RETURN NEW; END IF;
  PERFORM public.cms_autopilot_enqueue_unit(
    'asset_alt', NEW.id, NEW.page_key, NEW.section_key, 'alt', NEW.alt_de);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cms_autopilot_trg_section_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF coalesce(current_setting('cms.suppress_page_copy_autopilot', true), '') = 'on' THEN
    RETURN NEW;
  END IF;
  IF NEW.locale <> 'de' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE'
     AND public.cms_translation_normalize(NEW.value) = public.cms_translation_normalize(OLD.value) THEN
    RETURN NEW;
  END IF;
  PERFORM public.cms_autopilot_enqueue_unit(
    'section_field', NULL, NEW.page_key, NEW.section_key, NEW.field_key, NEW.value);
  RETURN NEW;
END;
$function$;

-- Navigationstrigger: Normallogik unveraendert (live abgeglichen),
-- nur die transaktionslokale Kennung kommt hinzu.
CREATE OR REPLACE FUNCTION public.cms_autopilot_trg_nav()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF coalesce(current_setting('cms.suppress_page_copy_autopilot', true), '') = 'on' THEN
    RETURN NEW;
  END IF;
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
$function$;

CREATE OR REPLACE FUNCTION public.cms_card_v1_seed_whitelist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  fk text;
  loc text;
  fields text[] := ARRAY[
    'icon','icon_enabled','image_enabled','eyebrow','eyebrow_enabled',
    'bullets.0','bullets.1','bullets.2','bullets.3','bullets.4',
    'bullets_0_enabled','bullets_1_enabled','bullets_2_enabled','bullets_3_enabled','bullets_4_enabled',
    'chips.0','chips.1','chips.2','chips.3','chips.4',
    'chips_0_enabled','chips_1_enabled','chips_2_enabled','chips_3_enabled','chips_4_enabled',
    'link_1_label','link_1_href','link_1_kind','link_1_enabled',
    'link_2_label','link_2_href','link_2_kind','link_2_enabled',
    'link_3_label','link_3_href','link_3_kind','link_3_enabled'
  ];
  locales text[] := ARRAY['de','en'];
BEGIN
  -- Waehrend der Seitenkopie wird die Whitelist exakt aus der Quelle
  -- uebernommen. Kein Vorab-Seed, damit keine zusaetzlichen Freigaben
  -- entstehen und keine Doppelanlage (23505) auftritt.
  IF coalesce(current_setting('cms.suppress_page_copy_autopilot', true), '') = 'on' THEN
    RETURN NEW;
  END IF;
  IF NEW.section_type <> 'card_v1' THEN
    RETURN NEW;
  END IF;
  FOREACH fk IN ARRAY fields LOOP
    FOREACH loc IN ARRAY locales LOOP
      INSERT INTO public.cms_admin_editable_fields
        (page_key, section_key, field_key, locale, is_enabled)
      VALUES (NEW.page_key, NEW.section_key, fk, loc, true)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------
-- 2) Vollstaendige Seitenkopie. Signatur unveraendert.
--    Laufzeitgrenzen als Funktions-SET: sie gelten nur waehrend des
--    Aufrufs und wirken nicht in die umgebende Transaktion hinein.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.rpc_admin_duplicate_page(
  p_source_page_key text,
  p_new_page_key text,
  p_new_route_path text,
  p_nav_area text DEFAULT NULL::text,
  p_nav_parent_node_key text DEFAULT NULL::text,
  p_nav_node_key text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET lock_timeout TO '3s'
SET statement_timeout TO '60s'
AS $function$
DECLARE
  _src public.cms_pages%ROWTYPE;
  _snap jsonb;
  _new_key text;
  _new_route text;
  _exists boolean;
  _new_page_id uuid;
  _new_page_no integer;
  _sections_copied int := 0;
  _fields_copied int := 0;
  _whitelist_copied int := 0;
  _assets_copied int := 0;
  _page_translations_copied int := 0;
  _asset_translations_copied int := 0;
  _unit_states_copied int := 0;
  _nav_translations_copied int := 0;
  _nav_states_copied int := 0;
  _nav_area text;
  _nav_node_key text;
  _nav_parent_id uuid;
  _nav_sort_order int;
  _nav_node_id uuid;
  _nav_node_no int;
  _lbl_de text;
  _lbl_en text;
  _lbl_pl text;
  _prev_flag text;
  _bad int;
  _total int;
  _reachable int;
  _snapshot_at timestamptz;
  _a record;
  _new_asset_id uuid;
BEGIN
  _new_key   := nullif(btrim(coalesce(p_new_page_key, '')), '');
  _new_route := nullif(btrim(coalesce(p_new_route_path, '')), '');
  _nav_area  := nullif(btrim(coalesce(p_nav_area, '')), '');

  IF _new_key IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'new_page_key_required');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.cms_pages WHERE page_key = p_source_page_key) THEN
    RETURN jsonb_build_object('success', false, 'error', 'source_not_found',
      'source_page_key', p_source_page_key);
  END IF;

  IF _new_key = p_source_page_key THEN
    RETURN jsonb_build_object('success', false, 'error', 'target_page_key_exists',
      'new_page_key', _new_key);
  END IF;

  -- Schutz gegen wiederholten Klick: transaktionslokale Sperren auf
  -- Zielschluessel UND angeforderte Route (zwei verschiedene Schluessel
  -- koennten dieselbe Route beanspruchen). Feste Reihenfolge, kein
  -- Tabellenlock, kein Warten auf Uebersetzungsauftraege.
  PERFORM pg_advisory_xact_lock(hashtext('rpc_admin_duplicate_page:page_key:' || _new_key));
  IF _new_route IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext('rpc_admin_duplicate_page:route_path:' || _new_route));
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.cms_pages WHERE page_key = _new_key) INTO _exists;
  IF _exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'target_page_key_exists',
      'new_page_key', _new_key);
  END IF;

  IF _new_route IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM public.cms_pages WHERE route_path = _new_route) INTO _exists;
    IF _exists THEN
      RETURN jsonb_build_object('success', false, 'error', 'target_route_path_exists',
        'new_route_path', _new_route);
    END IF;
  END IF;

  IF _nav_area IS NOT NULL THEN
    IF _nav_area NOT IN ('home','main','persona','meta','footer','footer_bottom') THEN
      RETURN jsonb_build_object('success', false, 'error', 'nav_area_invalid',
        'nav_area', _nav_area);
    END IF;

    _nav_node_key := nullif(btrim(coalesce(p_nav_node_key, '')), '');
    IF _nav_node_key IS NULL THEN
      _nav_node_key := replace(_new_key, '.', '-');
    END IF;

    SELECT EXISTS(
      SELECT 1 FROM public.cms_navigation_nodes
       WHERE nav_area = _nav_area AND node_key = _nav_node_key
    ) INTO _exists;
    IF _exists THEN
      RETURN jsonb_build_object('success', false, 'error', 'nav_node_key_exists',
        'nav_area', _nav_area, 'node_key', _nav_node_key);
    END IF;

    IF p_nav_parent_node_key IS NOT NULL AND btrim(p_nav_parent_node_key) <> '' THEN
      SELECT id INTO _nav_parent_id
        FROM public.cms_navigation_nodes
       WHERE nav_area = _nav_area
         AND node_key = btrim(p_nav_parent_node_key)
       LIMIT 1;
      IF _nav_parent_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'nav_parent_not_found',
          'nav_area', _nav_area, 'parent_node_key', p_nav_parent_node_key);
      END IF;
    END IF;
  END IF;

  -- -------------------------------------------------------------------
  -- EIN Lese-Snapshot aller Quelldaten in genau einer Anweisung.
  -- Damit koennen Seite, Bausteine, Felder, Whitelist, Medien,
  -- Uebersetzungen und Zustaende sich nicht widersprechen.
  -- -------------------------------------------------------------------
  _snapshot_at := clock_timestamp();

  SELECT jsonb_build_object(
    'page', to_jsonb(p),
    'sections', coalesce((SELECT jsonb_agg(to_jsonb(s))
                            FROM public.cms_sections s
                           WHERE s.page_key = p.page_key), '[]'::jsonb),
    'fields', coalesce((SELECT jsonb_agg(to_jsonb(f))
                          FROM public.cms_section_fields f
                         WHERE f.page_key = p.page_key), '[]'::jsonb),
    'whitelist', coalesce((SELECT jsonb_agg(to_jsonb(w))
                             FROM public.cms_admin_editable_fields w
                            WHERE w.page_key = p.page_key), '[]'::jsonb),
    'assets', coalesce((SELECT jsonb_agg(to_jsonb(a))
                          FROM public.cms_assets a
                         WHERE a.page_key = p.page_key), '[]'::jsonb),
    'asset_tr', coalesce((SELECT jsonb_agg(to_jsonb(t))
                            FROM public.cms_asset_translations t
                           WHERE t.asset_id IN (SELECT a.id FROM public.cms_assets a
                                                 WHERE a.page_key = p.page_key)), '[]'::jsonb),
    'page_tr', coalesce((SELECT jsonb_agg(to_jsonb(t))
                           FROM public.cms_page_translations t
                          WHERE t.page_id = p.id), '[]'::jsonb),
    'states', coalesce((SELECT jsonb_agg(to_jsonb(st))
                          FROM public.cms_translation_unit_state st
                         WHERE (st.area = 'page_title' AND st.ref_key = p.page_key)
                            OR (st.area = 'asset_alt'
                                AND st.ref_key IN (SELECT a.id::text FROM public.cms_assets a
                                                    WHERE a.page_key = p.page_key))), '[]'::jsonb)
  )
  INTO _snap
  FROM public.cms_pages p
  WHERE p.page_key = p_source_page_key;

  IF _snap IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'source_not_found',
      'source_page_key', p_source_page_key);
  END IF;

  _src := jsonb_populate_record(NULL::public.cms_pages, _snap->'page');

  -- Arbeitstabellen ausschliesslich aus dem Snapshot. Alle Namen sind
  -- ausdruecklich pg_temp-qualifiziert, damit niemals eine gleichnamige
  -- Tabelle im Schema public getroffen werden kann.
  DROP TABLE IF EXISTS pg_temp._dup_sections;
  DROP TABLE IF EXISTS pg_temp._dup_fields;
  DROP TABLE IF EXISTS pg_temp._dup_whitelist;
  DROP TABLE IF EXISTS pg_temp._dup_assets;
  DROP TABLE IF EXISTS pg_temp._dup_asset_tr;
  DROP TABLE IF EXISTS pg_temp._dup_page_tr;
  DROP TABLE IF EXISTS pg_temp._dup_states;
  DROP TABLE IF EXISTS pg_temp._dup_map;
  DROP TABLE IF EXISTS pg_temp._dup_asset_map;

  CREATE TEMP TABLE pg_temp._dup_sections ON COMMIT DROP AS
    SELECT * FROM jsonb_populate_recordset(NULL::public.cms_sections, _snap->'sections');
  CREATE TEMP TABLE pg_temp._dup_fields ON COMMIT DROP AS
    SELECT * FROM jsonb_populate_recordset(NULL::public.cms_section_fields, _snap->'fields');
  CREATE TEMP TABLE pg_temp._dup_whitelist ON COMMIT DROP AS
    SELECT * FROM jsonb_populate_recordset(NULL::public.cms_admin_editable_fields, _snap->'whitelist');
  CREATE TEMP TABLE pg_temp._dup_assets ON COMMIT DROP AS
    SELECT * FROM jsonb_populate_recordset(NULL::public.cms_assets, _snap->'assets');
  CREATE TEMP TABLE pg_temp._dup_asset_tr ON COMMIT DROP AS
    SELECT * FROM jsonb_populate_recordset(NULL::public.cms_asset_translations, _snap->'asset_tr');
  CREATE TEMP TABLE pg_temp._dup_page_tr ON COMMIT DROP AS
    SELECT * FROM jsonb_populate_recordset(NULL::public.cms_page_translations, _snap->'page_tr');
  CREATE TEMP TABLE pg_temp._dup_states ON COMMIT DROP AS
    SELECT * FROM jsonb_populate_recordset(NULL::public.cms_translation_unit_state, _snap->'states');

  -- Fremder Eltern-Verweis?
  SELECT count(*) INTO _bad
    FROM pg_temp._dup_sections s
   WHERE s.parent_section_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_temp._dup_sections p WHERE p.id = s.parent_section_id);
  IF _bad > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'section_parent_foreign',
      'source_page_key', _src.page_key, 'affected', _bad);
  END IF;

  -- Zyklus in der Elternkette? Unbegrenzte, endliche Graphpruefung:
  -- alle Verweise zeigen jetzt nachweislich in die Kopie, also ist der
  -- Graph genau dann zyklenfrei, wenn von den Wurzeln (parent IS NULL)
  -- jede Zeile erreichbar ist. UNION dedupliziert und terminiert.
  SELECT count(*) INTO _total FROM pg_temp._dup_sections;
  WITH RECURSIVE reachable(id) AS (
    SELECT s.id FROM pg_temp._dup_sections s WHERE s.parent_section_id IS NULL
    UNION
    SELECT s.id
      FROM pg_temp._dup_sections s
      JOIN reachable r ON s.parent_section_id = r.id
  )
  SELECT count(*) INTO _reachable FROM reachable;
  IF _reachable <> _total THEN
    RETURN jsonb_build_object('success', false, 'error', 'section_parent_cycle',
      'source_page_key', _src.page_key, 'affected', _total - _reachable);
  END IF;

  -- -------------------------------------------------------------------
  -- Ab hier Schreiben. Autopilot- und Karten-Seed-Trigger sind nur fuer
  -- diese Transaktion stillgestellt; danach wieder Normalverhalten.
  -- -------------------------------------------------------------------
  _prev_flag := current_setting('cms.suppress_page_copy_autopilot', true);
  PERFORM set_config('cms.suppress_page_copy_autopilot', 'on', true);

  INSERT INTO public.cms_pages
    (page_key, route_path, page_type, title_de, title_en, title_pl, status, is_active)
  VALUES
    (_new_key, _new_route, _src.page_type,
     _src.title_de, _src.title_en, _src.title_pl, 'draft', false)
  RETURNING id, page_no INTO _new_page_id, _new_page_no;

  CREATE TEMP TABLE pg_temp._dup_map ON COMMIT DROP AS
  WITH ins AS (
    INSERT INTO public.cms_sections
      (page_key, section_key, section_type, sort_order, is_active, section_no, parent_section_id)
    SELECT _new_key, s.section_key, s.section_type, s.sort_order, s.is_active, s.section_no, NULL
      FROM pg_temp._dup_sections s
     ORDER BY s.sort_order, s.section_key
    RETURNING id, section_key
  )
  SELECT i.id AS new_id, s.id AS old_id, i.section_key
    FROM ins i JOIN pg_temp._dup_sections s ON s.section_key = i.section_key;
  SELECT count(*) INTO _sections_copied FROM pg_temp._dup_map;

  UPDATE public.cms_sections t
     SET parent_section_id = pm.new_id
    FROM pg_temp._dup_map m
    JOIN pg_temp._dup_sections s ON s.id = m.old_id
    JOIN pg_temp._dup_map pm ON pm.old_id = s.parent_section_id
   WHERE t.id = m.new_id;

  INSERT INTO public.cms_section_fields
    (page_key, section_key, field_key, locale, value, value_json, review_status, source_hash)
  SELECT _new_key, f.section_key, f.field_key, f.locale, f.value, f.value_json,
         f.review_status, f.source_hash
    FROM pg_temp._dup_fields f;
  GET DIAGNOSTICS _fields_copied = ROW_COUNT;

  INSERT INTO public.cms_admin_editable_fields
    (page_key, section_key, field_key, locale, is_enabled)
  SELECT _new_key, w.section_key, w.field_key, w.locale, w.is_enabled
    FROM pg_temp._dup_whitelist w;
  GET DIAGNOSTICS _whitelist_copied = ROW_COUNT;

  CREATE TEMP TABLE pg_temp._dup_asset_map (old_id uuid, new_id uuid) ON COMMIT DROP;

  FOR _a IN SELECT * FROM pg_temp._dup_assets ORDER BY sort_order, asset_no LOOP
    INSERT INTO public.cms_assets (
      page_key, section_key, asset_role, locale,
      storage_path, public_url, alt_text_de, alt_text_en, alt_text_pl,
      focal_x, focal_y, sort_order, is_active,
      field_key, file_name, mime_type, alt_de, alt_en, alt_pl, viewport
    ) VALUES (
      _new_key, _a.section_key, _a.asset_role, _a.locale,
      _a.storage_path, _a.public_url, _a.alt_text_de, _a.alt_text_en, _a.alt_text_pl,
      _a.focal_x, _a.focal_y, _a.sort_order, _a.is_active,
      _a.field_key, _a.file_name, _a.mime_type, _a.alt_de, _a.alt_en, _a.alt_pl, _a.viewport
    )
    RETURNING id INTO _new_asset_id;
    INSERT INTO pg_temp._dup_asset_map(old_id, new_id) VALUES (_a.id, _new_asset_id);
    _assets_copied := _assets_copied + 1;
  END LOOP;

  INSERT INTO public.cms_asset_translations (asset_id, locale, alt_text)
  SELECT m.new_id, t.locale, t.alt_text
    FROM pg_temp._dup_asset_tr t JOIN pg_temp._dup_asset_map m ON m.old_id = t.asset_id;
  GET DIAGNOSTICS _asset_translations_copied = ROW_COUNT;

  INSERT INTO public.cms_page_translations (page_id, locale, title)
  SELECT _new_page_id, t.locale, t.title FROM pg_temp._dup_page_tr t;
  GET DIAGNOSTICS _page_translations_copied = ROW_COUNT;

  -- Vergleich als Text: 'page_title' fuehrt ref_key = page_key, deshalb darf
  -- ref_key nie nach uuid gecastet werden.
  INSERT INTO public.cms_translation_unit_state
    (area, ref_key, unit_key, locale, review_status, source_hash)
  SELECT s.area,
         CASE WHEN s.area = 'page_title' THEN _new_key ELSE m.new_id::text END,
         s.unit_key, s.locale, s.review_status, s.source_hash
    FROM pg_temp._dup_states s
    LEFT JOIN pg_temp._dup_asset_map m
           ON s.area = 'asset_alt' AND m.old_id::text = s.ref_key
   WHERE s.area = 'page_title' OR m.new_id IS NOT NULL;
  GET DIAGNOSTICS _unit_states_copied = ROW_COUNT;

  IF _nav_area IS NOT NULL THEN
    SELECT COALESCE(MAX(sort_order), 0) + 10 INTO _nav_sort_order
      FROM public.cms_navigation_nodes
     WHERE nav_area = _nav_area
       AND (
         (_nav_parent_id IS NULL AND parent_id IS NULL)
         OR parent_id = _nav_parent_id
       );

    -- Beschriftung: vertikale Titelzeile hat Vorrang, die vorhandenen
    -- Titelspalten dienen nur als Ersatz, wenn keine Zeile existiert.
    -- Ein bewusst leerer vertikaler Titel bleibt leer.
    IF EXISTS (SELECT 1 FROM pg_temp._dup_page_tr WHERE locale = 'de') THEN
      SELECT title INTO _lbl_de FROM pg_temp._dup_page_tr WHERE locale = 'de';
    ELSE
      _lbl_de := _src.title_de;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_temp._dup_page_tr WHERE locale = 'en') THEN
      SELECT title INTO _lbl_en FROM pg_temp._dup_page_tr WHERE locale = 'en';
    ELSE
      _lbl_en := _src.title_en;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_temp._dup_page_tr WHERE locale = 'pl') THEN
      SELECT title INTO _lbl_pl FROM pg_temp._dup_page_tr WHERE locale = 'pl';
    ELSE
      _lbl_pl := _src.title_pl;
    END IF;

    INSERT INTO public.cms_navigation_nodes (
      nav_area, node_key, parent_id, page_key,
      label_de, label_en, label_pl, sort_order,
      is_active, show_in_public_nav, node_type
    ) VALUES (
      _nav_area, _nav_node_key, _nav_parent_id, _new_key,
      _lbl_de, _lbl_en, _lbl_pl, _nav_sort_order,
      false, false, 'page'
    )
    RETURNING id, node_no INTO _nav_node_id, _nav_node_no;

    -- Weitere Sprachen: genau die vorhandenen vertikalen Titelzeilen
    -- ausser 'de', einschliesslich en/pl. Kein deutscher Ersatztext.
    INSERT INTO public.cms_navigation_node_translations (node_id, locale, label)
    SELECT _nav_node_id, t.locale, t.title
      FROM pg_temp._dup_page_tr t
     WHERE t.locale <> 'de';
    GET DIAGNOSTICS _nav_translations_copied = ROW_COUNT;

    -- Prüfzustand der Beschriftung: aus dem passenden page_title-Zustand.
    -- Ohne Nachweis 'maschinell' — niemals 'geprueft'.
    INSERT INTO public.cms_translation_unit_state
      (area, ref_key, unit_key, locale, review_status, source_hash)
    SELECT 'nav_label', _nav_node_id::text, 'label', l.locale,
           coalesce(st.review_status, 'maschinell'), st.source_hash
      FROM (
        SELECT t.locale FROM pg_temp._dup_page_tr t WHERE t.locale <> 'de'
        UNION
        SELECT 'en' WHERE _lbl_en IS NOT NULL
        UNION
        SELECT 'pl' WHERE _lbl_pl IS NOT NULL
      ) l
      LEFT JOIN pg_temp._dup_states st
             ON st.area = 'page_title'
            AND st.unit_key = 'title'
            AND st.locale = l.locale
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS _nav_states_copied = ROW_COUNT;
  END IF;

  -- Kennung exakt auf den vorherigen Wert zuruecksetzen.
  PERFORM set_config('cms.suppress_page_copy_autopilot', coalesce(_prev_flag, ''), true);

  RETURN jsonb_build_object(
    'success', true,
    'source_page_key', _src.page_key,
    'source_page_no', _src.page_no,
    'new_page_key', _new_key,
    'new_page_no', _new_page_no,
    'new_page_id', _new_page_id,
    'new_route_path', _new_route,
    'sections_copied', _sections_copied,
    'fields_copied', _fields_copied,
    'whitelist_copied', _whitelist_copied,
    'assets_copied', _assets_copied,
    'page_translations_copied', _page_translations_copied,
    'asset_translations_copied', _asset_translations_copied,
    'unit_states_copied', _unit_states_copied,
    'nav_translations_copied', _nav_translations_copied,
    'nav_states_copied', _nav_states_copied,
    'autopilot_suppressed_in_this_transaction', true,
    'source_snapshot_at', _snapshot_at,
    'nav_node_id', _nav_node_id,
    'nav_node_no', _nav_node_no,
    'nav_area', _nav_area,
    'nav_node_key', _nav_node_key,
    'nav_parent_id', _nav_parent_id
  );
END;
$function$;