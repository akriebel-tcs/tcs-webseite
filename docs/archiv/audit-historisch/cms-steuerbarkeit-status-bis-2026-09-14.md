# ARCHIV — CMS-Steuerbarkeit, Fassung bis 2026-09-14

> **Historie. Nicht mehr maßgeblich.**
>
> - Ursprungspfad: `docs/04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md`
> - Archiviert am: 2026-09-14 (Etappe 1 CMS-Light-Reparatur)
> - Inhaltlicher Stand dieser Fassung: Messung 2026-06-04
> - Nachfolger (aktiv): `docs/04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md (überarbeitet, Ampeln als Historie datiert)`
>
> Die hier genannten Prüfwerte sind **historische Messwerte** und
> **keine aktuellen grünen Gates**. Der Inhalt unterhalb ist
> unverändert erhalten.
>
> Die Nullwerte (Wahrheits-Check, Coverage, Spiegel-Audit) sind die
> Messung vom 2026-06-04, nicht der heutige Zustand.

---

# CMS-Steuerbarkeit – aktueller Stand

Stand: 2026-06-04 nach Batch 24 (CMS-Abschluss-Freeze-Audit). Login bleibt **out of scope**.

> Batch 15 (Kalibrierung): `card_v1` hat drei optionale Bildslots
> (`image`, `thumbnail`, `icon_image`) — alle drei werden von den
> Karten-Renderern als Fallback-Kette gelesen.

## Harte CMS-Kernabnahme

**Status: grün / abgeschlossen.**

Alle launch-kritischen Gates sind grün; der harte Kern des DB-first-CMS
ist eingefroren.

> **Freeze-Lesart (klarifiziert seit Batch 33):** „Eingefroren" bedeutet
> **keine unkontrollierten Umbauwellen**, nicht „keine Arbeit mehr". Jede
> weitere Änderung am CMS-Kern muss beauftragt, spiegel-treu, idempotent,
> dokumentiert und mit Wahrheits-Check + Build verifiziert sein
> (Details: `.lovable/always-follow.md`, Abschnitt CMS-Freeze).

## Aktuelle Ampeln (frisch gemessen)

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

## Polnisch (PL) — technisches Gerüst, NICHT freigegeben (Stand 2026-09-11)

PL ist ausschließlich **technisch** vorbereitet und **nicht redaktionell
nutzbar**:

- Live vorhanden: PL-Spalten (`cms_pages.title_pl`,
  `cms_navigation_nodes.label_pl/description_pl`,
  `cms_assets.alt_pl/alt_text_pl`), Sprach-Checks `de/en/pl`,
  `cms_section_fields.review_status` (`geprueft|maschinell`).
- Inhaltlich leer: **PL-Felder 0 · PL-Whitelist-Zeilen 0 · `maschinell` 0**.
  DE 55.145 / EN 54.501 unverändert.
- Kein PL im Pflege-Editor, kein Freigabe-Knopf, keine Automatik DE→PL.
- Sicherheitskorrektur 2026-09-11: `rpc_admin_save_machine_translation` ist
  atomar (schreibt direkt `maschinell`, kein Zwischenzustand `geprueft`);
  diese Funktion und `rpc_admin_set_field_review_status` sind für
  `PUBLIC`/`anon`/`authenticated` **nicht** ausführbar (nur
  `service_role`/`postgres`). Details: `docs/migration-log.md`.

**Blocker vor jeder PL-Inhaltsarbeit (beide offen):**

1. **Serverseitiger Schutz maschineller Inhalte.** `review_status='maschinell'`
   wird heute nur in drei Client-Lesewegen gefiltert
   (`useCmsPageContent`, `applyCmsOverlay`, `cmsContent`). Direktes `anon`-Lesen
   von `cms_section_fields` und die MCP-Lesewerkzeuge
   (`supabase/functions/mcp/index.ts`, `src/lib/mcp/tools/*`) filtern nicht.
   Solange das gilt, darf kein maschineller Inhalt in die DB.
2. **Auth-/Rollen-Etappe.** Alle `rpc_admin_*`-Schreibwege haben keine
   Caller-Autorisierung (No-Login-Prototyp; 96 Linter-Altwarnungen).
   Erst danach dürfen Review-/Übersetzungs-RPCs wieder ans Frontend.

Bis dahin gilt: keine PL-Massenübersetzung, keine Dreifach-Speicherung,
keine PL-Veröffentlichung.

## Bewusst offen (kein Freeze-Blocker)


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
