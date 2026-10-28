
-- ============================================================================
-- P-041 eingangssysteme.root: 7 discover-Karten → teaser_2col_v1
-- Idempotent. Texte aus discover.items.* werden 1:1 übernommen (DO NOTHING).
-- Bilder: bestehende externe jimcdn-URLs als public_url (keine Neugenerierung).
-- ============================================================================
DO $migration$
DECLARE
  v_page_key text := 'eingangssysteme.root';
  v_teasers jsonb := jsonb_build_array(
    jsonb_build_object(
      'section_key','teaser_design','sort_order',31,'image_position','right',
      'cta_link','/entry-system/design','src_key','design',
      'image_url','https://image.jimcdn.com/app/cms/image/transf/dimension=1070x10000:format=jpg/path/s71e84816ff1d31aa/image/ic930827c146175d1/version/1627991792/entry-au%C3%9Fenstation-in-edelstahl-zur-t%C3%BCrkommunikation-beschilderung-und-mit-briefk%C3%A4sten.jpg',
      'storage_path','external/jimcdn/eingangssysteme-design.jpg',
      'alt_de','Entry Außenstation in Edelstahl zur Türkommunikation, Beschilderung und mit Briefkästen',
      'alt_en','Entry outdoor station in stainless steel for door communication, signage and with letterboxes'
    ),
    jsonb_build_object(
      'section_key','teaser_funktionalitaet','sort_order',32,'image_position','left',
      'cta_link','/entry-system/funktionalitaet','src_key','funktionalitaet',
      'image_url','https://image.jimcdn.com/app/cms/image/transf/dimension=1070x10000:format=jpg/path/s71e84816ff1d31aa/image/i8dfa3f4c076d30cc/version/1627991905/eine-gro%C3%9Fe-entry-station-in-edelstahl-mit-t%C3%BCrkommunikation-ruftaster-strassennamen-hausnummer-paketbox-briefk%C3%A4sten-brandschutzinstallation.jpg',
      'storage_path','external/jimcdn/eingangssysteme-funktionalitaet.jpg',
      'alt_de','Große Entry Station in Edelstahl mit Türkommunikation, Ruftaster, Straßennamen, Hausnummer, Paketbox, Briefkästen und Brandschutzinstallation',
      'alt_en','Large Entry station in stainless steel with door communication, call button, street name, house number, parcel box, letterboxes and fire protection installation'
    ),
    jsonb_build_object(
      'section_key','teaser_material','sort_order',33,'image_position','right',
      'cta_link','/entry-system/material','src_key','material',
      'image_url','https://image.jimcdn.com/app/cms/image/transf/dimension=1070x10000:format=jpg/path/s71e84816ff1d31aa/image/i8f1861e3fd54b858/version/1601995383/entry-eingangssysteme-in-verschiedenen-materialien-wie-aluminium-edelstahl-messing-bronze-baubronze-mineralwerkstoff-oder-lackiert-in-ral-farben.jpg',
      'storage_path','external/jimcdn/eingangssysteme-material.jpg',
      'alt_de','Entry Eingangssysteme in verschiedenen Materialien wie Aluminium, Edelstahl, Messing, Bronze, Baubronze, Mineralwerkstoff oder lackiert in RAL-Farben',
      'alt_en','Entry entrance systems in various materials such as aluminium, stainless steel, brass, bronze, architectural bronze, solid surface or coated in RAL colours'
    ),
    jsonb_build_object(
      'section_key','teaser_integrationsformen','sort_order',34,'image_position','left',
      'cta_link','/entry-system/integrationsformen','src_key','integrationsformen',
      'image_url','https://image.jimcdn.com/app/cms/image/transf/dimension=1070x10000:format=jpg/path/s71e84816ff1d31aa/image/ia7764999111a8cf5/version/1601995614/entry-metallbauinstallationen-in-allen-montageformen-aufputz-unterputz-wandb%C3%BCndig-freistehende-s%C3%A4ule-stele.jpg',
      'storage_path','external/jimcdn/eingangssysteme-integrationsformen.jpg',
      'alt_de','Entry Metallbauinstallationen in allen Montageformen: Aufputz, Unterputz, wandbündig, freistehende Säule, Stele',
      'alt_en','Entry metalwork installations in all mounting forms: surface-mounted, flush-mounted, wall-flush, free-standing column, stele'
    ),
    jsonb_build_object(
      'section_key','teaser_referenzen','sort_order',35,'image_position','right',
      'cta_link','/entry-system/referenzen','src_key','referenzen',
      'image_url','https://image.jimcdn.com/app/cms/image/transf/none/path/s71e84816ff1d31aa/image/i0e14c73c2f6a2761/version/1676910056/image.png',
      'storage_path','external/jimcdn/eingangssysteme-referenzen.png',
      'alt_de','Beispiele für realisierte Entry Installationen in Wohn- und Gewerbebauten',
      'alt_en','Examples of realised Entry installations in residential and commercial buildings'
    ),
    jsonb_build_object(
      'section_key','teaser_standards','sort_order',36,'image_position','left',
      'cta_link','/entry-system/standards','src_key','standards',
      'image_url','https://image.jimcdn.com/app/cms/image/transf/dimension=1070x10000:format=jpg/path/s71e84816ff1d31aa/image/ie08da8482a48571f/version/1627991248/eine-entry-au%C3%9Fenstation-zur-t%C3%BCrkommunikation-der-sprechanlage-vor-der-t%C3%BCr-als-ausf%C3%BChrung-in-edelstahl.jpg',
      'storage_path','external/jimcdn/eingangssysteme-standards.jpg',
      'alt_de','Entry Außenstation zur Türkommunikation der Sprechanlage vor der Tür, Ausführung in Edelstahl',
      'alt_en','Entry outdoor station for door communication of the intercom in front of the door, stainless steel version'
    ),
    jsonb_build_object(
      'section_key','teaser_beratung','sort_order',37,'image_position','right',
      'cta_link','/entry-system/beratung','src_key','beratung',
      'image_url','https://image.jimcdn.com/app/cms/image/transf/dimension=519x10000:format=jpg/path/s71e84816ff1d31aa/image/i3a905a7580c440ff/version/1627991749/entry-integriert-alle-funktionen-am-eingang-in-ein-modernes-design.jpg',
      'storage_path','external/jimcdn/eingangssysteme-beratung.jpg',
      'alt_de','Entry integriert alle Funktionen am Eingang in ein modernes Design',
      'alt_en','Entry integrates all functions at the entrance into a modern design'
    )
  );
  v jsonb;
  v_sec_key text;
  v_src_key text;
  v_title_de text; v_title_en text;
  v_sub_de text;   v_sub_en text;
  v_desc_de text;  v_desc_en text;
BEGIN
  -- 1) Sections anlegen / auf teaser_2col_v1 setzen
  FOR v IN SELECT * FROM jsonb_array_elements(v_teasers) LOOP
    v_sec_key := v->>'section_key';
    INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active)
    VALUES (v_page_key, v_sec_key, 'teaser_2col_v1', (v->>'sort_order')::int, true)
    ON CONFLICT (page_key, section_key) DO UPDATE
      SET section_type = 'teaser_2col_v1',
          sort_order   = EXCLUDED.sort_order,
          is_active    = true,
          updated_at   = now();
  END LOOP;

  -- 2) Felder 1:1 aus discover.items.<key>.{title,subtitle,description} übernehmen
  FOR v IN SELECT * FROM jsonb_array_elements(v_teasers) LOOP
    v_sec_key := v->>'section_key';
    v_src_key := v->>'src_key';

    SELECT value INTO v_title_de FROM public.cms_section_fields
      WHERE page_key=v_page_key AND section_key='discover'
        AND field_key='items.'||v_src_key||'.title' AND locale='de';
    SELECT value INTO v_title_en FROM public.cms_section_fields
      WHERE page_key=v_page_key AND section_key='discover'
        AND field_key='items.'||v_src_key||'.title' AND locale='en';
    SELECT value INTO v_sub_de FROM public.cms_section_fields
      WHERE page_key=v_page_key AND section_key='discover'
        AND field_key='items.'||v_src_key||'.subtitle' AND locale='de';
    SELECT value INTO v_sub_en FROM public.cms_section_fields
      WHERE page_key=v_page_key AND section_key='discover'
        AND field_key='items.'||v_src_key||'.subtitle' AND locale='en';
    SELECT value INTO v_desc_de FROM public.cms_section_fields
      WHERE page_key=v_page_key AND section_key='discover'
        AND field_key='items.'||v_src_key||'.description' AND locale='de';
    SELECT value INTO v_desc_en FROM public.cms_section_fields
      WHERE page_key=v_page_key AND section_key='discover'
        AND field_key='items.'||v_src_key||'.description' AND locale='en';

    INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES
      (v_page_key, v_sec_key, 'label',              'de', COALESCE(v_sub_de,'')),
      (v_page_key, v_sec_key, 'label',              'en', COALESCE(v_sub_en,'')),
      (v_page_key, v_sec_key, 'title',              'de', COALESCE(v_title_de,'')),
      (v_page_key, v_sec_key, 'title',              'en', COALESCE(v_title_en,'')),
      (v_page_key, v_sec_key, 'text',               'de', COALESCE(v_desc_de,'')),
      (v_page_key, v_sec_key, 'text',               'en', COALESCE(v_desc_en,'')),
      (v_page_key, v_sec_key, 'cta_label',          'de', 'Mehr erfahren'),
      (v_page_key, v_sec_key, 'cta_label',          'en', 'Learn more'),
      (v_page_key, v_sec_key, 'cta_link',           'de', v->>'cta_link'),
      (v_page_key, v_sec_key, 'cta_link',           'en', v->>'cta_link'),
      (v_page_key, v_sec_key, 'image_position',     'de', v->>'image_position'),
      (v_page_key, v_sec_key, 'image_position',     'en', v->>'image_position'),
      (v_page_key, v_sec_key, 'background_variant', 'de', 'default'),
      (v_page_key, v_sec_key, 'background_variant', 'en', 'default')
    ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
  END LOOP;

  -- 3) Whitelist für Admin-Pflege
  FOR v IN SELECT * FROM jsonb_array_elements(v_teasers) LOOP
    v_sec_key := v->>'section_key';
    INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
    SELECT v_page_key, v_sec_key, fk, lc, true
    FROM unnest(ARRAY['label','title','text','cta_label','cta_link','image_position','background_variant']) AS fk,
         unnest(ARRAY['de','en']) AS lc
    ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE SET is_enabled = true;
  END LOOP;

  -- 4) Bestehende Bild-URLs als cms_assets übernehmen (idempotent über storage_path)
  FOR v IN SELECT * FROM jsonb_array_elements(v_teasers) LOOP
    v_sec_key := v->>'section_key';
    IF NOT EXISTS (
      SELECT 1 FROM public.cms_assets
      WHERE page_key=v_page_key AND section_key=v_sec_key
        AND field_key='image' AND viewport='desktop'
        AND storage_path = v->>'storage_path'
    ) THEN
      INSERT INTO public.cms_assets
        (page_key, section_key, asset_role, field_key, viewport, locale,
         storage_path, public_url, alt_text_de, alt_text_en, alt_de, alt_en,
         sort_order, is_active)
      VALUES
        (v_page_key, v_sec_key, 'image', 'image', 'desktop', NULL,
         v->>'storage_path', v->>'image_url',
         v->>'alt_de', v->>'alt_en', v->>'alt_de', v->>'alt_en',
         0, true);
    END IF;
  END LOOP;

  -- 5) Alte Sammel-Section `discover` deaktivieren (Inhalte bleiben in DB).
  UPDATE public.cms_sections
     SET is_active = false, updated_at = now()
   WHERE page_key = v_page_key
     AND section_key = 'discover'
     AND is_active = true;
END
$migration$;
