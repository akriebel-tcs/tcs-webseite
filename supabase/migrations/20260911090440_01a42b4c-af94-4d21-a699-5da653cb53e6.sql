INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT 'anwendungen.zutrittskontrolle-bcm', 'werkzeuge', 'label', loc, ''
FROM (VALUES ('de'),('en')) AS l(loc)
WHERE NOT EXISTS (
  SELECT 1 FROM public.cms_section_fields f
  WHERE f.page_key = 'anwendungen.zutrittskontrolle-bcm'
    AND f.section_key = 'werkzeuge' AND f.field_key = 'label' AND f.locale = l.loc
);

INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT 'anwendungen.zutrittskontrolle-bcm', 'werkzeuge', 'label', loc, true
FROM (VALUES ('de'),('en')) AS l(loc)
WHERE NOT EXISTS (
  SELECT 1 FROM public.cms_admin_editable_fields w
  WHERE w.page_key = 'anwendungen.zutrittskontrolle-bcm'
    AND w.section_key = 'werkzeuge' AND w.field_key = 'label' AND w.locale = l.loc
);

UPDATE public.cms_admin_editable_fields
SET is_enabled = true, updated_at = now()
WHERE page_key = 'anwendungen.zutrittskontrolle-bcm'
  AND section_key = 'werkzeuge' AND field_key = 'label' AND is_enabled = false;