-- Etappe J.1.b: 'persona' als 5. nav_area zulassen.
-- Idempotent: Constraint droppen falls vorhanden, neu setzen.
ALTER TABLE public.cms_navigation_nodes
  DROP CONSTRAINT IF EXISTS cms_navigation_nodes_nav_area_check;

ALTER TABLE public.cms_navigation_nodes
  ADD CONSTRAINT cms_navigation_nodes_nav_area_check
  CHECK (nav_area = ANY (ARRAY['main','meta','footer','footer_bottom','persona']));