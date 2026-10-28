-- Kategorien-Listen für Zutrittskontrolle (1.2) und Eingangslösungen (1.3)
-- Spiegelt die Struktur von produkte.tuerkommunikation/filter-grid (catalog_filter_grid_v1 + card_v1).
-- Idempotent: nutzt ON CONFLICT auf section_key/field-Kombi.

DO $$
DECLARE
  v_parent_id uuid;
  v_page text;
  v_section_no int;
  rec record;
  cards_zk constant jsonb := '[
    {"key":"online-leser","sort":10,"title_de":"Online Leser","title_en":"Online readers","sub_de":"Vernetzt & live verwaltbar","sub_en":"Networked & live-managed"},
    {"key":"offline-leser","sort":20,"title_de":"Offline Leser","title_en":"Offline readers","sub_de":"Standalone, ohne Netzwerk","sub_en":"Standalone, no network"},
    {"key":"biometrische-leser","sort":30,"title_de":"Biometrische Leser","title_en":"Biometric readers","sub_de":"Fingerprint & Gesichtserkennung","sub_en":"Fingerprint & face recognition"},
    {"key":"zentralen","sort":40,"title_de":"Zentralen","title_en":"Controllers","sub_de":"Steuerung & Hardware-Hubs","sub_en":"Control & hardware hubs"},
    {"key":"software","sort":50,"title_de":"Software","title_en":"Software","sub_de":"Verwaltung, Logging, Rechte","sub_en":"Management, logging, permissions"},
    {"key":"zubehoer","sort":60,"title_de":"Zubehör","title_en":"Accessories","sub_de":"Karten, Transponder, Halter","sub_en":"Cards, transponders, holders"}
  ]'::jsonb;
  cards_el constant jsonb := '[
    {"key":"standard-briefkaesten","sort":10,"title_de":"Standard Briefkästen","title_en":"Standard mailboxes","sub_de":"Norm- & Serienlösungen","sub_en":"Standard & series solutions"},
    {"key":"architektur-entry","sort":20,"title_de":"Architektur Entry","title_en":"Architecture Entry","sub_de":"Designorientierte Eingangsensembles","sub_en":"Design-led entrance ensembles"},
    {"key":"individueller-metallbau","sort":30,"title_de":"Individueller Metallbau","title_en":"Custom metalwork","sub_de":"Maßanfertigung nach Plan","sub_en":"Custom-built to plan"},
    {"key":"signage","sort":40,"title_de":"Signage","title_en":"Signage","sub_de":"Beschriftung, Hausnummern, Leitsysteme","sub_en":"Lettering, house numbers, wayfinding"}
  ]'::jsonb;
  pages text[] := ARRAY['produkte.zutrittskontrolle','produkte.eingangsloesungen'];
  cards jsonb;
BEGIN
  FOREACH v_page IN ARRAY pages LOOP
    cards := CASE WHEN v_page = 'produkte.zutrittskontrolle' THEN cards_zk ELSE cards_el END;

    -- Parent-Section "category-grid" sicherstellen
    SELECT id INTO v_parent_id FROM cms_sections
     WHERE page_key = v_page AND section_key = 'category-grid';

    IF v_parent_id IS NULL THEN
      INSERT INTO cms_sections (page_key, section_key, section_type, sort_order, is_active)
      VALUES (v_page, 'category-grid', 'catalog_filter_grid_v1', 10, true)
      RETURNING id INTO v_parent_id;
    ELSE
      UPDATE cms_sections SET section_type='catalog_filter_grid_v1', sort_order=10, is_active=true, updated_at=now()
       WHERE id = v_parent_id;
    END IF;

    -- Header-Texte für category-grid
    INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
    VALUES
      (v_page, 'category-grid', 'title', 'de', 'Kategorien'),
      (v_page, 'category-grid', 'title', 'en', 'Categories')
    ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

    -- Karten
    FOR rec IN SELECT * FROM jsonb_array_elements(cards) AS c LOOP
      DECLARE
        c jsonb := rec.value;
        skey text := 'category-grid.' || (c->>'key');
        sid uuid;
      BEGIN
        SELECT id INTO sid FROM cms_sections WHERE page_key=v_page AND section_key=skey;
        IF sid IS NULL THEN
          INSERT INTO cms_sections (page_key, section_key, section_type, parent_section_id, sort_order, is_active)
          VALUES (v_page, skey, 'card_v1', v_parent_id, (c->>'sort')::int, true)
          RETURNING id INTO sid;
        ELSE
          UPDATE cms_sections SET section_type='card_v1', parent_section_id=v_parent_id,
                 sort_order=(c->>'sort')::int, is_active=true, updated_at=now()
           WHERE id = sid;
        END IF;

        INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value) VALUES
          (v_page, skey, 'title', 'de', c->>'title_de'),
          (v_page, skey, 'title', 'en', c->>'title_en'),
          (v_page, skey, 'subtitle', 'de', c->>'sub_de'),
          (v_page, skey, 'subtitle', 'en', c->>'sub_en'),
          (v_page, skey, 'slug', 'de', c->>'key')
        ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE
          SET value = EXCLUDED.value, updated_at = now();
      END;
    END LOOP;
  END LOOP;
END $$;
