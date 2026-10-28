DO $$
DECLARE
  v_page text := 'anwendungen.mehrfamilienhaus';
  v_parent uuid;
  v_new uuid;
BEGIN
  SELECT id INTO v_parent FROM cms_sections WHERE page_key=v_page AND section_key='produkte_aussen';
  IF v_parent IS NULL THEN RAISE EXCEPTION 'container produkte_aussen missing'; END IF;

  INSERT INTO cms_sections (page_key, section_key, section_type, sort_order, is_active, parent_section_id)
  VALUES (v_page, 'produkte_aussen__pespro', 'card_v1', 1, true, v_parent)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_new FROM cms_sections WHERE page_key=v_page AND section_key='produkte_aussen__pespro';
  UPDATE cms_sections SET parent_section_id=v_parent, section_type='card_v1', is_active=true WHERE id=v_new;

  -- Felder DE/EN
  INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
  SELECT v_page, 'produkte_aussen__pespro', f.k, l.loc, f.v
  FROM (VALUES
    ('title','TEXT OFFEN'),
    ('description','TEXT OFFEN'),
    ('eyebrow','TEXT OFFEN'),
    ('eyebrow_enabled','0'),
    ('image_enabled','1'),
    ('link_1_enabled','0'),
    ('link_1_href',''),
    ('link_1_label','')
  ) AS f(k,v)
  CROSS JOIN (VALUES ('de'),('en')) AS l(loc)
  WHERE NOT EXISTS (
    SELECT 1 FROM cms_section_fields x
    WHERE x.page_key=v_page AND x.section_key='produkte_aussen__pespro'
      AND x.field_key=f.k AND x.locale=l.loc
  );

  -- Whitelist wie bei der Schwesterkarte
  INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
  SELECT v_page, 'produkte_aussen__pespro', w.field_key, w.locale, true
  FROM cms_admin_editable_fields w
  WHERE w.page_key=v_page AND w.section_key='produkte_aussen__argos'
    AND NOT EXISTS (
      SELECT 1 FROM cms_admin_editable_fields y
      WHERE y.page_key=v_page AND y.section_key='produkte_aussen__pespro'
        AND y.field_key=w.field_key AND y.locale=w.locale
    );

  -- Bild-Slot: grauer 4:3-Platzhalter
  INSERT INTO cms_assets (page_key, section_key, field_key, asset_role, storage_path, public_url,
                          alt_de, alt_en, viewport, is_active, sort_order, file_name, mime_type)
  SELECT v_page, 'produkte_aussen__pespro', 'image', 'image', a.storage_path, a.public_url,
         'BILDAUFTRAG offen', 'BILDAUFTRAG offen', 'desktop', true, 0, a.file_name, a.mime_type
  FROM cms_assets a
  WHERE a.page_key=v_page AND a.section_key='produkte_aussen__argos' AND a.field_key='image'
  LIMIT 1
  ON CONFLICT DO NOTHING;

  -- Zielreihenfolge
  UPDATE cms_sections SET sort_order = v.ord
  FROM (VALUES
    ('produkte_aussen__argos',0),
    ('produkte_aussen__pespro',1),
    ('produkte_aussen__entry',2),
    ('produkte_aussen__tableau',3),
    ('produkte_aussen__pes',4),
    ('produkte_aussen__ave',5),
    ('produkte_aussen__avu',6)
  ) AS v(k,ord)
  WHERE cms_sections.page_key=v_page AND cms_sections.section_key=v.k;

  PERFORM cms_resequence_sections_dfs(v_page);
END $$;