DO $$
BEGIN
  IF to_regprocedure('public.cms_autopilot_trg_ui_strings()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.cms_autopilot_trg_ui_strings() FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.cms_autopilot_trg_ui_strings() TO service_role';
  END IF;
END
$$;