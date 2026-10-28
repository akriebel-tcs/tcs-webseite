
-- ===== Etappe J.1: T01 home.start (Default-Startseite) — idempotent seed =====

-- 1) Seitenanker
INSERT INTO public.cms_pages (page_key, route_path, page_type, title_de, title_en, status, is_active)
VALUES ('home.start', '/', 'T01', 'Startseite', 'Home', 'published', true)
ON CONFLICT (page_key) DO UPDATE
  SET page_type = EXCLUDED.page_type,
      route_path = EXCLUDED.route_path,
      title_de = EXCLUDED.title_de,
      title_en = EXCLUDED.title_en,
      status = 'published',
      is_active = true,
      updated_at = now();

-- 2) Sections
INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active) VALUES
  ('home.start', 'hero',            'hero_v1',            0, true),
  ('home.start', 'stats',           'stats_v1',           1, true),
  ('home.start', 'content_blocks',  'content_blocks_v1',  2, true),
  ('home.start', 'personas_picker', 'personas_picker_v1', 3, true),
  ('home.start', 'cta',             'cta_v1',             4, true)
ON CONFLICT (page_key, section_key) DO UPDATE
  SET section_type = EXCLUDED.section_type,
      sort_order = EXCLUDED.sort_order,
      is_active = true,
      updated_at = now();

-- 3) Felder (DE/EN). Wir nutzen ON CONFLICT DO NOTHING — bereits gepflegte
--    Werte werden nicht überschrieben (Sicherheit gegenüber späterer Re-Migration).
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES
-- HERO
('home.start','hero','eyebrow','de','Willkommen bei TCS'),
('home.start','hero','eyebrow','en','Welcome to TCS'),
('home.start','hero','headline','de','Ihr Partner für Türkommunikation, Gebäudesicherheit und Managementsysteme'),
('home.start','hero','headline','en','Your partner for door communication, building security and management systems'),
('home.start','hero','intro','de','Seit über 30 Jahren entwickelt TCS Kommunikations- und Zutrittssysteme, die Architektur, Technologie und Sicherheit vereinen – für jedes Gebäude, jede Anforderung. Made in Germany.'),
('home.start','hero','intro','en','For more than 30 years, TCS has been developing communication and access systems that combine architecture, technology and security – for every building and every requirement. Made in Germany.'),
('home.start','hero','image_alt','de','TCS Eingangsbereich mit moderner Türkommunikation'),
('home.start','hero','image_alt','en','TCS entrance area with modern door communication'),
-- STATS (4 Kennzahlen × value/label)
('home.start','stats','experience_value','de','30+'),
('home.start','stats','experience_value','en','30+'),
('home.start','stats','experience_label','de','Jahre Erfahrung'),
('home.start','stats','experience_label','en','Years of experience'),
('home.start','stats','madeInGermany_value','de','100%'),
('home.start','stats','madeInGermany_value','en','100%'),
('home.start','stats','madeInGermany_label','de','Made in Germany'),
('home.start','stats','madeInGermany_label','en','Made in Germany'),
('home.start','stats','technology_value','de','IP & 2-Draht'),
('home.start','stats','technology_value','en','IP & 2-wire'),
('home.start','stats','technology_label','de','Technologie'),
('home.start','stats','technology_label','en','Technology'),
('home.start','stats','support_value','de','24/7'),
('home.start','stats','support_value','en','24/7'),
('home.start','stats','support_label','de','Technischer Support'),
('home.start','stats','support_label','en','Technical support'),
-- CONTENT BLOCKS — Header
('home.start','content_blocks','headline','de','Ganzheitliche Lösungen für den Eingangsbereich'),
('home.start','content_blocks','headline','en','Holistic solutions for the entrance area'),
('home.start','content_blocks','intro','de','Von der Türkommunikation über Zutrittskontrolle bis hin zur architektonischen Gestaltung – alles aus einer Hand.'),
('home.start','content_blocks','intro','en','From door communication and access control to architectural design – everything from a single source.'),
('home.start','content_blocks','cta_default','de','Mehr erfahren'),
('home.start','content_blocks','cta_default','en','Learn more'),
-- CONTENT BLOCKS — Items (6 × label/headline/text + consulting_cta)
('home.start','content_blocks','communication_label','de','Türkommunikation'),
('home.start','content_blocks','communication_label','en','Door Communication'),
('home.start','content_blocks','communication_headline','de','Smarte Kommunikation für jedes Gebäude'),
('home.start','content_blocks','communication_headline','en','Smart communication for every building'),
('home.start','content_blocks','communication_text','de','Von Einfamilienhäusern bis zu großen Wohnquartieren bietet TCS maßgeschneiderte Audio- und Video-Türsprechanlagen wie die Serien Senso Pro und TASTA PRO. Mit dem zukunftssicheren IP-System snipdoo® vereinen wir die Einfachheit klassischer BUS-Systeme mit grenzenloser Netzwerk-Flexibilität.'),
('home.start','content_blocks','communication_text','en','From single-family homes to large residential quarters, TCS offers tailor-made audio and video door intercom systems such as the Senso Pro and TASTA PRO series. With the future-proof IP system snipdoo®, we combine the simplicity of classic BUS systems with unlimited network flexibility.'),
('home.start','content_blocks','access_label','de','Zutrittskontrolle'),
('home.start','content_blocks','access_label','en','Access Control'),
('home.start','content_blocks','access_headline','de','Zutritt und Verwaltung neu gedacht'),
('home.start','content_blocks','access_headline','en','Access and management, rethought'),
('home.start','content_blocks','access_text','de','Das webbasierte BCM-System ist Ihre zentrale Lösung für modernes Gebäudemanagement – sicher, skalierbar und ganzheitlich. Verwalten Sie Zutrittsrechte für Türen, Schranken und Parkräume flexibel per Smartphone-App, biometrischem Scanner oder RFID.'),
('home.start','content_blocks','access_text','en','The web-based BCM system is your central solution for modern building management – secure, scalable and holistic. Manage access rights for doors, barriers and parking areas flexibly via smartphone app, biometric scanner or RFID.'),
('home.start','content_blocks','entry_label','de','Entry-System'),
('home.start','content_blocks','entry_label','en','Entry System'),
('home.start','content_blocks','entry_headline','de','Echte Individualität am Eingang'),
('home.start','content_blocks','entry_headline','en','True individuality at the entrance'),
('home.start','content_blocks','entry_text','de','Das Design- und Montagesystem Entry beendet die unruhige Aneinanderreihung verschiedener Fabrikate und bündelt Türkommunikation, Zutrittskontrolle, Briefkästen und Brandschutz in einem homogenen Design – ganz ohne sichtbare Schrauben.'),
('home.start','content_blocks','entry_text','en','The Entry design and mounting system ends the restless succession of different brands and bundles door communication, access control, mailboxes and fire protection in a homogeneous design – completely without visible screws.'),
('home.start','content_blocks','signage_label','de','Signage'),
('home.start','content_blocks','signage_label','en','Signage'),
('home.start','content_blocks','signage_headline','de','Klare Orientierung mit ästhetischem Anspruch'),
('home.start','content_blocks','signage_headline','en','Clear orientation with aesthetic appeal'),
('home.start','content_blocks','signage_text','de','Schaffen Sie repräsentative Eingangsbereiche und eine intuitive Wegeführung mit TCS-Signage. Entdecken Sie unsere smarten, ultraflachen Hausnummern mit revolutionärem Tag-Nacht-Kontrast und langlebiger LED-Hinterleuchtung.'),
('home.start','content_blocks','signage_text','en','Create representative entrance areas and intuitive wayfinding with TCS signage. Discover our smart, ultra-flat house numbers with revolutionary day-night contrast and durable LED backlighting.'),
('home.start','content_blocks','solutions_label','de','Objektlösungen'),
('home.start','content_blocks','solutions_label','en','Project Solutions'),
('home.start','content_blocks','solutions_headline','de','Maßgeschneiderte Ausstattung für besondere Anforderungen'),
('home.start','content_blocks','solutions_headline','en','Tailored equipment for special requirements'),
('home.start','content_blocks','solutions_text','de','Jedes Gebäude hat eigene Regeln. Wir bieten barrierefreie Lösungen nach DIN 18040-1 für Pflegeeinrichtungen, Notfall-Rufsysteme für Schulen sowie effiziente Zutrittskontrollen für Kliniken und Behörden.'),
('home.start','content_blocks','solutions_text','en','Every building has its own rules. We offer barrier-free solutions in line with DIN 18040-1 for care facilities, emergency call systems for schools, as well as efficient access control for clinics and public authorities.'),
('home.start','content_blocks','consulting_label','de','Projektberatung'),
('home.start','content_blocks','consulting_label','en','Project Consulting'),
('home.start','content_blocks','consulting_headline','de','Von der ersten Idee bis zur finalen Umsetzung'),
('home.start','content_blocks','consulting_headline','en','From the first idea to the final implementation'),
('home.start','content_blocks','consulting_text','de','Unsere Experten begleiten Architekten, Planungsbüros und Bauträger gewerkeübergreifend durch den gesamten Prozess. Wir unterstützen Sie bei der System- und Materialauswahl und sorgen für eine reibungslose Umsetzung.'),
('home.start','content_blocks','consulting_text','en','Our experts support architects, planning offices and developers across all trades throughout the entire process. We assist you with system and material selection and ensure smooth implementation.'),
('home.start','content_blocks','consulting_cta','de','Projektberatung vereinbaren'),
('home.start','content_blocks','consulting_cta','en','Arrange project consulting'),
-- PERSONAS PICKER — Header + 6 Personas × title/desc
('home.start','personas_picker','headline','de','Passende Lösungen für Ihre Rolle'),
('home.start','personas_picker','headline','en','Tailored solutions for your role'),
('home.start','personas_picker','intro','de','Ob Planer, Errichter oder Eigentümer – wir sprechen Ihre Sprache und liefern genau die Informationen, die Sie für Ihre Entscheidung brauchen.'),
('home.start','personas_picker','intro','en','Whether planner, installer or owner – we speak your language and provide exactly the information you need to make your decision.'),
('home.start','personas_picker','cta_default','de','Mehr erfahren'),
('home.start','personas_picker','cta_default','en','Learn more'),
('home.start','personas_picker','bauherren_title','de','Bauherren & Eigentümer'),
('home.start','personas_picker','bauherren_title','en','Builders & Owners'),
('home.start','personas_picker','bauherren_desc','de','Smart Home, Sicherheit & Design – finden Sie die perfekte Lösung für Ihr Zuhause.'),
('home.start','personas_picker','bauherren_desc','en','Smart home, security and design – find the perfect solution for your home.'),
('home.start','personas_picker','architekten_title','de','Architekten & Gestalter'),
('home.start','personas_picker','architekten_title','en','Architects & Designers'),
('home.start','personas_picker','architekten_desc','de','Eingangsarchitektur in Perfektion – mit Materialvielfalt und barrierefreien Konzepten.'),
('home.start','personas_picker','architekten_desc','en','Entrance architecture at its best – with a wide range of materials and barrier-free concepts.'),
('home.start','personas_picker','wohnungswirtschaft_title','de','Wohnungswirtschaft'),
('home.start','personas_picker','wohnungswirtschaft_title','en','Housing Industry'),
('home.start','personas_picker','wohnungswirtschaft_desc','de','Wirtschaftliche, skalierbare Lösungen für Großanlagen mit digitaler Verwaltung.'),
('home.start','personas_picker','wohnungswirtschaft_desc','en','Cost-efficient, scalable solutions for large properties with digital management.'),
('home.start','personas_picker','fachplaner_title','de','Fachplaner & Integratoren'),
('home.start','personas_picker','fachplaner_title','en','Specialist Planners & Integrators'),
('home.start','personas_picker','fachplaner_desc','de','Technische Tiefe: Systemgrenzen, Schnittstellendokumentation und Ausschreibungstexte.'),
('home.start','personas_picker','fachplaner_desc','en','Technical depth: system boundaries, interface documentation and tender texts.'),
('home.start','personas_picker','handwerk_title','de','Elektro-Handwerk'),
('home.start','personas_picker','handwerk_title','en','Electrical Trade'),
('home.start','personas_picker','handwerk_desc','de','Schnelle Installation dank TCS:PACKS, Konfiguratoren und Schaltplänen.'),
('home.start','personas_picker','handwerk_desc','en','Fast installation thanks to TCS:PACKS, configurators and wiring diagrams.'),
('home.start','personas_picker','fachhandel_title','de','Fachhandel'),
('home.start','personas_picker','fachhandel_title','en','Specialist Retail'),
('home.start','personas_picker','fachhandel_desc','de','Artikelstammdaten, effizientes Bestellwesen und direkter Zugang zum Ersatzteil-Shop.'),
('home.start','personas_picker','fachhandel_desc','en','Master product data, efficient ordering and direct access to the spare parts shop.'),
-- CTA
('home.start','cta','headline','de','Lassen Sie uns Ihr Projekt gemeinsam planen'),
('home.start','cta','headline','en','Let''s plan your project together'),
('home.start','cta','intro','de','Unsere Experten beraten Sie persönlich – von der ersten Idee bis zur fertigen Installation.'),
('home.start','cta','intro','en','Our experts advise you personally – from the initial idea to the finished installation.'),
('home.start','cta','primary','de','Beratungstermin vereinbaren'),
('home.start','cta','primary','en','Schedule a consultation'),
('home.start','cta','secondary','de','Konfigurator starten'),
('home.start','cta','secondary','en','Start configurator')
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

-- 4) Whitelist: alles was wir gerade angelegt haben darf bearbeitet werden.
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT page_key, section_key, field_key, locale, true
  FROM public.cms_section_fields
 WHERE page_key = 'home.start'
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

-- 5) Navigationsknoten home.start auf die Seite und Root-Route binden.
UPDATE public.cms_navigation_nodes
   SET page_key = 'home.start',
       route_path = '/',
       node_type = 'page',
       is_active = true,
       show_in_public_nav = true,
       updated_at = now()
 WHERE node_key = 'home.start';
