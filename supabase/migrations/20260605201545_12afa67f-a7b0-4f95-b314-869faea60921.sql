
-- Batch 46: deaktiviert uniforme /kontakt-Default-Linkpillen in 3 Sonderpfad-Clustern.
-- Idempotent: setzt link_1_enabled='0' nur dort, wo link_1_enabled='1' UND link_1_href='/kontakt'.
WITH target_sections AS (
  -- R4: anforderungen_item_* auf allen anwendungen.* Seiten
  SELECT s.page_key, s.section_key
  FROM public.cms_sections s
  WHERE s.section_type='card_v1' AND s.is_active=true
    AND s.section_key LIKE 'anforderungen_item_%'
    AND s.page_key LIKE 'anwendungen.%'
  UNION
  -- R3: gebaeudekommunikation.systemloesungen vorteile/fachplanung Kinder
  SELECT s.page_key, s.section_key
  FROM public.cms_sections s
  JOIN public.cms_sections p ON p.id = s.parent_section_id
  WHERE s.section_type='card_v1' AND s.is_active=true
    AND s.page_key='gebaeudekommunikation.systemloesungen'
    AND p.section_key IN ('vorteile','fachplanung')
  UNION
  -- R1/R2: gebaeudekommunikation.tuersprechanlagen vorteile/anwendungsumfelder Kinder
  SELECT s.page_key, s.section_key
  FROM public.cms_sections s
  JOIN public.cms_sections p ON p.id = s.parent_section_id
  WHERE s.section_type='card_v1' AND s.is_active=true
    AND s.page_key='gebaeudekommunikation.tuersprechanlagen'
    AND p.section_key IN ('vorteile','anwendungsumfelder')
)
UPDATE public.cms_section_fields f
   SET value='0', updated_at=now()
  FROM target_sections t
 WHERE f.page_key=t.page_key
   AND f.section_key=t.section_key
   AND f.field_key='link_1_enabled'
   AND f.value='1'
   AND EXISTS (
     SELECT 1 FROM public.cms_section_fields h
      WHERE h.page_key=f.page_key
        AND h.section_key=f.section_key
        AND h.field_key='link_1_href'
        AND h.locale=f.locale
        AND h.value='/kontakt'
   );
