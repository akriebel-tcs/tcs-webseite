UPDATE public.cms_navigation_nodes SET label = 'Bauherren & Eigentümer', label_de = 'Bauherren & Eigentümer', label_en = 'Builders & Owners', updated_at = now()
  WHERE nav_area = 'persona' AND node_key = 'bauherren';

UPDATE public.cms_navigation_nodes SET label = 'Architekten & Gestalter', label_de = 'Architekten & Gestalter', label_en = 'Architects & Designers', updated_at = now()
  WHERE nav_area = 'persona' AND node_key = 'architekten';

UPDATE public.cms_navigation_nodes SET label = 'Wohnungswirtschaft & Bauträger', label_de = 'Wohnungswirtschaft & Bauträger', label_en = 'Housing Industry & Developers', updated_at = now()
  WHERE nav_area = 'persona' AND node_key = 'wohnungswirtschaft';

UPDATE public.cms_navigation_nodes SET label = 'Fachplaner & Integratoren', label_de = 'Fachplaner & Integratoren', label_en = 'Specialist Planners & Integrators', updated_at = now()
  WHERE nav_area = 'persona' AND node_key = 'fachplaner';

UPDATE public.cms_navigation_nodes SET label = 'Elektro-Handwerk', label_de = 'Elektro-Handwerk', label_en = 'Electrical Trade', updated_at = now()
  WHERE nav_area = 'persona' AND node_key = 'handwerk';

UPDATE public.cms_navigation_nodes SET label = 'Fachhandel', label_de = 'Fachhandel', label_en = 'Specialist Retail', updated_at = now()
  WHERE nav_area = 'persona' AND node_key = 'fachhandel';