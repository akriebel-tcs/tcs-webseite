-- Batch 32: Whitelist-Coverage schliessen — fehlende Upload-Slots fuer card_v1 idempotent ergaenzen
-- Hintergrund: whitelist-coverage-audit meldet 210 Treffer (card_v1 ohne Upload-Slot in Whitelist).
-- Betroffene Seiten: personas.wohnungswirtschaft, service.hub.
-- Wirkung: Redaktion kann neue Bilder/Thumbnails/Icons in diese Karten hochladen.
-- Sicherheit: rein additive INSERT...ON CONFLICT DO NOTHING; keine Aenderung an Inhalten, Renderern, RLS oder Grants.

INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT s.page_key, s.section_key, fk.field_key, l.locale, true
FROM public.cms_sections s
JOIN public.cms_pages p ON p.page_key = s.page_key
CROSS JOIN (VALUES ('image'),('thumbnail'),('icon_image')) AS fk(field_key)
CROSS JOIN (VALUES ('de'),('en')) AS l(locale)
WHERE s.is_active = true
  AND p.is_active = true
  AND p.status = 'published'
  AND s.section_type = 'card_v1'
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;