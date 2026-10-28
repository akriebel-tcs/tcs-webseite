-- Hotfix: rpc_admin_paste_section — viewport beim Asset-Copy übernehmen
-- Bug: Spalte `viewport` fehlte im INSERT → alle Kopien landeten auf
-- DEFAULT 'desktop'. Dadurch kollidierten mobile/tablet-Kopien innerhalb
-- desselben Aufrufs miteinander am Unique-Index
-- `cms_assets_active_slot_idx (page_key, section_key, field_key, viewport) WHERE is_active`.
-- Zusätzlich: ON CONFLICT-Schutz, falls dennoch ein aktiver Zielslot bereits
-- existiert (z. B. Reste alter Daten), und EXCEPTION-Handler mit
-- verständlicher Redaktions-Meldung.

CREATE OR REPLACE FUNCTION public.rpc_admin_paste_section(
  p_source_page_key text,
  p_source_section_key text,
  p_target_page_key text,
  p_target_parent_section_key text,
  p_target_position integer,
  p_new_section_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _src public.cms_sections%ROWTYPE;
  _parent_id uuid := NULL;
  _root_new_key text;
  _normalized_parent text;
  _max int;
  _final int;
  _idx int := 0;
  _row record;
  _node record;
  _new_id uuid;
  _suffix int;
  _candidate text;
  _sections_copied int := 0;
  _fields_copied int := 0;
  _assets_copied int := 0;
  _assets_skipped int := 0;
  _whitelist_copied int := 0;
BEGIN
  SELECT * INTO _src FROM public.cms_sections
   WHERE page_key = p_source_page_key AND section_key = p_source_section_key;
  IF _src.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'source_not_found');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.cms_pages WHERE page_key = p_target_page_key) THEN
    RETURN jsonb_build_object('success', false, 'error', 'target_page_not_found');
  END IF;

  _root_new_key := nullif(btrim(coalesce(p_new_section_key, '')), '');
  IF _root_new_key IS NULL THEN
    _root_new_key := p_source_section_key;
  END IF;
  IF _root_new_key !~ '^[a-z][a-z0-9_]*$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'new_section_key_invalid',
      'new_section_key', _root_new_key);
  END IF;

  IF EXISTS (SELECT 1 FROM public.cms_sections
              WHERE page_key = p_target_page_key AND section_key = _root_new_key) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'target_section_key_exists',
      'attempted_section_key', _root_new_key
    );
  END IF;

  _normalized_parent := nullif(btrim(coalesce(p_target_parent_section_key, '')), '');
  IF _normalized_parent IS NOT NULL THEN
    SELECT id INTO _parent_id FROM public.cms_sections
     WHERE page_key = p_target_page_key AND section_key = _normalized_parent;
    IF _parent_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'parent_not_found');
    END IF;
  END IF;

  DROP TABLE IF EXISTS _paste_key_map;
  CREATE TEMP TABLE _paste_key_map (
    src_id uuid PRIMARY KEY,
    src_section_key text NOT NULL,
    src_parent_id uuid,
    src_sort int NOT NULL DEFAULT 0,
    src_section_type text,
    src_is_active boolean NOT NULL DEFAULT true,
    new_section_key text,
    new_id uuid
  ) ON COMMIT DROP;

  INSERT INTO _paste_key_map (src_id, src_section_key, src_parent_id, src_sort, src_section_type, src_is_active)
  WITH RECURSIVE tree AS (
    SELECT id, section_key, parent_section_id, sort_order, section_type, is_active
      FROM public.cms_sections WHERE id = _src.id
    UNION ALL
    SELECT c.id, c.section_key, c.parent_section_id, c.sort_order, c.section_type, c.is_active
      FROM public.cms_sections c
      JOIN tree t ON c.parent_section_id = t.id
     WHERE c.page_key = p_source_page_key
  )
  SELECT id, section_key, parent_section_id, sort_order, section_type, is_active FROM tree;

  UPDATE _paste_key_map SET new_section_key = _root_new_key WHERE src_id = _src.id;

  FOR _node IN SELECT * FROM _paste_key_map WHERE src_id <> _src.id ORDER BY src_sort, src_section_key LOOP
    _candidate := _node.src_section_key;
    _suffix := 0;
    WHILE EXISTS (SELECT 1 FROM public.cms_sections
                   WHERE page_key = p_target_page_key AND section_key = _candidate)
       OR EXISTS (SELECT 1 FROM _paste_key_map
                   WHERE new_section_key = _candidate) LOOP
      _suffix := _suffix + 1;
      IF _suffix = 1 THEN
        _candidate := _node.src_section_key || '_kopie';
      ELSE
        _candidate := _node.src_section_key || '_kopie_' || _suffix;
      END IF;
    END LOOP;
    UPDATE _paste_key_map SET new_section_key = _candidate WHERE src_id = _node.src_id;
  END LOOP;

  SELECT COALESCE(MAX(sort_order), 0) + 1 INTO _max
    FROM public.cms_sections WHERE page_key = p_target_page_key;

  INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active, parent_section_id)
  SELECT p_target_page_key, m.new_section_key, m.src_section_type, _max, true, _parent_id
    FROM _paste_key_map m WHERE m.src_id = _src.id
  RETURNING id INTO _new_id;
  UPDATE _paste_key_map SET new_id = _new_id WHERE src_id = _src.id;
  _sections_copied := 1;

  LOOP
    EXIT WHEN NOT EXISTS (SELECT 1 FROM _paste_key_map WHERE new_id IS NULL);
    FOR _node IN
      SELECT m.* FROM _paste_key_map m
        JOIN _paste_key_map p ON p.src_id = m.src_parent_id
       WHERE m.new_id IS NULL AND p.new_id IS NOT NULL
       ORDER BY m.src_sort, m.src_section_key
    LOOP
      INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active, parent_section_id)
      VALUES (p_target_page_key, _node.new_section_key, _node.src_section_type,
              _node.src_sort, _node.src_is_active,
              (SELECT new_id FROM _paste_key_map WHERE src_id = _node.src_parent_id))
      RETURNING id INTO _new_id;
      UPDATE _paste_key_map SET new_id = _new_id WHERE src_id = _node.src_id;
      _sections_copied := _sections_copied + 1;
    END LOOP;
  END LOOP;

  INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value, value_json)
  SELECT p_target_page_key, m.new_section_key, f.field_key, f.locale, f.value, f.value_json
    FROM public.cms_section_fields f
    JOIN _paste_key_map m ON m.src_section_key = f.section_key
   WHERE f.page_key = p_source_page_key;
  GET DIAGNOSTICS _fields_copied = ROW_COUNT;

  INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
  SELECT p_target_page_key, m.new_section_key, w.field_key, w.locale, w.is_enabled
    FROM public.cms_admin_editable_fields w
    JOIN _paste_key_map m ON m.src_section_key = w.section_key
   WHERE w.page_key = p_source_page_key
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS _whitelist_copied = ROW_COUNT;

  -- FIX (Hotfix 2026-05-24): viewport mitkopieren — sonst kollidieren
  -- mobile/tablet/desktop-Kopien am Partial-Unique-Index
  -- (page_key, section_key, field_key, viewport) WHERE is_active.
  -- Zusätzlicher ON CONFLICT-Schutz: existiert im Ziel bereits ein aktiver
  -- Slot für dieselbe (section_key, field_key, viewport)-Kombination, wird
  -- die Quelle übersprungen statt das Ziel zu überschreiben. Normales Paste
  -- erzeugt neue Section-Keys → dieser Fall ist defensiv und sollte nicht
  -- auftreten.
  WITH src AS (
    SELECT
      p_target_page_key                        AS page_key,
      m.new_section_key                         AS section_key,
      a.asset_role, a.locale, a.viewport,
      a.storage_path, a.public_url,
      a.alt_text_de, a.alt_text_en,
      a.focal_x, a.focal_y, a.sort_order,
      a.is_active, a.field_key, a.file_name,
      a.mime_type, a.alt_de, a.alt_en
    FROM public.cms_assets a
    JOIN _paste_key_map m ON m.src_section_key = a.section_key
    WHERE a.page_key = p_source_page_key AND a.is_active = true
  ), filtered AS (
    SELECT s.*
    FROM src s
    WHERE NOT EXISTS (
      SELECT 1 FROM public.cms_assets t
       WHERE t.page_key = s.page_key
         AND t.section_key = s.section_key
         AND t.field_key IS NOT DISTINCT FROM s.field_key
         AND t.viewport = s.viewport
         AND t.is_active = true
    )
  )
  INSERT INTO public.cms_assets (
    page_key, section_key, asset_role, locale, viewport,
    storage_path, public_url, alt_text_de, alt_text_en,
    focal_x, focal_y, sort_order, is_active,
    field_key, file_name, mime_type, alt_de, alt_en
  )
  SELECT page_key, section_key, asset_role, locale, viewport,
         storage_path, public_url, alt_text_de, alt_text_en,
         focal_x, focal_y, sort_order, is_active,
         field_key, file_name, mime_type, alt_de, alt_en
  FROM filtered;
  GET DIAGNOSTICS _assets_copied = ROW_COUNT;

  SELECT count(*) INTO _assets_skipped
  FROM public.cms_assets a
  JOIN _paste_key_map m ON m.src_section_key = a.section_key
  WHERE a.page_key = p_source_page_key AND a.is_active = true
    AND EXISTS (
      SELECT 1 FROM public.cms_assets t
       WHERE t.page_key = p_target_page_key
         AND t.section_key = m.new_section_key
         AND t.field_key IS NOT DISTINCT FROM a.field_key
         AND t.viewport = a.viewport
         AND t.is_active = true
         AND t.storage_path <> a.storage_path
    );

  IF p_target_position IS NOT NULL THEN
    _final := GREATEST(0, p_target_position);
    UPDATE public.cms_sections SET sort_order = 1000000 + sort_order
     WHERE page_key = p_target_page_key AND section_key = _root_new_key;
    FOR _row IN
      SELECT id FROM public.cms_sections
       WHERE page_key = p_target_page_key
         AND parent_section_id IS NOT DISTINCT FROM _parent_id
         AND section_key <> _root_new_key
       ORDER BY sort_order, section_key
    LOOP
      IF _idx = _final THEN _idx := _idx + 1; END IF;
      UPDATE public.cms_sections SET sort_order = _idx, updated_at = now() WHERE id = _row.id;
      _idx := _idx + 1;
    END LOOP;
    IF _final > _idx THEN _final := _idx; END IF;
    UPDATE public.cms_sections SET sort_order = _final, updated_at = now()
     WHERE page_key = p_target_page_key AND section_key = _root_new_key;
  END IF;

  PERFORM public.cms_resequence_sections_dfs(p_target_page_key);

  RETURN jsonb_build_object(
    'success', true,
    'source_page_key', p_source_page_key,
    'source_section_key', p_source_section_key,
    'target_page_key', p_target_page_key,
    'new_section_key', _root_new_key,
    'parent_section_key', _normalized_parent,
    'position', p_target_position,
    'sections_copied', _sections_copied,
    'fields_copied', _fields_copied,
    'whitelist_copied', _whitelist_copied,
    'assets_copied', _assets_copied,
    'assets_skipped', _assets_skipped
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'paste_unique_conflict',
      'detail', SQLERRM
    );
END;
$function$;