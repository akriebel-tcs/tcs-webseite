-- Etappe 1: rpc_admin_duplicate_page erweitern um optionales Anlegen
-- eines Navigationsknotens unter einem wählbaren Parent.
--
-- Neu (alle optional, Default NULL = altes Verhalten):
--   p_nav_area          : 'main' | 'persona' | 'meta' | 'footer' | 'footer_bottom' | 'home'
--   p_nav_parent_node_key : node_key des Parent-Knotens (NULL = Top-Level)
--   p_nav_node_key      : node_key des neuen Knotens (NULL = aus new_page_key abgeleitet)
--
-- Verhalten:
--   - Wenn p_nav_area NULL ist: keine Navigations-Aktion (wie bisher).
--   - Wenn p_nav_area gesetzt: zusätzlich cms_navigation_nodes-Eintrag
--     anlegen (is_active=false, show_in_public_nav=false), sort_order = max+1
--     im Zielbereich/Parent, Labels aus title_de/title_en der neuen Seite.
--   - Konflikt auf node_key: Fehler 'nav_node_key_exists'.
--   - Parent nicht gefunden im Zielbereich: Fehler 'nav_parent_not_found'.
--
-- Idempotent: DROP + CREATE auf dieselbe Zielsignatur.

DROP FUNCTION IF EXISTS public.rpc_admin_duplicate_page(text, text, text);
DROP FUNCTION IF EXISTS public.rpc_admin_duplicate_page(text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.rpc_admin_duplicate_page(
  p_source_page_key      text,
  p_new_page_key         text,
  p_new_route_path       text,
  p_nav_area             text DEFAULT NULL,
  p_nav_parent_node_key  text DEFAULT NULL,
  p_nav_node_key         text DEFAULT NULL
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
  _nav_area text;
  _nav_node_key text;
  _nav_parent_id uuid;
  _nav_sort_order int;
  _nav_node_id uuid;
  _nav_node_no int;
BEGIN
  _new_key   := nullif(btrim(coalesce(p_new_page_key, '')), '');
  _new_route := nullif(btrim(coalesce(p_new_route_path, '')), '');
  _nav_area  := nullif(btrim(coalesce(p_nav_area, '')), '');

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

  -- Wenn Nav-Anlage gewünscht: vorab validieren, bevor Daten geschrieben werden
  IF _nav_area IS NOT NULL THEN
    IF _nav_area NOT IN ('home','main','persona','meta','footer','footer_bottom') THEN
      RETURN jsonb_build_object('success', false, 'error', 'nav_area_invalid',
        'nav_area', _nav_area);
    END IF;

    _nav_node_key := nullif(btrim(coalesce(p_nav_node_key, '')), '');
    IF _nav_node_key IS NULL THEN
      -- Default: node_key aus new_page_key ableiten (Punkte → Bindestriche)
      _nav_node_key := replace(_new_key, '.', '-');
    END IF;

    SELECT EXISTS(
      SELECT 1 FROM public.cms_navigation_nodes
       WHERE nav_area = _nav_area AND node_key = _nav_node_key
    ) INTO _exists;
    IF _exists THEN
      RETURN jsonb_build_object('success', false, 'error', 'nav_node_key_exists',
        'nav_area', _nav_area, 'node_key', _nav_node_key);
    END IF;

    IF p_nav_parent_node_key IS NOT NULL AND btrim(p_nav_parent_node_key) <> '' THEN
      SELECT id INTO _nav_parent_id
        FROM public.cms_navigation_nodes
       WHERE nav_area = _nav_area
         AND node_key = btrim(p_nav_parent_node_key)
       LIMIT 1;
      IF _nav_parent_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'nav_parent_not_found',
          'nav_area', _nav_area, 'parent_node_key', p_nav_parent_node_key);
      END IF;
    END IF;
  END IF;

  -- Ab hier: Daten anlegen
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

  -- Optional: Navigationsknoten anlegen (als inaktiver Entwurf)
  IF _nav_area IS NOT NULL THEN
    SELECT COALESCE(MAX(sort_order), 0) + 10 INTO _nav_sort_order
      FROM public.cms_navigation_nodes
     WHERE nav_area = _nav_area
       AND (
         (_nav_parent_id IS NULL AND parent_id IS NULL)
         OR parent_id = _nav_parent_id
       );

    INSERT INTO public.cms_navigation_nodes (
      nav_area, node_key, parent_id, page_key,
      label_de, label_en, sort_order,
      is_active, show_in_public_nav, node_type
    ) VALUES (
      _nav_area, _nav_node_key, _nav_parent_id, _new_key,
      _src.title_de, _src.title_en, _nav_sort_order,
      false, false, 'page'
    )
    RETURNING id, node_no INTO _nav_node_id, _nav_node_no;
  END IF;

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
    'assets_copied', _assets_copied,
    'nav_node_id', _nav_node_id,
    'nav_node_no', _nav_node_no,
    'nav_area', _nav_area,
    'nav_node_key', _nav_node_key,
    'nav_parent_id', _nav_parent_id
  );
END;
$function$;