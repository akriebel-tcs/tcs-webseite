DO $$
DECLARE
  v_page text := 'mobile-tk-preview.root';
  v_parent text := 'zielgruppen';
  v_pid uuid;
  v_loc text;
  v_src text;
  i int; j int;
  v_tab text; v_srckey text; v_sort int;
  v_df text; v_sf text;
  v_tabs text[][] := ARRAY[ARRAY['tab_bewohner','bewohner','1'],ARRAY['tab_wohnungswirtschaft','wohnungswirtschaft','2'],ARRAY['tab_bauherren','bauherren','3'],ARRAY['tab_handwerk','handwerk','4']];
  v_fmap text[][] := ARRAY[ARRAY['tab_label','tabLabel'],ARRAY['title','titel'],ARRAY['description','beschreibung'],ARRAY['vorteile.1.headline','vorteile.1.headline'],ARRAY['vorteile.1.body','vorteile.1.body'],ARRAY['vorteile.2.headline','vorteile.2.headline'],ARRAY['vorteile.2.body','vorteile.2.body'],ARRAY['vorteile.3.headline','vorteile.3.headline'],ARRAY['vorteile.3.body','vorteile.3.body'],ARRAY['vorteile.4.headline','vorteile.4.headline'],ARRAY['vorteile.4.body','vorteile.4.body']];
  v_pmap text[][] := ARRAY[ARRAY['label','eyebrow'],ARRAY['title','headline'],ARRAY['tablist_label','tablistLabel']];
BEGIN
  SELECT id INTO v_pid FROM cms_sections WHERE page_key=v_page AND section_key=v_parent;
  IF v_pid IS NULL THEN RAISE EXCEPTION 'parent not found'; END IF;
  UPDATE cms_sections SET section_type='tabs_v1', updated_at=now() WHERE id=v_pid AND section_type IS DISTINCT FROM 'tabs_v1';
  FOR i IN 1..array_length(v_pmap,1) LOOP
    v_df:=v_pmap[i][1]; v_sf:=v_pmap[i][2];
    FOREACH v_loc IN ARRAY ARRAY['de','en'] LOOP
      SELECT value INTO v_src FROM cms_section_fields WHERE page_key=v_page AND section_key=v_parent AND field_key=v_sf AND locale=v_loc;
      IF v_src IS NOT NULL THEN
        INSERT INTO cms_section_fields(page_key,section_key,field_key,locale,value) VALUES(v_page,v_parent,v_df,v_loc,v_src) ON CONFLICT DO NOTHING;
      END IF;
      INSERT INTO cms_admin_editable_fields(page_key,section_key,field_key,locale,is_enabled) VALUES(v_page,v_parent,v_df,v_loc,true) ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
  FOR i IN 1..array_length(v_tabs,1) LOOP
    v_tab:=v_tabs[i][1]; v_srckey:=v_tabs[i][2]; v_sort:=v_tabs[i][3]::int;
    INSERT INTO cms_sections(page_key,section_key,section_type,sort_order,is_active,parent_section_id) VALUES(v_page,v_tab,'tab_v1',v_sort,true,v_pid) ON CONFLICT DO NOTHING;
    UPDATE cms_sections SET section_type='tab_v1', sort_order=v_sort, parent_section_id=v_pid, is_active=true, updated_at=now() WHERE page_key=v_page AND section_key=v_tab AND (section_type IS DISTINCT FROM 'tab_v1' OR sort_order IS DISTINCT FROM v_sort OR parent_section_id IS DISTINCT FROM v_pid OR is_active IS DISTINCT FROM true);
    FOR j IN 1..array_length(v_fmap,1) LOOP
      v_df:=v_fmap[j][1]; v_sf:='spalten.'||v_srckey||'.'||v_fmap[j][2];
      FOREACH v_loc IN ARRAY ARRAY['de','en'] LOOP
        SELECT value INTO v_src FROM cms_section_fields WHERE page_key=v_page AND section_key=v_parent AND field_key=v_sf AND locale=v_loc;
        IF v_src IS NOT NULL THEN
          INSERT INTO cms_section_fields(page_key,section_key,field_key,locale,value) VALUES(v_page,v_tab,v_df,v_loc,v_src) ON CONFLICT DO NOTHING;
        END IF;
        INSERT INTO cms_admin_editable_fields(page_key,section_key,field_key,locale,is_enabled) VALUES(v_page,v_tab,v_df,v_loc,true) ON CONFLICT DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;