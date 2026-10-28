-- Idempotenter Upsert ohne Unique-Constraint: per WHERE NOT EXISTS.
-- Wenn ein (page_key, section_key, field_key) schon aktiv ist, wird übersprungen.

WITH new_assets(page_key, section_key, field_key, public_url, alt_de, alt_en) AS (VALUES
  -- ===== anwendungen.root / categories =====
  ('anwendungen.root','categories','wohnen.einfamilienhaus.image','https://www.tcsag.de/fileadmin/_processed_/1/8/csm_EFH_321_91aaa17860.jpg','Einfamilienhaus','Single-family house'),
  ('anwendungen.root','categories','wohnen.mehrfamilienhaus.image','https://www.tcsag.de/fileadmin/_processed_/c/f/csm_MFH_321_4cbdd23151.jpg','Mehrfamilienhaus','Multi-family house'),
  ('anwendungen.root','categories','wohnen.grossanlage.image','https://www.tcsag.de/fileadmin/_processed_/1/f/csm_Grossanlagen_321_5681a83fb7.jpg','Großanlage','Large building'),
  ('anwendungen.root','categories','bildung.schule.image','https://www.tcsag.de/fileadmin/_processed_/7/d/csm_Schule_321_04c30623f4.jpg','Schule','School'),
  ('anwendungen.root','categories','bildung.kita.image','https://www.tcsag.de/fileadmin/_processed_/1/c/csm_Kita_321_a0b0cf962c.jpg','Kindertagesstätte','Kindergarten'),
  ('anwendungen.root','categories','bildung.wohnheim.image','https://www.tcsag.de/fileadmin/_processed_/d/8/csm_Wohnheim_321_20e725ae18.jpg','Wohnheim','Dormitory'),
  ('anwendungen.root','categories','gesundheit.pflege.image','https://www.tcsag.de/fileadmin/_processed_/2/a/csm_Pflege_321_ae09930569.jpg','Pflegeeinrichtung','Care facility'),
  ('anwendungen.root','categories','gesundheit.klinik.image','https://www.tcsag.de/fileadmin/_processed_/9/0/csm_Praxen_321_e8af418bf3.jpg','Klinik','Clinic'),
  ('anwendungen.root','categories','oeffentlich.behoerde.image','https://www.tcsag.de/fileadmin/_processed_/1/f/csm_BehoerdenAemter_321_1db4597e39.jpg','Behörde','Public authority'),
  ('anwendungen.root','categories','oeffentlich.feuerwehr.image','https://www.tcsag.de/fileadmin/_processed_/5/4/csm_Feuerwehr_321_597b8e9b42.jpg','Feuerwehr','Fire station'),
  ('anwendungen.root','categories','oeffentlich.schwimmbad.image','https://www.tcsag.de/fileadmin/_processed_/7/d/csm_Baeder_321_65bda09973.jpg','Schwimmbad','Swimming pool'),
  -- ===== anwendungen.root / systemfunktionen =====
  ('anwendungen.root','systemfunktionen','concierge.image','https://www.tcsag.de/fileadmin/_processed_/1/f/csm_Grossanlagen_321_5681a83fb7.jpg','Concierge','Concierge'),
  ('anwendungen.root','systemfunktionen','interneKommunikation.image','https://www.tcsag.de/fileadmin/_processed_/9/0/csm_Praxen_321_e8af418bf3.jpg','Interne Kommunikation','Internal communication'),
  ('anwendungen.root','systemfunktionen','namensverwaltung.image','https://www.tcsag.de/fileadmin/_processed_/c/f/csm_MFH_321_4cbdd23151.jpg','Digitale Namensverwaltung','Digital name management'),
  ('anwendungen.root','systemfunktionen','feuerwehrdurchsage.image','https://www.tcsag.de/fileadmin/_processed_/5/4/csm_Feuerwehr_321_597b8e9b42.jpg','Feuerwehrdurchsage','Fire department announcement'),
  ('anwendungen.root','systemfunktionen','bidirektionalesVideo.image','https://www.tcsag.de/fileadmin/_processed_/2/a/csm_Pflege_321_ae09930569.jpg','Bidirektionales Video','Bidirectional video'),
  -- ===== anwendungen.root / referenzen =====
  ('anwendungen.root','referenzen','pulse-berlin.image','https://tcsag-web.lovable.app/referenzen/pulse-berlin.jpg','Pulse Berlin','Pulse Berlin'),
  ('anwendungen.root','referenzen','weidt-park-corner.image','https://tcsag-web.lovable.app/referenzen/weidt-park-corner.jpg','Weidt Park Corner','Weidt Park Corner'),
  ('anwendungen.root','referenzen','fritztower.image','https://tcsag-web.lovable.app/referenzen/fritztower.jpg','Fritztower','Fritztower'),
  ('anwendungen.root','referenzen','haupttelegraphenamt.image','https://tcsag-web.lovable.app/referenzen/haupttelegraphenamt.jpg','Haupttelegraphenamt','Main telegraph office'),
  ('anwendungen.root','referenzen','spichern-2.image','https://tcsag-web.lovable.app/referenzen/spichern-2.jpg','Spichern 2','Spichern 2'),
  ('anwendungen.root','referenzen','thulestrasse.image','https://tcsag-web.lovable.app/referenzen/thulestrasse.jpg','Thulestraße','Thulestrasse'),
  -- ===== anwendungen.gesundheitseinrichtungen / cards =====
  ('anwendungen.gesundheitseinrichtungen','cards','pflege.image','https://www.tcsag.de/fileadmin/_processed_/2/a/csm_Pflege_321_ae09930569.jpg','Pflegeeinrichtung','Care facility'),
  ('anwendungen.gesundheitseinrichtungen','cards','praxen.image','https://www.tcsag.de/fileadmin/_processed_/9/0/csm_Praxen_321_e8af418bf3.jpg','Praxen','Practices'),
  -- ===== anwendungen.oeffentliche-hand / cards =====
  ('anwendungen.oeffentliche-hand','cards','behoerden.image','https://www.tcsag.de/fileadmin/_processed_/1/f/csm_BehoerdenAemter_321_1db4597e39.jpg','Behörden & Ämter','Authorities & offices'),
  ('anwendungen.oeffentliche-hand','cards','feuerwehr.image','https://www.tcsag.de/fileadmin/_processed_/5/4/csm_Feuerwehr_321_597b8e9b42.jpg','Feuerwehr','Fire station'),
  ('anwendungen.oeffentliche-hand','cards','baeder.image','https://www.tcsag.de/fileadmin/_processed_/7/d/csm_Baeder_321_65bda09973.jpg','Bäder','Pools'),
  -- ===== anwendungen.bildungseinrichtungen / einrichtungen =====
  ('anwendungen.bildungseinrichtungen','einrichtungen','kita.image','https://www.tcsag.de/fileadmin/_processed_/1/c/csm_Kita_321_a0b0cf962c.jpg','Kindertagesstätte','Kindergarten'),
  ('anwendungen.bildungseinrichtungen','einrichtungen','schule.image','https://www.tcsag.de/fileadmin/_processed_/7/d/csm_Schule_321_04c30623f4.jpg','Schule','School'),
  ('anwendungen.bildungseinrichtungen','einrichtungen','wohnheim.image','https://www.tcsag.de/fileadmin/_processed_/d/8/csm_Wohnheim_321_20e725ae18.jpg','Wohnheim','Dormitory'),
  -- ===== eingangssysteme.funktionalitaet / items =====
  ('eingangssysteme.funktionalitaet','items','tuerkommunikation.image','https://image.jimcdn.com/app/cms/image/transf/none/path/s71e84816ff1d31aa/image/i5918c8a28eadd996/version/1601995225/image.jpg','Türkommunikation','Door communication'),
  ('eingangssysteme.funktionalitaet','items','accessControl.image','https://image.jimcdn.com/app/cms/image/transf/none/path/s71e84816ff1d31aa/image/ic3376a084f87ef77/version/1598874395/image.jpg','Zutrittskontrolle','Access control'),
  ('eingangssysteme.funktionalitaet','items','verwahrung.image','https://image.jimcdn.com/app/cms/image/transf/none/path/s71e84816ff1d31aa/image/if7285f1bbaa94a95/version/1598984999/image.jpg','Verwahrung','Storage'),
  ('eingangssysteme.funktionalitaet','items','gebaeudesicherheit.image','https://image.jimcdn.com/app/cms/image/transf/none/path/s71e84816ff1d31aa/image/ib8678f29408b4f52/version/1601995260/image.jpg','Gebäudesicherheit','Building security'),
  ('eingangssysteme.funktionalitaet','items','wayfinding.image','https://image.jimcdn.com/app/cms/image/transf/none/path/s71e84816ff1d31aa/image/i6fcf802c27ba120d/version/1599658096/image.jpg','Wegeleitung','Wayfinding'),
  ('eingangssysteme.funktionalitaet','items','beleuchtung.image','https://image.jimcdn.com/app/cms/image/transf/none/path/s71e84816ff1d31aa/image/i5c5fdebd0856fd2d/version/1599640917/image.jpg','Beleuchtung','Lighting'),
  ('eingangssysteme.funktionalitaet','items','service.image','https://image.jimcdn.com/app/cms/image/transf/none/path/s71e84816ff1d31aa/image/i7fcd278b1e697f60/version/1599828775/image.jpg','Service','Service')
)
INSERT INTO public.cms_assets (page_key, section_key, field_key, asset_role, public_url, storage_path, alt_de, alt_en, locale, is_active, sort_order)
SELECT n.page_key, n.section_key, n.field_key, 'image', n.public_url, '', n.alt_de, n.alt_en, NULL, true, 0
FROM new_assets n
WHERE NOT EXISTS (
  SELECT 1 FROM public.cms_assets x
  WHERE x.page_key = n.page_key
    AND x.section_key = n.section_key
    AND x.field_key = n.field_key
    AND x.is_active = true
);