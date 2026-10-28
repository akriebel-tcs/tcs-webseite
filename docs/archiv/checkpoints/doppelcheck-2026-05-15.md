# Großer Doppelcheck — 2026-05-15

> Status: **PASS für Prototyp-Freigabe an Marketingteam (drei Redakteure, kein Public-Live).**
> Vorgänger: [`admin-checkpoint-i5-handoff-v2.md`](./admin-checkpoint-i5-handoff-v2.md) (2026-05-12).
> Diese Datei ersetzt den dortigen Stand und ist die neue Übergabe-Referenz für externe KI-Reviews.

---

## 1. Ziel (zur Erinnerung)

**Endziel:** Migration der bestehenden TCS-Webseite in dieses CMS-Light. Redakteure pflegen Texte, Bilder, Reihenfolgen und Sichtbarkeit selbstständig im `/admin`, ohne Code anzufassen. Die öffentliche Website nutzt **bereits teilweise** CMS-Light-Daten (Texte über `useCmsPageContent`, Bilder über `cms.asset(...)`, Navigation DB-first via `rpc_public_read_navigation_tree` mit Code-Fallback). Statische Templates und `src/i18n/locales/*` dienen als Fallback-Schicht. Die vollständige, kontrollierte Umstellung auf CMS-First erfolgt templateweise in den Migrations-Etappen.

**Teilziel dieses Doppelchecks:** Stand so sauber abschließen, dass
- die drei Redakteurinnen/Redakteure im Workspace arbeiten können,
- eine externe KI den Code + die Doku reviewen kann, ohne über veraltete Aussagen oder „Leichen" zu stolpern,
- der nächste Schritt (Inhaltsmigration der Bestandswebseite) konzeptionell anschließbar ist.

---

## 2. Was sich seit Checkpoint I.5 v2 (2026-05-12) geändert hat

| Bereich | Änderung | Wirkung |
|---|---|---|
| Admin-UI | Tabs „Übersicht" und „Diagnose" entfernt; Untertitel „Redaktioneller Arbeitsbereich" entfernt; Labels-Diagnose entfernt | Direkter Einstieg in „Struktur & Inhalte". Weniger visueller Ballast für Redakteure. |
| DB | Tote Pilot-RPC `rpc_admin_update_pilot_pflege_field` (zwei Overloads) gedroppt | Kein toter Schreibpfad mehr; Frontend ruft ihn ohnehin nicht mehr auf. |
| DB | Leere Dublette `cms_pages.kontakt.bcm` gelöscht; Nav-Knoten umgehängt auf `kontakt-bcm.root` | Eine eindeutige Kontaktseite statt zwei Pages auf derselben Route. |
| DB (Folge-Etappe Redaktions-Handoff) | `rpc_admin_upsert_asset` prüft Page+Section-Existenz | Tippfehler im Section-Key erzeugen keine toten Asset-Einträge mehr. |
| DB (Folge-Etappe Redaktions-Handoff) | `rpc_public_read_navigation_tree` filtert auf `cms_pages.status='published' AND is_active=true` | Draft-Seiten erscheinen nicht mehr im öffentlichen Menü. |
| Code (Folge-Etappe Redaktions-Handoff) | Tote Komponenten gelöscht: `DiagnoseOverview`, `NavigationDiagnostic`, `PagesInstanceDiagnostic`, `GlossaryPanel` | H1 aus dieser Datei erledigt. |

Migrationen: `supabase/migrations/20260515110539_c2c51794-e98d-430e-bbdc-df317c69eb1e.sql` (Dublette + Pilot-RPC), Folge-Migration aus Etappe Redaktions-Handoff (Asset-Härtung + Navigation-Filter). Details: [`redaktion-handoff-2026-05-15.md`](./redaktion-handoff-2026-05-15.md).

---

## 3. Aktueller Ist-Stand (verifiziert per DB-Query, 2026-05-15)

### 3.1 Datenbasis

| Tabelle | Einträge | Aktiv/Live | Bemerkung |
|---|---:|---:|---|
| `cms_pages` | 82 | 82 (alle `published` + `is_active`) | Keine Dubletten auf `page_key`. |
| `cms_sections` | 380 | 380 | – |
| `cms_section_fields` | 6.850 | – | DE/EN-Felder. |
| `cms_admin_editable_fields` (Whitelist) | 6.904 | – | 54 Whitelist-Zeilen ohne passendes Feld (Hygiene, kein Bug). |
| `cms_assets` | 210 | 146 | Storage-Bucket `cms-assets`, Schreiben über RPC. |
| `cms_navigation_nodes` | 104 | 84 | Inaktive Knoten = Archiv. |

### 3.2 RPC-Inventar (32 Stück, alle `rpc_admin_*`)

Schreib-RPCs gegen Whitelist `cms_admin_editable_fields` bzw. interne Logik:
`rpc_admin_update_section_field`, `rpc_admin_update_navigation_label`, `rpc_admin_update_asset_alt`, `rpc_admin_upsert_asset`, `rpc_admin_upsert_page`, `rpc_admin_set_editable_field_enabled`, `rpc_admin_set_section_active`, `rpc_admin_set_navigation_node_active`, `rpc_admin_set_section_parent`, `rpc_admin_set_section_position`, `rpc_admin_move_navigation_node`, `rpc_admin_reorder_section`, `rpc_admin_duplicate_section`, `rpc_admin_duplicate_page`, `rpc_admin_paste_section`, `rpc_admin_archive_page`, `rpc_admin_archive_navigation_node`, `rpc_admin_restore_page`, `rpc_admin_delete_section`, `rpc_admin_delete_page`, `rpc_admin_delete_navigation_node`, `rpc_admin_delete_asset`.

Lese-/Resolver-RPCs: `rpc_admin_read_*`, `rpc_admin_resolve_*`, `rpc_admin_search_short_ids`, `rpc_admin_read_pilot_pflege` (Diagnose-Restbestand, harmlos).

**Bestätigt:** Keine Pilot-spezifische Schreib-RPC mehr in der DB.

### 3.3 Frontend-Schreibwege

- Admin importiert ausschließlich `@/lib/cmsSupabase/client` (CMS-Client).
- **Keine** `.insert/.update/.upsert/.delete`-Aufrufe auf CMS-Tabellen aus dem Admin-Code (verifiziert per `rg`).
- Einzige direkte Tabellenzugriffe sind `select` (lesend, in `DiagnoseOverview.tsx` und `cmsAdminEditableFields.ts`).
- Produktdatenbank (`@/lib/supabase/client`) wird **nicht** vom Admin importiert.

### 3.4 Bild-Tausch (handwerklich)

- `AssetUploader` lädt nach Storage-Bucket `cms-assets` (im Prototyp `anon` schreibbar — bewusst, siehe §5).
- Schreibt anschließend Eintrag in `cms_assets` über `rpc_admin_upsert_asset` (Whitelist-geprüft).
- Public-Renderer holt Bilder über `cms.asset(section, field, fallback)`. `@/assets`-Imports sind reine Fallbacks, keine Bugs.

### 3.5 Text-Tausch (handwerklich)

- Pro Seite × Section × Feld × Locale ein Eintrag in `cms_section_fields`; Bearbeitung nur, wenn `cms_admin_editable_fields.is_enabled=true` (sonst Read-only-Anzeige).
- 78 Seiten haben aktive Whitelist-Einträge (alle real existierenden Felder sind freischaltbar).

---

## 4. Tote / inkonsistente Befunde (Hygiene, nicht blockierend)

| # | Befund | Empfehlung |
|---|---|---|
| H1 | ~~4 tote Admin-Komponenten~~ | **Erledigt** in Etappe Redaktions-Handoff (gelöscht). |
| H2 | 54 Whitelist-Einträge ohne passendes `cms_section_fields`-Feld (z. B. Reste aus `block_communication_kopie` auf `home.start`). | Per Migration löschen oder zugehörige Sections wiederherstellen. Kein Bug — Whitelist ohne Feld läuft im UI ins Leere. |
| H3 | `docs/sync/diff-report.md` ist Snapshot vom 2026-05-14. | Snapshot bei nächster Migrationsrunde regenerieren. |
| H4 | `rpc_admin_read_pilot_pflege` existiert noch (Lese-RPC). | Nicht dringend — kann später entfernt werden. |

---

## 5. Bewusst akzeptierte Eigenschaften für die Prototyp-Phase

- **`/admin` ohne Login.** Workspace-Freigabe an drei Redakteurinnen passiert auf Workspace-Ebene, nicht über Auth in der App. Vor einem **Public-Live-Deployment** (nicht Workspace-Freigabe) muss `cms-auth-1` reaktiviert oder `/admin` deaktiviert werden.
- **Storage-Bucket `cms-assets` offen für `anon` INSERT/UPDATE/DELETE.** Konsequenz aus dem No-Login-Prototyp. Wird mit `cms-auth-1` mit gehärtet.
- **`rpc_admin_*`-RPCs offen für `anon` EXECUTE.** Dito. Schutz aktuell ausschließlich über Whitelist-Validierung in den Funktionen selbst.
- **Edge Function `cms-translate-field` ohne JWT.** Auto-Übersetzungs-Vorschlag ist anonym aufrufbar. Im internen Workspace akzeptiert (Kosten-/Missbrauchsrisiko notiert). Vor Public-Live: JWT erzwingen + Rate-Limit.

Diese drei Punkte sind **kein** Hindernis für die Workspace-Freigabe an das Marketingteam, aber sie sind **Pflicht** vor der echten Öffentlichmachung.

---

## 6. Bereit für die Inhaltsmigration der Bestandswebseite?

**Ja, mit Einschränkungen:**

- Pages × Sections × Fields × Assets: Schemata und Schreibwege stehen. Eine neue Bestandsseite anzulegen heißt: `rpc_admin_upsert_page` → Sections per Migration seeden → Whitelist-Zeilen seeden → Bilder über Admin hochladen. Kein Frontend-Code nötig.
- Templates für gängige Section-Typen (Hero, Intro, ContentBlocks, Persona, RoleTabs, CTA) existieren bereits.
- Was offen ist: ein **Migrationsplan pro Seite der alten Webseite** (URL-Mapping, welche Sections, welche Felder, welche Bilder). Das ist die nächste Stufe und gehört in `docs/04-pilot-plans/`.

---

## 7. Empfehlung für externe KI-Reviewer

Diese Dokumente sind **aktuell und verbindlich**:

- `docs/05-checkpoints/doppelcheck-2026-05-15.md` (diese Datei)
- `.lovable/always-follow.md`
- `docs/01-strategy/cms-light-source-of-truth.md`
- `docs/02-architecture/uebergabe-checkliste-rls-rpc.md`
- `docs/02-architecture/datenmodell-erklaert.md`

Diese Dokumente sind **historische Snapshots**, dienen nur als Etappenprotokoll und sollten nicht als „Soll-Zustand" gelesen werden:

- `docs/05-checkpoints/admin-checkpoint-i3.md`
- `docs/05-checkpoints/admin-checkpoint-i5-handoff.md`
- `docs/05-checkpoints/admin-checkpoint-i5-handoff-v2.md`
- `docs/05-checkpoints/architecture-checkpoint-*.md`
- `docs/05-checkpoints/technical-hygiene-checkpoint-12c.md`
- `docs/sync/diff-report.md` (datierter Snapshot)

Bei Widersprüchen zwischen Doppelcheck (diese Datei) und einem älteren Checkpoint gilt **diese Datei**.
