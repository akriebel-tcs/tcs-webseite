DO $$
DECLARE
  cfg jsonb := $cfg$[
    {"page":"home.ueber-tcs","parent":"stats","ptype":"stats_v1","ctype":"stat_v1","items":["founded","headquarters","employees","markets"],"fields":[["value","items.{k}.value"],["label","items.{k}.label"]]},
    {"page":"home.ueber-tcs","parent":"values","ptype":"cards_v1","ctype":"card_v1","items":["system","innovation","quality","partnership"],"fields":[["title","items.{k}.title"],["description","items.{k}.text"],["icon","items.{k}.icon"]]},
    {"page":"home.ueber-tcs","parent":"businessFields","ptype":"cards_v1","ctype":"card_v1","items":["handel","international","odm","customising"],"fields":[["title","items.{k}.title"],["description","items.{k}.text"]]},
    {"page":"home.ueber-tcs","parent":"manufacturing","ptype":"cards_v1","ctype":"card_v1","items":["iso","smd","ihk","sustainability"],"fields":[["title","items.{k}.title"],["description","items.{k}.text"],["icon","items.{k}.icon"]]},
    {"page":"home.ueber-tcs","parent":"milestones","ptype":"cards_v1","ctype":"card_v1","items":["y1995","y2000","y2005","y2012","y2015","y2018","y2020","y2024","y2025"],"fields":[["subtitle","items.{k}.year"],["description","items.{k}.text"]]},
    {"page":"home.ueber-tcs","parent":"locations","ptype":"cards_v1","ctype":"card_v1","items":["genthin","triberg","international"],"fields":[["title","items.{k}.title"],["subtitle","items.{k}.location"],["description","items.{k}.text"]]},

    {"page":"home.start","parent":"stats","ptype":"stats_v1","ctype":"stat_v1","items":["experience","madeInGermany","support","technology"],"fields":[["value","items.{k}.value"],["label","items.{k}.label"]]},
    {"page":"home.start","parent":"personas","ptype":"cards_v1","ctype":"card_v1","items":["architekten","bauherren","fachhandel","fachplaner","handwerk","wohnungswirtschaft"],"fields":[["title","items.{k}.title"],["description","items.{k}.desc"]]},
    {"page":"home.start","parent":"contentBlocks","ptype":"cards_v1","ctype":"card_v1","items":["access","communication","consulting","entry","signage","solutions"],"fields":[["subtitle","items.{k}.label"],["title","items.{k}.headline"],["description","items.{k}.text"]]},

    {"page":"gebaeudekommunikation.root","parent":"anwendungsumfelder","ptype":"cards_v1","ctype":"card_v1","items":["pflege","bildung","behoerden","gross"],"fields":[["title","items.{k}.title"],["description","items.{k}.text"]]},

    {"page":"eingangssysteme.root","parent":"pillars","ptype":"cards_v1","ctype":"card_v1","items":["derEingang","herstellerGewerke","lifecycle"],"fields":[["subtitle","{k}.label"],["title","{k}.title"],["description","{k}.text"]]},
    {"page":"eingangssysteme.root","parent":"downloads","ptype":"cards_v1","ctype":"card_v1","items":["entryExpose","broschuereSonderbau","datenblattUnterputz","datenblattInputz","datenblattZubehoer"],"fields":[["title","items.{k}.label"]]},

    {"page":"karriere.root","parent":"benefits","ptype":"cards_v1","ctype":"card_v1","items":["team","innovation","balance","education"],"fields":[["title","items.{k}.title"],["description","items.{k}.desc"]]},
    {"page":"karriere.root","parent":"jobs","ptype":"cards_v1","ctype":"card_v1","items":["softwareEmbedded","productManager","customerSupport","apprenticeElectronics","workingStudent"],"fields":[["title","items.{k}"]]},

    {"page":"wissen.akademie","parent":"formate","ptype":"cards_v1","ctype":"card_v1","items":["produktschulungen","webinare","zertifizierung","vorOrt"],"fields":[["title","items.{k}.title"],["description","items.{k}.desc"]]},
    {"page":"wissen.akademie","parent":"zielgruppen","ptype":"cards_v1","ctype":"card_v1","items":["elektro","fachplaner","facility","fachhandel"],"fields":[["title","items.{k}.title"],["description","items.{k}.desc"]]},
    {"page":"wissen.akademie","parent":"partner","ptype":"cards_v1","ctype":"card_v1","items":["silber","gold","platin"],"fields":[["title","items.{k}.title"],["description","items.{k}.desc"]]}
  ]$cfg$;
  c jsonb; fld jsonb;
  item text;
  parent_id uuid; child_key text;
  newf text; legacy text;
  pk text; psec text; ptype text; ctype text;
  next_sort int;
BEGIN
  FOR c IN SELECT * FROM jsonb_array_elements(cfg) LOOP
    pk    := c->>'page';
    psec  := c->>'parent';
    ptype := c->>'ptype';
    ctype := c->>'ctype';

    UPDATE cms_sections
       SET section_type = ptype, updated_at = now()
     WHERE page_key = pk AND section_key = psec AND section_type <> ptype;

    SELECT id INTO parent_id FROM cms_sections WHERE page_key = pk AND section_key = psec;
    IF parent_id IS NULL THEN CONTINUE; END IF;

    next_sort := 10;
    FOR item IN SELECT jsonb_array_elements_text(c->'items') LOOP
      child_key := psec || '_item_' || item;

      INSERT INTO cms_sections (page_key, section_key, section_type, sort_order, is_active, parent_section_id)
      SELECT pk, child_key, ctype, next_sort, true, parent_id
      WHERE NOT EXISTS (
        SELECT 1 FROM cms_sections WHERE page_key = pk AND section_key = child_key
      );

      FOR fld IN SELECT * FROM jsonb_array_elements(c->'fields') LOOP
        newf   := fld->>0;
        legacy := replace(fld->>1, '{k}', item);

        INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value)
        SELECT pk, child_key, newf, sf.locale, sf.value
          FROM cms_section_fields sf
         WHERE sf.page_key = pk AND sf.section_key = psec AND sf.field_key = legacy
           AND NOT EXISTS (
             SELECT 1 FROM cms_section_fields ex
              WHERE ex.page_key = pk AND ex.section_key = child_key
                AND ex.field_key = newf AND ex.locale = sf.locale
           );

        INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
        SELECT pk, child_key, newf, l, true
          FROM (VALUES ('de'),('en')) AS x(l)
         WHERE NOT EXISTS (
           SELECT 1 FROM cms_admin_editable_fields ae
            WHERE ae.page_key = pk AND ae.section_key = child_key
              AND ae.field_key = newf AND ae.locale = x.l
         );
      END LOOP;

      next_sort := next_sort + 10;
    END LOOP;
  END LOOP;
END $$;