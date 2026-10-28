# Sprint 2i — R2-Strukturmigration `gebaeudekommunikation`

_Stand: 2026-05-29_

## Kurzfassung

Sprint 2i bereinigt strukturell die 10 R2-Kartencontainer im fachlichen
Bereich `gebaeudekommunikation`, verteilt auf 5 Seiten mit dedizierter
Page-Komponente (S1/S2/G1). Reine Typkorrektur
`section_type='content_v1' → 'cards_v1'` auf den Parent-Containern. Keine
Felder, Assets, Whitelist, Sortierung oder Sichtbarkeit angefasst.
Public-Layout vorher = nachher.

| Kennzahl | Sprint 2h | Sprint 2i | Δ |
|---|---:|---:|---:|
| D1 `contract_missing` | 0 | 0 | 0 |
| D8 `active_without_renderer` | 0 | 0 | 0 |
| **D9 `invalid_parent_child`** | **143** | **67** | **−76** |
| Aktive R2-Hits (`content_v1 → card_v1`) | 59 | 21 | −38 |
| D9-Pattern `content_v1->card_v1` (symmetrisch) | 118 | 42 | −76 |
| D9-Pattern `(none)->card_v1` | 19 | 19 | 0 |
| D9-Pattern `rich_v1->rich_v1` | 6 | 6 | 0 |
| Distinct D9-Beziehungen | 3 | 3 | 0 |

## Geprüfte R2-Fälle (gebaeudekommunikation)

Quelle: `cms:audit:d9-relations` + Read-Query auf `cms_sections`
(Parent `content_v1`, Child `card_v1`, beide aktiv).

| Page-Komponente | Klasse | page_key | section_key | Kinder | Parent-Felder (Auszug) | Migration |
|---|---|---|---|---:|---|---|
| `BriefkastenanlagenPage` | S2 | `gebaeudekommunikation.briefkastenanlagen` | `montageformen` | 3 | `label`, `title`, `intro` | ✅ migriert |
| `BriefkastenanlagenPage` | S2 | `gebaeudekommunikation.briefkastenanlagen` | `smart` | 4 | `label`, `title`, `intro`, `cta` | ✅ migriert |
| `GrossanlagenPage` | S2 | `gebaeudekommunikation.grossanlagen` | `anforderungen` | 6 | `label`, `title`, `intro` | ✅ migriert |
| `GrossanlagenPage` | S2 | `gebaeudekommunikation.grossanlagen` | `systembausteine` | 4 | `label`, `title`, `intro`, `details` | ✅ migriert |
| `GrossanlagenPage` | S2 | `gebaeudekommunikation.grossanlagen` | `wirtschaftlichkeit` | 3 | `label`, `title`, `text` | ✅ migriert |
| `SnipdooIpPage` | S1 | `gebaeudekommunikation.snipdoo-ip` | `anwendungen` | 3 | `label`, `title`, `eyebrow`, `headline`, `intro` | ✅ migriert |
| `SnipdooIpPage` | S1 | `gebaeudekommunikation.snipdoo-ip` | `audiences` | 3 | `label`, `title`, `headline`, `text` | ✅ migriert |
| `SystemloesungenPage` | S2 | `gebaeudekommunikation.systemloesungen` | `vorteile` | 6 | `label`, `title`, `text` | ✅ migriert |
| `SystemloesungenPage` | S2 | `gebaeudekommunikation.systemloesungen` | `fachplanung` | 3 | `label`, `title`, `intro`, `ctaPrimary`, `ctaSecondary` | ✅ migriert |
| `TuersprechanlagenPage` | G1 | `gebaeudekommunikation.tuersprechanlagen` | `anwendungsumfelder` | 3 | `label`, `title`, `text`, `learnMore` | ✅ migriert |

**Summe: 10 Parent-Sections retyped · 38 R2-Hits aufgelöst.**

Alle Parents waren vorher und nachher `is_active=true`. Sortierung
(`sort_order`) blieb unverändert. Parent-Assets (Briefkasten/Snipdoo/
Tuersprech: 3+3+3 Slots) blieben unangetastet — sie sind Karten-Bilder
und werden vom Renderer über (`page_key`, `section_key`, `field_key`)
gelesen, nicht über `section_type`.

## Renderer-Beweis je Seite

Alle 5 Page-Komponenten lesen die Kindkarten **typ-agnostisch zum
Parent**. Die Migration ändert keine Layout-Auswahl.

### `BriefkastenanlagenPage.tsx`

```tsx
const montageCards = cms.sections.filter(
  (s) => s.parent_section_key === "montageformen" && s.section_type === "card_v1",
);
const smartCards = cms.sections.filter(
  (s) => s.parent_section_key === "smart" && s.section_type === "card_v1",
);
```

Parent-Typ wird im JSX nicht abgefragt. Die Sections `montageformen`
und `smart` werden in einer festen JSX-Reihenfolge gerendert — kein
generischer `CmsBodyRenderer`-Fallback, kein `ContentSectionV1`.
Inventar: `usesCmsBodyRenderer=false`. **Layoutgleich sicher.**

### `GrossanlagenPage.tsx`

```tsx
const anforderungenCards = cms.sections.filter(
  (s) => s.parent_section_key === "anforderungen" && s.section_type === "card_v1",
);
const wirtschaftlichkeitCards = cms.sections.filter(
  (s) => s.parent_section_key === "wirtschaftlichkeit" && s.section_type === "card_v1",
);
// systembausteine: inline-Filter mit identischem Pattern
```

Identische Logik. `usesCmsBodyRenderer=false`. **Layoutgleich sicher.**

### `SystemloesungenPage.tsx`

```tsx
const vorteileCards = cms.sections.filter(
  (s) => s.parent_section_key === "vorteile" && s.section_type === "card_v1",
);
const fachplanungCards = cms.sections.filter(
  (s) => s.parent_section_key === "fachplanung" && s.section_type === "card_v1",
);
```

`usesCmsBodyRenderer=false`. **Layoutgleich sicher.**

### `SnipdooIpPage.tsx`

Iteriert hartcodierte Item-Listen (`AUDIENCE_ITEMS`, `ANWENDUNGEN_ITEMS`)
und liest Kinderfelder über `cms.text(childKey, ...)` mit
`childKey = "audiences.<key>"` bzw. `"anwendungen.<key>"`. Parent-
Sections `audiences` und `anwendungen` werden nur über `cms.text(
"audiences.headline", ...)` etc. abgefragt — auf Feldebene, nicht auf
Typebene. `usesCmsBodyRenderer=false`. **Layoutgleich sicher.**

### `TuersprechanlagenPage.tsx`

```tsx
// AnwendungsumfelderSection (SECTION_RENDERERS["anwendungsumfelder"])
cmsContent.sections
  .filter((s) => s.parent_section_key === "anwendungsumfelder" && s.section_type === "card_v1")
```

`anwendungsumfelder` steht in der lokalen `SECTION_RENDERERS`-Map
(Section-Key-basiert, nicht Section-Type-basiert) und wird daher
immer über die dedizierte `AnwendungsumfelderSection` gerendert —
nicht über den generischen `CmsBodyRenderer`-Fallback (Zeilen
609–626). `dbOrder` enthält den Key sowohl via
`SECTION_RENDERERS[s.section_key] != null` als auch via
`hasGenericRenderer("cards_v1")` (cards_v1 ist in `RENDERERS`
registriert). Vor und nach der Migration identische Renderwahl.
**Layoutgleich sicher.**

Kein Doppelrendering-Risiko: weder vor noch nach der Migration
konsumiert ein weiterer Pfad die Kinder zusätzlich.

## Nicht migriert (Scope-Treue)

Bewusst **nicht** angefasst:

- **`gebaeudekommunikation.*` content_v1-Sections ohne aktive
  card_v1-Kinder** (z. B. `briefkastenanlagen.skalierbarkeit`,
  `grossanlagen.leistungen`, `grossanlagen.projektCta`,
  `snipdoo-ip.{content,seo,subnav,systemversprechen,systemaufbau,
  nutzungAlltag,inbetriebnahme,rollen,kontakt}`,
  `tuersprechanlagen.{ueberblick,scroller}`,
  `root.{bereiche_intro,snipdoo}`, `beschilderung.features`). Sie
  sind **keine** R2-Fälle — Audit-Klasse bleibt unverändert.
- **`zutrittskontrolle.*` R2-Fälle** (`mobiler-zutritt`,
  `zufahrten-parkplaetze`, `fahrstuhlsteuerung`) → Sprint 2j.
- **`presse.root` und `signage.root`** R2-Fälle → eigener Sprint, da
  fachlich nicht zum Bereich `gebaeudekommunikation` gehörig.
- `(none) → card_v1` (19 Hits, Legacy `anwendungen.root`) — Option B
  aus Sprint 2d.
- `rich_v1 → rich_v1` (6 Hits, `home.start`) — kein Vertragsfix.

## Eigenschaften der Migration

- **Reine UPDATE-Operation** auf `cms_sections.section_type` für genau
  10 Zeilen. Keine INSERT/DELETE.
- **Idempotent** durch `WHERE section_type='content_v1'` — Wiederholung
  trifft 0 Rows.
- **Inhalte unverändert**: `cms_section_fields` nicht angefasst. Alle
  Parent-Felder (`label`, `title`, `intro`, `text`, `cta`,
  `ctaPrimary`, `ctaSecondary`, `details`, `eyebrow`, `headline`,
  `learnMore`, `items.*`) bleiben byte-identisch.
- **Assets unverändert**: `cms_assets` nicht angefasst. Parent-
  Asset-Slots (z. B. `image_efh`, `image_mfh`, `image_ami` auf
  `briefkastenanlagen.montageformen`) werden weiterhin über
  (page_key, section_key, field_key) gelesen.
- **Whitelist unverändert**: `cms_admin_editable_fields` nicht
  angefasst. Schlüssel ist (page_key, section_key, field_key, locale)
  — `section_type` ist nicht Teil davon.
- **`is_active` unverändert**: alle 10 Parents bleiben aktiv. Keine
  Kindsection aktiviert oder deaktiviert.
- **`sort_order` unverändert**.
- **Keine neue Schreib-RPC**.
- **Keine Renderer-Code-Änderung**.
- **Keine Public-Routen-/Navigation-/Footer-/Breadcrumb-/i18n-Änderung**.
- **Produktdatenbank unberührt**.
- **Keine `zutrittskontrolle`-Migration in diesem Sprint**.

## Audit-Checks

```
npm run cms:audit:contract                  → 15 OK · 6 Warnung · 0 Konflikt
npm run cms:audit:contract-drift            → D1=0 · D8=0 · D9=67
npm run cms:audit:d9                        → 67 (47 aktiv · 20 inaktiv)
npm run cms:audit:d9-relations              → 3 distinct, R2-Pattern 42 (vorher 118)
npm run cms:audit:renderer-fallback-inventory → 80 Pages, Klassen unverändert
```

Verbleibende aktive R2-Hits (`content_v1 → card_v1`, 21 gesamt) auf
5 Seiten:

| page_key | r2_active |
|---|---:|
| `presse.root` | 5 |
| `signage.root` | 4 |
| `zutrittskontrolle.fahrstuhlsteuerung` | 4 |
| `zutrittskontrolle.mobiler-zutritt` | 4 |
| `zutrittskontrolle.zufahrten-parkplaetze` | 4 |

`npm run build` läuft über die Lovable-Harness automatisch, wird hier
nicht manuell ausgeführt.

Drift-Verschiebungen ggü. 2h sind die erwartete Symmetrierung wie in
Sprint 2h beschrieben (`cards_v1`-Vertragsfelder ergänzen
`content_v1`-Vertragsfelder, daher kleine Bewegungen in D2/D3/D4/D5/D10
ohne inhaltliches Risiko).

## Geänderte Dateien

- **DB-Migration** (`supabase/migrations/*sprint_2i*` bzw. neu erzeugte
  Migration): UPDATE auf 10 Sections in `public.cms_sections.section_type`.
- **neu**: `docs/04-betrieb/sprint-2i-eine-wahrheit-bericht.md` (dieses
  Dokument).
- **regeneriert**: `docs/04-betrieb/contract-drift-audit-latest.md`,
  `scripts/cms/output/contract-drift-audit-latest.json`,
  `docs/04-betrieb/d9-relations-latest.md`,
  `scripts/cms/output/d9-relations-latest.json`,
  `docs/04-betrieb/sprint-2c-d9-owner-entscheidungen.md` (D9-Owner-Run),
  `docs/04-betrieb/renderer-fallback-inventar-latest.md`.
- **aktualisiert**: `docs/current-status.md` (Sprint-2i-Eintrag).

Keine Änderungen an Renderern, Routen, Navigation, Footer, Breadcrumbs,
i18n-JSONs, Whitelist-Einträgen oder dem Produktkatalog.

## Bestätigung Sprint-Verbote

- Keine Produktdatenbank angefasst.
- Keine Public-Renderer-/Routen-/Navigation-/Footer-/Breadcrumb-/i18n-Änderung.
- Keine Inhalte überschrieben.
- Keine Bilder verändert.
- Keine Feldwerte überschrieben.
- Keine Whitelist-Zeile gelöscht, deaktiviert oder geändert.
- Keine neue Schreib-RPC angelegt.
- Keine `zutrittskontrolle`-Migration durchgeführt.
- Keine Massenmigration außerhalb der 10 dokumentierten Sections.
- Keine Section aktiviert oder deaktiviert.
- Keine Sortierung geändert.
- Keine Reparenting-Migration.

Die Linter-Warnungen (87 Stück, fast alle `0028_anon_security_definer_
function_executable` zu bestehenden `rpc_admin_*`-Funktionen sowie ein
bestehender Public-Bucket) sind **pre-existing** und nicht durch diese
Migration entstanden — diese Migration enthält weder neue Funktionen
noch Storage-Änderungen.

## Empfohlene nächste Etappe

`cms-light-eine-wahrheit-sprint-2j-r2-zutrittskontrolle-s2-seiten-1`
— bereichsweise R2-Migration für die 3 verbleibenden
`zutrittskontrolle`-Page-Keys (`mobiler-zutritt`, `zufahrten-parkplaetze`,
`fahrstuhlsteuerung`, ≙ 12 R2-Hits), mit Renderer-Beweis pro
Page-Komponente und Owner-Sign-off. Danach `presse.root` und
`signage.root` (9 R2-Hits) als kleinerer Folge-Sprint.
