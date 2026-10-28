UPDATE public.cms_navigation_nodes SET label = 'Bauherren', label_de = 'Bauherren', label_en = 'Builders', updated_at = now()
  WHERE nav_area = 'persona' AND node_key = 'bauherren';

UPDATE public.cms_navigation_nodes SET label = 'Architekten', label_de = 'Architekten', label_en = 'Architects', updated_at = now()
  WHERE nav_area = 'persona' AND node_key = 'architekten';

UPDATE public.cms_navigation_nodes SET label = 'Wohnungswirtschaft', label_de = 'Wohnungswirtschaft', label_en = 'Housing Industry', updated_at = now()
  WHERE nav_area = 'persona' AND node_key = 'wohnungswirtschaft';

UPDATE public.cms_navigation_nodes SET label = 'Planer', label_de = 'Planer', label_en = 'Planners', updated_at = now()
  WHERE nav_area = 'persona' AND node_key = 'fachplaner';

UPDATE public.cms_navigation_nodes SET label = 'Handwerk', label_de = 'Handwerk', label_en = 'Trade', updated_at = now()
  WHERE nav_area = 'persona' AND node_key = 'handwerk';

UPDATE public.cms_navigation_nodes SET label = 'Fachhandel', label_de = 'Fachhandel', label_en = 'Retail', updated_at = now()
  WHERE nav_area = 'persona' AND node_key = 'fachhandel';