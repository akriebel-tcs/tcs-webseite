-- B-317 (broschure, content_v1) auf anwendungen.bidirektionale-video
-- 1) Pflichtfelder des Renderfähigkeitsvertrags (title|text) füllen
WITH vals(field_key, locale, value) AS (
  VALUES
    ('title','de','Broschüre'),
    ('title','en','Brochure'),
    ('text','de','Alle technischen Details zur bidirektionalen Videosprechanlage als PDF zum Herunterladen.'),
    ('text','en','All technical details of the bidirectional video door intercom as a PDF download.'),
    ('href','de','https://www.tcsag.de/fileadmin/user_upload/TCS_DE/Metanavigation/Downloads/TCSplus/SYS09_Bidirektionale_Videosprechanlage.pdf'),
    ('href','en','https://www.tcsag.de/fileadmin/user_upload/TCS_DE/Metanavigation/Downloads/TCSplus/SYS09_Bidirektionale_Videosprechanlage.pdf')
)
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT 'anwendungen.bidirektionale-video','broschure', v.field_key, v.locale, v.value
FROM vals v
ON CONFLICT (page_key, section_key, field_key, locale)
DO UPDATE SET value = CASE
    WHEN coalesce(nullif(btrim(public.cms_section_fields.value), ''), '') = '' THEN EXCLUDED.value
    ELSE public.cms_section_fields.value
  END,
  updated_at = now();

-- 2) Whitelist: alle vorhandenen Felder des Blocks editierbar
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT DISTINCT f.page_key, f.section_key, f.field_key, f.locale, true
FROM public.cms_section_fields f
WHERE f.page_key = 'anwendungen.bidirektionale-video'
  AND f.section_key = 'broschure'
ON CONFLICT (page_key, section_key, field_key, locale)
DO UPDATE SET is_enabled = true, updated_at = now();

-- 3) Block sichtbar schalten
UPDATE public.cms_sections
SET is_active = true, updated_at = now()
WHERE page_key = 'anwendungen.bidirektionale-video'
  AND section_key = 'broschure';