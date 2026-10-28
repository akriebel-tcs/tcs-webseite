-- Hero-Intro (Beschreibungssatz unter dem Seitenkopf) für Referenzprojekt-Detailseiten
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT s.page_key, 'hero', 'intro', l.locale,
       COALESCE((SELECT f.value FROM public.cms_section_fields f
                 WHERE f.page_key = s.page_key AND f.section_key = 'beschreibung'
                   AND f.field_key = 'intro' AND f.locale = l.locale), '')
FROM public.cms_sections s
CROSS JOIN (VALUES ('de'),('en')) AS l(locale)
WHERE s.page_key LIKE 'anwendungen.referenzprojekte.%'
  AND s.section_key = 'hero'
  AND NOT EXISTS (
    SELECT 1 FROM public.cms_section_fields x
    WHERE x.page_key = s.page_key AND x.section_key = 'hero'
      AND x.field_key = 'intro' AND x.locale = l.locale
  );

INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT s.page_key, 'hero', 'intro', l.locale, true
FROM public.cms_sections s
CROSS JOIN (VALUES ('de'),('en')) AS l(locale)
WHERE s.page_key LIKE 'anwendungen.referenzprojekte.%'
  AND s.section_key = 'hero'
  AND NOT EXISTS (
    SELECT 1 FROM public.cms_admin_editable_fields w
    WHERE w.page_key = s.page_key AND w.section_key = 'hero'
      AND w.field_key = 'intro' AND w.locale = l.locale
  );

UPDATE public.cms_admin_editable_fields
SET is_enabled = true, updated_at = now()
WHERE page_key LIKE 'anwendungen.referenzprojekte.%'
  AND section_key = 'hero' AND field_key = 'intro' AND is_enabled = false;
