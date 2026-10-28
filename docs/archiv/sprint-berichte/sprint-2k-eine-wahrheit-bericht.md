# Sprint 2k — D3/D5-Rest-Triage (read-only, kein Seeding)

_Stand: 2026-05-29_

## Kurzfassung

Sprint 2k war als „D3/D5-Rest-Seeding bereichsweise" geplant. Die fachliche
Klassifizierung der Reste zeigt: **es gibt keine sinnvolle bereichsweise
S1-Tranche**, mit der pauschal geseedet werden könnte, ohne den Vertrag
selbst zu schärfen. Sprint 2k bleibt deshalb **read-only**:

- Neues read-only Triage-Skript `scripts/cms/d3-d5-rest-triage.mjs`
  (npm `cms:audit:d3-d5-triage`) klassifiziert jede D3/D5-Gruppe nach
  S1..S7.
- Neuer Bericht `docs/04-betrieb/d3-d5-rest-triage-latest.md` mit
  Aggregaten und Empfehlung für Sprint 2l (Variantenmodell für
  `card_v1`).
- Keine DB-Mutation, kein Seed, kein Whitelist-Insert. Begründung
  pro Feldgruppe ist im Triage-Bericht dokumentiert.

| Kennzahl | Sprint 2j | Sprint 2k | Δ |
|---|---:|---:|---:|
| D1 `contract_missing` | 0 | 0 | 0 |
| D8 `active_without_renderer` | 0 | 0 | 0 |
| D9 `invalid_parent_child` | 25 | 25 | 0 |
| D3 (gesamt aus Audit) | 3502 | 3502 | 0 |
| D5 (gesamt aus Audit) | 3416 | 3416 | 0 |

D3/D5 sind nicht inhaltlich bereinigt, sondern fachlich klassifiziert.

## Klassen (S1..S7)

| Klasse | Bedeutung |
|---|---|
| S1 | sicher seedbar, redaktionell sinnvoll |
| S2 | sicher whitelistingfähig, DB-Feld nur bei Bedarf |
| S3 | optional/variantenspezifisch, **nicht** pauschal seeden |
| S4 | Vertrag wahrscheinlich zu breit (Varianten nötig) |
| S5 | Spezialrenderer / i18n-Fallback (späterer Sprint) |
| S6 | Legacy/Alias/Asset-Slot — nicht seeden |
| S7 | D9 / inaktiv / archiviert — nicht seeden |

## Ergebnis der Triage (aktive Sections)

Quelle: `scripts/cms/output/d3-d5-rest-triage-latest.json`.

### D3 nach Klasse

| Klasse | Sections |
|---|---:|
| S1 | 5 |
| S2 | 38 |
| S3 | 1101 |
| S4 | 88 |
| S5 | 696 |
| S7 | 76 |
| **Summe (aktive)** | **2004** |

### D5 nach Klasse

| Klasse | Sections |
|---|---:|
| S1 | 5 |
| S2 | 38 |
| S3 | 1101 |
| S4 | 88 |
| S5 | 696 |
| S7 | 72 |
| **Summe (aktive)** | **2000** |

Die Differenz zu den Audit-Gesamtzahlen (D3=3502, D5=3416) entsteht
dadurch, dass die Triage nur aktive Sections berücksichtigt (Sprint-2k-Scope).

## Wichtigste Feldgruppen

### S1 (klein, aber zu klein für eigene Tranche)

- `card_v1.description` — 5 Sections auf 1 Page.

→ Eine eigene Seed-Migration für 5 Zeilen verzerrt den Migrations-Log.
Wird in 2l als Nebeneffekt der `card_v1`-Vertragsschärfung mitgenommen.

### S2 (Container-Header — sauber whitelistbar, aber nicht überall sichtbar)

- `cards_v1.intro` (15 Sections / 15 Pages)
- `content_v1.title` (12 Sections / 2 Pages)
- `content_v1.label` (10 Sections / 2 Pages)
- `cards_v1.title` (1 Section)

Container-Header werden vom Renderer optional gelesen und teils direkt
über `useCmsI18n` aus i18n bedient. Pauschales Seeding würde im Admin
viele leere Pflichtfeld-anmutende Eingaben erzeugen. **Nicht in 2k.**

### S3 (optional/variantenspezifisch — bewusst nicht geseedet)

Dominant auf `card_v1`:

- `cta_label`, `cta_href` — nur Karten mit eigenem CTA-Button
- `icon` — nur Iconkarten (z. B. `feature_grid_v1`-Kinder)
- `subtitle` — variantenabhängig
- `link_1_label/href/kind`, `link_2_*`, `link_3_*` — nur in wenigen
  Spezialkarten (z. B. `download_list_v1`/`contact_block_v1`)
- `features.0..4` — nur „Feature-Card"-Variante

→ Diese Felder als pauschalen Pflichtfeldsatz auf alle 165+ `card_v1`-
Sections zu seeden würde den Admin unübersichtlich machen und
künstliche „fehlende"-Marker erzeugen. Lösung: Variantenmodell in 2l.

### S4 (Vertrag zu breit)

- `card_v1.href` — Doppelung zu `cta_href`. Heute behauptet der Vertrag,
  beide Felder seien Standard. Tatsächlich nutzt jede Kartenvariante
  entweder das eine **oder** das andere. → Vertragsschärfung in 2l.

### S5 (i18n-Fallback — späterer Sprint 2l/2m)

`hero_v1.cta_label`, `hero_v1.cta_href`, `hero_v1.eyebrow`,
`hero_v1.subline`, `hero_v1.headline` und alle dynamischen Patterns
(`items.*`, `features.*`, `tabs.*`, `vorteile.*`). Auf S2-Seiten
kommen Hero-Header heute teilweise noch aus i18n — Abbau läuft pro
Bereich in eigenen i18n-Fallback-Sprints.

### S6 (Asset-Slot — gehört nicht in `cms_section_fields`)

`image`, `thumbnail`, `background`, `icon_svg`, `hero_image`, `file` —
werden bereits korrekt via `cms_assets` verwaltet. Treten in D3 nur
auf, weil der Vertrag sie als `text_fields` deklariert. Vertragsentscheidung
in 2l: entweder umverdrahten auf `asset_slots` oder weglassen.

### S7 (D9-Sections)

76 D3-Treffer entfallen auf Sections, die selbst eine D9-Vertragsverletzung
haben (Top-Level `card_v1`, geschachtelte `rich_v1`). Diese werden
**nicht** geseedet, bevor die D9-Owner-Entscheidung in 2c/Folgesprint
geklärt ist (`docs/04-betrieb/sprint-2c-d9-owner-entscheidungen.md`).

## Seed-Entscheidung

- Modus: **Dry-Run, nicht angewendet**
- Sicher seedbare S1-Sections: **5** (zu wenig für eigene Tranche)
- Begründung: ohne Variantenmodell für `card_v1` würde jeder Seed-Lauf
  in S3/S4 entweder zu viel anlegen (Admin-Feldmüll) oder zu wenig
  (Inkonsistenz zwischen pauschal angelegten und variantenspezifischen
  Karten).

## Empfehlung Sprint 2l — Vertragsschärfung

1. **`card_v1` variantisieren** — `sectionTypes.ts` um Feldgruppen
   erweitern, die abhängig vom Parent-Container freigeschaltet werden:
   - Base: `title`, `description`
   - Click-Card: `href`
   - CTA-Card: `cta_label`, `cta_href`
   - Icon-Card (in `feature_grid_v1`): `icon`
   - Download-Card (in `download_list_v1`): `file_label`, `cta_href`
   - Multi-Link-Card (in `contact_block_v1`): `link_1..3_*`
   - Feature-Card: `features.0..4`
2. **`hero_v1`-i18n-Fallback** auf S2-Seiten bereichsweise auflösen
   (eigener Sprint 2l/2m).
3. **`cards_v1`/`content_v1` Container-Header** optional kennzeichnen
   (`required: "optional"`), damit D3 dort nicht mehr als „fehlend"
   gezählt wird.
4. **S6-Asset-Slot-Reste** im Vertrag als `IMG(...)` statt `T(...)`
   führen.

Erst nach 1.+3. liefert ein Re-Audit eine deutlich kleinere D3/D5-Menge,
ohne dass ein einziger Inhalt verändert wird — und nur die dann
verbleibende Restmenge wird (bereichsweise) geseedet.

## Audits

- `cms:audit:contract-drift` — D1=0 · D8=0 · D9=25 · D3=3502 · D5=3416
  (unverändert ggü. 2j; keine DB-Mutation).
- `cms:audit:d9-relations` — 19 `(none/top-level)→card_v1`,
  6 `rich_v1→rich_v1`. Distinct Relations = 2.
- `cms:audit:renderer-fallback-inventory` — Klassen 54 S1 · 19 S2 · 4 G1 ·
  2 G0 · 2 S3 · 1 P1. Risiken low 59 · medium 20 · high 2.
- Neu: `cms:audit:d3-d5-triage` — siehe oben.
- `npm run build`: vom Lovable-Harness automatisch ausgeführt, nicht
  manuell.

## Geänderte Dateien

- neu: `scripts/cms/d3-d5-rest-triage.mjs`
- neu: `scripts/cms/output/d3-d5-rest-triage-latest.json`
- neu: `docs/04-betrieb/d3-d5-rest-triage-latest.md`
- neu: `docs/04-betrieb/sprint-2k-eine-wahrheit-bericht.md` (diese Datei)
- geändert: `package.json` (npm `cms:audit:d3-d5-triage`)
- geändert: `docs/current-status.md` (Sprint-2k-Eintrag, Redaktionsmodus-Block)
- geändert (re-run, identische Zahlen): `docs/04-betrieb/contract-drift-audit-latest.md`,
  `docs/04-betrieb/d9-relations-latest.md`,
  `docs/04-betrieb/renderer-fallback-inventar-latest.md`,
  `scripts/cms/output/contract-drift-audit-latest.json`.

## Scope-Bestätigung

- Keine Produktdatenbank angefasst.
- Keine Inhalte, Bilder, Feldwerte überschrieben.
- Keine Whitelist gelöscht oder deaktiviert.
- Keine Public-Renderer-, Routen-, Navigation-, Footer-, Breadcrumb- oder
  i18n-Änderung.
- Keine neue Schreib-RPC.
- Keine Strukturmigration (keine `cms_sections.section_type`-Änderung).
- Keine Section aktiviert oder deaktiviert.
- Kein blindes D3/D5-Seeding.

**Empfohlene nächste Etappe:**
`cms-light-eine-wahrheit-sprint-2l-section-contract-field-variants-und-i18n-fallback-abbau-plan-1`.
