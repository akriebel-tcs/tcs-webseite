-- =====================================================================
-- 1. Katalog der Bedienungstexte
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.cms_ui_strings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace text NOT NULL,
  string_key text NOT NULL,
  source_text text NOT NULL,
  source_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  manifest_version text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cms_ui_strings_unique UNIQUE (namespace, string_key)
);

CREATE INDEX IF NOT EXISTS idx_cms_ui_strings_active ON public.cms_ui_strings (is_active);

GRANT ALL ON public.cms_ui_strings TO service_role;
ALTER TABLE public.cms_ui_strings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.cms_ui_string_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ui_string_id uuid NOT NULL REFERENCES public.cms_ui_strings (id) ON DELETE CASCADE,
  locale text NOT NULL REFERENCES public.cms_locales (locale),
  value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cms_ui_string_translations_unique UNIQUE (ui_string_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_cms_ui_string_translations_locale
  ON public.cms_ui_string_translations (locale);

GRANT ALL ON public.cms_ui_string_translations TO service_role;
ALTER TABLE public.cms_ui_string_translations ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_cms_ui_strings_updated_at ON public.cms_ui_strings;
CREATE TRIGGER trg_cms_ui_strings_updated_at
  BEFORE UPDATE ON public.cms_ui_strings
  FOR EACH ROW EXECUTE FUNCTION public.cms_set_updated_at();

DROP TRIGGER IF EXISTS trg_cms_ui_string_translations_updated_at ON public.cms_ui_string_translations;
CREATE TRIGGER trg_cms_ui_string_translations_updated_at
  BEFORE UPDATE ON public.cms_ui_string_translations
  FOR EACH ROW EXECUTE FUNCTION public.cms_set_updated_at();

-- Zusammenfassung des Sprachstands nach Katalogänderungen neu rechnen
DROP TRIGGER IF EXISTS trg_cms_ui_strings_coverage ON public.cms_ui_strings;
CREATE TRIGGER trg_cms_ui_strings_coverage
  AFTER INSERT OR UPDATE OR DELETE ON public.cms_ui_strings
  FOR EACH STATEMENT EXECUTE FUNCTION public.cms_trg_coverage_invalidate();

DROP TRIGGER IF EXISTS trg_cms_ui_string_translations_coverage ON public.cms_ui_string_translations;
CREATE TRIGGER trg_cms_ui_string_translations_coverage
  AFTER INSERT OR UPDATE OR DELETE ON public.cms_ui_string_translations
  FOR EACH STATEMENT EXECUTE FUNCTION public.cms_trg_coverage_invalidate();

-- Aufträge dürfen den neuen Bereich führen
ALTER TABLE public.cms_translation_jobs DROP CONSTRAINT IF EXISTS cms_translation_jobs_area_chk;
ALTER TABLE public.cms_translation_jobs ADD CONSTRAINT cms_translation_jobs_area_chk
  CHECK (area = ANY (ARRAY['section_field','page_title','nav_label','nav_description','asset_alt','ui_string']));

-- =====================================================================
-- 2. Gemeinsame Einheitenmenge: Seiteninhalte + Bedienungstexte
-- =====================================================================
CREATE OR REPLACE FUNCTION public.cms_translation_units(
  p_target_locale text,
  p_page_keys text[] DEFAULT NULL::text[],
  p_areas text[] DEFAULT NULL::text[]
)
RETURNS TABLE(area text, ref_id uuid, ref_key text, page_key text, section_key text,
              unit_key text, sort_a text, sort_b text, sort_c text, label text,
              source_text text, source_hash text, target_value text, target_status text,
              target_hash text, whitelisted boolean, is_todo boolean)
LANGUAGE sql
STABLE PARALLEL SAFE SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '25s'
AS $function$
  WITH cfg AS (
    SELECT lower(coalesce(p_target_locale, '')) AS loc,
           EXISTS (SELECT 1 FROM public.cms_locales l
                    WHERE l.locale = lower(coalesce(p_target_locale, ''))
                      AND l.is_active AND NOT l.is_source) AS col_ok
  ),
  base AS (
    SELECT 'section_field'::text AS area,
           NULL::uuid AS ref_id,
           f.page_key || '|' || f.section_key || '|' || f.field_key AS ref_key,
           f.page_key,
           f.section_key,
           f.field_key AS unit_key,
           f.page_key AS sort_a,
           'section_field:' || f.section_key AS sort_b,
           f.field_key AS sort_c,
           f.field_key AS label,
           f.value AS source_text
      FROM public.cms_section_fields f
      JOIN public.cms_sections s
        ON s.page_key = f.page_key AND s.section_key = f.section_key
     WHERE f.locale = 'de'
       AND (p_areas IS NULL OR 'section_field' = ANY (p_areas))
       AND public.cms_field_is_translatable(f.field_key)
       AND public.cms_text_is_translatable(f.value)

    UNION ALL
    SELECT 'page_title', p.id, p.page_key, p.page_key, '-', 'title',
           p.page_key, 'page_title', 'title', 'Seitentitel', p.title_de
      FROM public.cms_pages p, cfg
     WHERE cfg.col_ok
       AND (p_areas IS NULL OR 'page_title' = ANY (p_areas))
       AND public.cms_text_is_translatable(p.title_de)

    UNION ALL
    SELECT 'nav_label', n.id, n.id::text, coalesce(n.page_key, '~nav'), n.nav_area, 'label',
           coalesce(n.page_key, '~nav'), 'nav_label:' || n.nav_area, n.node_key,
           'Navigation: Beschriftung', n.label_de
      FROM public.cms_navigation_nodes n, cfg
     WHERE cfg.col_ok
       AND (p_areas IS NULL OR 'nav_label' = ANY (p_areas))
       AND public.cms_text_is_translatable(n.label_de)

    UNION ALL
    SELECT 'nav_description', n.id, n.id::text, coalesce(n.page_key, '~nav'), n.nav_area, 'description',
           coalesce(n.page_key, '~nav'), 'nav_description:' || n.nav_area, n.node_key,
           'Navigation: Beschreibung', n.description_de
      FROM public.cms_navigation_nodes n, cfg
     WHERE cfg.col_ok
       AND (p_areas IS NULL OR 'nav_description' = ANY (p_areas))
       AND public.cms_text_is_translatable(n.description_de)

    UNION ALL
    SELECT 'asset_alt', a.id, a.id::text, a.page_key, a.section_key, 'alt',
           a.page_key, 'asset_alt:' || a.section_key,
           coalesce(a.field_key, a.asset_role) || ':' || a.id::text,
           'Bild-Alternativtext', a.alt_de
      FROM public.cms_assets a, cfg
     WHERE cfg.col_ok
       AND a.is_active = true
       AND (p_areas IS NULL OR 'asset_alt' = ANY (p_areas))
       AND public.cms_text_is_translatable(a.alt_de)

    -- Bedienungstexte (gebündelte i18n-Schlüssel, im Katalog registriert)
    UNION ALL
    SELECT 'ui_string', u.id, u.namespace || '|' || u.string_key, '~ui', u.namespace, u.string_key,
           '~ui', 'ui_string:' || u.namespace, u.string_key,
           'Bedienungstext', u.source_text
      FROM public.cms_ui_strings u, cfg
     WHERE cfg.col_ok
       AND u.is_active
       AND (p_areas IS NULL OR 'ui_string' = ANY (p_areas))
       AND public.cms_text_is_translatable(u.source_text)
  ),
  scoped AS (
    SELECT b.*, md5(lower(btrim(regexp_replace(coalesce(b.source_text, ''), '\s+', ' ', 'g')))) AS src_hash
      FROM base b
     WHERE p_page_keys IS NULL
        OR array_length(p_page_keys, 1) IS NULL
        OR b.page_key = ANY (p_page_keys)
  ),
  joined AS (
    SELECT b.*,
           CASE b.area
             WHEN 'section_field' THEN sf.value
             WHEN 'page_title' THEN coalesce(pt.title,
                    CASE cfg.loc WHEN 'en' THEN pg.title_en WHEN 'pl' THEN pg.title_pl END)
             WHEN 'nav_label' THEN coalesce(nt.label,
                    CASE cfg.loc WHEN 'en' THEN nn.label_en WHEN 'pl' THEN nn.label_pl END)
             WHEN 'nav_description' THEN coalesce(nt.description,
                    CASE cfg.loc WHEN 'en' THEN nn.description_en WHEN 'pl' THEN nn.description_pl END)
             WHEN 'asset_alt' THEN coalesce(at2.alt_text,
                    CASE cfg.loc WHEN 'en' THEN ca.alt_en WHEN 'pl' THEN ca.alt_pl END)
             WHEN 'ui_string' THEN ut.value
           END AS tgt_value,
           CASE b.area WHEN 'section_field' THEN sf.review_status ELSE st.review_status END AS raw_status,
           CASE b.area WHEN 'section_field' THEN sf.source_hash ELSE st.source_hash END AS tgt_hash,
           CASE b.area
             WHEN 'section_field' THEN coalesce(w.is_enabled, false)
             ELSE cfg.col_ok
           END AS wl
      FROM scoped b
      CROSS JOIN cfg
      LEFT JOIN public.cms_section_fields sf
             ON b.area = 'section_field'
            AND sf.page_key = b.page_key AND sf.section_key = b.section_key
            AND sf.field_key = b.unit_key AND sf.locale = cfg.loc
      LEFT JOIN public.cms_admin_editable_fields w
             ON b.area = 'section_field'
            AND w.page_key = b.page_key AND w.section_key = b.section_key
            AND w.field_key = b.unit_key AND w.locale = cfg.loc
      LEFT JOIN public.cms_pages pg
             ON b.area = 'page_title' AND pg.page_key = b.page_key
      LEFT JOIN public.cms_page_translations pt
             ON b.area = 'page_title' AND pt.page_id = b.ref_id AND pt.locale = cfg.loc
      LEFT JOIN public.cms_navigation_nodes nn
             ON b.area IN ('nav_label','nav_description') AND nn.id = b.ref_id
      LEFT JOIN public.cms_navigation_node_translations nt
             ON b.area IN ('nav_label','nav_description') AND nt.node_id = b.ref_id AND nt.locale = cfg.loc
      LEFT JOIN public.cms_assets ca
             ON b.area = 'asset_alt' AND ca.id = b.ref_id
      LEFT JOIN public.cms_asset_translations at2
             ON b.area = 'asset_alt' AND at2.asset_id = b.ref_id AND at2.locale = cfg.loc
      LEFT JOIN public.cms_ui_string_translations ut
             ON b.area = 'ui_string' AND ut.ui_string_id = b.ref_id AND ut.locale = cfg.loc
      LEFT JOIN public.cms_translation_unit_state st
             ON b.area <> 'section_field'
            AND st.area = b.area AND st.ref_key = b.ref_key
            AND st.unit_key = b.unit_key AND st.locale = cfg.loc
  ),
  final AS (
    SELECT j.*,
           CASE
             WHEN coalesce(btrim(j.tgt_value), '') = '' THEN NULL
             WHEN coalesce(j.raw_status, 'geprueft') IN ('maschinell','maschinell_veraltet')
                  AND (j.tgt_hash IS NULL OR j.tgt_hash <> j.src_hash) THEN 'maschinell_veraltet'
             ELSE coalesce(j.raw_status, 'geprueft')
           END AS eff_status
      FROM joined j
  )
  SELECT f.area, f.ref_id, f.ref_key, f.page_key, f.section_key, f.unit_key,
         f.sort_a, f.sort_b, f.sort_c, f.label,
         f.source_text, f.src_hash,
         f.tgt_value, f.eff_status, f.tgt_hash, f.wl,
         (f.wl
          AND NOT (coalesce(btrim(f.tgt_value), '') <> '' AND f.eff_status = 'geprueft')
          AND (coalesce(btrim(f.tgt_value), '') = ''
               OR f.tgt_hash IS NULL
               OR f.tgt_hash <> f.src_hash)) AS is_todo
    FROM final f
$function$;

-- =====================================================================
-- 3. Bedienungstexte von Hand speichern (Redaktion)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.rpc_admin_update_translation_unit(
  p_area text, p_ref_id uuid, p_page_key text, p_section_key text,
  p_unit_key text, p_locale text, p_value text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_res jsonb;
  v_ref_key text;
  v_hash text;
  v_source text;
  v_locale text := lower(btrim(coalesce(p_locale, '')));
  v_value text := nullif(btrim(coalesce(p_value, '')), '');
  v_page_id uuid;
  v_ui_id uuid;
  v_ok boolean;
BEGIN
  IF v_locale = 'de' OR v_locale = '' THEN
    RETURN jsonb_build_object('success', false, 'updated', false, 'error', 'locale_not_allowed');
  END IF;
  SELECT (l.is_active AND NOT l.is_source) INTO v_ok
    FROM public.cms_locales l WHERE l.locale = v_locale;
  IF NOT coalesce(v_ok, false) THEN
    RETURN jsonb_build_object('success', false, 'updated', false, 'error', 'locale_not_allowed');
  END IF;

  IF p_area = 'section_field' THEN
    RETURN public.rpc_admin_update_section_field(
      p_page_key, p_section_key, p_unit_key, v_locale, p_value);
  END IF;

  IF p_area = 'ui_string' THEN
    SELECT u.id, u.source_text, u.namespace || '|' || u.string_key
      INTO v_ui_id, v_source, v_ref_key
      FROM public.cms_ui_strings u
     WHERE (p_ref_id IS NOT NULL AND u.id = p_ref_id)
        OR (p_ref_id IS NULL AND u.namespace = p_section_key AND u.string_key = p_unit_key);
    IF v_ui_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'updated', false, 'error', 'ui_string_not_found');
    END IF;

    IF v_value IS NULL THEN
      DELETE FROM public.cms_ui_string_translations
       WHERE ui_string_id = v_ui_id AND locale = v_locale;
    ELSE
      INSERT INTO public.cms_ui_string_translations (ui_string_id, locale, value)
      VALUES (v_ui_id, v_locale, v_value)
      ON CONFLICT (ui_string_id, locale)
      DO UPDATE SET value = EXCLUDED.value, updated_at = now();
    END IF;

    v_hash := public.cms_translation_hash(coalesce(v_source, ''));
    IF v_value IS NULL THEN
      DELETE FROM public.cms_translation_unit_state
       WHERE area = 'ui_string' AND ref_key = v_ref_key AND unit_key = p_unit_key AND locale = v_locale;
    ELSE
      INSERT INTO public.cms_translation_unit_state (area, ref_key, unit_key, locale, review_status, source_hash)
      VALUES ('ui_string', v_ref_key, p_unit_key, v_locale, 'geprueft', v_hash)
      ON CONFLICT (area, ref_key, unit_key, locale)
      DO UPDATE SET review_status = 'geprueft', source_hash = EXCLUDED.source_hash, updated_at = now();
    END IF;

    RETURN jsonb_build_object('success', true, 'updated', true, 'review_status', 'geprueft');
  END IF;

  IF p_area NOT IN ('page_title','nav_label','nav_description','asset_alt') THEN
    RETURN jsonb_build_object('success', false, 'updated', false, 'error', 'area_not_supported');
  END IF;

  v_ref_key := CASE WHEN p_area = 'page_title' THEN p_page_key ELSE p_ref_id::text END;
  IF v_ref_key IS NULL THEN
    RETURN jsonb_build_object('success', false, 'updated', false, 'error', 'ref_missing');
  END IF;

  IF p_area = 'page_title' THEN
    SELECT id, title_de INTO v_page_id, v_source FROM public.cms_pages WHERE page_key = p_page_key;
    IF v_page_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'updated', false, 'error', 'page_not_found');
    END IF;
    INSERT INTO public.cms_page_translations (page_id, locale, title)
    VALUES (v_page_id, v_locale, v_value)
    ON CONFLICT (page_id, locale) DO UPDATE SET title = EXCLUDED.title, updated_at = now();
    IF v_locale = 'en' THEN
      UPDATE public.cms_pages SET title_en = v_value, updated_at = now() WHERE id = v_page_id;
    ELSIF v_locale = 'pl' THEN
      UPDATE public.cms_pages SET title_pl = v_value, updated_at = now() WHERE id = v_page_id;
    END IF;
    v_res := jsonb_build_object('success', true, 'updated', true);

  ELSIF p_area IN ('nav_label','nav_description') THEN
    SELECT CASE WHEN p_area = 'nav_label' THEN label_de ELSE description_de END
      INTO v_source FROM public.cms_navigation_nodes WHERE id = p_ref_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'updated', false, 'error', 'node_not_found');
    END IF;
    IF p_area = 'nav_label' THEN
      INSERT INTO public.cms_navigation_node_translations (node_id, locale, label)
      VALUES (p_ref_id, v_locale, v_value)
      ON CONFLICT (node_id, locale) DO UPDATE SET label = EXCLUDED.label, updated_at = now();
      IF v_locale IN ('en','pl') THEN
        v_res := public.rpc_admin_update_navigation_label(p_ref_id, v_locale, p_value);
      END IF;
    ELSE
      INSERT INTO public.cms_navigation_node_translations (node_id, locale, description)
      VALUES (p_ref_id, v_locale, v_value)
      ON CONFLICT (node_id, locale) DO UPDATE SET description = EXCLUDED.description, updated_at = now();
      IF v_locale IN ('en','pl') THEN
        v_res := public.rpc_admin_update_navigation_description(p_ref_id, v_locale, p_value);
      END IF;
    END IF;
    v_res := coalesce(v_res, '{}'::jsonb) || jsonb_build_object('success', true, 'updated', true);

  ELSE
    SELECT alt_de INTO v_source FROM public.cms_assets WHERE id = p_ref_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'updated', false, 'error', 'asset_not_found');
    END IF;
    INSERT INTO public.cms_asset_translations (asset_id, locale, alt_text)
    VALUES (p_ref_id, v_locale, v_value)
    ON CONFLICT (asset_id, locale) DO UPDATE SET alt_text = EXCLUDED.alt_text, updated_at = now();
    IF v_locale IN ('en','pl') THEN
      v_res := public.rpc_admin_update_asset_alt(p_ref_id, v_locale, p_value);
    END IF;
    v_res := coalesce(v_res, '{}'::jsonb) || jsonb_build_object('success', true, 'updated', true);
  END IF;

  v_hash := public.cms_translation_hash(coalesce(v_source, ''));

  IF v_value IS NULL THEN
    DELETE FROM public.cms_translation_unit_state
     WHERE area = p_area AND ref_key = v_ref_key AND unit_key = p_unit_key AND locale = v_locale;
  ELSE
    INSERT INTO public.cms_translation_unit_state (area, ref_key, unit_key, locale, review_status, source_hash)
    VALUES (p_area, v_ref_key, p_unit_key, v_locale, 'geprueft', v_hash)
    ON CONFLICT (area, ref_key, unit_key, locale)
    DO UPDATE SET review_status = 'geprueft', source_hash = EXCLUDED.source_hash, updated_at = now();
  END IF;

  RETURN v_res || jsonb_build_object('review_status', 'geprueft');
END;
$function$;

-- =====================================================================
-- 4. Maschinelles Ergebnis für Bedienungstexte anwenden
-- =====================================================================
CREATE OR REPLACE FUNCTION public.rpc_internal_apply_machine_unit(
  p_area text, p_ref_id uuid, p_page_key text, p_section_key text,
  p_unit_key text, p_locale text, p_value text, p_source_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_target_ok boolean;
  v_current text;
  v_ref_key text;
  v_state public.cms_translation_unit_state;
  v_locale text := lower(btrim(coalesce(p_locale, '')));
  v_page_id uuid;
  v_ui_id uuid;
BEGIN
  IF p_area = 'section_field' THEN
    RETURN public.rpc_internal_apply_machine_translation(
      p_page_key, p_section_key, p_unit_key, v_locale, p_value, p_source_hash);
  END IF;

  IF p_area NOT IN ('page_title','nav_label','nav_description','asset_alt','ui_string') THEN
    RETURN jsonb_build_object('success', false, 'error', 'area_not_supported');
  END IF;
  IF v_locale = 'de' OR v_locale = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'locale_not_allowed');
  END IF;

  SELECT (l.is_active AND NOT l.is_source) INTO v_target_ok
    FROM public.cms_locales l WHERE l.locale = v_locale;
  IF NOT coalesce(v_target_ok, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'locale_not_allowed');
  END IF;
  IF coalesce(btrim(p_value), '') = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'empty_value');
  END IF;

  IF p_area = 'ui_string' THEN
    SELECT u.id, u.namespace || '|' || u.string_key, t.value
      INTO v_ui_id, v_ref_key, v_current
      FROM public.cms_ui_strings u
      LEFT JOIN public.cms_ui_string_translations t
             ON t.ui_string_id = u.id AND t.locale = v_locale
     WHERE (p_ref_id IS NOT NULL AND u.id = p_ref_id)
        OR (p_ref_id IS NULL AND u.namespace = p_section_key AND u.string_key = p_unit_key);
    IF v_ui_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'target_not_found');
    END IF;

    SELECT * INTO v_state FROM public.cms_translation_unit_state
     WHERE area = 'ui_string' AND ref_key = v_ref_key AND unit_key = p_unit_key AND locale = v_locale;

    IF coalesce(btrim(v_current), '') <> ''
       AND coalesce(v_state.review_status, 'geprueft') = 'geprueft' THEN
      RETURN jsonb_build_object('success', true, 'updated', false, 'skipped', 'manual_value');
    END IF;

    INSERT INTO public.cms_ui_string_translations (ui_string_id, locale, value)
    VALUES (v_ui_id, v_locale, p_value)
    ON CONFLICT (ui_string_id, locale)
    DO UPDATE SET value = EXCLUDED.value, updated_at = now();

    INSERT INTO public.cms_translation_unit_state (area, ref_key, unit_key, locale, review_status, source_hash)
    VALUES ('ui_string', v_ref_key, p_unit_key, v_locale, 'maschinell', p_source_hash)
    ON CONFLICT (area, ref_key, unit_key, locale)
    DO UPDATE SET review_status = 'maschinell', source_hash = EXCLUDED.source_hash, updated_at = now();

    RETURN jsonb_build_object('success', true, 'updated', true);
  END IF;

  v_ref_key := CASE WHEN p_area = 'page_title' THEN p_page_key ELSE p_ref_id::text END;
  IF v_ref_key IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'ref_missing');
  END IF;

  IF p_area = 'page_title' THEN
    SELECT p.id, coalesce(t.title, CASE v_locale WHEN 'en' THEN p.title_en WHEN 'pl' THEN p.title_pl END)
      INTO v_page_id, v_current
      FROM public.cms_pages p
      LEFT JOIN public.cms_page_translations t ON t.page_id = p.id AND t.locale = v_locale
     WHERE p.page_key = p_page_key;
    IF v_page_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'target_not_found');
    END IF;
  ELSIF p_area = 'nav_label' THEN
    SELECT coalesce(t.label, CASE v_locale WHEN 'en' THEN n.label_en WHEN 'pl' THEN n.label_pl END)
      INTO v_current
      FROM public.cms_navigation_nodes n
      LEFT JOIN public.cms_navigation_node_translations t ON t.node_id = n.id AND t.locale = v_locale
     WHERE n.id = p_ref_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'target_not_found'); END IF;
  ELSIF p_area = 'nav_description' THEN
    SELECT coalesce(t.description, CASE v_locale WHEN 'en' THEN n.description_en WHEN 'pl' THEN n.description_pl END)
      INTO v_current
      FROM public.cms_navigation_nodes n
      LEFT JOIN public.cms_navigation_node_translations t ON t.node_id = n.id AND t.locale = v_locale
     WHERE n.id = p_ref_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'target_not_found'); END IF;
  ELSE
    SELECT coalesce(t.alt_text, CASE v_locale WHEN 'en' THEN a.alt_en WHEN 'pl' THEN a.alt_pl END)
      INTO v_current
      FROM public.cms_assets a
      LEFT JOIN public.cms_asset_translations t ON t.asset_id = a.id AND t.locale = v_locale
     WHERE a.id = p_ref_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'target_not_found'); END IF;
  END IF;

  SELECT * INTO v_state FROM public.cms_translation_unit_state
   WHERE area = p_area AND ref_key = v_ref_key AND unit_key = p_unit_key AND locale = v_locale;

  IF coalesce(btrim(v_current), '') <> ''
     AND coalesce(v_state.review_status, 'geprueft') = 'geprueft' THEN
    RETURN jsonb_build_object('success', true, 'updated', false, 'skipped', 'manual_value');
  END IF;

  IF p_area = 'page_title' THEN
    INSERT INTO public.cms_page_translations (page_id, locale, title)
    VALUES (v_page_id, v_locale, p_value)
    ON CONFLICT (page_id, locale) DO UPDATE SET title = EXCLUDED.title, updated_at = now();
    IF v_locale = 'en' THEN
      UPDATE public.cms_pages SET title_en = p_value, updated_at = now() WHERE id = v_page_id;
    ELSIF v_locale = 'pl' THEN
      UPDATE public.cms_pages SET title_pl = p_value, updated_at = now() WHERE id = v_page_id;
    END IF;
  ELSIF p_area = 'nav_label' THEN
    INSERT INTO public.cms_navigation_node_translations (node_id, locale, label)
    VALUES (p_ref_id, v_locale, p_value)
    ON CONFLICT (node_id, locale) DO UPDATE SET label = EXCLUDED.label, updated_at = now();
    IF v_locale = 'en' THEN
      UPDATE public.cms_navigation_nodes SET label_en = p_value, updated_at = now() WHERE id = p_ref_id;
    ELSIF v_locale = 'pl' THEN
      UPDATE public.cms_navigation_nodes SET label_pl = p_value, updated_at = now() WHERE id = p_ref_id;
    END IF;
  ELSIF p_area = 'nav_description' THEN
    INSERT INTO public.cms_navigation_node_translations (node_id, locale, description)
    VALUES (p_ref_id, v_locale, p_value)
    ON CONFLICT (node_id, locale) DO UPDATE SET description = EXCLUDED.description, updated_at = now();
    IF v_locale = 'en' THEN
      UPDATE public.cms_navigation_nodes SET description_en = p_value, updated_at = now() WHERE id = p_ref_id;
    ELSIF v_locale = 'pl' THEN
      UPDATE public.cms_navigation_nodes SET description_pl = p_value, updated_at = now() WHERE id = p_ref_id;
    END IF;
  ELSE
    INSERT INTO public.cms_asset_translations (asset_id, locale, alt_text)
    VALUES (p_ref_id, v_locale, p_value)
    ON CONFLICT (asset_id, locale) DO UPDATE SET alt_text = EXCLUDED.alt_text, updated_at = now();
    IF v_locale = 'en' THEN
      UPDATE public.cms_assets SET alt_en = p_value, updated_at = now() WHERE id = p_ref_id;
    ELSIF v_locale = 'pl' THEN
      UPDATE public.cms_assets SET alt_pl = p_value, updated_at = now() WHERE id = p_ref_id;
    END IF;
  END IF;

  INSERT INTO public.cms_translation_unit_state (area, ref_key, unit_key, locale, review_status, source_hash)
  VALUES (p_area, v_ref_key, p_unit_key, v_locale, 'maschinell', p_source_hash)
  ON CONFLICT (area, ref_key, unit_key, locale)
  DO UPDATE SET review_status = 'maschinell', source_hash = EXCLUDED.source_hash, updated_at = now();

  RETURN jsonb_build_object('success', true, 'updated', true);
END;
$function$;

-- =====================================================================
-- 5. Katalogabgleich (idempotent, überschreibt nie einen Zieltext)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.rpc_admin_sync_ui_strings(p_manifest jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '120s'
AS $function$
DECLARE
  v_version text := coalesce(p_manifest->>'version', 'unbekannt');
  v_inserted int := 0;
  v_source_updated int := 0;
  v_deactivated int := 0;
  v_reactivated int := 0;
  v_seeded jsonb := '{}'::jsonb;
  v_seed_locale text;
  v_seed_count int;
BEGIN
  IF p_manifest IS NULL OR jsonb_typeof(p_manifest->'entries') <> 'array' THEN
    RETURN jsonb_build_object('success', false, 'error', 'manifest_invalid');
  END IF;

  CREATE TEMP TABLE tmp_ui_manifest ON COMMIT DROP AS
  SELECT lower(btrim(e->>'namespace')) AS namespace,
         btrim(e->>'key') AS string_key,
         e->>'de' AS source_text,
         coalesce(e->'seed', '{}'::jsonb) AS seed
    FROM jsonb_array_elements(p_manifest->'entries') e
   WHERE coalesce(btrim(e->>'namespace'), '') <> ''
     AND coalesce(btrim(e->>'key'), '') <> ''
     AND coalesce(btrim(e->>'de'), '') <> '';

  -- neue Schlüssel
  INSERT INTO public.cms_ui_strings (namespace, string_key, source_text, source_hash, manifest_version)
  SELECT m.namespace, m.string_key, m.source_text,
         public.cms_translation_hash(m.source_text), v_version
    FROM tmp_ui_manifest m
   WHERE NOT EXISTS (
     SELECT 1 FROM public.cms_ui_strings u
      WHERE u.namespace = m.namespace AND u.string_key = m.string_key);
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  -- geänderte deutsche Quelltexte (Zieltexte bleiben unberührt; sie gelten
  -- über den Fingerabdruck automatisch als „muss aktualisiert werden")
  UPDATE public.cms_ui_strings u
     SET source_text = m.source_text,
         source_hash = public.cms_translation_hash(m.source_text),
         manifest_version = v_version,
         updated_at = now()
    FROM tmp_ui_manifest m
   WHERE u.namespace = m.namespace AND u.string_key = m.string_key
     AND u.source_text <> m.source_text;
  GET DIAGNOSTICS v_source_updated = ROW_COUNT;

  -- wieder aufgenommene Schlüssel
  UPDATE public.cms_ui_strings u
     SET is_active = true, manifest_version = v_version, updated_at = now()
    FROM tmp_ui_manifest m
   WHERE u.namespace = m.namespace AND u.string_key = m.string_key
     AND u.is_active = false;
  GET DIAGNOSTICS v_reactivated = ROW_COUNT;

  -- entfallene Schlüssel: nur stilllegen, nie löschen
  UPDATE public.cms_ui_strings u
     SET is_active = false, updated_at = now()
   WHERE u.is_active
     AND NOT EXISTS (
       SELECT 1 FROM tmp_ui_manifest m
        WHERE m.namespace = u.namespace AND m.string_key = u.string_key);
  GET DIAGNOSTICS v_deactivated = ROW_COUNT;

  -- Startwerte: nur dort, wo in der Datenbank noch kein Zieltext steht
  FOR v_seed_locale IN
    SELECT l.locale FROM public.cms_locales l WHERE NOT l.is_source
  LOOP
    INSERT INTO public.cms_ui_string_translations (ui_string_id, locale, value)
    SELECT u.id, v_seed_locale, m.seed->>v_seed_locale
      FROM tmp_ui_manifest m
      JOIN public.cms_ui_strings u
        ON u.namespace = m.namespace AND u.string_key = m.string_key
     WHERE coalesce(btrim(m.seed->>v_seed_locale), '') <> ''
       AND NOT EXISTS (
         SELECT 1 FROM public.cms_ui_string_translations t
          WHERE t.ui_string_id = u.id AND t.locale = v_seed_locale
            AND coalesce(btrim(t.value), '') <> '')
    ON CONFLICT (ui_string_id, locale) DO UPDATE
       SET value = EXCLUDED.value, updated_at = now()
     WHERE coalesce(btrim(public.cms_ui_string_translations.value), '') = '';
    GET DIAGNOSTICS v_seed_count = ROW_COUNT;

    -- Startwerte aus den Sprachdateien sind von Hand gepflegt: als geprüft
    -- markieren, damit automatische Läufe sie nicht ersetzen.
    INSERT INTO public.cms_translation_unit_state (area, ref_key, unit_key, locale, review_status, source_hash)
    SELECT 'ui_string', u.namespace || '|' || u.string_key, u.string_key, v_seed_locale,
           'geprueft', u.source_hash
      FROM public.cms_ui_strings u
      JOIN public.cms_ui_string_translations t
        ON t.ui_string_id = u.id AND t.locale = v_seed_locale
     WHERE coalesce(btrim(t.value), '') <> ''
    ON CONFLICT (area, ref_key, unit_key, locale) DO NOTHING;

    v_seeded := v_seeded || jsonb_build_object(v_seed_locale, v_seed_count);
  END LOOP;

  PERFORM public.rpc_internal_translation_coverage_invalidate();

  RETURN jsonb_build_object(
    'success', true,
    'manifest_version', v_version,
    'manifest_entries', (SELECT count(*) FROM tmp_ui_manifest),
    'inserted', v_inserted,
    'source_updated', v_source_updated,
    'reactivated', v_reactivated,
    'deactivated', v_deactivated,
    'seeded', v_seeded,
    'catalog_active', (SELECT count(*) FROM public.cms_ui_strings WHERE is_active));
END;
$function$;

REVOKE ALL ON FUNCTION public.rpc_admin_sync_ui_strings(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_admin_sync_ui_strings(jsonb) TO anon, authenticated, service_role;

-- =====================================================================
-- 6. Öffentliches Lesen der Bedienungstexte (DB-first zur Laufzeit)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.rpc_public_read_ui_strings(p_locale text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '15s'
AS $function$
  WITH cfg AS (
    SELECT l.locale FROM public.cms_locales l
     WHERE l.locale = lower(btrim(coalesce(p_locale, ''))) AND l.is_active AND NOT l.is_source
  )
  SELECT coalesce(jsonb_object_agg(x.namespace, x.entries), '{}'::jsonb)
    FROM (
      SELECT u.namespace,
             jsonb_object_agg(u.string_key, t.value) AS entries
        FROM public.cms_ui_strings u
        JOIN public.cms_ui_string_translations t ON t.ui_string_id = u.id
        JOIN cfg ON cfg.locale = t.locale
       WHERE u.is_active AND coalesce(btrim(t.value), '') <> ''
       GROUP BY u.namespace
    ) x
$function$;

REVOKE ALL ON FUNCTION public.rpc_public_read_ui_strings(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_public_read_ui_strings(text) TO anon, authenticated, service_role;

-- =====================================================================
-- 7. Freigabereife einer Sprache — echte Abdeckung beider Klassen
-- =====================================================================
CREATE OR REPLACE FUNCTION public.rpc_admin_locale_release_readiness(p_locale text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '60s'
AS $function$
DECLARE
  v_loc text := lower(btrim(coalesce(p_locale, '')));
  v_row public.cms_locales;
  v_cms record;
  v_ui record;
BEGIN
  SELECT * INTO v_row FROM public.cms_locales WHERE locale = v_loc;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'locale_unknown');
  END IF;
  IF v_row.is_source THEN
    RETURN jsonb_build_object('success', true, 'locale', v_loc, 'is_source', true,
      'ready', true, 'content', '{}'::jsonb, 'ui', '{}'::jsonb);
  END IF;

  SELECT count(*)::bigint AS total,
         count(*) FILTER (WHERE coalesce(btrim(u.target_value), '') = '')::bigint AS missing
    INTO v_cms
    FROM public.cms_translation_units(v_loc, NULL,
      ARRAY['section_field','page_title','nav_label','nav_description','asset_alt']) u;

  SELECT count(*)::bigint AS total,
         count(*) FILTER (WHERE coalesce(btrim(u.target_value), '') = '')::bigint AS missing
    INTO v_ui
    FROM public.cms_translation_units(v_loc, NULL, ARRAY['ui_string']) u;

  RETURN jsonb_build_object(
    'success', true,
    'locale', v_loc,
    'is_source', false,
    'is_active', v_row.is_active,
    'is_public', v_row.is_public,
    'content', jsonb_build_object('total', v_cms.total, 'missing', v_cms.missing),
    'ui', jsonb_build_object('total', v_ui.total, 'missing', v_ui.missing),
    'ready', (v_ui.total > 0 AND v_ui.missing = 0 AND v_cms.missing = 0));
END;
$function$;

REVOKE ALL ON FUNCTION public.rpc_admin_locale_release_readiness(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_admin_locale_release_readiness(text) TO anon, authenticated, service_role;

-- =====================================================================
-- 8. Automatik: neue/geänderte deutsche Bedienungstexte vormerken
-- =====================================================================
CREATE OR REPLACE FUNCTION public.cms_autopilot_trg_ui_strings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.is_active AND (TG_OP = 'INSERT' OR coalesce(OLD.source_text, '') <> coalesce(NEW.source_text, '')) THEN
    PERFORM public.cms_autopilot_enqueue_unit(
      'ui_string', NEW.id, '~ui', NEW.namespace, NEW.string_key, NEW.source_text);
  END IF;
  RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.cms_autopilot_trg_ui_strings() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_cms_ui_strings_autopilot ON public.cms_ui_strings;
CREATE TRIGGER trg_cms_ui_strings_autopilot
  AFTER INSERT OR UPDATE OF source_text, is_active ON public.cms_ui_strings
  FOR EACH ROW EXECUTE FUNCTION public.cms_autopilot_trg_ui_strings();

-- =====================================================================
-- 9. Abdeckung: Bereich „ui_string" mitführen
-- =====================================================================
CREATE OR REPLACE FUNCTION public.rpc_internal_translation_coverage_cached(
  p_max_age_seconds integer DEFAULT 900,
  p_force boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '100s'
AS $function$
DECLARE
  v_areas text[] := ARRAY['section_field','page_title','nav_label','nav_description','asset_alt','ui_string'];
  v_max_age integer := greatest(coalesce(p_max_age_seconds, 900), 0);
  v_locales jsonb := '[]'::jsonb;
  v_source jsonb := '{}'::jsonb;
  v_total bigint := 0;
  v_loc record;
  v_pending text[] := ARRAY[]::text[];
  v_oldest timestamptz;
  v_any_stale boolean := false;
  v_refresh jsonb;
BEGIN
  v_refresh := public.rpc_internal_translation_coverage_refresh_one(
    CASE WHEN coalesce(p_force, false) THEN 0 ELSE v_max_age END, NULL);

  FOR v_loc IN
    SELECT l.locale, l.label_de, l.is_active, l.is_source, l.is_public,
           c.payload, c.computed_at, c.is_stale
      FROM public.cms_locales l
      LEFT JOIN public.cms_translation_coverage_locale_cache c ON c.locale = l.locale
     ORDER BY l.sort_order, l.locale
  LOOP
    IF v_loc.payload IS NULL THEN
      v_pending := v_pending || v_loc.locale;
      v_locales := v_locales || jsonb_build_object(
        'locale', v_loc.locale, 'label_de', v_loc.label_de,
        'is_active', v_loc.is_active, 'is_source', v_loc.is_source,
        'is_public', v_loc.is_public,
        'total', 0, 'filled', 0, 'machine', 0, 'stale', 0, 'reviewed', 0,
        'todo', 0, 'not_whitelisted', 0, 'open_runs', 0, 'failed_jobs', 0,
        'columns_supported', (v_loc.is_source OR v_loc.locale IN ('en','pl')),
        'pending', true,
        'by_area', '{}'::jsonb);
      CONTINUE;
    END IF;

    v_locales := v_locales || (v_loc.payload || jsonb_build_object('pending', false));
    IF v_loc.is_source THEN
      v_source := coalesce(v_loc.payload->'by_area', '{}'::jsonb);
      v_total := coalesce((v_loc.payload->>'total')::bigint, 0);
    END IF;
    IF v_oldest IS NULL OR v_loc.computed_at < v_oldest THEN
      v_oldest := v_loc.computed_at;
    END IF;
    v_any_stale := v_any_stale OR coalesce(v_loc.is_stale, false);
  END LOOP;

  IF v_total = 0 THEN
    SELECT coalesce((c.payload->>'total')::bigint, 0), coalesce(c.payload->'by_area', '{}'::jsonb)
      INTO v_total, v_source
      FROM public.cms_translation_coverage_locale_cache c
      JOIN public.cms_locales l ON l.locale = c.locale AND NOT l.is_source
     ORDER BY c.computed_at DESC
     LIMIT 1;
    v_source := coalesce(v_source, '{}'::jsonb);
  END IF;

  IF v_source <> '{}'::jsonb THEN
    SELECT coalesce(jsonb_object_agg(e.key, (e.value->>'total')::bigint), '{}'::jsonb)
      INTO v_source FROM jsonb_each(v_source) e;
  END IF;

  RETURN jsonb_build_object(
    'de_translatable_fields', coalesce(v_total, 0),
    'areas', to_jsonb(v_areas),
    'source_by_area', coalesce(v_source, '{}'::jsonb),
    'locales', v_locales,
    'cache', jsonb_build_object(
      'hit', (v_refresh->>'refreshed') IS NULL,
      'is_stale', coalesce(v_any_stale, false) OR coalesce(array_length(v_pending, 1), 0) > 0,
      'computed_at', coalesce(v_oldest, now()),
      'compute_ms', coalesce((v_refresh->>'compute_ms')::int, 0),
      'age_seconds', CASE WHEN v_oldest IS NULL THEN 0
                          ELSE floor(extract(epoch FROM now() - v_oldest))::int END,
      'refreshed_locale', v_refresh->>'refreshed',
      'pending_locales', to_jsonb(v_pending)
    ));
END
$function$;

REVOKE ALL ON FUNCTION public.rpc_internal_translation_coverage_cached(integer, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_internal_translation_coverage_cached(integer, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.rpc_internal_translation_coverage_cached(integer, boolean) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_internal_translation_coverage_cached(integer, boolean) TO service_role;