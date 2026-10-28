
-- =========================================================================
-- Etappe: gebaeudekommunikation-root Wechselteaser → teaser_2col_v1
-- Idempotent. Schreibt nur in cms_sections, cms_section_fields, cms_assets,
-- cms_admin_editable_fields. Produktdaten unverändert.
-- =========================================================================

-- 1) Intro-Section + 5 Wechselteaser-Sections anlegen
INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active)
VALUES
  ('gebaeudekommunikation.root', 'bereiche_intro',            'content_v1',    19, true),
  ('gebaeudekommunikation.root', 'bereich_tuersprechanlagen', 'teaser_2col_v1', 21, true),
  ('gebaeudekommunikation.root', 'bereich_briefkastenanlagen','teaser_2col_v1', 22, true),
  ('gebaeudekommunikation.root', 'bereich_beschilderung',     'teaser_2col_v1', 23, true),
  ('gebaeudekommunikation.root', 'bereich_grossanlagen',      'teaser_2col_v1', 24, true),
  ('gebaeudekommunikation.root', 'bereich_systemloesungen',   'teaser_2col_v1', 25, true)
ON CONFLICT DO NOTHING;

-- Sicherstellen, dass Typ/Sort/Aktivität korrekt sind (idempotent)
UPDATE public.cms_sections SET section_type='content_v1',    sort_order=19, is_active=true WHERE page_key='gebaeudekommunikation.root' AND section_key='bereiche_intro';
UPDATE public.cms_sections SET section_type='teaser_2col_v1', sort_order=21, is_active=true WHERE page_key='gebaeudekommunikation.root' AND section_key='bereich_tuersprechanlagen';
UPDATE public.cms_sections SET section_type='teaser_2col_v1', sort_order=22, is_active=true WHERE page_key='gebaeudekommunikation.root' AND section_key='bereich_briefkastenanlagen';
UPDATE public.cms_sections SET section_type='teaser_2col_v1', sort_order=23, is_active=true WHERE page_key='gebaeudekommunikation.root' AND section_key='bereich_beschilderung';
UPDATE public.cms_sections SET section_type='teaser_2col_v1', sort_order=24, is_active=true WHERE page_key='gebaeudekommunikation.root' AND section_key='bereich_grossanlagen';
UPDATE public.cms_sections SET section_type='teaser_2col_v1', sort_order=25, is_active=true WHERE page_key='gebaeudekommunikation.root' AND section_key='bereich_systemloesungen';

-- 2) Felder: Intro
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT 'gebaeudekommunikation.root','bereiche_intro','label',locale,value FROM public.cms_section_fields
 WHERE page_key='gebaeudekommunikation.root' AND section_key='bereiche' AND field_key='label'
ON CONFLICT DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT 'gebaeudekommunikation.root','bereiche_intro','title',locale,value FROM public.cms_section_fields
 WHERE page_key='gebaeudekommunikation.root' AND section_key='bereiche' AND field_key='title'
ON CONFLICT DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT 'gebaeudekommunikation.root','bereiche_intro','text',locale,value FROM public.cms_section_fields
 WHERE page_key='gebaeudekommunikation.root' AND section_key='bereiche' AND field_key='intro'
ON CONFLICT DO NOTHING;

-- 3) Felder: 5 Wechselteaser
-- Helper-Wert label/title/text aus alten items.<key>.* übernehmen
DO $$
DECLARE
  rec record;
  v_label text;
  v_title text;
  v_text  text;
  v_loc   text;
  k       text;
  sec     text;
  pos     text;
  link    text;
  cta_de  text := 'Mehr erfahren';
  cta_en  text := 'Learn more';
BEGIN
  FOR rec IN SELECT * FROM (VALUES
      ('tuersprechanlagen',  'bereich_tuersprechanlagen',  'left',  '/gebaeudekommunikation/tuersprechanlagen'),
      ('briefkastenanlagen', 'bereich_briefkastenanlagen', 'right', '/gebaeudekommunikation/briefkastenanlagen'),
      ('beschilderung',      'bereich_beschilderung',      'left',  '/gebaeudekommunikation/beschilderung'),
      ('grossanlagen',       'bereich_grossanlagen',       'right', '/gebaeudekommunikation/grossanlagen'),
      ('systemloesungen',    'bereich_systemloesungen',    'left',  '/gebaeudekommunikation/systemloesungen')
    ) AS t(k, sec, pos, link)
  LOOP
    FOREACH v_loc IN ARRAY ARRAY['de','en'] LOOP
      SELECT value INTO v_label FROM public.cms_section_fields
        WHERE page_key='gebaeudekommunikation.root' AND section_key='bereiche'
          AND field_key='items.'||rec.k||'.label' AND locale=v_loc;
      SELECT value INTO v_title FROM public.cms_section_fields
        WHERE page_key='gebaeudekommunikation.root' AND section_key='bereiche'
          AND field_key='items.'||rec.k||'.title' AND locale=v_loc;
      SELECT value INTO v_text  FROM public.cms_section_fields
        WHERE page_key='gebaeudekommunikation.root' AND section_key='bereiche'
          AND field_key='items.'||rec.k||'.text' AND locale=v_loc;

      INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES
        ('gebaeudekommunikation.root', rec.sec, 'label',              v_loc, v_label),
        ('gebaeudekommunikation.root', rec.sec, 'title',              v_loc, v_title),
        ('gebaeudekommunikation.root', rec.sec, 'text',               v_loc, v_text),
        ('gebaeudekommunikation.root', rec.sec, 'cta_label',          v_loc, CASE WHEN v_loc='de' THEN cta_de ELSE cta_en END),
        ('gebaeudekommunikation.root', rec.sec, 'cta_link',           v_loc, rec.link),
        ('gebaeudekommunikation.root', rec.sec, 'image_position',     v_loc, rec.pos),
        ('gebaeudekommunikation.root', rec.sec, 'background_variant', v_loc, 'default')
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- 4) Assets: alte image_<key>-Slots aus section "bereiche" in neue Sections kopieren
DO $$
DECLARE
  rec record;
  src record;
BEGIN
  FOR rec IN SELECT * FROM (VALUES
      ('tuersprechanlagen',  'bereich_tuersprechanlagen'),
      ('briefkastenanlagen', 'bereich_briefkastenanlagen'),
      ('beschilderung',      'bereich_beschilderung'),
      ('grossanlagen',       'bereich_grossanlagen'),
      ('systemloesungen',    'bereich_systemloesungen')
    ) AS t(k, sec)
  LOOP
    FOR src IN
      SELECT * FROM public.cms_assets
      WHERE page_key='gebaeudekommunikation.root'
        AND section_key='bereiche'
        AND field_key = 'image_'||rec.k
        AND is_active = true
    LOOP
      INSERT INTO public.cms_assets (
        page_key, section_key, asset_role, field_key, viewport, locale,
        storage_path, public_url, file_name, mime_type,
        alt_text_de, alt_text_en, alt_de, alt_en,
        sort_order, is_active
      )
      SELECT
        'gebaeudekommunikation.root', rec.sec, 'image', 'image',
        COALESCE(src.viewport, 'desktop'), src.locale,
        src.storage_path, src.public_url, src.file_name, src.mime_type,
        src.alt_text_de, src.alt_text_en, src.alt_de, src.alt_en,
        0, true
      WHERE NOT EXISTS (
        SELECT 1 FROM public.cms_assets
        WHERE page_key='gebaeudekommunikation.root'
          AND section_key=rec.sec
          AND field_key='image'
          AND viewport=COALESCE(src.viewport, 'desktop')
      );
    END LOOP;
  END LOOP;
END $$;

-- 5) Whitelist (cms_admin_editable_fields) für neue Felder + image-Slot
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT 'gebaeudekommunikation.root', sec, fld, loc, true
FROM (
  VALUES
    ('bereiche_intro','label'),('bereiche_intro','title'),('bereiche_intro','text'),
    ('bereich_tuersprechanlagen','label'),('bereich_tuersprechanlagen','title'),('bereich_tuersprechanlagen','text'),
    ('bereich_tuersprechanlagen','cta_label'),('bereich_tuersprechanlagen','cta_link'),
    ('bereich_tuersprechanlagen','image_position'),('bereich_tuersprechanlagen','background_variant'),
    ('bereich_tuersprechanlagen','image'),
    ('bereich_briefkastenanlagen','label'),('bereich_briefkastenanlagen','title'),('bereich_briefkastenanlagen','text'),
    ('bereich_briefkastenanlagen','cta_label'),('bereich_briefkastenanlagen','cta_link'),
    ('bereich_briefkastenanlagen','image_position'),('bereich_briefkastenanlagen','background_variant'),
    ('bereich_briefkastenanlagen','image'),
    ('bereich_beschilderung','label'),('bereich_beschilderung','title'),('bereich_beschilderung','text'),
    ('bereich_beschilderung','cta_label'),('bereich_beschilderung','cta_link'),
    ('bereich_beschilderung','image_position'),('bereich_beschilderung','background_variant'),
    ('bereich_beschilderung','image'),
    ('bereich_grossanlagen','label'),('bereich_grossanlagen','title'),('bereich_grossanlagen','text'),
    ('bereich_grossanlagen','cta_label'),('bereich_grossanlagen','cta_link'),
    ('bereich_grossanlagen','image_position'),('bereich_grossanlagen','background_variant'),
    ('bereich_grossanlagen','image'),
    ('bereich_systemloesungen','label'),('bereich_systemloesungen','title'),('bereich_systemloesungen','text'),
    ('bereich_systemloesungen','cta_label'),('bereich_systemloesungen','cta_link'),
    ('bereich_systemloesungen','image_position'),('bereich_systemloesungen','background_variant'),
    ('bereich_systemloesungen','image')
) AS f(sec, fld)
CROSS JOIN (VALUES ('de'),('en')) AS l(loc)
ON CONFLICT DO NOTHING;

-- 6) Alte Sammelsektion "bereiche" deaktivieren, damit Inhalte nicht doppelt sichtbar sind.
--    Datenbestand (Felder + Assets) bleibt erhalten.
UPDATE public.cms_sections
SET is_active = false, updated_at = now()
WHERE page_key='gebaeudekommunikation.root' AND section_key='bereiche';
