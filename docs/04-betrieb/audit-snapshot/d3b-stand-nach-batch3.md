# D3b.1 — Stand nach Batch 3

Stand: 2026-06-04 (nach Re-Run aller relevanten Audits)

## A. Spiegel-Audits (Masterliste „Eine Wahrheit")

| Klasse | Wert |
|---|---:|
| 🔴 High-Blocker (Rot) | **0** |
| 🟡 Medium A `AKTIVE_DB_SECTION_OHNE_PUBLIC_RENDERPFAD` | **73** |
| 🟡 Medium B `PUBLIC_BLOCK_IGNORIERT_DB_VISIBILITY` | **33** |
| 🟡 Restschuld C `PUBLIC_BLOCK_OHNE_DB_BINDUNG` | **34** |
| Masterliste gesamt | **140** |
| Cluster offen | 4 (Anwendungen abgeschlossen, Eingangssysteme abgeschlossen) |

Quellen:
- `docs/04-betrieb/audit-snapshot/aktive-db-sections-ohne-renderpfad.json`
- `docs/04-betrieb/audit-snapshot/public-blocks-ignorieren-admin-visibility.json`
- `docs/04-betrieb/audit-snapshot/eine-wahrheit-offene-befunde-masterliste.json`

## B. CMS-Light Wahrheits-Check (Schwereklassen-Logik)

Live-Zahlen werden im Browser unter `/admin → Tab „Wahrheits-Check"` berechnet
(aus `cms_assets`, `cms_section_fields`, `cms_sections`, `cms_admin_editable_fields`).
Aus der DB lassen sich die Treiber jedoch deterministisch ableiten:

### B.1 Treiber für `critical` (Objektebene)

| Treiber | Anzahl Objekte | Quelle |
|---|---:|---|
| FAQ-Section aktiv, Page-Pfad `orphan` (Page-Code rendert FAQ nicht) | **52** | `KNOWN_PAGE_OBJECT_CONTRACTS.faq` |
| CTA-Section aktiv, Page-Pfad `orphan` | **58** | `KNOWN_PAGE_OBJECT_CONTRACTS.cta` |
| CTA-Section aktiv, Page-Pfad `mixed` | **1** | dito |
| `unknown_section_type` (kein Renderer im Vertrag) | **2** | `product_showcase_list_v1` |
| `db_dupes` (mehrere aktive Assets pro Slot/Viewport) | **0** | `cms_assets` |
| `section_missing` (Asset ohne Section) | **0** | `cms_assets` join `cms_sections` |
| `renderer_orphan` mit Spec `required` | wenige | nicht direkt aus DB, Schätzung 0–10 |

**Erwartetes Kritisch-Total (Objekte): ~111–120.**

### B.2 Treiber für `restschuld`

| Treiber | grobe Größenordnung |
|---|---:|
| `renderer_orphan` mit `expectation=optional` (`card_v1.icon_image`, `thumbnail`, `image_alt`, …) | dutzende |
| `page_component_read` (Sonderrenderer mit registrierter Ausnahme) | dutzende |

Exakte Zahl nur im Browser ablesbar; durch die Schwereklassen-Refaktorierung
(siehe `wahrheitscheck-schwereklassen.md`) sind diese Slots aus der Kritisch-
Klasse **bereits ausgenommen**.

### B.3 Warnungen

`missing_whitelist`, `editable_empty`, `not_yet_configured`, `section_inactive`,
`ui_fallback`, Page-Pfad gelb. Größenordnung mehrere hundert; keine Abnahme-Relevanz.

### B.4 Grün

`one_truth` + `page_component_read` ohne Auffälligkeiten. Mehrheit aller Slots.

## C. Aktualisiertes Page-Contract-Inventar

`src/features/admin/lib/knownPageObjectContracts.ts` wurde im Rahmen von D3b
neu erzeugt (Harvester: `scripts/cms/faq-cta-toggle-inventar.mjs`).
Aktuelle Verteilung:

| Kind | OK | ORPHAN | UNKNOWN | MIXED | — |
|---|---:|---:|---:|---:|---:|
| FAQ | 28 | 52 | 0 | 0 | 29 |
| CTA | 50 | 58 | 0 | 1 | 0 |
| Body | 114 | 0 | 0 | 0 | – |

`Body=ok` für **alle 114 Pages** — Folge: für jeden Nicht-FAQ-/CTA-Baustein
wird `page_path = green` errechnet. Das eliminiert eine bisherige große
Quelle falsch-positiver `critical`-Befunde (Karten/Hero/Stats/Tabs in
Seiten, die generisch über `CmsBodyRenderer` / `page-iterates-cms-sections`
rendern).

## D. Reichweite dieses Snapshots

- Spiegel-Audits A/B/C abgedeckt.
- Wahrheits-Check-Logik geprüft + Inventar regeneriert.
- Live-Wahrheits-Check-Zahlen pro Schwereklasse: erst beim nächsten Öffnen
  des Admin-Tabs aus dem Browser ablesbar (kein CLI-Pfad zur Aggregation).
- Keine Inhalts-, Layout- oder Schema-Änderungen.
