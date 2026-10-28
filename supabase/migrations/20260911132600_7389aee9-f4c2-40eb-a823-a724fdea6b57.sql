-- Stufe 1: DB additiv für Polnisch (pl) öffnen

-- 1. Sprach-CHECKs erweitern
ALTER TABLE public.cms_section_fields
  DROP CONSTRAINT IF EXISTS cms_section_fields_locale_check;
ALTER TABLE public.cms_section_fields
  ADD CONSTRAINT cms_section_fields_locale_check
  CHECK (locale = ANY (ARRAY['de'::text, 'en'::text, 'pl'::text]));

ALTER TABLE public.cms_admin_editable_fields
  DROP CONSTRAINT IF EXISTS cms_admin_editable_fields_locale_chk;
ALTER TABLE public.cms_admin_editable_fields
  ADD CONSTRAINT cms_admin_editable_fields_locale_chk
  CHECK (locale = ANY (ARRAY['de'::text, 'en'::text, 'pl'::text]));

ALTER TABLE public.cms_assets
  DROP CONSTRAINT IF EXISTS cms_assets_locale_check;
ALTER TABLE public.cms_assets
  ADD CONSTRAINT cms_assets_locale_check
  CHECK (locale IS NULL OR locale = ANY (ARRAY['de'::text, 'en'::text, 'pl'::text]));

-- 2. Spaltenbasierte Sprachfelder ergänzen (nullable, rein additiv)
ALTER TABLE public.cms_pages ADD COLUMN IF NOT EXISTS title_pl text;
ALTER TABLE public.cms_navigation_nodes ADD COLUMN IF NOT EXISTS label_pl text;
ALTER TABLE public.cms_navigation_nodes ADD COLUMN IF NOT EXISTS description_pl text;
ALTER TABLE public.cms_assets ADD COLUMN IF NOT EXISTS alt_pl text;
ALTER TABLE public.cms_assets ADD COLUMN IF NOT EXISTS alt_text_pl text;