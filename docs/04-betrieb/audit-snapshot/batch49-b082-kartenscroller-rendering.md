# Batch 49 — B-082 Kartenscroller-Rendering

**Stand:** 2026-06-05
**Status:** ✅ Fix umgesetzt, Wahrheits-Check grün
**Scope:** Public-Renderer-Weiche für `cards_v1 + section_key=products` → `ProductScrollerV1`. Keine DB-Migration, keine neuen Section-Typen, keine Inhaltsänderung.

---

## 1. Ist-Zustand B-082

| Feld | Wert |
|---|---|
| Seite | `zutrittskontrolle.zufahrten-parkplaetze` |
| `section_key` | `products` |
| `section_type` (DB) | `cards_v1` |
| `is_active` | `true` |
| `sort_order` | 40 |
| Kind-Sections | B-591 `card_bcm_leser`, B-592 `card_handsender`, B-593 `card_kfz`, B-594 `card_uhf_leser`, B-595 `card_gsm_gateway` — alle `card_v1`, alle aktiv |
| Scroller-Steuerfelder | keine eigenen — die Scroller-Eigenschaft ergibt sich aus `section_key='products'` (siehe „effektiver Container") |

Im Admin wird B-082 als **Kartenscroller** geführt, weil `effectiveContainerKindOf` (`src/features/cms/lib/cardVisibility.ts:110`) `cards_v1` mit `section_key='products'` explizit auf `cards_v1.scroller` mappt.

---

## 2. Renderer-Pfad (vorher)

- `ZufahrtenParkplaetzePage.tsx` ist ein dünner Wrapper um `GenericCmsPage`.
- `GenericCmsPage` → `CmsBodyRenderer` → Lookup in `RENDERERS[section_type]`.
- Für `cards_v1` lieferte die Tabelle ausschließlich `CardsSectionV1` (Kartenraster über `cardGridClass`).
- **Es gab keinen Renderer-Pfad, der die `cards_v1.scroller`-Variante öffentlich umsetzte.** Admin-Label und Public-Rendering driftete: Admin sagte „Scroller", Public zeigte Grid.
- Es existierte kein Fallback, der `product_scroller_v1` als `cards_v1` behandelt — der umgekehrte Fall (siehe `normalizeType`: `products → product_scroller_v1`) galt nur für **rohe** `section_type='products'`-Strings, nicht für `cards_v1`-Sections mit `section_key='products'`.

---

## 3. Vertragsprüfung Kartenscroller

- **Definition** (siehe `cardVisibility.ts:34-36` + `card_v1.matrix.json`): Der Vertrag kennt drei effektive Container für `card_v1`-Eltern: `cards_v1.grid`, `cards_v1.scroller`, `product_scroller_v1`.
- `cards_v1.scroller` und `product_scroller_v1` teilen das gleiche Feldinventar; Unterschied liegt nur im Layout (horizontaler Snap-Scroller statt responsive Grid).
- **Erwartung:** Wenn der Admin „Scroller" anzeigt, muss public ein Scroller erscheinen — auf allen Breakpoints. Es gibt keinen dokumentierten Breakpoint-Schwellenwert, der vom Scroller zum Grid umschalten würde. → Vorheriges Grid-Rendering war **unbeabsichtigt**, kein bewusstes Responsive-Verhalten.

---

## 4. Fix

**Datei:** `src/features/cms/components/CmsBodyRenderer.tsx`

In der Top-Level-Schleife wurde eine Weiche eingebaut, die `effectiveContainerKindOf` 1:1 spiegelt:

```ts
if (type === "cards_v1" && sec.section_key === "products") {
  type = "product_scroller_v1";
}
```

Dadurch läuft B-082 (und sein semantisches Gegenstück B-075, B-566 — siehe §5) über den bestehenden `ProductScrollerV1`. Vorteile:

- **Keine zweite Scroller-Logik.** Bestehender Renderer.
- **Kindkarten bleiben `card_v1`.** Kein Eingriff in Sections, keine Migration.
- **Kein neuer `section_type`.** DB unverändert.
- **Keine Inhaltsänderung.** Felder, Sortierung, Sichtbarkeit unverändert.
- **Vertragsdrift `card_v1` wird nicht wieder eingeführt** — `ProductScrollerV1` benutzt denselben `resolveCardRuntime`/`resolveHref`/`useShortIdResolver`-Pfad wie `CardsSectionV1`.

---

## 5. Globaler Kurzcheck

Aktive Sections mit `section_type='cards_v1' AND section_key='products'`:

| section_uid | page_key |
|---|---|
| 75 | `zutrittskontrolle.mobiler-zutritt` |
| **82** | **`zutrittskontrolle.zufahrten-parkplaetze`** |
| 566 | `signage.root` |

Alle drei waren vom selben Drift betroffen: Admin = Scroller, Public = Grid. Da der Fix **eindeutig derselbe** ist (1 Zeile im zentralen Renderer, exakt der dokumentierten Vertragsregel folgend), erfasst die Weiche sie automatisch. Keine Sonderbehandlung, keine flächige Umbauwelle — eine Logik-Korrektur.

Andere `product_scroller_v1`-Sections (echter `section_type`) waren bereits korrekt und sind unverändert.

---

## 6. Verifikation

- `node scripts/cms/wahrheits-check-ci.mjs` → ✅ OK („Harvester reproduzierbar, keine Drift, Body-Map vollständig, Launch-Gate erfüllt").
- Build wird vom Harness nach dem Quellcode-Edit ausgeführt; keine TypeScript-Änderung an Signaturen, nur lokaler `let`/Branching innerhalb der Schleife.
- B-591 bis B-595 bleiben weiterhin als `card_v1` bearbeitbar — Admin-Workspace sieht keinen Unterschied.
- Keine `card_v1`-Vertragsdrift wird wieder eingeführt — der Scroller-Pfad nutzt denselben Resolver-Stack.

---

## 7. Ergebnis

- **Ursache:** Renderer-Tabelle hatte keine Weiche für die effektive Container-Variante `cards_v1.scroller`. Admin-Label und Public-Rendering driftete global.
- **Lokal oder global?** Global (3 Sections betroffen, eine Renderer-Stelle).
- **Korrigierte Datei:** `src/features/cms/components/CmsBodyRenderer.tsx` (Top-Level-Loop, +9 Zeilen Kommentar/Logik).
- **Weitere betroffene Kartenscroller:** B-075, B-566 — vom selben Fix mit-erfasst.
- **B-082 jetzt:** rendert öffentlich über `ProductScrollerV1` als horizontaler Snap-Scroller; Kindkarten B-591–B-595 unverändert als `card_v1`.

---

**Ende Batch 49.**
