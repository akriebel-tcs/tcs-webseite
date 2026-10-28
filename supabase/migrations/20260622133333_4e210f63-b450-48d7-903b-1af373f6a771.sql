DO $$
DECLARE
  schule_keys text[] := ARRAY[
    'einrichtung_schule','anforderungen_schule',
    'anf_schule_zutritt','anf_schule_video','anf_schule_intern','anf_schule_notruf','anf_schule_wege','anf_schule_info',
    'leistungen_schule_sicherheit','leist_schule_sicherheit_0','leist_schule_sicherheit_1','leist_schule_sicherheit_2','leist_schule_sicherheit_3',
    'leistungen_schule_kommunikation','leist_schule_kommunikation_0','leist_schule_kommunikation_1','leist_schule_kommunikation_2','leist_schule_kommunikation_link_p071',
    'leistungen_schule_orientierung','leist_schule_orientierung_0','leist_schule_orientierung_1','leist_schule_orientierung_2',
    'broschure_schule'
  ];
BEGIN
  -- 1) Sections umhängen (parent_section_id bleibt, weil Eltern-Container mitwandern)
  UPDATE public.cms_sections
     SET page_key='anwendungen.schule'
   WHERE page_key='anwendungen.bildungseinrichtungen'
     AND section_key = ANY(schule_keys);

  -- 2) Felder mitnehmen
  UPDATE public.cms_section_fields
     SET page_key='anwendungen.schule'
   WHERE page_key='anwendungen.bildungseinrichtungen'
     AND section_key = ANY(schule_keys);

  -- 3) Assets mitnehmen
  UPDATE public.cms_assets
     SET page_key='anwendungen.schule'
   WHERE page_key='anwendungen.bildungseinrichtungen'
     AND section_key = ANY(schule_keys);

  -- 4) Neue Sortierung auf der Zielseite (nur Top-Level)
  UPDATE public.cms_sections
     SET sort_order = CASE section_key
       WHEN 'hero' THEN 10
       WHEN 'content' THEN 20
       WHEN 'einrichtung_schule' THEN 30
       WHEN 'anforderungen_schule' THEN 40
       WHEN 'leistungen_schule_sicherheit' THEN 50
       WHEN 'leistungen_schule_kommunikation' THEN 60
       WHEN 'leistungen_schule_orientierung' THEN 70
       WHEN 'systembausteine' THEN 80
       WHEN 'broschure_schule' THEN 90
       WHEN 'faq' THEN 100
       WHEN 'standard_cta' THEN 110
       ELSE sort_order
     END
   WHERE page_key='anwendungen.schule' AND parent_section_id IS NULL;

  -- 5) Konflikt-Sektionen deaktivieren (idempotent)
  UPDATE public.cms_sections
     SET is_active=false
   WHERE page_key='anwendungen.schule'
     AND section_key IN ('anforderungen','leistungen','broschure_kita')
     AND parent_section_id IS NULL;
END $$;