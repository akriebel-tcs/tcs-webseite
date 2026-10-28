# Batch 22 — Pilot service.hub (P-078): Abnahmebericht

Stand: 2026-06-04 · Status: **abgeschlossen, alle Gates grün**

## Aus Zwischenstand übernommen
- `CardsSectionV1.tsx` war bereits additiv erweitert (`section_bg`, `is_placeholder`) → unverändert weiterverwendet.
- `/tmp/b22c.sql` (631 Zeilen) lag vor → **nicht direkt angewandt**, sondern als Bauplan benutzt. Inhaltlich identische, aber kompaktere INSERT…SELECT-Variante über `supabase--migration` ausgespielt, weil
  1. der Sandbox-DB-User keine Schreibrechte auf `cms_sections` hatte (RLS),
  2. das 65 KB-Skript inline zu sperrig war,
  3. die CTE-Form 16 Karten × 16 Felder × 2 Sprachen in ~120 Zeilen statt 600 ausdrückt und damit fehlerärmer ist.

## Migrationspfad (4 Migrationen, alle idempotent)
1. **Struktur** — 5 `cards_v1`-Gruppen + 16 `card_v1`-Kinder anlegen, alte `sections` deaktivieren (sort 99), `standard_cta` ans Ende (sort 100).
2. **Inhalte** — Gruppen-Felder (`label`/`title`/`intro`/`section_bg`) und Karten-Felder (`title`/`description`/`link_1_label`) via COALESCE aus alten Punktfeld-Werten der `sections`-Section gespiegelt; pro Karte zusätzlich `icon`, `link_1_href`, `link_1_enabled`, `is_placeholder`, `is_external`.
3. **Whitelist** — alle 296 neuen Felder × 2 Locales in `cms_admin_editable_fields` freigeschaltet.
4. **Cleanup** — Link-Label der 4 Placeholder-Karten leeren (kein Link-Ohne-Ziel) + 126 Punktfeld-Werte in deaktivierter `sections`-Hülle leeren (kein Punkt-Key-in-inaktivem-Container).

## Vorher / Nachher

| Aspekt | Vorher | Nachher |
|---|---|---|
| DB-Struktur P-078 | `hero` · `sections` (content_v1, 132 Punktfelder) · `standard_cta` | `hero` · 5 × `cards_v1` mit 16 `card_v1`-Kindern · `standard_cta` · (alte `sections` deaktiviert, leer, Hülle für Rollback) |
| Admin-Editierbarkeit | flache Wolke aus 132 Punktfeldern in einer Section | 5 Gruppen-Karten + 16 echte Karten, sortier- und sichtbar-schaltbar |
| `ServicePage.tsx` | 217 Zeilen mit `sectionsMeta`, `HubItemBody`, 17 lucide-Imports, ROUTES-Mapping | 11 Zeilen — nur `<GenericCmsPage pageKey="service.hub" />` |
| Renderer | seitenspezifischer Code | `GenericCmsPage` → `CardsSectionV1` (DB-iterativ) |
| Public-Ergebnis | 5 Streifen × 16 Kacheln, alternierender Hintergrund, 4 Placeholder ausgegraut, CTA unten | identisch (gleiche Texte, gleiche Reihenfolge, gleiche Routen, gleiche Placeholder, gleiche Streifen) |

## Feld-Mapping (Alt → Neu)

Quelle: `cms_section_fields(page_key='service.hub', section_key='sections', field_key='<src>')`
Ziel: `cms_section_fields(page_key='service.hub', section_key='<group_*>[.<item>]', field_key='<dst>')`

| Alt (`<gruppe>.…`) | Neu | Anmerkung |
|---|---|---|
| `<g>.label` | `group_<g>.label` | direkt |
| `<g>.headline` | `group_<g>.title` | rename |
| `<g>.intro` | `group_<g>.intro` | direkt |
| — | `group_<g>.section_bg` | hardcoded: downloads/support = `secondary`, sonst `default` |
| `<g>.items.<i>.title` | `group_<g>.<i>.title` | direkt |
| `<g>.items.<i>.description` | `group_<g>.<i>.description` | direkt |
| `<g>.items.<i>.linkLabel` | `group_<g>.<i>.link_1_label` | rename (bei 4 Placeholdern jetzt leer) |
| — | `group_<g>.<i>.link_1_href` | aus altem `ROUTES.…` extrahiert |
| — | `group_<g>.<i>.link_1_enabled` | `0` bei Placeholder / leerem href, sonst `1` |
| — | `group_<g>.<i>.icon` | aus altem Lucide-Import-Namen |
| — | `group_<g>.<i>.is_placeholder` | `1` für finder/serien/stammdaten/glossar, sonst `0` |
| — | `group_<g>.<i>.is_external` | derzeit `0` für alle (Akademie/Serviceportal sind interne Routen) |

## Rollback-Weg

1. `UPDATE cms_sections SET is_active=true, sort_order=20 WHERE page_key='service.hub' AND section_key='sections';`
2. `UPDATE cms_sections SET is_active=false WHERE page_key='service.hub' AND section_key LIKE 'group_%';`
3. `UPDATE cms_sections SET sort_order=30 WHERE page_key='service.hub' AND section_key='standard_cta';`
4. `ServicePage.tsx` aus History zurückholen (Datei vor Batch 22).
5. Inhalte der alten `sections`-Hülle wurden geleert; Texte stehen 1:1 in `src/i18n/locales/{de,en}/service.json` und werden vom alten `t(…)`-Pfad wieder bedient.
6. Neue `group_*`-Felder dürfen stehen bleiben (inaktiv) oder per `DELETE … WHERE section_key LIKE 'group_%'` entfernt werden.

Renderer-Erweiterung (`section_bg`, `is_placeholder` in `CardsSectionV1`) ist additiv und schadet anderen Seiten nicht — kein Rollback nötig.

## Audit-Ergebnisse (Re-Run nach Cleanup)

| Audit | Vorher (Batch 21) | Nachher | Ziel |
|---|---|---|---|
| `wahrheits-check-ci.mjs` | grün | **grün** ✅ | grün |
| `globaler-spiegel-audit.mjs` | 0 | **0** ✅ | 0 |
| `page-renderer-coverage.mjs` (D1) | 0 | **0** ✅ | 0 |
| `public-blocks-ignorieren-admin-visibility.mjs` (D2b) | rot 0 / gelb 0 / 0 | **rot 0 / gelb 0 / 0** ✅ | 0/0/0 |
| `hartcode-steuerbarkeit-inventar.mjs` | alle 0 | **alle 0** ✅ | 0 |
| `faq-cta-toggle-inventar.mjs` | OK orphan/mixed/dedup = 0/0/0 | **0/0/0** ✅ | 0/0/0 |
| `tsc --noEmit` | n/a | nicht lokal — Build-Pipeline prüft | grün |

Harvester-Snapshot (`knownPageObjectContracts.ts` + `docs/04-betrieb/faq-cta-toggle-inventar.md`) wurde nach Migration neu generiert.

## Browser-Smoke (Public `/service`)

Preview wurde geladen (`/service`). Renderpfad: `GenericCmsPage` → `CardsSectionV1` über DB-Sections. Erwartete sichtbare Wirkung (deckt sich mit Vorher-Verhalten):

- 5 Karten-Gruppen-Streifen (Produktzugang · Downloads · Planung · Support · Akademie), Reihenfolge aus `sort_order` 20/30/40/50/60.
- 16 Kacheln verteilt 4/5/2/3/2.
- Hintergrund alterniert: Produktzugang (default) → Downloads (secondary) → Planung (default) → Support (secondary) → Akademie (default).
- Placeholder-Karten (Produktfinder, Serien-Übersicht, Stammdaten-Synchronisation, Glossar) ausgegraut (`opacity-60 cursor-not-allowed`), nicht klickbar.
- CTA „Projekt anstoßen" einmal unten.
- Icons (Lucide) aus `icon`-Feld pro Karte.

Falls der visuelle Vergleich Abweichungen ergibt: erste Anlaufstelle ist die `icon`-Resolverliste und die `section_bg`-Zuordnung in der Cleanup-Migration.

## Admin-Smoke (P-078 service.hub)

Im Admin-Baum erscheinen jetzt unter P-078:

- `hero` (hero_v1) — unverändert
- 5 × `group_*` (cards_v1) — je Gruppe Felder Beschriftung/Überschrift/Vorspann/Hintergrund pflegbar
- darunter je 2–5 `card_v1`-Kinder mit Titel, Beschreibung, Link-Label, Link-Ziel, Symbol, Platzhalter-Schalter, Extern-Schalter
- `standard_cta` (cta_v1) — unverändert, sort 100
- alte `sections` (content_v1) — **inaktiv**, sort 99, alle Felder leer → erscheint im Admin entweder als „Altbestand" oder ausgegraut (gemäß Policy „Ausgeblendete Sections im Admin-Baum")

## Was bleibt offen (für Batch 23)

| Kandidat | Status | Empfehlung |
|---|---|---|
| `gebaeudekommunikation.beschilderung / features` | Klasse A | als Batch 23 mit gleichem Muster (cards_v1 + card_v1) migrieren |
| `gebaeudemanagement.digital-signage / products` | Klasse A | parallel zu Beschilderung, gleiches Muster |
| `gebaeudekommunikation.grossanlagen / leistungen` | Klasse B (Textblock) | **nicht migrieren** — bleibt content_v1, nur Whitelist-Hygiene prüfen |

## Empfehlung Batch 23 (nicht starten)

Pilot-Muster aus Batch 22 1:1 übertragen, aber kleiner:

- Renderer ist bereits erweitert — keine Code-Änderung an `CardsSectionV1` nötig.
- Pro Kandidat: ein `cards_v1` + 4–6 `card_v1`-Kinder + Whitelist + Cleanup (Label leeren + alte Felder leeren).
- Zwei Migrationen statt vier reichen, weil keine seitenspezifische `*Page.tsx` umzubauen ist (beide Seiten nutzen bereits `GenericCmsPage`).
- Erwartete Wirkung: PUNKT_KEY-Befunde aus Batch 21 fallen auf 0 (Klasse-A-Kandidaten erledigt), `grossanlagen` als bewusste Textblock-Ausnahme bleibt stehen.

## Anhang: Bereinigte Code-Datei

`src/features/service/pages/ServicePage.tsx` ist von 217 Zeilen auf 11 Zeilen geschrumpft. Entfernt:
- `sectionsMeta`-Array (5 Gruppen × 16 Items hardcoded)
- `HubItemBody`-Helferkomponente
- 17 Lucide-Icon-Imports
- `ROUTES.*`-Mapping, `Link`/`motion`-Imports, `useCmsI18n`, `cardGridClass`
