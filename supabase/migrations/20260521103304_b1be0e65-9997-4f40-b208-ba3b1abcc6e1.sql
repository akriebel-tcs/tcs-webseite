-- Biometrie: produkte-Section aktivieren (war seit Karten-Migration is_active=false),
-- benefits-Section deaktivieren (Inhalt jetzt 1:1 als produkte_item_* modelliert,
-- doppelte Wahrheit vermeiden — Spiegelregel).
UPDATE public.cms_sections
   SET is_active = true, updated_at = now()
 WHERE page_key = 'zutrittskontrolle.biometrie'
   AND section_key = 'produkte'
   AND is_active = false;

UPDATE public.cms_sections
   SET is_active = false, updated_at = now()
 WHERE page_key = 'zutrittskontrolle.biometrie'
   AND section_key = 'benefits'
   AND is_active = true;