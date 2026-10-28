-- Pilot-Vorbereitung: Felder + Whitelist für Bildkarten unter
-- B-026 (aussenstationen) und B-027 (innenstationen) auf
-- gebaeudekommunikation.tuersprechanlagen. Idempotent.

WITH pilot_cards AS (
  SELECT c.page_key, c.section_key
  FROM public.cms_sections c
  JOIN public.cms_sections p ON p.id = c.parent_section_id
  WHERE c.page_key = 'gebaeudekommunikation.tuersprechanlagen'
    AND c.section_type = 'card_v1'
    AND p.page_key = 'gebaeudekommunikation.tuersprechanlagen'
    AND p.section_key IN ('aussenstationen', 'innenstationen')
),
new_text_fields(field_key) AS (
  VALUES
    ('features.0'), ('features.1'), ('features.2'), ('features.3'), ('features.4'),
    ('link_1_label'), ('link_1_href'), ('link_1_kind'), ('link_1_enabled'),
    ('link_2_label'), ('link_2_href'), ('link_2_kind'), ('link_2_enabled'),
    ('link_3_label'), ('link_3_href'), ('link_3_kind'), ('link_3_enabled')
),
new_asset_slots(field_key) AS (
  VALUES ('thumbnail'), ('icon_image')
),
locales(locale) AS (VALUES ('de'), ('en'))

-- 1) Leere Wertzeilen in cms_section_fields anlegen (nur fehlende),
--    damit rpc_admin_update_section_field UPDATE etwas vorfindet.
, ins_fields AS (
  INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
  SELECT pc.page_key, pc.section_key, nf.field_key, l.locale, ''
  FROM pilot_cards pc
  CROSS JOIN new_text_fields nf
  CROSS JOIN locales l
  WHERE NOT EXISTS (
    SELECT 1 FROM public.cms_section_fields f
    WHERE f.page_key = pc.page_key
      AND f.section_key = pc.section_key
      AND f.field_key = nf.field_key
      AND f.locale = l.locale
  )
  RETURNING 1
)

-- 2) Whitelist-Einträge für Textfelder
, ins_wl_text AS (
  INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
  SELECT pc.page_key, pc.section_key, nf.field_key, l.locale, true
  FROM pilot_cards pc
  CROSS JOIN new_text_fields nf
  CROSS JOIN locales l
  ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING
  RETURNING 1
)

-- 3) Whitelist-Einträge für Asset-Slots (thumbnail, icon_image)
, ins_wl_assets AS (
  INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
  SELECT pc.page_key, pc.section_key, na.field_key, l.locale, true
  FROM pilot_cards pc
  CROSS JOIN new_asset_slots na
  CROSS JOIN locales l
  ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING
  RETURNING 1
)

SELECT
  (SELECT count(*) FROM ins_fields) AS field_rows_added,
  (SELECT count(*) FROM ins_wl_text) AS wl_text_added,
  (SELECT count(*) FROM ins_wl_assets) AS wl_assets_added;
