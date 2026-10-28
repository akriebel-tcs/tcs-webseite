-- CTA: Standardwerte für Telefon-/E-Mail-Zeile setzen, damit die show_phone/
-- show_email-Schalter sofort sichtbar etwas tun. Bestehende Werte werden
-- nicht überschrieben (idempotent).
WITH targets AS (
  SELECT page_key, section_key
  FROM cms_sections
  WHERE section_type = 'cta_v1'
),
defaults(field_key, value) AS (
  VALUES
    ('phone_label', '+49 4194 9881-175'),
    ('phone_href',  'tel:+4941949881175'),
    ('email_label', 'info@tcsag.de'),
    ('email_href',  'mailto:info@tcsag.de')
),
locales(locale) AS (VALUES ('de'), ('en'))
INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT t.page_key, t.section_key, d.field_key, l.locale, d.value
FROM targets t
CROSS JOIN defaults d
CROSS JOIN locales l
ON CONFLICT DO NOTHING;

-- Bei bestehenden, aber leeren Werten ebenfalls Standard einsetzen.
UPDATE cms_section_fields f
SET value = d.value, updated_at = now()
FROM (
  VALUES
    ('phone_label', '+49 4194 9881-175'),
    ('phone_href',  'tel:+4941949881175'),
    ('email_label', 'info@tcsag.de'),
    ('email_href',  'mailto:info@tcsag.de')
) AS d(field_key, value)
WHERE f.field_key = d.field_key
  AND (f.value IS NULL OR f.value = '')
  AND f.locale IN ('de','en')
  AND EXISTS (
    SELECT 1 FROM cms_sections s
    WHERE s.page_key = f.page_key
      AND s.section_key = f.section_key
      AND s.section_type = 'cta_v1'
  );

-- Whitelist sicherstellen (idempotent), damit Redaktion phone/email pflegen kann.
INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT s.page_key, s.section_key, fk, 'de', true
FROM cms_sections s
CROSS JOIN (VALUES ('phone_label'),('phone_href'),('email_label'),('email_href')) AS w(fk)
WHERE s.section_type = 'cta_v1'
ON CONFLICT DO NOTHING;