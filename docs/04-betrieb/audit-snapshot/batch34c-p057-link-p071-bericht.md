# Batch 34c — Verlinkung P-057 → P-071 (Karten-Renderer)

Datum: 2026-06-05
Status: ✅ abgeschlossen, Wahrheits-Check grün.

## Auftrag

P-057 (`anwendungen.bildungseinrichtungen`) soll auf P-071
(`anwendungen.interne-kommunikation`) verlinken — gewünscht: **pro
Einrichtung im Kommunikation-Block** (Kita / Schule / Wohnheim).

## Ergebnis

In jedem der drei Container `leistungen_<id>_kommunikation` (cards_v1) auf
P-057 wurde **eine zusätzliche Karte** (`card_v1`) am Ende eingefügt:

| Einrichtung | Container                          | Neue Karten-Section                       | sort_order |
|-------------|------------------------------------|-------------------------------------------|------------|
| Kita        | `leistungen_kita_kommunikation`    | `leist_kita_kommunikation_link_p071`      | 30         |
| Schule      | `leistungen_schule_kommunikation`  | `leist_schule_kommunikation_link_p071`    | 30         |
| Wohnheim    | `leistungen_wohnheim_kommunikation`| `leist_wohnheim_kommunikation_link_p071`  | 30         |

Die 3 bestehenden Karten haben sort_order 0/10/20; die neue Karte ist
damit jeweils die 4. Karte im Block.

### Karten-Inhalt (DE / EN)

- **title** – „Anbindung an die interne Kommunikation" / „Connection to internal communication"
- **description** – Kurztext zu Raum-zu-Raum, Durchsagen, Türöffnerautomatik.
- **link_1_label** – „Interne Kommunikation ansehen" / „View internal communication"
- **link_1_href** – `/anwendungen/interne-kommunikation`
- **link_1_enabled** – `1` (sichtbar)

### Admin-Whitelist

Vollständiger Standard-Whitelist-Satz für die drei neuen Karten-Section-Keys
wurde aus dem Sibling `leist_<id>_kommunikation_0` kopiert. Damit sind die
Karten im Admin sofort pflegbar (Titel, Beschreibung, Link, Bullets, Chips,
Icons, Bild — alles über `/admin` editierbar).

## Navigation

`cms_navigation_nodes` wurde **nicht** angefasst. Begründung:

- Der Hauptpfad zu P-071 ist die kontextuelle Karten-Verlinkung aus
  P-057 (so vom Nutzer beauftragt).
- N-100 für P-071 ist bereits angelegt (Batch 34a-Audit) und bleibt
  unverändert.
- Eine eventuelle Umsortierung von N-100 (Anwendungen-Root vs. „TCS in
  Bildungseinrichtungen") gehört in einen separaten Navi-Auftrag.

## Spiegel-Regel / Doppelrender

- Karten werden vom Standardrenderer `CardsSectionV1` aus den
  Kind-Sections gelesen — kein Sondercode, keine Hartkodierung.
- Public-Site und Admin sehen exakt dieselben Karten (Spiegel-Regel
  erfüllt).
- Link-Visibility folgt dem normalen `link_1_enabled`-Toggle.

## Prüfungen

- ✅ `node scripts/cms/wahrheits-check-ci.mjs` — grün.
- ✅ 3 neue card_v1-Sections aktiv, Felder/Links DE+EN gesetzt, Whitelist
  vollständig (Stichprobe via SQL bestätigt).
- ✅ Migration idempotent (`ON CONFLICT DO NOTHING` auf allen drei
  Tabellen).
- ✅ Kein Code in `src/` geändert.

## Bewusst NICHT geändert

- Keine Navigation (`cms_navigation_nodes`) verändert.
- Keine bestehenden Karten umgeschrieben oder gelöscht.
- Keine neuen Seiten, kein Auth-Code, keine Produkt-/PDP-Berührung.
- Keine zusätzlichen Verlinkungen außerhalb der drei Kommunikation-Blöcke.

## Backout

```sql
DELETE FROM cms_admin_editable_fields
 WHERE page_key='anwendungen.bildungseinrichtungen'
   AND section_key LIKE 'leist_%_kommunikation_link_p071';

DELETE FROM cms_section_fields
 WHERE page_key='anwendungen.bildungseinrichtungen'
   AND section_key LIKE 'leist_%_kommunikation_link_p071';

DELETE FROM cms_sections
 WHERE page_key='anwendungen.bildungseinrichtungen'
   AND section_key LIKE 'leist_%_kommunikation_link_p071';
```

## Folgekandidaten

- Inhaltsfeinschliff der drei neuen Karten (Titel/Text/Icon) über `/admin`
  oder per Prompt-Inhaltspflege.
- 5. „raumZuRaum"-Karte im `anforderungen`-Block auf P-071 ergänzen
  (offener Punkt aus Batch 34b).
- Optionaler Navi-Auftrag: N-100 (P-071) ggf. unter „Anwendungen"-Root
  statt unter „TCS in Bildungseinrichtungen" einsortieren.
