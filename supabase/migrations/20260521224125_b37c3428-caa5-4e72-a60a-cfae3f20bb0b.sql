-- Personas P-108..P-113: Lösungsbereiche als teaser_2col_v1-Wechselteaser
-- Erzeugt für jede der 6 Persona-Seiten 4 neue teaser_2col_v1-Sections
-- (eine je Lösungs-Karte), übernimmt Texte/Bilder/Links 1:1, schreibt die
-- Admin-Whitelist und deaktiviert die alte content_v1-"solutions"-Section.
-- Idempotent: alle INSERTs sind ON CONFLICT DO NOTHING / WHERE NOT EXISTS.

WITH cfg(page_key, item_key, idx) AS (
  VALUES
    ('personas.architekt',          'entry',         1),
    ('personas.architekt',          'communication', 2),
    ('personas.architekt',          'access',        3),
    ('personas.architekt',          'signage',       4),
    ('personas.bauherr',            'communication', 1),
    ('personas.bauherr',            'access',        2),
    ('personas.bauherr',            'entry',         3),
    ('personas.bauherr',            'signage',       4),
    ('personas.fachhandel',         'communication', 1),
    ('personas.fachhandel',         'access',        2),
    ('personas.fachhandel',         'entry',         3),
    ('personas.fachhandel',         'signage',       4),
    ('personas.fachplaner',         'communication', 1),
    ('personas.fachplaner',         'access',        2),
    ('personas.fachplaner',         'entry',         3),
    ('personas.fachplaner',         'signage',       4),
    ('personas.handwerk',           'intercoms',     1),
    ('personas.handwerk',           'access',        2),
    ('personas.handwerk',           'entry',         3),
    ('personas.handwerk',           'signage',       4),
    ('personas.wohnungswirtschaft', 'communication', 1),
    ('personas.wohnungswirtschaft', 'access',        2),
    ('personas.wohnungswirtschaft', 'entry',         3),
    ('personas.wohnungswirtschaft', 'signage',       4)
),
plan AS (
  SELECT
    page_key,
    item_key,
    idx,
    'solution_teaser_' || item_key                AS new_section_key,
    40 + idx                                       AS sort_order,
    CASE WHEN idx % 2 = 1 THEN 'left' ELSE 'right' END AS image_position,
    'image_' || item_key                           AS src_image_field,
    CASE item_key
      WHEN 'entry'         THEN '/eingangssysteme'
      WHEN 'communication' THEN '/gebaeudekommunikation'
      WHEN 'intercoms'     THEN '/gebaeudekommunikation'
      WHEN 'access'        THEN '/zutrittskontrolle'
      WHEN 'signage'       THEN '/gebaeudekommunikation/beschilderung'
    END                                            AS cta_link
  FROM cfg
),
-- 1) Neue teaser_2col_v1-Sections anlegen
ins_sections AS (
  INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active)
  SELECT page_key, new_section_key, 'teaser_2col_v1', sort_order, true
  FROM plan
  ON CONFLICT (page_key, section_key) DO UPDATE
    SET section_type = EXCLUDED.section_type,
        sort_order   = EXCLUDED.sort_order,
        is_active    = true,
        updated_at   = now()
  RETURNING page_key, section_key
),
-- 2) Textfelder aus alten items.<key>.* übernehmen (label, title, text)
texts AS (
  SELECT
    p.page_key,
    p.new_section_key AS section_key,
    fld.locale,
    CASE fld.field_key
      WHEN 'items.' || p.item_key || '.label'    THEN 'label'
      WHEN 'items.' || p.item_key || '.headline' THEN 'title'
      WHEN 'items.' || p.item_key || '.text'     THEN 'text'
    END AS field_key,
    fld.value
  FROM plan p
  JOIN public.cms_section_fields fld
    ON fld.page_key    = p.page_key
   AND fld.section_key = 'solutions'
   AND fld.field_key IN (
     'items.' || p.item_key || '.label',
     'items.' || p.item_key || '.headline',
     'items.' || p.item_key || '.text'
   )
),
ins_texts AS (
  INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
  SELECT page_key, section_key, field_key, locale, value FROM texts
  ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING
  RETURNING 1
),
-- 3) CTA-Label DE/EN
ins_cta_label AS (
  INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
  SELECT p.page_key, p.new_section_key, 'cta_label', l.locale, l.value
  FROM plan p
  CROSS JOIN (VALUES ('de','Mehr erfahren'),('en','Learn more')) AS l(locale, value)
  ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING
  RETURNING 1
),
-- 4) CTA-Link (identisch DE/EN — interner Pfad)
ins_cta_link AS (
  INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
  SELECT p.page_key, p.new_section_key, 'cta_link', l.locale, p.cta_link
  FROM plan p
  CROSS JOIN (VALUES ('de'),('en')) AS l(locale)
  ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING
  RETURNING 1
),
-- 5) image_position (left/right, alternierend)
ins_imgpos AS (
  INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
  SELECT p.page_key, p.new_section_key, 'image_position', l.locale, p.image_position
  FROM plan p
  CROSS JOIN (VALUES ('de'),('en')) AS l(locale)
  ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING
  RETURNING 1
),
-- 6) background_variant = default
ins_bg AS (
  INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
  SELECT p.page_key, p.new_section_key, 'background_variant', l.locale, 'default'
  FROM plan p
  CROSS JOIN (VALUES ('de'),('en')) AS l(locale)
  ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING
  RETURNING 1
),
-- 7) Bilder kopieren: cms_assets von solutions/image_<key> → solution_teaser_<key>/image
ins_assets AS (
  INSERT INTO public.cms_assets (
    page_key, section_key, asset_role, field_key, viewport,
    storage_path, public_url, alt_text_de, alt_text_en, alt_de, alt_en,
    focal_x, focal_y, sort_order, is_active, file_name, mime_type
  )
  SELECT
    p.page_key, p.new_section_key, 'image', 'image', src.viewport,
    src.storage_path, src.public_url, src.alt_text_de, src.alt_text_en, src.alt_de, src.alt_en,
    src.focal_x, src.focal_y, 0, true, src.file_name, src.mime_type
  FROM plan p
  JOIN public.cms_assets src
    ON src.page_key    = p.page_key
   AND src.section_key = 'solutions'
   AND src.field_key   = p.src_image_field
   AND src.is_active   = true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.cms_assets dst
    WHERE dst.page_key    = p.page_key
      AND dst.section_key = p.new_section_key
      AND dst.field_key   = 'image'
      AND dst.viewport    = src.viewport
  )
  RETURNING 1
),
-- 8) Whitelist im Admin
ins_whitelist AS (
  INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
  SELECT p.page_key, p.new_section_key, f.field_key, l.locale, true
  FROM plan p
  CROSS JOIN (VALUES ('label'),('title'),('text'),('cta_label'),('cta_link'),('image_position'),('background_variant')) AS f(field_key)
  CROSS JOIN (VALUES ('de'),('en')) AS l(locale)
  ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE
    SET is_enabled = true,
        updated_at = now()
  RETURNING 1
),
-- 9) Alte "solutions"-Section deaktivieren (Inhalte bleiben als Backup erhalten)
deact AS (
  UPDATE public.cms_sections
     SET is_active = false,
         updated_at = now()
   WHERE section_key = 'solutions'
     AND page_key IN (SELECT DISTINCT page_key FROM plan)
  RETURNING page_key
)
SELECT
  (SELECT count(*) FROM ins_sections)  AS sections_upserted,
  (SELECT count(*) FROM ins_texts)     AS text_fields_inserted,
  (SELECT count(*) FROM ins_assets)    AS assets_inserted,
  (SELECT count(*) FROM deact)         AS solutions_deactivated;