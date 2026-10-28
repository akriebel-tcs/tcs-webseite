
DO $mig$
DECLARE
  v_row RECORD;
BEGIN
  FOR v_row IN
    SELECT * FROM (VALUES
      -- behoerde
      ('anwendungen.behoerde','zutritt','key-round'),
      ('anwendungen.behoerde','cloud','cloud'),
      ('anwendungen.behoerde','tore','fence'),
      ('anwendungen.behoerde','orientierung','map-pin'),
      ('anwendungen.behoerde','barrierefreiheit','accessibility'),
      -- bidirektionale-video
      ('anwendungen.bidirektionale-video','barrierefreiheit','accessibility'),
      ('anwendungen.bidirektionale-video','pflege','heart-pulse'),
      ('anwendungen.bidirektionale-video','kameras','video'),
      ('anwendungen.bidirektionale-video','datenschutz','shield-check'),
      -- concierge
      ('anwendungen.concierge','pfoertnerplatz','monitor-play'),
      ('anwendungen.concierge','schranken','fence'),
      ('anwendungen.concierge','video','video'),
      ('anwendungen.concierge','besucher','users'),
      ('anwendungen.concierge','vernetzung','network'),
      -- digitale-namensverwaltung
      ('anwendungen.digitale-namensverwaltung','schild','tag'),
      ('anwendungen.digitale-namensverwaltung','fernverwaltung','cloud'),
      ('anwendungen.digitale-namensverwaltung','mieterwechsel','user-cog'),
      ('anwendungen.digitale-namensverwaltung','sondertexte','type'),
      ('anwendungen.digitale-namensverwaltung','integration','plug'),
      -- einfamilienhaus
      ('anwendungen.einfamilienhaus','audioVideo','video'),
      ('anwendungen.einfamilienhaus','design','palette'),
      ('anwendungen.einfamilienhaus','app','smartphone'),
      ('anwendungen.einfamilienhaus','zutritt','key-round'),
      ('anwendungen.einfamilienhaus','bedienung','hand-metal'),
      -- feuerwehr
      ('anwendungen.feuerwehr','alarmierung','siren'),
      ('anwendungen.feuerwehr','tore','fence'),
      ('anwendungen.feuerwehr','zutritt','key-round'),
      ('anwendungen.feuerwehr','video','video'),
      ('anwendungen.feuerwehr','robust','shield'),
      -- feuerwehrdurchsage
      ('anwendungen.feuerwehrdurchsage','norm','shield-check'),
      ('anwendungen.feuerwehrdurchsage','alleWohneinheiten','users'),
      ('anwendungen.feuerwehrdurchsage','bedienung','hand-metal'),
      ('anwendungen.feuerwehrdurchsage','bestand','cable'),
      -- grossanlage
      ('anwendungen.grossanlage','teilnehmer','users'),
      ('anwendungen.grossanlage','display','monitor'),
      ('anwendungen.grossanlage','ip','network'),
      ('anwendungen.grossanlage','zutritt','key-round'),
      ('anwendungen.grossanlage','concierge','user-cog'),
      -- interne-kommunikation
      ('anwendungen.interne-kommunikation','raumZuRaum','message-square'),
      ('anwendungen.interne-kommunikation','durchsage','megaphone'),
      ('anwendungen.interne-kommunikation','automatik','door-open'),
      ('anwendungen.interne-kommunikation','mobil','smartphone'),
      ('anwendungen.interne-kommunikation','integration','plug'),
      -- klinik
      ('anwendungen.klinik','patientenaufruf','user-check'),
      ('anwendungen.klinik','zutritt','clock'),
      ('anwendungen.klinik','video','video'),
      ('anwendungen.klinik','barrierefreiheit','accessibility'),
      ('anwendungen.klinik','hygiene','droplets'),
      -- mehrfamilienhaus
      ('anwendungen.mehrfamilienhaus','vieleEinheiten','users'),
      ('anwendungen.mehrfamilienhaus','namensverwaltung','user-cog'),
      ('anwendungen.mehrfamilienhaus','zutritt','key-round'),
      ('anwendungen.mehrfamilienhaus','video','video'),
      ('anwendungen.mehrfamilienhaus','mobil','smartphone'),
      ('anwendungen.mehrfamilienhaus','vernetzung','network'),
      -- mobile-tuerkommunikation
      ('anwendungen.mobile-tuerkommunikation','smartStickMobile','smartphone'),
      ('anwendungen.mobile-tuerkommunikation','ipGateway','cloud'),
      ('anwendungen.mobile-tuerkommunikation','smartStickDect','radio'),
      ('anwendungen.mobile-tuerkommunikation','smartStickPhone','phone'),
      ('anwendungen.mobile-tuerkommunikation','funkgong','wifi'),
      -- pflege
      ('anwendungen.pflege','barrierefreiheit','accessibility'),
      ('anwendungen.pflege','notruf','bell'),
      ('anwendungen.pflege','zutritt','key-round'),
      ('anwendungen.pflege','infotafeln','monitor'),
      ('anwendungen.pflege','skalierbarkeit','maximize'),
      -- sanierung
      ('anwendungen.sanierung','bestand','cable'),
      ('anwendungen.sanierung','austausch','refresh-cw'),
      ('anwendungen.sanierung','ausbau','layers'),
      ('anwendungen.sanierung','namen','tag'),
      -- schwimmbad
      ('anwendungen.schwimmbad','zutritt','key-round'),
      ('anwendungen.schwimmbad','schliessfach','lock'),
      ('anwendungen.schwimmbad','video','video'),
      ('anwendungen.schwimmbad','orientierung','map-pin'),
      ('anwendungen.schwimmbad','robust','shield'),
      -- zutrittskontrolle-bcm
      ('anwendungen.zutrittskontrolle-bcm','zutritt','key-round'),
      ('anwendungen.zutrittskontrolle-bcm','oeffnung','lock'),
      ('anwendungen.zutrittskontrolle-bcm','zufahrten','car'),
      ('anwendungen.zutrittskontrolle-bcm','fahrstuhl','arrow-up-down'),
      ('anwendungen.zutrittskontrolle-bcm','mobil','smartphone'),
      ('anwendungen.zutrittskontrolle-bcm','reservieren','monitor'),
      ('anwendungen.zutrittskontrolle-bcm','alarm','shield-check'),
      ('anwendungen.zutrittskontrolle-bcm','cloud','cloud')
    ) AS t(page_key, item_key, icon_name)
  LOOP
    INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
    VALUES
      (v_row.page_key, 'anforderungen', v_row.item_key || '.icon', 'de', v_row.icon_name),
      (v_row.page_key, 'anforderungen', v_row.item_key || '.icon', 'en', v_row.icon_name)
    ON CONFLICT DO NOTHING;

    INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
    VALUES
      (v_row.page_key, 'anforderungen', v_row.item_key || '.icon', 'de', true),
      (v_row.page_key, 'anforderungen', v_row.item_key || '.icon', 'en', true)
    ON CONFLICT DO NOTHING;
  END LOOP;
END
$mig$;
