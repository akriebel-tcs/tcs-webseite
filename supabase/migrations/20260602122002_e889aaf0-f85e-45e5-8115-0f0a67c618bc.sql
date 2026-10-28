-- T05-FAQ: Beispielinhalte nachziehen + standardmäßig ausblendbar.
-- Idempotent: nur Seiten, die für `faq` noch GAR keine Felder haben,
-- werden mit generischen 5×Q/A + eyebrow/headline/intro DE+EN vorbefüllt.
-- Bestehende, redaktionell gepflegte FAQs (z. B. P236, service.downloads)
-- bleiben unberührt. Im selben Schritt: is_active = false, damit der
-- Beispieltext nicht ungewollt auf der Live-Seite erscheint — Sichtbarkeit
-- wird im Admin pro Seite eingeschaltet. Whitelist-Einträge für alle
-- Felder werden gesetzt, damit der Admin sie als pflegbar anzeigt.

DO $$
DECLARE
  r RECORD;
  f RECORD;
BEGIN
  FOR r IN
    SELECT p.page_key
    FROM cms_pages p
    JOIN cms_sections s
      ON s.page_key = p.page_key
     AND s.section_type = 'faq_v1'
     AND s.section_key = 'faq'
    WHERE p.page_type = 'T05'
      AND NOT EXISTS (
        SELECT 1 FROM cms_section_fields x
        WHERE x.page_key = p.page_key AND x.section_key = 'faq'
      )
  LOOP
    FOR f IN
      SELECT * FROM (VALUES
        ('eyebrow',          'de', 'Häufige Fragen'),
        ('eyebrow',          'en', 'Frequently asked questions'),
        ('headline',         'de', 'Antworten, die weiterhelfen'),
        ('headline',         'en', 'Answers that help you forward'),
        ('intro',            'de', ''),
        ('intro',            'en', ''),

        ('items.q1.frage',   'de', 'Wie lange dauert die Planung eines Projekts?'),
        ('items.q1.frage',   'en', 'How long does project planning take?'),
        ('items.q1.antwort', 'de', 'Vom ersten Briefing bis zum verbindlichen Angebot rechnen wir mit zwei bis vier Wochen, abhängig vom Umfang und den nötigen Abstimmungen mit Architekt, Bauträger und Elektrofachkraft.'),
        ('items.q1.antwort', 'en', 'From the first briefing to a binding offer we plan with two to four weeks, depending on scope and the coordination needed with architects, developers and electricians.'),

        ('items.q2.frage',   'de', 'Welche Unterlagen brauchen Sie von mir?'),
        ('items.q2.frage',   'en', 'Which documents do you need from me?'),
        ('items.q2.antwort', 'de', 'Grundrisse, Lagepläne und – falls vorhanden – eine Bestandsdokumentation der vorhandenen Anlage. Je vollständiger die Unterlagen, desto schneller können wir ein passendes Angebot kalkulieren.'),
        ('items.q2.antwort', 'en', 'Floor plans, site plans and – if available – documentation of the existing installation. The more complete the documents, the faster we can prepare a fitting quote.'),

        ('items.q3.frage',   'de', 'Lässt sich die Lösung später erweitern?'),
        ('items.q3.frage',   'en', 'Can the solution be extended later?'),
        ('items.q3.antwort', 'de', 'Ja. Unsere Systeme sind modular aufgebaut und lassen sich Schritt für Schritt erweitern – ob zusätzliche Türstationen, neue Bewohner oder weitere Funktionen.'),
        ('items.q3.antwort', 'en', 'Yes. Our systems are modular and can be extended step by step – be it additional door stations, new residents or further features.'),

        ('items.q4.frage',   'de', 'Wer übernimmt Installation und Wartung?'),
        ('items.q4.frage',   'en', 'Who handles installation and maintenance?'),
        ('items.q4.antwort', 'de', 'Installation und Inbetriebnahme erfolgen über unser zertifiziertes Fachhandwerk. Für die Wartung bieten wir verschiedene Servicepakete an – vom punktuellen Einsatz bis zum Rundum-Vertrag.'),
        ('items.q4.antwort', 'en', 'Installation and commissioning are carried out by our certified specialist installers. For maintenance we offer different service packages – from one-off support to a full-service contract.'),

        ('items.q5.frage',   'de', 'Wie sieht es mit Datenschutz und IT-Sicherheit aus?'),
        ('items.q5.frage',   'en', 'What about data protection and IT security?'),
        ('items.q5.antwort', 'de', 'Alle Komponenten werden DSGVO-konform betrieben. Updates, Verschlüsselung und Zugriffskontrolle sind Bestandteil unserer Sicherheitsarchitektur und werden regelmäßig durch externe Tests bestätigt.'),
        ('items.q5.antwort', 'en', 'All components run in line with GDPR. Updates, encryption and access control are part of our security architecture and are regularly verified by external testing.')
      ) AS t(field_key, locale, value)
    LOOP
      INSERT INTO cms_section_fields(page_key, section_key, field_key, locale, value)
      VALUES (r.page_key, 'faq', f.field_key, f.locale, f.value)
      ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
    END LOOP;

    -- Frisch geseedete Beispiel-FAQ standardmäßig ausblenden.
    UPDATE cms_sections
       SET is_active = false, updated_at = now()
     WHERE page_key = r.page_key
       AND section_key = 'faq'
       AND is_active = true;
  END LOOP;

  -- Whitelist: alle FAQ-Felder auf T05 als pflegbar markieren.
  INSERT INTO cms_admin_editable_fields(page_key, section_key, field_key, locale, is_enabled)
  SELECT DISTINCT x.page_key, x.section_key, x.field_key, x.locale, true
  FROM cms_section_fields x
  JOIN cms_pages p ON p.page_key = x.page_key
  WHERE p.page_type = 'T05'
    AND x.section_key = 'faq'
  ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
END $$;