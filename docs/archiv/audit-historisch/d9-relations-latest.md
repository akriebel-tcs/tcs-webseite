# D9 Relationsgruppen — aktueller Stand

_Generiert: 2026-05-29T12:33:50.755Z_

Quelle: `scripts/cms/output/d9-owner-buckets.json` (read-only). Aggregiert die D9-Treffer aus den
Symptom-Buckets (`child_not_in_allowed_children`, `parent_not_in_allowed_parents`, …)
zu echten `parent -> child`-Beziehungen, damit symmetrische Vertragslücken nicht
doppelt gezählt werden müssen.

## Summen

- D9-Treffer (Summe aller Pattern-Vorkommen, kann symmetrische Beziehungen doppelt zählen): **25**
- Distinct Parent→Child-Beziehungen: **2**

## Relationen (sortiert nach Count)

| Parent | Child | Count | Patterns | Parent→Child? | Child→Parent? | Parent-Renderer |
|---|---|---:|---|---|---|---|
| `(none/top-level)` | `card_v1` | 19 | child_only_at_top_level | null | false | no-contract |
| `rich_v1` | `rich_v1` | 6 | top_level_only_under_parent | false | false | generic |

## Detail je Relation

### `(none/top-level)` → `card_v1` (19)

- D9-Patterns: `child_only_at_top_level`
- Parent-Vertrag vorhanden: **false**, Child-Vertrag vorhanden: **true**
- `parent.allowed_children` enthält Child: **null**
- `child.allowed_parents` enthält Parent: **false**
- Parent-Renderer-Art: **no-contract**, Child-Renderer-Art: **generic**
- Betroffene Seiten (1): `anwendungen.root`
- Beispiele:
  - `anwendungen.root / card_wohnen_einfamilienhaus_kopie (inactive)`
  - `anwendungen.root / card_efh (inactive)`
  - `anwendungen.root / card_mfh (inactive)`
  - `anwendungen.root / card_ktu_groanl (inactive)`
  - `anwendungen.root / card_ami (inactive)`
  - `anwendungen.root / card_tcu_bka (inactive)`

### `rich_v1` → `rich_v1` (6)

- D9-Patterns: `top_level_only_under_parent`
- Parent-Vertrag vorhanden: **true**, Child-Vertrag vorhanden: **true**
- `parent.allowed_children` enthält Child: **false**
- `child.allowed_parents` enthält Parent: **false**
- Parent-Renderer-Art: **generic**, Child-Renderer-Art: **generic**
- Betroffene Seiten (1): `home.start`
- Beispiele:
  - `home.start / persona_architekten`
  - `home.start / persona_bauherren (inactive)`
  - `home.start / persona_wohnungswirtschaft (inactive)`
  - `home.start / persona_fachplaner (inactive)`
  - `home.start / persona_handwerk (inactive)`
  - `home.start / persona_fachhandel (inactive)`

