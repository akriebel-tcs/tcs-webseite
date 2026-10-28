DO $$
DECLARE
  v_page text := 'gebaeudekommunikation.systemloesungen';
  r record;
  f record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('teaser_concierge', 2, 'right', 'default', '/anwendungen/concierge',
        'Empfang und Zufahrt','Reception and vehicle access',
        'Concierge- und Schrankenanlagen','Concierge and barrier systems',
        'Concierge- und Schrankenanlagen ansehen','View concierge and barrier systems',
        'An einem Platz laufen Türrufe, Zufahrten und Rufe von Bewohnern zusammen. Der Pförtner sieht, wer vor der Tür steht, spricht mit ihm und öffnet Tür oder Schranke. Für Wohnanlagen mit Empfang, für Gewerbeobjekte und überall dort, wo viele Zugänge an einer Stelle betreut werden.',
        'Door calls, vehicle entrances and calls from residents all come together in one place. The concierge sees who is at the door, speaks to them and opens the door or the barrier. For residential complexes with a reception desk, for commercial properties and wherever many access points are managed from one position.'),
      ('teaser_internekomm', 3, 'left', 'muted', '/anwendungen/interne-kommunikation',
        'Weniger Türgänge','Fewer trips to the door',
        'Interne Kommunikation und Türöffnerautomatik','Internal communication and automatic door release',
        'Interne Kommunikation ansehen','View internal communication',
        'Zwei oder mehr Innenstationen können miteinander sprechen, ohne den Umweg über die Tür. Die Türöffnerautomatik öffnet beim Klingeln selbsttätig, sobald sie an der Innenstation eingeschaltet ist. Rufe lassen sich auf Festnetz oder Mobiltelefon weiterleiten.',
        'Two or more indoor stations can talk to each other without going via the door. The automatic door release opens on ring, once it has been switched on at the indoor station. Calls can be forwarded to a landline or a mobile phone.'),
      ('teaser_namensverwaltung', 4, 'right', 'default', '/anwendungen/digitale-namensverwaltung',
        'Mieterwechsel','Tenant changes',
        'Digitale Namensverwaltung','Digital name management',
        'Digitale Namensverwaltung ansehen','View digital name management',
        'Namen stehen auf einem Display statt auf einem Schild. Beim Mieterwechsel werden sie zentral im Browser geändert, unabhängig davon, wo das Gebäude steht. Überklebte Namensschilder entfallen, und wer viele Objekte verwaltet, ändert sie von einem Platz aus.',
        'Names appear on a display instead of an engraved plate. When a tenant changes, they are updated centrally in the browser, no matter where the building is. Taped-over name plates are gone, and anyone managing many properties changes them from a single desk.'),
      ('teaser_durchsage', 5, 'left', 'muted', '/gebaeudekommunikation/systemloesungen/bewohnerinformation-im-sonderfall',
        'Bewohnerinformation im Sonderfall','Informing residents in special cases',
        'Durchsagefunktion','Announcement function',
        'Durchsagefunktion ansehen','View announcement function',
        'Berechtigte Personen, etwa die Feuerwehr, können Bewohner im Gefahrenfall über die Innenstation informieren. Möglich sind gespeicherte Ansagen, eine gesprochene Durchsage oder ein Signalton, gezielt an einzelne Rufzielgruppen oder an alle. Die Funktion ist eine Erweiterung der Türsprechanlage und keine Sprachalarmanlage.',
        'Authorised persons, the fire service for example, can inform residents through the indoor station in an emergency. Stored announcements, a spoken announcement or a signal tone are possible, either to selected call target groups or to everyone. The function is an extension of the door entry system and not a voice alarm system.'),
      ('teaser_bidi', 6, 'right', 'default', '/anwendungen/bidirektionale-video',
        'Barrierefreiheit','Accessibility',
        'Bidirektionale Video-Türsprechanlage','Two-way video door entry system',
        'Bidirektionale Video-Türsprechanlage ansehen','View two-way video door entry system',
        'Das Videobild läuft in beide Richtungen. Neben dem Bild von der Außenstation zur Innenstation wird auch ein Bild von der Innenstation an einen Monitor in der Außenstation übertragen. Gehörlose und schwerhörige Bewohner können sich so in Gebärdensprache verständigen oder von den Lippen lesen.',
        'The video image runs in both directions. In addition to the image from the front door station to the indoor station, an image from the indoor station is transmitted to a monitor in the front door station. Deaf and hard-of-hearing residents can communicate in sign language or read lips.')
    ) AS v(section_key, sort_order, image_position, background_variant, cta_link,
           label_de, label_en, title_de, title_en, cta_label_de, cta_label_en, text_de, text_en)
  LOOP
    INSERT INTO public.cms_sections (page_key, section_key, section_type, sort_order, is_active)
    VALUES (v_page, r.section_key, 'teaser_2col_v1', r.sort_order, true)
    ON CONFLICT (page_key, section_key) DO NOTHING;

    FOR f IN
      SELECT * FROM (VALUES
        ('label','de', r.label_de), ('label','en', r.label_en),
        ('title','de', r.title_de), ('title','en', r.title_en),
        ('text','de', r.text_de), ('text','en', r.text_en),
        ('cta_label','de', r.cta_label_de), ('cta_label','en', r.cta_label_en),
        ('cta_link','de', r.cta_link), ('cta_link','en', r.cta_link),
        ('image_position','de', r.image_position), ('image_position','en', r.image_position),
        ('background_variant','de', r.background_variant), ('background_variant','en', r.background_variant)
      ) AS x(field_key, locale, value)
    LOOP
      INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
      VALUES (v_page, r.section_key, f.field_key, f.locale, f.value)
      ON CONFLICT (page_key, section_key, field_key, locale)
      DO UPDATE SET value = EXCLUDED.value, updated_at = now();

      INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
      VALUES (v_page, r.section_key, f.field_key, f.locale, true)
      ON CONFLICT (page_key, section_key, field_key, locale)
      DO UPDATE SET is_enabled = true, updated_at = now();
    END LOOP;

    -- Bildslot als offener Bildauftrag (kein Bild, nur Alt-Text-Platzhalter)
    IF NOT EXISTS (
      SELECT 1 FROM public.cms_assets
      WHERE page_key = v_page AND section_key = r.section_key
        AND field_key = 'image' AND viewport = 'desktop'
    ) THEN
      INSERT INTO public.cms_assets (page_key, section_key, field_key, asset_role, storage_path,
                                     public_url, alt_de, alt_en, viewport, is_active)
      VALUES (v_page, r.section_key, 'image', 'image', '', NULL,
              'BILDAUFTRAG offen', 'BILDAUFTRAG offen', 'desktop', true);
    END IF;
  END LOOP;

  -- Kartenraster ausblenden (nicht löschen)
  UPDATE public.cms_sections SET is_active = false, updated_at = now()
  WHERE page_key = v_page AND section_key IN ('systemfunktionen_cards','loesungen_uebersicht');
END $$;