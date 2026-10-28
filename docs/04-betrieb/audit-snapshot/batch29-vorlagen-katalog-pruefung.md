# Batch 29 — Prüfbericht: CMS-Light-Vorlagen-Katalog

Stand: 2026-06-05 · Status: **Prüfbericht (read-only)** · Kein Code, keine DB,
keine Inhalte, keine Vorlagen geändert.

Geprüfte Quellen:

- `src/features/admin/components/VorlagenKatalog.tsx` (842 Z.)
- `src/features/admin/lib/blockTemplates.ts` (480 Z.)
- `src/features/admin/lib/pageTypeMatrix.ts` (152 Z.)
- `src/features/admin/lib/templateCandidates.ts` (774 Z.)
- `src/features/admin/lib/templates.ts` (361 Z.)
- `src/features/admin/lib/blockTypeStyle.ts`
- `docs/01-strategie/seitentyp-taxonomie.md` (T-Codes)
- `docs/02-architektur/section-typen-katalog.md`
- `docs/02-architektur/karten-raster-regel.md`
- `docs/01-strategie/templates.md`
- `docs/02-architektur/sonderseiten-register.md` + `.json`
- `docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md` (Abschn. 5/8)

---

## 1 — Was ist aktuell korrekt

- **Dynamische Zählung ist sauber.** Seiten, Container und Karten werden
  beim Mount live aus `cms_pages` und `cms_sections` gelesen
  (`VorlagenKatalog.tsx:78-95`, `blockTemplates.ts:278-388`, `409 ff.`).
  Filter auf `is_active=true` und Parent/Child korrekt. Keine hartcodierten
  Counts. Marketing-Snapshot (94 Seiten / 8.288 Felder) muss live verifiziert
  werden, ist aber nicht im Katalog eingefroren.
- **`card_v1` als Kind-Section** ist korrekt erklärt (`blockTemplates.ts:147-170`),
  `parent_section_id`-Modell wird benutzt — kein Rückfall auf `items.N.*`.
- **Namens-Konsistenz der registrierten Typen** (`cards_v1`,
  `product_scroller_v1`, `teaser_2col_v1`, `card_v1`, `faq_v1`, `cta_v1`,
  `stats_v1`, `content_v1`, `hero_v1`) stimmt mit
  `section-typen-katalog.md` überein.
- **Sonderseiten-Register** (`.md` und `.json`) sind identisch (7 Einträge).
  Die Benennung `/serviceportal`, `/kontakt`, `/kontakt/bcm` etc. ist
  konsistent mit T17 (Serviceportal) und T19 (Meta).
- **Archivierte Prompt-Dokumente** (`prompt-leitplanken.md`,
  `start-fuer-neue-redakteure.md`, `redaktions-prompts.md`,
  `prompt-kurzanleitung.md`) werden **nicht** mehr aus aktivem Admin-Code
  oder Vorlagen-Katalog referenziert. ✅

---

## 2 — Was ist unklar oder veraltet

### 2.1 — T-Code-Semantik divergent (mittel)

`pageTypeMatrix.ts` und `seitentyp-taxonomie.md` verwenden **dieselben
T-Codes mit unterschiedlicher Bedeutung**:

| Code | `pageTypeMatrix.ts` (Hierarchie) | `seitentyp-taxonomie.md` (Inhalt) |
|---|---|---|
| T02 | Hauptmenüpunkt-Sonderseite | Systemlösung |
| T03 | Hauptmenüpunkt-Standardseite | Produktkategorie |
| T04 | Untermenüpunkt-Seite | Produktdetail (PDP) |
| T05 | Detail-Seite | Anwendungs-/Branchenseite |
| T11 | Sonderseite | Wissensartikel |

Beleg: `pageTypeMatrix.ts:8` referenziert explizit
`docs/04-betrieb/seitentypen-bausteinmatrix-latest.md` (eine **andere**
Quell-Taxonomie). Kein Funktionsfehler, aber im Vorlagen-Katalog nicht
sichtbar gemacht — für Redakteure verwirrend, wenn sie zwischen Dachdoku
und Admin-UI wechseln.

### 2.2 — Aktive Container fehlen in BLOCK_TEMPLATE_REGISTRY (mittel)

Laut `section-typen-katalog.md` aktiv, in `pageTypeMatrix.ts` als
`optionalTypes` oder `BAUSTEIN_LABELS` registriert, aber **nicht** im
Vorlagen-Katalog gelistet:

| Typ | section-typen-katalog | BAUSTEIN_LABELS | Im Katalog |
|---|---|---|---|
| `feature_grid_v1` | Z. 142 | Z. 141 | ❌ |
| `download_list_v1` | Z. 157 | Z. 145 | ❌ |
| `contact_block_v1` | Z. 166 | Z. 146 | ❌ |
| `rich_v1` | Z. 240 | (startseite) | ❌ |
| `tabs_v1` | Z. 116 | Z. 147 | ❌ |

### 2.3 — `icon_image`-Slot fehlt bei `card_v1` (mittel)

`section-typen-katalog.md:93-114` (Tranche 8, 2026-05-24) definiert für
`card_v1` drei Asset-Slots: `image`, `thumbnail`, **`icon_image`**.
`blockTemplates.ts:161-163` kennt nur `image` und `thumbnail`.
`templates.md:27` kennt `icon_image` — Katalog ist davon entkoppelt.

### 2.4 — Karten-Familien-Regel nicht im Katalog-UI (gering)

Die Regel „benefits = max 3 / default = max 4" (`karten-raster-regel.md`,
zentral via `cardGrid.ts`) erscheint **nirgends** in der Katalog-UI.
Stattdessen steht in `blockTemplates.ts:123` (layout_notes für `cards_v1`)
„typischerweise 2–3 Spalten" — **textlich veraltet**.

### 2.5 — `feature_grid_v1` als card_v1-Parent fehlt (gering)

`VorlagenKatalog.tsx:660`: „Karte wird als Kind-Section unter `cards_v1`
oder `product_scroller_v1` angelegt." — `feature_grid_v1` ist als dritter
valider Parent möglich, fehlt aber im Text.

### 2.6 — Textlich veraltet in `templates.md` (gering)

`templates.md:199-203` schreibt sinngemäß „erstes und derzeit einziges
Mitglied: `teaser_2col_v1`" — `BLOCK_TEMPLATE_REGISTRY` enthält heute 9 Typen.

### 2.7 — Visuelle Inkonsistenz `faq_v1` (gering, kosmetisch)

`blockTypeStyle.ts:183` aliasiert `faq_v1` auf `"content"` → lime-grün
wie Textblock. Funktional korrekt, optisch verwirrend (FAQ als „Inhalt").

---

## 3 — Sonderfälle

- `card_grid_v1` (Hub-Raster, Legacy) und `catalog_filter_grid_v1`
  (Produktfilter) werden **bewusst nicht** im Katalog geführt — geplante
  Konsolidierung auf `cards_v1`. Korrekt.
- Reine Kind-Sections ohne Eltern-Existenz (`stat_v1`, `download_item_v1`,
  `tab_v1`) tauchen korrekt nicht als eigene Container auf.
- Sonderseiten `/produkte/merkliste` und `/produkte/tuerkommunikation/:pdpSlug`
  haben `page_key: null` und tauchen daher nicht im Katalog auf — korrekt,
  da sie keine `cms_pages`-Einträge sind.
- T-Codes T06–T15, T16a/b, T18, T20, T21 sind im Code-Mapping nicht
  abgebildet. Mehrheitlich gewollt, weil die Seitentypen heute keine
  CMS-Pages haben. Für T16a/b/T18/T20/T21 ist der Status offen.

---

## 4 — Was bleibt aktiv

- Vorlagen-Katalog als Live-Übersicht über DB-Stand → **aktiv lassen**.
- Live-Zählung über `loadBlockTemplateOccurrences` /
  `loadCardOccurrencesGrouped` / `readPagesWithNav` → **unverändert lassen**.
- Container-Reihenfolge `CONTAINER_ORDER`
  (`VorlagenKatalog.tsx:51-60`) → **als Strukturvorgabe behalten**, nur
  ergänzen.
- Sonderseiten-Register `.md` + `.json` → **aktiv lassen**, da konsistent.
- Archivierung der vier alten Prompt-Dokumente → **aktiv lassen**, kein
  Rückbau.

---

## 5 — Was braucht einen eigenen Folgeauftrag

(Reine Liste, **keine Umsetzung in diesem Batch.**)

**Folgeauftrag A — Katalog-Standardisierung (Doku/Code, klein):**

1. `blockTemplates.ts`: Einträge für `feature_grid_v1`, `download_list_v1`,
   `contact_block_v1`, `rich_v1` (optional `tabs_v1`) ergänzen.
2. `card_v1`-Eintrag in `blockTemplates.ts:161-163` um `icon_image`-Slot
   ergänzen.
3. `CONTAINER_ORDER` in `VorlagenKatalog.tsx` entsprechend erweitern.
4. `blockTemplates.ts:123` (cards_v1 layout_notes): Text korrigieren auf
   Familien-Cap (benefits=3, default=4 via `cardGrid.ts`).
5. `VorlagenKatalog.tsx:660`: `feature_grid_v1` als dritten valider
   Parent ergänzen.
6. `templates.md:199-203`: Satz „einziges Mitglied" aktualisieren.

**Folgeauftrag B — T-Code-Klärung (Doku/Strategie, klein–mittel):**

Entscheidung dokumentieren, ob `pageTypeMatrix.ts` weiterhin die
Hierarchie-Sicht behält und wie das gegenüber der Inhalts-Taxonomie aus
`seitentyp-taxonomie.md` für Redakteure sichtbar gemacht wird (z. B.
Tooltip im Katalog oder umbenannter Code-Begriff).

**Folgeauftrag C — Optisch (kosmetisch):**

- Eigener Style für `faq_v1` in `blockTypeStyle.ts` (statt Alias auf
  `"content"`), damit FAQ-Blöcke im Admin-Baum optisch unterscheidbar sind.
- Legacy-Beschreibungen für `content_block_v1` / `content_blocks_intro_v1`
  in `blockTypeStyle.ts:135-148` modernisieren.

**Offene Rückfragen (nicht selbst entscheiden):**

- Existiert `src/features/cms/contract/sectionTypes.ts` noch
  (verwiesen in `blockTemplates.ts:203`)?
- Soll die T-Code-Doppeldeutigkeit im Katalog-UI explizit gemacht werden?
- Wann kommt die geplante Tranche zur visuellen Differenzierung
  Bild-/Icon-/Textkarte im Admin-Baum?

---

## 6 — Konkrete Empfehlung

**Standardisierungs-Batch nötig — Umfang begrenzt, keine Migration.**

Begründung: Der Katalog ist strukturell solide (Live-DB-Abfragen, korrekte
Kind-Section-Logik, korrekte Archivierung). Aber **5 aktive Container-Typen
fehlen** im `BLOCK_TEMPLATE_REGISTRY`, dazu der `icon_image`-Slot bei
`card_v1` und mehrere kleinere Texte (Karten-Familien, valide Parents).
Das ist kein kritischer Defekt, aber unvollständige Sichtbarmachung
gegenüber Redakteuren.

Empfohlene Reihenfolge:

1. **Folgeauftrag A** (Standardisierung, ohne DB-Migration; nur
   `blockTemplates.ts`, `VorlagenKatalog.tsx`, kleine Doku-Korrekturen).
2. **Folgeauftrag B** (T-Code-Klärung) als reine Doku-Entscheidung.
3. **Folgeauftrag C** (Kosmetik) optional zusammen mit Admin-UX-Folgeprojekt
   aus `docs/04-betrieb/naechste-schritte.md`.

Kein Notfall, keine Freeze-Aufweichung, keine Migration nötig.

---

## 7 — Stopp

Dieser Batch endet hier. Keine Codeänderung, keine DB, keine Navigation,
keine Inhalte, keine Vorlagen geändert. Folgeauftrag wird nur auf
ausdrückliche Anweisung gestartet.
