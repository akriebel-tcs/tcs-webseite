-- Hotfix: Breadcrumb für N-077/078/079/080 (Wohnbau-Unterseiten)
-- Ursache: Editorial-Knoten im Hauptbaum (an.wohnbau.*) hatten kein route_path.
-- Breadcrumb-RPC fand daher nur die Footer-Aliase und kettete zu "Anwendungen" hoch.
-- Fix: route_path auf den vier Editorial-Knoten setzen, damit die RPC sie als
-- Startknoten wählt (main DESC) und über parent an.wohnbau -> "TCS im Wohnbau" kettet.
-- Idempotent: nur setzen, wenn NULL oder abweichend.

UPDATE public.cms_navigation_nodes
SET route_path = '/anwendungen/einfamilienhaus', updated_at = now()
WHERE node_key = 'an.wohnbau.efh'
  AND nav_area = 'main'
  AND (route_path IS NULL OR route_path <> '/anwendungen/einfamilienhaus');

UPDATE public.cms_navigation_nodes
SET route_path = '/anwendungen/mehrfamilienhaus', updated_at = now()
WHERE node_key = 'an.wohnbau.mfh'
  AND nav_area = 'main'
  AND (route_path IS NULL OR route_path <> '/anwendungen/mehrfamilienhaus');

UPDATE public.cms_navigation_nodes
SET route_path = '/anwendungen/grossanlage', updated_at = now()
WHERE node_key = 'an.wohnbau.gross'
  AND nav_area = 'main'
  AND (route_path IS NULL OR route_path <> '/anwendungen/grossanlage');

UPDATE public.cms_navigation_nodes
SET route_path = '/anwendungen/sanierung', updated_at = now()
WHERE node_key = 'an.wohnbau.sanierung'
  AND nav_area = 'main'
  AND (route_path IS NULL OR route_path <> '/anwendungen/sanierung');