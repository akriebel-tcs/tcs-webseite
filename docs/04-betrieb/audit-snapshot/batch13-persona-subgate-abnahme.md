# Batch 13 — Persona-Sub-Gate `persona-eine-wahrheit` nachgezogen

Stand: 2026-06-04

## Vorprüfung — echter Verstoß oder Audit-Phantom?

**Audit-Phantom.** Read-only Prüfung der relevanten Dateien:

- `scripts/cms/persona-eine-wahrheit.mjs`: forderte zwingend ein direktes `sectionKey="standard_cta"` bzw. `sectionKey="faq"` im Quelltext jeder Persona-Content-Datei.
- `src/features/personas/shared/PersonaBodyRenderer.tsx`: iteriert `cms.sections` nach `sort_order` über `renderPageSectionByType`. `DEFAULT_SKIP_KEYS = ["hero", "stats", "solutions"]` — `standard_cta` und `faq` werden **nicht** geskippt. `standard_cta` wird zusätzlich als `cta_v1` normalisiert und mit `allowSkippedTypes: true` gerendert.
- Alle 6 Persona-Content-Dateien (`BauherrenContent`, `ArchitektenContent`, `FachhandelContent`, `FachplanerContent`, `HandwerkContent`, `WohnungswirtschaftContent`) nutzen `<PersonaBodyRenderer pageKey={PAGE_KEY} cms={cms} locale={loc} />` als alleinigen Body-Renderer.
- Keine lokalen CTA-/FAQ-/Karten-Fallbacks gefunden. Kein `solutionLinkByKey`, kein `solutionKeys.map`, keine lokalen Icon-Maps oder i18n-Karten-Loops.

Konsequenz: Funktional wird `standard_cta` und `faq` für alle 6 Personas zentral aus der DB gerendert. Die 12 Sub-Gate-Befunde (6× missing-standard-cta + 6× missing-standard-faq) waren reine Pattern-Erkennung.

## Was am Sub-Gate geändert wurde

`scripts/cms/persona-eine-wahrheit.mjs`:

- Vor der Persona-Schleife wird einmalig `PersonaBodyRenderer.tsx` gelesen und geprüft:
  - Nutzt er `renderPageSectionByType(...)`?
  - Steht `standard_cta` bzw. `faq` in `DEFAULT_SKIP_KEYS`?
- Daraus ergeben sich zwei Flags: `bodyRendererRendersCta`, `bodyRendererRendersFaq`.
- Die Checks `missing-standard-cta` und `missing-standard-faq` akzeptieren jetzt **zwei** gültige Varianten:
  1. direktes `sectionKey="standard_cta"` bzw. `sectionKey="faq"` (Altpfad), **oder**
  2. `<PersonaBodyRenderer ...>` in der Persona-Datei **und** das passende Flag aus der Vorprüfung ist `true`.
- Keine pauschale Ausnahme. Wenn `PersonaBodyRenderer` jemals den zentralen Renderer verliert oder `standard_cta`/`faq` skippen würde, schlägt das Gate sofort wieder zu.
- Alle bestehenden Verbote (lokale CTA-/FAQ-Blöcke via `tx('cta'|'faq', …)`, `data-cms-section="cta|faq"`, `solutionLinkByKey`, `solutionKeys.map`, lokale Karten-Loops, Legacy-`WoWiDetailSections`-Import, hartcodierte Item-Listen, lokale Icon-Maps) bleiben unverändert aktiv.

Keine Inhaltsänderung, keine DB-Migration, keine Layout- oder Renderer-Refactors, kein Persona-Content-Touch.

## Ergebnis `persona-eine-wahrheit`

```
✓ persona-eine-wahrheit: 6/6 Personas grün – keine lokalen Karten-/CTA-/FAQ-Renderer.
```

Vorher: 12 Verstöße. Nachher: 0.

## Spiegel-Audit vorher / nachher

| Stand | Restschuld rot | Sub-Gate `persona-eine-wahrheit` |
|---|---:|---|
| nach Batch 12 | 1 | rot (Pattern-Phantom) |
| **nach Batch 13** | **0** | **grün** |

```
globaler-spiegel-audit — 0 Befund(e).
```

## Coverage-Ergebnis

`page-renderer-coverage` unverändert bei **3** Befunden (`AKTIVE_DB_SECTION_OHNE_PUBLIC_RENDERPFAD`):

- `serviceportal.login` → `content`
- `serviceportal.registrieren` → `content`
- `serviceportal.passwort-vergessen` → `content`

Bewusst geparkt, weil Login out of scope ist.

## Wahrheitscheck-Ergebnis

```
✅ Wahrheits-Check CI OK — Harvester reproduzierbar, keine Drift,
Body-Map vollständig, Launch-Gate erfüllt (FAQ/CTA orphan/mixed/dedup-only = 0).
```

FAQ: orphan/mixed/dedup-only = 0/0/0. CTA: orphan/mixed/dedup-only = 0/0/0. Body: ok=114, unknown=0.

## Public-Blocks-Ergebnis

`public-blocks-ignorieren-admin-visibility`: rot=**0**, gelb_medium=32, gelb_restschuld=33, grau=2 — unverändert gegenüber Batch 12. Keine neue Restschuld, kein Anstieg.

## Hartcode-Inventar

Unverändert:

```
cms_gesteuert: 60
db_first_mit_i18n_fallback: 62
hartcodierter_inhalt: 3
hartcodiertes_layout_erlaubt: 5
admin_schalter_ohne_public_wirkung: 30
public_ohne_admin_pflege: 0
db_aktiv_aber_public_ignoriert: 3
navigation_getrennte_wahrheit: 0
copy_move_risiko: 3
```

## Status-Doku

`docs/04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md` aktualisiert:

- Spiegel-rot von 1 → **0** in Zähler-Tabelle und Historie eingetragen.
- Sub-Gate-Zeile auf „grün" gesetzt, Verweis auf WoWi-Fallback als Ursache entfernt.
- Restschuld-Abschnitt klargestellt: „0 Spiegel-Befunde nach Batch 13" + Verweis, wann die Heuristik wieder anschlägt.
- Coverage-3-Block (Serviceportal/Login) ausdrücklich als „bewusst geparkt, wartet auf Auth-Projekt" markiert.
- Keine Schönfärbung: Public-Blocks-Gelb (32+33), 2 Klasse-A Marketing-Pages und 30er-Gruppe „Admin-Schalter ohne Public-Wirkung" weiterhin als separate, nicht launch-kritische Tracks ausgewiesen.

## Was bleibt übrig

- **Coverage 3 — Serviceportal/Login**: `serviceportal.login`, `serviceportal.registrieren`, `serviceportal.passwort-vergessen`. Bewusst geparkt. Wird erst angefasst, wenn Login/Auth on top kommt.
- **Klasse-A Marketing-Pages**: 2 Pages mit Hartcode-Anteil (`hartcodierter_inhalt: 3`, davon 2 Marketing-relevant). Separater Track, nicht launch-kritisch.
- **Admin-Schalter ohne Public-Wirkung**: 30 Pages mit aktiven Admin-Schaltern, die im Public derzeit keine sichtbare Reaktion auslösen. Separater Track.
- **Public-Blocks gelb**: 32 medium + 33 restschuld. Keine Spiegel-Verletzungen, eigener Aufräum-Track.

## Empfehlung für den nächsten Batch (nicht starten)

**Batch 14 — Admin-Schalter-ohne-Wirkung reduzieren (Welle 1).**

Begründung:

- Mit Spiegel = 0 und Coverage-Rest nur noch Login ist die Hauptbaustelle „Eine Wahrheit" formal geschlossen.
- Die 30er-Gruppe `admin_schalter_ohne_public_wirkung` ist jetzt die größte verbleibende Diskrepanz zwischen Admin-Versprechen und Public-Realität — direkt redaktionsrelevant.
- Vorgehen: aus `hartcode-steuerbarkeit-inventar.json` die Top-10 mit der höchsten Schalter-Dichte ziehen, je Page entscheiden:
  - Schalter im Public anbinden (Renderer respektiert `is_active`), **oder**
  - Schalter aus dem Admin entfernen (wenn er fachlich nichts mehr steuert), **oder**
  - im UI klar als „nur intern" markieren (mit Begründung in der Whitelist).
- Vor Batch-Start kurz prüfen, ob die Heuristik des Inventars sauber misst (z. B. ob ein toter `is_active`-Schalter auf einer ausgeblendeten Section korrekt unterschieden wird von einem echten Public-blinden Schalter), sonst zuerst die Heuristik schärfen.

Alternative, falls Login-Track gestartet wird: Coverage-3 in einem Rutsch mit dem Auth-Schritt erledigen.

**Stopp.**
