# Sprint 2h — R2-Strukturmigration generische Seiten

_Stand: 2026-05-29_

## Kurzfassung

Sprint 2h migriert **strukturell** die 7 R2-Low-Risk-Seiten, die in
Sprint 2g als sicherste Kandidaten identifiziert wurden: jede Seite hat
einen Container-Block (`anwendungen` bzw. `access`), der heute fälschlich
als `content_v1` typisiert ist, obwohl er aktive `card_v1`-Kindsections
hält und vom Renderer (`CmsProductSolutionShell`) bereits heute als
Karten-Container behandelt wird (`readItems` liest die Kinder über
`parent_section_key`, nicht über den Parent-Typ).

Die Migration ist eine **reine Typumstellung** (`section_type='content_v1'`
→ `cards_v1`) auf 7 Sections — keine neuen Sections, keine neuen Felder,
keine Whitelist-Änderung, keine Asset-Änderung, keine Inhaltsänderung,
keine Sortier- oder Sichtbarkeitsänderung.

## Renderer-Beweis

Alle 7 Seiten routen über `CmsProductSolutionShell`
(`src/features/cms/components/CmsProductSolutionShell.tsx`,
Routen in `src/features/{gebaeudemanagement,zutrittskontrolle,service}/routes.tsx`).

```tsx
const bodySections = cms.sections.filter(
  (s) => !s.parent_section_key && s.section_key !== "hero" && s.section_key !== "cta",
);
// readItems(cms, sk, loc) liest Kinder via parent_section_key === sk,
// unabhängig vom section_type des Parents.
```

Folgen für die Migration:

- Das Shell-Iterationskriterium kennt den Parent-Typ nicht
  (`!parent_section_key`). Eine Umtypisierung von `content_v1` auf
  `cards_v1` ändert **keine** Layout-Auswahl im Renderer.
- `readItems` greift auf die Kindsections via `parent_section_key === sk`
  — ebenfalls typ-agnostisch. Die Kinder werden vor und nach der
  Migration identisch gerendert.
- Der generische `ContentSectionV1`-Renderer im `CmsBodyRenderer` ist
  **nicht** beteiligt, weil keine dieser Seiten den `CmsBodyRenderer`
  verwendet (siehe Sprint-2g-Inventar: alle 7 Seiten sind im Inventar
  als „kein dedizierter Page-Komponenten-Treffer" geführt, weil sie über
  die zentrale Shell laufen — der Shell-Pfad ist in Sprint 2g
  äquivalent zu „generischer DB-first-Pfad" klassifiziert).
- Kein Doppelrendering möglich: weder der alte (`content_v1`) noch der
  neue (`cards_v1`) Pfad konsumiert die Kinder zusätzlich.

Sichtbares Public-Layout: **vorher = nachher** für alle 7 Seiten.

`service.online-produktkatalog` ist on top ein Sonderfall: die Route
`/service/online-produktkatalog` ist seit einer früheren Tranche ein
`<Navigate to="/produkte/tuerkommunikation">` (siehe
`src/features/service/routes.tsx`). Die CMS-Seite ist faktisch
nicht-öffentlich erreichbar; eine strukturelle Wahrheit ist dort risikolos.

## 7 migrierte Sections

| Page-Key | Section-Key | Typ vorher | Typ nachher | aktive Kinder (`card_v1`) | sort_order | is_active |
|---|---|---|---|---:|---:|:---:|
| `zutrittskontrolle.bcm-mini-cloud` | `anwendungen` | `content_v1` | `cards_v1` | 5 | 30 | ✓ |
| `gebaeudemanagement.bcm-buchungssystem` | `anwendungen` | `content_v1` | `cards_v1` | 4 | 30 | ✓ |
| `gebaeudemanagement.bcm-infoboard` | `anwendungen` | `content_v1` | `cards_v1` | 4 | 30 | ✓ |
| `zutrittskontrolle.aussenstation-adx5` | `anwendungen` | `content_v1` | `cards_v1` | 4 | 30 | ✓ |
| `zutrittskontrolle.zutrittssoftware` | `anwendungen` | `content_v1` | `cards_v1` | 4 | 30 | ✓ |
| `zutrittskontrolle.digitale-briefkasten` | `anwendungen` | `content_v1` | `cards_v1` | 4 | 30 | ✓ |
| `service.online-produktkatalog` | `access` | `content_v1` | `cards_v1` | 4 | 20 | ✓ |

Summe: **7 Parent-Sections** retyped · **29 R2-Hits** aufgelöst.

Auf allen 7 Seiten existierte bereits ein zweiter, korrekt typisierter
`cards_v1`-Container (`vorteile` mit `vorteile_item_*`). Damit war die
Migration auch fachlich nur eine Symmetrierung zwischen
„Vorteile-Container" und „Anwendungen-Container".

## Nicht migriert (Scope-Treue)

Bewusst **nicht** angefasst, weil außerhalb der Sprint-2h-Definition:

- Die 10 R2-Seiten **mit** dedizierter Page-Komponente
  (`gebaeudekommunikation.{grossanlagen,systemloesungen,briefkastenanlagen,snipdoo-ip,tuersprechanlagen}`,
  `zutrittskontrolle.{mobiler-zutritt,zufahrten-parkplaetze,fahrstuhlsteuerung}`,
  `presse.root`, `signage.root`).
  → Sprint 2i (`gebaeudekommunikation`) und Sprint 2j (`zutrittskontrolle`),
  jeweils mit Renderer-Beweis pro Page-Komponente.
- `(none) → card_v1` (19 inaktive Legacy-Hits, `anwendungen.root`) —
  Owner-Entscheidung Sprint 2d (Option B beibehalten).
- `rich_v1 → rich_v1` (6 Hits, `home.start`) — Renderer ignoriert
  Kinder, kein Vertragsfix beschlossen.

## Eigenschaften der Migration

- **Reine UPDATE-Operation** auf `cms_sections.section_type`. Keine
  INSERT/DELETE.
- **Idempotent** durch `WHERE section_type='content_v1'` — Wiederholung
  trifft 0 Rows.
- **Inhalte unverändert**: `cms_section_fields` nicht angefasst.
  `eyebrow`, `headline`, `items.N.*` und alle Card-Childfields bleiben
  identisch — die Card-Children rendern weiterhin über `readItems`.
- **Assets unverändert**: `cms_assets` nicht angefasst.
- **Whitelist unverändert**: `cms_admin_editable_fields` nicht angefasst
  (Whitelist ist `(page_key, section_key, field_key, locale)`-basiert;
  `section_type` ist nicht Teil des Schlüssels).
- **`is_active` unverändert**: alle 7 Parents bleiben aktiv, keine
  Kindersection aktiviert/deaktiviert.
- **`sort_order` unverändert**.
- **Keine neue Schreib-RPC**.
- **Keine Public-Renderer-/Routen-/Navigation-/Footer-/Breadcrumb-/i18n-Änderung**.
- **Produktdatenbank unberührt**.

## Audit-Ergebnisse vorher → nachher

| Kennzahl | Sprint 2g | Sprint 2h | Δ |
|---|---:|---:|---:|
| D1 `contract_missing` | 0 | 0 | 0 |
| D2 `fields_unknown_to_contract` | 2628 | 2640 | +12 |
| D3 `contract_fields_missing_in_db` | 3654 | 3493 | −161 |
| D4 `whitelist_unknown_to_contract` | 3053 | 3065 | +12 |
| D5 `whitelist_missing_for_contract_field` | 3560 | 3407 | −153 |
| D6 `asset_slot_unknown_to_contract` | 184 | 184 | 0 |
| D7 `contract_asset_slot_missing` | 0 | 0 | 0 |
| D8 `active_without_renderer` | 0 | 0 | 0 |
| **D9 `invalid_parent_child`** | **201** | **143** | **−58** |
| D10 `i18n_or_special_owner_risk` | 17 | 28 | +11 |
| Aktive R2-Hits (`content_v1 → card_v1`) | 88 | 59 | −29 |
| D9-Pattern `content_v1->card_v1` (symmetrisch gezählt) | 176 | 118 | −58 |
| Distinct D9-Beziehungen | 3 | 3 | 0 |

Die kleinen Drift-Verschiebungen in D2/D3/D4/D5/D10 sind erklärbar und
sauber:

- `content_v1` und `cards_v1` haben unterschiedliche, aber überlappende
  Vertragsfelder (beide kennen `label`/`title`; `content_v1` kennt
  zusätzlich `text`, `cards_v1` zusätzlich `intro`). Die 7 Parents
  führen weder `text` noch `intro` als Werte, deshalb ist die
  D2-Verschiebung minimal (~+12) und die D3-/D5-Verschiebung deutlich
  (−161 / −153), weil die contract-Felder pro retyped-Section neu
  gezählt werden.
- D10 (i18n/Special-Owner-Risk) +11: `cards_v1` wird als
  „Spezial-Container" geführt, daher zählt das Audit die 7 Parents jetzt
  in dieser Klasse mit. Inhaltlich kein neues Risiko — nur eine andere
  Klassifikation.

## Audit-Checks

```
npm run cms:audit:contract                  → 15 OK · 6 Warnung · 0 Konflikt
npm run cms:audit:contract-drift            → D1=0 · D8=0 · D9=143
npm run cms:audit:d9                        → 143 (123 aktiv · 20 inaktiv)
npm run cms:audit:d9-relations              → 3 distinct Beziehungen, R2 118 (vorher 176)
npm run cms:audit:renderer-fallback-inventory → 80 Pages, Klassen unverändert
```

`npm run build` läuft über die Lovable-Harness automatisch, wird hier
nicht manuell ausgeführt.

## Geänderte Dateien

- **DB-Migration** (`supabase/migrations/*sprint_2h*`): UPDATE auf 7
  Sections in `public.cms_sections.section_type`.
- **neu**: `docs/04-betrieb/sprint-2h-eine-wahrheit-bericht.md` (dieses
  Dokument).
- **regeneriert**: `docs/04-betrieb/contract-drift-audit-latest.md`,
  `scripts/cms/output/contract-drift-audit-latest.json`,
  `docs/04-betrieb/d9-relations-latest.md`,
  `scripts/cms/output/d9-relations-latest.json`,
  `docs/04-betrieb/sprint-2c-d9-owner-entscheidungen.md` (D9-Owner-Run),
  `docs/04-betrieb/renderer-fallback-inventar-latest.md`.
- **aktualisiert**: `docs/current-status.md` (Sprint-2h-Eintrag).

Keine Änderungen an Renderern, Routen, Navigation, Footer, Breadcrumbs,
i18n-JSONs, Whitelist-Einträgen oder dem Produktkatalog.

## Bestätigung Sprint-Verbote

- Keine Produktdatenbank angefasst.
- Keine Public-Renderer-/Routen-/Navigation-/Footer-/Breadcrumb-/i18n-Änderung.
- Keine Inhalte überschrieben.
- Keine Bilder verändert.
- Keine Feldwerte überschrieben.
- Keine Whitelist-Zeile gelöscht oder deaktiviert.
- Keine neue Schreib-RPC angelegt.
- Keine Spezialseitenmigration durchgeführt (keine Page-Komponente
  betroffen).
- Keine Massenmigration außerhalb der 7 Low-Risk-Seiten.
- Keine Section aktiviert oder deaktiviert.

## Empfohlene nächste Etappe

`cms-light-eine-wahrheit-sprint-2i-r2-gebaeudekommunikation-s2-seiten-1`
— bereichsweise R2-Migration für die 5 Page-Keys aus
`gebaeudekommunikation` (38 aktive Hits), mit Renderer-Beweis pro
Page-Komponente und Owner-Sign-off.
