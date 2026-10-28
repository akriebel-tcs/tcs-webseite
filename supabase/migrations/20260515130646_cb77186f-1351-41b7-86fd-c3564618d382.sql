-- Polish-Etappe: Asset-RPCs konsistent härten / dokumentieren

CREATE OR REPLACE FUNCTION public.rpc_admin_update_asset_alt(
  p_asset_id uuid,
  p_locale   text,
  p_value    text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rows int := 0;
  _normalized text;
  _page_key text;
  _section_key text;
  _is_active boolean;
BEGIN
  IF p_locale NOT IN ('de','en') THEN
    RETURN jsonb_build_object('success', false, 'error', 'locale_not_allowed', 'locale', p_locale);
  END IF;

  SELECT page_key, section_key, is_active
    INTO _page_key, _section_key, _is_active
  FROM public.cms_assets
  WHERE id = p_asset_id;

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
  ELSE
    UPDATE public.cms_assets SET alt_en = _normalized, updated_at = now() WHERE id = p_asset_id;
  END IF;

  GET DIAGNOSTICS _rows = ROW_COUNT;
  IF _rows = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'asset_not_found', 'asset_id', p_asset_id);
  END IF;

  RETURN jsonb_build_object('success', true, 'asset_id', p_asset_id, 'locale', p_locale);
END;
$$;

COMMENT ON FUNCTION public.rpc_admin_delete_asset(uuid) IS
  'Bewusst großzügig: deaktiviert (weich loescht) Assets unabhaengig davon, ob Page/Section noch existieren. So koennen Orphans bereinigt werden. Aktualisierung Polish-Etappe 2026-05-15.';

COMMENT ON FUNCTION public.rpc_admin_update_asset_alt(uuid, text, text) IS
  'Polish-Etappe 2026-05-15: prueft Asset-Aktivitaet sowie Existenz von Page und Section, bevor Alt-Text aktualisiert wird.';
