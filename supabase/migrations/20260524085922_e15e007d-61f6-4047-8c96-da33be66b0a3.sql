-- ============================================================================
-- Tranche 8 — gebaeudekommunikation.snipdoo-ip: card_v1-Kinder für
-- audiences und anwendungen (Klasse-D-Restposten räumen).
-- Legacy items.* bleiben als Fallback erhalten.
-- ============================================================================

DO $$
DECLARE
  v_page text := 'gebaeudekommunikation.snipdoo-ip';
  v_audiences_id uuid;
  v_anwendungen_id uuid;
BEGIN
  SELECT id INTO v_audiences_id FROM cms_sections
    WHERE page_key = v_page AND section_key = 'audiences';
  SELECT id INTO v_anwendungen_id FROM cms_sections
    WHERE page_key = v_page AND section_key = 'anwendungen';

  -- Audiences-Karten (card_v1)
  INSERT INTO cms_sections (page_key, section_key, section_type, sort_order, parent_section_id, is_active)
  VALUES
    (v_page, 'audiences.installateure', 'card_v1', 10, v_audiences_id, true),
    (v_page, 'audiences.planer',        'card_v1', 20, v_audiences_id, true),
    (v_page, 'audiences.betreiber',     'card_v1', 30, v_audiences_id, true)
  ON CONFLICT (page_key, section_key) DO NOTHING;

  -- Anwendungen-Karten (card_v1)
  INSERT INTO cms_sections (page_key, section_key, section_type, sort_order, parent_section_id, is_active)
  VALUES
    (v_page, 'anwendungen.efh',     'card_v1', 10, v_anwendungen_id, true),
    (v_page, 'anwendungen.mfh',     'card_v1', 20, v_anwendungen_id, true),
    (v_page, 'anwendungen.gewerbe', 'card_v1', 30, v_anwendungen_id, true)
  ON CONFLICT (page_key, section_key) DO NOTHING;
END $$;

-- Felder kopieren: subtitle ← items.<k>.label, title ← items.<k>.title,
-- description ← items.<k>.text. Existierende Werte werden nicht überschrieben.
INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT 'gebaeudekommunikation.snipdoo-ip',
       'audiences.' || k,
       CASE src WHEN 'label' THEN 'subtitle' WHEN 'title' THEN 'title' WHEN 'text' THEN 'description' END,
       loc,
       (SELECT value FROM cms_section_fields
         WHERE page_key='gebaeudekommunikation.snipdoo-ip'
           AND section_key='audiences'
           AND field_key='items.'||k||'.'||src
           AND locale=loc)
FROM (VALUES ('installateure'),('planer'),('betreiber')) AS a(k),
     (VALUES ('label'),('title'),('text')) AS s(src),
     (VALUES ('de'),('en')) AS l(loc)
WHERE (SELECT value FROM cms_section_fields
        WHERE page_key='gebaeudekommunikation.snipdoo-ip'
          AND section_key='audiences'
          AND field_key='items.'||k||'.'||src
          AND locale=loc) IS NOT NULL
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT 'gebaeudekommunikation.snipdoo-ip',
       'anwendungen.' || k,
       CASE src WHEN 'label' THEN 'subtitle' WHEN 'title' THEN 'title' WHEN 'text' THEN 'description' END,
       loc,
       (SELECT value FROM cms_section_fields
         WHERE page_key='gebaeudekommunikation.snipdoo-ip'
           AND section_key='anwendungen'
           AND field_key='items.'||k||'.'||src
           AND locale=loc)
FROM (VALUES ('efh'),('mfh'),('gewerbe')) AS a(k),
     (VALUES ('label'),('title'),('text')) AS s(src),
     (VALUES ('de'),('en')) AS l(loc)
WHERE (SELECT value FROM cms_section_fields
        WHERE page_key='gebaeudekommunikation.snipdoo-ip'
          AND section_key='anwendungen'
          AND field_key='items.'||k||'.'||src
          AND locale=loc) IS NOT NULL
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

-- Icon-Felder für audiences (Lucide-Textwerte)
INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
VALUES
  ('gebaeudekommunikation.snipdoo-ip', 'audiences.installateure', 'icon', 'de', 'wrench'),
  ('gebaeudekommunikation.snipdoo-ip', 'audiences.installateure', 'icon', 'en', 'wrench'),
  ('gebaeudekommunikation.snipdoo-ip', 'audiences.planer',        'icon', 'de', 'ruler'),
  ('gebaeudekommunikation.snipdoo-ip', 'audiences.planer',        'icon', 'en', 'ruler'),
  ('gebaeudekommunikation.snipdoo-ip', 'audiences.betreiber',     'icon', 'de', 'building-2'),
  ('gebaeudekommunikation.snipdoo-ip', 'audiences.betreiber',     'icon', 'en', 'building-2')
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

-- Whitelist (Admin-pflegbar)
INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT 'gebaeudekommunikation.snipdoo-ip', sk, fk, loc, true
FROM (
  SELECT 'audiences.'||k AS sk, f AS fk
    FROM (VALUES ('installateure'),('planer'),('betreiber')) a(k),
         (VALUES ('subtitle'),('title'),('description'),('icon'),('icon_image')) f(f)
  UNION ALL
  SELECT 'anwendungen.'||k AS sk, f AS fk
    FROM (VALUES ('efh'),('mfh'),('gewerbe')) a(k),
         (VALUES ('subtitle'),('title'),('description'),('image')) f(f)
) x,
(VALUES ('de'),('en')) AS l(loc)
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
