# Routing-Dezentralisierung – Plan (Etappe 13a)

> ⚠️ **Historisches Planungs-/Checkpoint-Dokument.** Der Stand kann durch spätere Etappen überholt sein. Aktuelle Referenz sind [`code-landkarte.md`](./code-landkarte.md), [`i18n-strategy.md`](../01-strategy/i18n-strategy.md), [`serviceportal-status.md`](../01-strategy/serviceportal-status.md), [`current-status.md`](../current-status.md) und [`migration-log.md`](../migration-log.md).


**Datum:** 2026-04-21
**Status:** Reine Analyse und Planung. Kein Produktivcode geändert. Keine Routen, Slugs, Navigation, Footer-Links, i18n oder Assets verändert.

---

## 1. Ziel der Etappe

- Den aktuellen monolithischen Router in `src/App.tsx` analysieren.
- Eine Zielstruktur für **dezentrale Routes pro Feature-Domain** festlegen.
- Eine konkrete Empfehlung für die technische Form (RouteObject vs. JSX-Fragment) geben.
- Eine schrittweise Umsetzungsstrategie für Etappe 13b vorschlagen.

**Nicht-Ziele in 13a:**
- Keine Codeänderung.
- Keine Änderung an Route-Werten oder Slugs.
- Keine Lazy-Routes (`React.lazy`) – das ist Thema 13c.
- Keine Navigation-/Footer-Änderungen.
- Keine Konsolidierung fachlich ähnlicher Seiten.

---

## 2. Ist-Zustand

`src/App.tsx` ist heute der **zentrale Routing-Aggregator** des gesamten Projekts:

- **74 Imports** von Page-Komponenten (alle statisch, kein `React.lazy`).
- **62 `<Route>`-Einträge** in einem einzigen `<Routes>`-Block.
- Alle Feature-Domains werden direkt referenziert (gebaeudekommunikation, gebaeudemanagement, eingangssysteme, zutrittskontrolle, signage, anwendungen, service, serviceportal, wissen, kontakt, karriere, presse, home, app/pages).
- `MetaNavigation`, `MainNavigation`, `Footer`, `ScrollToTop`, `PersonaContext` werden ebenfalls in `App.tsx` orchestriert.
- Eine zentrale `<Route path="*" element={<NotFound />} />` deckt 404 ab.

**Konsequenzen des aktuellen Aufbaus:**
- ✅ Vorteil: Alle Routen an einem Ort, leicht überblickbar.
- ❌ Nachteil 1: `App.tsx` skaliert schlecht (~170 Zeilen, fast alles Imports/Routen).
- ❌ Nachteil 2: Jede neue Seite zwingt eine Änderung an `App.tsx` – Modulgrenzen werden verletzt, Feature-Domains sind nicht autark.
- ❌ Nachteil 3: Direkter Zusammenhang zur **Bundle-Size-Warnung** (Rollup: „chunks > 500 kB"). Da alle Pages statisch importiert werden, landet alles im Initial-Bundle. Ohne dezentrale Routes ist sinnvolles Lazy-Loading kaum möglich.

---

## 3. Zielbild

Empfohlene Zielstruktur **nach 13b**:

```
src/
├── app/
│   ├── routes.tsx              ← zentraler Aggregator (ersetzt Route-Block in App.tsx)
│   └── pages/
│       └── NotFoundPage.tsx    ← bleibt zentral (Fallback-Route)
├── features/
│   ├── home/
│   │   └── routes.tsx          ← /, /ueber-tcs
│   ├── zutrittskontrolle/
│   │   └── routes.tsx          ← /zutrittskontrolle + 4 Unterrouten
│   ├── eingangssysteme/
│   │   └── routes.tsx          ← /entry-system + 7 Unterrouten
│   ├── gebaeudemanagement/
│   │   └── routes.tsx          ← /gebaeudemanagement + 4 Unterrouten
│   ├── gebaeudekommunikation/
│   │   └── routes.tsx          ← 6 Top-Level-Routen
│   ├── signage/
│   │   └── routes.tsx          ← /beschilderung, /signage
│   ├── anwendungen/
│   │   └── routes.tsx          ← 22 Routen (inkl. Detail-Routen)
│   ├── service/
│   │   └── routes.tsx          ← 4 Service-Routen
│   ├── serviceportal/
│   │   └── routes.tsx          ← 3 Serviceportal-Routen
│   ├── wissen/
│   │   └── routes.tsx          ← /akademie
│   ├── kontakt/
│   │   └── routes.tsx          ← /kontakt
│   ├── karriere/
│   │   └── routes.tsx          ← /karriere
│   └── presse/
│       └── routes.tsx          ← /presse
└── App.tsx                     ← nur noch Provider + Layout + <AppRoutes />
```

**Grundregeln:**
- Jede Feature-Domain exportiert **nur ihre eigenen Routen**.
- `App.tsx` wird nach 13b zum reinen Layout-/Provider-Wrapper – **kein Page-Import mehr**.
- Route-Pfade bleiben **byte-identisch** (kein Slug-Änderung in 13b).
- `NotFoundPage` bleibt zentral in `src/app/routes.tsx` als letzte `<Route path="*">`.
- **Persona-Domains** (`src/features/personas/*`) exportieren **keine Routes** – sie liefern nur Inhalts-Komponenten, die von `HomePage`/MetaNavigation konsumiert werden. Keine eigenen URLs.

---

## 4. Empfohlene technische Form

**Empfehlung: JSX-Fragmente mit `<Route>`-Elementen pro Domain.**

Begründung:
- Das Projekt nutzt bereits **JSX-Routes** (`<Route path=… element=… />`) im Standard-Stil von React Router 6 – nicht das Datenrouter-API (`createBrowserRouter` / `RouteObject[]`).
- Ein Wechsel auf `RouteObject[]` würde gleichzeitig vom `<Routes>`-Pattern auf `RouterProvider` umstellen müssen → größerer, riskanter Eingriff. **Außerhalb Scope** von 13b.
- JSX-Fragmente lassen sich minimal-invasiv einführen: jede Domain exportiert ein `<>...</>`-Fragment, das in `<Routes>` direkt eingesetzt wird.

### Beispiel-Pattern (zur Illustration, nicht Umsetzung in 13a)

```tsx
// src/features/zutrittskontrolle/routes.tsx
import { Route } from "react-router-dom";
import ZutrittskontrollePage from "./pages/ZutrittskontrollePage";
import TuerenTorePage from "./pages/TuerenTorePage";
// ...

export const zutrittskontrolleRoutes = (
  <>
    <Route path="/zutrittskontrolle" element={<ZutrittskontrollePage />} />
    <Route path="/zutrittskontrolle/tueren-tore" element={<TuerenTorePage />} />
    <Route path="/zutrittskontrolle/mobiler-zutritt" element={<MobilerZutrittPage />} />
    <Route path="/zutrittskontrolle/fahrstuhlsteuerung" element={<FahrstuhlsteuerungPage />} />
    <Route path="/zutrittskontrolle/zufahrten-parkplaetze" element={<ZufahrtenParkplaetzePage />} />
  </>
);
```

```tsx
// src/app/routes.tsx
import { Routes, Route } from "react-router-dom";
import { homeRoutes } from "@/features/home/routes";
import { zutrittskontrolleRoutes } from "@/features/zutrittskontrolle/routes";
// ...
import NotFoundPage from "@/app/pages/NotFoundPage";

export const AppRoutes = () => (
  <Routes>
    {homeRoutes}
    {zutrittskontrolleRoutes}
    {/* … weitere Domains … */}
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);
```

**Beantwortung der Detailfragen:**

| Frage | Empfehlung |
|---|---|
| `RouteObject[]` exportieren? | Nein – würde Wechsel auf Datenrouter erzwingen. |
| Direkt JSX-Fragmente mit `<Route>`? | **Ja** – minimaler Eingriff, kompatibel mit bestehendem Setup. |
| Top-Level vs. Unterrouten gruppieren? | Pro Domain ein Fragment, Reihenfolge innerhalb intuitiv (Top → Detail). Keine verschachtelten `<Route>`-Layouts in 13b. |
| NotFound zentral? | Ja – bleibt in `src/app/routes.tsx` als letzte `<Route path="*">`. |
| Imports aus `App.tsx` reduzieren? | Nach 13b importiert `App.tsx` nur noch `<AppRoutes />` aus `@/app/routes`. Alle Page-Imports verschwinden aus `App.tsx`. |

---

## 5. Domains / Gruppen

| Domain | Routen ca. | Eigener Block? | Risiko | Bemerkung |
|---|---|---|---|---|
| `home` | 2 (`/`, `/ueber-tcs`) | Ja | Niedrig | Klein, idealer Pilot. |
| `zutrittskontrolle` | 5 | Ja | Niedrig | Klare Domain, war erster Migrations-Pilot. |
| `eingangssysteme` | 8 (`/entry-system/...`) | Ja | Niedrig | Englischer Slug bewusst beibehalten. |
| `gebaeudemanagement` | 5 | Ja | Niedrig | BCM-Bindung beachten (Slugs unverändert). |
| `gebaeudekommunikation` | 6 | Ja | Niedrig | Top-Level-Slugs (`/tuerkommunikation`, `/briefkastenanlagen` etc.) bleiben. |
| `signage` | 2 (`/beschilderung`, `/signage`) | Ja | Niedrig | Inhaltliche Dublette ungelöst – aber routing-neutral. |
| `anwendungen` | **22** (inkl. `/anwendungen/referenzprojekte/:slug`) | Ja | **Mittel** | Größter Block; Detail-Route mit Param erfordert Sorgfalt. |
| `service` | 4 (`/planen-konfigurieren`, `/downloads`, `/technischer-support`, `/ersatzteile`) | Ja | Niedrig | Top-Level-Slugs (kein `/service/...`-Präfix). |
| `serviceportal` | 3 (`/serviceportal`, `/passwort-vergessen`, `/registrieren`) | Ja | Niedrig | **Prototyp** – keine Auth-Logik in 13b. |
| `wissen` | 1 (`/akademie`) | Ja | Niedrig | Sehr klein, aber eigene Domain. |
| `kontakt` | 1 | Ja | Niedrig | Trivial. |
| `karriere` | 1 | Ja | Niedrig | Trivial. |
| `presse` | 1 | Ja | Niedrig | Trivial. |
| `app/pages/NotFound` | 1 (`*`) | **Nein** | Niedrig | Bleibt zentral in `src/app/routes.tsx`. |

**Gesamt:** ~62 Routen verteilt auf 13 Feature-Routes-Dateien + 1 zentrale `app/routes.tsx`.

**Besondere Beobachtungen:**
- Mehrere historische Top-Level-Slugs (`/tuerkommunikation`, `/objektloesungen`, `/bildungseinrichtungen`, `/akademie`, `/downloads`, `/ersatzteile`) liegen außerhalb ihrer Domain-Slug-Hierarchie – das ist OK, da Slugs in 13b unverändert bleiben (URL-Reform ist Thema 15a).
- Persona-Domains (`bauherr`, `architekt`, `wohnungswirtschaft`, `fachhandel`, `fachplaner`, `handwerk`) **haben keine eigenen Routen** und werden in 13b bewusst ausgenommen.

---

## 6. Besonderheiten / Risiken

| Risiko | Beschreibung | Mitigation |
|---|---|---|
| **Route-Reihenfolge** | React Router 6 matcht streng spezifisch-zuerst, aber Reihenfolge in `<Routes>` kann bei überlappenden Pfaden relevant sein. | Reihenfolge der Fragmente in `app/routes.tsx` so wählen, dass spezifischere Domains vor generischen liegen. NotFound bleibt **immer letzte** Route. |
| **Detail-Routen mit Param** | `/anwendungen/referenzprojekte/:slug` muss **nach** `/anwendungen/referenzprojekte` deklariert sein. | Domain `anwendungen` exportiert beide im richtigen Order; Anwendungs-Domain als eigener Block kapselt das Risiko. |
| **NotFound** | Darf nur **einmal** und **zuletzt** im aggregierten `<Routes>` stehen. | Zentral in `src/app/routes.tsx`, nicht in Domain-Routes-Dateien. |
| **Serviceportal-Prototyp** | Keine echte Auth-Logik. | 13b verschiebt nur die Route-Definitionen, keine Logik-Änderung. |
| **Navigation** | Footer- und MainNavigation-Links beziehen sich auf String-Slugs, nicht auf Route-Objekte. | Da Slugs unverändert bleiben, ist Navigation unberührt. |
| **URL-/Slug-Schema** | Mehrere Slugs sind diskussionsbedürftig (z. B. Top-Level statt Domain-Hierarchie). | Bewusst **außerhalb 13b** – siehe Etappe 15a. |
| **Lazy-Routes** | Würde Bundle-Größe reduzieren, ist aber separat. | **Nicht in 13a/13b** – Etappe 13c. |
| **Konsolidierung** `Beschilderung` ↔ `Signage` | Inhaltliche Dublette. | Nicht in 13b – braucht Marketing-/Produktentscheidung. |
| **Import-/Export-Zyklen** | Wenn eine Domain versehentlich aus einer anderen Domain Routen importiert. | **Hard Constraint:** Keine Cross-Feature-Imports. Jede `routes.tsx` importiert nur lokale Pages. |
| **Build/Lint** | Nach jeder Domain-Verschiebung muss `npm run build` grün bleiben. | 13b in kleine Schritte aufteilen, nach jedem Schritt builden. |

---

## 7. Empfehlung für 13b (Umsetzungsstrategie)

**Linie:** Keine Big-Bang-Umstellung. Kleine, reversible Etappen.

### Vorgeschlagene Aufteilung in 6 Sub-Etappen

| Sub-Etappe | Inhalt | Begründung |
|---|---|---|
| **13b-1** | `src/app/routes.tsx` als leeres Aggregator-Skeleton anlegen + Pilot mit **2 kleinen Domains** (`kontakt`, `karriere`). `App.tsx` referenziert teils noch direkt, teils schon Aggregator. | Kleinster reversibler Schritt. Pattern wird einmal geprüft. |
| **13b-2** | Weitere kleine Domains migrieren: `presse`, `wissen`, `home`, `signage`. | Risiko bleibt niedrig; Pattern wird verfestigt. |
| **13b-3** | Mittlere Domains: `service`, `serviceportal`, `gebaeudemanagement`. | Mehr Routen, aber klare Slug-Hierarchien. |
| **13b-4** | Mittlere Domains: `zutrittskontrolle`, `eingangssysteme`, `gebaeudekommunikation`. | Größere Blöcke, gleiches Muster. |
| **13b-5** | Größter Block: `anwendungen` (22 Routen inkl. Detail-Route). | Bewusst als letzter Domain-Block – maximale Aufmerksamkeit. |
| **13b-6** | `App.tsx` final reduzieren: nur noch `<AppRoutes />` referenzieren, alle Page-Imports entfernen. NotFound-Route in `app/routes.tsx` als zentralen Fallback. | Abschluss; `App.tsx` schrumpft auf reines Provider-/Layout-Wrapper-Setup. |

**Reihenfolge-Begründung:** Erst kleine Domains als Muster, dann mittlere, dann die große `anwendungen`-Domain zuletzt, weil dort Detail-Routen mit Param besondere Sorgfalt brauchen.

**Akzeptanzkriterien pro Sub-Etappe:**
- Keine URL ändert sich (manuell stichprobenartig prüfen).
- `npm run build` bleibt erfolgreich.
- Lint bleibt sauber.
- Navigation, Footer, MetaNavigation, i18n, Assets unverändert.

---

## 8. Beziehung zu 13c (Code-Splitting)

- **13c (Lazy Loading) ist erst nach 13b sinnvoll**, weil:
  - `React.lazy` arbeitet pro Page-Import. Solange diese Imports zentral in `App.tsx` stehen, würde Lazy-Umstellung **alle** Pages auf einmal in `App.tsx` betreffen → erneut monolithische Änderung.
  - Nach 13b liegt der Lazy-Wrap **lokal in jeder Domain-`routes.tsx`** → kleinere, isolierte Änderungen.
- **13a selbst bringt keine Bundle-Verbesserung.** Statische Imports bleiben statisch; nur die Position der Imports verschiebt sich. Das **ist Absicht**: 13a/13b ist Strukturarbeit, 13c ist Performance-Optimierung.
- Die Bundle-Size-Warnung (>500 kB) wird also erst in 13c adressiert.

---

## 9. Empfehlung nächste Schritte

1. **13b** umsetzen in 6 Sub-Etappen wie oben (klein → mittel → groß).
2. **13c** danach: `React.lazy` + `<Suspense>` pro Domain-Routes einführen, Bundle-Größe prüfen.
3. **14a** danach: Navigation-/Link-Fixes (Footer-Platzhalter, Eingangssysteme-Sublinks, Home-Logo, Sprungmarken) – ist orthogonal zu Routing.
4. **15a** später: URL-/Slug-Konzept (separate Frage, getrennt von Routing-Dezentralisierung).
5. **16a** später: Seitentext-i18n (nach Routing- und URL-Konzept).

---

## Leistungsdokumentation

> Routing-Dezentralisierung in der Planung: monolithischer Router in `App.tsx` analysiert (74 Page-Imports, 62 Routen), Zielstruktur mit autarken Feature-Routes-Dateien und zentraler Aggregation in `src/app/routes.tsx` definiert, technische Form (JSX-Fragmente statt RouteObject) begründet, 6 reversible Sub-Etappen für 13b vorgeschlagen, Risiken (Detail-Routen mit Param, NotFound-Reihenfolge, Cross-Feature-Imports) dokumentiert. Bundle-Optimierung bewusst auf 13c verschoben. Kein Produktivcode geändert.
