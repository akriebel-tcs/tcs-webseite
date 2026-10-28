CREATE OR REPLACE FUNCTION public.rpc_admin_rename_page_key(
  p_old_page_key text,
  p_new_page_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old text := btrim(coalesce(p_old_page_key, ''));
  v_new text := btrim(coalesce(p_new_page_key, ''));
  v_page public.cms_pages;
  c_sections int := 0;
  c_assets int := 0;
  c_whitelist int := 0;
  c_nav int := 0;
  c_fields int := 0;
BEGIN
  IF v_old = '' OR v_new = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'missing_page_key');
  END IF;

  IF v_old = v_new THEN
    RETURN jsonb_build_object('success', true, 'noop', true, 'error', null);
  END IF;

  IF v_new !~ '^[a-z0-9]+([._-][a-z0-9]+)*$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_page_key_format');
  END IF;

  SELECT * INTO v_page FROM public.cms_pages WHERE page_key = v_old;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'page_not_found');
  END IF;

  IF EXISTS (SELECT 1 FROM public.cms_pages WHERE page_key = v_new) THEN
    RETURN jsonb_build_object('success', false, 'error', 'page_key_already_exists');
  END IF;

  -- 1) Neue Seitenzeile als Kopie anlegen (FK-Ziel für die Blöcke).
  --    Wichtig: Seitennummer (page_no) wird NICHT kopiert, solange die alte
  --    Zeile noch existiert (UNIQUE). Sie wird in Schritt 4 übernommen.
  INSERT INTO public.cms_pages (page_key, route_path, page_type, title_de, title_en, status, is_active)
  VALUES (v_new, v_page.route_path, v_page.page_type, v_page.title_de, v_page.title_en, v_page.status, v_page.is_active);

  -- 2) Blöcke umhängen (Texte folgen per ON UPDATE CASCADE).
  UPDATE public.cms_sections SET page_key = v_new, updated_at = now() WHERE page_key = v_old;
  GET DIAGNOSTICS c_sections = ROW_COUNT;

  SELECT count(*) INTO c_fields FROM public.cms_section_fields WHERE page_key = v_new;

  UPDATE public.cms_assets SET page_key = v_new, updated_at = now() WHERE page_key = v_old;
  GET DIAGNOSTICS c_assets = ROW_COUNT;

  UPDATE public.cms_admin_editable_fields SET page_key = v_new, updated_at = now() WHERE page_key = v_old;
  GET DIAGNOSTICS c_whitelist = ROW_COUNT;

  UPDATE public.cms_navigation_nodes SET page_key = v_new, updated_at = now() WHERE page_key = v_old;
  GET DIAGNOSTICS c_nav = ROW_COUNT;

  -- 3) Alte Seitenzeile entfernen (enthält keine Blöcke mehr).
  DELETE FROM public.cms_pages WHERE page_key = v_old;

  -- 4) Vertraute Seitennummer der alten Zeile übernehmen.
  UPDATE public.cms_pages SET page_no = v_page.page_no, updated_at = now() WHERE page_key = v_new;

  RETURN jsonb_build_object(
    'success', true,
    'error', null,
    'old_page_key', v_old,
    'new_page_key', v_new,
    'page_no', v_page.page_no,
    'updated_counts', jsonb_build_object(
      'sections', c_sections,
      'fields', c_fields,
      'assets', c_assets,
      'whitelist', c_whitelist,
      'navigation_nodes', c_nav
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_admin_rename_page_key(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_admin_rename_page_key(text, text) TO anon, authenticated, service_role;