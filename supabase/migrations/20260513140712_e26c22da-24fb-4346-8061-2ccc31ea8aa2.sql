-- Etappe nav-anwendungen-fill-1
-- Idempotent: ergänzt fehlende Hauptmenü-Knoten unter an.wohnbau / an.gesundheit / an.oeffentlich
-- und benennt den Eltern-Knoten "anwendungen" auf Deutsch um in "TCS im Bau".

DO $$
DECLARE
  v_parent_id uuid;
BEGIN
  SELECT id INTO v_parent_id
    FROM public.cms_navigation_nodes
   WHERE nav_area = 'main' AND node_key = 'an.wohnbau';

  IF v_parent_id IS NOT NULL THEN
    INSERT INTO public.cms_navigation_nodes
      (nav_area, node_key, parent_id, page_key, label_de, label_en, node_type, sort_order, is_active, show_in_public_nav)
    SELECT 'main', v.node_key, v_parent_id, v.page_key, v.label_de, v.label_en, 'page', v.sort_order, true, true
    FROM (VALUES
      ('an.wohnbau.efh',       'anwendungen.einfamilienhaus', 'Einfamilienhaus',     'Single-family home',           1),
      ('an.wohnbau.mfh',       'anwendungen.mehrfamilienhaus','Mehrfamilienhaus',    'Multi-family home',            2),
      ('an.wohnbau.gross',     'anwendungen.grossanlage',     'Großanlage',          'Large-scale facility',         3),
      ('an.wohnbau.sanierung', 'anwendungen.sanierung',       'Sanierung / Bestand', 'Renovation / existing buildings', 4)
    ) AS v(node_key, page_key, label_de, label_en, sort_order)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.cms_navigation_nodes x
       WHERE x.nav_area = 'main' AND x.node_key = v.node_key
    );
  END IF;

  SELECT id INTO v_parent_id
    FROM public.cms_navigation_nodes
   WHERE nav_area = 'main' AND node_key = 'an.gesundheit';

  IF v_parent_id IS NOT NULL THEN
    INSERT INTO public.cms_navigation_nodes
      (nav_area, node_key, parent_id, page_key, label_de, label_en, node_type, sort_order, is_active, show_in_public_nav)
    SELECT 'main', v.node_key, v_parent_id, v.page_key, v.label_de, v.label_en, 'page', v.sort_order, true, true
    FROM (VALUES
      ('an.gesundheit.klinik',     'anwendungen.klinik',     'Klinik',     'Hospital',     1),
      ('an.gesundheit.schwimmbad', 'anwendungen.schwimmbad', 'Schwimmbad', 'Swimming pool', 2)
    ) AS v(node_key, page_key, label_de, label_en, sort_order)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.cms_navigation_nodes x
       WHERE x.nav_area = 'main' AND x.node_key = v.node_key
    );
  END IF;

  SELECT id INTO v_parent_id
    FROM public.cms_navigation_nodes
   WHERE nav_area = 'main' AND node_key = 'an.oeffentlich';

  IF v_parent_id IS NOT NULL THEN
    INSERT INTO public.cms_navigation_nodes
      (nav_area, node_key, parent_id, page_key, label_de, label_en, node_type, sort_order, is_active, show_in_public_nav)
    SELECT 'main', v.node_key, v_parent_id, v.page_key, v.label_de, v.label_en, 'page', v.sort_order, true, true
    FROM (VALUES
      ('an.oeffentlich.behoerde',  'anwendungen.behoerde',  'Behörde',   'Authority',  1),
      ('an.oeffentlich.feuerwehr', 'anwendungen.feuerwehr', 'Feuerwehr', 'Fire brigade', 2),
      ('an.oeffentlich.concierge', 'anwendungen.concierge', 'Concierge', 'Concierge',  3)
    ) AS v(node_key, page_key, label_de, label_en, sort_order)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.cms_navigation_nodes x
       WHERE x.nav_area = 'main' AND x.node_key = v.node_key
    );
  END IF;

  UPDATE public.cms_navigation_nodes
     SET label_de = 'TCS im Bau',
         updated_at = now()
   WHERE nav_area = 'main'
     AND node_key = 'anwendungen'
     AND (label_de IS DISTINCT FROM 'TCS im Bau');
END $$;