# Batch 50 — „Altbestand-Felder in der DB" — Audit + Admin-UX-Schliff

Stand: 2026-06-05 · Status: ✅ abgeschlossen · Scope: nur die orange
Admin-Meldung „Altbestand-Felder in der DB" im Standard-Baustein-Workspace
(`hero_v1`, `teaser_2col_v1`, `content_v1`). Kein Renderer-Umbau, keine
Inhaltsänderung, keine Migration.

---

## 1. Konkreter Befund — P-073 / B-1430

- **Page**: `anwendungen.feuerwehrdurchsage` (P-073, `is_active=true`,
  `status=published`).
- **Section**: `hero` (B-1430, `section_type=hero_v1`, `is_active=true`).
- **DB-Felder in `cms_section_fields`**:
  `cta_href`, `cta_label`, `eyebrow`, `headline`, **`image`**, **`intro`**,
  `subheadline`, `subline` (je DE+EN).
- **Asset**: separater Eintrag in `cms_assets` (Slot `image`,
  asset_role=image) — eigener Workflow.

### 1a. Klassifikation der zwei gemeldeten Keys

| Key     | Renderer-Read?                                                                 | Inhalt in DB                                       | Einordnung |
|---------|--------------------------------------------------------------------------------|----------------------------------------------------|-----------|
| `intro` | **ja** — `CmsPageLayout` liest `intro → introText → subline → description`     | DE+EN gefüllt („Normgerechte Feuerwehrdurchsagen…") | **Grün — gültiger Alias** für `subline`. Der Admin-Vertrag (`sectionTypes.ts`) listet `intro` bereits als Alias, der Standard-Workspace kannte den Alias bisher aber nicht und meldete ihn pauschal als „Altbestand". |
| `image` | **nein** als Text-Feld. Hero-Bild lebt ausschließlich in `cms_assets`.          | DE+EN leer (Länge 0)                               | **Grün — leerer Migrations-Geist**. Der Slot-Key `image` deckt sich technisch mit dem Asset-Slot-Namen; die alte Text-Feld-Zeile wurde nie befüllt und nie gerendert. |

**Ergebnis B-1430:** keiner der beiden Funde ist echter Altbestand mit
Wirkung. Der Admin-Vertrag für `hero_v1` war an dieser Stelle
**unvollständig** (Alias `intro` / `description` / `label` / Asset-Slot
`image` nicht im Workspace abgedeckt).

---

## 2. Globaler Befund — wo erschien „Altbestand-Felder in der DB"

Read-only-Auswertung gegen `cms_section_fields` × `cms_sections`
(`is_active=true`), gruppiert nach den drei Standard-Bausteinen
(`hero_v1`, `teaser_2col_v1`, `content_v1`):

### 2a. `hero_v1` (vor dem Fix)

| field_key (DB) | Sections | Inhalt | Renderer liest? | Einordnung |
|---|---:|---|---|---|
| `image` (Text-Feld) | 130 | überall leer | nein (Hero-Bild via `cms_assets`) | **Grün** — Migrations-Geist. |
| `intro` | 144 | überwiegend gefüllt | **ja** als Alias von `subline` | **Grün** — Vertrags-Alias, Admin-Workspace kannte ihn bisher nicht. |
| `label` | 76 | gefüllt | **ja** als Alias von `eyebrow` | **Grün** — Vertrags-Alias, Workspace ergänzt. |
| `description` | 14 | gefüllt | **ja** als Fallback in Subline-Kette | **Grün** — als Alias von `subline` ergänzt. |
| `introText` | 12 | gefüllt | **ja** als Fallback in Subline-Kette | **Grün** — als Alias von `subline` ergänzt. |
| `ctaBeratung`, `ctaDatenblatt`, `ctaUrl`, `datasheetUrl`, `meta_units`, `meta_year`, `p1`, `p2`, `primary`, `secondary`, `imageAlt`, `image_alt`, `imagePlaceholder`, `cta`, `datasheetLabel` | je 2–22 | bespoke gefüllt | i. d. R. **ja**, aber durch bespoke Page-Komponente (Referenzprojekte, mobile-tk-preview-Hero etc.) | **Grau / Sonderfeld** — auf bespoke Seiten; der Bespoke-Block (`bespokePageSections.ts`) klassifiziert sie bereits als „Sonderfeld · wirkt öffentlich", sobald die Section in der bespoke-Registry steht. Restbestände auf nicht-registrierten bespoke Heroes (z. B. Referenzprojekte-Hero) bleiben als Diagnose stehen; Bewertung im Bericht: **Gelb** (Workspace-Vertrag für refproj-Hero ist bewusst Sonderfall und wird in Folge-Batch behandelt — nicht durch diesen Batch). |

### 2b. `teaser_2col_v1`

- Workspace deckt `label`, `title`, `text`, `cta_label`, `cta_link`,
  `image_position`, `background_variant`, Asset-Slot `image`.
- Häufigster Altbestand-Treffer: **`cta_href`** als historisches Synonym
  für `cta_link`. Wird vom Renderer **nicht** gelesen (Teaser2ColV1 liest
  ausschließlich `cta_link`), aber von Bespoke-Pages teilweise befüllt.
  → **Grün** (Alias-Eintrag im Workspace ergänzt), Cleanup-Kandidat für
  einen späteren Migrationslauf.

### 2c. `content_v1`

- Workspace deckt `label`, `title`, `text`.
- Vertrag listet `body`, `intro` als Aliase von `text`. Renderer
  (`ContentSectionV1`) bevorzugt `text`, fällt aber auf `body`/`intro`
  zurück.
- Befund auf bespoke Anwendungs-Detailseiten (z. B.
  `anwendungen.feuerwehrdurchsage / content`): Dutzende
  bespoke-Feldnamen (`systembausteine.*`, `leistungen.*`,
  `aussenstation.*`, …) — diese sind **Grau** (Sonderfelder dieser
  Page-Komponente) und werden durch
  `src/features/admin/lib/bespokePageSections.ts` bereits korrekt als
  „Sonderfeld · wirkt öffentlich" gekennzeichnet, nicht als „Altbestand".
- Restbestand auf `content_v1` außerhalb der bespoke-Registry: typische
  Alias-Treffer `body` / `intro` → **Grün** (jetzt als Aliase von `text`
  im Workspace ergänzt).

### 2d. Klassifikations-Summe

| Klasse | Bedeutung | Anteil im Audit |
|---|---|---|
| 🟢 Grün | echtes harmloses Altfeld (leer, nie gerendert) **oder** Vertrags-Alias | Mehrheit aller bisher gemeldeten Funde |
| 🔴 Rot | öffentlich gelesen, aber im Admin nicht bearbeitbar | **0** Funde (keine Page nachweisbar betroffen) |
| 🟡 Gelb | Admin-Vertrag wahrscheinlich unvollständig | adressiert in diesem Batch (Aliase + Asset-Slot ergänzt). Verbleibend: Sonder-Heroes (Refproj, mobile-tk-preview) — bewusst Folge-Batch |
| ⚪ Grau | bewusste Sonderfeld-/Bespoke-Section | bleibt unverändert, ist im UI bereits als „Sonderfeld · wirkt öffentlich" markiert |

---

## 3. Korrektur (nur eindeutig + minimal)

### 3a. `WorkspaceFieldDef.aliasKeys` eingeführt

Datei: `src/features/admin/lib/sectionWorkspaceGroups.ts`

- Neues optionales Feld `aliasKeys: ReadonlyArray<string>` an
  `WorkspaceFieldDef`. Damit kann der Workspace mehrere DB-`field_key`s
  als denselben kanonischen Workspace-Eintrag akzeptieren, ohne den
  Renderer oder die Whitelist anzufassen.
- `workspaceFieldKeysFor(sectionType)` zählt jetzt zusätzlich:
  - alle `aliasKeys` jedes Workspace-Feldes,
  - **plus** `cfg.assetSlot?.fieldKey` (z. B. `image` für Hero), damit
    leere Migrations-Geister im `cms_section_fields` mit gleichem Key
    wie der Asset-Slot nicht mehr als „Altbestand" erscheinen.

### 3b. Aliase ergänzt (genau diese, sonst nichts)

- `hero_v1`:
  - `eyebrow`: + Alias `label`
  - `headline`: + Alias `title`
  - `subheadline`: + Alias `subheader`
  - `subline`: + Aliase `intro`, `introText`, `description`
  - Asset-Slot `image` deckt jetzt auch leere `cms_section_fields`-Zeile
    mit `field_key=image`.
- `teaser_2col_v1`:
  - `cta_link`: + Alias `cta_href` (historisches Synonym; Renderer liest
    weiterhin nur `cta_link`).
- `content_v1`:
  - `text`: + Aliase `body`, `intro` (entsprechend dem Vertrag).

### 3c. Admin-Text verbessert

Datei: `src/features/admin/components/StandardBausteinWorkspace.tsx`

- Headline ersetzt:
  „Altbestand-Felder in der DB" → **„Nicht öffentlich verwendete
  Altfelder"** (für Nicht-Bespoke-Sections).
- Hilfetext klarer formuliert:
  - sagt, dass es **Diagnose** ist, keine Warnung;
  - erklärt, dass es typischerweise leere Migrationsreste oder Aliase
    sind;
  - verweist Redaktion auf die Pflege oben im Workspace;
  - sagt explizit „nicht löschen, als Cleanup-Kandidat vormerken".

Keine pauschalen Löschungen, keine RPC-Erweiterung, keine Whitelist-
Mutation.

---

## 4. Public/Admin-Widersprüche?

- **Keine** Widersprüche gefunden, bei denen ein Renderer öffentlich
  liest, was im Admin gar nicht pflegbar wäre. Alle bisher als
  „Altbestand" gemeldeten **gefüllten** Keys waren entweder:
  (a) Vertrags-Aliase, die bereits durch den kanonischen Workspace-Eintrag
  pflegbar sind und nach diesem Fix nicht mehr als „Altbestand" auftauchen,
  oder (b) bespoke Sonderfelder, die durch `bespokePageSections.ts` bereits
  als „Sonderfeld · wirkt öffentlich" markiert sind.
- Kein Abnahme-Blocker.

---

## 5. Verifikation

- **Wahrheits-Check CI** (`scripts/cms/wahrheits-check-ci.mjs`):
  ✅ grün — Harvester reproduzierbar, keine Drift, Body-Map vollständig,
  Launch-Gate erfüllt (FAQ/CTA orphan/mixed/dedup-only = 0).
- **Konkret B-1430**: `hero_v1`-Workspace deckt nach Fix `eyebrow` (+`label`),
  `headline` (+`title`), `subheadline` (+`subheader`), `subline`
  (+`intro`/`introText`/`description`), `cta_label`, `cta_href`, plus
  Asset-Slot-Key `image`. Die acht DB-Keys aus B-1430 sind damit
  vollständig abgedeckt → **orange Box verschwindet**.
- Keine Build-/Renderer-Änderung, keine DB-Migration.

---

## 6. Empfehlung — Cleanup / Folge-Batches

1. **Optionaler Cleanup-Batch** für 130× leere `cms_section_fields`-Zeilen
   mit `field_key='image'` auf `hero_v1`-Sections — rein kosmetisch, keine
   Public-Wirkung, gut idempotent migrierbar. **Nicht Teil dieses Batches.**
2. **Sonder-Hero-Refproj-Batch**: Für `anwendungen.referenzprojekte.*`-Hero
   einen bespoke-Registry-Eintrag analog zu `content`/`leistungen` ergänzen,
   damit `meta_units` / `meta_year` / `subline` / `body` etc. ohne
   „Altbestand"-Label erscheinen. **Nicht Teil dieses Batches.**
3. **Optionaler Teaser-`cta_href` → `cta_link`-Migrationslauf**: Werte
   verschmelzen und alte Zeilen leeren (idempotent, spiegel-treu).
   Niedrige Priorität.

---

## 7. Geänderte Dateien

- `src/features/admin/lib/sectionWorkspaceGroups.ts` (Aliase + Asset-Slot
  in `workspaceFieldKeysFor`).
- `src/features/admin/components/StandardBausteinWorkspace.tsx`
  (verständlichere Headline + Hilfetext).
- `docs/04-betrieb/audit-snapshot/batch50-altbestand-felder-admin-audit.md`
  (dieser Bericht).
