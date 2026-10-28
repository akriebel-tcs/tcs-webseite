# Batch 21 — Aufgabe 2: Zielmodell `service.hub`

Stand: 2026-06-04 · Entwurf, **nicht** umgesetzt.

## Zielstruktur in der DB

`B-324 sections` (content_v1) wird **deaktiviert** (`is_active=false`, nicht gelöscht — Rollback-fähig) und durch **5 neue Sections** vom Typ `cards_v1` ersetzt. Jede Gruppe bekommt eigene `card_v1`-Kinder.

```
service.hub
├── hero                 hero_v1        sort=10  (unverändert)
├── group_produktzugang  cards_v1       sort=20
│   ├── card_katalog     card_v1
│   ├── card_finder      card_v1
│   ├── card_serien      card_v1
│   └── card_stammdaten  card_v1
├── group_downloads      cards_v1       sort=30
│   └── 5 card_v1
├── group_planung        cards_v1       sort=40
│   └── 2 card_v1
├── group_support        cards_v1       sort=50
│   └── 3 card_v1
├── group_akademie       cards_v1       sort=60
│   └── 2 card_v1
├── sections             content_v1     sort=99  is_active=false  (Legacy-Backup)
└── standard_cta         cta_v1         sort=100
```

## Felder pro `cards_v1`-Gruppe

| Feld | Quelle (heute) |
|---|---|
| `label` | `<g>.label` aus B-324 |
| `title` | `<g>.headline` aus B-324 |
| `intro` | `<g>.intro` aus B-324 |

## Felder pro `card_v1`

| Feld | Quelle | Bemerkung |
|---|---|---|
| `title` | `<g>.items.<k>.title` | direkt |
| `description` | `<g>.items.<k>.description` | direkt |
| `link_1_label` | `<g>.items.<k>.linkLabel` | direkt |
| `link_1_href` | aus `sectionsMeta[…].href` im Code | initial einmalig per Migration als String setzen |
| `link_page_key` | aus `sectionsMeta[…].href` rückgemappt auf `cms_pages.page_key` | wenn auflösbar; sonst leer |
| `icon` | aus `sectionsMeta[…].icon` (Lucide-Name) | als String (`"BookOpen"`) — `iconResolver` existiert bereits |
| `is_external` | `!href.startsWith("/")` | initial false außer N-022 Academy-Fall (keiner aktuell extern) |
| `is_placeholder` | `href === ROUTES.placeholder.root` | optional als Boolean-Feld, sonst über leeren `link_page_key` ableiten |

## Renderer-Frage

**`CardsSectionV1.tsx` rendert bereits** Label/Title/Intro + responsive Kartenraster mit `card_v1`-Kindern, `cardGridClass`, `cardGridItemClass`, `resolveHref`, `resolveIcon`, `resolveCardVisibility`. Mehrere `cards_v1`-Sections auf einer Seite werden durch `renderPageSectionByType` automatisch hintereinander gerendert (siehe `GenericCmsPage`).

Was **fehlt** für Service-Hub-Parität:

1. **Alternierender Hintergrund** (`bg-secondary` jede zweite Gruppe) — heute hart in `ServicePage.tsx`. Optionen:
   - Sehr klein: in `CardsSectionV1` Lesefeld `section_bg` (`"default" | "secondary"`) ergänzen, pro Section setzbar.
   - Oder: globaler Renderer-Helfer „stripe pattern" über Sektionsreihenfolge auf Page-Ebene.
2. **Placeholder-Darstellung** (ausgegraut, `cursor-not-allowed`, `aria-disabled`) — heute hart in `ServicePage.tsx`. Wenn `resolveHref` einen Placeholder erkennt, kann `CardsSectionV1` den Disabled-State zentral rendern. Heute prüft `resolveCardVisibility` nur `is_active`, nicht „Placeholder".
3. **Lucide-Icon per String-Name** — `resolveIcon` existiert bereits.

→ Renderer-Erweiterung ist **klein** (Stripe + Placeholder-State), bringt aber Wert für alle künftigen Hubs.

## Page-Komponente nach Migration

`ServicePage.tsx` schrumpft auf:

```tsx
const ServicePage = () => (
  <GenericCmsPage pageKey="service.hub" />
);
```

…ODER bleibt als dünner Wrapper, falls Stripe-Logik dort schöner aufgehoben ist als im Renderer. Das `sectionsMeta`-Array entfällt vollständig.

## Fallbacks, damit Public identisch bleibt

- **Migration läuft idempotent:** Wenn neue `cards_v1`-Sections existieren UND `is_active=true` sind, wird B-324 `sections` automatisch auf `is_active=false` gesetzt. Bei Rollback (B-324 aktivieren, neue Gruppen deaktivieren) zeigt der Custom-Renderer wieder das alte Bild.
- **Whitelist:** alle neuen Feld-Slots werden im selben Migrationsschritt in `cms_admin_editable_fields` eingetragen.
- **i18n-Fallback** bleibt unverändert, da `useCmsI18n` weiterhin auf `hub.sections.<g>.…` zugreifen kann — die alten Schlüssel in den JSON-Locales schaden nicht.
- **Smoke-Test-Routen:** `/service`, `/en/service`, jede Karten-Zielroute (Stichproben Katalog, Downloads, Support, Akademie).

## Was mit `B-324 sections` passiert

- **Nicht löschen.** `is_active=false`, im Admin im „Altbestand"-Bucket sichtbar, Rollback-fähig.
- Optional in einer späteren Etappe nach erfolgreichem Pilot komplett aus der DB nehmen (eigener Mini-Batch).
