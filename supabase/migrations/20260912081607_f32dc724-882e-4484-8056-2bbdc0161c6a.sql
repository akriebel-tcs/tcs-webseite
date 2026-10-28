CREATE OR REPLACE FUNCTION public.rpc_internal_translation_coverage_invalidate()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  UPDATE public.cms_translation_coverage_locale_cache
     SET is_stale = true, updated_at = now()
   WHERE NOT is_stale
$function$;