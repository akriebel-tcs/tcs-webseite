-- Etappe G (cms-light-pages-instance-1): Read + Whitelisted Upsert für cms_pages.

-- 1) Lesen: alle cms_pages-Einträge plus Verwendungs-Info aus cms_navigation_nodes.
CREATE OR REPLACE FUNCTION public.rpc_admin_read_pages_with_nav()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'page_key', p.page_key,
        'route_path', p.route_path,
        'page_type', p.page_type,
        'title_de', p.title_de,
        'title_en', p.title_en,
        'status', p.status,
        'is_active', p.is_active,
        'updated_at', p.updated_at,
        'nav_usage', coalesce(u.usage, '[]'::jsonb)
      )
      ORDER BY p.page_key
    ),
    '[]'::jsonb
  )
  FROM public.cms_pages p
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
             jsonb_build_object(
               'nav_area', n.nav_area,
               'node_key', n.node_key,
               'is_active', n.is_active
             )
             ORDER BY n.nav_area, n.node_key
           ) AS usage
    FROM public.cms_navigation_nodes n
    WHERE n.page_key = p.page_key
  ) u ON true;
$$;

-- 2) Schreiben: Whitelist-Upsert. Nur page_key/route_path/page_type werden gepflegt.
--    status/is_active werden NIE verändert (Insert default 'draft'/false).
CREATE OR REPLACE FUNCTION public.rpc_admin_upsert_page(
  p_page_key text,
  p_route_path text,
  p_page_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _allowed_types CONSTANT text[] := ARRAY[
    'T01','T02','T03','T04','T05','T06','T07','T08','T09',
    'T10a','T10b','T11','T12','T13','T14','T15','T16a','T16b',
    'T17','T18','T19','T20','T21'
  ];
  _normalized_key text;
  _normalized_route text;
  _existing public.cms_pages%ROWTYPE;
  _action text;
BEGIN
  _normalized_key := nullif(btrim(coalesce(p_page_key, '')), '');
  _normalized_route := nullif(btrim(coalesce(p_route_path, '')), '');

  IF _normalized_key IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'page_key_required');
  END IF;

  IF p_page_type IS NULL OR NOT (p_page_type = ANY(_allowed_types)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'page_type_not_allowed', 'page_type', p_page_type);
  END IF;

  SELECT * INTO _existing FROM public.cms_pages WHERE page_key = _normalized_key LIMIT 1;

  IF _existing.id IS NULL THEN
    INSERT INTO public.cms_pages (page_key, route_path, page_type, status, is_active)
    VALUES (_normalized_key, _normalized_route, p_page_type, 'draft', false);
    _action := 'inserted';
  ELSE
    UPDATE public.cms_pages
       SET route_path = _normalized_route,
           page_type  = p_page_type,
           updated_at = now()
     WHERE page_key = _normalized_key;
    _action := 'updated';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'action', _action,
    'page_key', _normalized_key,
    'route_path', _normalized_route,
    'page_type', p_page_type
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_admin_read_pages_with_nav() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_admin_read_pages_with_nav() TO anon, authenticated;

REVOKE ALL ON FUNCTION public.rpc_admin_upsert_page(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_admin_upsert_page(text, text, text) TO anon, authenticated;