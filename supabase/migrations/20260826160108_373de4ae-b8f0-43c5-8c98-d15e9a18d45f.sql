DO $$
BEGIN
  PERFORM rpc_admin_update_section_field('service.downloads','hero','subline','de','Finden Sie Handbücher, Produktinformationen, Planungsunterlagen, Software und Publikationen.');
  PERFORM rpc_admin_update_section_field('service.downloads','hero','subline','en','Find manuals, product information, planning documents, software and publications.');
END $$;