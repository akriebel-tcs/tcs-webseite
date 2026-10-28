UPDATE public.cms_navigation_nodes
SET
  label = 'Bauherren',
  label_de = 'Bauherren',
  label_en = 'Builders',
  updated_at = now()
WHERE nav_area = 'persona' AND node_key = 'persona.bauherren';

UPDATE public.cms_navigation_nodes
SET
  label = 'Architekten',
  label_de = 'Architekten',
  label_en = 'Architects',
  updated_at = now()
WHERE nav_area = 'persona' AND node_key = 'persona.architekten';

UPDATE public.cms_navigation_nodes
SET
  label = 'Wohnungswirtschaft',
  label_de = 'Wohnungswirtschaft',
  label_en = 'Housing',
  updated_at = now()
WHERE nav_area = 'persona' AND node_key = 'persona.wohnungswirtschaft';

UPDATE public.cms_navigation_nodes
SET
  label = 'Fachplaner',
  label_de = 'Fachplaner',
  label_en = 'Planners',
  updated_at = now()
WHERE nav_area = 'persona' AND node_key = 'persona.fachplaner';

UPDATE public.cms_navigation_nodes
SET
  label = 'Handwerk',
  label_de = 'Handwerk',
  label_en = 'Trade',
  updated_at = now()
WHERE nav_area = 'persona' AND node_key = 'persona.handwerk';

UPDATE public.cms_navigation_nodes
SET
  label = 'Fachhandel',
  label_de = 'Fachhandel',
  label_en = 'Retail',
  updated_at = now()
WHERE nav_area = 'persona' AND node_key = 'persona.fachhandel';