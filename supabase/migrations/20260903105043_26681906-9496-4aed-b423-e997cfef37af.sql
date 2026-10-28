-- Freigabeliste: Online-Visitenkarten-Links im Register „Vertrieb Deutschland"
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT 'kontakt.root', 'vertrieb_register__vertrieb_de', fk, loc, true
FROM (
  SELECT 'vorteile.' || n || '.online_href' AS fk FROM generate_series(1,16) AS n
  UNION ALL SELECT 'online_label'
) f
CROSS JOIN (VALUES ('de'),('en')) AS l(loc)
ON CONFLICT (page_key, section_key, field_key, locale)
DO UPDATE SET is_enabled = true;