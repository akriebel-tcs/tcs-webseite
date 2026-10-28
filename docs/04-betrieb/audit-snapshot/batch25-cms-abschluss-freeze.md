# Batch 25 — CMS-Abschluss-Freeze (Abnahmebericht)

Stand: 2026-06-04 · Reines Prüf-/Doku-Batch. Keine Migrationen, keine
Renderer-Umbauten, keine Inhaltsänderungen.

## Executive Summary

**Der harte CMS-Kern ist abgeschlossen und freeze-reif.**

Alle launch-kritischen Gates sind frisch gemessen grün:

- Wahrheits-Check CI: ✅
- Spiegel-Audit: **0** Befunde
- Coverage (DB-Section ohne Public-Renderpfad): **0**
- FAQ/CTA orphan/mixed/dedup-only: **0**
- Public-Blocks rot / gelb_medium / gelb_restschuld: **0 / 0 / 0**
- Hartcode `db_aktiv_aber_public_ignoriert`: **0**
- Persona „Eine Wahrheit": 6/6 grün

Die Aussage „ca. 90-92 % fertig" bezieht sich nicht auf das DB-first-CMS
selbst (das ist 100 % grün auf den geprüften Achsen), sondern auf das
**Gesamtsystem** inkl. bewusst geparkter Bereiche:

- Login / Auth / Rollenmodell (eigenes Folgeprojekt).
- 3 echte Code-Seiten / Klasse-A-Marketing-Pages (separater Track).
- Admin-UX-Kosmetik (kleine Glitches, kein Inhaltsbruch).
- Redaktionelles Inhalts-Audit nach Marketing-Update.

Was **nicht** Teil dieses Abschlusses ist: Login/Auth, Klasse-A-Migration,
Produkt-Hub / PDP / Katalog, neue Admin-Schalter-Welle.

## Aktuelle Ampeln (frisch gemessen 2026-06-04)

| Bereich | Status | Detail |
|---|---|---|
| Wahrheits-Check CI | ✅ grün | Harvester reproduzierbar, kein Drift, Launch-Gate erfüllt |
| Spiegel-Audit | ✅ 0 Befunde | inkl. Sub-Gates persona/card-parität/sort-order |
| Coverage | ✅ 0 | (Serviceportal-Pages haben mit Login-Park ihren Pfad bekommen) |
| FAQ | 82 OK · 27 „—" · 0 orphan/mixed/dedup-only | |
| CTA | 109 OK · 0 „—" · 0 orphan/mixed/dedup-only | |
| Body-Pfad | 114/114 ok | 0 unknown |
| Public-Blocks | rot 0 · gelb_medium 0 · gelb_restschuld 0 · grau 2 | |
| Hartcode-Inventar | 60 cms_gesteuert · 61 db_first · 3 hartcodierter_inhalt (Klasse A) · 5 layout_erlaubt | 0 Schalterbruch |
| Navigation / Breadcrumbs | ✅ | Pillen für Subknoten, „Hauptmenü aus"-Hint, Breadcrumb-RPC tolerant |
| Service-Hub (Batch 22) | ✅ | Kartenraster + Standardkarten DB-first |
| Schattenfelder B23/B24 | ✅ | geleert / B-324 gelöscht, kein Public-Effekt |

## Was seit Batch 7c bis Batch 24 erreicht wurde

- **Coverage**: 73 → 0 (alle Pages haben einen DB-first Render-Pfad).
- **Spiegel-Audit**: massiv → 0.
- **Admin-Wahrheits-Check**: in der CI eingefroren, jede Drift bricht den Build.
- **FAQ/CTA**: vollflächig über generische Renderer / `CmsTailFaq` / `CmsTailCta`; keine Dedup-Only-Restschuld mehr.
- **Service-Hub**: vollständig in CMS-/Nav-Struktur eingebunden (Karten, Routen, Breadcrumbs, „Hauptmenü aus"-Erklärung).
- **Altbestand-Schattenfelder**: `beschilderung/features`, `digital-signage/products` geleert; `B-324` gelöscht.
- **Keine Public-Doppelblöcke**: `gelb_medium`-Kategorie auf 0.
- **`admin_schalter_ohne_public_wirkung`**: 0 Pages (alle Wellen 1–4 + Service-Hub abgeschlossen).
- **Navigation**: graue Verlinkungs-Pille für alle Subknoten, Inline-Hint für `is_active=false` Knoten, Breadcrumb-RPC tolerant gegenüber ausgeblendeten Knoten.

## Bewusst offen (post-Freeze)

| Thema | Charakter | Empfehlung |
|---|---|---|
| Login / Auth / Rollen | eigenes Auth-Projekt | erst nach Freeze, mit eigenem Plan |
| 3 hartcodierte Marketing-Pages (Klasse A) | inhaltlicher Migrationsaufwand | separater Track, kein Blocker |
| Admin-UX-Kosmetik | UX-Politur (z. B. Whitelist-Race beim Karten-Verschieben) | optionaler Folge-Batch |
| Inhalts-Audit nach Marketing-Update | redaktionell | nach nächstem Marketing-Stand |
| Optional Admin-Schalter Welle 2 | nur falls fachlich nötig | nicht jetzt starten |

## Was vor Freeze NICHT mehr gestartet werden soll

- Keine neue Migrationswelle.
- Keine Renderer-Umbauten.
- Keine neuen Admin-Schalter.
- Keine Login/Auth-Arbeit (separates Projekt).
- Keine Produkt-/Katalog-/PDP-Ausweitung.
- Keine Klasse-A-Migration ohne expliziten Auftrag.

## Empfehlung für optionale Folge-Batches (nach Freeze)

1. **Admin-UX-Kosmetik** — Race-Conditions, Tooltips, kleine Hints.
2. **Klasse-A-Marketing-Pages / harte Code-Seiten** — inhaltliche Migration in DB.
3. **Admin-Schalter Welle 2** — nur falls fachlich nötig.
4. **Login/Auth** — eigenständiges Auth-Projekt mit Rollenmodell.
5. **Inhalts-Audit** — nach nächster Marketing-Freigabe.

## ZIP-/Übergabestand

Für die Übergabe existieren zwei manuell gezogene ZIPs. **Beide werden
nicht im Code erzeugt** und kein Code-Prozess muss sie automatisch bauen.

| ZIP | Quelle | Inhalt | Charakter |
|---|---|---|---|
| `TCS-webseite_db_cms.zip` | manuell aus Lovable heruntergeladen | aktueller Codebase-Stand des Projekts | Code-Snapshot |
| `cms-light-master-snapshot-v2-2026-06-04T22-10-21-701Z.zip` | manuell aus CMS-Light heruntergeladen | CMS-/DB-Inhalte (Pages, Sections, Felder, Assets, Navigation) laut Manifest `rls_public_only` | öffentlicher Lesesnapshot |

**Wichtig zum CMS-Light-Snapshot (`rls_public_only`):**

Das ist ein **öffentlicher Lesesnapshot**, kein vollständiges DB-Backup.
Nicht enthalten sind: `auth.*` (Nutzer, Sessions), `storage.*` (Bucket-
Inhalte und Policies), `supabase_functions.*`, RPC-Bodies
(`rpc_admin_*` Funktionsdefinitionen), vollständige RLS-Policies sowie
alles, was hinter `service_role` liegt. Für ein echtes Recovery-Backup
würde zusätzlich ein technischer DB-Dump benötigt — das ist ein
separater Auftrag.

Beide ZIPs liegen außerhalb des Repos und sind Übergabe-Artefakte, keine
Build-Outputs. Bitte nicht erneut versuchen, sie aus dem Code zu erzeugen.

## Smoke / Verifikation

- Wahrheits-Check CI lokal ausgeführt → grün.
- Alle sieben Audit-Skripte frisch laufen lassen → grün / 0 Befunde.
- Persona-Gate → 6/6 grün.
- Keine neuen roten/high Befunde.

## Freeze-Empfehlung

Der harte CMS-Kern darf jetzt eingefroren werden. Keine neuen Batches
ohne expliziten Auftrag starten. Bei neuen roten Befunden zuerst
klassifizieren und Rückfrage stellen, nicht automatisch beheben.
