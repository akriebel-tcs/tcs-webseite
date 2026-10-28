CREATE OR REPLACE FUNCTION public.rpc_admin_rename_section_key(p_page_key text, p_old_section_key text, p_new_section_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_section_type text;
  v_exists_new boolean;
  v_updated_fields int := 0;
  v_updated_assets int := 0;
  v_updated_whitelist int := 0;
  v_updated_sections int := 0;
BEGIN
  IF p_page_key IS NULL OR p_old_section_key IS NULL OR p_new_section_key IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'missing_arguments');
  END IF;

  IF p_old_section_key = p_new_section_key THEN
    RETURN jsonb_build_object('success', false, 'error', 'same_key');
  END IF;

  IF p_new_section_key !~ '^[a-z][a-z0-9_]{1,60}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_slug_format');
  END IF;

  SELECT section_type INTO v_section_type
  FROM public.cms_sections
  WHERE page_key = p_page_key AND section_key = p_old_section_key
  LIMIT 1;

  IF v_section_type IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'section_not_found');
  END IF;

  IF v_section_type <> 'card_v1' THEN
    RETURN jsonb_build_object('success', false, 'error', 'only_card_v1_renameable');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.cms_sections
    WHERE page_key = p_page_key AND section_key = p_new_section_key
  ) INTO v_exists_new;

  IF v_exists_new THEN
    RETURN jsonb_build_object('success', false, 'error', 'new_key_already_exists');
  END IF;

  -- Wichtige Reihenfolge:
  -- cms_section_fields hat einen Fremdschlüssel auf cms_sections(page_key, section_key)
  -- mit ON UPDATE CASCADE. Wir müssen daher ZUERST cms_sections umbenennen —
  -- die abhängigen Zeilen in cms_section_fields wandern automatisch mit.
  -- cms_assets und cms_admin_editable_fields haben keinen FK und werden
  -- danach manuell nachgezogen.
  UPDATE public.cms_sections
  SET section_key = p_new_section_key, updated_at = now()
  WHERE page_key = p_page_key AND section_key = p_old_section_key;
  GET DIAGNOSTICS v_updated_sections = ROW_COUNT;

  -- Nach dem Cascade Felder zählen (sie tragen jetzt schon den neuen Key).
  SELECT count(*) INTO v_updated_fields
  FROM public.cms_section_fields
  WHERE page_key = p_page_key AND section_key = p_new_section_key;

  UPDATE public.cms_assets
  SET section_key = p_new_section_key, updated_at = now()
  WHERE page_key = p_page_key AND section_key = p_old_section_key;
  GET DIAGNOSTICS v_updated_assets = ROW_COUNT;

  UPDATE public.cms_admin_editable_fields
  SET section_key = p_new_section_key, updated_at = now()
  WHERE page_key = p_page_key AND section_key = p_old_section_key;
  GET DIAGNOSTICS v_updated_whitelist = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'error', null,
    'updated_counts', jsonb_build_object(
      'fields', v_updated_fields,
      'assets', v_updated_assets,
      'whitelist', v_updated_whitelist,
      'sections', v_updated_sections
    )
  );
END;
$function$;