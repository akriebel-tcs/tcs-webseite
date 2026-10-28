# Admin-Checkpoint I.5 v2 — Übergabe an externe KI (2026-05-12, Pre-Handoff-Hygiene abgeschlossen)

> **Hinweis (2026-05-15):** Dieses Dokument ist ein **historischer Snapshot**. Aktueller verbindlicher Stand: [`doppelcheck-2026-05-15.md`](./doppelcheck-2026-05-15.md). Insbesondere die hier beschriebene Tab-Struktur (Übersicht / Diagnose / Glossar) ist überholt — diese Tabs wurden entfernt; nur „Struktur & Inhalte" ist aktiv.

> Folgedokument zu `admin-checkpoint-i5-handoff.md`.
> Stand **nach** dem Pre-Handoff-Hygiene-Lauf (toter Code, Build-Fix
> `@tanstack/query-core`, Toast-Konsolidierung) und einem zweiten
> umfassenden Check (Schreibwege, Linter, Migrations-Log, Doppel-Code).

---

## 1. Was wurde seit dem letzten Check (v1) gemacht?

Reine Hygiene und Doku — **keine** Funktions- oder Schemaänderungen.

| # | Thema | Ergebnis |
|---|---|---|
| 1 | Tote Tree-Komponenten | Entfernt: `NavigationTree.tsx`, `StructureTree.tsx`, `StructureWorkbench.tsx`, `TreeNodeDetail.tsx`, `SectionGroup.tsx`. Aktiv ist nur noch `NavigationTreeEditor` über `MasterDetailWorkbench`. Verifiziert via `rg` — keine externen Importe mehr. |
| 2 | Build-Fehler `@tanstack/query-core` | Behoben durch explizite Direkt-Dependency `@tanstack/query-core@5.83.0` in `package.json` (passend zu `@tanstack/react-query@^5.83.0`). |
| 3 | Doppeltes Toast-System | Konsolidiert auf **`Sonner`**. Entfernt: `src/components/ui/toaster.tsx`, `src/components/ui/toast.tsx`, `src/components/ui/use-toast.ts`, `src/hooks/use-toast.ts` und Dependency `@radix-ui/react-toast`. `App.tsx` rendert nur noch `<Sonner />`. |
| 4 | `package.json`-Name | Bereits auf `tcs-unternehmenswebseite` gesetzt (Hygiene-Punkt aus Etappe 12c erledigt). |
| 5 | Doku-Drift | Dieser Checkpoint v2 dokumentiert den neuen Stand. Migration-Log bleibt unverändert (keine neuen Migrationen seit v1). |

---

## 2. Aktueller Stand (kurz)

```text
/admin (kein Login, Prototyp)
  ├── Übersicht          DiagnoseOverview / Activity-Log
  ├── Struktur & Inhalte MasterDetailWorkbench
  │     ├── Baum:  NavigationTreeEditor (rekursiv, DnD pro Ebene,
  │     │         Akkordeon, Persona-Aggregat als Spezialfall der
  │     │         generischen parent_section_id-Hierarchie,
  │     │         Klemmbrett für seitenübergreifendes Einfügen)
  │     └── Editor: PageEditor → DetailPanel (DE/EN-Felder,
  │                 Assets, Freigabe pro Feld)
  ├── Diagnose           Pages · Page-Instanzen · Strukturbaum
  └── Glossar            Klick-Popover-Erklärungen
```

**Schreibwege**: ausschließlich über whitelisted `rpc_admin_*`. Verifiziert
mit `rg "\.insert\(|\.update\(|\.upsert\(|\.delete\(" src/features/admin/`
— Treffer sind ausschließlich `Map.delete`/`Set.delete` (in-memory).

**Public-Site**: liest weiterhin aus `src/navigation/*.ts` und
i18n-JSON. CMS-Light-Werte sind vorbereitet, **nicht** live (geplanter
Cutover in Etappe F nach `cms-auth-1`).

---

## 3. Befunde des erweiterten Checks (v2)

### 3.1 Code (clean)

| Bereich | Befund |
|---|---|
| Direkter Tabellen-Schreibzugriff im Admin | ✅ keiner. |
| Produktdatenbank-Client (`@/lib/supabase/client`) im Admin | ✅ kein Import. |
| Backup-Sub-Tabs in `AdminPage.tsx` | ✅ `rg "Backup\|backup" src/features/admin/pages/AdminPage.tsx` → leer. Bereits sauber. |
| Toast-Reste (`useToast`, `@/hooks/use-toast`, `@/components/ui/toaster`) | ✅ `rg` → leer. |
| Persona-Hardkodierung im Tree-Editor | ✅ entfernt; Persona-Akkordeon ist Spezialfall der generischen `parent_section_id`-Hierarchie. |
| Migrations-Idempotenz (Spotchecks) | ✅ `IF NOT EXISTS` / `CREATE OR REPLACE` durchgehend. |

### 3.2 Datenbank-Linter (Supabase)

| Findung | Bewertung |
|---|---|
| **WARN — Public Can Execute SECURITY DEFINER Function** (×~70 RPCs) | **Bewusst akzeptiert** in der Prototyp-Phase ohne `/admin`-Login. Mit Etappe `cms-auth-1` zu härten: `REVOKE EXECUTE … FROM anon` und Policies an `has_role('admin')` koppeln. |
| **INFO — RLS Enabled No Policy** (mind. `cms_navigation_nodes`) | RLS aktiv, aber keine SELECT-Policy für `anon`/`authenticated`. Aktuell unkritisch, weil Admin via RPC liest und Public-Site noch nicht aus DB liest. **Vor Etappe F dringend ergänzen**: `CREATE POLICY cms_navigation_nodes public read … FOR SELECT … USING (is_active AND show_in_public_nav)`. Sonst bleibt die Public-Navigation leer. |
| **WARN — Public Bucket Allows Listing** (`cms-assets`) | Akzeptiert in Prototyp-Phase. Mit `cms-auth-1` enger fassen. |

### 3.3 Strukturelles Tech-Debt (nicht blockierend)

- `NavigationTreeEditor.tsx` ~1874 Zeilen. Aufsplittung in
  `tree/{TreeRoot, SectionLevel, SectionRowToolbar, Clipboard}.tsx`
  empfohlen (rein mechanisch, keine Logikänderung).
- Edge Function `cms-translate-field` läuft ohne Auth. Mit
  `cms-auth-1` ein JWT-Check ergänzen.

---

## 4. Wie geht es weiter?

### Etappe I.6 — Hygiene & Aufsplittung
- `NavigationTreeEditor.tsx` zerlegen.
- `cms_navigation_nodes`-SELECT-Policy nachrüsten (auch wenn Public erst in F aktiv liest — sauberer Ausgangszustand).

### Etappe I.7 — Whitelist statt Spezial-RPC
- Pro neuer Pilotseite nur Zeilen in `cms_admin_editable_fields` /
  `cms_section_fields` anlegen. Pilot-Kandidaten:
  `home.start`, `anwendungen.gesundheitseinrichtungen`, `personas.bauherren`.

### Etappe `cms-auth-1` (Blocker für F)
- Login für `/admin` (Supabase Auth, Rolle `admin` über `user_roles`-Tabelle, siehe `<user-roles>`-Pattern).
- `REVOKE EXECUTE` aller `rpc_admin_*` von `anon`.
- Storage-Policies enger fassen, Edge Function absichern.

### Etappe F — Public liest aus DB
- `mainNavigation.ts` / `footerNavigation.ts` werden Fallback.
- Strikter Cutover pro `nav_area`, nicht alles auf einmal.
- Voraussetzung: SELECT-Policy auf `cms_navigation_nodes` (siehe 3.2).

---

## 5. Ziel des Gesamtprojekts

TCS soll seine Webseite redaktionell pflegen können, **ohne Code anzufassen** — bei gleichzeitiger Portabilität (Standard-Postgres + Object-Storage; kein Lock-in).

- **CMS-Light** (`cms_pages`, `cms_navigation_nodes`, `cms_sections`,
  `cms_section_fields`, `cms_assets`, `cms_admin_editable_fields`) ist
  zukünftige Source of Truth für Routen, Navigation, Inhalte, Assets.
- **Code** bleibt führend für Templates, Renderlogik, technische
  UI-Strings. Produktkatalog/PDP bleiben **strikt** in der externen
  Produktdatenbank — niemals ins CMS kopieren.
- Schreibpfad ausschließlich über whitelisted `rpc_admin_*`.
- Migrationen idempotent.
- Spiegel-Regel: Reihenfolge / Sichtbarkeit aus dem Admin bildet sich
  1:1 auf der Public-Site ab — Renderer iteriert über
  `cms_sections.sort_order`, **nichts** im Code hardcoden.

---

## 6. Empfohlene Lese-Reihenfolge für die externe KI

1. `.lovable/always-follow.md` — verbindliche Regeln
2. `docs/01-strategy/cms-light-source-of-truth.md` — Strategie
3. `docs/02-architecture/datenmodell-erklaert.md` — Datenmodell verständlich
4. `docs/02-architecture/uebergabe-checkliste-rls-rpc.md` — RLS+RPC-Zusammenspiel
5. `docs/05-checkpoints/admin-checkpoint-i5-handoff.md` (v1) — Detail-Historie
6. **dieses Dokument (v2)** — finaler Stand
7. Code:
   - `src/features/admin/components/NavigationTreeEditor.tsx`
   - `src/features/admin/components/MasterDetailWorkbench.tsx`
   - `src/features/admin/components/PageEditor.tsx`
   - `src/features/admin/api/cmsAdminSectionOrder.ts`
   - `supabase/migrations/20260512080348_*.sql` (Hierarchie)
   - `supabase/migrations/20260512062707_*.sql` (Kurz-IDs)

---

## 7. Konkrete Fragen an die externe KI (optional)

1. Strategie für `cms-auth-1`: ein einziges `admin`-Login oder direkt Mehrbenutzer + Audit?
2. Cutover-Reihenfolge in Etappe F — pro `nav_area` (`main`, `footer`, `meta`, `personas`) oder pro Page-Cluster?
3. Aufsplittung des `NavigationTreeEditor` — empfohlene Komponentengrenzen?
4. Übersetzungs-Edge-Function: Glossar (Marken, Produktnamen) im System-Prompt vs. separate Begriffstabelle in DB?
