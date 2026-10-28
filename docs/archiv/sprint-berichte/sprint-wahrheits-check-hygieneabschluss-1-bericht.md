# Sprint-Bericht: cms-light-objekt-wahrheits-check-hygieneabschluss-1

Stand: 2026-06-03 · Scope: nur Review-/Admin-/Tooling-Logik + Doku.
Kein Public-Code, keine DB-Migration, keine i18n-/Navigations-Änderung.

## Ziel

Den objektbasierten Wahrheits-Check so korrigieren, dass er den echten
Renderer-Vertrag abbildet, offline reproduzierbar ist und keine falschen
roten oder falschen grünen Ampeln mehr erzeugt.

## Was sich geändert hat

### 1. Harvester (`scripts/cms/faq-cta-toggle-inventar.mjs`)

- Plattformneutral: kein `find`, kein `globSync` mehr — reiner
  `fs.readdirSync({withFileTypes:true})`-Walker. Läuft auch auf Windows.
- Snapshot-Modus: `--snapshot <dir>` liest `cms_pages.json` /
  `cms_sections.json` aus `<dir>/tables/` und braucht keine Supabase-Env.
- Kommentar-Stripper vor dem Regex-Scan → keine `foo.bar`-False-Positives
  aus Doku-Kommentaren in den generierten Allowlists.
- Erzeugt neben `faq` und `cta` jetzt zusätzlich eine `body`-Map:
  pro `page_key` `ok` (Page-Code zieht Body über `CmsBodyRenderer` oder
  `CmsOnlyShell`) oder `unknown`.

Lauf vom 2026-06-03 (Snapshot):

```
Quelle: snapshot:/dev-server/scripts/sync/snapshot
Seiten mit FAQ/CTA: 113 · Seiten gesamt: 117
FAQ:  OK 23 · ORPHAN 66 · UNKNOWN 13 · MIXED 0 · — 11
CTA:  OK 30 · ORPHAN 68 · UNKNOWN 13 · MIXED  1 · — 1
Body: ok 23 · unknown 94
```

### 2. Vertragsmodell (`src/features/admin/lib/objectContracts.ts`)

- Neue Felder `childSectionType` + `childContentFields`:
  Kind-basierte Bausteine werden jetzt als Kinder geprüft, nicht mehr
  als `items.*`-Wildcards auf Eltern-Feldern.
- Betroffen: `stats_v1` → `stat_v1`, `tabs_v1` → `tab_v1`,
  `download_list_v1` → `download_item_v1`,
  `cards_v1` / `product_scroller_v1` / `feature_grid_v1` → `card_v1`.
- Container-Kopf ist jetzt **optional** (`required: false`) — der
  Renderer zeigt Container auch ohne Kopf, sobald Kinder vorhanden sind.
  Keine falschen roten Ampeln mehr nur wegen fehlendem Kopf.

### 3. Validierungs-Logik (`src/features/admin/lib/truthSources.ts`)

- Tri-state Page-Pfad in `computePagePath`:
  - CTA/FAQ: wie bisher über `KNOWN_PAGE_OBJECT_CONTRACTS.faq`/`.cta`.
  - Alle anderen: grün **nur** wenn `body = ok` (Page-Code nutzt
    `CmsBodyRenderer` / `CmsOnlyShell`). Sonst gelb („unbekannt"),
    nicht mehr pauschal grün.
- `computeGroups` wertet Kind-Bausteine echt aus: rot bei null Kindern,
  gelb bei Kindern ohne Inhalt, grün sobald mind. ein Kind die
  `childContentFields` befüllt.
- `buildTruthReport` baut dafür eine `childrenByParent`-Map.

### 4. Typen (`src/features/admin/lib/knownPageObjectContracts.ts`)

- `PageObjectContractKind` um `"body"` erweitert.
- `KNOWN_PAGE_OBJECT_CONTRACTS` enthält jetzt `faq`, `cta`, `body`.

## Reproduzierbarkeit

```
# Snapshot ziehen (einmalig oder bei Bedarf):
psql -t -A -c "select json_agg(row_to_json(t)) from (
  select page_key, page_type, status, is_active, title_de from cms_pages) t" \
  > scripts/sync/snapshot/tables/cms_pages.json
psql -t -A -c "select json_agg(row_to_json(t)) from (
  select page_key, section_key, section_type, is_active from cms_sections) t" \
  > scripts/sync/snapshot/tables/cms_sections.json

# Harvester offline, ohne Supabase-Env:
node scripts/cms/faq-cta-toggle-inventar.mjs --snapshot scripts/sync/snapshot
```

## Abnahmekriterien (Status)

| Kriterium | Status |
|---|---|
| Snapshot-Modus läuft ohne Supabase-Env | ✅ |
| Kein `find src` im Skript | ✅ |
| Kein `foo.bar` / Kommentar-False-Positive in Allowlists | ✅ (`grep foo.bar` = 0) |
| Container ohne Kopf nicht mehr fälschlich rot | ✅ (`required: false` im Container-Vertrag) |
| Kind-Sections als Kinder geprüft, nicht als `items.*` | ✅ (`childSectionType` in stats/tabs/downloads/cards) |
| Page-Pfad nur grün bei nachgewiesenem CMS-Body | ✅ (`body = ok` Voraussetzung) |
| Keine Public-/DB-/i18n-/Navigations-Änderung | ✅ |

## Bekannte offene Punkte (für nächste Sprints)

- Body-Inventur sagt `unknown` für 94/117 Seiten. Das ist konservativ
  korrekt (lieber gelb als falsch grün), aber viele dieser Seiten nutzen
  faktisch CMS-Sections über andere Wrapper. Nächster Schritt:
  Wrapper-Inventur erweitern (z. B. `<CmsSections/>`-artige Helpers,
  Page-Templates), damit der Harvester mehr `body = ok` findet.
- `db_dupes`-Restbestand und `section_inactive`-Triage bleiben offen.
- `HomePage.tsx` ist weiterhin die bewusste Ausnahme ohne `useCmsI18n`.

## Nicht passiert (bewusst)

- Keine Migrationen, keine Writes in `cms_section_fields` / `cms_assets`.
- Keine Renderer-Änderungen, keine Whitelist-Änderungen.
- Geändert: nur `objectContracts.ts`, `truthSources.ts`,
  `knownPageObjectContracts.ts`, der Harvester und diese Doku.
