DO $mig$
DECLARE
  _pk text := 'gebaeudekommunikation.briefkastenanlagen';
  _mont uuid; _funk uuid; _sob uuid;
  _r record;
BEGIN
  SELECT id INTO _mont FROM public.cms_sections WHERE page_key=_pk AND section_key='montageformen';
  IF _mont IS NULL THEN RAISE EXCEPTION 'montageformen missing'; END IF;

  -- ---------- 1. Neue Sections (zunächst inaktiv) ----------
  INSERT INTO public.cms_sections(page_key, section_key, section_type, sort_order, is_active, parent_section_id)
  SELECT _pk, 'montageformen__fuesse', 'card_v1', 4, false, _mont
  WHERE NOT EXISTS (SELECT 1 FROM public.cms_sections WHERE page_key=_pk AND section_key='montageformen__fuesse');

  INSERT INTO public.cms_sections(page_key, section_key, section_type, sort_order, is_active, parent_section_id)
  SELECT _pk, 'entry_funktionen', 'cards_v1', 40, false, NULL
  WHERE NOT EXISTS (SELECT 1 FROM public.cms_sections WHERE page_key=_pk AND section_key='entry_funktionen');
  SELECT id INTO _funk FROM public.cms_sections WHERE page_key=_pk AND section_key='entry_funktionen';

  INSERT INTO public.cms_sections(page_key, section_key, section_type, sort_order, is_active, parent_section_id)
  SELECT _pk, v.k, 'card_v1', v.o, false, _funk
  FROM (VALUES
    ('entry_funktionen__oberflaechen',1),
    ('entry_funktionen__verschraubung',2),
    ('entry_funktionen__beschriftung',3),
    ('entry_funktionen__vorschau',4),
    ('entry_funktionen__vorverdrahtet',5)
  ) AS v(k,o)
  WHERE NOT EXISTS (SELECT 1 FROM public.cms_sections s WHERE s.page_key=_pk AND s.section_key=v.k);

  INSERT INTO public.cms_sections(page_key, section_key, section_type, sort_order, is_active, parent_section_id)
  SELECT _pk, 'entry_cta', 'cta_v1', 50, false, NULL
  WHERE NOT EXISTS (SELECT 1 FROM public.cms_sections WHERE page_key=_pk AND section_key='entry_cta');

  INSERT INTO public.cms_sections(page_key, section_key, section_type, sort_order, is_active, parent_section_id)
  SELECT _pk, 'sortiment_bilder', 'cards_v1', 70, false, NULL
  WHERE NOT EXISTS (SELECT 1 FROM public.cms_sections WHERE page_key=_pk AND section_key='sortiment_bilder');
  SELECT id INTO _sob FROM public.cms_sections WHERE page_key=_pk AND section_key='sortiment_bilder';

  INSERT INTO public.cms_sections(page_key, section_key, section_type, sort_order, is_active, parent_section_id)
  SELECT _pk, v.k, 'card_v1', v.o, false, _sob
  FROM (VALUES
    ('sortiment_bilder__aufputz',1),
    ('sortiment_bilder__unterputz',2),
    ('sortiment_bilder__freistehend',3)
  ) AS v(k,o)
  WHERE NOT EXISTS (SELECT 1 FROM public.cms_sections s WHERE s.page_key=_pk AND s.section_key=v.k);

  -- ---------- 2. Whitelist (Admin-Pflegbarkeit), DE + EN ----------
  -- Container-Felder
  INSERT INTO public.cms_admin_editable_fields(page_key, section_key, field_key, locale, is_enabled)
  SELECT _pk, s.k, f.k, l.k, true
  FROM (VALUES ('entry_funktionen'),('sortiment_bilder')) s(k),
       (VALUES ('label'),('title'),('intro')) f(k),
       (VALUES ('de'),('en')) l(k)
  ON CONFLICT DO NOTHING;

  -- Kartenfelder (Trigger deckt icon/link_*/bullets/chips ab; hier Kopf + Medien)
  INSERT INTO public.cms_admin_editable_fields(page_key, section_key, field_key, locale, is_enabled)
  SELECT _pk, s.k, f.k, l.k, true
  FROM (VALUES
    ('montageformen__fuesse'),
    ('entry_funktionen__oberflaechen'),('entry_funktionen__verschraubung'),
    ('entry_funktionen__beschriftung'),('entry_funktionen__vorschau'),
    ('entry_funktionen__vorverdrahtet'),
    ('sortiment_bilder__aufputz'),('sortiment_bilder__unterputz'),('sortiment_bilder__freistehend')
  ) s(k),
       (VALUES ('title'),('description'),('subtitle'),('image')) f(k),
       (VALUES ('de'),('en')) l(k)
  ON CONFLICT DO NOTHING;

  -- CTA-Felder (Spiegel zum bestehenden standard_cta)
  INSERT INTO public.cms_admin_editable_fields(page_key, section_key, field_key, locale, is_enabled)
  SELECT _pk, 'entry_cta', f.k, l.k, true
  FROM (VALUES
    ('title'),('text'),
    ('cta_label'),('cta_href'),('cta_kind'),('cta_primary_color'),
    ('cta_secondary_label'),('cta_secondary_href'),('cta_secondary_kind'),('cta_secondary_color'),
    ('show_secondary'),('show_phone'),('show_email'),
    ('phone_label'),('phone_href'),('email_label'),('email_href'),
    ('background_variant'),('image')
  ) f(k), (VALUES ('de'),('en')) l(k)
  ON CONFLICT DO NOTHING;

  -- ---------- 3. Feldwerte der neuen Sections ----------
  -- Container-Köpfe
  INSERT INTO public.cms_section_fields(page_key, section_key, field_key, locale, value) VALUES
    (_pk,'entry_funktionen','label','de','Was ENTRY kann'),
    (_pk,'entry_funktionen','title','de','Fünf Eigenschaften des Systems'),
    (_pk,'sortiment_bilder','label','de','Aus dem Katalog'),
    (_pk,'sortiment_bilder','title','de','Ein Blick ins Programm')
  ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

  -- Karten: Titel + Platzhaltertext + Link aus
  INSERT INTO public.cms_section_fields(page_key, section_key, field_key, locale, value)
  SELECT _pk, v.k, 'title', 'de', v.t FROM (VALUES
    ('montageformen__fuesse','Freistehend mit seitlichen Füßen'),
    ('entry_funktionen__oberflaechen','Fünfzehn Oberflächen'),
    ('entry_funktionen__verschraubung','Ohne sichtbare Verschraubung'),
    ('entry_funktionen__beschriftung','Straßenname und Hausnummer'),
    ('entry_funktionen__vorschau','Vorher in 3D sehen'),
    ('entry_funktionen__vorverdrahtet','Ab Werk vorverdrahtet'),
    ('sortiment_bilder__aufputz','Aufputz'),
    ('sortiment_bilder__unterputz','Unterputz'),
    ('sortiment_bilder__freistehend','Freistehend')
  ) v(k,t)
  ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

  INSERT INTO public.cms_section_fields(page_key, section_key, field_key, locale, value)
  SELECT _pk, v.k, 'description', 'de', 'PLATZHALTER — Text folgt' FROM (VALUES
    ('montageformen__fuesse'),
    ('entry_funktionen__oberflaechen'),('entry_funktionen__verschraubung'),
    ('entry_funktionen__beschriftung'),('entry_funktionen__vorschau'),
    ('entry_funktionen__vorverdrahtet'),
    ('sortiment_bilder__aufputz'),('sortiment_bilder__unterputz'),('sortiment_bilder__freistehend')
  ) v(k)
  ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

  INSERT INTO public.cms_section_fields(page_key, section_key, field_key, locale, value)
  SELECT _pk, v.k, t.f, l.k, '0'
  FROM (VALUES
    ('montageformen__fuesse'),
    ('entry_funktionen__oberflaechen'),('entry_funktionen__verschraubung'),
    ('entry_funktionen__beschriftung'),('entry_funktionen__vorschau'),
    ('entry_funktionen__vorverdrahtet'),
    ('sortiment_bilder__aufputz'),('sortiment_bilder__unterputz'),('sortiment_bilder__freistehend')
  ) v(k), (VALUES ('link_1_enabled'),('link_2_enabled'),('link_3_enabled')) t(f),
     (VALUES ('de'),('en')) l(k)
  ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

  -- Lucide-Icons der ENTRY-Karten
  INSERT INTO public.cms_section_fields(page_key, section_key, field_key, locale, value)
  SELECT _pk, v.k, 'icon', 'de', v.i FROM (VALUES
    ('entry_funktionen__oberflaechen','palette'),
    ('entry_funktionen__verschraubung','shield-check'),
    ('entry_funktionen__beschriftung','type'),
    ('entry_funktionen__vorschau','box'),
    ('entry_funktionen__vorverdrahtet','plug-zap')
  ) v(k,i)
  ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

  -- entry_cta: Pflichtfelder DE, EN als Platzhalter (Renderfähigkeitsvertrag)
  INSERT INTO public.cms_section_fields(page_key, section_key, field_key, locale, value) VALUES
    (_pk,'entry_cta','title','de','Stellen Sie Ihre Anlage zusammen.'),
    (_pk,'entry_cta','text','de','PLATZHALTER — Text folgt'),
    (_pk,'entry_cta','cta_label','de','Anlage konfigurieren'),
    (_pk,'entry_cta','cta_href','de','https://www.tcsag.de/Konfiguratoren/ENTRY-LBX/'),
    (_pk,'entry_cta','cta_kind','de','extern'),
    (_pk,'entry_cta','background_variant','de','light'),
    (_pk,'entry_cta','show_secondary','de','0'),
    (_pk,'entry_cta','show_phone','de','0'),
    (_pk,'entry_cta','show_email','de','0'),
    (_pk,'entry_cta','title','en','PLATZHALTER — Text folgt'),
    (_pk,'entry_cta','cta_label','en','PLATZHALTER — Text folgt'),
    (_pk,'entry_cta','cta_href','en','https://www.tcsag.de/Konfiguratoren/ENTRY-LBX/')
  ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

  -- ---------- 4. Bestehende Kartentitel (nur DE) ----------
  PERFORM public.rpc_admin_update_section_field(_pk,'montageformen__stele','title','de','Freistehend als Stele');
  PERFORM public.rpc_admin_update_section_field(_pk,'montageformen__unterputz','title','de','Unterputz');

  -- ---------- 5. Bilder umhängen (Slot image) ----------
  -- Inputz-Motiv von __unterputz nach __inputz
  FOR _r IN SELECT * FROM public.cms_assets
             WHERE page_key=_pk AND section_key='montageformen__unterputz'
               AND field_key='image' AND is_active=true LOOP
    PERFORM public.rpc_admin_upsert_asset(_pk,'montageformen__inputz','image',
      _r.storage_path,_r.public_url,_r.file_name,_r.mime_type,coalesce(_r.asset_role,'image'),coalesce(_r.viewport,'desktop'));
    PERFORM public.rpc_admin_delete_asset(_r.id);
  END LOOP;

  -- Füße-Motiv von __stele nach __fuesse
  FOR _r IN SELECT * FROM public.cms_assets
             WHERE page_key=_pk AND section_key='montageformen__stele'
               AND field_key='image' AND is_active=true LOOP
    PERFORM public.rpc_admin_upsert_asset(_pk,'montageformen__fuesse','image',
      _r.storage_path,_r.public_url,_r.file_name,_r.mime_type,coalesce(_r.asset_role,'image'),coalesce(_r.viewport,'desktop'));
    PERFORM public.rpc_admin_delete_asset(_r.id);
  END LOOP;

  -- ---------- 6. CTA-Anpassungen an bestehenden Blöcken ----------
  -- B-3079 entry: CTA entfernen (Konfigurator wandert nach entry_cta)
  INSERT INTO public.cms_admin_editable_fields(page_key, section_key, field_key, locale, is_enabled)
  SELECT _pk, s.k, f.k, l.k, true
  FROM (VALUES ('entry'),('sortiment')) s(k), (VALUES ('cta_label'),('cta_link')) f(k), (VALUES ('de'),('en')) l(k)
  ON CONFLICT DO NOTHING;

  UPDATE public.cms_section_fields SET value='', updated_at=now()
   WHERE page_key=_pk AND section_key='entry' AND field_key IN ('cta_label','cta_link');

  -- B-3080 sortiment: CTA auf Katalog-PDF
  PERFORM public.rpc_admin_update_section_field(_pk,'sortiment','cta_label','de','Katalog herunterladen (PDF)');
  UPDATE public.cms_section_fields SET value='https://www.tcsag.de/fileadmin/user_upload/TCS_DE/Metanavigation/Downloads/Publikationen/TCS_Briefkastenanlagen.pdf', updated_at=now()
   WHERE page_key=_pk AND section_key='sortiment' AND field_key='cta_link';
  INSERT INTO public.cms_section_fields(page_key, section_key, field_key, locale, value) VALUES
    (_pk,'sortiment','cta_link','de','https://www.tcsag.de/fileadmin/user_upload/TCS_DE/Metanavigation/Downloads/Publikationen/TCS_Briefkastenanlagen.pdf')
  ON CONFLICT (page_key, section_key, field_key, locale)
  DO UPDATE SET value=EXCLUDED.value, updated_at=now();

  -- ---------- 7. Reihenfolge ----------
  UPDATE public.cms_sections s SET sort_order = v.o, updated_at=now()
  FROM (VALUES
    ('hero',10),('entry',20),('montageformen',30),('entry_funktionen',40),('entry_cta',50),
    ('sortiment',60),('sortiment_bilder',70),('skalierbarkeit',75),('smart',80),
    ('anschluss',90),('faq',100),('standard_cta',110),
    ('montageformen__aufputz',1),('montageformen__unterputz',2),('montageformen__inputz',3),
    ('montageformen__fuesse',4),('montageformen__stele',5)
  ) v(k,o)
  WHERE s.page_key=_pk AND s.section_key=v.k AND s.sort_order IS DISTINCT FROM v.o;

  PERFORM public.cms_resequence_sections_dfs(_pk);

  -- ---------- 8. Neue Sections sichtbar schalten ----------
  PERFORM public.rpc_admin_set_section_active(_pk, k, true)
  FROM (VALUES
    ('montageformen__fuesse'),('entry_funktionen'),
    ('entry_funktionen__oberflaechen'),('entry_funktionen__verschraubung'),
    ('entry_funktionen__beschriftung'),('entry_funktionen__vorschau'),
    ('entry_funktionen__vorverdrahtet'),('entry_cta'),('sortiment_bilder'),
    ('sortiment_bilder__aufputz'),('sortiment_bilder__unterputz'),('sortiment_bilder__freistehend')
  ) v(k);
END
$mig$;