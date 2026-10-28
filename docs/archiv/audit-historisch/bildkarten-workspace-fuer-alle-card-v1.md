# Bildkarten-Workspace für alle Standardkarten

Sprint: `cms-light-bildkarten-workspace-fuer-alle-card-v1-1`
Stand: 2026-06-01 — UI-only.

## Worum es geht

Der bisherige Pilot-Workspace `BildkartenCardWorkspace` (Akkordeon mit
Grunddaten → Bild → Icon → Features → Links → Technik, bilinguale
Eingaben, Live-Speichern über `rpc_admin_update_section_field`) war hart
auf die Türsprechanlagen-Seite und die Scroller B-026/B-027 gegated.
Andere `card_v1` (Kartenraster, Hub-Raster, Feature-Raster …) sahen
stattdessen den schlankeren `CardFieldsWorkspace`.

Mit diesem Sprint gilt der reiche Workspace für **alle** Standardkarten —
mit container-abhängiger Beschriftung und Warn-Logik. Es wurden keine
Inhalte, keine Bilder, keine DB-Strukturen und keine Renderer geändert.

## Was sich konkret geändert hat

### Pilot-Gate entfernt (`PageEditor.tsx`)

Bisher (Auszug):

```tsx
const PILOT_PAGE_KEY = "gebaeudekommunikation.tuersprechanlagen";
const PILOT_PARENT_KEYS = new Set(["aussenstationen", "innenstationen"]);
const isPilotBildkarte = pageKey === PILOT_PAGE_KEY && /* … */;
if (isPilotBildkarte) {
  const HIDDEN_PILOT_SLOTS = new Set(["thumbnail", "icon_image"]);
  // pilotAssets/pilotEditableFields ohne thumbnail/icon_image
  return <BildkartenCardWorkspace … />;
}
// sonst: CardFieldsWorkspace
```

Jetzt:

```tsx
if (grp.section_type !== "card_v1") return null;
const parentKey = parentBySectionKey.get(grp.section_key) ?? null;
const parentType = /* aus groupedSections */;
const cardAssets = assets.filter((a) => a.section_key === grp.section_key && a.is_active);
const hasImage      = cardAssets.some((a) => a.field_key === "image");
const hasThumbnail  = cardAssets.some((a) => a.field_key === "thumbnail");
const hasIconImage  = cardAssets.some((a) => a.field_key === "icon_image");
const parentLabel = parentKey
  ? (valueFor(parentKey, "headline", "de") ?? valueFor(parentKey, "headline", "en")
     ?? valueFor(parentKey, "title", "de") ?? parentKey)
  : null;
return (
  <BildkartenCardWorkspace
    parentSectionType={parentType}
    parentSectionLabel={parentLabel}
    hasImage={hasImage}
    hasThumbnail={hasThumbnail}
    hasIconImage={hasIconImage}
    assetsSlot={<SectionAssetsBlock … assets={assets} editableFields={editableFields} … />}
    …
  />
);
```

Damit:

- gilt der reiche Workspace für jede `card_v1`, unabhängig von Seite und Container,
- entfällt das globale Filtern von `thumbnail` und `icon_image` aus dem Asset-Bereich,
- ersetzt die Container-Headline (z. B. „Außenstationen", „products",
  „filter-grid") das hartcodierte Pilot-Label.

Der nachgelagerte `CardFieldsWorkspace`-Zweig für `card_v1` ist seit
diesem Sprint unerreichbar. Die Datei bleibt vorhanden und wird in einer
späteren Aufräum-Etappe entfernt, sobald sich der vereinheitlichte
Workspace im Alltag bestätigt hat.

### Container-aware Header & Warnungen (`BildkartenCardWorkspace.tsx`)

Neue Props:

```ts
parentSectionType?: string | null;   // z. B. "cards_v1" / "product_scroller_v1"
hasThumbnail?: boolean;
hasIconImage?: boolean;
```

Logik über `containerHintFor(parentSectionType)` (aus
`cardFieldsWorkspaceGroups.ts`):

| Container-Typ              | Label              | erwarteter Slot | Pflicht |
| -------------------------- | ------------------ | --------------- | ------- |
| `cards_v1`                 | Kartenraster        | `image`         | nein    |
| `product_scroller_v1`      | Kartenscroller      | `image`         | ja      |
| `card_grid_v1`             | Hub-Raster          | `thumbnail`     | ja      |
| `catalog_filter_grid_v1`   | Produktfilter-Raster| `thumbnail`     | ja      |
| `feature_grid_v1`          | Feature-/Icon-Raster| `icon_image`    | ja      |
| `download_list_v1`         | Download-Liste      | `none`          | nein    |

Header-Verhalten:

- Badge „Bildkarte" + Pilot-Hinweis sind entfernt.
- Statt dessen: „Standardkarte" + Container-Label (z. B. „Kartenraster").
- Rote Warnung „⚠ Bild fehlt / Thumbnail fehlt / Bildicon fehlt"
  erscheint **nur**, wenn `slotIsRequired === true` und der jeweilige
  Slot nicht aktiv ist. Im Kartenraster steht statt dessen ein leiser
  Hinweis „Bild empfohlen — Textkarte hier erlaubt".
- Parent-Anzeige liest jetzt die echte Container-Headline statt
  hartcodierter Pilot-Labels.

Medien-Akkordeon:

- Titel: „Bild · Thumbnail · Bildicon".
- Hint zitiert den Container-Hinweis (`containerHint.summary`).
- Hauptbild-Slot bleibt benannt (`image`), `image_enabled`-Schalter bleibt unverändert.
- Asset-Bereich (`assetsSlot`) zeigt jetzt alle Slots der Karte —
  keine globale Filterung mehr.

## Prüfbeispiele

| Karte    | Container                | Render-Realität            | Verhalten neu                                                                 |
| -------- | ------------------------ | -------------------------- | ----------------------------------------------------------------------------- |
| B-538/539/540/2195 | B-026/B-027 (Scroller) | `product_scroller_v1` | unverändert — Workspace war schon der gleiche, jetzt mit dynamischem Container-Label „Kartenscroller". |
| B-1237   | B-071 (Kartenraster)     | `cards_v1`                  | **keine** rote „Bild fehlt"-Warnung mehr, nur Hinweis „Bild empfohlen — Textkarte hier erlaubt". |
| B-624 / B-626 | B-244 / `products` (Scroller) | `product_scroller_v1` | Warnung „⚠ Bild fehlt" bleibt korrekt rot (Bild Pflicht im Scroller).         |
| B-591/592/593 | B-082 (Kartenraster) | `cards_v1`                  | Standardkarte mit Container-Label „Kartenraster", alle Akkordeons sichtbar, Asset-Bereich zeigt `image`/`thumbnail`/`icon_image` zur freien Pflege. |

## Was bewusst nicht geändert wurde

- **Keine DB-Änderung, keine Migration, keine neue RPC, keine neue
  Whitelist-Zeile.** Alle Schreibwege laufen weiterhin über
  `rpc_admin_update_section_field` mit den vorhandenen Whitelist-Feldern.
- **Keine Inhalte, Bilder oder Feldwerte überschrieben.**
- **Keine Public-Renderer-, Routen-, Navigation-, Footer- oder
  Breadcrumb-Änderung.**
- **Keine i18n-JSONs angefasst.**
- **Produktdatenbank tabu — kein Client-Import, kein Schreibversuch.**
- **`CardFieldsWorkspace` und `cardFieldsWorkspaceGroups.ts` bleiben
  unverändert.** Für `card_v1` ist der Zweig jetzt unerreichbar; Cleanup
  in eigener späterer Etappe.
- **`BildkartenCardWorkspace` ändert nichts an Pilot-Karten der
  Türsprechanlagen-Seite außer Header-Beschriftung und Asset-Filter —
  Speicherverhalten, Akkordeon-Zustand-Cache, Scroll-Restore und alle
  Toggles arbeiten unverändert weiter.**

## Audits 2026-06-01

- `cms:audit:contract`: 15 OK · 7 Warnung · 0 Konflikt (stabil).
- `cms:audit:renderer-fallback-inventory`: 82 Pages · G0=2 · G1=4 · S1=54
  · S2=19 · S3=2 · P1=1 (stabil).
- `tsc --noEmit`: grün.
- `npm run build`: nicht manuell ausgeführt — Lovable-Harness baut automatisch.

## Empfohlene nächste Etappe

`cms-light-baustein-workspaces-wechselteaser-hero-content-1` —
analoge Akkordeon-Workspaces für `teaser_2col_v1`, `hero_v1`,
`content_v1` (gleiche Inhalte → Medien → Sichtbarkeit → Links
→ Technik-Aufteilung, container-aware Hinweise).
