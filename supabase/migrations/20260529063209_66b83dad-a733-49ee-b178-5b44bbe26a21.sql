-- Sprint 2i — R2-Strukturmigration gebaeudekommunikation (10 Sections)
-- Reine Typkorrektur content_v1 -> cards_v1 für Container mit aktiven card_v1-Kindern.
-- Renderer-Beweis: alle 5 Page-Komponenten lesen Kinder via parent_section_key
-- + section_type='card_v1' (typ-agnostisch für Parent) bzw. via dedizierten
-- SECTION_RENDERERS-Map-Eintrag (key-basiert, nicht typ-basiert).
-- Idempotent durch zusätzlichen WHERE section_type='content_v1'.

UPDATE public.cms_sections
SET section_type = 'cards_v1',
    updated_at  = now()
WHERE section_type = 'content_v1'
  AND (page_key, section_key) IN (
    ('gebaeudekommunikation.briefkastenanlagen','montageformen'),
    ('gebaeudekommunikation.briefkastenanlagen','smart'),
    ('gebaeudekommunikation.grossanlagen','anforderungen'),
    ('gebaeudekommunikation.grossanlagen','systembausteine'),
    ('gebaeudekommunikation.grossanlagen','wirtschaftlichkeit'),
    ('gebaeudekommunikation.snipdoo-ip','anwendungen'),
    ('gebaeudekommunikation.snipdoo-ip','audiences'),
    ('gebaeudekommunikation.systemloesungen','fachplanung'),
    ('gebaeudekommunikation.systemloesungen','vorteile'),
    ('gebaeudekommunikation.tuersprechanlagen','anwendungsumfelder')
  );