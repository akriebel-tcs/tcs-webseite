> **Historisch — ersetzt durch das Dachdokument** (`docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md`). Verschoben im Batch 27, 2026-06-05. Inhalt unverändert darunter erhalten.

# Bildkarten-Blueprint — Audit (Stand 2026-05-27)

> Lese-Audit zum lokalen Vorlagen-/Blueprint-Bereich im CMS-Light
> (`/admin → Vorlagen`). **Keine Codeänderungen**, keine Migration, keine
> RPC, kein Renderer-Eingriff. Quelle = aktueller Code-Stand auf `main`.

---

## 1 · Kurzfazit

- Es gibt heute genau **eine** Karten-Bauart in der DB: `card_v1`. Sie wird
  von **vier verschiedenen Containern** gerendert (`cards_v1`,
  `product_scroller_v1`, `feature_grid_v1`, `card_grid_v1` /
  `catalog_filter_grid_v1`). Jeder Container liest eine **andere
  Teilmenge** der gleichen Felder — daher wirken Karten optisch
  uneinheitlich, obwohl sie strukturell schon vereinheitlicht sind.
- Das Blueprint-Schema des Vorlagenbereichs deckt den **Kernfall „Bildkarte
  mit Eyebrow/Titel/Description"** korrekt ab, weicht aber in **zwei
  Punkten** von der Realität ab:
  1. Es gibt **drei** Bild-/Icon-Slots im echten Modell (`image`,
     `thumbnail`, `icon_image`) plus das Lucide-`icon`-Feld. Das Blueprint
     kennt heute nur `image` + `icon`.
  2. Der echte Renderer liest **genau ein CTA pro Karte** (`cta_label` +
     `cta_href`). Das Blueprint zeigt **bis zu drei Linkzeilen**.
- Die bestehende Link-Auflösung (`resolveCardLink`) klassifiziert bereits
  in **extern / interner Pfad-Treffer / interner Pfad ohne Treffer**. Eine
  **Kurz-ID-Auflösung gibt es noch nicht**.
- Empfehlung: Für das spätere Schema **flache Feldnamen**
  (`link_1_label`, `link_1_href`, `link_1_kind`, …) statt eines `links[]`-
  Arrays — das passt zur Realität von `cms_section_fields` (Key-Value pro
  Zeile) und bleibt im Admin und in Migrations idempotent.

---

## 2 · Kartenfamilien & Container

Container-Section-Type → Renderer → was gelesen wird. Alle Karten sind
intern derselbe `card_v1`, der Unterschied liegt im **Container** und in
den **tatsächlich konsumierten Feldern/Slots**.

| Familie / Section-Type | Renderer | Parent/Child | Eigene Container-Felder | Karten-Felder (gelesen) | Bild-/Icon-Verhalten | Linkverhalten | Abweichung zum Blueprint | Risiko bei Vereinheitlichung |
|---|---|---|---|---|---|---|---|---|
| `cards_v1` (+ `card_v1`) | `CardsSectionV1.tsx` | Parent + `card_v1`-Kinder | `label`, `title`, `intro` | `title`, `description`, `subtitle`, `cta_label`, `cta_href`, `image` (`+ alt`), `icon_image` (`+ alt`), `icon` (Lucide), `features.0..n` | Reihenfolge: `image` → sonst `icon_image` → sonst Lucide `icon` (genau **einer** sichtbar) | **1 CTA** (`cta_label` + `cta_href`) als Anker `→` | Blueprint zeigt Bild **und** Icon parallel, max. 3 Links. Realität: nur einer von beiden, nur 1 Link. `features[]` fehlt im Blueprint. | Mittel — neuer Renderer müsste Mehrfach-Slots zulassen, ohne bestehende Single-CTA-Pflege zu brechen. |
| `product_scroller_v1` (+ `card_v1`) | `ProductScrollerV1.tsx` | Parent + `card_v1`-Kinder | `label`, `title`, `intro` | `title`, `subtitle`, `description`, `image` (`+ alt`) | **Nur Bild**, kein Icon, kein Iconbild | **Kein** CTA-Render | Blueprint zeigt Icon/Links — werden hier ignoriert. | Niedrig — fehlende Felder werden heute schon ignoriert; spätere Erweiterung um Icon/CTA additiv möglich. |
| `feature_grid_v1` (+ `card_v1`) | `FeatureGridV1.tsx` | Parent + `card_v1`-Kinder | `label`, `title`, `intro` | `title`, `description`, `icon` (Lucide), `icon_image` (`+ alt`) | **Nur Icon**, kein Hauptbild | **Kein** CTA-Render | Blueprint kennt kein „nur Icon"-Layout. Eyebrow/Subtitle wird hier nicht gerendert. | Niedrig — Container ist semantisch klar. |
| `card_grid_v1` / `catalog_filter_grid_v1` (+ `card_v1`) | _kein eigener Renderer_ (Container ist im `RENDERER_SLOT_MAP` gelistet, aber nicht in `CmsBodyRenderer.RENDERERS`) | Parent + `card_v1`-Kinder, liest `thumbnail` | — | erwartet `thumbnail` statt `image` | **`thumbnail`** als Bildslot | unklar (kein Renderer aktiv) | Slot `thumbnail` fehlt im Blueprint komplett. | Niedrig — solange kein Renderer aktiv ist; falls reaktiviert, muss Blueprint `thumbnail` ergänzen. |
| `teaser_2col_v1` (Wechselteaser) | `Teaser2ColV1.tsx` | _keine Kinder_, eigenständig | `label`, `title`, `text`, `cta_label`, `cta_link`, `image_position`, `background_variant`, `image` | — (Felder direkt am Block, **nicht** in `card_v1`) | 1 Bild Pflicht, kein Icon | 1 CTA mit Feldname **`cta_link`** (nicht `cta_href`!) | Eigene Familie, keine Karte. Beachten: **`cta_link` ≠ `cta_href`** — bisheriger Inkonsistenzpunkt. | Hoch — Umbenennung würde alle bestehenden Pflegedaten brechen. Empfehlung: lassen wie es ist. |
| Persona-/Anwendungs-Karten | leben als ganz normale `card_v1` unter `cards_v1` | wie oben | wie oben | — | wie `cards_v1` | wie `cards_v1` | identisch zum Hauptfall | keine eigene Familie. |
| Hardcoded Karten außerhalb CMS | `CmsProductSolutionShell.tsx` (Z. 90–135) liest Kind-Sections direkt mit `cms.text(ck, "href", …)` und `cms.text(ck, "cta_href", …)` und `cms.text(ck, "icon", …)` | spezielle Shell für Produkt/Lösungsseiten | — | `title`, `description`, `href` **oder** `cta_href`, `icon`, `image`, `features.0..n` | wie `cards_v1` plus zusätzlich Feldname **`href`** (kurz) | 1 Link (`href` mit Fallback auf `cta_href`) | Drittes Linkfeld **`href`** kommt nur hier vor — wichtig für späteres Mapping. | Mittel — `href` darf in der Migration nicht vergessen werden. |

**Beobachtung:** In `editorialSectionKind.ts` werden Karten redaktionell
weiter klassifiziert (`bildkarte`, `thumbnail-karte`, `iconkarte-bildicon`,
`iconkarte-lucide`, `textkarte`). Diese Heuristik basiert auf den
vorhandenen Slots, nicht auf einem eigenen Section-Typ — das ist die
richtige Richtung und sollte beibehalten werden.

---

## 3 · Real verwendete Karten-Felder

| Feld | Quelle | Verwendet von | Anmerkung |
|---|---|---|---|
| `title` | `cms_section_fields` | alle Karten-Renderer | Pflicht-Anker |
| `description` | `cms_section_fields` | alle Karten-Renderer | Standard-Fließtext |
| `subtitle` | `cms_section_fields` | `cards_v1`, `product_scroller_v1` | „Eyebrow"-ähnlich, **eigenes Feld** |
| `label` | `cms_section_fields` | **Container** (`cards_v1`, `product_scroller_v1`, `feature_grid_v1`) — nicht pro Karte | im Admin als „Eyebrow" sichtbar |
| `eyebrow` | — | (kein Renderer liest dieses Feld) | wird in `fieldDisplay.ts` aber als Synonym für „Eyebrow" akzeptiert |
| `headline` | — | (kein Renderer liest dieses Feld pro Karte) | wird in `fieldDisplay.ts` als Synonym für „Titel" gelistet |
| `intro` | `cms_section_fields` | Container-Header | Fließtext unter dem Container-Titel |
| `text`, `lead`, `body`, `desc` | `cms_section_fields` | `teaser_2col_v1` (`text`) | restliche sind Aliase im Admin-Display, kein Renderer liest sie pro Karte |
| `features.0..n` | `cms_section_fields` | `CardsSectionV1`, `CmsProductSolutionShell` | numerischer Schlüssel, **dynamische Länge** |
| `image` (Asset) | `cms_assets.field_key="image"` | `cards_v1`, `product_scroller_v1`, `teaser_2col_v1`, `card_v1` | hat Viewports `desktop`/`tablet`/`mobile` (siehe Asset-Strategie) |
| `thumbnail` (Asset) | `cms_assets.field_key="thumbnail"` | `card_grid_v1` / `catalog_filter_grid_v1` (kein aktiver Renderer) | Hub-/Filter-Kontext |
| `icon_image` (Asset) | `cms_assets.field_key="icon_image"` | `cards_v1`, `feature_grid_v1` | TCS-Bildicon, **hat Vorrang vor Lucide** |
| `icon` (String) | `cms_section_fields` | `cards_v1`, `feature_grid_v1`, `CmsProductSolutionShell` | Lucide kebab-case (`shield-check`) |
| `cta_label` | `cms_section_fields` | `cards_v1` (pro Karte), `cta_v1`, `contact_block_v1` | nur **ein** CTA pro Karte heute |
| `cta_href` | `cms_section_fields` | `cards_v1` (pro Karte), `cta_v1`, `contact_block_v1`, `download_list_v1` (`cf(c, "cta_href")`), `CmsProductSolutionShell` (Fallback) | Standard-Linkziel |
| `cta_link` | `cms_section_fields` | **nur** `teaser_2col_v1` | **Inkonsistenter Name** zu `cta_href` — Wechselteaser-Eigenheit |
| `href` | `cms_section_fields` | `CmsProductSolutionShell` (Hauptfeld) + `cmsAdminCardLinks.ts` (Admin-Linkpille) | Kurzform, im Admin als „Linkfeld" einer Karte erkannt |
| `image_position`, `background_variant` | `cms_section_fields` | `teaser_2col_v1` | Layout-Flags |

**Heutige Link-Erkennung im Admin** (`cmsAdminCardLinks.ts`):
```ts
const LINK_FIELD_KEYS = ["href", "cta_link"] as const;
```
→ `cta_href` ist **nicht** in dieser Liste, weil die Pille im Admin-Baum
historisch für Karten (`href`) und Wechselteaser (`cta_link`) gebaut wurde.
Karten-CTAs (`cta_href`) werden im Baum aktuell **nicht** als Pille
visualisiert. Das ist eine separate Diskrepanz, kein Blueprint-Thema.

---

## 4 · Vergleich Blueprint ↔ Realität

| Blueprint-Feld (lokal im Vorlagenbereich) | Reales Pendant in DB/Renderer | Status |
|---|---|---|
| `image` | `cms_assets.field_key="image"` mit Viewports `desktop`/`tablet`/`mobile` | **Existiert**, Blueprint kennt aber keine Viewports |
| `showImage` (Schalter) | implizit: Wenn `image` leer → Bildbereich versteckt | **Nur lokal nötig**, real macht das der Renderer von selbst |
| `icon` (Lucide kebab-case) | `cms_section_fields.field_key="icon"` | **Existiert** |
| `showIcon` (Schalter) | implizit (leerer Wert + Slot-Priorität `image > icon_image > icon`) | **Nur lokal nötig** |
| `eyebrow` / `subtitle` | real: `subtitle` (Karte) bzw. `label` (Container). `eyebrow` existiert als Alias im Admin-Display, aber **kein Renderer liest** ihn. | **Halb-Treffer** — Begriff im Blueprint ok, im DB-Feldnamen müsste es `subtitle` bleiben, oder das Mapping muss explizit gepflegt werden |
| `showEyebrow` | implizit (leerer Wert) | **Nur lokal nötig** |
| `title` / `headline` | real: `title`. `headline` ist Alias im Admin-Display ohne Renderer-Wirkung | **Treffer**, `headline` als Alias entfernen oder dokumentieren |
| `description` | real: `description` | **Treffer** |
| `link_1_label` / `_href` / `_kind` / `_enabled` | real: `cta_label` + `cta_href` (1 Stück). Kein zweites/drittes Linkfeld in `card_v1`. | **Fehlt komplett** — neuer Datenpunkt, kein Renderer liest es heute |
| `link_2_*`, `link_3_*` | — | **Fehlt komplett** |
| `link_*_kind` (`extern` / `intern` / `shortid`) | real: keine Kind-Spalte. `resolveCardLink` leitet `kind` zur Laufzeit aus dem `href` ab. | **Bewusst neu** — siehe Empfehlung in §6 |
| `features[]` | real: `features.0..n` flach in `cms_section_fields` | **Fehlt im Blueprint** — sollte ergänzt werden, wenn der Blueprint die Wahrheit zeigen will |
| `thumbnail` | real: `cms_assets.field_key="thumbnail"` | **Fehlt im Blueprint** — heute irrelevant, da kein Renderer aktiv |

---

## 5 · Bewertung: `links[]` vs. flache Feldnamen

Empfehlung: **flache Felder** (`link_1_label`, `link_1_href`,
`link_1_kind`, `link_1_enabled`, `link_2_*`, `link_3_*`).

Begründung:

- `cms_section_fields` ist eine **Key-Value-Tabelle** mit
  `(page_key, section_key, field_key, locale, value)`. Sie hat heute
  bereits flache, nummerierte Schlüssel (`features.0`, `features.1`, …,
  `vorteile.<n>.title`, …). Ein echtes Array-Feld erfordert entweder
  JSON-Werte in `value` (bricht den Locale-/Diff-Workflow) oder eine
  parallele Tabelle (`cms_section_field_links`) mit eigener RPC-Familie
  — beides ist hoher Migrationsaufwand für drei Linkzeilen.
- Flache Schlüssel lassen sich **idempotent** migrieren (UPSERT pro Key)
  und lassen sich pro Locale übersetzen (`link_1_label.de`,
  `link_1_label.en` über das bestehende `locale`-Feld). Der CTA-Pfad
  (`cta_label` / `cta_href`) liefert die exakte Schablone.
- Die Admin-Whitelist (`cms_admin_editable_fields`) ist je Feld-Key
  steuerbar — eine Redakteurin kann z. B. `link_2_*` für eine Seite
  ausblenden, ohne dass Code geändert werden muss.
- `link_1_kind` wird **nicht** in der DB normalisiert — es bleibt ein
  Freitext-Feld (`extern` / `intern` / `shortid`) und wird zur
  Laufzeit/Anzeige interpretiert, parallel zur heutigen
  `resolveCardLink`-Logik.

**Migrationsweg im flachen Modell** (nicht jetzt umsetzen — nur als
Referenz):
```
cta_label  → link_1_label
cta_href   → link_1_href
                (link_1_kind wird neu, default leer → resolveCardLink leitet ab)
href       → link_1_href (Sonderfall CmsProductSolutionShell)
cta_link   → link_1_href (Sonderfall Teaser2ColV1, NICHT umbenennen ohne Renderer-Anpassung)
```

---

## 6 · Empfehlung Standard-Schema „Bildkarte" (`card_v1`, später)

Felder (flach, in `cms_section_fields`):

```
# Inhalt
subtitle           (Eyebrow/Kicker, optional; alter `eyebrow` als Synonym im Admin)
title              (Pflicht)
description        (optional)
features.0..n      (optional, dynamisch — bleibt wie heute)

# Icon (String, Lucide kebab-case)
icon               (optional)

# Links (max. 3)
link_1_label  link_1_href  link_1_kind   ( extern | intern | shortid )
link_2_label  link_2_href  link_2_kind
link_3_label  link_3_href  link_3_kind
```

Assets (in `cms_assets`):

```
image              (Hauptbild, Viewports desktop/tablet/mobile)
thumbnail          (kleines Vorschaubild, nur in Hub-/Filter-Kontext)
icon_image         (TCS-Bildicon, Vorrang vor Lucide-`icon`)
```

Sichtbarkeit folgt heute schon der Konvention „leeres Feld → Slot
versteckt". Es braucht **keine** `show*`-Schalter in der DB.

`cta_label` / `cta_href` bleiben als **Alias** während einer
Übergangsphase lesbar (Renderer liest beide, Admin pflegt nur noch
`link_1_*`). Erst nach Migration aller Daten kann `cta_*` entfernt
werden.

---

## 7 · Empfehlung Container-/Scroller-Modell

| Container | Wann verwenden | Verhalten |
|---|---|---|
| `cards_v1` | Klassisches Kartenraster, **bekannte/feste Anzahl** (1–9 Karten), kein horizontales Scrollen nötig | Responsive Spalten 1 → 2 → 3 (heute schon so) |
| `product_scroller_v1` | Karten mit potenziell **mehr Einträgen** (>4), Lese-Schwerpunkt liegt auf horizontalem Durchblättern | Horizontaler Scroller mit Snap; **Pfeile ab 5 Karten anzeigen** |
| `feature_grid_v1` | Reine Icon-Karten ohne Hauptbild | Bleibt eigenständig, weil die Optik bewusst icon-zentriert ist |
| `card_grid_v1` / `catalog_filter_grid_v1` | Hub-/Filter-Übersichten mit `thumbnail` | Erst aktivieren, wenn ein Renderer dafür gebraucht wird |

**Sollten `cards_v1` und `product_scroller_v1` zu einem Container
verschmelzen?** Eher **nein**: Beide haben heute eine klare Lese-Funktion
und Redakteurinnen wissen aus dem Section-Typ sofort, ob die Karten
scrollen oder im Raster stehen. Stattdessen:

- Beide Container teilen sich denselben `card_v1`-Kind-Typ (so wie heute).
- Beide bekommen optional dasselbe Set an Container-Feldern (`label`,
  `title`, `intro`).
- `product_scroller_v1` zeigt die Pfeil-Navigation **ab 5 Karten**, exakt
  wie der Blueprint vorschlägt — das ist eine **reine Renderer-Regel**,
  keine DB-Spalte.

---

## 8 · Aktuelle Link-Auflösung & spätere Ergänzungen

Heute (`src/features/admin/lib/resolveCardLink.ts`):

- `^https?://`, `mailto:`, `tel:` → `external`
- `^/…` → Lookup in `pagesByRoute`
  - Treffer → `internal-found` (mit `page_no`, Titel, Status)
  - kein Treffer → `internal-missing`
- alles andere (`#anker`, freie Texte) → fällt in `external` ohne Sprung

**Was fehlt für saubere Trennung extern / intern / Kurz-ID:**

1. Ein explizites `link_*_kind`-Feld (siehe §6), damit Redaktion bewusst
   entscheidet, **nicht** der Pattern-Match.
2. Eine **Auflösung von Kurz-IDs** (`P-203`, `B-538`) gegen eine
   zukünftige `cms_short_id`-Tabelle bzw. gegen `cms_pages.page_no` /
   eine Block-ID-Spalte. Heute existiert nichts davon — Kurz-IDs sind im
   Blueprint bewusst nur ein **Konzeptfeld ohne Auflösung**.
3. Erweiterung von `LINK_FIELD_KEYS` in `cmsAdminCardLinks.ts` um
   `cta_href` und später `link_1_href` / `link_2_href` / `link_3_href`,
   damit der Admin-Baum die Linkpillen für **alle** Karten-CTAs zeigt
   (heute nur für `href` und `cta_link`).

---

## 9 · Folge-Etappen (Vorschlag, je ein eigener Prompt)

1. **Etappe 1 — Schema festlegen (Doku-only).**
   Diesen Audit hier als Beschluss eintragen, `subtitle`/`title` als
   kanonische Karten-Felder bestätigen, `link_1..3_*` + `link_*_kind`
   als Zielmodell festschreiben, `cta_label/cta_href` als
   Übergangs-Alias dokumentieren. Keine Codeänderung.

2. **Etappe 2 — Admin-Arbeitsbereich erweitern (lokal + DB-lesend).**
   Vorlagenbereich um Hinweise auf reale Slots (`thumbnail`,
   `features[]`, Asset-Viewports) ergänzen. Im echten PageEditor neue
   Karten-Felder `link_1_label/href/kind` als **lesbare Schatten**
   einblenden (noch nicht pflegbar), parallel zur bestehenden
   `cta_*`-Pflege.

3. **Etappe 3 — Public Renderer additiv erweitern.**
   `CardsSectionV1` so erweitern, dass er nach `cta_*` zusätzlich
   `link_1_*..link_3_*` rendert, wenn vorhanden — ohne `cta_*` zu
   entfernen. Pfeile in `ProductScrollerV1` ab 5 Karten ergänzen.
   Kein Datenmodell-Eingriff.

4. **Etappe 4 — Pilot-Migration.**
   Eine einzelne Seite mit `cards_v1` (z. B. eine Anwendungs-Seite)
   bekommt `link_1_*`-Felder per RPC-Pflege gefüllt. Alte `cta_*`-Werte
   bleiben parallel stehen. Sichtprüfung: Renderer zeigt
   identisches/verbessertes Ergebnis.

5. **Etappe 5 — Vereinheitlichung & Bereinigung.**
   Rest der Seiten nachziehen, `cmsAdminCardLinks.ts` um die neuen
   Linkfelder erweitern, `editorialSectionKind`-Heuristik um
   „Mehrfach-Link-Karte" ergänzen. Erst danach `cta_*` deprecated
   markieren (noch nicht löschen).

---

## 10 · Bestätigungen

- **Keine** Migration, **keine** RPC-Änderung, **keine** Supabase-
  Schreib-/Leselogik im Code geändert.
- **Keine** Änderung an `CmsBodyRenderer`, `CardsSectionV1`,
  `ProductScrollerV1`, `FeatureGridV1`, `Teaser2ColV1`,
  `CmsProductSolutionShell` oder anderen Public-Renderern.
- **Keine** neue Route, keine Produktdatenbank berührt.
- Vorlagenbereich (`CardBlueprintWorkshop.tsx`) ist **unverändert**.
  Beim Audit ist **kein** lokaler Beschriftungsfehler aufgefallen, der
  vor dem nächsten Prompt korrigiert werden müsste — die im Vorlagen-
  Bereich verwendeten Begriffe (`Eyebrow / Subtitle`, `Titel / Headline`,
  `Link-Art: Extern / Intern / Kurz-ID`) sind redaktionell tragfähig.
