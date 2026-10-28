-- Rückbau cms-auth-1: Admin-Bereich ist temporärer No-Login-Workspace.
-- Entfernt Auth-Gating in den Admin-RPCs, dropt user_roles/profiles und
-- zugehörige Funktionen. Wird vor Live-Schaltung neu angegangen.

-- 1. RPCs entgaten (Admin-Check entfernen, anon darf wieder ausführen)
CREATE OR REPLACE FUNCTION public.rpc_admin_update_navigation_label(p_node_id uuid, p_locale text, p_value text)
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
       set label_de = _normalized, updated_at = now()
     where id = p_node_id;
  else
    update public.cms_navigation_nodes
       set label_en = _normalized, updated_at = now()
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

CREATE OR REPLACE FUNCTION public.rpc_admin_update_pilot_pflege_field(p_section_key text, p_field_key text, p_locale text, p_value text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _page_key constant text := 'anwendungen.pflege';
  _allowed boolean := false;
  _rows int := 0;
begin
  if (p_section_key = 'hero' and p_field_key = 'headline')
     or (p_section_key = 'hero' and p_field_key = 'intro')
     or (p_section_key = 'answer-first' and p_field_key = 'text')
     or (p_section_key = 'intro' and p_field_key = 'text')
  then
    _allowed := true;
  end if;

  if not _allowed then
    return jsonb_build_object(
      'success', false, 'updated', false,
      'error', 'field_not_allowed',
      'section_key', p_section_key, 'field_key', p_field_key, 'locale', p_locale
    );
  end if;

  if p_locale not in ('de', 'en') then
    return jsonb_build_object(
      'success', false, 'updated', false,
      'error', 'locale_not_allowed',
      'section_key', p_section_key, 'field_key', p_field_key, 'locale', p_locale
    );
  end if;

  update public.cms_section_fields
     set value = p_value, updated_at = now()
   where page_key = _page_key
     and section_key = p_section_key
     and field_key = p_field_key
     and locale = p_locale;

  get diagnostics _rows = row_count;

  if _rows = 0 then
    return jsonb_build_object(
      'success', false, 'updated', false,
      'error', 'row_not_found',
      'section_key', p_section_key, 'field_key', p_field_key, 'locale', p_locale
    );
  end if;

  return jsonb_build_object(
    'success', true, 'updated', true,
    'section_key', p_section_key, 'field_key', p_field_key, 'locale', p_locale
  );
end;
$function$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_update_navigation_label(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_update_pilot_pflege_field(text, text, text, text) TO anon, authenticated;

-- 2. Auth-Hilfsobjekte droppen
DROP FUNCTION IF EXISTS public.claim_first_admin();
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP TABLE IF EXISTS public.user_roles;
DROP TABLE IF EXISTS public.profiles;
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);
DROP TYPE IF EXISTS public.app_role;