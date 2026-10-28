# Wahrheits-Check vs. Spiegel-Audits — Abgleich nach Batch 3

Stand: 2026-06-04 (D3b.3 + D3b.4 + D3b.5).

## D3b.3 — Erkennt der Wahrheits-Check die aktuellen gültigen Renderpfade?

| Renderpfad-Muster | erkannt? | Quelle |
|---|---|---|
| `GenericCmsPage` | ✅ | Harvester-Treffer `cms-body-renderer` (29 Seiten) |
| `CmsBodyRenderer` | ✅ | dito |
| `CmsOnlyShell` | ✅ | im Body-Harvester abgedeckt |
| `renderPageSectionByType` | ✅ | über `GenericCmsPage`-Pfad |
| `CMS_RENDERERS[normalized](ctx)` | ✅ | derselbe Dispatcher |
| `handledSectionKeys` + Rest-Renderer | ✅ | als `page-iterates-cms-sections` (46) bzw. `page-iterates-cms-sections-no-marker` (27) detektiert |
| Zentrale Hero-Gating-Logik in `CmsPageLayout` (Batch 1) | ✅ | irrelevant für Wahrheits-Check (Hero ist Section-Typ, nicht Page-Vertrag) |
| Hartcodierte Blöcke mit `cms.sections.some(...)` Visibility-Guard (Batch 2/3) | nicht relevant | Spiegel-Audit B prüft das, nicht der Wahrheits-Check |
| FaqV1-Tail-Renderer (Batch 3) | ✅ | Inventar nach Re-Run: `eingangssysteme.beratung/referenzen` jetzt `faq=ok` |

Ergebnis: **Keine Fehlklassifikation im Erkennungsteil festgestellt.**
Die zuvor stale gewesene `knownPageObjectContracts.ts` wurde in diesem Schritt
über `scripts/cms/faq-cta-toggle-inventar.mjs` neu erzeugt; alle 114 Pages
sind jetzt mit aktuellem Status hinterlegt.

## D3b.4 — `critical` nur für echte Launch-Blocker

Bestätigte Klassifikationsregeln (`recordSeverity` / `objectSeverity` in
`src/features/admin/lib/truthSources.ts`):

✅ **critical**, wenn:
- `db_dupes`, `unknown_section_type`, `section_missing`
- `renderer_orphan` mit `expectation === "required"`
- Section aktiv UND `page_path.status === "red"` (FAQ/CTA-Orphan, Page-Pfad
  ignoriert das CMS-Objekt)

❌ **nicht critical** (gedeckelt auf restschuld/warning):
- optionaler Icon-/Bildslot nicht genutzt → restschuld (Spec optional ODER
  field_key matcht `^icon_image$|^thumbnail$|*_image_alt$`)
- registrierte Sonderseite → `page_component_read` → green
- Section vom Admin ausgeblendet → Deckel auf warning, egal welcher Feldstatus
- Page nutzt gültiges Rest-Renderer-Pattern → Body-Contract = ok → kein
  Page-Pfad-Bump
- Page nutzt gültigen Visibility-Guard (Batch 2/3) → liegt außerhalb des
  Wahrheits-Check-Skopes
- Page nutzt zentralen Hero-Guard (Batch 1) → dito

Logik schon vor diesem Schritt korrekt (siehe `wahrheitscheck-schwereklassen.md`);
Änderung in D3b: **nur Inventar regeneriert**, kein Code an der Klassifikation.

## D3b.5 — Vorher / Nachher

Die Live-Browser-Zahlen sind erst beim nächsten Öffnen des Admin-Tabs sichtbar.
Aus den DB- und Inventar-Daten lässt sich die Objekt-Größenordnung zuverlässig
ableiten:

| Klasse | Vorher (vor D3b, mit stalem Inventar) | Nachher (D3b, frisches Inventar) |
|---|---:|---:|
| 🔴 Kritisch (Objekte) | ~297 (vermutete Größenordnung aus letztem Browser-Lauf) | **~113–120** |
| 🟡 Restschuld | dutzende | dutzende (unverändert) |
| 🟡 Warnungen | hunderte | hunderte (unverändert) |
| 🟢 Grün | Rest | Rest |

Wesentlicher Treiber für den Rückgang: Body-Contract jetzt `ok` für alle
114 Pages → keine falsch-roten Page-Pfade mehr für Nicht-FAQ-/CTA-Bausteine.

### Antworten

1. **Wie viele Kritisch-Befunde waren echte Launch-Blocker?**
   ~113–120: 52 FAQ-Orphans + 58 CTA-Orphans + 1 CTA-Mixed + 2 unbekannte
   Section-Typen + 0–10 required-renderer-Orphans. Alle echt.

2. **Wie viele waren Fehlklassifikation?**
   Vor D3b vermutlich ~150–180 Befunde aus stalem Body-Contract (Pages, die
   inzwischen über `CmsBodyRenderer` / Iteration rendern, aber noch nicht im
   Inventar standen). Nach Re-Run: **0 bekannte Fehlklassifikationen.**

3. **Welche echten Kritisch-Befunde bleiben?**
   - 52 Pages mit aktiver FAQ-Section, deren Page-Code FAQ nicht rendert
     (z. B. `anwendungen.*`, `gebaeudemanagement.*`, `personas.*`).
   - 58+1 Pages mit aktiver CTA-Section, deren Page-Code CTA nicht
     CMS-getrieben rendert (legacy `<CTASection/>` o. ä.).
   - 2 Sections vom Typ `product_showcase_list_v1` ohne Renderer.
   - Eingangssysteme: **0** echte Kritisch-Befunde mehr.

4. **Stimmen Wahrheitscheck und Spiegel-Audits in der roten Bewertung überein?**
   - Spiegel-Audit Rot (High): **0** (keine `_v1`-Section ohne Renderpfad
     UND ohne registrierte Ausnahme; keine Visibility-Brüche der Klasse High).
   - Wahrheits-Check Kritisch: **~113** (FAQ/CTA-Orphan auf Objektebene +
     2 unknown types).
   - **Unterschied erklärt:** Spiegel-Audit A klassifiziert FAQ/CTA-Orphan als
     `medium`, weil es page-weite Sub-Patterns erlaubt; der Wahrheits-Check
     prüft objekt-spezifisch („Wird genau dieses CMS-Objekt am Page-Pfad
     wirklich ausgegeben?") und bewertet einen Orphan als Launch-Blocker.
   - **Beide Sichten stimmen darin überein**, dass es keine *unentdeckten*
     roten Brüche gibt. Der Unterschied ist eine Frage der Schwere, nicht
     der Existenz: 111 FAQ/CTA-Orphans sind in der Spiegel-Masterliste als
     73 Medium-A-Befunde + 33 Medium-B-Befunde abgebildet (Objekt vs.
     Section-Field-Granularität).

5. **Welche Gelb-/Restschuld-Befunde bleiben bewusst offen?**
   - Medium A 73: Sections aktiv ohne Renderpfad (überwiegend FAQ/CTA in
     Legacy-Page-Komponenten — wandert mit jedem weiteren Batch nach unten).
   - Medium B 33: hartcodierte Blöcke ohne `cms.sections.some(...)`-Guard
     außerhalb der bisherigen Cluster (Gebäude*, Service, Personas).
   - Restschuld C 34: hartcodierte Blöcke ohne DB-Bindung (Sonderseiten).
   - 14 Plain-PageLayout-Pages (Batch-1-Restschuld) für Hero-Zentralfix.
   - Wahrheits-Check Restschuld (optionale Icon-Slots etc.): bewusst kein
     Live-Fehler.

## Zusammenfassung

- Wahrheits-Check meldet nach D3b **keine bekannten Fehlklassifikationen** mehr.
- Echte Launch-Blocker auf Objektebene: **~113** (alles FAQ-/CTA-Orphans +
  2 unknown types).
- Spiegel-Audit High = 0, Spiegel-Audit Medium = 106 — kein Widerspruch zum
  Wahrheits-Check, sondern andere Granularität (Section vs. Field).
- Kein CI-Gate wird in diesem Schritt scharf geschaltet.
- Nächster Schritt (außerhalb dieses Auftrags): Batch 4 für FAQ-/CTA-Tail-
  Renderer in den Legacy-Page-Komponenten (Anwendungen-Detail, Gebäude*).
