UPDATE public.cms_sections
   SET section_type = 'cards_v1',
       updated_at   = now()
 WHERE section_uid = 259
   AND section_type = 'product_scroller_v1';