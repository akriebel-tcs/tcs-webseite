-- 1) Zwischenspeicher-Tabelle für die Sprachstand-Zusammenfassung
CREATE TABLE IF NOT EXISTS public.cms_translation_coverage_cache (
  cache_key text PRIMARY KEY,
  payload jsonb NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  compute_ms integer NOT NULL DEFAULT 0,
  is_stale boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.cms_translation_coverage_cache TO service_role;
ALTER TABLE public.cms_translation_coverage_cache ENABLE ROW LEVEL SECURITY;

-- 2) Als veraltet markieren (billig, ohne Neuberechnung)
CREATE OR REPLACE FUNCTION public.rpc_internal_translation_coverage_invalidate()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  UPDATE public.cms_translation_coverage_cache
     SET is_stale = true, updated_at = now()
   WHERE cache_key = 'global'
$function$;

REVOKE ALL ON FUNCTION public.rpc_internal_translation_coverage_invalidate() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_internal_translation_coverage_invalidate() FROM anon;
REVOKE ALL ON FUNCTION public.rpc_internal_translation_coverage_invalidate() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_internal_translation_coverage_invalidate() TO service_role;

-- 3) Gecachte Zusammenfassung
CREATE OR REPLACE FUNCTION public.rpc_internal_translation_coverage_cached(
  p_max_age_seconds integer DEFAULT 900,
  p_force boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '170s'
AS $function$
DECLARE
  v_row public.cms_translation_coverage_cache;
  v_payload jsonb;
  v_t0 timestamptz;
  v_ms integer;
  v_max_age integer := greatest(coalesce(p_max_age_seconds, 900), 0);
BEGIN
  SELECT * INTO v_row
    FROM public.cms_translation_coverage_cache
   WHERE cache_key = 'global';

  -- Veraltete Zusammenfassung wird früher erneuert, blockiert aber nicht jeden Aufruf.
  IF v_row.cache_key IS NOT NULL AND v_row.is_stale THEN
    v_max_age := least(v_max_age, 60);
  END IF;

  IF NOT coalesce(p_force, false)
     AND v_row.cache_key IS NOT NULL
     AND v_row.computed_at > now() - make_interval(secs => v_max_age)
  THEN
    RETURN v_row.payload || jsonb_build_object(
      'cache', jsonb_build_object(
        'hit', true,
        'is_stale', v_row.is_stale,
        'computed_at', v_row.computed_at,
        'compute_ms', v_row.compute_ms,
        'age_seconds', floor(extract(epoch FROM now() - v_row.computed_at))::int
      ));
  END IF;

  v_t0 := clock_timestamp();
  v_payload := public.rpc_internal_translation_coverage();
  v_ms := (extract(epoch FROM clock_timestamp() - v_t0) * 1000)::int;

  INSERT INTO public.cms_translation_coverage_cache
    (cache_key, payload, computed_at, compute_ms, is_stale, updated_at)
  VALUES ('global', v_payload, now(), v_ms, false, now())
  ON CONFLICT (cache_key) DO UPDATE
     SET payload = excluded.payload,
         computed_at = excluded.computed_at,
         compute_ms = excluded.compute_ms,
         is_stale = false,
         updated_at = now();

  RETURN v_payload || jsonb_build_object(
    'cache', jsonb_build_object(
      'hit', false,
      'is_stale', false,
      'computed_at', now(),
      'compute_ms', v_ms,
      'age_seconds', 0
    ));
END
$function$;

REVOKE ALL ON FUNCTION public.rpc_internal_translation_coverage_cached(integer, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_internal_translation_coverage_cached(integer, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.rpc_internal_translation_coverage_cached(integer, boolean) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_internal_translation_coverage_cached(integer, boolean) TO service_role;

-- 4) Automatische Veraltet-Markierung (je Anweisung, nicht je Zeile)
CREATE OR REPLACE FUNCTION public.cms_trg_coverage_invalidate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.cms_translation_coverage_cache
     SET is_stale = true, updated_at = now()
   WHERE cache_key = 'global';
  RETURN NULL;
END
$function$;

REVOKE ALL ON FUNCTION public.cms_trg_coverage_invalidate() FROM PUBLIC;

DO $do$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'cms_section_fields',
    'cms_admin_editable_fields',
    'cms_pages',
    'cms_navigation_nodes',
    'cms_assets',
    'cms_page_translations',
    'cms_navigation_node_translations',
    'cms_asset_translations',
    'cms_translation_unit_state',
    'cms_translation_runs',
    'cms_translation_jobs',
    'cms_locales'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_coverage_invalidate ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_coverage_invalidate AFTER INSERT OR UPDATE OR DELETE ON public.%I '
      || 'FOR EACH STATEMENT EXECUTE FUNCTION public.cms_trg_coverage_invalidate()', t);
  END LOOP;
END
$do$;

-- 5) Kleine Planbarkeitsverbesserung: Feldnamen-Prüfung parallelfähig machen
ALTER FUNCTION public.cms_field_is_translatable(text) PARALLEL SAFE;