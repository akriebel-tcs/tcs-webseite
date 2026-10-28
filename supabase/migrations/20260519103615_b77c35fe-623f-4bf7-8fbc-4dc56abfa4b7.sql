-- Etappe X1: Eltern-Karten-Blöcke korrekt typisieren + Block-Titel whitelisten

-- 1) Eltern-Sections von content_v1 → cards_v1 hochstufen,
--    damit der Workbench-Editor sie als Karten-Container erkennt.
--    Bedingung: nur Top-Level-Sections (parent_section_id IS NULL),
--    die mindestens ein card_v1-Kind haben.
UPDATE cms_sections p
   SET section_type = 'cards_v1',
       updated_at = now()
 WHERE p.parent_section_id IS NULL
   AND p.section_type = 'content_v1'
   AND (
        (p.page_key = 'zutrittskontrolle.tueren-tore'         AND p.section_key IN ('products','benefits'))
     OR (p.page_key = 'zutrittskontrolle.mobiler-zutritt'      AND p.section_key = 'products')
     OR (p.page_key = 'zutrittskontrolle.zufahrten-parkplaetze' AND p.section_key = 'products')
   )
   AND EXISTS (
     SELECT 1 FROM cms_sections c
      WHERE c.parent_section_id = p.id
        AND c.section_type = 'card_v1'
   );

-- 2) Block-Titel/Eyebrow als pflegbare Felder whitelisten (DE+EN).
--    Idempotent via ON CONFLICT.
INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT pk, sk, fk, loc, true
  FROM (VALUES
    ('zutrittskontrolle.tueren-tore', 'products',  'title'),
    ('zutrittskontrolle.tueren-tore', 'products',  'eyebrow'),
    ('zutrittskontrolle.tueren-tore', 'benefits',  'eyebrow')
  ) AS rows(pk, sk, fk),
       (VALUES ('de'), ('en')) AS locs(loc)
ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE
   SET is_enabled = EXCLUDED.is_enabled,
       updated_at = now();