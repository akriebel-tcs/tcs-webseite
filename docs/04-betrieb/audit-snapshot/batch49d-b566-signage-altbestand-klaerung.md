# Batch 49d — B-566 (`signage.root|products`) als Legacy/Bespoke markiert

**Stand:** 2026-06-05
**Status:** ✅ erledigt. Eine Code-Änderung in `truthSources.ts`, keine DB-/Renderer-/Navi-/Content-Änderung.

---

## 1. Befund

| Frage | Antwort |
|---|---|
| Welche Seite/Route gehört zu B-566? | `signage.root` (Route `/signage`, Komponente `SignagePage.tsx`). |
| `signage.root.status` / `is_active`? | **`archived` / `false`** (per DB-Read bestätigt). |
| Wird B-566 öffentlich aus der DB gelesen? | **Nein.** RLS `cms_sections public read published` filtert auf `cms_page_is_public(page_key)` → `signage.root` ist nicht published, also liefert die Public-API für die Seite **keine** Sections aus. |
| Woher kommen die sichtbaren Karten auf `/signage`? | Aus `SignagePage.tsx`: Wenn `productCards.length === 0`, fällt der Sonderpfad auf die `PRODUCT_KEYS`-Liste mit i18n-Keys (`signage:products.items.*`). |
| Taucht B-566 als aktiver Kartenscroller in Audit/Admin auf? | Ja — vor diesem Batch. `truthSources.objectKindsBySection` mappte `cards_v1` mit `section_key='products'` pauschal auf `cards_scroller`, ohne zu prüfen, ob die Seite überhaupt öffentlich ist. Dadurch erschien B-566 in der Wahrheits-Tabelle als „Kartenscroller (rot/yellow)", obwohl er öffentlich gar keine Wirkung entfaltet. |

---

## 2. Fix

`src/features/admin/lib/truthSources.ts` — neue Liste `LEGACY_BESPOKE_SECTIONS` im `objectKindsBySection`-Scope:

```ts
const LEGACY_BESPOKE_SECTIONS = new Set<string>([
  "signage.root|products",
]);
…
if (LEGACY_BESPOKE_SECTIONS.has(`${section.page_key}|${key}`)) return [];
```

Wirkung:
- B-566 wird im Wahrheits-Check **nicht mehr** als `cards_scroller`-Objekt geführt.
- Damit verschwindet eine Phantom-Rot-Zeile aus dem Admin/Audit.
- Section bleibt in der DB unverändert (`is_active=true`, `section_type='cards_v1'`).
- Keine Auswirkung auf öffentliche Render-Pfade (`CmsBodyRenderer` / `renderPageSection`): Die RLS-Sperre auf archivierten Seiten wirkt weiterhin.
- Pflege: Die Liste ist die explizite Stelle für künftige bespoke/archivierte Container-Sections — bewusst klein gehalten und kommentiert.

Kinder-Sections (`signage.root|products__farbvielfalt`, `…__hausnummern`, `…__tuerschilder`, `…__tuerklingeln`) bleiben in der DB unangetastet. Sie werden weiter als `card` aggregiert; das ist akzeptabel, weil sie kein Phantom-„Container"-Objekt mehr erzeugen.

---

## 3. Was bewusst NICHT gemacht wurde

- ❌ Keine DB-Migration. `signage.root` bleibt `archived`/`is_active=false`. Sections und Felder unangetastet.
- ❌ Kein Reaktivieren der Seite.
- ❌ Keine Navi-Änderung.
- ❌ Keine Renderer-Änderung (Public-Pfad). Die Batch-49b-Weiche bleibt unverändert.
- ❌ Keine Inhalts-Löschung. Die Karten-Inhalte in der DB bleiben als Reserve liegen, falls die Seite je veröffentlicht wird.

---

## 4. Verifikation

- DB-Check: `signage.root` = `status='archived'`, `is_active=false`. Section `B-566 (signage.root|products, cards_v1, is_active=true)` bestätigt.
- `node scripts/cms/wahrheits-check-ci.mjs` → ✅ OK (Harvester reproduzierbar, keine Drift, Body-Map vollständig, Launch-Gate erfüllt).
- Live-Render `/signage` unverändert (kein Public-Render-Code geändert).

---

## 5. Geänderte Dateien

- `src/features/admin/lib/truthSources.ts` — `LEGACY_BESPOKE_SECTIONS` ergänzt, in `objectKindsBySection` ausgewertet.
- (dieser Bericht)

---

## 6. Restpunkte

- Wenn `signage.root` künftig veröffentlicht werden soll, ist B-566 wieder ein vollwertiger Wahrheits-Block; dann den Eintrag in `LEGACY_BESPOKE_SECTIONS` entfernen und Batch 49c §4 Option 1 abarbeiten.
- Keine weiteren bekannten Legacy-Container in der Liste — Pflege bewusst auf Einzelfälle beschränkt.

**Ende Batch 49d.**
