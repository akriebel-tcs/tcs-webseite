
-- Tailor Schule (P-267 / anwendungen.schule) content to be Schule-specific
-- Pure UPDATEs to cms_section_fields, idempotent.

-- ============ HERO + CONTENT ============
UPDATE cms_section_fields SET value='Türkommunikation und Zutritt für Schulen', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='hero' AND field_key='headline' AND locale='de';
UPDATE cms_section_fields SET value='Door entry and access control for schools', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='hero' AND field_key='headline' AND locale='en';

UPDATE cms_section_fields SET value='Kontrollierter Zutritt für Lehrkräfte, Schülerinnen, Schüler, Eltern und Lieferanten – mit klarer Sprech- und Videoverbindung vom Haupteingang ans Sekretariat. Auch in Stoßzeiten zu Schulbeginn, in den Pausen und bei Elternsprechtagen.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='hero' AND field_key='intro' AND locale='de';
UPDATE cms_section_fields SET value='Controlled access for teachers, pupils, parents and suppliers – with a clear audio and video link from the main entrance to the school office. Built for peak times at the start of school, during breaks and on parents'' evenings.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='hero' AND field_key='intro' AND locale='en';

UPDATE cms_section_fields SET value='Schule', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='content' AND field_key='headline' AND locale='de';
UPDATE cms_section_fields SET value='School', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='content' AND field_key='headline' AND locale='en';

UPDATE cms_section_fields SET value='Ob Grundschule, weiterführende Schule oder Berufsschule: Schulen brauchen Türkommunikation, die während des Unterrichts geschlossen, in den Pausen entlastet und für Eltern, Lieferanten und externe Termine schnell zu öffnen ist.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='content' AND field_key='intro' AND locale='de';
UPDATE cms_section_fields SET value='Whether primary, secondary or vocational school: schools need door communication that stays closed during lessons, copes during breaks and opens quickly for parents, suppliers and external appointments.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='content' AND field_key='intro' AND locale='en';

UPDATE cms_section_fields SET value='TCS verbindet Haupteingang, Pausenhof, Sporthalle, Sekretariat und Lehrerzimmer zu einem System: Vandalismushemmende Außenstationen aus Edelstahl halten Stoßzeiten und Pausen stand, Sekretariat und Hausmeister sehen und sprechen jeden Besucher vor der Türöffnung, und schlüsselloser Zutritt für Lehrkräfte trennt Klassen-, Verwaltungs- und Sportbereiche sauber voneinander.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='content' AND field_key='description' AND locale='de';
UPDATE cms_section_fields SET value='TCS links the main entrance, schoolyard, sports hall, office and staff room into one system: vandal-resistant stainless-steel outdoor stations cope with peak times and breaks, the office and caretaker can see and speak with every visitor before opening the door, and keyless access for teachers cleanly separates classroom, administration and sports areas.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='content' AND field_key='description' AND locale='en';

-- ============ ANFORDERUNGEN ============
-- zutritt
UPDATE cms_section_fields SET value='Kontrollierter Zutritt', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='anforderungen' AND field_key='zutritt.label' AND locale='de';
UPDATE cms_section_fields SET value='Controlled access', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='anforderungen' AND field_key='zutritt.label' AND locale='en';
UPDATE cms_section_fields SET value='Während des Unterrichts geschlossen, für Lehrkräfte per Transponder oder Code offen – verlorene Medien lassen sich sofort sperren.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='anforderungen' AND field_key='zutritt.text' AND locale='de';
UPDATE cms_section_fields SET value='Locked during lessons, opened for teachers via transponder or code – lost tokens can be revoked instantly.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='anforderungen' AND field_key='zutritt.text' AND locale='en';

UPDATE cms_section_fields SET value='Kontrollierter Zutritt', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='anforderungen_item_zutritt' AND field_key='title' AND locale='de';
UPDATE cms_section_fields SET value='Controlled access', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='anforderungen_item_zutritt' AND field_key='title' AND locale='en';
UPDATE cms_section_fields SET value='Während des Unterrichts geschlossen, für Lehrkräfte per Transponder oder Code offen – verlorene Medien lassen sich sofort sperren.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='anforderungen_item_zutritt' AND field_key='description' AND locale='de';
UPDATE cms_section_fields SET value='Locked during lessons, opened for teachers via transponder or code – lost tokens can be revoked instantly.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='anforderungen_item_zutritt' AND field_key='description' AND locale='en';

-- bedienung
UPDATE cms_section_fields SET value='Bedienung am Sekretariat', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='anforderungen' AND field_key='bedienung.label' AND locale='de';
UPDATE cms_section_fields SET value='Operation at the office', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='anforderungen' AND field_key='bedienung.label' AND locale='en';
UPDATE cms_section_fields SET value='Innenstationen im Sekretariat, Lehrerzimmer und beim Hausmeister – klare Tasten, ohne Schulung nutzbar.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='anforderungen' AND field_key='bedienung.text' AND locale='de';
UPDATE cms_section_fields SET value='Indoor stations in the school office, staff room and caretaker''s office – clear buttons, usable without training.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='anforderungen' AND field_key='bedienung.text' AND locale='en';

UPDATE cms_section_fields SET value='Bedienung am Sekretariat', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='anforderungen_item_bedienung' AND field_key='title' AND locale='de';
UPDATE cms_section_fields SET value='Operation at the office', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='anforderungen_item_bedienung' AND field_key='title' AND locale='en';
UPDATE cms_section_fields SET value='Innenstationen im Sekretariat, Lehrerzimmer und beim Hausmeister – klare Tasten, ohne Schulung nutzbar.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='anforderungen_item_bedienung' AND field_key='description' AND locale='de';
UPDATE cms_section_fields SET value='Indoor stations in the school office, staff room and caretaker''s office – clear buttons, usable without training.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='anforderungen_item_bedienung' AND field_key='description' AND locale='en';

-- design
UPDATE cms_section_fields SET value='Vandalismushemmend', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='anforderungen' AND field_key='design.label' AND locale='de';
UPDATE cms_section_fields SET value='Vandal-resistant', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='anforderungen' AND field_key='design.label' AND locale='en';
UPDATE cms_section_fields SET value='Außenstationen aus Edelstahl, ausgelegt für Pausenhof und Haupteingang – auch bei rauer Beanspruchung.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='anforderungen' AND field_key='design.text' AND locale='de';
UPDATE cms_section_fields SET value='Stainless-steel outdoor stations, designed for the schoolyard and main entrance – also under rough use.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='anforderungen' AND field_key='design.text' AND locale='en';
UPDATE cms_section_fields SET value='shield', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='anforderungen' AND field_key='design.icon';

UPDATE cms_section_fields SET value='Vandalismushemmend', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='anforderungen_item_design' AND field_key='title' AND locale='de';
UPDATE cms_section_fields SET value='Vandal-resistant', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='anforderungen_item_design' AND field_key='title' AND locale='en';
UPDATE cms_section_fields SET value='Außenstationen aus Edelstahl, ausgelegt für Pausenhof und Haupteingang – auch bei rauer Beanspruchung.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='anforderungen_item_design' AND field_key='description' AND locale='de';
UPDATE cms_section_fields SET value='Stainless-steel outdoor stations, designed for the schoolyard and main entrance – also under rough use.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='anforderungen_item_design' AND field_key='description' AND locale='en';

-- audioVideo
UPDATE cms_section_fields SET value='Sicht auf jeden Besucher vor der Türöffnung – Eltern, Lieferanten oder externe Termine eindeutig erkennen.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='anforderungen' AND field_key='audioVideo.text' AND locale='de';
UPDATE cms_section_fields SET value='See every visitor before opening the door – clearly identify parents, suppliers or external appointments.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='anforderungen' AND field_key='audioVideo.text' AND locale='en';

-- app
UPDATE cms_section_fields SET value='Türruf auf das Smartphone – Hausmeister oder Schulleitung sind auch außerhalb des Sekretariats erreichbar.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='anforderungen' AND field_key='app.text' AND locale='de';
UPDATE cms_section_fields SET value='Door call on the smartphone – caretaker or head teacher stays reachable beyond the school office.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='anforderungen' AND field_key='app.text' AND locale='en';

-- ============ LEISTUNGEN ============
-- Kommunikation
UPDATE cms_section_fields SET value='Audio- oder Video-Türsprechanlage vom Haupteingang zum Sekretariat', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='leistungen' AND field_key='kommunikation.items.0' AND locale='de';
UPDATE cms_section_fields SET value='Audio or video door entry from the main entrance to the school office', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='leistungen' AND field_key='kommunikation.items.0' AND locale='en';
UPDATE cms_section_fields SET value='Freisprech- oder Videoinnenstationen in Sekretariat, Lehrerzimmer und Hausmeisterbüro', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='leistungen' AND field_key='kommunikation.items.1' AND locale='de';
UPDATE cms_section_fields SET value='Hands-free or video indoor stations in the school office, staff room and caretaker''s office', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='leistungen' AND field_key='kommunikation.items.1' AND locale='en';
UPDATE cms_section_fields SET value='Weiterleitung des Türrufs auf das Smartphone via TCS:APP – auch außerhalb der Unterrichtszeiten und im Ferienbetrieb', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='leistungen' AND field_key='kommunikation.items.2' AND locale='de';
UPDATE cms_section_fields SET value='Door call forwarding to the smartphone via TCS:APP – also outside lesson times and during holidays', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='leistungen' AND field_key='kommunikation.items.2' AND locale='en';

-- Sicherheit & Zutritt
UPDATE cms_section_fields SET value='Schlüsselloser Zutritt für Lehrkräfte per Transponder, Code oder Fingerprint – verlorene Medien sofort sperrbar', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='leistungen' AND field_key='sicherheit.items.0' AND locale='de';
UPDATE cms_section_fields SET value='Keyless access for teachers via transponder, code or fingerprint – lost tokens revocable instantly', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='leistungen' AND field_key='sicherheit.items.0' AND locale='en';
UPDATE cms_section_fields SET value='Getrennte Berechtigungen für Klassenbereiche, Verwaltung, Sporthalle und Aula', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='leistungen' AND field_key='sicherheit.items.1' AND locale='de';
UPDATE cms_section_fields SET value='Separate access rights for classroom areas, administration, sports hall and assembly hall', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='leistungen' AND field_key='sicherheit.items.1' AND locale='en';
UPDATE cms_section_fields SET value='Videoüberwachung am Haupteingang und elektrische Türöffner mit Zeitsteuerung für Pausen und Unterrichtszeiten', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='leistungen' AND field_key='sicherheit.items.2' AND locale='de';
UPDATE cms_section_fields SET value='Video surveillance at the main entrance and time-controlled electric door openers for breaks and lesson times', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='leistungen' AND field_key='sicherheit.items.2' AND locale='en';

-- Design & Integration
UPDATE cms_section_fields SET value='Vandalismushemmende Außenstationen aus Edelstahl, Aufputz oder Unterputz', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='leistungen' AND field_key='design.items.0' AND locale='de';
UPDATE cms_section_fields SET value='Vandal-resistant outdoor stations in stainless steel, surface- or flush-mounted', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='leistungen' AND field_key='design.items.0' AND locale='en';
UPDATE cms_section_fields SET value='Mehrere Eingänge ansteuerbar: Haupteingang, Schulhof, Sporthalle und Nebeneingänge', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='leistungen' AND field_key='design.items.1' AND locale='de';
UPDATE cms_section_fields SET value='Multiple entrances supported: main entrance, schoolyard, sports hall and side entrances', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='leistungen' AND field_key='design.items.1' AND locale='en';
UPDATE cms_section_fields SET value='Erweiterbar bei Anbau, Sanierung oder neuen Schulgebäuden – bestehende Komponenten und Verkabelung bleiben nutzbar', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='leistungen' AND field_key='design.items.2' AND locale='de';
UPDATE cms_section_fields SET value='Extendable for extensions, refurbishments or new school buildings – existing components and wiring remain usable', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='leistungen' AND field_key='design.items.2' AND locale='en';

-- ============ SYSTEMBAUSTEINE ============
UPDATE cms_section_fields SET value='Vandalismushemmende Audio- oder Video-Außenstation für Haupteingang, Pausenhof und Sporthalle.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='systembausteine' AND field_key='aussenstation.description' AND locale='de';
UPDATE cms_section_fields SET value='Vandal-resistant audio or video outdoor station for the main entrance, schoolyard and sports hall.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='systembausteine' AND field_key='aussenstation.description' AND locale='en';

UPDATE cms_section_fields SET value='Freisprech- oder Videostation für Sekretariat, Lehrerzimmer und Hausmeisterbüro.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='systembausteine' AND field_key='innenstation.description' AND locale='de';
UPDATE cms_section_fields SET value='Hands-free or video station for the school office, staff room and caretaker''s office.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='systembausteine' AND field_key='innenstation.description' AND locale='en';

UPDATE cms_section_fields SET value='Schlüsselloser Zutritt für Lehrkräfte – verlorene Medien lassen sich sekundenschnell sperren.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='systembausteine' AND field_key='zutritt.description' AND locale='de';
UPDATE cms_section_fields SET value='Keyless access for teachers – lost tokens can be revoked in seconds.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='systembausteine' AND field_key='zutritt.description' AND locale='en';

UPDATE cms_section_fields SET value='Türruf auf das Smartphone von Hausmeister oder Schulleitung – auch außerhalb des Sekretariats.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='systembausteine' AND field_key='mobil.description' AND locale='de';
UPDATE cms_section_fields SET value='Door call on the smartphone for caretaker or head teacher – also outside the school office.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='systembausteine' AND field_key='mobil.description' AND locale='en';

-- ============ FAQ ============
UPDATE cms_section_fields SET value='Wie kommen Eltern, Lieferanten und externe Termine ins Gebäude?', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='faq' AND field_key='items.q1.frage' AND locale='de';
UPDATE cms_section_fields SET value='How do parents, suppliers and external visitors enter the building?', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='faq' AND field_key='items.q1.frage' AND locale='en';
UPDATE cms_section_fields SET value='Besucher klingeln am Haupteingang. Im Sekretariat sieht und spricht das Personal den Besucher per Video-Innenstation und öffnet die Tür gezielt – die Außentür bleibt während des Unterrichts geschlossen.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='faq' AND field_key='items.q1.antwort' AND locale='de';
UPDATE cms_section_fields SET value='Visitors ring at the main entrance. Staff in the school office see and speak with them via a video indoor station and open the door deliberately – the outer door stays locked during lessons.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='faq' AND field_key='items.q1.antwort' AND locale='en';

UPDATE cms_section_fields SET value='Lassen sich mehrere Eingänge (Haupteingang, Pausenhof, Sporthalle) zusammen steuern?', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='faq' AND field_key='items.q2.frage' AND locale='de';
UPDATE cms_section_fields SET value='Can several entrances (main entrance, schoolyard, sports hall) be managed together?', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='faq' AND field_key='items.q2.frage' AND locale='en';
UPDATE cms_section_fields SET value='Ja. Das System ist mehrtürfähig – jeder Eingang erhält eine eigene Außenstation und kann unabhängig freigegeben oder gesperrt werden, etwa nur in den Pausen oder zur Anlieferung.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='faq' AND field_key='items.q2.antwort' AND locale='de';
UPDATE cms_section_fields SET value='Yes. The system is multi-door capable – every entrance has its own outdoor station and can be released or locked independently, e.g. only during breaks or for deliveries.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='faq' AND field_key='items.q2.antwort' AND locale='en';

UPDATE cms_section_fields SET value='Was passiert, wenn eine Lehrkraft ihren Transponder verliert?', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='faq' AND field_key='items.q3.frage' AND locale='de';
UPDATE cms_section_fields SET value='What happens if a teacher loses their transponder?', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='faq' AND field_key='items.q3.frage' AND locale='en';
UPDATE cms_section_fields SET value='Der Transponder wird im System gesperrt und ein neuer ausgegeben – innerhalb von Sekunden, ohne Schlossaustausch. Das ist im Schulbetrieb ein entscheidender Vorteil gegenüber klassischen Schließanlagen.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='faq' AND field_key='items.q3.antwort' AND locale='de';
UPDATE cms_section_fields SET value='The transponder is revoked in the system and a new one issued – within seconds, no lock change required. In day-to-day school operation this is a decisive advantage over conventional locking systems.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='faq' AND field_key='items.q3.antwort' AND locale='en';

UPDATE cms_section_fields SET value='Können Sporthalle und Aula getrennt von den Klassenbereichen freigegeben werden?', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='faq' AND field_key='items.q4.frage' AND locale='de';
UPDATE cms_section_fields SET value='Can the sports hall and assembly hall be released separately from the classroom areas?', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='faq' AND field_key='items.q4.frage' AND locale='en';
UPDATE cms_section_fields SET value='Ja. Berechtigungen werden pro Tür und Personengruppe vergeben – Vereine in der Sporthalle, externe Veranstaltungen in der Aula oder Reinigungsdienste nach Schulschluss bekommen genau den Bereich, den sie brauchen.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='faq' AND field_key='items.q4.antwort' AND locale='de';
UPDATE cms_section_fields SET value='Yes. Access rights are assigned per door and per group – sports clubs in the gym, external events in the assembly hall or cleaning services after school each get exactly the area they need.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='faq' AND field_key='items.q4.antwort' AND locale='en';

UPDATE cms_section_fields SET value='Wie läuft der Betrieb in den Ferien oder am Wochenende?', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='faq' AND field_key='items.q5.frage' AND locale='de';
UPDATE cms_section_fields SET value='How does the system run during holidays or at weekends?', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='faq' AND field_key='items.q5.frage' AND locale='en';
UPDATE cms_section_fields SET value='Sekretariat und Lehrerzimmer sind dann meist nicht besetzt. Der Türruf wird per TCS:APP auf das Smartphone von Hausmeister oder Schulleitung weitergeleitet, sodass Handwerker oder Lieferanten trotzdem zuverlässig empfangen werden können.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='faq' AND field_key='items.q5.antwort' AND locale='de';
UPDATE cms_section_fields SET value='The office and staff room are usually unoccupied then. Door calls are forwarded via the TCS:APP to the smartphone of the caretaker or head teacher, so tradespeople or suppliers can still be received reliably.', updated_at=now()
 WHERE page_key='anwendungen.schule' AND section_key='faq' AND field_key='items.q5.antwort' AND locale='en';
