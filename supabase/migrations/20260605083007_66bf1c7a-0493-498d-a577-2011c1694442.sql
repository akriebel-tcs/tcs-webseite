-- Idempotent: B-028 vorteile von feature_grid_v1 → cards_v1 (einmaliger Sonderfall)
UPDATE public.cms_sections
SET section_type = 'cards_v1', updated_at = now()
WHERE page_key = 'gebaeudekommunikation.tuersprechanlagen'
  AND section_key = 'vorteile'
  AND section_type = 'feature_grid_v1';