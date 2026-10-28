-- Etappe 1b — Neue Whitelist-RPC: show_in_public_nav umschalten.
-- Erlaubt der Redaktion, duplizierte oder neue Navigationsknoten ohne
-- Prompt-Workaround in der öffentlichen Navigation sichtbar/unsichtbar
-- zu schalten. is_active bleibt davon getrennt.

CREATE OR REPLACE FUNCTION public.rpc_admin_set_navigation_node_public(
  p_node_id uuid,
  p_show boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists boolean;
  v_current boolean;
BEGIN
  IF p_node_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'p_node_id darf nicht NULL sein.');
  END IF;
  IF p_show IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'p_show darf nicht NULL sein.');
  END IF;

  SELECT show_in_public_nav INTO v_current
  FROM public.cms_navigation_nodes
  WHERE id = p_node_id;

  GET DIAGNOSTICS v_exists = ROW_COUNT;
  IF v_current IS NULL AND NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Knoten nicht gefunden.');
  END IF;

  IF v_current IS NOT DISTINCT FROM p_show THEN
    RETURN jsonb_build_object('success', true, 'updated', false, 'show_in_public_nav', p_show);
  END IF;

  UPDATE public.cms_navigation_nodes
  SET show_in_public_nav = p_show,
      updated_at = now()
  WHERE id = p_node_id;

  RETURN jsonb_build_object('success', true, 'updated', true, 'show_in_public_nav', p_show);
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_admin_set_navigation_node_public(uuid, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.rpc_admin_set_navigation_node_public(uuid, boolean) TO anon, authenticated;