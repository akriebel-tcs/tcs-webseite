
-- Etappe H: cms-light-nav-move-1
-- RPC zum Verschieben eines Navigationsknotens (parent + sort_order) innerhalb derselben nav_area.

CREATE OR REPLACE FUNCTION public.rpc_admin_move_navigation_node(
  p_node_id uuid,
  p_new_parent_id uuid,
  p_new_sort_order integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _node public.cms_navigation_nodes%ROWTYPE;
  _parent public.cms_navigation_nodes%ROWTYPE;
  _cycle boolean;
  _final_pos integer;
  _sibling record;
  _idx integer := 0;
BEGIN
  IF p_node_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'node_id_required');
  END IF;

  SELECT * INTO _node FROM public.cms_navigation_nodes WHERE id = p_node_id;
  IF _node.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'node_not_found');
  END IF;

  IF p_new_parent_id IS NOT NULL THEN
    SELECT * INTO _parent FROM public.cms_navigation_nodes WHERE id = p_new_parent_id;
    IF _parent.id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'parent_not_found');
    END IF;
    IF _parent.nav_area <> _node.nav_area THEN
      RETURN jsonb_build_object('success', false, 'error', 'parent_in_other_nav_area');
    END IF;
    IF _parent.id = _node.id THEN
      RETURN jsonb_build_object('success', false, 'error', 'parent_is_self');
    END IF;

    -- Zyklusprüfung: ist der Zielparent ein Nachfahre des bewegten Knotens?
    WITH RECURSIVE descendants AS (
      SELECT id, parent_id FROM public.cms_navigation_nodes WHERE id = _node.id
      UNION ALL
      SELECT c.id, c.parent_id
      FROM public.cms_navigation_nodes c
      JOIN descendants d ON c.parent_id = d.id
    )
    SELECT EXISTS (SELECT 1 FROM descendants WHERE id = p_new_parent_id) INTO _cycle;

    IF _cycle THEN
      RETURN jsonb_build_object('success', false, 'error', 'cycle_detected');
    END IF;
  END IF;

  -- Knoten setzen (parent + temporär sehr hoher sort_order, damit das Re-Sequencing sauber arbeitet)
  UPDATE public.cms_navigation_nodes
     SET parent_id = p_new_parent_id,
         sort_order = 1000000 + COALESCE(p_new_sort_order, 0),
         updated_at = now()
   WHERE id = _node.id;

  -- Re-Sequencing aller Geschwister im Ziel (gleiche nav_area + parent_id)
  -- Reihenfolge: bisheriger sort_order, node_key – mit Sonderbehandlung des bewegten Knotens an Wunschposition.
  _final_pos := GREATEST(COALESCE(p_new_sort_order, 0), 0);

  FOR _sibling IN
    SELECT id
      FROM public.cms_navigation_nodes
     WHERE nav_area = _node.nav_area
       AND parent_id IS NOT DISTINCT FROM p_new_parent_id
       AND id <> _node.id
     ORDER BY sort_order, node_key
  LOOP
    IF _idx = _final_pos THEN
      _idx := _idx + 1;
    END IF;
    UPDATE public.cms_navigation_nodes
       SET sort_order = _idx, updated_at = now()
     WHERE id = _sibling.id;
    _idx := _idx + 1;
  END LOOP;

  -- Bewegten Knoten an Wunschposition (oder ans Ende, falls Wunsch > Geschwisteranzahl)
  IF _final_pos > _idx THEN
    _final_pos := _idx;
  END IF;
  UPDATE public.cms_navigation_nodes
     SET sort_order = _final_pos, updated_at = now()
   WHERE id = _node.id;

  RETURN jsonb_build_object(
    'success', true,
    'node_id', _node.id,
    'new_parent_id', p_new_parent_id,
    'new_sort_order', _final_pos,
    'nav_area', _node.nav_area
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_admin_move_navigation_node(uuid, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_admin_move_navigation_node(uuid, uuid, integer) TO anon, authenticated;
