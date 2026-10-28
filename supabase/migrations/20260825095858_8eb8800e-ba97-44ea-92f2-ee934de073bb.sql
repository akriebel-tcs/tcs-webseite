SELECT public.rpc_admin_update_section_field(
  'anwendungen.bidirektionale-video','hero','description','de',
  'Die bidirektionale Video-Gegensprechanlage ergänzt die klassische Türkommunikation um eine Kamera an der Innenstation.'
);
SELECT public.rpc_admin_update_section_field(
  'anwendungen.bidirektionale-video','hero','description','en',
  'The bidirectional video intercom complements classic door communication with a camera at the indoor station.'
);
SELECT public.rpc_admin_set_editable_field_enabled(
  'anwendungen.bidirektionale-video','hero','description','de', true
);
SELECT public.rpc_admin_set_editable_field_enabled(
  'anwendungen.bidirektionale-video','hero','description','en', true
);