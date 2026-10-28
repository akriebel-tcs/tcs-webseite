# Migrationsstrategie — Exit aus Lovable / Supabase

Stand: 2026-06-05 · Status: **reine Analyse, keine Umsetzung**
Auftraggeber: Thomas · Geltungsbereich: TCS-Webseite (CMS-Light + Public Site)

> Dieser Bericht beschreibt **wie** ein späterer Umzug aus Lovable in eine
> eigenständig betriebene Umgebung aussehen könnte. Er ändert nichts am Code,
> nichts an der DB, nichts an Storage, nichts an Secrets. Vor jeder echten
> Migration ist eine separate Entscheidungsrunde nötig (siehe Kapitel 9).

---

## 0. Kurzfassung (TL;DR)

- **Migration ist grundsätzlich möglich** und technisch unkritisch, weil der
  Stack offen ist: Vite + React + Tailwind im Frontend, Postgres + RLS + RPC
  im Backend, Supabase Storage für Bilder. Es gibt keine proprietären
  Lovable-Laufzeit-APIs im Anwendungscode.
- **Empfohlene Zielvariante:** *Variante A* — eigenes Supabase-Projekt
  (managed, außerhalb Lovable) + Hosting des Frontends auf Vercel oder einem
  statischen Host. Höchste Kompatibilität, geringste Umbauarbeit, gleicher
  Auth-/RLS-/RPC-/Storage-Stack.
- **Kleinster sicherer erster Schritt:** Bestmögliches **Lovable-Exit-Export-Set**
  erzeugen — innerhalb der Lovable-Cloud-Grenzen (siehe Kasten unten):
  Git-Tag + Codebase-ZIP, `supabase/migrations/` aus dem Repo,
  CMS-Light-Master-Snapshot v2 (redaktioneller Lesesnapshot),
  CSV-Export pro relevanter Tabelle über das Lovable-Cloud-Backend-UI,
  manueller Storage-Dump über die Asset-Downloadlisten des Snapshots.
  Kein Code-Change, kein DNS, kein Live-Schalter.
- **Was auf keinen Fall spontan passieren darf:** Direkter Umzug des
  Public-DNS, manuelles Nachbauen von RLS/RPC im Ziel ohne abgeglichene
  Migrationen, Vermischen mit der externen Produktdatenbank
  (`tkscpnwbkjmqopnddxle`), Verlust der Storage-URLs ohne Redirect-Plan,
  Versprechen eines „vollständigen Backups", das aus Lovable Cloud heraus
  technisch nicht erstellbar ist.

> ⚠ **Grenze Lovable Cloud (Stand 2026-06-05):** Aus dem laufenden
> Lovable-Cloud-Projekt heraus ist **kein vollständiges Wiederherstellungs-
> Backup** möglich. Es gibt für den Nutzer keinen direkten PostgreSQL-Zugang,
> kein DB-Passwort und keinen `service_role`-Key. Damit sind
> `pg_dump`/`supabase db dump --data` und `supabase storage cp` aus dem
> Quellprojekt **nicht ausführbar**. Ein vollständiger `pg_dump` ist erst
> dann möglich, **sobald das Projekt auf einem eigenen Supabase-/Postgres-
> Instance läuft** (Zielumgebung). Bis dahin ist das maximal erreichbare
> Paket das oben beschriebene Exit-Export-Set.

---

## 1. Aktueller Projektbestand

### 1.1 Wo liegt der Website-Code?

- **Primär: Lovable-Editor** (Live-Quelle). Bidirektionale GitHub-Anbindung
  möglich (siehe Kapitel 7).
- **Sekundär: GitHub-Repository** (sofern verbunden) — 1:1-Spiegel des
  Lovable-Stands; jede Lovable-Änderung pusht automatisch, jeder Git-Push
  syncht zurück.
- **Tertiär: „Download Codebase"** in Lovable — manueller Schnappschuss als
  ZIP (`TCS-webseite_db_cms.zip`).

### 1.2 Was ist im GitHub-Repo / im Codebase-Download enthalten?

Enthalten:

- gesamter Frontend-Quellcode (`src/`, `public/`, `index.html`)
- Build-Konfiguration (`vite.config.ts`, `tsconfig*.json`, `tailwind.config.ts`,
  `postcss.config.js`, `eslint.config.js`, `components.json`)
- Tests + Playwright-Fixtures
- alle CMS-Audit-/Sync-Skripte unter `scripts/`
- Doku unter `docs/` inkl. Audit-Snapshots und Redaktionshandbuch
- Supabase-Konfiguration: `supabase/config.toml`, Edge-Function-Quellcode
  (`supabase/functions/cms-translate-field/`), Tests
- Migrationsdateien aus dem Build (sofern als Quelle eingecheckt)
- generierte Typen `src/integrations/supabase/types.ts`
- `.lovable/always-follow.md`, `.lovable/plan.md`
- `package.json` + Lockfile

Nicht enthalten:

- **DB-Inhalte** (`cms_*`-Zeilen, Produktdaten, Navigation, Felder, Asset-Metadaten)
- **Storage-Binärdateien** (Bilder im Supabase-Bucket)
- **Auth-User** (es gibt aktuell keine — Prototype-Phase, siehe Kapitel 6)
- **Secrets** (`VITE_SUPABASE_*`, `LOVABLE_API_KEY`, etwaige Edge-Function-Secrets)
- **Supabase-Projekt-Settings** (E-Mail-Provider, Custom-SMTP, Rate-Limits,
  Storage-Bucket-Policies, JWT-Geheimnis, Webhooks)
- **Linter-Ergebnisse / Live-Linter-Warnings**

### 1.3 Was liegt nicht im Code, sondern in Supabase?

Im Supabase-Projekt `uvkubrrljyzfvbvejepl` (CMS-Light):

- 6 CMS-Light-Tabellen + Whitelist + `cms_section_types`
- 34 `rpc_admin_*` Funktionen + Lese-RPCs + Hilfsfunktionen
  (`cms_resequence_sections_dfs`, `cms_renumber_sections`,
  `cms_page_is_public`, `cms_set_updated_at`, `cms_pages_validate_status` …)
- RLS-Policies auf allen `cms_*`-Tabellen (Public-Read scoped auf
  `status=published AND is_active=true`)
- Storage-Bucket(s) mit CMS-Bildern + öffentliche URLs
- Edge Function `cms-translate-field`
- Auth-Konfiguration (ungenutzt in Prototype-Phase)
- Sequences (`cms_pages_page_no_seq`, `cms_sections_section_uid_seq`,
  `cms_assets_asset_no_seq`, `cms_navigation_nodes_node_no_seq`)
- Trigger (z. B. `cms_set_updated_at`, `cms_pages_validate_status`)
- Linter-Warnungen (akzeptiert: `SECURITY DEFINER`, öffentlicher Storage-Bucket)

Im externen Supabase-Projekt `tkscpnwbkjmqopnddxle` (Produktdatenbank):

- Produktkatalog, PDP-Daten, Produktbilder, Produktdokumente, Downloads.
- **Außerhalb dieses Migrationsplans.** Diese DB gehört einer separaten
  Domäne und bleibt unangetastet (`src/lib/supabase/client.ts`).

### 1.4 Was liegt in Lovable-Konfigurationen / Env-Variablen?

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` → zeigen auf das
  CMS-Light-Projekt (Lovable Cloud).
- `VITE_PRODUCT_SUPABASE_URL`, `VITE_PRODUCT_SUPABASE_PUBLISHABLE_KEY` →
  externe Produktdatenbank.
- `LOVABLE_API_KEY` (intern, nur für Lovable-AI-Gateway, nicht für Public-Code).
- Edge-Function-Secrets (z. B. für `cms-translate-field` — Provider-Key).
- Lovable-eigene Publish-/Domain-Konfiguration (Preview-URL, Published-URL,
  Custom-Domain-Slots).

> **Wichtig:** Sowohl `cmsSupabase/client.ts` als auch `lib/supabase/client.ts`
> enthalten **hartkodierte Fallback-URLs + publishable Anon-Keys**. Die Anon-Keys
> sind per Definition für das Frontend gedacht — kein Geheimnis. Trotzdem
> müssen die Fallbacks beim Umzug aktiv ersetzt werden (Kapitel 3.3).

---

## 2. Supabase / Datenbank — Bestandsaufnahme

### 2.1 CMS-Light-Inhaltsdaten

| Tabelle | Inhalt | Migrationsbedeutung |
| --- | --- | --- |
| `cms_pages` | Seiten + Status + Routen | Pflicht-Export (CSV aus Lovable-Cloud-UI; im Ziel über Migration + Import wiederherstellbar) |
| `cms_sections` | Sections, Reihenfolge, Parent/Child | Pflicht-Export (mit `section_uid`-Sequence; siehe Migrations-Skripte) |
| `cms_section_fields` | DE/EN-Feldwerte | Pflicht-Export |
| `cms_assets` | Bild-/Asset-Slots inkl. `storage_path` + `public_url` | Pflicht-Export, abhängig von Storage-Migration |
| `cms_navigation_nodes` | Navigation (Main/Meta/Footer/Persona) | Pflicht-Export |
| `cms_admin_editable_fields` | Whitelist | Pflicht-Export |
| `cms_section_types` | Katalog (Vertrag) | Pflicht-Export |

> Hinweis: „Pflicht-Export" bedeutet **CSV aus dem Lovable-Cloud-Backend-UI
> pro Tabelle** + die Migrationsdateien aus `supabase/migrations/`. Ein
> echter `pg_dump` ist aus dem Lovable-Cloud-Projekt heraus nicht möglich
> (siehe TL;DR-Kasten).

### 2.2 Produktdatenbank

- Externes Projekt, **eigene Migrationsfrage**. Wird hier nicht behandelt.
- Frontend liest read-only über `VITE_PRODUCT_SUPABASE_*`. Beim Umzug nur
  die Env-Variablen neu setzen.

### 2.3 Auth/Login

- **Aktuell ungenutzt.** `/admin` läuft ohne Login (Prototype-Phase, siehe
  `.lovable/always-follow.md`).
- `auth.users` ist leer / irrelevant. Kein Dump nötig.
- **Vor Live:** echte Auth-Schicht ist Pflicht (Kapitel 6).

### 2.4 Storage / Bilder / Dateien

- Mindestens ein öffentlicher Bucket für CMS-Bilder. URLs werden direkt in
  `cms_assets.public_url` gespeichert und im Frontend 1:1 verwendet.
- **Konsequenz:** Storage-Umzug = URL-Umschreibung in `cms_assets`. Ohne
  diesen Schritt zeigt das Ziel-System auf die Lovable-Cloud-URLs zurück
  (funktioniert nur, solange Lovable-Projekt lebt → unzulässig für echten Exit).

### 2.5 RPC-Funktionen

- 34 dokumentierte `rpc_admin_*` + Lese-RPCs (siehe
  `docs/02-architektur/rls-rpc-uebersicht.md`).
- Alle `SECURITY DEFINER`, `search_path = public`.
- **Im Code als Migrationen vorhanden** (sofern `supabase/migrations/` im
  Repo eingecheckt — bitte vor Migration verifizieren). Falls Migrationen
  fehlen: aus Lovable Cloud heraus **nicht** per `pg_dump --schema-only`
  rekonstruierbar (kein PG-Zugang). Stattdessen die fehlenden Definitionen
  über das Lovable-Cloud-Backend-UI (SQL/Functions/Policies-Ansichten)
  abschreiben und als neue Migration ablegen.

### 2.6 RLS-Policies

- Public-Read auf alle `cms_*` mit `is_active`/`status=published`-Filter.
- Schreibwege **ausschließlich** über RPCs (kein direkter `INSERT/UPDATE/DELETE`).
- Quelle für die Migration: `supabase/migrations/` im Repo. Ein
  `pg_dump --schema-only` aus dem Lovable-Cloud-Quellprojekt ist **nicht**
  möglich — fehlende Policies müssen aus dem Cloud-UI rekonstruiert werden.

### 2.7 Edge Functions

- `supabase/functions/cms-translate-field/` (Übersetzungshilfe).
- Quellcode im Repo. Beim Umzug: erneut deployen + Provider-Key als Secret
  setzen.

### 2.8 Environment Variables / Secrets

Nicht hier ausgeben. Vorhandensein bekannt:

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (Frontend, publishable)
- `VITE_PRODUCT_SUPABASE_URL`, `VITE_PRODUCT_SUPABASE_PUBLISHABLE_KEY` (Frontend, publishable)
- Edge-Function-Secret(s) für Übersetzung
- ggf. `LOVABLE_API_KEY` (verbleibt in Lovable, im Eigenbetrieb nicht nötig)

### 2.9 CMS-Light-Master-Snapshot v2 — was er ist und was nicht

Enthält (laut `SnapshotExportView.tsx` + `cmsSnapshotExport`):

- die 6 CMS-Light-Tabellen als JSON (RLS-gefiltert → **nur Published/Aktiv**)
- CSV/Excel-Strukturansichten
- Asset-Indizes + Download-Liste (Storage-Pfade + `public_url`)
- Migrationsdateien aus dem Build (sofern vorhanden)
- Section-Type-Vertrag, abgeleitetes Schema, Validation-Checks
- HANDOVER/RESTORE-Doku + Manifest

Enthält **ausdrücklich nicht**:

- Drafts, inaktive Inhalte, archivierte Pages
- Binär-Bilder (nur URLs)
- `auth.*`, `storage.*`, `supabase_functions`, `vault`
- RPC-Bodies / vollständige RLS-Policies
- Produkt-DB
- Secrets

**Reicht der Snapshot für vollständige Wiederherstellung? Nein.** Er ist ein
redaktionelles Übergabepaket, kein DB-Backup.

**Wichtige Korrektur zu früheren Fassungen:** Aus Lovable Cloud heraus ist
**kein** vollständiger `pg_dump --schema-only` / `--data-only` möglich
(kein PG-Zugang, kein DB-Passwort, kein `service_role`-Key für den Nutzer).
`supabase storage cp` gegen das Quellprojekt ist aus demselben Grund nicht
ausführbar. Für die spätere echte Migration ist daher in der **Zielumgebung**
zusätzlich nötig — nicht aus dem Quellprojekt heraus:

1. `pg_dump --schema-only` / `--data-only` **erst dann**, wenn das Projekt
   auf einer eigenständigen Supabase-/Postgres-Instanz läuft (also nach dem
   ersten Schema- + CSV-Import in die Zielumgebung), für reguläre Backups
   im Eigenbetrieb.
2. Storage-Spiegelung (rclone / `supabase storage cp` / S3-Sync) inkl.
   Bucket-Policies — die **Lese-Spiegelung des heutigen Storage** läuft in
   der Praxis über die Asset-Downloadlisten des Master-Snapshots
   (`assets/asset-download-list.txt` / `.csv`) bzw. über das
   Lovable-Cloud-Storage-UI.
3. Edge-Function-Code + zugehörige Secrets in der Zielumgebung neu deployen.
4. Auth-Konfiguration (falls bis Migration eingeführt) separat in der
   Zielumgebung neu anlegen — Auth-Daten lassen sich nicht ohne
   `service_role` exportieren.

---

## 3. Code-Migration

### 3.1 Framework / Build

- **Vite 5 + React 18 + TypeScript 5 + Tailwind v3.**
- Standard-Build (`vite build`) erzeugt statisches `dist/`. Lauffähig auf
  jedem Static-Host (Vercel, Netlify, Cloudflare Pages, S3+CloudFront, Nginx).
- SPA-Routing über React-Router → Hosting braucht SPA-Fallback
  (Vercel/Netlify out-of-the-box; Nginx braucht `try_files`).

### 3.2 Benötigte Env-Variablen am Ziel

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_PRODUCT_SUPABASE_URL`
- `VITE_PRODUCT_SUPABASE_PUBLISHABLE_KEY`
- Für Edge Functions: ihre jeweiligen Provider-Secrets.

### 3.3 Hartkodierte Fallbacks (Achtung)

- `src/lib/cmsSupabase/client.ts` enthält Fallback auf `uvkubrrljyzfvbvejepl`.
- `src/lib/supabase/client.ts` enthält Fallback auf `tkscpnwbkjmqopnddxle`.

Vor einem Exit **müssen** diese Fallbacks angepasst werden, sonst zeigt der
Eigenbetrieb still auf das Lovable-Projekt zurück. Empfehlung: Fallbacks
entfernen und Build hart fehlschlagen lassen, wenn Env fehlt. Optional:
neuen Fallback auf das neue eigene Projekt.

### 3.4 `src/integrations/supabase/client.ts` und `types.ts`

- Auto-generiert durch Lovable.
- Beim Eigenbetrieb: Typen über `supabase gen types typescript` aus dem
  neuen Projekt regenerieren. Client-Datei kann manuell gepflegt werden.

### 3.5 Deployment-Optionen

| Option | Aufwand | Eignung |
| --- | --- | --- |
| **Vercel** (statisches Build + Env) | gering | sehr gut, SPA-Fallback inklusive |
| **Netlify / Cloudflare Pages** | gering | gleichwertig zu Vercel |
| **Eigener Nginx / Caddy auf VPS** | mittel | gut, SPA-Fallback selbst konfigurieren |
| **Docker-Image** (multi-stage Build + Nginx) | mittel | gut für reproduzierbare Releases |
| **S3 + CloudFront** | mittel | gut, OAI/Behavior für SPA nötig |

Edge-Function `cms-translate-field`:

- Variante A (eigenes Supabase): einfach erneut deployen.
- Variante C/D (kein Supabase): als eigenständige Function (Vercel
  Edge/Functions, Cloudflare Worker, Express-Endpoint) neu bauen.

---

## 4. Datenbank-Migrationswege — Variantenvergleich

### Variante A — Eigenes Supabase-Projekt außerhalb Lovable (managed)

- **Aufwand:** gering bis mittel.
- **Risiko:** gering.
- **Vorteile:** RLS, RPCs, Storage, Auth funktionieren identisch.
  Migration über `supabase/migrations/` + CSV-Import + manuelle
  Storage-Spiegelung. `pg_dump` / `supabase storage cp` stehen **erst in
  der Zielumgebung** als regulärer Backup-Mechanismus zur Verfügung,
  nicht aus dem Lovable-Quellprojekt. Frontend ändert nur Env.
- **Nachteile:** Weiterhin Abhängigkeit von Supabase Inc.
- **Was bleibt kompatibel:** Schema, RLS, RPCs, Frontend-Client, Edge
  Functions, Storage-Pattern.
- **Was muss neu gebaut werden:** nichts Substanzielles. Nur Re-Deploy
  Edge Functions + neue URLs in `cms_assets.public_url` umschreiben.
- **Eignung für CMS-Light:** ★★★★★

### Variante B — Self-hosted Supabase

- **Aufwand:** hoch (Docker-Stack: Postgres, GoTrue, PostgREST, Realtime,
  Storage, Studio, Kong, Auth-Provider-Setup, Backups, Updates).
- **Risiko:** mittel bis hoch (Betriebslast, Sicherheits-Patches,
  Storage-Disaster-Recovery selbst stemmen).
- **Vorteile:** vollständige Datenhoheit, identisches Schema/APIs.
- **Nachteile:** Betrieb teuer, Storage-Bucket-URLs müssen über eigenes
  Domain-Mapping stabil bleiben.
- **Was bleibt kompatibel:** alles auf API-Ebene.
- **Was muss neu gebaut werden:** Betriebsinfrastruktur, Backups, Monitoring.
- **Eignung für CMS-Light:** ★★★★ (sofern Betriebskompetenz vorhanden)

### Variante C — Reine private Postgres-DB ohne Supabase

- **Aufwand:** hoch.
- **Risiko:** hoch.
- **Vorteile:** maximale Reduktion.
- **Nachteile:** Verlust von Auto-REST-Layer (PostgREST), Storage-Layer,
  Auth-Layer. Frontend müsste komplett neu gegen eigene API gebaut werden;
  RPC-Aufrufe wandern in Server-Endpoints.
- **Was bleibt kompatibel:** das Datenmodell + die SQL-Funktionen.
- **Was muss neu gebaut werden:** komplette API-Schicht, Auth-Schicht,
  Storage-Schicht, Client-SDK.
- **Eignung für CMS-Light:** ★★ — nur sinnvoll, wenn Supabase als Produkt
  ausgeschlossen wird.

### Variante D — Managed Postgres + eigene API-Schicht

- **Aufwand:** sehr hoch.
- **Risiko:** hoch.
- **Vorteile:** freie Provider-Wahl (Neon, Crunchy, RDS, Hetzner Managed).
- **Nachteile:** wie C plus Provider-spezifische Eigenheiten.
- **Was bleibt kompatibel:** Datenmodell.
- **Was muss neu gebaut werden:** API, Auth, Storage-Anbindung, Frontend-Calls.
- **Eignung für CMS-Light:** ★★

### Empfehlung

**Variante A.** Sie erhält den existierenden Vertrag (RLS + RPC + Storage +
Auth) 1:1 und reduziert den Umbau im Frontend auf Env-Variablen +
URL-Rewrite in `cms_assets`. Alles andere ist ein Re-Build, nicht ein Exit.

---

## 5. Assets / Bilder / Dateien

- **Speicherort heute:** Supabase Storage des CMS-Light-Projekts. Öffentlicher
  Bucket, direkte URLs im Frontend.
- **URL-Speicherung:** `cms_assets.public_url` (vollständige Lovable-Cloud-URL)
  + `cms_assets.storage_path` (relativ zum Bucket).
- **Buckets:** mindestens ein öffentlicher Bucket. Vor Migration via
  Supabase-Studio bestätigen (`bucket_id`, Policies, Public-Flag).
- **Migrationsweg:** `supabase storage cp` (oder `rclone` mit S3-API) auf
  das Ziel-Projekt. Anschließend Bulk-Update in `cms_assets.public_url`
  (idempotente RPC oder Migration), `storage_path` bleibt gleich.
- **Risiko Public-Rendering:** Solange `public_url` auf Lovable zeigt,
  hängt die neue Webseite weiter am alten Projekt. Lösung: harter URL-Cut
  + 24h-Redirect über CDN, oder besser: erst URL umschreiben, dann
  DNS-Switch.
- **Empfohlene Reihenfolge:**
  1. Buckets spiegeln.
  2. Smoke-Test mit Stichprobe (Single-Asset im Ziel).
  3. Bulk-URL-Rewrite in Ziel-DB.
  4. Visueller Spiegel-Audit (Public-Preview).

---

## 6. Auth / Admin

- **Heute:** `/admin` ohne Login. Erlaubt in Prototype-Phase, dokumentiert
  in `.lovable/always-follow.md` und `cms-steuerbarkeit-status.md`.
- **Folgeprojekt „Login/Auth/Rollen"** ist in `docs/04-betrieb/naechste-schritte.md`
  und `docs/04-betrieb/audit-snapshot/admin-login-vorbereitung.md` bereits skizziert.
- **Pflicht vor echtem Eigenbetrieb / Public-Reichweite:**
  - Supabase-Auth aktivieren (Email/Password + Google als Defaults).
  - `user_roles`-Tabelle + `has_role()`-Funktion (Pattern aus
    `<user-roles>`-Regel).
  - RLS für Schreibwege auf authenticated + admin-Rolle einschränken
    (heute laufen RPCs `SECURITY DEFINER` ohne Caller-Check).
  - `rpc_admin_*` um `has_role(auth.uid(), 'admin')`-Gate ergänzen.
- **Snapshot ≠ fertige Auth:** Der Master-Snapshot v2 enthält **keine**
  Auth-Daten und keine Rollen. Auth ist explizit Post-Migrations-Arbeit
  und darf nicht als „mit Snapshot abgedeckt" missverstanden werden.

---

## 7. GitHub / Codebase

- **GitHub-Repo (sofern verbunden) ist die saubere Übergabequelle.**
  Voller Verlauf, eindeutige Commits, taggable.
- **„Download Codebase" aus Lovable** ist ein Zeitpunkt-ZIP — nützlich für
  ein versiegeltes Übergabepaket, aber keine Quelle für Folge-Iterationen.
- **Konsistenz GitHub ↔ Lovable ↔ lokaler ZIP:**
  - Lovable-↔-GitHub-Sync ist bidirektional → solange beide Wege aktiv
    sind, deckungsgleich.
  - ZIP nur als versiegelter Snapshot zum Übergabezeitpunkt verwenden,
    nicht zum Weiterarbeiten.
  - Vor Migrations-Cutoff: **Lovable-Schreibstopp**, Git-Tag setzen
    (z. B. `pre-exit-2026-XX-XX`), ZIP + Master-Snapshot + CSV-Exporte
    pro Tabelle + Storage-Spiegel unter diesem Tag bündeln.
- **Empfehlung Übergabepaket („Release-Stand", Lovable-Exit-Export-Set):**
  1. Git-Tag `vX.Y-exit`.
  2. Codebase-ZIP aus Lovable an genau diesem Tag.
  3. CMS-Light-Master-Snapshot v2 (RLS-gefiltert; redaktioneller Lesesnapshot).
  4. `supabase/migrations/`-Verzeichnis (Schemaquelle).
  5. **CSV-Export pro Tabelle aus dem Lovable-Cloud-Backend-UI** (alle
     `cms_*`-Tabellen inkl. Drafts/Archived, sofern UI-zugänglich) — ersetzt
     den aus Lovable nicht möglichen `pg_dump --data-only`.
  6. Storage-Bucket-Spiegel: manueller Download über die
     Asset-Downloadlisten des Snapshots bzw. das Cloud-Storage-UI
     (kein `supabase storage cp` aus Quelle möglich).
  7. Änderungsprotokoll (`docs/03-redaktion/redaktions-aenderungsprotokoll.md`
     + `docs/migration-log.md` einfrieren).
  8. Checksums (`sha256sum`) für alle Artefakte.
  9. Secrets/Auth/OAuth-Provider werden **nicht exportiert** — sie werden
     in der Zielumgebung neu eingerichtet.

---

## 8. Empfohlener Migrationsplan in Phasen

### Phase 1 — Inventur / Freeze-Export

- Entscheidung: Zielvariante (Empfehlung: A).
- Entscheidung: Ziel-Hosting (Vercel / Netlify / eigener Server).
- Entscheidung: Custom-Domain-Strategie (gleicher Host oder neuer DNS-Anbieter).
- Maßnahme: Lovable-Schreibstopp ankündigen, Git-Tag setzen, Codebase-ZIP
  ziehen, Master-Snapshot v2 erzeugen.
- Risiko: keins (read-only).

### Phase 2 — Bestmögliches Lovable-Exit-Export-Set

- **Kein `pg_dump` aus Lovable Cloud möglich** (kein PG-Zugang, kein
  `service_role`). Stattdessen:
  - Migrationen aus `supabase/migrations/` als Schemaquelle einfrieren.
  - **CSV-Export pro relevanter Tabelle** über das Lovable-Cloud-Backend-UI
    (alle `cms_*`-Tabellen). Reihenfolge respektieren (Parent-Tabellen
    zuerst), damit Re-Import in Zielumgebung referenz-sauber ist.
  - CMS-Light-Master-Snapshot v2 als redaktioneller Lesesnapshot
    (Published/Aktiv).
  - Storage-Dateien manuell sichern über die Asset-Downloadlisten des
    Snapshots (`assets/asset-download-list.txt` / `.csv`) bzw. das
    Cloud-Storage-UI.
- Edge-Function-Code archivieren (bereits im Repo).
- Auth-Settings + Bucket-Policies dokumentieren (Screenshots/Notizen) —
  Secrets/OAuth werden in der Zielumgebung **neu eingerichtet**, nicht
  exportiert.
- Risiko: keins (read-only).

### Phase 3 — Zielumgebung aufsetzen

- Neues Supabase-Projekt anlegen (Variante A).
- `supabase/migrations/` einspielen (Tabellen, Sequences, Trigger,
  Funktionen, Policies). Fehlende Definitionen ggf. aus dem Cloud-UI
  rekonstruieren (siehe 2.5 / 2.6).
- Storage-Buckets in Ziel anlegen, Policies setzen, Dateien aus dem
  manuellen Storage-Spiegel hochladen.
- Edge Function neu deployen, Provider-Secret setzen.
- Ab diesem Punkt ist `pg_dump` in der Zielumgebung als regulärer
  Backup-Mechanismus möglich → erste Baseline ziehen.
- Risiko: gering, isoliert von Produktion.

### Phase 4 — Code konfigurieren

- Hartkodierte Fallback-URLs in `src/lib/cmsSupabase/client.ts` und
  `src/lib/supabase/client.ts` auf neues Projekt umstellen **oder** entfernen.
- Env-Variablen im Ziel-Hosting setzen.
- Typen neu generieren (`supabase gen types typescript`).
- Build lokal/CI verifizieren.

### Phase 5 — Daten importieren

- CSV-Exporte pro Tabelle aus Phase 2 ins neue Projekt importieren
  (Reihenfolge: `cms_section_types` → `cms_pages` → `cms_sections` →
  `cms_section_fields` → `cms_assets` → `cms_navigation_nodes` →
  `cms_admin_editable_fields`). Sequences danach auf `max(id)+1` setzen.
- Bulk-Update `cms_assets.public_url` auf neue Storage-Domain.
- Wahrheits-Check + Spiegel-Audit gegen Ziel-DB laufen lassen
  (`scripts/cms/wahrheits-check-ci.mjs`, `scripts/cms/admin-anzeige-spiegel.mjs`).
- Erwartung: Zahlen identisch zu `cms-steuerbarkeit-status.md` (alle 0).

### Phase 6 — Admin/Login absichern

- Auth aktivieren, `user_roles` + `has_role` anlegen.
- Admin-RPCs um Rollen-Gate erweitern.
- Admin-UI um Login ergänzen (siehe `admin-login-vorbereitung.md`).
- Nicht parallel mit DNS-Switch — eigene QA-Runde.

### Phase 7 — Public-Preview testen

- Ziel-Hosting auf temporärer Subdomain (`exit-preview.…`).
- Visueller Vollabgleich gegen `tcs-webseite-db-cms.lovable.app`.
- i18n + Navigation + Karten-Renderer + Assets stichprobenartig prüfen.
- Lighthouse / SEO-Snapshot vergleichen.

### Phase 8 — DNS / Go-Live

- Erst nach grünem Preview.
- TTL der Custom-Domain vorher senken (z. B. 300 s).
- Cutoff-Fenster wählen (Wochenende, niedrige Last).
- Lovable-Projekt **nicht** sofort löschen — mindestens 30 Tage als
  Rollback-Quelle behalten.

### Phase 9 — Rollback-Plan

- DNS zurück auf Lovable-Custom-Domain (TTL klein → schnelle Rückkehr).
- Schreibstopp auf Ziel-DB, damit keine zweite Wahrheit entsteht.
- Differenz-Inhalte später manuell nachziehen.

---

## 9. Risiken / offene Fragen

### Fehlende Informationen heute

- Genauer Bucket-Name(n) im CMS-Light-Storage + Policies nicht in Doku belegt.
- `supabase/migrations/`-Vollständigkeit gegen Live-DB nicht zertifiziert
  (Linter sagt: Funktionen + Policies sind da, aber Drift-Audit pro Migration
  fehlt).
- Edge-Function `cms-translate-field` — welcher Provider, welcher Secret-Name?
- Sind Drafts/Archived-Inhalte erhaltenswert oder darf der RLS-gefilterte
  Snapshot reichen? (Empfehlung: vollständigen Dump nehmen, später entscheiden.)
- Gibt es Webhooks/Cron-Jobs in Supabase, die nicht im Repo sind?

### Kritische Lovable-/Supabase-Abhängigkeiten

- Lovable-Publish-Pipeline (`*.lovable.app`-URL).
- Lovable-AI-Gateway (`LOVABLE_API_KEY`) → falls Edge Function darauf
  zugreift, im Eigenbetrieb durch direkten Provider-Key ersetzen.
- Auto-Generierung von `src/integrations/supabase/types.ts` und
  `supabase/config.toml`.
- GitHub-Sync — nach Exit deaktivieren, sonst überschreibt Lovable Änderungen.

### Gefahr „zweite Wahrheit"

- Doppelter Schreibzugriff während Cutoff (Lovable-Admin **und** Ziel-Admin
  gleichzeitig offen). → Strikter Schreibstopp im Quell-System für die
  gesamte Phase 5–8.
- Storage-URLs, die nicht umgeschrieben wurden → Frontend lädt aus altem
  Projekt, fällt aus, sobald Lovable abgeschaltet wird.
- Produkt-DB ist eine andere Wahrheit — nicht mit CMS-Light vermischen.

### Vor echter Migration zwingend zu klären

1. Zielvariante final entscheiden (A vs. B vs. später).
2. Hosting-Ziel + Custom-Domain-Owner final.
3. Auth-Modell festlegen (mind. Email/Password + Google, Rollen-Definition).
4. Backup-Strategie im Ziel (Frequenz, Retention, Restore-Test).
5. Monitoring im Ziel (Uptime, DB-Health, Storage-Limits).
6. Verantwortlichkeiten Betrieb (wer macht Updates, wer rotiert Keys?).

---

## 10. Ergebnis

- **Migration ist grundsätzlich möglich** und durch die offene
  Tech-Auswahl (Vite/React/Tailwind/Postgres/Supabase) ohne Lock-in im
  Anwendungscode realisierbar.
- **Empfohlene Zielvariante: A — eigenes managed Supabase-Projekt** + Hosting
  auf Vercel oder gleichwertig. Geringster Umbau, identischer Vertrag
  (RLS + RPC + Storage + Auth).
- **Kleinster sicherer erster Schritt:** Phase 1 + 2 — das **bestmögliche
  Lovable-Exit-Export-Set**: Git-Tag, Codebase-ZIP, `supabase/migrations/`,
  CMS-Light-Master-Snapshot v2, CSV-Export pro Tabelle aus dem
  Lovable-Cloud-Backend-UI, manuelle Storage-Spiegelung über die
  Asset-Downloadlisten. Read-only, ohne Live-Impact.
  **Kein vollständiges Wiederherstellungs-Backup aus Lovable Cloud
  möglich** — ein echter `pg_dump` existiert erst, sobald das Projekt in
  der Zielumgebung läuft.
- **Was auf keinen Fall spontan passieren darf:**
  - DNS-Switch ohne grünen Preview.
  - Schreibarbeit gleichzeitig in Lovable und Ziel-Admin.
  - Migration der Storage-Pfade ohne Bulk-URL-Rewrite in `cms_assets`.
  - Vermischung mit der Produktdatenbank (`tkscpnwbkjmqopnddxle`).
  - Löschen des Lovable-Projekts vor 30-Tage-Rollback-Fenster.
  - Auth-Einführung im selben Cutoff wie der DNS-Switch.

---

## Anhang — verwiesene Dokumente

- `docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md`
- `docs/current-status.md`
- `docs/04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md`
- `.lovable/always-follow.md`
- `docs/02-architektur/rls-rpc-uebersicht.md`
- `docs/02-architektur/architektur.md`
- `docs/04-betrieb/naechste-schritte.md`
- `docs/04-betrieb/audit-snapshot/admin-login-vorbereitung.md`
- `src/features/admin/components/SnapshotExportView.tsx`
- `src/lib/cmsSupabase/client.ts`
- `src/lib/supabase/client.ts`
