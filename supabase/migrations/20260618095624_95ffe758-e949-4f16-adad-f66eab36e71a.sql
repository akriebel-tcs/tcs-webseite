-- =============================================================================
-- Batch 56.1 — Renderfähigkeitsvertrag: TS↔SQL-Parität + generischer
-- Schreibschutz. Spiegel zu src/features/cms/contract/renderability.ts.
-- =============================================================================

-- 1) Renderfähigkeits-Helper neu (CREATE OR REPLACE, gleiche Signatur).
--    Ergänzt: FAQ-Item-Sichtbarkeit (enabled/is_active/hidden/visible),
--    acceptedChildTypes pro Container, titleFallbackField, anyLocale-Regel.
CREATE OR REPLACE FUNCTION public.cms_section_renderability(p_page_key text, p_section_key text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _stype text;
  _missing jsonb := '[]'::jsonb;
  _locales text[] := ARRAY['de','en'];
  _lo text;
  _accepted_children int := 0;
  _total_children int := 0;
  _has boolean;
  _fk text;
  _section_id uuid;
  _canonical text;
  _accepted_types text[];
  _title_fallback text;
  _has_title_any boolean;
  _faq_ok boolean;
BEGIN
  SELECT s.section_type, s.id INTO _stype, _section_id
    FROM public.cms_sections s
   WHERE s.page_key = p_page_key AND s.section_key = p_section_key
   LIMIT 1;

  IF _stype IS NULL THEN
    RETURN jsonb_build_object('renderable', true, 'contract_known', false,
      'section_type', null, 'missing', _missing);
  END IF;

  _canonical := CASE _stype
    WHEN 'hero'    THEN 'hero_v1'
    WHEN 'content' THEN 'content_v1'
    WHEN 'intro'   THEN 'content_v1'
    WHEN 'cta'     THEN 'cta_v1'
    WHEN 'rich'    THEN 'rich_v1'
    WHEN 'content_block_v1'        THEN 'content_v1'
    WHEN 'content_blocks_intro_v1' THEN 'content_v1'
    WHEN 'feature-grid'            THEN 'feature_grid_v1'
    WHEN 'product-scroller'        THEN 'product_scroller_v1'
    WHEN 'products'                THEN 'product_scroller_v1'
    ELSE _stype
  END;

  -- ---- cta_v1: title, cta_label, cta_href in DE und EN ----
  IF _canonical = 'cta_v1' THEN
    FOREACH _lo IN ARRAY _locales LOOP
      FOREACH _fk IN ARRAY ARRAY['title','cta_label','cta_href'] LOOP
        SELECT EXISTS (
          SELECT 1 FROM public.cms_section_fields f
          WHERE f.page_key=p_page_key AND f.section_key=p_section_key
            AND f.field_key=_fk AND f.locale=_lo
            AND f.value IS NOT NULL AND btrim(f.value) <> ''
        ) INTO _has;
        IF NOT _has THEN
          _missing := _missing || jsonb_build_object(
            'locale', _lo, 'field_keys', jsonb_build_array(_fk),
            'reason', 'missing_required_field'
          );
        END IF;
      END LOOP;
    END LOOP;

  -- ---- content_v1 / rich_v1 / teaser_2col_v1: bilingual anyOf ----
  ELSIF _canonical IN ('content_v1', 'rich_v1', 'teaser_2col_v1') THEN
    DECLARE _grp text[];
    BEGIN
      _grp := CASE _canonical
        WHEN 'rich_v1' THEN ARRAY['body']
        ELSE ARRAY['title','text']
      END;
      FOREACH _lo IN ARRAY _locales LOOP
        SELECT EXISTS (
          SELECT 1 FROM public.cms_section_fields f
          WHERE f.page_key=p_page_key AND f.section_key=p_section_key
            AND f.field_key = ANY(_grp) AND f.locale=_lo
            AND f.value IS NOT NULL AND btrim(f.value) <> ''
        ) INTO _has;
        IF NOT _has THEN
          _missing := _missing || jsonb_build_object(
            'locale', _lo,
            'field_keys', to_jsonb(_grp),
            'reason', 'missing_required_any_of'
          );
        END IF;
      END LOOP;
    END;

  -- ---- contact_block_v1: anyLocale anyOf ----
  ELSIF _canonical = 'contact_block_v1' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.cms_section_fields f
      WHERE f.page_key=p_page_key AND f.section_key=p_section_key
        AND f.field_key IN ('title','phone','email','cta_href')
        AND f.value IS NOT NULL AND btrim(f.value) <> ''
    ) INTO _has;
    IF NOT _has THEN
      _missing := _missing || jsonb_build_object(
        'locale', 'de',
        'field_keys', jsonb_build_array('title','phone','email','cta_href'),
        'reason', 'missing_required_any_of_any_locale'
      );
    END IF;

  -- ---- card_v1: anyLocale-Variante über Text/Bullets/Chips/Links/Icon ----
  ELSIF _canonical = 'card_v1' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.cms_section_fields f
      WHERE f.page_key=p_page_key AND f.section_key=p_section_key
        AND (
          f.field_key IN (
            'title','description','beschreibung','eyebrow','subtitle','icon',
            'link_1_label','link_2_label','link_3_label',
            'link_1_href','link_2_href','link_3_href'
          )
          OR f.field_key ~ '^bullets\.[0-4]$'
          OR f.field_key ~ '^features\.[0-4]$'
          OR f.field_key ~ '^chips\.[0-4]$'
        )
        AND f.value IS NOT NULL AND btrim(f.value) <> ''
    ) INTO _has;
    IF NOT _has THEN
      _missing := _missing || jsonb_build_object(
        'locale', 'de',
        'field_keys', jsonb_build_array(
          'title','description','eyebrow',
          'bullets.0..4','chips.0..4','link_1..3_label','icon'
        ),
        'reason', 'missing_required_any_of_any_locale'
      );
    END IF;

  -- ---- Container mit/ohne Title-Fallback ----
  ELSIF _canonical IN (
    'cards_v1','feature_grid_v1','product_scroller_v1',
    'product_showcase_list_v1','download_list_v1','stats_v1','tabs_v1'
  ) THEN
    _accepted_types := CASE _canonical
      WHEN 'download_list_v1' THEN ARRAY['download_item_v1']
      WHEN 'stats_v1'         THEN ARRAY['stat_v1']
      WHEN 'tabs_v1'          THEN ARRAY['tab_v1']
      ELSE ARRAY['card_v1']
    END;
    _title_fallback := CASE
      WHEN _canonical IN ('stats_v1','tabs_v1') THEN NULL
      ELSE 'title'
    END;

    SELECT count(*) FILTER (WHERE c.section_type = ANY(_accepted_types)),
           count(*)
      INTO _accepted_children, _total_children
      FROM public.cms_sections c
     WHERE c.parent_section_id = _section_id AND c.is_active;

    _has_title_any := false;
    IF _title_fallback IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM public.cms_section_fields f
        WHERE f.page_key=p_page_key AND f.section_key=p_section_key
          AND f.field_key=_title_fallback
          AND f.value IS NOT NULL AND btrim(f.value) <> ''
      ) INTO _has_title_any;
    END IF;

    IF _accepted_children < 1 AND NOT _has_title_any THEN
      IF _total_children > 0 THEN
        _missing := _missing || jsonb_build_object(
          'locale', 'de',
          'field_keys', jsonb_build_array('__children__'),
          'reason', 'wrong_child_type'
        );
      ELSE
        _missing := _missing || jsonb_build_object(
          'locale', 'de',
          'field_keys', jsonb_build_array('__children__'),
          'reason', 'no_active_children'
        );
      END IF;
    END IF;

  -- ---- faq_v1: mind. 1 SICHTBARES Item mit Frage+Antwort pro Locale ----
  ELSIF _canonical = 'faq_v1' THEN
    FOREACH _lo IN ARRAY _locales LOOP
      SELECT EXISTS (
        WITH slugs AS (
          SELECT DISTINCT substring(f.field_key from '^items\.([^.]+)\.[^.]+$') AS slug
            FROM public.cms_section_fields f
           WHERE f.page_key=p_page_key AND f.section_key=p_section_key
             AND f.field_key ~ '^items\.[^.]+\.(frage|antwort|question|answer|q|a)$'
        )
        SELECT 1 FROM slugs s
        WHERE s.slug IS NOT NULL
          -- Sichtbarkeit (Spiegel zu FaqV1.collectItems): irgendeine Locale.
          AND NOT EXISTS (
            SELECT 1 FROM public.cms_section_fields fx
            WHERE fx.page_key=p_page_key AND fx.section_key=p_section_key
              AND (
                (fx.field_key='items.'||s.slug||'.enabled'   AND btrim(fx.value)='0') OR
                (fx.field_key='items.'||s.slug||'.is_active' AND btrim(fx.value)='0') OR
                (fx.field_key='items.'||s.slug||'.hidden'    AND btrim(fx.value)='1') OR
                (fx.field_key='items.'||s.slug||'.visible'   AND btrim(fx.value)='0')
              )
          )
          AND EXISTS (
            SELECT 1 FROM public.cms_section_fields fq
            WHERE fq.page_key=p_page_key AND fq.section_key=p_section_key AND fq.locale=_lo
              AND fq.field_key IN ('items.'||s.slug||'.frage','items.'||s.slug||'.question','items.'||s.slug||'.q')
              AND fq.value IS NOT NULL AND btrim(fq.value) <> ''
          )
          AND EXISTS (
            SELECT 1 FROM public.cms_section_fields fa
            WHERE fa.page_key=p_page_key AND fa.section_key=p_section_key AND fa.locale=_lo
              AND fa.field_key IN ('items.'||s.slug||'.antwort','items.'||s.slug||'.answer','items.'||s.slug||'.a')
              AND fa.value IS NOT NULL AND btrim(fa.value) <> ''
          )
      ) INTO _faq_ok;
      IF NOT _faq_ok THEN
        _missing := _missing || jsonb_build_object(
          'locale', _lo,
          'field_keys', jsonb_build_array('items.*.question','items.*.answer'),
          'reason', 'no_valid_faq_items'
        );
      END IF;
    END LOOP;

  ELSE
    -- kein Pflicht-Stopper hinterlegt
    RETURN jsonb_build_object('renderable', true, 'contract_known', false,
      'section_type', _stype, 'missing', _missing);
  END IF;

  RETURN jsonb_build_object(
    'renderable', jsonb_array_length(_missing) = 0,
    'contract_known', true,
    'section_type', _stype,
    'missing', _missing
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cms_section_renderability(text, text) TO anon, authenticated, service_role;

-- 2) Generischer Schreibschutz: prüft NACH der Aktualisierung, ob eine
--    aktive Section weiterhin renderfähig ist (Spiegel zur zentralen
--    Renderfähigkeitslogik). Bei Verletzung wird das UPDATE atomar
--    zurückgerollt (Sub-Block + EXCEPTION) und ein strukturierter
--    Befund inkl. `missing[]` zurückgeliefert.
--    Sections, die bereits VOR der Änderung nicht renderfähig waren,
--    bleiben editierbar (kein „Schreibstau"). Deaktivierte Sections
--    werden gar nicht erst gegen den Vertrag geprüft.
CREATE OR REPLACE FUNCTION public.rpc_admin_update_section_field(p_page_key text, p_section_key text, p_field_key text, p_locale text, p_value text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _allowed boolean := false;
  _rows int := 0;
  _is_active boolean := false;
  _before jsonb;
  _after jsonb;
  _check_required boolean := false;
BEGIN
  IF p_locale NOT IN ('de','en') THEN
    RETURN jsonb_build_object('success', false, 'updated', false,
      'error', 'locale_not_allowed',
      'page_key', p_page_key, 'section_key', p_section_key,
      'field_key', p_field_key, 'locale', p_locale);
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.cms_admin_editable_fields w
     WHERE w.page_key=p_page_key AND w.section_key=p_section_key
       AND w.field_key=p_field_key AND w.locale=p_locale AND w.is_enabled=true
  ) INTO _allowed;
  IF NOT _allowed THEN
    RETURN jsonb_build_object('success', false, 'updated', false,
      'error', 'field_not_allowed',
      'page_key', p_page_key, 'section_key', p_section_key,
      'field_key', p_field_key, 'locale', p_locale);
  END IF;

  -- Sektion-Status + Pre-Check
  SELECT s.is_active INTO _is_active
    FROM public.cms_sections s
   WHERE s.page_key=p_page_key AND s.section_key=p_section_key
   LIMIT 1;

  IF _is_active THEN
    _before := public.cms_section_renderability(p_page_key, p_section_key);
    -- nur prüfen, wenn die Section bisher renderfähig war (keine
    -- Schreibblockade auf bereits kaputten Sections).
    _check_required := (_before->>'contract_known')::boolean
                       AND (_before->>'renderable')::boolean;
  END IF;

  -- Sub-Block mit Exception-Rollback. Wird der Vertrag verletzt, wirft
  -- die innere Logik eine Exception → das UPDATE wird rollbacked und
  -- der EXCEPTION-Handler liefert die strukturierte Fehlermeldung.
  BEGIN
    UPDATE public.cms_section_fields
       SET value = p_value, updated_at = now()
     WHERE page_key=p_page_key AND section_key=p_section_key
       AND field_key=p_field_key AND locale=p_locale;
    GET DIAGNOSTICS _rows = ROW_COUNT;

    IF _rows = 0 THEN
      RETURN jsonb_build_object('success', false, 'updated', false,
        'error', 'row_not_found',
        'page_key', p_page_key, 'section_key', p_section_key,
        'field_key', p_field_key, 'locale', p_locale);
    END IF;

    IF _check_required THEN
      _after := public.cms_section_renderability(p_page_key, p_section_key);
      IF NOT (_after->>'renderable')::boolean THEN
        -- Strukturierter Abbruch via SQLSTATE P0001 + DETAIL=jsonb-Payload.
        RAISE EXCEPTION 'section_no_longer_renderable'
          USING ERRCODE = 'P0001',
                DETAIL  = _after::text;
      END IF;
    END IF;

    RETURN jsonb_build_object('success', true, 'updated', true,
      'page_key', p_page_key, 'section_key', p_section_key,
      'field_key', p_field_key, 'locale', p_locale);
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      IF SQLERRM = 'section_no_longer_renderable' THEN
        RETURN jsonb_build_object(
          'success', false, 'updated', false,
          'error', 'section_no_longer_renderable',
          'page_key', p_page_key, 'section_key', p_section_key,
          'field_key', p_field_key, 'locale', p_locale,
          'section_type', _after->'section_type',
          'missing', _after->'missing',
          'hint', 'Aktiver Block würde durch diese Änderung nicht mehr rendern. Erst ausblenden, dann ändern.'
        );
      END IF;
      RAISE;
  END;
END;
$$;