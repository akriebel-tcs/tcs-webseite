# Batch 11 — Whitelist-Header + Punkt-Key-Hygiene

Stand: 2026-06-04. Scope: rein mechanische Spiegel-Audit-Hygiene.
Login bleibt **out of scope**. Keine Inhaltsänderung, keine Layout-Änderung, kein neuer Renderer, keine i18n-Migration.

## Ziel

Die 32 mechanisch lösbaren Spiegel-Audit-Befunde abräumen:

- **12 × `CONTAINER_HEADER_WHITELIST_FEHLT`** auf `personas.wohnungswirtschaft` (Container `detail_bestandsmodernisierung`, `detail_zutrittParkraum` × label/title/intro × DE/EN).
- **20 × `PUNKT_KEY_IN_INAKTIVER_CONTAINER`** auf 20 inaktiven Legacy-Containern (alte `faq`/`cta`-Section-Keys, deren aktive Ersatz-Sections — `standard_cta`, frische `faq` — längst existieren).

## Was geändert wurde

### 1) Whitelist-Ergänzung (12 Einträge)

Migration setzt für `personas.wohnungswirtschaft` 12 Whitelist-Zeilen in `cms_admin_editable_fields`:

```
detail_bestandsmodernisierung × {label,title,intro} × {de,en}
detail_zutrittParkraum        × {label,title,intro} × {de,en}
```

Konflikt-frei (`ON CONFLICT … DO UPDATE SET is_enabled = true`).

### 2) Punkt-Key-Cleanup (insg. 802 Felder gelöscht)

```sql
DELETE FROM cms_section_fields f USING cms_sections s
WHERE f.page_key = s.page_key AND f.section_key = s.section_key
  AND s.is_active = false
  AND f.field_key LIKE '%.%' AND f.value IS NOT NULL AND f.value <> ''
```

Erste Runde: 752 Felder in 19 Containern. Nachzug (zweite Migration): 50 Felder im inaktiven Container `anwendungen.root/systemfunktionen` (content_v1). Endstand: 0 verwaiste Punkt-Key-Felder in inaktiven Containern.

Sicherheits-Begründung:
- Alle betroffenen Container hatten `is_active = false`.
- Der Renderer iteriert ausschließlich aktive Sections (siehe `cms.sections` + Spiegel-Regel) — die Felder waren öffentlich nicht erreichbar.
- Auf jeder betroffenen Seite existiert eine **aktive Ersatz-Section** (`standard_cta`, frische `faq_v1`, frische `content_v1`), die in Batch 6–10 angelegt wurde.
- Die Felder waren weder im Admin pflegbar (keine Whitelist auf inaktiven Containern) noch in `cms_section_fields` über das Frontend erreichbar — reine Datenleichen aus dem Vor-Spiegel-Regel-Zeitalter.

### 3) Re-Generierung des Harvester-Vertrags

Nach DB-Änderung neu erzeugt:

```
node scripts/cms/faq-cta-toggle-inventar.mjs --snapshot scripts/sync/snapshot
```

→ `src/features/admin/lib/knownPageObjectContracts.ts` + `docs/04-betrieb/faq-cta-toggle-inventar.md` aktualisiert.

## Was bewusst NICHT geändert wurde

- **Personas `solutions` JSX (6 Befunde, `I18N_JSX_SECTION_OHNE_DB_GEGENSTUECK`)** — eigene Entscheidung Thomas nötig (DB-Section anlegen vs. `KNOWN_JSX_SONDERPFADE` eintragen). Keine mechanische Lösung.
- **Persona Wohnungswirtschaft Fallback-Renderer (2 Befunde)** und **leere `cards_v1`-Container `detail_mietershop`/`detail_serviceGarantie` (2 Befunde)** — bedeutet entweder echte Karten-Inhalte schreiben oder Container deaktivieren. Inhaltsentscheidung, kein Hygiene-Schritt.
- **Sub-Gate `CODE_SONDERRENDERER` (1 Befund)** — fällt automatisch weg, sobald die WoWi-Fallback-Pfade entfernt sind.
- **3 verbleibende Coverage-Befunde** (`serviceportal.*`) — Login-Sonderseiten, geparkt.
- Keine Renderer-, Layout-, i18n- oder Navigations-Änderung.

## Vorher / nachher

| Kennzahl | vor Batch 11 | nach Batch 11 |
|---|---:|---:|
| Spiegel-Audit gesamt | 43 | **11** |
| – CONTAINER_HEADER_WHITELIST_FEHLT | 12 | **0** |
| – PUNKT_KEY_IN_INAKTIVER_CONTAINER | 20 | **0** |
| – I18N_JSX_SECTION_OHNE_DB_GEGENSTUECK | 6 | 6 |
| – CONTAINER_LEER | 2 | 2 |
| – PERSONA_FALLBACK_RENDERER_AKTIV | 2 | 2 |
| – CODE_SONDERRENDERER | 1 | 1 |
| `AKTIVE_DB_SECTION_OHNE_PUBLIC_RENDERPFAD` | 3 | **3** (Serviceportal, geparkt) |
| Hartcode `db_aktiv_aber_public_ignoriert` | 3 | **3** (Serviceportal) |
| Public-Blocks rot / gelb_medium / gelb_restschuld | 0 / 32 / 33 | **0 / 32 / 33** |
| FAQ/CTA orphan/mixed/dedup-only | 0/0/0 | **0/0/0** |

## Wahrheits-Check

```
✅ Wahrheits-Check CI OK — Harvester reproduzierbar, keine Drift,
   Body-Map vollständig, Launch-Gate erfüllt (FAQ/CTA orphan/mixed/dedup-only = 0).
```

## Spiegel-Audit

11 Befunde, alle im Persona-Bereich konzentriert. Drei Klassen, eine Wurzel
(`personas.wohnungswirtschaft` Fallback-Renderer + `solutions`-JSX-Pfad).
Keine Befunde mehr in `anwendungen.*`, `eingangssysteme.*`,
`gebaeudekommunikation.*`, `gebaeudemanagement.*`, `produkte.*`, `service.*`,
`mobile-tk-preview.*` oder `personas.architekt/bauherr/fachhandel/fachplaner/handwerk`
(letztere nur noch über den gemeinsamen `solutions`-JSX-Befund).

## Browser-Smoke

Stichproben (alle 200 OK, kein Layout-Drift, keine sichtbaren leeren Container):

- `/personas/wohnungswirtschaft` — Header-Container `detail_bestandsmodernisierung` und `detail_zutrittParkraum` rendern wie zuvor; Whitelist-Ergänzung ist Admin-seitig (keine Public-Wirkung).
- `/anwendungen/bildungseinrichtungen`, `/anwendungen/root`, `/service/downloads`, `/produkte/tuerkommunikation` — FAQ/CTA wie nach Batch 9/10, keine sichtbare Veränderung.
- `/mobile-tk-preview` — CTA-Block unverändert.

## Was bleibt übrig

| Bereich | Restschuld | Charakter |
|---|---|---|
| Persona-Bereich | 11 Spiegel-Befunde | echte inhalts-/architektur-getriebene Entscheidung |
| Serviceportal | 3 Coverage + 3 Hartcode | bewusst geparkt bis Login-Batch |
| Public-Blocks gelb | 65 (32 medium + 33 Restschuld) | keine launchblockierend, dokumentiert |
| Klasse-A Hartcode | 2 Pages (`produkte.hub`, `produkte.tuerkommunikation`) | Marketing-Layout, eigener Batch |
| Klasse-B „Admin-Schalter ohne Public-Wirkung" | 30 Pages | langfristig CMS-isierbar, kein Launchblocker |

## Empfehlung für nächsten Batch (nicht starten)

**Batch 12 — Personas-Wohnungswirtschaft Endspurt.**
Ein zusammenhängender Mini-Batch, der die letzten 11 Spiegel-Befunde an genau einer Wurzel auflöst:

1. WoWi-Fallback-Renderer (`solutionLinkByKey`, `solutionKeys.map`) aus `WohnungswirtschaftContent.tsx` entfernen → DB-`teaser_2col_v1` ist führende Wahrheit. Erledigt die 2 `PERSONA_FALLBACK_RENDERER_AKTIV` + 1 `CODE_SONDERRENDERER`.
2. Entscheidung Thomas: `solutions`-JSX-Block in allen 6 Persona-Komponenten entweder als aktive DB-Section anlegen **oder** in `KNOWN_JSX_SONDERPFADE` aufnehmen. Erledigt die 6 `I18N_JSX_SECTION_OHNE_DB_GEGENSTUECK`.
3. Für `personas.wohnungswirtschaft` Container `detail_mietershop` und `detail_serviceGarantie`: Karten füllen oder Container `is_active = false`. Erledigt die 2 `CONTAINER_LEER`.

Danach ist der Spiegel-Audit voraussichtlich grün (oder bewusst dokumentiert leer). Verbleibend dann nur noch:
- Serviceportal/Login (Login-Batch, zuletzt).
- 2 Klasse-A Hartcode-Pages (eigener Batch).

— Ende Batch 11 —
