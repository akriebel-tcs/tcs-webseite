# Wahrheits-Check — Schwereklassen

Stand: 2026-06-04

## Was wurde geändert

Der Wahrheits-Check (`/admin` → Tab „Wahrheits-Check") unterscheidet ab sofort vier Schwereklassen statt nur rot/gelb/grün. Nur die Klasse **Kritisch** macht die Abnahme-Ampel rot.

Keine Änderung an der Website, an Routen, an Inhalten oder an den vier Quellen (DB · Whitelist · Renderer · Code). Nur die Bewertung wurde verfeinert.

## Geänderte Dateien

- `src/features/admin/lib/truthSources.ts`
  - neuer Typ `TruthSeverity = "critical" | "restschuld" | "warning" | "green"`
  - `TRUTH_SEVERITY_META` mit Label + Erklärung pro Klasse
  - `recordSeverity(rec)` klassifiziert jeden Feld-Record
  - `objectSeverity(agg)` rollt auf Objektebene auf (worst-of, mit Sonderregeln)
  - `TruthObjectAggregate.severity` ergänzt
  - `TruthReport.objectTotals.bySeverity` ergänzt
- `src/features/admin/components/SlotValidationView.tsx`
  - Kopfzeile zeigt 4 Zahlen (Kritisch · Restschuld · Warnungen · Grün) statt 3
  - neuer Filter „Schwere" mit Buttons „Alles · Kritisch · Restschuld · Warnungen · Grün"
  - Default-Auswahl: Kritisch + Restschuld eingeblendet (Warnungen + Grün zuschaltbar)
  - Erklärtext im „Was prüfen wir?"-Block beschreibt die vier Klassen

## Klassifikationsregeln

### 1. Kritisch / Launch-Blocker (rot)

Aus den vorhandenen `TruthStatus`-Werten:
- `db_dupes` — mehrere aktive DB-Bilder im selben Slot → Public-Ausgabe nicht eindeutig
- `unknown_section_type` — aktiver Standardbaustein, für den kein Renderer existiert
- `section_missing` — DB-Asset ohne zugehörige Section (verwaist)
- `renderer_orphan` — nur dann kritisch, wenn der Renderer-Slot als `required` deklariert ist
- Objektebene: Section ist `is_active=true`, aber `page_path.status === "red"` (Page-Pfad ignoriert oder mischt das CMS-Objekt mit Legacy-Code) → „Admin sagt sichtbar, Public rendert nicht"

### 2. Technische Restschuld (gelb, kein Live-Fehler)

- `renderer_orphan` mit optionalem Renderer-Slot (`expectation === "optional"`) — typisch: `card_v1.icon_image`, `card_v1.thumbnail`, `card_v1.image`, `cta_v1.image`
- `renderer_orphan` ohne Renderer-Spec-Eintrag (Slot nicht im Vertrag) — Renderer liest den Slot bewusst nicht
- field_key-Heuristik: `icon_image`, `thumbnail`, `*_image_alt` zählen immer als optional
- `page_component_read` (Sonderrenderer mit registrierter Ausnahme) bleibt zwar weiterhin grün auf Feldebene, ist aber als „aufzuräumen" dokumentiert

### 3. Warnungen (gelb, Hinweis)

- `missing_whitelist` — DB hat Inhalt, Renderer liest, aber Admin sieht/pflegt nicht
- `editable_empty`, `not_yet_configured` — optionales Feld leer
- `section_inactive` — Section vom Admin ausgeblendet (Public rendert korrekt nichts → kein Blocker)
- `ui_fallback` — Eintrag in `KNOWN_UI_FALLBACKS` (manuell gepflegt; Liste aktuell leer)
- Objektebene: Section ausgeblendet → Schwereklasse wird auf max. „Warnung" gedeckelt, egal welcher Feldstatus
- Objektebene: `page_path.status === "yellow"` (Page-Pfad nicht eindeutig inventarisiert) hebt mindestens auf Warnung

### 4. Grün

- `one_truth` und `page_component_read` ohne weitere Auffälligkeiten

## Besonders zu `_icon_image` / „Renderer ignoriert Feld"

Genau diese Klasse war bisher als roter Befund eingerechnet. Neu:
- `card_v1.icon_image` ist im Renderer-Vertrag (`rendererSlotMap.ts`) als `expectation: "optional"` deklariert.
- Wenn dort Inhalt liegt und der Renderer ihn nicht liest, ist das **Restschuld**, nicht kritisch — es bricht den Public-Output nicht.
- Klassifikation greift sowohl über die Spec (`renderer_spec.expectation === "optional"`) als auch über die field_key-Heuristik (Namen, die offensichtlich optionale Bildslots sind).

Gleiches Prinzip für `card_v1.thumbnail`, `card_v1.image`, `cta_v1.image`.

## Filter-Verhalten

Filter-Reihe „Schwere" im Wahrheits-Check:

- **Alles** — setzt alle vier Klassen aktiv
- **Kritisch** — nur Launch-Blocker
- **Restschuld** — nur technische Schuld
- **Warnungen** — nur Hinweise
- **Grün** — nur fertige Objekte

Die Buttons sind einzeln toggelbar (Mehrfachauswahl). Default-Ansicht beim Öffnen: Kritisch + Restschuld (das, was Aufmerksamkeit verdient). Warnungen und Grün sind jederzeit per Klick zuschaltbar.

## Neuklassifikation der bisherigen 297 roten Befunde

Die konkreten Zahlen ergeben sich erst beim nächsten Aufruf des Tabs (Live-Berechnung aus `cms_assets`, `cms_section_fields`, `cms_sections`, `cms_admin_editable_fields`). Erwartete Verschiebung pro bisheriger Statusklasse:

| bisheriger TruthStatus | Beispiel | neue Schwereklasse |
|---|---|---|
| `db_dupes` | zwei aktive Hero-Bilder im selben Viewport | **Kritisch** |
| `unknown_section_type` | `section_type="snipdoo"` ohne Renderer | **Kritisch** |
| `section_missing` | DB-Bild zu gelöschter Section | **Kritisch** |
| `renderer_orphan` (required) | `hero_v1.image` fehlt im Renderer | **Kritisch** |
| `renderer_orphan` (optional) | `card_v1.icon_image` nicht gelesen | **Restschuld** |
| `renderer_orphan` (kein Spec) | Feld nicht im Vertrag | **Restschuld** |
| `ui_fallback` | KNOWN_UI_FALLBACKS-Eintrag (Liste leer) | **Warnung** |
| `missing_whitelist` | Inhalt da, Whitelist fehlt | **Warnung** |
| `section_inactive` | Section vom Admin ausgeblendet | **Warnung** |
| `editable_empty`, `not_yet_configured` | optional leer | **Warnung** |
| `one_truth`, `page_component_read` | alles passt | **Grün** |

Auf Objektebene gilt zusätzlich:
- Aktive Section + Page-Pfad rot → **Kritisch** (übersteuert die Record-Worst-Of-Regel)
- Ausgeblendete Section → Deckel auf **Warnung** (Public rendert korrekt nichts)

Damit verschwindet der bisherige Effekt, dass jeder nicht gelesene optionale Icon-Slot rot leuchtet und die Abnahme blockiert. Die Abnahme-Ampel ist nur noch rot, wenn echte Public-Brüche bestehen.

## Nicht geändert

- Keine Daten in `cms_*` angefasst
- Keine Migrationen
- Keine Renderer/Public-Komponente angefasst
- `TruthObjectStatus` (rot/gelb/grün) bleibt für Rückwärtskompatibilität erhalten (andere Stellen lesen `byStatus` weiter)
- Navigationsbereich-Fortschrittsbalken nutzt weiterhin die alte ok/warn/error-Achse — kann später separat auf Schwereklassen umgestellt werden

## Status

- Implementation steht, Build grün.
- Live-Zahlen pro Klasse: erscheinen beim nächsten Öffnen des Tabs.
- Folgeoptional: CI-Gate (z. B. `wahrheits-check-ci.mjs`) so umstellen, dass nur Schwereklasse „Kritisch" den Exit-Code 1 erzeugt.
