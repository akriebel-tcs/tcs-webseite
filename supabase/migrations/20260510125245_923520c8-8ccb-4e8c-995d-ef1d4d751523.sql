
INSERT INTO public.cms_pages (page_key, route_path, page_type, title_de, title_en, status, is_active)
VALUES ('home.start', '/', 'T01', 'Startseite', 'Home', 'draft', true)
ON CONFLICT (page_key) DO NOTHING;

INSERT INTO public.cms_navigation_nodes (nav_area, node_key, parent_id, page_key, label_de, label_en, node_type, route_path, sort_order, is_active)
VALUES ('main', 'home', NULL, 'home.start', 'Startseite', 'Home', 'page', '/', 0, true)
ON CONFLICT DO NOTHING;
