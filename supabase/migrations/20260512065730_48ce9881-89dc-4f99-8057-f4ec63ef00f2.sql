CREATE OR REPLACE FUNCTION public.rpc_admin_search_short_ids(
  p_query text,
  p_limit integer DEFAULT 8
)
RETURNS TABLE (
  kind        text,
  num         integer,
  formatted   text,
  label       text,
  sublabel    text,
  page_key    text,
  section_key text,
  field_key   text,
  node_id     uuid,
  score       integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q          text := coalesce(trim(p_query), '');
  v_limit      integer := greatest(1, least(coalesce(p_limit, 8), 25));
  v_kind       text;
  v_num_part   text;
  v_text_part  text;
  v_num_like   text;
  v_text_like  text;
BEGIN
  IF v_q = '' THEN
    RETURN;
  END IF;

  IF v_q ~* '^[NPBA]([- _]|$|\d)' THEN
    v_kind      := upper(substring(v_q from 1 for 1));
    v_text_part := lower(regexp_replace(substring(v_q from 2), '^[- _]+', ''));
  ELSE
    v_kind      := NULL;
    v_text_part := lower(v_q);
  END IF;

  IF v_text_part ~ '^\d+$' THEN
    v_num_part  := regexp_replace(v_text_part, '^0+', '');
    IF v_num_part = '' THEN v_num_part := '0'; END IF;
    v_text_part := '';
  ELSE
    v_num_part := NULL;
  END IF;

  v_num_like  := CASE WHEN v_num_part IS NOT NULL THEN v_num_part || '%' END;
  v_text_like := CASE WHEN v_text_part <> ''      THEN '%' || v_text_part || '%' END;

  RETURN QUERY
  WITH base AS (
    SELECT
      'N'::text                                          AS kind,
      n.node_no                                          AS num,
      'N-' || lpad(n.node_no::text, 3, '0')              AS formatted,
      coalesce(n.label_de, n.label, n.node_key)          AS label,
      ('Navigation · ' || n.nav_area
        || coalesce(' · ' || n.page_key, ''))            AS sublabel,
      n.page_key                                         AS page_key,
      NULL::text                                         AS section_key,
      NULL::text                                         AS field_key,
      n.id                                               AS node_id,
      CASE
        WHEN v_num_part  IS NOT NULL
             AND n.node_no::text LIKE v_num_like                              THEN 10
        WHEN v_text_part <> '' AND lower(coalesce(n.label_de,'')) LIKE v_text_like THEN 20
        WHEN v_text_part <> '' AND lower(coalesce(n.node_key,'')) LIKE v_text_like THEN 25
        WHEN v_text_part <> '' AND lower(coalesce(n.page_key,'')) LIKE v_text_like THEN 30
        WHEN v_text_part = '' AND v_num_part IS NULL                           THEN 50
        ELSE 999
      END                                                AS score
    FROM cms_navigation_nodes n
    WHERE (v_kind IS NULL OR v_kind = 'N')

    UNION ALL
    SELECT
      'P'::text,
      p.page_no,
      'P-' || lpad(p.page_no::text, 3, '0'),
      coalesce(p.title_de, p.page_key),
      ('Seite · ' || p.page_key
        || coalesce(' · ' || p.route_path, '')),
      p.page_key,
      NULL::text,
      NULL::text,
      NULL::uuid,
      CASE
        WHEN v_num_part  IS NOT NULL
             AND p.page_no::text LIKE v_num_like                              THEN 10
        WHEN v_text_part <> '' AND lower(coalesce(p.title_de,'')) LIKE v_text_like THEN 20
        WHEN v_text_part <> '' AND lower(p.page_key)              LIKE v_text_like THEN 25
        WHEN v_text_part <> '' AND lower(coalesce(p.route_path,'')) LIKE v_text_like THEN 30
        WHEN v_text_part = '' AND v_num_part IS NULL                           THEN 50
        ELSE 999
      END
    FROM cms_pages p
    WHERE (v_kind IS NULL OR v_kind = 'P')

    UNION ALL
    SELECT
      'B'::text,
      s.section_uid,
      'B-' || lpad(s.section_uid::text, 3, '0'),
      s.section_key,
      ('Block · ' || s.page_key
        || coalesce(' · ' || s.section_type, '')),
      s.page_key,
      s.section_key,
      NULL::text,
      NULL::uuid,
      CASE
        WHEN v_num_part  IS NOT NULL
             AND s.section_uid::text LIKE v_num_like                          THEN 10
        WHEN v_text_part <> '' AND lower(s.section_key) LIKE v_text_like      THEN 20
        WHEN v_text_part <> '' AND lower(s.page_key)    LIKE v_text_like      THEN 25
        WHEN v_text_part <> '' AND lower(coalesce(s.section_type,'')) LIKE v_text_like THEN 30
        WHEN v_text_part = '' AND v_num_part IS NULL                           THEN 50
        ELSE 999
      END
    FROM cms_sections s
    WHERE (v_kind IS NULL OR v_kind = 'B')

    UNION ALL
    SELECT
      'A'::text,
      a.asset_no,
      'A-' || lpad(a.asset_no::text, 3, '0'),
      coalesce(a.file_name, a.field_key, a.section_key),
      ('Bild · ' || a.page_key || ' · ' || a.section_key
        || coalesce('.' || a.field_key, '')),
      a.page_key,
      a.section_key,
      a.field_key,
      NULL::uuid,
      CASE
        WHEN v_num_part  IS NOT NULL
             AND a.asset_no::text LIKE v_num_like                             THEN 10
        WHEN v_text_part <> '' AND lower(coalesce(a.file_name,''))  LIKE v_text_like THEN 20
        WHEN v_text_part <> '' AND lower(coalesce(a.field_key,''))  LIKE v_text_like THEN 25
        WHEN v_text_part <> '' AND lower(a.section_key)             LIKE v_text_like THEN 30
        WHEN v_text_part <> '' AND lower(a.page_key)                LIKE v_text_like THEN 35
        WHEN v_text_part = '' AND v_num_part IS NULL                           THEN 50
        ELSE 999
      END
    FROM cms_assets a
    WHERE (v_kind IS NULL OR v_kind = 'A')
  )
  SELECT b.kind, b.num, b.formatted, b.label, b.sublabel,
         b.page_key, b.section_key, b.field_key, b.node_id, b.score
  FROM base b
  WHERE b.score < 999
  ORDER BY b.score ASC, b.kind ASC, b.num ASC
  LIMIT v_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_admin_search_short_ids(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_admin_search_short_ids(text, integer) TO anon, authenticated;

COMMENT ON FUNCTION public.rpc_admin_search_short_ids(text, integer) IS
  'Read-only Auto-Vervollständigung für die Admin-Eingabe "Gehe zu Kurz-ID". Sucht parallel in N-/P-/B-/A-Räumen anhand Nummer oder Volltext. Optionales Präfix (N/P/B/A) schränkt den Treffer-Raum ein.';