-- Neue Detail-Seite "TCS in Schulen" (T05), analog zu P-061 / Kita,
-- als Kindseite von P-057 Bildungseinrichtungen. Idempotent.

DO $$
DECLARE
  src_pk text := 'anwendungen.einfamilienhaus';
  dst_pk text := 'anwendungen.schule';
  dst_anf_id uuid;
  bildung_nav_id uuid;
BEGIN
  -- 1) Page-Datensatz
  INSERT INTO public.cms_pages (page_key, route_path, page_type, title_de, title_en, status, is_active)
  VALUES (dst_pk, '/anwendungen/schule', 'T05', 'Schule', 'School', 'published', true)
  ON CONFLICT (page_key) DO NOTHING;

  -- 2) Top-Level-Sections kopieren
  INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active, parent_section_id)
  SELECT dst_pk, s.section_key, s.section_type, s.sort_order, s.is_active, NULL
  FROM public.cms_sections s
  WHERE s.page_key = src_pk AND s.parent_section_id IS NULL
  ON CONFLICT (page_key, section_key) DO NOTHING;

  -- 3) Card-Kinder unter anforderungen
  SELECT id INTO dst_anf_id FROM public.cms_sections
   WHERE page_key = dst_pk AND section_key = 'anforderungen';

  INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active, parent_section_id)
  SELECT dst_pk, s.section_key, s.section_type, s.sort_order, s.is_active, dst_anf_id
  FROM public.cms_sections s
  WHERE s.page_key = src_pk AND s.parent_section_id IS NOT NULL
  ON CONFLICT (page_key, section_key) DO NOTHING;

  -- 4) Felder spiegeln
  INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value, value_json)
  SELECT dst_pk, f.section_key, f.field_key, f.locale, f.value, f.value_json
  FROM public.cms_section_fields f
  WHERE f.page_key = src_pk
  ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

  -- 5) Schule-spezifische Texte (Hero + Content)
  UPDATE public.cms_section_fields SET value = 'Schule'
   WHERE page_key = dst_pk AND section_key IN ('hero','content') AND field_key = 'headline' AND locale = 'de';
  UPDATE public.cms_section_fields SET value = 'School'
   WHERE page_key = dst_pk AND section_key IN ('hero','content') AND field_key = 'headline' AND locale = 'en';

  UPDATE public.cms_section_fields SET value = 'Sichere und übersichtliche Türkommunikation für Schulen – kontrollierter Zutritt für Lehrkräfte, Schülerinnen, Schüler und Besucher, klare Audio- und Videoverbindung zum Haupteingang sowie eine Bedienung, die im Schulalltag zuverlässig funktioniert.'
   WHERE page_key = dst_pk AND section_key IN ('hero','content') AND field_key = 'intro' AND locale = 'de';
  UPDATE public.cms_section_fields SET value = 'Secure and clear door communication for schools – controlled access for teachers, pupils and visitors, reliable audio and video link to the main entrance, and operation that works dependably throughout the school day.'
   WHERE page_key = dst_pk AND section_key IN ('hero','content') AND field_key = 'intro' AND locale = 'en';

  UPDATE public.cms_section_fields SET value = 'TCS unterstützt Schulen mit robusten Außen- und Innenstationen, geschütztem Zutritt zu Verwaltung, Sekretariat und Klassenbereichen sowie einer klaren Bedienung am Empfang – auch in Stoßzeiten zu Schulbeginn und Schulschluss.'
   WHERE page_key = dst_pk AND section_key = 'content' AND field_key = 'description' AND locale = 'de';
  UPDATE public.cms_section_fields SET value = 'TCS supports schools with robust outdoor and indoor stations, protected access to administration, the secretary''s office and classroom areas, and clear operation at reception – including peak times at the start and end of the school day.'
   WHERE page_key = dst_pk AND section_key = 'content' AND field_key = 'description' AND locale = 'en';

  -- 6) Hero image_enabled aktivieren
  UPDATE public.cms_section_fields SET value = '1'
   WHERE page_key = dst_pk AND section_key = 'hero' AND field_key = 'image_enabled';

  -- 7) Navigationsknoten unter an.bildung
  SELECT id INTO bildung_nav_id FROM public.cms_navigation_nodes
   WHERE nav_area = 'main' AND node_key = 'an.bildung';

  INSERT INTO public.cms_navigation_nodes
    (nav_area, node_key, parent_id, page_key, label, label_de, label_en, route_path, sort_order, is_active, node_type, show_in_public_nav)
  VALUES
    ('main', 'an.bildung.schule', bildung_nav_id, dst_pk, 'Schule',
     'Schule', 'School',
     '/anwendungen/schule', 2, true, 'page', true)
  ON CONFLICT (nav_area, node_key) DO NOTHING;

  -- 8) Schule-Karte B-2668 auf P-057 verlinken
  INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
  VALUES
    ('anwendungen.bildungseinrichtungen', 'card_uebersicht_schule', 'link_1_enabled', 'de', '1'),
    ('anwendungen.bildungseinrichtungen', 'card_uebersicht_schule', 'link_1_enabled', 'en', '1'),
    ('anwendungen.bildungseinrichtungen', 'card_uebersicht_schule', 'link_1_kind', 'de', 'internal'),
    ('anwendungen.bildungseinrichtungen', 'card_uebersicht_schule', 'link_1_kind', 'en', 'internal'),
    ('anwendungen.bildungseinrichtungen', 'card_uebersicht_schule', 'link_1_href', 'de', '/anwendungen/schule'),
    ('anwendungen.bildungseinrichtungen', 'card_uebersicht_schule', 'link_1_href', 'en', '/anwendungen/schule'),
    ('anwendungen.bildungseinrichtungen', 'card_uebersicht_schule', 'link_1_label', 'de', 'Mehr erfahren'),
    ('anwendungen.bildungseinrichtungen', 'card_uebersicht_schule', 'link_1_label', 'en', 'Learn more')
  ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE SET value = EXCLUDED.value;
END $$;