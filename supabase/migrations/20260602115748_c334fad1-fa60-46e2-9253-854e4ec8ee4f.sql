
DO $$
DECLARE
  r RECORD;
  next_order INTEGER;
  faq_target_types CONSTANT TEXT[] := ARRAY['T03','T04'];
  cta_target_types CONSTANT TEXT[] := ARRAY['T02','T03','T04','T05','T17','T19'];
BEGIN
  -- ============================================================
  -- FAQ-Slot (section_key = 'faq', section_type = 'faq_v1')
  -- ============================================================
  FOR r IN
    SELECT p.page_key
      FROM cms_pages p
      WHERE p.page_type = ANY(faq_target_types)
        AND p.is_active = true
        AND p.status = 'published'
        AND NOT EXISTS (
          SELECT 1 FROM cms_sections s
          WHERE s.page_key = p.page_key AND s.section_type = 'faq_v1'
        )
  LOOP
    SELECT COALESCE(MAX(sort_order), 0) + 10 INTO next_order
      FROM cms_sections WHERE page_key = r.page_key;

    INSERT INTO cms_sections (page_key, section_key, section_type, sort_order, is_active)
    VALUES (r.page_key, 'faq', 'faq_v1', next_order, false);

    INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value) VALUES
      (r.page_key,'faq','eyebrow','de','FAQ'),
      (r.page_key,'faq','eyebrow','en','FAQ'),
      (r.page_key,'faq','headline','de','Häufige Fragen'),
      (r.page_key,'faq','headline','en','Frequently asked questions'),
      (r.page_key,'faq','intro','de','Antworten auf die häufigsten Fragen zu diesem Thema. Passe die Fragen und Antworten im Admin an deine Seite an.'),
      (r.page_key,'faq','intro','en','Answers to the most common questions on this topic. Edit the questions and answers in the admin to match your page.'),
      (r.page_key,'faq','items.q1.q','de','Platzhalter: Welche Frage stellen Kunden hier am häufigsten?'),
      (r.page_key,'faq','items.q1.q','en','Placeholder: What is the most common question customers ask here?'),
      (r.page_key,'faq','items.q1.a','de','Platzhalter-Antwort 1. Ersetze diesen Text mit der echten Antwort auf die erste Frage.'),
      (r.page_key,'faq','items.q1.a','en','Placeholder answer 1. Replace this text with the real answer to the first question.'),
      (r.page_key,'faq','items.q2.q','de','Platzhalter: Welche Frage betrifft Funktion oder Einsatz?'),
      (r.page_key,'faq','items.q2.q','en','Placeholder: Which question is about function or use case?'),
      (r.page_key,'faq','items.q2.a','de','Platzhalter-Antwort 2. Beschreibe hier kurz die Funktion oder den typischen Einsatz.'),
      (r.page_key,'faq','items.q2.a','en','Placeholder answer 2. Briefly describe the function or typical use case here.'),
      (r.page_key,'faq','items.q3.q','de','Platzhalter: Welche Frage betrifft Kompatibilität oder Voraussetzungen?'),
      (r.page_key,'faq','items.q3.q','en','Placeholder: Which question is about compatibility or prerequisites?'),
      (r.page_key,'faq','items.q3.a','de','Platzhalter-Antwort 3. Nenne Kompatibilitäten, Voraussetzungen oder technische Eckdaten.'),
      (r.page_key,'faq','items.q3.a','en','Placeholder answer 3. List compatibilities, prerequisites or technical key facts.'),
      (r.page_key,'faq','items.q4.q','de','Platzhalter: Welche Frage betrifft Service, Garantie oder Bestellung?'),
      (r.page_key,'faq','items.q4.q','en','Placeholder: Which question is about service, warranty or ordering?'),
      (r.page_key,'faq','items.q4.a','de','Platzhalter-Antwort 4. Erkläre kurz Service, Garantie oder den Bestellweg.'),
      (r.page_key,'faq','items.q4.a','en','Placeholder answer 4. Briefly explain service, warranty or how to order.'),
      (r.page_key,'faq','items.q5.q','de','Platzhalter: Welche Frage hilft bei der Entscheidung?'),
      (r.page_key,'faq','items.q5.q','en','Placeholder: Which question helps the decision?'),
      (r.page_key,'faq','items.q5.a','de','Platzhalter-Antwort 5. Fasse den Mehrwert oder den nächsten Schritt zusammen.'),
      (r.page_key,'faq','items.q5.a','en','Placeholder answer 5. Summarise the value or the next step.')
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- ============================================================
  -- Projekt-CTA-Slot (section_key = 'standard_cta', section_type = 'cta_v1')
  -- ============================================================
  FOR r IN
    SELECT p.page_key
      FROM cms_pages p
      WHERE p.page_type = ANY(cta_target_types)
        AND p.is_active = true
        AND p.status = 'published'
        AND NOT EXISTS (
          SELECT 1 FROM cms_sections s
          WHERE s.page_key = p.page_key AND s.section_type = 'cta_v1'
        )
  LOOP
    SELECT COALESCE(MAX(sort_order), 0) + 10 INTO next_order
      FROM cms_sections WHERE page_key = r.page_key;

    INSERT INTO cms_sections (page_key, section_key, section_type, sort_order, is_active)
    VALUES (r.page_key, 'standard_cta', 'cta_v1', next_order, false);

    INSERT INTO cms_section_fields (page_key, section_key, field_key, locale, value) VALUES
      (r.page_key,'standard_cta','title','de','Lassen Sie uns Ihr Projekt gemeinsam planen'),
      (r.page_key,'standard_cta','title','en','Let''s plan your project together'),
      (r.page_key,'standard_cta','text','de','Kontaktieren Sie unsere Experten für eine individuelle Projektberatung.'),
      (r.page_key,'standard_cta','text','en','Contact our experts for a tailored project consultation.'),
      (r.page_key,'standard_cta','cta_label','de','Projektberatung vereinbaren'),
      (r.page_key,'standard_cta','cta_label','en','Schedule a project consultation'),
      (r.page_key,'standard_cta','cta_href','de','/kontakt'),
      (r.page_key,'standard_cta','cta_href','en','/contact')
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- ============================================================
  -- Whitelist (cms_admin_editable_fields) für alle neuen Felder
  -- ============================================================
  INSERT INTO cms_admin_editable_fields (page_key, section_key, field_key, locale, is_enabled)
  SELECT f.page_key, f.section_key, f.field_key, f.locale, true
    FROM cms_section_fields f
    JOIN cms_sections s
      ON s.page_key = f.page_key AND s.section_key = f.section_key
    WHERE (s.section_type = 'faq_v1'  AND f.section_key = 'faq')
       OR (s.section_type = 'cta_v1'  AND f.section_key = 'standard_cta')
  ON CONFLICT DO NOTHING;
END $$;
