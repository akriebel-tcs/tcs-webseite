-- Tranche 7c: Service-Hub Klasse-D → cards_v1 / card_v1
-- Idempotent. Bestehende Werte werden nicht überschrieben, Legacy `items.*`-/Flat-Felder
-- bleiben erhalten. Whitelist DE+EN für neue Kindsection-Felder.
-- Scope: 4 Service-Seiten, ausgewählte Listen-Sections (siehe cfg).
-- NICHT betroffen: faq (faq_v1, eigener Renderer), hero/cta/ansprechpartner,
-- dokumente/glossar (keine Karten), anlagenplaner/hoai (Detailblöcke).

DO $$
DECLARE
  cfg jsonb := '[
    {"page":"service.downloads","sec":"quickLinks","items_prefix":false,"fields":[["label","title"],["desc","description"],["icon","icon"]]},
    {"page":"service.downloads","sec":"rma","items_prefix":true,"fields":[["title","title"],["text","description"],["icon","icon"],["button","cta_label"]]},
    {"page":"service.downloads","sec":"bestellung","items_prefix":true,"fields":[["label","title"],["desc","description"],["icon","icon"]]},
    {"page":"service.downloads","sec":"akademie","items_prefix":true,"fields":[["label","title"],["desc","description"],["icon","icon"]]},

    {"page":"service.technischer-support","sec":"channels","items_prefix":true,"fields":[["label","title"],["desc","description"],["icon","icon"],["detail","subtitle"]]},
    {"page":"service.technischer-support","sec":"rma","items_prefix":true,"fields":[["title","title"],["text","description"],["icon","icon"],["button","cta_label"]]},
    {"page":"service.technischer-support","sec":"ersatzteile","items_prefix":true,"fields":[["title","title"],["text","description"],["icon","icon"],["button","cta_label"]]},

    {"page":"service.planen-konfigurieren","sec":"planungsdaten","items_prefix":true,"fields":[["title","title"],["text","description"]]},
    {"page":"service.planen-konfigurieren","sec":"konfiguratoren","items_prefix":true,"fields":[["title","title"],["text","description"]]},
    {"page":"service.planen-konfigurieren","sec":"shops","items_prefix":true,"fields":[["title","title"],["text","description"]]},
    {"page":"service.planen-konfigurieren","sec":"bestellwege","items_prefix":true,"fields":[["title","title"],["text","description"],["badge","subtitle"]]},
    {"page":"service.planen-konfigurieren","sec":"ausschreibung","items_prefix":true,"fields":[["title","title"],["text","description"]]},

    {"page":"service.ersatzteile","sec":"ersatzteile","items_prefix":true,"fields":[["title","title"],["desc","description"]]},
    {"page":"service.ersatzteile","sec":"vorteile","items_prefix":true,"fields":[["title","title"],["desc","description"]]}
  ]'::jsonb;
  entry jsonb;
  page_k text;
  sec_k text;
  items_prefix bool;
  parent_id uuid;
  item_keys text[];
  item_key text;
  child_key text;
  next_sort int;
  fld_pair jsonb;
  legacy_name text;
  new_name text;
  loc text;
  val text;
  pattern text;
BEGIN
  FOR entry IN SELECT * FROM jsonb_array_elements(cfg) LOOP
    page_k := entry->>'page';
    sec_k := entry->>'sec';
    items_prefix := COALESCE((entry->>'items_prefix')::bool, true);

    SELECT id INTO parent_id
    FROM cms_sections
    WHERE page_key=page_k AND section_key=sec_k;
    IF parent_id IS NULL THEN CONTINUE; END IF;

    -- Parent auf cards_v1 anheben
    UPDATE cms_sections
       SET section_type='cards_v1'
     WHERE id=parent_id AND section_type<>'cards_v1';

    -- Distinct Item-Keys aus Legacy-Feldern (locale=de)
    IF items_prefix THEN
      pattern := 'items.%.%';
      SELECT array_agg(DISTINCT split_part(field_key, '.', 2) ORDER BY split_part(field_key, '.', 2))
        INTO item_keys
        FROM cms_section_fields
       WHERE page_key=page_k AND section_key=sec_k AND locale='de'
         AND field_key LIKE pattern;
    ELSE
      -- Flat: <key>.<sub>; nur 2-teilige Keys mit bekannten Sub-Feldern berücksichtigen
      SELECT array_agg(DISTINCT split_part(field_key, '.', 1) ORDER BY split_part(field_key, '.', 1))
        INTO item_keys
        FROM cms_section_fields
       WHERE page_key=page_k AND section_key=sec_k AND locale='de'
         AND field_key ~ '^[^.]+\.[^.]+$'
         AND split_part(field_key, '.', 2) IN ('label','desc','icon','title','text','button','detail','badge');
    END IF;

    IF item_keys IS NULL OR array_length(item_keys,1) IS NULL THEN CONTINUE; END IF;

    next_sort := 10;
    FOREACH item_key IN ARRAY item_keys LOOP
      child_key := sec_k || '_item_' || item_key;

      INSERT INTO cms_sections (page_key, section_key, section_type, parent_section_id, sort_order, is_active)
      VALUES (page_k, child_key, 'card_v1', parent_id, next_sort, true)
      ON CONFLICT (page_key, section_key) DO NOTHING;

      FOR fld_pair IN SELECT * FROM jsonb_array_elements(entry->'fields') LOOP
        legacy_name := fld_pair->>0;
        new_name := fld_pair->>1;

        FOREACH loc IN ARRAY ARRAY['de','en'] LOOP
          SELECT value INTO val
            FROM cms_section_fields
           WHERE page_key=page_k AND section_key=sec_k AND locale=loc
             AND field_key = CASE WHEN items_prefix
                                  THEN 'items.'||item_key||'.'||legacy_name
                                  ELSE item_key||'.'||legacy_name
                             END;

          IF val IS NOT NULL AND val <> '' THEN
            INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
            VALUES (page_k, child_key, new_name, loc, val)
            ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
          END IF;

          INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
          VALUES (page_k, child_key, new_name, loc, true)
          ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE SET is_enabled=true;
        END LOOP;
      END LOOP;

      next_sort := next_sort + 10;
    END LOOP;
  END LOOP;
END $$;