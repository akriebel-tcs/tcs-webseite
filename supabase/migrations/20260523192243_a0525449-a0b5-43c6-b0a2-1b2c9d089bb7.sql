
DO $$
DECLARE
  benefits_id_mz UUID;
  benefits_id_fs UUID;
  benefits_id_zp UUID;
  rec RECORD;
BEGIN
  SELECT id INTO benefits_id_mz FROM public.cms_sections WHERE page_key='zutrittskontrolle.mobiler-zutritt' AND section_key='benefits';
  SELECT id INTO benefits_id_fs FROM public.cms_sections WHERE page_key='zutrittskontrolle.fahrstuhlsteuerung' AND section_key='benefits';
  SELECT id INTO benefits_id_zp FROM public.cms_sections WHERE page_key='zutrittskontrolle.zufahrten-parkplaetze' AND section_key='benefits';

  FOR rec IN
    SELECT * FROM (VALUES
      -- mobiler-zutritt
      ('zutrittskontrolle.mobiler-zutritt', 'card_benefit_komfort',         benefits_id_mz, 10, 'smartphone',  'Schlüsselloser Komfort',         'Keyless convenience',         'Türöffnung per App, BLE, NFC oder Telefonanruf – ohne Transponder oder Schlüssel.',                 'Open doors via app, BLE, NFC or phone call – without transponders or keys.'),
      ('zutrittskontrolle.mobiler-zutritt', 'card_benefit_gaestezugang',    benefits_id_mz, 20, 'users',       'Gästezugang in Sekunden',        'Guest access in seconds',     'Temporäre Zutrittsrechte direkt in der App vergeben – ideal für Besucher und Lieferanten.',         'Grant temporary access rights directly in the app – ideal for visitors and suppliers.'),
      ('zutrittskontrolle.mobiler-zutritt', 'card_benefit_biometrie',       benefits_id_mz, 30, 'shield',      'Biometrische Sicherheit',        'Biometric security',          'Fingerabdruck oder Face ID als zusätzliche Authentifizierung vor der Türöffnung.',                  'Fingerprint or Face ID as additional authentication before opening the door.'),
      ('zutrittskontrolle.mobiler-zutritt', 'card_benefit_benachrichtigung',benefits_id_mz, 40, 'bell',        'Echtzeit-Benachrichtigungen',    'Real-time notifications',     'Push-Mitteilungen bei Warnungen oder kritischen Vorfällen direkt auf dem Smartphone.',              'Push messages for warnings or critical incidents directly on your smartphone.'),
      -- fahrstuhlsteuerung
      ('zutrittskontrolle.fahrstuhlsteuerung', 'card_benefit_etagenfreigabe',benefits_id_fs, 10, 'building-2', 'Individuelle Etagenfreigabe',    'Individual floor release',    'Jede Etage einzeln steuerbar – für maximale Sicherheit in sensiblen Bereichen.',                    'Every floor can be controlled separately – for maximum security in sensitive areas.'),
      ('zutrittskontrolle.fahrstuhlsteuerung', 'card_benefit_skalierbar',    benefits_id_fs, 20, 'layers',     'Skalierbar & modular',           'Scalable & modular',          'Von 4 bis über 100 Etagen: Relaismodule lassen sich beliebig kaskadieren.',                         'From 4 to more than 100 floors: relay modules can be cascaded as needed.'),
      ('zutrittskontrolle.fahrstuhlsteuerung', 'card_benefit_onlineOffline', benefits_id_fs, 30, 'wifi',       'Online & Offline',               'Online & offline',            'Echtzeitsteuerung über Online-Leser oder autarker Betrieb mit Offline-Komponenten.',                'Real-time control via online readers or autonomous operation with offline components.'),
      ('zutrittskontrolle.fahrstuhlsteuerung', 'card_benefit_integration',   benefits_id_fs, 40, 'shield-check','Nahtlose BCM-Integration',      'Seamless BCM integration',    'Vollständig in das BCM-Ökosystem integriert – eine Software für Türen, Tore und Aufzüge.',          'Fully integrated into the BCM ecosystem – one software for doors, gates and lifts.'),
      -- zufahrten-parkplaetze
      ('zutrittskontrolle.zufahrten-parkplaetze', 'card_benefit_modular',     benefits_id_zp, 10, 'layers',     'Modularer Aufbau',               'Modular design',              'Von der Einzelschranke bis zum komplexen Parksystem skalierbar.',                                    'Scalable from a single barrier to a complex parking system.'),
      ('zutrittskontrolle.zufahrten-parkplaetze', 'card_benefit_integration', benefits_id_zp, 20, 'wrench',     'Einfache Integration',           'Easy integration',            'Verschiedene Identifikationsmedien – Smartphone, Karte, Tag, PIN oder Kennzeichen.',                'Various identification media – smartphone, card, tag, PIN or licence plate.'),
      ('zutrittskontrolle.zufahrten-parkplaetze', 'card_benefit_verwaltung',  benefits_id_zp, 30, 'monitor',    'Zentrale Verwaltung',            'Central management',          'Alle Zufahrten werden über die webbasierte BCM-Software verwaltet.',                                'All access points are managed via the web-based BCM software.'),
      ('zutrittskontrolle.zufahrten-parkplaetze', 'card_benefit_sicherheit',  benefits_id_zp, 40, 'shield-check','Höchste Sicherheit',            'Maximum security',            'AES-128-Verschlüsselung und kopiergeschützte Handsender für maximalen Schutz.',                     'AES-128 encryption and copy-protected hand transmitters for maximum protection.')
    ) AS t(page_key, section_key, parent_id, sort_order, icon, title_de, title_en, desc_de, desc_en)
  LOOP
    -- Section anlegen (idempotent)
    INSERT INTO public.cms_sections (page_key, section_key, section_type, parent_section_id, sort_order, is_active)
    VALUES (rec.page_key, rec.section_key, 'card_v1', rec.parent_id, rec.sort_order, true)
    ON CONFLICT (page_key, section_key) DO NOTHING;

    -- Felder (idempotent, überschreibt nicht)
    INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES
      (rec.page_key, rec.section_key, 'icon',        'de', rec.icon),
      (rec.page_key, rec.section_key, 'icon',        'en', rec.icon),
      (rec.page_key, rec.section_key, 'title',       'de', rec.title_de),
      (rec.page_key, rec.section_key, 'title',       'en', rec.title_en),
      (rec.page_key, rec.section_key, 'description', 'de', rec.desc_de),
      (rec.page_key, rec.section_key, 'description', 'en', rec.desc_en)
    ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

    -- Whitelist
    INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled) VALUES
      (rec.page_key, rec.section_key, 'icon',        'de', true),
      (rec.page_key, rec.section_key, 'icon',        'en', true),
      (rec.page_key, rec.section_key, 'title',       'de', true),
      (rec.page_key, rec.section_key, 'title',       'en', true),
      (rec.page_key, rec.section_key, 'description', 'de', true),
      (rec.page_key, rec.section_key, 'description', 'en', true)
    ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
  END LOOP;
END $$;
