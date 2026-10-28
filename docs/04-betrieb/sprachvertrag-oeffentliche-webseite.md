# Sprachvertrag der öffentlichen Webseite

> Ergänzung 2026-09-12: Die wiederverwendbaren Bedienungstexte sind jetzt als
> Bereich `ui_string` Teil derselben Übersetzungseinheiten wie die Seiteninhalte.
> Details, Zahlen und Messwerte: [Gemeinsamer Sprachkatalog](./sprachkatalog-ui-texte.md).


Stand: 2026-09-12 · Projekt: `tcs-webseite-db-cms` (CMS-Light)
Nur Webseite/CMS geprüft. Produktdatenbank ausschließlich lesend. Keine
Veröffentlichung, kein neuer Übersetzungslauf.

Ziel: Bei der nächsten neu freigegebenen Sprache darf kein sichtbarer Text
unbemerkt durch den serverseitigen CMS-Lauf fallen.

## 1. Die vier Gruppen

| Gruppe | Inhalt | Wahrheitsquelle | Prüfung |
|---|---|---|---|
| 1 | Seiten-/Blockinhalte: Überschriften, Texte, Linkbeschriftungen (`link_<n>_label`), Bildunterschriften, Alt-Texte, Seitentitel, Navigationslabels | CMS-Light (`cms_section_fields`, `cms_pages`/`cms_page_translations`, `cms_navigation_nodes`/`…_node_translations`, `cms_assets`/`cms_asset_translations`) | wird vom bestehenden Übersetzungslauf als Einheit erfasst |
| 2 | Wiederverwendbare Bedientexte: Buttons, Filter, Sortierung, Merkliste, Leer-/Lade-/Fehlerzustände, Vorlesehilfen | i18n-Namespaces im Code (`common`, `navigation`, `service`, …) | neues Audit + Test |
| 3 | Produktnamen, Serien, Kategorien, PDP-/Kartentexte, technische Anzeige-Bezeichnungen und -Werte | Produktdatenbank (read-only) | dürfen nicht in CMS/i18n dupliziert werden |
| 4 | Technische Schlüssel, Feldnamen, Slugs, URLs, Artikelnummern, IDs, Markennamen | bewusst nicht übersetzbar | Allowlist im Audit |

## 2. Was der Übersetzungslauf erfasst

Übersetzbare Einheiten (`cms_translation_units`): `section_field`,
`page_title`, `nav_label`, `nav_description`, `asset_alt`. Technische Werte
werden von `cms_field_is_translatable` ausgeschlossen. Manuell geprüfte
Zielwerte werden nie überschrieben (`skipped_manual`).

## 3. In dieser Runde behobene Lücken (Gruppe 2)

- Merkliste (Seite + Anzeige in der Kopfzeile): Titel, Leer-/Ladezustand,
  Vergleich, Anfrage, Entfernen, Hinweise → `service:katalog.merkliste.*`
  in DE/EN/PL.
- Produktvorschau (PDP-Dialog): Zurück, Direktanfrage, Merkliste, Hinweise.
- Katalogfilter: „Farbe“, „Serie“, „Zurücksetzen“ → `service:katalog.filters.*`.
- Katalog-Diagnosezustände → `service:katalog.diagnostics.*` (PL ergänzt).
- Gemeinsame Bedientexte: „Kein Bild gepflegt“, „Badge ausblenden“,
  „Lade Seite …“, „Noch keine Kategorien hinterlegt“ → `common:ui.*`.
- Vorlesehilfen: Rollen-Tabs, Abschnittsnavigation, Scroll-Pfeile →
  `navigation:a11y.*` bzw. `common:ui.scrollLeft/scrollRight`.
- Polnische Navigations-Datei angelegt und registriert (Sprungmarke,
  Meta-/Persona-/Brotkrumen-Texte, Fußzeilen-Copyright).
- Zweisprachige Notfalltexte `loc === "en" ? "Learn more" : "Mehr erfahren"`
  in 9 Seiten ersetzt durch `learnMoreFallback(locale)`
  (`src/i18n/uiFallbacks.ts`, liest `common:ui.learnMore`). Damit erzwingt
  keine neue Sprache mehr stillschweigend Deutsch. Die eigentliche
  Linkbeschriftung bleibt CMS-Inhalt (`link_<n>_label`).
- Kategorieseiten: CTA-Beschriftung ist nicht mehr auf DE/EN festgelegt,
  sondern sprachoffen mit `common:ui.learnMore` als Rückfall.
- `hero.subline`/`hero.intro`-Regelung und Erfassung der `*_label`-Felder
  bleiben unverändert bestehen (kein Rückbau).

## 4. Was bewusst im Code bleibt

- Gruppe-2-Bedientexte in `src/i18n/locales/<sprache>/*.json` — sie sind
  seitenunabhängig und mehrfach verwendet.
- Routen, Slugs, Layout, Reihenfolgeschalter, Marken-/Produktlogik.
- Zahlen-/Datumsformate über Format-Sprachcodes (`de-DE`, `en-GB`) —
  technisch, kein sichtbarer Text.
- Notfall-Beschriftungen (Fallbacks), falls ein CMS-Feld noch leer ist.

## 5. Produktdatenbank (Gruppe 3)

Produktnamen, Serien, Kategorien, PDP-Felder, Datenblattbezeichnungen und
technische Werte kommen ausschließlich aus der Produktdatenbank und werden
nicht kopiert. Sie liegen dort derzeit auf Deutsch und Englisch; für
Polnisch liefert die Produktdatenbank deutschen Rückfall. Das ist eine
offene Aufgabe in der Produktdatenbank, nicht in CMS-Light.

## 6. Automatische Prüfung

- `npm run i18n:sprachvertrag` — lesbarer Bericht
- `npm run i18n:sprachvertrag:strict` — CI-Gate (Exit 1)
- `npm run i18n:sprachvertrag:json` — schreibt
  `scripts/i18n/output/sprachvertrag-audit-latest.json`
- `src/test/sprachvertrag.test.ts` — läuft im normalen Testlauf mit

Gemeldet werden: fehlende Schlüssel je Sprache/Namespace (hart für
Bedientexte, Hinweis für CMS-gebundene Seiten), zweisprachige
Notfall-Ausdrücke und verdächtige sichtbare Textliterale. Konfiguration und
Allowlist: `scripts/i18n/sprachvertrag-audit.config.json`.

Grenzen des Prüfskripts (bewusst): es arbeitet offline mit der dort
gepflegten Sprachliste `de/en/pl` — laufende Wahrheit ist `cms_locales`,
die Liste muss bei einer neuen öffentlichen Sprache dort nachgezogen
werden. Sichtbarer Text mit Klammern wird nicht gemeldet, um Falschmeldungen
aus Code-Ausdrücken zu vermeiden.

Ergebnis am Berichtstag: 173 Dateien geprüft, 0 harte fehlende
Bedientext-Schlüssel, 0 verdächtige Literale, 116 Hinweise.

## 7. Verbleibende Hinweise (116)

- 39 Hinweise: Seiten-Rückfalltexte in `home`, `anwendungen`,
  `gebaeudekommunikation`, für die es keine polnische JSON-Datei gibt. Diese
  Inhalte kommen auf der Webseite aus CMS-Light und sind dort polnisch
  vorhanden; die JSON-Werte sind nur Notfall.
- 77 Hinweise: polnische Notfall-Beschriftungen der Brotkrumen-Abschnitte
  (`navigation.breadcrumb.segments.*`). Führend sind die Seitentitel aus
  CMS-Light. Nachziehen erst nach Auftrag.

## 8. Zustand des letzten PL-Laufs (nur gelesen)

Lauf `00758c8b-c84f-424e-82cd-f1b64d56e63a`, Ziel `pl`, Status `done`,
beendet 2026-09-12 07:14 UTC: 2.596 geplant, 2.591 übersetzt,
5 übersprungen (`skipped_manual`), 0 Fehler.

Die 5 übersprungenen Einheiten sind nachweislich `section_field/text` auf
den Rechtsseiten `legal.agb` (23.326 Zeichen), `legal.agbEinkauf` (13.609),
`legal.datenschutz` (25.999), `legal.datenschutzSnipdoo` (21.036) und
`legal.garantiebedingungen` (4.024). Alle fünf sind als übersetzbar
freigegeben, haben keinen polnischen Zielwert (`target` = leer) und stehen
weiter als offen (`is_todo` = true).

Ursache ist nachweisbar die Längenschranke der Übersetzungsfunktion:
Quelltexte über `MAX_SOURCE_LENGTH` = 4.000 Zeichen werden als
`skipped_manual` mit `error = source_text_too_long` abgelegt. Es handelt sich
also **nicht** um bereits vorhandene, geschützte manuelle Zielwerte. Diese
überlangen Rechtstexte müssen abschnittsweise (segmentiert) übersetzt und
rechtlich geprüft werden — als eigener, ausdrücklich zu beauftragender
Vorgang. Offene Restlücke.


## 9. Nachweise dieser Runde

Typprüfung grün, 209 Tests grün, Build „build OK“. Browserprüfung mit
Sprache Polnisch: Startseite, Merkliste und Service-Hub in Polnisch,
`lang="pl"`, keine seitenbezogenen Konsolenfehler. Sichtbar deutsch bleiben
nur Produktwerte aus der Produktdatenbank und die noch nicht polnisch
gepflegten Brotkrumen-Abschnitte.

## Nachtrag: Sprachabdeckung der Pruefskripte (Stand 2026-09-12)

- `scripts/i18n/validate-i18n.mjs` prueft laut `i18n-check.config.json` bewusst
  weiterhin nur `de`/`en` (Struktur- und Seitenpflicht der Altpruefung). Zwei
  Eintraege in `strictPages`, deren Dateien nicht mehr existieren, wurden
  entfernt; damit meldet die Pruefung keine Phantomfehler mehr.
- Die Sprachabdeckung fuer alle aktiven/gebundelten oeffentlichen Sprachen
  uebernimmt `scripts/i18n/sprachvertrag-audit.mjs`. Die Zielsprachen werden
  jetzt automatisch aus `src/i18n/types.ts` (`SUPPORTED_LANGUAGES`) und dem
  `resources`-Block in `src/i18n/index.ts` gelesen und mit
  `sprachvertrag-audit.config.json` vereinigt. Konfigurationsdrift wird im
  Bericht (`configDrift`) ausgewiesen, die erkannte Sprache aber trotzdem
  geprueft. Grenze: das Offline-Skript kennt nur die im Code gebuendelten und
  konfigurierten Sprachen — eine ausschliesslich in `cms_locales` neu aktivierte
  Sprache erkennt es nicht.
- Erkannt aktuell: `de`, `en`, `pl`. Laufende Wahrheit bleibt `cms_locales` in
  CMS-Light; das Offline-Skript greift bewusst nicht auf die Datenbank zu.
- Aufrufe: `npm run i18n:sprachvertrag`, `:strict`, `:json` sowie
  `npm run i18n:contract` (Altpruefung + Sprachvertrag-Audit hintereinander).
- Ergebnis: 173 Dateien, 0 harte fehlende Code-Schluessel, 0 verdaechtige
  sichtbare Literale, 116 Hinweise. Die Hinweise betreffen ausschliesslich
  CMS-gebundene Seiten (Notfall-Fallbacks) und nicht gepflegte polnische
  Brotkrumen-Segmente; redaktionelle DB-Inhalte erzwingen dadurch keine
  vollstaendigen Code-Namespaces je Sprache.

## Nachtrag: Gate fuer die oeffentliche Sprachfreigabe (Stand 2026-09-12)

Weil der Offline-Audit eine nur in `cms_locales` aktivierte Sprache nicht
erkennen kann, sitzt die Absicherung jetzt im Admin selbst:

- `checkPublicReleaseReadiness(locale)` in
  `src/features/admin/api/cmsLocaleVisibility.ts` prueft gegen
  `BUNDLED_LOCALES` (`src/i18n/locale.ts`). Keine zweite Sprachliste.
- Intern aktivieren und uebersetzen bleibt jederzeit moeglich. „Auf der
  Website sichtbar" ist gesperrt, solange kein gebuendeltes Sprachpaket fuer
  die wiederverwendbare Bedien-Mikrocopy vorliegt. `setLocaleVisibility`
  bricht mit verstaendlicher Erklaerung ab, bevor der Schreibweg laeuft.
- `LocaleManagerPanel` deaktiviert den Sichtbar-Schalter und nennt im Klartext,
  welche Vorbereitung fehlt.
- Deutsch bleibt Quellsprache und immer oeffentlich.
- Redaktionelle DB-Inhalte erzwingen dadurch keine vollstaendigen Code-
  Namespaces: geprueft wird nur die wiederverwendbare UI-Mikrocopy.
- Test: `src/features/admin/api/__tests__/localeVisibility.contract.test.ts`.

## Nachtrag: Kein clientseitiger Sprach-Probe-Lauf mehr (Stand 2026-09-13)

Produktdaten (Liste, Filter, Karten, PDP, Datenblatt) werden **genau einmal**
mit der angeforderten, normalisierten Sprache aus der Produktbasis geholt.
Die Rueckfallkette angefordert → `en` → `de` loest die Produktbasis
feldweise auf.

- `src/features/service/catalog/api/pdp.ts`:
  `loadProductPdpLocalized` / `loadProductDatasheetLocalized` rufen
  `rpc_get_channel_product_pdp` bzw. `rpc_get_channel_product_datasheet`
  je einmal auf. `requestedOnlyResolution` haelt `resolvedLocale` gleich der
  angefragten Sprache; einzelne deutsche Rueckfallfelder stufen die
  Seitensprache nie global herab (`usedFallback` bleibt `false`).
- Technische Daten kommen ausschliesslich aus `pdp.technical_specs_display`.
- `proposed` und `approved` sind gleichwertig sichtbar; es gibt kein
  oeffentliches Freigabe- oder Status-Gate.
- Tests: `api/__tests__/pdpEnvelopeLocale.test.ts`,
  `api/__tests__/pdpLocalePassthrough.test.ts`,
  `api/__tests__/listingLocaleContract.test.ts`.

### Wiederverwendbare Bedientexte ohne stillen Deutsch-Rueckfall

`useCmsPageContent` bietet zusaetzlich `textInLocale(section, field, locale)`:
Lookup **ohne** Sprachkette. Damit erkennt ein Renderer, ob eine echte
Uebersetzung vorliegt. Beispiel `PersonaSection`: Linkbeschriftung zuerst aus
CMS-Light in der aktiven Sprache, danach der i18n-Bedientext derselben
Sprache, erst zuletzt die CMS-Sprachkette. Ein fehlender Wert zeigt damit
keinen deutschen Text mehr unter einer NL-/PL-Oberfläche.
