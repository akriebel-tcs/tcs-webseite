DO $$
DECLARE
  rec record;
  slugs text[][] := ARRAY[
    ['vorkonfigurierte-pakete', '/catalog/vorkonfigurierte-pakete.jpg', 'Vorkonfigurierte Pakete'],
    ['aussenstationen',         '/catalog/aussenstationen.jpg',         'Außenstationen'],
    ['ami-module',              '/catalog/ami-module.jpg',              'AMI Module'],
    ['innenstationen',          '/catalog/innenstationen.jpg',          'Innenstationen'],
    ['zutrittskontrolle-bcm',   '/catalog/zutrittskontrolle-bcm.jpg',   'Zutrittskontrolle / BCM'],
    ['mobile-tuerkommunikation','/catalog/mobile-tuerkommunikation.jpg','Mobile Türkommunikation'],
    ['netzgeraete-versorgung',  '/catalog/netzgeraete-versorgung.jpg',  'Netzgeräte & Versorgung'],
    ['zubehoer-montage',        '/catalog/zubehoer-montage.jpg',        'Zubehör & Montage']
  ];
  i int;
BEGIN
  FOR i IN 1 .. array_length(slugs, 1) LOOP
    DECLARE
      v_section text := 'filter-grid.' || slugs[i][1];
      v_url     text := slugs[i][2];
      v_alt     text := slugs[i][3];
    BEGIN
      -- Vorhandenen aktiven Thumbnail-Eintrag aktualisieren oder neu anlegen.
      IF EXISTS (
        SELECT 1 FROM cms_assets
        WHERE page_key = 'produkte.tuerkommunikation'
          AND section_key = v_section
          AND field_key = 'thumbnail'
      ) THEN
        UPDATE cms_assets
           SET public_url = v_url,
               storage_path = v_url,
               alt_de = COALESCE(alt_de, v_alt),
               alt_en = COALESCE(alt_en, v_alt),
               is_active = true,
               updated_at = now()
         WHERE page_key = 'produkte.tuerkommunikation'
           AND section_key = v_section
           AND field_key = 'thumbnail';
      ELSE
        INSERT INTO cms_assets (
          page_key, section_key, asset_role, field_key,
          storage_path, public_url,
          alt_de, alt_en, viewport, is_active, sort_order
        ) VALUES (
          'produkte.tuerkommunikation', v_section, 'thumbnail', 'thumbnail',
          v_url, v_url,
          v_alt, v_alt, 'desktop', true, 0
        );
      END IF;
    END;
  END LOOP;
END $$;