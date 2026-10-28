-- ===========================================================================
-- CMS-Light Übersetzungswerkzeug: alle Verträge auf die kanonische
-- Gesamtmenge (public.cms_translation_units) umstellen. Idempotent.
-- Verändert KEINE Inhalte.
-- ===========================================================================

-- ------------------------------------------------------------- 1. Abdeckung
CREATE OR REPLACE FUNCTION public.rpc_internal_translation_coverage()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_areas text[] := ARRAY['section_field','page_title','nav_label','nav_description','asset_alt'];
  v_loc record;
  v_total bigint;
  v_locales jsonb := '[]'::jsonb;
  v_by_area jsonb;
  v_source_by_area jsonb;
BEGIN
  -- Gesamtmenge je Bereich (Quelle DE) — Referenzsprache EN, weil die
  -- spaltenbasierten Bereiche nur für EN/PL existieren.
  SELECT coalesce(jsonb_object_agg(a.area, a.n), '{}'::jsonb), coalesce(sum(a.n), 0)
    INTO v_source_by_area, v_total
    FROM (
      SELECT u.area, count(*)::bigint AS n
        FROM public.cms_translation_units('en', NULL, NULL) u
       GROUP BY u.area
    ) a;

  FOR v_loc IN
    SELECT l.locale, l.label_de, l.is_active, l.is_source, l.is_public, l.sort_order
      FROM public.cms_locales l
     ORDER BY l.sort_order, l.locale
  LOOP
    IF v_loc.is_source THEN
      v_locales := v_locales || jsonb_build_object(
        'locale', v_loc.locale, 'label_de', v_loc.label_de,
        'is_active', v_loc.is_active, 'is_source', true, 'is_public', v_loc.is_public,
        'total', v_total, 'filled', v_total, 'machine', 0, 'stale', 0,
        'reviewed', v_total, 'todo', 0, 'not_whitelisted', 0,
        'open_runs', 0, 'failed_jobs', 0,
        'columns_supported', true,
        'by_area', v_source_by_area
      );
      CONTINUE;
    END IF;

    SELECT coalesce(jsonb_object_agg(x.area, jsonb_build_object(
             'total', x.total, 'filled', x.filled, 'machine', x.machine,
             'stale', x.stale, 'reviewed', x.reviewed, 'todo', x.todo,
             'not_whitelisted', x.not_whitelisted)), '{}'::jsonb)
      INTO v_by_area
      FROM (
        SELECT u.area,
               count(*)::bigint AS total,
               count(*) FILTER (WHERE coalesce(btrim(u.target_value), '') <> '')::bigint AS filled,
               count(*) FILTER (WHERE u.target_status = 'maschinell')::bigint AS machine,
               count(*) FILTER (WHERE u.target_status = 'maschinell_veraltet')::bigint AS stale,
               count(*) FILTER (WHERE u.target_status = 'geprueft')::bigint AS reviewed,
               count(*) FILTER (WHERE u.is_todo)::bigint AS todo,
               count(*) FILTER (WHERE NOT u.whitelisted)::bigint AS not_whitelisted
          FROM public.cms_translation_units(v_loc.locale, NULL, NULL) u
         GROUP BY u.area
      ) x;

    v_locales := v_locales || jsonb_build_object(
      'locale', v_loc.locale,
      'label_de', v_loc.label_de,
      'is_active', v_loc.is_active,
      'is_source', false,
      'is_public', v_loc.is_public,
      'total', (SELECT coalesce(sum((e.value->>'total')::bigint), 0) FROM jsonb_each(v_by_area) e),
      'filled', (SELECT coalesce(sum((e.value->>'filled')::bigint), 0) FROM jsonb_each(v_by_area) e),
      'machine', (SELECT coalesce(sum((e.value->>'machine')::bigint), 0) FROM jsonb_each(v_by_area) e),
      'stale', (SELECT coalesce(sum((e.value->>'stale')::bigint), 0) FROM jsonb_each(v_by_area) e),
      'reviewed', (SELECT coalesce(sum((e.value->>'reviewed')::bigint), 0) FROM jsonb_each(v_by_area) e),
      'todo', (SELECT coalesce(sum((e.value->>'todo')::bigint), 0) FROM jsonb_each(v_by_area) e),
      'not_whitelisted', (SELECT coalesce(sum((e.value->>'not_whitelisted')::bigint), 0) FROM jsonb_each(v_by_area) e),
      'open_runs', (SELECT count(*) FROM public.cms_translation_runs r
                     WHERE r.target_locale = v_loc.locale
                       AND r.status IN ('queued','running','paused')),
      'failed_jobs', (SELECT count(*) FROM public.cms_translation_jobs j
                       WHERE j.target_locale = v_loc.locale AND j.status = 'failed'),
      'columns_supported', (v_loc.locale IN ('en','pl')),
      'by_area', v_by_area
    );
  END LOOP;

  RETURN jsonb_build_object(
    'de_translatable_fields', v_total,
    'areas', to_jsonb(v_areas),
    'source_by_area', v_source_by_area,
    'locales', v_locales
  );
END;
$$;

-- -------------------------------------------------------------- 2. Vorschau
CREATE OR REPLACE FUNCTION public.rpc_internal_translation_dry_run(
  p_target_locale text,
  p_page_keys text[]
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb;
BEGIN
  IF p_target_locale IS NULL OR p_target_locale = 'de' THEN
    RETURN jsonb_build_object('error', 'target_locale_invalid');
  END IF;

  WITH u AS (
    SELECT * FROM public.cms_translation_units(p_target_locale, p_page_keys, NULL)
  )
  SELECT jsonb_build_object(
    'target_locale', p_target_locale,
    'pages', (SELECT count(DISTINCT page_key) FROM u),
    'fields', (SELECT count(*) FROM u),
    'source_nonempty', (SELECT count(*) FROM u),
    'source_unique', (SELECT count(DISTINCT source_hash) FROM u),
    'targets_existing', (SELECT count(*) FROM u WHERE coalesce(btrim(target_value), '') <> ''),
    'protected_manual', (SELECT count(*) FROM u
                          WHERE coalesce(btrim(target_value), '') <> ''
                            AND target_status = 'geprueft'),
    'not_whitelisted', (SELECT count(*) FROM u WHERE NOT whitelisted),
    'todo_fields', (SELECT count(*) FROM u WHERE is_todo),
    'todo_unique', (SELECT count(DISTINCT source_hash) FROM u WHERE is_todo),
    'memory_ready', (SELECT count(DISTINCT t.source_hash) FROM u t
                      JOIN public.cms_translation_memory m
                        ON m.source_hash = t.source_hash
                       AND m.target_locale = p_target_locale
                       AND coalesce(btrim(m.target_text), '') <> ''
                     WHERE t.is_todo),
    'chars_source', (SELECT coalesce(sum(length(source_text)), 0) FROM u WHERE is_todo),
    'chars_unique', (SELECT coalesce(sum(length(source_text)), 0) FROM (
                        SELECT DISTINCT ON (source_hash) source_hash, source_text
                          FROM u WHERE is_todo
                      ) d),
    'by_area', (SELECT coalesce(jsonb_object_agg(a.area, jsonb_build_object(
                          'fields', a.n, 'todo_fields', a.todo,
                          'targets_existing', a.filled, 'protected_manual', a.prot,
                          'not_whitelisted', a.nw)), '{}'::jsonb)
                  FROM (SELECT area,
                               count(*)::bigint AS n,
                               count(*) FILTER (WHERE is_todo)::bigint AS todo,
                               count(*) FILTER (WHERE coalesce(btrim(target_value), '') <> '')::bigint AS filled,
                               count(*) FILTER (WHERE coalesce(btrim(target_value), '') <> ''
                                                  AND target_status = 'geprueft')::bigint AS prot,
                               count(*) FILTER (WHERE NOT whitelisted)::bigint AS nw
                          FROM u GROUP BY area) a)
  ) INTO v;

  RETURN v;
END;
$$;

-- --------------------------------------------------------- 3. Nächster Stapel
CREATE OR REPLACE FUNCTION public.rpc_internal_translation_next_batch(
  p_run_id uuid,
  p_limit integer
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run public.cms_translation_runs;
  v_rows jsonb;
BEGIN
  SELECT * INTO v_run FROM public.cms_translation_runs WHERE id = p_run_id;
  IF v_run.id IS NULL THEN
    RETURN jsonb_build_object('error', 'run_not_found');
  END IF;

  SELECT coalesce(jsonb_agg(x ORDER BY sa, sb, sc), '[]'::jsonb)
    INTO v_rows
  FROM (
    SELECT jsonb_build_object(
             'area', u.area,
             'ref_id', u.ref_id,
             'ref_key', u.ref_key,
             'page_key', u.page_key,
             'section_key', u.section_key,
             'unit_key', u.unit_key,
             'sort_a', u.sort_a,
             'sort_b', u.sort_b,
             'sort_c', u.sort_c,
             'source_text', u.source_text,
             'source_hash', u.source_hash,
             'memory_text', m.target_text
           ) AS x,
           u.sort_a AS sa, u.sort_b AS sb, u.sort_c AS sc
      FROM public.cms_translation_units(
             v_run.target_locale,
             CASE WHEN array_length(v_run.page_keys, 1) IS NULL THEN NULL ELSE v_run.page_keys END,
             NULL) u
      LEFT JOIN public.cms_translation_memory m
             ON m.source_hash = u.source_hash
            AND m.target_locale = v_run.target_locale
            AND coalesce(btrim(m.target_text), '') <> ''
     WHERE u.is_todo
       AND (v_run.cursor_page_key IS NULL
            OR (u.sort_a, u.sort_b, u.sort_c)
               > (v_run.cursor_page_key, coalesce(v_run.cursor_section_key, ''), coalesce(v_run.cursor_field_key, '')))
     ORDER BY u.sort_a, u.sort_b, u.sort_c
     LIMIT greatest(1, least(coalesce(p_limit, 25), 25))
  ) q;

  RETURN jsonb_build_object('run', to_jsonb(v_run), 'items', v_rows);
END;
$$;

-- ------------------------------------------------------------ 4. Prüfbericht
CREATE OR REPLACE FUNCTION public.rpc_internal_translation_qa(
  p_target_locale text,
  p_page_keys text[],
  p_limit integer
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb;
BEGIN
  WITH pair AS (
    SELECT * FROM public.cms_translation_units(p_target_locale, p_page_keys, NULL)
  ),
  flagged AS (
    SELECT p.*,
           CASE
             WHEN coalesce(btrim(p.target_value), '') = '' THEN 'ziel_leer'
             WHEN public.cms_translation_normalize(p.target_value) = public.cms_translation_normalize(p.source_text) THEN 'unveraendert_deutsch'
             WHEN p.source_text ~ '\{\{?[a-z0-9_]+\}?\}' AND p.target_value !~ '\{\{?[a-z0-9_]+\}?\}' THEN 'platzhalter_fehlt'
             WHEN p.source_text ~ '<[a-z]+' AND p.target_value !~ '<[a-z]+' THEN 'html_fehlt'
             WHEN p.source_text ~* '(https?://|www\.)' AND p.target_value !~* '(https?://|www\.)' THEN 'link_fehlt'
             WHEN p.source_text ~ '\mTCS\M' AND p.target_value !~ '\mTCS\M' THEN 'markenbegriff_fehlt'
             WHEN length(p.target_value) > 0
                  AND (length(p.target_value)::numeric / greatest(length(p.source_text), 1) > 2.5
                       OR length(p.target_value)::numeric / greatest(length(p.source_text), 1) < 0.4) THEN 'laenge_auffaellig'
             WHEN p.target_hash IS NOT NULL AND p.target_hash <> p.source_hash THEN 'quelle_geaendert'
             ELSE NULL
           END AS issue
      FROM pair p
  )
  SELECT jsonb_build_object(
    'target_locale', p_target_locale,
    'checked', (SELECT count(*) FROM flagged),
    'ok', (SELECT count(*) FROM flagged WHERE issue IS NULL),
    'issues_total', (SELECT count(*) FROM flagged WHERE issue IS NOT NULL),
    'by_issue', (SELECT coalesce(jsonb_object_agg(issue, cnt), '{}'::jsonb)
                   FROM (SELECT issue, count(*) AS cnt FROM flagged WHERE issue IS NOT NULL GROUP BY issue) g),
    'by_area', (SELECT coalesce(jsonb_object_agg(area, cnt), '{}'::jsonb)
                   FROM (SELECT area, count(*) AS cnt FROM flagged WHERE issue IS NOT NULL GROUP BY area) g2),
    'failed_batches', (SELECT count(*) FROM public.cms_translation_jobs j
                        WHERE j.target_locale = p_target_locale AND j.status IN ('failed','error')),
    'items', (SELECT coalesce(jsonb_agg(jsonb_build_object(
                        'area', area, 'ref_id', ref_id,
                        'page_key', page_key, 'section_key', section_key,
                        'field_key', unit_key, 'unit_key', unit_key,
                        'issue', issue, 'review_status', target_status,
                        'de_value', left(source_text, 300),
                        'target_value', left(coalesce(target_value, ''), 300)
                      ) ORDER BY sort_a, sort_b, sort_c), '[]'::jsonb)
                 FROM (SELECT * FROM flagged WHERE issue IS NOT NULL
                        ORDER BY sort_a, sort_b, sort_c
                        LIMIT greatest(1, least(coalesce(p_limit, 500), 2000))) i)
  ) INTO v;

  RETURN v;
END;
$$;

-- ------------------------------- 5. Maschineller Schreibweg für alle Bereiche
CREATE OR REPLACE FUNCTION public.rpc_internal_apply_machine_unit(
  p_area text,
  p_ref_id uuid,
  p_page_key text,
  p_section_key text,
  p_unit_key text,
  p_locale text,
  p_value text,
  p_source_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_ok boolean;
  v_current text;
  v_ref_key text;
  v_state public.cms_translation_unit_state;
  v_rows int := 0;
BEGIN
  IF p_area = 'section_field' THEN
    RETURN public.rpc_internal_apply_machine_translation(
      p_page_key, p_section_key, p_unit_key, p_locale, p_value, p_source_hash);
  END IF;

  IF p_area NOT IN ('page_title','nav_label','nav_description','asset_alt') THEN
    RETURN jsonb_build_object('success', false, 'error', 'area_not_supported');
  END IF;
  IF p_locale NOT IN ('en','pl') THEN
    RETURN jsonb_build_object('success', false, 'error', 'locale_not_supported_for_area');
  END IF;

  SELECT (l.is_active AND NOT l.is_source) INTO v_target_ok
    FROM public.cms_locales l WHERE l.locale = p_locale;
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

  -- aktuellen Zielwert lesen
  IF p_area = 'page_title' THEN
    SELECT CASE p_locale WHEN 'en' THEN title_en ELSE title_pl END INTO v_current
      FROM public.cms_pages WHERE page_key = p_page_key;
  ELSIF p_area = 'nav_label' THEN
    SELECT CASE p_locale WHEN 'en' THEN label_en ELSE label_pl END INTO v_current
      FROM public.cms_navigation_nodes WHERE id = p_ref_id;
  ELSIF p_area = 'nav_description' THEN
    SELECT CASE p_locale WHEN 'en' THEN description_en ELSE description_pl END INTO v_current
      FROM public.cms_navigation_nodes WHERE id = p_ref_id;
  ELSE
    SELECT CASE p_locale WHEN 'en' THEN alt_en ELSE alt_pl END INTO v_current
      FROM public.cms_assets WHERE id = p_ref_id;
  END IF;

  SELECT * INTO v_state FROM public.cms_translation_unit_state
   WHERE area = p_area AND ref_key = v_ref_key AND unit_key = p_unit_key AND locale = p_locale;

  -- Von Hand gepflegte oder unbekannte Zielwerte werden NIE überschrieben.
  IF coalesce(btrim(v_current), '') <> ''
     AND coalesce(v_state.review_status, 'geprueft') = 'geprueft' THEN
    RETURN jsonb_build_object('success', true, 'updated', false, 'skipped', 'manual_value');
  END IF;

  IF p_area = 'page_title' THEN
    IF p_locale = 'en' THEN
      UPDATE public.cms_pages SET title_en = p_value, updated_at = now() WHERE page_key = p_page_key;
    ELSE
      UPDATE public.cms_pages SET title_pl = p_value, updated_at = now() WHERE page_key = p_page_key;
    END IF;
  ELSIF p_area = 'nav_label' THEN
    IF p_locale = 'en' THEN
      UPDATE public.cms_navigation_nodes SET label_en = p_value, updated_at = now() WHERE id = p_ref_id;
    ELSE
      UPDATE public.cms_navigation_nodes SET label_pl = p_value, updated_at = now() WHERE id = p_ref_id;
    END IF;
  ELSIF p_area = 'nav_description' THEN
    IF p_locale = 'en' THEN
      UPDATE public.cms_navigation_nodes SET description_en = p_value, updated_at = now() WHERE id = p_ref_id;
    ELSE
      UPDATE public.cms_navigation_nodes SET description_pl = p_value, updated_at = now() WHERE id = p_ref_id;
    END IF;
  ELSE
    IF p_locale = 'en' THEN
      UPDATE public.cms_assets SET alt_en = p_value, updated_at = now() WHERE id = p_ref_id;
    ELSE
      UPDATE public.cms_assets SET alt_pl = p_value, updated_at = now() WHERE id = p_ref_id;
    END IF;
  END IF;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'target_not_found');
  END IF;

  INSERT INTO public.cms_translation_unit_state (area, ref_key, unit_key, locale, review_status, source_hash)
  VALUES (p_area, v_ref_key, p_unit_key, p_locale, 'maschinell', p_source_hash)
  ON CONFLICT (area, ref_key, unit_key, locale)
  DO UPDATE SET review_status = 'maschinell', source_hash = EXCLUDED.source_hash, updated_at = now();

  RETURN jsonb_build_object('success', true, 'updated', true);
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_internal_apply_machine_unit(text, uuid, text, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_internal_apply_machine_unit(text, uuid, text, text, text, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.rpc_internal_apply_machine_unit(text, uuid, text, text, text, text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_internal_apply_machine_unit(text, uuid, text, text, text, text, text, text) TO service_role;

-- ---------------------------------------------- 6. Textliste für die Redaktion
CREATE OR REPLACE FUNCTION public.rpc_admin_list_translation_units(
  p_target_locale text,
  p_areas text[] DEFAULT NULL,
  p_status text DEFAULT 'alle',
  p_page_key text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb;
  v_limit int := greatest(1, least(coalesce(p_limit, 50), 200));
  v_offset int := greatest(0, coalesce(p_offset, 0));
  v_status text := lower(coalesce(nullif(btrim(p_status), ''), 'alle'));
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
BEGIN
  IF p_target_locale IS NULL OR p_target_locale = 'de' THEN
    RETURN jsonb_build_object('error', 'target_locale_invalid');
  END IF;

  WITH u AS (
    SELECT * FROM public.cms_translation_units(
      p_target_locale,
      CASE WHEN p_page_key IS NULL OR btrim(p_page_key) = '' THEN NULL ELSE ARRAY[p_page_key] END,
      p_areas)
  ),
  searched AS (
    SELECT * FROM u
     WHERE v_search IS NULL
        OR source_text ILIKE '%' || v_search || '%'
        OR coalesce(target_value, '') ILIKE '%' || v_search || '%'
        OR page_key ILIKE '%' || v_search || '%'
        OR unit_key ILIKE '%' || v_search || '%'
  ),
  filtered AS (
    SELECT * FROM searched
     WHERE CASE v_status
             WHEN 'alle' THEN true
             WHEN 'fehlt' THEN coalesce(btrim(target_value), '') = ''
             WHEN 'maschinell' THEN target_status = 'maschinell'
             WHEN 'veraltet' THEN target_status = 'maschinell_veraltet'
             WHEN 'geprueft' THEN target_status = 'geprueft'
             WHEN 'offen' THEN is_todo
             WHEN 'gesperrt' THEN NOT whitelisted
             ELSE true
           END
  )
  SELECT jsonb_build_object(
    'target_locale', p_target_locale,
    'total', (SELECT count(*) FROM filtered),
    'total_unfiltered', (SELECT count(*) FROM u),
    'counts', jsonb_build_object(
      'fehlt', (SELECT count(*) FROM searched WHERE coalesce(btrim(target_value), '') = ''),
      'maschinell', (SELECT count(*) FROM searched WHERE target_status = 'maschinell'),
      'veraltet', (SELECT count(*) FROM searched WHERE target_status = 'maschinell_veraltet'),
      'geprueft', (SELECT count(*) FROM searched WHERE target_status = 'geprueft'),
      'offen', (SELECT count(*) FROM searched WHERE is_todo),
      'gesperrt', (SELECT count(*) FROM searched WHERE NOT whitelisted)
    ),
    'by_area', (SELECT coalesce(jsonb_object_agg(area, n), '{}'::jsonb)
                  FROM (SELECT area, count(*) AS n FROM searched GROUP BY area) a),
    'limit', v_limit,
    'offset', v_offset,
    'items', (SELECT coalesce(jsonb_agg(jsonb_build_object(
                       'area', area,
                       'ref_id', ref_id,
                       'ref_key', ref_key,
                       'page_key', page_key,
                       'section_key', section_key,
                       'unit_key', unit_key,
                       'label', label,
                       'source_text', source_text,
                       'source_hash', source_hash,
                       'target_value', target_value,
                       'target_status', target_status,
                       'whitelisted', whitelisted,
                       'is_todo', is_todo
                     ) ORDER BY sort_a, sort_b, sort_c), '[]'::jsonb)
                FROM (SELECT * FROM filtered
                       ORDER BY sort_a, sort_b, sort_c
                       LIMIT v_limit OFFSET v_offset) p)
  ) INTO v;

  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_admin_list_translation_units(text, text[], text, text, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_admin_list_translation_units(text, text[], text, text, text, integer, integer)
  TO anon, authenticated, service_role;

-- ------------------------------- 7. Manuelles Speichern eines Zieltextes
CREATE OR REPLACE FUNCTION public.rpc_admin_update_translation_unit(
  p_area text,
  p_ref_id uuid,
  p_page_key text,
  p_section_key text,
  p_unit_key text,
  p_locale text,
  p_value text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res jsonb;
  v_ref_key text;
  v_rows int := 0;
  v_hash text;
  v_source text;
BEGIN
  -- Deutsch ist Quelle und wird hier nicht geschrieben.
  IF p_locale NOT IN ('en','pl') THEN
    RETURN jsonb_build_object('success', false, 'updated', false, 'error', 'locale_not_allowed');
  END IF;

  IF p_area = 'section_field' THEN
    RETURN public.rpc_admin_update_section_field(
      p_page_key, p_section_key, p_unit_key, p_locale, p_value);
  END IF;

  IF p_area NOT IN ('page_title','nav_label','nav_description','asset_alt') THEN
    RETURN jsonb_build_object('success', false, 'updated', false, 'error', 'area_not_supported');
  END IF;

  v_ref_key := CASE WHEN p_area = 'page_title' THEN p_page_key ELSE p_ref_id::text END;
  IF v_ref_key IS NULL THEN
    RETURN jsonb_build_object('success', false, 'updated', false, 'error', 'ref_missing');
  END IF;

  IF p_area = 'page_title' THEN
    SELECT title_de INTO v_source FROM public.cms_pages WHERE page_key = p_page_key;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'updated', false, 'error', 'page_not_found');
    END IF;
    IF p_locale = 'en' THEN
      UPDATE public.cms_pages SET title_en = nullif(btrim(p_value), ''), updated_at = now()
       WHERE page_key = p_page_key;
    ELSE
      UPDATE public.cms_pages SET title_pl = nullif(btrim(p_value), ''), updated_at = now()
       WHERE page_key = p_page_key;
    END IF;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_res := jsonb_build_object('success', v_rows > 0, 'updated', v_rows > 0);
  ELSIF p_area = 'nav_label' THEN
    SELECT label_de INTO v_source FROM public.cms_navigation_nodes WHERE id = p_ref_id;
    v_res := public.rpc_admin_update_navigation_label(p_ref_id, p_locale, p_value);
  ELSIF p_area = 'nav_description' THEN
    SELECT description_de INTO v_source FROM public.cms_navigation_nodes WHERE id = p_ref_id;
    v_res := public.rpc_admin_update_navigation_description(p_ref_id, p_locale, p_value);
  ELSE
    SELECT alt_de INTO v_source FROM public.cms_assets WHERE id = p_ref_id;
    v_res := public.rpc_admin_update_asset_alt(p_ref_id, p_locale, p_value);
    IF coalesce((v_res->>'success')::boolean, false) THEN
      v_res := v_res || jsonb_build_object('updated', true);
    END IF;
  END IF;

  IF NOT coalesce((v_res->>'success')::boolean, false) THEN
    RETURN v_res;
  END IF;

  v_hash := public.cms_translation_hash(coalesce(v_source, ''));

  IF coalesce(btrim(p_value), '') = '' THEN
    DELETE FROM public.cms_translation_unit_state
     WHERE area = p_area AND ref_key = v_ref_key AND unit_key = p_unit_key AND locale = p_locale;
  ELSE
    INSERT INTO public.cms_translation_unit_state (area, ref_key, unit_key, locale, review_status, source_hash)
    VALUES (p_area, v_ref_key, p_unit_key, p_locale, 'geprueft', v_hash)
    ON CONFLICT (area, ref_key, unit_key, locale)
    DO UPDATE SET review_status = 'geprueft', source_hash = EXCLUDED.source_hash, updated_at = now();
  END IF;

  RETURN v_res || jsonb_build_object('review_status', 'geprueft');
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_admin_update_translation_unit(text, uuid, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_admin_update_translation_unit(text, uuid, text, text, text, text, text)
  TO anon, authenticated, service_role;
