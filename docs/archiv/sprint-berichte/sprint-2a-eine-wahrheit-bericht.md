# Sprint 2a „Eine Wahrheit" — Contract-Coverage & Renderer-Owner (P1)

Stand: 2026-05-28

## Ziel

Vor dem flächendeckenden Daten-/Whitelist-Seeding (Sprint 2b) zuerst die
Vertragslücken aus dem Drift-Audit schließen, damit nicht für unbekannte
oder spezielle Section-Typen blind Felder erzeugt werden.

Fokus:
- D1 `contract_missing` reduzieren oder fachlich erklären
- D8 `active_without_renderer` kuratieren
- D9 `invalid_parent_child` neu bewerten, wo Eltern bisher D1 waren

Nicht in dieser Etappe: Daten-/Whitelist-Seeding, neue Schreib-RPCs,
sichtbare Public-Änderungen, Produktdatenbank.

## Audit-Zahlen — vorher / nachher

| Klasse | vorher | nachher | Hinweis |
|---|---:|---:|---|
| D1 contract_missing | 30 | **0** | 4 fehlende Typen ergänzt |
| D8 active_without_renderer | 16 | **0** | child-only Typen werden jetzt korrekt als D9 (nicht D8) gezählt; verbleibende generic-Typen ohne Renderer sind ausschließlich `card_v1`/`stat_v1` an Top-Level → D9 |
| D9 invalid_parent_child | 214 | **218** | +4 durch neu im Vertrag erfasste `tab_v1`-Sections auf `mobile-tk-preview.root` ohne Parent — korrekt als `child_only_at_top_level` markiert |
| D2 fields_unknown_to_contract | 2628 | 2634 | +6 unverändert (neue Typen ergänzen keine neuen Legacy-Felder) |
| D3 / D5 | 15346 / 15111 | 15346 / 15111 | unverändert — Seeding ist Sprint 2b |
| D10 i18n_or_special_owner_risk | 17 | 28 | +11 durch neue `known_specials`-Hinweise (gewollte Doku) |

## Neue Vertragstypen

| section_type | Status | Renderer / Owner | Top-Level | Kinder |
|---|---|---|---|---|
| `list_v1` | **special** | `ReferenzprojektDetailPage` — liest `cms.text(<section>, "items")` und splittet zeilenweise | ja | — |
| `tab_v1` | **generic** | via Eltern `TabsV1.tsx` (Kind von `tabs_v1`) | nein | — |
| `role_tabs_v1` | **special** | `SnipdooIpPage` — liest dynamisch `tabs.<roleKey>.label\|headline\|p1\|p2` | ja | — |
| `series_override_container_v1` | **special** (Container) | `CatalogMvp` / `TuerkommunikationHub` — sort_order/thumbnail-Quelle für Serienkacheln | ja | `series_override_v1` |

Begleitend justiert:
- `series_override_v1`: `allowed_parents = ["series_override_container_v1"]` ergänzt.

### Begründung der Statuswahl

- **`list_v1` = special**: Es gibt bewusst keinen generischen Renderer.
  Nur `ReferenzprojektDetailPage` konsumiert das Feld `items`. Eine
  Aufnahme in `CmsBodyRenderer.RENDERERS` hätte Public-Wirkung und ist
  damit Sprint-2a-Tabu.
- **`tab_v1` = generic** (child-only): wird vom existierenden `TabsV1`
  gelesen. Vertrag dokumentiert Pflichtfelder + dynamisches
  `vorteile.<n>.*`-Muster. Der DB-Bestand auf `mobile-tk-preview.root`
  hat `tab_v1`-Sections ohne Parent — D9 markiert das korrekt als
  `child_only_at_top_level`. Keine automatische Umhängung in dieser
  Etappe (verboten laut Auftrag).
- **`role_tabs_v1` = special**: keine festen text_fields im Vertrag —
  alle Inhalte liegen unter `tabs.<roleKey>.*`. Die Page liest die
  Rollenliste aus Code/i18n und fragt pro Rolle dynamisch ab.
- **`series_override_container_v1` = special (Container)**: kein
  sichtbarer Header, reiner Admin-Pflegeblock. Kinder bleiben legacy.

## Audit-Logik-Anpassungen (`scripts/cms/contract-drift-audit.mjs`)

1. `DYNAMIC_FIELD_PATTERNS` erweitert um
   `^tabs\.[A-Za-z0-9_-]+\.(label|headline|p1|p2)$` und
   `^vorteile\.\d+\.(headline|body)$` — damit D2 die dynamischen
   Felder von `role_tabs_v1` und `tab_v1` nicht fälschlich als
   „unbekannt" zählt.
2. D8 schließt child-only Typen (`contract.top_level === false`)
   explizit aus — diese Fälle gehören semantisch zu D9
   (`child_only_at_top_level`) und sollen nicht doppelt erscheinen.

`buildAdminFieldPlanForSection` nutzt dieselben dynamischen Muster,
damit der Admin-Feldplan stabil bleibt und keine erfundenen Massenfelder
für Legacy-Typen erzeugt.

## D8 — Restbewertung

`D8 = 0`. Die ursprünglichen 16 Treffer waren ausschließlich `card_v1`
und `stat_v1` auf `produkte.hub` bzw. `produkte.eingangsloesungen.kopie`
ohne Parent. Diese sind nun korrekt als D9
(`child_only_at_top_level`) klassifiziert — sie brauchen Sprint-2b
(Datenkurration), nicht Sprint-2a (Vertragsklärung).

## Offen / bewusst belassen

- **D9 (218 Fälle)** wird in Sprint 2b/2c kuratiert. Keine automatische
  Reparatur in dieser Etappe (Inhalte unverändert).
- **`tab_v1`-Sections auf `mobile-tk-preview.root`** liegen historisch
  als Top-Level statt unter dem `tabs_v1`-Container `zielgruppen`.
  Owner-Entscheidung erforderlich, ob Umhängung oder Datenmodell-Fix.
- **`series_override_v1`-Bestand** bleibt Legacy ohne aktiven
  Renderer; Admin zeigt das per Vertragsstatus an.
- **D3/D5** bleiben hoch — das ist Absicht: Sprint 2b seedet.

## Geänderte Dateien

- `src/features/cms/contract/sectionTypes.ts` — 4 neue Verträge
  (`list_v1`, `tab_v1`, `role_tabs_v1`, `series_override_container_v1`)
  + `allowed_parents` von `series_override_v1` ergänzt.
- `scripts/cms/contract-drift-audit.mjs` — dynamische Muster + D8-Logik.
- `src/features/admin/lib/buildAdminFieldPlan.ts` — dynamische Muster
  synchron gehalten.
- `docs/current-status.md` — Sprint-2a-Block ergänzt.
- `docs/04-betrieb/contract-drift-audit-latest.md` — neu generiert.
- `docs/04-betrieb/sprint-2a-eine-wahrheit-bericht.md` — dieses Dokument.

## Checks

- `npm run cms:audit:contract`: **15 OK · 6 Warn · 0 Konflikt**
  (Warnungen sind erwartet: SPECIAL-Verträge ohne generischen
  CmsBodyRenderer-Eintrag — `card_grid_v1`, `catalog_filter_grid_v1`,
  `list_v1`, `role_tabs_v1`, `series_override_container_v1`,
  `tab_v1`-Hinweis ist faktisch ein Eltern-Render).
- `npm run cms:audit:contract-drift`: läuft, schreibt JSON + MD.
  Counts siehe Tabelle oben.
- `npm run build`: in dieser Etappe nicht manuell ausgeführt — Build
  läuft über den Lovable-Harness wie in vorherigen Sprints.

## Scope-Bestätigung

- Keine Inhalte geändert.
- Keine Bilder geändert.
- Keine Whitelist geändert.
- Keine `cms_section_fields`-Zeilen angelegt.
- Keine neue Schreib-RPC.
- Keine Produktdatenbank berührt.
- Keine Public-Renderer-/Routen-/Navigation-/Footer-/Breadcrumb-/i18n-
  Änderung mit sichtbarer Wirkung.

## Empfohlene nächste Etappe

`cms-light-eine-wahrheit-sprint-2b-vertragsfelder-daten-whitelist-seeding-1`
— jetzt darf D3/D5-Seeding starten, weil der Vertrag die Typen kennt
und keine erfundenen Felder für Legacy/Spezial-Typen mehr erzeugt.
