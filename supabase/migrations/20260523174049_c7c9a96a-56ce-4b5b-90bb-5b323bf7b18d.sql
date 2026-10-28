-- Reference fix: icons für Schränke & Behälter Vorteile in DB heben
WITH targets(section_key, icon) AS (
  VALUES
    ('benefits__flexibel', 'layers'),
    ('benefits__nachruestung', 'wrench'),
    ('benefits__zentraleVerwaltung', 'monitor'),
    ('benefits__aufruestbar', 'shield-check')
), locales(locale) AS (
  VALUES ('de'), ('en')
)
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT 'gebaeudemanagement.schraenke-behaelter', t.section_key, 'icon', l.locale, t.icon
FROM targets t CROSS JOIN locales l
ON CONFLICT DO NOTHING;

-- Defensiv: falls Unique-Constraint fehlt, zweite Sicherung
DELETE FROM public.cms_section_fields a
USING public.cms_section_fields b
WHERE a.ctid < b.ctid
  AND a.page_key = 'gebaeudemanagement.schraenke-behaelter'
  AND a.section_key = b.section_key
  AND a.field_key = 'icon'
  AND a.field_key = b.field_key
  AND a.locale = b.locale;

-- Whitelist für Admin-Bearbeitung
WITH targets(section_key) AS (
  VALUES ('benefits__flexibel'),('benefits__nachruestung'),
         ('benefits__zentraleVerwaltung'),('benefits__aufruestbar')
), locales(locale) AS ( VALUES ('de'),('en') )
INSERT INTO public.cms_admin_editable_fields
  (page_key, section_key, field_key, locale, is_enabled)
SELECT 'gebaeudemanagement.schraenke-behaelter', t.section_key, 'icon', l.locale, true
FROM targets t CROSS JOIN locales l
ON CONFLICT DO NOTHING;