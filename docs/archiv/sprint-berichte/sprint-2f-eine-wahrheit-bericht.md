# Sprint 2f — D9 Relationsgruppen & R1-Vertragskorrektur (`tabs_v1 → tab_v1`)

_Generiert: 2026-05-29_

## Kurzfassung

- **Neue Sicht**: D9 wird nicht mehr nur als Symptombucket gezählt, sondern als
  echte `parent_section_type -> child_section_type`-Beziehung. Neues read-only
  Skript `scripts/cms/d9-relations.mjs` (npm-Skript `cms:audit:d9-relations`).
- **Befund**: Die 205 D9-Treffer aus Sprint 2e zerfallen tatsächlich in nur
  **3 distinct Parent→Child-Beziehungen** (die 88 Treffer aus
  `child_not_in_allowed_children` + 88 aus `parent_not_in_allowed_parents` sind
  dieselbe Beziehung von beiden Seiten gezählt).
- **R1-Korrektur**: `tabs_v1.allowed_children` ergänzt um `tab_v1` (war reine
  Symmetrielücke; `tab_v1.allowed_parents` enthielt bereits `tabs_v1`, und
  `TabsV1.tsx` rendert nachweislich `ctx.children` mit `section_type === "tab_v1"`).
  Renderer und Bestand unverändert, Vertrag ist nur wahrer.
- **D9 vorher/nachher**: 205 → **201** (−4 = `tabs_v1 → tab_v1`). D1=0, D8=0.

## 1. Relationsgruppen (aktueller Stand nach R1-Fix)

| Parent | Child | Count | D9-Patterns | Parent→Child? | Child→Parent? | Parent-Renderer |
|---|---|---:|---|---|---|---|
| `content_v1` | `card_v1` | 176 | child_not_in_allowed_children, parent_not_in_allowed_parents | false | false | generic |
| `(none/top-level)` | `card_v1` | 19 | child_only_at_top_level | — | false | — |
| `rich_v1` | `rich_v1` | 6 | top_level_only_under_parent | false | false | generic |

`tabs_v1 → tab_v1` (vorher 4 Treffer in `child_not_in_allowed_children`) ist
nach der Vertragskorrektur **vollständig aufgelöst** und erscheint nicht mehr
in der Tabelle.

## 2. Klassifikation R1–R5

### `tabs_v1 → tab_v1` — **R1 (Vertrag zu streng)**, jetzt korrigiert

- **Belege**:
  - `tab_v1.allowed_parents = ["tabs_v1"]` ist bereits gesetzt.
  - `TabsV1.tsx` Zeile 22: `const tabs = ctx.children.filter((c) => (c.section_type ?? "") === "tab_v1");`
    — der Container kann nichts anderes als `tab_v1`-Kinder rendern.
  - Bestand: 4 aktive Sections auf `mobile-tk-preview.root`
    (`tab_bauherren`, `tab_bewohner`, `tab_handwerk`, `tab_wohnungswirtschaft`)
    hängen korrekt unter dem Container `zielgruppen` (`tabs_v1`).
  - Vertragslücke war pure Symmetrieinkonsistenz: `allowed_children` von
    `tabs_v1` zählte alles außer `tab_v1` auf.
- **Vorgenommene Änderung** (`src/features/cms/contract/sectionTypes.ts`):
  ```diff
  - allowed_children: ["content_v1", "rich_v1", "cards_v1", "card_v1", "feature_grid_v1"],
  + allowed_children: ["tab_v1", "content_v1", "rich_v1", "cards_v1", "card_v1", "feature_grid_v1"],
  ```
  Plus ein Kommentar, der die Sprint-2f-Begründung dokumentiert.
- **Warum keine Public-Wirkung**: Renderer und Daten sind unverändert. Der
  Vertrag wurde nur an die existierende Realität angepasst — kein Frontend
  liest `allowed_children` zur Laufzeit.

### `content_v1 → card_v1` — **R2 (Datenstruktur falsch, Vertrag korrekt)**

- 176 Pattern-Treffer = **88 distinct Beziehungen** (88 aktiv).
- Betroffene Seiten u. a. `gebaeudekommunikation.briefkastenanlagen`,
  `gebaeudekommunikation.grossanlagen`, `anwendungen.bildungseinrichtungen`,
  `anwendungen.root`, `home.start`, `personas.wohnungswirtschaft`,
  `service.hub`, `service.downloads`, `service.online-produktkatalog`.
- **Renderer-Beweis**: `ContentSectionV1.tsx` liest `ctx.children` **nicht**.
  Die Karten unter einem `content_v1` werden also vom generischen Renderer
  gar nicht ausgegeben. Public-Wirkung der falschen Struktur = null.
- **Warum keine Vertragslockerung**: Wenn man `card_v1` in
  `content_v1.allowed_children` aufnähme, würde der Vertrag lügen — er würde
  suggerieren, der Container könne Karten rendern. Er kann es nicht.
- **Hypothese für die Daten**: Der Parent-Typ ist vermutlich historisch
  `content_v1` statt `cards_v1` / `card_grid_v1` / `feature_grid_v1`. Das ist
  echte Strukturmigration und gehört in Sprint 2g (Pilot pro Seite mit
  Renderer-Beweis und Owner-Sign-off).
- **Sprint 2f tut hier nichts** — keine Datenmigration, keine Aktivierung,
  keine Whitelist-Anpassung.

### `(none/top-level) → card_v1` — **R4 (inaktive Altlast)**

- 19 Treffer, ausschließlich inaktive `_kopie`/`_efh`/`_mfh`/`_ami`-Sections
  auf `anwendungen.root`. RLS lässt diese ohnehin nicht zu Public durch.
- Bereits in Sprint 2d entschieden: kein Aufräumen ohne Owner-Sign-off pro
  Section. Status unverändert.

### `rich_v1 → rich_v1` — **R3/R4 (Legacy, kein generischer Renderer-Pfad)**

- 6 Treffer auf `home.start`, Parent `personas_intro`, Kinder `persona_*`.
- Davon **1 aktiv** (`persona_architekten`), **5 inaktiv**.
- `RichV1.tsx` rendert keine Children — Kind-Rich-Blocks sind also unsichtbar.
- **Warum keine Vertragslockerung**: Genau wie bei `content_v1` würde es
  lügen. Ein Container für andere Rich-Blocks ist semantisch nicht
  vorgesehen.
- **Sprint 2f tut hier nichts** — Owner-Entscheidung für später, ob die eine
  aktive Section umstrukturiert oder als historische Layout-Spielerei
  belassen wird.

## 3. Was nicht repariert wurde und warum

- **Keine Datenmigration** für R2 (`content_v1 → card_v1`). Begründung oben:
  korrekter Weg ist Strukturmigration pro Seite mit Renderer-Beweis und
  Owner-Sign-off (Sprint 2g).
- **Keine Vertragslockerung** für R2/R3/R4. Die Renderer beweisen, dass die
  Kindbeziehung nicht ausgegeben wird — Lockerung wäre eine Scheinreparatur.
- **Keine Inhalts-, Bild- oder Feldwert-Änderungen**.
- **Keine Whitelist-Änderung**.

## 4. Audit-Ergebnisse

| Kennzahl | vorher (2e) | nachher (2f) |
|---|---:|---:|
| D1 | 0 | 0 |
| D8 | 0 | 0 |
| D9 | 205 | **201** (−4) |
| Sections | 1442 | 1442 |
| Felder | 38877 | 38877 |
| Assets | 739 | 739 |
| Whitelist | 42135 | 42135 |
| Distinct D9-Relationen | 4 | **3** |

- `npm run cms:audit:contract` → **15 OK · 6 Warnung · 0 Konflikt**
- `npm run cms:audit:contract-drift` → D9 = 201, D1=0, D8=0 (sonst unverändert)
- `npm run cms:audit:d9` → 201 (181 aktiv · 20 inaktiv); 88 `child_not_in_allowed_children`,
  88 `parent_not_in_allowed_parents`, 19 `child_only_at_top_level`,
  6 `top_level_only_under_parent`
- `npm run cms:audit:d9-relations` (neu) → 3 distinct Beziehungen
- `npm run build` → **nicht manuell ausgeführt**; der Lovable-Harness baut
  automatisch nach Commits, kein Workaround.

## 5. Bestätigung (Sprint-Verbote)

- Keine Produktdatenbank angefasst.
- Keine Inhalte, Bilder oder Feldwerte verändert.
- Keine Whitelist-Zeile gelöscht oder verändert.
- Keine Public-Renderer-/Routen-/Navigation-/Footer-/Breadcrumb-/i18n-Änderung.
- Keine neue Schreib-RPC.
- Keine D9-Massenmigration.
- Keine Section aktiviert oder deaktiviert.

## Empfohlene nächste Etappe

`cms-light-eine-wahrheit-sprint-2g-d9-datenmigration-nur-fuer-r2-safe-cases-1` —
für `content_v1 → card_v1` pilotweise eine Seite auswählen (z. B.
`gebaeudekommunikation.briefkastenanlagen`), Renderer-Beweis pro Container
liefern und entscheiden, ob der Parent-Typ idempotent umetikettiert werden
darf (z. B. `content_v1` → `cards_v1` oder `card_grid_v1`). Strikt
sectionweise, mit Owner-Sign-off, ohne Inhalts-/Bild-/Feldwert-Änderung.
