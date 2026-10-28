-- 1) Neue Spalte parent_section_id
ALTER TABLE public.cms_sections
  ADD COLUMN IF NOT EXISTS parent_section_id uuid NULL
  REFERENCES public.cms_sections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cms_sections_parent
  ON public.cms_sections(parent_section_id);

-- 2) Lese-RPC: parent_section_id + parent_section_key mitliefern
CREATE OR REPLACE FUNCTION public.rpc_admin_read_page_sections(p_page_key text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'page_key', s.page_key,
        'section_key', s.section_key,
        'section_type', s.section_type,
        'section_no', s.section_no,
        'section_uid', s.section_uid,
        'sort_order', s.sort_order,
        'is_active', s.is_active,
        'parent_section_id', s.parent_section_id,
        'parent_section_key', p.section_key,
        'updated_at', s.updated_at
      )
      ORDER BY s.sort_order, s.section_key
    ),
    '[]'::jsonb
  )
  FROM public.cms_sections s
  LEFT JOIN public.cms_sections p ON p.id = s.parent_section_id
  WHERE s.page_key = p_page_key;
$function$;

-- 3) DFS-Resequenzierung: Kinder folgen direkt auf ihren Eltern-Block
CREATE OR REPLACE FUNCTION public.cms_resequence_sections_dfs(p_page_key text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _idx int := 0;
  _row record;
BEGIN
  FOR _row IN
    WITH RECURSIVE tree AS (
      SELECT id, parent_section_id, section_key, sort_order,
             ARRAY[sort_order]::int[] AS path,
             ARRAY[section_key]::text[] AS keypath
        FROM public.cms_sections
       WHERE page_key = p_page_key AND parent_section_id IS NULL
      UNION ALL
      SELECT c.id, c.parent_section_id, c.section_key, c.sort_order,
             t.path || c.sort_order,
             t.keypath || c.section_key
        FROM public.cms_sections c
        JOIN tree t ON c.parent_section_id = t.id
       WHERE c.page_key = p_page_key
    )
    SELECT id FROM tree ORDER BY path, keypath
  LOOP
    UPDATE public.cms_sections
       SET sort_order = _idx, updated_at = now()
     WHERE id = _row.id AND sort_order IS DISTINCT FROM _idx;
    _idx := _idx + 1;
  END LOOP;
  PERFORM public.cms_renumber_sections(p_page_key);
END;
$function$;

-- 4) Schreib-RPC: Eltern setzen + Position unter neuen Geschwistern
CREATE OR REPLACE FUNCTION public.rpc_admin_set_section_parent(
  p_page_key text,
  p_section_key text,
  p_new_parent_section_key text,
  p_position integer
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  IF p_page_key <> 'home.start' THEN
    RETURN jsonb_build_object('success', false, 'error', 'page_not_allowed');
  END IF;

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

  -- Eltern-Verknüpfung setzen
  UPDATE public.cms_sections
     SET parent_section_id = _parent_id,
         updated_at = now()
   WHERE id = _self.id;

  -- Position unter neuen Geschwistern setzen (falls angegeben)
  IF p_position IS NOT NULL THEN
    _final := GREATEST(0, p_position);
    -- Self temporär ans Ende parken, damit Re-Sequencing sauber arbeitet
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
      UPDATE public.cms_sections
         SET sort_order = _idx, updated_at = now()
       WHERE id = _row.id;
      _idx := _idx + 1;
    END LOOP;
    IF _final > _idx THEN _final := _idx; END IF;
    UPDATE public.cms_sections
       SET sort_order = _final, updated_at = now()
     WHERE id = _self.id;
  END IF;

  -- Globale DFS-Resequenzierung: Kinder direkt hinter Parent
  PERFORM public.cms_resequence_sections_dfs(p_page_key);

  RETURN jsonb_build_object(
    'success', true,
    'page_key', p_page_key,
    'section_key', p_section_key,
    'parent_section_key', _normalized,
    'position', p_position
  );
END;
$function$;

-- 5) set_section_position: parent-bewusst (Sortierung pro Geschwister-Ebene)
CREATE OR REPLACE FUNCTION public.rpc_admin_set_section_position(p_page_key text, p_section_key text, p_position integer)
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
  IF p_page_key <> 'home.start' THEN
    RETURN jsonb_build_object('success', false, 'error', 'page_not_allowed');
  END IF;
  IF p_position IS NULL OR p_position < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'position_invalid');
  END IF;

  SELECT * INTO _self FROM public.cms_sections
   WHERE page_key = p_page_key AND section_key = p_section_key AND is_active = true;
  IF _self.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'section_not_found');
  END IF;

  _final := GREATEST(0, p_position);

  -- Self temporär ans Ende parken
  UPDATE public.cms_sections
     SET sort_order = 1000000 + sort_order
   WHERE id = _self.id;

  -- Re-Sequencing nur unter Geschwistern derselben Parent-Ebene
  FOR _row IN
    SELECT id, section_key
      FROM public.cms_sections
     WHERE page_key = p_page_key
       AND is_active = true
       AND parent_section_id IS NOT DISTINCT FROM _self.parent_section_id
       AND id <> _self.id
     ORDER BY sort_order, section_key
  LOOP
    IF _idx = _final THEN _idx := _idx + 1; END IF;
    UPDATE public.cms_sections
       SET sort_order = _idx, updated_at = now()
     WHERE id = _row.id;
    _idx := _idx + 1;
  END LOOP;
  IF _final > _idx THEN _final := _idx; END IF;
  UPDATE public.cms_sections
     SET sort_order = _final, updated_at = now()
   WHERE id = _self.id;

  -- Globale DFS-Resequenzierung: Kinder direkt hinter Parent
  PERFORM public.cms_resequence_sections_dfs(p_page_key);

  RETURN jsonb_build_object(
    'success', true,
    'page_key', p_page_key,
    'section_key', p_section_key,
    'new_position', _final
  );
END;
$function$;