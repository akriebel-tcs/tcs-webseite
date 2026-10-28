-- Tranche 21 — Admin-Hygiene
-- H2a: Whitelist deaktivieren, wenn Section fehlt oder inaktiv
UPDATE public.cms_admin_editable_fields w
SET is_enabled = false, updated_at = now()
WHERE w.is_enabled = true
  AND NOT EXISTS (
    SELECT 1 FROM public.cms_sections s
    WHERE s.page_key = w.page_key
      AND s.section_key = w.section_key
      AND s.is_active = true
  );

-- H4: Whitelist deaktivieren, wenn der Renderer den Bildslot nicht liest
-- (eindeutige Fälle laut RENDERER_SLOT_MAP: content_v1 + series_override_v1 haben keinen Bildslot)
UPDATE public.cms_admin_editable_fields w
SET is_enabled = false, updated_at = now()
FROM public.cms_sections s
WHERE w.is_enabled = true
  AND s.page_key = w.page_key
  AND s.section_key = w.section_key
  AND s.is_active = true
  AND s.section_type IN (
    'content', 'content_v1', 'intro',
    'content_block_v1', 'content_blocks_intro_v1',
    'series_override_v1', 'series_override_container_v1'
  )
  AND w.field_key IN ('image', 'thumbnail', 'icon_image', 'hero_image', 'og_image', 'logo');

-- H3: aktive Assets deaktivieren, wenn die zugehörige Section fehlt oder inaktiv ist
UPDATE public.cms_assets a
SET is_active = false, updated_at = now()
WHERE a.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.cms_sections s
    WHERE s.page_key = a.page_key
      AND s.section_key = a.section_key
      AND s.is_active = true
  );
