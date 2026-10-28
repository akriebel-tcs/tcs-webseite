
-- K.3: Startseite aufräumen
-- 1) Legacy-Monolith 'content_blocks' entfernen (durch content_blocks_intro + block_* ersetzt)
DELETE FROM public.cms_section_fields WHERE page_key='home.start' AND section_key='content_blocks';
DELETE FROM public.cms_assets         WHERE page_key='home.start' AND section_key='content_blocks';
DELETE FROM public.cms_sections       WHERE page_key='home.start' AND section_key='content_blocks';

-- 2) Duplikat 'block_communication_kopie' entfernen
DELETE FROM public.cms_section_fields WHERE page_key='home.start' AND section_key='block_communication_kopie';
DELETE FROM public.cms_assets         WHERE page_key='home.start' AND section_key='block_communication_kopie';
DELETE FROM public.cms_sections       WHERE page_key='home.start' AND section_key='block_communication_kopie';

-- 3) Saubere, eindeutige Reihenfolge setzen
WITH desired(section_key, new_order) AS (
  VALUES
    ('hero', 1),
    ('stats', 2),
    ('content_blocks_intro', 3),
    ('block_communication', 4),
    ('block_access', 5),
    ('block_entry', 6),
    ('block_signage', 7),
    ('block_solutions', 8),
    ('block_consulting', 9),
    ('personas_intro', 10),
    ('personas_picker', 11),
    ('persona_bauherren', 12),
    ('persona_architekten', 13),
    ('persona_wohnungswirtschaft', 14),
    ('persona_fachplaner', 15),
    ('persona_handwerk', 16),
    ('persona_fachhandel', 17),
    ('cta', 18)
)
UPDATE public.cms_sections s
SET sort_order = d.new_order, updated_at = now()
FROM desired d
WHERE s.page_key = 'home.start' AND s.section_key = d.section_key;

-- 4) Section-Nummerierung neu vergeben (1..n)
SELECT public.cms_renumber_sections('home.start');
