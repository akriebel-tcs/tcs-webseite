-- 1) Hilfsprüfungen wieder mit festem Suchpfad (Sicherheitsvorgabe des Projekts).
CREATE OR REPLACE FUNCTION public.cms_translation_normalize(p_text text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path TO 'public'
AS $function$
  SELECT lower(btrim(regexp_replace(coalesce(p_text, ''), '\s+', ' ', 'g')))
$function$;

CREATE OR REPLACE FUNCTION public.cms_translation_hash(p_text text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path TO 'public'
AS $function$
  SELECT md5(lower(btrim(regexp_replace(coalesce(p_text, ''), '\s+', ' ', 'g'))))
$function$;

CREATE OR REPLACE FUNCTION public.cms_text_is_translatable(p_value text)
RETURNS boolean LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p_value IS NULL OR btrim(p_value) = '' THEN false
    WHEN btrim(p_value) !~ '[A-Za-zÄÖÜäöüß]' THEN false
    WHEN btrim(p_value) ~* '^(https?://|www\.|/|#|mailto:|tel:)' THEN false
    WHEN btrim(p_value) ~* '\.(png|jpe?g|svg|webp|avif|gif|pdf|mp4|webm)$' THEN false
    WHEN btrim(p_value) ~* '^#?[0-9a-f]{3,8}$' THEN false
    WHEN btrim(p_value) ~* '^(true|false|on|off|yes|no|ja|nein|auto|none|null|left|right|center|centre|top|bottom|start|end|asc|desc)$' THEN false
    WHEN btrim(p_value) ~ '^[a-z0-9]+([._:/-][a-z0-9]+)+$' THEN false
    ELSE true
  END
$function$;

-- 2) Zentrale Übersetzungsmenge: gleiche Regeln, aber direkt eingerechnet
--    (keine Funktionsaufrufe pro Zeile → keine Zeitüberschreitung in der Liste).
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
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH cfg AS (
    SELECT lower(coalesce(p_target_locale, '')) AS loc,
           (lower(coalesce(p_target_locale, '')) IN ('en','pl')) AS col_ok
  ),
  base AS (
    -- Bausteinfelder
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
       -- Feldnamen-Regel (identisch zu cms_field_is_translatable)
       AND f.field_key IS NOT NULL
       AND f.field_key !~ '_enabled$'
       AND f.field_key NOT IN ('phone_label', 'email_label')
       AND f.field_key !~ '(^|[._])(icon|image|href|url|link|slug|id|color|colour|bg|variant|aspect|order|position|kind|focus)([._]|$)'
       AND (
            f.field_key ~ '(^|\.)(title|label|text|description|intro|headline|subline|eyebrow|frage|antwort|answer|question|alt)$'
         OR f.field_key ~ '_label$'
         OR f.field_key ~ '\.\d+$'
       )
       -- Textwert-Regel (identisch zu cms_text_is_translatable)
       AND f.value IS NOT NULL AND btrim(f.value) <> ''
       AND btrim(f.value) ~ '[A-Za-zÄÖÜäöüß]'
       AND btrim(f.value) !~* '^(https?://|www\.|/|#|mailto:|tel:)'
       AND btrim(f.value) !~* '\.(png|jpe?g|svg|webp|avif|gif|pdf|mp4|webm)$'
       AND btrim(f.value) !~* '^#?[0-9a-f]{3,8}$'
       AND btrim(f.value) !~* '^(true|false|on|off|yes|no|ja|nein|auto|none|null|left|right|center|centre|top|bottom|start|end|asc|desc)$'
       AND btrim(f.value) !~ '^[a-z0-9]+([._:/-][a-z0-9]+)+$'

    UNION ALL
    -- Seitentitel
    SELECT 'page_title', NULL::uuid, p.page_key, p.page_key, '-', 'title',
           p.page_key, 'page_title', 'title', 'Seitentitel', p.title_de
      FROM public.cms_pages p, cfg
     WHERE cfg.col_ok
       AND (p_areas IS NULL OR 'page_title' = ANY (p_areas))
       AND public.cms_text_is_translatable(p.title_de)

    UNION ALL
    -- Navigationsbeschriftung
    SELECT 'nav_label', n.id, n.id::text, coalesce(n.page_key, '~nav'), n.nav_area, 'label',
           coalesce(n.page_key, '~nav'), 'nav_label:' || n.nav_area, n.node_key,
           'Navigation: Beschriftung', n.label_de
      FROM public.cms_navigation_nodes n, cfg
     WHERE cfg.col_ok
       AND (p_areas IS NULL OR 'nav_label' = ANY (p_areas))
       AND public.cms_text_is_translatable(n.label_de)

    UNION ALL
    -- Navigationsbeschreibung
    SELECT 'nav_description', n.id, n.id::text, coalesce(n.page_key, '~nav'), n.nav_area, 'description',
           coalesce(n.page_key, '~nav'), 'nav_description:' || n.nav_area, n.node_key,
           'Navigation: Beschreibung', n.description_de
      FROM public.cms_navigation_nodes n, cfg
     WHERE cfg.col_ok
       AND (p_areas IS NULL OR 'nav_description' = ANY (p_areas))
       AND public.cms_text_is_translatable(n.description_de)

    UNION ALL
    -- Bild-Alternativtexte (kanonisch: alt_de/alt_en/alt_pl)
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
             WHEN 'page_title' THEN CASE cfg.loc WHEN 'en' THEN pg.title_en ELSE pg.title_pl END
             WHEN 'nav_label' THEN CASE cfg.loc WHEN 'en' THEN nn.label_en ELSE nn.label_pl END
             WHEN 'nav_description' THEN CASE cfg.loc WHEN 'en' THEN nn.description_en ELSE nn.description_pl END
             WHEN 'asset_alt' THEN CASE cfg.loc WHEN 'en' THEN ca.alt_en ELSE ca.alt_pl END
           END AS tgt_value,
           CASE b.area WHEN 'section_field' THEN sf.review_status ELSE st.review_status END AS raw_status,
           CASE b.area WHEN 'section_field' THEN sf.source_hash ELSE st.source_hash END AS tgt_hash,
           CASE b.area WHEN 'section_field' THEN coalesce(w.is_enabled, false) ELSE true END AS wl
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
      LEFT JOIN public.cms_navigation_nodes nn
             ON b.area IN ('nav_label','nav_description') AND nn.id = b.ref_id
      LEFT JOIN public.cms_assets ca
             ON b.area = 'asset_alt' AND ca.id = b.ref_id
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

REVOKE ALL ON FUNCTION public.cms_translation_units(text, text[], text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cms_translation_units(text, text[], text[]) TO service_role;
