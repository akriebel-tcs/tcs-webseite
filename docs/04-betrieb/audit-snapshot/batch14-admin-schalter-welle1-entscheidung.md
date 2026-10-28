# Batch 14 — Welle-1-Entscheidung

Stand: 2026-06-04. Auswahl auf Basis von `batch14-admin-schalter-vorpruefung.md`.

## Welle-1-Pages (4)

| Page | section_key | section_type | LOC | Begründung |
|---|---|---|---:|---|
| `gebaeudemanagement.alarmanlagenkopplung` | `placeholder` | content_v1 | 57 | Mini-Page, single hardcoded ContentSection unter CmsPageLayout |
| `gebaeudekommunikation.beschilderung` | `features` | content_v1 | 82 | Klar abgegrenzter Features-Block unter CmsPageLayout |
| `gebaeudemanagement.root` | `bcm` | content_v1 | 85 | Eindeutiger Header-Block vor Teaser-Loop |
| `presse.root` | `releases` | cards_v1 | 127 | `<section data-cms-section="releases">` schon vorhanden, klare Klammer |

## Bewusst nicht in Welle 1

- **ServicePage** (`sections`): `sections` ist im Code eher struktureller Wrapper (`sectionsMeta.map`) — Bedeutung der gleichnamigen DB-Section unklar, eigene Klärung nötig.
- **DownloadsPage**, **PlanenKonfigurierenPage**, **SystemloesungenPage**, **TuersprechanlagenPage**, **TuerkommunikationPage**, **SnipdooIpPage**: ≥180 LOC, mehrere verschachtelte Blöcke; eigene Welle (Welle 2).
- **7× zutrittskontrolle.*** (Hero-Findings): Hero in handgebauten Layouts ohne CmsPageLayout. Hero-Gate würde Page-Topologie ändern. Separater Track.
- **funktionen.* / referenzprojekte / serviceportal.* / eingangssysteme.root / gebaeudemanagement.root (Restschuld)**: keine `gelb_medium`-Befunde, sondern `gelb_restschuld` — gehören in „public_ohne_admin_pflege"-Track, nicht in Schalterbruch-Welle.

## Pattern für den Mini-Fix

Pro Page wird eine einzeilige Helper-Variable eingeführt:

```ts
const xxxActive = cms.sections.some(s => !s.parent_section_key && s.section_key === "xxx");
```

Und der entsprechende JSX-Block wird in `{xxxActive && (…)}` gewrappt. Keine Inhaltsänderung, keine Layout-Änderung, keine zusätzliche Section-Lade-Logik (`cms.sections` ist hookseitig bereits `is_active=true`-vorgefiltert).

Diese Form ist exakt das Muster, das `public-blocks-ignorieren-admin-visibility.mjs::hasGate()` als gültiges Visibility-Gate erkennt — der Befund wandert nach dem Patch von `gelb_medium` nach `grau_vermutlich_gegated`.
