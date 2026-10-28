# Asset-Strategie

Stand: 2026-05-27 (Tranche 22 — Stand-Zeile synchronisiert; Inhalte
unverändert seit Tranche 20/21, Medien-Workbench-Filter und
Hygiene-Regeln dort bereits dokumentiert)

> **Hinweis Icons (2026-05-23)**: Icons sind im Admin Teil des Medien-
> bereichs (Bilder + Thumbnails + Icons nebeneinander), aber technisch
> **keine `cms_assets`-Zeilen**. Sie leben in `cms_section_fields` als
> Text-Werte (`field_key='icon'` oder `<key>.icon`, kebab-case
> Lucide-Namen wie `shield`, `key-round`). Whitelist-Eintrag in
> `cms_admin_editable_fields` Pflicht. Im Renderer per `resolveIcon(...)`
> mit Code-Fallback aufgelöst. Bildslots bleiben je Renderer-Kontext
> `image` oder `thumbnail`.

## Wo Bilder leben

Jedes Bild auf einer CMS-Seite liegt als Zeile in `cms_assets`. Ein „Slot"
(Platz für ein Bild) ist eine Kombination aus `section_key` + `field_key` +
`viewport` (Bildschirmgröße).

```text
section_key   z. B. hero, karten, faq
field_key     z. B. image, logo, icon          ← ein Slot, der drei Varianten trägt
viewport      mobile | tablet | desktop        ← die Geräte-Varianten dieses Slots
alt_de/alt_en Alt-Text (Pflicht bei aktiven Bildern)
public_url    Public-URL aus dem Storage-Bucket
is_active     Sichtbarkeit
```

## Viewport-Regeln (Stand 2026-05-16, vereinheitlicht)

- **Ein Slot = ein `field_key`.** Für ein Hero-Bild gibt es einen Slot
  `image`, der drei Varianten trägt: `mobile`, `tablet`, `desktop`.
- Fehlt eine Variante, fällt der Renderer automatisch auf `desktop` zurück
  (und falls auch das fehlt, auf das im Code hinterlegte Fallback-Bild).
- Die alten Feldnamen `image_desktop`, `image_tablet`, `image_mobile` sind
  **Legacy** und werden vom Renderer nicht mehr gelesen. Sie tauchen im
  Admin nicht mehr als redaktionelle Slots auf. Bestehende Zeilen werden
  nicht gelöscht (siehe „Inhalt-zuerst-Regel"), sind aber unsichtbar und
  ohne Wirkung. Eine spätere Migration kann sie konsolidieren.


## Schreibwege

Bilder werden **ausschließlich** über `rpc_admin_upsert_asset` und
`rpc_admin_update_asset_alt` geschrieben. Löschen über `rpc_admin_delete_asset`.
Kein direktes `INSERT/UPDATE` aus dem Frontend.

## Hero-Bilder

Hero-Bilder leben pro Persona-Seite (`zutrittskontrolle`, `gebaeudemanagement`
usw.) im Slot `hero.image`. Andres Stand vom 2026-05-16 ist kanonisch; die
früheren `image_desktop`-Dubletten sind deaktiviert.

## Alt-Texte

- Pflicht für jedes aktive Bild.
- Werden im Admin gepflegt.
- Niemals leere Strings — bei dekorativen Bildern dennoch sinnvoll
  beschreiben (Suchmaschinen-Hygiene).

## Storage

- Bucket: öffentlich lesbar (für Public-Website nötig).
- Upload nur über Admin-UI (intern wieder über RPC + Storage-Policy).
- Asset-URLs sind absolut (`https://…supabase.co/storage/v1/object/public/…`).

## Lokale Inhalts-Snapshots

`scripts/sync/source-raw/i18n` und `src/assets/cms-import/` sind Snapshots aus
dem Marketing-ZIP. Sie sind **Referenz**, nicht Source of Truth. Source of
Truth bleibt die DB.

## Was *nicht* in `cms_assets` gehört

- Icons / SVG-UI-Elemente, die nicht inhaltlich sind
- Produktbilder aus dem Produktkatalog (separate Tabelle, Public-Schutz)
- Hintergrundtexturen, die nur Layout sind

## Bildslot-Regel für neue Karten und Templates (Stand 2026-05-21)

Wenn per Prompt eine neue redaktionelle Seite oder neue Karten nach
Template angelegt werden (z. B. `produkt_sub_v1`), gilt:

**Pro Bildplatz:**

- Slot-Name `image` (kein `image_desktop`/`_tablet`/`_mobile` mehr)
- Drei `viewport`-Varianten **strukturell vorbereiten**: `desktop`,
  `tablet`, `mobile`
- Whitelist (`cms_admin_editable_fields`) für `image` jeweils DE+EN
  setzen, damit der Upload-Slot im Admin sichtbar ist
- Wenn noch keine Bilder geliefert sind, **keine Bilder raten** — Upload-
  Slot bleibt leer, Renderer zeigt Fallback. Slot trotzdem whitelisten,
  damit die Redaktion das Bild später hochladen kann
- Alt-Texte DE+EN bleiben pflegbar (Whitelist + `rpc_admin_update_asset_alt`)
- `desktop` darf weiterhin als automatischer Fallback dienen, wenn
  `mobile`/`tablet` leer sind

**Pro Karte (Kind-Section vom Typ `card_v1`):**

- `title`, `description` whitelisten (Pflicht, DE+EN)
- `icon` whitelisten (optional, Lucide-Name als Text)
- `image` whitelisten (optional, mit Viewports `desktop`/`tablet`/`mobile`)
- bei Feature-/Bulletkarten zusätzlich `features.0..N` whitelisten
- bei Linkkarten zusätzlich `cta_label`, `cta_href` (bzw. `href`)
  whitelisten, falls fachlich vorhanden

So bleibt jede neue Karte und jeder neue Bildplatz **strukturell** im
Admin sichtbar, auch wenn der Inhalt erst später eingespielt wird.

## card_v1 Medienmodell — drei Ausprägungen, keine Sonderkarte (Stand 2026-05-24, Tranche 7e)

`card_v1` ist der einzige Standard-Kartentyp. Statt für jede visuelle
Ausprägung eine neue Section-Variante zu erfinden, trägt eine `card_v1`
**drei verschiedene Medienformen** über klar getrennte Slots:

| Ausprägung | Quelle | Pflege |
|---|---|---|
| **Lucide-Icon** | `cms_section_fields.field_key='icon'` (Textwert, kebab-case) | IconPicker im Admin-Inhaltsbereich |
| **TCS-Bildicon / grafisches Icon** | `cms_assets` mit `field_key='icon_image'` | Medienbereich als Bildslot (seit Tranche 8 aktiv: `AssetWorkbench` listet `icon_image` als eigenen Slot, Renderer `CardsSectionV1`/`FeatureGridV1` konsumieren ihn priorisiert) |
| **Normales Kartenbild** | `cms_assets` mit `field_key='image'` (oder `thumbnail` in Hub-/Filtergrid-Kontexten) | Medienbereich, drei Viewports |

**Renderer-Priorität in Karten mit Icon-Charakter:**

1. `icon_image` aktiv vorhanden → Bildicon rendern
2. sonst `icon` (Lucide) gesetzt → `resolveIcon(...)`
3. sonst Code-Fallback

**Wichtig — keine Doppelbedeutungen:**

- `icon` ist **immer** das Lucide-Textfeld. Niemals als Asset-Slot
  vergeben.
- `icon_image` ist **immer** ein Asset. Niemals als Textfeld vergeben.
- `image` bleibt das normale Großbild der Karte.
- `thumbnail` bleibt strikt dem Hub-/Filtergrid-Kontext vorbehalten
  (Renderer-Spec in `src/features/admin/lib/rendererSlotMap.ts`).

So bleibt es bei einem einzigen Karten-Typ (`card_v1`), und die
visuelle Variante entsteht ausschließlich über die im Slot gepflegten
Inhalte — nicht über neue Section-Typen.

## Medien-Workbench für Bildredaktion (Tranche 20, 2026-05-26)

Bildredakteure arbeiten ausschließlich über die Medien-Workbench
(`/admin` → Tab Medien, `AssetWorkbench.tsx`). Sie ist der einzige
Schreibweg für Bilder/Alt-Texte (intern über `rpc_admin_upsert_asset`,
`rpc_admin_update_asset_alt`, `rpc_admin_delete_asset`) und für Lucide-
Icons (über `rpc_admin_update_section_field`).

**Standardansicht** zeigt nur **sichtbare aktuelle Medienplätze**:
veröffentlichte Seite mit aktiver Section, Slot vom Renderer gelesen.
Legacy/Inaktiv ist per Toggle einblendbar.

**Slotarten** werden je Zeile als Badge sichtbar:

- **Bild** — `cms_assets.field_key='image'` (oder Varianten wie
  `hero_image`, `og_image`).
- **Thumbnail** — `cms_assets.field_key='thumbnail'`, nur im Hub-/
  Filter-Grid-Kontext.
- **TCS-Bildicon** — `cms_assets.field_key='icon_image'`.
- **Lucide-Icon (Textfeld)** — `cms_section_fields.field_key='icon'`,
  kein Asset, keine Viewports, kein Alt-Text.

**Kombinierbare Filter:** Seite (Titel · key · Route), Slotart,
Section-Typ, field_key, Slotstatus (mit/ohne Bild, Legacy/Inaktiv mit
Detailfiltern), Viewport vorhanden, Viewport fehlt (Desktop / Tablet /
Mobile / Tablet+Mobile / nur Desktop), Alt-Text (DE / EN / DE oder EN
fehlt), Dubletten, Volltextsuche.

Jede Zeile zeigt zusätzlich den **redaktionellen Kartentyp**
(Bildkarte / Thumbnail-Karte / Iconkarte / Textkarte / Wechselteaser /
Hero / Kartencontainer / Kennzahlen / CTA / Kontaktblock), abgeleitet
aus den vorhandenen Slots.

Statusbadges folgen dem einheitlichen Schema **„Legacy / …"**
(`Legacy / inaktiv (Section|Page)`, `Legacy / Quelle fehlt (Section|Page)`,
`Legacy / Renderer ignoriert (Feldname|Parent-Slot)`).

„In Vorschau" ist deaktiviert mit Grund-Tooltip, wenn keine Route
existiert, die Page archiviert/inaktiv/fehlt, die Section inaktiv/fehlt
oder der Renderer den Slot nicht liest.

## Admin-Hygiene (Tranche 21, 2026-05-27)

Aktive Assets auf inaktiven oder fehlenden Strukturen werden per
Hygiene-Migration als Legacy behandelt (`is_active=false`). Storage-
Dateien bleiben erhalten. Reaktivierung ist jederzeit über
`rpc_admin_upsert_asset` bzw. das Admin-UI möglich.

Audit: `node scripts/cms/admin-hygiene-audit.mjs` (Klassen H0–H6).


## Bildicon-Slot pro Iconkarte (Tranche 24, 2026-05-27)

Jede Iconkarte (`card_v1`) unter einem Kartencontainer (`cards_v1`) hat
neben dem Lucide-`icon`-Feld auch einen optionalen Asset-Slot
`icon_image` (TCS-Bildicon), DE+EN.

- Whitelist-Eintrag: `cms_admin_editable_fields.field_key = 'icon_image'`.
- Pflege: über Admin/Bilder als Asset-Upload, oder per Prompt mit
  `rpc_admin_upsert_asset`.
- Renderer-Priorität (verbindlich, `CardsSectionV1`/`FeatureGridV1`):
  `image` → `icon_image` → `icon` (Lucide) → kein Icon.
- Tranche 24 hat 227 Iconkarten unter Kartencontainern den
  `icon_image`-Slot eingerichtet (DE+EN). Bestehende Lucide-Icons
  bleiben unangetastet und greifen, solange kein Bildicon hochgeladen
  ist.
- Iconkarten in `content_v1`-Containern oder Legacy-`items.*.icon`-Listen
  sind **nicht** in Scope dieser Slotvorbereitung — sie laufen über
  eigene Strukturentscheidungen (siehe `docs/current-status.md`,
  Klassen I4/I6).

---

## Hotfix 27b-1 (2026-05-27) — Iconkarten Anwendungen-Anforderungen

- Lucide-Icon → DB-Feld `icon` (Lucide-Name, z. B. `fence`, `accessibility`). DOM-Marker `data-cms-field="icon"`.
- TCS-Bildicon → Asset-Slot `icon_image` (PNG/SVG). DOM-Marker `data-cms-field="icon_image"`. Hat Priorität vor `icon`.
- Anwendungen-Anforderungen sind echte `card_v1`-Kindsections unter Parent `anforderungen` (jetzt Typ `cards_v1`). Pflege im Admin pro Karte über Felder `title`, `description`, `icon` + Asset `icon_image`.
- Medienbereich und Live-Vorschau benutzen denselben Marker: Vorschau-Klick auf eine Karte trifft genau den `<span>`, der das tatsächlich gerenderte Icon trägt.
- Legacy `<key>.label/.text/.icon` im content_v1-Sammelblock bleibt nur Fallback und wird nicht mehr empfohlen.
