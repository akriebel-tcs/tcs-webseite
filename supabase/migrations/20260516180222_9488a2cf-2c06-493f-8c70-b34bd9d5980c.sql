-- Schritt B: cms_assets RLS an aktive Section koppeln (idempotent)
DROP POLICY IF EXISTS "cms_assets public read published" ON public.cms_assets;

CREATE POLICY "cms_assets public read published"
ON public.cms_assets
FOR SELECT
TO anon, authenticated
USING (
  is_active = true
  AND public.cms_page_is_public(page_key)
  AND EXISTS (
    SELECT 1
    FROM public.cms_sections s
    WHERE s.page_key = cms_assets.page_key
      AND s.section_key = cms_assets.section_key
      AND s.is_active = true
  )
);

-- Schritt B: Navigation-Overlay analog zum Navigation-Tree härten (idempotent)
CREATE OR REPLACE FUNCTION public.rpc_public_read_navigation_overlay(p_nav_area text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', n.id,
        'node_key', n.node_key,
        'parent_node_key', p.node_key,
        'is_active', n.is_active,
        'sort_order', n.sort_order,
        'label_de', n.label_de,
        'label_en', n.label_en,
        'show_in_public_nav', n.show_in_public_nav
      )
      ORDER BY n.sort_order, n.node_key
    ),
    '[]'::jsonb
  )
  FROM public.cms_navigation_nodes n
  LEFT JOIN public.cms_navigation_nodes p ON p.id = n.parent_id
  LEFT JOIN public.cms_pages pg ON pg.page_key = n.page_key
  WHERE n.nav_area = p_nav_area
    AND n.is_active = true
    AND n.show_in_public_nav = true
    AND (
      n.page_key IS NULL
      OR (pg.status = 'published' AND pg.is_active = true)
    );
$function$;