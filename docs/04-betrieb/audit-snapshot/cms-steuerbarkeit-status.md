# CMS-Steuerbarkeit – Stand der Messungen

Letzte vollständige Messung: **2026-06-04** (Batch 24). Redaktionell
überprüft am 2026-09-14: die Zahlen sind seither **nicht** erneut
gemessen worden. Login bleibt **out of scope**.

> **Gültigkeit (2026-09-14):** Alle Ampeln unten sind **historische
> Messwerte vom 2026-06-04**, keine aktuelle Abnahme. Bis zu einer neuen
> Messung gilt jedes Gate als **ungeprüft = offen**. Es gibt derzeit
> keine gültige Gesamtgrün-Abnahme.

> Batch 15 (Kalibrierung): `card_v1` hat drei optionale Bildslots
> (`image`, `thumbnail`, `icon_image`) — alle drei werden von den
> Karten-Renderern als Fallback-Kette gelesen.

## Harte CMS-Kernabnahme (Historie 2026-06-04)

**Damaliger Status: grün / abgeschlossen** — als Momentaufnahme zu lesen.

Zum Messzeitpunkt waren alle launch-kritischen Gates grün.

> **Freeze-Lesart (klarifiziert seit Batch 33):** „Eingefroren" bedeutet
> **keine unkontrollierten Umbauwellen**, nicht „keine Arbeit mehr". Jede
> weitere Änderung am CMS-Kern muss beauftragt, spiegel-treu, idempotent,
> dokumentiert und mit Wahrheits-Check + Build verifiziert sein
> (Details: `.lovable/always-follow.md`, Abschnitt CMS-Freeze).

## Ampeln der Messung vom 2026-06-04 (Historie)


| Gate | Wert | Quelle |
|---|---:|---|
| Wahrheits-Check CI (Launch-Gate) | ✅ grün | `scripts/cms/wahrheits-check-ci.mjs` |
| Globaler Spiegel-Audit (Befunde) | **0** | `scripts/cms/globaler-spiegel-audit.mjs` |
| FAQ orphan / mixed / dedup-only | 0 / 0 / 0 | `scripts/cms/faq-cta-toggle-inventar.mjs` |
| CTA orphan / mixed / dedup-only | 0 / 0 / 0 | dto. |
| FAQ OK / „—" / UNKNOWN | 82 / 27 / 0 | dto. |
| CTA OK / „—" / UNKNOWN | 109 / 0 / 0 | dto. |
| Body-Pfad ok / unknown | 114 / 0 | dto. |
| Page-Renderer-Coverage (`AKTIVE_DB_SECTION_OHNE_PUBLIC_RENDERPFAD`) | **0** | `scripts/cms/page-renderer-coverage.mjs` |
| Hartcode `db_aktiv_aber_public_ignoriert` | **0** | `scripts/cms/hartcode-steuerbarkeit-inventar.mjs` |
| Hartcode `admin_schalter_ohne_public_wirkung` / `public_ohne_admin_pflege` | **0** / **0** | dto. |
| Public-Blocks Ampel rot / gelb_medium / gelb_restschuld / grau | **0** / **0** / **0** / 2 | `scripts/cms/public-blocks-ignorieren-admin-visibility.mjs` |
| Persona „Eine Wahrheit" | ✅ 6/6 grün | `scripts/cms/persona-eine-wahrheit.mjs` |
| Sub-Gates Card-Parität · Sort-Order · persona-eine-wahrheit | grün / grün / grün | Spiegel-Audit-Header |

Hartcode-Kategorisierung (77 Pages): cms_gesteuert 60 · db_first_mit_i18n_fallback 61 ·
hartcodierter_inhalt 3 (Klasse-A-Track) · hartcodiertes_layout_erlaubt 5.

## Service-Hub (Batch 22–24)

- Kartenraster + Standardkarten aktiv, DB-first.
- Sub-Pages über Karten + Routen erreichbar.
- Admin-Navigationsbaum zeigt graue Verlinkungs-Pille für Subknoten.
- „Hauptmenü aus" mit Admin-Hilfetext erklärt (Seite bleibt live, nur kein Hauptmenü-Eintrag).
- Breadcrumbs funktionieren auch bei `cms_navigation_nodes.is_active=false`
  (RPC `rpc_public_resolve_breadcrumb` ignoriert `is_active`-Flag).

## Schattenfelder / B-324 (Batch 23–24)

- `gebaeudekommunikation.beschilderung / features` Altbestand geleert.
- `gebaeudemanagement.digital-signage / products` Altbestand geleert.
- B-324 (ausgeblendete `content_v1` Section) inkl. Felder + Whitelist gelöscht.
- Kein Public-Effekt — Renderer hat diese Pfade bereits seit Batch 22 ignoriert.

## Sprachen EN/PL/NL/DA — Gerüst vorhanden, Inhaltsstand ungeprüft

Zielumfang sind EN, PL, NL und DA. Welche Sprachen tatsächlich aktiv und
öffentlich sind, steht ausschließlich im Sprachregister `cms_locales`
(gelesen über `src/i18n/localeRegistry.ts`) — nicht in dieser Datei und
nicht in einer Code-Liste.

- Live vorhanden: Sprachspalten (`cms_pages.title_*`,
  `cms_navigation_nodes.label_*/description_*`, `cms_assets.alt_*`),
  `cms_section_fields.review_status` (`geprueft|maschinell`),
  Übersetzungseinheiten `cms_translation_units`, Läufe und
  Übersetzungsspeicher.
- **Inhaltszahlen: ungeprüft.** Frühere Angaben in dieser Datei
  („PL-Felder 0") und im Änderungsprotokoll („PL 362, `maschinell` 362",
  Stand 2026-09-11) widersprechen sich. Beide sind Historie; ein
  aktueller Zählstand muss vor Sprachaussagen frisch gelesen werden.
- Ein dänischer Lauf ist **pausiert** und bleibt unangetastet.
- Übersetzungen werden laut Auftraggeber ohne zusätzliche
  Kuratierungssperre ausgespielt; Freigabe- und Herkunftsangaben dürfen
  dabei nicht verfälscht werden. Automatische neue Übersetzungsläufe
  starten nur auf ausdrücklichen Auftrag.

- Sicherheitskorrektur 2026-09-11: `rpc_admin_save_machine_translation` ist
  atomar (schreibt direkt `maschinell`, kein Zwischenzustand `geprueft`);
  diese Funktion und `rpc_admin_set_field_review_status` sind für
  `PUBLIC`/`anon`/`authenticated` **nicht** ausführbar (nur
  `service_role`/`postgres`). Details: `docs/migration-log.md`.

**Offene Sicherheitszustände (ungeprüft, nicht abgenommen):**

1. **Kein serverseitiger Herkunftsschutz.** `review_status` wird nur in
   drei Client-Lesewegen ausgewertet (`useCmsPageContent`,
   `applyCmsOverlay`, `cmsContent`). Direktes `anon`-Lesen von
   `cms_section_fields` und die MCP-Lesewerkzeuge
   (`supabase/functions/mcp/index.ts`, `src/lib/mcp/tools/*`) werten ihn
   nicht aus. Folge: Herkunft ist heute keine serverseitig durchgesetzte
   Eigenschaft. Der Auftraggeber verzichtet ausdrücklich auf eine
   zusätzliche Kuratierungssperre beim Ausspielen — Herkunfts- und
   Freigabeangaben dürfen deshalb nicht verfälscht oder unterdrückt
   werden.
2. **Keine Auth-/Rollenprüfung.** Alle `rpc_admin_*`-Schreibwege und
   `cms-translate-field` haben keine Caller-Autorisierung
   (No-Login-Prototyp; Linter-Altwarnungen). Bestehender legitimer
   Zugang bleibt erhalten; eine neue Kontopflicht wird jetzt nicht
   eingeführt. Der Zustand bleibt **offen**.

Ohne ausdrücklichen Auftrag gilt weiterhin: keine Massenübersetzung,
keine automatischen neuen Läufe, keine flächige Veröffentlichung,
keine HU-Arbeiten.


## Bewusst offen (kein Freeze-Blocker)

- **Render-Register, Etappe 4C (2026-09-15):** Teilbaum-Aktualisierungen von
  Inline-CTA/FAQ benachrichtigen die Seitenend-Renderer nach dem Commit; 19
  echte Integrationstests prüfen Einzel- und gemeinsamen Renderer ohne
  künstlichen Parent-Render. Nicht abschließend nachgewiesen ist die
  Bereinigung eines vor dem Commit verworfenen Render-Versuchs. Details:
  `etappe-4b-seitenendbloecke-2026-09-15.md`.

- **Login / Auth / Rollenmodell** — out of scope, eigenständiges Folgeprojekt.
- **3 hartcodierte Marketing-Pages** (Klasse A) — separater Folge-Track.
- **Admin-UX-Kosmetik** — kleine Glitches (z. B. Race beim Karten-Verschieben vor Whitelist-Load), optionaler Folge-Track.
- **Inhalts-Audit nach Marketing-Update** — redaktioneller Folge-Track.
- **Optional Admin-Schalter-Welle 2** — nur falls fachlich nötig.

## Historie der Coverage- und Spiegel-Abnahme

| Stand | Coverage | Spiegel-rot | Public-Blocks gelb_medium |
|---|---:|---:|---:|
| vor Batch 7c | 73 | — | — |
| nach Batch 10 | 3 | 43 | — |
| nach Batch 13 | 3 | 0 | 32 |
| nach Batch 18 | 3 | 0 | 0 |
| **nach Batch 24** | **0** | **0** | **0** |
