-- Bedienlabels für die zwei Einstiege des Download-Centers (nur UI-Texte,
-- keine fachlichen Download-Werte). Idempotent.
do $$
declare
  v_page text := 'service.downloads';
  v_section text := 'dokumente';
  r record;
begin
  for r in
    select * from (values
      ('label_zielgruppen', 'de', 'Nach Zielgruppe'),
      ('label_zielgruppen', 'en', 'By audience'),
      ('label_unterlagentypen', 'de', 'Nach Unterlagentyp'),
      ('label_unterlagentypen', 'en', 'By document type'),
      ('label_weitere_filter', 'de', 'Weitere Filter'),
      ('label_weitere_filter', 'en', 'More filters'),
      ('label_zugeordnete_artikel', 'de', 'Zugeordnete Artikel'),
      ('label_zugeordnete_artikel', 'en', 'Assigned articles')
    ) as t(field_key, locale, value)
  loop
    if exists (
      select 1 from public.cms_section_fields
      where page_key = v_page and section_key = v_section
        and field_key = r.field_key and locale = r.locale
    ) then
      update public.cms_section_fields
         set value = case when coalesce(value, '') = '' then r.value else value end
       where page_key = v_page and section_key = v_section
         and field_key = r.field_key and locale = r.locale;
    else
      insert into public.cms_section_fields (page_key, section_key, field_key, locale, value)
      values (v_page, v_section, r.field_key, r.locale, r.value);
    end if;

    if not exists (
      select 1 from public.cms_admin_editable_fields
      where page_key = v_page and section_key = v_section
        and field_key = r.field_key and locale = r.locale
    ) then
      insert into public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
      values (v_page, v_section, r.field_key, r.locale, true);
    end if;
  end loop;
end $$;