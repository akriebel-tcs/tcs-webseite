-- Etappe J.1/J.2: Toggle für Sichtbarkeit von Navigationsknoten und Sektionen.
-- Idempotent: CREATE OR REPLACE.

CREATE OR REPLACE FUNCTION public.rpc_admin_set_navigation_node_active(
  p_node_id uuid,
  p_is_active boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _rows int := 0;
BEGIN
  IF p_is_active IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'is_active_required');
  END IF;
  UPDATE public.cms_navigation_nodes
     SET is_active = p_is_active, updated_at = now()
   WHERE id = p_node_id;
  GET DIAGNOSTICS _rows = ROW_COUNT;
  IF _rows = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'node_not_found', 'node_id', p_node_id);
  END IF;
  RETURN jsonb_build_object('success', true, 'node_id', p_node_id, 'is_active', p_is_active);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_admin_set_section_active(
  p_page_key text,
  p_section_key text,
  p_is_active boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _rows int := 0;
BEGIN
  IF p_is_active IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'is_active_required');
  END IF;
  UPDATE public.cms_sections
     SET is_active = p_is_active, updated_at = now()
   WHERE page_key = p_page_key
     AND section_key = p_section_key;
  GET DIAGNOSTICS _rows = ROW_COUNT;
  IF _rows = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'section_not_found',
      'page_key', p_page_key, 'section_key', p_section_key);
  END IF;
  RETURN jsonb_build_object('success', true,
    'page_key', p_page_key, 'section_key', p_section_key, 'is_active', p_is_active);
END;
$$;