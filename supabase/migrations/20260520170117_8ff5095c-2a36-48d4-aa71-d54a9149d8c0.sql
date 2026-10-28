DO $mig$
DECLARE
  legal_url  text := 'https://uvkubrrljyzfvbvejepl.supabase.co/storage/v1/object/public/cms-assets/_placeholders/legal-hero-1747756800.jpg';
  ref_url    text := 'https://uvkubrrljyzfvbvejepl.supabase.co/storage/v1/object/public/cms-assets/_placeholders/referenzprojekte-hero-1747756800.jpg';
  pages text[] := ARRAY['legal.impressum','legal.datenschutz','legal.agb','anwendungen.referenzprojekte'];
  pk text;
  vp text;
  url text;
  alt_de_v text;
  alt_en_v text;
  storage_p text;
BEGIN
  -- 1) Hero-Sections sicherstellen (hero_v1, aktiv, sort_order=0)
  FOREACH pk IN ARRAY pages LOOP
    INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active)
    VALUES (pk, 'hero', 'hero_v1', 0, true)
    ON CONFLICT DO NOTHING;

    UPDATE public.cms_sections
       SET section_type = 'hero_v1',
           is_active = true,
           sort_order = 0,
           updated_at = now()
     WHERE page_key = pk AND section_key = 'hero';
  END LOOP;

  -- 2) Bestehende Hero-Image-Zeilen für diese Seiten zuerst deaktivieren,
  --    damit der eindeutige aktive Slot konfliktfrei neu gesetzt werden kann.
  UPDATE public.cms_assets
     SET is_active = false, updated_at = now()
   WHERE page_key = ANY(pages)
     AND section_key = 'hero'
     AND field_key = 'image';

  -- 3) Neue aktive Slots desktop/tablet/mobile je Seite anlegen oder aktualisieren
  FOREACH pk IN ARRAY pages LOOP
    IF pk = 'anwendungen.referenzprojekte' THEN
      url := ref_url;
      alt_de_v := 'Symbolbild Referenzprojekte';
      alt_en_v := 'Placeholder image for reference projects';
    ELSE
      url := legal_url;
      alt_de_v := 'Symbolbild Rechtliches';
      alt_en_v := 'Placeholder image for legal information';
    END IF;

    FOREACH vp IN ARRAY ARRAY['desktop','tablet','mobile'] LOOP
      storage_p := '_placeholders/' || split_part(url, '/_placeholders/', 2);

      IF EXISTS (
        SELECT 1 FROM public.cms_assets
         WHERE page_key = pk AND section_key = 'hero'
           AND field_key = 'image' AND viewport = vp
      ) THEN
        UPDATE public.cms_assets
           SET storage_path = storage_p,
               public_url   = url,
               asset_role   = 'image',
               alt_de       = alt_de_v,
               alt_en       = alt_en_v,
               alt_text_de  = alt_de_v,
               alt_text_en  = alt_en_v,
               is_active    = true,
               updated_at   = now()
         WHERE page_key = pk AND section_key = 'hero'
           AND field_key = 'image' AND viewport = vp;
      ELSE
        INSERT INTO public.cms_assets
          (page_key, section_key, field_key, asset_role, viewport,
           storage_path, public_url,
           alt_de, alt_en, alt_text_de, alt_text_en,
           is_active, sort_order)
        VALUES
          (pk, 'hero', 'image', 'image', vp,
           storage_p, url,
           alt_de_v, alt_en_v, alt_de_v, alt_en_v,
           true, 0);
      END IF;
    END LOOP;
  END LOOP;

  -- 4) Whitelist-Einträge für hero.image in DE+EN
  FOREACH pk IN ARRAY pages LOOP
    INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
    VALUES
      (pk, 'hero', 'image', 'de', true),
      (pk, 'hero', 'image', 'en', true)
    ON CONFLICT DO NOTHING;
  END LOOP;
END
$mig$;