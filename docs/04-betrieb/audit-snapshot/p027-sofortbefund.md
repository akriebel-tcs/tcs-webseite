# P027 Sofortbefund (D0)

Stand: 2026-06-04
Befundklasse: `AKTIVE_DB_SECTION_OHNE_PUBLIC_RENDERPFAD`

## Symptom

Im Admin auf Seite `P027 Gebaeudekommunikation` (`gebaeudekommunikation.root`)
wurde die FAQ-Section (`section_key=faq`, `section_type=faq_v1`) aktiv
geschaltet. Die DB liefert sie ueber RLS sauber aus, der Admin zeigt sie als
„aktiv". Auf der oeffentlichen Seite erscheint sie trotzdem nicht.
Die `standard_cta` einer Vergleichsseite erscheint dagegen, weil sie nicht
ueber den Body-Renderer, sondern global ueber `<CmsTailCta>` in `PageLayout`
ausgespielt wird (siehe `SKIP_TYPES = {hero_v1, cta_v1}` in
`src/features/cms/components/CmsBodyRenderer.tsx`).

## Ursache

`src/features/gebaeudekommunikation/pages/TuerkommunikationPage.tsx`
ruft `renderPageSectionByType` ausschliesslich fuer ausgewaehlte
section_keys/section_types auf:

- `hero` (ueber `CmsPageLayout` → global)
- `teaser_2col_v1` mit `section_key.startsWith("bereich_")`
- `cards_v1` mit `section_key === "anwendungsumfelder"`
- hart kodierter `snipdoo`-Block (kein DB-Gegenpart)

Alle weiteren aktiven Top-Level-Sections der Seite werden ignoriert,
darunter konkret:

- `gebaeudekommunikation.root/faq` (`faq_v1`)
- `gebaeudekommunikation.root/bereiche_intro` (`content_v1`)

Beleg: `docs/04-betrieb/audit-snapshot/aktive-db-sections-ohne-renderpfad.md`.

## Klassifikation

Das ist kein Einzelfehler im FAQ-Renderer und kein DB-/Whitelist-Problem.
Es ist eine **strukturelle Luecke in den Page-Dateien**: hart codierte
Page-Komponenten koennen aktive CMS-Sections stillschweigend
verschlucken, ohne dass eines unserer bestehenden Gates anschlaegt
(Whitelist, Standardbaustein-Vertrag, Admin-Anzeige-Spiegel, globaler
Spiegel-Audit pruefen alle die Kette DB → Whitelist → Admin → Renderer-
Registry, aber **nicht** den Aufruf in der konkreten Page-Datei).

Daher ist P027 nicht isoliert zu flicken, sondern ist der **Musterfall**
fuer eine neue Befundklasse `AKTIVE_DB_SECTION_OHNE_PUBLIC_RENDERPFAD`
und ein neues Pflicht-Gate (siehe Teil D4).

## Naechste Schritte (geplant)

- D1: globales Renderpfad-Inventar (erledigt — `page-renderer-coverage.{md,json}`,
  `aktive-db-sections-ohne-renderpfad.{md,json}`).
- D2: P027 mustergueltig beheben — generischen Rest-Renderer ergaenzen,
  ohne bestehende Spezialbloecke doppelt zu rendern.
- D3: gleiche Luecke fuer weitere betroffene Seiten beheben oder als
  Sonderfall registrieren — keine stillen Ausnahmen.
- D4: neues Gate im globalen Spiegel-Audit.
- D5/D6: Browser-Abnahme und Abschlussbericht.
