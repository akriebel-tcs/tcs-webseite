# Sprint-Bericht: Body-Inventur Erweiterung

Stand: 2026-06-03 · Scope: nur Review-/Admin-/Tooling-Logik und Doku.
Keine Public-/DB-/i18n-/Navigation-Änderung.

## Ziel

Die Body-Pfad-Map in `knownPageObjectContracts.ts` muss alle echten
DB-first-Render-Pfade kennen, nicht nur `CmsBodyRenderer` / `CmsOnlyShell`.
Ziel: `body = unknown` von **94 → < 20**, ohne falsch grüne Ampeln.

## Ergebnis

| Metrik | vorher | nachher | Delta |
|---|---:|---:|---:|
| Body-Pfad `ok` | 23 / 117 | **101 / 117** | +78 |
| Body-Pfad `unknown` | 94 / 117 | **16 / 117** | −78 |
| FAQ `OK` | 23 | 23 | ±0 |
| CTA `OK` | 30 | **48** | +18 |
| Wahrheits-Check CI | grün | grün | — |
| `renderer-audit --strict` | grün | grün | — |
| `validate-no-fout` | grün | grün | — |

## Was sich am Harvester geändert hat

Datei: `scripts/cms/faq-cta-toggle-inventar.mjs`

Neue Marker pro Datei (`markersOf`):
- `usesCmsPageContent` — matcht `useCmsPageContent` / `usePersonaCms` / `useCmsI18n`
- `iteratesCmsSections` — direkter Zugriff auf `cms.sections`
- `usesDataCmsSection` — JSX-Attribut `data-cms-section`
- `usesGenericRenderers` — Dispatch über `RENDERERS[...]` / `CMS_RENDERERS[...]`
- `cmsProductSolutionShell` — T05-Spezial-Shell

Neue Body-Evidenz-Hierarchie (konservativ, höchste zuerst):
1. `cms-body-renderer` — generischer `CmsBodyRenderer` / `useCmsBody`
2. `cms-only-shell` — `CmsOnlyShell`
3. `cms-product-solution-shell` — T05-Spezial-Shell
4. `generic-renderers-dispatch` — Page nutzt `RENDERERS`/`CMS_RENDERERS`
5. `page-iterates-cms-sections` — Page-eigene Iteration + `data-cms-section`
6. `page-iterates-cms-sections-no-marker` — Page-eigene Iteration ohne Marker

**Wichtig: `CmsPageLayout` allein zählt nicht.** Das beweist nur Hero/Tail-CTA.

Zusätzlich: `findTemplateFile` erkennt jetzt auch `const X = ...` + späteres
`export default X` (vorher nur `export const X` / `export function X`).
Damit greifen Detail-Templates wie `AnwendungDetailPage` für ihre 12+
Page-Wrapper.

## Body-Evidenz-Aufschlüsselung (nachher)

| Evidenz | Seiten |
|---|---:|
| `page-iterates-cms-sections` | 58 |
| `page-iterates-cms-sections-no-marker` | 18 |
| `cms-only-shell` | 17 |
| `cms-body-renderer` | 6 |
| `cms-product-solution-shell` | 2 |
| `none` (kein Body-Beweis) | 2 |
| `no-page-file` (dynamische Slug-Routen) | 14 |

## Verbleibende 16 `unknown` (echte Sonderfälle)

- 12 × `anwendungen.referenzprojekte.*` — dynamischer Slug, kein literaler
  `pageKey` im Code (`ReferenzprojektDetailPage` mit `useParams`).
- `produkte.eingangsloesungen`, `produkte.zutrittskontrolle` — Hub-Seiten
  über dynamische Route.
- `personas.architekt.kopie` — Restbestand-Kopie.
- `service.online-produktkatalog` — externe Sonderseite.

Diese Sonderfälle sind **bewusst gelb**, keine Heuristik-Aufweichung.

## Dokumentation aktualisiert

- `docs/04-betrieb/wahrheits-check.md` — Anerkannte DB-first-Body-Pfade
  explizit aufgelistet, `CmsPageLayout`-Warnung verstärkt.
- `docs/04-betrieb/faq-cta-toggle-inventar.md` — automatisch neu generiert,
  Evidenz-Tabelle ergänzt.

## Gates (lokal)

```
node scripts/cms/wahrheits-check-ci.mjs       → ✅
node scripts/cms/renderer-audit.mjs --strict  → ✅ (7 dokumentierte Ausnahmen)
node scripts/cms/validate-no-fout.mjs         → ✅
```

## Nicht angefasst

- Produktdatenbank (`src/lib/supabase/client.ts`, Produktkatalog/PDP)
- Public Website (Routen, Navigation, Footer, i18n-JSON)
- RPC-Schreibwege, Migrationen
- `KNOWN_PAGE_COMPONENT_READS` (keine `cms.asset`-Änderungen nötig)

## Nächste Schritte

1. `HomePage.tsx` auf `useCmsI18n` heben → 80/80 DB-first im
   `renderer-audit`.
2. `db_dupes` + `section_inactive` Triage (DB-Migration, separat).
3. Pro-Feld-Text-Whitelist je `section_type` für nicht-heuristische grüne
   Text-Ampeln.
