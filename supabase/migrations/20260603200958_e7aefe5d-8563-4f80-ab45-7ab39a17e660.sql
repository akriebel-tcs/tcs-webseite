
-- Idempotente Migration: card_grid_v1 -> cards_v1 für produkte.hub
UPDATE public.cms_sections
   SET section_type = 'cards_v1', updated_at = now()
 WHERE page_key = 'produkte.hub'
   AND section_key = 'cards'
   AND section_type = 'card_grid_v1';

-- CardsSectionV1 liest `title` (nicht `headline`). Backfill DE+EN
-- (idempotent: nur einfügen, wenn noch kein title gepflegt ist).
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT 'produkte.hub', 'cards', 'title', f.locale, f.value
  FROM public.cms_section_fields f
 WHERE f.page_key = 'produkte.hub'
   AND f.section_key = 'cards'
   AND f.field_key = 'headline'
   AND f.value IS NOT NULL AND f.value <> ''
   AND NOT EXISTS (
     SELECT 1 FROM public.cms_section_fields g
      WHERE g.page_key='produkte.hub' AND g.section_key='cards'
        AND g.field_key='title' AND g.locale=f.locale
   );

-- Whitelist-Coverage für Container-Header (label/title/intro DE+EN)
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT 'produkte.hub', 'cards', fk, lo, true
  FROM (VALUES ('label'), ('title'), ('intro')) AS f(fk)
 CROSS JOIN (VALUES ('de'), ('en')) AS l(lo)
 WHERE NOT EXISTS (
   SELECT 1 FROM public.cms_admin_editable_fields w
    WHERE w.page_key='produkte.hub' AND w.section_key='cards'
      AND w.field_key=f.fk AND w.locale=l.lo
 );
