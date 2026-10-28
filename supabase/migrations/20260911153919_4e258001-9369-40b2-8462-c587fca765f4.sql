-- Sprachprüfung dynamisch gegen public.cms_locales statt fester CHECK-Listen.
-- Idempotent, keine Inhaltsmutation.

CREATE OR REPLACE FUNCTION public.cms_locale_is_known(p_locale text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p_locale IS NULL OR EXISTS (SELECT 1 FROM public.cms_locales l WHERE l.locale = p_locale);
$$;

REVOKE ALL ON FUNCTION public.cms_locale_is_known(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cms_locale_is_known(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cms_locale_is_known(text) TO service_role;

CREATE OR REPLACE FUNCTION public.cms_validate_locale_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_col text := TG_ARGV[0];
  v_val text;
BEGIN
  EXECUTE format('SELECT ($1).%I::text', v_col) INTO v_val USING NEW;
  IF v_val IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.cms_locales l WHERE l.locale = v_val) THEN
    RAISE EXCEPTION 'locale_not_registered: %', v_val USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.cms_validate_locale_column() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cms_validate_locale_column() FROM anon, authenticated;

-- cms_section_fields
ALTER TABLE public.cms_section_fields DROP CONSTRAINT IF EXISTS cms_section_fields_locale_check;
DROP TRIGGER IF EXISTS trg_cms_section_fields_locale ON public.cms_section_fields;
CREATE TRIGGER trg_cms_section_fields_locale
  BEFORE INSERT OR UPDATE OF locale ON public.cms_section_fields
  FOR EACH ROW EXECUTE FUNCTION public.cms_validate_locale_column('locale');

-- cms_admin_editable_fields
ALTER TABLE public.cms_admin_editable_fields DROP CONSTRAINT IF EXISTS cms_admin_editable_fields_locale_chk;
DROP TRIGGER IF EXISTS trg_cms_admin_editable_fields_locale ON public.cms_admin_editable_fields;
CREATE TRIGGER trg_cms_admin_editable_fields_locale
  BEFORE INSERT OR UPDATE OF locale ON public.cms_admin_editable_fields
  FOR EACH ROW EXECUTE FUNCTION public.cms_validate_locale_column('locale');

-- cms_assets
ALTER TABLE public.cms_assets DROP CONSTRAINT IF EXISTS cms_assets_locale_check;
DROP TRIGGER IF EXISTS trg_cms_assets_locale ON public.cms_assets;
CREATE TRIGGER trg_cms_assets_locale
  BEFORE INSERT OR UPDATE OF locale ON public.cms_assets
  FOR EACH ROW EXECUTE FUNCTION public.cms_validate_locale_column('locale');

-- cms_translation_jobs / _memory
ALTER TABLE public.cms_translation_jobs DROP CONSTRAINT IF EXISTS cms_translation_jobs_target_locale_check;
DROP TRIGGER IF EXISTS trg_cms_translation_jobs_locale ON public.cms_translation_jobs;
CREATE TRIGGER trg_cms_translation_jobs_locale
  BEFORE INSERT OR UPDATE OF target_locale ON public.cms_translation_jobs
  FOR EACH ROW EXECUTE FUNCTION public.cms_validate_locale_column('target_locale');

ALTER TABLE public.cms_translation_memory DROP CONSTRAINT IF EXISTS cms_translation_memory_target_locale_check;
DROP TRIGGER IF EXISTS trg_cms_translation_memory_locale ON public.cms_translation_memory;
CREATE TRIGGER trg_cms_translation_memory_locale
  BEFORE INSERT OR UPDATE OF target_locale ON public.cms_translation_memory
  FOR EACH ROW EXECUTE FUNCTION public.cms_validate_locale_column('target_locale');

-- Maschinelle Anwendung: jede aktive Zielsprache außer der Quellsprache.
CREATE OR REPLACE FUNCTION public.rpc_internal_apply_machine_translation(
  p_page_key text, p_section_key text, p_field_key text, p_locale text,
  p_value text, p_source_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_allowed boolean;
  v_exists boolean;
  v_status text;
  v_current text;
  v_target_ok boolean;
BEGIN
  SELECT (l.is_active AND NOT l.is_source) INTO v_target_ok
    FROM public.cms_locales l WHERE l.locale = p_locale;
  IF NOT coalesce(v_target_ok, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'locale_not_allowed');
  END IF;
  IF coalesce(btrim(p_value), '') = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'empty_value');
  END IF;
  IF NOT public.cms_field_is_translatable(p_field_key) THEN
    RETURN jsonb_build_object('success', false, 'error', 'field_not_translatable');
  END IF;

  SELECT true INTO v_allowed
    FROM public.cms_admin_editable_fields w
   WHERE w.page_key = p_page_key AND w.section_key = p_section_key
     AND w.field_key = p_field_key AND w.locale = p_locale AND w.is_enabled = true
   LIMIT 1;
  IF NOT coalesce(v_allowed, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'field_not_whitelisted');
  END IF;

  SELECT true, f.review_status, coalesce(f.value, '')
    INTO v_exists, v_status, v_current
    FROM public.cms_section_fields f
   WHERE f.page_key = p_page_key AND f.section_key = p_section_key
     AND f.field_key = p_field_key AND f.locale = p_locale
   LIMIT 1;

  IF coalesce(v_exists, false) THEN
    -- Manuell gepflegte Zieltexte werden NIE überschrieben.
    IF btrim(v_current) <> '' AND v_status = 'geprueft' THEN
      RETURN jsonb_build_object('success', true, 'updated', false, 'skipped', 'manual_value');
    END IF;
    UPDATE public.cms_section_fields
       SET value = p_value,
           review_status = 'maschinell',
           source_hash = p_source_hash,
           updated_at = now()
     WHERE page_key = p_page_key AND section_key = p_section_key
       AND field_key = p_field_key AND locale = p_locale;
    RETURN jsonb_build_object('success', true, 'updated', true);
  END IF;

  INSERT INTO public.cms_section_fields
    (page_key, section_key, field_key, locale, value, review_status, source_hash)
  VALUES (p_page_key, p_section_key, p_field_key, p_locale, p_value, 'maschinell', p_source_hash);
  RETURN jsonb_build_object('success', true, 'updated', true);
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_internal_apply_machine_translation(text,text,text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_internal_apply_machine_translation(text,text,text,text,text,text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_internal_apply_machine_translation(text,text,text,text,text,text) TO service_role;