-- Etappe nav-produkte-service-split / D: 3 Karten auf produkte.hub.
-- Idempotent.

-- Parent-Section "cards"
INSERT INTO cms_sections (page_key, section_key, section_type, sort_order, is_active)
VALUES ('produkte.hub', 'cards', 'card_grid_v1', 10, true)
ON CONFLICT (page_key, section_key) DO UPDATE
  SET section_type = EXCLUDED.section_type,
      sort_order   = EXCLUDED.sort_order,
      is_active    = EXCLUDED.is_active;

-- Header-Felder
INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value) VALUES
  ('produkte.hub','cards','headline','de','Unsere Produktbereiche'),
  ('produkte.hub','cards','headline','en','Our product areas'),
  ('produkte.hub','cards','intro','de','Drei Wege zu unseren Produkten: Türkommunikation, Zutrittskontrolle und Eingangslösungen.'),
  ('produkte.hub','cards','intro','en','Three paths into our products: door communication, access control and entry solutions.')
ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE SET value = EXCLUDED.value;

-- 3 Karten als Kinder
WITH parent AS (
  SELECT id FROM cms_sections WHERE page_key='produkte.hub' AND section_key='cards'
)
INSERT INTO cms_sections (page_key, section_key, section_type, sort_order, is_active, parent_section_id)
SELECT 'produkte.hub', sk, 'card_v1', so, true, parent.id
FROM parent, (VALUES
  ('cards.tuerkommunikation', 10),
  ('cards.zutrittskontrolle', 20),
  ('cards.eingangsloesungen', 30)
) AS v(sk, so)
ON CONFLICT (page_key, section_key) DO UPDATE
  SET section_type      = EXCLUDED.section_type,
      sort_order        = EXCLUDED.sort_order,
      is_active         = EXCLUDED.is_active,
      parent_section_id = EXCLUDED.parent_section_id;

-- Inhalte der 3 Karten (DE/EN)
INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value) VALUES
  ('produkte.hub','cards.tuerkommunikation','title','de','Türkommunikation'),
  ('produkte.hub','cards.tuerkommunikation','title','en','Door communication'),
  ('produkte.hub','cards.tuerkommunikation','intro','de','Außen- und Innenstationen, AMI-Module, vorkonfigurierte Pakete und Zubehör – direkt aus dem Online-Produktkatalog.'),
  ('produkte.hub','cards.tuerkommunikation','intro','en','Outdoor and indoor stations, AMI modules, pre-configured packs and accessories – straight from the online product catalog.'),
  ('produkte.hub','cards.tuerkommunikation','href','de','/produkte/tuerkommunikation'),
  ('produkte.hub','cards.tuerkommunikation','cta','de','Zum Katalog'),
  ('produkte.hub','cards.tuerkommunikation','cta','en','Open catalog'),

  ('produkte.hub','cards.zutrittskontrolle','title','de','Zutrittskontrolle'),
  ('produkte.hub','cards.zutrittskontrolle','title','en','Access control'),
  ('produkte.hub','cards.zutrittskontrolle','intro','de','Leser, elektronische Drückergarnituren, mobiler Zutritt und Fahrstuhlsteuerung.'),
  ('produkte.hub','cards.zutrittskontrolle','intro','en','Readers, electronic handles, mobile access and elevator control.'),
  ('produkte.hub','cards.zutrittskontrolle','href','de','/produkte/zutrittskontrolle'),
  ('produkte.hub','cards.zutrittskontrolle','cta','de','Mehr erfahren'),
  ('produkte.hub','cards.zutrittskontrolle','cta','en','Learn more'),

  ('produkte.hub','cards.eingangsloesungen','title','de','Eingangslösungen'),
  ('produkte.hub','cards.eingangsloesungen','title','en','Entry solutions'),
  ('produkte.hub','cards.eingangsloesungen','intro','de','TCS-Einbauten, Brief- und Paketkasten-Anlagen, Säulen und Stelen.'),
  ('produkte.hub','cards.eingangsloesungen','intro','en','TCS built-ins, letter and parcel box systems, pedestals and stelae.'),
  ('produkte.hub','cards.eingangsloesungen','href','de','/produkte/eingangsloesungen'),
  ('produkte.hub','cards.eingangsloesungen','cta','de','Mehr erfahren'),
  ('produkte.hub','cards.eingangsloesungen','cta','en','Learn more')
ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE SET value = EXCLUDED.value;
