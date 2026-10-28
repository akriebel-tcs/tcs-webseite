-- =========================================================================
-- 1) Seitentyp-Korrektur: anwendungen.root T02 -> T03
-- =========================================================================
UPDATE cms_pages
   SET page_type = 'T03', updated_at = now()
 WHERE page_key = 'anwendungen.root'
   AND page_type = 'T02';

-- =========================================================================
-- 2) Wechselteaser -> Kartenraster auf gebaeudekommunikation.systemloesungen
-- =========================================================================

-- 2a) Neuer Kartenraster-Container (idempotent)
INSERT INTO cms_sections (page_key, section_key, section_type, sort_order, is_active)
SELECT 'gebaeudekommunikation.systemloesungen', 'loesungen_uebersicht', 'cards_v1', 35, true
WHERE NOT EXISTS (
  SELECT 1 FROM cms_sections
   WHERE page_key = 'gebaeudekommunikation.systemloesungen'
     AND section_key = 'loesungen_uebersicht'
);

-- 2b) Intro-Felder für den Container
INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT 'gebaeudekommunikation.systemloesungen', 'loesungen_uebersicht', 'title', 'de', 'Unsere Lösungen im Überblick'
WHERE NOT EXISTS (
  SELECT 1 FROM cms_section_fields
   WHERE page_key='gebaeudekommunikation.systemloesungen' AND section_key='loesungen_uebersicht'
     AND field_key='title' AND locale='de'
);
INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
SELECT 'gebaeudekommunikation.systemloesungen', 'loesungen_uebersicht', 'title', 'en', 'Our solutions at a glance'
WHERE NOT EXISTS (
  SELECT 1 FROM cms_section_fields
   WHERE page_key='gebaeudekommunikation.systemloesungen' AND section_key='loesungen_uebersicht'
     AND field_key='title' AND locale='en'
);

-- 2c) 4 Standardkarten + Felder + Assets aus alten Teasern kopieren
DO $mig$
DECLARE
  parent_uuid uuid;
  card_keys   text[] := ARRAY['card_concierge','card_feuerwehr','card_intern','card_bidi'];
  source_keys text[] := ARRAY['concierge','feuerwehr','intern','bidi'];
  i int;
  v_card_so int;
BEGIN
  SELECT id INTO parent_uuid
    FROM cms_sections
   WHERE page_key='gebaeudekommunikation.systemloesungen'
     AND section_key='loesungen_uebersicht'
   LIMIT 1;

  IF parent_uuid IS NULL THEN
    RAISE NOTICE 'Container loesungen_uebersicht nicht gefunden — überspringe Kartenerzeugung';
    RETURN;
  END IF;

  FOR i IN 1..4 LOOP
    v_card_so := i * 10;

    -- Karte anlegen (idempotent)
    INSERT INTO cms_sections (page_key, section_key, section_type, parent_section_id, sort_order, is_active)
    SELECT 'gebaeudekommunikation.systemloesungen', card_keys[i], 'card_v1', parent_uuid, v_card_so, true
    WHERE NOT EXISTS (
      SELECT 1 FROM cms_sections
       WHERE page_key='gebaeudekommunikation.systemloesungen' AND section_key=card_keys[i]
    );

    -- Felder kopieren mit Mapping headline->title, text->description, cta_link->cta_href
    INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
    SELECT 'gebaeudekommunikation.systemloesungen',
           card_keys[i],
           CASE f.field_key
             WHEN 'headline' THEN 'title'
             WHEN 'text'     THEN 'description'
             WHEN 'cta_link' THEN 'cta_href'
             ELSE f.field_key
           END,
           f.locale,
           f.value
      FROM cms_section_fields f
     WHERE f.page_key='gebaeudekommunikation.systemloesungen'
       AND f.section_key = source_keys[i]
       AND f.field_key IN ('label','headline','text','cta_label','cta_link')
       AND NOT EXISTS (
         SELECT 1 FROM cms_section_fields t
          WHERE t.page_key='gebaeudekommunikation.systemloesungen'
            AND t.section_key = card_keys[i]
            AND t.field_key = CASE f.field_key
                                WHEN 'headline' THEN 'title'
                                WHEN 'text'     THEN 'description'
                                WHEN 'cta_link' THEN 'cta_href'
                                ELSE f.field_key
                              END
            AND t.locale = f.locale
       );

    -- Bild-Assets kopieren (slot 'image')
    INSERT INTO cms_assets (page_key, section_key, asset_role, field_key, locale,
                            storage_path, public_url, alt_text_de, alt_text_en,
                            alt_de, alt_en, focal_x, focal_y, sort_order, is_active,
                            viewport, file_name, mime_type)
    SELECT 'gebaeudekommunikation.systemloesungen',
           card_keys[i],
           COALESCE(a.asset_role, 'image'),
           'image',
           a.locale,
           a.storage_path, a.public_url, a.alt_text_de, a.alt_text_en,
           a.alt_de, a.alt_en, a.focal_x, a.focal_y, a.sort_order, a.is_active,
           a.viewport, a.file_name, a.mime_type
      FROM cms_assets a
     WHERE a.page_key='gebaeudekommunikation.systemloesungen'
       AND a.section_key = source_keys[i]
       AND a.is_active = true
       AND NOT EXISTS (
         SELECT 1 FROM cms_assets t
          WHERE t.page_key='gebaeudekommunikation.systemloesungen'
            AND t.section_key = card_keys[i]
            AND t.viewport = a.viewport
            AND COALESCE(t.locale,'') = COALESCE(a.locale,'')
            AND COALESCE(t.field_key,'') = 'image'
       );
  END LOOP;
END
$mig$;

-- 2d) Alte Wechselteaser deaktivieren (nicht löschen)
UPDATE cms_sections
   SET is_active = false, updated_at = now()
 WHERE page_key='gebaeudekommunikation.systemloesungen'
   AND section_key IN ('concierge','feuerwehr','intern','bidi')
   AND is_active = true;

-- 2e) Whitelist für neue Karten-Felder
INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT 'gebaeudekommunikation.systemloesungen', sk.k, fk.k, loc.k, true
  FROM unnest(ARRAY['card_concierge','card_feuerwehr','card_intern','card_bidi']) AS sk(k)
 CROSS JOIN unnest(ARRAY['label','title','description','cta_label','cta_href']) AS fk(k)
 CROSS JOIN unnest(ARRAY['de','en']) AS loc(k)
 WHERE NOT EXISTS (
   SELECT 1 FROM cms_admin_editable_fields w
    WHERE w.page_key='gebaeudekommunikation.systemloesungen'
      AND w.section_key=sk.k AND w.field_key=fk.k AND w.locale=loc.k
 );

-- 2f) Whitelist für Container loesungen_uebersicht
INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT 'gebaeudekommunikation.systemloesungen', 'loesungen_uebersicht', fk.k, loc.k, true
  FROM unnest(ARRAY['label','title','text']) AS fk(k)
 CROSS JOIN unnest(ARRAY['de','en']) AS loc(k)
 WHERE NOT EXISTS (
   SELECT 1 FROM cms_admin_editable_fields w
    WHERE w.page_key='gebaeudekommunikation.systemloesungen'
      AND w.section_key='loesungen_uebersicht' AND w.field_key=fk.k AND w.locale=loc.k
 );

-- =========================================================================
-- 3) FAQ-Standard auf T05-Seiten: leeren faq_v1 seeden
-- =========================================================================

-- 3a) faq_v1-Container am Seitenende anhängen, sofern nicht vorhanden
INSERT INTO cms_sections (page_key, section_key, section_type, sort_order, is_active)
SELECT p.page_key,
       'faq',
       'faq_v1',
       COALESCE(
         (SELECT MAX(sort_order) FROM cms_sections s2
           WHERE s2.page_key = p.page_key AND s2.parent_section_id IS NULL),
         0
       ) + 10,
       true
  FROM cms_pages p
 WHERE p.page_type = 'T05'
   AND NOT EXISTS (
     SELECT 1 FROM cms_sections s
      WHERE s.page_key = p.page_key
        AND s.section_type = 'faq_v1'
        AND s.parent_section_id IS NULL
   );

-- 3b) Whitelist für FAQ-Container-Felder (label, title × de/en) auf allen T05
INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
SELECT p.page_key, 'faq', fk.k, loc.k, true
  FROM cms_pages p
 CROSS JOIN unnest(ARRAY['label','title']) AS fk(k)
 CROSS JOIN unnest(ARRAY['de','en']) AS loc(k)
 WHERE p.page_type = 'T05'
   AND EXISTS (
     SELECT 1 FROM cms_sections s
      WHERE s.page_key = p.page_key
        AND s.section_key = 'faq'
        AND s.section_type = 'faq_v1'
        AND s.parent_section_id IS NULL
   )
   AND NOT EXISTS (
     SELECT 1 FROM cms_admin_editable_fields w
      WHERE w.page_key = p.page_key
        AND w.section_key = 'faq'
        AND w.field_key = fk.k
        AND w.locale = loc.k
   );