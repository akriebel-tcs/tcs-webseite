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
  total AS (SELECT count(*)::bigint AS n FROM base),
  per AS (
    SELECT l.sort_order,
           l.locale,
           l.label_de,
           l.is_active,
           l.is_source,
           l.is_public,
           (SELECT n FROM total) AS total,
           count(t.*) FILTER (WHERE coalesce(btrim(t.value), '') <> '')::bigint AS filled,
           count(t.*) FILTER (WHERE t.review_status = 'maschinell'
                                AND coalesce(btrim(t.value), '') <> '')::bigint AS machine,
           count(t.*) FILTER (WHERE t.review_status = 'maschinell_veraltet')::bigint AS stale,
           count(t.*) FILTER (WHERE t.review_status = 'geprueft'
                                AND coalesce(btrim(t.value), '') <> '')::bigint AS reviewed,
           (SELECT count(*) FROM public.cms_translation_runs r
             WHERE r.target_locale = l.locale
               AND r.status IN ('queued','running','paused'))::bigint AS open_runs,
           (SELECT count(*) FROM public.cms_translation_jobs j
             WHERE j.target_locale = l.locale AND j.status = 'failed')::bigint AS failed_jobs
      FROM public.cms_locales l
      LEFT JOIN base b ON true
      LEFT JOIN public.cms_section_fields t
             ON t.page_key = b.page_key
            AND t.section_key = b.section_key
            AND t.field_key = b.field_key
            AND t.locale = l.locale
     GROUP BY l.sort_order, l.locale, l.label_de, l.is_active, l.is_source, l.is_public
  )
  SELECT jsonb_build_object(
    'de_translatable_fields', (SELECT n FROM total),
    'locales', coalesce(
      (SELECT jsonb_agg(jsonb_build_object(
                'locale', p.locale,
                'label_de', p.label_de,
                'is_active', p.is_active,
                'is_source', p.is_source,
                'is_public', p.is_public,
                'total', p.total,
                'filled', p.filled,
                'machine', p.machine,
                'stale', p.stale,
                'reviewed', p.reviewed,
                'open_runs', p.open_runs,
                'failed_jobs', p.failed_jobs
              ) ORDER BY p.sort_order, p.locale)
         FROM per p),
      '[]'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION public.rpc_internal_translation_coverage() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_internal_translation_coverage() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_internal_translation_coverage() TO service_role;