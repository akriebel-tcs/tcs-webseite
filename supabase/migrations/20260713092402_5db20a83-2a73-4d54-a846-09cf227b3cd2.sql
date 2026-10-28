DROP POLICY IF EXISTS "cms_admin_editable_fields read" ON public.cms_admin_editable_fields;

CREATE POLICY "cms_admin_editable_fields read published active"
ON public.cms_admin_editable_fields
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.cms_sections s
    JOIN public.cms_pages p ON p.page_key = s.page_key
    WHERE s.page_key = cms_admin_editable_fields.page_key
      AND s.section_key = cms_admin_editable_fields.section_key
      AND s.is_active = true
      AND p.is_active = true
      AND p.status = 'published'
  )
);