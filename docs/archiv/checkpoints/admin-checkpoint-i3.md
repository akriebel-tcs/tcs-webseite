# Admin-Checkpoint I.3 — 2026-05-10

Übergabepunkt für externe Code-Reviews (z. B. ChatGPT/Codex).
Stand nach den Etappen **I.1 (Klick-Glossar)**, **I.2 (Startseite im Baum)** und
**I.3 (Detail-Panel mit Trennung sichtbar/technisch)**.

---

## 1. Was hat sich seit dem letzten Review verändert?

### 1.1 Sprachhilfe / Glossar

- `src/features/admin/lib/glossary.ts` deutlich erweitert (`tree`, `hero`,
  `answer_first`, `intro`, `header`, `main`, `footer`, `section_key`,
  `field_key`, `locale`, `status`, `is_active`, `page_registry`, `cms_pages`,
  `cms_navigation_nodes`, `workbench`, `readonly`, `editable`,
  `page_instanz`, `cms_pilot`).
- `src/features/admin/components/Term.tsx` umgebaut:
  - Hover-Tooltip entfernt → Klick-`Popover` am Fragezeichen-Icon.
  - Klammer-Kurzform `(…)` beim Erstauftritt bleibt.
  - `GlossaryScope` mit optionalem `resetKey` — in `AdminPage` an den
    aktiven Tab gekoppelt, damit Erklärungen pro Seite neu erscheinen.
  - Trigger stoppt `click`/`pointerdown`/`mousedown`-Propagation, damit
    Klicks nicht versehentlich Tabs wechseln, Tabellen sortieren oder
    Tree-Knoten auswählen. `PopoverContent`: `z-[60]`, `collisionPadding=8`.
- `src/features/admin/components/ModeBadge.tsx` (neu) — einheitliche
  Status-Pille mit Punkt: grün = bearbeiten möglich, grau = nur lesen,
  bernstein = Prototyp ohne Login, sky = Info.
- `AdminPage.tsx`: Tab-Buttons mit Modus-Punkt + `title`-Hinweis,
  Legenden-Zeile darunter, alle Sektion-Header tragen `<ModeBadge>`.

### 1.2 Startseite im Tree (Etappe I.2)

- Migration `20260510125245_…_etappe-i2-homepage.sql`:
  - `cms_pages.home.start` (route `/`, `T01`, `draft`, `is_active=true`).
  - `cms_navigation_nodes.home` (`nav_area=main`, root, `sort_order=0`,
    `page_key='home.start'`, `label_de='Startseite'`, `label_en='Home'`).
- Verifiziert: erscheint im Tab „Tree & DnD" als erster Wurzelknoten.

### 1.3 Detail-Panel (Etappe I.3)

- Neu: `src/features/admin/components/DetailPanel.tsx`. Trennt jedes
  Bearbeitungs-Panel in zwei klar erkennbare Bereiche:
  - **Sichtbare Texte** (grüner Rahmen, `Eye`-Icon) — was der Nutzer auf
    der Webseite sieht. Hier laufen die DE/EN-Editoren.
  - **Technische Details** (eingeklappt, `Settings2`-Icon) — `page_key`,
    `section_key`, `section_type`, `is_active`, `route_path`, …
- `AdminPage.tsx` Tab „CMS-Pilot" verwendet `DetailPanel` für Seitenkopf
  und alle drei Pilot-Sektionen (Hero, Answer-First, Intro). Der bisherige
  `SectionGroup`-Wrapper bleibt im Repo, ist aus AdminPage aber entfernt.

### 1.4 Was bewusst NICHT verändert wurde

- Keine neuen oder geänderten RPCs in I.1/I.3 (nur die I.2-Migration für
  die Startseite). Schreibpfad weiterhin ausschließlich `rpc_admin_*`.
- Keine RLS-Änderung, kein Trigger, keine Schema-Änderung außerhalb der
  zwei Inserts in I.2.
- Keine Änderung an Public Routing, i18n-Dateien, Produktdaten,
  öffentlichem Render. Code bleibt führend für die Live-Site.

---

## 2. Wo wir jetzt stehen

```text
/admin (kein Login, Prototyp)
  ├── Übersicht        info
  ├── Seiten           readonly
  ├── Page-Instanzen   editable (page_key, route_path, page_type)
  ├── CMS-Pilot        editable (Pilotfelder DE/EN, jetzt mit DetailPanel)
  ├── Struktur         readonly Workbench
  ├── Navigation       editable (nur DE/EN-Labels)
  ├── Tree & DnD       editable (Reihenfolge & Hierarchie)
  └── Glossar          info
```

Vier Tabs greifen heute in dieselbe Domäne (Navigation · Page-Instanzen ·
CMS-Pilot · Tree & DnD). Ziel ist deren Bündelung in zwei Tabs.

---

## 3. Plan, wie es weitergeht

Langfristziel des Nutzers: **„alles in einem Unterpunkt", am ehesten im
Tree & DnD-Bereich**. Daraus folgt:

### Etappe I.4 — Bearbeitung im Detail-Panel ausweiten

- Im Tab „Tree & DnD": rechts neben dem Baum erscheint bei Auswahl eines
  Knotens das passende `DetailPanel` der verlinkten Seite/Sektion(en).
  - „Sichtbare Texte" pro Sektion editierbar.
  - „Technische Details" eingeklappt zeigen `page_key`, `route_path`,
    `node_key`, `nav_area`, `parent_id`, `sort_order`, `is_active`.
- Dafür neue Whitelist-RPC `rpc_admin_update_section_field(p_page_key,
  p_section_key, p_field_key, p_locale, p_value)` — aktuell schreibt nur
  die enge Pilot-RPC `rpc_admin_update_pilot_pflege_field` (hart auf
  `anwendungen.pflege` begrenzt).
- Bild-Upload + Fokuspunkt im selben Panel (separater Storage-Bucket
  `cms-assets` ist bereits vorhanden).

### Etappe I.5 — Tabs zusammenführen

- „Page-Instanzen" und „CMS-Pilot" zu einem Tab **„Diagnose"** (readonly).
- „Navigation" (Labels-Diagnose) und „Tree & DnD" + Detail-Panel zu einem
  Tab **„Struktur & Inhalte"** verschmelzen.
- Endzustand:

```text
/admin
  ├── Übersicht          info
  ├── Struktur & Inhalte editable  ← Tree + DetailPanel rechts
  ├── Diagnose           readonly  ← Page-Instanzen + Pilot-Vergleich
  └── Glossar            info
```

### Offene Architektur-Fragen für die nächste Reviewrunde

1. **Generische RPC vs. mehrere Whitelist-RPCs:** Eine breite
   `rpc_admin_update_section_field` reduziert Boilerplate, schwächt aber
   die Whitelist-Garantie. Alternative: pro Page-Type eine RPC mit
   erlaubten `(section, field)`-Paaren als Konstante. Empfehlung des
   externen Reviews erwünscht.
2. **Schreibrechte ohne Auth:** der Workspace ist absichtlich offen
   (`anon` darf RPCs ausführen). Vor Etappe F (Site liest live aus DB)
   ist `cms-auth-1` Pflicht. Wann/wie geschnitten — Empfehlung gefragt.
3. **Asset-Upload:** Storage-Bucket existiert, aber RLS für
   `storage.objects` ist unbekannt im Review-Kontext. Vor I.4-Upload
   prüfen.
4. **Status-Übergänge:** `home.start` steht aktuell auf `draft`. Vor
   öffentlicher Sichtbarkeit auf `published` zu schalten — über noch zu
   schaffende RPC, nicht direkt am Tisch.

---

## 4. Dateien zum Anschauen für den nächsten Review

- `src/features/admin/components/Term.tsx` — neuer Klick-Popover
- `src/features/admin/components/DetailPanel.tsx` — neue Aufteilung
- `src/features/admin/pages/AdminPage.tsx` — Tab-Verdrahtung,
  `GlossaryScope resetKey={tab}`, Pilot-Tab mit `DetailPanel`
- `src/features/admin/lib/glossary.ts` — Begriffe
- `supabase/migrations/20260510125245_…_etappe-i2-homepage.sql` —
  Startseite + Tree-Knoten
- `docs/migration-log.md` — Fortlaufendes Log (neuester Eintrag „Etappe
  I.1–I.3")
- `.lovable/plan.md` — Fortschreibung des Bearbeitungs-Plans
