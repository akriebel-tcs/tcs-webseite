
DO $$
DECLARE
  p_nam uuid := 'fc8d5eb6-a759-4559-ba35-e99305dcca37';
  p_sig uuid := 'ebb67281-3781-4235-8cda-1ffa1706a578';
  p_res uuid := '5b419497-bc5a-4ea1-979d-56e68f46954c';
BEGIN
  -- 1) gm.namensanzeige.zutrittssoftware
  IF EXISTS (SELECT 1 FROM cms_navigation_nodes WHERE node_key = 'gm.namensanzeige.zutrittssoftware') THEN
    UPDATE cms_navigation_nodes SET
      nav_area = 'main',
      parent_id = p_nam,
      page_key = 'zutrittskontrolle.zutrittssoftware',
      route_path = '/zutrittskontrolle/zutrittssoftware',
      label_de = COALESCE(label_de, 'Verwaltungssoftware / Zutrittssoftware'),
      label_en = COALESCE(label_en, 'Management software / Access software'),
      node_type = 'page',
      is_active = true,
      show_in_public_nav = false,
      updated_at = now()
    WHERE node_key = 'gm.namensanzeige.zutrittssoftware';
  ELSE
    INSERT INTO cms_navigation_nodes
      (nav_area, node_key, parent_id, page_key, route_path,
       label_de, label_en, node_type, sort_order, is_active, show_in_public_nav)
    VALUES
      ('main', 'gm.namensanzeige.zutrittssoftware', p_nam,
       'zutrittskontrolle.zutrittssoftware', '/zutrittskontrolle/zutrittssoftware',
       'Verwaltungssoftware / Zutrittssoftware', 'Management software / Access software',
       'page', 30, true, false);
  END IF;

  -- 2) gm.signage.bcm-infoboard
  IF EXISTS (SELECT 1 FROM cms_navigation_nodes WHERE node_key = 'gm.signage.bcm-infoboard') THEN
    UPDATE cms_navigation_nodes SET
      nav_area = 'main',
      parent_id = p_sig,
      page_key = 'gebaeudemanagement.bcm-infoboard',
      route_path = '/gebaeudemanagement/bcm-infoboard',
      label_de = COALESCE(label_de, 'BCM Infoboard'),
      label_en = COALESCE(label_en, 'BCM Infoboard'),
      node_type = 'page',
      is_active = true,
      show_in_public_nav = false,
      updated_at = now()
    WHERE node_key = 'gm.signage.bcm-infoboard';
  ELSE
    INSERT INTO cms_navigation_nodes
      (nav_area, node_key, parent_id, page_key, route_path,
       label_de, label_en, node_type, sort_order, is_active, show_in_public_nav)
    VALUES
      ('main', 'gm.signage.bcm-infoboard', p_sig,
       'gebaeudemanagement.bcm-infoboard', '/gebaeudemanagement/bcm-infoboard',
       'BCM Infoboard', 'BCM Infoboard',
       'page', 10, true, false);
  END IF;

  -- 3) gm.reservieren.bcm-buchungssystem
  IF EXISTS (SELECT 1 FROM cms_navigation_nodes WHERE node_key = 'gm.reservieren.bcm-buchungssystem') THEN
    UPDATE cms_navigation_nodes SET
      nav_area = 'main',
      parent_id = p_res,
      page_key = 'gebaeudemanagement.bcm-buchungssystem',
      route_path = '/gebaeudemanagement/bcm-buchungssystem',
      label_de = COALESCE(label_de, 'BCM Buchungssystem'),
      label_en = COALESCE(label_en, 'BCM Booking System'),
      node_type = 'page',
      is_active = true,
      show_in_public_nav = false,
      updated_at = now()
    WHERE node_key = 'gm.reservieren.bcm-buchungssystem';
  ELSE
    INSERT INTO cms_navigation_nodes
      (nav_area, node_key, parent_id, page_key, route_path,
       label_de, label_en, node_type, sort_order, is_active, show_in_public_nav)
    VALUES
      ('main', 'gm.reservieren.bcm-buchungssystem', p_res,
       'gebaeudemanagement.bcm-buchungssystem', '/gebaeudemanagement/bcm-buchungssystem',
       'BCM Buchungssystem', 'BCM Booking System',
       'page', 10, true, false);
  END IF;
END $$;
