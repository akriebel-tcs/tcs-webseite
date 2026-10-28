# Batch 14 — Admin-Schalter ohne Public-Wirkung · Welle 1 · Abnahme

Stand: 2026-06-04.

## Ergebnis Heuristik-Vorprüfung

Die Zahl `30` aus `admin_schalter_ohne_public_wirkung` war eine Konflation aus echten Schalterbrüchen (`gelb_medium`, 32 Befunde / 12 Page-Keys) und i18n-Restschuld (`gelb_restschuld`, 33 Befunde / 13 Page-Keys). Die Heuristik in `scripts/cms/hartcode-steuerbarkeit-inventar.mjs` summierte beides in `publicBlocksWarn`. Details: `batch14-admin-schalter-vorpruefung.md`.

Heuristik geschärft:

- `publicBlocksMedium` → `admin_schalter_ohne_public_wirkung`
- `publicBlocksHigh`   → `admin_schalter_ohne_public_wirkung` (Spiegelbruch)
- `publicBlocksRestschuld` → eigene Kategorie `public_ohne_admin_pflege`

## Welle-1-Auswahl

4 risikoarme Pages (Begründung siehe `batch14-admin-schalter-welle1-entscheidung.md`):

| Page | section_key | Datei |
|---|---|---|
| `gebaeudemanagement.alarmanlagenkopplung` | `placeholder` | `AlarmanlagenkopplungPage.tsx` |
| `gebaeudekommunikation.beschilderung` | `features` | `BeschilderungPage.tsx` |
| `gebaeudemanagement.root` | `bcm` | `GebaeudemanagementPage.tsx` |
| `presse.root` | `releases` | `PressePage.tsx` |

Bewusst **nicht** geändert: 7× zutrittskontrolle.* Hero-Findings (Hero ohne CmsPageLayout, hohes Layout-Risiko), SnipdooIpPage / TuersprechanlagenPage / TuerkommunikationPage / SystemloesungenPage / DownloadsPage / PlanenKonfigurierenPage / ServicePage (zu groß bzw. unklare Section-Semantik) — Kandidaten für Welle 2.

## Patch-Muster

Pro Page eine einzeilige Helper-Variable plus JSX-Wrapper:

```ts
const xxxActive = cms.sections.some(s => !s.parent_section_key && s.section_key === "xxx");
// …
{xxxActive && (<section …>…</section>)}
```

`cms.sections` ist hookseitig bereits `is_active=true`-vorgefiltert (RLS + `.eq("is_active", true)`), daher kein zusätzliches `&& s.is_active`. Das Single-Line-Format ohne `(s) =>` ist nötig, damit `public-blocks-ignorieren-admin-visibility.mjs::hasGate()` (Regex `[^)]*`) das Gate erkennt.

## Vorher / Nachher

| Kennzahl | vor Batch 14 | nach Schärfung | nach Welle 1 |
|---|---:|---:|---:|
| `admin_schalter_ohne_public_wirkung` (Pages) | 30 | 18 | **14** |
| `public_ohne_admin_pflege` (Pages) | 0 | 13 | **13** |
| public-blocks `gelb_medium` (Befunde) | 32 | 32 | **28** |
| public-blocks `gelb_medium` (Page-Keys) | 12 | 12 | **8** |
| public-blocks `gelb_restschuld` (Befunde) | 33 | 33 | 33 |
| public-blocks `rot_high_blocker` | 0 | 0 | **0** |
| `db_aktiv_aber_public_ignoriert` | 3 | 3 | **3** (Serviceportal/Login) |
| Coverage Befunde | 3 | 3 | **3** (Serviceportal/Login) |
| Globaler Spiegel-Audit | 0 | 0 | **0** |
| Wahrheits-Check Kritisch | 0 | 0 | **0** |
| FAQ/CTA orphan/mixed/dedup-only | 0/0/0 | 0/0/0 | **0/0/0** |
| FAQ OK / „—" | 82 / 27 | 82 / 27 | 82 / 27 |
| CTA OK | 109 | 109 | 109 |

Exakt die 4 gepatchten Pages sind aus `gelb_medium` herausgefallen und nach `grau_vermutlich_gegated` gewandert. Kein neuer Klasse-A-/High-/Rot-Befund.

## Browser-Smoke / statischer Nachweis

Live-Toggle-Test der Sections via Admin lokal nicht durchgeführt (würde DB-Schreibwege nutzen, die in der Prototyp-Phase reversibel sein müssten — Vorgehen: lieber statischer Nachweis, dann später dedizierter Admin-Test in Auth-Etappe).

Statischer Nachweis für jede geänderte Page:

| Page | Section-Gate-Zeile | JSX-Wrap |
|---|---|---|
| AlarmanlagenkopplungPage | `placeholderActive = cms.sections.some(s => … "placeholder")` | `{placeholderActive && (<section …>…</section>)}` |
| BeschilderungPage | `featuresActive = cms.sections.some(s => … "features")` | `{featuresActive && (<ContentSection …>…</ContentSection>)}` |
| GebaeudemanagementPage | `bcmActive = cms.sections.some(s => … "bcm")` | `{bcmActive && (<ContentSection …>…</ContentSection>)}` |
| PressePage | `releasesActive = cms.sections.some(s => … "releases")` | `{releasesActive && (<section data-cms-section="releases">…</section>)}` |

`useCmsPageContent` lädt nur `cms_sections` mit `is_active=true`. Setzt der Admin `is_active=false` für die jeweilige Section, fällt sie aus `cms.sections` heraus → Gate ist `false` → Block wird nicht gerendert. Setzt er wieder `is_active=true`, kommt der Block zurück. Inhalte ändern sich dabei nicht (Texte bleiben i18n-/`cmsOr`-getrieben).

Audit-seitig bestätigt: `public-blocks` zählt für diese 4 Pages keine `gelb_medium`-Befunde mehr.

## Was bleibt übrig

- **14 Pages** mit `admin_schalter_ohne_public_wirkung` (= 28 echte `gelb_medium`-Befunde):
  - 7 Hero-Findings in handgebauten zutrittskontrolle.*-Layouts (Hero ohne CmsPageLayout)
  - 1 großer Block (SnipdooIpPage, 10 Befunde)
  - 6 weitere mittlere Pages
- **13 Pages** `public_ohne_admin_pflege` (i18n ohne DB-Section, 33 Befunde) — eigener Track.
- **3 Coverage-Befunde** Serviceportal/Login — geparkt bis Auth-Etappe.
- **2 Klasse-A** Marketing-Pages mit Hartcode-Anteil — separater Track.

## Empfehlung Batch 15 (nicht starten)

Welle 2 der Schalterbruch-Bereinigung: 4–6 mittlere Pages mit klar abgrenzbaren Sections, ohne Hero-Touch. Konkrete Kandidaten:

- `service.downloads` / `quickLinks` (cards_v1)
- `gebaeudekommunikation.systemloesungen` / `vorteile` + `fachplanung` (cards_v1)
- `gebaeudekommunikation.root` / `anwendungsumfelder` (cards_v1)
- `gebaeudekommunikation.tuersprechanlagen` / `vorteile` (feature_grid_v1) — nur dieser Befund, nicht `anwendungsumfelder` (Cards-Cluster, separat prüfen)
- `gebaeudekommunikation.snipdoo-ip`: zuerst auswerten, ob die 10 Befunde wirklich 10 fachliche Sections sind oder im Wesentlichen Hero + Subnav-Layout; bei Layout-Anteil als „Sonderfall" markieren statt Gate-Wrap.

Hero-Gating in handgebauten zutrittskontrolle.*-Pages: erst **nach** Welle 2 angehen — entweder als eigenständige Welle „handgebaute Hero-Pages auf CmsPageLayout heben" oder, falls fachlich nicht gewünscht, im Audit als „Sonderfall: Hero in Custom-Layout" markieren.
