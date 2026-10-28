-- ============================================================ Rollen
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
                 WHERE n.nspname='public' AND t.typname='app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin','editor');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

DROP POLICY IF EXISTS "user_roles_self_select" ON public.user_roles;
CREATE POLICY "user_roles_self_select" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ================================================ Anbieter-Zugangsdaten
CREATE TABLE IF NOT EXISTS public.cms_provider_credentials (
  provider text PRIMARY KEY,
  vault_secret_name text NOT NULL,
  last4 text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  last_test_at timestamptz,
  last_test_ok boolean,
  last_test_error text
);

GRANT ALL ON public.cms_provider_credentials TO service_role;
ALTER TABLE public.cms_provider_credentials ENABLE ROW LEVEL SECURITY;
-- Bewusst KEINE Policy: aus dem Browser (anon/authenticated) nicht lesbar.

CREATE TABLE IF NOT EXISTS public.cms_provider_credential_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  action text NOT NULL,
  actor uuid,
  result text,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.cms_provider_credential_audit TO service_role;
ALTER TABLE public.cms_provider_credential_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "provider_audit_admin_read" ON public.cms_provider_credential_audit;
CREATE POLICY "provider_audit_admin_read" ON public.cms_provider_credential_audit
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
GRANT SELECT ON public.cms_provider_credential_audit TO authenticated;

-- ============================================ Anbieter/Modell je Sprache
CREATE TABLE IF NOT EXISTS public.cms_locale_translation_config (
  locale text PRIMARY KEY REFERENCES public.cms_locales(locale) ON DELETE CASCADE,
  provider text NOT NULL,
  model text NOT NULL,
  verified_at timestamptz,
  verified_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cms_locale_translation_config TO anon, authenticated;
GRANT ALL ON public.cms_locale_translation_config TO service_role;
ALTER TABLE public.cms_locale_translation_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "locale_translation_config_read" ON public.cms_locale_translation_config;
CREATE POLICY "locale_translation_config_read" ON public.cms_locale_translation_config
  FOR SELECT USING (true);

DROP TRIGGER IF EXISTS trg_locale_translation_config_touch ON public.cms_locale_translation_config;
CREATE TRIGGER trg_locale_translation_config_touch
  BEFORE UPDATE ON public.cms_locale_translation_config
  FOR EACH ROW EXECUTE FUNCTION public.cms_set_updated_at();

-- ==================================================== Interne Funktionen
CREATE OR REPLACE FUNCTION public.rpc_internal_provider_secret_set(
  p_provider text, p_secret text, p_actor uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_name text := 'cms_provider_' || lower(p_provider);
  v_last4 text;
  v_existing uuid;
BEGIN
  IF p_provider IS NULL OR btrim(p_provider) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'provider_required');
  END IF;
  IF p_secret IS NULL OR length(btrim(p_secret)) < 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'secret_too_short');
  END IF;

  v_last4 := right(btrim(p_secret), 4);

  SELECT id INTO v_existing FROM vault.secrets WHERE name = v_name;
  IF v_existing IS NULL THEN
    PERFORM vault.create_secret(btrim(p_secret), v_name, 'CMS-Light Übersetzungsanbieter');
  ELSE
    PERFORM vault.update_secret(v_existing, btrim(p_secret), v_name, 'CMS-Light Übersetzungsanbieter');
  END IF;

  INSERT INTO public.cms_provider_credentials AS c (provider, vault_secret_name, last4, updated_at, updated_by)
  VALUES (lower(p_provider), v_name, v_last4, now(), p_actor)
  ON CONFLICT (provider) DO UPDATE
    SET vault_secret_name = EXCLUDED.vault_secret_name,
        last4 = EXCLUDED.last4,
        updated_at = now(),
        updated_by = EXCLUDED.updated_by,
        last_test_at = NULL,
        last_test_ok = NULL,
        last_test_error = NULL;

  INSERT INTO public.cms_provider_credential_audit (provider, action, actor, result)
  VALUES (lower(p_provider), CASE WHEN v_existing IS NULL THEN 'created' ELSE 'replaced' END, p_actor, 'ok');

  RETURN jsonb_build_object('success', true, 'provider', lower(p_provider), 'last4', v_last4);
END $$;

CREATE OR REPLACE FUNCTION public.rpc_internal_provider_secret_get(p_provider text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE v_secret text;
BEGIN
  SELECT s.decrypted_secret INTO v_secret
  FROM public.cms_provider_credentials c
  JOIN vault.decrypted_secrets s ON s.name = c.vault_secret_name
  WHERE c.provider = lower(p_provider);
  RETURN v_secret;
END $$;

CREATE OR REPLACE FUNCTION public.rpc_internal_provider_secret_delete(
  p_provider text, p_actor uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE v_name text;
BEGIN
  SELECT vault_secret_name INTO v_name FROM public.cms_provider_credentials WHERE provider = lower(p_provider);
  IF v_name IS NULL THEN
    RETURN jsonb_build_object('success', true, 'removed', false);
  END IF;
  DELETE FROM vault.secrets WHERE name = v_name;
  DELETE FROM public.cms_provider_credentials WHERE provider = lower(p_provider);
  INSERT INTO public.cms_provider_credential_audit (provider, action, actor, result)
  VALUES (lower(p_provider), 'deleted', p_actor, 'ok');
  RETURN jsonb_build_object('success', true, 'removed', true);
END $$;

CREATE OR REPLACE FUNCTION public.rpc_internal_provider_credentials_status()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'provider', provider,
    'configured', true,
    'last4', last4,
    'updated_at', updated_at,
    'last_test_at', last_test_at,
    'last_test_ok', last_test_ok,
    'last_test_error', last_test_error
  ) ORDER BY provider), '[]'::jsonb)
  FROM public.cms_provider_credentials
$$;

CREATE OR REPLACE FUNCTION public.rpc_internal_provider_test_record(
  p_provider text, p_ok boolean, p_error text DEFAULT NULL, p_actor uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.cms_provider_credentials
     SET last_test_at = now(), last_test_ok = p_ok, last_test_error = left(COALESCE(p_error,''), 300)
   WHERE provider = lower(p_provider);
  INSERT INTO public.cms_provider_credential_audit (provider, action, actor, result, detail)
  VALUES (lower(p_provider), 'tested', p_actor, CASE WHEN p_ok THEN 'ok' ELSE 'failed' END, left(COALESCE(p_error,''), 300));
  RETURN jsonb_build_object('success', true);
END $$;

-- Modellliste eines Anbieters ersetzen (nur eigene Anbieter, nie lovable_ai)
CREATE OR REPLACE FUNCTION public.rpc_internal_provider_models_replace(
  p_provider text, p_models jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider text := lower(p_provider);
  v_secret text;
  v_count int := 0;
  v_item jsonb;
  v_keep text[] := ARRAY[]::text[];
BEGIN
  IF v_provider = 'lovable_ai' THEN
    RETURN jsonb_build_object('success', false, 'error', 'provider_not_managed');
  END IF;
  IF p_models IS NULL OR jsonb_typeof(p_models) <> 'array' THEN
    RETURN jsonb_build_object('success', false, 'error', 'models_invalid');
  END IF;

  v_secret := CASE v_provider
    WHEN 'google_gemini' THEN 'GOOGLE_GEMINI_API_KEY'
    WHEN 'anthropic' THEN 'ANTHROPIC_API_KEY'
    WHEN 'deepl' THEN 'DEEPL_API_KEY'
    ELSE NULL END;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_models) LOOP
    IF COALESCE(v_item->>'model','') = '' THEN CONTINUE; END IF;
    v_keep := v_keep || (v_item->>'model');
    INSERT INTO public.cms_translation_provider_rates AS r
      (provider, model, label, currency, cost_per_1k_source_chars, is_default, is_enabled, requires_secret, basis_note)
    VALUES (
      v_provider,
      v_item->>'model',
      COALESCE(NULLIF(v_item->>'label',''), v_item->>'model'),
      'EUR',
      COALESCE((v_item->>'cost_per_1k_source_chars')::numeric, 0),
      COALESCE((v_item->>'is_default')::boolean, false),
      true,
      v_secret,
      COALESCE(NULLIF(v_item->>'basis_note',''), 'Serverseitig von der Anbieter-API ermittelt.')
    )
    ON CONFLICT (provider, model) DO UPDATE
      SET label = EXCLUDED.label,
          is_enabled = true,
          requires_secret = EXCLUDED.requires_secret,
          basis_note = EXCLUDED.basis_note,
          updated_at = now();
    v_count := v_count + 1;
  END LOOP;

  -- Nicht mehr gelieferte Modelle nur deaktivieren, nie löschen.
  UPDATE public.cms_translation_provider_rates
     SET is_enabled = false, updated_at = now()
   WHERE provider = v_provider AND NOT (model = ANY(v_keep));

  RETURN jsonb_build_object('success', true, 'provider', v_provider, 'models', v_count);
END $$;

CREATE OR REPLACE FUNCTION public.rpc_internal_locale_provider_set(
  p_locale text, p_provider text, p_model text, p_actor uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_locale text := lower(btrim(p_locale));
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.cms_locales WHERE locale = v_locale) THEN
    RETURN jsonb_build_object('success', false, 'error', 'locale_unknown');
  END IF;
  IF COALESCE(btrim(p_provider),'') = '' OR COALESCE(btrim(p_model),'') = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'provider_or_model_missing');
  END IF;

  INSERT INTO public.cms_locale_translation_config (locale, provider, model, verified_at, verified_by)
  VALUES (v_locale, lower(btrim(p_provider)), btrim(p_model), now(), p_actor)
  ON CONFLICT (locale) DO UPDATE
    SET provider = EXCLUDED.provider,
        model = EXCLUDED.model,
        verified_at = now(),
        verified_by = EXCLUDED.verified_by,
        updated_at = now();

  RETURN jsonb_build_object('success', true, 'locale', v_locale,
                            'provider', lower(btrim(p_provider)), 'model', btrim(p_model));
END $$;

-- Pausierten Lauf atomar auf anderen Anbieter umstellen (kein neuer Lauf)
CREATE OR REPLACE FUNCTION public.rpc_internal_translation_run_switch_provider(
  p_run_id uuid, p_provider text, p_model text, p_actor uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_run public.cms_translation_runs;
BEGIN
  SELECT * INTO v_run FROM public.cms_translation_runs WHERE id = p_run_id FOR UPDATE;
  IF v_run.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'run_not_found');
  END IF;
  IF v_run.status <> 'paused' THEN
    RETURN jsonb_build_object('success', false, 'error', 'run_not_paused', 'status', v_run.status);
  END IF;
  IF COALESCE(btrim(p_provider),'') = '' OR COALESCE(btrim(p_model),'') = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'provider_or_model_missing');
  END IF;

  UPDATE public.cms_translation_runs
     SET provider = lower(btrim(p_provider)),
         model = btrim(p_model),
         status = 'running',
         last_error = NULL,
         worker_armed = true,
         lease_owner = NULL,
         lease_until = NULL,
         updated_at = now()
   WHERE id = p_run_id;

  INSERT INTO public.cms_provider_credential_audit (provider, action, actor, result, detail)
  VALUES (lower(btrim(p_provider)), 'run_switch', p_actor, 'ok',
          'run=' || p_run_id::text || ' from=' || v_run.provider || '/' || v_run.model
          || ' to=' || lower(btrim(p_provider)) || '/' || btrim(p_model)
          || ' done=' || v_run.fields_done::text || '/' || v_run.fields_planned::text);

  SELECT * INTO v_run FROM public.cms_translation_runs WHERE id = p_run_id;
  RETURN jsonb_build_object('success', true, 'run', to_jsonb(v_run));
END $$;

-- Ausführungsrechte: ausschließlich der Serverdienst (service_role)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'rpc_internal_provider_secret_set',
        'rpc_internal_provider_secret_get',
        'rpc_internal_provider_secret_delete',
        'rpc_internal_provider_credentials_status',
        'rpc_internal_provider_test_record',
        'rpc_internal_provider_models_replace',
        'rpc_internal_locale_provider_set',
        'rpc_internal_translation_run_switch_provider'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;
