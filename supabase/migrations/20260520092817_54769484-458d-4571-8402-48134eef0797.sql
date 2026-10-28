-- Etappe cms-navigation-breadcrumb-hierarchy-zk-product-pages-1
-- Idempotent ohne ON CONFLICT: bestehende Zeile via node_key updaten,
-- sonst einfügen. show_in_public_nav=false → kein neuer Hauptmenüpunkt.

DO $$
DECLARE
  v_rows jsonb := jsonb_build_array(
    jsonb_build_object('node_key','zk.tueren-tore.bcm-mini-cloud','parent_key','zk.tueren-tore','page_key','zutrittskontrolle.bcm-mini-cloud','route','/zutrittskontrolle/bcm-mini-cloud','label_de','BCM MiniCloud','label_en','BCM MiniCloud','sort_order',10),
    jsonb_build_object('node_key','zk.zufahrten.gsm-gateway','parent_key','zk.zufahrten','page_key','zutrittskontrolle.gsm-gateway','route','/zutrittskontrolle/gsm-gateway','label_de','BCM GSM Gateway','label_en','BCM GSM Gateway','sort_order',10),
    jsonb_build_object('node_key','zk.zufahrten.zufahrtskontrolle','parent_key','zk.zufahrten','page_key','zutrittskontrolle.zufahrtskontrolle','route','/zutrittskontrolle/zufahrtskontrolle','label_de','Zufahrtskontrolle','label_en','Vehicle access control','sort_order',20),
    jsonb_build_object('node_key','gm.namensanzeige.aussenstation-adx5','parent_key','gm.namensanzeige','page_key','zutrittskontrolle.aussenstation-adx5','route','/zutrittskontrolle/aussenstation-adx5','label_de','Aussenstation ADX5','label_en','ADX5 outdoor station','sort_order',10),
    jsonb_build_object('node_key','gm.namensanzeige.digitale-briefkasten','parent_key','gm.namensanzeige','page_key','zutrittskontrolle.digitale-briefkasten','route','/zutrittskontrolle/digitale-briefkasten','label_de','Digitale Briefkastenanlage','label_en','Digital mailbox system','sort_order',20),
    jsonb_build_object('node_key','gm.schraenke.schrankschloss','parent_key','gm.schraenke','page_key','zutrittskontrolle.schrankschloss','route','/zutrittskontrolle/schrankschloss','label_de','Elektronisches Schrankschloss','label_en','Electronic cabinet lock','sort_order',10),
    jsonb_build_object('node_key','gm.schraenke.serverschrankschloss','parent_key','gm.schraenke','page_key','zutrittskontrolle.serverschrankschloss','route','/zutrittskontrolle/serverschrankschloss','label_de','Elektronisches Serverschrankschloss','label_en','Electronic server cabinet lock','sort_order',20)
  );
  r jsonb;
  v_parent_id uuid;
  v_label_de text;
  v_label_en text;
BEGIN
  FOR r IN SELECT * FROM jsonb_array_elements(v_rows) LOOP
    SELECT id INTO v_parent_id FROM public.cms_navigation_nodes
      WHERE node_key = (r->>'parent_key') LIMIT 1;
    IF v_parent_id IS NULL THEN
      RAISE NOTICE 'Parent % nicht gefunden – Knoten % übersprungen', r->>'parent_key', r->>'node_key';
      CONTINUE;
    END IF;
    v_label_de := r->>'label_de';
    v_label_en := r->>'label_en';
    IF EXISTS (SELECT 1 FROM public.cms_navigation_nodes WHERE node_key = r->>'node_key') THEN
      UPDATE public.cms_navigation_nodes
         SET parent_id          = v_parent_id,
             page_key           = r->>'page_key',
             route_path         = r->>'route',
             label              = v_label_de,
             label_de           = v_label_de,
             label_en           = v_label_en,
             sort_order         = (r->>'sort_order')::int,
             is_active          = true,
             node_type          = 'page',
             show_in_public_nav = false,
             updated_at         = now()
       WHERE node_key = r->>'node_key';
    ELSE
      INSERT INTO public.cms_navigation_nodes
        (nav_area, node_key, parent_id, page_key, label, label_de, label_en,
         route_path, sort_order, is_active, node_type, show_in_public_nav)
      VALUES
        ('main', r->>'node_key', v_parent_id, r->>'page_key',
         v_label_de, v_label_de, v_label_en,
         r->>'route', (r->>'sort_order')::int, true, 'page', false);
    END IF;
  END LOOP;
END $$;