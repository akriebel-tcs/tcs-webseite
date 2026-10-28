-- ============================================================
-- Batch 3: vertikale Sprachstruktur (additiv, rückwärtskompatibel)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cms_page_translations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id uuid NOT NULL REFERENCES public.cms_pages(id) ON DELETE CASCADE,
  locale text NOT NULL REFERENCES public.cms_locales(locale) ON UPDATE CASCADE,
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cms_page_translations_uniq UNIQUE (page_id, locale)
);

CREATE TABLE IF NOT EXISTS public.cms_navigation_node_translations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES public.cms_navigation_nodes(id) ON DELETE CASCADE,
  locale text NOT NULL REFERENCES public.cms_locales(locale) ON UPDATE CASCADE,
  label text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cms_navigation_node_translations_uniq UNIQUE (node_id, locale)
);

CREATE TABLE IF NOT EXISTS public.cms_asset_translations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id uuid NOT NULL REFERENCES public.cms_assets(id) ON DELETE CASCADE,
  locale text NOT NULL REFERENCES public.cms_locales(locale) ON UPDATE CASCADE,
  alt_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cms_asset_translations_uniq UNIQUE (asset_id, locale)
);

GRANT SELECT ON public.cms_page_translations TO anon, authenticated;
GRANT ALL ON public.cms_page_translations TO service_role;
GRANT SELECT ON public.cms_navigation_node_translations TO anon, authenticated;
GRANT ALL ON public.cms_navigation_node_translations TO service_role;
GRANT SELECT ON public.cms_asset_translations TO anon, authenticated;
GRANT ALL ON public.cms_asset_translations TO service_role;

ALTER TABLE public.cms_page_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_navigation_node_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_asset_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cms_page_translations public read published" ON public.cms_page_translations;
CREATE POLICY "cms_page_translations public read published"
  ON public.cms_page_translations FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cms_pages p
     WHERE p.id = cms_page_translations.page_id
       AND p.status = 'published' AND p.is_active = true));

DROP POLICY IF EXISTS "cms_navigation_node_translations public read active" ON public.cms_navigation_node_translations;
CREATE POLICY "cms_navigation_node_translations public read active"
  ON public.cms_navigation_node_translations FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cms_navigation_nodes n
     WHERE n.id = cms_navigation_node_translations.node_id
       AND n.is_active = true));

DROP POLICY IF EXISTS "cms_asset_translations public read published" ON public.cms_asset_translations;
CREATE POLICY "cms_asset_translations public read published"
  ON public.cms_asset_translations FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cms_assets a
     WHERE a.id = cms_asset_translations.asset_id
       AND a.is_active = true
       AND public.cms_page_is_public(a.page_key)));

DROP TRIGGER IF EXISTS trg_cms_page_translations_updated ON public.cms_page_translations;
CREATE TRIGGER trg_cms_page_translations_updated BEFORE UPDATE ON public.cms_page_translations
  FOR EACH ROW EXECUTE FUNCTION public.cms_set_updated_at();
DROP TRIGGER IF EXISTS trg_cms_nav_translations_updated ON public.cms_navigation_node_translations;
CREATE TRIGGER trg_cms_nav_translations_updated BEFORE UPDATE ON public.cms_navigation_node_translations
  FOR EACH ROW EXECUTE FUNCTION public.cms_set_updated_at();
DROP TRIGGER IF EXISTS trg_cms_asset_translations_updated ON public.cms_asset_translations;
CREATE TRIGGER trg_cms_asset_translations_updated BEFORE UPDATE ON public.cms_asset_translations
  FOR EACH ROW EXECUTE FUNCTION public.cms_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_cms_page_translations_locale ON public.cms_page_translations(locale);
CREATE INDEX IF NOT EXISTS idx_cms_nav_translations_locale ON public.cms_navigation_node_translations(locale);
CREATE INDEX IF NOT EXISTS idx_cms_asset_translations_locale ON public.cms_asset_translations(locale);

-- ------------------------------------------------ idempotenter Rückfüllschritt
INSERT INTO public.cms_page_translations (page_id, locale, title)
SELECT p.id, v.locale, v.title
  FROM public.cms_pages p
  CROSS JOIN LATERAL (VALUES ('de', p.title_de), ('en', p.title_en), ('pl', p.title_pl)) AS v(locale, title)
 WHERE coalesce(btrim(v.title), '') <> ''
   AND EXISTS (SELECT 1 FROM public.cms_locales l WHERE l.locale = v.locale)
ON CONFLICT (page_id, locale) DO NOTHING;

INSERT INTO public.cms_navigation_node_translations (node_id, locale, label, description)
SELECT n.id, v.locale, v.label, v.description
  FROM public.cms_navigation_nodes n
  CROSS JOIN LATERAL (VALUES
      ('de', n.label_de, n.description_de),
      ('en', n.label_en, n.description_en),
      ('pl', n.label_pl, n.description_pl)) AS v(locale, label, description)
 WHERE coalesce(btrim(v.label), '') <> '' OR coalesce(btrim(v.description), '') <> ''
   AND EXISTS (SELECT 1 FROM public.cms_locales l WHERE l.locale = v.locale)
ON CONFLICT (node_id, locale) DO NOTHING;

INSERT INTO public.cms_asset_translations (asset_id, locale, alt_text)
SELECT a.id, v.locale, v.alt
  FROM public.cms_assets a
  CROSS JOIN LATERAL (VALUES
      ('de', coalesce(a.alt_de, a.alt_text_de)),
      ('en', coalesce(a.alt_en, a.alt_text_en)),
      ('pl', coalesce(a.alt_pl, a.alt_text_pl))) AS v(locale, alt)
 WHERE coalesce(btrim(v.alt), '') <> ''
   AND EXISTS (SELECT 1 FROM public.cms_locales l WHERE l.locale = v.locale)
ON CONFLICT (asset_id, locale) DO NOTHING;

-- ------------------------------------------------ Sprache anlegen / pflegen
CREATE OR REPLACE FUNCTION public.rpc_admin_upsert_locale(
  p_locale text,
  p_label_de text,
  p_label_native text,
  p_fallback_locale text DEFAULT 'de',
  p_sort_order integer DEFAULT NULL,
  p_notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_locale text := lower(btrim(coalesce(p_locale, '')));
  v_sort int;
  v_row public.cms_locales;
BEGIN
  IF v_locale = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'locale_required');
  END IF;
  -- BCP-47-Grundform: 2-3 Buchstaben, optional Skript/Region/Variante
  IF v_locale !~ '^[a-z]{2,3}(-[a-z0-9]{2,8}){0,3}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'locale_code_invalid');
  END IF;
  IF coalesce(btrim(p_label_de), '') = '' OR coalesce(btrim(p_label_native), '') = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'label_required');
  END IF;
  IF p_fallback_locale IS NOT NULL AND lower(btrim(p_fallback_locale)) <> v_locale
     AND NOT EXISTS (SELECT 1 FROM public.cms_locales l WHERE l.locale = lower(btrim(p_fallback_locale))) THEN
    RETURN jsonb_build_object('success', false, 'error', 'fallback_unknown');
  END IF;

  SELECT coalesce(p_sort_order, (SELECT max(sort_order) + 10 FROM public.cms_locales), 100) INTO v_sort;

  INSERT INTO public.cms_locales (locale, label_de, label_native, is_source, is_active, is_public,
                                  fallback_locale, sort_order, deepl_supported, notes)
  VALUES (v_locale, btrim(p_label_de), btrim(p_label_native), false, false, false,
          coalesce(lower(nullif(btrim(p_fallback_locale), '')), 'de'), v_sort, false, p_notes)
  ON CONFLICT (locale) DO UPDATE
     SET label_de = EXCLUDED.label_de,
         label_native = EXCLUDED.label_native,
         fallback_locale = EXCLUDED.fallback_locale,
         notes = coalesce(EXCLUDED.notes, public.cms_locales.notes),
         updated_at = now()
  RETURNING * INTO v_row;

  INSERT INTO public.cms_locale_visibility_audit (locale, was_active, was_public, is_active, is_public, reason)
  VALUES (v_locale, NULL, NULL, v_row.is_active, v_row.is_public, coalesce(p_notes, 'Sprache angelegt/aktualisiert'));

  RETURN jsonb_build_object('success', true, 'locale', v_row.locale,
                            'is_active', v_row.is_active, 'is_public', v_row.is_public);
END;
$function$;

REVOKE ALL ON FUNCTION public.rpc_admin_upsert_locale(text, text, text, text, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_admin_upsert_locale(text, text, text, text, integer, text) TO anon, authenticated, service_role;

-- ------------------------------------------------ Integritätsprüfung
CREATE OR REPLACE FUNCTION public.rpc_admin_translation_integrity()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'unbekannte_sprache', 0,
    'verwaiste_uebersetzung', 0,
    'fehlende_quelle', (
      (SELECT count(*) FROM public.cms_page_translations t
         JOIN public.cms_pages p ON p.id = t.page_id
        WHERE t.locale <> 'de' AND coalesce(btrim(p.title_de), '') = ''
          AND coalesce(btrim(t.title), '') <> '')
      + (SELECT count(*) FROM public.cms_navigation_node_translations t
           JOIN public.cms_navigation_nodes n ON n.id = t.node_id
          WHERE t.locale <> 'de' AND coalesce(btrim(n.label_de), '') = ''
            AND coalesce(btrim(t.label), '') <> '')
      + (SELECT count(*) FROM public.cms_asset_translations t
           JOIN public.cms_assets a ON a.id = t.asset_id
          WHERE t.locale <> 'de' AND coalesce(btrim(a.alt_de), '') = ''
            AND coalesce(btrim(t.alt_text), '') <> '')
    ),
    'dubletten', 0,
    'zeilen', jsonb_build_object(
      'seitentitel', (SELECT count(*) FROM public.cms_page_translations),
      'navigation', (SELECT count(*) FROM public.cms_navigation_node_translations),
      'bild_alt', (SELECT count(*) FROM public.cms_asset_translations)
    ),
    'altspalten_abweichung', (
      (SELECT count(*) FROM public.cms_pages p
         LEFT JOIN public.cms_page_translations t ON t.page_id = p.id AND t.locale = 'en'
        WHERE coalesce(btrim(p.title_en), '') <> '' AND coalesce(t.title, '') <> coalesce(p.title_en, ''))
      + (SELECT count(*) FROM public.cms_navigation_nodes n
           LEFT JOIN public.cms_navigation_node_translations t ON t.node_id = n.id AND t.locale = 'en'
          WHERE coalesce(btrim(n.label_en), '') <> '' AND coalesce(t.label, '') <> coalesce(n.label_en, ''))
      + (SELECT count(*) FROM public.cms_assets a
           LEFT JOIN public.cms_asset_translations t ON t.asset_id = a.id AND t.locale = 'en'
          WHERE coalesce(btrim(a.alt_en), '') <> '' AND coalesce(t.alt_text, '') <> coalesce(a.alt_en, ''))
    )
  );
$function$;

REVOKE ALL ON FUNCTION public.rpc_admin_translation_integrity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_admin_translation_integrity() TO anon, authenticated, service_role;

-- ------------------------------------------------ Inventar liest vertikal zuerst
CREATE OR REPLACE FUNCTION public.cms_translation_units(
  p_target_locale text,
  p_page_keys text[] DEFAULT NULL::text[],
  p_areas text[] DEFAULT NULL::text[])
RETURNS TABLE(area text, ref_id uuid, ref_key text, page_key text, section_key text, unit_key text,
              sort_a text, sort_b text, sort_c text, label text, source_text text, source_hash text,
              target_value text, target_status text, target_hash text, whitelisted boolean, is_todo boolean)
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
       AND f.field_key IS NOT NULL
       AND f.field_key !~ '_enabled$'
       AND f.field_key NOT IN ('phone_label', 'email_label')
       AND f.field_key !~ '(^|[._])(icon|image|href|url|link|slug|id|color|colour|bg|variant|aspect|order|position|kind|focus)([._]|$)'
       AND (
            f.field_key ~ '(^|\.)(title|label|text|description|intro|headline|subline|eyebrow|frage|antwort|answer|question|alt)$'
         OR f.field_key ~ '_label$'
         OR f.field_key ~ '\.\d+$'
       )
       AND f.value IS NOT NULL AND btrim(f.value) <> ''
       AND btrim(f.value) ~ '[A-Za-zÄÖÜäöüß]'
       AND btrim(f.value) !~* '^(https?://|www\.|/|#|mailto:|tel:)'
       AND btrim(f.value) !~* '\.(png|jpe?g|svg|webp|avif|gif|pdf|mp4|webm)$'
       AND btrim(f.value) !~* '^#?[0-9a-f]{3,8}$'
       AND btrim(f.value) !~* '^(true|false|on|off|yes|no|ja|nein|auto|none|null|left|right|center|centre|top|bottom|start|end|asc|desc)$'
       AND btrim(f.value) !~ '^[a-z0-9]+([._:/-][a-z0-9]+)+$'

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
  ),
  scoped AS (
    SELECT b.*, md5(lower(btrim(regexp_replace(coalesce(b.source_text, ''), '\s+', ' ', 'g')))) AS src_hash
      FROM base b
     WHERE p_page_keys IS NULL
        OR array_length(p_page_keys, 1) IS NULL
        OR b.page_key = ANY (p_page_keys)
  ),
  page_wl AS (
    SELECT DISTINCT w.page_key
      FROM public.cms_admin_editable_fields w, cfg
     WHERE w.locale = cfg.loc AND w.is_enabled = true
  ),
  joined AS (
    SELECT b.*,
           CASE b.area
             WHEN 'section_field' THEN sf.value
             -- vertikale Struktur zuerst, Altspalten nur als Übergangs-Rückfall
             WHEN 'page_title' THEN coalesce(pt.title,
                    CASE cfg.loc WHEN 'en' THEN pg.title_en WHEN 'pl' THEN pg.title_pl END)
             WHEN 'nav_label' THEN coalesce(nt.label,
                    CASE cfg.loc WHEN 'en' THEN nn.label_en WHEN 'pl' THEN nn.label_pl END)
             WHEN 'nav_description' THEN coalesce(nt.description,
                    CASE cfg.loc WHEN 'en' THEN nn.description_en WHEN 'pl' THEN nn.description_pl END)
             WHEN 'asset_alt' THEN coalesce(at2.alt_text,
                    CASE cfg.loc WHEN 'en' THEN ca.alt_en WHEN 'pl' THEN ca.alt_pl END)
           END AS tgt_value,
           CASE b.area WHEN 'section_field' THEN sf.review_status ELSE st.review_status END AS raw_status,
           CASE b.area WHEN 'section_field' THEN sf.source_hash ELSE st.source_hash END AS tgt_hash,
           CASE b.area
             WHEN 'section_field' THEN coalesce(w.is_enabled, false)
             ELSE (pw.page_key IS NOT NULL)
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
      LEFT JOIN page_wl pw
             ON b.area <> 'section_field' AND pw.page_key = b.page_key
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

-- ------------------------------------------------ Schreibwege: vertikal + Altspalten
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
BEGIN
  IF p_area = 'section_field' THEN
    RETURN public.rpc_internal_apply_machine_translation(
      p_page_key, p_section_key, p_unit_key, v_locale, p_value, p_source_hash);
  END IF;

  IF p_area NOT IN ('page_title','nav_label','nav_description','asset_alt') THEN
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

  v_ref_key := CASE WHEN p_area = 'page_title' THEN p_page_key ELSE p_ref_id::text END;
  IF v_ref_key IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'ref_missing');
  END IF;

  -- aktuellen Zielwert lesen: vertikal zuerst, Altspalte als Rückfall
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

  -- Von Hand gepflegte oder unbekannte Zielwerte werden NIE überschrieben.
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

-- ------------------------------------------- öffentliche Navigation: Sprachkarte
CREATE OR REPLACE FUNCTION public.rpc_public_read_navigation_tree(p_nav_area text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', n.id,
        'node_key', n.node_key,
        'parent_node_key', p.node_key,
        'page_key', n.page_key,
        'label_de', n.label_de,
        'label_en', n.label_en,
        'label_pl', n.label_pl,
        'description_de', n.description_de,
        'description_en', n.description_en,
        'description_pl', n.description_pl,
        'labels', (SELECT coalesce(jsonb_object_agg(t.locale, t.label) FILTER (WHERE t.label IS NOT NULL), '{}'::jsonb)
                     FROM public.cms_navigation_node_translations t WHERE t.node_id = n.id),
        'descriptions', (SELECT coalesce(jsonb_object_agg(t.locale, t.description) FILTER (WHERE t.description IS NOT NULL), '{}'::jsonb)
                     FROM public.cms_navigation_node_translations t WHERE t.node_id = n.id),
        'route_path', n.route_path,
        'external_url', n.external_url,
        'node_type', n.node_type,
        'sort_order', n.sort_order,
        'is_active', n.is_active,
        'show_in_public_nav', n.show_in_public_nav
      )
      ORDER BY n.sort_order, n.node_key
    ),
    '[]'::jsonb
  )
  FROM public.cms_navigation_nodes n
  LEFT JOIN public.cms_navigation_nodes p ON p.id = n.parent_id
  LEFT JOIN public.cms_pages pg ON pg.page_key = n.page_key
  WHERE n.nav_area = p_nav_area
    AND n.is_active = true
    AND n.show_in_public_nav = true
    AND (
      n.page_key IS NULL
      OR (pg.status = 'published' AND pg.is_active = true)
    );
$function$;

CREATE OR REPLACE FUNCTION public.rpc_public_read_navigation_overlay(p_nav_area text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', n.id,
        'node_key', n.node_key,
        'parent_node_key', p.node_key,
        'is_active', n.is_active,
        'sort_order', n.sort_order,
        'label_de', n.label_de,
        'label_en', n.label_en,
        'label_pl', n.label_pl,
        'labels', (SELECT coalesce(jsonb_object_agg(t.locale, t.label) FILTER (WHERE t.label IS NOT NULL), '{}'::jsonb)
                     FROM public.cms_navigation_node_translations t WHERE t.node_id = n.id),
        'show_in_public_nav', n.show_in_public_nav
      )
      ORDER BY n.sort_order, n.node_key
    ),
    '[]'::jsonb
  )
  FROM public.cms_navigation_nodes n
  LEFT JOIN public.cms_navigation_nodes p ON p.id = n.parent_id
  LEFT JOIN public.cms_pages pg ON pg.page_key = n.page_key
  WHERE n.nav_area = p_nav_area
    AND n.is_active = true
    AND n.show_in_public_nav = true
    AND (
      n.page_key IS NULL
      OR (pg.status = 'published' AND pg.is_active = true)
    );
$function$;

CREATE OR REPLACE FUNCTION public.rpc_public_resolve_breadcrumb(p_route_path text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_start uuid;
  v_result jsonb;
BEGIN
  IF p_route_path IS NULL OR length(trim(p_route_path)) = 0 THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT n.id INTO v_start
  FROM public.cms_navigation_nodes n
  LEFT JOIN public.cms_pages pg ON pg.page_key = n.page_key
  WHERE n.route_path = p_route_path
    AND (n.page_key IS NULL OR (pg.status = 'published' AND pg.is_active = true))
  ORDER BY n.nav_area = 'main' DESC, n.is_active DESC, n.sort_order
  LIMIT 1;

  IF v_start IS NULL THEN
    SELECT n.id INTO v_start
    FROM public.cms_navigation_nodes n
    JOIN public.cms_pages pg ON pg.page_key = n.page_key
    WHERE pg.route_path = p_route_path
      AND pg.status = 'published' AND pg.is_active = true
    ORDER BY n.nav_area = 'main' DESC, n.is_active DESC, n.sort_order
    LIMIT 1;
  END IF;

  IF v_start IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  WITH RECURSIVE chain AS (
    SELECT n.id, n.parent_id, n.node_key, n.label_de, n.label_en, n.label_pl,
           n.route_path, n.page_key, 0 AS depth
    FROM public.cms_navigation_nodes n
    WHERE n.id = v_start
    UNION ALL
    SELECT p.id, p.parent_id, p.node_key, p.label_de, p.label_en, p.label_pl,
           p.route_path, p.page_key, c.depth + 1
    FROM public.cms_navigation_nodes p
    JOIN chain c ON c.parent_id = p.id
    WHERE c.depth < 12
  )
  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'node_key', c.node_key,
      'page_key', c.page_key,
      'label_de', c.label_de,
      'label_en', c.label_en,
      'label_pl', c.label_pl,
      'labels', (SELECT coalesce(jsonb_object_agg(t.locale, t.label) FILTER (WHERE t.label IS NOT NULL), '{}'::jsonb)
                   FROM public.cms_navigation_node_translations t WHERE t.node_id = c.id),
      'route_path', COALESCE(c.route_path, pg.route_path)
    )
    ORDER BY c.depth DESC
  ), '[]'::jsonb)
  INTO v_result
  FROM chain c
  LEFT JOIN public.cms_pages pg ON pg.page_key = c.page_key;

  RETURN v_result;
END;
$function$;