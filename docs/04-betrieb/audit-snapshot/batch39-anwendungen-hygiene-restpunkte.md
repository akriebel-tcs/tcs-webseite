# Batch 39 — Anwendungen: Hygiene-Restpunkte nach Batch 38

Datum: 2026-06-05
Bereich: TCS in Bauten / Anwendungen
Modus: Hygiene-Batch — nur Restpunkte aus Batch 38 (R3a, R2, B-2608).
Kein Renderer-Umbau, keine Navigation, keine Altcontainer gelöscht,
keine P-077-Arbeit.

## 0. Kurzfazit

| Punkt | Ergebnis |
|---|---|
| R3a — stale Whitelist P-059/P-060 | ✅ bereinigt (97 Einträge entfernt) |
| R2 — P-071 5. Karte „Raum-zu-Raum" | ✅ ergänzt (DB-first, Quelle eindeutig im Altbestand) |
| B-2608 — Bild `einrichtung_intern` (P-071) | ⚠️ kein passendes Asset im Bestand — bleibt redaktioneller Restpunkt |
| Wahrheits-Check | ✅ grün |
| Public-Renderer / Navigation / P-077 / Produkt-DB | ❌ nicht angefasst |

## 1. R3a — Whitelist-Bereinigung P-059 / P-060

**Vorher:**

| Seite | section_key | Einträge | Status Section |
|---|---|---:|---|
| anwendungen.gesundheitseinrichtungen | `section` | 12 | `is_active=false` (Altcontainer content_v1) |
| anwendungen.gesundheitseinrichtungen | `cards` | 36 | `is_active=false` (Altcontainer content_v1) |
| anwendungen.oeffentliche-hand | `section` | 12 | `is_active=false` (Altcontainer content_v1) |
| anwendungen.oeffentliche-hand | `cards` | 49 | `is_active=false` (Altcontainer content_v1) |
| **Summe** | | **109** | alle inaktiv |

Hinweis zur Differenz zu Batch 38 („36/49"): die Batch-38-Doku zählte
nur die `cards`-Einträge. Mit den 2×12 Einträgen aus den
`section`-Containern ergeben sich insgesamt 109 Einträge.

**Aktion:**
`DELETE FROM cms_admin_editable_fields WHERE page_key IN
('anwendungen.gesundheitseinrichtungen','anwendungen.oeffentliche-hand')
AND section_key IN ('section','cards')` — idempotent, betrifft
ausschließlich Whitelist-Einträge der seit Batch 36 deaktivierten
Sondercontainer. Aktive Standard-Sections (`hero`, `cards_standard`,
`card_*`, `standard_cta`) wurden nicht berührt.

**Nachher:**
`SELECT COUNT(*) … = 0` — bestätigt. Keine Inhalte gelöscht (Texte
liegen weiterhin in `cms_section_fields` der inaktiven Altcontainer
als Backup).

## 2. R2 — Neue Karte „Raum-zu-Raum" auf P-071

**Quelle eindeutig:** Im aktiven `anforderungen`-Container (cards_v1)
liegen seit Batch 34a die Altbestand-Felder `raumZuRaum.label`,
`raumZuRaum.text`, `raumZuRaum.icon` jeweils DE+EN — übernommen aus
`src/i18n/locales/de|en/anwendungen.json`. Damit ist die Quelle
unzweifelhaft und es musste nichts frei getextet werden.

**Aktion:**

- Neue Section `anforderungen_item_raum_zu_raum` (Typ `card_v1`,
  `sort_order=5`, `is_active=true`) unterhalb von `anforderungen`
  angelegt.
- Standardvertrag aus Vorbildkarte `anforderungen_item_durchsage`
  geklont (alle 56 Feldkeys × 2 Locales = 112 Feldzeilen), gezielt
  überschrieben:
  - `title` = „Raum-zu-Raum" / „Room-to-room"
  - `description` = Altbestand 1:1 DE+EN
  - `icon` = `message-square` (Altbestand)
  - `link_1_label` = „Mehr erfahren" / „Learn more",
    `link_1_href` = `/kontakt`, `link_1_enabled = 1`
  - `link_2`, `link_3` als Standard-Slots vorhanden, `enabled=0`
- Whitelist (`cms_admin_editable_fields`) für alle 56 Standardfelder
  in beiden Locales angelegt (112 Einträge, `is_enabled=true`) —
  Karte ist im Admin sofort vollständig bearbeitbar.

**Verifikation (DB-Stand):**

```
anforderungen_item_durchsage     | 1 | t
anforderungen_item_automatik     | 2 | t
anforderungen_item_mobil         | 3 | t
anforderungen_item_integration   | 4 | t
anforderungen_item_raum_zu_raum  | 5 | t   ← neu
```

Felder: 112  •  Whitelist: 112  ✅

Renderpfad: keine Code-Änderung nötig — die Karte rendert automatisch
über den bestehenden Standard-Dispatcher `renderPageSectionByType`
(cards_v1 → card_v1). Spiegelregel bleibt erfüllt.

## 3. B-2608 — Bild für `einrichtung_intern` (P-071)

**Befund:** In `cms_assets` existiert für
`anwendungen.interne-kommunikation` **kein** Asset mit
`section_key='einrichtung_intern'`. Vorhanden sind nur die beiden
Hero-Assets (Praxen_321.jpg). Im Code-Altbestand
(`src/features/anwendungen/**`, `src/shared/assets/**`) gibt es kein
eindeutig zuordenbares Bildmotiv „interne Kommunikation /
Einrichtung intern".

**Empfehlung:** Kein automatisches Setzen. B-2608 bleibt
redaktioneller Restpunkt — Thomas oder Marketing sollten ein
geeignetes Motiv liefern (analog P-057 `einrichtung_<id>`). Sobald
das Asset in `cms_assets` (Slot `image`, `section_key
=einrichtung_intern`) gepflegt ist, rendert es ohne Code-Eingriff.

Alternative, falls dauerhaft kein Bild geplant: gemeinsam mit
Redaktion entscheiden, ob `einrichtung_intern` zu `content_v1`
umgestellt wird — eigener kleiner Batch, NICHT Teil dieses
Hygienelaufs.

## 4. Verifikation

- `node scripts/cms/wahrheits-check-ci.mjs` → ✅ **grün**
  („Harvester reproduzierbar, keine Drift, Body-Map vollständig,
  Launch-Gate erfüllt").
- Kein Quellcode geändert → kein Build notwendig.

## 5. Was wurde NICHT angefasst

- Navigation (`cms_navigation_nodes`, `src/navigation/*`,
  `src/app/routes.tsx`) — nicht berührt.
- Public-Renderer-Logik (`renderPageSectionByType`, Section-Typen)
  — nicht berührt.
- P-077 `anwendungen.referenzprojekte` — nicht berührt.
- Produkt-DB / Katalog / PDP — nicht berührt.
- Altcontainer P-057/P-059/P-060/P-071 (inaktiv) — nicht gelöscht.
- Keine freien neuen Marketingtexte.

## 6. Offene Restpunkte (Stand nach Batch 39)

| ID | Punkt | Empfehlung |
|---|---|---|
| R-B2608 | Bild für `einrichtung_intern` | Redaktionspflege, dann Asset in `cms_assets` |
| R3 | inaktive Altcontainer P-057/P-059/P-060/P-071 | gebündelter Cleanup-Batch 35x (mit SQL-Backup) |
| R-077 | P-077 Sonderlogik | eigener Auftrag, separater Scope |
| R-DOC | `cms-steuerbarkeit-status.md` / `current-status.md` um Batch 36–39 ergänzen | redaktioneller Mini-Batch |

Stopp nach diesem Batch — keine Folgearbeit gestartet.
