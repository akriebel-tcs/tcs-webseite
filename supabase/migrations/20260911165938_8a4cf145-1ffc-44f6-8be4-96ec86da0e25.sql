-- ===========================================================================
-- CMS-Light: kanonische Übersetzungsmenge über alle redaktionellen Bestände.
-- Idempotent. Verändert KEINE Inhalte.
-- ===========================================================================

-- ------------------------------------------------ 1. Herkunft für Nicht-Feld-Bereiche
CREATE TABLE IF NOT EXISTS public.cms_translation_unit_state (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  area text NOT NULL,
  ref_key text NOT NULL,
  unit_key text NOT NULL,
  locale text NOT NULL,
  review_status text NOT NULL DEFAULT 'geprueft',
  source_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cms_translation_unit_state_uniq UNIQUE (area, ref_key, unit_key, locale)
);

GRANT ALL ON public.cms_translation_unit_state TO service_role;
ALTER TABLE public.cms_translation_unit_state ENABLE ROW LEVEL SECURITY;
-- Kein anon/authenticated-Zugriff: gelesen wird ausschließlich über
-- SECURITY-DEFINER-Funktionen. Keine Policy = kein direkter Datenweg.

DROP TRIGGER IF EXISTS trg_cms_translation_unit_state_updated_at ON public.cms_translation_unit_state;
CREATE TRIGGER trg_cms_translation_unit_state_updated_at
  BEFORE UPDATE ON public.cms_translation_unit_state
  FOR EACH ROW EXECUTE FUNCTION public.cms_set_updated_at();

-- ------------------------------------------------ 2. Wert-Prüfung (sprachneutral?)
CREATE OR REPLACE FUNCTION public.cms_text_is_translatable(p_value text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_value IS NULL OR btrim(p_value) = '' THEN false
    -- keine Buchstaben => Zahl, Zeichen, Maßangabe
    WHEN btrim(p_value) !~ '[A-Za-zÄÖÜäöüß]' THEN false
    -- Adressen, Pfade, Mail/Tel, Anker
    WHEN btrim(p_value) ~* '^(https?://|www\.|/|#|mailto:|tel:)' THEN false
    -- Dateinamen
    WHEN btrim(p_value) ~* '\.(png|jpe?g|svg|webp|avif|gif|pdf|mp4|webm)$' THEN false
    -- Farbwerte
    WHEN btrim(p_value) ~* '^#?[0-9a-f]{3,8}$' THEN false
    -- Schalter / Layoutwerte
    WHEN btrim(p_value) ~* '^(true|false|on|off|yes|no|ja|nein|auto|none|null|left|right|center|centre|top|bottom|start|end|asc|desc)$' THEN false
    -- Kennungen / Slugs / Dateiname-artig: durchgehend klein, ohne Leerzeichen, mit Trenner
    WHEN btrim(p_value) ~ '^[a-z0-9]+([._:/-][a-z0-9]+)+$' THEN false
    ELSE true
  END
$$;

-- ------------------------------------------------ 3. Zentrale Übersetzungsmenge
-- Liefert alle tatsächlich übersetzbaren deutschen Texte aus allen
-- redaktionellen Beständen, inkl. Zielwert, Herkunft und Freigabe.
--
-- Wahrheit je Bereich (keine doppelte Wahrheit):
--  * section_field  -> cms_section_fields (Wert + review_status + source_hash)
--  * page_title     -> cms_pages.title_*        + cms_translation_unit_state
--  * nav_label      -> cms_navigation_nodes.label_*       + state
--  * nav_description-> cms_navigation_nodes.description_* + state
--  * asset_alt      -> cms_assets.alt_* (kanonisch)       + state
-- Zielwerte ohne bekannte Herkunft gelten als 'geprueft' => geschützt.
CREATE OR REPLACE FUNCTION public.cms_translation_units(
  p_target_locale text,
  p_page_keys text[] DEFAULT NULL,
  p_areas text[] DEFAULT NULL
)
RETURNS TABLE (
  area text,
  ref_id uuid,
  ref_key text,
  page_key text,
  section_key text,
  unit_key text,
  sort_a text,
  sort_b text,
  sort_c text,
  label text,
  source_text text,
  source_hash text,
  target_value text,
  target_status text,
  target_hash text,
  whitelisted boolean,
  is_todo boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH cfg AS (
    SELECT lower(coalesce(p_target_locale, '')) AS loc,
           -- Spaltenbasierte Bereiche existieren nur für EN und PL.
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
       AND public.cms_field_is_translatable(f.field_key)
       AND public.cms_text_is_translatable(f.value)
       AND (p_areas IS NULL OR 'section_field' = ANY (p_areas))

    UNION ALL
    -- Seitentitel
    SELECT 'page_title', NULL::uuid, p.page_key, p.page_key, '-', 'title',
           p.page_key, 'page_title', 'title', 'Seitentitel', p.title_de
      FROM public.cms_pages p, cfg
     WHERE cfg.col_ok
       AND public.cms_text_is_translatable(p.title_de)
       AND (p_areas IS NULL OR 'page_title' = ANY (p_areas))

    UNION ALL
    -- Navigationsbeschriftung
    SELECT 'nav_label', n.id, n.id::text, coalesce(n.page_key, '~nav'), n.nav_area, 'label',
           coalesce(n.page_key, '~nav'), 'nav_label:' || n.nav_area, n.node_key,
           'Navigation: Beschriftung', n.label_de
      FROM public.cms_navigation_nodes n, cfg
     WHERE cfg.col_ok
       AND public.cms_text_is_translatable(n.label_de)
       AND (p_areas IS NULL OR 'nav_label' = ANY (p_areas))

    UNION ALL
    -- Navigationsbeschreibung
    SELECT 'nav_description', n.id, n.id::text, coalesce(n.page_key, '~nav'), n.nav_area, 'description',
           coalesce(n.page_key, '~nav'), 'nav_description:' || n.nav_area, n.node_key,
           'Navigation: Beschreibung', n.description_de
      FROM public.cms_navigation_nodes n, cfg
     WHERE cfg.col_ok
       AND public.cms_text_is_translatable(n.description_de)
       AND (p_areas IS NULL OR 'nav_description' = ANY (p_areas))

    UNION ALL
    -- Bild-Alternativtexte (kanonisch: alt_de/alt_en/alt_pl)
    SELECT 'asset_alt', a.id, a.id::text, a.page_key, a.section_key, 'alt',
           a.page_key, 'asset_alt:' || a.section_key,
           coalesce(a.field_key, a.asset_role) || ':' || a.id::text,
           'Bild-Alternativtext', a.alt_de
      FROM public.cms_assets a, cfg
     WHERE cfg.col_ok
       AND a.is_active = true
       AND public.cms_text_is_translatable(a.alt_de)
       AND (p_areas IS NULL OR 'asset_alt' = ANY (p_areas))
  ),
  scoped AS (
    SELECT b.*, public.cms_translation_hash(b.source_text) AS src_hash
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
           CASE b.area
             WHEN 'section_field' THEN sf.review_status
             ELSE st.review_status
           END AS raw_status,
           CASE b.area
             WHEN 'section_field' THEN sf.source_hash
             ELSE st.source_hash
           END AS tgt_hash,
           CASE b.area
             WHEN 'section_field' THEN coalesce(w.is_enabled, false)
             ELSE true
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
$$;

REVOKE ALL ON FUNCTION public.cms_translation_units(text, text[], text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cms_translation_units(text, text[], text[]) FROM anon;
REVOKE ALL ON FUNCTION public.cms_translation_units(text, text[], text[]) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cms_translation_units(text, text[], text[]) TO service_role;

REVOKE ALL ON FUNCTION public.cms_text_is_translatable(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cms_text_is_translatable(text) TO anon, authenticated, service_role;
