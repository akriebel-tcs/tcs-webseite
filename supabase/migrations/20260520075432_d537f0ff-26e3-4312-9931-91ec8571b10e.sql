DO $mig$
DECLARE
  v_reg text[] := ARRAY[
    'zutrittskontrolle.elektronischer-knaufzylinder',
    'zutrittskontrolle.bcm-handsender',
    'zutrittskontrolle.funkvernetzte-offline-leser',
    'zutrittskontrolle.bcm-online-leser',
    'zutrittskontrolle.vorhaengeschloss'
  ];
  v_all text[] := ARRAY[
    'zutrittskontrolle.elektronischer-knaufzylinder',
    'zutrittskontrolle.bcm-handsender',
    'zutrittskontrolle.funkvernetzte-offline-leser',
    'zutrittskontrolle.bcm-online-leser',
    'zutrittskontrolle.vorhaengeschloss',
    'zutrittskontrolle.biometrie'
  ];
  v_pk text;
  v_idx int;
  v_max int;
  v_parent_id uuid;
BEGIN
  -- 0a) Sicherstellen, dass genug benefit_N-Kindersections existieren.
  FOREACH v_pk IN ARRAY v_all LOOP
    -- max benötigter Index aus Quellen
    SELECT GREATEST(
      COALESCE((SELECT MAX((split_part(field_key,'.',2))::int) + 1
                FROM cms_section_fields
                WHERE page_key = v_pk AND section_key IN ('vorteile','produkte')
                  AND field_key ~ '^items\.[0-9]+\.'), 0),
      0
    ) INTO v_max;

    IF v_max > 0 THEN
      SELECT id INTO v_parent_id FROM cms_sections
       WHERE page_key = v_pk AND section_key = 'benefits' LIMIT 1;

      FOR v_idx IN 1..v_max LOOP
        INSERT INTO cms_sections (page_key, section_key, section_type, parent_section_id, sort_order, is_active)
        VALUES (v_pk, 'benefit_' || v_idx, 'card_v1', v_parent_id, v_idx * 10, true)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;

    -- usecase_N
    SELECT COALESCE((SELECT MAX((split_part(field_key,'.',2))::int) + 1
              FROM cms_section_fields
              WHERE page_key = v_pk AND section_key = 'anwendungen'
                AND field_key ~ '^items\.[0-9]+\.'), 0)
      INTO v_max;

    IF v_max > 0 THEN
      SELECT id INTO v_parent_id FROM cms_sections
       WHERE page_key = v_pk AND section_key = 'useCases' LIMIT 1;
      FOR v_idx IN 1..v_max LOOP
        INSERT INTO cms_sections (page_key, section_key, section_type, parent_section_id, sort_order, is_active)
        VALUES (v_pk, 'usecase_' || v_idx, 'card_v1', v_parent_id, v_idx * 10, true)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;
  END LOOP;

  -- 0b) Whitelist-Einträge für ALLE existierenden benefit_*/usecase_* nachziehen
  INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
  SELECT s.page_key, s.section_key, f.fkey, l.loc, true
  FROM cms_sections s
  CROSS JOIN (VALUES ('title'),('desc'),('icon'),('image')) AS f(fkey)
  CROSS JOIN (VALUES ('de'),('en')) AS l(loc)
  WHERE s.page_key = ANY(v_all)
    AND s.section_key LIKE 'benefit\_%'
    AND s.parent_section_id IS NOT NULL
  ON CONFLICT DO NOTHING;

  INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
  SELECT s.page_key, s.section_key, f.fkey, l.loc, true
  FROM cms_sections s
  CROSS JOIN (VALUES ('title'),('text'),('icon'),('image')) AS f(fkey)
  CROSS JOIN (VALUES ('de'),('en')) AS l(loc)
  WHERE s.page_key = ANY(v_all)
    AND s.section_key LIKE 'usecase\_%'
    AND s.parent_section_id IS NOT NULL
  ON CONFLICT DO NOTHING;

  -- 1) Vorteile-Items → benefit_{N+1}.title / .desc  (5 reguläre Seiten)
  INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
  SELECT
    page_key,
    'benefit_' || ((split_part(field_key, '.', 2))::int + 1),
    CASE split_part(field_key, '.', 3)
      WHEN 'title' THEN 'title'
      WHEN 'description' THEN 'desc'
    END,
    locale,
    value
  FROM cms_section_fields
  WHERE page_key = ANY(v_reg)
    AND section_key = 'vorteile'
    AND field_key ~ '^items\.[0-9]+\.(title|description)$'
    AND value IS NOT NULL
  ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

  -- 2) Anwendungen-Items → usecase_{N+1}.title / .text  (alle 6 Seiten)
  INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
  SELECT
    page_key,
    'usecase_' || ((split_part(field_key, '.', 2))::int + 1),
    CASE split_part(field_key, '.', 3)
      WHEN 'title' THEN 'title'
      WHEN 'description' THEN 'text'
    END,
    locale,
    value
  FROM cms_section_fields
  WHERE page_key = ANY(v_all)
    AND section_key = 'anwendungen'
    AND field_key ~ '^items\.[0-9]+\.(title|description)$'
    AND value IS NOT NULL
  ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

  -- 3) BIOMETRIE — Produkte-Items.headline → benefit_{N+1}.title
  INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
  SELECT
    page_key,
    'benefit_' || ((split_part(field_key, '.', 2))::int + 1),
    'title',
    locale,
    value
  FROM cms_section_fields
  WHERE page_key = 'zutrittskontrolle.biometrie'
    AND section_key = 'produkte'
    AND field_key ~ '^items\.[0-9]+\.headline$'
    AND value IS NOT NULL
  ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

  -- 4) BIOMETRIE — produkte.items.N.vorteile.* → benefit_{N+1}.desc (Bullets verkettet)
  INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
  SELECT
    page_key,
    'benefit_' || ((split_part(field_key, '.', 2))::int + 1),
    'desc',
    locale,
    string_agg('• ' || value, E'\n' ORDER BY (split_part(field_key, '.', 4))::int)
  FROM cms_section_fields
  WHERE page_key = 'zutrittskontrolle.biometrie'
    AND section_key = 'produkte'
    AND field_key ~ '^items\.[0-9]+\.vorteile\.[0-9]+$'
    AND value IS NOT NULL
  GROUP BY page_key, split_part(field_key, '.', 2), locale
  ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

  -- 5) Container „Vorteile" — label + title auf benefits
  INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
  SELECT p.page_key, 'benefits', 'label', l.loc,
         CASE l.loc WHEN 'de' THEN 'Vorteile' ELSE 'Advantages' END
  FROM cms_pages p, (VALUES ('de'),('en')) AS l(loc)
  WHERE p.page_key = ANY(v_all)
  ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

  INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
  SELECT page_key, 'benefits', 'title', locale, value
  FROM cms_section_fields
  WHERE page_key = ANY(v_reg)
    AND section_key = 'vorteile' AND field_key = 'headline'
    AND value IS NOT NULL
  ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

  INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
  SELECT page_key, 'benefits', 'title', locale, value
  FROM cms_section_fields
  WHERE page_key = 'zutrittskontrolle.biometrie'
    AND section_key = 'produkte' AND field_key = 'headline'
    AND value IS NOT NULL
  ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

  -- 6) Container „Anwendungen" — label + title auf useCases
  INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
  SELECT p.page_key, 'useCases', 'label', l.loc,
         CASE l.loc WHEN 'de' THEN 'Anwendungen' ELSE 'Applications' END
  FROM cms_pages p, (VALUES ('de'),('en')) AS l(loc)
  WHERE p.page_key = ANY(v_all)
  ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

  INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
  SELECT page_key, 'useCases', 'title', locale, value
  FROM cms_section_fields
  WHERE page_key = ANY(v_all)
    AND section_key = 'anwendungen' AND field_key = 'headline'
    AND value IS NOT NULL
  ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

  -- 7) Leere Karten-Unterblöcke deaktivieren (kein Inhalt → nicht im Admin sichtbar)
  UPDATE cms_sections s
  SET is_active = false
  WHERE s.page_key = ANY(v_all)
    AND s.parent_section_id IS NOT NULL
    AND (s.section_key LIKE 'benefit\_%' OR s.section_key LIKE 'usecase\_%')
    AND NOT EXISTS (
      SELECT 1 FROM cms_section_fields f
      WHERE f.page_key = s.page_key AND f.section_key = s.section_key
        AND f.value IS NOT NULL AND length(trim(f.value)) > 0
    );
END
$mig$;