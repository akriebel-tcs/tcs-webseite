## Sprint 2d — D9-Strukturmigration Pilot `anwendungen.root` (Entscheidung: **Option B — nicht migrieren**)

_Stand: 2026-05-28 · read-only · keine DB-Änderung · keine Code-Änderung am Public-Renderer_

### 1. Pilotfälle (D9, Muster `child_only_at_top_level`, `anwendungen.root`, `card_v1`)

Aus aktuellem Drift-Audit (`scripts/cms/output/contract-drift-audit-latest.json`) und Owner-Buckets (`scripts/cms/output/d9-owner-buckets.json`):

- D9 gesamt aktuell: **205** (Vor­lauf Sprint 2c hatte 215; durch Drift-Recompute leicht reduziert).
- `child_only_at_top_level` gesamt: **19** (zuvor 29).
- davon `card_v1` auf `anwendungen.root`: **15 Sections**, **alle `is_active = false`**.

| section_key | sort_order | is_active |
|---|---:|:--:|
| card_wohnen_einfamilienhaus_kopie | 4 | ✗ |
| card_efh | 5 | ✗ |
| card_mfh | 6 | ✗ |
| card_ktu_groanl | 7 | ✗ |
| card_ami | 8 | ✗ |
| card_tcu_bka | 9 | ✗ |
| card_argos | 10 | ✗ |
| card_pak_kopie | 12 | ✗ |
| card_pespro_kopie | 13 | ✗ |
| card_ktu_enamen_kopie | 14 | ✗ |
| card_ami_kopie | 15 | ✗ |
| card_tcu_bka_kopie | 16 | ✗ |
| card_argos_kopie | 17 | ✗ |
| card_konfig_ktu_kopie | 18 | ✗ |
| card_entry_kopie | 19 | ✗ |

### 2. Renderer-/Owner-Befund

- `anwendungen.root` wird über `src/features/anwendungen/pages/AnwendungenPage.tsx` gerendert (eigene Page-Komponente, **nicht** generischer `CmsBodyRenderer`).
- Karten werden ausschließlich gelesen via `dbChildrenOf(containerKey)` — also nur Sections mit `parent_section_key === <container>` und `section_type === "card_v1"`.
- **Top-Level `card_v1` werden vom Public-Renderer ignoriert.** `CmsBodyRenderer` hat `card_v1` ohnehin nicht in `RENDERERS` (Vertrag: „rendert über Eltern").
- Die **28 aktiven** `card_v1` auf dieser Seite haben bereits `parent_section_id` gesetzt (verifiziert per DB: `is_active=true → has_parent=28, no_parent=0`). Die strukturelle Migration für den sichtbaren Bestand ist also **in einer früheren Etappe bereits erfolgt**.
- Die verbliebenen 15 Top-Level-Sections sind **inaktiv**, von der RLS-Policy `cms_sections public read published` für Public ausgeschlossen und werden vom Renderer in keinem Pfad konsumiert. Sie sind reine **Legacy-Datenreste** (Kopien, Kurz-Slugs `_efh`/`_mfh`/`_ami`/`_argos`/`_tcu_bka`, Postfix `_kopie`).

### 3. Entscheidung: **Option B — keine Migration**

Begründung:

1. **Keine Public-Wirkung zu reparieren.** Die Verletzungen sind ausschließlich datenstruktureller Natur an inaktiven Sections. Public-Layout ist heute korrekt und bleibt es ohne Eingriff.
2. **Owner unklar pro Section.** Für `card_efh`, `card_mfh`, `card_ami`, `card_ktu_groanl`, `card_argos`, `card_tcu_bka` etc. gibt es keinen eindeutigen Ziel-Container. `_kopie`-Sections sind echte Duplikate aktiver Karten — kein Container will sie zusätzlich aufnehmen.
3. **Risiko Option A.** Würde man sie unter `categories_<group>` hängen, würden sie zwar weiterhin nicht öffentlich gerendert (RLS schließt inaktive aus), aber:
   - der **Admin** zeigt sie dann als Karten unter dem Container und suggeriert sie wären zur Aktivierung gedacht;
   - eine spätere versehentliche Aktivierung würde Duplikate auf der Public-Seite erzeugen;
   - es wäre kein „Aufräumen", sondern ein „Verstecken".
4. **Spielregel.** Sprint 2d darf keine Section aktivieren/deaktivieren und keine Inhalte/Bilder verändern — also bleibt nur „Parent zuweisen" oder „nichts tun". Ohne Owner-Beweis pro Karte ist „nichts tun" korrekt.

### 4. Empfohlener nächster Pilot

`cms-light-eine-wahrheit-sprint-2e-d9-strukturmigration-naechster-pilot-1` mit Fokus:

1. **Owner-Pick statt Top-Down-Migration.** Pro inaktive Legacy-Karte einzeln entscheiden:
   - Löschen-Kandidat (Cleanup-Sprint, eigene Etappe mit explizitem Owner-Sign-off) — Klasse **O3**.
   - Reaktivieren-Kandidat (Container zuweisen + aktivieren) — Klasse **O2** mit Inhalts-/Bild-Review.
2. Bessere Pilotgruppen für echte Strukturmigration:
   - `stat_v1` Top-Level auf `produkte.hub` (3 Fälle, alle aktiv, Container `stats_v1` existiert klar) — kleiner, klar abgegrenzter Owner-Beweis möglich.
   - `parent_not_in_allowed_parents` / `child_not_in_allowed_children` (zusammen 180 Fälle) — Vertragslockerung statt Datenmigration ist meist die sauberere O1-Antwort.

`mobile-tk-preview.root` / `tab_v1` bleibt wie in Sprint 2c dokumentiert ausgeschlossen (braucht zuerst neuen `tabs_v1`-Container).

### 5. Layout-Sicherheitsbefund

Keine Datenänderung → keine Public-Auswirkung. Eine visuelle Vorher/Nachher-Prüfung war nicht erforderlich.

### 6. Scope-Bestätigung

- Keine Migration ausgeführt.
- Keine Inhalte, Bilder, Feldwerte, Whitelist-Einträge geändert.
- Keine Section aktiviert/deaktiviert.
- Kein Public-Renderer / keine Route / keine Navigation / kein Footer / kein Breadcrumb / keine i18n-Datei verändert.
- Keine Produktdatenbank berührt.
- Keine neue Schreib-RPC.
- Keine breite D9-Reparatur.
- `mobile-tk-preview.root` / `tab_v1` nicht angefasst.

### 7. Audit-Ergebnisse

- `npm run cms:audit:contract` → **15 OK · 6 Warnung · 0 Konflikt** (unverändert).
- `npm run cms:audit:contract-drift` → D1=0, D8=0, D9=205, D3=3487, D5=3401 (Werte stabil/leicht reduziert ggü. Sprint 2c-Ende, keine neuen D2/D4-Massen).
- `npm run cms:audit:d9` → `child_only_at_top_level`=19, `top_level_only_under_parent`=6, `child_not_in_allowed_children`=92, `parent_not_in_allowed_parents`=88.
- `npm run build` → wird vom Harness automatisch nach Commits gefahren; kein manueller Build in dieser Etappe.

### 8. Geänderte Dateien

- **neu:** `docs/04-betrieb/sprint-2d-eine-wahrheit-bericht.md` (dieses Dokument).
- **aktualisiert:** `docs/current-status.md`, `docs/04-betrieb/contract-drift-audit-latest.md` (durch Audit-Re-run), `scripts/cms/output/contract-drift-audit-latest.json`, `scripts/cms/output/d9-owner-buckets.json`, `docs/04-betrieb/sprint-2c-d9-owner-entscheidungen.md` (durch d9-Re-run).

Empfohlene nächste Etappe: **`cms-light-eine-wahrheit-sprint-2e-d9-strukturmigration-naechster-pilot-1`** — Pilot auf `produkte.hub` / `stat_v1` statt auf inaktive Legacy-Karten.
