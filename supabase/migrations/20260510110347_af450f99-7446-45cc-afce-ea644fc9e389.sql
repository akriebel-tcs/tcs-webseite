-- Etappe D: cms-light-navigation-write-1
-- Schreibwege ausschließlich für label_de / label_en. Whitelist hart in
-- der Funktion. Keine sonstige Mutation der Navigation möglich.
-- SECURITY DEFINER, EXECUTE für anon + authenticated (No-Login-Prototyp,
-- analog rpc_admin_update_pilot_pflege_field).

CREATE OR REPLACE FUNCTION public.rpc_admin_update_navigation_label(
  p_node_id uuid,
  p_locale  text,
  p_value   text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  _rows int := 0;
  _normalized text;
begin
  -- Whitelist Locale
  if p_locale not in ('de', 'en') then
    return jsonb_build_object(
      'success', false,
      'updated', false,
      'error', 'locale_not_allowed',
      'node_id', p_node_id,
      'locale', p_locale
    );
  end if;

  -- Leere Strings als NULL behandeln
  _normalized := nullif(btrim(coalesce(p_value, '')), '');

  if p_locale = 'de' then
    update public.cms_navigation_nodes
       set label_de = _normalized,
           updated_at = now()
     where id = p_node_id;
  else
    update public.cms_navigation_nodes
       set label_en = _normalized,
           updated_at = now()
     where id = p_node_id;
  end if;

  get diagnostics _rows = row_count;

  if _rows = 0 then
    return jsonb_build_object(
      'success', false,
      'updated', false,
      'error', 'node_not_found',
      'node_id', p_node_id,
      'locale', p_locale
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'updated', true,
    'node_id', p_node_id,
    'locale', p_locale,
    'value', _normalized
  );
end;
$function$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_update_navigation_label(uuid, text, text)
  TO anon, authenticated;