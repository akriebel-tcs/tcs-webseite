-- Tranche 1 nachziehen: Bildslot-Whitelist (field_key='image') für alle
-- vorteile_item_*-Karten der sechs Pilot-Seiten. Idempotent.
INSERT INTO public.cms_admin_editable_fields
  (page_key, section_key, field_key, locale, is_enabled)
SELECT s.page_key, s.section_key, 'image', loc.locale, true
FROM public.cms_sections s
CROSS JOIN (VALUES ('de'), ('en')) AS loc(locale)
WHERE s.section_type = 'card_v1'
  AND s.section_key LIKE 'vorteile_item_%'
  AND s.page_key IN (
    'gebaeudemanagement.bcm-infoboard',
    'gebaeudemanagement.bcm-buchungssystem',
    'zutrittskontrolle.aussenstation-adx5',
    'zutrittskontrolle.digitale-briefkasten',
    'zutrittskontrolle.zutrittssoftware',
    'zutrittskontrolle.bcm-mini-cloud'
  )
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;