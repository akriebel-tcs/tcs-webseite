CREATE TABLE IF NOT EXISTS public.cms_locale_visibility_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locale text NOT NULL,
  was_active boolean,
  was_public boolean,
  is_active boolean NOT NULL,
  is_public boolean NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cms_locale_visibility_audit TO anon, authenticated;
GRANT ALL ON public.cms_locale_visibility_audit TO service_role;

ALTER TABLE public.cms_locale_visibility_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cms_locale_visibility_audit read" ON public.cms_locale_visibility_audit;
CREATE POLICY "cms_locale_visibility_audit read"
  ON public.cms_locale_visibility_audit FOR SELECT
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS cms_locale_visibility_audit_locale_idx
  ON public.cms_locale_visibility_audit (locale, created_at DESC);

CREATE OR REPLACE FUNCTION public.rpc_admin_set_locale_visibility(
  p_locale text,
  p_is_active boolean DEFAULT NULL,
  p_is_public boolean DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS TABLE (locale text, is_active boolean, is_public boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_locale text := lower(btrim(coalesce(p_locale, '')));
  v_row public.cms_locales;
  v_active boolean;
  v_public boolean;
BEGIN
  IF v_locale = '' THEN
    RAISE EXCEPTION 'locale_required';
  END IF;

  SELECT * INTO v_row FROM public.cms_locales c WHERE c.locale = v_locale;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'locale_unknown';
  END IF;

  v_active := coalesce(p_is_active, v_row.is_active);
  v_public := coalesce(p_is_public, v_row.is_public);

  -- Quellsprache bleibt immer bearbeitbar und öffentlich sichtbar.
  IF v_row.is_source THEN
    v_active := true;
    v_public := true;
  END IF;

  -- Öffentlich sichtbar setzt Bearbeitbarkeit voraus.
  IF NOT v_active THEN
    v_public := false;
  END IF;

  IF v_active IS DISTINCT FROM v_row.is_active OR v_public IS DISTINCT FROM v_row.is_public THEN
    UPDATE public.cms_locales c
       SET is_active = v_active,
           is_public = v_public,
           updated_at = now()
     WHERE c.locale = v_locale;

    INSERT INTO public.cms_locale_visibility_audit
      (locale, was_active, was_public, is_active, is_public, reason)
    VALUES
      (v_locale, v_row.is_active, v_row.is_public, v_active, v_public, nullif(btrim(coalesce(p_reason, '')), ''));
  END IF;

  RETURN QUERY
    SELECT c.locale, c.is_active, c.is_public FROM public.cms_locales c WHERE c.locale = v_locale;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_admin_set_locale_visibility(text, boolean, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_admin_set_locale_visibility(text, boolean, boolean, text) TO anon, authenticated, service_role;