-- Batch 60.1: Pflichtfelder der neuen Wechselteaser auch in EN mit dem
-- gleichen Platzhalter belegen. Keine Übersetzung, keine Änderung an
-- bestehenden EN-Werten — nur damit die neuen Bausteine renderfähig sind
-- (Vertragsgate `cms_section_renderability`: title/text sind Pflicht).
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
VALUES
  ('gebaeudekommunikation.briefkastenanlagen','entry','title','en','PLATZHALTER — Text folgt'),
  ('gebaeudekommunikation.briefkastenanlagen','entry','text','en','PLATZHALTER — Text folgt'),
  ('gebaeudekommunikation.briefkastenanlagen','sortiment','title','en','PLATZHALTER — Text folgt'),
  ('gebaeudekommunikation.briefkastenanlagen','sortiment','text','en','PLATZHALTER — Text folgt')
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;