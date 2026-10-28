-- Etappe B: cms-light-navigation-schema-1
-- Additive Erweiterung von cms_navigation_nodes für CMS-Light als künftige
-- Source of Truth für Navigation. Keine RLS-Änderung, keine RPC, keine
-- Auswirkung auf die öffentliche Site (liest weiter aus mainNavigation.ts).
--
-- Regeln (siehe docs/01-strategy/cms-light-source-of-truth.md):
--  - route_path bleibt langfristig in cms_pages, NICHT hier dupliziert.
--  - cms_navigation_nodes.route_path bleibt nur als Bootstrap/Snapshot.
--  - Neue Felder sind nullable, bestehende Daten bleiben unverändert.

ALTER TABLE public.cms_navigation_nodes
  ADD COLUMN IF NOT EXISTS label_de       text,
  ADD COLUMN IF NOT EXISTS label_en       text,
  ADD COLUMN IF NOT EXISTS description_de text,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS node_type      text NOT NULL DEFAULT 'page',
  ADD COLUMN IF NOT EXISTS external_url   text;

-- Backfill: bestehende label-Spalte als Startwert für label_de übernehmen.
UPDATE public.cms_navigation_nodes
   SET label_de = label
 WHERE label_de IS NULL
   AND label IS NOT NULL;

-- Sanfte Wertbegrenzung für node_type ohne harten CHECK (bleibt änderbar):
-- erlaubte Werte sind 'page' | 'group' | 'external_link' | 'action'.
-- Validierung erfolgt später per RPC-Whitelist (Etappe D), nicht per
-- CHECK-Constraint, damit zukünftige Erweiterungen keine Migration brauchen.

-- rpc_admin_read_navigation_nodes erweitern, damit Admin-Diagnose die neuen
-- Felder lesen kann. Read-only, SECURITY DEFINER unverändert.
CREATE OR REPLACE FUNCTION public.rpc_admin_read_navigation_nodes()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', n.id,
        'nav_area', n.nav_area,
        'node_key', n.node_key,
        'parent_id', n.parent_id,
        'parent_node_key', p.node_key,
        'page_key', n.page_key,
        'label', n.label,
        'label_de', n.label_de,
        'label_en', n.label_en,
        'description_de', n.description_de,
        'description_en', n.description_en,
        'node_type', n.node_type,
        'external_url', n.external_url,
        'route_path', n.route_path,
        'sort_order', n.sort_order,
        'is_active', n.is_active
      )
      ORDER BY n.nav_area, n.sort_order, n.node_key
    ),
    '[]'::jsonb
  )
  FROM public.cms_navigation_nodes n
  LEFT JOIN public.cms_navigation_nodes p ON p.id = n.parent_id;
$function$;