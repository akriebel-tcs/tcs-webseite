-- Etappe J: Karten-Hierarchie (card_v1) für Türsprechanlagen
-- Idempotent: prüft jeden Schritt vor dem Schreiben.

DO $$
DECLARE
  _page_key constant text := 'gebaeudekommunikation.tuersprechanlagen';
  _parent_id uuid;
  _child_id uuid;
  _max_sort int;
  _row record;
  _idx int;
  _card_def record;
BEGIN
  -- Tabelle aller Karten als CTE-äquivalente lokale Schleife.
  FOR _card_def IN
    SELECT * FROM (VALUES
      -- (parent_section_key, card_key, old_image_field, sort, eyebrow_de, headline_de, desc_de, eyebrow_en, headline_en, desc_en)
      ('aussenstationen','card_pes_pro','image_pesPro',0,
        'Außenstation','PES PRO','Die kompakte Außenstation für den klassischen Wohnungsbau – mit hochwertiger Video-Kamera, klarer Audio-Übertragung und robustem Gehäuse für jeden Eingang.',
        'Outdoor station','PES PRO','The compact outdoor station for classic residential construction – with a high-quality video camera, clear audio transmission and a robust housing for every entrance.'),
      ('aussenstationen','card_carus_argos','image_carusArgos',1,
        'Modulare Außenstation','CARUS ARGOS','Modular aufgebaute Außenstation mit individueller Tastenbelegung, Display und Video. Passt sich flexibel an die Architektur und die Größe der Anlage an.',
        'Modular outdoor station','CARUS ARGOS','Modular outdoor station with individual button assignment, display and video. Adapts flexibly to the architecture and the size of the system.'),
      ('aussenstationen','card_entry','image_entry',2,
        'Architektur-Außenstation','ENTRY','Maßgeschneiderte Außenstationen für repräsentative Eingangsbereiche: individuelle Größen, Materialien und Funktionen – konfigurierbar bis ins Detail.',
        'Architectural outdoor station','ENTRY','Tailor-made outdoor stations for representative entrance areas: individual sizes, materials and functions – configurable down to the smallest detail.'),
      ('aussenstationen','card_ktu','image_ktu',3,
        'Individuelle Konfiguration','KTU Konfigurator','Mit dem KTU-Konfigurator stellen Architekten und Planer die passende Außenstation aus Funktion, Material und Layout zusammen – grafisch und live.',
        'Individual configuration','KTU configurator','With the KTU configurator, architects and planners assemble the matching outdoor station from function, material and layout – graphically and live.'),
      ('innenstationen','card_tasta_pro','image_tastaPro',0,
        'Audio-Innenstation','TASTA PRO','Komfortable Freisprech-Innenstation mit klarer Audio-Übertragung, integrierter Türöffnung und smarter Bedienung – ideal für den klassischen Wohnungsbau.',
        'Audio indoor station','TASTA PRO','Comfortable hands-free indoor station with clear audio transmission, integrated door release and smart operation – ideal for classic residential construction.'),
      ('innenstationen','card_senso_pro','image_sensoPro',1,
        'Video-Innenstation','SENSO PRO','Premium-Video-Innenstation mit Farbdisplay, kapazitiven Sensortasten und hochwertiger Bildqualität – für anspruchsvolle Wohn- und Zweckbau-Projekte.',
        'Video indoor station','SENSO PRO','Premium video indoor station with colour display, capacitive sensor buttons and high-quality image quality – for demanding residential and commercial projects.'),
      ('innenstationen','card_ip_tasta','image_ipTasta',2,
        'IP-Audio-Station','IP TASTA','Audio-Innenstation für das snipdoo® IP-System – einfach per Netzwerk angebunden, plug & play in der Inbetriebnahme und voll skalierbar.',
        'IP audio station','IP TASTA','Audio indoor station for the snipdoo® IP system – simply connected via the network, plug & play during commissioning and fully scalable.'),
      ('innenstationen','card_tasta_7','image_tasta7',3,
        'Touch-Display 7"','TASTA 7','Innenstation mit großem 7-Zoll-Touch-Display für Video-Türkommunikation, Anrufliste und Bediensteuerung – intuitiv wie ein Smartphone.',
        '7" touch display','TASTA 7','Indoor station with a large 7-inch touch display for video door communication, call list and control – as intuitive as a smartphone.'),
      ('innenstationen','card_skyline_10','image_skyline10',4,
        'Smart-Home-Dashboard','SKYLINE 10 PRO','Das 10-Zoll-Dashboard vereint Türkommunikation, Smart-Home-Steuerung und Komfortfunktionen – das zentrale Bedienelement der vernetzten Wohnung.',
        'Smart home dashboard','SKYLINE 10 PRO','The 10-inch dashboard combines door communication, smart home control and comfort functions – the central operating element of the connected home.'),
      ('innenstationen','card_carus_next','image_carusNext',5,
        'Designer-Innenstation','CARUS NEXT','Hochwertige Designer-Innenstation mit Touch-Bedienung und klaren Linien – die elegante Ergänzung zu den CARUS-Außenstationen.',
        'Designer indoor station','CARUS NEXT','High-quality designer indoor station with touch operation and clean lines – the elegant complement to the CARUS outdoor stations.'),
      ('innenstationen','card_series_h','image_seriesH',6,
        'Audio-Hörer','SERIES H','Klassische Audio-Innenstation mit Hörer – die zuverlässige und kostengünstige Lösung für Bestand, Sanierung und einfache Anlagen.',
        'Audio handset','SERIES H','Classic audio indoor station with handset – the reliable and cost-effective solution for existing buildings, refurbishment and simple systems.')
    ) AS t(parent_key, card_key, old_image_field, card_sort,
           eyebrow_de, headline_de, desc_de,
           eyebrow_en, headline_en, desc_en)
  LOOP
    -- 1) Eltern-Section auflösen
    SELECT id INTO _parent_id FROM public.cms_sections
     WHERE page_key = _page_key AND section_key = _card_def.parent_key;
    IF _parent_id IS NULL THEN CONTINUE; END IF;

    -- 2) Karten-Section idempotent anlegen
    SELECT id INTO _child_id FROM public.cms_sections
     WHERE page_key = _page_key AND section_key = _card_def.card_key;

    IF _child_id IS NULL THEN
      INSERT INTO public.cms_sections
        (page_key, section_key, section_type, parent_section_id, sort_order, is_active)
      VALUES
        (_page_key, _card_def.card_key, 'card_v1', _parent_id, _card_def.card_sort, true)
      RETURNING id INTO _child_id;
    ELSE
      -- vorhandenen Datensatz an Eltern hängen (falls jemand parent gelöscht hat)
      UPDATE public.cms_sections
         SET parent_section_id = _parent_id,
             section_type = 'card_v1',
             updated_at = now()
       WHERE id = _child_id
         AND (parent_section_id IS DISTINCT FROM _parent_id
              OR section_type IS DISTINCT FROM 'card_v1');
    END IF;

    -- 3) Felder seeden (nur wenn noch nicht vorhanden — niemals überschreiben,
    --    falls ein Admin schon editiert hat)
    INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value)
    VALUES
      (_page_key, _card_def.card_key, 'eyebrow',      'de', _card_def.eyebrow_de),
      (_page_key, _card_def.card_key, 'headline',     'de', _card_def.headline_de),
      (_page_key, _card_def.card_key, 'beschreibung', 'de', _card_def.desc_de),
      (_page_key, _card_def.card_key, 'eyebrow',      'en', _card_def.eyebrow_en),
      (_page_key, _card_def.card_key, 'headline',     'en', _card_def.headline_en),
      (_page_key, _card_def.card_key, 'beschreibung', 'en', _card_def.desc_en)
    ON CONFLICT DO NOTHING;

    -- 4) Whitelist-Einträge für die Karten-Felder
    INSERT INTO public.cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
    VALUES
      (_page_key, _card_def.card_key, 'eyebrow',      'de', true),
      (_page_key, _card_def.card_key, 'headline',     'de', true),
      (_page_key, _card_def.card_key, 'beschreibung', 'de', true),
      (_page_key, _card_def.card_key, 'eyebrow',      'en', true),
      (_page_key, _card_def.card_key, 'headline',     'en', true),
      (_page_key, _card_def.card_key, 'beschreibung', 'en', true)
    ON CONFLICT DO NOTHING;

    -- 5) Bild-Asset umhängen: bestehende aktive Slots
    --    section=parent, field=image_<key> → section=card_*, field=image
    UPDATE public.cms_assets
       SET section_key = _card_def.card_key,
           field_key   = 'image',
           updated_at  = now()
     WHERE page_key = _page_key
       AND section_key = _card_def.parent_key
       AND field_key   = _card_def.old_image_field;

    -- 6) Alte items.<key>.* Whitelist-Einträge auf der Eltern-Section deaktivieren
    --    (die Daten in cms_section_fields bleiben als historische Referenz erhalten)
    UPDATE public.cms_admin_editable_fields
       SET is_enabled = false, updated_at = now()
     WHERE page_key = _page_key
       AND section_key = _card_def.parent_key
       AND field_key LIKE 'items.%'
       AND is_enabled = true;
  END LOOP;

  -- 7) Reihenfolge konsistent machen
  PERFORM public.cms_resequence_sections_dfs(_page_key);
END $$;

-- Verification (sichtbar im Migration-Log)
DO $$
DECLARE
  _cards int;
  _fields int;
  _assets int;
BEGIN
  SELECT count(*) INTO _cards FROM public.cms_sections
   WHERE page_key='gebaeudekommunikation.tuersprechanlagen' AND section_type='card_v1';
  SELECT count(*) INTO _fields FROM public.cms_section_fields
   WHERE page_key='gebaeudekommunikation.tuersprechanlagen' AND section_key LIKE 'card_%';
  SELECT count(*) INTO _assets FROM public.cms_assets
   WHERE page_key='gebaeudekommunikation.tuersprechanlagen' AND section_key LIKE 'card_%' AND field_key='image';
  RAISE NOTICE '[Etappe J] cards=% fields=% assets=%', _cards, _fields, _assets;
END $$;