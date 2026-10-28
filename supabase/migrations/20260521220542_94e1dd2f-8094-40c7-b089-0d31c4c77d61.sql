
-- ============================================================================
-- P-049 gebaeudemanagement.root: B-647…B-651 → teaser_2col_v1
-- Idempotent. Texte aus functions__* werden nur beim ersten Lauf gesetzt
-- (ON CONFLICT DO NOTHING), damit Admin-Pflege nicht überschrieben wird.
-- ============================================================================

DO $migration$
DECLARE
  v_page_key text := 'gebaeudemanagement.root';
  v_teasers jsonb := jsonb_build_array(
    jsonb_build_object(
      'section_key', 'teaser_digitale_namensanzeige',
      'sort_order', 30,
      'image_position', 'right',
      'cta_link', '/gebaeudemanagement/digitale-namensanzeige',
      'src', 'functions__digitaleNamensanzeige',
      'storage_path', 'gebaeudemanagement.root/teaser_digitale_namensanzeige/image/desktop/teaser-digitale-namensanzeige.jpg',
      'alt_de', 'Digitale Namensanzeige am Eingang eines modernen Wohngebäudes (Platzhalter)',
      'alt_en', 'Digital name display at the entrance of a modern residential building (placeholder)'
    ),
    jsonb_build_object(
      'section_key', 'teaser_zufahrt_parkraum',
      'sort_order', 40,
      'image_position', 'left',
      'cta_link', '/zutrittskontrolle/zufahrten-parkplaetze',
      'src', 'functions__zufahrtssteuerung',
      'storage_path', 'gebaeudemanagement.root/teaser_zufahrt_parkraum/image/desktop/teaser-zufahrt-parkraum.jpg',
      'alt_de', 'Schranke an einer modernen Gebäudezufahrt (Platzhalter)',
      'alt_en', 'Barrier at a modern building driveway (placeholder)'
    ),
    jsonb_build_object(
      'section_key', 'teaser_digital_signage',
      'sort_order', 50,
      'image_position', 'right',
      'cta_link', '/gebaeudemanagement/digital-signage',
      'src', 'functions__digitalSignage',
      'storage_path', 'gebaeudemanagement.root/teaser_digital_signage/image/desktop/teaser-digital-signage.jpg',
      'alt_de', 'Digitales Infoboard in einer modernen Gebäudelobby (Platzhalter)',
      'alt_en', 'Digital infoboard in a modern building lobby (placeholder)'
    ),
    jsonb_build_object(
      'section_key', 'teaser_reservieren_buchen',
      'sort_order', 60,
      'image_position', 'left',
      'cta_link', '/gebaeudemanagement/reservieren-buchen',
      'src', 'functions__reservierenBuchen',
      'storage_path', 'gebaeudemanagement.root/teaser_reservieren_buchen/image/desktop/teaser-reservieren-buchen.jpg',
      'alt_de', 'Gemeinschaftsraum mit Buchungsterminal im Gebäude (Platzhalter)',
      'alt_en', 'Shared room with booking terminal inside a building (placeholder)'
    ),
    jsonb_build_object(
      'section_key', 'teaser_alarmanlagenkopplung',
      'sort_order', 70,
      'image_position', 'right',
      'cta_link', '/gebaeudemanagement/alarmanlagenkopplung',
      'src', 'functions__alarmanlagenkopplung',
      'storage_path', 'gebaeudemanagement.root/teaser_alarmanlagenkopplung/image/desktop/teaser-alarmanlagenkopplung.jpg',
      'alt_de', 'Sicherheitstechnik mit Alarmbedienteilen an einer Wand (Platzhalter)',
      'alt_en', 'Security technology with alarm keypads on a wall (placeholder)'
    )
  );
  v jsonb;
  v_sec_key text;
  v_src_key text;
  v_title_de text;
  v_title_en text;
  v_text_de text;
  v_text_en text;
  v_public_url text := 'https://uvkubrrljyzfvbvejepl.supabase.co/storage/v1/object/public/cms-assets/';
BEGIN
  -- 1) Sections anlegen / auf teaser_2col_v1 aktualisieren
  FOR v IN SELECT * FROM jsonb_array_elements(v_teasers)
  LOOP
    v_sec_key := v->>'section_key';
    INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active)
    VALUES (v_page_key, v_sec_key, 'teaser_2col_v1', (v->>'sort_order')::int, true)
    ON CONFLICT (page_key, section_key) DO UPDATE
      SET section_type = 'teaser_2col_v1',
          sort_order   = EXCLUDED.sort_order,
          is_active    = true,
          updated_at   = now();
  END LOOP;

  -- 2) Felder befüllen (DO NOTHING — Admin-Pflege bleibt erhalten)
  FOR v IN SELECT * FROM jsonb_array_elements(v_teasers)
  LOOP
    v_sec_key := v->>'section_key';
    v_src_key := v->>'src';

    -- Texte aus den alten functions__*-Karten 1:1 lesen
    SELECT value INTO v_title_de FROM public.cms_section_fields
      WHERE page_key=v_page_key AND section_key=v_src_key AND field_key='title' AND locale='de';
    SELECT value INTO v_title_en FROM public.cms_section_fields
      WHERE page_key=v_page_key AND section_key=v_src_key AND field_key='title' AND locale='en';
    SELECT value INTO v_text_de FROM public.cms_section_fields
      WHERE page_key=v_page_key AND section_key=v_src_key AND field_key='description' AND locale='de';
    SELECT value INTO v_text_en FROM public.cms_section_fields
      WHERE page_key=v_page_key AND section_key=v_src_key AND field_key='description' AND locale='en';

    INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES
      (v_page_key, v_sec_key, 'label',              'de', 'Funktion'),
      (v_page_key, v_sec_key, 'label',              'en', 'Function'),
      (v_page_key, v_sec_key, 'title',              'de', COALESCE(v_title_de, '')),
      (v_page_key, v_sec_key, 'title',              'en', COALESCE(v_title_en, '')),
      (v_page_key, v_sec_key, 'text',               'de', COALESCE(v_text_de, '')),
      (v_page_key, v_sec_key, 'text',               'en', COALESCE(v_text_en, '')),
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
  FOR v IN SELECT * FROM jsonb_array_elements(v_teasers)
  LOOP
    v_sec_key := v->>'section_key';
    INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
    SELECT v_page_key, v_sec_key, fk, lc, true
    FROM unnest(ARRAY['label','title','text','cta_label','cta_link','image_position','background_variant']) AS fk,
         unnest(ARRAY['de','en']) AS lc
    ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE SET is_enabled = true;
  END LOOP;

  -- 4) Asset-Slots (Desktop-Viewport) — idempotent über storage_path-Match
  FOR v IN SELECT * FROM jsonb_array_elements(v_teasers)
  LOOP
    v_sec_key := v->>'section_key';
    IF NOT EXISTS (
      SELECT 1 FROM public.cms_assets
      WHERE page_key=v_page_key
        AND section_key=v_sec_key
        AND field_key='image'
        AND viewport='desktop'
        AND storage_path = v->>'storage_path'
    ) THEN
      INSERT INTO public.cms_assets
        (page_key, section_key, asset_role, field_key, viewport, locale,
         storage_path, public_url, alt_text_de, alt_text_en, alt_de, alt_en,
         sort_order, is_active)
      VALUES
        (v_page_key, v_sec_key, 'image', 'image', 'desktop', NULL,
         v->>'storage_path',
         v_public_url || (v->>'storage_path'),
         v->>'alt_de', v->>'alt_en', v->>'alt_de', v->>'alt_en',
         0, true);
    END IF;
  END LOOP;

  -- 5) Alte Karten-Sections deaktivieren (Inhalte bleiben in DB).
  UPDATE public.cms_sections
     SET is_active = false, updated_at = now()
   WHERE page_key = v_page_key
     AND section_key IN (
       'functions',
       'functions__digitaleNamensanzeige',
       'functions__zufahrtssteuerung',
       'functions__digitalSignage',
       'functions__reservierenBuchen',
       'functions__alarmanlagenkopplung'
     )
     AND is_active = true;
END
$migration$;
