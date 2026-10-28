-- cms-admin-card-links-personas-home-1
-- Setzt cta_link auf den sechs Persona-Karten unter home.start/personas_intro
-- und fügt die Admin-Whitelist-Einträge hinzu. Idempotent via UPSERT.

WITH mapping(section_key, route_path) AS (
  VALUES
    ('persona_architekten',         '/personas/architekt'),
    ('persona_bauherren',           '/personas/bauherr'),
    ('persona_wohnungswirtschaft',  '/personas/wohnungswirtschaft'),
    ('persona_fachplaner',          '/personas/fachplaner'),
    ('persona_handwerk',            '/personas/handwerk'),
    ('persona_fachhandel',          '/personas/fachhandel')
),
locales(locale) AS (VALUES ('de'), ('en'))
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT 'home.start', m.section_key, 'cta_link', l.locale, m.route_path
FROM mapping m CROSS JOIN locales l
ON CONFLICT (page_key, section_key, field_key, locale)
DO UPDATE SET value = EXCLUDED.value, updated_at = now();

WITH mapping(section_key) AS (
  VALUES
    ('persona_architekten'),
    ('persona_bauherren'),
    ('persona_wohnungswirtschaft'),
    ('persona_fachplaner'),
    ('persona_handwerk'),
    ('persona_fachhandel')
),
locales(locale) AS (VALUES ('de'), ('en'))
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT 'home.start', m.section_key, 'cta_link', l.locale, true
FROM mapping m CROSS JOIN locales l
ON CONFLICT (page_key, section_key, field_key, locale)
DO UPDATE SET is_enabled = true, updated_at = now();
