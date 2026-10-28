
-- Pilot B-026/B-027: Default-Inhalte nur fuer leere Felder der 15 Pilotkarten setzen.
-- Idempotent: ueberschreibt KEINE bestehenden Werte.
DO $$
DECLARE
  v_page text := 'gebaeudekommunikation.tuersprechanlagen';
  v_section text;
  v_pilot text[] := ARRAY[
    'card_pak','card_pespro','card_ktu_enamen','card_ami','card_tcu_bka',
    'card_argos','card_konfig_ktu','card_entry',
    'card_isx3030','card_senso_pro','card_ip_tasta','card_tasta_7',
    'card_skyline_10','card_carus_next','card_series_h'
  ];
  v_defaults jsonb := jsonb_build_object(
    'features.0', jsonb_build_object('de','Bestehende Geräte nutzbar','en','Existing devices can be used'),
    'features.1', jsonb_build_object('de','Kein Umbau nötig','en','No conversion required'),
    'features.2', jsonb_build_object('de','DSGVO-konform','en','GDPR-compliant'),
    'features.3', jsonb_build_object('de','Schnelle Inbetriebnahme','en','Fast commissioning'),
    'features.4', jsonb_build_object('de','Skalierbar','en','Scalable'),
    'link_1_label', jsonb_build_object('de','Mehr erfahren','en','Learn more'),
    'link_1_kind',  jsonb_build_object('de','intern','en','intern'),
    'link_2_label', jsonb_build_object('de','Zum Planer','en','To the planner'),
    'link_2_kind',  jsonb_build_object('de','intern','en','intern'),
    'link_3_label', jsonb_build_object('de','Zum Konfigurator','en','To the configurator'),
    'link_3_kind',  jsonb_build_object('de','shortid','en','shortid'),
    'icon',         jsonb_build_object('de','shield-check','en','shield-check')
  );
  v_fk text;
  v_loc text;
  v_val text;
BEGIN
  FOREACH v_section IN ARRAY v_pilot LOOP
    FOR v_fk IN SELECT jsonb_object_keys(v_defaults) LOOP
      FOR v_loc IN SELECT unnest(ARRAY['de','en']) LOOP
        v_val := v_defaults -> v_fk ->> v_loc;
        IF v_val IS NULL THEN CONTINUE; END IF;
        UPDATE cms_section_fields
           SET value = v_val,
               updated_at = now()
         WHERE page_key = v_page
           AND section_key = v_section
           AND field_key = v_fk
           AND locale = v_loc
           AND (value IS NULL OR btrim(value) = '');
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
