-- =====================================================================
-- Etappe B / Schritt 1: Service-Lücken + Türkommunikation-Filterkacheln
-- Alles draft / is_active=false. Public unverändert.
-- =====================================================================

-- ---------- A) Zwei fehlende Service-Seiten ----------
INSERT INTO public.cms_pages (page_key, route_path, page_type, title_de, title_en, status, is_active)
VALUES
  ('service.konfiguratoren',        '/service/konfiguratoren',        'T05', 'Konfiguratoren',         'Configurators',        'draft', false),
  ('service.datenblaetter-software','/service/datenblaetter-software','T05', 'Datenblätter & Software','Datasheets & Software','draft', false)
ON CONFLICT (page_key) DO NOTHING;

-- ---------- B) Zwei fehlende Navigations-Knoten unter Service ----------
WITH service_root AS (
  SELECT id FROM public.cms_navigation_nodes
   WHERE nav_area='main' AND node_key='services' LIMIT 1
)
INSERT INTO public.cms_navigation_nodes
  (nav_area, node_key, parent_id, page_key, route_path, label, label_de, label_en,
   description_de, description_en, node_type, sort_order, is_active, show_in_public_nav)
SELECT 'main', v.node_key, sr.id, v.page_key, v.route_path, v.label_de, v.label_de, v.label_en,
       v.desc_de, v.desc_en, 'page', v.sort_order, false, false
FROM service_root sr,
(VALUES
  ('sv.konfiguratoren',        'service.konfiguratoren',         '/service/konfiguratoren',
   'Konfiguratoren',           'Configurators',
   'TCS-Anlagenkonfigurator und weitere Konfigurations-Tools','TCS system configurator and other configuration tools', 12),
  ('sv.datenblaetter-software','service.datenblaetter-software', '/service/datenblaetter-software',
   'Datenblätter & Software',  'Datasheets & Software',
   'Datenblätter, Ausschreibungstexte, Firmware und Software','Datasheets, tender texts, firmware and software', 22)
) AS v(node_key, page_key, route_path, label_de, label_en, desc_de, desc_en, sort_order)
ON CONFLICT (nav_area, node_key) DO NOTHING;

-- ---------- C) Türkommunikation: Filter-Grid Eltern-Sektion ----------
INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active)
VALUES ('produkte.tuerkommunikation', 'filter-grid', 'catalog_filter_grid_v1', 10, false)
ON CONFLICT (page_key, section_key) DO NOTHING;

-- Optional Headline/Intro-Felder der Eltern-Sektion (DE/EN), nur wenn noch leer
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
VALUES
  ('produkte.tuerkommunikation','filter-grid','headline','de','Wähle eine Produktkategorie'),
  ('produkte.tuerkommunikation','filter-grid','headline','en','Choose a product category'),
  ('produkte.tuerkommunikation','filter-grid','intro','de','Alle Kategorien stammen direkt aus dem Online-Produktkatalog.'),
  ('produkte.tuerkommunikation','filter-grid','intro','en','All categories come directly from the online product catalog.')
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

-- ---------- D) 8 Filter-Kategorien als Unter-Sektionen (card_v1) ----------
WITH parent AS (
  SELECT id FROM public.cms_sections
   WHERE page_key='produkte.tuerkommunikation' AND section_key='filter-grid' LIMIT 1
)
INSERT INTO public.cms_sections (page_key, section_key, section_type, parent_section_id, sort_order, is_active)
SELECT 'produkte.tuerkommunikation', v.section_key, 'card_v1', p.id, v.sort_order, false
FROM parent p,
(VALUES
  ('filter-grid.vorkonfigurierte-pakete',     10),
  ('filter-grid.aussenstationen',             20),
  ('filter-grid.ami-module',                  30),
  ('filter-grid.innenstationen',              40),
  ('filter-grid.zutrittskontrolle-bcm',       50),
  ('filter-grid.mobile-tuerkommunikation',    60),
  ('filter-grid.netzgeraete-versorgung',      70),
  ('filter-grid.zubehoer-montage',            80)
) AS v(section_key, sort_order)
ON CONFLICT (page_key, section_key) DO NOTHING;

-- ---------- E) Felder je Kategorie ----------
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
VALUES
  -- Vorkonfigurierte Pakete
  ('produkte.tuerkommunikation','filter-grid.vorkonfigurierte-pakete','title','de','Vorkonfigurierte Pakete'),
  ('produkte.tuerkommunikation','filter-grid.vorkonfigurierte-pakete','title','en','Pre-configured packs'),
  ('produkte.tuerkommunikation','filter-grid.vorkonfigurierte-pakete','slug','de','vorkonfigurierte-pakete'),
  ('produkte.tuerkommunikation','filter-grid.vorkonfigurierte-pakete','filter_key','de','tcs-packs'),
  ('produkte.tuerkommunikation','filter-grid.vorkonfigurierte-pakete','count_hint','de','409'),
  -- Außenstationen
  ('produkte.tuerkommunikation','filter-grid.aussenstationen','title','de','Außenstationen'),
  ('produkte.tuerkommunikation','filter-grid.aussenstationen','title','en','Outdoor stations'),
  ('produkte.tuerkommunikation','filter-grid.aussenstationen','slug','de','aussenstationen'),
  ('produkte.tuerkommunikation','filter-grid.aussenstationen','filter_key','de','aussenstationen'),
  ('produkte.tuerkommunikation','filter-grid.aussenstationen','count_hint','de','701'),
  -- AMI Module
  ('produkte.tuerkommunikation','filter-grid.ami-module','title','de','AMI Module'),
  ('produkte.tuerkommunikation','filter-grid.ami-module','title','en','AMI modules'),
  ('produkte.tuerkommunikation','filter-grid.ami-module','slug','de','ami-module'),
  ('produkte.tuerkommunikation','filter-grid.ami-module','filter_key','de','ami-module'),
  ('produkte.tuerkommunikation','filter-grid.ami-module','count_hint','de','49'),
  -- Innenstationen
  ('produkte.tuerkommunikation','filter-grid.innenstationen','title','de','Innenstationen'),
  ('produkte.tuerkommunikation','filter-grid.innenstationen','title','en','Indoor stations'),
  ('produkte.tuerkommunikation','filter-grid.innenstationen','slug','de','innenstationen'),
  ('produkte.tuerkommunikation','filter-grid.innenstationen','filter_key','de','innenstationen'),
  ('produkte.tuerkommunikation','filter-grid.innenstationen','count_hint','de','76'),
  -- Zutrittskontrolle / BCM
  ('produkte.tuerkommunikation','filter-grid.zutrittskontrolle-bcm','title','de','Zutrittskontrolle / BCM'),
  ('produkte.tuerkommunikation','filter-grid.zutrittskontrolle-bcm','title','en','Access control / BCM'),
  ('produkte.tuerkommunikation','filter-grid.zutrittskontrolle-bcm','slug','de','zutrittskontrolle-bcm'),
  ('produkte.tuerkommunikation','filter-grid.zutrittskontrolle-bcm','filter_key','de','zutrittskontrolle-bcm'),
  ('produkte.tuerkommunikation','filter-grid.zutrittskontrolle-bcm','count_hint','de','26'),
  -- Mobile Türkommunikation
  ('produkte.tuerkommunikation','filter-grid.mobile-tuerkommunikation','title','de','Mobile Türkommunikation'),
  ('produkte.tuerkommunikation','filter-grid.mobile-tuerkommunikation','title','en','Mobile door communication'),
  ('produkte.tuerkommunikation','filter-grid.mobile-tuerkommunikation','slug','de','mobile-tuerkommunikation'),
  ('produkte.tuerkommunikation','filter-grid.mobile-tuerkommunikation','filter_key','de','mobile-tuerkommunikation'),
  ('produkte.tuerkommunikation','filter-grid.mobile-tuerkommunikation','count_hint','de','29'),
  -- Netzgeräte & Versorgung
  ('produkte.tuerkommunikation','filter-grid.netzgeraete-versorgung','title','de','Netzgeräte & Versorgung'),
  ('produkte.tuerkommunikation','filter-grid.netzgeraete-versorgung','title','en','Power supplies & feeding'),
  ('produkte.tuerkommunikation','filter-grid.netzgeraete-versorgung','slug','de','netzgeraete-versorgung'),
  ('produkte.tuerkommunikation','filter-grid.netzgeraete-versorgung','filter_key','de','netzgeraete-versorgung'),
  ('produkte.tuerkommunikation','filter-grid.netzgeraete-versorgung','count_hint','de','14'),
  -- Zubehör & Montage
  ('produkte.tuerkommunikation','filter-grid.zubehoer-montage','title','de','Zubehör & Montage'),
  ('produkte.tuerkommunikation','filter-grid.zubehoer-montage','title','en','Accessories & mounting'),
  ('produkte.tuerkommunikation','filter-grid.zubehoer-montage','slug','de','zubehoer-montage'),
  ('produkte.tuerkommunikation','filter-grid.zubehoer-montage','filter_key','de','zubehoer-montage'),
  ('produkte.tuerkommunikation','filter-grid.zubehoer-montage','count_hint','de','118')
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
