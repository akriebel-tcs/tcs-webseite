insert into public.cms_sections (page_key, section_key, section_type, sort_order, is_active)
values ('eingangssysteme.root', 'discover', 'content_v1', 5, true)
on conflict do nothing;

insert into public.cms_section_fields (page_key, section_key, field_key, locale, value)
values
 ('eingangssysteme.root','discover','title','de','Entry entdecken'),
 ('eingangssysteme.root','discover','title','en','Discover Entry'),
 ('eingangssysteme.root','discover','intro','de','Von Design und Materialien über Funktionalität, Integration, Referenzen bis zu Standards und Beratung.'),
 ('eingangssysteme.root','discover','intro','en','From design and materials through functionality, integration and references to standards and consulting.'),
 ('eingangssysteme.root','discover','label','de',''),
 ('eingangssysteme.root','discover','label','en','')
on conflict do nothing;

insert into public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
select 'eingangssysteme.root','discover', fk.field_key, l.locale, true
from (values ('title'),('intro'),('label')) as fk(field_key)
cross join (values ('de'),('en')) as l(locale)
on conflict do nothing;