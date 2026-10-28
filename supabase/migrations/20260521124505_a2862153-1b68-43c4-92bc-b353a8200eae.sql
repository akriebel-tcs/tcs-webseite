-- Whitelist-Differenz bereinigen: fehlende Einträge für vorhandene
-- cms_section_fields anlegen (Klasse A — redaktionelle Inhalte).
-- Idempotent dank UNIQUE(page_key, section_key, field_key, locale).

INSERT INTO public.cms_admin_editable_fields
  (page_key, section_key, field_key, locale, is_enabled)
SELECT DISTINCT f.page_key, f.section_key, f.field_key, f.locale, true
FROM public.cms_section_fields f
LEFT JOIN public.cms_admin_editable_fields w
  ON w.page_key   = f.page_key
 AND w.section_key= f.section_key
 AND w.field_key  = f.field_key
 AND w.locale     = f.locale
WHERE w.id IS NULL
  AND f.locale IN ('de','en')
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;