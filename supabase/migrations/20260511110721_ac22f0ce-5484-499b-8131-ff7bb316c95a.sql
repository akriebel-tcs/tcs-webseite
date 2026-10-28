
-- Etappe J.5 — Personas in eigene Sections splitten + erweiterte Reorder/Duplicate-RPCs
-- Idempotent: ON CONFLICT DO NOTHING / WHERE NOT EXISTS, deaktiviert Quelle nur am Ende.

-- 1) Neue Sections für Personas anlegen.
INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active) VALUES
  ('home.start', 'personas_intro',           'rich',  9, true),
  ('home.start', 'persona_bauherren',        'rich', 10, true),
  ('home.start', 'persona_architekten',      'rich', 11, true),
  ('home.start', 'persona_wohnungswirtschaft','rich', 12, true),
  ('home.start', 'persona_fachplaner',       'rich', 13, true),
  ('home.start', 'persona_handwerk',         'rich', 14, true),
  ('home.start', 'persona_fachhandel',       'rich', 15, true)
ON CONFLICT DO NOTHING;

-- cta ans Ende verschieben (Position 16).
UPDATE public.cms_sections
   SET sort_order = 16, updated_at = now()
 WHERE page_key = 'home.start' AND section_key = 'cta' AND sort_order <> 16;

-- 2) Personas-Intro-Felder aus personas_picker übernehmen (idempotent).
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT 'home.start', 'personas_intro', f.field_key, f.locale, f.value
  FROM public.cms_section_fields f
 WHERE f.page_key = 'home.start'
   AND f.section_key = 'personas_picker'
   AND f.field_key IN ('headline', 'intro', 'cta_default')
   AND NOT EXISTS (
     SELECT 1 FROM public.cms_section_fields g
      WHERE g.page_key = 'home.start'
        AND g.section_key = 'personas_intro'
        AND g.field_key = f.field_key
        AND g.locale = f.locale
   );

-- Whitelist fuer personas_intro
INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT 'home.start', 'personas_intro', f.field_key, f.locale, true
  FROM public.cms_section_fields f
 WHERE f.page_key = 'home.start' AND f.section_key = 'personas_intro'
ON CONFLICT DO NOTHING;

-- 3) Pro Persona: title + desc aus personas_picker.<persona>_<field> in persona_<persona>.<field>
DO $$
DECLARE
  _persona text;
  _field   text;
  _personas text[] := ARRAY['bauherren','architekten','wohnungswirtschaft','fachplaner','handwerk','fachhandel'];
  _fields   text[] := ARRAY['title','desc'];
BEGIN
  FOREACH _persona IN ARRAY _personas LOOP
    FOREACH _field IN ARRAY _fields LOOP
      INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
      SELECT 'home.start',
             'persona_' || _persona,
             _field,
             f.locale,
             f.value
        FROM public.cms_section_fields f
       WHERE f.page_key = 'home.start'
         AND f.section_key = 'personas_picker'
         AND f.field_key = _persona || '_' || _field
         AND NOT EXISTS (
           SELECT 1 FROM public.cms_section_fields g
            WHERE g.page_key = 'home.start'
              AND g.section_key = 'persona_' || _persona
              AND g.field_key = _field
              AND g.locale = f.locale
         );

      INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
      SELECT 'home.start', 'persona_' || _persona, _field, l, true
        FROM unnest(ARRAY['de','en']) AS l
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END$$;

-- 4) Alte personas_picker-Section deaktivieren (reversibel, Daten bleiben).
UPDATE public.cms_sections
   SET is_active = false, updated_at = now()
 WHERE page_key = 'home.start' AND section_key = 'personas_picker' AND is_active = true;

-- 5) Neue RPC: Position per Zahl setzen.
CREATE OR REPLACE FUNCTION public.rpc_admin_set_section_position(
  p_page_key text,
  p_section_key text,
  p_position integer
) RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
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

  -- Ziel-Position auf Anzahl-1 begrenzen.
  _final := GREATEST(0, p_position);

  -- Re-Sequenzierung: alle aktiven Sections in alter Reihenfolge durchlaufen,
  -- die bewegte Section an Wunschposition einsetzen.
  FOR _row IN
    SELECT id, section_key
      FROM public.cms_sections
     WHERE page_key = p_page_key AND is_active = true AND id <> _self.id
     ORDER BY sort_order, section_key
  LOOP
    IF _idx = _final THEN
      _idx := _idx + 1;
    END IF;
    UPDATE public.cms_sections
       SET sort_order = _idx, updated_at = now()
     WHERE id = _row.id;
    _idx := _idx + 1;
  END LOOP;

  IF _final > _idx THEN
    _final := _idx;
  END IF;

  UPDATE public.cms_sections
     SET sort_order = _final, updated_at = now()
   WHERE id = _self.id;

  RETURN jsonb_build_object(
    'success', true,
    'page_key', p_page_key,
    'section_key', p_section_key,
    'new_position', _final
  );
END;
$$;

-- 6) Neue RPC: Section duplizieren (nur Persona/Block-Sections der Startseite).
CREATE OR REPLACE FUNCTION public.rpc_admin_duplicate_section(
  p_page_key text,
  p_source_section_key text,
  p_new_section_key text
) RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _src public.cms_sections%ROWTYPE;
  _max int;
  _normalized text;
  _fields_copied int := 0;
  _whitelist_copied int := 0;
BEGIN
  IF p_page_key <> 'home.start' THEN
    RETURN jsonb_build_object('success', false, 'error', 'page_not_allowed');
  END IF;

  IF p_source_section_key !~ '^(persona|block)_' THEN
    RETURN jsonb_build_object('success', false, 'error', 'source_not_duplicable');
  END IF;

  _normalized := nullif(btrim(coalesce(p_new_section_key, '')), '');
  IF _normalized IS NULL OR _normalized !~ '^[a-z][a-z0-9_]*$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'new_section_key_invalid');
  END IF;
  IF _normalized !~ '^(persona|block)_' THEN
    RETURN jsonb_build_object('success', false, 'error', 'new_section_key_prefix_required');
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

  RETURN jsonb_build_object(
    'success', true,
    'page_key', p_page_key,
    'source_section_key', p_source_section_key,
    'new_section_key', _normalized,
    'sort_order', _max,
    'fields_copied', _fields_copied,
    'whitelist_copied', _whitelist_copied
  );
END;
$$;
