
-- =========================================================================
-- Großanlagen + Systemlösungen → teaser_2col_v1
-- Idempotent; alte Felder bleiben erhalten.
-- =========================================================================

-- 1) Section-Typ aktualisieren ----------------------------------------------
UPDATE cms_sections
   SET section_type = 'teaser_2col_v1', updated_at = now()
 WHERE page_key = 'gebaeudekommunikation.grossanlagen'
   AND section_key IN ('concierge','zufahrt','funk','namensanzeige')
   AND section_type <> 'teaser_2col_v1';

UPDATE cms_sections
   SET section_type = 'teaser_2col_v1', updated_at = now()
 WHERE page_key = 'gebaeudekommunikation.systemloesungen'
   AND section_key IN ('concierge','feuerwehr','intern','bidi')
   AND section_type <> 'teaser_2col_v1';

-- 2) Großanlagen: text-Feld aus p1 + p2 zusammensetzen ---------------------
INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT p1.page_key, p1.section_key, 'text', p1.locale,
       COALESCE(p1.value,'') ||
       CASE WHEN p2.value IS NOT NULL AND length(p2.value) > 0
            THEN E'\n\n' || p2.value ELSE '' END
  FROM cms_section_fields p1
  LEFT JOIN cms_section_fields p2
    ON  p2.page_key   = p1.page_key
    AND p2.section_key= p1.section_key
    AND p2.field_key  = 'p2'
    AND p2.locale     = p1.locale
 WHERE p1.page_key   = 'gebaeudekommunikation.grossanlagen'
   AND p1.section_key IN ('concierge','zufahrt','funk','namensanzeige')
   AND p1.field_key  = 'p1'
   AND p1.locale     IN ('de','en')
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

-- 3) Systemlösungen: title := headline (einmalig, falls noch nicht gleich) -
UPDATE cms_section_fields t
   SET value = h.value, updated_at = now()
  FROM cms_section_fields h
 WHERE t.page_key    = 'gebaeudekommunikation.systemloesungen'
   AND t.section_key IN ('concierge','feuerwehr','intern','bidi')
   AND t.field_key   = 'title'
   AND t.locale      IN ('de','en')
   AND h.page_key    = t.page_key
   AND h.section_key = t.section_key
   AND h.field_key   = 'headline'
   AND h.locale      = t.locale
   AND COALESCE(t.value,'') <> COALESCE(h.value,'')
   AND COALESCE(h.value,'') <> '';

-- 4) image_position + background_variant pro Teaser ------------------------
-- Großanlagen: alternierend left/right; default Background.
WITH grossanlagen_layout(section_key, image_position, background_variant) AS (
  VALUES
    ('concierge'    , 'left' , 'default'),
    ('zufahrt'      , 'right', 'default'),
    ('funk'         , 'left' , 'default'),
    ('namensanzeige', 'right', 'default')
),
system_layout(section_key, image_position, background_variant) AS (
  VALUES
    ('concierge', 'left' , 'default'),
    ('feuerwehr', 'right', 'muted'),
    ('intern'   , 'left' , 'default'),
    ('bidi'     , 'right', 'muted')
)
INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT 'gebaeudekommunikation.grossanlagen', section_key, 'image_position', loc, image_position
  FROM grossanlagen_layout, (VALUES ('de'),('en')) AS l(loc)
UNION ALL
SELECT 'gebaeudekommunikation.grossanlagen', section_key, 'background_variant', loc, background_variant
  FROM grossanlagen_layout, (VALUES ('de'),('en')) AS l(loc)
UNION ALL
SELECT 'gebaeudekommunikation.systemloesungen', section_key, 'image_position', loc, image_position
  FROM system_layout, (VALUES ('de'),('en')) AS l(loc)
UNION ALL
SELECT 'gebaeudekommunikation.systemloesungen', section_key, 'background_variant', loc, background_variant
  FROM system_layout, (VALUES ('de'),('en')) AS l(loc)
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

-- 5) Whitelist-Einträge (Admin-pflegbar) -----------------------------------
WITH teaser_targets(page_key, section_key) AS (
  VALUES
    ('gebaeudekommunikation.grossanlagen','concierge'),
    ('gebaeudekommunikation.grossanlagen','zufahrt'),
    ('gebaeudekommunikation.grossanlagen','funk'),
    ('gebaeudekommunikation.grossanlagen','namensanzeige'),
    ('gebaeudekommunikation.systemloesungen','concierge'),
    ('gebaeudekommunikation.systemloesungen','feuerwehr'),
    ('gebaeudekommunikation.systemloesungen','intern'),
    ('gebaeudekommunikation.systemloesungen','bidi')
),
teaser_fields(field_key) AS (
  VALUES ('label'),('title'),('text'),('image_position'),
         ('background_variant'),('cta_label'),('cta_link')
),
teaser_locales(locale) AS (VALUES ('de'),('en'))
INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT t.page_key, t.section_key, f.field_key, l.locale, true
  FROM teaser_targets t, teaser_fields f, teaser_locales l
ON CONFLICT (page_key, section_key, field_key, locale)
  DO UPDATE SET is_enabled = true, updated_at = now();
