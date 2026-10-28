# Batch 56.1 — Renderfähigkeitsvertrag korrekt und wirksam abgeschlossen

Stand: 2026-06-18 nachgeschärfte Phase 1.

## Auftrag in Kürze

Batch 56 hat den Vertragsskelett geliefert (zentrale Logik + CTA-Härtung +
Audit-Anbindung), die geforderte **1:1-Parität zwischen Renderer und
Vertrag** aber noch nicht erbracht. Batch 56.1 schließt genau diese
Lücken, ohne Phase 2 (atomare Move-RPC, Admin-UX-Politur,
sort_order-Inventar, erweiterte Testmatrix) zu beginnen.

## Was vorher fehlte (Befund)

1.  **FAQ-Parität fehlte**: Vertrag hat Items gezählt, auch wenn der
    redaktionelle Sichtbarkeitsschalter (`enabled`, `is_active`,
    `hidden`, `visible`) das Item ausgeblendet hatte.
2.  **Container-Parität fehlte**: Vertrag zählte „aktives Kind",
    unabhängig vom tatsächlich akzeptierten `section_type`. Außerdem
    fehlte der Container-Title-Fallback, den fünf Renderer
    (`cards_v1` / `feature_grid_v1` / `product_scroller_v1` /
    `product_showcase_list_v1` / `download_list_v1`) explizit haben.
3.  **`card_v1`** wurde pauschal mit `title` als Pflichtfeld geführt —
    deutlich strenger als der Renderer, der auch eine Karte mit Bullets
    oder Chips noch sichtbar rendert.
4.  **Echte `return null`-Stopper waren nicht hinterlegt** für
    `stats_v1`, `tabs_v1`, `rich_v1`, `teaser_2col_v1`, `contact_block_v1`.
5.  **Generischer Schreibschutz fehlte**: `rpc_admin_update_section_field`
    kannte nur drei CTA-Felder. Ein Redakteur konnte über jedes andere
    whitelisted Feld einen aktiven Block in einen nicht renderfähigen
    Zustand versetzen.
6.  **Es gab kein CI-Gate**, das ausschließlich neue
    Renderfähigkeitsfehler bewertet — der bestehende globale
    Spiegel-Audit ist absichtlich rot bei Whitelist- und Navigations-
    Hygienelücken.
7.  **Berichtssprache zu offensiv**: „kein aktiver Standardbaustein
    rendert null" stand im Bericht, obwohl mehrere Renderer-Stopper
    nicht geprüft waren.

## Was Batch 56.1 macht

### Renderfähigkeitsvertrag — Renderer-Parität

`src/features/cms/contract/renderability.ts` ist die Single Source.
Aufgenommen / korrigiert:

| Typ                          | Regel                                                                              | Quelle (Renderer-`return null`)                     |
| ---------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------- |
| `cta_v1`                     | `title`, `cta_label`, `cta_href` bilingual                                         | `CtaV1.tsx` Z. 53                                   |
| `content_v1`                 | `title` ODER `text` pro Locale                                                     | `ContentSectionV1.tsx` Z. 6                         |
| `rich_v1`                    | `body` pro Locale                                                                  | `RichV1.tsx` Z. 12                                  |
| `teaser_2col_v1`             | `title` ODER `text` pro Locale                                                     | `Teaser2ColV1.tsx` Z. 19                            |
| `contact_block_v1`           | `title` / `phone` / `email` / `cta_href` in irgendeiner Locale                     | `ContactBlockV1.tsx` Z. 12                          |
| `faq_v1`                     | mind. 1 *aktives* Item (Schalter geprüft) mit Frage+Antwort je Locale              | `FaqV1.tsx` Z. 63–69, 98                            |
| `cards_v1`/`feature_grid_v1` | mind. 1 *`card_v1`*-Kind ODER Container-`title` (any locale)                       | `CardsSectionV1.tsx` Z. 19, `FeatureGridV1.tsx` Z. 24 |
| `product_scroller_v1`        | mind. 1 *`card_v1`*-Kind ODER Container-`title`                                    | `ProductScrollerV1.tsx` Z. 19                       |
| `product_showcase_list_v1`   | mind. 1 *`card_v1`*-Kind ODER Container-`title`                                    | `ProductShowcaseListV1.tsx` Z. 28                   |
| `download_list_v1`           | mind. 1 *`download_item_v1`*-Kind ODER Container-`title`                           | `DownloadListV1.tsx` Z. 10                          |
| `stats_v1`                   | mind. 1 *`stat_v1`*-Kind — **kein** Title-Fallback                                 | `StatsV1.tsx` Z. 8                                  |
| `tabs_v1`                    | mind. 1 *`tab_v1`*-Kind — **kein** Title-Fallback                                  | `TabsV1.tsx` Z. 40                                  |
| `card_v1`                    | irgendein Text/Eyebrow/Bullet/Chip/Link-Label/Icon-Name in irgendeiner Locale       | bewusste Vereinheitlichung (s. u.)                  |

**`card_v1` — fachliche Entscheidung**: Der Renderer rendert immer einen
`<article>`-Knoten, auch ohne Inhalt. Der Vertrag fordert daher mindestens
ein sichtbares Inhaltsfeld (Titel, Beschreibung, Eyebrow, ein Bullet,
ein Chip, ein Link-Label oder einen Icon-Namen). Reine Bild-/Asset-
Karten werden in dieser Etappe **nicht** geprüft (Assets liegen in
`cms_assets`; SQL-Spiegel würde sich nicht lohnen) — das ist eine
dokumentierte Grenze und keine „grüne" Aussage über das Asset-Modul.

### Generischer Schreibschutz (DB-seitig)

`public.rpc_admin_update_section_field` ist nicht mehr feldspezifisch
hartcodiert, sondern prüft NACH jedem UPDATE über die zentrale
`public.cms_section_renderability(...)`:

- Section deaktiviert? → freie Bearbeitung, keine Prüfung.
- Section aktiv und **vorher schon nicht renderfähig**? → freie
  Bearbeitung (kein Schreibstau bei Altlasten).
- Section aktiv und vorher renderfähig, durch das UPDATE bricht der
  Vertrag? → Sub-Block-Exception, UPDATE wird **atomar zurückgerollt**,
  Antwort `{ success:false, error:"section_no_longer_renderable",
  missing:[…], hint:"Aktiver Block würde durch diese Änderung nicht mehr
  rendern. Erst ausblenden, dann ändern." }`.

`rpc_admin_set_section_active` aus Batch 56 blockiert weiterhin das
Aktivieren nicht renderfähiger Sections — beide Pfade nutzen jetzt
**dieselbe** SQL-Helper-Funktion.

### TS↔SQL-Parität

`public.cms_section_renderability` (Migration 56.1) wurde Zeile für
Zeile gegen die TypeScript-Regeln neu geschrieben. Insbesondere:

- FAQ-Sichtbarkeitsschalter `enabled` / `is_active` / `hidden` /
  `visible` werden in **jeder** Locale berücksichtigt (Spiegel zu
  `FaqV1.collectItems`).
- Container-Kinder werden gegen den vom Renderer akzeptierten Typ
  gefiltert (`acceptedChildTypes`). Befund-Code unterscheidet
  `no_active_children` vs. `wrong_child_type`.
- `titleFallbackField` wird für die fünf Container abgebildet, für
  `stats_v1`/`tabs_v1` explizit NICHT.
- Neue Stopper-Klassen: `missing_required_any_of_any_locale` für
  `contact_block_v1` und `card_v1`.

### CI-Gate

Neues Script `scripts/cms/renderability-gate.mjs`:

- Liest alle aktiven Sections mit Vertrag und fragt
  `public.cms_section_renderability` ab.
- **Carve-out**: Sections, die nicht über den kanonischen
  `CmsBodyRenderer` rendern (anwendungen.* Detail-Seiten mit
  `AnwendungDetailPage` und Section-Keys `broschure`/`content`/
  `leistungen`/`systembausteine`/`anforderungen`) werden als
  `out_of_scope` ausgewiesen, NICHT als Vertragsbruch. Begründung:
  diese Seiten lesen `label`/`cta_label` etc. über eigenen React-Code,
  nicht über `ContentSectionV1`.
- **Baseline-Mechanik** (zentraler Hebel für „dauerhaft grün"): die
  Datei `scripts/cms/output/renderability-gate.baseline.json` listet
  akzeptierten Altbestand. Das Gate vergleicht die aktuelle Lage gegen
  diese Baseline und schlägt **ausschließlich bei NEUEN Befunden**
  fehl. Die Baseline darf nur SCHRUMPFEN. Pflege ausschließlich über
  `node scripts/cms/renderability-gate.mjs --update-baseline`.
- Verdrahtung: neuer npm-Script `cms:gate:renderability`, zusätzlich
  als letzter Schritt in `cms:audit`.
- Der globale Spiegel-Audit darf weiterhin separat rot sein
  (Whitelist-/Navigations-Hygiene).

### Tests

- TS: `src/features/cms/contract/__tests__/renderability.test.ts`
  von 12 auf **24 Tests** ausgebaut. Abgedeckt: bilingual /
  anyLocale / FAQ-Items inkl. enabled-/hidden-/visible-Pfaden /
  Container mit Title-Fallback / `wrong_child_type` /
  `stats_v1` & `tabs_v1` ohne Title-Fallback / `card_v1`-Relax /
  Unknown-Type-Pfad.
- SQL: neuer Smoketest `supabase/tests/rpc_admin_set_section_active.sql`
  (vier Pfade: Aktivieren ohne Pflichtfelder ⇒ blockiert,
  Pflichtfelder setzen ⇒ Aktivieren ⇒ Deaktivieren).
- SQL: `supabase/tests/rpc_admin_update_section_field.sql` um den
  generischen Schreibschutz erweitert (Pflichtfeld leeren auf aktiver
  Section ⇒ Rollback; Deaktivieren ⇒ Bearbeitung wieder möglich).
- Beide SQL-Smoketests laufen in einer Transaktion mit `ROLLBACK` und
  schreiben nichts dauerhaft. Sie verlangen einen DB-User mit
  `INSERT`/`UPDATE` auf `cms_pages`/`cms_sections` (z. B.
  `service_role` via `SUPABASE_DB_URL`) — in der Lovable-Sandbox läuft
  der psql-User nicht mit diesen Rechten; CI-Anbindung ist offen.

### Migrationen

- `supabase/migrations/20260618094011_…sql` (Batch 56) — bleibt.
- `supabase/migrations/<batch56_1>.sql` — Batch 56.1:
  - `CREATE OR REPLACE` für `public.cms_section_renderability` mit
    voller Renderer-Parität.
  - `CREATE OR REPLACE` für `public.rpc_admin_update_section_field`
    mit Sub-Block + Exception-Rollback und generischem Vertrags-Check.
  - Keine Schema-, RLS- oder Datenmigration.

### Bestandsbereinigung

Keine pauschalen Inhaltsmigrationen. Die drei Broschüren-CTAs
(`broschure_schule`, `broschure_wohnheim`, `broschure_intern`) sind
bereits in Batch 56 idempotent ergänzt worden.

## Vorher / Nachher (Zahlen)

| Kennzahl                                                                          | Vor 56.1 | Nach 56.1 |
| --------------------------------------------------------------------------------- | -------: | --------: |
| Renderfähigkeitsregeln im Vertrag                                                 |        9 |        14 |
| Renderer-Stopper ohne Vertragsabbildung                                           |        5 |         0 |
| FAQ-Sichtbarkeitsschalter im Vertrag erkannt                                      |     nein |        ja |
| Container-Regel: vom Renderer akzeptierter Kindtyp                                |     nein |        ja |
| Container-Regel: Title-Fallback                                                   |     nein |        ja |
| `card_v1` vs. Renderer-Verhalten                                                  | strenger |  vereinheitlicht |
| Generischer Schreibschutz in `rpc_admin_update_section_field`                     |     nein |        ja |
| Eigenständiges Renderability-CI-Gate                                              |     nein |        ja |
| TS-Tests Renderfähigkeit                                                          |       12 |        24 |
| SQL-Smoketests (Aktivieren / Schreibschutz)                                       |        0 |         2 |
| Aktive Sections, die das Gate prüft                                               |        — |     1 401 |
| Out-of-scope (custom Page-Renderer)                                               |        — |        63 |
| Baseline-Altbestand (akzeptiert, darf nur schrumpfen)                             |        — |       102 |
| NEUE Renderfähigkeitsbefunde                                                      |        — |         0 |

## Audit- und Build-Ergebnisse

- `bunx vitest run src/features/cms/contract/__tests__/renderability.test.ts`
  ⇒ **24/24 Tests grün**.
- `node scripts/cms/renderability-gate.mjs`
  ⇒ **exit 0**, 0 neue Befunde, 102 Baseline-Altbestand offen,
  63 out-of-scope.
- `node scripts/cms/globaler-spiegel-audit.mjs` bleibt absichtlich
  separat. Container-Check `CONTAINER_LEER` benutzt jetzt die zentrale
  Renderfähigkeitslogik und unterscheidet `CONTAINER_FALSCHER_KINDTYP`.

## Vertragsgrenzen (bewusst und dokumentiert)

- **Asset-only Karten** (`card_v1` nur mit Bild/Icon, ohne Text) werden
  in Batch 56.1 nicht als renderfähig markiert (sie sind es im Renderer
  trotzdem). Begründung im Vertragskommentar.
- **`anwendungen.*` Detail-Seiten** (T05) mit `AnwendungDetailPage`-
  Renderer rendern bestimmte Section-Keys über eigenen React-Code, nicht
  über `ContentSectionV1`. Diese Kombinationen sind im Gate als
  `out_of_scope` markiert.
- **Baseline-Altbestand** (102 Findings, alles `content_v1` ohne
  `title`/`text` plus 1 leerer `cards_v1`-Container) wird gemessen, aber
  nicht als „neuer" Befund gewertet. Pflicht: nur schrumpfen, nie
  wachsen lassen.

## Was Batch 56.1 explizit NICHT macht (Phase 2 bleibt offen)

- Keine atomare seitenübergreifende Move-RPC.
- Keine Admin-UX-Politur über die Pflichtfeld-Toast-Meldung hinaus
  (die aus Batch 56 stammt).
- Kein Legacy-`sort_order`-Inventar.
- Keine erweiterte Testmatrix für Move/Copy/Paste/Legacy-Seiten.
- Keine Änderungen an Produktdatenbank, Auth, Routen, Navigation oder
  i18n-JSONs.

## Restpunkte (für Phase 2 oder einen separaten Cleanup-Batch)

1.  **Baseline schrittweise abbauen** (102 Einträge): Sections, die im
    Bestand bleiben sollen, in `cta_v1` / Custom-Page-Pattern umziehen
    oder Inhalte ergänzen. Jeder Erfolg drückt die Baseline runter und
    wird über `--update-baseline` festgeschrieben.
2.  **Custom-Page-Renderer-Registry**: dauerhafte, deklarative Lösung
    statt Carve-out-Konstante im Gate-Script (z. B. neue Spalte
    `cms_pages.renderer_mode` = `canonical` | `custom`).
3.  **Asset-Renderfähigkeit für `card_v1`** (Bild-/Icon-only) als
    Erweiterung des Vertrags und der SQL-Funktion.
4.  **CI-Verdrahtung** der beiden SQL-Smoketests gegen einen
    `service_role`-Connection-String.

## Korrekturen am Sprachgebrauch

Die in Batch 54/55 gewählte Formulierung „Single Source + 1:1-Spiegel"
wird ab jetzt nur dort verwendet, wo Renderer, TypeScript-Vertrag,
SQL-Spiegel und Audit/Gate **derselben** Wahrheit folgen. Für die in
Batch 56.1 ausgewiesenen Grenzen (Asset-only Karten, custom Page-
Renderer, content_v1-Altbestand) wird die Grenze ausdrücklich benannt.
„Kein aktiver Standardbaustein rendert null" gilt **innerhalb des
Gate-Scopes** und nur unter Berücksichtigung von Baseline-Altbestand
und Out-of-scope-Liste.
