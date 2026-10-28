
-- =====================================================================
-- Tranche 4: GK card_v1 child sections
-- =====================================================================

DO $mig$
DECLARE
  v_card RECORD;
  v_parent_id uuid;
  v_child_id uuid;
  v_sort int;
BEGIN
  -- Definition aller neuen Karten
  FOR v_card IN
    SELECT * FROM (VALUES
      -- briefkastenanlagen.montageformen (3)
      ('gebaeudekommunikation.briefkastenanlagen','montageformen','aufputz',     10, 'layers',     true,  'image_aufputz'),
      ('gebaeudekommunikation.briefkastenanlagen','montageformen','unterputz',   20, 'maximize-2', true,  'image_unterputz'),
      ('gebaeudekommunikation.briefkastenanlagen','montageformen','stele',       30, 'columns-3',  true,  'image_stele'),
      -- briefkastenanlagen.smart (4)
      ('gebaeudekommunikation.briefkastenanlagen','smart','tuerkommunikation',   10, 'video',         false, NULL),
      ('gebaeudekommunikation.briefkastenanlagen','smart','barrierefrei',        20, 'accessibility', false, NULL),
      ('gebaeudekommunikation.briefkastenanlagen','smart','design',              30, 'palette',       false, NULL),
      ('gebaeudekommunikation.briefkastenanlagen','smart','beschriftung',        40, 'layers',        false, NULL),
      -- systemloesungen.vorteile (6)
      ('gebaeudekommunikation.systemloesungen','vorteile','steuerung',     10, 'users',         false, NULL),
      ('gebaeudekommunikation.systemloesungen','vorteile','sicherheit',    20, 'shield-check',  false, NULL),
      ('gebaeudekommunikation.systemloesungen','vorteile','alarmierung',   30, 'bell',          false, NULL),
      ('gebaeudekommunikation.systemloesungen','vorteile','ablaeufe',      40, 'workflow',      false, NULL),
      ('gebaeudekommunikation.systemloesungen','vorteile','barrierefrei',  50, 'accessibility', false, NULL),
      ('gebaeudekommunikation.systemloesungen','vorteile','fachplanung',   60, 'headphones',    false, NULL),
      -- systemloesungen.fachplanung (3) — ohne Icon
      ('gebaeudekommunikation.systemloesungen','fachplanung','projektierung', 10, NULL, false, NULL),
      ('gebaeudekommunikation.systemloesungen','fachplanung','behoerden',     20, NULL, false, NULL),
      ('gebaeudekommunikation.systemloesungen','fachplanung','service',       30, NULL, false, NULL),
      -- grossanlagen.anforderungen (6)
      ('gebaeudekommunikation.grossanlagen','anforderungen','nutzung',          10, 'building-2', false, NULL),
      ('gebaeudekommunikation.grossanlagen','anforderungen','skalierung',       20, 'network',    false, NULL),
      ('gebaeudekommunikation.grossanlagen','anforderungen','concierge',        30, 'user-cog',   false, NULL),
      ('gebaeudekommunikation.grossanlagen','anforderungen','zufahrt',          40, 'car',        false, NULL),
      ('gebaeudekommunikation.grossanlagen','anforderungen','funk',             50, 'radio',      false, NULL),
      ('gebaeudekommunikation.grossanlagen','anforderungen','namensverwaltung', 60, 'tag',        false, NULL),
      -- grossanlagen.wirtschaftlichkeit (3)
      ('gebaeudekommunikation.grossanlagen','wirtschaftlichkeit','betriebskosten', 10, 'refresh-cw',   false, NULL),
      ('gebaeudekommunikation.grossanlagen','wirtschaftlichkeit','investition',    20, 'shield-check', false, NULL),
      ('gebaeudekommunikation.grossanlagen','wirtschaftlichkeit','architektur',    30, 'building-2',   false, NULL)
    ) AS t(page_key, parent_key, item_key, sort_order, icon_name, mirror_image, image_field_key)
  LOOP
    -- Parent-Section-ID holen
    SELECT id INTO v_parent_id
      FROM cms_sections
     WHERE page_key = v_card.page_key
       AND section_key = v_card.parent_key
       AND parent_section_id IS NULL
     LIMIT 1;

    IF v_parent_id IS NULL THEN
      RAISE NOTICE 'Skipped: parent missing for %.%', v_card.page_key, v_card.parent_key;
      CONTINUE;
    END IF;

    -- Child-Section idempotent anlegen
    INSERT INTO cms_sections (page_key, section_key, section_type, parent_section_id, sort_order, is_active)
    VALUES (
      v_card.page_key,
      v_card.parent_key || '__' || v_card.item_key,
      'card_v1',
      v_parent_id,
      v_card.sort_order,
      true
    )
    ON CONFLICT DO NOTHING;

    -- Child-ID (für Asset-Spiegel)
    SELECT id INTO v_child_id
      FROM cms_sections
     WHERE page_key = v_card.page_key
       AND section_key = v_card.parent_key || '__' || v_card.item_key
       AND section_type = 'card_v1'
     LIMIT 1;

    -- Felder seed (title/description aus Legacy items.X.title/text), nur wenn fehlend
    INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
    SELECT v_card.page_key,
           v_card.parent_key || '__' || v_card.item_key,
           'title',
           locale,
           value
      FROM cms_section_fields
     WHERE page_key = v_card.page_key
       AND section_key = v_card.parent_key
       AND field_key = 'items.' || v_card.item_key || '.title'
    ON CONFLICT DO NOTHING;

    INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
    SELECT v_card.page_key,
           v_card.parent_key || '__' || v_card.item_key,
           'description',
           locale,
           value
      FROM cms_section_fields
     WHERE page_key = v_card.page_key
       AND section_key = v_card.parent_key
       AND field_key = 'items.' || v_card.item_key || '.text'
    ON CONFLICT DO NOTHING;

    -- Icon (DE+EN gleicher Wert) — nur wenn vorhanden
    IF v_card.icon_name IS NOT NULL THEN
      INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
      VALUES
        (v_card.page_key, v_card.parent_key || '__' || v_card.item_key, 'icon', 'de', v_card.icon_name),
        (v_card.page_key, v_card.parent_key || '__' || v_card.item_key, 'icon', 'en', v_card.icon_name)
      ON CONFLICT DO NOTHING;
    END IF;

    -- Whitelist-Einträge
    INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
    VALUES
      (v_card.page_key, v_card.parent_key || '__' || v_card.item_key, 'title', 'de', true),
      (v_card.page_key, v_card.parent_key || '__' || v_card.item_key, 'title', 'en', true),
      (v_card.page_key, v_card.parent_key || '__' || v_card.item_key, 'description', 'de', true),
      (v_card.page_key, v_card.parent_key || '__' || v_card.item_key, 'description', 'en', true)
    ON CONFLICT DO NOTHING;

    IF v_card.icon_name IS NOT NULL THEN
      INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
      VALUES
        (v_card.page_key, v_card.parent_key || '__' || v_card.item_key, 'icon', 'de', true),
        (v_card.page_key, v_card.parent_key || '__' || v_card.item_key, 'icon', 'en', true)
      ON CONFLICT DO NOTHING;
    END IF;

    -- Bild-Spiegel für Montageformen
    IF v_card.mirror_image AND v_card.image_field_key IS NOT NULL THEN
      INSERT INTO cms_assets (
        page_key, section_key, asset_role, field_key, locale,
        storage_path, public_url, alt_text_de, alt_text_en,
        alt_de, alt_en, focal_x, focal_y, sort_order, is_active,
        file_name, mime_type, viewport
      )
      SELECT
        v_card.page_key,
        v_card.parent_key || '__' || v_card.item_key,
        'image',
        'image',
        src.locale,
        src.storage_path, src.public_url, src.alt_text_de, src.alt_text_en,
        src.alt_de, src.alt_en, src.focal_x, src.focal_y, 0, true,
        src.file_name, src.mime_type, src.viewport
      FROM cms_assets src
      WHERE src.page_key = v_card.page_key
        AND src.section_key = v_card.parent_key
        AND src.field_key = v_card.image_field_key
        AND src.is_active
        AND NOT EXISTS (
          SELECT 1 FROM cms_assets dst
          WHERE dst.page_key = v_card.page_key
            AND dst.section_key = v_card.parent_key || '__' || v_card.item_key
            AND dst.field_key = 'image'
            AND COALESCE(dst.viewport,'desktop') = COALESCE(src.viewport,'desktop')
            AND COALESCE(dst.locale,'') = COALESCE(src.locale,'')
        );

      -- Whitelist für image-Slot
      INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
      VALUES
        (v_card.page_key, v_card.parent_key || '__' || v_card.item_key, 'image', 'de', true),
        (v_card.page_key, v_card.parent_key || '__' || v_card.item_key, 'image', 'en', true)
      ON CONFLICT DO NOTHING;
    END IF;

  END LOOP;
END
$mig$;
