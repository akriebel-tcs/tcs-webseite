# i18n-Strategie

Stand: 2026-05-16

## Kernprinzip

**DB-first, JSON-Fallback.** Die Website holt Texte zuerst aus
`cms_section_fields` (und Bilder aus `cms_assets`) und fällt nur dann auf die
i18n-JSONs unter `src/i18n/` zurück, wenn die DB für den Key nichts liefert.

## Wie es technisch funktioniert

Statt direkt `useTranslation` benutzen Page-Komponenten:

```ts
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";

const { t, asset } = useCmsI18n("zutrittskontrolle", "zutrittskontrolle", "page");

t("hero.headline");          // DB → JSON-Fallback
asset("hero", "image");       // cms_assets → null
```

- `pageKey` (1. Argument) = der Page-Slug, unter dem die Sections in der DB
  liegen.
- `ns` (2. Argument) = der i18n-Namespace für den Fallback.
- `rootPrefix` (3. Argument) = das Präfix, das vor jedem `t("…")`-Key liegt
  (z. B. `page` ⇒ JSON-Key `page.hero.headline`).

Neue Seiten **immer** mit `useCmsI18n` anlegen, nie direkt `useTranslation`.

## Locales

- Heute: **de**, **en** und **pl** (Polnisch, im Aufbau).
- Zentrale Sprachwahrheit im Code: `src/i18n/locale.ts`
  (`APP_LOCALES`, `normalizeAppLocale`, `pickLocalizedValue`). Keine neue
  Sprachliste an anderer Stelle anlegen.
- Fallback-Kette: `pl → de`, `en → de`. So bleibt keine Stelle leer.
- Freigabestatus je Feld/Sprache in `cms_section_fields.review_status`:
  `geprueft` (öffentlich sichtbar) oder `maschinell` (nur im Admin sichtbar,
  wird öffentlich nicht ausgespielt).
- Slug-Trennung pro Locale: `cms_pages.locale` ist Teil des Schlüssels.
- URL-Sprachstrategie: siehe [`url-sprachstrategie.md`](./url-sprachstrategie.md).

## Sync-Snapshot

`scripts/sync/source-raw/i18n` enthält den letzten Marketing-ZIP-Stand
(2026-05-16). Der Snapshot ist 1:1 in der DB. Wenn ein Diff entsteht, ist die
DB Wahrheit — nicht der Snapshot.

## Was die i18n-JSONs heute noch tun

- **Fallback**, wenn die DB einen Key nicht liefert.
- **UI-Strings**, die nicht zum Inhalt gehören (z. B. „Schließen", „Mehr
  laden", Fehlermeldungen). Diese bleiben bewusst in JSON.

## Was *nicht* in i18n-JSON gehört

- Redaktionelle Texte (Headlines, Sublines, Karten-Inhalte, CTAs) — die liegen
  in der DB.
- Bild-Pfade — die liegen in `cms_assets`.
- Alt-Texte — die liegen am `cms_assets`-Slot.

## Renderer-Abdeckung

75 / 81 CMS-Seiten benutzen `useCmsI18n`. Die übrigen 6 sind dokumentierte
Ausnahmen (Admin, Produkt-Detailseite, Türsprechanlagen, drei
Produkt-Hub-/Containerseiten) und in `scripts/cms/renderer-audit.mjs`
sowie `scripts/i18n/i18n-check.config.json` synchron geführt.
