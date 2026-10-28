UPDATE public.cms_section_fields SET value = 'Kapitel', updated_at = now()
WHERE page_key = 'service.downloads' AND section_key = 'dokumente'
  AND field_key = 'label_kapitel' AND locale = 'de' AND value = 'Kapitel in diesem Bereich';

UPDATE public.cms_section_fields SET value = 'Chapters', updated_at = now()
WHERE page_key = 'service.downloads' AND section_key = 'dokumente'
  AND field_key = 'label_kapitel' AND locale = 'en' AND value = 'Chapters in this area';