# Sonderseiten-Register (vorlaeufig)

_Status `vorlaeufig_registriert` heisst: vom System aus Audit-Heuristik eingetragen. Fachliche Endabnahme erfolgt mit Etappe Sonderseiten._

Sonderseite bedeutet **nicht** „Inhalte sind egal". Funktion/Layout darf speziell sein, sichtbare Texte gehoeren weiterhin ins CMS.

| route | page_key | komponente | begruendung | nicht-Standard-Funktion | Status |
| --- | --- | --- | --- | --- | --- |
| /kontakt | kontakt.root | KontaktPage | Kontaktformularseite mit eigenem Submit-Flow. | Formular-Submit/Auth-Flow | vorlaeufig_registriert |
| /kontakt/bcm | kontakt-bcm.root | KontaktBcmPage | Kontaktformularseite mit eigenem Submit-Flow. | Formular-Submit/Auth-Flow | vorlaeufig_registriert |
| /produkte/merkliste | — | MerklistePage | Merklisten-Funktion (Session/User-State) — kein Standardbaustein. | Session-/User-Merklisten-Funktion | vorlaeufig_registriert |
| /produkte/tuerkommunikation/:pdpSlug | — | ProductDetailPage | Produktdetailseite (PDP) mit Produktdatenbank-Logik — Sonderfunktion. | Produktdetail-Logik gegen Produktdatenbank | vorlaeufig_registriert |
| /serviceportal | serviceportal.login | ServiceportalPage | Auth-/Registrierungs-/Passwort-Flow, kein Standardbaustein abbildbar. | Formular-Submit/Auth-Flow | vorlaeufig_registriert |
| /serviceportal/passwort-vergessen | serviceportal.passwort-vergessen | PasswortVergessenPage | Auth-/Registrierungs-/Passwort-Flow, kein Standardbaustein abbildbar. | Formular-Submit/Auth-Flow | vorlaeufig_registriert |
| /serviceportal/registrieren | serviceportal.registrieren | RegistrierenPage | Auth-/Registrierungs-/Passwort-Flow, kein Standardbaustein abbildbar. | Formular-Submit/Auth-Flow | vorlaeufig_registriert |

## Naechste Arbeit pro Eintrag

- **/kontakt**: In sonderseiten-register aufnehmen; Labels/Headlines/Hinweistexte sukzessive nach cms_section_fields heben.
- **/kontakt/bcm**: In sonderseiten-register aufnehmen; Labels/Headlines/Hinweistexte sukzessive nach cms_section_fields heben.
- **/produkte/merkliste**: Registrieren; Leerzustand/Hinweistexte/CTAs als CMS-Felder definieren.
- **/produkte/tuerkommunikation/:pdpSlug**: In sonderseiten-register aufnehmen; Produkttexte/Beschreibungen aus Produkt-DB belassen, CMS-Rahmentexte ergaenzen.
- **/serviceportal**: In sonderseiten-register aufnehmen; sichtbare Texte (Labels, Hinweise, Erfolg/Fehler) als CMS-Felder vorsehen.
- **/serviceportal/passwort-vergessen**: In sonderseiten-register aufnehmen; sichtbare Texte (Labels, Hinweise, Erfolg/Fehler) als CMS-Felder vorsehen.
- **/serviceportal/registrieren**: In sonderseiten-register aufnehmen; sichtbare Texte (Labels, Hinweise, Erfolg/Fehler) als CMS-Felder vorsehen.
