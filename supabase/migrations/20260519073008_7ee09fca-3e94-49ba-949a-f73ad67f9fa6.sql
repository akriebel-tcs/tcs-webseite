
-- ============================================================
-- CMS Content V1 Abgleich: ZK + GM Lösungskarten / Links
-- Idempotent.
-- ============================================================

-- 1) BCM MiniCloud Karte auf zutrittskontrolle.tueren-tore
-- Reihenfolge anpassen: handsender 4->5, biometrie 5->6, dann MiniCloud auf 4.
UPDATE cms_sections
SET sort_order = 6, updated_at = now()
WHERE page_key = 'zutrittskontrolle.tueren-tore'
  AND section_key = 'card_biometrie'
  AND sort_order <> 6;

UPDATE cms_sections
SET sort_order = 5, updated_at = now()
WHERE page_key = 'zutrittskontrolle.tueren-tore'
  AND section_key = 'card_handsender'
  AND sort_order <> 5;

-- Karte MiniCloud anlegen (Kind von products)
INSERT INTO cms_sections (page_key, section_key, section_type, sort_order, is_active, parent_section_id)
SELECT 'zutrittskontrolle.tueren-tore', 'card_minicloud', 'card_v1', 4, true,
       (SELECT id FROM cms_sections WHERE page_key='zutrittskontrolle.tueren-tore' AND section_key='products' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM cms_sections
  WHERE page_key='zutrittskontrolle.tueren-tore' AND section_key='card_minicloud'
);

-- Sicherstellen, dass sort_order/parent korrekt sind, falls Karte schon existiert
UPDATE cms_sections s
SET sort_order = 4,
    parent_section_id = (SELECT id FROM cms_sections WHERE page_key='zutrittskontrolle.tueren-tore' AND section_key='products' LIMIT 1),
    is_active = true,
    updated_at = now()
WHERE s.page_key='zutrittskontrolle.tueren-tore'
  AND s.section_key='card_minicloud';

-- Felder MiniCloud (DE + EN)
INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
VALUES
  ('zutrittskontrolle.tueren-tore','card_minicloud','title','de','BCM MiniCloud'),
  ('zutrittskontrolle.tueren-tore','card_minicloud','subtitle','de','Cloud-Zutrittskontrolle'),
  ('zutrittskontrolle.tueren-tore','card_minicloud','description','de','Einfache und sichere Cloud-Zutrittskontrolle für kleine Unternehmen und Privathaushalte – ohne Verkabelung, in 10 Minuten einsatzbereit.'),
  ('zutrittskontrolle.tueren-tore','card_minicloud','href','de','/zutrittskontrolle/bcm-mini-cloud'),
  ('zutrittskontrolle.tueren-tore','card_minicloud','title','en','BCM MiniCloud'),
  ('zutrittskontrolle.tueren-tore','card_minicloud','subtitle','en','Cloud access control'),
  ('zutrittskontrolle.tueren-tore','card_minicloud','description','en','Simple and secure cloud-based access control for small businesses and private homes – no cabling, ready in 10 minutes.'),
  ('zutrittskontrolle.tueren-tore','card_minicloud','href','en','/zutrittskontrolle/bcm-mini-cloud')
ON CONFLICT DO NOTHING;

-- 2) href-Felder auf zufahrten-parkplaetze Karten ergänzen
UPDATE cms_section_fields
SET value = '/zutrittskontrolle/zufahrtskontrolle', updated_at = now()
WHERE page_key='zutrittskontrolle.zufahrten-parkplaetze'
  AND section_key IN ('card_kfz','card_uhf_leser')
  AND field_key='href'
  AND COALESCE(value,'') = '';

UPDATE cms_section_fields
SET value = '/zutrittskontrolle/gsm-gateway', updated_at = now()
WHERE page_key='zutrittskontrolle.zufahrten-parkplaetze'
  AND section_key='card_gsm_gateway'
  AND field_key='href'
  AND COALESCE(value,'') = '';

-- Falls Felder fehlen, anlegen (de)
INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT 'zutrittskontrolle.zufahrten-parkplaetze', sk, 'href', 'de', v
FROM (VALUES
  ('card_kfz','/zutrittskontrolle/zufahrtskontrolle'),
  ('card_uhf_leser','/zutrittskontrolle/zufahrtskontrolle'),
  ('card_gsm_gateway','/zutrittskontrolle/gsm-gateway')
) AS x(sk,v)
WHERE NOT EXISTS (
  SELECT 1 FROM cms_section_fields f
  WHERE f.page_key='zutrittskontrolle.zufahrten-parkplaetze'
    AND f.section_key=x.sk AND f.field_key='href' AND f.locale='de'
);

-- 3) GM Karten href-Felder
-- gebaeudemanagement.schraenke-behaelter
INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT 'gebaeudemanagement.schraenke-behaelter', sk, 'href', loc, v
FROM (VALUES
  ('products__schrankschloss','/zutrittskontrolle/schrankschloss'),
  ('products__serverschloss','/zutrittskontrolle/serverschrankschloss'),
  ('products__vorhaengeschloss','/zutrittskontrolle/vorhaengeschloss')
) AS x(sk,v)
CROSS JOIN (VALUES ('de'),('en')) AS l(loc)
WHERE NOT EXISTS (
  SELECT 1 FROM cms_section_fields f
  WHERE f.page_key='gebaeudemanagement.schraenke-behaelter'
    AND f.section_key=x.sk AND f.field_key='href' AND f.locale=l.loc
);

-- gebaeudemanagement.digitale-namensanzeige
INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT 'gebaeudemanagement.digitale-namensanzeige', sk, 'href', loc, v
FROM (VALUES
  ('products__adx5','/zutrittskontrolle/aussenstation-adx5'),
  ('products__briefkasten','/zutrittskontrolle/digitale-briefkasten'),
  ('products__software','/zutrittskontrolle/zutrittssoftware')
) AS x(sk,v)
CROSS JOIN (VALUES ('de'),('en')) AS l(loc)
WHERE NOT EXISTS (
  SELECT 1 FROM cms_section_fields f
  WHERE f.page_key='gebaeudemanagement.digitale-namensanzeige'
    AND f.section_key=x.sk AND f.field_key='href' AND f.locale=l.loc
);

-- gebaeudemanagement.reservieren-buchen
INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT 'gebaeudemanagement.reservieren-buchen','products__bcmBuchungssystem','href',loc,'/gebaeudemanagement/bcm-buchungssystem'
FROM (VALUES ('de'),('en')) AS l(loc)
WHERE NOT EXISTS (
  SELECT 1 FROM cms_section_fields f
  WHERE f.page_key='gebaeudemanagement.reservieren-buchen'
    AND f.section_key='products__bcmBuchungssystem'
    AND f.field_key='href' AND f.locale=l.loc
);

-- 4) Whitelist-Einträge für alle neuen href-Felder + MiniCloud Texte
INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT pk, sk, fk, loc, true FROM (VALUES
  ('zutrittskontrolle.tueren-tore','card_minicloud','title'),
  ('zutrittskontrolle.tueren-tore','card_minicloud','subtitle'),
  ('zutrittskontrolle.tueren-tore','card_minicloud','description'),
  ('zutrittskontrolle.tueren-tore','card_minicloud','href'),
  ('zutrittskontrolle.zufahrten-parkplaetze','card_kfz','href'),
  ('zutrittskontrolle.zufahrten-parkplaetze','card_uhf_leser','href'),
  ('zutrittskontrolle.zufahrten-parkplaetze','card_gsm_gateway','href'),
  ('gebaeudemanagement.schraenke-behaelter','products__schrankschloss','href'),
  ('gebaeudemanagement.schraenke-behaelter','products__serverschloss','href'),
  ('gebaeudemanagement.schraenke-behaelter','products__vorhaengeschloss','href'),
  ('gebaeudemanagement.digitale-namensanzeige','products__adx5','href'),
  ('gebaeudemanagement.digitale-namensanzeige','products__briefkasten','href'),
  ('gebaeudemanagement.digitale-namensanzeige','products__software','href'),
  ('gebaeudemanagement.reservieren-buchen','products__bcmBuchungssystem','href')
) AS x(pk,sk,fk)
CROSS JOIN (VALUES ('de'),('en')) AS l(loc)
WHERE NOT EXISTS (
  SELECT 1 FROM cms_admin_editable_fields w
  WHERE w.page_key=x.pk AND w.section_key=x.sk AND w.field_key=x.fk AND w.locale=l.loc
);
