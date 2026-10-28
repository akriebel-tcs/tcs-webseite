-- Zwillings-Seite/-Knoten „Mobile Türkommunikation" stilllegen.
-- Führend ist N-133 / P-236 (mobile-tk-preview.root).
UPDATE public.cms_pages
   SET status = 'archived',
       is_active = false,
       updated_at = now()
 WHERE page_key = 'anwendungen.mobile-tuerkommunikation'
   AND (status IS DISTINCT FROM 'archived' OR is_active IS DISTINCT FROM false);

UPDATE public.cms_navigation_nodes
   SET show_in_public_nav = false,
       is_active = false,
       updated_at = now()
 WHERE node_key = 'an.mobile-tuerkommunikation'
   AND (show_in_public_nav IS DISTINCT FROM false OR is_active IS DISTINCT FROM false);