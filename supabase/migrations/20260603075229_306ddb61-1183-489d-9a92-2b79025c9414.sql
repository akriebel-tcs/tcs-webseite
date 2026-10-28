-- CMS-Light Bedienbarkeit 2: Schreibfähigkeit für hero_v1, teaser_2col_v1, content_v1
-- Idempotent: legt fehlende Whitelist- und Default-Zeilen an, lässt Bestand unverändert.

WITH targets(section_type, field_key) AS (
  VALUES
    ('hero_v1','eyebrow'),
    ('hero_v1','headline'),
    ('hero_v1','subheadline'),
    ('hero_v1','subline'),
    ('hero_v1','cta_label'),
    ('hero_v1','cta_href'),
    ('teaser_2col_v1','label'),
    ('teaser_2col_v1','title'),
    ('teaser_2col_v1','text'),
    ('teaser_2col_v1','cta_label'),
    ('teaser_2col_v1','cta_link'),
    ('teaser_2col_v1','image_position'),
    ('teaser_2col_v1','background_variant'),
    ('content_v1','label'),
    ('content_v1','title'),
    ('content_v1','text')
),
secs AS (
  SELECT s.page_key, s.section_key, s.section_type
  FROM cms_sections s
  WHERE s.is_active = true
    AND s.section_type IN ('hero_v1','teaser_2col_v1','content_v1')
),
locs(locale) AS (VALUES ('de'),('en')),
plan AS (
  SELECT s.page_key, s.section_key, t.field_key, l.locale
  FROM secs s
  JOIN targets t ON t.section_type = s.section_type
  CROSS JOIN locs l
)
INSERT INTO public.cms_admin_editable_fields
  (page_key, section_key, field_key, locale, is_enabled)
SELECT page_key, section_key, field_key, locale, true
FROM plan
ON CONFLICT (page_key, section_key, field_key, locale)
DO UPDATE SET is_enabled = true, updated_at = now();

-- Default-Zeilen (leerer Wert) anlegen, wo noch keine Zeile existiert.
WITH targets(section_type, field_key) AS (
  VALUES
    ('hero_v1','eyebrow'),
    ('hero_v1','headline'),
    ('hero_v1','subheadline'),
    ('hero_v1','subline'),
    ('hero_v1','cta_label'),
    ('hero_v1','cta_href'),
    ('teaser_2col_v1','label'),
    ('teaser_2col_v1','title'),
    ('teaser_2col_v1','text'),
    ('teaser_2col_v1','cta_label'),
    ('teaser_2col_v1','cta_link'),
    ('teaser_2col_v1','image_position'),
    ('teaser_2col_v1','background_variant'),
    ('content_v1','label'),
    ('content_v1','title'),
    ('content_v1','text')
),
secs AS (
  SELECT s.page_key, s.section_key, s.section_type
  FROM cms_sections s
  WHERE s.is_active = true
    AND s.section_type IN ('hero_v1','teaser_2col_v1','content_v1')
),
locs(locale) AS (VALUES ('de'),('en')),
plan AS (
  SELECT s.page_key, s.section_key, t.field_key, l.locale
  FROM secs s
  JOIN targets t ON t.section_type = s.section_type
  CROSS JOIN locs l
)
INSERT INTO public.cms_section_fields
  (page_key, section_key, field_key, locale, value)
SELECT page_key, section_key, field_key, locale, ''
FROM plan
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;