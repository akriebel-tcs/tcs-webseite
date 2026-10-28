# Batch 37 — P-056 Objektlösungen Standardisierung

Datum: 2026-06-05
Bereich: TCS in Bauten / Anwendungen
Modus: **Umsetzung** — Standard-Sections angelegt, Renderer umgestellt,
Altcontainer deaktiviert (Backup, nicht gelöscht).

## 0. Kurzfazit

- **P-056 `anwendungen.objektloesungen` → ✅ DB-first über
  Standardbausteine.** Acht Domänen-Karten (Kita, Schulen, Wohnheime,
  Pflege, Medizin, Behörden, Feuerwehren, Bäder) rendern aus
  `cards_standard` (cards_v1) + `card_kita … card_baeder` (card_v1).
- Intro-Lead-Text bleibt im bestehenden `content` (content_v1) — ein
  Standardbaustein, kein Sonderlogik-Container; wird vom generischen
  Renderer ausgeliefert.
- **Doppelrender:** keiner. Alte Sondercontainer `section` und `items`
  (content_v1) sind `is_active=false` → RLS filtert sie heraus.
- **Admin:** alle 38 card_v1-Standardfelder × 2 Locales pro Karte
  (= 76 Whitelist-Einträge je Karte, 8 Karten = 608) + Container-
  Felder (label / title / intro, 6 Einträge) freigeschaltet.
- **Wahrheits-Check:** ✅ grün.
- **Navigation:** unverändert. „Mehr erfahren"-Links pro Karte zeigen
  auf die jeweilige T04-Sammelseite (Bildungs-, Gesundheits-,
  Öffentliche-Hand-Seite).

---

## 1. Was war vorher Sonderlogik?

`ObjektloesungenPage.tsx` (116 LOC) verdrahtete die 8 Domänen-Karten
hartcodiert im Renderer:

- Code-Array `itemDefs` mit Lucide-Icons (`Baby`, `GraduationCap`, …).
- Texte (Titel, Eyebrow, Beschreibung) via `useCmsI18n` aus drei
  content_v1-Sondercontainern gelesen:

| Container | Typ | Genutzte Felder |
|---|---|---|
| `content` | content_v1 | `lead` |
| `section` | content_v1 | `label`, `title` |
| `items` | content_v1 | `<key>.title`, `<key>.subtitle`, `<key>.text`, `<key>.icon` |

- Keine `card_v1`-Standardfelder, keine Link-Pillen, keine Bullets/Chips,
  keine Sichtbar-Schalter pro Modul. Admin konnte die Karten nicht
  vollständig steuern.

---

## 2. Welche neuen Standard-Sections / Karten wurden angelegt?

### 2.1 Container (`cards_v1`, aktiv)

| Page | section_key | sort_order | Felder (DE+EN) |
|---|---|---|---|
| P-056 | `cards_standard` | 35 | `label`, `title`, `intro` |

Inhalte übernommen aus alt `section.label` → `label`,
`section.title` → `title`. Texte **unverändert**.

### 2.2 Karten (`card_v1`, aktiv, parent = `cards_standard`)

| section_key | sort_order | Icon (DB) | Link-Ziel |
|---|---|---|---|
| `card_kita`        |  0 | baby           | `/anwendungen/bildungseinrichtungen` |
| `card_schulen`     | 10 | graduation-cap | `/anwendungen/bildungseinrichtungen` |
| `card_wohnheime`   | 20 | home           | `/anwendungen/bildungseinrichtungen` |
| `card_pflege`      | 30 | heart-pulse    | `/anwendungen/gesundheitseinrichtungen` |
| `card_medizin`     | 40 | stethoscope    | `/anwendungen/gesundheitseinrichtungen` |
| `card_behoerden`   | 50 | landmark       | `/anwendungen/oeffentliche-hand` |
| `card_feuerwehren` | 60 | flame          | `/anwendungen/oeffentliche-hand` |
| `card_baeder`      | 70 | waves          | `/anwendungen/oeffentliche-hand` |

Pro Karte gesetzt (DE+EN):

- `title` (aus `items.<key>.title`, 1:1 übernommen)
- `description` (aus `items.<key>.text`, 1:1 übernommen)
- `eyebrow` (aus `items.<key>.subtitle`, 1:1 übernommen)
- `icon` (aus `items.<key>.icon`, Lucide-Name 1:1 übernommen)
- `link_1_label` = „Mehr erfahren" / „Learn more"
- `link_1_href` = jeweilige Sammelseite (siehe Tabelle)
- `link_1_kind` = `internal`
- Sichtbar-Schalter: `eyebrow_enabled = 1`, `icon_enabled = 1`,
  `link_1_enabled = 1`

Inhalte **unverändert** (kein Umtexten, keine Neukomposition).

### 2.3 Whitelist

`cms_admin_editable_fields`-Einträge gesetzt:

- **Container `cards_standard`:** 6 Einträge (3 keys × 2 Locales)
- **Pro Karte:** 76 Einträge (38 card_v1-Standardkeys × 2 Locales)
- **Gesamt:** 6 + 8 × 76 = **614 Einträge**

Damit zeigt der Admin pro Karte: Titel, Beschreibung, Eyebrow + Toggle,
Icon-Slot + Toggle, Bild-Slot + Toggle, 5 Bullets + Toggles, 5 Chips +
Toggles, 3 Link-Slots (Label/Href/Kind/Enabled).

---

## 3. Welche Altcontainer wurden deaktiviert?

| section_key | Typ | Status nach Batch 37 | Öffentlich sichtbar |
|---|---|---|---|
| `section` | content_v1 | `is_active=false` | nein (RLS) |
| `items`   | content_v1 | `is_active=false` | nein (RLS) |

**Nicht gelöscht** — verbleiben als Backup für Rollback. Hartes Löschen
ist Teil des geplanten Cleanup-Batches 35x (siehe Batch 35 §4 und Batch
36 §3) gemeinsam mit den Altbeständen von P-057/P-071/P-059/P-060.

`content` (content_v1) bleibt **aktiv** — es ist der Standard-Lead-
Text-Container und wird vom generischen Renderer dispatcht (kein
Sonderlogik-Sonderling).

`faq` (faq_v1) bleibt unverändert `is_active=false`.

---

## 4. Ist P-056 jetzt DB-first über Standardbausteine?

**Ja.** Renderer `ObjektloesungenPage.tsx` wurde auf das P-059/P-060-
Muster umgestellt (~75 LOC statt 116):

- `useCmsPageContent(PAGE_KEY)` lädt den Page-Snapshot.
- `TOP_SECTIONS = ["content", "cards_standard"]` werden über
  `renderPageSectionByType(...)` generisch dispatcht (auf
  `ContentSectionV1` bzw. `CardsSectionV1`).
- Hero läuft über `CmsPageLayout`, Tail-CTA über `CmsTailCta`.
- **Keine** hartcodierten Texte, Icons, Lucide-Imports, Karten-Arrays,
  Visibility-Gates mehr in der Page.

Aktive Top-Level-Sections nach Batch 37:

| Reihenfolge | section_key | Typ |
|---|---|---|
| 10 | `hero` | hero_v1 |
| 20 | `content` | content_v1 (Lead) |
| 35 | `cards_standard` | cards_v1 (+ 8 card_v1) |
| 60 | `standard_cta` | cta_v1 |

Inaktiv (Backup): `section` (content_v1), `items` (content_v1),
`faq` (faq_v1).

---

## 5. Sind alle Karten im Admin bearbeitbar?

**Ja.** Whitelist deckt den vollständigen `card_v1`-Standardvertrag ab
(38 Feldnamen × 2 Locales pro Karte, `is_enabled=true`). Die im Code
ehemals versteckten Werte (Icon-Namen, Eyebrow, Beschreibung, Link-
Ziele) liegen jetzt **in der DB** und sind sichtbar/editierbar — nicht
mehr im Renderer eingebrannt.

„Mehr erfahren"-Links und Link-Pillen funktionieren über
`link_1_label` / `link_1_href` / `link_1_kind` / `link_1_enabled` und
werden von `CardsSectionV1` / `card_v1` standardmäßig gerendert
(gleicher Pfad wie auf P-057/P-059/P-060).

---

## 6. Gibt es Restpunkte?

| ID | Beschreibung | Empfehlung |
|---|---|---|
| R1 | Diagnose-Map (`rendererPathMap.generated.ts`) klassifiziert P-056 vermutlich noch als „sonderlogik". | Coverage-JSON regenerieren analog Batch 35a — mit dem nächsten Mini-Diagnose-Batch. |
| R2 | Bild-Slot (`image`) ist pro Karte leer — bisher wurden im Code keine Bilder gerendert. Inhaltspflege möglich über Admin/Prompt in `card_<key>.image`. | Inhaltspflege, kein Renderer-Batch nötig. |
| R3 | Altcontainer `section`/`items` liegen inaktiv in der DB. | Cleanup-Batch 35x (gemeinsam mit P-057/P-071/P-059/P-060-Backups). |
| R4 | Die acht Sammelseiten-Ziele decken nur die drei T04-Sammelseiten ab (Bildung / Gesundheit / Öffentliche Hand). Wenn redaktionell pro Karte eine eigene T05-Detailseite gewünscht ist (z. B. eigene Kita-Seite), kann `link_1_href` im Admin individuell überschrieben werden. | Optional, redaktionelle Entscheidung. |
| R5 | `cms-steuerbarkeit-status.md` und `current-status.md` referenzieren Batch 37 noch nicht. | Doku-Pflege nach diesem Batch (separate Aktion). |

---

## 7. Wurde P-077 / Produkt-DB / PDP / Navigation nicht angefasst?

**Bestätigt.** Es wurden **ausschließlich** folgende Dateien/Records
geändert:

- DB: `cms_sections`, `cms_section_fields`, `cms_admin_editable_fields`
  — **nur** für `page_key = 'anwendungen.objektloesungen'`.
- Code:
  - `src/features/anwendungen/pages/ObjektloesungenPage.tsx`
- Doku:
  - `docs/04-betrieb/audit-snapshot/batch37-p056-standardisierung.md`
    (dieser Bericht)

Keine Änderung an: **P-077** (`ReferenzprojektePage.tsx` /
`data/referenzprojekte.ts`), Produktkatalog, PDP,
`src/lib/supabase/client.ts`, Navigation (`cms_navigation_nodes`,
`src/navigation/*`, `src/app/routes.tsx`), RPC-Layer, RLS-Policies,
neue Section-Typen.

---

## 8. Verifikation

- DB-Snapshot nach Migration (aktive Top-Level + Karten):

  ```
  P-056  hero            hero_v1     10  active
  P-056  content         content_v1  20  active
  P-056  cards_standard  cards_v1    35  active
                 ├─ card_kita        card_v1   0
                 ├─ card_schulen     card_v1  10
                 ├─ card_wohnheime   card_v1  20
                 ├─ card_pflege      card_v1  30
                 ├─ card_medizin     card_v1  40
                 ├─ card_behoerden   card_v1  50
                 ├─ card_feuerwehren card_v1  60
                 └─ card_baeder      card_v1  70
  P-056  standard_cta    cta_v1      60  active
  P-056  section         content_v1  30  INACTIVE (Backup)
  P-056  items           content_v1  40  INACTIVE (Backup)
  P-056  faq             faq_v1      50  INACTIVE (unverändert)
  ```

- `node scripts/cms/wahrheits-check-ci.mjs` → **✅ grün**
  (FAQ/CTA orphan/mixed/dedup-only = 0, Launch-Gate erfüllt).

Stopp nach diesem Batch — keine Folgearbeit gestartet.
