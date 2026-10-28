-- Sprint 2h: R2-Strukturmigration für 7 R2-Low-Risk-Seiten
-- Retype 7 Parent-Sections (Typ: content_v1) auf cards_v1, weil sie
-- bereits card_v1-Kindsections halten und der Renderer
-- (CmsProductSolutionShell) sie schon heute als Karten-Container behandelt
-- (liest parent_section_key === sectionKey via readItems).
--
-- Eigenschaften:
-- - Reine UPDATE-Operation auf cms_sections.section_type.
-- - Idempotent (WHERE section_type='content_v1' — Wiederholung trifft 0 Rows).
-- - Keine Inhalte, Felder, Assets oder Whitelist verändert.
-- - Keine is_active-Änderung. Keine sort_order-Änderung.
-- - Renderer unverändert; ContentSectionV1 las diese Children ohnehin nie.
-- - Erwartete D9-Reduktion: 29 aktive R2-Hits (content_v1 → card_v1) lösen sich auf.
WITH targets(page_key, section_key) AS (VALUES
  ('zutrittskontrolle.bcm-mini-cloud'::text,      'anwendungen'::text),
  ('gebaeudemanagement.bcm-buchungssystem',       'anwendungen'),
  ('gebaeudemanagement.bcm-infoboard',            'anwendungen'),
  ('zutrittskontrolle.aussenstation-adx5',        'anwendungen'),
  ('zutrittskontrolle.zutrittssoftware',          'anwendungen'),
  ('zutrittskontrolle.digitale-briefkasten',      'anwendungen'),
  ('service.online-produktkatalog',               'access')
)
UPDATE public.cms_sections s
SET section_type = 'cards_v1',
    updated_at = now()
FROM targets t
WHERE s.page_key = t.page_key
  AND s.section_key = t.section_key
  AND s.section_type = 'content_v1';