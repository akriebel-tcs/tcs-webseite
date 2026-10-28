# Batch 33c — P-057 Wohnheim standardisieren

Stand: 2026-06-05
Seite: `anwendungen.bildungseinrichtungen` (P-057)
Status: ✅ abgeschlossen, neue Sections inaktiv, Public rendert weiter aus B-255/B-256

## Auftrag

Wohnheim-Block auf normale CMS-Light-Standardbausteine umstellen, exakt nach dem Muster Batch 33a Kita / 33b Schule.
Variante A (bestätigt): Systemleistungen in drei getrennten `cards_v1`-Rastern (Sicherheit & Zutritt, Kommunikation, Orientierung & Information).

## Ergebnis

| Block | section_key | section_type | sort_order | is_active | Felder | Whitelist |
|---|---|---|---|---|---|---|
| Bild/Text | `einrichtung_wohnheim` | `teaser_2col_v1` | 300 | false | 10 (DE/EN) | 12 |
| Anforderungen-Raster | `anforderungen_wohnheim` | `cards_v1` | 310 | false | 2 | 2 |
| Anforderungen-Karten (5×) | `anf_wohnheim_{wechsel,zutritt,video,durchsage,info}` | `card_v1` | 0/10/20/30/40 | false | je 6 (title/description/icon DE+EN) | je 8 (inkl. icon_image) |
| Leistungen Sicherheit | `leistungen_wohnheim_sicherheit` | `cards_v1` | 320 | false | 2 | 2 |
| · Karten (4×) | `leist_wohnheim_sicherheit_0..3` | `card_v1` | 0/10/20/30 | false | je 2 | je 2 |
| Leistungen Kommunikation | `leistungen_wohnheim_kommunikation` | `cards_v1` | 322 | false | 2 | 2 |
| · Karten (3×) | `leist_wohnheim_kommunikation_0..2` | `card_v1` | 0/10/20 | false | je 2 | je 2 |
| Leistungen Orientierung | `leistungen_wohnheim_orientierung` | `cards_v1` | 324 | false | 2 | 2 |
| · Karten (3×) | `leist_wohnheim_orientierung_0..2` | `card_v1` | 0/10/20 | false | je 2 | je 2 |
| Broschüre/CTA | `broschure_wohnheim` | `cta_v1` | 360 | false | 6 (cta_label/href/link DE+EN) | 6 |

Summen:
- 21 neue Sections, **alle `is_active=false`**
- 74 neue `cms_section_fields`-Zeilen (DE/EN 1:1 aus B-255/B-256 übernommen)
- 1 neues Asset `einrichtung_wohnheim.image` (kopiert aus `einrichtungen.wohnheim.image`, csm_Wohnheim_321_*.jpg)
- 86 neue/aktualisierte Whitelist-Einträge (alle `is_enabled=true`)
- 15 `parent_section_id`-Verknüpfungen gesetzt (5 Anforderungs- + 10 Leistungs-Karten)

## Inhalte 1:1 übernommen

Quelle: `cms_section_fields` Felder `wohnheim.*` in Legacy-Sections `sections` / `einrichtungen`.

- Teaser: `wohnheim.label`, `wohnheim.title`, `wohnheim.intro`
- 5 Anforderungs-Karten: `wohnheim.anforderungen.{wechsel,zutritt,video,durchsage,info}.{label,text,icon}`
- 4 Leistungs-Punkte Sicherheit: `wohnheim.leistungen.sicherheit.punkte.0..3`
- 3 Leistungs-Punkte Kommunikation: `wohnheim.leistungen.kommunikation.punkte.0..2`
- 3 Leistungs-Punkte Orientierung: `wohnheim.leistungen.orientierung.punkte.0..2`
- Broschüren-URL: `TCS_in_Wohnheimen.pdf` (übernommen aus Renderer-Konstante `BildungseinrichtungenPage.tsx`; in Legacy-DB nicht hinterlegt — fester Wert aus heutiger öffentlicher Ausspielung)

Keine Inhalte umgeschrieben.

## Sicherheit

- B-255/B-256 (`sections`, `einrichtungen`) bleiben unverändert aktiv → Public rendert weiterhin aus alter Quelle
- Neue Wohnheim-Sections inaktiv → kein Public-Doppelrender
- Renderer (`BildungseinrichtungenPage.tsx`) nicht angefasst
- Kita- (Batch 33a) und Schule-Daten (Batch 33b) nicht angefasst
- Idempotent (alle INSERTs mit `ON CONFLICT DO NOTHING` / `DO UPDATE`)

## Verifikation

- `node scripts/cms/wahrheits-check-ci.mjs` → ✅ grün (Harvester reproduzierbar, keine Drift, FAQ/CTA orphan/mixed/dedup-only = 0)
- Section-Inventar geprüft: 21/21 Wohnheim-Sections vorhanden, alle inaktiv
- Feld-Inventar geprüft: 74 Felder über 21 Sections korrekt verteilt
- Parent-Verknüpfungen geprüft: 15/15 Kinder haben `parent_section_id`
- Asset geprüft: 1× `einrichtung_wohnheim/image` mit korrekter Wohnheim-URL
- Whitelist geprüft: 86 Wohnheim-Einträge enabled

## Artefakte

- `docs/04-betrieb/audit-snapshot/batch33c-wohnheim-migration.sql` — idempotente SQL-Vorlage

## Hinweis zur Ausführung

Sections/Felder/Asset über `psql` (Insert-Recht), Type/Sort/parent_section_id-UPDATEs und Whitelist über `supabase--insert` (service_role) angewendet. Die SQL-Datei ist vollständig, kann auf frischer DB end-to-end durchlaufen, sofern der Ausführende auf alle drei Tabellen INSERT/UPDATE-Recht hat.

## Stand nach Batch 33a/b/c

Alle drei Einrichtungsblöcke (Kita, Schule, Wohnheim) sind in Standardbausteinen abgebildet, jeweils:
- 1× `teaser_2col_v1`
- 1× `cards_v1` „Typische Anforderungen" + N `card_v1`
- 3× `cards_v1` „Systemleistungen" (Sicherheit/Kommunikation/Orientierung) + je N `card_v1`
- 1× `cta_v1` Broschüre
- alles `is_active=false`

Legacy B-255/B-256 (`sections`, `einrichtungen`) bleibt unverändert aktiv und versorgt weiterhin Public.

## Nächster Schritt

Batch 33d „Renderer-Umbau":
- `BildungseinrichtungenPage.tsx` auf neue Standard-Sections umstellen (drei wiederholte Standardblöcke statt der heutigen Schleife über `einrichtungen.*`/`sections.*`).
- Erst nach erfolgreichem Renderer-Umbau + Sichtprüfung in Preview: Deaktivierungs-Tail für B-255/B-256 (Sections `sections` + `einrichtungen`) per `supabase--migration` + zugehörige Whitelist.
- Danach Wahrheits-Check + globales Bearbeitbarkeits-Audit + Build.

Stopp hier.
