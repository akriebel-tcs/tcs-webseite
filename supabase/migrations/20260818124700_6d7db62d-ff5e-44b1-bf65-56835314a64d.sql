UPDATE public.cms_navigation_nodes
SET description_de = 'Gebäudespezifische Anlagenfunktionen',
    description_en = 'Building-specific system functions',
    updated_at = now()
WHERE nav_area = 'main' AND node_key = 'gk.systemloesungen';