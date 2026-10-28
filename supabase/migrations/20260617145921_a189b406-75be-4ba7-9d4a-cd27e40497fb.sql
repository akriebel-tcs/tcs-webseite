
-- Neue Detail-Seite "TCS in Kindertagesstätten" (T05), analog zu P-061 Einfamilienhaus,
-- als Kindseite von P-057 Bildungseinrichtungen.
-- Idempotent: jeder Schritt prüft auf Vorhandensein.

DO $$
DECLARE
  src_pk text := 'anwendungen.einfamilienhaus';
  dst_pk text := 'anwendungen.kindertagesstaetten';
  src_anf_id uuid;
  dst_anf_id uuid;
  bildung_nav_id uuid;
BEGIN
  -- 1) Page-Datensatz
  INSERT INTO public.cms_pages (page_key, route_path, page_type, title_de, title_en, status, is_active)
  VALUES (dst_pk, '/anwendungen/kindertagesstaetten', 'T05', 'Kindertagesstätte', 'Day-care centre', 'published', true)
  ON CONFLICT (page_key) DO NOTHING;

  -- 2) Top-Level-Sections kopieren (ohne Card-Kinder)
  INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active, parent_section_id)
  SELECT dst_pk, s.section_key, s.section_type, s.sort_order, s.is_active, NULL
  FROM public.cms_sections s
  WHERE s.page_key = src_pk
    AND s.parent_section_id IS NULL
  ON CONFLICT (page_key, section_key) DO NOTHING;

  -- 3) Card-Kinder (anforderungen_item_*) kopieren und an neue anforderungen-Section hängen
  SELECT id INTO dst_anf_id FROM public.cms_sections
   WHERE page_key = dst_pk AND section_key = 'anforderungen';

  INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active, parent_section_id)
  SELECT dst_pk, s.section_key, s.section_type, s.sort_order, s.is_active, dst_anf_id
  FROM public.cms_sections s
  WHERE s.page_key = src_pk
    AND s.parent_section_id IS NOT NULL
  ON CONFLICT (page_key, section_key) DO NOTHING;

  -- 4) Alle Felder spiegeln
  INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value, value_json)
  SELECT dst_pk, f.section_key, f.field_key, f.locale, f.value, f.value_json
  FROM public.cms_section_fields f
  WHERE f.page_key = src_pk
  ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

  -- 5) Kita-spezifische Texte überschreiben (Hero + Content)
  UPDATE public.cms_section_fields SET value = 'Kindertagesstätte'
   WHERE page_key = dst_pk AND section_key IN ('hero','content') AND field_key = 'headline' AND locale = 'de';
  UPDATE public.cms_section_fields SET value = 'Day-care centre'
   WHERE page_key = dst_pk AND section_key IN ('hero','content') AND field_key = 'headline' AND locale = 'en';

  UPDATE public.cms_section_fields SET value = 'Robuste, kinderfreundliche Türkommunikation für Kindertagesstätten – sicherer Zutritt für Personal und Eltern, klare Audio- und Videoverbindung zum Eingang und eine Bedienung, die auch im Trubel des Kita-Alltags zuverlässig funktioniert.'
   WHERE page_key = dst_pk AND section_key IN ('hero','content') AND field_key = 'intro' AND locale = 'de';
  UPDATE public.cms_section_fields SET value = 'Robust, child-friendly door communication for day-care centres – secure access for staff and parents, clear audio and video link to the entrance, and operation that holds up to the bustle of daily nursery life.'
   WHERE page_key = dst_pk AND section_key IN ('hero','content') AND field_key = 'intro' AND locale = 'en';

  UPDATE public.cms_section_fields SET value = 'TCS unterstützt Kindertagesstätten mit verlässlichen Außen- und Innenstationen, geschütztem Zutritt für Personal und abholberechtigte Personen sowie einer Bedienung, die sich gut in den Kita-Alltag einfügt – auch in Stoßzeiten beim Bringen und Abholen.'
   WHERE page_key = dst_pk AND section_key = 'content' AND field_key = 'description' AND locale = 'de';
  UPDATE public.cms_section_fields SET value = 'TCS supports day-care centres with reliable outdoor and indoor stations, protected access for staff and authorised pick-up persons, and operation that fits smoothly into nursery routines – including peak drop-off and pick-up times.'
   WHERE page_key = dst_pk AND section_key = 'content' AND field_key = 'description' AND locale = 'en';

  -- 6) Navigationsknoten unter an.bildung
  SELECT id INTO bildung_nav_id FROM public.cms_navigation_nodes
   WHERE nav_area = 'main' AND node_key = 'an.bildung';

  INSERT INTO public.cms_navigation_nodes
    (nav_area, node_key, parent_id, page_key, label, label_de, label_en, route_path, sort_order, is_active, node_type, show_in_public_nav)
  VALUES
    ('main', 'an.bildung.kita', bildung_nav_id, dst_pk, 'Kindertagesstätte',
     'Kindertagesstätte', 'Day-care centre',
     '/anwendungen/kindertagesstaetten', 1, true, 'page', true)
  ON CONFLICT (nav_area, node_key) DO NOTHING;
END $$;
