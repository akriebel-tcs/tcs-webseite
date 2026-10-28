-- 1) Eyebrow im Hero setzen (bisher leer; Anzeige kam aus dem Code)
UPDATE public.cms_section_fields
   SET value = 'Anwendungslösung', updated_at = now()
 WHERE page_key = 'anwendungen.bidirektionale-video' AND section_key = 'hero'
   AND field_key = 'eyebrow' AND locale = 'de'
   AND coalesce(value, '') = '';

UPDATE public.cms_section_fields
   SET value = 'Application solution', updated_at = now()
 WHERE page_key = 'anwendungen.bidirektionale-video' AND section_key = 'hero'
   AND field_key = 'eyebrow' AND locale = 'en'
   AND coalesce(value, '') = '';

-- 2) Alt-Texte an den aktiven Hero-Assets nachtragen
UPDATE public.cms_assets
   SET alt_de = 'Bidirektionale Video-Türsprechanlage von TCS – Videokommunikation in beide Richtungen an der Tür',
       alt_en = 'TCS bidirectional video intercom – two-way video communication at the door',
       updated_at = now()
 WHERE page_key = 'anwendungen.bidirektionale-video'
   AND section_key = 'hero' AND field_key = 'image'
   AND is_active = true
   AND coalesce(alt_de, '') = '';

-- 3) Hero-Felder im Admin freischalten (idempotent)
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT 'anwendungen.bidirektionale-video', 'hero', f.field_key, l.locale, true
  FROM (VALUES ('eyebrow'), ('headline'), ('subline'), ('subheadline')) AS f(field_key),
       (VALUES ('de'), ('en')) AS l(locale)
 WHERE NOT EXISTS (
   SELECT 1 FROM public.cms_admin_editable_fields e
    WHERE e.page_key = 'anwendungen.bidirektionale-video'
      AND e.section_key = 'hero'
      AND e.field_key = f.field_key
      AND e.locale = l.locale
 );

UPDATE public.cms_admin_editable_fields
   SET is_enabled = true, updated_at = now()
 WHERE page_key = 'anwendungen.bidirektionale-video' AND section_key = 'hero'
   AND field_key IN ('eyebrow', 'headline', 'subline', 'subheadline');