-- Idempotent: Mobile Türkommunikation (P-236) Navigationsknoten unter Gebäudekommunikation
DO $$
DECLARE
  v_parent_id uuid;
  v_page_key  text := 'mobile-tk-preview.root';
  v_node_key  text := 'gk.mobile-tuerkommunikation';
BEGIN
  -- Parent ermitteln: gleicher Parent wie Türsprechanlagen / Briefkastenanlagen / snipdoo IP
  SELECT parent_id INTO v_parent_id
  FROM public.cms_navigation_nodes
  WHERE nav_area = 'main' AND node_key = 'gk.tuersprechanlagen';

  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'Parent für gk.tuersprechanlagen nicht gefunden – Abbruch (kein blindes Anlegen).';
  END IF;

  -- Insert oder Update (idempotent)
  INSERT INTO public.cms_navigation_nodes (
    nav_area, node_key, parent_id, page_key,
    label, label_de, label_en,
    node_type, sort_order, is_active, show_in_public_nav
  )
  VALUES (
    'main', v_node_key, v_parent_id, v_page_key,
    'Mobile Türkommunikation', 'Mobile Türkommunikation', 'Mobile Door Communication',
    'page', 15, true, true
  )
  ON CONFLICT (nav_area, node_key) DO UPDATE
  SET parent_id  = EXCLUDED.parent_id,
      page_key   = EXCLUDED.page_key,
      label_de   = EXCLUDED.label_de,
      label_en   = EXCLUDED.label_en,
      node_type  = EXCLUDED.node_type,
      sort_order = EXCLUDED.sort_order,
      is_active  = EXCLUDED.is_active,
      updated_at = now();
END $$;