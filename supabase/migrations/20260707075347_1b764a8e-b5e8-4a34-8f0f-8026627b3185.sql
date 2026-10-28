UPDATE public.cms_sections
   SET section_key = 'block_gebaeudemanagement'
 WHERE page_key = 'home.start' AND section_key = 'block_consulting';

UPDATE public.cms_section_fields
   SET section_key = 'block_gebaeudemanagement'
 WHERE page_key = 'home.start' AND section_key = 'block_consulting';

UPDATE public.cms_assets
   SET section_key = 'block_gebaeudemanagement'
 WHERE page_key = 'home.start' AND section_key = 'block_consulting';

UPDATE public.cms_admin_editable_fields
   SET section_key = 'block_gebaeudemanagement'
 WHERE page_key = 'home.start' AND section_key = 'block_consulting';