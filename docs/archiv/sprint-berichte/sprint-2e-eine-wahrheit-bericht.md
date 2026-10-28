# Sprint 2e — D9-Strukturmigration nächster Pilot (`produkte.hub` / `stat_v1`)

_Generiert: 2026-05-29_

## Entscheidung

**Option B — keine Migration.**

Begründung in einem Satz: Der vorgeschlagene Pilot existiert in der Datenbank
nicht — auf `produkte.hub` gibt es **null** Sections vom Typ `stat_v1` und
keinen `stats_v1`-Container, also gibt es auch nichts zu reparenten.

## 1. Pilotfälle exakt bestimmen

Read-only-Abfrage gegen die Live-DB (`cms_sections`):

```sql
SELECT section_key, section_type, is_active, sort_order, parent_section_id
FROM cms_sections
WHERE page_key = 'produkte.hub'
ORDER BY sort_order, section_key;
```

Ergebnis (vollständig):

| section_key | section_type | is_active | sort_order | parent_section_id |
|---|---|---|---:|---|
| `cards` | `card_grid_v1` | true | 0 | — (top-level) |
| `cards.tuerkommunikation` | `card_v1` | true | 1 | `cards` |
| `cards.zutrittskontrolle` | `card_v1` | true | 2 | `cards` |
| `cards.eingangsloesungen` | `card_v1` | true | 3 | `cards` |

**Befund:** Es gibt auf `produkte.hub` weder `stat_v1`- noch `stats_v1`-Sections.
Der Auftrag „ca. 3 aktive Top-Level-`stat_v1`-Fälle auf `produkte.hub`" lässt
sich gegen den aktuellen Datenstand nicht reproduzieren.

### Globaler Gegenbeleg `stat_v1`

```sql
SELECT page_key,
       COUNT(*) FILTER (WHERE parent_section_id IS NULL) AS top_level,
       COUNT(*) FILTER (WHERE parent_section_id IS NOT NULL) AS child,
       COUNT(*) FILTER (WHERE is_active) AS active
FROM cms_sections WHERE section_type='stat_v1'
GROUP BY page_key ORDER BY page_key;
```

| page_key | top_level | child | active |
|---|---:|---:|---:|
| home.start | 0 | 4 | 4 |
| home.ueber-tcs | 0 | 4 | 4 |
| personas.architekt | 0 | 4 | 4 |
| personas.bauherr | 0 | 4 | 4 |
| personas.fachhandel | 0 | 4 | 4 |
| personas.fachplaner | 0 | 4 | 4 |
| personas.handwerk | 0 | 4 | 4 |
| personas.wohnungswirtschaft | 0 | 4 | 4 |

Alle 32 aktiven `stat_v1`-Sections weltweit hängen bereits korrekt unter ihrem
`stats_v1`-Container. **Top-Level-Treffer = 0.** Auch das D9-Audit
(`scripts/cms/output/d9-owner-buckets.json`) listet kein `stat_v1` in irgendeinem
Muster — die 19 `child_only_at_top_level`-Treffer sind ausschließlich
inaktive `card_v1`-Legacy-Reste auf `anwendungen.root` (in Sprint 2d bereits
entschieden, keine Migration).

## 2. Renderer-/Owner-Beweis

- **Renderer für `produkte.hub`:** `src/features/produkte/pages/ProduktHubPage.tsx`
  (Spezialseite, kein generischer `CmsBodyRenderer`). Iteriert über
  `cms.sections` und behandelt nur `cards` (`card_grid_v1`). Ein
  `stats_v1`-/`stat_v1`-Zweig existiert dort nicht — selbst wenn man Sections
  anlegen würde, hätten sie ohne Renderer-Erweiterung keine Public-Wirkung.
- **`stats_v1`/`stat_v1`-Renderer:** `src/features/cms/components/sections/StatsV1.tsx`
  liest ausschließlich `ctx.children` mit `section_type === "stat_v1"`. Ein
  Top-Level-`stat_v1` würde von diesem Renderer ohnehin nicht beachtet.
- **Hardcodierte Fallbacks / i18n-Zweitwahrheit:** auf `produkte.hub` keine —
  Headline/Intro/Karten kommen aus `cms_section_fields`, Bilder aus `cms_assets`.

## 3. Warum heute keine Migration

- Es gibt keine Quell-Sections (`stat_v1` auf `produkte.hub`) → nichts zu
  reparenten.
- Es gibt keinen Ziel-Container (`stats_v1` auf `produkte.hub`) → kein gültiges
  Parent.
- Anlegen neuer Sections wäre **Inhaltspflege**, nicht Strukturmigration, und
  würde dem Sprint-Verbot „keine Inhalte ändern, keine neuen Sections
  aktivieren" widersprechen.
- Eine breite D9-Massenmigration auf andere Typen ist in Sprint 2e
  ausgeschlossen.

**Owner-Empfehlung für Sprint 2f:** Pilot weg von `stat_v1` verlagern, hin zu
einem real existierenden D9-Muster mit Substanz, z. B.
`parent_not_in_allowed_parents` (88 Treffer) oder
`child_not_in_allowed_children` (92 Treffer). Das sind echte D9-Reparatur­chancen
und betreffen Sections, die tatsächlich existieren.

## 4. Nachprüfung

- `npm run cms:audit:contract` → **15 OK · 6 Warnung · 0 Konflikt** (unverändert).
- `npm run cms:audit:contract-drift` → **D1=0 · D8=0 · D9=205** (unverändert
  gegenüber Sprint 2d).
- `npm run cms:audit:d9` → 205 D9 gesamt (185 aktiv / 20 inaktiv); Muster:
  92 `child_not_in_allowed_children`, 88 `parent_not_in_allowed_parents`,
  19 `child_only_at_top_level`, 6 `top_level_only_under_parent`.
- `npm run build` → **nicht manuell ausgeführt**; der Lovable-Harness baut
  automatisch nach Commits, kein Workaround.

### Vorher/Nachher (Audit-Kennzahlen)

| Kennzahl | vorher (Sprint 2d) | nachher (Sprint 2e) |
|---|---:|---:|
| D1 | 0 | 0 |
| D8 | 0 | 0 |
| D9 | 205 | 205 |
| Sections | 1442 | 1442 |
| Felder | 38877 | 38877 |
| Assets | 739 | 739 |
| Whitelist | 42135 | 42135 |

Keine Datenänderung, keine Drift-Bewegung — das ist der erwartete Effekt von
Option B.

## 5. Bestätigung (Sprint-Verbote)

- Keine Produktdatenbank angefasst.
- Keine Inhalte, Bilder oder Feldwerte verändert.
- Keine Whitelist-Zeile gelöscht oder verändert.
- Keine Public-Renderer-/Routen-/Navigation-/Footer-/Breadcrumb-/i18n-Änderung.
- Keine neue Schreib-RPC.
- Keine breite D9-Massenmigration.
- Keine Section aktiviert oder deaktiviert.
- Keine Migration an `anwendungen.root` / `card_v1`.
- Keine Migration an `mobile-tk-preview.root` / `tab_v1`.

## Empfohlene nächste Etappe

`cms-light-eine-wahrheit-sprint-2f-d9-naechster-owner-bucket-oder-d3-d5-restklaerung-1` —
echten D9-Bucket wählen (`parent_not_in_allowed_parents` oder
`child_not_in_allowed_children`) **oder** in Richtung D3/D5-Restklärung
schwenken, jeweils mit Renderer-Beweis vorab.
