-- Hotfix: Bildkarten-Workspace Schreibfähigkeit reparieren
-- Stellt für jede aktive card_v1-Section die Toggle-Felder
-- (features_0..4_enabled, link_1..3_enabled, image_enabled,
-- icon_enabled, eyebrow_enabled) als schreibbar her:
--  1) Whitelist-Eintrag in cms_admin_editable_fields (DE+EN, is_enabled=true)
--  2) Default-Zeile in cms_section_fields mit value='' (Renderer-Default = an)
-- Idempotent. Verändert keine bestehenden Werte. Kein Public-Effekt.

WITH card_sections AS (
  SELECT page_key, section_key
    FROM public.cms_sections
   WHERE section_type = 'card_v1'
     AND is_active = true
),
toggle_fields(field_key) AS (
  VALUES
    ('features_0_enabled'),('features_1_enabled'),('features_2_enabled'),
    ('features_3_enabled'),('features_4_enabled'),
    ('link_1_enabled'),('link_2_enabled'),('link_3_enabled'),
    ('image_enabled'),('icon_enabled'),('eyebrow_enabled')
),
locales(locale) AS (VALUES ('de'),('en')),
matrix AS (
  SELECT c.page_key, c.section_key, t.field_key, l.locale
    FROM card_sections c
    CROSS JOIN toggle_fields t
    CROSS JOIN locales l
)
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT page_key, section_key, field_key, locale, true FROM matrix
ON CONFLICT (page_key, section_key, field_key, locale)
DO UPDATE SET is_enabled = true, updated_at = now();

WITH card_sections AS (
  SELECT page_key, section_key
    FROM public.cms_sections
   WHERE section_type = 'card_v1'
     AND is_active = true
),
toggle_fields(field_key) AS (
  VALUES
    ('features_0_enabled'),('features_1_enabled'),('features_2_enabled'),
    ('features_3_enabled'),('features_4_enabled'),
    ('link_1_enabled'),('link_2_enabled'),('link_3_enabled'),
    ('image_enabled'),('icon_enabled'),('eyebrow_enabled')
),
locales(locale) AS (VALUES ('de'),('en')),
matrix AS (
  SELECT c.page_key, c.section_key, t.field_key, l.locale
    FROM card_sections c
    CROSS JOIN toggle_fields t
    CROSS JOIN locales l
)
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT page_key, section_key, field_key, locale, '' FROM matrix
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;