-- Cleanup: remove legacy personas_picker section and personas_intro.cta_default
DELETE FROM public.cms_section_fields
 WHERE page_key = 'home.start' AND section_key = 'personas_picker';
DELETE FROM public.cms_assets
 WHERE page_key = 'home.start' AND section_key = 'personas_picker';
DELETE FROM public.cms_admin_editable_fields
 WHERE page_key = 'home.start' AND section_key = 'personas_picker';
DELETE FROM public.cms_sections
 WHERE page_key = 'home.start' AND section_key = 'personas_picker';

-- Remove cta_default field from personas_intro (Mehr erfahren / Learn more)
DELETE FROM public.cms_section_fields
 WHERE page_key = 'home.start'
   AND section_key = 'personas_intro'
   AND field_key  = 'cta_default';
DELETE FROM public.cms_admin_editable_fields
 WHERE page_key = 'home.start'
   AND section_key = 'personas_intro'
   AND field_key  = 'cta_default';

-- Renumber sections cleanly
SELECT public.cms_renumber_sections('home.start');
