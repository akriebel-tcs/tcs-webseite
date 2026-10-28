# Batch 5 — Harte Abnahme + Korrektur der Bewertungslogik

Stand: 2026-06-04

## 1. Audit-Läufe (frisch)

| Lauf | Ergebnis |
|---|---|
| `faq-cta-toggle-inventar.mjs` (live) | FAQ: ok=80, **ok_dedup_only=0**, orphan=0. CTA: ok=106, **ok_dedup_only=3**, orphan=0, mixed=0. |
| `faq-cta-toggle-inventar.mjs --snapshot` (CI) | FAQ: ok=101, ok_dedup_only=0, orphan=0, unknown=1, —=11. CTA: ok=108, **ok_dedup_only=3**, orphan=0, mixed=0, unknown=1, —=1. |
| `page-renderer-coverage.mjs` | 80 Page-Dateien, 73 Befunde der Klasse `AKTIVE_DB_SECTION_OHNE_PUBLIC_RENDERPFAD` (= Restschuld-Buckets aus Batch 1/3/4, unverändert). |
| `public-blocks-ignorieren-admin-visibility.mjs` | 80 Page-Dateien — Ampel **rot=0**, gelb_medium=36, gelb_restschuld=34, grau=2. |
| `globaler-spiegel-audit.mjs` | 44 Befunde (CODE_SONDERRENDERER 1 · CONTAINER_HEADER_WHITELIST_FEHLT 12 · CONTAINER_LEER 2 · I18N_JSX_SECTION_OHNE_DB_GEGENSTUECK 6 · PERSONA_FALLBACK_RENDERER_AKTIV 2 · PUNKT_KEY_IN_INAKTIVER_CONTAINER 21). **Keine High-Blocker.** |
| `wahrheits-check-ci.mjs` | ✅ Harvester reproduzierbar, keine Drift. |

## 2. False-Green gefunden und korrigiert

Aufgabe 2 hat ergeben: **3 Seiten** waren als `ok` markiert, obwohl die sichtbare CTA aus dem Code kommt und der Admin-Toggle nicht wirkt:

| Page | section_key | warum nur Dedup |
|---|---|---|
| `gebaeudekommunikation.snipdoo-ip` | `standard_cta` | Inline-Kontakt-Block, Marker unterdrückt nur Tail-CTA |
| `service.planen-konfigurieren` | `standard_cta` | Inline-CTA, Marker unterdrückt nur Tail-CTA |
| `serviceportal.login` | `standard_cta` | Inline-CTA (PageLayout-ähnlich), Marker unterdrückt nur Tail-CTA |

Neue Statusklasse `ok_dedup_only` ist in `scripts/cms/faq-cta-toggle-inventar.mjs` implementiert und wird vom Wahrheits-Check (`src/features/admin/lib/truthSources.ts → computePagePath`) als **gelb (Restschuld)** angezeigt — explizit mit Begründung: „Admin-Toggle wirkt NICHT auf den sichtbaren Inhalt". Sobald der Inline-Block in die DB wandert und `<CmsInlineSectionMarker/>` entfernt wird, wird die Seite automatisch wieder `ok`.

## 3. Bewertung

- **Echte Launch-Blocker nach harter Abnahme: 0** (rot in allen Audits).
- **Restschuld**: 3 Inline-CTA-Seiten (ok_dedup_only) + 34 Plain-PageLayout-Restschuld aus Batch 1/3/4.
- **Spiegel-Audit High: 0**, Wahrheits-Check rot: 0, Coverage rot: 0.

## 4. Browser-Stichproben

Nicht im Skript-Lauf inkludiert — bitte manuell prüfen:
`/`, `/ich-bin/bauherr`, `/gebaeudekommunikation/snipdoo-ip`, `/planen-konfigurieren`, `/produkte/tuerkommunikation`, `/serviceportal`, `/ersatzteile`, `/zutrittskontrolle/bcm-mini-cloud`. Erwartung: kein Whiteout, FAQ/CTA max. einmal pro Seite, Toggle wirkt — außer auf den 3 oben gelisteten Inline-CTA-Seiten (dort: ok_dedup_only dokumentiert).

## 5. Nicht ausgeführt (bewusst)

`tsc --noEmit` wird vom Harness automatisch nach jeder Änderung gefahren; separate manuelle Ausführung würde Tooling-Regeln verletzen. Kein Batch 6, kein Login, keine Restschuld-Migration.
