-- Stufe 2 + Stufe 4 (DB-Teil): Sprachoffenheit für 'pl' + Freigabestatus

-- Freigabestatus je Feld/Sprache (bestehende Zeilen gelten als geprüft)
ALTER TABLE public.cms_section_fields
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'geprueft';

ALTER TABLE public.cms_section_fields
  DROP CONSTRAINT IF EXISTS cms_section_fields_review_status_check;
ALTER TABLE public.cms_section_fields
  ADD CONSTRAINT cms_section_fields_review_status_check
  CHECK (review_status = ANY (ARRAY['geprueft'::text, 'maschinell'::text]));

-- Whitelist-Schalter: 'pl' erlauben
CREATE OR REPLACE FUNCTION public.rpc_admin_set_editable_field_enabled(p_page_key text, p_section_key text, p_field_key text, p_locale text, p_is_enabled boolean)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _rows int := 0;
BEGIN
  IF p_locale NOT IN ('de','en','pl') THEN
    RETURN jsonb_build_object('success', false, 'updated', false,
      'error', 'locale_not_allowed',
      'page_key', p_page_key, 'section_key', p_section_key,
      'field_key', p_field_key, 'locale', p_locale);
  END IF;

  IF p_is_enabled IS NULL THEN
    RETURN jsonb_build_object('success', false, 'updated', false,
      'error', 'is_enabled_required',
      'page_key', p_page_key, 'section_key', p_section_key,
      'field_key', p_field_key, 'locale', p_locale);
  END IF;

  UPDATE public.cms_admin_editable_fields
     SET is_enabled = p_is_enabled, updated_at = now()
   WHERE page_key = p_page_key AND section_key = p_section_key
     AND field_key = p_field_key AND locale = p_locale;

  GET DIAGNOSTICS _rows = ROW_COUNT;

  IF _rows = 0 THEN
    RETURN jsonb_build_object('success', false, 'updated', false,
      'error', 'row_not_found',
      'page_key', p_page_key, 'section_key', p_section_key,
      'field_key', p_field_key, 'locale', p_locale);
  END IF;

  RETURN jsonb_build_object('success', true, 'updated', true,
    'page_key', p_page_key, 'section_key', p_section_key,
    'field_key', p_field_key, 'locale', p_locale, 'is_enabled', p_is_enabled);
END;
$function$;

-- Bild-Alternativtext: 'pl' erlauben
CREATE OR REPLACE FUNCTION public.rpc_admin_update_asset_alt(p_asset_id uuid, p_locale text, p_value text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _rows int := 0;
  _normalized text;
  _page_key text;
  _section_key text;
  _is_active boolean;
BEGIN
  IF p_locale NOT IN ('de','en','pl') THEN
    RETURN jsonb_build_object('success', false, 'error', 'locale_not_allowed', 'locale', p_locale);
  END IF;

  SELECT page_key, section_key, is_active
    INTO _page_key, _section_key, _is_active
  FROM public.cms_assets WHERE id = p_asset_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'asset_not_found', 'asset_id', p_asset_id);
  END IF;

  IF _is_active = false THEN
    RETURN jsonb_build_object('success', false, 'error', 'asset_not_valid_for_edit', 'reason', 'inactive');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.cms_pages WHERE page_key = _page_key) THEN
    RETURN jsonb_build_object('success', false, 'error', 'asset_not_valid_for_edit', 'reason', 'page_missing');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.cms_sections
    WHERE page_key = _page_key AND section_key = _section_key
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'asset_not_valid_for_edit', 'reason', 'section_missing');
  END IF;

  _normalized := nullif(btrim(coalesce(p_value, '')), '');

  IF p_locale = 'de' THEN
    UPDATE public.cms_assets SET alt_de = _normalized, updated_at = now() WHERE id = p_asset_id;
  ELSIF p_locale = 'en' THEN
    UPDATE public.cms_assets SET alt_en = _normalized, updated_at = now() WHERE id = p_asset_id;
  ELSE
    UPDATE public.cms_assets SET alt_pl = _normalized, updated_at = now() WHERE id = p_asset_id;
  END IF;

  GET DIAGNOSTICS _rows = ROW_COUNT;
  IF _rows = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'asset_not_found', 'asset_id', p_asset_id);
  END IF;

  RETURN jsonb_build_object('success', true, 'asset_id', p_asset_id, 'locale', p_locale);
END;
$function$;

-- Navigations-Bezeichnung: 'pl' erlauben
CREATE OR REPLACE FUNCTION public.rpc_admin_update_navigation_label(p_node_id uuid, p_locale text, p_value text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  _rows int := 0;
  _normalized text;
begin
  if p_locale not in ('de','en','pl') then
    return jsonb_build_object('success', false, 'updated', false,
      'error', 'locale_not_allowed', 'node_id', p_node_id, 'locale', p_locale);
  end if;

  _normalized := nullif(btrim(coalesce(p_value, '')), '');

  if p_locale = 'de' then
    update public.cms_navigation_nodes set label_de = _normalized, updated_at = now() where id = p_node_id;
  elsif p_locale = 'en' then
    update public.cms_navigation_nodes set label_en = _normalized, updated_at = now() where id = p_node_id;
  else
    update public.cms_navigation_nodes set label_pl = _normalized, updated_at = now() where id = p_node_id;
  end if;

  get diagnostics _rows = row_count;

  if _rows = 0 then
    return jsonb_build_object('success', false, 'updated', false,
      'error', 'node_not_found', 'node_id', p_node_id, 'locale', p_locale);
  end if;

  return jsonb_build_object('success', true, 'updated', true,
    'node_id', p_node_id, 'locale', p_locale, 'value', _normalized);
end;
$function$;

-- Navigations-Beschreibung: 'pl' erlauben
CREATE OR REPLACE FUNCTION public.rpc_admin_update_navigation_description(p_node_id uuid, p_locale text, p_value text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  _rows int := 0;
  _normalized text;
begin
  if p_locale not in ('de','en','pl') then
    return jsonb_build_object('success', false, 'updated', false,
      'error', 'locale_not_allowed', 'node_id', p_node_id, 'locale', p_locale);
  end if;

  _normalized := nullif(btrim(coalesce(p_value, '')), '');

  if p_locale = 'de' then
    update public.cms_navigation_nodes set description_de = _normalized, updated_at = now() where id = p_node_id;
  elsif p_locale = 'en' then
    update public.cms_navigation_nodes set description_en = _normalized, updated_at = now() where id = p_node_id;
  else
    update public.cms_navigation_nodes set description_pl = _normalized, updated_at = now() where id = p_node_id;
  end if;

  get diagnostics _rows = row_count;

  if _rows = 0 then
    return jsonb_build_object('success', false, 'updated', false,
      'error', 'node_not_found', 'node_id', p_node_id, 'locale', p_locale);
  end if;

  return jsonb_build_object('success', true, 'updated', true,
    'node_id', p_node_id, 'locale', p_locale, 'value', _normalized);
end;
$function$;

-- Textbaustein speichern: 'pl' erlauben, manuelles Speichern = geprüft
CREATE OR REPLACE FUNCTION public.rpc_admin_update_section_field(p_page_key text, p_section_key text, p_field_key text, p_locale text, p_value text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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
  IF p_locale NOT IN ('de','en','pl') THEN
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
    INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value, review_status)
    VALUES (p_page_key, p_section_key, p_field_key, p_locale, p_value, 'geprueft')
    ON CONFLICT (page_key, section_key, field_key, locale)
    DO UPDATE SET value = EXCLUDED.value, review_status = 'geprueft', updated_at = now();
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
          USING ERRCODE = 'P0001', DETAIL = _after::text;
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

-- Maschinelle Übersetzung speichern (wird als 'maschinell' markiert)
CREATE OR REPLACE FUNCTION public.rpc_admin_save_machine_translation(p_page_key text, p_section_key text, p_field_key text, p_locale text, p_value text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _res jsonb;
BEGIN
  _res := public.rpc_admin_update_section_field(p_page_key, p_section_key, p_field_key, p_locale, p_value);
  IF coalesce((_res->>'success')::boolean, false) THEN
    UPDATE public.cms_section_fields
       SET review_status = 'maschinell', updated_at = now()
     WHERE page_key = p_page_key AND section_key = p_section_key
       AND field_key = p_field_key AND locale = p_locale;
    _res := _res || jsonb_build_object('review_status', 'maschinell');
  END IF;
  RETURN _res;
END;
$function$;

-- Freigabestatus setzen
CREATE OR REPLACE FUNCTION public.rpc_admin_set_field_review_status(p_page_key text, p_section_key text, p_field_key text, p_locale text, p_review_status text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _rows int := 0;
BEGIN
  IF p_locale NOT IN ('de','en','pl') THEN
    RETURN jsonb_build_object('success', false, 'error', 'locale_not_allowed', 'locale', p_locale);
  END IF;
  IF p_review_status NOT IN ('geprueft','maschinell') THEN
    RETURN jsonb_build_object('success', false, 'error', 'review_status_not_allowed', 'review_status', p_review_status);
  END IF;

  UPDATE public.cms_section_fields
     SET review_status = p_review_status, updated_at = now()
   WHERE page_key = p_page_key AND section_key = p_section_key
     AND field_key = p_field_key AND locale = p_locale;

  GET DIAGNOSTICS _rows = ROW_COUNT;
  IF _rows = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'row_not_found',
      'page_key', p_page_key, 'section_key', p_section_key,
      'field_key', p_field_key, 'locale', p_locale);
  END IF;

  RETURN jsonb_build_object('success', true, 'page_key', p_page_key,
    'section_key', p_section_key, 'field_key', p_field_key,
    'locale', p_locale, 'review_status', p_review_status);
END;
$function$;

-- Navigations-Lese-RPCs: polnische Bezeichnungen mitliefern
CREATE OR REPLACE FUNCTION public.rpc_public_read_navigation_tree(p_nav_area text)
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', n.id,
        'node_key', n.node_key,
        'parent_node_key', p.node_key,
        'page_key', n.page_key,
        'label_de', n.label_de,
        'label_en', n.label_en,
        'label_pl', n.label_pl,
        'description_de', n.description_de,
        'description_en', n.description_en,
        'description_pl', n.description_pl,
        'route_path', n.route_path,
        'external_url', n.external_url,
        'node_type', n.node_type,
        'sort_order', n.sort_order,
        'is_active', n.is_active,
        'show_in_public_nav', n.show_in_public_nav
      )
      ORDER BY n.sort_order, n.node_key
    ),
    '[]'::jsonb
  )
  FROM public.cms_navigation_nodes n
  LEFT JOIN public.cms_navigation_nodes p ON p.id = n.parent_id
  LEFT JOIN public.cms_pages pg ON pg.page_key = n.page_key
  WHERE n.nav_area = p_nav_area
    AND n.is_active = true
    AND n.show_in_public_nav = true
    AND (
      n.page_key IS NULL
      OR (pg.status = 'published' AND pg.is_active = true)
    );
$function$;

CREATE OR REPLACE FUNCTION public.rpc_public_read_navigation_overlay(p_nav_area text)
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', n.id,
        'node_key', n.node_key,
        'parent_node_key', p.node_key,
        'is_active', n.is_active,
        'sort_order', n.sort_order,
        'label_de', n.label_de,
        'label_en', n.label_en,
        'label_pl', n.label_pl,
        'show_in_public_nav', n.show_in_public_nav
      )
      ORDER BY n.sort_order, n.node_key
    ),
    '[]'::jsonb
  )
  FROM public.cms_navigation_nodes n
  LEFT JOIN public.cms_navigation_nodes p ON p.id = n.parent_id
  LEFT JOIN public.cms_pages pg ON pg.page_key = n.page_key
  WHERE n.nav_area = p_nav_area
    AND n.is_active = true
    AND n.show_in_public_nav = true
    AND (
      n.page_key IS NULL
      OR (pg.status = 'published' AND pg.is_active = true)
    );
$function$;

CREATE OR REPLACE FUNCTION public.rpc_admin_read_navigation_nodes()
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', n.id,
        'node_no', n.node_no,
        'nav_area', n.nav_area,
        'node_key', n.node_key,
        'parent_id', n.parent_id,
        'parent_node_key', p.node_key,
        'page_key', n.page_key,
        'label', n.label,
        'label_de', n.label_de,
        'label_en', n.label_en,
        'label_pl', n.label_pl,
        'description_de', n.description_de,
        'description_en', n.description_en,
        'description_pl', n.description_pl,
        'node_type', n.node_type,
        'external_url', n.external_url,
        'route_path', n.route_path,
        'sort_order', n.sort_order,
        'is_active', n.is_active,
        'show_in_public_nav', n.show_in_public_nav
      )
      ORDER BY n.nav_area, n.sort_order, n.node_key
    ),
    '[]'::jsonb
  )
  FROM public.cms_navigation_nodes n
  LEFT JOIN public.cms_navigation_nodes p ON p.id = n.parent_id;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_public_resolve_breadcrumb(p_route_path text)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_start uuid;
  v_result jsonb;
BEGIN
  IF p_route_path IS NULL OR length(trim(p_route_path)) = 0 THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT n.id INTO v_start
  FROM public.cms_navigation_nodes n
  LEFT JOIN public.cms_pages pg ON pg.page_key = n.page_key
  WHERE n.route_path = p_route_path
    AND (
      n.page_key IS NULL
      OR (pg.status = 'published' AND pg.is_active = true)
    )
  ORDER BY n.nav_area = 'main' DESC, n.is_active DESC, n.sort_order
  LIMIT 1;

  IF v_start IS NULL THEN
    SELECT n.id INTO v_start
    FROM public.cms_navigation_nodes n
    JOIN public.cms_pages pg ON pg.page_key = n.page_key
    WHERE pg.route_path = p_route_path
      AND pg.status = 'published'
      AND pg.is_active = true
    ORDER BY n.nav_area = 'main' DESC, n.is_active DESC, n.sort_order
    LIMIT 1;
  END IF;

  IF v_start IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  WITH RECURSIVE chain AS (
    SELECT n.id, n.parent_id, n.node_key, n.label_de, n.label_en, n.label_pl,
           n.route_path, n.page_key, 0 AS depth
    FROM public.cms_navigation_nodes n
    WHERE n.id = v_start
    UNION ALL
    SELECT p.id, p.parent_id, p.node_key, p.label_de, p.label_en, p.label_pl,
           p.route_path, p.page_key, c.depth + 1
    FROM public.cms_navigation_nodes p
    JOIN chain c ON c.parent_id = p.id
    WHERE c.depth < 12
  )
  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'node_key', c.node_key,
      'page_key', c.page_key,
      'label_de', c.label_de,
      'label_en', c.label_en,
      'label_pl', c.label_pl,
      'route_path', COALESCE(c.route_path, pg.route_path)
    )
    ORDER BY c.depth DESC
  ), '[]'::jsonb)
  INTO v_result
  FROM chain c
  LEFT JOIN public.cms_pages pg ON pg.page_key = c.page_key;

  RETURN v_result;
END;
$function$;