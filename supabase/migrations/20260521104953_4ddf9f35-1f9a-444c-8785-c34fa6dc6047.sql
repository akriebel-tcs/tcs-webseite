-- Zufahrtskontrolle: Hero-Bild gegen Schranken-/Übersichtsbild der Eltern-
-- seite tauschen und fehlende Produktkarten-Bilder (Kfz-Kamera, UHF-Leser)
-- aus den vorhandenen Asset-URLs der Eltern-Seite spiegeln.
--
-- Idempotent: wenn der Slot (page_key, section_key, field_key, viewport)
-- aktiv existiert, wird die URL aktualisiert; sonst wird neu eingefügt.
-- Storage bleibt unangetastet — wir re-usen die existierenden public_urls.

DO $$
DECLARE
  v_hero_url   text;
  v_kfz_url    text;
  v_uhf_url    text;
BEGIN
  SELECT public_url INTO v_hero_url
    FROM public.cms_assets
   WHERE page_key   = 'zutrittskontrolle.zufahrten-parkplaetze'
     AND section_key= 'hero'
     AND field_key  = 'image'
     AND viewport   = 'desktop'
     AND is_active
   LIMIT 1;

  SELECT public_url INTO v_kfz_url
    FROM public.cms_assets
   WHERE page_key   = 'zutrittskontrolle.zufahrten-parkplaetze'
     AND section_key= 'card_kfz'
     AND field_key  = 'image'
     AND viewport   = 'desktop'
     AND is_active
   LIMIT 1;

  SELECT public_url INTO v_uhf_url
    FROM public.cms_assets
   WHERE page_key   = 'zutrittskontrolle.zufahrten-parkplaetze'
     AND section_key= 'card_uhf_leser'
     AND field_key  = 'image'
     AND viewport   = 'desktop'
     AND is_active
   LIMIT 1;

  -- Hero: gegen Schranken-Hero der Eltern-Seite tauschen.
  IF v_hero_url IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.cms_assets
       WHERE page_key='zutrittskontrolle.zufahrtskontrolle'
         AND section_key='hero' AND field_key='image' AND viewport='desktop' AND is_active
    ) THEN
      UPDATE public.cms_assets
         SET public_url = v_hero_url,
             storage_path = v_hero_url,
             alt_text_de = COALESCE(NULLIF(alt_text_de,''), 'Schranke mit Zufahrtskontrolle'),
             alt_text_en = COALESCE(NULLIF(alt_text_en,''), 'Barrier with vehicle access control'),
             updated_at = now()
       WHERE page_key='zutrittskontrolle.zufahrtskontrolle'
         AND section_key='hero' AND field_key='image' AND viewport='desktop' AND is_active;
    ELSE
      INSERT INTO public.cms_assets
        (page_key, section_key, field_key, asset_role, viewport, storage_path, public_url,
         alt_text_de, alt_text_en, sort_order, is_active)
      VALUES
        ('zutrittskontrolle.zufahrtskontrolle','hero','image','image','desktop',
         v_hero_url, v_hero_url,
         'Schranke mit Zufahrtskontrolle','Barrier with vehicle access control',
         0, true);
    END IF;
  END IF;

  -- Produktkarte 1: Kfz-Kennzeichenerkennung
  IF v_kfz_url IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.cms_assets
       WHERE page_key='zutrittskontrolle.zufahrtskontrolle'
         AND section_key='produkte_item_1' AND field_key='image' AND viewport='desktop' AND is_active
    ) THEN
      UPDATE public.cms_assets
         SET public_url = v_kfz_url, storage_path = v_kfz_url, updated_at = now()
       WHERE page_key='zutrittskontrolle.zufahrtskontrolle'
         AND section_key='produkte_item_1' AND field_key='image' AND viewport='desktop' AND is_active;
    ELSE
      INSERT INTO public.cms_assets
        (page_key, section_key, field_key, asset_role, viewport, storage_path, public_url,
         alt_text_de, alt_text_en, sort_order, is_active)
      VALUES
        ('zutrittskontrolle.zufahrtskontrolle','produkte_item_1','image','image','desktop',
         v_kfz_url, v_kfz_url,
         'IP-Kamera zur Kfz-Kennzeichenerkennung von TCS',
         'TCS IP Camera for License Plate Recognition',
         0, true);
    END IF;
  END IF;

  -- Produktkarte 2: UHF-Leser
  IF v_uhf_url IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.cms_assets
       WHERE page_key='zutrittskontrolle.zufahrtskontrolle'
         AND section_key='produkte_item_2' AND field_key='image' AND viewport='desktop' AND is_active
    ) THEN
      UPDATE public.cms_assets
         SET public_url = v_uhf_url, storage_path = v_uhf_url, updated_at = now()
       WHERE page_key='zutrittskontrolle.zufahrtskontrolle'
         AND section_key='produkte_item_2' AND field_key='image' AND viewport='desktop' AND is_active;
    ELSE
      INSERT INTO public.cms_assets
        (page_key, section_key, field_key, asset_role, viewport, storage_path, public_url,
         alt_text_de, alt_text_en, sort_order, is_active)
      VALUES
        ('zutrittskontrolle.zufahrtskontrolle','produkte_item_2','image','image','desktop',
         v_uhf_url, v_uhf_url,
         'UHF-Leser von TCS','TCS UHF Reader',
         0, true);
    END IF;
  END IF;
END $$;