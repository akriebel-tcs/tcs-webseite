do $$
declare
  r record;
  v_new record;
  v_pos int;
begin
  for v_new in
    select * from (values
      ('legal.datenschutzSnipdoo', '/datenschutzhinweise-snipdoo-ip', 'Datenschutzhinweise snipdoo® IP', 'Privacy notice snipdoo® IP',
       'Datenschutzhinweise für die snipdoo® IP Anwendung.', 'Privacy notice for the snipdoo® IP application.', 2),
      ('legal.garantiebedingungen', '/garantiebedingungen', 'Garantiebedingungen', 'Warranty terms',
       'Garantiebedingungen für TCS Produkte.', 'Warranty terms for TCS products.', 3),
      ('legal.einwilligung', '/einwilligung', 'Einwilligung', 'Consent',
       'Informationen zur Einwilligung in die Datenverarbeitung.', 'Information about consent to data processing.', 4),
      ('legal.agbEinkauf', '/agb-einkauf', 'AGB Einkauf', 'Terms of purchase',
       'Allgemeine Einkaufsbedingungen der TCS TürControlSysteme AG.', 'General terms of purchase of TCS TürControlSysteme AG.', 5)
    ) as t(page_key, route_path, title_de, title_en, intro_de, intro_en, pos)
  loop
    -- Seite
    insert into public.cms_pages (page_key, route_path, page_type, title_de, title_en, status, is_active)
    select v_new.page_key, v_new.route_path, 'T19', v_new.title_de, v_new.title_en, 'published', true
    where not exists (select 1 from public.cms_pages where page_key = v_new.page_key);

    -- Blöcke (analog legal.agb)
    insert into public.cms_sections (page_key, section_key, section_type, sort_order, is_active, section_no)
    select v_new.page_key, s.section_key, s.section_type, s.sort_order, s.is_active, s.section_no
    from public.cms_sections s
    where s.page_key = 'legal.agb'
      and not exists (
        select 1 from public.cms_sections x
        where x.page_key = v_new.page_key and x.section_key = s.section_key
      );

    -- Felder: Struktur von legal.agb übernehmen, Inhalte leer
    insert into public.cms_section_fields (page_key, section_key, field_key, locale, value)
    select v_new.page_key, f.section_key, f.field_key, f.locale,
      case
        when f.field_key = 'label' then case when f.locale = 'en' then 'Legal' else 'Rechtliches' end
        when f.field_key = 'headline' then case when f.locale = 'en' then v_new.title_en else v_new.title_de end
        when f.field_key in ('intro','subline') then case when f.locale = 'en' then v_new.intro_en else v_new.intro_de end
        when f.field_key in ('title','text') then ''
        else f.value
      end
    from public.cms_section_fields f
    where f.page_key = 'legal.agb'
      and not exists (
        select 1 from public.cms_section_fields x
        where x.page_key = v_new.page_key and x.section_key = f.section_key
          and x.field_key = f.field_key and x.locale = f.locale
      );

    -- Admin-Whitelist übernehmen
    insert into public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
    select v_new.page_key, w.section_key, w.field_key, w.locale, w.is_enabled
    from public.cms_admin_editable_fields w
    where w.page_key = 'legal.agb'
      and not exists (
        select 1 from public.cms_admin_editable_fields x
        where x.page_key = v_new.page_key and x.section_key = w.section_key
          and x.field_key = w.field_key and x.locale = w.locale
      );

    -- Navigationsknoten in der Fusszeile
    insert into public.cms_navigation_nodes
      (node_key, nav_area, parent_id, page_key, route_path, label_de, label_en, sort_order, is_active, node_type, show_in_public_nav)
    select v_new.page_key, 'footer_bottom', null, v_new.page_key, v_new.route_path,
           v_new.title_de, v_new.title_en, v_new.pos, true, 'page', true
    where not exists (
      select 1 from public.cms_navigation_nodes
      where nav_area = 'footer_bottom' and node_key = v_new.page_key
    );

    update public.cms_navigation_nodes
       set sort_order = v_new.pos, route_path = v_new.route_path, page_key = v_new.page_key, is_active = true
     where nav_area = 'footer_bottom' and node_key = v_new.page_key;
  end loop;

  -- Bestehende Fusszeilen-Links neu einsortieren: Impressum, Datenschutz, [neue], AGB, Sitemap
  update public.cms_navigation_nodes set sort_order = 0 where nav_area = 'footer_bottom' and node_key = 'legal.impressum';
  update public.cms_navigation_nodes set sort_order = 1 where nav_area = 'footer_bottom' and node_key = 'legal.datenschutz';
  update public.cms_navigation_nodes set sort_order = 6 where nav_area = 'footer_bottom' and node_key = 'legal.agb';
  update public.cms_navigation_nodes set sort_order = 7 where nav_area = 'footer_bottom' and node_key = 'legal.sitemap';
end $$;