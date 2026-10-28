-- Etappe E3: CTA-Vereinheitlichung
-- 1) background_variant für ALLE cta_v1-Sections (DE+EN) anlegen — Default "light"
-- 2) home.start/cta auf "dark" setzen (Altbestand)
-- 3) Whitelist für sämtliche redaktionell relevanten CTA-Felder DE freigeben
-- Idempotent durch ON CONFLICT.

-- 1) background_variant Default "light" für alle cta_v1-Sections (DE + EN).
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT s.page_key, s.section_key, 'background_variant', l.locale, 'light'
FROM public.cms_sections s
CROSS JOIN (VALUES ('de'),('en')) AS l(locale)
WHERE s.section_type = 'cta_v1'
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

-- 2) Home-CTA (und ggf. weitere bestehende "cta"-Sections vom Typ cta_v1)
--    bleiben dunkel — der frühere Hardcode war dunkel.
UPDATE public.cms_section_fields
SET value = 'dark', updated_at = now()
WHERE field_key = 'background_variant'
  AND page_key = 'home.start'
  AND section_key IN ('cta','standard_cta');

-- 3) Whitelist (DE) für alle pflegerelevanten CTA-Felder über alle cta_v1-Sections.
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT s.page_key, s.section_key, fk.field_key, 'de', true
FROM public.cms_sections s
CROSS JOIN (VALUES
  ('title'),('text'),
  ('cta_label'),('cta_href'),('cta_kind'),
  ('cta_secondary_label'),('cta_secondary_href'),('cta_secondary_kind'),
  ('phone_label'),('phone_href'),('email_label'),('email_href'),
  ('show_secondary'),('show_phone'),('show_email'),
  ('background_variant')
) AS fk(field_key)
WHERE s.section_type = 'cta_v1'
ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE
SET is_enabled = true, updated_at = now();

-- 4) Whitelist (EN) für die mehrsprachigen Textfelder freigeben.
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT s.page_key, s.section_key, fk.field_key, 'en', true
FROM public.cms_sections s
CROSS JOIN (VALUES
  ('title'),('text'),
  ('cta_label'),('cta_href'),
  ('cta_secondary_label'),('cta_secondary_href'),
  ('phone_label'),('phone_href'),('email_label'),('email_href')
) AS fk(field_key)
WHERE s.section_type = 'cta_v1'
ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE
SET is_enabled = true, updated_at = now();