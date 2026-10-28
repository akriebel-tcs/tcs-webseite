-- Tranche: cms-inhalte-beschilderung-wayfinding-cta-hausnummern-1
-- Setzt den CTA "Mehr erfahren" / "Learn more" auf B-1615
-- (page_key=gebaeudekommunikation.beschilderung, section_key=feature_hausnummer)
-- mit externem Link auf https://www.tcs-signage.de/hausnummern/.
--
-- Hintergrund: Die Whitelist-Einträge (cms_admin_editable_fields) für
-- cta_label/cta_link DE/EN existieren bereits. Es fehlten nur die
-- Werte-Zeilen in cms_section_fields — rpc_admin_update_section_field ist
-- UPDATE-only und meldete daher "row_not_found". Diese Migration legt die
-- initialen Werte idempotent an.
--
-- Idempotent: ON CONFLICT DO UPDATE auf den natürlichen Schlüssel
-- (page_key, section_key, field_key, locale).

INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
VALUES
  ('gebaeudekommunikation.beschilderung', 'feature_hausnummer', 'cta_label', 'de', 'Mehr erfahren'),
  ('gebaeudekommunikation.beschilderung', 'feature_hausnummer', 'cta_label', 'en', 'Learn more'),
  ('gebaeudekommunikation.beschilderung', 'feature_hausnummer', 'cta_link',  'de', 'https://www.tcs-signage.de/hausnummern/'),
  ('gebaeudekommunikation.beschilderung', 'feature_hausnummer', 'cta_link',  'en', 'https://www.tcs-signage.de/hausnummern/')
ON CONFLICT (page_key, section_key, field_key, locale)
DO UPDATE SET value = EXCLUDED.value, updated_at = now();