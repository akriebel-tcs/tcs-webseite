
-- Tailor Wohnheim (P-268 / anwendungen.wohnheim) content to be Wohnheim-specific
-- Pure UPDATEs to cms_section_fields, idempotent.

-- ============ HERO + CONTENT (sharper Wohnheim-Profil) ============
UPDATE cms_section_fields SET value='Türkommunikation und Zutritt für Wohnheime', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='hero' AND field_key='headline' AND locale='de';
UPDATE cms_section_fields SET value='Door entry and access control for halls of residence', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='hero' AND field_key='headline' AND locale='en';

UPDATE cms_section_fields SET value='Klare Bedienung am Haupteingang, sichere Identifikation von Bewohnerinnen, Bewohnern und Besuchern – und eine zuverlässige Sprech- und Videoverbindung in jedes Zimmer. Auch bei Semesterwechsel, hohem Besucheraufkommen und 24/7-Betrieb.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='hero' AND field_key='intro' AND locale='de';
UPDATE cms_section_fields SET value='Clear operation at the main entrance, secure identification of residents and visitors – and a reliable audio and video link to every room. Built for semester turnover, high visitor traffic and round-the-clock use.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='hero' AND field_key='intro' AND locale='en';

UPDATE cms_section_fields SET value='Wohnheim', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='content' AND field_key='headline' AND locale='de';
UPDATE cms_section_fields SET value='Hall of residence', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='content' AND field_key='headline' AND locale='en';

UPDATE cms_section_fields SET value='Ob Studierendenwohnheim, Azubi- oder Mitarbeiterwohnheim: Viele Bewohnerinnen und Bewohner, regelmäßige Wechsel und ein hohes Besucheraufkommen verlangen Türkommunikation, die robust, übersichtlich und schnell anpassbar ist.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='content' AND field_key='intro' AND locale='de';
UPDATE cms_section_fields SET value='Whether a student residence, apprentice or staff dorm: many residents, regular turnover and high visitor traffic call for door entry that is robust, easy to use and quick to reconfigure.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='content' AND field_key='intro' AND locale='en';

UPDATE cms_section_fields SET value='TCS verbindet Haupteingang, Zimmer, Verwaltung und Hausmeisterbüro zu einem System: Außenstationen aus Edelstahl trotzen Dauerbelastung und Vandalismus, schlüsselloser Zutritt per Transponder oder Code lässt sich beim Auszug in Sekunden sperren, und Innenstationen oder die TCS:APP holen Bewohner zuverlässig an die Tür – auch wenn niemand im Zimmer ist.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='content' AND field_key='description' AND locale='de';
UPDATE cms_section_fields SET value='TCS links the main entrance, rooms, administration and caretaker''s office into one system: stainless-steel outdoor stations withstand continuous use and vandalism, keyless access via transponder or code can be revoked in seconds when residents move out, and indoor stations or the TCS:APP reliably reach residents at the door – even when no one is in the room.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='content' AND field_key='description' AND locale='en';

-- ============ ANFORDERUNGEN (Wohnheim-spezifisch) ============
-- zutritt
UPDATE cms_section_fields SET value='Schneller Wechsel', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='anforderungen' AND field_key='zutritt.label' AND locale='de';
UPDATE cms_section_fields SET value='Fast turnover', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='anforderungen' AND field_key='zutritt.label' AND locale='en';
UPDATE cms_section_fields SET value='Transponder oder Code beim Einzug ausgeben, beim Auszug in Sekunden sperren – ohne Schlüsseltausch.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='anforderungen' AND field_key='zutritt.text' AND locale='de';
UPDATE cms_section_fields SET value='Issue transponders or codes on move-in and revoke them in seconds on move-out – no key change required.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='anforderungen' AND field_key='zutritt.text' AND locale='en';

UPDATE cms_section_fields SET value='Schneller Wechsel', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='anforderungen_item_zutritt' AND field_key='title' AND locale='de';
UPDATE cms_section_fields SET value='Fast turnover', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='anforderungen_item_zutritt' AND field_key='title' AND locale='en';
UPDATE cms_section_fields SET value='Transponder oder Code beim Einzug ausgeben, beim Auszug in Sekunden sperren – ohne Schlüsseltausch.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='anforderungen_item_zutritt' AND field_key='description' AND locale='de';
UPDATE cms_section_fields SET value='Issue transponders or codes on move-in and revoke them in seconds on move-out – no key change required.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='anforderungen_item_zutritt' AND field_key='description' AND locale='en';

-- bedienung
UPDATE cms_section_fields SET value='Selbsterklärende Bedienung', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='anforderungen' AND field_key='bedienung.label' AND locale='de';
UPDATE cms_section_fields SET value='Self-explanatory operation', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='anforderungen' AND field_key='bedienung.label' AND locale='en';
UPDATE cms_section_fields SET value='Klares Tastenlayout am Eingang und in jedem Zimmer – ohne Einweisung nutzbar, auch für internationale Bewohner.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='anforderungen' AND field_key='bedienung.text' AND locale='de';
UPDATE cms_section_fields SET value='Clear button layout at the entrance and in every room – usable without training, also for international residents.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='anforderungen' AND field_key='bedienung.text' AND locale='en';

UPDATE cms_section_fields SET value='Selbsterklärende Bedienung', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='anforderungen_item_bedienung' AND field_key='title' AND locale='de';
UPDATE cms_section_fields SET value='Self-explanatory operation', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='anforderungen_item_bedienung' AND field_key='title' AND locale='en';
UPDATE cms_section_fields SET value='Klares Tastenlayout am Eingang und in jedem Zimmer – ohne Einweisung nutzbar, auch für internationale Bewohner.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='anforderungen_item_bedienung' AND field_key='description' AND locale='de';
UPDATE cms_section_fields SET value='Clear button layout at the entrance and in every room – usable without training, also for international residents.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='anforderungen_item_bedienung' AND field_key='description' AND locale='en';

-- design
UPDATE cms_section_fields SET value='Robuste Hardware', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='anforderungen' AND field_key='design.label' AND locale='de';
UPDATE cms_section_fields SET value='Robust hardware', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='anforderungen' AND field_key='design.label' AND locale='en';
UPDATE cms_section_fields SET value='Außenstationen aus Edelstahl, vandalismushemmend und für hohe Frequenz am Haupteingang ausgelegt.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='anforderungen' AND field_key='design.text' AND locale='de';
UPDATE cms_section_fields SET value='Stainless-steel outdoor stations, vandal-resistant and designed for high-traffic main entrances.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='anforderungen' AND field_key='design.text' AND locale='en';
UPDATE cms_section_fields SET value='shield', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='anforderungen' AND field_key='design.icon';

UPDATE cms_section_fields SET value='Robuste Hardware', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='anforderungen_item_design' AND field_key='title' AND locale='de';
UPDATE cms_section_fields SET value='Robust hardware', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='anforderungen_item_design' AND field_key='title' AND locale='en';
UPDATE cms_section_fields SET value='Außenstationen aus Edelstahl, vandalismushemmend und für hohe Frequenz am Haupteingang ausgelegt.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='anforderungen_item_design' AND field_key='description' AND locale='de';
UPDATE cms_section_fields SET value='Stainless-steel outdoor stations, vandal-resistant and designed for high-traffic main entrances.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='anforderungen_item_design' AND field_key='description' AND locale='en';

-- audioVideo (keep title, sharpen text)
UPDATE cms_section_fields SET value='Sicht auf den Besucher direkt am Zimmer – ideal, wenn der Haupteingang weit entfernt liegt.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='anforderungen' AND field_key='audioVideo.text' AND locale='de';
UPDATE cms_section_fields SET value='See the visitor directly from the room – ideal when the main entrance is far away.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='anforderungen' AND field_key='audioVideo.text' AND locale='en';

-- app (keep label, sharpen text)
UPDATE cms_section_fields SET value='Türruf auf dem Smartphone – Bewohner und Hausmeister sind auch unterwegs erreichbar.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='anforderungen' AND field_key='app.text' AND locale='de';
UPDATE cms_section_fields SET value='Door call on the smartphone – residents and the caretaker stay reachable on the move.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='anforderungen' AND field_key='app.text' AND locale='en';

-- ============ LEISTUNGEN ============
-- Kommunikation
UPDATE cms_section_fields SET value='Audio- oder Video-Türsprechanlage vom Haupteingang in jedes Zimmer', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='leistungen' AND field_key='kommunikation.items.0' AND locale='de';
UPDATE cms_section_fields SET value='Audio or video door entry from the main entrance to every room', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='leistungen' AND field_key='kommunikation.items.0' AND locale='en';
UPDATE cms_section_fields SET value='Freisprech- oder Videoinnenstationen in Bewohnerzimmern, Verwaltung und Hausmeisterbüro', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='leistungen' AND field_key='kommunikation.items.1' AND locale='de';
UPDATE cms_section_fields SET value='Hands-free or video indoor stations in resident rooms, administration and caretaker''s office', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='leistungen' AND field_key='kommunikation.items.1' AND locale='en';
UPDATE cms_section_fields SET value='Weiterleitung des Türrufs auf das Smartphone via TCS:APP – ideal bei Schichtdiensten und Urlaubsvertretung', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='leistungen' AND field_key='kommunikation.items.2' AND locale='de';
UPDATE cms_section_fields SET value='Door call forwarding to the smartphone via TCS:APP – ideal for shift work and holiday cover', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='leistungen' AND field_key='kommunikation.items.2' AND locale='en';

-- Sicherheit & Zutritt
UPDATE cms_section_fields SET value='Schlüsselloser Zutritt per Transponder, Code oder Fingerprint – beim Auszug sofort sperrbar', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='leistungen' AND field_key='sicherheit.items.0' AND locale='de';
UPDATE cms_section_fields SET value='Keyless access via transponder, code or fingerprint – instantly revocable on move-out', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='leistungen' AND field_key='sicherheit.items.0' AND locale='en';
UPDATE cms_section_fields SET value='Getrennte Berechtigungen für Wohnbereiche, Gemeinschaftsräume, Waschküche und Verwaltung', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='leistungen' AND field_key='sicherheit.items.1' AND locale='de';
UPDATE cms_section_fields SET value='Separate access rights for living areas, common rooms, laundry and administration', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='leistungen' AND field_key='sicherheit.items.1' AND locale='en';
UPDATE cms_section_fields SET value='Videoüberwachung am Haupteingang und elektrische Türöffner für jede Etage', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='leistungen' AND field_key='sicherheit.items.2' AND locale='de';
UPDATE cms_section_fields SET value='Video surveillance at the main entrance and electric door openers on every floor', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='leistungen' AND field_key='sicherheit.items.2' AND locale='en';

-- Design & Integration
UPDATE cms_section_fields SET value='Vandalismushemmende Außenstationen aus Edelstahl, Aufputz oder Unterputz', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='leistungen' AND field_key='design.items.0' AND locale='de';
UPDATE cms_section_fields SET value='Vandal-resistant outdoor stations in stainless steel, surface- or flush-mounted', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='leistungen' AND field_key='design.items.0' AND locale='en';
UPDATE cms_section_fields SET value='Namens- und Klingeltableaus mit vielen Tastenmodulen – auch für große Bewohnerzahlen', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='leistungen' AND field_key='design.items.1' AND locale='de';
UPDATE cms_section_fields SET value='Name and bell panels with many button modules – also for large numbers of residents', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='leistungen' AND field_key='design.items.1' AND locale='en';
UPDATE cms_section_fields SET value='Erweiterbar bei Umbau oder Anbau – Komponenten und Verkabelung bleiben bestehen', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='leistungen' AND field_key='design.items.2' AND locale='de';
UPDATE cms_section_fields SET value='Extendable for conversions or extensions – components and wiring stay in place', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='leistungen' AND field_key='design.items.2' AND locale='en';

-- ============ SYSTEMBAUSTEINE ============
UPDATE cms_section_fields SET value='Vandalismushemmende Audio- oder Video-Außenstation für stark frequentierte Haupteingänge.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='systembausteine' AND field_key='aussenstation.description' AND locale='de';
UPDATE cms_section_fields SET value='Vandal-resistant audio or video outdoor station for busy main entrances.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='systembausteine' AND field_key='aussenstation.description' AND locale='en';

UPDATE cms_section_fields SET value='Kompakte Freisprech- oder Videostation für jedes Bewohnerzimmer.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='systembausteine' AND field_key='innenstation.description' AND locale='de';
UPDATE cms_section_fields SET value='Compact hands-free or video station for every resident room.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='systembausteine' AND field_key='innenstation.description' AND locale='en';

UPDATE cms_section_fields SET value='Schlüsselloser Zutritt per Transponder oder Fingerprint – beim Auszug sekundenschnell sperrbar.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='systembausteine' AND field_key='zutritt.description' AND locale='de';
UPDATE cms_section_fields SET value='Keyless access via transponder or fingerprint – revocable in seconds on move-out.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='systembausteine' AND field_key='zutritt.description' AND locale='en';

UPDATE cms_section_fields SET value='Türruf auf das Smartphone von Hausmeister, Verwaltung oder Bewohner.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='systembausteine' AND field_key='mobil.description' AND locale='de';
UPDATE cms_section_fields SET value='Door call on the smartphone for caretaker, administration or resident.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='systembausteine' AND field_key='mobil.description' AND locale='en';

-- ============ FAQ (Wohnheim-spezifisch) ============
UPDATE cms_section_fields SET value='Wie schnell lässt sich ein Bewohnerwechsel umsetzen?', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='faq' AND field_key='items.q1.frage' AND locale='de';
UPDATE cms_section_fields SET value='How quickly can a resident change be processed?', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='faq' AND field_key='items.q1.frage' AND locale='en';
UPDATE cms_section_fields SET value='Transponder oder Codes lassen sich in Sekunden ausgeben oder sperren – ein Schlüsseltausch entfällt komplett. Das spart bei häufigen Ein- und Auszügen sehr viel Zeit und Geld.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='faq' AND field_key='items.q1.antwort' AND locale='de';
UPDATE cms_section_fields SET value='Transponders or codes can be issued or revoked in seconds – no key change required. This saves a lot of time and money when residents move in and out frequently.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='faq' AND field_key='items.q1.antwort' AND locale='en';

UPDATE cms_section_fields SET value='Wie viele Zimmer und Türstationen lassen sich anschließen?', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='faq' AND field_key='items.q2.frage' AND locale='de';
UPDATE cms_section_fields SET value='How many rooms and door stations can be connected?', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='faq' AND field_key='items.q2.frage' AND locale='en';
UPDATE cms_section_fields SET value='Die TCS-Systeme skalieren von kleinen Wohnheimen mit wenigen Zimmern bis zu großen Anlagen mit mehreren hundert Bewohnern und mehreren Haupteingängen. Die Auslegung erfolgt projektbezogen.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='faq' AND field_key='items.q2.antwort' AND locale='de';
UPDATE cms_section_fields SET value='TCS systems scale from small dorms with a few rooms up to large facilities with several hundred residents and multiple main entrances. The configuration is project-specific.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='faq' AND field_key='items.q2.antwort' AND locale='en';

UPDATE cms_section_fields SET value='Wie robust sind die Außenstationen am Haupteingang?', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='faq' AND field_key='items.q3.frage' AND locale='de';
UPDATE cms_section_fields SET value='How robust are the outdoor stations at the main entrance?', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='faq' AND field_key='items.q3.frage' AND locale='en';
UPDATE cms_section_fields SET value='Unsere Außenstationen sind aus Edelstahl, vandalismushemmend und für hohe Belastung am Haupteingang ausgelegt – Tag und Nacht, sieben Tage die Woche.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='faq' AND field_key='items.q3.antwort' AND locale='de';
UPDATE cms_section_fields SET value='Our outdoor stations are stainless steel, vandal-resistant and built for high loads at the main entrance – day and night, seven days a week.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='faq' AND field_key='items.q3.antwort' AND locale='en';

UPDATE cms_section_fields SET value='Lassen sich getrennte Bereiche (Wohnen, Verwaltung, Gemeinschaftsräume) separat steuern?', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='faq' AND field_key='items.q4.frage' AND locale='de';
UPDATE cms_section_fields SET value='Can separate areas (living, administration, common rooms) be controlled individually?', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='faq' AND field_key='items.q4.frage' AND locale='en';
UPDATE cms_section_fields SET value='Ja. Berechtigungen werden pro Bewohner und Tür vergeben – so haben z. B. Bewohner Zugang zu ihrem Wohnbereich und Gemeinschaftsräumen, während die Verwaltung getrennt geschützt bleibt.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='faq' AND field_key='items.q4.antwort' AND locale='de';
UPDATE cms_section_fields SET value='Yes. Access rights are assigned per resident and door – e.g. residents reach their living area and common rooms, while administration stays separately protected.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='faq' AND field_key='items.q4.antwort' AND locale='en';

UPDATE cms_section_fields SET value='Kann der Türruf auch außerhalb des Zimmers entgegengenommen werden?', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='faq' AND field_key='items.q5.frage' AND locale='de';
UPDATE cms_section_fields SET value='Can door calls be answered outside the room as well?', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='faq' AND field_key='items.q5.frage' AND locale='en';
UPDATE cms_section_fields SET value='Ja. Mit der TCS:APP wird der Türruf auf das Smartphone weitergeleitet – ideal für Bewohner, Hausmeister und Verwaltung im Schicht- oder Bereitschaftsdienst.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='faq' AND field_key='items.q5.antwort' AND locale='de';
UPDATE cms_section_fields SET value='Yes. With the TCS:APP, door calls are forwarded to the smartphone – ideal for residents, caretakers and administration on shift or on-call duty.', updated_at=now()
 WHERE page_key='anwendungen.wohnheim' AND section_key='faq' AND field_key='items.q5.antwort' AND locale='en';
