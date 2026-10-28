# Batch 35 — Anwendungen: Zwischenabnahme P-057 / P-071 + Folgeplan

Datum: 2026-06-05
Bereich: TCS in Bauten / Anwendungen
Modus: **Prüfung und Planung** — keine Migration, keine Renderer-
Umschaltung, keine DB-Löschung, keine neuen Seiten, kein neuer Schnitt.

## 0. Kurzfazit

- **P-057 `anwendungen.bildungseinrichtungen` → ✅ sauber DB-first.**
  Public rendert ausschließlich aus Standard-Sections
  (`teaser_2col_v1`, `cards_v1` + `card_v1`-Kinder, `cta_v1`,
  `standard_cta`). Die alten Container `sections` und `einrichtungen`
  (content_v1) liegen `is_active=false` als Backup, werden von RLS
  nicht ausgeliefert und sind im Renderer nicht mehr referenziert.
  Doppelrender: keiner. Spiegel-Regel: erfüllt.

- **P-071 `anwendungen.interne-kommunikation` → ✅ sauber DB-first.**
  Public rendert aus den in 34a/34b angelegten Standard-Sections
  + `faq_v1` + `standard_cta`. Broschüren-CTA wird inline als
  Download-Link gerendert (gleiches Muster wie P-057). Karten-Link
  P-057 → P-071 existiert dreimal als `card_v1`
  (`leist_<id>_kommunikation_link_p071`, sort 30), Whitelist gesetzt.
  Die FAQ ist als `faq_v1` aktiv (eyebrow `FAQ`) und im Admin
  ab Batch 34c eindeutig als „FAQ" gelabelt.

- **Diagnose-Map (`rendererPathMap.generated.ts`) ist Stand 2026-06-05
  weiterhin „sonderlogik / eigene_komponente"** für P-057 und P-071.
  Datei wurde via `scripts/admin/build-renderer-path-map.mjs`
  regeneriert; der Generator liest aber aus
  `docs/04-betrieb/audit-snapshot/page-renderer-coverage.json`, und
  dieser Coverage-Snapshot ist seit den 33d/34b-Umbauten nicht
  neu erzeugt worden. → **Restpunkt R1** (siehe unten).

- **Altcontainer:** auf P-057 liegen 2 Legacy-content_v1-Sections
  inaktiv, auf P-071 nur noch 1 (`broschure`). Empfehlung:
  in einem eigenen Cleanup-Batch (35x) gemeinsam mit den Altbeständen
  weiterer Seiten löschen, nicht einzeln.

- **Anforderungen-Block auf P-071 hat aktuell 4 Karten.** Aus dem
  fachlichen Quelldokument (Marketing-ZIP) ist eine 5. Karte
  („raumZuRaum") plausibel, aber nicht zwingend. → **Restpunkt R2**.

---

## 1. P-057 `anwendungen.bildungseinrichtungen` — Prüfung

### 1.1 Renderpfad

Datei: `src/features/anwendungen/pages/BildungseinrichtungenPage.tsx`
(144 LOC, DB-first ab Batch 33d).

- Iteriert für `kita | schule | wohnheim` über fixe Section-Reihenfolge
  (`einrichtung_<id>` → `anforderungen_<id>` → 3× `leistungen_<id>_*`)
  und delegiert jeweils an `renderPageSectionByType(...)`.
- `broschure_<id>` (cta_v1) wird inline als `BroschureLink` gerendert
  (Mini-Komponente, kein eigener Section-Typ — bewusste Doppelrender-
  Sperre, weil `cta_v1` im Body-Renderer in `SKIP_TYPES` steht).
- Hero läuft über `CmsPageLayout`, Tail-CTA über `CmsTailCta`
  (`standard_cta`).
- Keine hartcodierten Texte, Icons, Bilder, URLs mehr in der Page.

### 1.2 Standard-Bausteine

| Baustein | Verwendung |
|---|---|
| `hero_v1` | 1× (Hero über CmsPageLayout) |
| `teaser_2col_v1` | 3× (`einrichtung_kita/schule/wohnheim`) |
| `cards_v1` (Container) | 12× (3 Einrichtungen × 4 Karten-Container) |
| `card_v1` (Kinder) | aktuell 47 aktive Karten unter den Containern |
| `cta_v1` | 4× (3× Broschüren-Link inline + 1× `standard_cta`) |
| `faq_v1` | vorhanden, `is_active=false` (bewusst, kein FAQ-Block geplant) |

### 1.3 Altcontainer / öffentliche Sichtbarkeit

| section_key | type | is_active | öffentlich sichtbar | Begründung Verbleib |
|---|---|---|---|---|
| `sections` | content_v1 | false | nein (RLS) | Backup für Inhalts-Rollback |
| `einrichtungen` | content_v1 | false | nein (RLS) | Backup, enthält Original-Flachstruktur aller drei Einrichtungen |
| `faq` | faq_v1 | false | nein | bewusst aus, kein FAQ auf P-057 |

→ **Keine Doppelrender**, keine zweite Wahrheit. Renderer liest nur
aktive Top-Level-Sections.

### 1.4 Admin-Bearbeitbarkeit

- Karten-Standardvertrag (Titel, Beschreibung, Bullets, Chips, Icon,
  Bild, `link_1_*`) ist über die globale `card_v1`-Whitelist abgedeckt.
- Die drei neuen Link-Karten `leist_<id>_kommunikation_link_p071`
  haben den vollständigen Whitelist-Satz aus dem Sibling
  `leist_<id>_kommunikation_0` (siehe 34c-Bericht).
- `link_1_enabled` ist gesetzt (Sichtbar-Schalter funktioniert).
- Whitelist alter Sonderfelder (`sections.*`, `einrichtungen.*`) ist
  seit 33d deaktiviert → Sonderfelder erscheinen im Admin nicht mehr
  als „bearbeitbar" und stören die Spiegel-Regel nicht.

→ ✅ Karten inkl. Link-Labels, Sichtbar-Schalter und Whitelist im
Admin sauber bearbeitbar.

---

## 2. P-071 `anwendungen.interne-kommunikation` — Prüfung

### 2.1 Renderpfad

Datei: `src/features/anwendungen/pages/InterneKommunikationPage.tsx`
(132 LOC, DB-first ab Batch 34b).

- `SECTION_ORDER` umfasst alle Standard-Sections; jede wird über
  `renderPageSectionByType(...)` gerendert.
- `broschure_intern` als inline `BroschureLink` (cta_v1, gleiches
  Muster wie P-057).
- Hero/Tail-CTA über `CmsPageLayout` / `CmsTailCta`.
- Kein `AnwendungDetailPage`, kein `useCmsI18n`, kein hartcodierter
  Broschürenlink.

### 2.2 Sections (DB-Stand)

Aktiv (Reihenfolge):
`hero (0) → einrichtung_intern (1) → anforderungen (2) →
leistungen_intern_kommunikation (3) → leistungen_intern_automatik (4) →
leistungen_intern_einsatz (5) → systembausteine_intern (6) →
broschure_intern (7) → faq (8) → standard_cta (9)`.

Inaktiv (Backup):

| section_key | type | Bemerkung |
|---|---|---|
| `broschure` | content_v1 | letzter verbliebener Legacy-Container |

> Hinweis: Die in 34b genannten Legacy-Container `content`,
> `leistungen`, `systembausteine` sind in der aktuellen DB **nicht
> mehr vorhanden** (nicht in einem dokumentierten Batch gelöscht —
> wahrscheinlich im Vorlauf von 34a bereits entfernt). Kein Schaden,
> aber Doku-Lücke. Empfehlung: im Cleanup-Batch verbuchen.

### 2.3 Verlinkung von P-057

Drei `card_v1`-Sections auf P-057
(`leist_kita_kommunikation_link_p071`,
`leist_schule_kommunikation_link_p071`,
`leist_wohnheim_kommunikation_link_p071`) verweisen über
`link_1_href = /anwendungen/interne-kommunikation` auf P-071. Korrekt
als `card_v1` umgesetzt, sichtbar geschaltet, Whitelist vollständig.

### 2.4 FAQ-Erkennbarkeit

- `faq` ist auf P-071 `faq_v1`, `is_active=true`, `eyebrow = "FAQ"`.
- Admin-Tree zeigt seit Batch 34c für jeden `faq_v1`-/`faq`-Section
  systemweit immer das Label **„FAQ"** (Code-Mapping in
  `SectionRowView.tsx`) — nicht mehr „Inhalt" / „Häufige Fragen".
- Damit ist die Section im Admin eindeutig als FAQ-Block erkennbar,
  ohne dass öffentliche Texte verändert wurden.

### 2.5 Offener Punkt R2 — „raumZuRaum"-Karte

`anforderungen` hat 4 aktive Karten (`durchsage`, `automatik`,
`mobil`, `integration`). Der Wunsch aus Batch 34b nach einer 5. Karte
(„raumZuRaum") ist noch offen. → reine **Inhaltspflege**, gehört in
Admin- oder Prompt-Pflege, nicht in einen Renderer-Batch.

---

## 3. Diagnose-/Admin-Karten — Stand

### 3.1 `src/features/admin/lib/rendererPathMap.generated.ts`

- Regeneriert in Batch 35 via
  `node scripts/admin/build-renderer-path-map.mjs`.
- Klassifizierung **unverändert**: P-057 und P-071 stehen weiter als
  `render_class="hart_codiert"`, `renderer_path="eigene_komponente"`,
  `status="sonderlogik"`.
- Ursache: Generator liest aus
  `docs/04-betrieb/audit-snapshot/page-renderer-coverage.json`, und
  dieser Coverage-Snapshot ist seit den DB-first-Umbauten (33d, 34b)
  nicht neu erzeugt worden.

→ **Restpunkt R1**: Coverage-JSON regenerieren (kein Public-Eingriff)
und Map erneut bauen. Erst dann zeigt der Admin „Technischer
Renderpfad" P-057/P-071 korrekt als „eigene Komponente, DB-first
Standard-Sections" (oder analoge Status-Stufe — ggf. neuer Status
nötig). Eigenständiger Mini-Batch 35a empfohlen.

### 3.2 PageEditor-Anzeige

Solange R1 offen ist, zeigt der PageEditor für P-057/P-071 weiterhin
„Sonderlogik". **Kein Public-Eingriff**, nur Diagnose-Schiefstand.

---

## 4. Altcontainer-Inventar (P-057 + P-071)

| Seite | section_key | type | is_active | öffentlich sichtbar | Empfehlung |
|---|---|---|---|---|---|
| P-057 | `sections` | content_v1 | false | nein | Cleanup-Batch 35x |
| P-057 | `einrichtungen` | content_v1 | false | nein | Cleanup-Batch 35x |
| P-057 | `faq` | faq_v1 | false | nein | belassen (bewusst aus) |
| P-071 | `broschure` | content_v1 | false | nein | Cleanup-Batch 35x |

Begründung Verbleib: alle vier Container sind durch RLS
(`is_active=false`) public unsichtbar und stören Spiegel-Regel /
Doppelrender nicht. Sie dienen als Rollback-Anker für den Fall, dass
ein Inhalt versehentlich nicht migriert wurde. Hartes Löschen lohnt
nicht pro Einzelseite — besser gebündelt im Cleanup-Batch, sobald
weitere Standardisierungen (P-056/P-059/P-060) ebenfalls Altbestände
hinterlassen.

**Bitte vor Cleanup zwingend:**

1. Pro Container Spot-Check: liegen Inhalte in den neuen Sections vor?
2. Backup-Export (SQL-Insert) in die `altbestand-report.md`-Linie.
3. Idempotente Migration mit `DELETE … WHERE is_active=false AND
   section_type='content_v1' AND page_key=…` und expliziten
   section_keys.

---

## 5. Folgeplan — Anwendungen-Seiten

### Übersicht

| Page-Nr | page_key | Renderer (heute) | DB-Struktur (heute) | Standardisierungs-Aufwand |
|---|---|---|---|---|
| P-056 | `anwendungen.objektloesungen` | `ObjektloesungenPage.tsx` (116 LOC, Sonderlogik) | hero + 3× content_v1 (`content`, `section`, `items`) + faq (aus) + cta | **groß** (8 Domänen-Kacheln aus Code) |
| P-058 | `anwendungen.wohnbau` | `GenericCmsPage` (4 LOC) | hero + content_v1 + **product_scroller_v1** + faq (aus) + cta | **gering** (bereits Standard, nur Doku) |
| P-059 | `anwendungen.gesundheitseinrichtungen` | `GesundheitseinrichtungenPage.tsx` (137 LOC, Sonderlogik) | hero + 2× content_v1 (`section`, `cards`) + faq (aus) + cta | **mittel** (2 Kacheln Pflege/Klinik) |
| P-060 | `anwendungen.oeffentliche-hand` | `OeffentlicheHandPage.tsx` (138 LOC, Sonderlogik) | hero + 2× content_v1 (`section`, `cards`) + faq (aus) + cta | **mittel** (3 Kacheln Behörde/Feuerwehr/Schwimmbad) |
| P-065 | `anwendungen.pflege` (T05) | `PflegePage.tsx` (AnwendungDetailPage, i18n-fallback) | (Detailseite, nicht im T04-Standardisierungs-Scope) | **separat einplanen** (T05-Welle) |
| P-077 | `anwendungen.referenzprojekte` | `ReferenzprojektePage.tsx` (115 LOC, Sonderlogik) | hero + content_v1 (`content`) + faq (aus) + cta | **groß + Modellentscheidung** (Referenzprojekte als Stammdaten/Detail-Seiten, derzeit Code-Datenmodul `data/referenzprojekte.ts`) |

### 5.1 P-056 `anwendungen.objektloesungen`

- **Sichtbares heute:** Hero + Intro-Text + 8 Domänen-Kacheln
  (kita … baeder), alle aus Code-Konstante / flachem content_v1
  (`items`).
- **Standardziel:** 1× `teaser_2col_v1` (Intro), 1× `cards_v1` +
  8× `card_v1`-Kinder pro Domäne (Titel, Icon, Kurztext, „Mehr
  erfahren"-Link auf die jeweilige Detailseite P-057/P-058/P-059/P-060).
- **Standardbausteine:** `cards_v1`, `card_v1`, optional `teaser_2col_v1`,
  `cta_v1`.
- **Migration:** möglich nach dem 33a–d-Muster (a/b/c Daten standar­
  disieren + d Renderer umschalten + Legacy deaktivieren).
- **Fachliche Entscheidung vorab nötig:** Welche 8 Kacheln gehören zur
  Endliste? Welche verlinken auf eigene Detailseite, welche bleiben
  Sammeleintrag? Vor Migration kurz mit Redaktion klären.
- **Link-Empfehlung:** Jede Domänen-Karte sollte `link_1_*` auf ihre
  passende T04-Detailseite tragen (P-057, P-059, P-060, …) — analog zu
  den 34c-Karten auf P-057.

### 5.2 P-058 `anwendungen.wohnbau`

- **Status:** bereits `GenericCmsPage`, DB-Struktur enthält
  `cards_v1`/`product_scroller_v1` + 4 `card_v1`-Kinder
  (Einfamilienhaus, Mehrfamilienhaus, Großanlage, Sanierung).
- **Aktion:** **keine Migration nötig.** Im Folgebatch nur Spot-Check
  (Spiegel-Regel + Karten-Links auf die jeweiligen T05-Detailseiten
  `anwendungen.einfamilienhaus` etc. prüfen) und in der Diagnose
  bestätigen.

### 5.3 P-059 `anwendungen.gesundheitseinrichtungen`

- **Sichtbares heute:** 2 große Kacheln (Pflege, Klinik) mit Bild,
  Eyebrow, Headline, Text, Tag-Liste, Link auf P-065 (`pflege`) /
  P-064-äquivalent (`klinik`). Alles aus Code + flachem content_v1
  (`cards` mit Schlüsseln `pflege.tags.0` etc.).
- **Standardziel:** 1× `teaser_2col_v1` (Intro) + 1× `cards_v1` mit
  2× `card_v1`-Kindern (Bild, Eyebrow, Titel, Text, Bullets/Tags als
  Chips, `link_1_*` auf die jeweilige T05-Detailseite).
- **Standardbausteine:** `cards_v1`, `card_v1`, `teaser_2col_v1`,
  `cta_v1`.
- **Aufwand:** klein. Genau dasselbe Muster wie 34a/b/c, nur 2 Karten.
- **Empfohlener Schnitt:** Batch 36 (a Stage + b Renderer-Umstellung +
  c Legacy-Deaktivierung in einem Schritt zulässig, weil Scope klein).

### 5.4 P-060 `anwendungen.oeffentliche-hand`

- **Sichtbares heute:** 3 Kacheln (Behörde, Feuerwehr, Schwimmbad),
  Code-Array + content_v1 (`cards`).
- **Standardziel:** identisch zu P-059, nur 3 statt 2 Karten,
  Links auf `anwendungen.behoerde`, `anwendungen.feuerwehr`,
  `anwendungen.schwimmbad`.
- **Aufwand:** klein/mittel.
- **Empfohlener Schnitt:** Batch 37 (analog 36).

### 5.5 P-065 `anwendungen.pflege` (T05-Detailseite)

- **Status:** kein T04-Standardisierungs-Kandidat — eine von 16 T05-
  Detail-Anwendungen (P-061…P-076), die alle dem
  `AnwendungDetailPage`-Muster folgen (Hero + Anforderungen + 3
  Leistungs-Listen + Broschüre + FAQ + CTA, aus i18n mit CMS-Fallback).
- **Empfehlung:** P-065 in eine **eigene T05-Welle** legen
  (Batch 38+), gemeinsam mit P-061…P-076. Nicht in 35/36/37
  vermischen, sonst werden die Batches inkonsistent.
- **Fachliche Vorklärung nötig:** Soll T05 strukturell genauso
  zerlegt werden wie P-057/P-071 (teaser_2col_v1 + cards_v1 +
  card_v1)? Wenn ja, ist ein 16-Seiten-Programm zu planen, nicht
  ein Einzelbatch.

### 5.6 P-077 `anwendungen.referenzprojekte`

- **Sichtbares heute:** Liste der Referenzprojekt-Kacheln, gerendert
  aus Code-Datenmodul `src/features/anwendungen/data/referenzprojekte.ts`
  (12 Projekte). Heroes der zugehörigen T05-Detailseiten werden über
  `useCmsAssetsForPages` aus der DB gezogen.
- **Strukturelle Frage:** Sollen Referenzprojekte als **Stammdaten-
  Tabelle** (eigene Tabelle / eigene Editor-Sicht) modelliert werden,
  oder als ganz normale T05-Seiten mit `card_v1`-Index auf P-077?
- **Empfehlung:** **nicht** in einem Schnell-Batch migrieren. Vorher
  Modellentscheidung treffen (separater Plan-Auftrag, ggf. analog
  zu Produkt-Stammdaten). Bis dahin Sonderseite bewusst lassen.

---

## 6. Restpunkte

| ID | Punkt | Typ | Empfehlung |
|---|---|---|---|
| R1 | `page-renderer-coverage.json` nicht regeneriert seit 33d/34b → Diagnose-Map zeigt P-057/P-071 falsch als „sonderlogik" | Diagnose, kein Public-Eingriff | Mini-Batch 35a: Coverage-Skript ausführen + Map neu bauen + ggf. neuen Status („db_first_eigene_komponente") definieren |
| R2 | `anforderungen` auf P-071 hat 4 statt 5 Karten („raumZuRaum" fehlt) | Inhaltspflege | über Admin/Prompt ergänzen, kein Renderer-Batch |
| R3 | Legacy-content_v1-Container auf P-057 (`sections`, `einrichtungen`) und P-071 (`broschure`) noch in DB | DB-Hygiene | Cleanup-Batch 35x, gebündelt mit Altbeständen aus 36/37 |
| R4 | Doku-Lücke: in 34b genannte Container `content`/`leistungen`/`systembausteine` auf P-071 existieren in der DB nicht mehr | Doku | im 35x-Bericht klarstellen |

---

## 7. Klare Empfehlung — was als Nächstes

**Priorität 1 (klein, sicher, hoher Ordnungsgewinn):**

1. **Batch 35a — Diagnose nachziehen.** Coverage-JSON regenerieren,
   `rendererPathMap.generated.ts` neu bauen, ggf. neuen Renderer-
   Status für DB-first-Page-Komponenten einführen. Kein Public-
   Eingriff.
2. **Batch 36 — P-059 standardisieren.** Kleinster Scope (2 Karten),
   identisches Muster zu 34a/b/c. Liefert sofort sichtbaren
   Strukturgewinn und beweist Wiederholbarkeit des Musters.

**Priorität 2 (mittel):**

3. **Batch 37 — P-060 standardisieren.** Analog zu 36, 3 Karten.
4. **Inhaltspflege R2** über Prompt/Admin (5. Karte auf P-071).

**Priorität 3 (groß, mit Vorklärung):**

5. **Batch 38 — P-056 standardisieren.** Vorab fachliche Klärung der
   Domänen-Kachelliste.
6. **Cleanup-Batch 35x** sobald 36/37 die DB mit weiteren
   Altbeständen gefüllt haben — gemeinsam löschen.

**Bewusst zurückgestellt:**

- **P-077** — Modellentscheidung „Referenzprojekte als Stammdaten?"
  zuerst klären, dann separater Plan.
- **P-065 + restliche T05** — eigene Welle, nicht in 35/36/37
  vermischen.

---

## 8. Bewusst NICHT gemacht (Selbstprüfung)

- ❌ Keine DB-Migration ausgeführt.
- ❌ Keine Renderer-Umschaltung.
- ❌ Keine Altcontainer gelöscht.
- ❌ Keine neuen Seiten/Sections/Felder angelegt.
- ❌ Keine Navigation/Routen geändert.
- ❌ Keine Produktkatalog-/PDP-/Auth-Berührung.
- ✅ Einzige Schreibaktion: `rendererPathMap.generated.ts` per
  vorhandenem Generator-Skript regeneriert (Diagnose-only,
  Inhalt identisch — die zugrundeliegende Coverage-Quelle ist
  stale, deshalb keine Statusänderung; Map selbst ist write-
  durch das Skript, kein manueller Eingriff).

Stopp hier — keine Folge-Migration ohne neuen Auftrag.
