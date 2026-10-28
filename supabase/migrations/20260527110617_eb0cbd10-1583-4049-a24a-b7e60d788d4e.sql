
-- Hotfix Tranche 27b-1: Parent-Sections `anforderungen` von content_v1 → cards_v1
-- und Sort-Order der card_v1-Kinder auf die ursprüngliche fachliche Reihenfolge
-- aus dem Code korrigieren (statt alphabetisch aus 27b).
-- Idempotent: nur Pages aus Bereich `anwendungen.*` mit existierenden Kindsections.

-- 1) Parent-Typ angleichen (kein Doppelrendering: AnwendungDetailPage nutzt
--    legacy PageLayout, das keine section_type-Registry iteriert).
UPDATE cms_sections
SET section_type = 'cards_v1', updated_at = now()
WHERE page_key LIKE 'anwendungen.%'
  AND section_key = 'anforderungen'
  AND section_type = 'content_v1';

-- 2) Sort-Order der Kinder auf Code-Reihenfolge setzen.
-- Wir mappen pro (page_key, section_key) den Zielindex und schreiben ihn.
WITH desired(page_key, section_key, sort_order) AS (
  VALUES
    -- behoerde: zutritt, cloud, tore, orientierung, barrierefreiheit
    ('anwendungen.behoerde','anforderungen_item_zutritt',0),
    ('anwendungen.behoerde','anforderungen_item_cloud',1),
    ('anwendungen.behoerde','anforderungen_item_tore',2),
    ('anwendungen.behoerde','anforderungen_item_orientierung',3),
    ('anwendungen.behoerde','anforderungen_item_barrierefreiheit',4),
    -- bidirektionale-video: barrierefreiheit, pflege, kameras, datenschutz
    ('anwendungen.bidirektionale-video','anforderungen_item_barrierefreiheit',0),
    ('anwendungen.bidirektionale-video','anforderungen_item_pflege',1),
    ('anwendungen.bidirektionale-video','anforderungen_item_kameras',2),
    ('anwendungen.bidirektionale-video','anforderungen_item_datenschutz',3),
    -- concierge: pfoertnerplatz, schranken, video, besucher, vernetzung
    ('anwendungen.concierge','anforderungen_item_pfoertnerplatz',0),
    ('anwendungen.concierge','anforderungen_item_schranken',1),
    ('anwendungen.concierge','anforderungen_item_video',2),
    ('anwendungen.concierge','anforderungen_item_besucher',3),
    ('anwendungen.concierge','anforderungen_item_vernetzung',4),
    -- digitale-namensverwaltung: schild, fernverwaltung, mieterwechsel, sondertexte, integration
    ('anwendungen.digitale-namensverwaltung','anforderungen_item_schild',0),
    ('anwendungen.digitale-namensverwaltung','anforderungen_item_fernverwaltung',1),
    ('anwendungen.digitale-namensverwaltung','anforderungen_item_mieterwechsel',2),
    ('anwendungen.digitale-namensverwaltung','anforderungen_item_sondertexte',3),
    ('anwendungen.digitale-namensverwaltung','anforderungen_item_integration',4),
    -- einfamilienhaus: design, app, zutritt, bedienung (audioVideo nicht in DB)
    ('anwendungen.einfamilienhaus','anforderungen_item_design',0),
    ('anwendungen.einfamilienhaus','anforderungen_item_app',1),
    ('anwendungen.einfamilienhaus','anforderungen_item_zutritt',2),
    ('anwendungen.einfamilienhaus','anforderungen_item_bedienung',3),
    -- feuerwehr: alarmierung, tore, zutritt, video, robust
    ('anwendungen.feuerwehr','anforderungen_item_alarmierung',0),
    ('anwendungen.feuerwehr','anforderungen_item_tore',1),
    ('anwendungen.feuerwehr','anforderungen_item_zutritt',2),
    ('anwendungen.feuerwehr','anforderungen_item_video',3),
    ('anwendungen.feuerwehr','anforderungen_item_robust',4),
    -- feuerwehrdurchsage: norm, bedienung, bestand (alleWohneinheiten nicht in DB)
    ('anwendungen.feuerwehrdurchsage','anforderungen_item_norm',0),
    ('anwendungen.feuerwehrdurchsage','anforderungen_item_bedienung',1),
    ('anwendungen.feuerwehrdurchsage','anforderungen_item_bestand',2),
    -- grossanlage: teilnehmer, display, ip, zutritt, concierge
    ('anwendungen.grossanlage','anforderungen_item_teilnehmer',0),
    ('anwendungen.grossanlage','anforderungen_item_display',1),
    ('anwendungen.grossanlage','anforderungen_item_ip',2),
    ('anwendungen.grossanlage','anforderungen_item_zutritt',3),
    ('anwendungen.grossanlage','anforderungen_item_concierge',4),
    -- interne-kommunikation: durchsage, automatik, mobil, integration (raumZuRaum nicht in DB)
    ('anwendungen.interne-kommunikation','anforderungen_item_durchsage',0),
    ('anwendungen.interne-kommunikation','anforderungen_item_automatik',1),
    ('anwendungen.interne-kommunikation','anforderungen_item_mobil',2),
    ('anwendungen.interne-kommunikation','anforderungen_item_integration',3),
    -- klinik: patientenaufruf, zutritt, video, barrierefreiheit, hygiene
    ('anwendungen.klinik','anforderungen_item_patientenaufruf',0),
    ('anwendungen.klinik','anforderungen_item_zutritt',1),
    ('anwendungen.klinik','anforderungen_item_video',2),
    ('anwendungen.klinik','anforderungen_item_barrierefreiheit',3),
    ('anwendungen.klinik','anforderungen_item_hygiene',4),
    -- mehrfamilienhaus: namensverwaltung, zutritt, video, mobil, vernetzung (vieleEinheiten nicht in DB)
    ('anwendungen.mehrfamilienhaus','anforderungen_item_namensverwaltung',0),
    ('anwendungen.mehrfamilienhaus','anforderungen_item_zutritt',1),
    ('anwendungen.mehrfamilienhaus','anforderungen_item_video',2),
    ('anwendungen.mehrfamilienhaus','anforderungen_item_mobil',3),
    ('anwendungen.mehrfamilienhaus','anforderungen_item_vernetzung',4),
    -- pflege: barrierefreiheit, notruf, zutritt, infotafeln, skalierbarkeit
    ('anwendungen.pflege','anforderungen_item_barrierefreiheit',0),
    ('anwendungen.pflege','anforderungen_item_notruf',1),
    ('anwendungen.pflege','anforderungen_item_zutritt',2),
    ('anwendungen.pflege','anforderungen_item_infotafeln',3),
    ('anwendungen.pflege','anforderungen_item_skalierbarkeit',4),
    -- sanierung: bestand, austausch, ausbau, namen
    ('anwendungen.sanierung','anforderungen_item_bestand',0),
    ('anwendungen.sanierung','anforderungen_item_austausch',1),
    ('anwendungen.sanierung','anforderungen_item_ausbau',2),
    ('anwendungen.sanierung','anforderungen_item_namen',3),
    -- schwimmbad: zutritt, schliessfach, video, orientierung, robust
    ('anwendungen.schwimmbad','anforderungen_item_zutritt',0),
    ('anwendungen.schwimmbad','anforderungen_item_schliessfach',1),
    ('anwendungen.schwimmbad','anforderungen_item_video',2),
    ('anwendungen.schwimmbad','anforderungen_item_orientierung',3),
    ('anwendungen.schwimmbad','anforderungen_item_robust',4),
    -- zutrittskontrolle-bcm: zutritt, oeffnung, zufahrten, fahrstuhl, mobil, reservieren, alarm, cloud
    ('anwendungen.zutrittskontrolle-bcm','anforderungen_item_zutritt',0),
    ('anwendungen.zutrittskontrolle-bcm','anforderungen_item_oeffnung',1),
    ('anwendungen.zutrittskontrolle-bcm','anforderungen_item_zufahrten',2),
    ('anwendungen.zutrittskontrolle-bcm','anforderungen_item_fahrstuhl',3),
    ('anwendungen.zutrittskontrolle-bcm','anforderungen_item_mobil',4),
    ('anwendungen.zutrittskontrolle-bcm','anforderungen_item_reservieren',5),
    ('anwendungen.zutrittskontrolle-bcm','anforderungen_item_alarm',6),
    ('anwendungen.zutrittskontrolle-bcm','anforderungen_item_cloud',7)
)
UPDATE cms_sections s
SET sort_order = d.sort_order, updated_at = now()
FROM desired d
WHERE s.page_key = d.page_key
  AND s.section_key = d.section_key
  AND s.sort_order IS DISTINCT FROM d.sort_order;
