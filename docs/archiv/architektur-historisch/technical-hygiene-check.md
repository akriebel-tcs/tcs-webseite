# Technische Hygiene-Prüfung

Stand: 2026-04-21
Etappe: 12a
Typ: Reine Analyse und Dokumentation. **Keine Codeänderungen.**

---

## 1. Ziel der Analyse

- Technische Restthemen nach Abschluss der `src/pages`-Migration erfassen.
- Risiken benennen und Empfehlungen für spätere Etappen ableiten.
- In dieser Etappe ausdrücklich **keine** Code-, Routen-, Text-, Layout-, i18n- oder Navigationsänderungen.

Geprüfte Quellen:
- `package.json`
- `src/App.tsx`
- `vite.config.ts`
- `.gitignore`
- Projektwurzel (`/`)
- `npm run build`-Ausgabe
- `docs/architecture-checkpoint-11f.md`
- `docs/migration-log.md`

---

## 2. Build-Hinweis `@tanstack/query-core`

### Beobachtung

`npm run build` schlägt aktuell **mit einem echten Fehler** fehl. Auszug:

```
[vite]: Rollup failed to resolve import "@tanstack/query-core"
from "/dev-server/node_modules/.bun/@tanstack+react-query@5.83.0+.../@tanstack/react-query/build/modern/index.js".
This is most likely unintended because it can break your application at runtime.
If you do want to externalize this module explicitly add it to `build.rollupOptions.external`
x Build failed in 1.88s
```

Zusätzlich (separater Hinweis, nicht der Bauch-Fehler):

```
[vite:css] @import must precede all other statements (besides @charset or empty @layer)
src/index.css:5  @import url('https://fonts.googleapis.com/css2?family=Inter...')
```

### Klassifizierung

- **Kein Vite-Warnhinweis**, sondern ein **Rollup-Resolve-Fehler**, der den Build abbricht.
- Ursache (Hypothese, nicht verifiziert):
  - `@tanstack/react-query` deklariert `@tanstack/query-core` als interne Peer-/Sub-Dependency.
  - Im Bun-Lockfile (`/node_modules/.bun/...`) liegt `query-core` in einem gehoisteten Pfad, den Rollup nicht ohne weiteres auflösen kann.
  - In `vite.config.ts` ist `@tanstack/query-core` zwar in `resolve.dedupe` gelistet, aber **nicht** als direkte Dependency in `package.json` eingetragen.
- Der CSS-`@import`-Hinweis ist davon unabhängig und betrifft die Reihenfolge des Google-Fonts-Imports in `src/index.css`.

### Bewertung

- Bisherige Logs (Etappen 11a–11e) sprachen von einem „bekannten Hinweis" – tatsächlich handelt es sich aktuell um einen **harten Build-Fehler**, kein reiner Warning.
- Mögliche Lösungswege (nur Hypothesen, nicht in dieser Etappe umsetzen):
  1. `@tanstack/query-core` als explizite Direkt-Dependency in `package.json` hinzufügen (Version passend zu `@tanstack/react-query@5.83.0`).
  2. `build.rollupOptions.external` setzen (riskant, ändert Bundling-Verhalten).
  3. Auf neuere `@tanstack/react-query`-Version aktualisieren, sofern dort die interne Auflösung anders gelöst ist.
- **Keine Änderung in dieser Etappe.** Vorschlag: gezieltes Mini-Ticket in 12b prüfen, bevor weitere Domains/Refactorings folgen.

---

## 3. `package.json`

### Beobachtung

- Aktueller `"name"`: `vite_react_shadcn_ts`
- Das ist der **Lovable-/Vite-Default-Name**, kein projektbezogener Name.
- `"version": "0.0.0"`, `"private": true` – unproblematisch für ein internes Projekt.

### Empfehlung (für spätere Etappe, nicht jetzt)

- Umbenennen in einen projektsprechenden Namen, z. B.:
  - `tcs-unternehmenswebseite`
  - `tcs-website`
- Reine Kosmetik, kein Risiko für Routen/Funktion.

---

## 4. `App.tsx`: Toaster / Sonner

### Beobachtung

In `src/App.tsx` werden **beide** Toast-Systeme parallel eingebunden:

```tsx
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
...
<TooltipProvider>
  <Toaster />
  <Sonner />
  ...
```

- `Toaster` = shadcn/ui-Variante, basiert auf `@radix-ui/react-toast` und nutzt `@/hooks/use-toast`.
- `Sonner` = `sonner`-Library, separates Toast-System.
- Beide Provider sind aktiv, beide rendern jeweils einen eigenen Viewport.

### Bewertung

- **Redundant.** Ein Projekt benötigt nur ein Toast-System.
- Aktuell entstehen dadurch:
  - zwei Toaster-DOM-Bereiche
  - doppelter JS-Footprint
  - potenzielle UX-Verwirrung, falls beide Systeme gleichzeitig genutzt würden
- Lovable-Standardempfehlung: **`sonner`** beibehalten (moderner, einfachere API).

### Empfehlung (für spätere Etappe, nicht jetzt)

- Vor Entfernung prüfen, ob `useToast` aus `@/hooks/use-toast` irgendwo im Code aktiv genutzt wird.
- Falls nein: `Toaster` (shadcn) und zugehörige Dateien entfernen, nur `Sonner` behalten.
- Falls ja: betroffene Stellen auf `sonner` migrieren, dann shadcn-Toaster entfernen.

---

## 5. Temporäre Vite-Dateien / `.gitignore`

### Beobachtung

- Im Projektroot **liegen aktuell keine** `vite.config.ts.timestamp-*.mjs`-Dateien.
- `.gitignore` enthält:
  - `node_modules`
  - `dist`, `dist-ssr`
  - `*.log`, diverse `*-debug.log*`
  - `.DS_Store`, Editor-Ordner
  - `*.local`
- **Nicht** in `.gitignore`:
  - `vite.config.ts.timestamp-*.mjs` (Vite-Hilfsdatei beim Config-Lesen)
  - `*.tsbuildinfo` (existieren bereits im Root: `tsconfig.app.tsbuildinfo`, `tsconfig.node.tsbuildinfo`)
  - `.env`, `.env.local`, `.env.*.local` (nur über `*.local` teilweise abgedeckt)
  - `coverage/` (für Vitest-Coverage)
  - `playwright-report/`, `test-results/` (Playwright)

### Bewertung

- Aktuell kein akutes Problem, aber `tsconfig.*.tsbuildinfo` sollten nicht committed werden.
- `.env`-Einträge sind klassische Empfehlung, derzeit nicht zwingend, aber präventiv sinnvoll.

### Empfehlung (für spätere Etappe, nicht jetzt)

- `.gitignore` ergänzen um:
  - `vite.config.ts.timestamp-*.mjs`
  - `*.tsbuildinfo`
  - `.env`, `.env.local`, `.env.*.local`
  - `coverage/`
  - `playwright-report/`, `test-results/`

---

## 6. Bundle-/Build-Hinweise

### Beobachtung

- Da der Build aktuell durch den `@tanstack/query-core`-Fehler abbricht, **gibt es noch keine belastbaren Bundle-Metriken**.
- Vite-Standard-Schwelle für Chunk-Size-Warnungen: 500 kB.
- App.tsx importiert aktuell **alle Page-Komponenten statisch** (über 70 Imports).

### Bewertung

- Statische Imports aller Pages bedeuten: alles landet im initialen Bundle.
- Nach Fix des Build-Fehlers ist mit Chunk-Size-Warnungen zu rechnen.
- Code-Splitting via `React.lazy` + Suspense pro Feature-Domain wäre der saubere Weg, sobald Routing dezentralisiert ist (Etappe 13a).

### Empfehlung (für spätere Etappe, nicht jetzt)

- Erst nach Behebung des `query-core`-Fehlers Build-Output messen.
- Lazy-Routes erst zusammen mit Routing-Dezentralisierung (13a) einführen, nicht isoliert.

---

## 7. Ergebnis-Tabelle

| Thema | Befund | Risiko | Empfehlung | Spätere Etappe | Codeänderung jetzt |
|---|---|---|---|---|---|
| `@tanstack/query-core` | Harter Rollup-Resolve-Fehler, Build bricht ab. | **Hoch** – Production-Build aktuell nicht erstellbar. | Mini-Ticket: `@tanstack/query-core` als Direkt-Dependency ergänzen oder externalize-Strategie wählen. Vorab Hypothese verifizieren. | 12b | nein |
| `package.json`-Name | `"vite_react_shadcn_ts"` (Lovable-Default). | Niedrig – kosmetisch. | Umbenennen z. B. in `tcs-unternehmenswebseite`. | 12b | nein |
| Doppelte Toaster/Sonner | Beide Toast-Systeme aktiv eingebunden. | Niedrig–mittel – Redundanz, kein Bug. | `Sonner` behalten, shadcn-`Toaster` entfernen, Nutzung von `useToast` vorher prüfen. | 12b | nein |
| Temporäre Vite-Dateien | Aktuell **keine** `*.timestamp-*.mjs` vorhanden. | Niedrig. | Präventiv in `.gitignore` aufnehmen. | 12b | nein |
| `.gitignore` | Fehlt: `vite.config.ts.timestamp-*.mjs`, `*.tsbuildinfo`, explizite `.env*`-Pattern, `coverage/`, `playwright-report/`. | Niedrig–mittel – `*.tsbuildinfo` existiert bereits im Repo-Wurzelordner. | Ergänzen wie in Abschnitt 5 beschrieben. | 12b | nein |
| Bundle-Größe / Code-Splitting | Aktuell nicht messbar (Build bricht ab). Alle Pages statisch in `App.tsx`. | Mittel – nach Build-Fix mit Chunk-Warnungen zu rechnen. | Lazy Routes pro Domain im Zuge der Routing-Dezentralisierung (13a). | 13a | nein |

---

## 8. Empfehlung nächste Schritte

- **12b – Kleine Hygiene-Fixes**: nur eindeutig risikoarme Punkte umsetzen (`.gitignore`-Ergänzungen, `package.json`-Name, Toaster/Sonner-Konsolidierung). Der `query-core`-Fehler ist **separat** vorzubereiten, nicht „nebenbei" zu fixen.
- **13a – Routing-Dezentralisierung planen**: pro Feature-Domain eigene Routes-Datei, App.tsx wird Aggregator. Voraussetzung für sinnvolles Lazy-Loading.
- **14a – Navigation-/Link-Fixes planen**: Footer-Platzhalter, MainNavigation-Sublinks (insb. Eingangssysteme), Sprungmarken.
- **15a – URL-/Slug-Konzept planen**: Ist-URL-Inventar, DE/EN-Strategie, `/de`/`/en`-Routen, Redirects, Sitemap, hreflang.
- **16a – Seitentext-i18n planen**: pro Feature-Namespace, DE-Texte extrahieren, EN-Texte vorbereiten, Sprachumschalter erst nach belastbarer Textbasis.
- **17a – Team-Arbeitsanleitung erstellen**: wie künftig in Lovable gepromptet werden soll, Domain-Disziplin, Asset-Regel, keine Routenänderungen ohne Freigabe, keine Backend-/Tool-Integration ohne Konzept.
