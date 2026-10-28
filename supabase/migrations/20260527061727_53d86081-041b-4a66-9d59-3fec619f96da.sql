-- Tranche 24+: seed CTA fields on B-1616/1617/1618 (Beschilderung & Wayfinding)
-- Pattern mirrors B-1615 (feature_hausnummer): cta_label DE/EN + cta_link DE/EN
-- Whitelist already in place for all three blocks; no editable_fields change needed.

INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
VALUES
  ('gebaeudekommunikation.beschilderung','feature_materialien','cta_label','de','Mehr erfahren'),
  ('gebaeudekommunikation.beschilderung','feature_materialien','cta_label','en','Learn more'),
  ('gebaeudekommunikation.beschilderung','feature_materialien','cta_link','de','https://www.tcs-signage.de/piktogramm-schilder/'),
  ('gebaeudekommunikation.beschilderung','feature_materialien','cta_link','en','https://www.tcs-signage.de/piktogramm-schilder/'),
  ('gebaeudekommunikation.beschilderung','feature_tuerschilder','cta_label','de','Mehr erfahren'),
  ('gebaeudekommunikation.beschilderung','feature_tuerschilder','cta_label','en','Learn more'),
  ('gebaeudekommunikation.beschilderung','feature_tuerschilder','cta_link','de','https://www.tcs-signage.de/tuerschilder/'),
  ('gebaeudekommunikation.beschilderung','feature_tuerschilder','cta_link','en','https://www.tcs-signage.de/tuerschilder/'),
  ('gebaeudekommunikation.beschilderung','feature_klingel','cta_label','de','Mehr erfahren'),
  ('gebaeudekommunikation.beschilderung','feature_klingel','cta_label','en','Learn more'),
  ('gebaeudekommunikation.beschilderung','feature_klingel','cta_link','de','https://www.tcs-signage.de/tuerklingeln/'),
  ('gebaeudekommunikation.beschilderung','feature_klingel','cta_link','en','https://www.tcs-signage.de/tuerklingeln/')
ON CONFLICT (page_key, section_key, field_key, locale)
DO UPDATE SET value = EXCLUDED.value, updated_at = now();