# Renderer-Pfad vs. fachlicher Seitentyp (T-Code)

Stand: 2026-06-05 · Status: aktiv · Quelle: Diagnose-Anzeige im /admin
(PageEditor) + `src/features/admin/lib/rendererPathMap.generated.ts`.

## Worum geht es?

Im Admin werden zwei verschiedene Sichten auf jede Seite angezeigt — sie
gehören zusammen, sind aber **nicht dasselbe**:

| Sicht | Bedeutung | Quelle |
|---|---|---|
| **Fachlicher Seitentyp (T-Code)** | T01, T02, T03, T04, T05, T11, T17, T19. Beschreibt, **was** die Seite redaktionell ist (Startseite, Hauptmenü-Hub, Unterseite, Detail-Seite, Sonderseite). | `cms_pages.page_type`, gemappt über `src/features/admin/lib/pageTypeMatrix.ts`. |
| **Technischer Renderpfad** | Welche React-Komponente die Seite tatsächlich rendert. | `src/features/admin/lib/rendererPathMap.generated.ts`, erzeugt aus `docs/04-betrieb/audit-snapshot/page-renderer-coverage.json` + Routen-Scan. |

**Faustregel:** T-Code = fachlicher Seitentyp. Renderpfad = technische
Umsetzung. Beides darf nicht verwechselt werden. Zwei T03-Seiten können
fachlich identisch aussehen und trotzdem unterschiedliche Renderpfade
haben.

## Renderpfad-Kategorien

| Kategorie | Bedeutung |
|---|---|
| **Standard CMS (GenericCmsPage)** | Seite iteriert vollständig generisch über `cms_sections` — Reihenfolge/Sichtbarkeit aus dem Admin schlagen automatisch durch. |
| **CMS-only Shell** | Renderpfad `CmsOnlyShell` — direkt in `routes.tsx` ohne eigene Page-Datei. Inhalte 1:1 aus der DB. |
| **Produktlösungs-Shell** | Renderpfad `CmsProductSolutionShell` — eigene Renderlogik für T05-Produktlösungen (hero / vorteile / anwendungen / cta). |
| **Eigene Page-Komponente (rendert generisch über DB)** | Page-Datei iteriert selbst über alle Sections via `renderPageSectionByType`. Funktional gleichwertig zu Standard CMS. |
| **Eigene Page-Komponente (gemischt)** | Teilweise generisch, teilweise hartcodierte Sections. |
| **Eigene Page-Komponente** | Klassische React-Seite mit hartcodiertem Aufbau, holt einzelne Felder per `useCmsI18n`. |

## Status-Kategorien

| Status | Bedeutung |
|---|---|
| **Standardisiert** | GenericCmsPage / CMS-only Shell / Produktlösungs-Shell / eigene Komponente mit vollständiger Iteration. |
| **Gemischt** | Eigene Komponente, die nur teilweise über die DB iteriert. |
| **Sonderlogik** | Eigene Page-Komponente mit eigenem Aufbau (z. B. Anwendungen-Detailseiten, Eingangssysteme-Subpages, registrierte Sonderseiten). |

Sonderlogik ist **nicht** automatisch schlecht — viele Seiten brauchen
fachliche Spezialdarstellung. Die Markierung dient nur dazu, technische
Steuerung und Redaktion auf einen Blick erkennen zu lassen, ob eine
Änderung im Admin automatisch durchschlägt oder ob zusätzlich Code-Arbeit
nötig wäre.

## Wo wird das angezeigt?

Im PageEditor (`/admin → Seite auswählen`) direkt unter dem Block
„Seitentyp & Bausteine". Zwei Badges:

1. Technischer Renderpfad (z. B. „Standard CMS (GenericCmsPage)")
2. Status (Standardisiert / Gemischt / Sonderlogik)

Plus ein Code-Hint mit dem internen Key (`generic_cms_page`,
`cms_only_shell`, `product_solution_shell`,
`eigene_komponente_generisch`, `eigene_komponente_teilweise`,
`eigene_komponente`).

## Regenerieren der Tabelle

```bash
node scripts/admin/build-renderer-path-map.mjs
```

Erzeugt `src/features/admin/lib/rendererPathMap.generated.ts` neu aus:

- `docs/04-betrieb/audit-snapshot/page-renderer-coverage.json`
- Pattern-Scan `<CmsOnlyShell pageKey="…">` und
  `<CmsProductSolutionShell pageKey="…">` in `src/**/routes.tsx`

Die Datei ist **read-only Diagnose**, keine zweite Wahrheit über Inhalte,
Reihenfolge oder Sichtbarkeit. Stand-Datum steht im Datei-Header.


## Regel für neue Seiten (Konvergenz-Regel)

Neue CMS-Seiten kommen **ausschließlich als `CmsOnlyShell`** (bzw.
`CmsProductSolutionShell` für T05-Produktlösungen) — direkt in
`src/app/routes.tsx` registriert, **ohne eigene Page-Datei**.

- Keine neuen `GenericCmsPage`-Wrapper.
- Keine neuen eigenen Page-Komponenten unter `src/features/**/pages`,
  außer es ist nachweislich echte Sonderlogik nötig (Status
  „Sonderlogik" im PageEditor — z. B. Eingangssysteme-Detailseiten mit
  fachlicher Spezialdarstellung).
- Bestehende Page-Komponenten mit Status „Standardisiert" werden
  **nicht proaktiv migriert**. Funktional sind sie gleichwertig zur
  Shell; ein flächiger Umbau verstößt gegen den Freeze nach Batch 25
  und bringt keinen Nutzergewinn.

So konvergiert der Bestand über die Zeit auf zwei klare Wege
(Shell für Standard, eigene Komponente nur für Sonderlogik), ohne
Risiko-Refactoring am freeze-reifen CMS-Kern. Auch nach Freeze
verankert in `.lovable/always-follow.md` Abschnitt 4.

