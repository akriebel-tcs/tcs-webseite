# Karten-Raster-Regel (Vereinheitlichung)

Stand: 2026-06-04

## Regel in einem Satz

Karten in einem `cards_v1`-Container ordnen sich **immer als ausgewogener
Block** an. Es gibt nie eine Reihe mit nur einer Karte („3 + 1"-Orphan
verboten).

## Aufteilungstabelle (Desktop)

| Anzahl | Anordnung      | Reihen          |
|-------:|----------------|-----------------|
|  1     | 1 (volle Breite) | `[1]`         |
|  2     | 2 nebeneinander  | `[2]`         |
|  3     | 3 nebeneinander  | `[3]`         |
|  4     | 4 nebeneinander  | `[4]`         |
|  5     | 3 oben, 2 gestreckt unten | `[3, 2]` |
|  6     | 3 + 3            | `[3, 3]`      |
|  7     | 4 + 3            | `[4, 3]`      |
|  8     | 4 + 4            | `[4, 4]`      |
|  9     | 3 + 3 + 3        | `[3, 3, 3]`   |
| 10     | 4 + 3 + 3        | `[4, 3, 3]`   |
| 11     | 4 + 4 + 3        | `[4, 4, 3]`   |
| 12     | 4 + 4 + 4        | `[4, 4, 4]`   |
| n > 12 | Muster wiederholt sich, nie eine 1er-Reihe | — |

Auf Tablet (md) immer 2 Spalten. Auf Mobile (sm) immer 1 Spalte.
Die Karten der „kürzeren" Reihe werden auf die volle Gesamtbreite gezogen
(z. B. bei 5 Karten sind die zwei unteren Karten zusammen so breit wie
die drei oberen).

## Familien-Caps

| Familie (erkannt am `section_key`) | max. Karten pro Reihe |
|------------------------------------|----------------------:|
| `*benefit*` / `*vorteil*`          | 3                     |
| `*usecase*` / `*anwendung*` / `*einsatz*` / `*branche*` | 4 |
| sonst (default, Produkte, Lösungen …)                   | 4 |

Bei Benefits gilt dasselbe Orphan-Verbot: 4 Benefits werden zu `2 + 2`,
7 Benefits zu `3 + 2 + 2` usw.

## Wo das technisch lebt

- Quelle der Wahrheit: `src/features/cms/lib/cardGrid.ts`
  - `computeCardRows(n, maxRow)` — liefert das Reihen-Array
  - `rowSizeForIndex(n, index, maxRow)` — Reihe für ein Item
  - `cardGridClass(sectionKey, extra)` — Container-Klassen
  - `cardGridItemClass(sectionKey, n, index)` — Item-Klassen
- Tests: `src/features/cms/lib/__tests__/cardGrid.test.ts` (27 Cases,
  inklusive „nie 1er-Reihe für 2 ≤ n ≤ 30").
- Renderer, die die Regel nutzen:
  - `src/features/cms/components/sections/CardsSectionV1.tsx`
  - `src/features/cms/components/CmsProductSolutionShell.tsx`

## Bild-Seitenverhältnis je Reihen-Größe (2026-06-05)

Standardkarten-Bilder in `cards_v1` werden seit 2026-06-05 **row-aware**
gerendert, damit breite 2er-Karten nicht mehr ein zu hohes 4:3-Bild
bekommen. Quelle: `cardImageAspectClass(sectionKey, n, index)` aus
`cardGrid.ts`.

| Reihen-Größe (Desktop ≥ lg) | Bildformat |
|---:|---|
| 1 Karte pro Reihe | `aspect-[21/9]` (hero-artig, breit) |
| 2 Karten pro Reihe | `aspect-[21/9]` (breite Karten — flaches Bild) |
| 3 Karten pro Reihe | `aspect-[16/9]` |
| 4 Karten pro Reihe | `aspect-[4/3]` |

Auf Mobile und Tablet (< lg) ist das Bildformat einheitlich `16:9` —
Karten sind dort gestapelt bzw. 2-spaltig und brauchen kein eigenes
Sonderformat.

Die Regel ist row-aware, d. h. bei 5 Karten (3 + 2) bekommt die obere
Reihe automatisch `16:9` und die untere Reihe ebenfalls `16:9` — beide
Reihen wirken zusammen ausgewogen, ohne hartkodierte Sonderfälle.

## Neue Renderer

Wer einen neuen Karten-Container baut, MUSS beide Helper benutzen
(Container + Item-Klasse). Direkte `grid-cols-*`-Klassen am Karten-Wrapper
sind nicht erlaubt — sonst entstehen wieder Orphans.

```tsx
import { cardGridClass, cardGridItemClass } from "@/features/cms/lib/cardGrid";

<div className={cardGridClass(sectionKey, "mt-8")}>
  {items.map((it, i) => (
    <article
      key={it.id}
      className={`${cardGridItemClass(sectionKey, items.length, i)} …Kartenstyles…`}
    >
      …
    </article>
  ))}
</div>
```
