DO $$
DECLARE
  _pk text := 'gebaeudekommunikation.systemloesungen';
  _sk text := 'faq';
  r record;
BEGIN
  -- 1) Inhalte (DE/EN) im Feldschema des funktionierenden FAQ-Blocks B-2210
  FOR r IN
    SELECT * FROM (VALUES
      ('eyebrow','de','FAQ'),
      ('eyebrow','en','FAQ'),
      ('headline','de','Häufige Fragen'),
      ('headline','en','Frequently asked questions'),
      ('intro','de',''),
      ('intro','en',''),
      ('items.q1.enabled','de','1'),
      ('items.q1.enabled','en','1'),
      ('items.q1.frage','de','Erfüllt die Durchsagefunktion die Anforderungen der Muster-Hochhaus-Richtlinie?'),
      ('items.q1.frage','en','Does the announcement function meet the requirements of the German model high-rise directive?'),
      ('items.q1.antwort','de','Abschnitt 6.4.3 der Muster-Hochhaus-Richtlinie verlangt für Hochhäuser Alarmierungs- und Lautsprecheranlagen, mit denen im Gefahrenfall Personen alarmiert und Anweisungen erteilt werden können. Diese Anforderung kann eine TCS-Türsprechanlage mit Durchsagefunktion erfüllen, je nach Auslegung über die Feuerwehr-Durchsageeinheit oder über eine Außenstation der Serie AD6. Ob sie im Einzelfall geeignet ist, entscheidet das Brandschutzkonzept in Abstimmung mit der örtlich zuständigen Feuerwehr. Die weiteren Anforderungen des Abschnitts 6.4, etwa an die Brandmeldeanlage oder die Brandfallsteuerung der Aufzüge, betreffen andere Gewerke. Die Muster-Hochhaus-Richtlinie ist die bundesweite Vorlage; maßgeblich sind die jeweilige Landesbauordnung und die dort eingeführten Technischen Baubestimmungen.'),
      ('items.q1.antwort','en','Section 6.4.3 of the German model high-rise directive requires alarm and loudspeaker systems that allow people to be alerted and given instructions in an emergency. A TCS door intercom system with announcement function can meet this requirement, depending on the design either through the fire service announcement unit or through an AD6 series front door station. Whether it is suitable in an individual case is decided by the fire protection concept in consultation with the locally responsible fire service. The other requirements of section 6.4, such as those for the fire alarm system or the lift fire control, concern other trades. The model directive is the nationwide template; what applies is the building code of the individual federal state and the technical building regulations introduced there.'),
      ('items.q2.enabled','de','1'),
      ('items.q2.enabled','en','1'),
      ('items.q2.frage','de','Ersetzt die Anlage eine Sprachalarmanlage?'),
      ('items.q2.frage','en','Does the system replace a voice alarm system?'),
      ('items.q2.antwort','de','Nein. Die Anlage ist keine Sprachalarmanlage und kein elektroakustisches Notfallwarnsystem. Sie erfüllt die Normen DIN EN 60849, DIN 14675, EN 54 und DIN VDE 0833 nicht und darf weder als Ersatz für eine Sprachalarmanlage noch als deren Bestandteil an eine Brandmeldeanlage angebunden werden. Wo eine Sprachalarmanlage gefordert ist, wird sie zusätzlich geplant.'),
      ('items.q2.antwort','en','No. The system is neither a voice alarm system nor an electroacoustic emergency warning system. It does not comply with DIN EN 60849, DIN 14675, EN 54 or DIN VDE 0833, and it must not be used as a replacement for a voice alarm system or connected to a fire alarm system as part of one. Where a voice alarm system is required, it is planned in addition.'),
      ('items.q3.enabled','de','1'),
      ('items.q3.enabled','en','1'),
      ('items.q3.frage','de','Welche Voraussetzungen hat die Nachrüstung?'),
      ('items.q3.frage','en','What are the requirements for retrofitting?'),
      ('items.q3.antwort','de','Die Durchsagefunktion ist eine Erweiterung, keine Standardausstattung. Vorhandene Anlagen brauchen durchsagefähige Innenstationen; welche Verdrahtung erforderlich ist, hängt vom Gerät ab. Planung, Montageorte und die Festlegung der Rufzielgruppen erfolgen in Abstimmung mit der örtlich zuständigen Feuerwehr und richten sich nach dem Brandschutzkonzept.'),
      ('items.q3.antwort','en','The announcement function is an extension, not standard equipment. Existing systems require indoor stations that support announcements; the wiring needed depends on the device. Planning, mounting locations and the definition of call target groups are agreed with the locally responsible fire service and follow the building''s fire protection concept.')
    ) AS v(field_key, locale, value)
  LOOP
    INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
    VALUES (_pk, _sk, r.field_key, r.locale, r.value)
    ON CONFLICT (page_key, section_key, field_key, locale)
      DO UPDATE SET value = EXCLUDED.value, updated_at = now();

    INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
    VALUES (_pk, _sk, r.field_key, r.locale, true)
    ON CONFLICT (page_key, section_key, field_key, locale)
      DO UPDATE SET is_enabled = true, updated_at = now();
  END LOOP;

  -- 2) leere Alt-Platzhalter im abweichenden q/a-Schema entfernen (nur wenn leer)
  DELETE FROM public.cms_section_fields
   WHERE page_key = _pk AND section_key = _sk
     AND field_key ~ '^items\.q[0-9]+\.(q|a)$'
     AND coalesce(btrim(value), '') = '';

  -- 3) Block sichtbar schalten
  UPDATE public.cms_sections
     SET is_active = true, updated_at = now()
   WHERE page_key = _pk AND section_key = _sk;
END $$;