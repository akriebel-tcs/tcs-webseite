# Batch 49b — Kartenscroller-Rendering Nachbesserung

**Stand:** 2026-06-05
**Status:** ✅ Fix wirksam, B-082 + B-075 sichtbar als Scroller. B-566 nutzt eigene Page-Komponente — separat zu behandeln.
**Scope:** Reparatur des in Batch 49 angewandten Patches im zweiten Render-Pfad.

---

## 1. Warum Batch 49 nicht gewirkt hat

Batch 49 setzte die Weiche `cards_v1 + section_key=products → ProductScrollerV1` nur in **`CmsBodyRenderer.tsx`**. Die betroffenen Seiten (`ZufahrtenParkplaetzePage`, `MobilerZutrittPage` etc.) laufen aber **nicht über `CmsBodyRenderer`**, sondern über `GenericCmsPage` → **`renderPageSectionByType`** (`src/features/cms/lib/renderPageSection.tsx`).

`renderPageSectionByType` importiert zwar `RENDERERS`, `SKIP_TYPES`, `normalizeType` aus `CmsBodyRenderer`, kennt aber die in Batch 49 zugefügte **Body-Renderer-interne** Branch-Logik nicht — und holte sich daher weiterhin `RENDERERS["cards_v1"] = CardsSectionV1` (= Grid).

Ergebnis: Code-seitig sah die Weiche korrekt aus, sie wurde live aber für die GenericCmsPage-Pfade nie ausgeführt. Klassischer „Zwei-Pfad"-Drift.

---

## 2. Fix

**Datei:** `src/features/cms/lib/renderPageSection.tsx`

Dieselbe Weiche eingebaut, die seit Batch 49 in `CmsBodyRenderer` lebt — damit beide Render-Pfade dieselbe Wahrheit fahren:

```ts
if (normalized === "cards_v1" && args.sectionKey === "products") {
  normalized = "product_scroller_v1";
}
```

Keine zweite Scroller-Logik, kein neuer Renderer, kein neuer `section_type`. `ProductScrollerV1` wird wiederverwendet.

---

## 3. Sichtprüfung Live-Preview

| section_uid | page_key | Route | Ergebnis |
|---|---|---|---|
| **82** | `zutrittskontrolle.zufahrten-parkplaetze` | `/zutrittskontrolle/zufahrten-parkplaetze` | ✅ **Scroller** — horizontaler Snap-Container, Chevron-Buttons „Nach links scrollen" / „Nach rechts scrollen" sichtbar. Karten B-591 bis B-595 in einer scrollbaren Reihe. |
| **75** | `zutrittskontrolle.mobiler-zutritt` | `/zutrittskontrolle/mobiler-zutritt` | ✅ **Scroller** — Chevron-Buttons sichtbar; BCM DoorApp / GSM-Gateway in scrollbarer Reihe. |
| **566** | `signage.root` | `/signage` | ⚠️ **weiter Grid** — Grund siehe §4. |

(Browser-Extract auf `body` der jeweiligen Route, nicht nur Code-Lesung.)

---

## 4. B-566 (Signage) — Befund und Empfehlung

`SignagePage.tsx` rendert die Produkte-Sektion **nicht** über `renderPageSectionByType` / `GenericCmsPage`, sondern über eigenen Komponentencode (`products__*`-Loop mit `buildCardExtras`). Diese Page hat seit Batch 47 ihren eigenen Karten-Branch und fällt damit komplett **außerhalb** der zentralen Weiche.

→ B-566 zu fixen bedeutet, in `SignagePage.tsx` selbst auf den Scroller umzubauen (entweder die bespoke-Schleife durch `ProductScrollerV1`-ähnliches Layout ersetzen oder die Page auf `GenericCmsPage` migrieren). Beides ist **kein 1-Zeilen-Fix** und kollidiert mit „keine Folgearbeit starten / keine flächigen Umbauten ohne expliziten Auftrag".

**Empfehlung:** Separater Mini-Batch nur für `SignagePage`-Scroller, sobald beauftragt. Bis dahin bleibt B-566 ein dokumentierter Restpunkt (nicht-vertragsbrechend, da Signage eine bekannte bespoke-Page ist).

---

## 5. Verifikation

- `node scripts/cms/wahrheits-check-ci.mjs` → ✅ OK („Harvester reproduzierbar, keine Drift, Body-Map vollständig, Launch-Gate erfüllt").
- B-082 sichtbar als Scroller (Browser-Extract bestätigt Chevron-Buttons + Snap-Container).
- B-075 sichtbar als Scroller (Browser-Extract bestätigt Chevron-Buttons).
- B-566 weiter als Grid — bewusst nicht angefasst, da andere Architektur (siehe §4).
- B-591–B-595 bleiben editierbar als `card_v1`.
- Keine `card_v1`-Vertragsdrift, da `ProductScrollerV1` denselben Resolver-Stack benutzt wie `CardsSectionV1`.

---

## 6. Geänderte Dateien

- `src/features/cms/lib/renderPageSection.tsx` — Weiche `cards_v1 + section_key=products → product_scroller_v1` (analog zu `CmsBodyRenderer`).

Keine DB-Migration, keine Inhaltsänderung, keine Navigation, keine neuen Section-Typen.

---

## 7. Restpunkte

- **B-566 (`signage.root`)**: SignagePage hat eigenen Karten-Branch. Fix nur über gezielten Mini-Batch, sobald beauftragt.

---

**Ende Batch 49b.**
