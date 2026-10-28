-- Etappe J.2 — Startseite als eigener Navigationsbereich `home`.
-- Idempotent: aktualisiert die Check-Constraint und verschiebt den
-- Startseiten-Knoten aus `main` nach `home`.

ALTER TABLE public.cms_navigation_nodes
  DROP CONSTRAINT IF EXISTS cms_navigation_nodes_nav_area_check;

ALTER TABLE public.cms_navigation_nodes
  ADD CONSTRAINT cms_navigation_nodes_nav_area_check
  CHECK (nav_area = ANY (ARRAY[
    'home'::text,
    'main'::text,
    'meta'::text,
    'footer'::text,
    'footer_bottom'::text,
    'persona'::text
  ]));

-- Startseite in eigenen Bereich verschieben (nur wenn noch in `main`)
UPDATE public.cms_navigation_nodes
   SET nav_area = 'home',
       parent_id = NULL,
       sort_order = 0,
       updated_at = now()
 WHERE node_key = 'home'
   AND page_key = 'home.start'
   AND nav_area = 'main';
