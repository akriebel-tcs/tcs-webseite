# Sonderseiten · Entscheidungsvorschlag

_Automatische Empfehlung mit Confidence. Nur Faelle mit `confidence = niedrig` oder echte Dubletten erfordern fachliche Entscheidung._

| route | komponente | empfehlung | confidence | menschl. Entscheidung | begruendung |
| --- | --- | --- | --- | --- | --- |
| /kontakt | KontaktPage | registrieren | hoch | nein | Kontaktformularseite mit eigenem Submit-Flow. |
| /kontakt/bcm | KontaktBcmPage | registrieren | hoch | nein | Kontaktformularseite mit eigenem Submit-Flow. |
| /produkte/merkliste | MerklistePage | registrieren | hoch | nein | Merklisten-Funktion (Session/User-State) — kein Standardbaustein. |
| /produkte/tuerkommunikation/:pdpSlug | ProductDetailPage | registrieren | hoch | nein | Produktdetailseite (PDP) mit Produktdatenbank-Logik — Sonderfunktion. |
| /produkte/zutrittskontrolle | CategoryListPage | migrieren_pruefen | mittel | ja | Kategorie-Hub mit lokaler linkMap/externalActionMap — hartcodierte Verlinkungen, sonst CMS-naehnlich. |
| /produkte/eingangsloesungen | CategoryListPage | migrieren_pruefen | mittel | ja | Kategorie-Hub mit lokaler linkMap/externalActionMap — hartcodierte Verlinkungen, sonst CMS-naehnlich. |
| /service/online-produktkatalog/:pdpSlug | LegacyPdpRedirect | archivieren_pruefen | niedrig | ja | Renderer-Datei nicht aufloesbar; Funktion unklar. |
| /serviceportal | ServiceportalPage | registrieren | hoch | nein | Auth-/Registrierungs-/Passwort-Flow, kein Standardbaustein abbildbar. |
| /serviceportal/passwort-vergessen | PasswortVergessenPage | registrieren | hoch | nein | Auth-/Registrierungs-/Passwort-Flow, kein Standardbaustein abbildbar. |
| /serviceportal/registrieren | RegistrierenPage | registrieren | hoch | nein | Auth-/Registrierungs-/Passwort-Flow, kein Standardbaustein abbildbar. |

## Was passieren muss (pro Seite)

- **/kontakt** (registrieren, hoch): In sonderseiten-register aufnehmen; Labels/Headlines/Hinweistexte sukzessive nach cms_section_fields heben.
- **/kontakt/bcm** (registrieren, hoch): In sonderseiten-register aufnehmen; Labels/Headlines/Hinweistexte sukzessive nach cms_section_fields heben.
- **/produkte/merkliste** (registrieren, hoch): Registrieren; Leerzustand/Hinweistexte/CTAs als CMS-Felder definieren.
- **/produkte/tuerkommunikation/:pdpSlug** (registrieren, hoch): In sonderseiten-register aufnehmen; Produkttexte/Beschreibungen aus Produkt-DB belassen, CMS-Rahmentexte ergaenzen.
- **/produkte/zutrittskontrolle** (migrieren_pruefen, mittel): Linkziele in cms_section_fields (card_v1.link_href) heben, dann auf cards_v1 migrieren.
- **/produkte/eingangsloesungen** (migrieren_pruefen, mittel): Linkziele in cms_section_fields (card_v1.link_href) heben, dann auf cards_v1 migrieren.
- **/service/online-produktkatalog/:pdpSlug** (archivieren_pruefen, niedrig): Manuell pruefen: noch verlinkt? Sonst Route entfernen.
- **/serviceportal** (registrieren, hoch): In sonderseiten-register aufnehmen; sichtbare Texte (Labels, Hinweise, Erfolg/Fehler) als CMS-Felder vorsehen.
- **/serviceportal/passwort-vergessen** (registrieren, hoch): In sonderseiten-register aufnehmen; sichtbare Texte (Labels, Hinweise, Erfolg/Fehler) als CMS-Felder vorsehen.
- **/serviceportal/registrieren** (registrieren, hoch): In sonderseiten-register aufnehmen; sichtbare Texte (Labels, Hinweise, Erfolg/Fehler) als CMS-Felder vorsehen.
