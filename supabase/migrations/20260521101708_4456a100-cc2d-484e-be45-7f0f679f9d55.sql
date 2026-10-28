-- Etappe I — produkte → product_scroller_v1 + card_v1
-- Betroffen: zutrittskontrolle.biometrie, zutrittskontrolle.zufahrtskontrolle

BEGIN;

-- 1) Parent-Section-Typ auf product_scroller_v1 setzen
UPDATE cms_sections
SET section_type = 'product_scroller_v1', updated_at = now()
WHERE page_key IN ('zutrittskontrolle.biometrie','zutrittskontrolle.zufahrtskontrolle')
  AND section_key = 'produkte'
  AND section_type <> 'product_scroller_v1';

-- 2) Kind-Sections anlegen (idempotent)
WITH spec(page_key, idx) AS (
  VALUES
    ('zutrittskontrolle.biometrie'::text, 1),
    ('zutrittskontrolle.biometrie', 2),
    ('zutrittskontrolle.biometrie', 3),
    ('zutrittskontrolle.zufahrtskontrolle', 1),
    ('zutrittskontrolle.zufahrtskontrolle', 2)
),
parents AS (
  SELECT id, page_key FROM cms_sections
  WHERE section_key='produkte'
    AND page_key IN ('zutrittskontrolle.biometrie','zutrittskontrolle.zufahrtskontrolle')
)
INSERT INTO cms_sections (page_key, section_key, section_type, parent_section_id, sort_order, is_active)
SELECT s.page_key, 'produkte_item_'||s.idx, 'card_v1', p.id, s.idx*10, true
FROM spec s JOIN parents p ON p.page_key=s.page_key
WHERE NOT EXISTS (
  SELECT 1 FROM cms_sections x
  WHERE x.page_key=s.page_key AND x.section_key='produkte_item_'||s.idx
);

-- 3a) items.N.headline → title (DE+EN), bestehende Werte nicht überschreiben
INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT f.page_key,
       'produkte_item_'||(split_part(f.field_key,'.',2)::int + 1),
       'title',
       f.locale,
       f.value
FROM cms_section_fields f
WHERE f.page_key IN ('zutrittskontrolle.biometrie','zutrittskontrolle.zufahrtskontrolle')
  AND f.section_key='produkte'
  AND f.field_key ~ '^items\.[0-9]+\.headline$'
  AND NOT EXISTS (
    SELECT 1 FROM cms_section_fields x
    WHERE x.page_key=f.page_key
      AND x.section_key='produkte_item_'||(split_part(f.field_key,'.',2)::int + 1)
      AND x.field_key='title' AND x.locale=f.locale
  );

-- 3b) items.N.vorteile.M → features.M (DE+EN)
INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT f.page_key,
       'produkte_item_'||(split_part(f.field_key,'.',2)::int + 1),
       'features.'||split_part(f.field_key,'.',4),
       f.locale,
       f.value
FROM cms_section_fields f
WHERE f.page_key IN ('zutrittskontrolle.biometrie','zutrittskontrolle.zufahrtskontrolle')
  AND f.section_key='produkte'
  AND f.field_key ~ '^items\.[0-9]+\.vorteile\.[0-9]+$'
  AND NOT EXISTS (
    SELECT 1 FROM cms_section_fields x
    WHERE x.page_key=f.page_key
      AND x.section_key='produkte_item_'||(split_part(f.field_key,'.',2)::int + 1)
      AND x.field_key='features.'||split_part(f.field_key,'.',4)
      AND x.locale=f.locale
  );

-- 4) Biometrie: bestehende Parent-Assets als Desktop-Bild der jeweiligen Karte spiegeln
--    (alte Asset-Zeilen bleiben unangetastet; nur neue Zeilen für Kindkarte 'image' anlegen)
WITH amap(page_key, old_field, new_section) AS (
  VALUES
    ('zutrittskontrolle.biometrie'::text, 'image_fingerprint'::text, 'produkte_item_1'::text),
    ('zutrittskontrolle.biometrie',       'image_3d',                'produkte_item_2'),
    ('zutrittskontrolle.biometrie',       'image_gesicht',           'produkte_item_3')
)
INSERT INTO cms_assets (page_key, section_key, field_key, asset_role, storage_path, public_url,
                        alt_de, alt_en, alt_text_de, alt_text_en, viewport, sort_order, is_active,
                        file_name, mime_type, focal_x, focal_y, locale)
SELECT a.page_key, m.new_section, 'image', COALESCE(a.asset_role,'image'), a.storage_path, a.public_url,
       a.alt_de, a.alt_en, a.alt_text_de, a.alt_text_en, 'desktop', 0, true,
       a.file_name, a.mime_type, a.focal_x, a.focal_y, a.locale
FROM cms_assets a
JOIN amap m ON m.page_key=a.page_key AND m.old_field=a.field_key AND a.section_key='produkte'
WHERE NOT EXISTS (
  SELECT 1 FROM cms_assets x
  WHERE x.page_key=a.page_key AND x.section_key=m.new_section
    AND x.field_key='image' AND x.viewport='desktop'
);

-- 5) Alt-Texte aus items.N.imageAlt auf die neue Karte ziehen (nur wenn noch leer)
WITH alts AS (
  SELECT page_key,
         'produkte_item_'||(split_part(field_key,'.',2)::int + 1) AS sk,
         locale, value
  FROM cms_section_fields
  WHERE page_key IN ('zutrittskontrolle.biometrie','zutrittskontrolle.zufahrtskontrolle')
    AND section_key='produkte'
    AND field_key ~ '^items\.[0-9]+\.imageAlt$'
)
UPDATE cms_assets a
SET alt_text_de = COALESCE(NULLIF(a.alt_text_de,''), de.value, a.alt_text_de),
    alt_text_en = COALESCE(NULLIF(a.alt_text_en,''), en.value, a.alt_text_en),
    alt_de      = COALESCE(NULLIF(a.alt_de,''),      de.value, a.alt_de),
    alt_en      = COALESCE(NULLIF(a.alt_en,''),      en.value, a.alt_en),
    updated_at  = now()
FROM (SELECT * FROM alts WHERE locale='de') de
LEFT JOIN (SELECT * FROM alts WHERE locale='en') en
       ON en.page_key=de.page_key AND en.sk=de.sk
WHERE a.page_key=de.page_key
  AND a.section_key=de.sk
  AND a.field_key='image';

-- 6) Whitelist für neue Kindkarten anlegen / aktivieren
WITH items(page_key, idx, feat_count) AS (
  VALUES
    ('zutrittskontrolle.biometrie'::text,         1, 5),
    ('zutrittskontrolle.biometrie',               2, 5),
    ('zutrittskontrolle.biometrie',               3, 5),
    ('zutrittskontrolle.zufahrtskontrolle',       1, 8),
    ('zutrittskontrolle.zufahrtskontrolle',       2, 7)
),
locs(loc) AS (VALUES ('de'),('en')),
flat AS (
  SELECT i.page_key, 'produkte_item_'||i.idx AS section_key, fk AS field_key, l.loc AS locale
  FROM items i CROSS JOIN locs l
  CROSS JOIN (VALUES ('title'),('description'),('image')) AS f(fk)
  UNION ALL
  SELECT i.page_key, 'produkte_item_'||i.idx, 'features.'||g, l.loc
  FROM items i, generate_series(0, i.feat_count-1) g, locs l
)
INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT page_key, section_key, field_key, locale, true FROM flat
ON CONFLICT (page_key, section_key, field_key, locale)
DO UPDATE SET is_enabled=true, updated_at=now();

-- 7) Legacy-Whitelist (items.N.*) im Admin verstecken — Daten bleiben für Public-Fallback
UPDATE cms_admin_editable_fields
SET is_enabled=false, updated_at=now()
WHERE page_key IN ('zutrittskontrolle.biometrie','zutrittskontrolle.zufahrtskontrolle')
  AND section_key='produkte'
  AND field_key ~ '^items\.[0-9]+\.(headline|imageAlt|vorteile\.[0-9]+)$'
  AND is_enabled = true;

-- 8) Renumber (falls Funktion vorhanden)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname='cms_renumber_sections') THEN
    PERFORM cms_renumber_sections('zutrittskontrolle.biometrie');
    PERFORM cms_renumber_sections('zutrittskontrolle.zufahrtskontrolle');
  END IF;
END $$;

COMMIT;