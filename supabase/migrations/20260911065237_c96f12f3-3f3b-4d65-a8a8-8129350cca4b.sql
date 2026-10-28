UPDATE public.cms_navigation_nodes
SET route_path = '/anwendungen/zutrittskontrolle-bcm'
WHERE node_key = 'an.zutrittskontrolle-bcm'
  AND (route_path IS NULL OR route_path <> '/anwendungen/zutrittskontrolle-bcm');