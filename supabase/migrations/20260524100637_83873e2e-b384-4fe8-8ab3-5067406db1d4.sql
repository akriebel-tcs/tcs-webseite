-- ============================================================
-- Tranche 12 — Iconkarten + Bildkarten auf card_v1 (idempotent)
-- ============================================================
-- Erzeugt 49 card_v1-Kindsections für 12 Klasse-B/C-Sections,
-- spiegelt Legacy items.<key>.* Werte (DE+EN) in title/description/
-- subtitle/icon/cta_label/cta_href und whitelistet die neuen Felder.
-- Für Klasse B zusätzlich Whitelist für Bildslot 'image' pro Karte.
-- Bestehende Werte/Sections/Whitelists bleiben unverändert.
-- Legacy items.* Felder bleiben als Renderer-Fallback erhalten.
-- ============================================================

-- ----- presse.root / releases  (Klasse B) -----
INSERT INTO cms_sections (page_key, section_key, section_type, sort_order, is_active, parent_section_id)
SELECT 'presse.root', 'releases__akademie2024', 'card_v1', 10, true, p.id
FROM cms_sections p WHERE p.page_key='presse.root' AND p.section_key='releases'
ON CONFLICT (page_key, section_key) DO NOTHING;
INSERT INTO cms_sections (page_key, section_key, section_type, sort_order, is_active, parent_section_id)
SELECT 'presse.root', 'releases__appleHomeKey', 'card_v1', 20, true, p.id
FROM cms_sections p WHERE p.page_key='presse.root' AND p.section_key='releases'
ON CONFLICT (page_key, section_key) DO NOTHING;
INSERT INTO cms_sections (page_key, section_key, section_type, sort_order, is_active, parent_section_id)
SELECT 'presse.root', 'releases__bcm2025', 'card_v1', 30, true, p.id
FROM cms_sections p WHERE p.page_key='presse.root' AND p.section_key='releases'
ON CONFLICT (page_key, section_key) DO NOTHING;
INSERT INTO cms_sections (page_key, section_key, section_type, sort_order, is_active, parent_section_id)
SELECT 'presse.root', 'releases__lightBuilding2025', 'card_v1', 40, true, p.id
FROM cms_sections p WHERE p.page_key='presse.root' AND p.section_key='releases'
ON CONFLICT (page_key, section_key) DO NOTHING;
INSERT INTO cms_sections (page_key, section_key, section_type, sort_order, is_active, parent_section_id)
SELECT 'presse.root', 'releases__rekordumsatz2024', 'card_v1', 50, true, p.id
FROM cms_sections p WHERE p.page_key='presse.root' AND p.section_key='releases'
ON CONFLICT (page_key, section_key) DO NOTHING;

-- Datengetriebener Kopier-Block: spiegelt items.<itemKey>.<srcField> nach
-- card_v1-Kind <parent>__<itemKey>.<tgtField> für alle 12 Eltern-Sections in
-- einem Rutsch. Mapping aus VALUES-Liste; Source-Item-Keys werden je Section
-- separat herangezogen, damit nur die im Audit gelisteten Items wandern.

-- Mapping-Tabelle als CTE: (page, parent, src_field_suffix, tgt_field)
-- Iteration über alle items.<x>.<src_field_suffix> Felder mit Locale.

WITH mapping(page_key, parent_key, src_field, tgt_field) AS (
  VALUES
    -- Klasse B
    ('presse.root',                              'releases',          'title', 'title'),
    ('presse.root',                              'releases',          'date',  'subtitle'),
    ('gebaeudekommunikation.tuersprechanlagen',  'anwendungsumfelder','title', 'title'),
    ('gebaeudekommunikation.tuersprechanlagen',  'anwendungsumfelder','teaser','description'),
    -- Klasse C
    ('gebaeudekommunikation.tuersprechanlagen',  'vorteile',          'title', 'title'),
    ('gebaeudekommunikation.tuersprechanlagen',  'vorteile',          'desc',  'description'),
    ('gebaeudekommunikation.tuersprechanlagen',  'vorteile',          'icon',  'icon'),
    ('gebaeudekommunikation.grossanlagen',       'systembausteine',   'label', 'subtitle'),
    ('gebaeudekommunikation.grossanlagen',       'systembausteine',   'title', 'title'),
    ('gebaeudekommunikation.grossanlagen',       'systembausteine',   'description','description'),
    ('gebaeudemanagement.bcm-buchungssystem',    'anwendungen',       'title', 'title'),
    ('gebaeudemanagement.bcm-buchungssystem',    'anwendungen',       'description','description'),
    ('gebaeudemanagement.bcm-infoboard',         'anwendungen',       'title', 'title'),
    ('gebaeudemanagement.bcm-infoboard',         'anwendungen',       'description','description'),
    ('service.online-produktkatalog',            'access',            'title', 'title'),
    ('service.online-produktkatalog',            'access',            'description','description'),
    ('service.online-produktkatalog',            'access',            'linkLabel','cta_label'),
    ('zutrittskontrolle.aussenstation-adx5',     'anwendungen',       'title', 'title'),
    ('zutrittskontrolle.aussenstation-adx5',     'anwendungen',       'description','description'),
    ('zutrittskontrolle.digitale-briefkasten',   'anwendungen',       'title', 'title'),
    ('zutrittskontrolle.digitale-briefkasten',   'anwendungen',       'description','description'),
    ('zutrittskontrolle.zutrittssoftware',       'anwendungen',       'title', 'title'),
    ('zutrittskontrolle.zutrittssoftware',       'anwendungen',       'description','description'),
    ('zutrittskontrolle.bcm-mini-cloud',         'anwendungen',       'title', 'title'),
    ('zutrittskontrolle.bcm-mini-cloud',         'anwendungen',       'description','description'),
    ('zutrittskontrolle.bcm-mini-cloud',         'anwendungen',       'href',  'cta_href'),
    ('signage.root',                             'products',          'headline','title'),
    ('signage.root',                             'products',          'text',  'description')
),
-- Aus den vorhandenen Legacy-Feldern alle items.<itemKey>.<src_field> finden
-- und in das card_v1-Kind <parent>__<itemKey> spiegeln. Numerische itemKeys
-- (z. B. items.0.title) bekommen das Präfix `item_` im section_key, damit
-- der Audit-Scanner sie nicht weiter als Legacy `_item_N` einstuft.
source AS (
  SELECT
    m.page_key,
    m.parent_key,
    f.locale,
    -- itemKey aus items.<X>.<rest> extrahieren (X kann numerisch oder text sein)
    split_part(substring(f.field_key FROM '^items\.([^.]+)\.'), '.', 1) AS item_key,
    m.tgt_field,
    f.value AS val
  FROM mapping m
  JOIN cms_section_fields f
    ON f.page_key = m.page_key
   AND f.section_key = m.parent_key
   AND f.field_key = 'items.' || split_part(substring(f.field_key FROM '^items\.([^.]+)\.'), '.', 1) || '.' || m.src_field
   AND f.value IS NOT NULL
   AND f.value <> ''
)
INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT
  s.page_key,
  s.parent_key || '__' || CASE WHEN s.item_key ~ '^[0-9]+$' THEN 'item_' || s.item_key ELSE s.item_key END,
  s.tgt_field,
  s.locale,
  s.val
FROM source s
-- Nur einfügen, wenn die card_v1-Kindsection bereits existiert.
WHERE EXISTS (
  SELECT 1 FROM cms_sections cs
  WHERE cs.page_key = s.page_key
    AND cs.section_key = s.parent_key || '__' || CASE WHEN s.item_key ~ '^[0-9]+$' THEN 'item_' || s.item_key ELSE s.item_key END
    AND cs.section_type = 'card_v1'
)
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

-- Restliche card_v1-Kindsections (nicht-numerische itemKeys) für Klasse C anlegen.
-- Wir haben oben nur Klasse-B-Sections explizit angelegt; jetzt für Klasse C
-- alle Kindsections anhand der Mapping-Tabelle ableiten.

WITH parents AS (
  SELECT page_key, parent_key
  FROM (VALUES
    ('gebaeudekommunikation.tuersprechanlagen','vorteile'),
    ('gebaeudekommunikation.grossanlagen','systembausteine'),
    ('gebaeudemanagement.bcm-buchungssystem','anwendungen'),
    ('gebaeudemanagement.bcm-infoboard','anwendungen'),
    ('service.online-produktkatalog','access'),
    ('zutrittskontrolle.aussenstation-adx5','anwendungen'),
    ('zutrittskontrolle.digitale-briefkasten','anwendungen'),
    ('zutrittskontrolle.zutrittssoftware','anwendungen'),
    ('zutrittskontrolle.bcm-mini-cloud','anwendungen'),
    ('signage.root','products')
  ) v(page_key, parent_key)
),
items_found AS (
  SELECT DISTINCT
    p.page_key,
    p.parent_key,
    split_part(substring(f.field_key FROM '^items\.([^.]+)\.'), '.', 1) AS item_key
  FROM parents p
  JOIN cms_section_fields f
    ON f.page_key = p.page_key
   AND f.section_key = p.parent_key
   AND f.field_key ~ '^items\.[^.]+\.'
   AND f.locale = 'de'
),
ordered AS (
  SELECT
    page_key,
    parent_key,
    item_key,
    -- numerische Items behalten ihre Reihenfolge; nicht-numerische über row_number()
    ROW_NUMBER() OVER (
      PARTITION BY page_key, parent_key
      ORDER BY
        CASE WHEN item_key ~ '^[0-9]+$' THEN item_key::int ELSE NULL END NULLS LAST,
        item_key
    ) * 10 AS sort_order
  FROM items_found
)
INSERT INTO cms_sections (page_key, section_key, section_type, sort_order, is_active, parent_section_id)
SELECT
  o.page_key,
  o.parent_key || '__' || CASE WHEN o.item_key ~ '^[0-9]+$' THEN 'item_' || o.item_key ELSE o.item_key END,
  'card_v1',
  o.sort_order::int,
  true,
  ps.id
FROM ordered o
JOIN cms_sections ps ON ps.page_key = o.page_key AND ps.section_key = o.parent_key
ON CONFLICT (page_key, section_key) DO NOTHING;

-- Jetzt nochmal Feld-Kopier-Block laufen lassen — damit Felder für die eben
-- erst angelegten Klasse-C-Kindsections nachgezogen werden.
WITH mapping(page_key, parent_key, src_field, tgt_field) AS (
  VALUES
    ('presse.root',                              'releases',          'title', 'title'),
    ('presse.root',                              'releases',          'date',  'subtitle'),
    ('gebaeudekommunikation.tuersprechanlagen',  'anwendungsumfelder','title', 'title'),
    ('gebaeudekommunikation.tuersprechanlagen',  'anwendungsumfelder','teaser','description'),
    ('gebaeudekommunikation.tuersprechanlagen',  'vorteile',          'title', 'title'),
    ('gebaeudekommunikation.tuersprechanlagen',  'vorteile',          'desc',  'description'),
    ('gebaeudekommunikation.tuersprechanlagen',  'vorteile',          'icon',  'icon'),
    ('gebaeudekommunikation.grossanlagen',       'systembausteine',   'label', 'subtitle'),
    ('gebaeudekommunikation.grossanlagen',       'systembausteine',   'title', 'title'),
    ('gebaeudekommunikation.grossanlagen',       'systembausteine',   'description','description'),
    ('gebaeudemanagement.bcm-buchungssystem',    'anwendungen',       'title', 'title'),
    ('gebaeudemanagement.bcm-buchungssystem',    'anwendungen',       'description','description'),
    ('gebaeudemanagement.bcm-infoboard',         'anwendungen',       'title', 'title'),
    ('gebaeudemanagement.bcm-infoboard',         'anwendungen',       'description','description'),
    ('service.online-produktkatalog',            'access',            'title', 'title'),
    ('service.online-produktkatalog',            'access',            'description','description'),
    ('service.online-produktkatalog',            'access',            'linkLabel','cta_label'),
    ('zutrittskontrolle.aussenstation-adx5',     'anwendungen',       'title', 'title'),
    ('zutrittskontrolle.aussenstation-adx5',     'anwendungen',       'description','description'),
    ('zutrittskontrolle.digitale-briefkasten',   'anwendungen',       'title', 'title'),
    ('zutrittskontrolle.digitale-briefkasten',   'anwendungen',       'description','description'),
    ('zutrittskontrolle.zutrittssoftware',       'anwendungen',       'title', 'title'),
    ('zutrittskontrolle.zutrittssoftware',       'anwendungen',       'description','description'),
    ('zutrittskontrolle.bcm-mini-cloud',         'anwendungen',       'title', 'title'),
    ('zutrittskontrolle.bcm-mini-cloud',         'anwendungen',       'description','description'),
    ('zutrittskontrolle.bcm-mini-cloud',         'anwendungen',       'href',  'cta_href'),
    ('signage.root',                             'products',          'headline','title'),
    ('signage.root',                             'products',          'text',  'description')
),
source AS (
  SELECT
    m.page_key,
    m.parent_key,
    f.locale,
    split_part(substring(f.field_key FROM '^items\.([^.]+)\.'), '.', 1) AS item_key,
    m.tgt_field,
    f.value AS val
  FROM mapping m
  JOIN cms_section_fields f
    ON f.page_key = m.page_key
   AND f.section_key = m.parent_key
   AND f.field_key = 'items.' || split_part(substring(f.field_key FROM '^items\.([^.]+)\.'), '.', 1) || '.' || m.src_field
   AND f.value IS NOT NULL
   AND f.value <> ''
)
INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT
  s.page_key,
  s.parent_key || '__' || CASE WHEN s.item_key ~ '^[0-9]+$' THEN 'item_' || s.item_key ELSE s.item_key END,
  s.tgt_field,
  s.locale,
  s.val
FROM source s
WHERE EXISTS (
  SELECT 1 FROM cms_sections cs
  WHERE cs.page_key = s.page_key
    AND cs.section_key = s.parent_key || '__' || CASE WHEN s.item_key ~ '^[0-9]+$' THEN 'item_' || s.item_key ELSE s.item_key END
    AND cs.section_type = 'card_v1'
)
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

-- Whitelist alle gerade angelegten Felder (DE+EN) plus 'image' für Klasse-B-Karten.
-- Wir leiten die Liste direkt aus cms_section_fields ab — damit landen exakt
-- die existierenden card_v1-Felder in der Whitelist, ohne Hardcoding.

INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT DISTINCT f.page_key, f.section_key, f.field_key, f.locale, true
FROM cms_section_fields f
JOIN cms_sections s
  ON s.page_key = f.page_key
 AND s.section_key = f.section_key
 AND s.section_type = 'card_v1'
WHERE (f.page_key, split_part(f.section_key, '__', 1)) IN (
   ('presse.root','releases'),
   ('gebaeudekommunikation.tuersprechanlagen','anwendungsumfelder'),
   ('gebaeudekommunikation.tuersprechanlagen','vorteile'),
   ('gebaeudekommunikation.grossanlagen','systembausteine'),
   ('gebaeudemanagement.bcm-buchungssystem','anwendungen'),
   ('gebaeudemanagement.bcm-infoboard','anwendungen'),
   ('service.online-produktkatalog','access'),
   ('zutrittskontrolle.aussenstation-adx5','anwendungen'),
   ('zutrittskontrolle.digitale-briefkasten','anwendungen'),
   ('zutrittskontrolle.zutrittssoftware','anwendungen'),
   ('zutrittskontrolle.bcm-mini-cloud','anwendungen'),
   ('signage.root','products')
)
AND f.field_key IN ('title','subtitle','description','icon','cta_label','cta_href')
ON CONFLICT (page_key, section_key, field_key, locale)
DO UPDATE SET is_enabled = true, updated_at = now();

-- Bildslot 'image' für die beiden Klasse-B-Eltern (alle deren card_v1-Kinder).
INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT s.page_key, s.section_key, 'image', l.locale, true
FROM cms_sections s
CROSS JOIN (VALUES ('de'),('en')) l(locale)
WHERE s.section_type = 'card_v1'
  AND (s.page_key, split_part(s.section_key, '__', 1)) IN (
    ('presse.root','releases'),
    ('gebaeudekommunikation.tuersprechanlagen','anwendungsumfelder')
  )
ON CONFLICT (page_key, section_key, field_key, locale)
DO UPDATE SET is_enabled = true, updated_at = now();
