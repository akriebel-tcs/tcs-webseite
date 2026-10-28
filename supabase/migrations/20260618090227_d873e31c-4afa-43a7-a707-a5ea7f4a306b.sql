-- Batch 54 — Globaler Konsistenz-Batch (Section-Render, FAQ-CTA-Vertrag, Move-Reste)
-- Reproduziert die am 18.06.2026 direkt in die Live-DB geschriebenen Kita-FAQ-Inhalte
-- und schließt die Whitelist-Lücken für faq + standard_cta + broschure_* auf den
-- neuen T05-Seiten (P-266 Kita, P-267 Schule, P-268 Wohnheim).
--
-- Idempotent:
--   * Kita-FAQ-Inhalte: INSERT … ON CONFLICT DO NOTHING (keine Überschreibung).
--   * Whitelist: INSERT … ON CONFLICT DO UPDATE SET is_enabled=true.

-- ========== Kita FAQ-Inhalte (Reproduktion, ohne Überschreibung) ==========
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'eyebrow', 'de', 'Häufige Fragen') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'eyebrow', 'en', 'Frequently asked questions') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'headline', 'de', 'Antworten, die weiterhelfen') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'headline', 'en', 'Answers that help you forward') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q1.frage', 'de', 'Wie stellen wir sicher, dass nur abholberechtigte Personen hereinkommen?') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q1.frage', 'en', 'How do we make sure only authorised pick-up persons enter the building?') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q1.antwort', 'de', E'So stellen wir sicher, dass nur abholberechtigte Personen ins Haus kommen:\n\n• Besucher klingeln am Eingang – die Tür bleibt zunächst verschlossen.\n• Das Personal sieht und spricht den Besucher per Video-Innenstation aus dem Gruppenraum.\n• Erst nach eindeutiger Identifikation wird die Tür gezielt geöffnet.\n• Wechselnde Abholpersonen lassen sich vorab im Team kommunizieren – die Türöffnung bleibt immer eine bewusste Handlung.') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q1.antwort', 'en', E'This is how we make sure only authorised pick-up persons enter the building:\n\n• Visitors ring at the entrance – the door stays locked at first.\n• Staff see and speak with them via the video indoor station from the group room.\n• Only after clear identification is the door released deliberately.\n• Changing pick-up persons can be communicated within the team in advance – opening the door always stays a conscious action.') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q1.enabled', 'de', '1') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q1.enabled', 'en', '1') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q1.cta_label', 'de', 'Beratung anfragen') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q1.cta_label', 'en', 'Request a consultation') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q1.cta_href', 'de', '/kontakt') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q1.cta_href', 'en', '/kontakt') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q2.frage', 'de', 'Wie geht das System mit Stoßzeiten beim Bringen und Abholen um?') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q2.frage', 'en', 'How does the system handle peak drop-off and pick-up times?') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q2.antwort', 'de', E'Bring- und Abholzeiten lassen sich entlasten, ohne die Sicherheit aufzugeben:\n\n• In definierten Zeitfenstern kann der Eingang per Zeitsteuerung kontrolliert offen gehalten werden.\n• Außerhalb dieser Fenster ist die Tür automatisch verschlossen.\n• Die Türöffnung erfolgt dann nur per Türruf oder Transponder.\n• Optional: separater Eingang für Eltern und Lieferanten.') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q2.antwort', 'en', E'Drop-off and pick-up times can be eased without giving up on safety:\n\n• During defined time windows the entrance can be kept open in a controlled way via time control.\n• Outside these windows the door is locked automatically.\n• It is then only released by door call or transponder.\n• Optional: a separate entrance for parents and suppliers.') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q2.enabled', 'de', '1') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q2.enabled', 'en', '1') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q2.cta_label', 'de', 'Planungshilfen ansehen') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q2.cta_label', 'en', 'View planning aids') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q2.cta_href', 'de', '/service/planungshilfen') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q2.cta_href', 'en', '/service/planungshilfen') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q3.frage', 'de', 'Können Kinder die Tür unbeaufsichtigt öffnen?') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q3.frage', 'en', 'Can children open the door unsupervised?') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q3.antwort', 'de', E'Nein. Die Türöffnung bleibt immer in der Hand des Personals:\n\n• Türöffner, Drücker und Innenstationen werden außerhalb der Reichweite von Kindern montiert.\n• Die Tür lässt sich nur aus dem Gruppenraum, der Leitung oder per Transponder öffnen.\n• Mechanische Höhenanordnung und elektrische Verriegelung ergänzen sich.\n• Auf Wunsch beraten wir bei der konkreten Platzierung vor Ort.') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q3.antwort', 'en', E'No. Releasing the door always stays in the hands of the staff:\n\n• Door releases, handles and indoor stations are mounted out of children''s reach.\n• The door can only be opened from the group room, the management office or via a transponder.\n• Mechanical mounting height and electrical locking complement each other.\n• On request we advise on the actual placement on site.') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q3.enabled', 'de', '1') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q3.enabled', 'en', '1') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q3.cta_label', 'de', 'Beratung & Schulung') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q3.cta_label', 'en', 'Consulting & training') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q3.cta_href', 'de', '/service/beratung-schulung') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q3.cta_href', 'en', '/service/beratung-schulung') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q4.frage', 'de', 'Lässt sich aus jedem Gruppenraum die Tür öffnen?') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q4.frage', 'en', 'Can the door be opened from every group room?') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q4.antwort', 'de', E'Ja – das Personal muss nirgends den Raum verlassen, um Besucher zu empfangen:\n\n• Jeder Gruppenraum erhält eine eigene Innenstation (Audio oder Video).\n• Leitung, Küche und Personalraum lassen sich genauso einbinden.\n• Sprechverbindung und Türöffnung erfolgen direkt aus dem jeweiligen Raum.\n• Die Lösung lässt sich später um neue Gruppen oder Anbauten erweitern.') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q4.antwort', 'en', E'Yes – staff don''t have to leave any room to receive a visitor:\n\n• Every group room gets its own indoor station (audio or video).\n• The management office, kitchen and staff room can be integrated in the same way.\n• Audio link and door release run directly from each room.\n• The solution can later be extended for new groups or extensions.') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q4.enabled', 'de', '1') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q4.enabled', 'en', '1') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q4.cta_label', 'de', 'System konfigurieren') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q4.cta_label', 'en', 'Configure the system') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q4.cta_href', 'de', '/planen-konfigurieren') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q4.cta_href', 'en', '/planen-konfigurieren') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q5.frage', 'de', 'Sind die Stationen hygienisch und leicht zu reinigen?') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q5.frage', 'en', 'Are the stations hygienic and easy to clean?') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q5.antwort', 'de', E'Ja. Die Komponenten sind für den Kita-Alltag konzipiert:\n\n• Glatte Oberflächen aus Edelstahl oder hochwertigem Kunststoff.\n• Mit feuchten Tüchern und üblichen Desinfektionsmitteln abwischbar.\n• Wenige Fugen, keine empfindlichen Spalten.\n• Robust gegen kleine Hände, Sand und Spielzeug.') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q5.antwort', 'en', E'Yes. The components are designed for everyday nursery use:\n\n• Smooth surfaces in stainless steel or high-quality plastic.\n• Wipeable with damp cloths and common disinfectants.\n• Few joints, no sensitive gaps.\n• Robust against small hands, sand and toys.') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q5.enabled', 'de', '1') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q5.enabled', 'en', '1') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q5.cta_label', 'de', 'Datenblätter & Software') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q5.cta_label', 'en', 'Datasheets & software') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q5.cta_href', 'de', '/service/datenblaetter-software') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;
INSERT INTO public.cms_section_fields (page_key, section_key, field_key, locale, value) VALUES ('anwendungen.kindertagesstaetten', 'faq', 'items.q5.cta_href', 'en', '/service/datenblaetter-software') ON CONFLICT (page_key, section_key, field_key, locale) DO NOTHING;

-- ========== Whitelist-Nachzug ==========
DO $$
DECLARE
  pages text[] := ARRAY['anwendungen.kindertagesstaetten','anwendungen.schule','anwendungen.wohnheim'];
  pk text; fk text; loc text;
  faq_fields text[] := ARRAY[
    'eyebrow','headline','intro',
    'items.q1.frage','items.q1.antwort','items.q1.enabled',
    'items.q2.frage','items.q2.antwort','items.q2.enabled',
    'items.q3.frage','items.q3.antwort','items.q3.enabled',
    'items.q4.frage','items.q4.antwort','items.q4.enabled',
    'items.q5.frage','items.q5.antwort','items.q5.enabled',
    'items.q1.cta_label','items.q1.cta_href',
    'items.q2.cta_label','items.q2.cta_href',
    'items.q3.cta_label','items.q3.cta_href',
    'items.q4.cta_label','items.q4.cta_href',
    'items.q5.cta_label','items.q5.cta_href'
  ];
  cta_fields text[] := ARRAY['title','text','cta_label','cta_href'];
BEGIN
  FOREACH pk IN ARRAY pages LOOP
    FOREACH loc IN ARRAY ARRAY['de','en'] LOOP
      FOREACH fk IN ARRAY faq_fields LOOP
        INSERT INTO public.cms_admin_editable_fields(page_key, section_key, field_key, locale, is_enabled)
        VALUES (pk, 'faq', fk, loc, true)
        ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE SET is_enabled=true, updated_at=now();
      END LOOP;
      FOREACH fk IN ARRAY cta_fields LOOP
        INSERT INTO public.cms_admin_editable_fields(page_key, section_key, field_key, locale, is_enabled)
        VALUES (pk, 'standard_cta', fk, loc, true)
        ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE SET is_enabled=true, updated_at=now();
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

DO $$
DECLARE
  rec record; fk text; loc text;
  bro_fields text[] := ARRAY['title','text','cta_label','cta_href'];
BEGIN
  FOR rec IN
    SELECT DISTINCT s.page_key, s.section_key
    FROM public.cms_sections s
    WHERE s.section_type = 'cta_v1'
      AND s.is_active = true
      AND s.section_key LIKE 'broschure_%'
  LOOP
    FOREACH loc IN ARRAY ARRAY['de','en'] LOOP
      FOREACH fk IN ARRAY bro_fields LOOP
        INSERT INTO public.cms_admin_editable_fields(page_key, section_key, field_key, locale, is_enabled)
        VALUES (rec.page_key, rec.section_key, fk, loc, true)
        ON CONFLICT (page_key, section_key, field_key, locale) DO UPDATE SET is_enabled=true, updated_at=now();
      END LOOP;
    END LOOP;
  END LOOP;
END $$;