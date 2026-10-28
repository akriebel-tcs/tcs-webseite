-- Tranche 7b: Personas Standardseiten — cards_v1/stat_v1 Kindsections
-- Idempotent. Bestehende Werte werden nicht überschritten, Legacy `items.*`-Felder
-- bleiben erhalten. Whitelist DE+EN wird für alle neuen Kindsection-Felder gesetzt.
-- Scope: 5 aktive Standard-Personas (architekt, bauherr, fachhandel, fachplaner,
-- handwerk). NICHT betroffen: architekt.kopie (archived), wohnungswirtschaft
-- (detailSections-Sonderfall, eigene Tranche), hero/cta/solution_teaser_*.

DO $$
DECLARE
  cfg jsonb := '[
    {"page":"personas.architekt","sec":"stats","child":"stat_v1","fields":[["value","value"],["label","label"]]},
    {"page":"personas.architekt","sec":"highlights","child":"card_v1","fields":[["title","title"],["desc","description"]]},
    {"page":"personas.architekt","sec":"solutions","child":"card_v1","fields":[["headline","headline"],["label","label"],["text","text"]]},
    {"page":"personas.architekt","sec":"cases","child":"card_v1","fields":[["title","title"],["desc","description"]]},

    {"page":"personas.bauherr","sec":"stats","child":"stat_v1","fields":[["value","value"],["label","label"]]},
    {"page":"personas.bauherr","sec":"highlights","child":"card_v1","fields":[["title","title"],["desc","description"]]},
    {"page":"personas.bauherr","sec":"solutions","child":"card_v1","fields":[["headline","headline"],["label","label"],["text","text"]]},
    {"page":"personas.bauherr","sec":"cases","child":"card_v1","fields":[["title","title"],["desc","description"]]},

    {"page":"personas.fachhandel","sec":"stats","child":"stat_v1","fields":[["value","value"],["label","label"]]},
    {"page":"personas.fachhandel","sec":"highlights","child":"card_v1","fields":[["title","title"],["desc","description"]]},
    {"page":"personas.fachhandel","sec":"solutions","child":"card_v1","fields":[["headline","headline"],["label","label"],["text","text"]]},
    {"page":"personas.fachhandel","sec":"partnerServices","child":"card_v1","fields":[["title","title"],["desc","description"]]},

    {"page":"personas.fachplaner","sec":"stats","child":"stat_v1","fields":[["value","value"],["label","label"]]},
    {"page":"personas.fachplaner","sec":"highlights","child":"card_v1","fields":[["title","title"],["desc","description"]]},
    {"page":"personas.fachplaner","sec":"solutions","child":"card_v1","fields":[["headline","headline"],["label","label"],["text","text"]]},
    {"page":"personas.fachplaner","sec":"tools","child":"card_v1","fields":[["title","title"],["desc","description"]]},

    {"page":"personas.handwerk","sec":"stats","child":"stat_v1","fields":[["value","value"],["label","label"]]},
    {"page":"personas.handwerk","sec":"highlights","child":"card_v1","fields":[["title","title"],["desc","description"]]},
    {"page":"personas.handwerk","sec":"solutions","child":"card_v1","fields":[["headline","headline"],["label","label"],["text","text"]]},
    {"page":"personas.handwerk","sec":"tips","child":"card_v1","fields":[["title","title"],["desc","description"]]}
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

    -- Parent-Sectiontype auf das passende Container-Schema anheben
    UPDATE cms_sections
       SET section_type=parent_type
     WHERE id=parent_id AND section_type<>parent_type;

    -- Distinct Item-Keys aus Legacy-`items.<key>.<sub>`-Feldern (locale=de)
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

      -- Kind-Section anlegen (idempotent)
      INSERT INTO cms_sections (page_key, section_key, section_type, parent_section_id, sort_order, is_active)
      VALUES (page_k, child_key, child_type, parent_id, next_sort, true)
      ON CONFLICT (page_key, section_key) DO NOTHING;

      -- Felder + Whitelist je (legacy_name → new_name) × (de,en)
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