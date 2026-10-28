-- Karten-Migration Tranche 1: vorteile -> cards_v1 + card_v1 Kinder.
-- Idempotent; Legacy-Felder items.N.* bleiben erhalten.

DO $mig$
DECLARE
  v_pages text[] := ARRAY[
    'gebaeudemanagement.bcm-infoboard',
    'gebaeudemanagement.bcm-buchungssystem',
    'zutrittskontrolle.aussenstation-adx5',
    'zutrittskontrolle.digitale-briefkasten',
    'zutrittskontrolle.zutrittssoftware',
    'zutrittskontrolle.bcm-mini-cloud'
  ];
  v_page text;
  v_parent_id uuid;
  v_max_idx int;
  v_i int;
  v_child_key text;
  v_title_de text;
  v_title_en text;
  v_desc_de text;
  v_desc_en text;
BEGIN
  FOREACH v_page IN ARRAY v_pages LOOP
    -- Parent existiert? Sonst überspringen.
    SELECT id INTO v_parent_id
      FROM public.cms_sections
     WHERE page_key = v_page AND section_key = 'vorteile';
    IF v_parent_id IS NULL THEN
      RAISE NOTICE 'Skip %: parent vorteile fehlt', v_page;
      CONTINUE;
    END IF;

    -- Parent-Typ auf cards_v1 anheben (nur wenn er noch content_v1/content ist).
    UPDATE public.cms_sections
       SET section_type = 'cards_v1', updated_at = now()
     WHERE id = v_parent_id
       AND section_type IN ('content_v1', 'content');

    -- Höchsten items.N-Index ermitteln.
    SELECT COALESCE(MAX( (split_part(field_key, '.', 2))::int ), -1)
      INTO v_max_idx
      FROM public.cms_section_fields
     WHERE page_key = v_page
       AND section_key = 'vorteile'
       AND field_key ~ '^items\.[0-9]+\.';

    IF v_max_idx < 0 THEN
      RAISE NOTICE 'Skip %: keine items.N.* Felder', v_page;
      CONTINUE;
    END IF;

    FOR v_i IN 0..v_max_idx LOOP
      v_child_key := 'vorteile_item_' || (v_i + 1);

      -- Quellwerte lesen (aus altem items.N.*).
      SELECT value INTO v_title_de FROM public.cms_section_fields
       WHERE page_key=v_page AND section_key='vorteile'
         AND field_key='items.'||v_i||'.title' AND locale='de';
      SELECT value INTO v_title_en FROM public.cms_section_fields
       WHERE page_key=v_page AND section_key='vorteile'
         AND field_key='items.'||v_i||'.title' AND locale='en';
      SELECT value INTO v_desc_de FROM public.cms_section_fields
       WHERE page_key=v_page AND section_key='vorteile'
         AND field_key='items.'||v_i||'.description' AND locale='de';
      SELECT value INTO v_desc_en FROM public.cms_section_fields
       WHERE page_key=v_page AND section_key='vorteile'
         AND field_key='items.'||v_i||'.description' AND locale='en';

      -- Wenn dieser Index in der Quelle leer ist: nicht anlegen.
      IF v_title_de IS NULL AND v_title_en IS NULL
         AND v_desc_de IS NULL AND v_desc_en IS NULL THEN
        CONTINUE;
      END IF;

      -- Kind-Section anlegen oder aktualisieren (Parent/Reihenfolge).
      INSERT INTO public.cms_sections
        (page_key, section_key, section_type, sort_order, parent_section_id, is_active)
      VALUES
        (v_page, v_child_key, 'card_v1', (v_i + 1) * 10, v_parent_id, true)
      ON CONFLICT (page_key, section_key) DO UPDATE
        SET parent_section_id = v_parent_id,
            section_type      = CASE WHEN public.cms_sections.section_type IN ('content_v1','content')
                                     THEN 'card_v1'
                                     ELSE public.cms_sections.section_type END,
            sort_order        = EXCLUDED.sort_order,
            updated_at        = now();

      -- Felder kopieren (nur DO NOTHING — bestehende Werte nicht überschreiben).
      IF v_title_de IS NOT NULL THEN
        INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
        VALUES (v_page, v_child_key, 'title', 'de', v_title_de)
        ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
      END IF;
      IF v_title_en IS NOT NULL THEN
        INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
        VALUES (v_page, v_child_key, 'title', 'en', v_title_en)
        ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
      END IF;
      IF v_desc_de IS NOT NULL THEN
        INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
        VALUES (v_page, v_child_key, 'description', 'de', v_desc_de)
        ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
      END IF;
      IF v_desc_en IS NOT NULL THEN
        INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
        VALUES (v_page, v_child_key, 'description', 'en', v_desc_en)
        ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
      END IF;

      -- Default-Icon (kebab, vom Resolver auf CheckCircle2 gemappt).
      INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
      VALUES (v_page, v_child_key, 'icon', 'de', 'check-circle-2'),
             (v_page, v_child_key, 'icon', 'en', 'check-circle-2')
      ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

      -- Whitelist für Pflegefelder.
      INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
      SELECT v_page, v_child_key, fk, lc, true
        FROM unnest(ARRAY['title','description','icon']) AS fk,
             unnest(ARRAY['de','en']) AS lc
      ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
    END LOOP;
  END LOOP;
END
$mig$;