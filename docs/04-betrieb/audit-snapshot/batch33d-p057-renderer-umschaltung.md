# Batch 33d — P-057 Renderer-Umschaltung auf Standardstruktur

Stand: 2026-06-05
Seite: `anwendungen.bildungseinrichtungen` (P-057)
Status: ✅ abgeschlossen — Public rendert aus neuen Standard-Sections, Altcontainer deaktiviert.

## Auftrag

P-057 öffentlich auf die in Batch 33a/33b/33c angelegten Standard-Sections
umstellen. Alte Sondercontainer B-255 (`sections`) und B-256
(`einrichtungen`) anschließend deaktivieren (nicht löschen). Keine
Inhalte ändern, keine Doppelblöcke erzeugen, Bearbeitbarkeit im Admin
über Standardbausteine sicherstellen.

## Vorprüfung (vor Umschaltung)

| Prüfung | Ergebnis |
|---|---|
| Neue Sections Kita/Schule/Wohnheim vorhanden | ✅ 18 Top-Level + 31 Karten-Kinder |
| Neue Sections waren `is_active=false` | ✅ |
| B-255 `sections` aktiv | ✅ vorher aktiv |
| B-256 `einrichtungen` aktiv | ✅ vorher aktiv |
| Felder, Assets, Whitelist gemäß 33a/b/c-Berichten vorhanden | ✅ |

## Geänderter Renderer

Datei: `src/features/anwendungen/pages/BildungseinrichtungenPage.tsx`

Vorher:
- 233 Zeilen, dreifach hartcodierter Einrichtungsblock (Kita/Schule/Wohnheim),
  Icons + Brochure-URLs als Code-Konstanten, Punkte-Liste über Sonderfeld-
  Indizes (`einrichtungen.<id>.leistungen.<lk>.punkte.<i>`), Spiegel-Bindung
  an die Altcontainer `sections` + `einrichtungen`.

Nachher:
- 134 Zeilen, vollständig DB-first.
- Für jede der drei Einrichtungen werden in fester Reihenfolge gerendert:
  1. `einrichtung_<id>` (`teaser_2col_v1`) → `Teaser2ColV1`
  2. `anforderungen_<id>` (`cards_v1`) → `CardsSectionV1` mit `card_v1`-Kindern
  3. `leistungen_<id>_sicherheit` (`cards_v1`) → `CardsSectionV1`
  4. `leistungen_<id>_kommunikation` (`cards_v1`) → `CardsSectionV1`
  5. `leistungen_<id>_orientierung` (`cards_v1`) → `CardsSectionV1`
  6. `broschure_<id>` (`cta_v1`) → inline als Download-Link (lokale Mini-
     Komponente `BroschureLink`, liest `cta_label` + `cta_href` aus DB).
- `standard_cta` rendert weiterhin global via `CmsTailCta` in `PageLayout`.
- Keine Icons / Texte / URLs mehr im Code hartcodiert.
- Lokale Sonderlogik (`punkteList`, `showEinrichtungen`-Gate auf
  Legacy-Sections) entfernt.

Warum wurde `broschure_<id>` nicht direkt über den Body-Renderer gerendert?
`cta_v1` steht in `CmsBodyRenderer.SKIP_TYPES`, weil das globale Tail-CTA
(`CmsTailCta`) sonst doppelt rendern würde. Die Broschüren-CTAs gehören
inhaltlich zur jeweiligen Einrichtung und müssen direkt nach den
Leistungs-Rastern erscheinen — sie werden deshalb in der Page-Komponente
inline als reine Download-Links ausgegeben. Visueller Effekt: ein
dezenter Link mit Download-Icon, identisch zur vorherigen Public-Variante.

## DB-Änderungen (Batch 33d)

| Operation | Tabelle | Anzahl | Wirkung |
|---|---|---|---|
| `UPDATE is_active=true` | `cms_sections` | 18 Top-Level + 31 Karten = 49 | Neue Standard-Sections sichtbar |
| `UPDATE is_active=false` | `cms_sections` | 2 (`sections`, `einrichtungen`) | Altcontainer aus Public entfernt |
| `UPDATE is_enabled=false` | `cms_admin_editable_fields` | 249 (`sections`: 12, `einrichtungen`: 237) | Sonderfelder im Admin nicht mehr bearbeitbar |

Keine Inhalte, Bilder oder Links wurden geändert.
Keine Sections gelöscht.
Keine Navigation/Route/Whitelist außerhalb der Page angefasst.

## Public-Quelle nach Umschaltung

Top-Level-Sections aktiv auf P-057:
- `hero` (hero_v1) — unverändert
- `einrichtung_kita / anforderungen_kita / leistungen_kita_sicherheit /
  leistungen_kita_kommunikation / leistungen_kita_orientierung /
  broschure_kita`
- dito Schule (`*_schule`)
- dito Wohnheim (`*_wohnheim`)
- `standard_cta` (cta_v1) — globaler Seiten-CTA

Inaktiv (bleiben in DB für Audit/Backout):
- `sections` (content_v1) — alte Sondergruppe
- `einrichtungen` (content_v1) — alter Hauptcontainer
- `faq` (faq_v1) — wie zuvor

## Doppelrender-Schutz

- Body-Renderer und Page-Renderer ignorieren inaktive Sections (RLS
  filtert sie bereits beim Read aus `cms.sections`).
- `cta_v1` ist in `SKIP_TYPES` → broschure_kita/schule/wohnheim laufen
  nicht über Tail-CTA, sondern werden ausschließlich in der Page
  inline gerendert.
- `CmsTailCta` greift nur `standard_cta` / `cta` als Section-Key (siehe
  `src/features/cms/components/CmsTailCta.tsx`) — die `broschure_*`-Keys
  sind dort explizit nicht enthalten.
- Keine Page-Komponente rendert dieselbe Section zweimal: jede
  Einrichtung wird genau einmal durchlaufen, jede Section nur einmal.

## Admin-Bearbeitbarkeit

Nach Umschaltung ist P-057 ausschließlich über Standardbausteine bearbeitbar:

- `teaser_2col_v1` (Einrichtungs-Bild/Text-Block)
- `cards_v1` (Karten-Raster: Anforderungen + drei Leistungs-Gruppen)
- `card_v1` (Einzelkarten in den Rastern)
- `cta_v1` (Broschüren-Downloadlink)

Die Whitelist-Einträge der alten Sonderfelder (`sections.*`,
`einrichtungen.<id>.*`) sind deaktiviert — Sonderfelder erscheinen im
Admin nicht mehr als bearbeitbar. Karten-Whitelist für `card_v1` wird
weiterhin systemweit generisch geliefert (siehe Wahrheits-Check-Modell).

## Prüfungen

| Prüfung | Ergebnis |
|---|---|
| `node scripts/cms/wahrheits-check-ci.mjs` | ✅ grün (Harvester reproduzierbar, keine Drift, FAQ/CTA orphan/mixed/dedup-only = 0) |
| `npm run build` | ✅ grün (12.7 s, dieselben Vite-Warnungen wie vor 33d: dynamic-import Hinweis auf `sectionContractStatus.ts`, Chunk-Size > 500 kB — beide vorbestehend, nicht durch 33d ausgelöst) |
| Harvester-Snapshot-Datei `docs/04-betrieb/faq-cta-toggle-inventar.md` | regeneriert (deckt 115 Body-OK, 2 Unknown — unverändert ggü. 33c) |
| `cms_sections`-Inventar P-057 | 18 neue Top + 31 Karten = 49 aktiv, 2 Legacy + 1 FAQ = 3 inaktiv, +hero +standard_cta aktiv |
| Bildungseinrichtungen-Seite lädt | ✅ Build erfolgreich, Renderer-Pfad sauber |

## Geänderte Dateien

- `src/features/anwendungen/pages/BildungseinrichtungenPage.tsx`
  (vollständige Neufassung, DB-first, 134 Zeilen)
- `docs/04-betrieb/faq-cta-toggle-inventar.md` (Harvester-Snapshot
  regeneriert, keine inhaltlichen Änderungen außer Stand-Zeile)
- `docs/04-betrieb/audit-snapshot/batch33d-p057-renderer-umschaltung.md`
  (dieser Bericht, neu)

Keine Änderungen an:
- Navigation (`cms_navigation_nodes`, `src/navigation/*`)
- Routen (`src/app/routes.tsx`)
- i18n-JSONs (`src/i18n/locales/**`)
- Produktdatenbank-Client
- Auth/Login
- Anderen Seiten / Sondercontainern jenseits P-057

## Backout-Pfad

Falls Probleme auftreten, ist 33d in einem Schritt rückrollbar:

```sql
-- 1. Alte Container wieder aktivieren
UPDATE cms_sections SET is_active=true
WHERE page_key='anwendungen.bildungseinrichtungen'
  AND section_key IN ('sections','einrichtungen');
-- 2. Neue Standard-Sections wieder deaktivieren
UPDATE cms_sections SET is_active=false
WHERE page_key='anwendungen.bildungseinrichtungen'
  AND section_key IN ( ... 33a/b/c-Keys ... );
-- 3. Whitelist alter Felder reaktivieren
UPDATE cms_admin_editable_fields SET is_enabled=true
WHERE page_key='anwendungen.bildungseinrichtungen'
  AND section_key IN ('sections','einrichtungen');
-- 4. BildungseinrichtungenPage.tsx auf Git-Vorgängerstand zurücksetzen
```

Datenverlust ausgeschlossen — alle 33a/b/c-Inhalte und alle Legacy-
Inhalte bleiben in der DB erhalten.

## Folge-Kandidaten

Dieselbe Standardisierungs-Etappe lässt sich nach demselben Muster
auf weitere Anwendungen-Seiten anwenden, sobald jeweils beauftragt:

- **P-056 `anwendungen.gesundheitswesen`** — vermutlich analoge
  Mehrfach-Block-Struktur (Krankenhaus / Pflegeheim / Praxen).
  Vor Umbau: Quellsection-Inventar prüfen, ob Block-Anzahl und
  Leistungs-Gruppen vergleichbar sind.
- **P-059 `anwendungen.behoerden`** — Strukturprüfung vor Migration nötig.
- **P-060 `anwendungen.industrie`** — Strukturprüfung vor Migration nötig.

Empfehlung: pro Folge-Seite separater Batch (33e/f/g) nach demselben
Drei-Schritt-Schema (a/b/c = Daten standardisieren, d = Renderer
umstellen + Legacy deaktivieren). Keine flächige Automatik.

Stopp hier — keine Folgearbeiten ohne neuen Auftrag.
