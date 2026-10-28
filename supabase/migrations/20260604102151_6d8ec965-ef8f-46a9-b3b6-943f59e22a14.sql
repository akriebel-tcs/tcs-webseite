
-- Konsolidierung Persona-Block auf der Startseite:
-- Headline + Intro leben künftig im personas-Container (B-660, cards_v1).
-- Der separate personas_intro-Block (B-020, rich_v1) entfällt als Dublette.

DELETE FROM cms_section_fields
 WHERE page_key = 'home.start' AND section_key = 'personas_intro';

DELETE FROM cms_admin_editable_fields
 WHERE page_key = 'home.start' AND section_key = 'personas_intro';

DELETE FROM cms_assets
 WHERE page_key = 'home.start' AND section_key = 'personas_intro';

DELETE FROM cms_sections
 WHERE page_key = 'home.start' AND section_key = 'personas_intro';

-- Sicherstellen: personas-Container ist aktiv (Spiegel-Regel)
UPDATE cms_sections
   SET is_active = true,
       updated_at = now()
 WHERE page_key = 'home.start' AND section_key = 'personas' AND is_active = false;
