-- Hero-Dubletten gebaeudemanagement.root + zutrittskontrolle.root bereinigen.
-- Andres Bild (field_key='image_desktop', storage_path .../hero-*-desktop.png) ist der aktuelle Stand.
-- Renderer liest field_key='image' -> wir übernehmen Andres storage_path in den aktiven 'image'-Desktop-Eintrag
-- und deaktivieren danach den 'image_desktop'-Slot. Mobile bleibt unverändert.
-- Idempotent: WHERE-Klauseln matchen nur, wenn der alte Zustand vorliegt.

-- 1) gebaeudemanagement.root: aktiven image/desktop auf Andres Pfad umbiegen
UPDATE public.cms_assets
   SET storage_path = 'gebaeudemanagement.root/hero-gebaeudemanagement-desktop.png',
       public_url = NULL,
       file_name = 'hero-gebaeudemanagement-desktop.png',
       updated_at = now()
 WHERE page_key = 'gebaeudemanagement.root'
   AND section_key = 'hero'
   AND field_key = 'image'
   AND viewport = 'desktop'
   AND is_active = true
   AND storage_path <> 'gebaeudemanagement.root/hero-gebaeudemanagement-desktop.png';

-- 2) zutrittskontrolle.root: gleiches Spiel
UPDATE public.cms_assets
   SET storage_path = 'zutrittskontrolle.root/hero-zutrittskontrolle-desktop.png',
       public_url = NULL,
       file_name = 'hero-zutrittskontrolle-desktop.png',
       updated_at = now()
 WHERE page_key = 'zutrittskontrolle.root'
   AND section_key = 'hero'
   AND field_key = 'image'
   AND viewport = 'desktop'
   AND is_active = true
   AND storage_path <> 'zutrittskontrolle.root/hero-zutrittskontrolle-desktop.png';

-- 3) image_desktop-Slots deaktivieren (toter Slot, vom Renderer nicht gelesen)
UPDATE public.cms_assets
   SET is_active = false,
       updated_at = now()
 WHERE page_key IN ('gebaeudemanagement.root','zutrittskontrolle.root')
   AND section_key = 'hero'
   AND field_key = 'image_desktop'
   AND is_active = true;