DO $$
DECLARE
  r RECORD;
  loc TEXT;
BEGIN
  FOR r IN
    WITH RECURSIVE t AS (
      SELECT id, page_key FROM cms_navigation_nodes WHERE node_no IN (3,25)
      UNION ALL
      SELECT n.id, n.page_key FROM cms_navigation_nodes n JOIN t ON n.parent_id = t.id
    ),
    parents AS (
      SELECT s.id, s.page_key, s.section_key
      FROM cms_sections s
      WHERE s.page_key IN (SELECT page_key FROM t WHERE page_key IS NOT NULL)
        AND s.parent_section_id IS NULL
        AND s.section_type = 'cards_v1'
        AND (
          s.section_key ILIKE '%vorteil%'
          OR s.section_key ILIKE '%benefit%'
          OR EXISTS (
            SELECT 1 FROM cms_section_fields f
            WHERE f.page_key = s.page_key AND f.section_key = s.section_key
              AND f.field_key = 'title' AND f.locale = 'de' AND f.value ILIKE '%vorteil%'
          )
        )
    )
    SELECT c.page_key, c.section_key
    FROM cms_sections c
    JOIN parents p ON c.parent_section_id = p.id
    WHERE c.section_type = 'card_v1'
  LOOP
    FOREACH loc IN ARRAY ARRAY['de','en'] LOOP
      -- Icon-Name setzen
      UPDATE cms_section_fields
         SET value = 'shield-check', updated_at = now()
       WHERE page_key = r.page_key AND section_key = r.section_key
         AND field_key = 'icon' AND locale = loc;
      IF NOT FOUND THEN
        INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
        VALUES (r.page_key, r.section_key, 'icon', loc, 'shield-check');
      END IF;

      -- Schalter „Icon anzeigen" einschalten
      UPDATE cms_section_fields
         SET value = '1', updated_at = now()
       WHERE page_key = r.page_key AND section_key = r.section_key
         AND field_key = 'icon_enabled' AND locale = loc;
      IF NOT FOUND THEN
        INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
        VALUES (r.page_key, r.section_key, 'icon_enabled', loc, '1');
      END IF;

      -- Whitelist (Admin-Freigabe)
      INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
      VALUES (r.page_key, r.section_key, 'icon', loc, true)
      ON CONFLICT (page_key, section_key, field_key, locale)
        DO UPDATE SET is_enabled = true, updated_at = now();
      INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
      VALUES (r.page_key, r.section_key, 'icon_enabled', loc, true)
      ON CONFLICT (page_key, section_key, field_key, locale)
        DO UPDATE SET is_enabled = true, updated_at = now();
    END LOOP;
  END LOOP;
END $$;