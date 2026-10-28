-- Etappe `cms-light-admin-clipboard-2`: Cross-Page-Klemmbrett für Inhaltsblöcke.
-- 1) Hebt die `home.start`-Beschränkung in den Section-RPCs auf, damit Verschieben,
--    Umsortieren und Duplizieren auf ALLEN CMS-Seiten erlaubt ist.
-- 2) Lockert das Präfix-Korsett in `rpc_admin_duplicate_section`: erlaubt jeden
--    section_key, der dem normalen Namensschema (klein, alphanumerisch + _) folgt.
-- 3) Neue RPC `rpc_admin_paste_section` für seitenübergreifendes Einfügen.
--    Versucht den Original-Namen — bei Konflikt liefert sie `target_section_key_exists`
--    zurück, sodass das Frontend nach einem neuen Namen fragen kann.

-- 1a) duplicateSection: keine Seiten-Whitelist, kein Präfix-Zwang mehr.
CREATE OR REPLACE FUNCTION public.rpc_admin_duplicate_section(
  p_page_key text,
  p_source_section_key text,
  p_new_section_key text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  _src public.cms_sections%ROWTYPE;
  _max int;
  _normalized text;
  _fields_copied int := 0;
  _whitelist_copied int := 0;
BEGIN
  _normalized := nullif(btrim(coalesce(p_new_section_key, '')), '');
  IF _normalized IS NULL OR _normalized !~ '^[a-z][a-z0-9_]*$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'new_section_key_invalid');
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

  INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value, value_json)
  SELECT p_page_key, _normalized, field_key, locale, value, value_json
    FROM public.cms_section_fields
   WHERE page_key = p_page_key AND section_key = p_source_section_key;
  GET DIAGNOSTICS _fields_copied = ROW_COUNT;

  INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
  SELECT p_page_key, _normalized, field_key, locale, is_enabled
    FROM public.cms_admin_editable_fields
   WHERE page_key = p_page_key AND section_key = p_source_section_key
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS _whitelist_copied = ROW_COUNT;

  INSERT INTO public.cms_assets (
    page_key, section_key, asset_role, locale,
    storage_path, public_url, alt_text_de, alt_text_en,
    focal_x, focal_y, sort_order, is_active,
    field_key, file_name, mime_type, alt_de, alt_en
  )
  SELECT p_page_key, _normalized, asset_role, locale,
         storage_path, public_url, alt_text_de, alt_text_en,
         focal_x, focal_y, sort_order, is_active,
         field_key, file_name, mime_type, alt_de, alt_en
    FROM public.cms_assets
   WHERE page_key = p_page_key AND section_key = p_source_section_key AND is_active = true;

  PERFORM public.cms_renumber_sections(p_page_key);

  RETURN jsonb_build_object(
    'success', true,
    'page_key', p_page_key,
    'source_section_key', p_source_section_key,
    'new_section_key', _normalized,
    'fields_copied', _fields_copied,
    'whitelist_copied', _whitelist_copied
  );
END;
$function$;

-- 1b) set_section_parent: keine Seiten-Whitelist mehr.
CREATE OR REPLACE FUNCTION public.rpc_admin_set_section_parent(
  p_page_key text,
  p_section_key text,
  p_new_parent_section_key text,
  p_position integer
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  _self   public.cms_sections%ROWTYPE;
  _parent public.cms_sections%ROWTYPE;
  _parent_id uuid := NULL;
  _cycle boolean;
  _row record;
  _idx int := 0;
  _final int;
  _normalized text;
BEGIN
  SELECT * INTO _self FROM public.cms_sections
   WHERE page_key = p_page_key AND section_key = p_section_key;
  IF _self.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'section_not_found');
  END IF;

  _normalized := nullif(btrim(coalesce(p_new_parent_section_key, '')), '');

  IF _normalized IS NOT NULL THEN
    SELECT * INTO _parent FROM public.cms_sections
     WHERE page_key = p_page_key AND section_key = _normalized;
    IF _parent.id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'parent_not_found');
    END IF;
    IF _parent.id = _self.id THEN
      RETURN jsonb_build_object('success', false, 'error', 'parent_is_self');
    END IF;
    WITH RECURSIVE descendants AS (
      SELECT id FROM public.cms_sections WHERE id = _self.id
      UNION ALL
      SELECT c.id FROM public.cms_sections c
      JOIN descendants d ON c.parent_section_id = d.id
       WHERE c.page_key = p_page_key
    )
    SELECT EXISTS(SELECT 1 FROM descendants WHERE id = _parent.id) INTO _cycle;
    IF _cycle THEN
      RETURN jsonb_build_object('success', false, 'error', 'cycle_detected');
    END IF;
    _parent_id := _parent.id;
  END IF;

  UPDATE public.cms_sections
     SET parent_section_id = _parent_id, updated_at = now()
   WHERE id = _self.id;

  IF p_position IS NOT NULL THEN
    _final := GREATEST(0, p_position);
    UPDATE public.cms_sections
       SET sort_order = 1000000 + sort_order
     WHERE id = _self.id;
    FOR _row IN
      SELECT id FROM public.cms_sections
       WHERE page_key = p_page_key
         AND parent_section_id IS NOT DISTINCT FROM _parent_id
         AND id <> _self.id
       ORDER BY sort_order, section_key
    LOOP
      IF _idx = _final THEN _idx := _idx + 1; END IF;
      UPDATE public.cms_sections SET sort_order = _idx, updated_at = now() WHERE id = _row.id;
      _idx := _idx + 1;
    END LOOP;
    IF _final > _idx THEN _final := _idx; END IF;
    UPDATE public.cms_sections SET sort_order = _final, updated_at = now() WHERE id = _self.id;
  END IF;

  PERFORM public.cms_resequence_sections_dfs(p_page_key);

  RETURN jsonb_build_object('success', true,
    'page_key', p_page_key, 'section_key', p_section_key,
    'parent_section_key', _normalized, 'position', p_position);
END;
$function$;

-- 1c) set_section_position: keine Seiten-Whitelist mehr.
CREATE OR REPLACE FUNCTION public.rpc_admin_set_section_position(
  p_page_key text, p_section_key text, p_position integer
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  _self  public.cms_sections%ROWTYPE;
  _row   record;
  _idx   int := 0;
  _final int;
BEGIN
  IF p_position IS NULL OR p_position < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'position_invalid');
  END IF;
  SELECT * INTO _self FROM public.cms_sections
   WHERE page_key = p_page_key AND section_key = p_section_key AND is_active = true;
  IF _self.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'section_not_found');
  END IF;
  _final := GREATEST(0, p_position);
  UPDATE public.cms_sections SET sort_order = 1000000 + sort_order WHERE id = _self.id;
  FOR _row IN
    SELECT id, section_key FROM public.cms_sections
     WHERE page_key = p_page_key AND is_active = true
       AND parent_section_id IS NOT DISTINCT FROM _self.parent_section_id
       AND id <> _self.id
     ORDER BY sort_order, section_key
  LOOP
    IF _idx = _final THEN _idx := _idx + 1; END IF;
    UPDATE public.cms_sections SET sort_order = _idx, updated_at = now() WHERE id = _row.id;
    _idx := _idx + 1;
  END LOOP;
  IF _final > _idx THEN _final := _idx; END IF;
  UPDATE public.cms_sections SET sort_order = _final, updated_at = now() WHERE id = _self.id;
  PERFORM public.cms_resequence_sections_dfs(p_page_key);
  RETURN jsonb_build_object('success', true,
    'page_key', p_page_key, 'section_key', p_section_key, 'new_position', _final);
END;
$function$;

-- 1d) reorder_section: keine Seiten-Whitelist mehr.
CREATE OR REPLACE FUNCTION public.rpc_admin_reorder_section(
  p_page_key text, p_section_key text, p_direction text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  _self  public.cms_sections%ROWTYPE;
  _other public.cms_sections%ROWTYPE;
  _tmp   int;
BEGIN
  IF p_direction NOT IN ('up','down') THEN
    RETURN jsonb_build_object('success', false, 'error', 'direction_invalid');
  END IF;
  SELECT * INTO _self FROM public.cms_sections
   WHERE page_key = p_page_key AND section_key = p_section_key AND is_active = true;
  IF _self.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'section_not_found');
  END IF;
  IF p_direction = 'up' THEN
    SELECT * INTO _other FROM public.cms_sections
     WHERE page_key = p_page_key AND is_active = true AND sort_order < _self.sort_order
     ORDER BY sort_order DESC LIMIT 1;
  ELSE
    SELECT * INTO _other FROM public.cms_sections
     WHERE page_key = p_page_key AND is_active = true AND sort_order > _self.sort_order
     ORDER BY sort_order ASC LIMIT 1;
  END IF;
  IF _other.id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'noop', true, 'reason', 'edge');
  END IF;
  _tmp := _self.sort_order;
  UPDATE public.cms_sections SET sort_order = _other.sort_order, updated_at = now() WHERE id = _self.id;
  UPDATE public.cms_sections SET sort_order = _tmp,            updated_at = now() WHERE id = _other.id;
  PERFORM public.cms_renumber_sections(p_page_key);
  RETURN jsonb_build_object('success', true,
    'page_key', p_page_key, 'moved', p_section_key,
    'swapped_with', _other.section_key, 'new_sort_order', _other.sort_order);
END;
$function$;

-- 2) Neue RPC: cross-page Paste.
--    p_new_section_key NULL → versucht Original. Bei Konflikt → error 'target_section_key_exists'.
--    Sonst legt neue Section auf p_target_page_key an, kopiert Felder/Whitelist/Assets,
--    und setzt parent + position.
CREATE OR REPLACE FUNCTION public.rpc_admin_paste_section(
  p_source_page_key text,
  p_source_section_key text,
  p_target_page_key text,
  p_target_parent_section_key text,
  p_target_position integer,
  p_new_section_key text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  _src public.cms_sections%ROWTYPE;
  _parent public.cms_sections%ROWTYPE;
  _parent_id uuid := NULL;
  _new_key text;
  _max int;
  _final int;
  _idx int := 0;
  _row record;
  _normalized_parent text;
  _fields_copied int := 0;
  _whitelist_copied int := 0;
BEGIN
  -- Quelle
  SELECT * INTO _src FROM public.cms_sections
   WHERE page_key = p_source_page_key AND section_key = p_source_section_key;
  IF _src.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'source_not_found');
  END IF;

  -- Ziel-Seite muss existieren
  IF NOT EXISTS (SELECT 1 FROM public.cms_pages WHERE page_key = p_target_page_key) THEN
    RETURN jsonb_build_object('success', false, 'error', 'target_page_not_found');
  END IF;

  -- Ziel-Name: explizit oder Original
  _new_key := nullif(btrim(coalesce(p_new_section_key, '')), '');
  IF _new_key IS NULL THEN
    _new_key := p_source_section_key;
  END IF;
  IF _new_key !~ '^[a-z][a-z0-9_]*$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'new_section_key_invalid', 'new_section_key', _new_key);
  END IF;

  IF EXISTS (SELECT 1 FROM public.cms_sections
              WHERE page_key = p_target_page_key AND section_key = _new_key) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'target_section_key_exists',
      'attempted_section_key', _new_key
    );
  END IF;

  -- Eltern-Block (optional)
  _normalized_parent := nullif(btrim(coalesce(p_target_parent_section_key, '')), '');
  IF _normalized_parent IS NOT NULL THEN
    SELECT * INTO _parent FROM public.cms_sections
     WHERE page_key = p_target_page_key AND section_key = _normalized_parent;
    IF _parent.id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'parent_not_found');
    END IF;
    _parent_id := _parent.id;
  END IF;

  SELECT COALESCE(MAX(sort_order), 0) + 1 INTO _max
    FROM public.cms_sections WHERE page_key = p_target_page_key;

  INSERT INTO public.cms_sections
    (page_key, section_key, section_type, sort_order, is_active, parent_section_id)
  VALUES
    (p_target_page_key, _new_key, _src.section_type, _max, true, _parent_id);

  INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value, value_json)
  SELECT p_target_page_key, _new_key, field_key, locale, value, value_json
    FROM public.cms_section_fields
   WHERE page_key = p_source_page_key AND section_key = p_source_section_key;
  GET DIAGNOSTICS _fields_copied = ROW_COUNT;

  INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
  SELECT p_target_page_key, _new_key, field_key, locale, is_enabled
    FROM public.cms_admin_editable_fields
   WHERE page_key = p_source_page_key AND section_key = p_source_section_key
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS _whitelist_copied = ROW_COUNT;

  INSERT INTO public.cms_assets (
    page_key, section_key, asset_role, locale,
    storage_path, public_url, alt_text_de, alt_text_en,
    focal_x, focal_y, sort_order, is_active,
    field_key, file_name, mime_type, alt_de, alt_en
  )
  SELECT p_target_page_key, _new_key, asset_role, locale,
         storage_path, public_url, alt_text_de, alt_text_en,
         focal_x, focal_y, sort_order, is_active,
         field_key, file_name, mime_type, alt_de, alt_en
    FROM public.cms_assets
   WHERE page_key = p_source_page_key
     AND section_key = p_source_section_key
     AND is_active = true;

  -- Position unter neuen Geschwistern
  IF p_target_position IS NOT NULL THEN
    _final := GREATEST(0, p_target_position);
    UPDATE public.cms_sections SET sort_order = 1000000 + sort_order
     WHERE page_key = p_target_page_key AND section_key = _new_key;
    FOR _row IN
      SELECT id FROM public.cms_sections
       WHERE page_key = p_target_page_key
         AND parent_section_id IS NOT DISTINCT FROM _parent_id
         AND section_key <> _new_key
       ORDER BY sort_order, section_key
    LOOP
      IF _idx = _final THEN _idx := _idx + 1; END IF;
      UPDATE public.cms_sections SET sort_order = _idx, updated_at = now() WHERE id = _row.id;
      _idx := _idx + 1;
    END LOOP;
    IF _final > _idx THEN _final := _idx; END IF;
    UPDATE public.cms_sections SET sort_order = _final, updated_at = now()
     WHERE page_key = p_target_page_key AND section_key = _new_key;
  END IF;

  PERFORM public.cms_resequence_sections_dfs(p_target_page_key);

  RETURN jsonb_build_object(
    'success', true,
    'source_page_key', p_source_page_key,
    'source_section_key', p_source_section_key,
    'target_page_key', p_target_page_key,
    'new_section_key', _new_key,
    'parent_section_key', _normalized_parent,
    'position', p_target_position,
    'fields_copied', _fields_copied,
    'whitelist_copied', _whitelist_copied
  );
END;
$function$;