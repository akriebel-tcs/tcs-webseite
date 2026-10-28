
-- ============================================================
-- Etappe I.7: Duplizieren / Archivieren / Löschen
-- Idempotent: alle CREATEs verwenden CREATE OR REPLACE / IF NOT EXISTS.
-- ============================================================

-- 1) Status-Wertebereich um 'archived' erweitern (per Trigger, nicht CHECK,
--    damit wir flexibel bleiben und Public-RLS unverändert lassen).
CREATE OR REPLACE FUNCTION public.cms_pages_validate_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('draft','published','archived') THEN
    RAISE EXCEPTION 'cms_pages.status must be draft, published or archived (got %)', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cms_pages_validate_status_trg ON public.cms_pages;
CREATE TRIGGER cms_pages_validate_status_trg
BEFORE INSERT OR UPDATE OF status ON public.cms_pages
FOR EACH ROW EXECUTE FUNCTION public.cms_pages_validate_status();

-- ============================================================
-- 2) rpc_admin_duplicate_page
-- ============================================================
CREATE OR REPLACE FUNCTION public.rpc_admin_duplicate_page(
  p_source_page_key text,
  p_new_page_key    text,
  p_new_route_path  text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _src public.cms_pages%ROWTYPE;
  _new_key text;
  _new_route text;
  _exists boolean;
  _sections_copied int := 0;
  _fields_copied int := 0;
  _whitelist_copied int := 0;
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
     _src.title_de, _src.title_en, 'draft', false);

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

  RETURN jsonb_build_object(
    'success', true,
    'source_page_key', _src.page_key,
    'new_page_key', _new_key,
    'new_route_path', _new_route,
    'sections_copied', _sections_copied,
    'fields_copied', _fields_copied,
    'whitelist_copied', _whitelist_copied
  );
END;
$$;

-- ============================================================
-- 3) Archive / Restore Page
-- ============================================================
CREATE OR REPLACE FUNCTION public.rpc_admin_archive_page(p_page_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _rows int := 0;
BEGIN
  UPDATE public.cms_pages
     SET status = 'archived', is_active = false, updated_at = now()
   WHERE page_key = p_page_key;
  GET DIAGNOSTICS _rows = ROW_COUNT;
  IF _rows = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'page_not_found', 'page_key', p_page_key);
  END IF;
  RETURN jsonb_build_object('success', true, 'page_key', p_page_key, 'status', 'archived');
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_admin_restore_page(p_page_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _rows int := 0;
BEGIN
  UPDATE public.cms_pages
     SET status = 'draft', updated_at = now()
   WHERE page_key = p_page_key
     AND status = 'archived';
  GET DIAGNOSTICS _rows = ROW_COUNT;
  IF _rows = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'page_not_archived', 'page_key', p_page_key);
  END IF;
  RETURN jsonb_build_object('success', true, 'page_key', p_page_key, 'status', 'draft');
END;
$$;

-- ============================================================
-- 4) Hard-Delete Page
-- ============================================================
CREATE OR REPLACE FUNCTION public.rpc_admin_delete_page(p_page_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _exists boolean;
  _nav_count int := 0;
  _fields_deleted int := 0;
  _sections_deleted int := 0;
  _whitelist_deleted int := 0;
  _assets_deactivated int := 0;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.cms_pages WHERE page_key = p_page_key) INTO _exists;
  IF NOT _exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'page_not_found', 'page_key', p_page_key);
  END IF;

  SELECT count(*) INTO _nav_count
    FROM public.cms_navigation_nodes WHERE page_key = p_page_key;
  IF _nav_count > 0 THEN
    RETURN jsonb_build_object('success', false,
      'error', 'page_in_use_by_navigation',
      'page_key', p_page_key, 'navigation_node_count', _nav_count);
  END IF;

  UPDATE public.cms_assets SET is_active = false, updated_at = now()
   WHERE page_key = p_page_key AND is_active = true;
  GET DIAGNOSTICS _assets_deactivated = ROW_COUNT;

  DELETE FROM public.cms_section_fields WHERE page_key = p_page_key;
  GET DIAGNOSTICS _fields_deleted = ROW_COUNT;

  DELETE FROM public.cms_admin_editable_fields WHERE page_key = p_page_key;
  GET DIAGNOSTICS _whitelist_deleted = ROW_COUNT;

  DELETE FROM public.cms_sections WHERE page_key = p_page_key;
  GET DIAGNOSTICS _sections_deleted = ROW_COUNT;

  DELETE FROM public.cms_pages WHERE page_key = p_page_key;

  RETURN jsonb_build_object(
    'success', true,
    'page_key', p_page_key,
    'fields_deleted', _fields_deleted,
    'sections_deleted', _sections_deleted,
    'whitelist_deleted', _whitelist_deleted,
    'assets_deactivated', _assets_deactivated
  );
END;
$$;

-- ============================================================
-- 5) Archive / Delete Navigation Node
-- ============================================================
CREATE OR REPLACE FUNCTION public.rpc_admin_archive_navigation_node(p_node_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _rows int := 0;
BEGIN
  UPDATE public.cms_navigation_nodes
     SET is_active = false, updated_at = now()
   WHERE id = p_node_id;
  GET DIAGNOSTICS _rows = ROW_COUNT;
  IF _rows = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'node_not_found', 'node_id', p_node_id);
  END IF;
  RETURN jsonb_build_object('success', true, 'node_id', p_node_id, 'is_active', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_admin_delete_navigation_node(p_node_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _node public.cms_navigation_nodes%ROWTYPE;
  _children int := 0;
  _page_archived boolean := false;
  _other_refs int := 0;
BEGIN
  SELECT * INTO _node FROM public.cms_navigation_nodes WHERE id = p_node_id;
  IF _node.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'node_not_found', 'node_id', p_node_id);
  END IF;

  SELECT count(*) INTO _children
    FROM public.cms_navigation_nodes WHERE parent_id = p_node_id;
  IF _children > 0 THEN
    RETURN jsonb_build_object('success', false,
      'error', 'node_has_children', 'node_id', p_node_id, 'children', _children);
  END IF;

  -- Wenn Knoten auf eine Seite zeigt und keine anderen Knoten dieselbe Seite
  -- referenzieren, Seite automatisch archivieren (nicht löschen).
  IF _node.page_key IS NOT NULL THEN
    SELECT count(*) INTO _other_refs
      FROM public.cms_navigation_nodes
     WHERE page_key = _node.page_key AND id <> _node.id;
    IF _other_refs = 0 THEN
      UPDATE public.cms_pages
         SET status = 'archived', is_active = false, updated_at = now()
       WHERE page_key = _node.page_key
         AND status <> 'archived';
      _page_archived := true;
    END IF;
  END IF;

  DELETE FROM public.cms_navigation_nodes WHERE id = p_node_id;

  RETURN jsonb_build_object(
    'success', true,
    'node_id', p_node_id,
    'page_archived', _page_archived,
    'page_key', _node.page_key
  );
END;
$$;
