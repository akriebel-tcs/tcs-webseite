UPDATE public.cms_sections
SET section_type = 'product_scroller_v1', updated_at = now()
WHERE page_key = 'zutrittskontrolle.tueren-tore'
  AND section_key = 'products'
  AND section_type = 'cards_v1';