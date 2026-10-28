-- 1) Seite personas.architekt reaktivieren (Inhalte sind alle noch da)
update public.cms_pages
   set status = 'published',
       is_active = true,
       updated_at = now()
 where page_key = 'personas.architekt';

-- 2) Navigationsknoten wiederherstellen, falls nicht (mehr) vorhanden.
--    sort_order = 0, damit Architekten wieder vor Bauherren erscheinen
--    (ursprüngliche Reihenfolge der Persona-Leiste).
insert into public.cms_navigation_nodes
  (nav_area, node_key, parent_id, page_key, label_de, label_en,
   route_path, node_type, sort_order, is_active, show_in_public_nav)
select 'persona', 'persona.architekten', null, 'personas.architekt',
       'Architekten & Planer', 'Architects & Planners',
       null, 'group', 0, true, false
 where not exists (
   select 1 from public.cms_navigation_nodes
    where node_key = 'persona.architekten'
 );

-- 3) Falls der Knoten noch existiert, aber inaktiv/falsch sortiert ist:
update public.cms_navigation_nodes
   set is_active = true,
       sort_order = case when sort_order is null or sort_order > 5 then 0 else sort_order end,
       updated_at = now()
 where node_key = 'persona.architekten';