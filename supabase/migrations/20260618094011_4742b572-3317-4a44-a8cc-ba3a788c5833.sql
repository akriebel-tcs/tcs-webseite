-- =============================================================================
-- Batch 56 Phase 1 — Renderfähigkeits-Vertrag in der Datenbank
-- Spiegel zu src/features/cms/contract/renderability.ts
-- =============================================================================

-- 1) Renderfähigkeits-Helper (Single Source SQL-seitig).
-- Liefert jsonb { renderable: bool, contract_known: bool, section_type, missing: [{locale, field_keys[], reason}] }
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
  _children_count int;
  _faq_ok_de boolean;
  _faq_ok_en boolean;
  _has boolean;
  _fk text;
  _grp text[];
  _grp_ok boolean;
  _section_id uuid;
  -- map canonical type
  _canonical text;
BEGIN
  SELECT s.section_type, s.id INTO _stype, _section_id
    FROM public.cms_sections s
   WHERE s.page_key = p_page_key AND s.section_key = p_section_key
   LIMIT 1;

  IF _stype IS NULL THEN
    RETURN jsonb_build_object('renderable', true, 'contract_known', false,
      'section_type', null, 'missing', _missing);
  END IF;

  -- Kanonisierung (Spiegel zu normalizeType)
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

  -- ---- cta_v1: title, cta_label, cta_href in DE und EN nicht leer ----
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

  -- ---- content_v1: title ODER text pro Locale ----
  ELSIF _canonical = 'content_v1' THEN
    FOREACH _lo IN ARRAY _locales LOOP
      SELECT EXISTS (
        SELECT 1 FROM public.cms_section_fields f
        WHERE f.page_key=p_page_key AND f.section_key=p_section_key
          AND f.field_key IN ('title','text') AND f.locale=_lo
          AND f.value IS NOT NULL AND btrim(f.value) <> ''
      ) INTO _has;
      IF NOT _has THEN
        _missing := _missing || jsonb_build_object(
          'locale', _lo, 'field_keys', jsonb_build_array('title','text'),
          'reason', 'missing_required_any_of'
        );
      END IF;
    END LOOP;

  -- ---- card_v1: title in jeder Locale ----
  ELSIF _canonical = 'card_v1' THEN
    FOREACH _lo IN ARRAY _locales LOOP
      SELECT EXISTS (
        SELECT 1 FROM public.cms_section_fields f
        WHERE f.page_key=p_page_key AND f.section_key=p_section_key
          AND f.field_key='title' AND f.locale=_lo
          AND f.value IS NOT NULL AND btrim(f.value) <> ''
      ) INTO _has;
      IF NOT _has THEN
        _missing := _missing || jsonb_build_object(
          'locale', _lo, 'field_keys', jsonb_build_array('title'),
          'reason', 'missing_required_any_of'
        );
      END IF;
    END LOOP;

  -- ---- Container: mindestens 1 aktives Kind ----
  ELSIF _canonical IN ('cards_v1','product_scroller_v1','product_showcase_list_v1',
                       'feature_grid_v1','download_list_v1') THEN
    SELECT count(*) INTO _children_count
      FROM public.cms_sections c
     WHERE c.parent_section_id = _section_id AND c.is_active;
    IF _children_count < 1 THEN
      _missing := _missing || jsonb_build_object(
        'locale', 'de', 'field_keys', jsonb_build_array('__children__'),
        'reason', 'no_active_children'
      );
    END IF;

  -- ---- faq_v1: mind. 1 Item mit Frage+Antwort pro Locale ----
  ELSIF _canonical = 'faq_v1' THEN
    FOREACH _lo IN ARRAY _locales LOOP
      SELECT EXISTS (
        WITH slugs AS (
          SELECT DISTINCT split_part(substring(f.field_key from '^items\.(.+)\.[^.]+$'),'.',1) AS slug
            FROM public.cms_section_fields f
           WHERE f.page_key=p_page_key AND f.section_key=p_section_key
             AND f.field_key ~ '^items\.[^.]+\.(frage|antwort|question|answer|q|a)$'
        )
        SELECT 1 FROM slugs s
        WHERE EXISTS (
          SELECT 1 FROM public.cms_section_fields fq
          WHERE fq.page_key=p_page_key AND fq.section_key=p_section_key AND fq.locale=_lo
            AND fq.field_key IN ('items.'||s.slug||'.frage','items.'||s.slug||'.question','items.'||s.slug||'.q')
            AND fq.value IS NOT NULL AND btrim(fq.value) <> ''
        ) AND EXISTS (
          SELECT 1 FROM public.cms_section_fields fa
          WHERE fa.page_key=p_page_key AND fa.section_key=p_section_key AND fa.locale=_lo
            AND fa.field_key IN ('items.'||s.slug||'.antwort','items.'||s.slug||'.answer','items.'||s.slug||'.a')
            AND fa.value IS NOT NULL AND btrim(fa.value) <> ''
        )
      ) INTO _has;
      IF NOT _has THEN
        _missing := _missing || jsonb_build_object(
          'locale', _lo,
          'field_keys', jsonb_build_array('items.*.question','items.*.answer'),
          'reason', 'no_valid_faq_items'
        );
      END IF;
    END LOOP;

  ELSE
    -- kein Pflicht-Stopper hinterlegt → contract_known=false
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

-- 2) RPC-Härtung: set_section_active blockiert nicht renderfähige Aktivierung
CREATE OR REPLACE FUNCTION public.rpc_admin_set_section_active(p_page_key text, p_section_key text, p_is_active boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _rows int := 0;
  _render jsonb;
BEGIN
  IF p_is_active IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'is_active_required');
  END IF;

  -- Aktivieren? Dann Renderfähigkeit hart prüfen.
  IF p_is_active THEN
    _render := public.cms_section_renderability(p_page_key, p_section_key);
    IF (_render->>'contract_known')::boolean
       AND NOT (_render->>'renderable')::boolean THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'section_not_renderable',
        'page_key', p_page_key,
        'section_key', p_section_key,
        'section_type', _render->'section_type',
        'missing', _render->'missing'
      );
    END IF;
  END IF;

  UPDATE public.cms_sections
     SET is_active = p_is_active, updated_at = now()
   WHERE page_key = p_page_key
     AND section_key = p_section_key;
  GET DIAGNOSTICS _rows = ROW_COUNT;
  IF _rows = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'section_not_found',
      'page_key', p_page_key, 'section_key', p_section_key);
  END IF;
  PERFORM public.cms_renumber_sections(p_page_key);
  RETURN jsonb_build_object('success', true,
    'page_key', p_page_key, 'section_key', p_section_key, 'is_active', p_is_active);
END;
$$;

-- 3) RPC-Härtung: update_section_field verweigert Leeren eines Pflichtfelds,
--    solange die Section aktiv ist.
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
  _stype text;
  _is_required boolean := false;
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

  -- Härtung: aktive Section + Pflichtfeld + leerer Zielwert ⇒ ablehnen.
  IF p_value IS NULL OR btrim(p_value) = '' THEN
    SELECT s.is_active, s.section_type INTO _is_active, _stype
      FROM public.cms_sections s
     WHERE s.page_key=p_page_key AND s.section_key=p_section_key
     LIMIT 1;
    IF _is_active THEN
      _is_required :=
        (_stype IN ('cta_v1','cta') AND p_field_key IN ('title','cta_label','cta_href'));
      IF _is_required THEN
        RETURN jsonb_build_object('success', false, 'updated', false,
          'error', 'required_field_cannot_be_empty',
          'page_key', p_page_key, 'section_key', p_section_key,
          'field_key', p_field_key, 'locale', p_locale,
          'hint', 'Block ist aktiv. Erst ausblenden oder Wert setzen.');
      END IF;
    END IF;
  END IF;

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
  RETURN jsonb_build_object('success', true, 'updated', true,
    'page_key', p_page_key, 'section_key', p_section_key,
    'field_key', p_field_key, 'locale', p_locale);
END;
$$;

-- 4) Bestandsbereinigung: Titel der 3 Broschüren-CTAs idempotent ergänzen.
--    Werte werden NUR eingefügt, wenn noch keine Zeile existiert
--    (ON CONFLICT DO NOTHING). Bestehende redaktionelle Werte bleiben.
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
VALUES
  ('anwendungen.bildungseinrichtungen','broschure_schule','title','de','Broschüre für Schulen'),
  ('anwendungen.bildungseinrichtungen','broschure_schule','title','en','Brochure for schools'),
  ('anwendungen.bildungseinrichtungen','broschure_wohnheim','title','de','Broschüre für Wohnheime'),
  ('anwendungen.bildungseinrichtungen','broschure_wohnheim','title','en','Brochure for residential homes'),
  ('anwendungen.interne-kommunikation','broschure_intern','title','de','Broschüre TCS Interne Kommunikation & Türöffnerautomatik'),
  ('anwendungen.interne-kommunikation','broschure_intern','title','en','Brochure TCS internal communication & automatic door release')
ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

-- 5) Whitelist für `title` der drei Broschüren-CTAs (DE+EN) idempotent.
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT pk, sk, 'title', lo, true
FROM (VALUES
  ('anwendungen.bildungseinrichtungen','broschure_schule'),
  ('anwendungen.bildungseinrichtungen','broschure_wohnheim'),
  ('anwendungen.interne-kommunikation','broschure_intern')
) AS s(pk, sk)
CROSS JOIN (VALUES ('de'),('en')) AS l(lo)
ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE SET is_enabled = true;
