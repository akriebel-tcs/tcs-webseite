# Etappe 4B — Seitenend-Blöcke (CTA/FAQ) bleiben nach erneutem Render erhalten

Stand: 2026-09-15. Umfang: ausschließlich Frontend-Renderpfad in Web Neu.
Keine Datenbank-, Rechte- oder Inhaltsänderung, keine Migration, kein Deployment,
keine Veröffentlichung.

## Befund (aus 4A-Gegenprüfung)

Auf `/anwendungen/pflege?lang=de` fehlten nach einem erneuten Render der
CTA-Titel „Lassen Sie uns Ihr Projekt gemeinsam planen" und der Link
„Projektberatung vereinbaren". Datenlage war korrekt (`standard_cta` aktiv,
Root, alle Pflichttexte vorhanden).

Ursache: `CtaV1` und `FaqV1` meldeten sich **immer** als „inline gerendert" im
Render-Register an — auch dann, wenn die Ausgabe vom zentralen Seitenend-Renderer
(`CmsTailCta`, `CmsTailFaq`, `CmsTailSections`) selbst erzeugt wurde. Beim
nächsten Render sah der Seitenend-Renderer seinen eigenen Eintrag, übersprang
den Block, hängte ihn ab — und blieb leer. Der verbesserte Leser aus 4A hat
diesen bestehenden Registrierungsfehler nur sichtbar gemacht.

## Reparatur (minimal)

1. `CmsSectionContext` bekommt das optionale Feld `markInlineRendered`
   (Standard: `true`/undefiniert = wie bisher).
2. Die drei Seitenend-Renderer setzen `markInlineRendered={false}` für ihre
   eigene Ausgabe.
3. `CtaV1`/`FaqV1` prüfen zuerst die Renderbarkeit und melden sich nur an, wenn
   sie inline sind **und** echten Inhalt ausspielen; sonst wird ein leerer
   Schlüssel übergeben. Der Hook wird unverändert bei jedem Render aufgerufen
   (React-Hook-Regeln bleiben eingehalten).
4. `useMarkRendered` ignoriert leere Schlüssel, damit kein Phantom-Eintrag
   entsteht (betraf auch den bestehenden Aufruf in `SiblingNav`).

Kein Umbau des Registers, keine Massenänderung, keine neue Section-Logik.

## Nachweis

- Neue Integrationstests mit echten Bausteinen
  (`src/test/cmsTailRenderRegistry.test.tsx`, 9 Tests grün): CTA und FAQ bleiben
  nach mehrfachen erneuten Renders je genau einmal; gültige Inline-Ausgabe
  verhindert weiterhin die Dopplung (CTA und FAQ getrennt); nicht vorhandene,
  als Kind eingehängte oder textlose Sections bleiben weg; ein leerer
  Inline-Render erzeugt kein Phantom-Veto; mehrere CTA-Blöcke bleiben in
  Ordnungsreihenfolge je einmal.
- Leser-Tests aus 4A weiter 21/21 grün; Gesamtsuite 587 Tests grün;
  `npm run cms:preflight` Exitcode 0 (inkl. Build).
- Vorschau `/anwendungen/pflege?lang=de`: 18 Überschriften im Inhaltsbereich
  inklusive CTA-Titel, Link „Projektberatung vereinbaren" genau 1×,
  Broschürenlink vorhanden, Hero 3840x1360.
- Vorschau `/produkte?lang=de`: 3 „Mehr erfahren"-Ziele
  (`/produkte/tuerkommunikation`, `/produkte/zutrittskontrolle`,
  `/produkte/eingangsloesungen`) und 3 Bilder 1812x1360 unverändert.

## Bekannte Restgrenzen

- **Korrigiert in Etappe 4C (2026-09-15):** Die frühere Aussage „nur ein
  Render Verzögerung, kein Inhaltsverlust" war falsch. Verschwand eine
  Inline-Ausgabe, blieb der Seitenend-Block dauerhaft leer, bis von außen
  zufällig ein weiterer Render ausgelöst wurde. Siehe Abschnitt „Etappe 4C".
- Geprüft wurden zwei Seiten im Browser (Pflege, Produkte). Eine flächige
  Vorschau-Abnahme über alle Seiten und Sprachen steht weiter aus.
- Unverändert offen: bekannte offene CMS-Schreibrechte und das Rollenrisiko in
  `/admin`.

## Etappe 4C — Lebenszyklus des Render-Registers (2026-09-15)

Umfang: ausschließlich `src/features/cms/components/CmsRenderRegistry.tsx`
und die Integrationstests. Keine Datenbank-, Rechte-, Inhalts- oder
Anmeldungsänderung, keine Migration, kein Deployment, keine Veröffentlichung.

### Befund
Eine Inline-Ausgabe, die verschwand (Besitzerwechsel, Ausbau der Seite,
Wechsel „anzeigbar → leer"), hinterließ einen Eintrag, dessen Entfernung
niemanden benachrichtigte. Der Seitenend-Renderer erfuhr davon nichts und
blieb leer, bis irgendein anderer Anlass einen weiteren Render erzwang.
Der bisherige Test hat das durch einen zweiten manuellen Render verdeckt.

### Reparatur
- Pro Schlüssel wird eine **Besitzermenge** geführt: Aufräumen eines
  Besitzers löscht den Eintrag eines anderen nicht.
- Während des Renders trägt sich ein Besitzer nur **vorläufig** ein — damit
  bleibt die bestehende synchrone Inline/Tail-Entdopplung im selben Render
  erhalten. Nach dem Commit bestätigt der Effekt den Eintrag und überführt
  seinen vorläufigen Besitz selbst; das funktioniert auch bei einem reinen
  Teilbaum-Update, bei dem der Provider nicht erneut rendert. Der Provider
  verwirft nach eigenen Commits zusätzlich übrige vorläufige Einträge.
- Änderungen sind jetzt **beobachtbar**: Seitenend-Renderer hören das
  Register ab und ziehen automatisch nach. Benachrichtigt wird nur bei
  echter Änderung der Schlüsselmenge und nur aus Effekten/Aufräumschritten
  (nach dem Commit) — keine Warnung „setState während fremdem Render",
  keine Endlosschleife, unveränderte Hook-Reihenfolge.
- **Ergänzung nach Gegenprüfung:** Eine während des Renders bereits für die
  synchrone Entdopplung sichtbare Änderung wird als „noch nicht gemeldet"
  festgehalten. Der bestätigende Effekt meldet sie auch dann, wenn die
  Schlüsselmenge gegenüber dem vorläufigen Stand gleich bleibt. Damit erfährt
  ein bereits abonnierter Seitenend-Renderer von neu eingebauten Inline-Blöcken
  in einem eigenständig aktualisierten Teilbaum.

### Nachweis
- `src/test/cmsTailRenderRegistry.test.tsx`: 19 Tests grün, darunter mit
  **einem einzigen** erneuten Render (ohne zweiten manuellen Render):
  CTA nachgezogen, FAQ nachgezogen, gemeinsamer Renderer `CmsTailSections`
  nachgezogen, Seitenwechsel mit gleichem Section-Key nach Unmount,
  Wechsel leer → voll → leer → voll, zwei Besitzer desselben Schlüssels,
  sowie `StrictMode`. Jeder Test prüft zusätzlich, dass keine
  React-Warnungen oder -Fehler auftreten.
- Vier zusätzliche echte Teilbaum-Prüfungen aktualisieren ausschließlich den
  lokalen Zustand eines Inline-Bausteins per Klick (kein Parent-/Provider-
  Render): CTA und FAQ mit den beiden Einzel-Renderern sowie beide Arten mit
  `CmsTailSections`. Für 0 → 1 → 0 Inline-Ausgaben bleibt nach jedem Klick
  genau eine sichtbare Ausgabe erhalten.
- Gesamtsuite 597 Tests grün; `npm run cms:preflight` Exitcode 0 (inkl. Build).
- Vorschau `/anwendungen/pflege?lang=de`: 18 Überschriften, CTA-Titel und
  Link „Projektberatung vereinbaren" je genau 1×.
  `/produkte?lang=de`: 3 „Mehr erfahren"-Links und 3 Bilder unverändert.

### Verbleibende Restgrenzen
- Ein von React **vor dem Commit verworfener** Render-Versuch kann einen
  vorläufigen Eintrag bis zum nächsten Provider-Commit hinterlassen. Dafür
  liegt kein belastbarer Gegenbeweis vor; die frühere pauschale Aussage
  „verworfene Renders hinterlassen keine Geister" wird daher nicht erhoben.
- Browsergeprüft sind weiterhin nur zwei Seiten (Pflege, Produkte); eine
  flächige Vorschau-Abnahme über alle Seiten und Sprachen steht aus.
- Unverändert offen: bekannte offene CMS-Schreibrechte und das Rollenrisiko
  in `/admin`. Keine Veröffentlichung erfolgt.
