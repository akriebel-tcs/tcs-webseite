-- cms-light-admin-editable-fields-toggle-1
-- Whitelisted RPC zum Ein-/Ausschalten bestehender Whitelist-Einträge
-- in `public.cms_admin_editable_fields`. Strikt UPDATE-only auf der Spalte
-- `is_enabled` für genau eine Zeile (page_key, section_key, field_key, locale).
-- Kein INSERT, kein DELETE, keine anderen Spalten. Keine Produktdaten.
-- Idempotent: Funktionsdefinition über CREATE OR REPLACE; bei wiederholtem
-- Aufruf entsteht kein Drift, das Ergebnis ist deterministisch.

CREATE OR REPLACE FUNCTION public.rpc_admin_set_editable_field_enabled(
  p_page_key text,
  p_section_key text,
  p_field_key text,
  p_locale text,
  p_is_enabled boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _rows int := 0;
BEGIN
  IF p_locale NOT IN ('de','en') THEN
    RETURN jsonb_build_object(
      'success', false, 'updated', false,
      'error', 'locale_not_allowed',
      'page_key', p_page_key, 'section_key', p_section_key,
      'field_key', p_field_key, 'locale', p_locale
    );
  END IF;

  IF p_is_enabled IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 'updated', false,
      'error', 'is_enabled_required',
      'page_key', p_page_key, 'section_key', p_section_key,
      'field_key', p_field_key, 'locale', p_locale
    );
  END IF;

  UPDATE public.cms_admin_editable_fields
     SET is_enabled = p_is_enabled, updated_at = now()
   WHERE page_key   = p_page_key
     AND section_key = p_section_key
     AND field_key  = p_field_key
     AND locale     = p_locale;

  GET DIAGNOSTICS _rows = ROW_COUNT;

  IF _rows = 0 THEN
    RETURN jsonb_build_object(
      'success', false, 'updated', false,
      'error', 'row_not_found',
      'page_key', p_page_key, 'section_key', p_section_key,
      'field_key', p_field_key, 'locale', p_locale
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true, 'updated', true,
    'page_key', p_page_key, 'section_key', p_section_key,
    'field_key', p_field_key, 'locale', p_locale,
    'is_enabled', p_is_enabled
  );
END;
$function$;