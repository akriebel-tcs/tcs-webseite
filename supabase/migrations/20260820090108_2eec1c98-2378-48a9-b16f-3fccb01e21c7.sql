insert into cms_section_fields (page_key, section_key, field_key, locale, value)
select 'personas.wohnungswirtschaft','detail_serviceGarantie','text',f.locale,f.value
from cms_section_fields f
where f.page_key='personas.wohnungswirtschaft' and f.section_key='detail_serviceGarantie' and f.field_key='intro'
on conflict do nothing;

insert into cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
values ('personas.wohnungswirtschaft','detail_serviceGarantie','text','de',true),
       ('personas.wohnungswirtschaft','detail_serviceGarantie','text','en',true)
on conflict (page_key, section_key, field_key, locale) do update set is_enabled=true;