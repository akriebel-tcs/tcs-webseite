# Anwendungen — Strukturelle Standardisierung der Seitentypen

**Stand:** 2026-06-05 (nach Batch 31)
**Auftrag:** Strukturelle Bewertung des Bereichs `anwendungen` (TCS in Bauten):
Welche Seiten arbeiten bereits mit Standard-Bausteinen (`cards_v1`,
`card_v1`, `teaser_2col_v1`, `cta_v1`, `faq_v1`, `content_v1`), welche
laufen strukturell noch als Sonderlogik, was wäre der Migrationsweg,
und was darf in der aktuellen Freeze-Phase NICHT autonom umgebaut werden.

> **Wichtig — Auftragsabbruch nach Analyse:**
> Der vorliegende Auftrag bittet ausdrücklich darum, P-057 (und ggf.
> Nachbarseiten) strukturell auf Standardbausteine umzubauen, falls
> „sicher möglich". In der aktuellen Freeze-Lage (`.lovable/always-follow.md`,
> Batch 25–28) ist genau das NICHT sicher autonom durchführbar:
> Renderer-Umbau, Inhaltsmigration und neuer Section-Schnitt sind
> ohne expliziten Einzel-Auftrag pro Seite gesperrt. Der Auftrag selbst
> enthält die Eskalationsklausel „Wenn Umbau zu groß ist … nicht
> improvisieren, als bewusste Sonderseite dokumentieren". Dieser Bericht
> nutzt genau diese Klausel. Es wurde **keine** Migration, **keine**
> Renderer-Änderung und **keine** Inhaltsverschiebung durchgeführt.

---

## 1. Geprüfter Scope

Alle aktiven Seiten unter `page_key LIKE 'anwendungen.%'` (35 Stück,
Stand DB 2026-06-05):

- 1× T03-Hub: `anwendungen.root` (P-055)
- 6× T04-Übersicht: `anwendungen.objektloesungen` (P-056),
  `anwendungen.bildungseinrichtungen` (P-057),
  `anwendungen.wohnbau` (P-058),
  `anwendungen.gesundheitseinrichtungen` (P-059),
  `anwendungen.oeffentliche-hand` (P-060),
  `anwendungen.referenzprojekte` (P-077)
- 16× T05-Detail-Anwendungen (P-061…P-076)
- 12× T05-Referenzprojekt-Detailseiten (P-241…P-252)

Quellen: `cms_pages`, `cms_sections`, Renderer unter
`src/features/anwendungen/pages/`.

---

## 2. Zusammenfassung pro Seitenklasse

| Klasse | Seiten | Section-Typen heute | Renderer | Strukturstatus |
|---|---|---|---|---|
| T03 Hub (`anwendungen.root`) | P-055 | hero_v1, content_v1 (Card-Section), teaser_2col_v1 ×5, cards_v1, card_v1 ×8, faq_v1, cta_v1 | `AnwendungenPage` + `renderPageSectionByType` | **Standard-nah.** Mix aus eigenem Layout-Frame und Standard-Bausteinen. Kein akuter Umbaubedarf. |
| T04 Detail-Anwendungen-Index | P-061…P-076 (16 Seiten) | hero_v1 + cards_v1+card_v1 (Anforderungen) + 4× content_v1 (`content`, `leistungen`, `systembausteine`, `broschure`) + faq_v1 + cta_v1 | je eigene Page-Komponente (~55–62 LOC) | **Halbstandard.** Karten-Block ist sauberer Standard. Vier flache `content_v1`-Sektionen (Content/Leistungen/Systembausteine/Broschüre) sind heute redaktionelle Textblöcke ohne Karten-Modell. Editierbar (Batch 31), aber strukturell noch Textcontainer. |
| T04 Objektlösungen | P-056 | hero_v1, content_v1 ×3 (`content`, `section`, `items`), faq_v1, cta_v1 | `ObjektloesungenPage` (116 LOC) | **Sonderlogik.** `items` rendert 8 hartkodierte Domänen-Kacheln (kita … baeder) als flacher `content_v1`-Container, keine Kind-Karten. |
| T04 Bildungseinrichtungen | P-057 | hero_v1, content_v1 ×2 (`sections`, `einrichtungen`), faq_v1, cta_v1 | `BildungseinrichtungenPage` (234 LOC) | **Sonderlogik (hart).** 3 Einrichtungen (Kita/Schule/Wohnheim) als Code-Array. Pro Einrichtung: Bild/Text + n Anforderungen + 3 Leistungs-Listen + Broschürenlink. Alles in 2 flachen `content_v1`-Sektionen abgelegt, Schlüssel deeply nested (`kita.anforderungen.sicherheit.label`, `kita.leistungen.sicherheit.punkte.0`, …). |
| T04 Wohnbau | P-058 | hero_v1, content_v1 (`section`), cards_v1 (`cards`, product_scroller_v1) + card_v1 ×4 (Einfamilienhaus/Mehrfamilienhaus/Großanlage/Sanierung), faq_v1, cta_v1 | `GenericCmsPage` | **Standard.** Bereits sauber in card_v1-Kinder zerlegt; nur ein content_v1-Textblock daneben. Kein Umbaubedarf. |
| T04 Gesundheit | P-059 | hero_v1, content_v1 ×2 (`section`, `cards`), faq_v1, cta_v1 | `GesundheitseinrichtungenPage` (137 LOC) | **Sonderlogik.** 2 Kacheln (Pflege/Klinik) als Code-Array, Inhalte in flachem `content_v1` (`cards`) mit Schlüsseln wie `pflege.tags.0`. |
| T04 Öffentliche Hand | P-060 | hero_v1, content_v1 ×2 (`section`, `cards`), faq_v1, cta_v1 | `OeffentlicheHandPage` (138 LOC) | **Sonderlogik.** Identisches Muster wie P-059, aber 3 Kacheln (Behörde/Feuerwehr/Schwimmbad). |
| T04 Referenzprojekte (Index) | P-077 | hero_v1, content_v1 (`content`), faq_v1, cta_v1 | `ReferenzprojektePage` (115 LOC) | **Sonderlogik (mittel).** Liste der Referenzprojekt-Kacheln wird **nicht** aus Kind-Sections gerendert, sondern aus dem Code-Datenmodul `src/features/anwendungen/data/referenzprojekte.ts`; Heros der Sub-Pages werden per `useCmsAssetsForPages` zusammengelesen. |
| T05 Referenzprojekt-Details | P-241…P-252 | sehr unterschiedlich (siehe DB) | `ReferenzprojektDetailPage` (190 LOC) | **Sonderlogik.** Carousel + Listen-Felder (JSON-String in `cms_section_fields.value`), keine echten Kind-Sections. |

Hinweis: T04 Übersichtsseiten haben die `faq`-Section heute global
inaktiv (`is_active = false`). Die Spiegel-Regel zeigt das korrekt — es
ist kein Befund, sondern bewusster Stand.

---

## 3. Pflichtfall P-057 (Bildungseinrichtungen) — strukturelle Bewertung

### 3.1 Was die öffentliche Seite tatsächlich rendert

Pro Einrichtung (Kita/Schule/Wohnheim) wird gerendert:

1. Eyebrow-Label + Headline + Intro-Text
2. großes Bild
3. „Typische Anforderungen" — Icon + Label + Kurztext, n Karten in 3-Spalten-Grid
4. „Systemleistungen" — 3 Spalten, je Spalte Bereichstitel + ungeordnete Punkteliste
5. Broschüren-Link (PDF, externer Download)

### 3.2 Was in der DB liegt

- Section `sections` (`content_v1`): zwei generische Labels
  („anforderungen", „leistungen", „broschure"-Linklabel).
- Section `einrichtungen` (`content_v1`): **alle Inhalte aller drei
  Einrichtungen** in einem einzigen Flachcontainer, Schlüssel z. B.
  `kita.label`, `kita.anforderungen.sicherheit.label`,
  `kita.leistungen.sicherheit.punkte.0`,
  `kita.image` (Asset), `kita.anforderungen.sicherheit.icon` (Text),
  `kita.anforderungen.sicherheit.icon_image` (Asset).
- Renderer `BildungseinrichtungenPage.tsx`: hartkodiertes Array der
  drei Einrichtungen, Reihenfolge der Anforderungen, Mapping
  Lucide-Icon-Fallback, Broschüren-URL.

### 3.3 Wie ein sauberes Standard-Modell aussähe

```text
P-057 anwendungen.bildungseinrichtungen
├── hero                                  (hero_v1)
├── einrichtungen                         (cards_v1)
│   ├── einrichtung_kita                  (card_v1)            ← Bild/Text + CTA
│   ├── einrichtung_schule                (card_v1)
│   └── einrichtung_wohnheim              (card_v1)
├── anforderungen_kita                    (cards_v1)
│   ├── anf_kita_sicherheit               (card_v1)
│   ├── anf_kita_barrierefrei             (card_v1)
│   └── …                                 (card_v1, je 1 Karte)
├── anforderungen_schule                  (cards_v1) + n × card_v1
├── anforderungen_wohnheim                (cards_v1) + n × card_v1
├── leistungen_kita                       (cards_v1 oder content_v1+Listen-Modell) + n × card_v1
├── leistungen_schule                     (analog)
├── leistungen_wohnheim                   (analog)
├── broschure_kita                        (cta_v1 oder content_v1 mit cta_link)
├── broschure_schule                      (cta_v1)
├── broschure_wohnheim                    (cta_v1)
├── faq                                   (faq_v1)
└── standard_cta                          (cta_v1)
```

Damit wäre die Seite vollständig im Admin über die Standard-Karten- und
Standard-Baustein-Workspaces pflegbar (Reihenfolge, Aktiv/Inaktiv,
Hinzufügen, Löschen, Duplizieren je Karte).

### 3.4 Warum hier KEIN autonomer Umbau erfolgt

- **Renderer-Pflicht:** `BildungseinrichtungenPage.tsx` müsste vollständig
  durch einen Standard-Render-Pfad (`renderPageSectionByType` oder eine
  schlanke Section-Liste) ersetzt werden, **inkl.** Layoutregeln
  (alternierendes Background pro Einrichtung, Anforderungs-Grid 3-spaltig,
  Leistungs-Spalten als Listen-Karten). Das ist Renderer-Umbau im Sinne
  der Freeze-Regel.
- **Inhaltsmigration:** ~120 vorhandene `cms_section_fields`-Einträge
  und mehrere `cms_assets` müssten in neue Karten-Sections umkopiert
  werden (`einrichtungen.kita.anforderungen.sicherheit.label` →
  `anforderungen_kita / anf_kita_sicherheit / title`). Das ist
  Inhaltsmigration im Sinne der Freeze-Regel.
- **Whitelist-Pflicht:** Pro neuer card_v1 müssten je Feld DE+EN
  Whitelist-Einträge gesetzt werden, sonst zeigt der Admin „noch nicht
  CMS-gepflegt".
- **Spiegel-Risiko:** Solange Public NICHT nachweislich aus den neuen
  Karten liest, dürfen die alten `sections`/`einrichtungen`-Container
  nicht abgeschaltet werden. Sonst gehen Inhalte verloren oder die
  Seite zeigt Doppelblöcke.
- **Listen-Modell:** Für die 3 Leistungsbereiche je Einrichtung
  (Spalte mit Bereichstitel + n Punkten) existiert heute **kein**
  vereinbarter Standardbaustein. `card_v1` hat `title` + `description`,
  aber keine native Punkteliste. Das ist eine offene Modellfrage
  (neuer Section-Typ vs. card_v1 mit Description-Bullets vs.
  feature_grid_v1) und damit klar Auftrag „neuer Section-Typ" — gesperrt.
- **Broschüre:** Heute ein externer PDF-Link je Einrichtung. `cta_v1`
  würde funktionieren, ist aber Konsistenz-Entscheidung der Redaktion
  (PDF-Asset in `cms_assets` vs. externe URL).

### 3.5 Empfehlung P-057

Eigener, isolierter Folge-Auftrag „Standardisierung P-057" in drei
expliziten Etappen:

1. **Datenetappe:** Neue Sections `einrichtung_<id>`,
   `anforderungen_<id>` (+ Karten), `leistungen_<id>` (+ Karten),
   `broschure_<id>` (cta_v1) anlegen, Felder/Assets aus den heutigen
   Sondercontainern 1:1 kopieren, Whitelist setzen — **alte
   Sondercontainer bleiben aktiv**, Public liest weiter aus ihnen.
2. **Renderer-Etappe:** Renderer schrittweise auf die neuen Sections
   umstellen, Layout (Grid, Background-Wechsel) erhalten,
   Doppelrendering aktiv verhindern (entweder neu ODER alt, nie beides).
3. **Abschalt-Etappe:** Sondercontainer (`sections`, `einrichtungen`)
   erst nach Public-Verifikation deaktivieren (`is_active = false`),
   **nicht löschen**. Wahrheits-Check + globaler Spiegel-Audit muss
   nach jeder Etappe wieder grün sein.

Aufwand realistisch: 3 Etappen, jede eigener Batch, Inhalts- und
Spiegel-Risiko hoch. Nicht für eine spontane Sammel-Migration geeignet.

---

## 4. P-059, P-060, P-056 — gleiches Muster, kleiner

### P-059 Gesundheit / P-060 Öffentliche Hand
Beide rendern 2–3 Kacheln in flachem `content_v1` (`cards`) mit
Schlüsseln wie `pflege.tags.0`. Standard wäre:
`cards` (`cards_v1`) → je Kachel ein `card_v1` mit
`title`, `description`, `icon`, `image`, `cta_label`, `cta_href`, `tags.0..2`.

Umbau ist deutlich kleiner als P-057, aber **inhaltlich gleicher Pfad**:
neue Karten anlegen → Renderer umstellen → alten Sondercontainer
deaktivieren. Auch dies braucht expliziten Folge-Auftrag.

### P-056 Objektlösungen
8 Domänen-Kacheln in einem flachen `content_v1` (`items`). Muster ist
identisch zu P-059/P-060, nur länger. Kandidat für denselben
Migrationspfad. Eigener Folge-Auftrag.

---

## 5. P-077 Referenzprojekte (Index + Details)

- **Index (P-077):** Kachelliste kommt aus dem **Code-Datenmodul**
  `src/features/anwendungen/data/referenzprojekte.ts` (Slugs +
  Stammdaten), Bilder werden seitenübergreifend aus
  `cms_assets` der Sub-Pages gezogen. Das ist eine bewusste
  Cross-Page-Aggregation — kein normaler `cards_v1`-Fall.
  Migration auf Standard-Karten würde bedeuten: die 12
  Referenzprojekt-Stammsätze müssten als card_v1 unter P-077 leben
  **und** als eigene T05-Page existieren. Aktuell ist das doppelt
  modelliert (Code + Sub-Pages). Bewusste Sonderseite, solange das
  Daten-Modul existiert.
- **Details (P-241…P-252):** Carousel + JSON-codierte Listenfelder im
  `cms_section_fields.value`. Strukturell Sonderseite. Migration auf
  Standard-Karten würde Listen aus den JSON-Strings in echte
  Kind-Sections überführen — eigener, sehr umfangreicher Auftrag.

### Empfehlung P-077-Familie
Dokumentieren als bewusste Sonderlogik. **Vorabentscheidung der
Redaktion nötig**: bleibt das Referenzprojekt-Stammdatenmodell weiter
im Code, oder wird es vollständig in `cms_pages` + card_v1 unter P-077
überführt? Ohne diese Entscheidung kein technischer Umbau.

---

## 6. T05-Detail-Anwendungen (P-061…P-076)

16 Seiten. Karten-Block (`anforderungen` → card_v1) ist überall sauber
standardisiert. Die vier flachen `content_v1`-Sektionen
(`content`, `leistungen`, `systembausteine`, `broschure`) sind heute
absichtlich Textblöcke. Eine Migration auf Karten ist hier inhaltlich
**nicht zwingend**: es sind redaktionelle Fließtexte, keine
Karten-Listen. Empfehlung: **als Standard belassen**, keine erzwungene
Karten-Migration. Falls die Redaktion auf einzelnen Seiten echte
Karten möchte, einzeln beauftragen.

---

## 7. Bereits echte Standardstruktur (keine Arbeit nötig)

- **P-055 anwendungen.root** — Mix aus hero_v1, teaser_2col_v1,
  cards_v1+card_v1, faq_v1, cta_v1. Sauber.
- **P-058 anwendungen.wohnbau** — hero_v1, content_v1, cards_v1 + 4×
  card_v1, faq_v1, cta_v1. Sauber.
- **T05-Detail-Anwendungen** (16 Seiten) — Karten-Block ist Standard,
  Textsektionen bewusst flach.

## 8. Halbstandard / editierbar, aber strukturell Sonderlogik

- **P-056 anwendungen.objektloesungen** — `items` als flacher
  Sondercontainer (8 Domänen-Kacheln).
- **P-057 anwendungen.bildungseinrichtungen** — größter Pflichtfall
  (Sektion 3).
- **P-059 anwendungen.gesundheitseinrichtungen** — `cards` flach
  (2 Kacheln).
- **P-060 anwendungen.oeffentliche-hand** — `cards` flach (3 Kacheln).
- **P-077 anwendungen.referenzprojekte** — Cross-Page-Aggregation aus
  Code-Datenmodul.
- **P-241…P-252 Referenzprojekt-Details** — Carousel + JSON-Listen.

## 9. In diesem Lauf migrierte Seiten

**Keine.** Es wurde keine Section angelegt, gelöscht, verschoben,
umbenannt oder deaktiviert. Es wurden keine Felder kopiert. Es wurde
kein Renderer umgebaut. Keine neuen Whitelist-Einträge. Keine neue
Migrationsdatei.

## 10. Bewusste Sonderseiten (Begründung)

| Seite | Warum bewusst Sonderlogik |
|---|---|
| P-057 Bildungseinrichtungen | Drei parallele Einrichtungs-Sub-Strukturen mit je 3 Inhaltsklassen (Bild/Text, Anforderungs-Grid, Leistungs-Spalten) + Broschüre. Standard-Karten decken den Leistungs-Spalten-Fall heute nicht ohne neuen Section-Typ ab. |
| P-077 Referenzprojekte-Index | Cross-Page-Aggregation aus separatem Code-Datenmodul. Migration setzt Redaktionsentscheidung voraus, ob Stammdaten in Code oder DB leben sollen. |
| P-241…P-252 Referenzprojekt-Details | Carousel + JSON-kodierte Listen in `cms_section_fields.value`. Eigenes Datenmodell, kein passender Standard ohne neuen Section-Typ. |

## 11. Restfälle, die eigenen Auftrag brauchen

1. **„P-057 Standardisierung"** — 3 Etappen wie in 3.5.
2. **„P-059 / P-060 / P-056 Kacheln auf card_v1"** — gemeinsamer
   Migrationspfad (anlegen → umstellen → alt deaktivieren), pro Seite
   eine Etappe.
3. **„P-077 Referenzprojekt-Stammdaten" — Vorabentscheidung Redaktion**:
   Code-Datenmodul bleibt oder vollständige DB-Modellierung. Ohne diese
   Antwort kein technischer Schritt.
4. **„T05-Referenzprojekt-Detail JSON-Listen auflösen"** — eigener
   Auftrag, hohes Inhaltsrisiko, mind. 12 Seiten.
5. Optional: **„T05-Detail-Anwendungen Textsektionen normalisieren"**
   — nur falls Redaktion explizit Karten statt Fließtext will.

## 12. Vorentscheidungen, die die Redaktion/Gestaltung treffen sollte

- **Listen in Karten:** Soll für die „Systemleistungen"-Spalten (P-057)
  ein neuer Section-Typ entstehen (`feature_list_v1`?), oder werden die
  Punkte in das `description`-Feld einer `card_v1` als Bulletliste
  verlagert? Diese Entscheidung blockiert Etappe 3.5.1.
- **Broschüren:** Externe PDF-URL (heute) vs. PDF-Asset in `cms_assets`
  vs. eigenes `download_list_v1`-Modell. Konsistenzregel fehlt.
- **Referenzprojekt-Stammdaten:** Code oder DB (siehe Restfall 3).
- **Icon-Quelle:** weiterhin Lucide-Namen in `cms_section_fields.icon`
  (heute) — bestätigen, dass kein Wechsel zu Google Icons erfolgt
  (vgl. Bericht `batch30-google-icons-machbarkeit.md`).

## 13. Prüfschritte in diesem Lauf

- **Wahrheits-Check / globaler Spiegel-Audit / Whitelist-Coverage:**
  nicht erneut ausgeführt — keine DB- oder Code-Änderung erfolgt, der
  letzte grüne Stand (Batch 32, `public-admin-bearbeitbarkeit-global.md`)
  bleibt gültig.
- **`npm run build`:** nicht erneut ausgeführt — keine Quelldatei
  geändert.

Sobald ein Folge-Auftrag tatsächlich migriert, gelten die Pflicht-Gates
wieder (Wahrheits-Check, Spiegel-Audit, Whitelist-Coverage, Build).

## 14. Klare Empfehlung

- **Jetzt umsetzen:** nichts.
- **Als nächster Batch:** P-057 nur dann, wenn Punkt 3.5 und Punkt 12
  (Listen-Modell, Broschüren-Modell) vorab entschieden sind. Sonst zuerst
  Modellentscheidung in eigenem Mini-Auftrag.
- **Gar nicht sinnvoll:** Sammel-Migration aller Hub-Seiten in einem
  Rutsch — zu hohes Inhalts- und Spiegel-Risiko, widerspricht dem
  CMS-Freeze.
- **Auf keinen Fall spontan:** alte Sondercontainer abschalten, bevor
  Public nachweislich aus den neuen Karten liest; oder
  Standard-Karten anlegen ohne sofortige Whitelist-Einträge.
