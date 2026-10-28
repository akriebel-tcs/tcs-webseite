-- Idempotent: nur die zwei fehlerhaften Hero-Asset-Zuordnungen deaktivieren.
-- Bilder selbst bleiben im Storage (gehören zu ihren echten Seiten).
UPDATE public.cms_assets
   SET is_active = false
 WHERE page_key = 'zutrittskontrolle.bcm-mini-cloud'
   AND section_key = 'hero'
   AND field_key = 'image'
   AND public_url LIKE '%bcm-schrankschloss%'
   AND is_active = true;

UPDATE public.cms_assets
   SET is_active = false
 WHERE page_key = 'zutrittskontrolle.zutrittssoftware'
   AND section_key = 'hero'
   AND field_key = 'image'
   AND public_url LIKE '%bcm-door-app%'
   AND is_active = true;