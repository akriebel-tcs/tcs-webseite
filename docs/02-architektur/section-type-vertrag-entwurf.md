# Section-Type-Vertrag — Entwurf (read-only, noch kein Code)

Status: **Entwurf / Architektur-Dokument**, Stand 2026-05-28
Autor: Lovable (Etappe `cms-light-section-type-vertrag-entwurf-1`)
Folgeetappe (empfohlen): TS-Modul `src/features/cms/contract/sectionTypes.ts`

> Dieses Dokument legt die **eine Wahrheit** je `section_type` fest. Es ist
> noch keine Code-Änderung. Es soll in einer späteren Etappe als
> maschinenlesbarer Vertrag in TS umgesetzt werden und dann Admin-UI,
> Renderer, Whitelist und Audits gemeinsam steuern.
>
> Bei Widersprüchen zwischen diesem Entwurf und der DB gilt: zuerst
> Vertrag fixieren, dann gezielte Migration. **Niemals Inhalte
> stillschweigend löschen.**

Quellen, die diesem Entwurf zugrunde liegen:

- Renderer-Registrierung: `src/features/cms/components/CmsBodyRenderer.tsx`
  (`RENDERERS`, `SKIP_TYPES`, `normalizeType`)
- Section-Renderer: `src/features/cms/components/sections/*.tsx`
- Admin-Slot-Karte: `src/features/admin/lib/rendererSlotMap.ts`
- Editorial-Heuristik: `src/features/admin/lib/editorialSectionKind.ts`
- Admin-UI: `src/features/admin/components/PageEditor.tsx`,
  `BildkartenCardWorkspace.tsx`, `cardFieldGroups.ts`
- Spezialrenderer: `src/features/gebaeudekommunikation/pages/TuersprechanlagenPage.tsx`,
  `src/features/cms/components/CmsProductSolutionShell.tsx`,
  `src/features/anwendungen/pages/ReferenzprojektDetailPage.tsx`,
  `src/features/personas/wohnungswirtschaft/components/WoWiDetailSections.tsx`
- Doku: `docs/02-architektur/section-typen-katalog.md`,
  `docs/01-strategie/asset-strategie.md`,
  `docs/03-redaktion/bildkarten-blueprint-audit.md`,
  `docs/03-redaktion/bildkarten-scroller-zielbild.md`,
  `docs/03-redaktion/bildkarten-scroller-copy-audit.md`

Hinweis zu „B-…"-Bezeichnern: Die im Admin sichtbaren Block-Nummern
(`B-026`, `B-2195`, `B-2059` …) sind UI-Labels, **nicht** der
`cms_sections.section_key`. Beispiel: B-2195 ≙ `card_ktu_enamen_kopie`
(Kind von `aussenstationen`, Page `gebaeudekommunikation.tuersprechanlagen`).

---

## 0. Vertragsschema (Vorlage je section_type)

Jeder Section-Type folgt **immer** diesem Schema:

```
1. Basisdaten
   - section_type, Admin-Name, Renderer-Komponente, Status
2. Struktur
   - Top-Level erlaubt, erlaubte Parents, erlaubte Kinder
3. Textfelder
   - field_key, Label, Pflicht, Locale, public, Admin-editierbar, technisch, Aliase
4. Asset-Slots
   - field_key, Slot-Art, Viewports, public, Admin-editierbar, Fallback
5. Copy/Paste/Delete
6. Admin-Erwartung (welche Gruppen, welche Felder sichtbar trotz fehlender DB-Zeile)
7. Renderer-Erwartung (was wird wirklich gelesen, Doku-Differenzen)
```

Statusbedeutung:

- **Generisch** — wird von `CmsBodyRenderer.RENDERERS` für *alle* Seiten gerendert.
- **Spezial** — wird zusätzlich/anstelle dessen von einer Page-spezifischen
  Komponente gerendert (z. B. `TuersprechanlagenPage`).
- **Legacy** — Typ existiert noch in der DB, hat aber keinen aktuellen
  Renderer (z. B. `series_override_v1`).
- **Container** — rendert selbst keine Inhalte ohne Kinder.

---

## 1. `hero_v1`

| Feld | Wert |
|---|---|
| Admin-Name | „Hero" |
| Renderer | `CmsPageLayout` / Page-Hero (nicht im `CmsBodyRenderer`, in `SKIP_TYPES`) |
| Status | Spezial (Page-Hero) |
| Top-Level | ja (genau einer pro Seite) |
| Erlaubte Parents | — |
| Erlaubte Kinder | keine |

**Textfelder** (Locale: DE/EN, public: ja):

| field_key | Pflicht | Admin sollte zeigen | Hinweis |
|---|---|---|---|
| `eyebrow` / `label` | optional | ja | je nach Seite ein Alias |
| `headline` / `title` | empfohlen | ja | je nach Seite ein Alias |
| `subline` / `intro` | optional | ja | |
| `cta_label` | optional | ja | |
| `cta_href` | optional | ja | |

**Asset-Slots**: `image` (required), Viewports: desktop/tablet/mobile,
Fallback: leer (kein Hero-Bild).

**Copy/Paste/Delete**: nicht kopierbar als Block. Löschung blockiert,
solange Page existiert (Page braucht genau einen Hero).

**Renderer-Erwartung**: Im `CmsBodyRenderer` **übersprungen**
(`SKIP_TYPES.has("hero_v1")`). Wird über `useCmsI18n` + `cms.asset("hero","image")`
in der jeweiligen Page-Komponente konsumiert.

**Doku-Konflikt**: `rendererSlotMap.ts` listet `image` als required —
korrekt, aber Admin liest nicht aus diesem Vertrag, sondern aus
vorhandenen Asset-Zeilen.

---

## 2. `content_v1`

| Feld | Wert |
|---|---|
| Admin-Name | „Textblock" |
| Renderer | `ContentSectionV1.tsx` |
| Status | Generisch |
| Top-Level | ja |
| Erlaubte Parents | — |
| Erlaubte Kinder | keine |

**Textfelder** (DE/EN, public ja, Admin ja):

| field_key | Pflicht | Aliase |
|---|---|---|
| `label` | optional | — |
| `title` | empfohlen | — |
| `text` | empfohlen | (war früher `body`, `intro`) |

**Asset-Slots**: keine.
**Copy/Paste/Delete**: vollständig kopierbar; löschbar ohne Risiko (keine Kinder).
**Admin-Erwartung**: Gruppen „Kopf" (label/title), „Inhalt" (text).
Felder müssen sichtbar sein, auch wenn keine DB-Zeile existiert.
**Renderer-Erwartung**: liest exakt `label`, `title`, `text`. Keine i18n-Fallbacks im generischen Pfad.

**Konflikt**: `normalizeType` aliasiert `content`, `intro`,
`content_block_v1`, `content_blocks_intro_v1` → `content_v1`. Vertrag
soll diese Alt-Typen als „eingestellt" markieren und Migrationspfad
festhalten.

---

## 3. `cards_v1`  *(Bildkarten-Container — zentraler Pilot P055)*

| Feld | Wert |
|---|---|
| Admin-Name | „Kartencontainer (Bildkarten)" |
| Renderer | `CardsSectionV1.tsx` |
| Status | Generisch (Container) |
| Top-Level | ja |
| Erlaubte Parents | — |
| Erlaubte Kinder | **nur** `card_v1` |
| Darf Kinder haben | ja, ≥ 1 |

**Textfelder am Container** (DE/EN, public ja):

| field_key | Pflicht | Public gerendert | Admin sollte zeigen |
|---|---|---|---|
| `label` (Eyebrow) | optional | ja | **ja, immer** |
| `title` | empfohlen | ja | **ja, immer** |
| `intro` (Teaser) | optional | ja | **ja, immer** |

**Asset-Slots am Container**: **keine** (Container liest selbst keine Bilder; Bilder leben auf `card_v1`-Kindern).

**Copy/Paste/Delete**:

- kopierbar: ja (mit Kindern empfohlen)
- darf Top-Level: ja
- Löschung mit Kindern: **nur nach Bestätigung**, dann rekursiv
- Waisen-Risiko: ja, wenn Kinder ohne Container kopiert/eingefügt werden

**Admin-Erwartung**:

- Gruppe „Kopf" mit `label`, `title`, `intro` muss **immer** sichtbar
  sein, auch wenn keine `cms_section_fields`-Zeile existiert. Heute ist
  das **nicht** so (Class-A-Hygieneproblem) — siehe Befund P055 unten.
- Gruppe „Kinder" zeigt die `card_v1`-Liste mit Drag-Sort.

**Renderer-Erwartung** (aus `CardsSectionV1.tsx`):

- gelesen: `label`, `title`, `intro` am Container; auf Kindern alles aus `card_v1`.
- nicht gelesen: weitere Container-Felder. Falls die DB welche enthält,
  sind sie „sichtbar tot" und gehören in den Vertrag entweder
  aufgenommen oder bereinigt.

---

## 4. `product_scroller_v1`  *(horizontaler Bildkarten-Scroller — Pilot Türsprechanlagen)*

| Feld | Wert |
|---|---|
| Admin-Name | „Produkt-Scroller (Bildkarten)" |
| Renderer | `ProductScrollerV1.tsx` **+** Spezial `TuersprechanlagenPage > ProduktScroller` |
| Status | Generisch + Spezial |
| Top-Level | ja |
| Erlaubte Kinder | **nur** `card_v1` |

**Textfelder am Container** (DE/EN, public ja):

| field_key | Pflicht | Admin sollte zeigen |
|---|---|---|
| `label` | optional | ja |
| `title` | empfohlen | ja |
| `intro` | optional | ja |

> Achtung: Der **Spezialrenderer** auf `TuersprechanlagenPage` benutzt
> für `aussenstationen` / `innenstationen` **i18n-Strings**
> (`tuersprechanlagen.aussenstationen.label/title/description`) statt
> `label`/`title`/`intro` aus der DB-Section. Hier entsteht die typische
> Doppelwahrheit: Admin pflegt am Container, sichtbar bleibt aber der
> i18n-Text.

**Asset-Slots am Container**: keine. Bilder leben auf den `card_v1`-Kindern
(`image`). Legacy-Alt-Slot `parent.image_<key>` wird vom
Spezialrenderer noch als Fallback gelesen — soll im Zielmodell
auslaufen.

**Copy/Paste/Delete**: wie `cards_v1`.

**Renderer-Erwartung — Generisch vs. Spezial (Türsprechanlagen)**:

| Aspekt | `ProductScrollerV1` (generisch) | `TuersprechanlagenPage > ProduktScroller` (Spezial) |
|---|---|---|
| Container-Kopf | `label`, `title`, `intro` aus DB | **i18n** (`tuersprechanlagen.*.label/title/description`) |
| Karten-Titel | `card.title` | `card.headline` (Alias) mit i18n-Fallback |
| Karten-Eyebrow | `card.subtitle` | `card.eyebrow` + `eyebrow_enabled` |
| Karten-Beschreibung | `card.description` | `card.beschreibung` (Alias) |
| Karten-Bild | `card.image` | `card.image` + Toggle `image_enabled` + Legacy `parent.image_<key>` |
| Features | unsichtbar | `features.0..4` + `features_N_enabled` |
| Links | unsichtbar | `link_1..3_label/href/kind` + `link_N_enabled` |
| Icon | unsichtbar | `card.icon` + `icon_enabled` |

→ Klarer Vertragsbedarf: Spezialfelder **ehrlich** in den Vertrag
aufnehmen (Variante „Scroller-Bildkarte Pilot"), damit Admin sie
zeigen darf, oder generischer Renderer zieht sie nach. Bis dahin gilt
die heutige Realität: B-026/B-027-Karten haben Felder, die der
generische Renderer **nicht** liest.

---

## 5. `card_v1`  *(Karte — Kind eines Containers)*

| Feld | Wert |
|---|---|
| Admin-Name | „Karte" (Variante: Bild-/Thumbnail-/Icon-/Textkarte, siehe `editorialSectionKind.ts`) |
| Renderer | über Eltern (`CardsSectionV1`, `ProductScrollerV1`, Spezial-Renderer) |
| Status | Generisch + Spezial |
| Top-Level | **nein** (nur als Kind erlaubt) |
| Erlaubte Parents | `cards_v1`, `product_scroller_v1`, `card_grid_v1`, `catalog_filter_grid_v1`, Spezial-Container |
| Erlaubte Kinder | keine |

**Zielmodell-Textfelder** (DE/EN, public ja, Admin ja):

| field_key | Pflicht | Hinweis |
|---|---|---|
| `subtitle` | optional | Zielname für „Eyebrow" — Alias: `eyebrow` |
| `title` | empfohlen | Alias: `headline` |
| `description` | optional | Alias: `beschreibung` |
| `icon` | optional | Lucide-Iconname |
| `cta_label` | optional | für CardsSection-Fall |
| `cta_href` | optional | für CardsSection-Fall |
| `href` | optional | Karten-Sprung (Hub) |
| `features.0` … `features.n` | optional | Bullet-Liste |
| `link_1_label`/`link_1_href`/`link_1_kind` … `link_3_*` | optional | Zielmodell für Mehrfach-Links |

**Reale Alt-/Pilot-Felder** (heute vorhanden, später vereinheitlichen):

| field_key | Quelle | Vorschlag |
|---|---|---|
| `eyebrow` | Pilot B-026/B-027 | Alias auf `subtitle` |
| `headline` | Pilot B-026/B-027 | Alias auf `title` |
| `beschreibung` | Pilot B-026/B-027 | Alias auf `description` |
| `eyebrow_enabled` | Pilot | technisches Toggle (0/1), DE-only |
| `image_enabled` | Pilot | technisches Toggle (0/1), DE-only |
| `icon_enabled` | Pilot | technisches Toggle (0/1), DE-only |
| `features_N_enabled` | Pilot | technisches Toggle pro Feature |
| `link_N_enabled` | Pilot | technisches Toggle pro Link |

> **Vertragsregel**: `*_enabled`-Felder sind **technisch**, immer Locale
> DE, nie public-sichtbar als Text. Admin zeigt sie als Schalter, nicht
> als Texteingabe.

**Asset-Slots** (alle optional, Viewports desktop/tablet/mobile, Fallback: leer):

| field_key | Slot-Art | public | Admin |
|---|---|---|---|
| `image` | image (Hauptbild) | ja | ja |
| `thumbnail` | thumbnail (Hub/Filter-Grid) | ja | ja |
| `icon_image` | icon_image (TCS-Bildicon) | ja | ja |

Priorität im Renderer: `image` → `icon_image` → `icon` (Lucide).

**Copy/Paste/Delete**:

- kopierbar: ja
- kopierbar mit Kindern: n/a (keine Kinder)
- Top-Level einfügen: **nein** — muss in einen Container.
- Löschung: ohne Bestätigung okay (keine Waisen).
- Waisen-Risiko: ja, wenn beim Kopieren der Parent nicht mitgesetzt
  wird → heute beobachtet (Class-A in der Hygieneliste).

**Admin-Erwartung**:

- Pflichtgruppen je nach Variante (aus `editorialSectionKind`):
  - **Bildkarte**: Kopf (subtitle/title) · Medien (image, image_enabled) · Inhalt (description) · Features · Links · Technik (Toggles)
  - **Thumbnail-Karte**: Kopf · Medien (thumbnail) · Inhalt · href
  - **Iconkarte (Bildicon)**: Kopf · Icon (icon_image) · Inhalt
  - **Iconkarte (Lucide)**: Kopf · Icon (icon, icon_enabled) · Inhalt
  - **Textkarte**: Kopf · Inhalt
- Felder müssen sichtbar sein, auch wenn keine DB-Zeile existiert,
  sobald der Vertrag sie für die Variante vorsieht.

**Renderer-Erwartung**:

- Generisch (`CardsSectionV1`, `ProductScrollerV1`): liest
  `subtitle`/`title`/`description`/`image`/`icon_image`/`icon`/
  `features.N`/`cta_label`/`cta_href`.
- Spezial (`TuersprechanlagenPage`): liest **zusätzlich**
  `eyebrow`/`headline`/`beschreibung`/`*_enabled`/`features.N`/
  `link_N_*`.
- **Konflikt**: Aliase `eyebrow`/`headline`/`beschreibung` werden von
  der generischen Variante **nicht** gelesen. Vertrag muss entscheiden:
  Aliase im generischen Renderer auflösen, oder per Migration auf
  `subtitle`/`title`/`description` vereinheitlichen.

---

## 6. `feature_grid_v1`  *(Iconkarten-Grid)*

| Feld | Wert |
|---|---|
| Renderer | `FeatureGridV1.tsx` |
| Status | Generisch |
| Top-Level | ja |
| Erlaubte Kinder | `card_v1` (als „Iconkarte") |

**Container-Felder**: `label`, `title`, `intro` (alle optional, DE/EN, public ja).
**Karten-Felder (Kind)**: `title`, `description`, `icon` (Lucide), `icon_image` (Asset).
**Asset-Slots Container**: keine.
**Asset-Slots Kind**: `icon_image` (optional).

**Wichtige Vertragsregel**: `feature_grid_v1` ist **kein** Bildkarten-Container.
Kinder sind Iconkarten — der Renderer ignoriert `image` und `thumbnail` an den Kindern bewusst.
Admin darf hier `image` **nicht** anbieten (sonst „editierbar, aber nicht sichtbar").

**Copy/Paste/Delete**: wie `cards_v1`.

---

## 7. `teaser_2col_v1`  *(Wechselteaser — eigenständig!)*

| Feld | Wert |
|---|---|
| Renderer | `Teaser2ColV1.tsx` |
| Status | Generisch |
| Top-Level | ja |
| Erlaubte Kinder | keine |

**Textfelder** (DE/EN, public ja):

| field_key | Pflicht |
|---|---|
| `label` | optional |
| `title` | empfohlen |
| `text` | empfohlen |
| `cta_label` | optional |
| `cta_link` | optional |
| `background_variant` | technisch (Layout) |
| `image_position` | technisch (Layout, links/rechts) |

> **Vertragswarnung**: `cta_link` ist **nicht** `cta_href`. Beide Felder
> dürfen **nicht** in einer einzigen Admin-Maske vermischt werden, sonst
> entsteht eine stille Inkonsistenz mit `card_v1`/`cta_v1`.

**Asset-Slots**: `image` (required), Viewports desktop/tablet/mobile.
**Copy/Paste/Delete**: vollständig kopierbar, ohne Kinderrisiko.
**Admin-Erwartung**: Kopf · Inhalt · Medien · Link · Technik (Layoutfelder).

---

## 8. `faq_v1`

| Feld | Wert |
|---|---|
| Renderer | `FaqV1.tsx` |
| Status | Generisch |
| Top-Level | ja |
| Erlaubte Kinder | keine (Items leben als Felder, nicht als Kindsection) |

**Container-Textfelder** (DE/EN, public ja):

| field_key | Pflicht | Aliase |
|---|---|---|
| `eyebrow` | optional | `label` |
| `headline` | empfohlen | `title` |
| `intro` | optional | — |

**Item-Felder** (DE/EN, public ja):

- `items.<slug>.frage` / `items.<slug>.question` / `items.<n>.q`
- `items.<slug>.antwort` / `items.<slug>.answer` / `items.<n>.a`

Reihenfolge: alphabetisch nach Slug.

**Asset-Slots**: keine.
**Copy/Paste/Delete**: kopierbar, löschbar.
**Konflikt**: Renderer akzeptiert **drei** Item-Schemata. Vertrag legt
`items.<slug>.frage|antwort` als Zielmodell fest, andere als Aliase.

---

## 9. `cta_v1`

Renderer `CtaV1.tsx`. Felder: `title`, `text`, `cta_label`, `cta_href`.
Asset-Slot `image` optional (Hintergrundbild). Top-Level, keine Kinder.
Vollständig kopierbar. Admin-Erwartung: Kopf · Inhalt · Link · Medien.

---

## 10. `rich_v1`

Renderer `RichV1.tsx`. Felder: `title`, `body` (HTML/Markdown).
Asset-Slots: keine. Top-Level, keine Kinder. Kopierbar.

---

## 11. `tabs_v1`

Renderer `TabsV1.tsx`. Container-Felder: `label`, `title`, `intro`,
`tablist_label`. Kinder: beliebiger Typ pro Tab (`tab_label` am Kind).
Asset-Slots am Container: keine.
**Vertragsbedarf**: erlaubte Kindtypen müssen begrenzt werden, sonst
werden Tabs unsichtbar (Class-A).

---

## 12. `stats_v1` + `stat_v1`

`stats_v1` Container (`title`, `intro`), Kinder vom Typ `stat_v1`
(`value`, `label`, `description`). Keine Assets.

---

## 13. `contact_block_v1`

Renderer `ContactBlockV1.tsx`. Felder: `title`, `text`, `email`,
`phone`, `cta_label`, `cta_href`. Keine Assets. Top-Level, keine Kinder.

---

## 14. `download_list_v1`

Container mit `title`, `intro`. Kinder `card_v1` mit `title`,
`description`, `file_label`, `cta_href`. Keine Bild-Assets erwartet
(`rendererSlotMap` listet keine).

---

## 15. `card_grid_v1` / `catalog_filter_grid_v1`

Hub-Container. Kein eigener Top-Level-Renderer im `CmsBodyRenderer`
(über Hub-/Listing-Pages konsumiert). Kinder `card_v1`, die
**`thumbnail`** statt `image` lesen. Vertrag muss Admin zwingen, dort
`thumbnail` und nicht `image` anzubieten.

---

## 16. `series_override_v1` / `series_override_container_v1`

Status **Legacy/Fallback**. Kein Renderer in `RENDERERS`. Im Vertrag
als „eingestellt, nur für Produktkatalog-Overrides" markieren, Admin
zeigt sie als read-only.

---

## Befund P055 / B-2059 bis B-2063 (Anwendungen)

- Eltern-Block: `cards_v1` (Container). Kinder: `card_v1` (B-2060…B-2063).
- Sichtbarer Header über den Karten kommt **heute aus i18n bzw.
  Page-Komponente**, nicht aus DB-Feldern `label`/`title`/`intro` des
  Containers. Ergebnis: Admin zeigt am Container „keine Felder", obwohl
  die Public-Seite sichtbar einen Header rendert (klassische Class-J
  Doppelwahrheit „sichtbar, aber am falschen CMS-Owner").
- Vertragsentscheidung: `label`, `title`, `intro` gehören **auf den
  Container** (B-2059). Folgeschritte:
  1. Vertragsmodul markiert diese Felder als „immer im Admin sichtbar".
  2. Migration legt leere `cms_section_fields`-Zeilen + Whitelist an
     (nicht in dieser Etappe).
  3. Renderer in `CardsSectionV1` liest sie bereits — gut.
  4. Eventuelle i18n-Fallbacks werden danach inaktiv.
- Damit verschwindet die Doppelwahrheit: **DB ist Quelle**, Renderer +
  Admin sehen identische Felder.

## Befund Türsprechanlagen / B-026 / B-027 (`aussenstationen` / `innenstationen`)

- Container-Typ ist `product_scroller_v1`, gerendert aber durch
  `TuersprechanlagenPage > ProduktScroller` (Spezial).
- Header (`label`/`title`/`description`) kommt aus **i18n**
  (`tuersprechanlagen.aussenstationen.*`), **nicht** aus DB-Feldern
  `label`/`title`/`intro` des Containers.
- Karten (`card_v1`, u. a. B-2195 = `card_ktu_enamen_kopie`) nutzen
  Pilot-Aliase: `eyebrow`, `headline`, `beschreibung`, plus
  `*_enabled`-Toggles und `features_N`/`link_N_*`.
- Der **generische** `ProductScrollerV1` würde diese Aliase nicht lesen
  → Vertrag muss entweder die Aliase generisch auflösen oder dauerhaft
  als „Spezial-Pilot" markieren.
- B-2195 (Hauptbild-Schalter) ist datenseitig korrekt
  (`image_enabled = 1`); jede Sicht­diskrepanz im Preview ist heute ein
  Reload-Problem, kein Vertragsproblem.

---

## Konfliktliste (Renderer vs. Doku vs. Admin)

| Konflikt | Wo | Vertragsentscheidung |
|---|---|---|
| Container-Header aus i18n statt DB | P055 `cards_v1`, Türsprechanlagen `product_scroller_v1` | DB ist Quelle; i18n-Fallback nur, wenn DB leer |
| Karten-Aliase `eyebrow/headline/beschreibung` | `card_v1` im Türsprechanlagen-Pilot | als Aliase im Vertrag dokumentieren, generisch auflösen |
| `*_enabled`-Toggles nicht im generischen Renderer | `card_v1` | Vertrag markiert sie als technisch, nur Spezialrenderer wertet sie aus |
| `feature_grid_v1`-Kinder dürfen kein `image` | `card_v1` unter `feature_grid_v1` | Vertrag verbietet `image`-Slot dort |
| `card_grid_v1`/`catalog_filter_grid_v1` lesen `thumbnail`, nicht `image` | Hub-Pages | Admin darf dort nur `thumbnail` anbieten |
| `cta_link` vs. `cta_href` | `teaser_2col_v1` vs. `cta_v1`/`card_v1` | Vertrag trennt strikt; Admin niemals beide im selben Feld |
| FAQ-Item-Schemata `frage|question|q` | `faq_v1` | Zielmodell `frage/antwort`, andere als Aliase |
| Alt-Typen `content`, `intro`, `content_block_v1`, `cta` | `normalizeType` | als „eingestellt → alias auf `content_v1`/`cta_v1`" festschreiben |
| Sections ohne Renderer | `series_override_v1` u. ä. | als Legacy markieren, Admin read-only |
| Sichtbar im Renderer, nicht im Admin | `cards_v1.label/title/intro` an P055 | Vertrag erzwingt Slot, Admin zeigt immer |

---

## Welche Felder gehören laut Vertrag in den Admin?

Pro Section-Type **immer sichtbar**, auch ohne DB-Zeile:

- `hero_v1`: alle Pflicht- und empfohlenen Felder + `image`
- `content_v1`: `label`, `title`, `text`
- `cards_v1`: `label`, `title`, `intro` (Container)
- `product_scroller_v1`: `label`, `title`, `intro` (Container)
- `card_v1`: variantenabhängig (siehe §5)
- `feature_grid_v1`: Container `label`/`title`/`intro`; Kinder Icon-Variante
- `teaser_2col_v1`: alle public-Felder + `image`
- `faq_v1`: Header (`eyebrow`/`headline`/`intro`) + Item-Editor
- `cta_v1`, `rich_v1`, `tabs_v1`, `stats_v1`/`stat_v1`,
  `contact_block_v1`, `download_list_v1`: jeweilige Pflichtfelder

**Read-only / technisch**: `*_enabled`-Toggles, `background_variant`,
`image_position`, `tablist_label`, Whitelist-Status-Spalten,
`series_override_*`.

---

## Empfohlene nächste Umsetzungsetappe

**Titel-Vorschlag:** `cms-light-section-type-vertrag-ts-modul-1`

Inhalt (read-only-Schritt + minimale Pilot-Anwendung):

1. TS-Modul `src/features/cms/contract/sectionTypes.ts` mit
   maschinenlesbarem Vertrag (genau dieses Dokument 1:1).
2. Unit-Tests: für jeden in `RENDERERS` registrierten Typ existiert ein
   Vertrag.
3. Audit-Skript `scripts/cms/contract-audit.mjs` (read-only) meldet:
   - Sections mit Typ ohne Vertrag
   - Vertrags-Felder ohne DB-Zeile
   - DB-Felder ohne Vertrag
   - Whitelist-Lücken
4. Pilot: P055 `cards_v1` (B-2059…B-2063) — nur Audit-Report, noch
   keine Migration. Migration folgt als eigene Etappe
   `cms-light-vertrag-pilot-p055-1`.

---

## Bestätigung

- keine Migration durchgeführt
- keine RPC angelegt/verändert
- keine Public-Renderer geändert
- keine Admin-Komponenten geändert
- keine Inhalte / i18n-Dateien geändert
- Produktdatenbank unverändert
- es wurde ausschließlich dieses neue Dokument erstellt:
  `docs/02-architektur/section-type-vertrag-entwurf.md`
