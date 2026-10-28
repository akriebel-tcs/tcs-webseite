-- Stilllegung echter Renderer-Waisen (2026-06-02).
-- Quelle: Wahrheits-Check nach Erweiterung um KNOWN_PAGE_COMPONENT_READS;
-- diese Slots werden weder vom V1-Renderer noch von einer hartkodierten
-- Page-Komponente gelesen.
UPDATE cms_assets
SET is_active = false, updated_at = now()
WHERE is_active = true
  AND (
    (page_key = 'gebaeudekommunikation.beschilderung' AND section_key = 'features'
      AND field_key IN ('image_hausnummer','image_klingel','image_materialien','image_tuerschilder'))
    OR
    (page_key = 'mobile-tk-preview.root' AND section_key IN ('anwendungen','komponenten')
      AND field_key LIKE 'items.%.image')
    OR
    (page_key = 'personas.architekt.kopie' AND section_key = 'solutions'
      AND field_key IN ('image_access','image_communication','image_entry','image_intercoms','image_signage'))
  );