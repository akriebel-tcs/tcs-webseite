-- Digital Signage: Produkt-Karte "BCM Infoboard" sichtbar machen.
-- Inhalte gehören in die DB. Hier nur fehlende Titel + Link-Ziel ergänzen.

-- 1) Sektion-Titel "Lösungen im Überblick" (DE/EN) anlegen, falls fehlt.
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
VALUES
  ('gebaeudemanagement.digital-signage', 'products', 'title', 'de', 'Lösungen im Überblick'),
  ('gebaeudemanagement.digital-signage', 'products', 'title', 'en', 'Solutions overview'),
  ('gebaeudemanagement.digital-signage', 'products', 'label', 'de', 'Produkte'),
  ('gebaeudemanagement.digital-signage', 'products', 'label', 'en', 'Products'),
  ('gebaeudemanagement.digital-signage', 'products', 'items.infoboard.href', 'de', '/gebaeudemanagement/bcm-infoboard'),
  ('gebaeudemanagement.digital-signage', 'products', 'items.infoboard.href', 'en', '/gebaeudemanagement/bcm-infoboard')
ON CONFLICT DO NOTHING;

-- Falls eindeutiger Index nicht existiert, sicherstellen, dass Dubletten vermieden werden:
-- (page_key, section_key, field_key, locale) ist logisch eindeutig.
-- Wir ergänzen daher zusätzlich ein Update-Pattern, das vorhandene Leereinträge füllt,
-- aber bestehende, nicht-leere Werte NICHT überschreibt (kein Inhalts-Diktat).
UPDATE public.cms_section_fields f
SET value = v.value, updated_at = now()
FROM (VALUES
  ('gebaeudemanagement.digital-signage', 'products', 'title', 'de', 'Lösungen im Überblick'),
  ('gebaeudemanagement.digital-signage', 'products', 'title', 'en', 'Solutions overview'),
  ('gebaeudemanagement.digital-signage', 'products', 'label', 'de', 'Produkte'),
  ('gebaeudemanagement.digital-signage', 'products', 'label', 'en', 'Products'),
  ('gebaeudemanagement.digital-signage', 'products', 'items.infoboard.href', 'de', '/gebaeudemanagement/bcm-infoboard'),
  ('gebaeudemanagement.digital-signage', 'products', 'items.infoboard.href', 'en', '/gebaeudemanagement/bcm-infoboard')
) AS v(page_key, section_key, field_key, locale, value)
WHERE f.page_key = v.page_key
  AND f.section_key = v.section_key
  AND f.field_key = v.field_key
  AND f.locale = v.locale
  AND (f.value IS NULL OR f.value = '');

-- 2) Whitelist-Pflicht: neue Felder im Admin pflegbar machen.
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
VALUES
  ('gebaeudemanagement.digital-signage', 'products', 'title', 'de', true),
  ('gebaeudemanagement.digital-signage', 'products', 'title', 'en', true),
  ('gebaeudemanagement.digital-signage', 'products', 'label', 'de', true),
  ('gebaeudemanagement.digital-signage', 'products', 'label', 'en', true),
  ('gebaeudemanagement.digital-signage', 'products', 'items.infoboard.href', 'de', true),
  ('gebaeudemanagement.digital-signage', 'products', 'items.infoboard.href', 'en', true),
  -- Bild-Slot für die Karte als pflegbar markieren (Bild kann später per Admin gesetzt werden).
  ('gebaeudemanagement.digital-signage', 'products', 'items.infoboard.image', 'de', true),
  ('gebaeudemanagement.digital-signage', 'products', 'items.infoboard.image', 'en', true)
ON CONFLICT DO NOTHING;
