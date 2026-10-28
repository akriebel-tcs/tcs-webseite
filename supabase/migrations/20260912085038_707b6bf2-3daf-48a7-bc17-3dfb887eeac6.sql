DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'rpc_admin_sync_ui_strings'
  ) THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.rpc_admin_sync_ui_strings(jsonb) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.rpc_admin_sync_ui_strings(jsonb) TO service_role';
  END IF;
END $$;