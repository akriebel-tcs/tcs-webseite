# Serviceportal · Status

**Stand: 2026-04-21**

## Aktueller Stand

Der Bereich `/serviceportal` ist ein **Prototyp/Dummy** und dient als Designvorlage und Konzeptvisualisierung. Er bildet keine produktive Funktionalität ab.

- Login ist ein **Demo-Login** (Kundennummer `123` / Passwort `tcs`).
- Es gibt **keine echte Authentifizierung**, keine Sessionverwaltung, keine sichere Tokenverwaltung.
- Es gibt **keine echte Kunden-, Anlagen-, oder Projektdatenverwaltung**.
- Downloads, Shop, Chat und alle Tiles sind **statische Mock-Daten** ohne Backend-Anbindung.
- Passwort-vergessen- und Registrieren-Formulare sind **UI-Prototypen** ohne tatsächliche Verarbeitung.
- Die i18n-Migration in Etappe 16b stellt nur die sichtbaren Texte auf DE/EN um. Die Logik bleibt unverändert.

## Zielbild (Konzept, nicht zugesagt)

Perspektivisch könnte das Serviceportal folgende Funktionen abbilden:

- Kunden-/Self-Service-Bereich für Stammdaten und Kontaktinformationen
- Anlagenverwaltung mit Konfigurations- und Wartungshistorie
- RMA-/Garantie-Workflow
- Serviceeinsatz-Anforderung
- KI-gestützter technischer Support-Chat (System- & Großanlagen)
- Software-/Firmware-Downloads und Lizenzcodes
- Direktbestellung von Ersatzteilen
- Optionale Chatbot-Kontextintegration

## Offene technische Entscheidungen

Bevor aus dem Prototyp ein produktives Portal wird, sind unter anderem zu klären:

- **Authentifizierung**: Auth-Provider, Mehrfaktor, Session-/Token-Strategie
- **Backend**: eigene API, Lovable Cloud / Supabase, oder Anbindung an bestehendes CRM/ERP
- **Datenmodell**: Kunden, Anlagen, Konfigurationen, Tickets, Bestellungen
- **Rollen & Rechte**: Kunde, Fachpartner, interner Support, Admin
- **DSGVO / Compliance**: Datenhaltung, Aufbewahrung, Logging, Auftragsverarbeitung
- **Integration**: ERP/CRM-Anbindung, Bestell- und Versandprozesse, RMA-Workflow
- **KI-Chat**: Modellwahl, Datenquellen, Halluzinationsschutz, Eskalation an menschlichen Support

Bis zu dieser Entscheidung bleibt der Bereich bewusst als Prototyp gekennzeichnet.
