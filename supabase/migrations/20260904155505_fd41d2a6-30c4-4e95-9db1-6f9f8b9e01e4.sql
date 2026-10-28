DO $$
DECLARE
  v_page text := 'anwendungen.einfamilienhaus';
  v_parent uuid;
  v_keys text[] := ARRAY['uebersicht__karte_1','uebersicht__karte_2','uebersicht__karte_3','uebersicht__karte_4','uebersicht__karte_5'];
  k text;
  i int := 0;
  fk text;
  loc text;
BEGIN
  -- Platz schaffen: alles ausser Hero nach hinten
  UPDATE cms_sections SET sort_order = sort_order + 1, updated_at = now()
   WHERE page_key = v_page AND parent_section_id IS NULL AND sort_order >= 1
     AND section_key <> 'uebersicht';

  INSERT INTO cms_sections (page_key, section_key, section_type, sort_order, is_active)
  VALUES (v_page, 'uebersicht', 'cards_v1', 1, true)
  ON CONFLICT DO NOTHING;

  UPDATE cms_sections SET sort_order = 1, section_type = 'cards_v1', is_active = true, updated_at = now()
   WHERE page_key = v_page AND section_key = 'uebersicht';

  SELECT id INTO v_parent FROM cms_sections WHERE page_key = v_page AND section_key = 'uebersicht';

  -- Blockfelder
  FOREACH fk IN ARRAY ARRAY['title','intro','label','section_bg'] LOOP
    FOREACH loc IN ARRAY ARRAY['de','en'] LOOP
      INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
      VALUES (v_page, 'uebersicht', fk, loc, '')
      ON CONFLICT DO NOTHING;
      INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
      VALUES (v_page, 'uebersicht', fk, loc, true)
      ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE SET is_enabled = true, updated_at = now();
    END LOOP;
  END LOOP;

  FOREACH k IN ARRAY v_keys LOOP
    i := i + 1;
    INSERT INTO cms_sections (page_key, section_key, section_type, sort_order, is_active, parent_section_id)
    VALUES (v_page, k, 'card_v1', i, true, v_parent)
    ON CONFLICT DO NOTHING;
    UPDATE cms_sections SET section_type = 'card_v1', sort_order = i, is_active = true,
           parent_section_id = v_parent, updated_at = now()
     WHERE page_key = v_page AND section_key = k;

    FOREACH fk IN ARRAY ARRAY['title','description','eyebrow','link_1_label','link_1_href','image'] LOOP
      FOREACH loc IN ARRAY ARRAY['de','en'] LOOP
        IF fk <> 'image' THEN
          INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
          VALUES (v_page, k, fk, loc, '')
          ON CONFLICT DO NOTHING;
        END IF;
        INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
        VALUES (v_page, k, fk, loc, true)
        ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE SET is_enabled = true, updated_at = now();
      END LOOP;
    END LOOP;

    -- Link 1 sichtbar schalten (technisches Feld, nur DE-Zeile wird gelesen)
    FOREACH loc IN ARRAY ARRAY['de','en'] LOOP
      INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
      VALUES (v_page, k, 'link_1_enabled', loc, '1')
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  PERFORM cms_renumber_sections(v_page);
END $$;