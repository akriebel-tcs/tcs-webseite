# Asset-Audit `src/assets`

Stand: 2026-04-23
Scope: reine Bestandsaufnahme. Keine Verschiebung, keine Import-Änderung, kein Refactor.

## Ziel

Klären, welche Bilder in `src/assets` echt shared sind, welche fachlich in eine Feature-Domain gehören, welche aktuell ungenutzt sind und welche Benennungen unklar wirken.

## Methodik

- Listing aller Dateien in `src/assets`
- Volltextsuche nach Dateinamen in `src/**` (`.tsx`, `.ts`, `.html`, `.css`)
- Zuordnung zu Domains anhand der Verwendungspfade unter `src/features/**` bzw. `src/components/**`

## Übersicht

| Datei | Aktueller Pfad | Verwendet in | Domain(s) | Einstufung |
|---|---|---|---|---|
| `logo-tcs.png` | `src/assets/` | `components/MainNavigation.tsx` | global / chrome | **shared lassen** |
| `hero-entrance.jpg` | `src/assets/` | `components/HeroSection.tsx`, alle Personas-Content-Komponenten, `personas/wohnungswirtschaft/.../WoWiHero.tsx` | home + personas (alle) | **shared lassen** |
| `block-entry.jpg` | `src/assets/` | `components/ContentBlocks.tsx`, `service/*` (Service, Downloads, Ersatzteile, OnlineProduktkatalog, PlanenKonfigurieren, TechnischerSupport), `wissen/AkademiePage` | shared block + service + wissen | **shared lassen** |
| `block-kommunikation.jpg` | `src/assets/` | `components/ContentBlocks.tsx`, `gebaeudekommunikation/*`, alle Personas | shared block + gebaeudekommunikation + personas | **shared lassen** |
| `block-zutritt.jpg` | `src/assets/` | `components/ContentBlocks.tsx`, alle Personas | shared block + personas | **shared lassen** |
| `block-signage.jpg` | `src/assets/` | `components/ContentBlocks.tsx`, `signage/SignagePage`, alle Personas | shared block + signage + personas | **shared lassen** |
| `block-objekt.jpg` | `src/assets/` | `components/ContentBlocks.tsx`, `anwendungen/*` (Anwendungen, Gesundheit, Objektloesungen, OeffentlicheHand, Referenzprojekte, Wohnbau) | shared block + anwendungen | **shared lassen** |
| `block-beratung.jpg` | `src/assets/` | `components/ContentBlocks.tsx` | shared block (nur ContentBlocks) | **shared lassen** (Teil des Block-Sets) |
| `signage-hero.jpg` | `src/assets/` | `signage/BeschilderungPage`, `gebaeudekommunikation/TuerkommunikationPage` | signage + gebaeudekommunikation | **shared lassen** (cross-domain) |
| `bcm-schrankschloss.jpg` | `src/assets/` | `gebaeudemanagement/SchraenkeBehaelterPage` | gebaeudemanagement (single) | **in Feature verschieben** → `features/gebaeudemanagement/assets/` |
| `feature-sanierung.png` | `src/assets/` | `anwendungen/WohnbauPage` | anwendungen (single) | **in Feature verschieben** → `features/anwendungen/assets/` |
| `bcm-serverschrankschloss.jpg` | `src/assets/` | – keine Treffer – | – | **ungenutzt** |
| `grossanlage-display.jpg` | `src/assets/` | – keine Treffer – | – | **ungenutzt** |

## Beobachtungen

### Klar shared
- `logo-tcs.png` – globales Brand-Asset.
- `hero-entrance.jpg` – wird vom globalen Hero und nahezu allen Personas verwendet.
- `block-*` (`entry`, `kommunikation`, `zutritt`, `signage`, `objekt`, `beratung`) – Teil des shared `ContentBlocks`-Sets, zusätzlich von mehreren Domains direkt importiert. Trennung wäre risikobehaftet und bringt aktuell keinen Vorteil.
- `signage-hero.jpg` – cross-domain (signage + gebaeudekommunikation).

### Kandidaten für Feature-Domain
- `bcm-schrankschloss.jpg` – nur in `gebaeudemanagement/SchraenkeBehaelterPage` benutzt.
  Empfehlung: nach `src/features/gebaeudemanagement/assets/` verschieben, sobald Refactor freigegeben ist.
- `feature-sanierung.png` – nur in `anwendungen/WohnbauPage` benutzt.
  Empfehlung: nach `src/features/anwendungen/assets/` verschieben.

### Ungenutzt (Kandidaten zum Entfernen, separat zu entscheiden)
- `bcm-serverschrankschloss.jpg`
- `grossanlage-display.jpg`

### Benennung / unklar
- `block-beratung.jpg` – Name passt, aber Asset wird aktuell nur intern in `ContentBlocks` referenziert. Kein Handlungsbedarf, nur dokumentieren.
- `feature-sanierung.png` – Präfix `feature-` ist im Projekt nicht etabliert (sonst `block-*`, `bcm-*`, etc.). Bei späterem Move ggf. an Domain-Namensschema anpassen.
- `bcm-*` – Präfix steht offensichtlich für „Behälter / Container Management“ bzw. den Schrankbereich von `gebaeudemanagement`. Nicht selbsterklärend, aber konsistent zueinander.

## Empfehlung (nicht jetzt umsetzen)

1. `bcm-schrankschloss.jpg` → `features/gebaeudemanagement/assets/`
2. `feature-sanierung.png` → `features/anwendungen/assets/` (ggf. umbenennen, z. B. `wohnbau-sanierung.png`)
3. `bcm-serverschrankschloss.jpg` und `grossanlage-display.jpg` prüfen und entweder einbinden oder löschen.
4. Alles andere bleibt in `src/assets` (echtes shared Set).

Verschiebungen erfordern jeweils Anpassung der Imports und einen separaten, klar abgegrenzten Migrationsschritt.
