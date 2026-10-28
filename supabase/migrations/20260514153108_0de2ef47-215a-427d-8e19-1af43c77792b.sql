UPDATE public.cms_pages
   SET status = 'published', is_active = true, updated_at = now()
 WHERE page_key IN ('kontakt-bcm.root','signage.root','wissen.akademie')
   AND status = 'draft';