# CMS-ID-/Key-Modell (cms-page-registry-static-1)

> Ablageort: `docs/01-strategy/cms-id-key-modell.md`
>
> Verwandte Dokumente: [`seitentyp-taxonomie.md`](./seitentyp-taxonomie.md), [`url-sprachstrategie.md`](./url-sprachstrategie.md), [`../02-architecture/code-landkarte.md`](../02-architecture/code-landkarte.md), `src/navigation/pageRegistry.ts`.

## 1. Zweck

Dieses Dokument beschreibt das **ID-/Key-Modell**, mit dem die TCS-Webseite schrittweise auf ein späteres CMS-Light-System vorbereitet wird. Es definiert die Begriffe, die später in einer redaktionellen Datenbank, in JSON-Fallbacks und in den Renderern dieselbe Bedeutung haben müssen.

In dieser Etappe entsteht **kein CMS, keine Datenbank und keine Admin-Oberfläche**. Es entsteht ausschließlich:

- diese Begriffsdefinition,
- ein statisches Seitenregister `src/navigation/pageRegistry.ts` als reine Datenstruktur,
- Einträge in `docs/migration-log.md` und `docs/current-status.md`.

Das Register wird in dieser Etappe **von keinem Renderer, keiner Page und keiner Navigation importiert**. Es ist eine vorbereitende Grundlage.

## 2. Begriffe

| Begriff | Beschreibung |
|---|---|
| **page_key** | Stabile, global eindeutige technische ID einer Seite. Wird abgeleitet aus dem Konstantenpfad in `src/navigation/routes.ts` (z. B. `anwendungen.pflege`). Bleibt stabil, **auch wenn sich Slug, Label oder Navigation ändern**. Ist die spätere Primärschlüssel-Spalte in der CMS-DB. |
| **route_path** | Die heutige URL der Seite (z. B. `/anwendungen/pflege`). Kann sich im Lauf der Zeit ändern – `page_key` darf das nicht. |
| **page_type** | Verbindlicher Seitentyp aus der Taxonomie [`seitentyp-taxonomie.md`](./seitentyp-taxonomie.md), Werte `T01`–`T21`. Steuert später Pflichtbausteine, Templates und JSON-LD-Schemata. |
| **section_key** | Stabile ID eines redaktionellen Bausteins **innerhalb** einer Seite (z. B. `hero`, `answer-first`, `faq`). Wird in dieser Etappe noch **nicht** modelliert; das Modell ist hier nur namentlich reserviert. |
| **locale** | Sprachcode (`de`, `en`). Inhalte werden später pro `(page_key, section_key, locale)` aufgelöst. |
| **parent_page_key** | Optionaler Verweis auf die fachliche Mutter-Seite, primär für spätere Breadcrumb-/Hierarchie-Logik. |
| **status** | Lebenszyklus eines Eintrags: `active`, `legacy`, `stub`, `in-progress`. |

## 3. Stabilitätsregeln

- `page_key` ist **die einzige langlebige Identität** einer Seite. Slug-Reformen, Label-Änderungen und Navigationsumbauten dürfen `page_key` nicht verändern.
- `route_path` ist **veränderlich**. Wenn eine Seite umzieht, wechselt `route_path`, der bisherige Pfad bekommt einen separaten `legacy`-Eintrag mit eigenem oder gleichem `page_key` plus `note`.
- `page_type` kommt **verbindlich** aus der Taxonomie T01–T21. Jeder neue Eintrag muss einen Typ tragen; bei Unsicherheit wird der wahrscheinlichste Typ gesetzt und mit `note: "TODO type review"` markiert.
- `section_key` ist optional und wird erst dann verbindlich, wenn redaktionelle Bausteine in der CMS-DB modelliert werden.

## 4. Was ausdrücklich nicht zum Modell gehört

- **Produktdaten** (PDP-Inhalte, Spezifikationen, Artikelnummern, Bilder, Dokumente) bleiben **außerhalb** des CMS-Modells. Sie kommen weiterhin aus der **externen Produktdatenbank**. Das CMS-Modell verwaltet nur redaktionelle Rahmen-Inhalte (z. B. Hero-Texte, Answer-First-Blöcke, FAQs, Crosslink-Slots).
- Die **Navigation bleibt vorerst Code** (`src/navigation/mainNavigation.ts`, `footerNavigation.ts`, `metaNavigation.ts`, `personaNavigation.ts`). Eine Navigation-aus-DB-Lösung ist explizit Folgeetappe und nicht Teil dieser Vorbereitung.
- Das spätere CMS-Light ist ausschließlich für **redaktionelle Inhalte** gedacht – nicht für Routing, nicht für Auth, nicht für Produkte.

## 5. Vorgesehene Fallback-Kette (später, nicht jetzt)

Sobald eine CMS-Light-DB existiert, sollen Renderer Inhalte in dieser Reihenfolge auflösen:

1. **CMS** – redaktioneller Inhalt aus der DB für `(page_key, section_key, locale)`.
2. **i18n / static** – heutiger Stand aus `src/i18n/locales/<locale>/<namespace>.json` und harten Komponenten.
3. **Redaktionell leer markiert** – sichtbarer, aber als „in redaktioneller Bearbeitung" gekennzeichneter Platzhalter (kein 404, kein Crash).

Diese Kette ist **Zielbild**. In dieser Etappe wird sie nicht implementiert.

## 6. Verhältnis zur URL-Sprachstrategie

Die in [`url-sprachstrategie.md`](./url-sprachstrategie.md) festgelegte Option B (Sprachpräfix `/de`/`/en` im Pfad) wird in **diesem Track nicht umgesetzt**. Das Register hält bewusst die heutigen, sprachneutralen `route_path`-Werte. Wenn die Sprachpräfix-Migration kommt, ändert sich `route_path`, **nicht** `page_key`.

## 7. Akzeptanzkriterien dieser Etappe

- Datei `src/navigation/pageRegistry.ts` existiert als reine Datenstruktur und wird nirgends importiert.
- Jede heute aktive öffentliche Route hat genau einen Eintrag mit `status: "active"`.
- Legacy-Routen sind als separate Einträge mit `status: "legacy"` und Verweis (`parentPageKey` oder `note`) auf die aktive Variante geführt.
- Jeder Eintrag hat einen `pageType` aus der Taxonomie; Unsicherheiten sind mit `note: "TODO type review"` versehen.
- Keine sichtbare Veränderung an der Webseite, keine Renderer-, Routen-, Navigation- oder DB-Änderung.
- `npm run i18n:check` und `npm run build` laufen unverändert grün.

## 8. Exportfähigkeit / Portabilität

CMS-Light-Inhalte müssen jederzeit aus der internen Lovable-Cloud-Datenbank exportierbar bleiben (SQL Dump, Supabase Export, später JSON/CSV) und in eine andere Postgres-Instanz oder ein anderes Headless-CMS migrierbar sein.

Regeln:

- **Fachliche Schlüssel** (stabil, exportführend): `page_key`, `section_key`, `field_key`, `locale`. Diese Tupel sind die langlebige Identität redaktioneller Inhalte und MÜSSEN in jedem Export erhalten bleiben.
- **UUIDs** (`cms_pages.id`, `cms_sections.id`, `cms_section_fields.id`, `cms_assets.id`) sind ausschließlich technische Datensatz-IDs. Sie dürfen sich bei einem Re-Import ändern und sind kein Mapping-Schlüssel.
- **Assets**: `cms_assets` wird über `storage_path` plus die fachliche Zuordnung (`page_key`, `section_key`, `asset_role`, optional `field_key`, `locale`) migrierbar gehalten. Binary-Inhalte des Buckets `cms-assets` müssen separat als Dateibestand exportierbar sein.
- **Keine Lovable-only-Geschäftslogik** in Kerninhalten. Standard-Postgres-Typen, keine Edge-Function-Abhängigkeit für das Auflösen redaktioneller Felder, keine herstellerspezifischen Erweiterungen.
- **Produktdaten bleiben außerhalb von CMS-Light** und kommen weiterhin aus der externen Produktdatenbank (`tkscpnwbkjmqopnddxle`). CMS-Light enthält keine Artikelnummern, Spezifikationen, Preise oder Produktdokumente.
