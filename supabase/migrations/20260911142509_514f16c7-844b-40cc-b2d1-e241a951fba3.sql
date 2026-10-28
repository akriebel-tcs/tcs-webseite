REVOKE ALL ON FUNCTION public.cms_mark_machine_translations_stale() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cms_mark_machine_translations_stale() FROM anon;
REVOKE ALL ON FUNCTION public.cms_mark_machine_translations_stale() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cms_mark_machine_translations_stale() TO service_role;