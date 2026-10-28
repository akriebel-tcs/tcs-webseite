# Batch 36 — P-059 / P-060 Standardisierung auf CMS-Light-Bausteine

Datum: 2026-06-05
Bereich: TCS in Bauten / Anwendungen
Modus: **Umsetzung** — Standard-Sections angelegt, Renderer umgestellt,
Altcontainer deaktiviert (Backup, nicht gelöscht).

## 0. Kurzfazit

- **P-059 `anwendungen.gesundheitseinrichtungen` → ✅ DB-first über
  Standardbausteine.** Themenkarten Pflege / Klinik rendern aus
  `cards_standard` (cards_v1) + `card_pflege` / `card_klinik` (card_v1).
- **P-060 `anwendungen.oeffentliche-hand` → ✅ DB-first über
  Standardbausteine.** Themenkarten Behörden / Feuerwehr / Schwimmbad
  rendern aus `cards_standard` (cards_v1) + drei `card_v1`-Kindern.
- **Doppelrender:** keiner. Alte `section`- und `cards`-Sections
  (content_v1) sind `is_active=false` → RLS filtert sie heraus, Renderer
  iteriert nur noch über `cards_standard`.
- **Admin:** alle 38 card_v1-Standardfelder pro Karte (× 2 Locales) +
  Container-Felder (label / title / intro) in
  `cms_admin_editable_fields` whitelisted und im Admin bearbeitbar.
- **Wahrheits-Check:** grün (`✅ Wahrheits-Check CI OK`).
- **Navigation:** unverändert. Routenziele der Karten
  (`/anwendungen/pflege`, `…/klinik`, `…/behoerde`, `…/feuerwehr`,
  `…/schwimmbad`) sind 1:1 aus dem alten Code übernommen.

---

## 1. Was war vorher Sonderlogik?

Beide Pages lasen Karten-Inhalte über `useCmsI18n` + `useCmsText` aus
**zwei content_v1-Sondercontainern**:

| Container | Typ | Genutzte Felder |
|---|---|---|
| `section` | content_v1 | `eyebrow`, `title`, `intro`, `cta` |
| `cards`   | content_v1 | `<key>.title`, `<key>.description`, `<key>.icon`, `<key>.tags.0..2` |

Pro Karte musste eine eigene `cardDefs`-Liste im Renderer-Code (Icon,
Image-Fallback, Ziel-Route) hartcodiert werden. Die Karten waren damit
**nicht** über den `card_v1`-Standardvertrag steuerbar — Bullets,
Chips, Link-Toggles, Eyebrow-Schalter fehlten im Admin.

Renderer-Dateien (vorher 116 / 137 LOC, je mit lokalem `cardDefs`,
fest verdrahteten Lucide-Icons und Visibility-Gates auf
`section`/`cards`):

- `src/features/anwendungen/pages/GesundheitseinrichtungenPage.tsx`
- `src/features/anwendungen/pages/OeffentlicheHandPage.tsx`

---

## 2. Welche neuen Standard-Sections wurden angelegt?

### 2.1 Container (`cards_v1`, aktiv)

| Page | section_key | sort_order | Felder (DE+EN) |
|---|---|---|---|
| P-059 | `cards_standard` | 35 | `label`, `title`, `intro` |
| P-060 | `cards_standard` | 35 | `label`, `title`, `intro` |

Inhalte übernommen aus altem `section.eyebrow` → `label`,
`section.title` → `title`, `section.intro` → `intro`. Texte
**unverändert**.

### 2.2 Karten (`card_v1`, aktiv, parent = `cards_standard`)

| Page | section_key | sort_order | Link-Ziel |
|---|---|---|---|
| P-059 | `card_pflege`     | 0  | `/anwendungen/pflege` |
| P-059 | `card_klinik`     | 10 | `/anwendungen/klinik` |
| P-060 | `card_behoerde`   | 0  | `/anwendungen/behoerde` |
| P-060 | `card_feuerwehr`  | 10 | `/anwendungen/feuerwehr` |
| P-060 | `card_schwimmbad` | 20 | `/anwendungen/schwimmbad` |

Pro Karte gesetzt (DE+EN): `title`, `description`, `icon` (Lucide-
Name aus Altdaten), `chips.0..2` (aus `tags.0..2`), `link_1_label`
(„Details", aus altem `section.cta`), `link_1_href`, `link_1_kind`
(`internal`), `link_1_enabled` (`1`). Inhalte **unverändert**.

### 2.3 Whitelist

`cms_admin_editable_fields`-Einträge gesetzt für:

- **Container** (6 Felder = 3 keys × 2 Locales) pro Page
- **Karten** (76 Felder = 38 card_v1-Standardkeys × 2 Locales) pro Karte

→ Karten im Admin vollständig bearbeitbar (Titel, Beschreibung,
Icon-Slot, Bild-Slot, Bullets 0–4, Chips 0–4, 3 Link-Slots,
Eyebrow-Schalter, Icon-Schalter, Image-Schalter).

---

## 3. Welche Altcontainer wurden deaktiviert?

| Page | section_key | Typ | Status nach Batch 36 | Öffentlich sichtbar |
|---|---|---|---|---|
| P-059 | `section` | content_v1 | `is_active=false` | nein (RLS) |
| P-059 | `cards`   | content_v1 | `is_active=false` | nein (RLS) |
| P-060 | `section` | content_v1 | `is_active=false` | nein (RLS) |
| P-060 | `cards`   | content_v1 | `is_active=false` | nein (RLS) |

**Nicht gelöscht** — verbleiben als Backup für Rollback, exakt wie
auf P-057 (`sections`, `einrichtungen`). Hartes Löschen ist Teil des
geplanten Cleanup-Batches 35x (siehe Batch 35, Abschnitt 4).

---

## 4. Sind beide Seiten jetzt DB-first über Standardbausteine?

**Ja.** Beide Renderer (`GesundheitseinrichtungenPage.tsx`,
`OeffentlicheHandPage.tsx`) wurden auf das P-057-Muster umgestellt:

- `useCmsPageContent(PAGE_KEY)` lädt den Page-Snapshot
- `renderPageSectionByType(...)` dispatcht generisch auf
  `CardsSectionV1`
- Hero läuft über `CmsPageLayout`, Tail-CTA über `CmsTailCta`
- **Keine** hartcodierten Texte, Icons, Tags, Links, Bilder mehr
- LOC: ~70 statt 116/137

Aktive Top-Level-Sections nach Batch 36:

| Page | Aktiv | Inaktiv (Backup) |
|---|---|---|
| P-059 | `hero`, `cards_standard`, `standard_cta` | `section`, `cards`, `faq` |
| P-060 | `hero`, `cards_standard`, `standard_cta` | `section`, `cards`, `faq` |

---

## 5. Sind alle Karten im Admin bearbeitbar?

**Ja** — Whitelist deckt den vollständigen `card_v1`-Standardvertrag
ab (38 Feldnamen × 2 Locales pro Karte, `is_enabled=true`). Damit
zeigt der Admin pro Karte: Titel, Beschreibung, Icon-Slot mit
Toggle, Bild-Slot mit Toggle, Eyebrow-Toggle, 5 Bullets mit Toggles,
5 Chips mit Toggles, 3 Link-Slots (Label/Href/Kind/Enabled).

Standard-Vorbelegung („Standardtexte schon sichtbar") gilt auf
`card_v1` strukturell: was im Code als Default vorgesehen war (Icon
„heart-pulse"/„stethoscope"/„landmark"/„flame"/„waves",
Link-Label „Details", Link-Ziele), liegt jetzt **in der DB** und
ist im Admin sichtbar/editierbar — nicht mehr versteckt im Renderer.

---

## 6. Gibt es Restpunkte?

| ID | Beschreibung | Empfehlung |
|---|---|---|
| R1 | Diagnose-Map (`rendererPathMap.generated.ts`) klassifiziert P-059/P-060 voraussichtlich noch als „sonderlogik". | Coverage-JSON regenerieren analog Batch 35a — eigenständiger Mini-Batch oder gemeinsam mit nächster Standardisierung. |
| R2 | Bild-Assets (`image`-Slot) sind pro Karte leer — bisher wurde im Code kein Bild gerendert. Wenn redaktionell ein Bild gewünscht ist, kann es nun per Admin/Prompt in `card_<key>.image` gepflegt werden. | Inhaltspflege, kein Renderer-Batch nötig. |
| R3 | Alt-Container `section`/`cards` (P-059 + P-060) liegen inaktiv in DB. | Cleanup-Batch 35x (gemeinsam mit P-057/P-071-Backups, siehe Batch 35 §4). |
| R4 | `cms-steuerbarkeit-status.md` und `current-status.md` referenzieren Batch 36 noch nicht. | Doku-Pflege nach diesem Batch (separate Aktion). |

---

## 7. Wurde nichts an P-056 / P-077 gemacht?

**Bestätigt.** Es wurden **ausschließlich** folgende Dateien/Records
geändert:

- DB: `cms_sections`, `cms_section_fields`, `cms_admin_editable_fields`
  — **nur** für `page_key IN ('anwendungen.gesundheitseinrichtungen',
  'anwendungen.oeffentliche-hand')`.
- Code:
  - `src/features/anwendungen/pages/GesundheitseinrichtungenPage.tsx`
  - `src/features/anwendungen/pages/OeffentlicheHandPage.tsx`
- Diagnose (regeneriert durch Wahrheits-Check):
  - `docs/04-betrieb/faq-cta-toggle-inventar.md` (+ JSON)

Keine Änderung an: P-056 (`ObjektloesungenPage.tsx`), P-077,
Navigation (`cms_navigation_nodes`, `src/navigation/*`,
`src/app/routes.tsx`), Produktkatalog, RPC-Layer, RLS-Policies,
Section-Typ-Registry, neue Section-Typen.

---

## 8. Verifikation

- DB-Snapshot nach Migration (Auszug):

  ```
  P-059  hero            hero_v1     10  active
  P-059  cards_standard  cards_v1    35  active   (+ card_pflege, card_klinik)
  P-059  standard_cta    cta_v1      50  active
  P-059  section         content_v1  20  INACTIVE (Backup)
  P-059  cards           content_v1  30  INACTIVE (Backup)

  P-060  hero            hero_v1     10  active
  P-060  cards_standard  cards_v1    35  active   (+ card_behoerde, card_feuerwehr, card_schwimmbad)
  P-060  standard_cta    cta_v1      50  active
  P-060  section         content_v1  20  INACTIVE (Backup)
  P-060  cards           content_v1  30  INACTIVE (Backup)
  ```

- `node scripts/cms/wahrheits-check-ci.mjs` → **✅ grün**
  (FAQ/CTA orphan/mixed/dedup-only = 0, Launch-Gate erfüllt).

Stopp nach diesem Batch — keine Folgearbeit gestartet.
