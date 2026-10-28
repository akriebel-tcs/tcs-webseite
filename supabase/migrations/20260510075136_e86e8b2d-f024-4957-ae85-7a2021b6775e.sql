
-- 1) Table
CREATE TABLE public.cms_navigation_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nav_area text NOT NULL CHECK (nav_area IN ('main','meta','footer','footer_bottom')),
  node_key text NOT NULL,
  parent_id uuid REFERENCES public.cms_navigation_nodes(id) ON DELETE CASCADE,
  page_key text,
  label text,
  route_path text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (nav_area, node_key)
);

ALTER TABLE public.cms_navigation_nodes ENABLE ROW LEVEL SECURITY;

-- No public policies. Access only via SECURITY DEFINER RPC below.

CREATE TRIGGER cms_navigation_nodes_set_updated_at
BEFORE UPDATE ON public.cms_navigation_nodes
FOR EACH ROW EXECUTE FUNCTION public.cms_set_updated_at();

CREATE INDEX idx_cms_navigation_nodes_area_sort
  ON public.cms_navigation_nodes (nav_area, sort_order, node_key);

-- 2) Read-only RPC
CREATE OR REPLACE FUNCTION public.rpc_admin_read_navigation_nodes()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', n.id,
        'nav_area', n.nav_area,
        'node_key', n.node_key,
        'parent_id', n.parent_id,
        'parent_node_key', p.node_key,
        'page_key', n.page_key,
        'label', n.label,
        'route_path', n.route_path,
        'sort_order', n.sort_order,
        'is_active', n.is_active
      )
      ORDER BY n.nav_area, n.sort_order, n.node_key
    ),
    '[]'::jsonb
  )
  FROM public.cms_navigation_nodes n
  LEFT JOIN public.cms_navigation_nodes p ON p.id = n.parent_id;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_admin_read_navigation_nodes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_admin_read_navigation_nodes() TO anon, authenticated;

-- 3) Seed: MAIN top-level
INSERT INTO public.cms_navigation_nodes (nav_area, node_key, page_key, label, route_path, sort_order) VALUES
  ('main','produkte',             'service.onlineProduktkatalog','Produkte',             '/service/online-produktkatalog',10),
  ('main','gebaeudekommunikation','gebaeudekommunikation.root',  'Gebäudekommunikation', '/gebaeudekommunikation',         20),
  ('main','zutrittskontrolle',    'zutrittskontrolle.root',      'Zutrittskontrolle',    '/zutrittskontrolle',             30),
  ('main','gebaeudemanagement',   'gebaeudemanagement.root',     'Gebäudemanagement',    '/gebaeudemanagement',            40),
  ('main','eingangssysteme',      'eingangssysteme.root',        'Eingangssysteme',      '/entry-system',                  50),
  ('main','anwendungen',          'anwendungen.root',            'Anwendungen',          '/anwendungen',                   60),
  ('main','services',             'service.root',                'Services',             '/service',                       70);

-- MAIN children
WITH p AS (SELECT id, node_key FROM public.cms_navigation_nodes WHERE nav_area='main')
INSERT INTO public.cms_navigation_nodes (nav_area, node_key, parent_id, page_key, label, route_path, sort_order)
SELECT 'main', v.node_key, (SELECT id FROM p WHERE node_key = v.parent),
       v.page_key, v.label, v.route_path, v.sort_order
FROM (VALUES
  -- Produkte
  ('produkte.katalog','produkte','service.onlineProduktkatalog','Online-Produktkatalog','/service/online-produktkatalog',10),
  -- Gebäudekommunikation
  ('gk.tuersprechanlagen','gebaeudekommunikation','gebaeudekommunikation.tuersprechanlagen','Türsprechanlagen','/gebaeudekommunikation/tuersprechanlagen',10),
  ('gk.briefkastenanlagen','gebaeudekommunikation','gebaeudekommunikation.briefkastenanlagen','Briefkastenanlagen','/gebaeudekommunikation/briefkastenanlagen',20),
  ('gk.beschilderung','gebaeudekommunikation','gebaeudekommunikation.beschilderung','Beschilderung','/gebaeudekommunikation/beschilderung',30),
  ('gk.grossanlagen','gebaeudekommunikation','gebaeudekommunikation.grossanlagen','Großanlagen','/gebaeudekommunikation/grossanlagen',40),
  ('gk.systemloesungen','gebaeudekommunikation','gebaeudekommunikation.systemloesungen','Systemlösungen','/gebaeudekommunikation/systemloesungen',50),
  -- Zutrittskontrolle
  ('zk.tueren-tore','zutrittskontrolle','zutrittskontrolle.tuerenTore','Türen & Tore','/zutrittskontrolle/tueren-tore',10),
  ('zk.mobiler-zutritt','zutrittskontrolle','zutrittskontrolle.mobilerZutritt','Mobiler Zutritt','/zutrittskontrolle/mobiler-zutritt',20),
  ('zk.fahrstuhl','zutrittskontrolle','zutrittskontrolle.fahrstuhlsteuerung','Fahrstuhlsteuerung','/zutrittskontrolle/fahrstuhlsteuerung',30),
  ('zk.zufahrten','zutrittskontrolle','zutrittskontrolle.zufahrtenParkplaetze','Zufahrten & Parkplätze','/zutrittskontrolle/zufahrten-parkplaetze',40),
  -- Gebäudemanagement
  ('gm.namensanzeige','gebaeudemanagement','gebaeudemanagement.digitaleNamensanzeige','Digitale Namensanzeige','/gebaeudemanagement/digitale-namensanzeige',10),
  ('gm.schraenke','gebaeudemanagement','gebaeudemanagement.schraenkeBehaelter','Schränke & Behälter','/gebaeudemanagement/schraenke-behaelter',20),
  ('gm.signage','gebaeudemanagement','gebaeudemanagement.digitalSignage','Digital Signage','/gebaeudemanagement/digital-signage',30),
  ('gm.reservieren','gebaeudemanagement','gebaeudemanagement.reservierenBuchen','Reservieren & Buchen','/gebaeudemanagement/reservieren-buchen',40),
  ('gm.alarm','gebaeudemanagement','gebaeudemanagement.alarmanlagenkopplung','Alarmanlagenkopplung','/gebaeudemanagement/alarmanlagenkopplung',50),
  -- Eingangssysteme
  ('es.funktionalitaet','eingangssysteme','eingangssysteme.funktionalitaet','Funktionalität','/entry-system/funktionalitaet',10),
  ('es.baukoerper','eingangssysteme','eingangssysteme.integrationsformen','Baukörper / Integration','/entry-system/integrationsformen',20),
  ('es.material','eingangssysteme','eingangssysteme.material','Material','/entry-system/material',30),
  ('es.beratung','eingangssysteme','eingangssysteme.beratung','Beratung','/entry-system/beratung',40),
  -- Anwendungen
  ('an.wohnbau','anwendungen','anwendungen.wohnbau','Wohnbau','/anwendungen/wohnbau',10),
  ('an.bildung','anwendungen','anwendungen.bildungseinrichtungen','Bildungseinrichtungen','/anwendungen/bildungseinrichtungen',20),
  ('an.gesundheit','anwendungen','anwendungen.gesundheitseinrichtungen','Gesundheitseinrichtungen','/anwendungen/gesundheitseinrichtungen',30),
  ('an.oeffentlich','anwendungen','anwendungen.oeffentlicheHand','Öffentliche Hand','/anwendungen/oeffentliche-hand',40),
  ('an.referenzen','anwendungen','anwendungen.referenzprojekte','Referenzprojekte','/anwendungen/referenzprojekte',50),
  -- Services
  ('sv.planen','services','service.planenKonfigurieren','Planen & Konfigurieren','/planen-konfigurieren',10),
  ('sv.downloads','services','service.downloads','Downloads','/downloads',20),
  ('sv.support','services','service.technischerSupport','Technischer Support','/technischer-support',30),
  ('sv.akademie','services','wissen.akademie','TCS Akademie','/akademie',40),
  ('sv.ersatzteile','services','service.ersatzteile','Ersatzteile','/ersatzteile',50)
) AS v(node_key, parent, page_key, label, route_path, sort_order);

-- META
INSERT INTO public.cms_navigation_nodes (nav_area, node_key, page_key, label, route_path, sort_order) VALUES
  ('meta','meta.serviceportal','serviceportal.root','Serviceportal','/serviceportal',10),
  ('meta','meta.kontakt',      'meta.kontakt',     'Kontakt',      '/kontakt',      20),
  ('meta','meta.karriere',     'meta.karriere',    'Karriere',     '/karriere',     30),
  ('meta','meta.presse',       'meta.presse',      'Presse',       '/presse',       40);

-- FOOTER columns (top-level) + items
INSERT INTO public.cms_navigation_nodes (nav_area, node_key, page_key, label, route_path, sort_order) VALUES
  ('footer','col.produkte',    NULL,'Produkte',    NULL,10),
  ('footer','col.anwendungen', NULL,'Anwendungen', NULL,20),
  ('footer','col.services',    NULL,'Services',    NULL,30),
  ('footer','col.unternehmen', NULL,'Unternehmen', NULL,40);

WITH p AS (SELECT id, node_key FROM public.cms_navigation_nodes WHERE nav_area='footer')
INSERT INTO public.cms_navigation_nodes (nav_area, node_key, parent_id, page_key, label, route_path, sort_order)
SELECT 'footer', v.node_key, (SELECT id FROM p WHERE node_key = v.parent),
       v.page_key, v.label, v.route_path, v.sort_order
FROM (VALUES
  -- Produkte
  ('f.produkte.tuerkomm','col.produkte','gebaeudekommunikation.root','Türkommunikation','/gebaeudekommunikation',10),
  ('f.produkte.zk','col.produkte','zutrittskontrolle.root','Zutrittskontrolle','/zutrittskontrolle',20),
  ('f.produkte.es','col.produkte','eingangssysteme.root','Eingangssysteme','/entry-system',30),
  ('f.produkte.tcsPacks','col.produkte','gebaeudekommunikation.root','TCS:PACKS','/gebaeudekommunikation',40),
  ('f.produkte.snipdoo','col.produkte','gebaeudekommunikation.snipdooIp','snipdoo® IP','/gebaeudekommunikation/snipdoo-ip',50),
  ('f.produkte.beschilderung','col.produkte','gebaeudekommunikation.beschilderung','Beschilderung','/gebaeudekommunikation/beschilderung',60),
  -- Anwendungen
  ('f.anw.efh','col.anwendungen','anwendungen.einfamilienhaus','Einfamilienhaus','/anwendungen/einfamilienhaus',10),
  ('f.anw.mfh','col.anwendungen','anwendungen.mehrfamilienhaus','Mehrfamilienhaus','/anwendungen/mehrfamilienhaus',20),
  ('f.anw.gross','col.anwendungen','anwendungen.grossanlage','Großanlagen','/anwendungen/grossanlage',30),
  ('f.anw.gewerbe','col.anwendungen','anwendungen.objektloesungen','Gewerbe','/anwendungen/objektloesungen',40),
  ('f.anw.referenzen','col.anwendungen','anwendungen.referenzprojekte','Referenzen','/anwendungen/referenzprojekte',50),
  -- Services
  ('f.sv.konfigurator','col.services','service.planenKonfigurieren','Konfigurator','/planen-konfigurieren',10),
  ('f.sv.downloads','col.services','service.downloads','Downloads','/downloads',20),
  ('f.sv.akademie','col.services','wissen.akademie','TCS Akademie','/akademie',30),
  ('f.sv.ersatzteile','col.services','service.ersatzteile','Ersatzteile','/ersatzteile',40),
  ('f.sv.support','col.services','service.technischerSupport','Technischer Support','/technischer-support',50),
  -- Unternehmen
  ('f.un.ueberTcs','col.unternehmen','home.ueberTCS','Über TCS','/ueber-tcs',10),
  ('f.un.karriere','col.unternehmen','meta.karriere','Karriere','/karriere',20),
  ('f.un.presse','col.unternehmen','meta.presse','Presse','/presse',30),
  ('f.un.kontakt','col.unternehmen','meta.kontakt','Kontakt','/kontakt',40),
  ('f.un.datenschutz','col.unternehmen','legal.datenschutz','Datenschutz','/datenschutz',50)
) AS v(node_key, parent, page_key, label, route_path, sort_order);

-- FOOTER bottom (legal)
INSERT INTO public.cms_navigation_nodes (nav_area, node_key, page_key, label, route_path, sort_order) VALUES
  ('footer_bottom','legal.impressum', 'legal.impressum', 'Impressum', '/impressum', 10),
  ('footer_bottom','legal.datenschutz','legal.datenschutz','Datenschutz','/datenschutz',20),
  ('footer_bottom','legal.agb',       'legal.agb',       'AGB',       '/agb',       30);
