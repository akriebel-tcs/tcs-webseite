-- Content V1 Restsynchronisation (Text-only, idempotent)

-- 1) Digitale Namensanzeige — products.intro (DE): vollständiger Snapshot-Wert mit Zeilenumbruch
UPDATE public.cms_section_fields
   SET value = E'Von der kompakten Au\u00dfenstation bis zur browserbasierten Verwaltungssoftware \u2013\u00a0\nalles f\u00fcr die digitale Namensanzeige.',
       updated_at = now()
 WHERE page_key   = 'gebaeudemanagement.digitale-namensanzeige'
   AND section_key= 'products'
   AND field_key  = 'intro'
   AND locale     = 'de'
   AND value IS DISTINCT FROM E'Von der kompakten Au\u00dfenstation bis zur browserbasierten Verwaltungssoftware \u2013\u00a0\nalles f\u00fcr die digitale Namensanzeige.';

-- 2) Mobiler Zutritt — hero.headline (DE): Zeilenumbruch + Restsatz
UPDATE public.cms_section_fields
   SET value = E'Mobiler Zutritt per App \noder Anruf',
       updated_at = now()
 WHERE page_key   = 'zutrittskontrolle.mobiler-zutritt'
   AND section_key= 'hero'
   AND field_key  = 'headline'
   AND locale     = 'de'
   AND value IS DISTINCT FROM E'Mobiler Zutritt per App \noder Anruf';

-- 3) Persona-Navigation: deutsche Lang-Labels gemäß Content V1
UPDATE public.cms_navigation_nodes SET label_de = 'Bauherren & Eigentümer',          updated_at = now() WHERE nav_area='persona' AND node_key='persona.bauherren'          AND label_de IS DISTINCT FROM 'Bauherren & Eigentümer';
UPDATE public.cms_navigation_nodes SET label_de = 'Architekten & Gestalter',         updated_at = now() WHERE nav_area='persona' AND node_key='persona.architekten'        AND label_de IS DISTINCT FROM 'Architekten & Gestalter';
UPDATE public.cms_navigation_nodes SET label_de = 'Wohnungswirtschaft & Bauträger',  updated_at = now() WHERE nav_area='persona' AND node_key='persona.wohnungswirtschaft' AND label_de IS DISTINCT FROM 'Wohnungswirtschaft & Bauträger';
UPDATE public.cms_navigation_nodes SET label_de = 'Fachplaner & Integratoren',       updated_at = now() WHERE nav_area='persona' AND node_key='persona.fachplaner'         AND label_de IS DISTINCT FROM 'Fachplaner & Integratoren';
UPDATE public.cms_navigation_nodes SET label_de = 'Elektro-Handwerk',                updated_at = now() WHERE nav_area='persona' AND node_key='persona.handwerk'           AND label_de IS DISTINCT FROM 'Elektro-Handwerk';