# Redaktions-Handoff — 2026-05-15

> Etappe `cms-light-redaktion-handoff-1`.
> Ergänzung zum [Doppelcheck 2026-05-15](./doppelcheck-2026-05-15.md).
> Status: **PASS für interne Redaktionsfreigabe** an drei Redakteurinnen im Workspace.

---

## 1. Was wurde in dieser Etappe gemacht?

### 1.1 Härtung Asset-RPCs (Stand nach Polish-Etappe `cms-light-redaktion-handoff-polish-1`)
- `rpc_admin_upsert_asset` prüft:
  - `p_page_key` existiert in `cms_pages` → sonst `error: page_not_found`
  - `p_section_key` existiert in `cms_sections` für diese Page → sonst `error: section_not_found`
- `rpc_admin_update_asset_alt` prüft zusätzlich:
  - Asset existiert und ist aktiv → sonst `asset_not_found` / `asset_not_valid_for_edit (inactive)`
  - Page des Assets existiert noch → sonst `asset_not_valid_for_edit (page_missing)`
  - Section des Assets existiert noch → sonst `asset_not_valid_for_edit (section_missing)`
- `rpc_admin_delete_asset` bleibt **bewusst großzügig**: weiches Löschen funktioniert auch für Orphans, damit Altlasten bereinigt werden können. Per `COMMENT ON FUNCTION` dokumentiert.
- Tippfehler im Section-Key erzeugen weder beim Anlegen noch beim Bearbeiten tote Asset-Einträge.

### 1.2 Härtung öffentliche Navigation
- `rpc_public_read_navigation_tree` filtert jetzt zusätzlich:
  - Knoten mit `page_key` erscheinen nur, wenn die zugehörige Page `status='published' AND is_active=true` ist
  - Strukturknoten ohne `page_key` bleiben sichtbar wie bisher
- Damit erscheinen Draft-Seiten (z. B. duplizierte Vorlagen) nicht versehentlich im öffentlichen Menü.

### 1.3 Doku-Korrekturen
- Aussage „Public bleibt vollständig codebasiert" in `docs/current-status.md` und `docs/05-checkpoints/doppelcheck-2026-05-15.md` korrigiert.
- Neue Formulierung: Public nutzt CMS-Light-Daten teilweise mit Code/i18n-Fallback; vollständige Umstellung erfolgt templateweise.

### 1.4 Tote Komponenten entfernt (H1 aus Doppelcheck)
- Gelöscht: `DiagnoseOverview.tsx`, `NavigationDiagnostic.tsx`, `PagesInstanceDiagnostic.tsx`, `GlossaryPanel.tsx`.
- Diese Komponenten waren nach der Tab-Entfernung im Doppelcheck nicht mehr eingebunden.

### 1.5 Redaktionsdokumente
- Neu: `docs/06-redaktion/start-redaktionsteam.md` — **die** Übergabedatei für die drei Redakteurinnen.
- Neu: `docs/06-redaktion/redaktionshandbuch-cms-light.md` — Vollversion für tägliche Arbeit.
- Neu: `docs/06-redaktion/kurzanleitung-redaktionsteam.md` — eine Seite zum Ausdrucken.

### 1.6 Polish-Etappe (cms-light-redaktion-handoff-polish-1)
- `PageEditor.tsx` → `SectionAssetsBlock`: Knopf „+ Bild-Slot hinzufügen" sowie Eingabefeld für freie `field_key`-Erfindung sind hinter der internen Konstante `ENABLE_TECH_ASSET_SLOT_CREATION = false` versteckt. Redakteurinnen können nur **vorhandene** Bild-Slots bedienen.
- Empty-State im Bildbereich verweist klar auf die Technik („Neue Bild-Slots werden technisch vorbereitet — bitte bei Thomas melden.").
- Redaktionshandbuch + Kurzanleitung ergänzt: Neue Bild-Slots = Technikarbeit; `asset_not_valid_for_edit` als Fehlerbild beschrieben.

---

## 2. Bewusst offen (No-Login-Prototyp)

Diese Punkte bleiben **bewusst** offen, weil der Admin im internen Workspace ohne Login läuft. Sie sind **kein** Hindernis für die Redaktionsfreigabe, aber **Pflicht** vor einer echten öffentlichen Live-Schaltung:

| Punkt | Status | Vor Public-Live nötig |
|---|---|---|
| `/admin` ohne Login | bewusst | Auth-Etappe (z. B. `cms-auth-1`) reaktivieren |
| Storage-Bucket `cms-assets` öffentlich schreibbar für `anon` | bewusst | Bucket-Policies härten, Auth voraussetzen |
| `rpc_admin_*` für `anon` ausführbar | bewusst | `REVOKE EXECUTE FROM anon`, Auth voraussetzen |
| Edge Function `cms-translate-field` ohne JWT | bewusst | JWT erzwingen, Rate-Limit |

---

## 3. Welche Datei bekommt das Redaktionsteam?

Primär: **`docs/06-redaktion/start-redaktionsteam.md`** — eine Seite, ausreichend für den Start.

Zusätzlich bei Bedarf:
- `docs/06-redaktion/kurzanleitung-redaktionsteam.md` (zum Ausdrucken)
- `docs/06-redaktion/redaktionshandbuch-cms-light.md` (Vollversion)

Alle drei Dateien sind in einfacher Sprache geschrieben, ohne Entwickler-Jargon, und passen zum Code-Stand nach Polish-Etappe (2026-05-15).

---

## 4. Nächster sinnvoller Schritt

**Nicht** Auth, **nicht** Massenmigration. Sondern:

**Templateweise Inhaltsmigration** der Bestandswebseite, beginnend mit einem Pilot:

1. Eine einfache Inhaltsseite der alten Webseite auswählen
2. Mapping erstellen: alte URL → `page_key`, alte Sections → `cms_sections`, Bilder → Storage
3. Migration als idempotente SQL-Datei + Bild-Uploads
4. Public-Pfad prüfen (Spiegel-Regel)
5. Erfahrungen festhalten, dann die nächste Seitenart

Erst nach mehreren erfolgreichen Pilot-Migrationen lohnt sich eine Auth-Etappe.

---

## 5. Akzeptanz dieser Etappe

- [x] Admin lädt ohne Crash (keine Code-Änderung an UI)
- [x] Asset-RPC akzeptiert nur gültige Page/Section-Kombinationen
- [x] Public-Navigation filtert Draft-Seiten heraus
- [x] Produktdatenbank unverändert (`src/lib/supabase/client.ts` nicht angefasst)
- [x] Kein `@/lib/supabase/client` im Admin-Code
- [x] Kein Auth/Login eingebaut
- [x] Kein direkter Tabellenschreibzugriff im Frontend
- [x] Redaktionshandbuch existiert
- [x] Kurzanleitung existiert
- [x] Doku-Widerspruch „Public vollständig codebasiert" korrigiert
- [x] Tote Komponenten entfernt

---

## 6. Geänderte Dateien

**Migration:**
- `supabase/migrations/<timestamp>_redaktion_handoff_hardening.sql` (neu)

**Code (nur Löschungen):**
- `src/features/admin/components/DiagnoseOverview.tsx` (gelöscht)
- `src/features/admin/components/NavigationDiagnostic.tsx` (gelöscht)
- `src/features/admin/components/PagesInstanceDiagnostic.tsx` (gelöscht)
- `src/features/admin/components/GlossaryPanel.tsx` (gelöscht)

**Doku:**
- `docs/06-redaktion/redaktionshandbuch-cms-light.md` (neu)
- `docs/06-redaktion/kurzanleitung-redaktionsteam.md` (neu)
- `docs/05-checkpoints/redaktion-handoff-2026-05-15.md` (diese Datei, neu)
- `docs/05-checkpoints/doppelcheck-2026-05-15.md` (Public-Aussage korrigiert)
- `docs/current-status.md` (Public-Aussage korrigiert, H1-Status aktualisiert)
