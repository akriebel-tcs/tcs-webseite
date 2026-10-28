-- Batch 47: deaktiviert uniforme /kontakt-Default-Linkpillen in 6 weiteren Sonderpfad-Clustern (R5–R10).
-- Idempotent: setzt link_1_enabled='0' nur dort, wo link_1_enabled='1' UND link_1_href='/kontakt'.
WITH target_sections AS (
  -- R5 Karriere: benefits/jobs Kinder
  SELECT page_key, section_key FROM public.cms_sections
   WHERE section_type='card_v1' AND is_active=true
     AND page_key='karriere.root'
     AND (section_key LIKE 'benefits_item_%' OR section_key LIKE 'jobs_item_%')
  UNION
  -- R6 Presse: releases__* Kinder
  SELECT page_key, section_key FROM public.cms_sections
   WHERE section_type='card_v1' AND is_active=true
     AND page_key='presse.root'
     AND section_key LIKE 'releases__%'
  UNION
  -- R7 Signage: products__* Kinder
  SELECT page_key, section_key FROM public.cms_sections
   WHERE section_type='card_v1' AND is_active=true
     AND page_key='signage.root'
     AND section_key LIKE 'products__%'
  UNION
  -- R8 Akademie: formate/zielgruppen/partner Kinder
  SELECT page_key, section_key FROM public.cms_sections
   WHERE section_type='card_v1' AND is_active=true
     AND page_key='wissen.akademie'
     AND (section_key LIKE 'formate_item_%' OR section_key LIKE 'zielgruppen_item_%' OR section_key LIKE 'partner_item_%')
  UNION
  -- R9 Eingangssysteme: pillars + downloads Kinder
  SELECT page_key, section_key FROM public.cms_sections
   WHERE section_type='card_v1' AND is_active=true
     AND page_key='eingangssysteme.root'
     AND (section_key LIKE 'pillars_item_%' OR section_key LIKE 'downloads_item_%')
  UNION
  -- R10 Fahrstuhlsteuerung: card_benefit_* Kinder
  SELECT page_key, section_key FROM public.cms_sections
   WHERE section_type='card_v1' AND is_active=true
     AND page_key='zutrittskontrolle.fahrstuhlsteuerung'
     AND section_key LIKE 'card_benefit_%'
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