DO $$
DECLARE
  v_page text;
  v_benefits_id uuid;
  v_usecases_id uuid;
  v_pages text[] := ARRAY[
    'zutrittskontrolle.elektronischer-knaufzylinder',
    'zutrittskontrolle.bcm-handsender',
    'zutrittskontrolle.funkvernetzte-offline-leser',
    'zutrittskontrolle.bcm-online-leser',
    'zutrittskontrolle.vorhaengeschloss',
    'zutrittskontrolle.biometrie'
  ];
  k int;
BEGIN
  FOREACH v_page IN ARRAY v_pages LOOP

    UPDATE cms_sections
       SET is_active = false, updated_at = now()
     WHERE page_key = v_page
       AND parent_section_id IS NULL
       AND section_key IN ('vorteile','anwendungen','produkte','intro');

    INSERT INTO cms_sections (page_key, section_key, section_type, sort_order, is_active)
    VALUES (v_page, 'benefits', 'cards_v1', 20, true)
    ON CONFLICT (page_key, section_key)
      DO UPDATE SET section_type='cards_v1', sort_order=20, is_active=true, parent_section_id=NULL, updated_at=now()
    RETURNING id INTO v_benefits_id;

    INSERT INTO cms_sections (page_key, section_key, section_type, sort_order, is_active)
    VALUES (v_page, 'useCases', 'cards_v1', 30, true)
    ON CONFLICT (page_key, section_key)
      DO UPDATE SET section_type='cards_v1', sort_order=30, is_active=true, parent_section_id=NULL, updated_at=now()
    RETURNING id INTO v_usecases_id;

    FOR k IN 1..6 LOOP
      INSERT INTO cms_sections (page_key, section_key, section_type, sort_order, is_active, parent_section_id)
      VALUES (v_page, 'benefit_'||k, 'card_v1', k*10, true, v_benefits_id)
      ON CONFLICT (page_key, section_key)
        DO UPDATE SET section_type='card_v1', sort_order=EXCLUDED.sort_order, is_active=true,
                      parent_section_id=v_benefits_id, updated_at=now();
    END LOOP;

    FOR k IN 1..7 LOOP
      INSERT INTO cms_sections (page_key, section_key, section_type, sort_order, is_active, parent_section_id)
      VALUES (v_page, 'usecase_'||k, 'card_v1', k*10, true, v_usecases_id)
      ON CONFLICT (page_key, section_key)
        DO UPDATE SET section_type='card_v1', sort_order=EXCLUDED.sort_order, is_active=true,
                      parent_section_id=v_usecases_id, updated_at=now();
    END LOOP;

    INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
    SELECT v_page, sk, fk, loc, true
      FROM (VALUES ('benefits'),('useCases')) AS s(sk)
      CROSS JOIN (VALUES ('label'),('title'),('eyebrow')) AS f(fk)
      CROSS JOIN (VALUES ('de'),('en')) AS l(loc)
    ON CONFLICT (page_key, section_key, field_key, locale)
      DO UPDATE SET is_enabled=true, updated_at=now();

    INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
    SELECT v_page, 'benefit_'||gs.n, fk, loc, true
      FROM generate_series(1,6) AS gs(n)
      CROSS JOIN (VALUES ('title'),('desc'),('icon'),('image')) AS f(fk)
      CROSS JOIN (VALUES ('de'),('en')) AS l(loc)
    ON CONFLICT (page_key, section_key, field_key, locale)
      DO UPDATE SET is_enabled=true, updated_at=now();

    INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
    SELECT v_page, 'usecase_'||gs.n, fk, loc, true
      FROM generate_series(1,7) AS gs(n)
      CROSS JOIN (VALUES ('title'),('text'),('icon'),('image')) AS f(fk)
      CROSS JOIN (VALUES ('de'),('en')) AS l(loc)
    ON CONFLICT (page_key, section_key, field_key, locale)
      DO UPDATE SET is_enabled=true, updated_at=now();

  END LOOP;
END $$;