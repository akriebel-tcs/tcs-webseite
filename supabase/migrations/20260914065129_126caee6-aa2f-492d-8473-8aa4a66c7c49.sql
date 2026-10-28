REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
COMMENT ON TABLE public.cms_provider_credentials IS
  'Nur Metadaten zu Anbieter-Schlüsseln (Verweis, letzte 4 Zeichen). Absichtlich ohne RLS-Policy: ausschließlich service_role (Serverdienst) darf lesen/schreiben. Der Schlüsselwert liegt verschlüsselt im Vault.';
