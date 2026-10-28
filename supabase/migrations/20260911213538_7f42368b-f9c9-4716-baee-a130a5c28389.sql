CREATE OR REPLACE FUNCTION public.rpc_admin_set_locale_visibility(p_locale text, p_is_active boolean DEFAULT NULL::boolean, p_is_public boolean DEFAULT NULL::boolean, p_reason text DEFAULT NULL::text)
 RETURNS TABLE(locale text, is_active boolean, is_public boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '180s'
AS $function$
DECLARE
  v_locale text := lower(btrim(coalesce(p_locale, '')));
  v_row public.cms_locales;
  v_active boolean;
  v_public boolean;
  v_prep jsonb;
  v_run uuid;
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

  IF v_row.is_source THEN
    v_active := true;
    v_public := true;
  END IF;

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

  -- Aktive Zielsprachen sind ohne manuellen Datenbankeingriff uebersetzbar.
  IF v_active AND NOT v_row.is_source THEN
    v_prep := public.rpc_internal_prepare_translation_locale(v_locale);
  END IF;

  -- Neu auf der Website sichtbar: fehlende/veraltete Texte serverseitig einplanen.
  IF v_active AND v_public AND NOT v_row.is_source AND NOT coalesce(v_row.is_public, false) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.cms_translation_runs r
       WHERE r.target_locale = v_locale
         AND r.status IN ('queued','running')
    ) THEN
      INSERT INTO public.cms_translation_runs
        (source_locale, target_locale, scope_kind, scope_signature, page_keys, provider, model, status)
      SELECT 'de', v_locale, 'locale', 'locale:' || v_locale, '{}',
             coalesce(r.provider, 'lovable_ai'), coalesce(r.model, 'google/gemini-3.6-flash'), 'queued'
        FROM (SELECT provider, model FROM public.cms_translation_provider_rates
               WHERE is_enabled AND is_default ORDER BY updated_at DESC LIMIT 1) r
      RETURNING id INTO v_run;

      IF v_run IS NULL THEN
        INSERT INTO public.cms_translation_runs
          (source_locale, target_locale, scope_kind, scope_signature, page_keys, provider, model, status)
        VALUES ('de', v_locale, 'locale', 'locale:' || v_locale, '{}',
                'lovable_ai', 'google/gemini-3.6-flash', 'queued')
        RETURNING id INTO v_run;
      END IF;
    END IF;
    PERFORM public.rpc_internal_translation_worker_arm();
  END IF;

  RETURN QUERY
    SELECT c.locale, c.is_active, c.is_public FROM public.cms_locales c WHERE c.locale = v_locale;
END;
$function$;