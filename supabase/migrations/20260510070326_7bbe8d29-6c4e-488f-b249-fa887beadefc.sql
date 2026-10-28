-- cms-light-admin-save-pilot-1
-- Eng begrenzte Schreib-RPC für die Pilotseite "anwendungen.pflege".
-- Aktualisiert ausschließlich cms_section_fields.value für vier whitelisted Felder
-- in den Locales de/en. Kein Insert, kein Upsert, keine Statusänderung.

create or replace function public.rpc_admin_update_pilot_pflege_field(
  p_section_key text,
  p_field_key text,
  p_locale text,
  p_value text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _page_key constant text := 'anwendungen.pflege';
  _allowed boolean := false;
  _rows int := 0;
begin
  -- Whitelist: nur diese vier (section_key, field_key)-Kombinationen
  if (p_section_key = 'hero' and p_field_key = 'headline')
     or (p_section_key = 'hero' and p_field_key = 'intro')
     or (p_section_key = 'answer-first' and p_field_key = 'text')
     or (p_section_key = 'intro' and p_field_key = 'text')
  then
    _allowed := true;
  end if;

  if not _allowed then
    return jsonb_build_object(
      'success', false,
      'updated', false,
      'error', 'field_not_allowed',
      'section_key', p_section_key,
      'field_key', p_field_key,
      'locale', p_locale
    );
  end if;

  -- Whitelist Locales
  if p_locale not in ('de', 'en') then
    return jsonb_build_object(
      'success', false,
      'updated', false,
      'error', 'locale_not_allowed',
      'section_key', p_section_key,
      'field_key', p_field_key,
      'locale', p_locale
    );
  end if;

  -- Reines UPDATE auf cms_section_fields.value, nur bestehende Zeile.
  update public.cms_section_fields
     set value = p_value,
         updated_at = now()
   where page_key = _page_key
     and section_key = p_section_key
     and field_key = p_field_key
     and locale = p_locale;

  get diagnostics _rows = row_count;

  if _rows = 0 then
    return jsonb_build_object(
      'success', false,
      'updated', false,
      'error', 'row_not_found',
      'section_key', p_section_key,
      'field_key', p_field_key,
      'locale', p_locale
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'updated', true,
    'section_key', p_section_key,
    'field_key', p_field_key,
    'locale', p_locale
  );
end;
$$;

-- Execute-Rechte: Prototyp-Ausnahme, da /admin (noch) ohne Login.
-- Funktion ist hart auf anwendungen.pflege + 4 Felder + de/en begrenzt.
revoke all on function public.rpc_admin_update_pilot_pflege_field(text, text, text, text) from public;
grant execute on function public.rpc_admin_update_pilot_pflege_field(text, text, text, text) to anon, authenticated;