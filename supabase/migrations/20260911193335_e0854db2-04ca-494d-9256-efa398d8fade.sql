-- Nav-Label/-Beschreibung und Asset-Alttext schreiben zusaetzlich in die
-- vertikalen Uebersetzungstabellen; Altspalten bleiben als Uebergang erhalten.
-- Locale wird gegen cms_locales geprueft (nicht mehr fest de|en|pl).

CREATE OR REPLACE FUNCTION public.rpc_admin_update_navigation_label(p_node_id uuid, p_locale text, p_value text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _rows int := 0;
  _normalized text;
  _loc text;
begin
  _loc := lower(nullif(btrim(coalesce(p_locale, '')), ''));
  if _loc is null or not exists (select 1 from public.cms_locales where code = _loc) then
    return jsonb_build_object('success', false, 'updated', false,
      'error', 'locale_not_allowed', 'node_id', p_node_id, 'locale', p_locale);
  end if;

  _normalized := nullif(btrim(coalesce(p_value, '')), '');

  if not exists (select 1 from public.cms_navigation_nodes where id = p_node_id) then
    return jsonb_build_object('success', false, 'updated', false,
      'error', 'node_not_found', 'node_id', p_node_id, 'locale', _loc);
  end if;

  if _loc = 'de' then
    update public.cms_navigation_nodes set label_de = _normalized, updated_at = now() where id = p_node_id;
  elsif _loc = 'en' then
    update public.cms_navigation_nodes set label_en = _normalized, updated_at = now() where id = p_node_id;
  elsif _loc = 'pl' then
    update public.cms_navigation_nodes set label_pl = _normalized, updated_at = now() where id = p_node_id;
  end if;
  get diagnostics _rows = row_count;

  insert into public.cms_navigation_node_translations (node_id, locale, label)
  values (p_node_id, _loc, _normalized)
  on conflict (node_id, locale) do update
    set label = excluded.label, updated_at = now();

  return jsonb_build_object('success', true, 'updated', true,
    'node_id', p_node_id, 'locale', _loc, 'value', _normalized,
    'legacy_columns_written', _rows);
end;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_admin_update_navigation_description(p_node_id uuid, p_locale text, p_value text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _rows int := 0;
  _normalized text;
  _loc text;
begin
  _loc := lower(nullif(btrim(coalesce(p_locale, '')), ''));
  if _loc is null or not exists (select 1 from public.cms_locales where code = _loc) then
    return jsonb_build_object('success', false, 'updated', false,
      'error', 'locale_not_allowed', 'node_id', p_node_id, 'locale', p_locale);
  end if;

  _normalized := nullif(btrim(coalesce(p_value, '')), '');

  if not exists (select 1 from public.cms_navigation_nodes where id = p_node_id) then
    return jsonb_build_object('success', false, 'updated', false,
      'error', 'node_not_found', 'node_id', p_node_id, 'locale', _loc);
  end if;

  if _loc = 'de' then
    update public.cms_navigation_nodes set description_de = _normalized, updated_at = now() where id = p_node_id;
  elsif _loc = 'en' then
    update public.cms_navigation_nodes set description_en = _normalized, updated_at = now() where id = p_node_id;
  elsif _loc = 'pl' then
    update public.cms_navigation_nodes set description_pl = _normalized, updated_at = now() where id = p_node_id;
  end if;
  get diagnostics _rows = row_count;

  insert into public.cms_navigation_node_translations (node_id, locale, description)
  values (p_node_id, _loc, _normalized)
  on conflict (node_id, locale) do update
    set description = excluded.description, updated_at = now();

  return jsonb_build_object('success', true, 'updated', true,
    'node_id', p_node_id, 'locale', _loc, 'value', _normalized,
    'legacy_columns_written', _rows);
end;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_admin_update_asset_alt(p_asset_id uuid, p_locale text, p_value text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _normalized text;
  _page_key text;
  _section_key text;
  _is_active boolean;
  _loc text;
BEGIN
  _loc := lower(nullif(btrim(coalesce(p_locale, '')), ''));
  IF _loc IS NULL OR NOT EXISTS (SELECT 1 FROM public.cms_locales WHERE code = _loc) THEN
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

  IF _loc = 'de' THEN
    UPDATE public.cms_assets SET alt_de = _normalized, updated_at = now() WHERE id = p_asset_id;
  ELSIF _loc = 'en' THEN
    UPDATE public.cms_assets SET alt_en = _normalized, updated_at = now() WHERE id = p_asset_id;
  ELSIF _loc = 'pl' THEN
    UPDATE public.cms_assets SET alt_pl = _normalized, updated_at = now() WHERE id = p_asset_id;
  END IF;

  INSERT INTO public.cms_asset_translations (asset_id, locale, alt_text)
  VALUES (p_asset_id, _loc, _normalized)
  ON CONFLICT (asset_id, locale) DO UPDATE
    SET alt_text = excluded.alt_text, updated_at = now();

  RETURN jsonb_build_object('success', true, 'asset_id', p_asset_id, 'locale', _loc);
END;
$function$;