# Sprint 2g — Renderer-/Fallback-Inventar (read-only)

_Generiert: 2026-05-29_

## Kurzfassung

Sprint 2g ist ein reiner **Read-only-Inventar-Sprint**. Keine DB-Mutation,
keine Public-Renderer-/i18n-/Whitelist-Änderung. Ergebnis ist eine belastbare
Matrix `Seite × Renderer-Klasse × DB-Quelle × i18n-Fallback × Hardcoding ×
Speziallogik × D9/R2-Bezug × Risiko`, mit der die nächsten Sprints
**bereichsweise statt einzelfallweise** geplant werden können.

Neues Skript: `scripts/cms/renderer-fallback-inventory.mjs`
(npm-Script `cms:audit:renderer-fallback-inventory`).
Vollständige Matrix: [`renderer-fallback-inventar-latest.md`](./renderer-fallback-inventar-latest.md).
JSON: `scripts/cms/output/renderer-fallback-inventar-latest.json`.
R2-Snapshot (read-only SELECT): `scripts/cms/output/r2-pages-latest.json`.

## Klassen-Verteilung (80 Public-Pages)

| Klasse | Bedeutung | Anzahl |
|---|---|---:|
| G0 | vollständig generisch (CmsBodyRenderer, schlanke Hülle) | 2 |
| G1 | generisch + page-spezifische Hülle | 4 |
| S1 | Spezialrenderer, DB-first (`useCmsI18n`) | 54 |
| S2 | Spezialrenderer mit DB + i18n-Fallback (`useTranslation` direkt) | 19 |
| S3 | Spezialrenderer mit Hardcoding / kein `useCmsI18n` | 2 |
| P1 | Produktdatenbank-/Katalog-getrieben (kein CMS-Light-Ziel) | 1 |
| L1 | Legacy / Preview / Stage | 0 |

Risikoverteilung: **59 low · 20 medium · 2 high · 1 kein CMS-Ziel**.

### Lesehilfe

- **S1 ist heute der Normalfall** (54 von 80 Seiten). Diese Seiten sind
  bereits DB-first via `useCmsI18n` und enthalten keine relevante
  Hardcoding-Schicht. Sie sind für CMS-Truth-Freeze technisch ready.
- **S2 (19 Seiten)** sind die heißen Kandidaten für den i18n-Fallback-Abbau:
  sie nutzen DB **und** direkten `useTranslation` parallel. Die meisten
  haben zusätzlich hartcodierte Daten-Arrays.
- **S3 (2 Seiten)**: `NotFoundPage` (technisch, kein CMS-Ziel) und
  `produkte/merkliste/MerklistePage` (Produkt-Feature, gehört thematisch zu
  P1). Beide bewusst außerhalb der CMS-Light-Migration.
- **G0/G1 (6 Seiten)**: bereits vollständig oder fast vollständig auf
  `CmsBodyRenderer` umgestellt — kein weiterer Umbau nötig.
- **P1 (1)**: `CategoryListPage` — Produktkatalog, nicht CMS-Light.

## High-Risk-Seiten (Pflicht-Check vor jeder Migration)

| Seite | Datei | Klasse | Grund |
|---|---|---|---|
| `produkte/merkliste/MerklistePage` | `src/features/produkte/merkliste/MerklistePage.tsx` | S3 | Produkt-Feature, eigener i18n-Stack, **nicht** CMS-Light migrieren |
| `NotFoundPage` | `src/app/pages/NotFoundPage.tsx` | S3 | technisch, **nicht** CMS-Light migrieren |

## D9/R2-Bezug — content_v1 → card_v1

Aus read-only SELECT auf `cms_sections` (kein Write):

- **88 aktive R2-Hits** verteilt auf **17 distinct Page-Keys**.
- Davon **10 Seiten mit dedizierter React-Page-Komponente** (eigener Renderer).
- **7 Seiten OHNE dedizierte Page-Komponente** → diese rendern vermutlich
  vollständig über den generischen `CmsBodyRenderer` und sind die **sichersten
  R2-Migrationskandidaten**, weil keinerlei Spezialcode betroffen ist:

| Page-Key | aktive R2-Hits | Migrationsrisiko |
|---|---:|---|
| `zutrittskontrolle.bcm-mini-cloud` | 5 | **niedrig** (rein generisch) |
| `gebaeudemanagement.bcm-buchungssystem` | 4 | **niedrig** |
| `gebaeudemanagement.bcm-infoboard` | 4 | **niedrig** |
| `zutrittskontrolle.aussenstation-adx5` | 4 | **niedrig** |
| `service.online-produktkatalog` | 4 | **niedrig** |
| `zutrittskontrolle.zutrittssoftware` | 4 | **niedrig** |
| `zutrittskontrolle.digitale-briefkasten` | 4 | **niedrig** |

R2-Seiten **mit** Page-Komponente (Renderer-Beweis pro Seite nötig vor Migration):

| Page-Key | aktive R2-Hits | Komponente | Klasse |
|---|---:|---|---|
| `gebaeudekommunikation.grossanlagen` | 13 | `GrossanlagenPage.tsx` | S2 |
| `gebaeudekommunikation.systemloesungen` | 9 | `SystemloesungenPage.tsx` | S2 |
| `gebaeudekommunikation.briefkastenanlagen` | 7 | `BriefkastenanlagenPage.tsx` | S2 |
| `gebaeudekommunikation.snipdoo-ip` | 6 | `SnipdooIpPage.tsx` | S1 |
| `presse.root` | 5 | `PressePage.tsx` | S1 |
| `zutrittskontrolle.mobiler-zutritt` | 4 | `MobilerZutrittPage.tsx` | S2 |
| `signage.root` | 4 | `SignagePage.tsx` | S1 |
| `zutrittskontrolle.zufahrten-parkplaetze` | 4 | `ZufahrtenParkplaetzePage.tsx` | S2 |
| `zutrittskontrolle.fahrstuhlsteuerung` | 4 | `FahrstuhlsteuerungPage.tsx` | S2 |
| `gebaeudekommunikation.tuersprechanlagen` | 3 | `TuersprechanlagenPage.tsx` | G1 |

**Befund**: Die R2-Hits konzentrieren sich auf **2 fachliche Bereiche** —
`gebaeudekommunikation` (38 Hits / 5 Seiten) und `zutrittskontrolle` (30 Hits /
8 Seiten). Damit ist eine bereichsweise R2-Migration (statt sectionweise)
sauber schneidbar.

## i18n-/Fallback-Inventar (DE-Locales)

| Datei | Top-Level-Keys | Größe |
|---|---:|---:|
| Vollständige Tabelle siehe [`renderer-fallback-inventar-latest.md`](./renderer-fallback-inventar-latest.md) | | |

Die i18n-JSONs gelten laut `always-follow.md` bereits als **Fallback**, nicht
als Primärquelle. Konkreter Abbau bleibt einem späteren Sprint vorbehalten,
weil die Identifikation pro Key erfordert, dass das DB-Gegenstück existiert
(D3/D5-Restseeding muss zuerst durch).

## Hardcoding-Inventar (zusammengefasst)

Heuristisch erkannte hartcodierte Daten-Arrays (Variablennamen wie
`ITEMS`, `CARDS`, `BLOCKS`, `FAQ`, `FEATURES`, `CATEGORIES`, `TABS`,
`FALLBACK`) finden sich in **17 Pages**, davon **15 S2** und **1 G1** und
**1 S3**. Detailliste in der Matrix-Spalte „hard arrays". Die Heuristik ist
bewusst grob — die Bestätigung pro Seite muss im jeweiligen
Abbau-Sprint passieren (Renderer-Beweis: liest der Renderer das Array
heute noch, oder ist es toter Code?).

## Empfohlene nächste Sprints (auf Basis der Matrix)

### Sprint 2h — R2-Migration „leichte" Bereiche (1 Etappe, ~14 Hits)

Migriere die **7 R2-Seiten ohne Page-Komponente** (29 aktive Hits) per
idempotenter Migration. Renderer-Beweis ist trivial: alle nutzen
`CmsBodyRenderer` → `ContentSectionV1` liest keine Kinder, `CardsSectionV1`
liest sie. Re-Typing `content_v1 → cards_v1` aktiviert das Karten-Layout,
ohne sonstige Public-Wirkung.

Pflicht-Sign-off pro Page-Key durch Owner.

### Sprint 2i — R2-Migration `gebaeudekommunikation` (38 Hits, 5 Seiten)

Vor Migration: für jede der 5 Page-Komponenten Renderer-Beweis liefern, dass
der Container-Typ-Wechsel keine vom Spezialrenderer gelesene Property
verändert. Bereichsweise Migration, Owner-Sign-off, anschließend
Sichtprüfung Public.

### Sprint 2j — R2-Migration `zutrittskontrolle` (30 Hits, 8 Seiten)

Gleicher Schnitt wie 2i.

### Sprint 2k — D3/D5-Rest-Seeding gebündelt (bereichsweise)

3.487 fehlende Vertragsfelder + 3.401 fehlende Whitelist-Einträge gebündelt
pro Bereich seeden (4 Sub-Läufe: Anwendungen / Gebäudekomm /
Zutrittskontrolle / Service+Personas). Keine Inhalte überschreiben — nur
fehlende Zeilen ergänzen, idempotent.

### Sprint 2l — i18n-Fallback-Abbau (nur nach 2k)

Pro Bereich diejenigen i18n-Keys entfernen, deren DB-Gegenstück nach 2k
nachweislich gefüllt ist. Strikt key-genau, Diff-bericht pro Bereich.

### Sprint 2m — CMS-Truth-Freeze-Vorbereitung

Erst möglich, wenn 2h–2l durch sind. Klassifiziert die verbleibenden
i18n-Keys final (UI-Mikrotext = bleibt, Marketing = entfernt).

### Zusammenlegen möglich

- 2h + R2-Hits in 2i/2j als **ein** Bereichs-Sprint pro Bereich (statt 3
  separater Sprints), wenn pro Bereich nur **eine** Migration läuft und
  Owner-Sign-off vorliegt.
- 2k kann mit 2l **nicht** zusammengelegt werden — Seeding und
  i18n-Abbau müssen getrennte Audit-Punkte haben (sonst nicht mehr
  einzeln rollbackbar).

### Nicht zusammenlegen

- **Vertragsänderung + Datenmigration im selben Sprint** (siehe 2f-Bericht).
- **Spezialrenderer-Refactor + Inhaltsmigration**.
- **Mehrere Bereiche in einer Migration**.
- **i18n-Abbau ohne vorhergehendes D3/D5-Seeding**.

## Pflicht-Checks vor jeder größeren Änderung

1. `npm run cms:audit:contract`
2. `npm run cms:audit:contract-drift` (D1=0, D8=0 müssen bleiben)
3. `npm run cms:audit:d9-relations`
4. **Renderer-Beweis** pro betroffener Section
5. **Marketing-Spiegel-Diff** (`scripts/sync/source-raw/i18n`)
6. **Whitelist-Diff** (nur Ergänzungen, keine Löschungen)
7. **Idempotenz-Probe** (Migration zweimal laufen lassen)
8. Build durch Lovable-Harness

## Audit-Ergebnisse Sprint 2g

| Kennzahl | Wert |
|---|---:|
| Public-Pages inventarisiert | 80 |
| Davon S1/G0/G1 (DB-first ready) | 60 |
| Davon S2 (Hybrid, i18n-Fallback) | 19 |
| Davon S3/P1 (außerhalb CMS-Light) | 3 |
| R2-Seiten gesamt (aktiv) | 17 |
| R2-Seiten ohne Page-Komponente (leichteste Migration) | 7 |
| D1 / D8 / D9 / Distinct R2-Relationen | 0 / 0 / 201 / 3 (unverändert ggü. 2f) |

- `npm run cms:audit:contract` → 15 OK · 6 Warnung · 0 Konflikt
- `npm run cms:audit:contract-drift` → unverändert ggü. 2f
- `npm run cms:audit:d9` → 201 (unverändert)
- `npm run cms:audit:d9-relations` → 3 distinct Beziehungen (unverändert)
- `npm run cms:audit:renderer-fallback-inventory` → 80 Pages, 6 Klassen
- `npm run build` → **nicht manuell ausgeführt**; Lovable-Harness baut
  automatisch nach Commits.

## Geänderte/erzeugte Dateien

- **neu**: `scripts/cms/renderer-fallback-inventory.mjs`
- **neu**: `scripts/cms/output/renderer-fallback-inventar-latest.json`
- **neu**: `scripts/cms/output/r2-pages-latest.json` (read-only Snapshot)
- **neu**: `docs/04-betrieb/renderer-fallback-inventar-latest.md`
- **neu**: `docs/04-betrieb/sprint-2g-eine-wahrheit-bericht.md`
- **geändert**: `package.json` (+1 npm-Script)
- **geändert**: `docs/current-status.md` (Sprint-2g-Eintrag)

## Bestätigung Sprint-Verbote

- Keine Produktdatenbank angefasst.
- Keine Datenbank-Mutation (nur read-only SELECT für R2-Snapshot).
- Keine Inhalte, Bilder oder Feldwerte verändert.
- Keine Whitelist-Zeile geändert.
- Keine Public-Renderer-/Routen-/Navigation-/Footer-/Breadcrumb-/i18n-Änderung.
- Keine neue Schreib-RPC.
- Keine Strukturmigration.
- Keine Section aktiviert oder deaktiviert.

## Empfohlene nächste Etappe

`cms-light-eine-wahrheit-sprint-2h-r2-migration-leichte-bereiche-1` —
Migration der 7 R2-Seiten ohne Page-Komponente (29 aktive Hits), strikt
idempotent, Owner-Sign-off pro Page-Key.
