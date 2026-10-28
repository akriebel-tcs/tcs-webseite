
-- Sprint „Kartenmodell vereinheitlichen — card_v1 Textwahrheit konsolidieren"
-- Idempotent: kopiert Alias-Werte nach canonical (nur wenn canonical leer),
-- legt fehlende canonical Default-Zeilen an, aktiviert Whitelist.

DO $mig$
DECLARE
  v_copied_subtitle int := 0;
  v_copied_headline int := 0;
  v_copied_beschr   int := 0;
  v_default_rows    int := 0;
  v_whitelist_rows  int := 0;
BEGIN
  -- Basis: alle aktiven card_v1 × {de,en} × {eyebrow,title,description}
  CREATE TEMP TABLE _plan ON COMMIT DROP AS
  SELECT s.page_key, s.section_key, fk.field_key, loc.locale
  FROM cms_sections s
  CROSS JOIN (VALUES ('eyebrow'),('title'),('description')) AS fk(field_key)
  CROSS JOIN (VALUES ('de'),('en')) AS loc(locale)
  WHERE s.section_type = 'card_v1' AND s.is_active = true;

  -- 1) Default-Zeilen für canonical Felder anlegen (value=''), wenn fehlend.
  WITH ins AS (
    INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
    SELECT p.page_key, p.section_key, p.field_key, p.locale, ''
    FROM _plan p
    WHERE NOT EXISTS (
      SELECT 1 FROM public.cms_section_fields f
      WHERE f.page_key = p.page_key AND f.section_key = p.section_key
        AND f.field_key = p.field_key AND f.locale = p.locale
    )
    RETURNING 1
  )
  SELECT count(*) INTO v_default_rows FROM ins;

  -- 2) Alias-Backfill — nur wenn canonical leer/NULL und Alias gefüllt.
  --    subtitle → eyebrow
  WITH upd AS (
    UPDATE public.cms_section_fields f
    SET value = a.value, updated_at = now()
    FROM public.cms_section_fields a
    JOIN public.cms_sections s
      ON s.page_key = a.page_key AND s.section_key = a.section_key
    WHERE s.section_type = 'card_v1' AND s.is_active = true
      AND a.field_key = 'subtitle'
      AND a.locale IN ('de','en')
      AND COALESCE(NULLIF(a.value, ''), NULL) IS NOT NULL
      AND f.page_key = a.page_key AND f.section_key = a.section_key
      AND f.field_key = 'eyebrow' AND f.locale = a.locale
      AND COALESCE(NULLIF(f.value, ''), NULL) IS NULL
    RETURNING 1
  )
  SELECT count(*) INTO v_copied_subtitle FROM upd;

  --    headline → title
  WITH upd AS (
    UPDATE public.cms_section_fields f
    SET value = a.value, updated_at = now()
    FROM public.cms_section_fields a
    JOIN public.cms_sections s
      ON s.page_key = a.page_key AND s.section_key = a.section_key
    WHERE s.section_type = 'card_v1' AND s.is_active = true
      AND a.field_key = 'headline'
      AND a.locale IN ('de','en')
      AND COALESCE(NULLIF(a.value, ''), NULL) IS NOT NULL
      AND f.page_key = a.page_key AND f.section_key = a.section_key
      AND f.field_key = 'title' AND f.locale = a.locale
      AND COALESCE(NULLIF(f.value, ''), NULL) IS NULL
    RETURNING 1
  )
  SELECT count(*) INTO v_copied_headline FROM upd;

  --    beschreibung → description
  WITH upd AS (
    UPDATE public.cms_section_fields f
    SET value = a.value, updated_at = now()
    FROM public.cms_section_fields a
    JOIN public.cms_sections s
      ON s.page_key = a.page_key AND s.section_key = a.section_key
    WHERE s.section_type = 'card_v1' AND s.is_active = true
      AND a.field_key = 'beschreibung'
      AND a.locale IN ('de','en')
      AND COALESCE(NULLIF(a.value, ''), NULL) IS NOT NULL
      AND f.page_key = a.page_key AND f.section_key = a.section_key
      AND f.field_key = 'description' AND f.locale = a.locale
      AND COALESCE(NULLIF(f.value, ''), NULL) IS NULL
    RETURNING 1
  )
  SELECT count(*) INTO v_copied_beschr FROM upd;

  -- 3) Whitelist DE+EN für canonical Felder sicherstellen (is_enabled=true).
  WITH upserted AS (
    INSERT INTO public.cms_admin_editable_fields
      (page_key, section_key, field_key, locale, is_enabled)
    SELECT p.page_key, p.section_key, p.field_key, p.locale, true
    FROM _plan p
    ON CONFLICT (page_key, section_key, field_key, locale)
    DO UPDATE SET is_enabled = true, updated_at = now()
    RETURNING 1
  )
  SELECT count(*) INTO v_whitelist_rows FROM upserted;

  RAISE NOTICE 'card_v1 textmodell: defaults=% subtitle->eyebrow=% headline->title=% beschreibung->description=% whitelist=%',
    v_default_rows, v_copied_subtitle, v_copied_headline, v_copied_beschr, v_whitelist_rows;
END
$mig$;
