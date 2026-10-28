
-- Idempotente Migration für die vier neuen Wechselteaser auf P-010
DO $$
DECLARE
  pk text := 'zutrittskontrolle.root';
  rec record;
  base_sort int := 35; -- direkt nach `functions` (sort_order 30)
  step int := 5;
  i int := 0;
BEGIN
  -- 1) Sections anlegen / aktualisieren
  FOR rec IN
    SELECT * FROM (VALUES
      ('teaser_tueren_tore',         'right'),
      ('teaser_fahrstuhlsteuerung',  'left'),
      ('teaser_schliesssysteme',     'right'),
      ('teaser_mobile_door_app',     'left')
    ) AS t(sk, ipos)
  LOOP
    INSERT INTO cms_sections (page_key, section_key, section_type, sort_order, is_active)
    VALUES (pk, rec.sk, 'teaser_2col_v1', base_sort + i * step, true)
    ON CONFLICT (page_key, section_key) DO UPDATE
      SET section_type = EXCLUDED.section_type,
          sort_order   = EXCLUDED.sort_order,
          is_active    = true,
          updated_at   = now();
    i := i + 1;
  END LOOP;

  -- 2) Felder: label, title, text, image_position, background_variant (+ CTA wo passend)
  -- DE/EN-Werte als VALUES-Liste
  FOR rec IN
    SELECT * FROM (VALUES
      -- teaser_tueren_tore
      ('teaser_tueren_tore','label','de','Funktionen'),
      ('teaser_tueren_tore','label','en','Functions'),
      ('teaser_tueren_tore','title','de','1. Zutrittskontrolle für Türen und Tore'),
      ('teaser_tueren_tore','title','en','1. Access control for doors and gates'),
      ('teaser_tueren_tore','text','de','Zuverlässiger Schutz für Außen- und Innenbereiche: Durch den Einsatz moderner Lese- und Eingabegeräte steuert das BCM-System den Zutritt an Türen und Toren sowohl im Außenbereich als auch innerhalb eines Gebäudes sicher und präzise. Die Öffnung erfolgt dabei äußerst komfortabel per Transponderschlüssel oder Zahlencode. Um jeder baulichen Anforderung passgenau gerecht zu werden, umfasst das Portfolio vielfältige Produkte wie elektronische Drückergarnituren, Knaufzylinder und BCM Online-Leser.'),
      ('teaser_tueren_tore','text','en','Reliable protection for outdoor and indoor areas: By using modern reading and input devices, the BCM system controls access at doors and gates – both outdoors and inside a building – securely and precisely. Doors are opened conveniently via transponder key or PIN code. To meet every structural requirement precisely, the portfolio includes a wide range of products such as electronic door handle sets, knob cylinders and BCM online readers.'),
      ('teaser_tueren_tore','image_position','de','right'),
      ('teaser_tueren_tore','image_position','en','right'),
      ('teaser_tueren_tore','background_variant','de','default'),
      ('teaser_tueren_tore','background_variant','en','default'),
      ('teaser_tueren_tore','cta_label','de','Mehr erfahren'),
      ('teaser_tueren_tore','cta_label','en','Learn more'),
      ('teaser_tueren_tore','cta_link','de','/zutrittskontrolle/tueren-tore'),
      ('teaser_tueren_tore','cta_link','en','/zutrittskontrolle/tueren-tore'),

      -- teaser_fahrstuhlsteuerung
      ('teaser_fahrstuhlsteuerung','label','de','Funktionen'),
      ('teaser_fahrstuhlsteuerung','label','en','Functions'),
      ('teaser_fahrstuhlsteuerung','title','de','2. Intelligente Fahrstuhlsteuerung'),
      ('teaser_fahrstuhlsteuerung','title','en','2. Intelligent lift control'),
      ('teaser_fahrstuhlsteuerung','text','de','Gezielte Etagenfreigabe für autorisierte Personen: Um die Sicherheit in mehrstöckigen Immobilien zu erhöhen, lässt sich die Zutrittskontrolle gezielt in Aufzüge integrieren. Besonders in Büro- und Verwaltungsgebäuden, Hotels oder Appartementhäusern kann so der Zugang zu einzelnen Etagen exakt gesteuert werden. Der Etagenzutritt erfolgt in den Fahrstühlen dann sicher und nachvollziehbar per elektronischem Schlüssel anstatt durch einen einfachen Knopfdruck.'),
      ('teaser_fahrstuhlsteuerung','text','en','Targeted floor release for authorised persons: To increase security in multi-storey properties, access control can be integrated directly into lifts. Especially in office and administrative buildings, hotels or apartment houses, access to individual floors can be precisely controlled. Floor access in the lifts is then granted securely and traceably via electronic key instead of by simply pressing a button.'),
      ('teaser_fahrstuhlsteuerung','image_position','de','left'),
      ('teaser_fahrstuhlsteuerung','image_position','en','left'),
      ('teaser_fahrstuhlsteuerung','background_variant','de','default'),
      ('teaser_fahrstuhlsteuerung','background_variant','en','default'),

      -- teaser_schliesssysteme
      ('teaser_schliesssysteme','label','de','Funktionen'),
      ('teaser_schliesssysteme','label','en','Functions'),
      ('teaser_schliesssysteme','title','de','3. Elektronische Schließsysteme für Schränke und Container'),
      ('teaser_schliesssysteme','title','en','3. Electronic locking systems for cabinets and containers'),
      ('teaser_schliesssysteme','text','de','Lückenlose Öffnungskontrolle für Verwahreinrichtungen: Auch abseits klassischer Türen bietet das System optimale Sicherheit durch eine detaillierte Öffnungskontrolle von Verwahreinrichtungen. Im Außenbereich lässt sich der Zugang zu Fahrrad- oder Containerstellplätzen durch elektronische Vorhängeschlösser effektiv steuern. Im Gebäudeinnenbereich werden Schränke, Spinde oder sensible Funktionseinrichtungen wie Serverracks durch intelligente, elektronische Schrankschlösser zuverlässig vor unbefugtem Zugriff geschützt.'),
      ('teaser_schliesssysteme','text','en','Seamless opening control for storage facilities: Beyond classic doors, the system also offers optimal security through detailed opening control of storage facilities. Outdoors, access to bicycle or container parking areas can be effectively controlled with electronic padlocks. Inside the building, cabinets, lockers or sensitive functional facilities such as server racks are reliably protected against unauthorised access by intelligent electronic cabinet locks.'),
      ('teaser_schliesssysteme','image_position','de','right'),
      ('teaser_schliesssysteme','image_position','en','right'),
      ('teaser_schliesssysteme','background_variant','de','default'),
      ('teaser_schliesssysteme','background_variant','en','default'),

      -- teaser_mobile_door_app
      ('teaser_mobile_door_app','label','de','Funktionen'),
      ('teaser_mobile_door_app','label','en','Functions'),
      ('teaser_mobile_door_app','title','de','4. Mobiler Zutritt per Door App oder Anruf'),
      ('teaser_mobile_door_app','title','en','4. Mobile access via Door App or phone call'),
      ('teaser_mobile_door_app','text','de','Das Smartphone als smarter und flexibler Schlüssel: Für maximalen Komfort ermöglicht das BCM-System einen schlüssellosen Zutritt direkt über das mobile Endgerät. Mit der intelligenten BCM DoorApp wird das Smartphone über Bluetooth (BLE) oder NFC zum sicheren Schlüssel für Online- und Offline-Türen. Alternativ bietet das integrierte GSM-Gateway die Möglichkeit, den Zugang ganz bequem über einen einfachen Telefonanruf oder eine Textnachricht von einer registrierten Rufnummer zu gewähren, ohne dass Transponder-Karten nötig sind. Dies ist besonders praktisch, um beispielsweise Besuchern oder Lieferanten für ein begrenztes Zeitfenster Zutritt zu gewähren.'),
      ('teaser_mobile_door_app','text','en','The smartphone as a smart and flexible key: For maximum convenience, the BCM system enables keyless access directly via the mobile device. With the intelligent BCM DoorApp, the smartphone becomes a secure key for online and offline doors via Bluetooth (BLE) or NFC. Alternatively, the integrated GSM gateway makes it possible to grant access conveniently via a simple phone call or text message from a registered phone number, without the need for transponder cards. This is particularly useful, for example, to grant visitors or suppliers access for a limited time window.'),
      ('teaser_mobile_door_app','image_position','de','left'),
      ('teaser_mobile_door_app','image_position','en','left'),
      ('teaser_mobile_door_app','background_variant','de','default'),
      ('teaser_mobile_door_app','background_variant','en','default')
    ) AS t(sk, fk, loc, val)
  LOOP
    INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
    VALUES (pk, rec.sk, rec.fk, rec.loc, rec.val)
    ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE
      SET value = EXCLUDED.value, updated_at = now();
  END LOOP;

  -- 3) Whitelist (Pflicht!) für alle neuen Felder DE/EN
  FOR rec IN
    SELECT sk, fk, loc FROM (VALUES
      ('teaser_tueren_tore'),
      ('teaser_fahrstuhlsteuerung'),
      ('teaser_schliesssysteme'),
      ('teaser_mobile_door_app')
    ) AS s(sk)
    CROSS JOIN (VALUES ('label'),('title'),('text'),('image_position'),('background_variant'),('cta_label'),('cta_link')) AS f(fk)
    CROSS JOIN (VALUES ('de'),('en')) AS l(loc)
  LOOP
    INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
    VALUES (pk, rec.sk, rec.fk, rec.loc, true)
    ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE
      SET is_enabled = true, updated_at = now();
  END LOOP;

  -- 4) Asset-Slots für image (Desktop) verknüpfen
  FOR rec IN
    SELECT * FROM (VALUES
      ('teaser_tueren_tore',         'zutrittskontrolle.root/teaser_tueren_tore/image-desktop.jpg',         'Moderner Gebäudeeingang mit Zutrittsleser (Platzhalter)', 'Modern building entrance with access reader (placeholder)'),
      ('teaser_fahrstuhlsteuerung',  'zutrittskontrolle.root/teaser_fahrstuhlsteuerung/image-desktop.jpg',  'Aufzugslobby mit Steuerpanel (Platzhalter)',              'Elevator lobby with control panel (placeholder)'),
      ('teaser_schliesssysteme',     'zutrittskontrolle.root/teaser_schliesssysteme/image-desktop.jpg',     'Elektronischer Zylinder und Schrankschloss (Platzhalter)', 'Electronic cylinder and cabinet lock (placeholder)'),
      ('teaser_mobile_door_app',     'zutrittskontrolle.root/teaser_mobile_door_app/image-desktop.jpg',     'Smartphone vor modernem Eingang (Platzhalter)',           'Smartphone at a modern entrance (placeholder)')
    ) AS t(sk, storage_path, alt_de, alt_en)
  LOOP
    -- Bestehende aktive Slots dieses Section/Field/Viewport-Tripels deaktivieren (Idempotenz)
    UPDATE cms_assets
      SET is_active = false, updated_at = now()
      WHERE page_key = pk
        AND section_key = rec.sk
        AND field_key = 'image'
        AND viewport = 'desktop'
        AND is_active = true
        AND storage_path <> rec.storage_path;

    INSERT INTO cms_assets (page_key, section_key, asset_role, field_key, viewport, storage_path, public_url, alt_de, alt_en, file_name, mime_type, is_active)
    VALUES (pk, rec.sk, 'image', 'image', 'desktop', rec.storage_path,
            'https://uvkubrrljyzfvbvejepl.supabase.co/storage/v1/object/public/cms-assets/' || rec.storage_path,
            rec.alt_de, rec.alt_en,
            split_part(rec.storage_path, '/', 3),
            'image/jpeg', true)
    ON CONFLICT (page_key, section_key, field_key, viewport) WHERE is_active DO UPDATE
      SET storage_path = EXCLUDED.storage_path,
          public_url   = EXCLUDED.public_url,
          alt_de       = EXCLUDED.alt_de,
          alt_en       = EXCLUDED.alt_en,
          mime_type    = EXCLUDED.mime_type,
          updated_at   = now();
  END LOOP;

  -- 5) Alte Sammel-Section deaktivieren (Daten bleiben erhalten)
  UPDATE cms_sections
    SET is_active = false, updated_at = now()
    WHERE page_key = pk AND section_key = 'functions' AND is_active = true;
END $$;
