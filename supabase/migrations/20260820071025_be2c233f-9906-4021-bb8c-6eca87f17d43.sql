CREATE OR REPLACE FUNCTION public.rpc_admin_set_section_position(
  p_page_key text,
  p_section_key text,
  p_position integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _self  public.cms_sections%ROWTYPE;
  _row   record;
  _idx   int := 0;
  _final int;
BEGIN
  IF p_position IS NULL OR p_position < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'position_invalid');
  END IF;

  SELECT * INTO _self
    FROM public.cms_sections
   WHERE page_key = p_page_key
     AND section_key = p_section_key;

  IF _self.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'section_not_found');
  END IF;

  _final := GREATEST(0, p_position);

  UPDATE public.cms_sections
     SET sort_order = 1000000 + sort_order
   WHERE id = _self.id;

  FOR _row IN
    SELECT id, section_key
      FROM public.cms_sections
     WHERE page_key = p_page_key
       AND parent_section_id IS NOT DISTINCT FROM _self.parent_section_id
       AND id <> _self.id
     ORDER BY sort_order, section_key
  LOOP
    IF _idx = _final THEN
      _idx := _idx + 1;
    END IF;
    UPDATE public.cms_sections
       SET sort_order = _idx,
           updated_at = now()
     WHERE id = _row.id;
    _idx := _idx + 1;
  END LOOP;

  IF _final > _idx THEN
    _final := _idx;
  END IF;

  UPDATE public.cms_sections
     SET sort_order = _final,
         updated_at = now()
   WHERE id = _self.id;

  PERFORM public.cms_resequence_sections_dfs(p_page_key);

  RETURN jsonb_build_object(
    'success', true,
    'page_key', p_page_key,
    'section_key', p_section_key,
    'new_position', _final
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_admin_reorder_section(
  p_page_key text,
  p_section_key text,
  p_direction text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _self  public.cms_sections%ROWTYPE;
  _other public.cms_sections%ROWTYPE;
  _tmp   int;
BEGIN
  IF p_direction NOT IN ('up', 'down') THEN
    RETURN jsonb_build_object('success', false, 'error', 'direction_invalid');
  END IF;

  SELECT * INTO _self
    FROM public.cms_sections
   WHERE page_key = p_page_key
     AND section_key = p_section_key;

  IF _self.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'section_not_found');
  END IF;

  IF p_direction = 'up' THEN
    SELECT * INTO _other
      FROM public.cms_sections
     WHERE page_key = p_page_key
       AND parent_section_id IS NOT DISTINCT FROM _self.parent_section_id
       AND sort_order < _self.sort_order
     ORDER BY sort_order DESC, section_key DESC
     LIMIT 1;
  ELSE
    SELECT * INTO _other
      FROM public.cms_sections
     WHERE page_key = p_page_key
       AND parent_section_id IS NOT DISTINCT FROM _self.parent_section_id
       AND sort_order > _self.sort_order
     ORDER BY sort_order ASC, section_key ASC
     LIMIT 1;
  END IF;

  IF _other.id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'noop', true, 'reason', 'edge');
  END IF;

  _tmp := _self.sort_order;
  UPDATE public.cms_sections
     SET sort_order = _other.sort_order,
         updated_at = now()
   WHERE id = _self.id;
  UPDATE public.cms_sections
     SET sort_order = _tmp,
         updated_at = now()
   WHERE id = _other.id;

  PERFORM public.cms_resequence_sections_dfs(p_page_key);

  RETURN jsonb_build_object(
    'success', true,
    'page_key', p_page_key,
    'moved', p_section_key,
    'swapped_with', _other.section_key
  );
END;
$function$;