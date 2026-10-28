
-- cms-light-pilot-schema-1: complete schema, triggers, storage bucket, seed

-- 1. Add missing column value_json to cms_section_fields
ALTER TABLE public.cms_section_fields ADD COLUMN IF NOT EXISTS value_json jsonb NULL;

-- 2. Add FK from cms_section_fields -> cms_sections (page_key, section_key)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cms_section_fields_section_fkey'
  ) THEN
    ALTER TABLE public.cms_section_fields
      ADD CONSTRAINT cms_section_fields_section_fkey
      FOREIGN KEY (page_key, section_key)
      REFERENCES public.cms_sections(page_key, section_key)
      ON DELETE CASCADE;
  END IF;
END $$;

-- 3. cms_assets: add missing columns (field_key, file_name, mime_type, alt_de, alt_en)
ALTER TABLE public.cms_assets ADD COLUMN IF NOT EXISTS field_key text NULL;
ALTER TABLE public.cms_assets ADD COLUMN IF NOT EXISTS file_name text NULL;
ALTER TABLE public.cms_assets ADD COLUMN IF NOT EXISTS mime_type text NULL;
ALTER TABLE public.cms_assets ADD COLUMN IF NOT EXISTS alt_de text NULL;
ALTER TABLE public.cms_assets ADD COLUMN IF NOT EXISTS alt_en text NULL;

-- Backfill new alt_de/alt_en from legacy alt_text_de/en if present
UPDATE public.cms_assets SET alt_de = COALESCE(alt_de, alt_text_de),
                             alt_en = COALESCE(alt_en, alt_text_en)
 WHERE alt_de IS NULL OR alt_en IS NULL;

-- Rename storage_path to be NOT NULL going forward (keep existing nullable for safety; only enforce on new rows via trigger? Skip strict NOT NULL to avoid breaking; spec says not null)
-- Enforce NOT NULL for storage_path (table is empty)
ALTER TABLE public.cms_assets ALTER COLUMN storage_path SET NOT NULL;
ALTER TABLE public.cms_assets ALTER COLUMN asset_role SET NOT NULL;

-- 4. updated_at triggers
DROP TRIGGER IF EXISTS trg_cms_pages_updated_at ON public.cms_pages;
CREATE TRIGGER trg_cms_pages_updated_at BEFORE UPDATE ON public.cms_pages
  FOR EACH ROW EXECUTE FUNCTION public.cms_set_updated_at();

DROP TRIGGER IF EXISTS trg_cms_sections_updated_at ON public.cms_sections;
CREATE TRIGGER trg_cms_sections_updated_at BEFORE UPDATE ON public.cms_sections
  FOR EACH ROW EXECUTE FUNCTION public.cms_set_updated_at();

DROP TRIGGER IF EXISTS trg_cms_section_fields_updated_at ON public.cms_section_fields;
CREATE TRIGGER trg_cms_section_fields_updated_at BEFORE UPDATE ON public.cms_section_fields
  FOR EACH ROW EXECUTE FUNCTION public.cms_set_updated_at();

DROP TRIGGER IF EXISTS trg_cms_assets_updated_at ON public.cms_assets;
CREATE TRIGGER trg_cms_assets_updated_at BEFORE UPDATE ON public.cms_assets
  FOR EACH ROW EXECUTE FUNCTION public.cms_set_updated_at();

-- 5. Storage bucket cms-assets (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('cms-assets', 'cms-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Public read policy for cms-assets bucket; no write policies (write deferred to admin stage)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
      AND policyname='cms_assets bucket public read'
  ) THEN
    CREATE POLICY "cms_assets bucket public read"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'cms-assets');
  END IF;
END $$;

-- 6. Seed: sections + fields for anwendungen.pflege (idempotent)
INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active) VALUES
  ('anwendungen.pflege', 'hero', 'hero', 10, true),
  ('anwendungen.pflege', 'answer-first', 'answer-first', 20, true),
  ('anwendungen.pflege', 'intro', 'intro', 30, true)
ON CONFLICT (page_key, section_key) DO NOTHING;

INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES
  ('anwendungen.pflege','hero','headline','de','[Pilot] Pflege – Türkommunikation und Zutritt'),
  ('anwendungen.pflege','hero','headline','en','[Pilot] Care – Door communication and access'),
  ('anwendungen.pflege','hero','intro','de','[Pilot] Sichere, barrierearme Lösungen für Pflegeeinrichtungen.'),
  ('anwendungen.pflege','hero','intro','en','[Pilot] Safe, low-barrier solutions for care facilities.'),
  ('anwendungen.pflege','answer-first','text','de','[Pilot] TCS bietet abgestimmte Systeme für Pflege: Türkommunikation, Zutritt, Notruf-Anbindung.'),
  ('anwendungen.pflege','answer-first','text','en','[Pilot] TCS provides coordinated systems for care: door communication, access, emergency call integration.'),
  ('anwendungen.pflege','intro','text','de','[Pilot] Einleitungstext für die Pilotseite Pflege. Wird später redaktionell ersetzt.'),
  ('anwendungen.pflege','intro','text','en','[Pilot] Intro text for the care pilot page. To be replaced editorially.')
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
