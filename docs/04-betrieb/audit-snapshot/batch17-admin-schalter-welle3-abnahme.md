# Batch 17 — Admin-Schalter Welle 3 (Abnahme)

Stand: 2026-06-04, nach Batch 16 (Welle 2).

## Ziel

Welle 3 räumt die einfacheren Multi-Section-Pages aus der 8er-Liste
`admin_schalter_ohne_public_wirkung` ab. Vier Pages, sieben Gates, gleiches
Muster wie Batch 14 / 16 — kein Inhalt, kein Layout, keine DB-Migration.

## Welle 3 — gepatchte Pages (4, 7 Gates)

| Page | Datei | Gates |
|---|---|---|
| zutrittskontrolle.fahrstuhlsteuerung | `src/features/zutrittskontrolle/pages/FahrstuhlsteuerungPage.tsx` | `overviewActive`, `benefitsActive` |
| service.planen-konfigurieren | `src/features/service/pages/PlanenKonfigurierenPage.tsx` | `heroActive` |
| service.hub | `src/features/service/pages/ServicePage.tsx` | `sectionsActive` (gated den ganzen `sectionsMeta.map`) |
| zutrittskontrolle.elektronische-drueckergarnitur | `src/features/zutrittskontrolle/pages/ElektronischeDrueckergarniturPage.tsx` | `heroActive`, `benefitsActive`, `useCasesActive` |

Sonderfall service.hub: hier iteriert der Code über eine hartcodierte
`sectionsMeta`-Liste; der Gate sitzt am Map-Aufruf
(`{sectionsActive && sectionsMeta.map(...)}`), nicht am `<section>`. Damit
respektiert der Public-Block die DB-Sichtbarkeit der Eltern-Section
`sections`.

## Vorher / nachher

| Kennzahl | vor Batch 17 | nach Batch 17 |
|---|---:|---:|
| `admin_schalter_ohne_public_wirkung` (Pages) | 8 | **4** |
| Public-Blocks `gelb_medium_kandidat` (Befunde) | 22 | **15** |
| Public-Blocks `rot_high_blocker` | 0 | 0 |
| Spiegel-Audit (rot) | 0 | **0** |
| Coverage `AKTIVE_DB_SECTION_OHNE_PUBLIC_RENDERPFAD` | 3 | **3** (Serviceportal, geparkt) |
| Wahrheits-Check CI | ✅ grün | **✅ grün** |
| FAQ/CTA orphan / mixed / dedup-only | 0 / 0 / 0 | 0 / 0 / 0 |
| Sub-Gates (Persona, Card-Parität, Sort-Order, persona-eine-wahrheit) | grün × 4 | grün × 4 |

## Was bleibt übrig (4 Pages, Welle 4)

`admin_schalter_ohne_public_wirkung` — alle vier sind redaktionell sensible
Marketing-Pages und sollten in Welle 4 mit Browser-Sichtprüfung einzeln
laufen, nicht en bloc:

- `gebaeudekommunikation.snipdoo-ip` — 10 Sections, komplex
- `gebaeudekommunikation.tuersprechanlagen` — `anwendungsumfelder`, `vorteile`
- `gebaeudekommunikation.systemloesungen` — `vorteile`, `fachplanung`
- `gebaeudekommunikation.root` — `anwendungsumfelder` + 1 Restschuld

Separat bleiben:
- 3 Coverage-Befunde Serviceportal/Login (geparkt, wartet auf Auth)
- 2 Klasse-A Marketing-Pages mit Hartcode-Anteil (ProduktHub, TuerkommunikationHub)
- 33 Public-Blocks `gelb_restschuld_ohne_bindung` (eigener Aufräum-Track)

## Empfehlung für Batch 18

**Welle 4**, redaktionell sensibel — einzeln, mit Browser-Smoke:

1. `gebaeudekommunikation.root` (1 Gate, geringes Risiko, gute Startseite)
2. `gebaeudekommunikation.tuersprechanlagen` (2 Gates)
3. `gebaeudekommunikation.systemloesungen` (2 Gates)
4. `gebaeudekommunikation.snipdoo-ip` (10 Gates — eigene Iteration)

Für Welle 4 vorher kurz im Browser sichten, ob das Anschalten/Ausschalten
der Sections in den jeweiligen Seitenkontexten visuell sauber bleibt
(insbesondere Snipdoo-IP, das viele Layout-Übergänge hat).

Batch 18 **nicht** in diesem Lauf starten.
