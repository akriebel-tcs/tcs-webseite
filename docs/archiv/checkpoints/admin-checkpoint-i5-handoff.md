# Admin-Checkpoint I.5 — Übergabe an externe KI (2026-05-12)

> Übergabepunkt für externes Code-Review (z. B. ChatGPT/Codex).
> Stand nach den Etappen **I.4 (Master-Detail-Workbench)** sowie den
> Folge-Etappen **Block-IDs**, **Kopier-Ablage**, **Persona-Akkordeon**
> und **generische Block-Hierarchie (`parent_section_id`)**.

---

## 1. Was wurde seit Checkpoint I.3 gemacht?

Checkpoint I.3 endete mit drei lose getrennten Tabs (Tree, Labels,
CMS-Pilot) und einem prototypischen DetailPanel. Seitdem sind folgende
Etappen umgesetzt (chronologisch, jüngste zuerst):

### 1.1 Generische Block-Hierarchie (Parent-Child)
- **Migration `20260512080348_…`**:
  - Neue Spalte `cms_sections.parent_section_id` (uuid, FK auf `cms_sections.id`,
    `ON DELETE SET NULL`) + Index.
  - Neue RPC `rpc_admin_set_section_parent(p_page_key, p_section_key,
    p_new_parent_section_key, p_position)` — whitelisted, schreibt
    parent-aware. Cycle-Prävention via Rekursion in der Funktion.
  - `rpc_admin_set_section_position` parent-aware aktualisiert.
  - Neue interne Hilfe `cms_resequence_sections_dfs(p_page_key)` —
    Depth-First-Resequenzierung, damit `sort_order` Kinder direkt hinter
    ihren Eltern einreiht und die Public-Site dieselbe Reihenfolge sieht.
  - `rpc_admin_read_page_sections` liefert `parent_section_id` +
    `parent_section_key` mit.
- **Frontend**: `NavigationTreeEditor` rekursiv (`SectionLevel`),
  „Teil von …"-Dropdown pro Block (Cycle-Detection client-seitig
  gespiegelt), Drag-and-Drop **innerhalb derselben Ebene**. Persona-Akkordeon
  ist jetzt Spezialfall der generischen Hierarchie.

### 1.2 Persona-Akkordeon (öffentlich + Admin)
- Admin: Persona-Intro + sechs Karten als ein Block-Aggregat darstellbar
  (Akkordeon ▸/▾, eigene SortableContext für die Karten).
- Public: `PersonaSection.tsx` — Bug behoben, dass die sechste
  („Bauherren") Karte bei manchen Scroll-Geschwindigkeiten unsichtbar
  blieb. Fallback-Animate (`animate={{ opacity: 1, y: 0 }}`) +
  reduzierte Stagger-Delays.

### 1.3 Kopier-Ablage / Einfügen über Seiten hinweg
- Mehrere Block-IDs sammelbar, Einfügen per Klick **oder** Drag in
  andere Navigationsebenen. Bestehende whitelisted RPCs für
  `duplicateSection` + `setSectionParent` wiederverwendet.

### 1.4 Block-IDs prominent (B-…), Knoten-IDs dezent (N-…), Asset-IDs (A-…)
- **Migration `20260512062707_…`**: idempotente Kurz-IDs `node_no`
  (`cms_navigation_nodes`), `section_uid` (`cms_sections`), `asset_no`
  (`cms_assets`).
- **Migration `20260512064251_…`**: Kurz-IDs in Read-RPCs sichtbar.
- **Migration `20260512065730_…`**: `rpc_admin_search_short_ids(p_query,
  p_limit)` für die Suchleiste.
- **Migration `20260512071357_…`**: `section_uid` in
  `rpc_admin_read_page_sections` ergänzt.
- Frontend: `ShortIdBadge`, `GoToShortIdBar` → schnelles Springen über
  N-/B-/A-IDs.

### 1.5 Master-Detail-Workbench (I.4, abgeschlossen)
- `MasterDetailWorkbench` (links Baum, rechts `PageEditor`) ersetzt das
  vier-Sub-Tab-Hin-und-Her aus I.3.
- Block-Aktionen (↑ ↓ Sichtbar/Duplizieren/Löschen) ausschließlich im
  Baum; rechte Spalte ist reine Inhaltsfläche (Texte DE/EN, Assets,
  Freigabe-Schalter pro Feld). Lebenszyklus-Toolbar zeigt nur noch
  **Seiten**-Aktionen.

### 1.6 Sprache & Glossar
- Klick-Popover (`Term.tsx`) statt Hover-Tooltip; `GlossaryScope`
  pro Tab.
- `ModeBadge` (grün/grau/bernstein/sky) auf jedem Section-Header.

---

## 2. Aktueller Stand `/admin`

```text
/admin (kein Login, Prototyp)
  ├── Übersicht          info        DiagnoseOverview / Activity-Log
  ├── Struktur & Inhalte editable    MasterDetailWorkbench
  │     ├── Baum (links): cms_navigation_nodes + cms_sections rekursiv
  │     │     · DnD pro Ebene  · Akkordeon  · Persona-Aggregat
  │     │     · ⧉ Duplizieren · 👁/🚫 · 🗑 · „Teil von …"-Dropdown
  │     └── Editor (rechts): PageEditor → DetailPanel pro Section
  │           · DE/EN-Felder · Assets (cms_assets) · Freigabe pro Feld
  ├── Diagnose           readonly    Pages · Page-Instanzen · Strukturbaum
  └── Glossar            info        Klick-Popover-Erklärungen
```

**RPCs (alle SECURITY DEFINER, EXECUTE für `anon` + `authenticated`):**

| RPC | Zweck | Veröffentlichung? |
|---|---|---|
| `rpc_admin_update_navigation_label` | DE/EN-Label eines Knotens (Whitelist) | nein |
| `rpc_admin_update_section_field` | Einzelnes Section-Feld (Whitelist `cms_admin_editable_fields`, nur UPDATE, Locale `de`/`en`) | nein |
| `rpc_admin_set_editable_field_enabled` | Whitelist-Schalter pro Feld | nein |
| `rpc_admin_move_navigation_node` | Knoten verschieben/umsortieren (DnD) | nein |
| `rpc_admin_set_section_position` | Section-Sortierung parent-aware | nein |
| `rpc_admin_set_section_parent` | Block einem anderen Block unterordnen, Cycle-Schutz | nein |
| `rpc_admin_set_section_active` | Sichtbarkeits-Toggle einer Section | nein |
| `rpc_admin_duplicate_section` | Block duplizieren (inkl. Kinder optional) | nein |
| `rpc_admin_delete_section` | Block löschen | nein |
| `rpc_admin_read_page_sections` | Lese-RPC inkl. `section_uid`, `parent_section_id`, `parent_section_key` | n/a |
| `rpc_admin_search_short_ids` | Suche per Kurz-ID (N-/B-/A-) | n/a |

**Tabellen (RLS-Policies aktiv):**
`cms_pages`, `cms_navigation_nodes`, `cms_sections`, `cms_section_fields`,
`cms_assets`, `cms_admin_editable_fields` — alle mit Public-Read-Policy
(„published & active"); **kein** Schreibzugriff für `anon`/`authenticated`,
außer über die obigen RPCs.

---

## 3. Ergebnis des Hygiene-Checks (2026-05-12)

| Bereich | Befund |
|---|---|
| **Direkter Tabellen-Schreibzugriff im Admin** | ✅ keiner. `rg "\.insert\\|\.update\\|\.upsert\\|\.delete"` in `src/features/admin/` zeigt nur `Set.delete` / `Map.delete` (in-memory). |
| **Produktdatenbank-Client im Admin** | ✅ kein Import von `src/lib/supabase/client.ts` im Admin-Tree. |
| **Persona-Hardkodierung** | ✅ entfernt. `PERSONA_*`-Konstanten und `persona_intro`-Sonderlogik im `NavigationTreeEditor` durch generische `parent_section_id`-Hierarchie ersetzt. |
| **Migrations-Idempotenz** | ✅ alle neuen Migrationen nutzen `IF NOT EXISTS` / `CREATE OR REPLACE`. Spotchecks: `20260512080348` (Spalte + Index + RPC), `20260512062707` (Kurz-IDs), `20260512071357` (Read-RPC). |
| **Doppelte Wahrheit Code ↔ DB** | ⚠️ wie geplant: Public liest weiter aus `src/navigation/*.ts`. CMS-Light-Werte sind vorbereitet, **nicht** live. Übergang gehört zu Etappe F (mit `cms-auth-1` davor). |
| **Doku-Drift Migration-Log ↔ Code** | ⚠️ `migration-log.md` endete bei `cms-light-admin-master-detail-1` (2026-05-11). Etappen seit 2026-05-12 (Block-IDs, Kopier-Ablage, Persona-Akkordeon, Hierarchie) waren **nicht** im Log. → Mit dieser Etappe nachgetragen (siehe Eintrag `cms-light-admin-section-hierarchy-1`). |
| **Doppelter Tree-Code** | ✅ erledigt (2026-05-12, Pre-Handoff-Hygiene). Entfernt: `NavigationTree.tsx`, `StructureTree.tsx`, `StructureWorkbench.tsx`, `TreeNodeDetail.tsx`, `SectionGroup.tsx`. Aktiv ist nur noch `NavigationTreeEditor` über `MasterDetailWorkbench`. Verwendungs-Check via `rg` zeigt keine externen Referenzen mehr. |
| **Doppeltes Toast-System** | ✅ erledigt (2026-05-12). `App.tsx` rendert nur noch `Sonner`. Legacy entfernt: `src/components/ui/toaster.tsx`, `src/components/ui/use-toast.ts`, `src/hooks/use-toast.ts`, plus Dependency `@radix-ui/react-toast`. |
| **Build-Fehler `@tanstack/query-core`** | ✅ erledigt. `@tanstack/query-core@5.83.0` ist als explizite Direkt-Dependency in `package.json` eingetragen (passend zur `@tanstack/react-query@^5.83.0`-Version). |
| **Größe `NavigationTreeEditor.tsx`** | ⚠️ ~1874 Zeilen, eine Datei trägt Tree, DnD, Section-Level, Akkordeon, Klemmbrett. Keine Funktionsänderung nötig, aber Aufsplittung in `tree/`-Unterordner empfohlen (Etappe I.6). |
| **i18n-Check** | nicht in dieser Etappe ausgeführt — keine i18n-Datei berührt. |

---

## 4. Wie geht es weiter?

### Etappe I.6 — Hygiene & Aufsplittung (klein, risikoarm)
- `NavigationTreeEditor.tsx` in `components/tree/{TreeRoot,SectionLevel,SectionRowToolbar,Clipboard}.tsx` zerlegen. Reine mechanische Trennung, keine Logikänderung.
- Tote Tree-Komponenten (`NavigationTree`, `StructureTree`, `StructureWorkbench`, `TreeNodeDetail`, `SectionGroup`) auf Verwendung prüfen, ungenutzte entfernen. Backups in `AdminPage.tsx` (Sub-Tabs „Inhalte (Backup)", „Freigaben (Backup)") definitiv entfernen.

### Etappe I.7 — Whitelist erweitern statt Spezial-RPC
- Pro neuer Pilotseite **nur** Zeilen in `cms_admin_editable_fields` und `cms_section_fields` anlegen — kein neuer RPC nötig.
- Geplante Pilotkandidaten (Reihenfolge offen):
  `home.start`, `anwendungen.gesundheitseinrichtungen`, `personas.bauherren`.

### Etappe F-pre `cms-auth-1` (Blocker für F)
- Login für `/admin` (Supabase Auth, eine Admin-Rolle).
- Anschließend RPC-EXECUTE von `anon` entziehen, RLS-Schreibpolicies an `has_role('admin')` koppeln (siehe `<user-roles>`-Pattern).

### Etappe F — Public liest aus DB
- `mainNavigation.ts` / `footerNavigation.ts` werden Fallback. Renderer ziehen über `page_key` aus `cms_pages` + `cms_navigation_nodes`.
- Strikter Cutover pro `nav_area`, nicht alles auf einmal.

---

## 5. Ziel des Gesamtprojekts (zur Erinnerung an die externe KI)

**TCS soll seine Webseite redaktionell pflegen können, ohne Code anzufassen** — bei gleichzeitiger Portabilität (Standard-Postgres + Object-Storage; kein Lock-in).

- **CMS-Light** (`cms_pages`, `cms_navigation_nodes`, `cms_sections`,
  `cms_section_fields`, `cms_assets`, `cms_admin_editable_fields`) ist
  zukünftige Source of Truth für Routen, Navigation, Inhalte, Assets.
- **Code** bleibt führend für Templates, Renderlogik, technische
  UI-Strings. Produktkatalog/PDP bleiben **strikt** in der externen
  Produktdatenbank — niemals ins CMS kopieren.
- Schreibpfad ausschließlich über whitelisted `rpc_admin_*`. Direkte
  `.insert/.update/.upsert/.delete` aus Admin-Frontend sind verboten.
- Migrationen idempotent (`IF NOT EXISTS` / `CREATE OR REPLACE`).
- Spiegel-Regel: Jede Reihenfolge / Sichtbarkeit aus dem Admin muss sich
  1:1 auf der Public-Site abbilden — und umgekehrt; Renderer iteriert
  über `cms_sections.sort_order`, **nichts** im Code hardcoden.

---

## 6. Dateien für den nächsten externen Review

- `src/features/admin/components/NavigationTreeEditor.tsx` — Tree, DnD, Hierarchie, Akkordeon, Klemmbrett
- `src/features/admin/components/MasterDetailWorkbench.tsx` — Layout
- `src/features/admin/components/PageEditor.tsx` — Inhalts-Editor
- `src/features/admin/api/cmsAdminSectionOrder.ts` — Section-RPC-Wrapper inkl. `setSectionParent`
- `supabase/migrations/20260512080348_*.sql` — `parent_section_id`, `rpc_admin_set_section_parent`, DFS-Resequenzierung
- `supabase/migrations/20260512062707_*.sql` — Kurz-IDs (`node_no`, `section_uid`, `asset_no`)
- `src/components/PersonaSection.tsx` — Public-Fallback-Animate (sechste Karte)
- `docs/01-strategy/cms-light-source-of-truth.md` — Strategie & Etappenfahrplan
- `docs/02-architecture/uebergabe-checkliste-rls-rpc.md` — RLS+RPC-Zusammenspiel
- `docs/migration-log.md` — Vollständige Etappen-Historie inkl. neuem Eintrag `cms-light-admin-section-hierarchy-1`
