-- 1) Textzeilen sicherstellen (de/en) für beschreibung.text
insert into public.cms_section_fields (page_key, section_key, field_key, locale, value)
select s.page_key, 'beschreibung', 'text', l.locale, ''
from public.cms_sections s
cross join (values ('de'),('en')) as l(locale)
where s.page_key like 'anwendungen.referenzprojekte.%'
  and s.section_key = 'beschreibung'
  and not exists (
    select 1 from public.cms_section_fields f
    where f.page_key = s.page_key and f.section_key='beschreibung'
      and f.field_key='text' and f.locale = l.locale
  );

-- 2) Inhalte aus dem Altfeld body übernehmen, wo text leer ist
update public.cms_section_fields t
set value = b.value, updated_at = now()
from public.cms_section_fields b
where t.page_key like 'anwendungen.referenzprojekte.%'
  and t.section_key = 'beschreibung' and t.field_key = 'text'
  and coalesce(t.value,'') = ''
  and b.page_key = t.page_key and b.section_key = 'beschreibung'
  and b.field_key = 'body' and b.locale = t.locale
  and coalesce(b.value,'') <> '';

-- 3) Whitelist: text freischalten, body ausblenden
insert into public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
select s.page_key, 'beschreibung', 'text', l.locale, true
from public.cms_sections s
cross join (values ('de'),('en')) as l(locale)
where s.page_key like 'anwendungen.referenzprojekte.%'
  and s.section_key = 'beschreibung'
  and not exists (
    select 1 from public.cms_admin_editable_fields w
    where w.page_key = s.page_key and w.section_key='beschreibung'
      and w.field_key='text' and w.locale = l.locale
  );

update public.cms_admin_editable_fields
set is_enabled = true, updated_at = now()
where page_key like 'anwendungen.referenzprojekte.%'
  and section_key = 'beschreibung' and field_key = 'text' and is_enabled = false;

update public.cms_admin_editable_fields
set is_enabled = false, updated_at = now()
where page_key like 'anwendungen.referenzprojekte.%'
  and section_key = 'beschreibung' and field_key = 'body' and is_enabled = true;