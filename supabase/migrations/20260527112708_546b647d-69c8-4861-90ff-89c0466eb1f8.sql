-- Hotfix Tranche 27c: paired icon_image whitelist for every active icon slot.
-- Idempotent. Adds DE+EN whitelist rows for "icon_image" (or "<path>.icon_image")
-- wherever an active "icon" (or "<path>.icon") field exists in cms_section_fields
-- and the parent cms_section is active and public. No assets are created or
-- modified. No section_field values are changed.
WITH icon_fields AS (
  SELECT DISTINCT sf.page_key, sf.section_key, sf.field_key
  FROM public.cms_section_fields sf
  JOIN public.cms_sections s
    ON s.page_key = sf.page_key
   AND s.section_key = sf.section_key
   AND s.is_active = true
  JOIN public.cms_pages p
    ON p.page_key = sf.page_key
   AND p.is_active = true
   AND p.status = 'published'
  WHERE sf.field_key = 'icon' OR sf.field_key LIKE '%.icon'
),
paired AS (
  SELECT
    page_key,
    section_key,
    CASE
      WHEN field_key = 'icon' THEN 'icon_image'
      ELSE substring(field_key from 1 for length(field_key) - length('.icon')) || '.icon_image'
    END AS field_key
  FROM icon_fields
),
locales AS (
  SELECT unnest(ARRAY['de','en']) AS locale
)
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT p.page_key, p.section_key, p.field_key, l.locale, true
FROM paired p
CROSS JOIN locales l
WHERE NOT EXISTS (
  SELECT 1 FROM public.cms_admin_editable_fields w
  WHERE w.page_key = p.page_key
    AND w.section_key = p.section_key
    AND w.field_key = p.field_key
    AND w.locale = l.locale
);