-- Altbestand-Bereinigung (idempotent).
-- Entfernt inaktive Nicht-Vertrags-Root-Sections inkl. Kinder/Felder/Assets/Whitelist.

DO $$
DECLARE
  v_sections_deleted int := 0;
  v_fields_deleted int := 0;
  v_assets_deleted int := 0;
  v_whitelist_deleted int := 0;
BEGIN
  CREATE TEMP TABLE _altbestand_ids ON COMMIT DROP AS
  WITH RECURSIVE roots AS (
    SELECT id, page_key, section_key, parent_section_id
    FROM public.cms_sections
    WHERE is_active = false
      AND parent_section_id IS NULL
      AND section_key NOT IN ('standard_cta','cta','faq')
      AND section_type NOT IN ('cta_v1','faq_v1')
  ),
  tree AS (
    SELECT id, page_key, section_key, parent_section_id FROM roots
    UNION ALL
    SELECT c.id, c.page_key, c.section_key, c.parent_section_id
    FROM public.cms_sections c
    JOIN tree t ON c.parent_section_id = t.id
  )
  SELECT id, page_key, section_key, parent_section_id FROM tree;

  -- Felder
  WITH d AS (
    DELETE FROM public.cms_section_fields f
    USING _altbestand_ids t
    WHERE f.page_key = t.page_key AND f.section_key = t.section_key
    RETURNING 1
  ) SELECT count(*) INTO v_fields_deleted FROM d;

  -- Assets/Bilder
  WITH d AS (
    DELETE FROM public.cms_assets a
    USING _altbestand_ids t
    WHERE a.page_key = t.page_key AND a.section_key = t.section_key
    RETURNING 1
  ) SELECT count(*) INTO v_assets_deleted FROM d;

  -- Whitelist
  WITH d AS (
    DELETE FROM public.cms_admin_editable_fields w
    USING _altbestand_ids t
    WHERE w.page_key = t.page_key AND w.section_key = t.section_key
    RETURNING 1
  ) SELECT count(*) INTO v_whitelist_deleted FROM d;

  -- Sections: Kinder zuerst, dann Eltern (sicherheitshalber gegen FK).
  DELETE FROM public.cms_sections
   WHERE id IN (SELECT id FROM _altbestand_ids WHERE parent_section_id IS NOT NULL);

  WITH d AS (
    DELETE FROM public.cms_sections
     WHERE id IN (SELECT id FROM _altbestand_ids)
    RETURNING 1
  ) SELECT count(*) + (SELECT count(*) FROM _altbestand_ids WHERE parent_section_id IS NOT NULL)
    INTO v_sections_deleted FROM d;

  RAISE NOTICE 'Altbestand-Bereinigung: % Sections, % Felder, % Assets, % Whitelist-Eintraege geloescht.',
    v_sections_deleted, v_fields_deleted, v_assets_deleted, v_whitelist_deleted;
END $$;