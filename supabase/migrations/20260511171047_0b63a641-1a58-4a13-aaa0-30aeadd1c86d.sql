-- 1. Spalte section_no
ALTER TABLE public.cms_sections
  ADD COLUMN IF NOT EXISTS section_no integer;

-- 2. Renumber-Funktion (vergibt 1..n entlang sort_order pro Seite)
CREATE OR REPLACE FUNCTION public.cms_renumber_sections(p_page_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row record;
  _idx int := 1;
BEGIN
  FOR _row IN
    SELECT id FROM public.cms_sections
     WHERE page_key = p_page_key
     ORDER BY sort_order, section_key
  LOOP
    UPDATE public.cms_sections
       SET section_no = _idx
     WHERE id = _row.id
       AND (section_no IS DISTINCT FROM _idx);
    _idx := _idx + 1;
  END LOOP;
END;
$$;

-- 3. Backfill für alle vorhandenen Seiten
DO $$
DECLARE _pk text;
BEGIN
  FOR _pk IN SELECT DISTINCT page_key FROM public.cms_sections LOOP
    PERFORM public.cms_renumber_sections(_pk);
  END LOOP;
END $$;

-- 4. Lese-RPC für Sections einer Seite (inkl. inaktive, für Admin-Baum)
CREATE OR REPLACE FUNCTION public.rpc_admin_read_page_sections(p_page_key text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'page_key', s.page_key,
        'section_key', s.section_key,
        'section_type', s.section_type,
        'section_no', s.section_no,
        'sort_order', s.sort_order,
        'is_active', s.is_active,
        'updated_at', s.updated_at
      )
      ORDER BY s.sort_order, s.section_key
    ),
    '[]'::jsonb
  )
  FROM public.cms_sections s
  WHERE s.page_key = p_page_key;
$$;

-- 5. Schreib-RPC: Section löschen (Hard-Delete + Cascade)
CREATE OR REPLACE FUNCTION public.rpc_admin_delete_section(
  p_page_key text,
  p_section_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _self public.cms_sections%ROWTYPE;
  _fields_deleted int := 0;
  _whitelist_deleted int := 0;
  _assets_deactivated int := 0;
BEGIN
  SELECT * INTO _self FROM public.cms_sections
   WHERE page_key = p_page_key AND section_key = p_section_key;
  IF _self.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'section_not_found',
      'page_key', p_page_key, 'section_key', p_section_key);
  END IF;

  UPDATE public.cms_assets SET is_active = false, updated_at = now()
   WHERE page_key = p_page_key AND section_key = p_section_key AND is_active = true;
  GET DIAGNOSTICS _assets_deactivated = ROW_COUNT;

  DELETE FROM public.cms_section_fields
   WHERE page_key = p_page_key AND section_key = p_section_key;
  GET DIAGNOSTICS _fields_deleted = ROW_COUNT;

  DELETE FROM public.cms_admin_editable_fields
   WHERE page_key = p_page_key AND section_key = p_section_key;
  GET DIAGNOSTICS _whitelist_deleted = ROW_COUNT;

  DELETE FROM public.cms_sections WHERE id = _self.id;

  PERFORM public.cms_renumber_sections(p_page_key);

  RETURN jsonb_build_object(
    'success', true,
    'page_key', p_page_key,
    'section_key', p_section_key,
    'fields_deleted', _fields_deleted,
    'whitelist_deleted', _whitelist_deleted,
    'assets_deactivated', _assets_deactivated
  );
END;
$$;

-- 6. set_section_active erweitern: nach Toggle umnummerieren
CREATE OR REPLACE FUNCTION public.rpc_admin_set_section_active(
  p_page_key text, p_section_key text, p_is_active boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _rows int := 0;
BEGIN
  IF p_is_active IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'is_active_required');
  END IF;
  UPDATE public.cms_sections
     SET is_active = p_is_active, updated_at = now()
   WHERE page_key = p_page_key
     AND section_key = p_section_key;
  GET DIAGNOSTICS _rows = ROW_COUNT;
  IF _rows = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'section_not_found',
      'page_key', p_page_key, 'section_key', p_section_key);
  END IF;
  PERFORM public.cms_renumber_sections(p_page_key);
  RETURN jsonb_build_object('success', true,
    'page_key', p_page_key, 'section_key', p_section_key, 'is_active', p_is_active);
END;
$$;

-- 7. reorder_section ebenfalls umnummerieren (bestehende Whitelist auf home.start bleibt)
CREATE OR REPLACE FUNCTION public.rpc_admin_reorder_section(
  p_page_key text, p_section_key text, p_direction text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _self  public.cms_sections%ROWTYPE;
  _other public.cms_sections%ROWTYPE;
  _tmp   int;
BEGIN
  IF p_direction NOT IN ('up','down') THEN
    RETURN jsonb_build_object('success', false, 'error', 'direction_invalid');
  END IF;
  IF p_page_key <> 'home.start' THEN
    RETURN jsonb_build_object('success', false, 'error', 'page_not_allowed', 'page_key', p_page_key);
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

  RETURN jsonb_build_object(
    'success', true,
    'page_key', p_page_key,
    'moved', p_section_key,
    'swapped_with', _other.section_key,
    'new_sort_order', _other.sort_order
  );
END;
$$;