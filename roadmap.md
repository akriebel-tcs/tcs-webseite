# Roadmap

- [x] Karten-Icons Vorteile/Benefits (N-003, N-025): 24 px (h-6/w-6), Strichstärke 1.75 über `CARD_ICON_STROKE`.
- [x] N-046 / P-128 Kontakt: vier Subnav-Register (Vertrieb Deutschland, Vertrieb Österreich, Vertriebsleitung, Schulungszentren) angelegt; Kontaktseite an den generischen CMS-Renderer angeschlossen, `tab_v1` mit optionalem Bild-Slot `image`.

## Übersetzungswerkzeug CMS-Light (Auftrag 2026-09-11)
- [x] Migration Sprachregistry/Läufe/Kostensätze in uvkubrrljyzfvbvejepl angewendet
- [x] Dynamische Sprachprüfung (weitere Sprachen ohne Schemaänderung)
- [x] Edge Function `cms-translation-run` (Dry-run, Start, Schritt, Pause/Fortsetzen/Abbruch, QA)
- [x] Tab „Übersetzungen“ direkt nach „Wahrheits-Check“
- [x] Tests (131), Typecheck, Build, Wahrheits-Check, Security-Advisors (99 = Altbestand)
- [x] Edge Function `cms-translation-run` deployt (nur CMS-Light)
- [x] Preview-Prüfung: Tab sichtbar, Vorschau live, Laufliste aus DB (leer, da Pilotseiten vollständig)
- [x] Dokumentation/Status aktualisiert (`docs/04-betrieb/uebersetzungswerkzeug.md`, `docs/current-status.md`)
## Übersetzungswerkzeug — Bedienbarkeit + Serverbetrieb (Auftrag 2026-09-11, Teil 2)
- [x] Auswahl Zielsprache/Anbieter/Modell: Lade-, Leer- und Fehlerzustand mit „Neu laden“ statt tot wirkender Liste
- [x] Standardmodell folgt dem Anbieter (Lovable AI → GPT-6 Astra); nicht konfigurierte Anbieter sperren den Start
- [x] Browser-Schleife entfernt; Verarbeitung über serverseitige Nachschau (Minutentakt nur bei offenen Läufen, Selbstabschaltung)
- [x] Lauf-Übernahme per Lease inkl. Wiederaufnahme nach Browserende/Absturz; laufender Lauf wird nach Neuladen automatisch gezeigt
- [x] Nachweis: Kontrolllauf (0 offene Felder, keine Inhaltsänderung) wurde ohne Browser vom Server abgeschlossen, Zeitplan danach entfernt
- [x] Tests 140, Typecheck, Build, Security-Advisors 99 (Altbestand), Preview Desktop + Handy

- [ ] Offen (wartet auf Freigabe): erster echter Übersetzungslauf mit Inhalt (neue Seiten im PL-Umfang) und PL-Freigabe/Veröffentlichung

## Sprach-Arbeitsbereich: alle Datenbereiche (Auftrag 2026-09-11, Teil 3)
- [x] Kanonische Gesamtmenge `cms_translation_units` (Bausteine, Seitentitel, Navigation label/description, Bild-Alt `alt_de/en/pl`)
- [x] Coverage/Dry-run/Batch/QA/Maschinenschreibweg auf alle Bereiche umgestellt (Migrationen live)
- [x] Textliste `rpc_admin_list_translation_units` + `rpc_admin_update_translation_unit` (manuell = geprueft)
- [x] Ladezeit der Liste behoben (Regeln eingerechnet, Zeitgrenze/Parallelität je Funktion)
- [x] Tab „Übersetzungen“: Textliste mit Filter/Paging + Bereichszahlen
- [x] Inhalte-Editor: Sprachumschalter aus `cms_locales` (dieselben DB-Werte)
- [x] Edge Function: Bereichsfelder in Dry-run/Start/Worker/QA/CSV/PDF + Deployment
- [x] Freigabe-Gate: Titel/Navigation/Bild-Alt nur bei je Sprache freigeschalteter Seite
- [x] Tests (152), Typecheck, Build, Wahrheits-Check, lesende Verifikation, Doku

## PDP-Route: Artikelnummer direkt auflösen (Auftrag 2026-09-13)
- [x] Gültige TCS-Artikelnummer in der Adresse geht direkt in den sprachlokalisierten PDP-Vertrag (Sichtbarkeit weiterhin serverseitig)
- [x] Slug-Auflösung nur noch für echte redaktionelle Slugs, mit konservativen Seiten (200 statt 1000)
- [x] Regressionstest (344 Tests), Typprüfung, Build gruen; Sprachwechsel NL→PL→EN→NL→DE ohne Neuladen geprueft (Vorschau-Server dieses Projekts)
- [ ] Gegenpruefung in der geteilten Lovable-Vorschau durch Thomas (Login-geschuetzt, fuer Lovable nicht aufrufbar)

## Geschützter Gesamt-Export CMS-Light (Auftrag 2026-09-14)
- [x] Additive, rein lesende Struktur-Funktion `rpc_internal_cms_schema_snapshot` (nur service_role)
- [x] Neue Edge Function `cms-snapshot-export` (Freigabe je Anfrage über vorhandene `admin_session`, fail closed, feste Tabellenliste, Keyset-Paging ≤1000)
- [x] Datenpaket v3 im Snapshot-Tab: Passwortfreigabe, Fortschritt/Abbruch, Prüfungen, Manifest mit SHA256
- [x] Medienpaket: vollständiges Bucket-Inventar + wiederaufnehmbarer PowerShell-Downloader, externe Quellen getrennt ausgewiesen
- [x] Tests 396 (22 neu), Typprüfung, Build; Negativprüfung live (401/403/42501) ohne Datenabfluss
- [ ] Offen: positiver Ende-zu-Ende-Export durch Thomas (Adminpasswort liegt nur auf dem Server)
- [x] Medieninventar ohne rekursiven Ordnerdurchlauf (service-only Lese-RPCs, Keyset + SQL-Aggregat) — behebt den 150s-Timeout im Datenpaket
- [x] Eigener geschützter Weg „Nur Medienpaket herunterladen" als Ergänzung zu einem unvollständigen Datenpaket
- [ ] Positiver Lauf durch Thomas: Medienpaket laden, `manifest.json` → `status` muss `complete` sein, danach `media/Download-Medien.ps1` für die echten Bilddateien

## Etappe 1 CMS-Light-Reparatur (Auftrag 2026-09-14)
- [x] Widersprüche in den aktiven Einstiegsdokumenten bereinigt, Juni-Ergebnisse als Historie datiert
- [x] Verbindlicher Arbeitsablauf im Dachdokument (Abschnitt 11), keine zweite Vertragsdatei
- [x] `i18n:contract` fail-fast; neuer lokaler Befehl `npm run cms:preflight`
- [x] 7 Orchestrierungstests (Abbruch, Startfehler, Exitcode-Weitergabe) — 448 Tests grün
- [ ] Offen (fachfremd, nicht in dieser Etappe): `i18n:ui-catalog:check` ist rot (Manifest nicht aktuell)
- [ ] Offen: frische Messung der CMS-Gates (Wahrheits-Check, Coverage, Spiegel-Audit) — bis dahin „ungeprüft"
- [ ] Offen: Versions-/Transaktionsschutz für redaktionelle Schreibwege
- [x] Nachtrag Etappe 1: überholte Regel-/Statusfassungen archiviert (Index mit Ursprung/Datum/Nachfolger), `docs/README.md` ohne Gesamtgrün-Aussage
- [x] Nachtrag Etappe 1: `cms:preflight` prüft `tsconfig.app.json` UND `tsconfig.node.json` mit `-p --noEmit`; keine Semikolon-Verkettung in npm-Skripten

## Etappe 1 Restkorrekturen (Auftrag 2026-09-14, Review 2cf7042c)
- [x] `.lovable/always-follow.md` widerspruchsfrei: kein „freeze-reif/alle Gates 0", keine parallele Prozesskopie, Dachdokument führend; frühere Fassung datiert archiviert
- [x] Dachdokument Abschnitte 1–10 mit Abschnitt 11 harmonisiert (Sprachen, Abschlussnachweise); frühere Fassung archiviert
- [x] `docs/lovable-custom-rules.md` + `docs/ai-start-prompt.md` eng begrenzt archiviert, aktive Pfade als Kurzverweis
- [x] Kompaktregeln: i18n-Bedien-Texte nur dokumentierter Übergang/Notfall
- [x] Archivindex und `docs/03-redaktion/redaktions-aenderungsprotokoll.md` fortgeführt
- [x] `scripts/ci/preflight.mjs`: CLI-Erkennung über `pathToFileURL(resolve(...))`, Tests inkl. `#`/`%`-Pfade und echtem Child-Prozess
- [x] Transaktionsformulierung präzisiert (einzelne RPCs transaktional; fehlend: Mehrfeld-Klammer + Versionsabsicherung)
- [x] Offener Befund dokumentiert: UI-Katalog-Manifest 414 gespeichert ≠ 422 generiert — bewusst nicht synchronisiert
- [ ] Offen (eigener Auftrag, wartet auf Freigabe): UI-Katalog-Manifest synchronisieren
- [ ] Offen (eigener Auftrag): Versionsabsicherung/Mehrfeld-Klammer für redaktionelle Schreibwege

- [x] Card dividers: at least one text line spacing between "Beschreibung" and the divider
