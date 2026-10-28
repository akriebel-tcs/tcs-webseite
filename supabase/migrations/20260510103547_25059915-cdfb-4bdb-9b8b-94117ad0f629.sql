-- 1. Schema: zwei neue Label-Spalten (additiv, nullable, kein Breaking Change)
ALTER TABLE public.cms_navigation_nodes
  ADD COLUMN IF NOT EXISTS label_de text,
  ADD COLUMN IF NOT EXISTS label_en text;

-- 2. Bestand: vorhandene label-Werte als DE übernehmen
UPDATE public.cms_navigation_nodes
   SET label_de = label
 WHERE label_de IS NULL;

-- 3. Lese-RPC erweitern (label_de, label_en mitliefern)
CREATE OR REPLACE FUNCTION public.rpc_admin_read_navigation_nodes()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
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

-- 4. Schreib-RPC: nur label_de oder label_en, nichts anderes
CREATE OR REPLACE FUNCTION public.rpc_admin_update_navigation_label(
  p_node_id uuid,
  p_locale  text,
  p_value   text
) RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _rows int := 0;
begin
  if p_locale not in ('de', 'en') then
    return jsonb_build_object(
      'success', false,
      'updated', false,
      'error', 'locale_not_allowed',
      'locale', p_locale
    );
  end if;

  if p_node_id is null then
    return jsonb_build_object(
      'success', false,
      'updated', false,
      'error', 'node_id_required'
    );
  end if;

  if p_locale = 'de' then
    update public.cms_navigation_nodes
       set label_de = p_value,
           updated_at = now()
     where id = p_node_id;
  else
    update public.cms_navigation_nodes
       set label_en = p_value,
           updated_at = now()
     where id = p_node_id;
  end if;

  get diagnostics _rows = row_count;

  if _rows = 0 then
    return jsonb_build_object(
      'success', false,
      'updated', false,
      'error', 'node_not_found',
      'node_id', p_node_id
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'updated', true,
    'node_id', p_node_id,
    'locale', p_locale
  );
end;
$function$;

-- 5. Berechtigungen analog Pflege-RPC (No-Login-Prototyp)
REVOKE ALL ON FUNCTION public.rpc_admin_update_navigation_label(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_admin_update_navigation_label(uuid, text, text) TO anon, authenticated;