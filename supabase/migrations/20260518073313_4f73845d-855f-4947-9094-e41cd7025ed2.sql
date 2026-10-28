UPDATE public.cms_navigation_nodes
SET show_in_public_nav = true,
    updated_at = now()
WHERE nav_area = 'persona'
  AND show_in_public_nav = false;