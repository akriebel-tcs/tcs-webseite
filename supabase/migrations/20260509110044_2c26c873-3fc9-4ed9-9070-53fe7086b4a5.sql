-- 1) Drop duplicate updated_at triggers (keep cms_<table>_set_updated_at, drop trg_*)
DROP TRIGGER IF EXISTS trg_cms_pages_updated_at ON public.cms_pages;
DROP TRIGGER IF EXISTS trg_cms_sections_updated_at ON public.cms_sections;
DROP TRIGGER IF EXISTS trg_cms_section_fields_updated_at ON public.cms_section_fields;
DROP TRIGGER IF EXISTS trg_cms_assets_updated_at ON public.cms_assets;

-- 2) Tighten cms_section_fields public read: require active parent section
DROP POLICY IF EXISTS "cms_section_fields public read published" ON public.cms_section_fields;

CREATE POLICY "cms_section_fields public read published"
ON public.cms_section_fields
FOR SELECT
TO anon, authenticated
USING (
  public.cms_page_is_public(page_key)
  AND EXISTS (
    SELECT 1 FROM public.cms_sections s
    WHERE s.page_key = cms_section_fields.page_key
      AND s.section_key = cms_section_fields.section_key
      AND s.is_active = true
  )
);