-- F1-Pilot: gebaeudekommunikation.tuersprechanlagen in die DB
-- Idempotent: ON CONFLICT überall.

-- 1) Page anlegen (draft / nicht aktiv)
INSERT INTO public.cms_pages (page_key, route_path, page_type, title_de, title_en, status, is_active)
VALUES (
  'gebaeudekommunikation.tuersprechanlagen',
  '/gebaeudekommunikation/tuersprechanlagen',
  'T05',
  'Türsprechanlagen',
  'Door intercom systems',
  'draft',
  false
)
ON CONFLICT (page_key) DO NOTHING;

-- 2) Sections (top-level, sort_order in 10er-Schritten)
INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active) VALUES
  ('gebaeudekommunikation.tuersprechanlagen', 'hero',           'hero',            10, true),
  ('gebaeudekommunikation.tuersprechanlagen', 'ueberblick',     'intro',           20, true),
  ('gebaeudekommunikation.tuersprechanlagen', 'aussenstationen','product-scroller',30, true),
  ('gebaeudekommunikation.tuersprechanlagen', 'innenstationen', 'product-scroller',40, true),
  ('gebaeudekommunikation.tuersprechanlagen', 'vorteile',       'feature-grid',    50, true),
  ('gebaeudekommunikation.tuersprechanlagen', 'snipdoo',        'cta',             60, true)
ON CONFLICT (page_key, section_key) DO NOTHING;

-- 3) Felder (DE + EN). Idempotent: ON CONFLICT DO NOTHING — bestehende Werte
--    werden nicht überschrieben (Admin-Edits bleiben erhalten).
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES
  -- HERO
  ('gebaeudekommunikation.tuersprechanlagen','hero','label','de','Türsprechanlagen'),
  ('gebaeudekommunikation.tuersprechanlagen','hero','label','en','Door intercom systems'),
  ('gebaeudekommunikation.tuersprechanlagen','hero','headline','de','Audio- und Video-Kommunikation an der Tür'),
  ('gebaeudekommunikation.tuersprechanlagen','hero','headline','en','Audio and video communication at the door'),
  ('gebaeudekommunikation.tuersprechanlagen','hero','intro','de','Vom kompakten Einfamilienhaus bis zum großen Wohnquartier: TCS bietet aufeinander abgestimmte Außen- und Innenstationen für jede Anwendung – von der klassischen Audio-Sprechanlage bis zur vernetzten IP-Video-Lösung.'),
  ('gebaeudekommunikation.tuersprechanlagen','hero','intro','en','From a compact single-family home to large residential quarters: TCS offers coordinated outdoor and indoor stations for every application – from the classic audio intercom to the networked IP video solution.'),

  -- ÜBERBLICK
  ('gebaeudekommunikation.tuersprechanlagen','ueberblick','label','de','Überblick'),
  ('gebaeudekommunikation.tuersprechanlagen','ueberblick','label','en','Overview'),
  ('gebaeudekommunikation.tuersprechanlagen','ueberblick','title','de','Über 1.200 Produkte für die Gebäudekommunikation'),
  ('gebaeudekommunikation.tuersprechanlagen','ueberblick','title','en','More than 1,200 products for building communication'),
  ('gebaeudekommunikation.tuersprechanlagen','ueberblick','p1','de','TCS Türsprechanlagen verbinden Außen- und Innenwelt einer Immobilie: Sie sehen, wer vor der Tür steht, sprechen mit Besuchern und öffnen die Tür – komfortabel, sicher und in jeder gewünschten Ausbaustufe. Modulare Außenstationen, Innenstationen vom klassischen Hörer bis zum 10-Zoll-Touch-Dashboard und das zukunftssichere snipdoo® IP-System bilden ein durchgängiges Portfolio.'),
  ('gebaeudekommunikation.tuersprechanlagen','ueberblick','p1','en','TCS door intercom systems connect the outside and inside of a property: you see who is at the door, speak with visitors and open the door – conveniently, safely and in any desired configuration level. Modular outdoor stations, indoor stations from the classic handset to the 10-inch touch dashboard and the future-proof snipdoo® IP system form a continuous portfolio.'),
  ('gebaeudekommunikation.tuersprechanlagen','ueberblick','p2','de','Alle Komponenten werden von TCS in Eigenregie entwickelt und produziert – für ein zuverlässiges Zusammenspiel und volle Systemkontrolle über den gesamten Lebenszyklus der Immobilie.'),
  ('gebaeudekommunikation.tuersprechanlagen','ueberblick','p2','en','All components are developed and produced by TCS in-house – for reliable interaction and full system control over the entire life cycle of the property.'),

  -- AUSSENSTATIONEN
  ('gebaeudekommunikation.tuersprechanlagen','aussenstationen','label','de','Außenstationen'),
  ('gebaeudekommunikation.tuersprechanlagen','aussenstationen','label','en','Outdoor stations'),
  ('gebaeudekommunikation.tuersprechanlagen','aussenstationen','title','de','Der erste Eindruck am Gebäude'),
  ('gebaeudekommunikation.tuersprechanlagen','aussenstationen','title','en','The first impression at the building'),
  ('gebaeudekommunikation.tuersprechanlagen','aussenstationen','description','de','Die Klingel ertönt – die Außenstation ist der erste Kontakt am Gebäude. Video, Audio, Zutrittskontrolle und barrierefreie Bedienung in einem Gerät.'),
  ('gebaeudekommunikation.tuersprechanlagen','aussenstationen','description','en','The bell rings – the outdoor station is the first point of contact at the building. Video, audio, access control and accessible operation in a single device.'),

  -- INNENSTATIONEN
  ('gebaeudekommunikation.tuersprechanlagen','innenstationen','label','de','Innenstationen'),
  ('gebaeudekommunikation.tuersprechanlagen','innenstationen','label','en','Indoor stations'),
  ('gebaeudekommunikation.tuersprechanlagen','innenstationen','title','de','Im Gebäude: kommunizieren, öffnen, steuern'),
  ('gebaeudekommunikation.tuersprechanlagen','innenstationen','title','en','Inside the building: communicate, open, control'),
  ('gebaeudekommunikation.tuersprechanlagen','innenstationen','description','de','Vom kompakten Freisprech-Hörer bis zum Smart-Home-Dashboard – die passende Innenstation für jede Wohn- und Bedienform.'),
  ('gebaeudekommunikation.tuersprechanlagen','innenstationen','description','en','From the compact hands-free handset to the smart home dashboard – the right indoor station for every living and operating style.'),

  -- VORTEILE
  ('gebaeudekommunikation.tuersprechanlagen','vorteile','label','de','Vorteile'),
  ('gebaeudekommunikation.tuersprechanlagen','vorteile','label','en','Advantages'),
  ('gebaeudekommunikation.tuersprechanlagen','vorteile','title','de','Warum TCS Türsprechanlagen?'),
  ('gebaeudekommunikation.tuersprechanlagen','vorteile','title','en','Why TCS door intercom systems?'),

  -- SNIPDOO CTA
  ('gebaeudekommunikation.tuersprechanlagen','snipdoo','label','de','Systemtechnik'),
  ('gebaeudekommunikation.tuersprechanlagen','snipdoo','label','en','System technology'),
  ('gebaeudekommunikation.tuersprechanlagen','snipdoo','title','de','Türkommunikation in IP-Netzwerken – einfach und zukunftssicher'),
  ('gebaeudekommunikation.tuersprechanlagen','snipdoo','title','en','Door communication in IP networks – simple and future-proof'),
  ('gebaeudekommunikation.tuersprechanlagen','snipdoo','text','de','Mit snipdoo® bietet TCS eine leistungsstarke, flexible und sichere Tür- und Gebäudekommunikationstechnik für moderne Gebäude. Das System vereint die unkomplizierte Handhabung klassischer BUS-Systeme mit der grenzenlosen Flexibilität moderner IP-Technologie.'),
  ('gebaeudekommunikation.tuersprechanlagen','snipdoo','text','en','With snipdoo®, TCS offers powerful, flexible and secure door and building communication technology for modern buildings. The system combines the straightforward handling of classic BUS systems with the limitless flexibility of modern IP technology.'),
  ('gebaeudekommunikation.tuersprechanlagen','snipdoo','cta','de','Mehr über snipdoo® IP erfahren'),
  ('gebaeudekommunikation.tuersprechanlagen','snipdoo','cta','en','Learn more about snipdoo® IP')
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

-- 4) Whitelist: alle migrierten Felder im Admin editierbar
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT page_key, section_key, field_key, locale, true
  FROM public.cms_section_fields
 WHERE page_key = 'gebaeudekommunikation.tuersprechanlagen'
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

-- 5) section_no neu durchnummerieren
SELECT public.cms_renumber_sections('gebaeudekommunikation.tuersprechanlagen');
