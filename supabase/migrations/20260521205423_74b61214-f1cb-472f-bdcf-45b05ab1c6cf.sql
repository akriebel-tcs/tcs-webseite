-- Beschilderung P-028: features.items.* → einzelne teaser_2col_v1-Sections
-- Vollständig idempotent.

-- 1) Vier neue teaser_2col_v1-Sections
INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active)
VALUES
  ('gebaeudekommunikation.beschilderung', 'feature_hausnummer',   'teaser_2col_v1', 21, true),
  ('gebaeudekommunikation.beschilderung', 'feature_materialien',  'teaser_2col_v1', 22, true),
  ('gebaeudekommunikation.beschilderung', 'feature_tuerschilder', 'teaser_2col_v1', 23, true),
  ('gebaeudekommunikation.beschilderung', 'feature_klingel',      'teaser_2col_v1', 24, true)
ON CONFLICT (page_key, section_key) DO UPDATE
  SET section_type = EXCLUDED.section_type,
      sort_order   = EXCLUDED.sort_order,
      is_active    = true,
      updated_at   = now();

-- 2) Felder: label/title/text/image_position/background_variant aus Legacy übernehmen
DO $$
DECLARE
  rec record;
  items text[] := ARRAY['hausnummer','materialien','tuerschilder','klingel'];
  itm text;
  idx int;
  pos text;
  locs text[] := ARRAY['de','en'];
  loc text;
  v_title text;
  v_text  text;
  v_label_de text;
  v_label_en text;
BEGIN
  -- Label aus features.label übernehmen (DE/EN)
  SELECT value INTO v_label_de FROM public.cms_section_fields
    WHERE page_key='gebaeudekommunikation.beschilderung' AND section_key='features' AND field_key='label' AND locale='de';
  SELECT value INTO v_label_en FROM public.cms_section_fields
    WHERE page_key='gebaeudekommunikation.beschilderung' AND section_key='features' AND field_key='label' AND locale='en';

  FOR idx IN 1..array_length(items,1) LOOP
    itm := items[idx];
    -- abwechselnd: 1=right, 2=left, 3=right, 4=left
    pos := CASE WHEN idx % 2 = 1 THEN 'right' ELSE 'left' END;

    FOREACH loc IN ARRAY locs LOOP
      SELECT value INTO v_title FROM public.cms_section_fields
        WHERE page_key='gebaeudekommunikation.beschilderung'
          AND section_key='features'
          AND field_key='items.'||itm||'.title'
          AND locale=loc;
      SELECT value INTO v_text FROM public.cms_section_fields
        WHERE page_key='gebaeudekommunikation.beschilderung'
          AND section_key='features'
          AND field_key='items.'||itm||'.text'
          AND locale=loc;

      INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
      VALUES
        ('gebaeudekommunikation.beschilderung', 'feature_'||itm, 'label',              loc, CASE WHEN loc='de' THEN COALESCE(v_label_de,'') ELSE COALESCE(v_label_en,'') END),
        ('gebaeudekommunikation.beschilderung', 'feature_'||itm, 'title',              loc, COALESCE(v_title,'')),
        ('gebaeudekommunikation.beschilderung', 'feature_'||itm, 'text',               loc, COALESCE(v_text,'')),
        ('gebaeudekommunikation.beschilderung', 'feature_'||itm, 'image_position',     loc, pos),
        ('gebaeudekommunikation.beschilderung', 'feature_'||itm, 'background_variant', loc, 'default')
      ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- 3) Whitelist-Einträge für alle neuen Felder DE+EN (inkl. cta_label/cta_link, damit Redaktion später CTAs nachpflegen kann)
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT 'gebaeudekommunikation.beschilderung',
       'feature_'||itm,
       fk,
       loc,
       true
FROM unnest(ARRAY['hausnummer','materialien','tuerschilder','klingel']) itm
CROSS JOIN unnest(ARRAY['label','title','text','cta_label','cta_link','image_position','background_variant','image']) fk
CROSS JOIN unnest(ARRAY['de','en']) loc
ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE
  SET is_enabled = true, updated_at = now();

-- 4) Bild-Slots in cms_assets: Übernahme aus features/image_<key> in die neuen Sections
DO $$
DECLARE
  itm text;
  src record;
BEGIN
  FOREACH itm IN ARRAY ARRAY['hausnummer','materialien','tuerschilder','klingel'] LOOP
    SELECT storage_path, public_url, mime_type, file_name, alt_text_de, alt_text_en, alt_de, alt_en, focal_x, focal_y
      INTO src
      FROM public.cms_assets
     WHERE page_key='gebaeudekommunikation.beschilderung'
       AND section_key='features'
       AND field_key='image_'||itm
       AND viewport='desktop'
     ORDER BY sort_order, created_at
     LIMIT 1;

    IF FOUND THEN
      INSERT INTO public.cms_assets (
        page_key, section_key, asset_role, field_key, viewport,
        storage_path, public_url, mime_type, file_name,
        alt_text_de, alt_text_en, alt_de, alt_en,
        focal_x, focal_y, sort_order, is_active
      )
      SELECT 'gebaeudekommunikation.beschilderung',
             'feature_'||itm,
             'image',
             'image',
             'desktop',
             src.storage_path, src.public_url, src.mime_type, src.file_name,
             src.alt_text_de, src.alt_text_en, src.alt_de, src.alt_en,
             src.focal_x, src.focal_y, 0, true
      WHERE NOT EXISTS (
        SELECT 1 FROM public.cms_assets a
         WHERE a.page_key='gebaeudekommunikation.beschilderung'
           AND a.section_key='feature_'||itm
           AND a.field_key='image'
           AND a.viewport='desktop'
      );
    END IF;
  END LOOP;
END $$;