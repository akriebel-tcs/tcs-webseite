CREATE OR REPLACE FUNCTION public.rpc_internal_translation_coverage()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH base AS (
    SELECT f.page_key, f.section_key, f.field_key
      FROM public.cms_section_fields f
     WHERE f.locale = 'de'
       AND coalesce(btrim(f.value), '') <> ''
       AND public.cms_field_is_translatable(f.field_key)
  ),
  per AS (
    SELECT l.locale,
           l.label_de,
           l.is_active,
           l.is_source,
           l.is_public,
           (SELECT count(*) FROM base) AS total,
           (SELECT count(*) FROM base b
              JOIN public.cms_section_fields t
                ON t.page_key = b.page_key AND t.section_key = b.section_key
               AND t.field_key = b.field_key AND t.locale = l.locale
             WHERE coalesce(btrim(t.value), '') <> '') AS filled,
           (SELECT count(*) FROM base b
              JOIN public.cms_section_fields t
                ON t.page_key = b.page_key AND t.section_key = b.section_key
               AND t.field_key = b.field_key AND t.locale = l.locale
             WHERE t.review_status = 'maschinell'
               AND coalesce(btrim(t.value), '') <> '') AS machine,
           (SELECT count(*) FROM base b
              JOIN public.cms_section_fields t
                ON t.page_key = b.page_key AND t.section_key = b.section_key
               AND t.field_key = b.field_key AND t.locale = l.locale
             WHERE t.review_status = 'maschinell_veraltet') AS stale,
           (SELECT count(*) FROM base b
              JOIN public.cms_section_fields t
                ON t.page_key = b.page_key AND t.section_key = b.section_key
               AND t.field_key = b.field_key AND t.locale = l.locale
             WHERE t.review_status = 'geprueft'
               AND coalesce(btrim(t.value), '') <> '') AS reviewed,
           (SELECT count(*) FROM public.cms_translation_runs r
             WHERE r.target_locale = l.locale AND r.status IN ('queued','running','paused')) AS open_runs,
           (SELECT count(*) FROM public.cms_translation_jobs j
             WHERE j.target_locale = l.locale AND j.status = 'failed') AS failed_jobs
      FROM public.cms_locales l
  )
  SELECT jsonb_build_object(
    'de_translatable_fields', (SELECT count(*) FROM base),
    'locales', (SELECT coalesce(jsonb_agg(to_jsonb(per) ORDER BY sort.sort_order), '[]'::jsonb)
                  FROM per JOIN public.cms_locales sort ON sort.locale = per.locale)
  );
$$;

REVOKE ALL ON FUNCTION public.rpc_internal_translation_coverage() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_internal_translation_coverage() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_internal_translation_coverage() TO service_role;