# Batch 2 — Anwendungen-Detailseiten — Abnahme

Stand: 2026-06-04

Ziel: Auf gleichförmig gebauten Anwendungen-Branchen-Pages das Spiegel-Pattern
„hartcodierter Block bleibt an `cms.sections` gebunden" konsistent anwenden,
ohne Einzel-Flick und ohne Inhalts- oder Sortierungsänderung.

## 1. Read-only Vorprüfung

Cluster A der Masterliste enthält 13 Pages. Davon sind nur **5 Pages** echte
„Anwendungen-Branchen-Detailseiten" mit Direction-A/B-Befunden (Spiegel-Bruch
zwischen DB-Section und hartcodiertem Block):

| Page | Section-Keys (A/B) | Datei |
|---|---|---|
| `anwendungen.bildungseinrichtungen` | `sections`, `einrichtungen` | `BildungseinrichtungenPage.tsx` |
| `anwendungen.gesundheitseinrichtungen` | `section`, `cards` | `GesundheitseinrichtungenPage.tsx` |
| `anwendungen.objektloesungen` | `content`, `section`, `items` | `ObjektloesungenPage.tsx` |
| `anwendungen.oeffentliche-hand` | `section`, `cards` | `OeffentlicheHandPage.tsx` |
| `anwendungen.referenzprojekte` | `content` | `ReferenzprojektePage.tsx` |

Die restlichen 8 Cluster-A-Pages (`anwendungen.funktionen.*`,
`anwendungen.referenzen.detail`) führen ausschließlich Klasse-C-Befunde
(Restschuld — kein DB-Pendant). Diese gehören in Batch 7 (Inhalt-zuerst-
Migration), nicht Batch 2.

### Sonderfall

- `ReferenzprojektePage`: nur eine relevante Section (`content`), Liste der
  Referenzprojekte selbst läuft über `referenzprojekte`-Code-Konstante und
  ist als Klasse C (`projekte` ohne DB-Pendant) bewusst markiert.

## 2. Pattern

Pro Page ein einheitlicher Schritt:

1. Direkt nach `hasRichContent` werden pro betroffener `section_key` boolesche
   Visibility-Konstanten eingeführt:

   ```ts
   const showEinrichtungen =
     !cms.hasDbContent || cms.sections.some(s => s.section_key === "einrichtungen");
   ```

   Solange keine DB-Inhalte da sind (`!cms.hasDbContent`) → Fallback-Modus,
   alles rendert. Sobald DB-Content existiert, muss die Section auch aktiv
   sein (RLS liefert nur `is_active=true`), sonst wird der hartcodierte
   Block ausgeblendet.

2. Der hartcodierte JSX-Block wird in `{showXxx && showYyy && (...)}`
   eingewickelt. Keine Inhalts- oder Sortierungsänderung.

3. Marker für die spätere Buchführung: Kommentar
   `HARDCODED_CONTENT_WITH_ADMIN_VISIBILITY_BINDING` direkt über den
   Konstanten.

Die Idiom-Form `cms.sections.some(s => s.section_key === "<key>")` ist
bewusst so gewählt, dass die Heuristik in
`scripts/cms/public-blocks-ignorieren-admin-visibility.mjs` (`hasGate`) sie
als Visibility-Gate erkennt. Arrow-Parens (`(s) =>`) würden die Regex brechen.

## 3. Geänderte Dateien

- `src/features/anwendungen/pages/BildungseinrichtungenPage.tsx`
- `src/features/anwendungen/pages/GesundheitseinrichtungenPage.tsx`
- `src/features/anwendungen/pages/ObjektloesungenPage.tsx`
- `src/features/anwendungen/pages/OeffentlicheHandPage.tsx`
- `src/features/anwendungen/pages/ReferenzprojektePage.tsx`

Keine Änderungen an `CmsPageLayout`, keinem zentralen Renderer, keinen
Inhalten, keinem Layout, keiner Sortierung.

## 4. Befundzahlen vorher/nachher

| Kennzahl | vor Batch 2 | nach Batch 2 | Δ |
|---|---|---|---|
| 🔴 rot (High) | 0 | **0** | — |
| 🟡 gelb medium (B `PUBLIC_BLOCK_IGNORIERT_DB_VISIBILITY`) | 54 | **50** | −4 |
| 🟡 gelb Restschuld (`PUBLIC_BLOCK_OHNE_DB_BINDUNG`) | 34 | **34** | — |
| 🟡 gelb medium A (`AKTIVE_DB_SECTION_OHNE_PUBLIC_RENDERPFAD`) | 92 | **82** | −10 |
| Masterliste gesamt | 180 | **166** | −14 |
| Cluster A medium (5 Branchen-Pages) | 14 | **0** | −14 |

Alle Direction-A- und Direction-B-Befunde der fünf Branchen-Pages sind in
beiden Audits aufgelöst (`public-blocks-ignorieren-admin-visibility.json` →
gefilterte Liste „anwendungen.*" = 0).

## 5. Browser-Stichprobe

Stichprobe live im Sandbox-Preview, Locale `de`:

| Route | Erwartung | Befund |
|---|---|---|
| `/anwendungen/bildungseinrichtungen` (`einrichtungen` + `sections`) | Hero + 3 Einrichtungs-Blöcke (Kita/Schule/Wohnheim), DB-Badge „4 Sections" | ✅ sichtbar, kein Doppelrender |
| `/anwendungen/objektloesungen` (`content` + `section` + `items`) | Hero + Lead + 8 Items-Grid, DB-Badge „5 Sections" | ✅ sichtbar, kein Doppelrender |
| `/anwendungen/oeffentliche-hand` (`cards` + `section`) | Hero + 3 Cards (Behörde/Feuerwehr/Schwimmbad), DB-Badge „4 Sections" | ✅ sichtbar, kein Doppelrender |

Live-Test „Section aus-schalten" wurde NICHT in der DB durchgeführt
(produktive DB, keine Test-Mutation gewollt). Das Verhalten ist deterministisch
durch die `cms.sections.some(...)`-Heuristik abgedeckt: RLS liefert keine
deaktivierten Sections, die Konstante wird `false`, der hartcodierte Block
verschwindet.

## 6. Sonderfälle / bewusste Restschuld

- `anwendungen.referenzprojekte` Section `projekte`: ohne DB-Pendant
  (Klasse C). Liste der Referenzprojekte bleibt im Code, weil sie über
  separate Sub-Pages und deren Hero-Assets aufgebaut wird. Markiert als
  `HARDCODED_CONTENT_WITHOUT_DB_PENDANT` → Batch 7.
- 8 `anwendungen.funktionen.*`-Pages (BidirektionaleVideo, Concierge,
  DigitaleNamensverwaltung, Feuerwehrdurchsage, InterneKommunikation,
  MobileTuerkommunikation, ZutrittskontrolleBCM) und
  `anwendungen.referenzen.detail`: ausschließlich Klasse C, Inhalts-zuerst-
  Migration erst in Batch 7. Hier kein Visibility-Bruch möglich, weil keine
  DB-Sections existieren, die irgendetwas schalten könnten.

## 7. Offene Risiken

- Visibility-Gate setzt voraus, dass DB-Inhalte vollständig sind. Wenn ein
  Editor die DB-Inhalte teilweise löscht (statt is_active=false zu setzen),
  bleibt `cms.hasDbContent=true`, aber die Section fehlt — dann verschwindet
  der Block. Dokumentierte erwartete Wirkung der Spiegel-Regel; im
  Redaktionshandbuch bereits adressiert.
- Keine i18n-Änderungen; keine Layout-Änderungen; keine Sortierungs-
  Änderungen.
- Keine Test-Mutation in der DB durchgeführt — sollte beim nächsten Admin-
  Smoketest mit aus/an-Toggle bewiesen werden.

## 8. Status nach Batch 2

- 🔴 rot: **0**
- 🟡 gelb medium (gesamt): **132** (vorher 146)
- 🟡 gelb Restschuld: **34** (unverändert)
- Masterliste: **166** (vorher 180)
- Cluster A medium: **0** (vorher 14)
- Keine neuen High-Blocker, keine Regression in anderen Clustern.

Batch 3 (Eingangssysteme-Sub-Pages) wird auf Anweisung NICHT gestartet.
