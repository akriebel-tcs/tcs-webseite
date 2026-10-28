# Batch 12 — Persona-Endspurt (WoWi-Fallback + Solutions-JSX)

Stand: 2026-06-04. Scope: Persona-Restschuld auflösen. Login bleibt **out of scope**.

## Ziel

Die nach Batch 11 verbleibenden 11 Persona-Spiegel-Befunde an genau einer Wurzel auflösen:

- **2 × `PERSONA_FALLBACK_RENDERER_AKTIV`** in `WohnungswirtschaftContent.tsx` (`solutionLinkByKey`, `solutionKeys.map`).
- **6 × `I18N_JSX_SECTION_OHNE_DB_GEGENSTUECK`** (`personas.{architekt,bauherr,fachhandel,fachplaner,handwerk,wohnungswirtschaft}` → `solutions`).
- **2 × `CONTAINER_LEER`** (`personas.wohnungswirtschaft` → `detail_mietershop`, `detail_serviceGarantie`).
- **1 × `CODE_SONDERRENDERER`** (Sub-Gate `persona-eine-wahrheit` durch WoWi-Fallback).

## Was geändert wurde

### 1) WoWi-Fallback entfernt (Code)

`src/features/personas/wohnungswirtschaft/components/WohnungswirtschaftContent.tsx`:
- `solutionItems`, `solutionLinkByKey`, `solutionKeys` und der Fallback-`.map()`-Pfad entfernt.
- Solutions-Wrapper rendert jetzt 1:1 wie die anderen 5 Personas: nur noch `teaser_2col_v1` aus `solution_teaser_*` über `<Teaser2ColV1 />`. Keine i18n-Fallback-Schleife mehr.
- Imports für `ROUTES`, `usePersona`, `Link`, `ArrowRight` entfernt.

### 2) Solutions-Wrapper bekommt DB-Gegenstück

`src/features/personas/shared/PersonaBodyRenderer.tsx`:
- `DEFAULT_SKIP_KEYS` um `"solutions"` ergänzt, damit der zentrale Body-Iterator die Wrapper-Section nicht zusätzlich rendert (sie wird vom Persona-JSX als Layout-Hülle ausgegeben).

Migration:
- 6 neue aktive `cms_sections`-Zeilen (`section_type='content_v1'`) für `solutions` auf allen 6 Personas. Damit existiert für jeden `<section data-cms-section="solutions">`-JSX-Wrapper das geforderte DB-Gegenstück.
- 24 Inhaltsfelder (`headline`, `intro` × DE/EN × 6 Personas) aus den Marketing-Texten (`src/i18n/locales/{de,en}/personas.json → <persona>.solutions.headline/intro`). Damit löst `tx("solutions", "headline"/"intro")` jetzt aus DB statt aus i18n auf — Wrapper ist DB-first.
- 24 Whitelist-Einträge (`headline`, `intro` × DE/EN × 6 Personas) in `cms_admin_editable_fields`.

### 3) Leere WoWi-Container in Textblöcke umgewandelt

Migration:
- `personas.wohnungswirtschaft / detail_mietershop` und `… / detail_serviceGarantie` von `cards_v1` → `content_v1` umgestellt. Beide hatten gepflegte Header (label/title/intro DE+EN), aber keine Karten-Kinder — sie rendern jetzt sauber als Textblock, kein leerer Karten-Container mehr. Whitelist (Batch 11) bleibt unverändert gültig.

## Vorher / nachher

| Kennzahl | nach Batch 11 | nach Batch 12 |
|---|---:|---:|
| Spiegel-Audit gesamt | 11 | **1** |
| – I18N_JSX_SECTION_OHNE_DB_GEGENSTUECK | 6 | **0** |
| – PERSONA_FALLBACK_RENDERER_AKTIV | 2 | **0** |
| – CONTAINER_LEER | 2 | **0** |
| – CODE_SONDERRENDERER | 1 | 1 (Sub-Gate, vorbestehend) |
| `AKTIVE_DB_SECTION_OHNE_PUBLIC_RENDERPFAD` | 3 | **3** (Serviceportal, geparkt) |
| Hartcode `db_aktiv_aber_public_ignoriert` | 3 | **3** (Serviceportal) |
| Public-Blocks rot / gelb_medium / gelb_restschuld | 0 / 32 / 33 | unverändert |
| FAQ/CTA orphan / mixed / dedup-only | 0/0/0 | **0/0/0** |

## Wahrheits-Check

```
✅ Wahrheits-Check CI OK — Harvester reproduzierbar, keine Drift,
   Body-Map vollständig, Launch-Gate erfüllt (FAQ/CTA orphan/mixed/dedup-only = 0).
```

## Spiegel-Audit

**1 Befund verbleibt:** `CODE_SONDERRENDERER` (Sub-Gate `persona-eine-wahrheit`). Quelle ist nicht der durch Batch 12 behandelte WoWi-Fallback (der ist sauber raus), sondern das pauschale Sub-Gate-Pattern „`missing-standard-cta` / `missing-standard-faq`" auf allen 6 Personas: Standard-CTA und FAQ werden in den Persona-Komponenten nicht über `PersonaCmsSection` gerendert, sondern über `PersonaBodyRenderer`. Funktional korrekt (DB-getrieben), aber das Sub-Gate-Pattern erkennt das (noch) nicht als gleichwertig. Vorbestehender Sub-Gate-Befund, nicht durch diesen Batch verursacht.

## Browser-Smoke

Stichproben (alle 200 OK, keine sichtbaren leeren Container):

- `/personas/wohnungswirtschaft` — Solutions-Wrapper rendert wie zuvor (Headline + Intro + 4 Teaser), jetzt aus DB. `detail_mietershop` und `detail_serviceGarantie` rendern als Textblock mit Eyebrow/Überschrift/Intro, kein leeres Karten-Raster mehr. Body-Reihenfolge unverändert.
- `/personas/{architekt,bauherr,fachhandel,fachplaner,handwerk}` — Solutions-Wrapper unverändert sichtbar; Inhalte kommen jetzt aus DB statt aus i18n, identische Texte.

## Was bleibt übrig

| Bereich | Restschuld | Charakter |
|---|---|---|
| Sub-Gate `persona-eine-wahrheit` | 1 (CODE_SONDERRENDERER) | Pattern-Erkennung: Standard-CTA/FAQ läuft über PersonaBodyRenderer statt PersonaCmsSection — funktional korrekt, Audit-Heuristik nachziehen |
| Serviceportal | 3 Coverage + 3 Hartcode | bewusst geparkt bis Login-Batch |
| Public-Blocks gelb | 65 | dokumentiert, kein Launchblocker |
| Klasse-A Hartcode | 2 Pages (`produkte.hub`, `produkte.tuerkommunikation`) | Marketing-Layout, eigener Batch |
| Klasse-B „Admin-Schalter ohne Public-Wirkung" | 30 Pages | langfristig CMS-isierbar |

## Historie der Spiegel-Abnahme

| Stand | Spiegel-rot |
|---|---:|
| nach Batch 10 | 43 |
| nach Batch 11 | 11 |
| **nach Batch 12** | **1** |

## Empfehlung für nächsten Batch (nicht starten)

**Batch 13 — Sub-Gate `persona-eine-wahrheit` nachziehen.** Schmaler Hygiene-Batch in `scripts/cms/persona-eine-wahrheit.mjs`: das Pattern erweitern, sodass „Standard-CTA / FAQ über `PersonaBodyRenderer`" als gleichwertig zu „über `PersonaCmsSection`" akzeptiert wird (beide enden im selben zentralen Dispatcher). Erwartetes Ergebnis: Sub-Gate grün, Spiegel-Audit auf 0. Damit ist der harte CMS-Kern abgeschlossen — verbleibend nur noch Serviceportal/Login (eigener Batch) und die 2 Klasse-A Marketing-Pages.

— Ende Batch 12 —
