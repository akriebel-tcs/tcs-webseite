-- Batch 22 Nachbereinigung: alte service.hub `sections` (B-324) endgültig entfernen.
-- War seit Pilot inaktiv (sort_order=99) und durch 5× cards_v1 + 16× card_v1 ersetzt.
-- Idempotent: DELETE WHERE … ist auf frischer wie bestehender DB sicher.
DELETE FROM cms_section_fields
 WHERE page_key = 'service.hub' AND section_key = 'sections';

DELETE FROM cms_admin_editable_fields
 WHERE page_key = 'service.hub' AND section_key = 'sections';

DELETE FROM cms_sections
 WHERE page_key = 'service.hub' AND section_key = 'sections' AND is_active = false;