
-- 1) Solutions-Sections für alle 6 Personas anlegen (idempotent)
INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active)
VALUES
  ('personas.architekt',          'solutions', 'content_v1', 40, true),
  ('personas.bauherr',            'solutions', 'content_v1', 40, true),
  ('personas.fachhandel',         'solutions', 'content_v1', 40, true),
  ('personas.fachplaner',         'solutions', 'content_v1',  5, true),
  ('personas.handwerk',           'solutions', 'content_v1', 40, true),
  ('personas.wohnungswirtschaft', 'solutions', 'content_v1',  5, true)
ON CONFLICT DO NOTHING;

-- Falls die Section schon existiert (z. B. inaktiv archiviert), aktivieren
-- und auf content_v1 normalisieren.
UPDATE public.cms_sections
   SET section_type = 'content_v1', is_active = true
 WHERE section_key = 'solutions'
   AND page_key IN ('personas.architekt','personas.bauherr','personas.fachhandel',
                    'personas.fachplaner','personas.handwerk','personas.wohnungswirtschaft');

-- 2) Solutions-Inhalte (headline + intro) in DE/EN aus Marketing-Texten
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES
  ('personas.architekt',         'solutions','headline','de','Lösungen für anspruchsvolle Gestaltung'),
  ('personas.architekt',         'solutions','intro',   'de','Produkte, die Ihre architektonische Handschrift unterstützen – vom Einfamilienhaus bis zum Großprojekt.'),
  ('personas.architekt',         'solutions','headline','en','Solutions for sophisticated design'),
  ('personas.architekt',         'solutions','intro',   'en','Products that support your architectural signature – from single-family homes to large-scale projects.'),
  ('personas.bauherr',           'solutions','headline','de','Unsere Lösungen für Ihr Eigenheim'),
  ('personas.bauherr',           'solutions','intro',   'de','Ob Neubau oder Modernisierung – TCS bietet Ihnen durchdachte Systeme, die sich nahtlos in Ihr Zuhause integrieren.'),
  ('personas.bauherr',           'solutions','headline','en','Our solutions for your home'),
  ('personas.bauherr',           'solutions','intro',   'en','Whether new build or modernization – TCS offers you well-designed systems that integrate seamlessly into your home.'),
  ('personas.fachhandel',        'solutions','headline','de','Produktbereiche für Ihren Vertrieb'),
  ('personas.fachhandel',        'solutions','intro',   'de','Breites Sortiment mit klarer Segmentierung für jeden Kundenbedarf.'),
  ('personas.fachhandel',        'solutions','headline','en','Product areas for your sales'),
  ('personas.fachhandel',        'solutions','intro',   'en','Broad product range with clear segmentation for every customer need.'),
  ('personas.fachplaner',        'solutions','headline','de','Systemlösungen für Ihre Projekte'),
  ('personas.fachplaner',        'solutions','intro',   'de','Modulare Systeme, die sich nahtlos in Ihr Gesamtkonzept integrieren.'),
  ('personas.fachplaner',        'solutions','headline','en','System solutions for your projects'),
  ('personas.fachplaner',        'solutions','intro',   'en','Modular systems that integrate seamlessly into your overall concept.'),
  ('personas.handwerk',          'solutions','headline','de','Produkte für die Praxis'),
  ('personas.handwerk',          'solutions','intro',   'de','Zuverlässige Technik, die schnell installiert ist und langfristig funktioniert.'),
  ('personas.handwerk',          'solutions','headline','en','Products for everyday practice'),
  ('personas.handwerk',          'solutions','intro',   'en','Reliable technology that installs quickly and works for the long term.'),
  ('personas.wohnungswirtschaft','solutions','headline','de','Lösungen für Ihre Objekte'),
  ('personas.wohnungswirtschaft','solutions','intro',   'de','Durchdachte Systeme für Neubau, Modernisierung und den laufenden Betrieb Ihrer Liegenschaften.'),
  ('personas.wohnungswirtschaft','solutions','headline','en','Solutions for your properties'),
  ('personas.wohnungswirtschaft','solutions','intro',   'en','Well-thought-out systems for new construction, modernization and ongoing operation of your properties.')
ON CONFLICT DO NOTHING;

-- 3) Admin-Whitelist für die neuen Solutions-Felder
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT pk, 'solutions', fk, lo, true
FROM unnest(ARRAY[
  'personas.architekt','personas.bauherr','personas.fachhandel',
  'personas.fachplaner','personas.handwerk','personas.wohnungswirtschaft'
]) pk
CROSS JOIN unnest(ARRAY['headline','intro']) fk
CROSS JOIN unnest(ARRAY['de','en']) lo
ON CONFLICT (page_key, section_key, field_key, locale)
DO UPDATE SET is_enabled = true;

-- 4) Leere WoWi-Karten-Container in Textblöcke umwandeln
UPDATE public.cms_sections
   SET section_type = 'content_v1'
 WHERE page_key = 'personas.wohnungswirtschaft'
   AND section_key IN ('detail_mietershop','detail_serviceGarantie');
