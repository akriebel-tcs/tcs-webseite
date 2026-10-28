-- cms-light-admin-pilot-node-idempotency-hardening-1
-- Härtet den Admin-Strukturknoten an.pflege (nav_area='main'):
--   * legt ihn an, wenn er fehlt UND Parent an.gesundheit existiert
--   * korrigiert alle Felder, falls genau ein Knoten existiert
--   * wenn Parent fehlt: nichts tun, RAISE NOTICE
--   * wenn Dubletten: nichts tun, RAISE WARNING (keine automatische Löschung)
DO $hardening$
DECLARE
  _parent_id uuid;
  _count int;
  _existing_id uuid;
BEGIN
  SELECT id INTO _parent_id
  FROM public.cms_navigation_nodes
  WHERE nav_area = 'main' AND node_key = 'an.gesundheit'
  LIMIT 1;

  IF _parent_id IS NULL THEN
    RAISE NOTICE 'an.pflege hardening skipped: parent an.gesundheit missing';
    RETURN;
  END IF;

  SELECT count(*) INTO _count
  FROM public.cms_navigation_nodes
  WHERE nav_area = 'main' AND node_key = 'an.pflege';

  IF _count = 0 THEN
    INSERT INTO public.cms_navigation_nodes (
      nav_area, node_key, parent_id, page_key, route_path,
      label, label_de, label_en,
      node_type, sort_order, is_active, show_in_public_nav
    ) VALUES (
      'main', 'an.pflege', _parent_id, 'anwendungen.pflege', '/anwendungen/pflege',
      'Pflege & Betreutes Wohnen', 'Pflege & Betreutes Wohnen', 'Care & Assisted Living',
      'page', 35, true, false
    );
    RAISE NOTICE 'an.pflege inserted under an.gesundheit';
  ELSIF _count = 1 THEN
    SELECT id INTO _existing_id
    FROM public.cms_navigation_nodes
    WHERE nav_area = 'main' AND node_key = 'an.pflege';

    UPDATE public.cms_navigation_nodes
       SET parent_id          = _parent_id,
           page_key           = 'anwendungen.pflege',
           route_path         = '/anwendungen/pflege',
           label              = 'Pflege & Betreutes Wohnen',
           label_de           = 'Pflege & Betreutes Wohnen',
           label_en           = 'Care & Assisted Living',
           node_type          = 'page',
           sort_order         = 35,
           is_active          = true,
           show_in_public_nav = false,
           updated_at         = now()
     WHERE id = _existing_id;
    RAISE NOTICE 'an.pflege normalized (id=%)', _existing_id;
  ELSE
    RAISE WARNING 'an.pflege hardening skipped: % duplicate nodes found in nav_area=main, manual review required', _count;
  END IF;
END
$hardening$;