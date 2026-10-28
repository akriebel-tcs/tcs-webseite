
DO $$
DECLARE
  v_mz_products_id uuid;
  v_zp_products_id uuid;
BEGIN
  SELECT id INTO v_mz_products_id
    FROM public.cms_sections
   WHERE page_key = 'zutrittskontrolle.mobiler-zutritt' AND section_key = 'products';

  SELECT id INTO v_zp_products_id
    FROM public.cms_sections
   WHERE page_key = 'zutrittskontrolle.zufahrten-parkplaetze' AND section_key = 'products';

  IF v_mz_products_id IS NULL OR v_zp_products_id IS NULL THEN
    RAISE EXCEPTION 'Parent products section missing (mz=%, zp=%)', v_mz_products_id, v_zp_products_id;
  END IF;

  -- Mobiler Zutritt: 2 Karten
  INSERT INTO public.cms_sections (page_key, section_key, section_type, parent_section_id, sort_order, is_active)
  VALUES
    ('zutrittskontrolle.mobiler-zutritt', 'card_door_app',    'card_v1', v_mz_products_id, 0, true),
    ('zutrittskontrolle.mobiler-zutritt', 'card_gsm_gateway', 'card_v1', v_mz_products_id, 1, true)
  ON CONFLICT DO NOTHING;

  -- Zufahrten/Parkplätze: 5 Karten
  INSERT INTO public.cms_sections (page_key, section_key, section_type, parent_section_id, sort_order, is_active)
  VALUES
    ('zutrittskontrolle.zufahrten-parkplaetze', 'card_bcm_leser',   'card_v1', v_zp_products_id, 0, true),
    ('zutrittskontrolle.zufahrten-parkplaetze', 'card_handsender',  'card_v1', v_zp_products_id, 1, true),
    ('zutrittskontrolle.zufahrten-parkplaetze', 'card_kfz',         'card_v1', v_zp_products_id, 2, true),
    ('zutrittskontrolle.zufahrten-parkplaetze', 'card_uhf_leser',   'card_v1', v_zp_products_id, 3, true),
    ('zutrittskontrolle.zufahrten-parkplaetze', 'card_gsm_gateway', 'card_v1', v_zp_products_id, 4, true)
  ON CONFLICT DO NOTHING;
END $$;

-- Felder einfügen (idempotent)
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
VALUES
  -- Mobiler Zutritt: doorApp
  ('zutrittskontrolle.mobiler-zutritt','card_door_app','title','de','BCM DoorApp'),
  ('zutrittskontrolle.mobiler-zutritt','card_door_app','title','en','BCM DoorApp'),
  ('zutrittskontrolle.mobiler-zutritt','card_door_app','subtitle','de','Smartphone-Zutritt'),
  ('zutrittskontrolle.mobiler-zutritt','card_door_app','subtitle','en','Smartphone access'),
  ('zutrittskontrolle.mobiler-zutritt','card_door_app','description','de','Das Smartphone ist der Schlüssel: Mühelose Türöffnung per BLE, NFC oder Fernöffnung. Mit Smart-Home-Integration, temporärer Zugangsfreigabe für Gäste und biometrischer Authentifizierung.'),
  ('zutrittskontrolle.mobiler-zutritt','card_door_app','description','en','The smartphone is the key: effortless door opening via BLE, NFC or remote opening. With smart home integration, temporary guest access and biometric authentication.'),
  ('zutrittskontrolle.mobiler-zutritt','card_door_app','href','de',''),
  ('zutrittskontrolle.mobiler-zutritt','card_door_app','href','en',''),
  -- Mobiler Zutritt: gsmGateway
  ('zutrittskontrolle.mobiler-zutritt','card_gsm_gateway','title','de','GSM-Gateway'),
  ('zutrittskontrolle.mobiler-zutritt','card_gsm_gateway','title','en','GSM gateway'),
  ('zutrittskontrolle.mobiler-zutritt','card_gsm_gateway','subtitle','de','Zutritt per Telefonanruf'),
  ('zutrittskontrolle.mobiler-zutritt','card_gsm_gateway','subtitle','en','Access by phone call'),
  ('zutrittskontrolle.mobiler-zutritt','card_gsm_gateway','description','de','Die ideale Lösung für zeitlich begrenzten Zutritt: Der Benutzer erhält Zugang per Anruf oder SMS an die im GSM-Gateway gespeicherte Nummer – ohne Schlüssel oder Transponder.'),
  ('zutrittskontrolle.mobiler-zutritt','card_gsm_gateway','description','en','The ideal solution for time-limited access: the user gains access via call or SMS to the number stored in the GSM gateway – without keys or transponders.'),
  ('zutrittskontrolle.mobiler-zutritt','card_gsm_gateway','href','de',''),
  ('zutrittskontrolle.mobiler-zutritt','card_gsm_gateway','href','en',''),

  -- Zufahrten: bcmLeser
  ('zutrittskontrolle.zufahrten-parkplaetze','card_bcm_leser','title','de','BCM-Leser'),
  ('zutrittskontrolle.zufahrten-parkplaetze','card_bcm_leser','title','en','BCM reader'),
  ('zutrittskontrolle.zufahrten-parkplaetze','card_bcm_leser','subtitle','de','RFID-Technologie'),
  ('zutrittskontrolle.zufahrten-parkplaetze','card_bcm_leser','subtitle','en','RFID technology'),
  ('zutrittskontrolle.zufahrten-parkplaetze','card_bcm_leser','description','de','Zukunftssichere RFID-Lesegeräte, die Smartphones, Karten, Tags oder PIN unterstützen – für flexible Zufahrtskontrolle.'),
  ('zutrittskontrolle.zufahrten-parkplaetze','card_bcm_leser','description','en','Future-proof RFID readers that support smartphones, cards, tags or PIN – for flexible access control.'),
  ('zutrittskontrolle.zufahrten-parkplaetze','card_bcm_leser','href','de','/zutrittskontrolle/bcm-online-leser'),
  ('zutrittskontrolle.zufahrten-parkplaetze','card_bcm_leser','href','en','/zutrittskontrolle/bcm-online-leser'),
  -- Zufahrten: handsender
  ('zutrittskontrolle.zufahrten-parkplaetze','card_handsender','title','de','Handsender'),
  ('zutrittskontrolle.zufahrten-parkplaetze','card_handsender','title','en','Hand transmitter'),
  ('zutrittskontrolle.zufahrten-parkplaetze','card_handsender','subtitle','de','Komfortzugang'),
  ('zutrittskontrolle.zufahrten-parkplaetze','card_handsender','subtitle','en','Convenient access'),
  ('zutrittskontrolle.zufahrten-parkplaetze','card_handsender','description','de','Ein einfacher Knopfdruck ermöglicht den bequemen Zugang zu Parkbereichen – mit kopiergeschütztem, AES-128-verschlüsseltem Handsender.'),
  ('zutrittskontrolle.zufahrten-parkplaetze','card_handsender','description','en','A simple press of a button enables convenient access to parking areas – with a copy-protected, AES-128-encrypted hand transmitter.'),
  ('zutrittskontrolle.zufahrten-parkplaetze','card_handsender','href','de','/zutrittskontrolle/bcm-handsender'),
  ('zutrittskontrolle.zufahrten-parkplaetze','card_handsender','href','en','/zutrittskontrolle/bcm-handsender'),
  -- Zufahrten: kfz
  ('zutrittskontrolle.zufahrten-parkplaetze','card_kfz','title','de','KFZ-Kennzeichenerkennung'),
  ('zutrittskontrolle.zufahrten-parkplaetze','card_kfz','title','en','Vehicle licence plate recognition'),
  ('zutrittskontrolle.zufahrten-parkplaetze','card_kfz','subtitle','de','Automatische Zufahrt'),
  ('zutrittskontrolle.zufahrten-parkplaetze','card_kfz','subtitle','en','Automatic access'),
  ('zutrittskontrolle.zufahrten-parkplaetze','card_kfz','description','de','Bequemes Öffnen mit intelligenter Kennzeichenerkennung per IP-Kamera – mit einstellbaren Smart-Parametern bei bis zu 30 km/h.'),
  ('zutrittskontrolle.zufahrten-parkplaetze','card_kfz','description','en','Convenient opening with intelligent licence plate recognition via IP camera – with adjustable smart parameters at speeds of up to 30 km/h.'),
  ('zutrittskontrolle.zufahrten-parkplaetze','card_kfz','href','de',''),
  ('zutrittskontrolle.zufahrten-parkplaetze','card_kfz','href','en',''),
  -- Zufahrten: uhfLeser
  ('zutrittskontrolle.zufahrten-parkplaetze','card_uhf_leser','title','de','UHF-Leser'),
  ('zutrittskontrolle.zufahrten-parkplaetze','card_uhf_leser','title','en','UHF reader'),
  ('zutrittskontrolle.zufahrten-parkplaetze','card_uhf_leser','subtitle','de','Großer Leseabstand'),
  ('zutrittskontrolle.zufahrten-parkplaetze','card_uhf_leser','subtitle','en','Long read range'),
  ('zutrittskontrolle.zufahrten-parkplaetze','card_uhf_leser','description','de','Wenn Sicherheit, schnelle Bedienung und großer Leserabstand entscheidend sind – ideal für hohe Durchfahrtsfrequenz.'),
  ('zutrittskontrolle.zufahrten-parkplaetze','card_uhf_leser','description','en','When security, fast operation and a long read range are decisive – ideal for high traffic frequencies.'),
  ('zutrittskontrolle.zufahrten-parkplaetze','card_uhf_leser','href','de',''),
  ('zutrittskontrolle.zufahrten-parkplaetze','card_uhf_leser','href','en',''),
  -- Zufahrten: gsmGateway
  ('zutrittskontrolle.zufahrten-parkplaetze','card_gsm_gateway','title','de','GSM-Gateway'),
  ('zutrittskontrolle.zufahrten-parkplaetze','card_gsm_gateway','title','en','GSM gateway'),
  ('zutrittskontrolle.zufahrten-parkplaetze','card_gsm_gateway','subtitle','de','Fernöffnung per Anruf'),
  ('zutrittskontrolle.zufahrten-parkplaetze','card_gsm_gateway','subtitle','en','Remote opening by call'),
  ('zutrittskontrolle.zufahrten-parkplaetze','card_gsm_gateway','description','de','Zuverlässige Fernöffnung des Tores durch Rufnummernerkennung – ohne zusätzliche Hardware am Fahrzeug.'),
  ('zutrittskontrolle.zufahrten-parkplaetze','card_gsm_gateway','description','en','Reliable remote opening of the gate via caller ID recognition – without additional hardware on the vehicle.'),
  ('zutrittskontrolle.zufahrten-parkplaetze','card_gsm_gateway','href','de',''),
  ('zutrittskontrolle.zufahrten-parkplaetze','card_gsm_gateway','href','en','')
ON CONFLICT DO NOTHING;

-- Whitelist: Felder im Admin freigeben
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT page_key, section_key, field_key, locale, true
  FROM public.cms_section_fields
 WHERE (page_key = 'zutrittskontrolle.mobiler-zutritt'      AND section_key IN ('card_door_app','card_gsm_gateway'))
    OR (page_key = 'zutrittskontrolle.zufahrten-parkplaetze' AND section_key IN ('card_bcm_leser','card_handsender','card_kfz','card_uhf_leser','card_gsm_gateway'))
ON CONFLICT DO NOTHING;
