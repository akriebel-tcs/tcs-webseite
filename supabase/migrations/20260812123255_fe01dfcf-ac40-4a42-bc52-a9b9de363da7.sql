CREATE OR REPLACE FUNCTION public.rpc_admin_update_section_field(p_page_key text, p_section_key text, p_field_key text, p_locale text, p_value text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _allowed boolean := false;
  _rows int := 0;
  _is_active boolean := false;
  _section_exists boolean := false;
  _before jsonb;
  _after jsonb;
  _check_required boolean := false;
BEGIN
  IF p_locale NOT IN ('de','en') THEN
    RETURN jsonb_build_object('success', false, 'updated', false,
      'error', 'locale_not_allowed',
      'page_key', p_page_key, 'section_key', p_section_key,
      'field_key', p_field_key, 'locale', p_locale);
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.cms_admin_editable_fields w
     WHERE w.page_key=p_page_key AND w.section_key=p_section_key
       AND w.field_key=p_field_key AND w.locale=p_locale AND w.is_enabled=true
  ) INTO _allowed;
  IF NOT _allowed THEN
    RETURN jsonb_build_object('success', false, 'updated', false,
      'error', 'field_not_allowed',
      'page_key', p_page_key, 'section_key', p_section_key,
      'field_key', p_field_key, 'locale', p_locale);
  END IF;

  SELECT true, s.is_active INTO _section_exists, _is_active
    FROM public.cms_sections s
   WHERE s.page_key=p_page_key AND s.section_key=p_section_key
   LIMIT 1;

  IF NOT COALESCE(_section_exists, false) THEN
    RETURN jsonb_build_object('success', false, 'updated', false,
      'error', 'section_not_found',
      'page_key', p_page_key, 'section_key', p_section_key,
      'field_key', p_field_key, 'locale', p_locale);
  END IF;

  IF _is_active THEN
    _before := public.cms_section_renderability(p_page_key, p_section_key);
    _check_required := (_before->>'contract_known')::boolean
                       AND (_before->>'renderable')::boolean;
  END IF;

  BEGIN
    INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
    VALUES (p_page_key, p_section_key, p_field_key, p_locale, p_value)
    ON CONFLICT (page_key, section_key, field_key, locale)
    DO UPDATE SET value = EXCLUDED.value, updated_at = now();
    GET DIAGNOSTICS _rows = ROW_COUNT;

    IF _rows = 0 THEN
      RETURN jsonb_build_object('success', false, 'updated', false,
        'error', 'row_not_written',
        'page_key', p_page_key, 'section_key', p_section_key,
        'field_key', p_field_key, 'locale', p_locale);
    END IF;

    IF _check_required THEN
      _after := public.cms_section_renderability(p_page_key, p_section_key);
      IF NOT (_after->>'renderable')::boolean THEN
        RAISE EXCEPTION 'section_no_longer_renderable'
          USING ERRCODE = 'P0001',
                DETAIL  = _after::text;
      END IF;
    END IF;

    RETURN jsonb_build_object('success', true, 'updated', true,
      'page_key', p_page_key, 'section_key', p_section_key,
      'field_key', p_field_key, 'locale', p_locale);
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      IF SQLERRM = 'section_no_longer_renderable' THEN
        RETURN jsonb_build_object(
          'success', false, 'updated', false,
          'error', 'section_no_longer_renderable',
          'page_key', p_page_key, 'section_key', p_section_key,
          'field_key', p_field_key, 'locale', p_locale,
          'section_type', _after->'section_type',
          'missing', _after->'missing',
          'hint', 'Aktiver Block würde durch diese Änderung nicht mehr rendern. Erst ausblenden, dann ändern.'
        );
      END IF;
      RAISE;
  END;
END;
$function$;