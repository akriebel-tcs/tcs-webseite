DO $$
DECLARE
  v_key text;
  v_de text;
  v_en text;
  v_pairs text[][] := ARRAY[
    ARRAY['btn_view','Ansicht','Preview'],
    ARRAY['btn_new_tab','Neuer Tab','New tab'],
    ARRAY['btn_close_preview','Vorschau schließen','Close preview'],
    ARRAY['preview_unavailable_hint','Für dieses Dokument ist hier keine Vorschau möglich. Bitte in einem neuen Tab öffnen.','No preview is available here for this document. Please open it in a new tab.']
  ];
  i int;
BEGIN
  FOR i IN 1 .. array_length(v_pairs,1) LOOP
    v_key := v_pairs[i][1];
    v_de := v_pairs[i][2];
    v_en := v_pairs[i][3];

    INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
    VALUES ('service.downloads','dokumente',v_key,'de',v_de)
    ON CONFLICT DO NOTHING;
    INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
    VALUES ('service.downloads','dokumente',v_key,'en',v_en)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
    VALUES ('service.downloads','dokumente',v_key,'de',true)
    ON CONFLICT DO NOTHING;
    INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
    VALUES ('service.downloads','dokumente',v_key,'en',true)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;