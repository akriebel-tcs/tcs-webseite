-- Etappe Redaktions-Handoff: Härtung Asset-Upsert + Public-Navigation
-- Idempotent: CREATE OR REPLACE FUNCTION

-- 1) Asset-Upsert: prüft Existenz von Page und Section,
--    damit Tippfehler im Section-Key keine toten Asset-Einträge erzeugen.
CREATE OR REPLACE FUNCTION public.rpc_admin_upsert_asset(
  p_page_key text,
  p_section_key text,
  p_field_key text,
  p_storage_path text,
  p_public_url text,
  p_file_name text DEFAULT NULL::text,
  p_mime_type text DEFAULT NULL::text,
  p_asset_role text DEFAULT 'image'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _new_id uuid;
  _deactivated int := 0;
BEGIN
  IF p_page_key IS NULL OR p_section_key IS NULL OR p_field_key IS NULL OR p_storage_path IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'required_fields_missing');
  END IF;

  -- Härtung: Page muss existieren
  IF NOT EXISTS (SELECT 1 FROM public.cms_pages WHERE page_key = p_page_key) THEN
    RETURN jsonb_build_object('success', false, 'error', 'page_not_found', 'page_key', p_page_key);
  END IF;

  -- Härtung: Section muss zu dieser Page existieren
  IF NOT EXISTS (
    SELECT 1 FROM public.cms_sections
    WHERE page_key = p_page_key AND section_key = p_section_key
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'section_not_found',
      'page_key', p_page_key,
      'section_key', p_section_key
    );
  END IF;

  -- Vorherige aktive Assets im selben Slot deaktivieren (nicht löschen).
  UPDATE public.cms_assets
     SET is_active = false, updated_at = now()
   WHERE page_key = p_page_key
     AND section_key = p_section_key
     AND field_key = p_field_key
     AND is_active = true;
  GET DIAGNOSTICS _deactivated = ROW_COUNT;

  INSERT INTO public.cms_assets
    (page_key, section_key, field_key, asset_role,
     storage_path, public_url, file_name, mime_type, is_active)
  VALUES
    (p_page_key, p_section_key, p_field_key, coalesce(p_asset_role, 'image'),
     p_storage_path, p_public_url, p_file_name, p_mime_type, true)
  RETURNING id INTO _new_id;

  RETURN jsonb_build_object(
    'success', true,
    'asset_id', _new_id,
    'deactivated_previous', _deactivated
  );
END;
$function$;

-- 2) Public-Navigation: blendet Knoten aus, deren Page nicht published+active ist.
--    Knoten ohne page_key (reine Strukturknoten) bleiben sichtbar wie bisher.
CREATE OR REPLACE FUNCTION public.rpc_public_read_navigation_tree(p_nav_area text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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
        'description_de', n.description_de,
        'description_en', n.description_en,
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
      -- Strukturknoten ohne Seitenverweis bleiben sichtbar
      n.page_key IS NULL
      -- Knoten mit Seitenverweis nur, wenn Seite published + aktiv
      OR (pg.status = 'published' AND pg.is_active = true)
    );
$function$;