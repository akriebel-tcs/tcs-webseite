# `src/navigation/`

Zentrale **Navigations-Datenquelle** (Hauptnavigation, Persona-Navigation, Meta-Navigation, Footer-Navigation) als typisierte TS-Strukturen mit `key`, `labelKey`, `descriptionKey`, `path`, `linkType`, `children`, `status`.

Dient als einzige Quelle für Header, Footer, Sitemap, Breadcrumbs und Cross-Feature-Links – ohne dass Features sich gegenseitig importieren müssen.

> Status (real): Datenstrukturen sind vollständig vorbereitet **und an die Renderer-Komponenten angeschlossen** (Etappen 4f / 4g / 4h / 4i). `MainNavigation.tsx`, `Footer.tsx` und `MetaNavigation.tsx` rendern aus den Datenstrukturen in diesem Ordner und beziehen sichtbare Texte über `useTranslation("navigation")` aus `src/i18n/locales/{de,en}/navigation.json`.

## Reale Verdrahtung

| Datenquelle | Typ | Renderer | Bemerkung |
|---|---|---|---|
| `routes.ts` | URL-Konstanten | – | Single source of truth für interne Linkziele. Enthält aktive Routen, Legacy-Fallback-Konstanten (`*Legacy`) und einen Platzhalter (`placeholder.root = "#"`). Legal-Routen (`/impressum`, `/datenschutz`, `/agb`) sind seit Etappe `doc-legal-base-2` real verdrahtet. |
| `mainNavigation.ts` | Hauptnav (6 Top-Level + Children) | `src/components/MainNavigation.tsx` | Top-Level klickbar (Desktop und Mobile, Mobile zusätzlich „Übersicht"-Link im Submenu seit Etappe `stab-routing-cta-1`). |
| `footerNavigation.ts` | 4 Footer-Spalten + `footerBottomNavigation` (Legal) | `src/components/Footer.tsx` | Legal-Bottom-Bar zeigt seit `doc-legal-base-2` auf reale interne Routen. Verbleibende Platzhalter (`services.konfigurator`, `services.ersatzteile` mit `linkType: "placeholder"`) sind explizit markiert. |
| `metaNavigation.ts` | Meta-Leiste (Kontakt, Karriere, Presse, Serviceportal) | `src/components/MetaNavigation.tsx` | – |
| `personaNavigation.ts` | 6 Personas | `src/components/MetaNavigation.tsx` (Persona-Auswahl) und `PersonaSection.tsx` (Startseite) | Persona-IDs: `bauherren`, `architekten`, `wohnungswirtschaft`, `fachplaner`, `handwerk`, `fachhandel`. |
| `types.ts` | TypeScript-Typen (`NavItem`, `LinkType`, `Status`, `Badge`, `FooterColumn`) | – | – |

## Status-Werte (`status` auf `NavItem`)

- `active` – Linkziel ist real freigegeben.
- `pending` – Link zeigt aktuell ersatzweise auf eine andere Seite (Hinweis im `note`-Feld). Wird später korrigiert.
- `placeholder` – Link ist bewusst noch nicht aktiv (z. B. spätere externe Tools/Subdomains).

## Faustregeln

- **Datenstruktur ändern** → Datei in diesem Ordner.
- **Sichtbare Darstellung ändern** → Renderer in `src/components/`.
- **Sichtbarer Text ändern** → `src/i18n/locales/{de,en}/navigation.json`.
- **Neue interne URL-Konstante** → `routes.ts`.

## Historische Etappen

Die folgenden Einträge dokumentieren den Aufbau dieses Ordners. Sie spiegeln den Verlauf, **nicht** den heutigen Stand – maßgeblich ist die Tabelle oben.

### Etappe 4b (vorbereitet)

- `types.ts` und `routes.ts` angelegt; noch nicht an Komponenten angeschlossen.
- Routenwerte spiegelten den Ist-Stand aus `src/App.tsx` und dem damaligen `navigation-inventory.md`.
- Platzhalter-Links (`"#"`) bewusst belassen.

### Etappe 4c (vorbereitet)

- `mainNavigation.ts` als reine Datenstruktur (6 Top-Level, 29 Kinder).
- Noch nicht an `MainNavigation.tsx` angeschlossen.

### Etappe 4d (vorbereitet)

- `footerNavigation.ts` (4 Spalten) und `footerBottomNavigation` (Legal-Bottom-Bar).
- Noch nicht an `Footer.tsx` angeschlossen.

### Etappe 4e (vorbereitet)

- `personaNavigation.ts` (6 Personas) und `metaNavigation.ts` (4 Meta-Links).
- Noch nicht an `MetaNavigation.tsx` angeschlossen.

### Etappe 4f (Anschluss Hauptnav)

- `MainNavigation.tsx` rendert aus `mainNavigation.ts`.
- Sichtbare Texte zunächst über lokalen DE-Fallback in der Komponente.

### Etappe 4g (Anschluss Footer)

- `Footer.tsx` rendert aus `footerNavigation.ts` und `footerBottomNavigation`.
- Sichtbare Texte zunächst über lokalen DE-Fallback.

### Etappe 4h (Anschluss Meta/Persona)

- `MetaNavigation.tsx` rendert aus `personaNavigation.ts` und `metaNavigation.ts`.
- `PersonaContext` und State-Logik unverändert.

### Etappe 4i (i18n-Anbindung der Navigation)

- Lokale DE-Fallback-Maps entfernt.
- Sichtbare Texte kommen aus `src/i18n/locales/de/navigation.json` / `en/navigation.json`.
- Namespace `navigation` in `src/i18n/index.ts` registriert.

### Spätere relevante Etappen (Auszug)

- `14d-2` … `14e-7`: Slug-Reorganisation (`/gebaeudekommunikation/...`, `/anwendungen/bildungseinrichtungen`, `/anwendungen/objektloesungen`); Legacy-Slugs als Fallback aktiv.
- `19c-service-nav-final`: Service-Dropdown auf 6 Punkte reduziert, Top-Level zeigt auf `/service`.
- `doc-legal-base-2`: Legal-Routen (`/impressum`, `/datenschutz`, `/agb`) real angelegt; `ROUTES.legal.*` von `"#"` auf echte Pfade umgestellt; Footer-Bottom-Bar von `placeholder` auf `internal/active` umgestellt.
- `stab-routing-cta-1`: Mobile Hauptnav – Top-Level direkt erreichbar, „Übersicht"-Link im Submenu (`common.overview` in `navigation`-Namespace).
