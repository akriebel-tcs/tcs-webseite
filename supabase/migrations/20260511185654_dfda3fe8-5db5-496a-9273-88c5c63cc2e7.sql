CREATE OR REPLACE FUNCTION public.rpc_admin_duplicate_section(
  p_page_key text,
  p_source_section_key text,
  p_new_section_key text
) RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _src public.cms_sections%ROWTYPE;
  _max int;
  _normalized text;
  _fields_copied int := 0;
  _whitelist_copied int := 0;
  _assets_copied int := 0;
BEGIN
  IF p_page_key <> 'home.start' THEN
    RETURN jsonb_build_object('success', false, 'error', 'page_not_allowed');
  END IF;

  IF p_source_section_key !~ '^(persona|block)_' THEN
    RETURN jsonb_build_object('success', false, 'error', 'source_not_duplicable');
  END IF;

  _normalized := nullif(btrim(coalesce(p_new_section_key, '')), '');
  IF _normalized IS NULL OR _normalized !~ '^[a-z][a-z0-9_]*$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'new_section_key_invalid');
  END IF;
  IF _normalized !~ '^(persona|block)_' THEN
    RETURN jsonb_build_object('success', false, 'error', 'new_section_key_prefix_required');
  END IF;

  SELECT * INTO _src FROM public.cms_sections
   WHERE page_key = p_page_key AND section_key = p_source_section_key;
  IF _src.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'source_not_found');
  END IF;

  IF EXISTS (SELECT 1 FROM public.cms_sections
              WHERE page_key = p_page_key AND section_key = _normalized) THEN
    RETURN jsonb_build_object('success', false, 'error', 'target_section_key_exists');
  END IF;

  SELECT COALESCE(MAX(sort_order), 0) + 1 INTO _max
    FROM public.cms_sections
   WHERE page_key = p_page_key AND is_active = true;

  INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active)
  VALUES (p_page_key, _normalized, _src.section_type, _max, true);

  -- Felder 1:1 kopieren
  INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value, value_json)
  SELECT p_page_key, _normalized, field_key, locale, value, value_json
    FROM public.cms_section_fields
   WHERE page_key = p_page_key AND section_key = p_source_section_key;
  GET DIAGNOSTICS _fields_copied = ROW_COUNT;

  -- Whitelist (welche Felder im Admin editierbar sind) übernehmen
  INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
  SELECT p_page_key, _normalized, field_key, locale, is_enabled
    FROM public.cms_admin_editable_fields
   WHERE page_key = p_page_key AND section_key = p_source_section_key
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS _whitelist_copied = ROW_COUNT;

  -- Assets (Bilder) für die Kopie anlegen. Sie referenzieren auf dieselbe
  -- Datei (storage_path/public_url werden geteilt). Damit erscheint die
  -- Kopie sofort mit dem Bild der Vorlage. Redaktion kann das Bild später
  -- separat austauschen — die Original-Datei bleibt unverändert.
  INSERT INTO public.cms_assets (
    page_key, section_key, asset_role, locale,
    storage_path, public_url, alt_text_de, alt_text_en,
    focal_x, focal_y, sort_order, is_active,
    field_key, file_name, mime_type, alt_de, alt_en
  )
  SELECT
    p_page_key, _normalized, asset_role, locale,
    storage_path, public_url, alt_text_de, alt_text_en,
    focal_x, focal_y, sort_order, is_active,
    field_key, file_name, mime_type, alt_de, alt_en
    FROM public.cms_assets
   WHERE page_key = p_page_key AND section_key = p_source_section_key
     AND is_active = true;
  GET DIAGNOSTICS _assets_copied = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'page_key', p_page_key,
    'source_section_key', p_source_section_key,
    'new_section_key', _normalized,
    'sort_order', _max,
    'fields_copied', _fields_copied,
    'whitelist_copied', _whitelist_copied,
    'assets_copied', _assets_copied
  );
END;
$$;