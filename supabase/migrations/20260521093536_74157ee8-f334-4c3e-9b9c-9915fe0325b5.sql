-- Karten-Migration Tranche 2: vorteile + anwendungen -> cards_v1 + card_v1.
-- Idempotent; Legacy-Felder items.N.* bleiben als Fallback erhalten.
-- Quelle: Audit ergibt für alle Ziel-Sections nur items.N.title + items.N.description.
-- Kein href, kein icon in den Legacy-Daten -> nur title/description werden kopiert.
-- vorteile bekommt Default-Icon check-circle-2; anwendungen bekommt KEIN Default-Icon
-- (Renderer-Fallback bleibt aktiv, falls positionsbasierte Defaults existieren).

DO $mig$
DECLARE
  -- (page_key, section_key, default_icon | NULL)
  v_targets text[][] := ARRAY[
    ['zutrittskontrolle.bcm-door-app','vorteile','check-circle-2'],
    ['zutrittskontrolle.bcm-door-app','anwendungen',NULL],
    ['zutrittskontrolle.gsm-gateway','vorteile','check-circle-2'],
    ['zutrittskontrolle.gsm-gateway','anwendungen',NULL],
    ['zutrittskontrolle.zufahrtskontrolle','anwendungen',NULL],
    ['zutrittskontrolle.schrankschloss','vorteile','check-circle-2'],
    ['zutrittskontrolle.schrankschloss','anwendungen',NULL],
    ['zutrittskontrolle.serverschrankschloss','vorteile','check-circle-2'],
    ['zutrittskontrolle.serverschrankschloss','anwendungen',NULL],
    ['zutrittskontrolle.bcm-handsender','vorteile','check-circle-2'],
    ['zutrittskontrolle.bcm-handsender','anwendungen',NULL],
    ['zutrittskontrolle.funkvernetzte-offline-leser','vorteile','check-circle-2'],
    ['zutrittskontrolle.funkvernetzte-offline-leser','anwendungen',NULL],
    ['zutrittskontrolle.bcm-online-leser','vorteile','check-circle-2'],
    ['zutrittskontrolle.bcm-online-leser','anwendungen',NULL],
    ['zutrittskontrolle.vorhaengeschloss','vorteile','check-circle-2'],
    ['zutrittskontrolle.vorhaengeschloss','anwendungen',NULL],
    ['zutrittskontrolle.elektronischer-knaufzylinder','vorteile','check-circle-2'],
    ['zutrittskontrolle.elektronischer-knaufzylinder','anwendungen',NULL],
    ['zutrittskontrolle.biometrie','anwendungen',NULL]
  ];
  v_page text;
  v_section text;
  v_default_icon text;
  v_parent_id uuid;
  v_max_idx int;
  v_i int;
  v_child_key text;
  v_title_de text;
  v_title_en text;
  v_desc_de text;
  v_desc_en text;
  k int;
BEGIN
  FOR k IN 1 .. array_length(v_targets, 1) LOOP
    v_page         := v_targets[k][1];
    v_section      := v_targets[k][2];
    v_default_icon := v_targets[k][3];

    SELECT id INTO v_parent_id
      FROM public.cms_sections
     WHERE page_key = v_page AND section_key = v_section
       AND parent_section_id IS NULL;
    IF v_parent_id IS NULL THEN
      RAISE NOTICE 'Skip %/%: parent fehlt', v_page, v_section;
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
       AND section_key = v_section
       AND field_key ~ '^items\.[0-9]+\.';

    IF v_max_idx < 0 THEN
      RAISE NOTICE 'Skip %/%: keine items.N.* Felder', v_page, v_section;
      CONTINUE;
    END IF;

    FOR v_i IN 0..v_max_idx LOOP
      v_child_key := v_section || '_item_' || (v_i + 1);

      SELECT value INTO v_title_de FROM public.cms_section_fields
       WHERE page_key=v_page AND section_key=v_section
         AND field_key='items.'||v_i||'.title' AND locale='de';
      SELECT value INTO v_title_en FROM public.cms_section_fields
       WHERE page_key=v_page AND section_key=v_section
         AND field_key='items.'||v_i||'.title' AND locale='en';
      SELECT value INTO v_desc_de FROM public.cms_section_fields
       WHERE page_key=v_page AND section_key=v_section
         AND field_key='items.'||v_i||'.description' AND locale='de';
      SELECT value INTO v_desc_en FROM public.cms_section_fields
       WHERE page_key=v_page AND section_key=v_section
         AND field_key='items.'||v_i||'.description' AND locale='en';

      IF v_title_de IS NULL AND v_title_en IS NULL
         AND v_desc_de IS NULL AND v_desc_en IS NULL THEN
        CONTINUE;
      END IF;

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

      -- Default-Icon nur bei vorteile-Karten (anwendungen: Renderer-Fallback bleibt).
      IF v_default_icon IS NOT NULL THEN
        INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
        VALUES (v_page, v_child_key, 'icon', 'de', v_default_icon),
               (v_page, v_child_key, 'icon', 'en', v_default_icon)
        ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
      END IF;

      -- Whitelist: title, description, icon, image (alle DE+EN).
      -- image-Whitelist macht den Upload-Bereich im Admin sichtbar,
      -- ohne dass schon eine cms_assets-Row existieren muss.
      INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
      SELECT v_page, v_child_key, fk, lc, true
        FROM unnest(ARRAY['title','description','icon','image']) AS fk,
             unnest(ARRAY['de','en']) AS lc
      ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
    END LOOP;
  END LOOP;
END
$mig$;