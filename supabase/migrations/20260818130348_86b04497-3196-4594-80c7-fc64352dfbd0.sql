CREATE OR REPLACE FUNCTION public.rpc_admin_update_navigation_description(p_node_id uuid, p_locale text, p_value text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _rows int := 0;
  _normalized text;
begin
  if p_locale not in ('de', 'en') then
    return jsonb_build_object(
      'success', false, 'updated', false,
      'error', 'locale_not_allowed',
      'node_id', p_node_id, 'locale', p_locale
    );
  end if;

  _normalized := nullif(btrim(coalesce(p_value, '')), '');

  if p_locale = 'de' then
    update public.cms_navigation_nodes
       set description_de = _normalized, updated_at = now()
     where id = p_node_id;
  else
    update public.cms_navigation_nodes
       set description_en = _normalized, updated_at = now()
     where id = p_node_id;
  end if;

  get diagnostics _rows = row_count;

  if _rows = 0 then
    return jsonb_build_object(
      'success', false, 'updated', false,
      'error', 'node_not_found',
      'node_id', p_node_id, 'locale', p_locale
    );
  end if;

  return jsonb_build_object(
    'success', true, 'updated', true,
    'node_id', p_node_id, 'locale', p_locale, 'value', _normalized
  );
end;
$function$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_update_navigation_description(uuid, text, text) TO anon, authenticated, service_role;