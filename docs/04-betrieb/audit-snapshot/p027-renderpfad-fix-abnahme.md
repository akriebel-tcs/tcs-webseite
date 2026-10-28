# P027 Renderpfad-Fix — Abnahme (D2.2)

Stand: 2026-06-04
Page: `gebaeudekommunikation.root` (Route `/gebaeudekommunikation`, P027)
Datei: `src/features/gebaeudekommunikation/pages/TuerkommunikationPage.tsx`

## Vorher

Befundliste `AKTIVE_DB_SECTION_OHNE_PUBLIC_RENDERPFAD` enthielt fuer P027:

- `faq` (`faq_v1`)
- `bereiche_intro` (`content_v1`)

Symptom: Im Admin aktivierte FAQ-Section erschien oeffentlich nicht.

## Aenderung

Generischer Rest-Renderer am Seitenende eingefuegt. Doppelrender-Schutz
ueber `handledSectionKeys`-Set:

- `hero` — global ueber CmsPageLayout
- `bereiche_intro` — bereits inline als ContentSection-Kopf der Bereiche
- `anwendungsumfelder` — bereits explizit als cards_v1
- `snipdoo` — bewusst hartcodiert (in DB inaktiv, kein Gegenpart)
- `standard_cta` — global ueber CmsTailCta (SKIP_TYPES: cta_v1)
- alle Section-Keys mit Prefix `bereich_` — bereits als Teaser2ColV1

Damit faellt aktuell nur `faq` (`faq_v1`) durch den Rest-Renderer und
erscheint oeffentlich. Kuenftige neue Standard-Sections werden
automatisch ausgespielt, sobald sie im Admin aktiviert werden.

## Browser-Abnahme

Geprueft im Preview auf `/gebaeudekommunikation`:

1. Seite laedt fehlerfrei, kein Konsolen-Fehler.
2. FAQ-Block „Haeufige Fragen" erscheint nach den Anwendungsumfeldern
   und dem snipdoo-Block, direkt vor dem Projekt-CTA.
3. Kein Doppelrender:
   - Bereiche (Tuersprechanlagen / Briefkastenanlagen / Beschilderung /
     Grossanlagen / Systemloesungen) je einmal sichtbar.
   - Anwendungsumfelder-Kacheln (Pflege / Bildung / Behoerden / Gross)
     je einmal sichtbar.
   - snipdoo-Block einmal sichtbar.
   - CTA „Lassen Sie uns Ihr Projekt gemeinsam planen" einmal sichtbar.
4. Hero / Eyebrow / Headline / Intro unveraendert.

Keine Teststate-Aenderungen vorgenommen — FAQ war bereits durch frueheren
Test-Eingriff aktiv und wurde dabei nicht angefasst.

## Nachher (Audit)

```
node scripts/cms/page-renderer-coverage.mjs
[D1] 80 Page-Dateien, 97 Befunde der Klasse AKTIVE_DB_SECTION_OHNE_PUBLIC_RENDERPFAD.
```

P027 ist aus der Befundliste verschwunden (vorher 101 Befunde, davon 2
fuer `gebaeudekommunikation.root`; jetzt 97 Befunde, 0 fuer
`gebaeudekommunikation.root`). Der Klassifizierer erkennt P027 jetzt als
`generisch_iteration`.

## Ampel P027

Gruen — Spiegel-Regel fuer P027 erfuellt. Globaler Spiegel-Audit bleibt
rot, weil die uebrigen Befunde auf 37 weiteren Seiten noch offen sind
(D3).
