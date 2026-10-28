-- S0: Deaktiviere die 13 zusätzlichen 3.-Ebene-Nav-Knoten + 3 Meta-Sub-Knoten,
-- die nicht in der redaktionellen Quelle (TCS-Unternehmenswebseite_Content_V1) existieren.
-- Pages bleiben erhalten und werden später ggf. wieder aktiv geschaltet oder als
-- Karten-Inhalt unter ihrem Eltern-Knoten verwendet. Idempotent.

UPDATE public.cms_navigation_nodes
   SET is_active = false, updated_at = now()
 WHERE (nav_area, node_key) IN (
   ('main', 'zk.drueckergarnitur'),
   ('main', 'zk.knaufzylinder'),
   ('main', 'zk.vorhaengeschloss'),
   ('main', 'zk.biometrie'),
   ('main', 'zk.bcm-online-leser'),
   ('main', 'zk.funkvernetzte-offline-leser'),
   ('main', 'zk.bcm-handsender'),
   ('main', 'eingangssysteme.design'),
   ('main', 'eingangssysteme.referenzen'),
   ('main', 'eingangssysteme.standards'),
   ('main', 'an.wohnbau.bidirektionale-video'),
   ('main', 'an.wohnbau.mobile-tuerkommunikation'),
   ('main', 'an.wohnbau.digitale-namensverwaltung'),
   ('main', 'an.wohnbau.zutrittskontrolle-bcm'),
   ('main', 'an.bildung.interne-kommunikation'),
   ('main', 'an.oeffentlich.feuerwehrdurchsage'),
   ('meta', 'meta.kontakt-bcm'),
   ('meta', 'meta.serviceportal.registrieren'),
   ('meta', 'meta.serviceportal.passwort-vergessen')
 )
 AND is_active = true;