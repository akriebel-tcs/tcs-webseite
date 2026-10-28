# Sprint „card_v1 Abschluss — Masterkarte überall durchsetzen"

Stand: 2026-06-03

## Ziel

`card_v1` als einzige Standardkarte. Jede Karte trägt denselben
Funktionsumfang (Bild · Icon · Eyebrow · Titel · Beschreibung ·
Bullets · Chips · Links 1..3) und ist überall ein-/ausschaltbar.
Container ordnet nur an, reduziert keine Module.

## Was geliefert wurde

### Gate (rot bei Verstoß)

`scripts/cms/card-renderer-paritaet.mjs` — statischer Audit, prüft
offline drei Verstoßklassen:

- **V1_DIRECT_FIELD_READ** — Toggle-Felder (`icon_enabled`,
  `link_N_enabled`) werden direkt aus einer Section gelesen, statt
  durch den Resolver zu gehen.
- **V2_ICON_WITHOUT_TOGGLE** — `resolveIcon(...)` wird ohne
  `iconVisible`-/`isCardIconVisible`-Schutz aufgerufen. Folge:
  `icon_enabled=0` wirkt im Public-Renderer nicht.
- **V3_CENTRAL_MISSING_MODULE** — ein zentraler Renderer
  (CardsSectionV1, ProductScrollerV1, FeatureGridV1) rendert ein
  Modul nicht, obwohl die Matrix es unterstützt.

Output: `scripts/cms/output/card-renderer-paritaet-latest.json`.

CI-Anbindung in `.github/workflows/cms-audit.yml` als eigener Schritt
`card_v1 Renderer-Parität (Gate)`. Aktuell mit `continue-on-error:
true`, damit der Restbestand sichtbar bleibt, ohne andere Gates zu
blockieren. **Sobald V2 auf 0 ist, muss `continue-on-error` entfernt
werden.**

### V3 — zentrale Renderer auf Matrix gehoben

- **ProductScrollerV1**: rendert jetzt zusätzlich `icon` (Lucide) und
  `icon_image` — beide Container-aware über `resolveCardRuntime`.
  Reihenfolge: Bild > Icon-Image > Lucide-Icon.
- **FeatureGridV1**: rendert jetzt `eyebrow`, `image`, `bullets`,
  `chips`, `links 1..3` zusätzlich zum Icon. Volle Matrix-Parität.
- **CardsSectionV1**: rendert jetzt `link_1..3` (über
  `vis.linksVisible`) zusätzlich zum Legacy `cta_label`/`cta_href`.

### Helper für lokale Renderer

`src/features/cms/lib/cardVisibility.ts` exportiert neu:

- `isCardIconVisible(cms, sectionKey, locale)` → `{ visible, name }`.
- `resolveCardIcon(cms, sectionKey, locale, resolveIconFn, fallback)` →
  `LucideIcon | null`. Toggle-bewusster Wrapper um `resolveIcon`.
  Back-Compat: wenn kein DB-Icon gepflegt ist, bleibt der Code-Fallback
  sichtbar.

Migrationsmuster pro Page-Renderer:

```diff
- const Icon = resolveIcon(iconName, fb.icon);
+ const Icon = resolveCardIcon(cms, sectionKey, loc, resolveIcon, fb.icon);
…
- <Icon …/>
+ {Icon && <Icon …/>}
```

### Beispielmigrationen (V2-Fixes umgesetzt)

- `src/features/home/pages/UeberTCSPage.tsx` (2 Stellen — Values,
  Manufacturing)
- `src/features/gebaeudekommunikation/pages/GrossanlagenPage.tsx`
  (2 Stellen — Anforderungen, Wirtschaftlichkeit)

## Restbestand (Stand 2026-06-03)

Gate zeigt **36 V2-Verstöße** in folgenden Files. Jeder Treffer ist
ein lokaler Page-Renderer, der `resolveIcon(...)` ohne
`isCardIconVisible`-Schutz aufruft. Migration jeweils nach obigem
Muster — 2 Zeilen pro Aufruf plus 1 Import.

| Datei | Stellen |
|---|---|
| `anwendungen/components/AnwendungDetailPage.tsx` | 1 |
| `anwendungen/pages/AnwendungenPage.tsx` | 2 |
| `anwendungen/pages/BildungseinrichtungenPage.tsx` | 1 |
| `anwendungen/pages/GesundheitseinrichtungenPage.tsx` | 1 |
| `anwendungen/pages/ObjektloesungenPage.tsx` | 1 |
| `anwendungen/pages/OeffentlicheHandPage.tsx` | 1 |
| `gebaeudekommunikation/pages/BriefkastenanlagenPage.tsx` | 2 |
| `gebaeudekommunikation/pages/SystemloesungenPage.tsx` | 1 |
| `gebaeudemanagement/pages/DigitalSignagePage.tsx` | 1 |
| `gebaeudemanagement/pages/DigitaleNamensanzeigePage.tsx` | 1 |
| `gebaeudemanagement/pages/ReservierenBuchenPage.tsx` | 1 |
| `gebaeudemanagement/pages/SchraenkeBehaelterPage.tsx` | 1 |
| `service/pages/DownloadsPage.tsx` | 4 |
| `service/pages/TechnischerSupportPage.tsx` | 3 |
| `zutrittskontrolle/pages/BcmHandsenderPage.tsx` | 2 |
| weitere (siehe JSON-Output) | ~14 |

**Blocker-Status:** das sind echte Toggle-Bugs. In jeder dieser
Karten wirkt `icon_enabled=0` aktuell NICHT im Public-Renderer. Die
Migration ist mechanisch (Muster oben), aber file-by-file.

## Whitelist

Im laufenden Sprint wurde noch keine Whitelist-Backfill-Migration für
`icon_enabled` über alle aktiven `card_v1`-Sections geschrieben. B-538
ist whitelisted (vorheriger Sprint). Folge-Etappe: Migration, die für
jede aktive `card_v1` mit gesetztem `icon` automatisch
`icon_enabled` (de+en, is_enabled=true) in
`cms_admin_editable_fields` einfügt (ON CONFLICT DO NOTHING).

## Nächste Schritte

1. 36 V2-Verstöße migrieren (Muster oben). Aufwand ~2 Zeilen pro
   Aufruf, Risiko niedrig.
2. Wenn Gate grün: `continue-on-error: true` aus
   `.github/workflows/cms-audit.yml` entfernen — danach blockt jeder
   neue Verstoß automatisch.
3. Whitelist-Backfill-Migration für `icon_enabled`.
4. E2E-Vertragsskript (`scripts/cms/e2e-vertrag.mjs`) um je eine
   Pflichtkarte pro Renderer-Pfad ergänzen (heute v. a. B-538/583/
   1177/2002 — also Pages mit zentralen Renderern).

## Akzeptanz — aktueller Stand

- [x] Gate-Skript existiert und ist scharf.
- [x] V3 (zentrale Renderer): grün (7 → 0).
- [x] B-538 Referenz bleibt grün (vorheriger Sprint).
- [x] Helper `isCardIconVisible` / `resolveCardIcon` exportiert.
- [x] 4 V2-Verstöße migriert (UeberTCS ×2, Grossanlagen ×2).
- [ ] **36 V2-Verstöße offen** — siehe Liste oben.
- [ ] Whitelist-Backfill-Migration ausstehend.
- [ ] CI-Gate scharf (continue-on-error noch true).

Ehrlich: der Abschluss ist begonnen, nicht fertig. Die Infrastruktur
steht (Gate, Helper, zentrale Renderer vollständig), die Mechanik der
Page-Migration ist klein und wiederholbar — aber sie ist noch nicht
durch alle 16 Pages durchgelaufen.
