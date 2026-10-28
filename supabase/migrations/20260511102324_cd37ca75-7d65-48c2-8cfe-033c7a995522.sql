
-- Etappe J.3: Content-Blöcke der Startseite in einzelne Sections aufteilen
-- Idempotent. Auf frischer und bestehender DB derselbe Zielzustand.

DO $$
DECLARE
  _page CONSTANT text := 'home.start';
  _block_keys CONSTANT text[] := ARRAY['communication','access','entry','signage','solutions','consulting'];
  _bk text;
  _old_field text;
  _new_field text;
BEGIN
  -- 1) Neue Sections anlegen (idempotent)
  INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active)
  VALUES
    (_page, 'content_blocks_intro', 'content_blocks_intro_v1', 2, true),
    (_page, 'block_communication',  'content_block_v1',         3, true),
    (_page, 'block_access',         'content_block_v1',         4, true),
    (_page, 'block_entry',          'content_block_v1',         5, true),
    (_page, 'block_signage',        'content_block_v1',         6, true),
    (_page, 'block_solutions',      'content_block_v1',         7, true),
    (_page, 'block_consulting',     'content_block_v1',         8, true)
  ON CONFLICT DO NOTHING;

  -- personas_picker und cta nach hinten schieben (zwei Schritte gegen unique-Konflikte vermeiden — sort_order hat keinen unique key)
  UPDATE public.cms_sections SET sort_order = 9,  updated_at = now()
   WHERE page_key = _page AND section_key = 'personas_picker' AND sort_order <> 9;
  UPDATE public.cms_sections SET sort_order = 10, updated_at = now()
   WHERE page_key = _page AND section_key = 'cta' AND sort_order <> 10;

  -- 2) Intro-Felder kopieren: content_blocks.{headline,intro,cta_default} -> content_blocks_intro
  INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value, value_json)
  SELECT _page, 'content_blocks_intro', f.field_key, f.locale, f.value, f.value_json
    FROM public.cms_section_fields f
   WHERE f.page_key = _page
     AND f.section_key = 'content_blocks'
     AND f.field_key IN ('headline','intro','cta_default')
     AND NOT EXISTS (
       SELECT 1 FROM public.cms_section_fields x
        WHERE x.page_key = _page
          AND x.section_key = 'content_blocks_intro'
          AND x.field_key = f.field_key
          AND x.locale = f.locale
     );

  -- Whitelist mitziehen
  INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
  SELECT _page, 'content_blocks_intro', w.field_key, w.locale, w.is_enabled
    FROM public.cms_admin_editable_fields w
   WHERE w.page_key = _page
     AND w.section_key = 'content_blocks'
     AND w.field_key IN ('headline','intro','cta_default')
     AND NOT EXISTS (
       SELECT 1 FROM public.cms_admin_editable_fields x
        WHERE x.page_key = _page AND x.section_key = 'content_blocks_intro'
          AND x.field_key = w.field_key AND x.locale = w.locale
     );

  -- 3) Pro Block: Felder + Whitelist + Asset migrieren
  FOREACH _bk IN ARRAY _block_keys LOOP
    -- a) Textfelder: <bk>_label/_headline/_text/_cta -> block_<bk>.{label,headline,text,cta}
    FOR _old_field, _new_field IN
      SELECT _bk||'_label','label' UNION ALL
      SELECT _bk||'_headline','headline' UNION ALL
      SELECT _bk||'_text','text' UNION ALL
      SELECT _bk||'_cta','cta'
    LOOP
      INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value, value_json)
      SELECT _page, 'block_'||_bk, _new_field, f.locale, f.value, f.value_json
        FROM public.cms_section_fields f
       WHERE f.page_key = _page
         AND f.section_key = 'content_blocks'
         AND f.field_key = _old_field
         AND NOT EXISTS (
           SELECT 1 FROM public.cms_section_fields x
            WHERE x.page_key = _page AND x.section_key = 'block_'||_bk
              AND x.field_key = _new_field AND x.locale = f.locale
         );

      INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
      SELECT _page, 'block_'||_bk, _new_field, w.locale, w.is_enabled
        FROM public.cms_admin_editable_fields w
       WHERE w.page_key = _page
         AND w.section_key = 'content_blocks'
         AND w.field_key = _old_field
         AND NOT EXISTS (
           SELECT 1 FROM public.cms_admin_editable_fields x
            WHERE x.page_key = _page AND x.section_key = 'block_'||_bk
              AND x.field_key = _new_field AND x.locale = w.locale
         );
    END LOOP;

    -- b) Asset umhängen: section_key='content_blocks', field_key='image_<bk>' -> 'block_<bk>'/'image'
    UPDATE public.cms_assets
       SET section_key = 'block_'||_bk,
           field_key   = 'image',
           updated_at  = now()
     WHERE page_key = _page
       AND section_key = 'content_blocks'
       AND field_key = 'image_'||_bk;
  END LOOP;

  -- 4) Alte content_blocks-Section deaktivieren (reversibel)
  UPDATE public.cms_sections
     SET is_active = false, updated_at = now()
   WHERE page_key = _page AND section_key = 'content_blocks' AND is_active = true;

END $$;
