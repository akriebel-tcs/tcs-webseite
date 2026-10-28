-- Tranche 7e: personas.wohnungswirtschaft — cards_v1/stat_v1 Kindsections
-- Idempotent. Bestehende Werte werden nicht überschritten, Legacy-Felder bleiben.
-- Scope: NUR personas.wohnungswirtschaft, NUR stats/highlights/solutions.
-- detailSections (Sonderstruktur) wird hier NICHT migriert.

DO $$
DECLARE
  cfg jsonb := '[
    {"page":"personas.wohnungswirtschaft","sec":"stats","child":"stat_v1","fields":[["value","value"],["label","label"]]},
    {"page":"personas.wohnungswirtschaft","sec":"highlights","child":"card_v1","fields":[["title","title"],["desc","description"]]},
    {"page":"personas.wohnungswirtschaft","sec":"solutions","child":"card_v1","fields":[["headline","headline"],["label","label"],["text","text"]]}
  ]'::jsonb;
  entry jsonb;
  page_k text;
  sec_k text;
  child_type text;
  parent_type text;
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
BEGIN
  FOR entry IN SELECT * FROM jsonb_array_elements(cfg) LOOP
    page_k := entry->>'page';
    sec_k := entry->>'sec';
    child_type := entry->>'child';
    parent_type := CASE WHEN child_type='stat_v1' THEN 'stats_v1' ELSE 'cards_v1' END;

    SELECT id INTO parent_id
    FROM cms_sections
    WHERE page_key=page_k AND section_key=sec_k;
    IF parent_id IS NULL THEN CONTINUE; END IF;

    UPDATE cms_sections
       SET section_type=parent_type
     WHERE id=parent_id AND section_type<>parent_type;

    SELECT array_agg(DISTINCT split_part(field_key, '.', 2) ORDER BY split_part(field_key, '.', 2))
      INTO item_keys
      FROM cms_section_fields
     WHERE page_key=page_k
       AND section_key=sec_k
       AND locale='de'
       AND field_key LIKE 'items.%.%';

    IF item_keys IS NULL OR array_length(item_keys,1) IS NULL THEN CONTINUE; END IF;

    next_sort := 10;
    FOREACH item_key IN ARRAY item_keys LOOP
      child_key := sec_k || '_item_' || item_key;

      INSERT INTO cms_sections (page_key, section_key, section_type, parent_section_id, sort_order, is_active)
      VALUES (page_k, child_key, child_type, parent_id, next_sort, true)
      ON CONFLICT (page_key, section_key) DO NOTHING;

      FOR fld_pair IN SELECT * FROM jsonb_array_elements(entry->'fields') LOOP
        legacy_name := fld_pair->>0;
        new_name := fld_pair->>1;

        FOREACH loc IN ARRAY ARRAY['de','en'] LOOP
          SELECT value INTO val
            FROM cms_section_fields
           WHERE page_key=page_k
             AND section_key=sec_k
             AND field_key='items.'||item_key||'.'||legacy_name
             AND locale=loc;

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