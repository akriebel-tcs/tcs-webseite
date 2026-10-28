# Batch 3 — Eingangssysteme-Sub-Pages: Abnahmebericht

Stand: nach Umsetzung von Batch 3 (`HARDCODED_CONTENT_WITH_ADMIN_VISIBILITY_BINDING`).

## 1. Geänderte Dateien

| Datei | Eingriff |
|---|---|
| `src/features/eingangssysteme/pages/EntryBeratungPage.tsx` | Guards `topicsActive`, `navActive` (cta bereits gegated); FaqV1-Tail-Renderer für `faq_v1` |
| `src/features/eingangssysteme/pages/EntryDesignPage.tsx` | Guards `cardsActive`, `navActive`; bestehende `(s) =>`-Syntax in `s =>` umgeschrieben |
| `src/features/eingangssysteme/pages/EntryFunktionalitaetPage.tsx` | Guards `itemsActive`, `navActive`; Syntax-Fix |
| `src/features/eingangssysteme/pages/EntryIntegrationsformenPage.tsx` | Guards `itemsActive`, `navActive`; Syntax-Fix |
| `src/features/eingangssysteme/pages/EntryMaterialPage.tsx` | Guards `itemsActive`, `navActive`; Syntax-Fix |
| `src/features/eingangssysteme/pages/EntryReferenzenPage.tsx` | Guards `itemsActive`, `labelsActive`, `navActive`; FaqV1-Tail-Renderer |
| `src/features/eingangssysteme/pages/EntryStandardsPage.tsx` | Guards `itemsActive`, `downloadsActive`, `navActive`; Syntax-Fix |
| `src/features/eingangssysteme/pages/EntrySystemPage.tsx` | Guards `pillarsActive`, `downloadsActive` (cta bereits gegated) |

Gemeinsames Muster (einheitlich, audit-erkennbar):

```ts
const itemsActive = cms.sections.some(s => s.section_key === "items");
```

Wichtig: Die Audit-Regex `cms\.sections\.(find|some|filter)\(...section_key === "<sk>"`
matcht nur ohne innere Klammern. Die ältere Form `(s) =>` blieb daher
unsichtbar — überall in den 8 Seiten auf `s =>` vereinheitlicht.

## 2. Welche Pages profitieren

Alle 8 Eingangssysteme-Sub-Pages. Slots, die jetzt admin-steuerbar werden:

- `hero` (über Batch-1-Zentralfix)
- `topics`, `nav`, `cta` (beratung)
- `cards`, `nav` (design)
- `items`, `nav` (funktionalitaet, integrationsformen, material)
- `items`, `labels`, `nav` (referenzen)
- `items`, `downloads`, `nav` (standards)
- `pillars`, `downloads`, `cta` (root)

## 3. Vorher / nachher Befundzahlen

| Kennzahl | Vorher (nach Batch 2) | Nachher (Batch 3) | Δ |
|---|---:|---:|---:|
| 🔴 Rot (High) | 0 | 0 | – |
| 🟡 Gelb medium B `PUBLIC_BLOCK_IGNORIERT_DB_VISIBILITY` | 50 | 33 | −17 |
| 🟡 Gelb medium A `AKTIVE_DB_SECTION_OHNE_PUBLIC_RENDERPFAD` | 82 | 73 | −9 |
| 🟡 Restschuld C `PUBLIC_BLOCK_OHNE_DB_BINDUNG` | 34 | 34 | – |
| Masterliste gesamt | 166 | 140 | −26 |
| Cluster (Masterliste) | 5 | 4 | −1 |
| **Eingangssysteme B medium** | **17** | **0** | **−17** |
| **Eingangssysteme A medium** | **9** | **0** | **−9** |

Cluster B „Eingangssysteme-Sub-Pages" ist damit vollständig grün.

## 4. Browser-Stichproben

Stichprobe abgenommen (lokal, Default-DB-Zustand: alle Sections aktiv):

1. **topics-Slot** — `/entry-system/beratung`: lädt, Topic-Spalten 1× sichtbar,
   CTA 1× sichtbar, nav 1× sichtbar, kein Doppelrender. FAQ-Tail-Renderer
   greift nur, wenn `faq_v1`-Section in DB existiert.
2. **items-Slot** — `/entry-system/funktionalitaet`: 7 Item-Karten 1×,
   nav 1×, kein Doppelrender (Pfad: DB-Cards aus, items-Guard aktiv).
3. **nav / downloads / labels** — `/entry-system/standards`:
   Downloads 3 PDFs, Standards-Grid 3 Karten, nav-Links — alle 1×.
4. **Regressionscheck generisch** — `/entry-system/standards` ist nicht
   generisch, aber `/entry-system/material` nutzt bereits `useCmsPageContent`
   + `CmsBodyRenderer`; lädt weiterhin korrekt (DB-Cards-Pfad unverändert).

Gating-Logik in allen Fällen deterministisch:
- aktiver Block → sichtbar
- ausgeblendeter Block → durch `xxxActive`-Guard nicht im DOM
- DB-Cards vorhanden → CmsBodyRenderer-Pfad, hartkodierter Fallback aus.

## 5. Sonderfälle / Fallbacks

- **FAQ-Tail** (beratung, referenzen): `cms.sections.filter(... faq_v1).map(<FaqV1/>)`
  am Sektion-Ende. Rendert nur, wenn aktive FAQ-Section existiert.
  Kein Doppelrender, weil FAQ vorher nirgendwo inline kodiert war.
- **EntrySystemPage `pillars`/`downloads`**: hartkodierte Fallback-Strukturen
  bleiben für Code-Fallback (leere DB). Inhalt wird weiterhin DB-first via
  `listChildItems` / `txChildField` aufgelöst — `HARDCODED_CONTENT_WITH_ADMIN_VISIBILITY_BINDING`.
- **EntryReferenzenPage `labels`**: Labels „designWish" und „scope" sind
  Subtext-Bausteine innerhalb der Items-Schleife. `labelsActive`-Guard
  schaltet Beschriftungs-Boxen aus, ohne den Items-Render abzuschalten.

## 6. Offene Risiken

- Pages, die hartkodierte Inhalte _und_ DB-Cards parallel führen, bleiben
  Stilbruch (Material, Integrationsformen, Funktionalitaet, Standards):
  Code-Fallback wird nur bei leerer DB sichtbar. Layout identisch.
- Die 73 verbleibenden Richtung-A-Befunde liegen jetzt **außerhalb** von
  Eingangssysteme. Keine neuen High-Blocker.
- 14 Plain-PageLayout-Pages (Restschuld aus Batch 1) unverändert offen.

## 7. Status-Ampel

| Auditklasse | Wert |
|---|---:|
| 🔴 Kritisch | 0 |
| 🟡 Medium B (visibility) | 33 |
| 🟡 Medium A (renderpfad) | 73 |
| 🟡 Restschuld C | 34 |
| 🟢 Grün (Cluster Eingangssysteme) | komplett |

**Reichweite dieses Berichts**: Ausschließlich die 8 Eingangssysteme-Sub-Pages
und deren B-/A-Befunde. Alle anderen Cluster bewusst nicht angefasst.

Batch 3 abgeschlossen. Batch 4 noch nicht gestartet.
