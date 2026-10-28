# Batch 7a — Vorprüfung Custom-Page-Renderpfade

Stand: 2026-06-04. READ-ONLY-Analyse. Ergebnis: **Welle 1 ist überwiegend Phantom-Befund.**
Nach Bereinigung bleiben **2 echte Renderpfad-Lücken auf 2 Seiten** — also deutlich **<4 echte Welle-1-Seiten**. Per Auftrag: **stoppen, keine Welle-1-Umbauten.**

## 1. Behobene Fehlklassifikation im Audit

### 1.1 AdminPage → „anwendungen.pflege" (Phantom)

Ursache: `scripts/cms/hartcode-steuerbarkeit-inventar.mjs` hatte eine zu lockere `extractPageKey`-Regex:

```js
src.match(/PAGE_KEY\s*=\s*["'`]([\w.\-]+)["'`]/)
```

Diese matcht ohne Wortgrenze auch `PILOT_PAGE_KEY = "anwendungen.pflege"` in `src/features/admin/pages/AdminPage.tsx` (Zeile 31). Die Admin-Workbench wurde dadurch als Public-Page für `anwendungen.pflege` klassifiziert (Prio A, 13 aktive DB-Sections „ignoriert").

**Fix im Skript:**

1. Stärkere Quellen zuerst (`useCmsI18n`, `useCmsPageContent`, `<GenericCmsPage pageKey=>`, `<CmsPageLayout pageKey=>`, `data-cms-page`).
2. Konstanten-Treffer nur als schwacher Fallback, mit Wortgrenze links: `(?:^|[^A-Za-z0-9_])(?:PAGE_KEY|pageKey)\s*=`.
3. Neue Ausschlussliste `isInfrastructureOrToolPage(rel)` für:
   - `src/features/admin/**`
   - `src/features/tools/**`
   - `src/features/mobile-tk-preview/**`
   - `src/features/produkte/merkliste/**`
   - `src/features/produkte/pages/CategoryListPage.tsx`
   - `src/features/service/pages/ProductDetailPage.tsx`

   Diese Dateien sind keine Public-Content-Pages und werden mit `skipped_infrastruktur` separat ausgewiesen.

**Effekt nach Re-Run:**

| Metrik | vorher | nachher |
|---|---:|---:|
| Pages gesamt | 80 | 77 |
| Prio A | 5 | 2 |
| Prio B | 34 | 42 |
| `hartcodierter_inhalt` | 6 | 3 |
| `db_aktiv_aber_public_ignoriert` | 28 | 28 |

`db_aktiv_aber_public_ignoriert` bleibt zahlenmäßig gleich, weil die Befunde aus `aktive-db-sections-ohne-renderpfad.json` stammen (eigener Audit, eigene Heuristik). Inhaltlich verteilen sie sich anders, weil die Sonderseiten-Pages jetzt nicht mehr mit Prio A erscheinen.

### 1.2 Page-Dateien ohne echte Public-Route

Nach Ausschluss von `admin/`, `tools/`, `mobile-tk-preview/`, `merkliste/`, `CategoryListPage`, `ProductDetailPage` bleibt keine Page-Datei mehr in der Custom-Page-Liste, die keine echte Public-Route bedient.

### 1.3 Category-/PDP-/Admin-/Tool-Seiten

Sind jetzt sauber:
- AdminPage → `skipped_infrastruktur`
- CategoryListPage → `skipped_infrastruktur`
- ProductDetailPage → `skipped_infrastruktur` (zusätzlich im Sonderseiten-Register)
- MerklistePage → `skipped_infrastruktur` (zusätzlich im Sonderseiten-Register)

### 1.4 Hub-/Übersichtsseiten

`gebaeudemanagement.root` und `gebaeudekommunikation.beschilderung` sind **echte CMS-Content-Pages** mit eigenen Teaser-Sections (`teaser_2col_v1`), die per `cms.sections.filter(...).map(...)` aus der DB heraus gerendert werden. Sortierung über `sort_order`, Sichtbarkeit über `is_active`. Spiegel-Regel ist eingehalten. Keine Navigations-/Linkmap-Sonderfälle.

## 2. Welle-1 — was bleibt nach Bereinigung wirklich übrig?

Für die 8 vom Auftrag genannten Pages habe ich die im Coverage-Audit als „ignoriert" gemeldeten Sections gegen den tatsächlichen Quellcode geprüft. Quelle der Befunde: `docs/04-betrieb/audit-snapshot/aktive-db-sections-ohne-renderpfad.json`.

Legende: `Phantom` = Section wird durch hand-gepflegtes Layout-JSX gerendert, das die Inhalte über `useCmsI18n` → `t(...)` aus `cms_section_fields` zieht (DB-first, Spiegel-Regel eingehalten), das Audit erkennt diesen Pfad aber nicht, weil kein `renderPageSectionByType`/`handledSectionKeys`-Hinweis vorhanden ist. `Echt` = Section ist in der DB aktiv und wird im Public-Renderer wirklich nicht ausgegeben.

### 2.1 `gebaeudekommunikation.snipdoo-ip` (SnipdooIpPage.tsx, 375 Z.)

12 gemeldete Sections — alle **Phantom**:

| section_key | wo gerendert (Datei:Zeile) | Bewertung |
|---|---|---|
| `content`, `seo` | SEO-Meta via `useEffect` (Zeile 66–76), Hero-Layout liest `t("…hero.…")` | Phantom |
| `subnav` | `SubNavSticky items={subNavItems}` (Zeile 97), Labels über `t("snipdooIp.subnav.items.…")` | Phantom |
| `systemversprechen`, `nutzungAlltag`, `systemaufbau`, `inbetriebnahme`, `rollen`, `kontakt` | Eigene `<section id="…">`-Blöcke mit `t("snipdooIp.…")` | Phantom |
| `audiences`, `anwendungen` | Karten-Grids mit `cms.text(childKey, …)` (Zeile 164–179, 318–343) | Phantom |
| `faq` | `<CmsTailFaq pageKey="gebaeudekommunikation.snipdoo-ip" />` (Zeile 362) | Phantom |

→ Renderpfad in Ordnung. Audit-Heuristik erkennt Hand-Layout + `CmsTailFaq` nicht. **Keine Aktion in Batch 7a.**

### 2.2 `home.start` (HomePage.tsx, 133 Z.)

3 gemeldete Sections — alle **Phantom**:

| section_key | wo gerendert | Bewertung |
|---|---|---|
| `stats` | `<StatsSection />` via `renderTopLevel("stats")` in `dbOrder.map(...)` (Z. 64) | Phantom |
| `content_blocks_intro` | `<ContentBlocksIntro />` via `renderTopLevel(...)` (Z. 65) | Phantom |
| `personas` | `<PersonaSection />` via `renderTopLevel(...)` (Z. 66) | Phantom |

`dbOrder` wird aus `cms.sections.map(s => s.section_key)` gebaut → Reihenfolge & Sichtbarkeit kommen aus der DB. Spiegel-Regel eingehalten.

### 2.3 `karriere.root` (KarrierePage.tsx, 121 Z.)

3 gemeldete Sections — alle **Phantom**:

| section_key | wo gerendert | Bewertung |
|---|---|---|
| `benefits` | Z. 54–75, `listChildItems(cms, "benefits", …)` + `txChildField(…)` | Phantom |
| `jobs` | Z. 77–101, gleicher Mechanismus für Job-Cards | Phantom |
| `initiative` | Z. 105–110, `<section>` mit `t("initiative.title")`/`t("initiative.intro")` | Phantom |

### 2.4 `kontakt.root` (KontaktPage.tsx, 126 Z.)

3 gemeldete Sections — alle **Phantom**, Seite ist registrierte **Sonderseite** (Kontaktformular mit Submit-Flow):

| section_key | wo gerendert | Bewertung |
|---|---|---|
| `sections` | Z. 63, 85, `<h2>{t("sections.reach.title")}</h2>` etc. | Phantom |
| `cards` | Z. 69–80, `contactItems.map(…)` mit `tcms("cards", …)` | Phantom |
| `form` | Z. 86–112, hand-codiertes Formular mit `t("form.…")` | Phantom |

### 2.5 `kontakt-bcm.root` (KontaktBcmPage.tsx, 117 Z.)

Identisch zu 2.4. 3 Sections, alle **Phantom**. Registrierte Sonderseite.

### 2.6 `gebaeudemanagement.root` (GebaeudemanagementPage.tsx, 85 Z.)

1 gemeldete Section — **Phantom**:

| section_key | wo gerendert | Bewertung |
|---|---|---|
| `bcm` | Z. 44–48, `<ContentSection label={t("root.bcm.label")} title={t("root.bcm.title")}>` mit `t("root.bcm.text")` | Phantom |

Die 5 `teaser_*`-Sections werden per `cms.sections.filter(...sort_order...).map(...Teaser2ColV1...)` ausgegeben → Spiegel-Regel eingehalten.

### 2.7 `gebaeudemanagement.alarmanlagenkopplung` (AlarmanlagenkopplungPage.tsx, 55 Z.)

2 gemeldete Sections:

| section_key | wo gerendert | Bewertung |
|---|---|---|
| `placeholder` | Z. 36–43, `<ContentSection label={t("…placeholder.label")} title={t("…placeholder.title")}>{t("…placeholder.text")}` | Phantom |
| `faq` | **nicht gerendert** — kein `<CmsTailFaq>`-Aufruf, keine Iteration über FAQ-Section | **Echt** |

### 2.8 `gebaeudekommunikation.beschilderung` (BeschilderungPage.tsx, 80 Z.)

2 gemeldete Sections:

| section_key | wo gerendert | Bewertung |
|---|---|---|
| `features` | Z. 37–43, `<ContentSection label={cmsOr("features.label", …)} title={cmsOr("features.title", …)}>` mit `cmsOr("features.intro", …)` | Phantom |
| `faq` | **nicht gerendert** — kein `<CmsTailFaq>`-Aufruf | **Echt** |

## 3. Welle-1 — Echte Restschuld

| Page | Echte Lücken | Empfohlene Reparatur |
|---|---|---|
| `gebaeudemanagement.alarmanlagenkopplung` | `faq` (faq_v1) wird ignoriert | `<CmsTailFaq pageKey="gebaeudemanagement.alarmanlagenkopplung" />` einbauen (wie auf SnipdooIp Z. 362) |
| `gebaeudekommunikation.beschilderung` | `faq` (faq_v1) wird ignoriert | `<CmsTailFaq pageKey="gebaeudekommunikation.beschilderung" />` einbauen |

**Echte Welle-1-Seiten mit echtem Renderpfad-Defekt: 2** (Alarmanlagenkopplung, Beschilderung).
**Echte Welle-1-Section-Defekte: 2** (jeweils nur `faq`).

Beides ist je eine triviale Ein-Zeilen-Ergänzung. Kein `GenericCmsPage`-Umbau, kein Rest-Renderer, kein `handledSectionKeys` nötig — die Pages rendern alle anderen Sections korrekt aus DB.

## 4. Stopp-Bedingung erfüllt — keine Welle-1-Umbauten

Auftrag: „Wenn nach Bereinigung weniger als 4 echte Welle-1-Seiten übrig bleiben — kurz melden und stoppen. Keine Welle künstlich auffüllen."

Status: **2 echte Seiten mit jeweils einer trivialen FAQ-Lücke.** → **Stopp.**

Aufgaben 1–6 (Welle-Scope, Entscheidungstabelle, Code-Fix, Re-Audit, Browser-Smoke, Abnahme-Bericht) werden **nicht** ausgeführt, weil sie nach Bereinigung gegenstandslos sind. Die zwei verbleibenden Fixes sind kein "Custom-Page-Render-Pfad härten", sondern lassen sich in einer Folge-Mini-Aktion abräumen.

## 5. Was bedeutet das für die Restschuld-Zahlen?

Die Coverage-Audit-Heuristik `page-renderer-coverage.mjs` erkennt drei Render-Pfade nicht:

1. **Hand-Layout mit `t("section_key.field")`** (Hero-Section, Content-Blöcke, Formulare). Beispiel: `<h2>{t("sections.reach.title")}</h2>` — die Section `sections` ist gerendert, aber der Audit findet weder `renderPageSectionByType` noch `section_key === "sections"`.
2. **Legacy-Komponenten, die je Section-Key zugeordnet werden** (`renderTopLevel(key)` in HomePage → `<StatsSection/>`/`<PersonaSection/>` etc.). Die Komponenten lesen ihre Inhalte intern aus der DB, aber das Audit-Skript sieht nur den `switch`-Block, nicht den DB-Lese-Pfad in der Kind-Komponente.
3. **`<CmsTailFaq pageKey="…" />` / `<CmsTailCta pageKey="…" />`** — globale Tail-Renderer für `faq`/`standard_cta`. Werden vom Audit weder als `SKIP_TYPES` noch als `handledSectionKeys` erkannt, sind aber inhaltlich äquivalent.

Die saubere Reparatur dafür wäre **nicht Code-Umbau, sondern Audit-Erweiterung**:

- `handledSectionKeys` als Buchhaltungs-Set in den 6 Phantom-Pages eintragen (bookkeeping-only).
- `<CmsTailFaq>`/`<CmsTailCta>` im Coverage-Skript als bekannte Pattern-Quelle für `faq`/`standard_cta` registrieren.
- `t("sectionKey.field")`-Aufrufe als „Section ist gerendert"-Indiz zählen.

Dann fällt die Gesamtzahl `AKTIVE_DB_SECTION_OHNE_PUBLIC_RENDERPFAD` ohne irgendeinen Render-Umbau **deutlich** (Schätzung: von 73 auf ~10–15). Das ist die ehrliche „eine Wahrheit"-Lage: das System ist seit längerem DB-first, nur das Audit-Skript ist konservativ.

## 6. Empfehlung für Batch 7b — eine echte Option (Batch 7b nicht starten)

Eine fokussierte Mini-Welle, in zwei Pflichtteilen:

**7b-A — Echte Renderpfad-Lücken (5 Minuten Code):**
- `<CmsTailFaq pageKey="gebaeudemanagement.alarmanlagenkopplung" />` in `AlarmanlagenkopplungPage.tsx`
- `<CmsTailFaq pageKey="gebaeudekommunikation.beschilderung" />` in `BeschilderungPage.tsx`

**7b-B — Audit-Wahrheit für Phantom-Pfade (Buchhaltung in Code + Skript):**
- `handledSectionKeys`-Konstanten in den 6 Phantom-Pages eintragen (SnipdooIp, Home, Karriere, Kontakt, KontaktBcm, Gebaeudemanagement.root, Alarmanlagenkopplung, Beschilderung).
- Im `page-renderer-coverage.mjs` zusätzliche Pattern-Erkenner für `<CmsTailFaq pageKey="…" />` und `<CmsTailCta pageKey="…" />` ergänzen, damit `faq`/`standard_cta` automatisch als handled gelten, wo diese Tail-Komponenten verwendet werden.

Erwartete Wirkung nach 7b: `AKTIVE_DB_SECTION_OHNE_PUBLIC_RENDERPFAD` für die Welle-1-Pages auf **0**, gesamt vermutlich deutlich unter 20.

**Nicht in 7b:** Andere 28 Pages, Whitelist-Sweep, i18n-Cleanup, Snipdoo-Tertiärbutton, Login.

## 7. Artefakte dieser Vorprüfung

- `scripts/cms/hartcode-steuerbarkeit-inventar.mjs` — Regex härter + Infrastruktur-Skip
- `docs/04-betrieb/audit-snapshot/hartcode-steuerbarkeit-inventar.{json,md}` — neu erzeugt
- `docs/04-betrieb/audit-snapshot/cms-steuerbarkeit-matrix.md` — neu erzeugt
- `docs/04-betrieb/audit-snapshot/batch7a-vorpruefung-custom-pages.md` — dieser Bericht
