-- Read-only RPC für CMS-Light Admin-Prototyp.
-- Hart begrenzt auf page_key = 'anwendungen.pflege'. Kein Parameter.
-- SECURITY DEFINER nötig, damit anon trotz strenger Public-RLS Draft-Daten
-- für genau diese eine Pilotseite lesen kann. search_path fest auf public.
-- Temporärer Workspace-Prototyp ohne Auth — vor Produktivbetrieb entfernen
-- oder durch Auth/Rollen ersetzen.

create or replace function public.rpc_admin_read_pilot_pflege()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _page_key constant text := 'anwendungen.pflege';
  _page jsonb;
  _sections jsonb;
  _fields jsonb;
begin
  select to_jsonb(p) - 'title_de' - 'title_en' - 'id' - 'created_at' - 'updated_at'
    into _page
  from public.cms_pages p
  where p.page_key = _page_key
  limit 1;

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'page_key', s.page_key,
             'section_key', s.section_key,
             'section_type', s.section_type,
             'is_active', s.is_active
           )
           order by s.sort_order, s.section_key
         ), '[]'::jsonb)
    into _sections
  from public.cms_sections s
  where s.page_key = _page_key;

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'page_key', f.page_key,
             'section_key', f.section_key,
             'field_key', f.field_key,
             'locale', f.locale,
             'value', f.value
           )
           order by f.section_key, f.field_key, f.locale
         ), '[]'::jsonb)
    into _fields
  from public.cms_section_fields f
  where f.page_key = _page_key;

  return jsonb_build_object(
    'page', _page,
    'sections', _sections,
    'fields', _fields
  );
end;
$$;

revoke all on function public.rpc_admin_read_pilot_pflege() from public;
grant execute on function public.rpc_admin_read_pilot_pflege() to anon, authenticated;

comment on function public.rpc_admin_read_pilot_pflege() is
  'Temporärer CMS-Light-Admin-Prototyp: read-only, hart begrenzt auf page_key=anwendungen.pflege. Vor Produktivbetrieb durch Auth/Rollen ersetzen oder entfernen.';
