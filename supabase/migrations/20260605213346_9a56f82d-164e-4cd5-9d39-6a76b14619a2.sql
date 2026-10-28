UPDATE public.cms_navigation_nodes
SET
  description_de = 'Türkommunikation per App und Smartphone',
  description_en = 'Door communication via app and smartphone',
  route_path     = '/gebaeudekommunikation/mobile-tuerkommunikation',
  updated_at     = now()
WHERE nav_area = 'main' AND node_key = 'gk.mobile-tuerkommunikation';

UPDATE public.cms_navigation_nodes
SET
  description_de = 'IP-basierte Türkommunikation für moderne Gebäude',
  description_en = 'IP-based door communication for modern buildings',
  updated_at     = now()
WHERE nav_area = 'main' AND node_key = 'gk.snipdoo-ip';