-- Re-parent persona_* blocks under personas_intro on home.start
DO $$
DECLARE
  v_parent_id uuid;
BEGIN
  SELECT id INTO v_parent_id FROM cms_sections
  WHERE page_key='home.start' AND section_key='personas_intro' LIMIT 1;

  IF v_parent_id IS NOT NULL THEN
    UPDATE cms_sections
    SET parent_section_id = v_parent_id, updated_at = now()
    WHERE page_key='home.start'
      AND section_key LIKE 'persona\_%' ESCAPE '\'
      AND section_key <> 'personas_intro'
      AND (parent_section_id IS DISTINCT FROM v_parent_id);
  END IF;
END $$;
