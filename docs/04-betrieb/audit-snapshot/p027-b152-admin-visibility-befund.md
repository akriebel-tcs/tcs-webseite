# P027 / B-152 snipdoo — Admin-Visibility-Befund (D2b.1)

Stand: 2026-06-04
Page: `gebaeudekommunikation.root` (Route `/gebaeudekommunikation`, P027)
Section: B-152 / `snipdoo` (section_type `content_v1`, sort_order 40)
Datei: `src/features/gebaeudekommunikation/pages/TuerkommunikationPage.tsx`

## Symptom

Im Admin (`/admin`, Bearbeite: Gebaeudekommunikation #027) ist die
Section `snipdoo` als „Ausgeblendet" markiert. Im Navigations-Baum trägt
B-152 den Status `Ausgeblendet`, im Arbeitsbereich steht der
Sichtbar-Schalter auf aus.

Auf der öffentlichen Seite `/gebaeudekommunikation` erscheint der Block
„snipdoo® System / Türkommunikation in IP-Netzwerken — einfach und
zukunftssicher" trotzdem vollständig (Header, IP-Plattform-Karte,
Zielgruppen-Spalte).

## DB-Status (Belegt per `cms_sections`)

```
page_key=gebaeudekommunikation.root  section_key=snipdoo
section_type=content_v1  sort_order=40  is_active=false
```

Die Section existiert, ist aber deaktiviert. Admin-Anzeige ist korrekt.

## Ursache

In `TuerkommunikationPage.tsx` (Zeilen ~98–130) wird der snipdoo-Block
hartcodiert über `<ContentSection>` + `t("root.snipdoo.…")` aus
i18n/CMS-Feldern gerendert — unabhaengig vom Wert von
`cms_sections.is_active` für `snipdoo`.

Zusaetzlich steht `snipdoo` in der `handledSectionKeys`-Whitelist des
Rest-Renderers (Zeile 159) mit dem Kommentar „bewusst hartcodierter
Block ohne DB-Gegenpart". Damit ueberspringt der Rest-Renderer die
DB-Zeile (was korrekt waere, wenn sie aktiv waere) — aber der
hartcodierte JSX-Block davor bleibt unangetastet.

Folge: Der Admin-Schalter B-152 (Sichtbar/Ausgeblendet) hat aktuell
**null Wirkung** auf die Live-Seite. Egal ob `is_active=true` oder
`is_active=false`, der Block ist immer sichtbar.

## Befundklasse (neu)

`PUBLIC_BLOCK_IGNORIERT_DB_VISIBILITY`

Bedeutung: Ein Public-Block wird angezeigt, obwohl eine zugehoerige
CMS-Section existiert und ihr `is_active` im Admin-Schalter nicht
respektiert wird. Gegenrichtung zur Befundklasse
`AKTIVE_DB_SECTION_OHNE_PUBLIC_RENDERPFAD` (D1).

Eine zweite, schwaechere Klasse (`PUBLIC_BLOCK_OHNE_DB_BINDUNG`) erfasst
hartcodierte Bloecke ohne jede DB-Section. Diese sind ebenfalls
unschoen, aber kein akuter Spiegelbruch (Admin hat dort schlicht keinen
Schalter, der wirken koennte).

## Verhaeltnis zu D1 / P027 grün

P027 ist in D2 fuer Richtung **„DB aktiv → Public zeigt"** grün
gestellt worden (Rest-Renderer ergaenzt). Fuer Richtung
**„DB inaktiv → Public versteckt"** ist P027 weiter rot wegen B-152
snipdoo.

Spiegel-Regel ist damit nur dann vollstaendig erfuellt, wenn beide
Richtungen stimmen. Die Aktualisierung dieser Regel folgt in D2b.5.

## Naechste Schritte

- D2b.2: Globales Audit-Skript, das alle Faelle dieser Befundklasse
  findet (siehe `scripts/cms/public-blocks-ignorieren-admin-visibility.mjs`,
  Output unter `public-blocks-ignorieren-admin-visibility.{json,md}`).
- D2b.3: Minimal-Fix fuer P027/B-152 (Sichtbarkeit an `cms.sections`
  binden, Inhalt bleibt vorerst i18n; Restschuld-Label
  `HARDCODED_CONTENT_WITH_ADMIN_VISIBILITY_BINDING`).
- D2b.4: Browser-Abnahme.
- D2b.5: Doku/Regel in beide Richtungen aktualisieren.
