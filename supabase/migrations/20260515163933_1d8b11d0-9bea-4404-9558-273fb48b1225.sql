-- A) rpc_admin_duplicate_page: kopiert nun zusätzlich aktive cms_assets
-- B) rpc_admin_create_navigation_node: neue Whitelist-RPC zum Anlegen von Knoten

-- A) Erweitertes Duplizieren mit Assets
CREATE OR REPLACE FUNCTION public.rpc_admin_duplicate_page(
  p_source_page_key text, p_new_page_key text, p_new_route_path text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _src public.cms_pages%ROWTYPE;
  _new_key text;
  _new_route text;
  _exists boolean;
  _new_page_no integer;
  _sections_copied int := 0;
  _fields_copied int := 0;
  _whitelist_copied int := 0;
  _assets_copied int := 0;
BEGIN
  _new_key   := nullif(btrim(coalesce(p_new_page_key, '')), '');
  _new_route := nullif(btrim(coalesce(p_new_route_path, '')), '');

  IF _new_key IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'new_page_key_required');
  END IF;

  SELECT * INTO _src FROM public.cms_pages WHERE page_key = p_source_page_key;
  IF _src.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'source_not_found',
      'source_page_key', p_source_page_key);
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.cms_pages WHERE page_key = _new_key) INTO _exists;
  IF _exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'target_page_key_exists',
      'new_page_key', _new_key);
  END IF;

  IF _new_route IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM public.cms_pages WHERE route_path = _new_route) INTO _exists;
    IF _exists THEN
      RETURN jsonb_build_object('success', false, 'error', 'target_route_path_exists',
        'new_route_path', _new_route);
    END IF;
  END IF;

  INSERT INTO public.cms_pages
    (page_key, route_path, page_type, title_de, title_en, status, is_active)
  VALUES
    (_new_key, _new_route, _src.page_type,
     _src.title_de, _src.title_en, 'draft', false)
  RETURNING page_no INTO _new_page_no;

  INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active)
  SELECT _new_key, section_key, section_type, sort_order, is_active
    FROM public.cms_sections
   WHERE page_key = _src.page_key;
  GET DIAGNOSTICS _sections_copied = ROW_COUNT;

  INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value, value_json)
  SELECT _new_key, section_key, field_key, locale, value, value_json
    FROM public.cms_section_fields
   WHERE page_key = _src.page_key;
  GET DIAGNOSTICS _fields_copied = ROW_COUNT;

  INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
  SELECT _new_key, section_key, field_key, locale, is_enabled
    FROM public.cms_admin_editable_fields
   WHERE page_key = _src.page_key;
  GET DIAGNOSTICS _whitelist_copied = ROW_COUNT;

  -- NEU: aktive Assets mit klonen (Storage-Pfad bleibt; Bilder werden geteilt)
  INSERT INTO public.cms_assets (
    page_key, section_key, asset_role, locale,
    storage_path, public_url, alt_text_de, alt_text_en,
    focal_x, focal_y, sort_order, is_active,
    field_key, file_name, mime_type, alt_de, alt_en
  )
  SELECT _new_key, section_key, asset_role, locale,
         storage_path, public_url, alt_text_de, alt_text_en,
         focal_x, focal_y, sort_order, is_active,
         field_key, file_name, mime_type, alt_de, alt_en
    FROM public.cms_assets
   WHERE page_key = _src.page_key
     AND is_active = true;
  GET DIAGNOSTICS _assets_copied = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'source_page_key', _src.page_key,
    'source_page_no', _src.page_no,
    'new_page_key', _new_key,
    'new_page_no', _new_page_no,
    'new_route_path', _new_route,
    'sections_copied', _sections_copied,
    'fields_copied', _fields_copied,
    'whitelist_copied', _whitelist_copied,
    'assets_copied', _assets_copied
  );
END;
$function$;

-- B) Neuer Navigationsknoten unter optionalem Eltern-Knoten
CREATE OR REPLACE FUNCTION public.rpc_admin_create_navigation_node(
  p_nav_area text,
  p_parent_node_key text,
  p_node_key text,
  p_page_key text,
  p_label_de text,
  p_label_en text,
  p_node_type text DEFAULT 'page',
  p_external_url text DEFAULT NULL,
  p_route_path text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _allowed_areas CONSTANT text[] := ARRAY['home','main','meta','footer','footer_bottom','persona'];
  _allowed_types CONSTANT text[] := ARRAY['page','group','external_link','action'];
  _node_key text;
  _parent public.cms_navigation_nodes%ROWTYPE;
  _parent_id uuid := NULL;
  _max_sort int;
  _new_id uuid;
  _new_no int;
  _label_de text;
  _label_en text;
  _route text;
  _ext text;
BEGIN
  IF p_nav_area IS NULL OR NOT (p_nav_area = ANY(_allowed_areas)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'nav_area_not_allowed', 'nav_area', p_nav_area);
  END IF;

  IF p_node_type IS NULL OR NOT (p_node_type = ANY(_allowed_types)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'node_type_not_allowed', 'node_type', p_node_type);
  END IF;

  _node_key := nullif(btrim(coalesce(p_node_key, '')), '');
  IF _node_key IS NULL OR _node_key !~ '^[a-z0-9][a-z0-9._-]*$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'node_key_invalid', 'node_key', p_node_key);
  END IF;

  IF EXISTS (SELECT 1 FROM public.cms_navigation_nodes
              WHERE nav_area = p_nav_area AND node_key = _node_key) THEN
    RETURN jsonb_build_object('success', false, 'error', 'node_key_exists',
      'nav_area', p_nav_area, 'node_key', _node_key);
  END IF;

  IF p_parent_node_key IS NOT NULL AND btrim(p_parent_node_key) <> '' THEN
    SELECT * INTO _parent FROM public.cms_navigation_nodes
     WHERE nav_area = p_nav_area AND node_key = btrim(p_parent_node_key);
    IF _parent.id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'parent_not_found',
        'parent_node_key', p_parent_node_key);
    END IF;
    _parent_id := _parent.id;
  END IF;

  IF p_node_type = 'page' THEN
    IF p_page_key IS NULL OR btrim(p_page_key) = '' THEN
      RETURN jsonb_build_object('success', false, 'error', 'page_key_required_for_page_node');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.cms_pages WHERE page_key = btrim(p_page_key)) THEN
      RETURN jsonb_build_object('success', false, 'error', 'page_not_found',
        'page_key', p_page_key);
    END IF;
  END IF;

  IF p_node_type = 'external_link' AND (p_external_url IS NULL OR btrim(p_external_url) = '') THEN
    RETURN jsonb_build_object('success', false, 'error', 'external_url_required');
  END IF;

  SELECT COALESCE(MAX(sort_order), -1) + 1 INTO _max_sort
    FROM public.cms_navigation_nodes
   WHERE nav_area = p_nav_area
     AND parent_id IS NOT DISTINCT FROM _parent_id;

  _label_de := nullif(btrim(coalesce(p_label_de, '')), '');
  _label_en := nullif(btrim(coalesce(p_label_en, '')), '');
  _route    := nullif(btrim(coalesce(p_route_path, '')), '');
  _ext      := nullif(btrim(coalesce(p_external_url, '')), '');

  INSERT INTO public.cms_navigation_nodes (
    nav_area, node_key, parent_id, page_key, label, label_de, label_en,
    node_type, external_url, route_path, sort_order, is_active, show_in_public_nav
  ) VALUES (
    p_nav_area, _node_key, _parent_id,
    CASE WHEN p_node_type = 'page' THEN btrim(p_page_key) ELSE NULL END,
    _label_de, _label_de, _label_en,
    p_node_type, _ext, _route, _max_sort,
    false,  -- bewusst inaktiv: Redaktion gibt frei
    false   -- ebenfalls inaktiv für Public bis Freigabe
  )
  RETURNING id, node_no INTO _new_id, _new_no;

  RETURN jsonb_build_object(
    'success', true,
    'id', _new_id,
    'node_no', _new_no,
    'nav_area', p_nav_area,
    'node_key', _node_key,
    'parent_node_key', p_parent_node_key,
    'page_key', CASE WHEN p_node_type = 'page' THEN btrim(p_page_key) ELSE NULL END,
    'sort_order', _max_sort,
    'is_active', false,
    'show_in_public_nav', false
  );
END;
$function$;