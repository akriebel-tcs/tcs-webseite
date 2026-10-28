-- 1) Zentrale Menge der wirklich übersetzbaren deutschen Bausteinfelder
CREATE OR REPLACE FUNCTION public.cms_translatable_source_fields()
RETURNS TABLE(page_key text, section_key text, field_key text)
LANGUAGE sql
STABLE PARALLEL SAFE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT f.page_key, f.section_key, f.field_key
    FROM public.cms_section_fields f
    JOIN public.cms_sections s
      ON s.page_key = f.page_key AND s.section_key = f.section_key
   WHERE f.locale = 'de'
     AND public.cms_field_is_translatable(f.field_key)
     AND public.cms_text_is_translatable(f.value)
   GROUP BY 1, 2, 3
$$;

REVOKE ALL ON FUNCTION public.cms_translatable_source_fields() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cms_translatable_source_fields() TO service_role;

-- 2) Idempotente Vorbereitung einer aktiven Zielsprache
CREATE OR REPLACE FUNCTION public.rpc_internal_prepare_translation_locale(p_locale text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '180s'
AS $$
DECLARE
  v_loc text := lower(btrim(coalesce(p_locale, '')));
  v_row public.cms_locales;
  v_ins int := 0;
  v_upd int := 0;
BEGIN
  IF v_loc = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'locale_required');
  END IF;

  SELECT * INTO v_row FROM public.cms_locales c WHERE c.locale = v_loc;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'locale_unknown');
  END IF;

  IF v_row.is_source THEN
    RETURN jsonb_build_object('success', true, 'locale', v_loc,
      'skipped', 'source_locale', 'inserted', 0, 'enabled', 0);
  END IF;

  IF NOT v_row.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'locale_not_active');
  END IF;

  INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
  SELECT t.page_key, t.section_key, t.field_key, v_loc, true
    FROM public.cms_translatable_source_fields() t
   WHERE NOT EXISTS (
     SELECT 1 FROM public.cms_admin_editable_fields w
      WHERE w.page_key = t.page_key
        AND w.section_key = t.section_key
        AND w.field_key = t.field_key
        AND w.locale = v_loc);
  GET DIAGNOSTICS v_ins = ROW_COUNT;

  UPDATE public.cms_admin_editable_fields w
     SET is_enabled = true, updated_at = now()
   WHERE w.locale = v_loc
     AND w.is_enabled = false
     AND (w.page_key, w.section_key, w.field_key) IN (
       SELECT t.page_key, t.section_key, t.field_key
         FROM public.cms_translatable_source_fields() t);
  GET DIAGNOSTICS v_upd = ROW_COUNT;

  RETURN jsonb_build_object('success', true, 'locale', v_loc,
    'inserted', v_ins, 'enabled', v_upd);
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_internal_prepare_translation_locale(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_internal_prepare_translation_locale(text) TO service_role;

-- 3) Vorbereitung + Vorschau in einem Schritt (für „Fehlende Texte prüfen" und Start)
CREATE OR REPLACE FUNCTION public.rpc_internal_translation_prepare_and_dry_run(
  p_target_locale text,
  p_page_keys text[] DEFAULT NULL::text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '180s'
AS $$
DECLARE
  v_prep jsonb;
  v_dry jsonb;
BEGIN
  IF p_target_locale IS NULL OR lower(btrim(p_target_locale)) IN ('', 'de') THEN
    RETURN jsonb_build_object('error', 'target_locale_invalid');
  END IF;

  v_prep := public.rpc_internal_prepare_translation_locale(p_target_locale);
  IF NOT coalesce((v_prep->>'success')::boolean, false) THEN
    RETURN jsonb_build_object('error', coalesce(v_prep->>'error', 'prepare_failed'));
  END IF;

  v_dry := public.rpc_internal_translation_dry_run(p_target_locale, p_page_keys);
  RETURN coalesce(v_dry, '{}'::jsonb) || jsonb_build_object('prepared', v_prep);
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_internal_translation_prepare_and_dry_run(text, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_internal_translation_prepare_and_dry_run(text, text[]) TO service_role;

-- 4) Nicht-Bausteinbereiche gelten für aktive Zielsprachen als vorbereitet
CREATE OR REPLACE FUNCTION public.cms_translation_units(p_target_locale text, p_page_keys text[] DEFAULT NULL::text[], p_areas text[] DEFAULT NULL::text[])
 RETURNS TABLE(area text, ref_id uuid, ref_key text, page_key text, section_key text, unit_key text, sort_a text, sort_b text, sort_c text, label text, source_text text, source_hash text, target_value text, target_status text, target_hash text, whitelisted boolean, is_todo boolean)
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
           END AS tgt_value,
           CASE b.area WHEN 'section_field' THEN sf.review_status ELSE st.review_status END AS raw_status,
           CASE b.area WHEN 'section_field' THEN sf.source_hash ELSE st.source_hash END AS tgt_hash,
           -- Bausteinfelder folgen der Freigabeliste; die uebrigen Bereiche
           -- gelten fuer jede aktive, nicht als Quelle markierte Sprache als
           -- vorbereitet (kein Zufallstreffer einer Seitenzeile mehr).
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

-- 5) Feldfreigabe gegen die Sprachliste pruefen statt gegen eine feste Liste
CREATE OR REPLACE FUNCTION public.rpc_admin_set_editable_field_enabled(p_page_key text, p_section_key text, p_field_key text, p_locale text, p_is_enabled boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _rows int := 0;
  _loc text := lower(btrim(coalesce(p_locale, '')));
BEGIN
  IF _loc = '' OR NOT EXISTS (SELECT 1 FROM public.cms_locales c WHERE c.locale = _loc) THEN
    RETURN jsonb_build_object('success', false, 'updated', false,
      'error', 'locale_not_allowed',
      'page_key', p_page_key, 'section_key', p_section_key,
      'field_key', p_field_key, 'locale', p_locale);
  END IF;

  IF p_is_enabled IS NULL THEN
    RETURN jsonb_build_object('success', false, 'updated', false,
      'error', 'is_enabled_required',
      'page_key', p_page_key, 'section_key', p_section_key,
      'field_key', p_field_key, 'locale', p_locale);
  END IF;

  UPDATE public.cms_admin_editable_fields
     SET is_enabled = p_is_enabled, updated_at = now()
   WHERE page_key = p_page_key AND section_key = p_section_key
     AND field_key = p_field_key AND locale = _loc;

  GET DIAGNOSTICS _rows = ROW_COUNT;

  IF _rows = 0 THEN
    RETURN jsonb_build_object('success', false, 'updated', false,
      'error', 'row_not_found',
      'page_key', p_page_key, 'section_key', p_section_key,
      'field_key', p_field_key, 'locale', _loc);
  END IF;

  RETURN jsonb_build_object('success', true, 'updated', true,
    'page_key', p_page_key, 'section_key', p_section_key,
    'field_key', p_field_key, 'locale', _loc, 'is_enabled', p_is_enabled);
END;
$function$;

-- 6) Beim Aktivieren einer Sprache automatisch vorbereiten
CREATE OR REPLACE FUNCTION public.rpc_admin_set_locale_visibility(p_locale text, p_is_active boolean DEFAULT NULL::boolean, p_is_public boolean DEFAULT NULL::boolean, p_reason text DEFAULT NULL::text)
 RETURNS TABLE(locale text, is_active boolean, is_public boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '180s'
AS $function$
DECLARE
  v_locale text := lower(btrim(coalesce(p_locale, '')));
  v_row public.cms_locales;
  v_active boolean;
  v_public boolean;
  v_prep jsonb;
BEGIN
  IF v_locale = '' THEN
    RAISE EXCEPTION 'locale_required';
  END IF;

  SELECT * INTO v_row FROM public.cms_locales c WHERE c.locale = v_locale;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'locale_unknown';
  END IF;

  v_active := coalesce(p_is_active, v_row.is_active);
  v_public := coalesce(p_is_public, v_row.is_public);

  IF v_row.is_source THEN
    v_active := true;
    v_public := true;
  END IF;

  IF NOT v_active THEN
    v_public := false;
  END IF;

  IF v_active IS DISTINCT FROM v_row.is_active OR v_public IS DISTINCT FROM v_row.is_public THEN
    UPDATE public.cms_locales c
       SET is_active = v_active,
           is_public = v_public,
           updated_at = now()
     WHERE c.locale = v_locale;

    INSERT INTO public.cms_locale_visibility_audit
      (locale, was_active, was_public, is_active, is_public, reason)
    VALUES
      (v_locale, v_row.is_active, v_row.is_public, v_active, v_public, nullif(btrim(coalesce(p_reason, '')), ''));
  END IF;

  -- Aktive Zielsprachen sind ohne manuellen Datenbankeingriff uebersetzbar.
  IF v_active AND NOT v_row.is_source THEN
    v_prep := public.rpc_internal_prepare_translation_locale(v_locale);
  END IF;

  RETURN QUERY
    SELECT c.locale, c.is_active, c.is_public FROM public.cms_locales c WHERE c.locale = v_locale;
END;
$function$;