# i18n – Grundgerüst (Etappe 2)

Dieser Ordner enthält die technische Vorbereitung der Zweisprachigkeit DE/EN.
Siehe [`docs/architecture.md`](../../docs/architecture.md) und
[`docs/migration-log.md`](../../docs/migration-log.md).

## Status

- i18n ist initialisiert (`i18next` + `react-i18next`).
- Default-Sprache: `de`, Fallback: `de`, verfügbar: `de`, `en`.
- Aktiver Namespace: `common`.
- Ressourcen werden statisch importiert (kein HTTP-Backend, kein Language-Detector).
- Initialisierung erfolgt einmalig per Import in `src/main.tsx`.

## Was diese Etappe NICHT tut

- Keine Migration bestehender Texte aus `src/pages/` oder `src/components/`.
- Keine Änderung an Navigation, Footer, Routen oder Layouts.
- Kein sichtbarer Sprachumschalter.
- Kein `/de`-/`/en`-Routing.

## Regeln für die Folge-Etappen

- Neue, größere Inhaltsbereiche **dürfen Texte nicht mehr hardcoden**.
  Stattdessen Keys in der passenden JSON-Ressource pflegen.
- Pro Feature-Domain wird später ein eigener Namespace eingeführt
  (z. B. `zutrittskontrolle`, `gebaeudekommunikation`, `personas` …).
- Navigation wird später auf `labelKey`/`descriptionKey` umgestellt,
  nicht auf direkt eingetragene Strings.
- Lokalisierte Routen (`/de/...`, `/en/...`) werden separat entschieden
  und sind nicht Teil dieser Etappe.

## Ordnerstruktur

```
src/i18n/
├── index.ts              # Initialisierung
├── types.ts              # SupportedLanguage, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE
├── README.md             # diese Datei
└── locales/
    ├── de/common.json
    └── en/common.json
```

## Verwendung (ab späteren Etappen)

```tsx
import { useTranslation } from "react-i18next";

const { t } = useTranslation(); // defaultNS = "common"
t("actions.more"); // "Mehr erfahren" / "Learn more"
```

## Etappe 4i

- Namespace `navigation` wurde eingeführt (`src/i18n/locales/de/navigation.json`, `src/i18n/locales/en/navigation.json`).
- `MainNavigation.tsx`, `Footer.tsx` und `MetaNavigation.tsx` nutzen jetzt `useTranslation("navigation")`.
- Lokale Fallback-Maps (`NAV_TEXT_DE`, `FOOTER_TEXT_DE`, `META_TEXT_DE`) wurden entfernt.
- DE ist aktiv und Fallback-Sprache.
- EN ist als Datenstruktur vorbereitet, aber **noch nicht** über einen sichtbaren Sprachumschalter erreichbar.
- Kein `/de`-/`/en`-Routing.
- Key-Struktur in `de/navigation.json` und `en/navigation.json` ist identisch.
