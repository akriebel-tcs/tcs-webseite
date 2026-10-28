-- N1: Reparatur toter page_key-Verweise in cms_navigation_nodes
-- Idempotent: UPDATEs nur, wenn alter Wert noch vorliegt.

-- Footer
UPDATE public.cms_navigation_nodes SET page_key = 'gebaeudekommunikation.snipdoo-ip', updated_at = now()
 WHERE nav_area = 'footer' AND node_key = 'f.produkte.snipdoo' AND page_key = 'gebaeudekommunikation.snipdooIp';

UPDATE public.cms_navigation_nodes SET page_key = 'service.planen-konfigurieren', updated_at = now()
 WHERE nav_area = 'footer' AND node_key = 'f.sv.konfigurator' AND page_key = 'service.planenKonfigurieren';

UPDATE public.cms_navigation_nodes SET page_key = 'service.technischer-support', updated_at = now()
 WHERE nav_area = 'footer' AND node_key = 'f.sv.support' AND page_key = 'service.technischerSupport';

UPDATE public.cms_navigation_nodes SET page_key = 'karriere.root', updated_at = now()
 WHERE nav_area = 'footer' AND node_key = 'f.un.karriere' AND page_key = 'meta.karriere';

UPDATE public.cms_navigation_nodes SET page_key = 'kontakt.root', updated_at = now()
 WHERE nav_area = 'footer' AND node_key = 'f.un.kontakt' AND page_key = 'meta.kontakt';

UPDATE public.cms_navigation_nodes SET page_key = 'presse.root', updated_at = now()
 WHERE nav_area = 'footer' AND node_key = 'f.un.presse' AND page_key = 'meta.presse';

UPDATE public.cms_navigation_nodes SET page_key = 'home.ueber-tcs', updated_at = now()
 WHERE nav_area = 'footer' AND node_key = 'f.un.ueberTcs' AND page_key = 'home.ueberTCS';

-- Akademie: keine CMS-Seite, in externen Link umwandeln und page_key entfernen
UPDATE public.cms_navigation_nodes
   SET node_type = 'external_link', page_key = NULL, updated_at = now()
 WHERE nav_area = 'footer' AND node_key = 'f.sv.akademie' AND page_key = 'wissen.akademie';

-- Main
UPDATE public.cms_navigation_nodes SET page_key = 'anwendungen.oeffentliche-hand', updated_at = now()
 WHERE nav_area = 'main' AND node_key = 'an.oeffentlich' AND page_key = 'anwendungen.oeffentlicheHand';

UPDATE public.cms_navigation_nodes SET page_key = 'gebaeudemanagement.digitale-namensanzeige', updated_at = now()
 WHERE nav_area = 'main' AND node_key = 'gm.namensanzeige' AND page_key = 'gebaeudemanagement.digitaleNamensanzeige';

UPDATE public.cms_navigation_nodes SET page_key = 'gebaeudemanagement.reservieren-buchen', updated_at = now()
 WHERE nav_area = 'main' AND node_key = 'gm.reservieren' AND page_key = 'gebaeudemanagement.reservierenBuchen';

UPDATE public.cms_navigation_nodes SET page_key = 'gebaeudemanagement.schraenke-behaelter', updated_at = now()
 WHERE nav_area = 'main' AND node_key = 'gm.schraenke' AND page_key = 'gebaeudemanagement.schraenkeBehaelter';

UPDATE public.cms_navigation_nodes SET page_key = 'gebaeudemanagement.digital-signage', updated_at = now()
 WHERE nav_area = 'main' AND node_key = 'gm.signage' AND page_key = 'gebaeudemanagement.digitalSignage';

UPDATE public.cms_navigation_nodes SET page_key = 'zutrittskontrolle.mobiler-zutritt', updated_at = now()
 WHERE nav_area = 'main' AND node_key = 'zk.mobiler-zutritt' AND page_key = 'zutrittskontrolle.mobilerZutritt';

UPDATE public.cms_navigation_nodes SET page_key = 'zutrittskontrolle.tueren-tore', updated_at = now()
 WHERE nav_area = 'main' AND node_key = 'zk.tueren-tore' AND page_key = 'zutrittskontrolle.tuerenTore';

UPDATE public.cms_navigation_nodes SET page_key = 'zutrittskontrolle.zufahrten-parkplaetze', updated_at = now()
 WHERE nav_area = 'main' AND node_key = 'zk.zufahrten' AND page_key = 'zutrittskontrolle.zufahrtenParkplaetze';

UPDATE public.cms_navigation_nodes SET page_key = 'service.online-produktkatalog', updated_at = now()
 WHERE nav_area = 'main' AND node_key IN ('produkte','produkte.katalog') AND page_key = 'service.onlineProduktkatalog';

UPDATE public.cms_navigation_nodes SET page_key = 'service.hub', updated_at = now()
 WHERE nav_area = 'main' AND node_key = 'services' AND page_key = 'service.root';

UPDATE public.cms_navigation_nodes SET page_key = 'service.planen-konfigurieren', updated_at = now()
 WHERE nav_area = 'main' AND node_key = 'sv.planen' AND page_key = 'service.planenKonfigurieren';

UPDATE public.cms_navigation_nodes SET page_key = 'service.technischer-support', updated_at = now()
 WHERE nav_area = 'main' AND node_key = 'sv.support' AND page_key = 'service.technischerSupport';

UPDATE public.cms_navigation_nodes
   SET node_type = 'external_link', page_key = NULL, updated_at = now()
 WHERE nav_area = 'main' AND node_key = 'sv.akademie' AND page_key = 'wissen.akademie';

-- Meta
UPDATE public.cms_navigation_nodes SET page_key = 'karriere.root', updated_at = now()
 WHERE nav_area = 'meta' AND node_key = 'meta.karriere' AND page_key = 'meta.karriere';

UPDATE public.cms_navigation_nodes SET page_key = 'kontakt.root', updated_at = now()
 WHERE nav_area = 'meta' AND node_key = 'meta.kontakt' AND page_key = 'meta.kontakt';

UPDATE public.cms_navigation_nodes SET page_key = 'presse.root', updated_at = now()
 WHERE nav_area = 'meta' AND node_key = 'meta.presse' AND page_key = 'meta.presse';

UPDATE public.cms_navigation_nodes SET page_key = 'serviceportal.login', updated_at = now()
 WHERE nav_area = 'meta' AND node_key = 'meta.serviceportal' AND page_key = 'serviceportal.root';
