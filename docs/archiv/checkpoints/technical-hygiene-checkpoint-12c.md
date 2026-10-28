# Technical Hygiene Checkpoint — Etappe 12c

**Datum:** 2026-04-21
**Scope:** Abschlussbericht zu Etappen 12a → 12b-1 → 12b-2.
**Codeänderungen in dieser Etappe:** keine.

---

## 1. Ausgangslage

Nach Abschluss der vollständigen Strukturmigration aus `src/pages/` (siehe
[`architecture-checkpoint-11f.md`](./architecture-checkpoint-11f.md)) wurde
in Block A der empfohlenen Folge­arbeiten die **technische Hygiene**
adressiert.

Verlauf:

| Etappe | Inhalt |
|---|---|
| **12a** | Analyse aller technischen Restthemen, dokumentiert in [`technical-hygiene-check.md`](./technical-hygiene-check.md). Reine Analyse, keine Codeänderung. |
| **12b-1** | Behebung des **harten** `@tanstack/query-core`-Build-Fehlers (Rollup-Resolve-Fehler, Build brach ab). |
| **12b-2** | Umsetzung kleiner risikoarmer Hygiene-Fixes: Projektname, `.gitignore`, redundantes Toast-System, CSS-`@import`-Reihenfolge. |
| **12c** | Abschlussbericht (dieses Dokument). |

---

## 2. Erledigte Punkte

### 2.1 `@tanstack/query-core` Build-Fehler (12b-1)

- **Vorher:** `vite build` brach ab mit
  `[vite]: Rollup failed to resolve import "@tanstack/query-core" from .../@tanstack/react-query/build/modern/index.js`.
- **Ursache:** `@tanstack/react-query@^5.83.0` war als Direct-Dependency
  vorhanden, der interne Peer `@tanstack/query-core` jedoch nur
  transitive — im Bun-Hoisting-Layout (`node_modules/.bun/...`) für
  Rollup nicht auflösbar.
- **Fix:** `@tanstack/query-core@5.83.0` als **direkte** Dependency in
  `package.json` ergänzt (versions-pinned passend zur vorhandenen
  `react-query`-Version).
- **Kein** Vite-Externalisieren, **keine** Logik-Änderung an React Query.

### 2.2 `package.json` `name` (12b-2)

- **Vorher:** `"name": "vite_react_shadcn_ts"` (Lovable-/Vite-Default).
- **Nachher:** `"name": "tcs-unternehmenswebseite"`.
- Alle anderen `package.json`-Felder unverändert.

### 2.3 `.gitignore` erweitert (12b-2)

Ergänzt (bestehende Einträge unverändert):

```
vite.config.ts.timestamp-*.mjs
*.tsbuildinfo
.env
.env.local
.env.*.local
coverage/
playwright-report/
test-results/
```

Es wurden **keine Dateien gelöscht**.

### 2.4 Toast-System konsolidiert (12b-2)

- **Befund:** `useToast` (shadcn) wird **nirgends in echtem Anwendungs­code**
  verwendet — nur intern in `src/hooks/use-toast.ts`,
  `src/components/ui/use-toast.ts` und `src/components/ui/toaster.tsx`.
- **Fix:** shadcn-`<Toaster />` aus `src/App.tsx` entfernt
  (Import + JSX-Element).
- **`Sonner`** (`@/components/ui/sonner`) bleibt als **alleiniges aktives
  Toast-System** im Render-Tree.
- Legacy-Dateien (`hooks/use-toast.ts`, `components/ui/toaster.tsx`,
  `components/ui/toast.tsx`, `components/ui/use-toast.ts`) wurden
  **bewusst NICHT gelöscht** (Constraint 12b-2). Eine spätere
  Aufräum-Etappe ist möglich.

### 2.5 CSS-`@import`-Reihenfolge (12b-2)

- **Vorher:** `@import url('https://fonts.googleapis.com/...')` stand in
  `src/index.css` **nach** den `@tailwind`-Direktiven → Vite-Hinweis
  „`@import must precede all other statements`".
- **Nachher:** `@import` an Dateianfang verschoben, `@tailwind base/
  components/utilities` folgen darunter. Keine Tokens, Farben, Layer
  oder Tailwind-Klassen geändert.

---

## 3. Aktueller Build-Status

`npm run build` (Etappe 12c, Verifikationslauf):

- **Ergebnis:** ✅ **erfolgreich** — `✓ built in 8.09s`.
- **Output:** `dist/assets/index-CmbsDqe2.js` 1 042,65 kB (gzip 286,38 kB),
  `dist/assets/index-mWplDnBM.css` 72,52 kB (gzip 12,70 kB).

### Verbleibende Hinweise

| # | Hinweis | Quelle | Bewertung |
|---|---|---|---|
| 1 | „Some chunks are larger than 500 kB after minification" | Rollup | erwartbar; Single-Chunk-Bundle wegen statischer Imports in `App.tsx`. Lösung gehört zu 13c (Code-Splitting). |
| 2 | „Browserslist: browsers data (caniuse-lite) is 10 months old" | browserslist | kosmetisch; behebbar via `npx update-browserslist-db@latest`. |

### Nicht mehr vorhanden

- ❌ **kein** `@tanstack/query-core` Resolve-Fehler mehr.
- ❌ **kein** `@import must precede all other statements` Hinweis mehr.

---

## 4. Verbleibende technische Themen

| Thema | Status | Empfohlene Etappe |
|---|---|---|
| Bundle-Größe / Code-Splitting | offen | 13c |
| `App.tsx` importiert ~70 Seiten **statisch** | offen | 13a/13b/13c |
| Routing-Dezentralisierung pro Feature-Domain | offen | 13a/13b |
| Legacy shadcn-toast-Dateien (`use-toast.ts`, `toaster.tsx`, `toast.tsx`) — vorhanden, aber nicht aktiv genutzt | offen | spätere Aufräum-Etappe |
| `browserslist` / `caniuse-lite` aktualisieren | offen | optional, jederzeit |
| Query-Core-Fix im Lockfile stabil halten | beobachten | bei jedem `bun install` / `npm install` prüfen |

---

## 5. Empfehlung nächste Etappen

### A. **13a** Routing-Dezentralisierung **planen**
- keine Umsetzung
- Ziel: jede Feature-Domain exportiert eigene Routes (z. B. `src/features/<domain>/routes.tsx`)
- `App.tsx` wird zum reinen Aggregator
- bereitet späteres Lazy Loading vor

### B. **13b** Routing-Dezentralisierung **technisch umsetzen**
- erst nach Plan in 13a
- Routenwerte **byte-identisch** halten
- **keine** Slug-Reform

### C. **13c** Lazy Loading / Code-Splitting prüfen
- erst nach Routing-Dezentralisierung
- Ziel: 500 kB-Chunk-Warnung reduzieren
- `React.lazy` + `Suspense` pro Domain

### D. **14a** Navigation-/Link-Fixes planen
- Footer-Links (12 Placeholder-Einträge aus Etappe 4d)
- Eingangssysteme-Unterlinks (Pending-Status)
- Home-Logo-Click prüfen
- Sprungmarken / Anker

### E. **15a** URL-/Slug-Konzept
- bewusst **getrennt** von Routing-Dezentralisierung
- keine URL-Änderungen ohne explizite Freigabe
- Vorbereitung `/de` / `/en` und Redirect-Konzept

### F. **16a** Seitentext-i18n planen
- erst nach Routing- und URL-Konzept
- Namespace-Strategie pro Feature-Domain

---

## 6. Leistungsdokumentation

> **Technische Stabilisierung nach der Strukturmigration:** Build-Fehler­
> analyse und Behebung des `@tanstack/query-core`-Resolve-Fehlers,
> Projektmetadaten bereinigt (`package.json` `name`), Gitignore um
> Vite-/Build-/Env-/Test-Artefakte erweitert, redundantes Toast-System
> reduziert (shadcn-Toaster entfernt, Sonner als alleiniges System
> belassen) und CSS-Build-Hinweis durch korrekte `@import`-Reihenfolge
> in `index.css` behoben. Production-Build danach grün, nur noch
> erwartbare Bundle-Size- und browserslist-Hinweise verbleiben.
