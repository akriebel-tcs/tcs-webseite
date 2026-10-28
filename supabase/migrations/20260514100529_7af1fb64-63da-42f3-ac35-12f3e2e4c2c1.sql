-- nav-fill-from-source-1: Hauptmenü an Quellprojekt-Struktur angleichen.
-- Idempotent: nur UPDATE, kein DELETE. Seiten bleiben in cms_pages bestehen.

-- 1) Vierte Ebene unter „TCS im Bau" still-legen (gibt es im Quellprojekt nicht).
UPDATE cms_navigation_nodes SET is_active = false, updated_at = now()
WHERE nav_area = 'main'
  AND node_key IN (
    'an.wohnbau.efh',
    'an.wohnbau.mfh',
    'an.wohnbau.gross',
    'an.wohnbau.sanierung',
    'an.gesundheit.klinik',
    'an.gesundheit.schwimmbad',
    'an.oeffentlich.behoerde',
    'an.oeffentlich.feuerwehr',
    'an.oeffentlich.concierge',
    'an.pflege'
  )
  AND is_active = true;

-- 2) Saubere sort_order auf Top-Level (main) gemäß Quellprojekt-Reihenfolge.
UPDATE cms_navigation_nodes SET sort_order = 10, updated_at = now()
  WHERE nav_area='main' AND node_key='produkte' AND sort_order <> 10;
UPDATE cms_navigation_nodes SET sort_order = 20, updated_at = now()
  WHERE nav_area='main' AND node_key='gebaeudekommunikation' AND sort_order <> 20;
UPDATE cms_navigation_nodes SET sort_order = 30, updated_at = now()
  WHERE nav_area='main' AND node_key='zutrittskontrolle' AND sort_order <> 30;
UPDATE cms_navigation_nodes SET sort_order = 40, updated_at = now()
  WHERE nav_area='main' AND node_key='gebaeudemanagement' AND sort_order <> 40;
UPDATE cms_navigation_nodes SET sort_order = 50, updated_at = now()
  WHERE nav_area='main' AND node_key='eingangssysteme' AND sort_order <> 50;
UPDATE cms_navigation_nodes SET sort_order = 60, updated_at = now()
  WHERE nav_area='main' AND node_key='anwendungen' AND sort_order <> 60;
UPDATE cms_navigation_nodes SET sort_order = 70, updated_at = now()
  WHERE nav_area='main' AND node_key='services' AND sort_order <> 70;

-- 3) Kinder-Reihenfolge gemäß Quellprojekt (10er-Schritte).

-- Gebäudekommunikation
UPDATE cms_navigation_nodes SET sort_order=10, updated_at=now() WHERE nav_area='main' AND node_key='gk.tuersprechanlagen' AND sort_order <> 10;
UPDATE cms_navigation_nodes SET sort_order=20, updated_at=now() WHERE nav_area='main' AND node_key='gk.briefkastenanlagen' AND sort_order <> 20;
UPDATE cms_navigation_nodes SET sort_order=30, updated_at=now() WHERE nav_area='main' AND node_key='gk.beschilderung' AND sort_order <> 30;
UPDATE cms_navigation_nodes SET sort_order=40, updated_at=now() WHERE nav_area='main' AND node_key='gk.grossanlagen' AND sort_order <> 40;
UPDATE cms_navigation_nodes SET sort_order=50, updated_at=now() WHERE nav_area='main' AND node_key='gk.systemloesungen' AND sort_order <> 50;

-- Zutrittskontrolle (Reihenfolge Quelle: tueren-tore, mobiler-zutritt, fahrstuhl, zufahrten)
UPDATE cms_navigation_nodes SET sort_order=10, updated_at=now() WHERE nav_area='main' AND node_key='zk.tueren-tore' AND sort_order <> 10;
UPDATE cms_navigation_nodes SET sort_order=20, updated_at=now() WHERE nav_area='main' AND node_key='zk.mobiler-zutritt' AND sort_order <> 20;
UPDATE cms_navigation_nodes SET sort_order=30, updated_at=now() WHERE nav_area='main' AND node_key='zk.fahrstuhl' AND sort_order <> 30;
UPDATE cms_navigation_nodes SET sort_order=40, updated_at=now() WHERE nav_area='main' AND node_key='zk.zufahrten' AND sort_order <> 40;

-- TCS im Bau (Reihenfolge Quelle: wohnbau, bildung, gesundheit, oeffentlich, referenzen)
UPDATE cms_navigation_nodes SET sort_order=10, updated_at=now() WHERE nav_area='main' AND node_key='an.wohnbau' AND sort_order <> 10;
UPDATE cms_navigation_nodes SET sort_order=20, updated_at=now() WHERE nav_area='main' AND node_key='an.bildung' AND sort_order <> 20;
UPDATE cms_navigation_nodes SET sort_order=30, updated_at=now() WHERE nav_area='main' AND node_key='an.gesundheit' AND sort_order <> 30;
UPDATE cms_navigation_nodes SET sort_order=40, updated_at=now() WHERE nav_area='main' AND node_key='an.oeffentlich' AND sort_order <> 40;
UPDATE cms_navigation_nodes SET sort_order=50, updated_at=now() WHERE nav_area='main' AND node_key='an.referenzen' AND sort_order <> 50;
