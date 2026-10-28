-- Pilot-Migration: Wohnbau-Karten als CMS-Light Karten-Blöcke
-- Idempotent. Hängt deterministisch an bestehenden Sections.

DO $migration$
DECLARE
  v_page_key text := 'anwendungen.wohnbau';
  v_cards_id uuid;
  v_card_keys text[] := ARRAY['einfamilienhaus','mehrfamilienhaus','grossanlage','sanierung'];
  v_card_key text;
  v_new_section_key text;
  v_old_field_prefix text;
  v_idx int;
  -- Übersetzungen (Quelle: src/i18n/locales/{de,en}/anwendungen.json → uebersichten.wohnen.cards.*)
  v_titles_de jsonb := '{
    "einfamilienhaus":"Einfamilienhaus",
    "mehrfamilienhaus":"Mehrfamilienhaus",
    "grossanlage":"Großanlage",
    "sanierung":"Sanierung / Bestand"
  }'::jsonb;
  v_titles_en jsonb := '{
    "einfamilienhaus":"Single-family home",
    "mehrfamilienhaus":"Multi-family home",
    "grossanlage":"Large-scale facility",
    "sanierung":"Renovation / existing buildings"
  }'::jsonb;
  v_desc_de jsonb := '{
    "einfamilienhaus":"Komplettsysteme für Ein- und Zweifamilienhäuser – Audio, Video, App-Anbindung und Türöffnung.",
    "mehrfamilienhaus":"Skalierbare Sprechanlagen mit digitaler Zutrittsverwaltung für Wohnanlagen bis 50 Einheiten.",
    "grossanlage":"IP-basierte Vernetzung, zentrale Zutrittskontrolle und snipdoo-Integration für große Wohnanlagen.",
    "sanierung":"Vorhandene Verkabelung nutzen, snipdoo nachrüsten und bestehende Anlagen modernisieren."
  }'::jsonb;
  v_desc_en jsonb := '{
    "einfamilienhaus":"Complete systems for single- and two-family houses – audio, video, app integration and door opening.",
    "mehrfamilienhaus":"Scalable intercom systems with digital access management for residential complexes up to 50 units.",
    "grossanlage":"IP-based networking, central access control and snipdoo integration for large residential complexes.",
    "sanierung":"Use existing cabling, retrofit snipdoo and modernise existing systems."
  }'::jsonb;
  v_tags_de jsonb := '{
    "einfamilienhaus":"Audio/Video, App, Einzelsystem",
    "mehrfamilienhaus":"Verwaltung, BCM, Video",
    "grossanlage":"IP, Planung, Zutritt",
    "sanierung":"Bestandsanbindung, snipdoo, Austausch"
  }'::jsonb;
  v_tags_en jsonb := '{
    "einfamilienhaus":"Audio/video, App, Single system",
    "mehrfamilienhaus":"Administration, BCM, Video",
    "grossanlage":"IP, Planning, Access",
    "sanierung":"Existing connection, snipdoo, Replacement"
  }'::jsonb;
  v_hrefs jsonb := '{
    "einfamilienhaus":"/anwendungen/einfamilienhaus",
    "mehrfamilienhaus":"/anwendungen/mehrfamilienhaus",
    "grossanlage":"/anwendungen/grossanlage",
    "sanierung":"/anwendungen/sanierung"
  }'::jsonb;
BEGIN
  -- 1) Karten-Container vom Typ "content" auf "products" umstellen
  UPDATE cms_sections
     SET section_type = 'products',
         updated_at = now()
   WHERE page_key = v_page_key
     AND section_key = 'cards'
     AND section_type <> 'products';

  SELECT id INTO v_cards_id
    FROM cms_sections
   WHERE page_key = v_page_key AND section_key = 'cards';

  IF v_cards_id IS NULL THEN
    RAISE EXCEPTION 'cards section not found for %', v_page_key;
  END IF;

  -- 2) Vier Kind-Karten (card_v1) anlegen
  v_idx := 0;
  FOREACH v_card_key IN ARRAY v_card_keys
  LOOP
    v_idx := v_idx + 1;
    v_new_section_key := 'card_' || v_card_key;

    INSERT INTO cms_sections (page_key, section_key, section_type, sort_order, parent_section_id, is_active)
    VALUES (v_page_key, v_new_section_key, 'card_v1', v_idx, v_cards_id, true)
    ON CONFLICT (page_key, section_key) DO UPDATE
       SET section_type = EXCLUDED.section_type,
           parent_section_id = EXCLUDED.parent_section_id,
           sort_order = EXCLUDED.sort_order,
           is_active = true,
           updated_at = now();

    -- 3) Felder de+en einfügen, ohne bestehende Werte zu überschreiben
    INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value) VALUES
      (v_page_key, v_new_section_key, 'title',       'de', v_titles_de->>v_card_key),
      (v_page_key, v_new_section_key, 'title',       'en', v_titles_en->>v_card_key),
      (v_page_key, v_new_section_key, 'subtitle',    'de', ''),
      (v_page_key, v_new_section_key, 'subtitle',    'en', ''),
      (v_page_key, v_new_section_key, 'description', 'de', v_desc_de->>v_card_key),
      (v_page_key, v_new_section_key, 'description', 'en', v_desc_en->>v_card_key),
      (v_page_key, v_new_section_key, 'tags',        'de', v_tags_de->>v_card_key),
      (v_page_key, v_new_section_key, 'tags',        'en', v_tags_en->>v_card_key),
      (v_page_key, v_new_section_key, 'href',        'de', v_hrefs->>v_card_key),
      (v_page_key, v_new_section_key, 'href',        'en', v_hrefs->>v_card_key)
    ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

    -- 4) Whitelist für Admin-UI
    INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled) VALUES
      (v_page_key, v_new_section_key, 'title',       'de', true),
      (v_page_key, v_new_section_key, 'title',       'en', true),
      (v_page_key, v_new_section_key, 'subtitle',    'de', true),
      (v_page_key, v_new_section_key, 'subtitle',    'en', true),
      (v_page_key, v_new_section_key, 'description', 'de', true),
      (v_page_key, v_new_section_key, 'description', 'en', true),
      (v_page_key, v_new_section_key, 'tags',        'de', true),
      (v_page_key, v_new_section_key, 'tags',        'en', true),
      (v_page_key, v_new_section_key, 'href',        'de', true),
      (v_page_key, v_new_section_key, 'href',        'en', true)
    ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE
       SET is_enabled = true, updated_at = now();
  END LOOP;
END
$migration$;