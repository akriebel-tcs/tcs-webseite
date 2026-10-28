# Batch 33b — P-057 Schule standardisieren

Stand: 2026-06-05
Seite: `anwendungen.bildungseinrichtungen` (P-057)
Status: ✅ abgeschlossen, neue Sections inaktiv, Public rendert weiter aus B-255/B-256

## Auftrag

Schule-Block auf normale CMS-Light-Standardbausteine umstellen, exakt nach dem Muster Batch 33a Kita.
Variante A bestätigt: Systemleistungen in drei getrennten `cards_v1`-Rastern (Sicherheit & Zutritt, Kommunikation, Orientierung & Information).

## Ergebnis

| Block | section_key | section_type | sort_order | is_active | Felder | Whitelist |
|---|---|---|---|---|---|---|
| Bild/Text | `einrichtung_schule` | `teaser_2col_v1` | 200 | false | 10 (DE/EN) | 12 |
| Anforderungen-Raster | `anforderungen_schule` | `cards_v1` | 210 | false | 2 | 2 |
| Anforderungen-Karten (6×) | `anf_schule_{zutritt,video,intern,notruf,wege,info}` | `card_v1` | 0/10/20/30/40/50 | false | je 6 (title/description/icon DE+EN) | je 8 (inkl. icon_image) |
| Leistungen Sicherheit | `leistungen_schule_sicherheit` | `cards_v1` | 220 | false | 2 | 2 |
| · Karten (4×) | `leist_schule_sicherheit_0..3` | `card_v1` | 0/10/20/30 | false | je 2 | je 2 |
| Leistungen Kommunikation | `leistungen_schule_kommunikation` | `cards_v1` | 222 | false | 2 | 2 |
| · Karten (3×) | `leist_schule_kommunikation_0..2` | `card_v1` | 0/10/20 | false | je 2 | je 2 |
| Leistungen Orientierung | `leistungen_schule_orientierung` | `cards_v1` | 224 | false | 2 | 2 |
| · Karten (3×) | `leist_schule_orientierung_0..2` | `card_v1` | 0/10/20 | false | je 2 | je 2 |
| Broschüre/CTA | `broschure_schule` | `cta_v1` | 260 | false | 6 (cta_label/href/link DE+EN) | 6 |

Summen:
- 22 neue Sections, **alle `is_active=false`**
- 78 neue `cms_section_fields`-Zeilen (DE/EN 1:1 aus B-255/B-256 übernommen)
- 1 neues Asset `einrichtung_schule.image` (kopiert aus `einrichtungen.schule.image`, csm_Schule_321_*.jpg)
- 94 neue/aktualisierte Whitelist-Einträge (alle `is_enabled=true`)
- 16 `parent_section_id`-Verknüpfungen gesetzt (6 Anforderungs- + 10 Leistungs-Karten)

## Inhalte 1:1 übernommen

Quelle: `cms_section_fields` Felder `schule.*` in Legacy-Sections `sections` / `einrichtungen`.

- Teaser: `schule.label`, `schule.title`, `schule.intro`
- 6 Anforderungs-Karten: `schule.anforderungen.{zutritt,video,intern,notruf,wege,info}.{label,text,icon}`
- 4 Leistungs-Punkte Sicherheit: `schule.leistungen.sicherheit.punkte.0..3`
- 3 Leistungs-Punkte Kommunikation: `schule.leistungen.kommunikation.punkte.0..2`
- 3 Leistungs-Punkte Orientierung: `schule.leistungen.orientierung.punkte.0..2`
- Broschüren-URL: `TCS_in_Schulen.pdf` (übernommen aus Renderer-Konstante `BildungseinrichtungenPage.tsx` Zeile 48; in Legacy-DB nicht hinterlegt — fester Wert aus heutiger öffentlicher Ausspielung)

Keine Inhalte umgeschrieben.

## Sicherheit

- B-255/B-256 (`sections`, `einrichtungen`) bleiben unverändert aktiv → Public rendert weiterhin aus alter Quelle
- Neue Schule-Sections inaktiv → kein Public-Doppelrender
- Renderer (`BildungseinrichtungenPage.tsx`) nicht angefasst
- Kita- und Wohnheim-Daten nicht angefasst
- Idempotent (alle INSERTs mit `ON CONFLICT DO NOTHING` / `DO UPDATE`)

## Verifikation

- `node scripts/cms/wahrheits-check-ci.mjs` → ✅ grün (Harvester reproduzierbar, keine Drift, FAQ/CTA orphan/mixed/dedup-only = 0)
- Section-Inventar geprüft: 22/22 Schule-Sections vorhanden, alle inaktiv
- Feld-Inventar geprüft: 78 Felder über 22 Sections korrekt verteilt
- Parent-Verknüpfungen geprüft: 16/16 Kinder haben `parent_section_id`
- Asset geprüft: 1× `einrichtung_schule/image` mit korrekter Schule-URL
- Whitelist geprüft: 94 Schule-Einträge enabled

## Artefakte

- `docs/04-betrieb/audit-snapshot/batch33b-schule-migration.sql` — idempotente SQL-Vorlage (238 Zeilen)

## Hinweis zur Ausführung

Sections/Felder/Asset über `psql` (Insert-Recht), Whitelist und `parent_section_id` über `supabase--insert` (service_role) angewendet. Die SQL-Datei ist vollständig, kann auf frischer DB end-to-end durchlaufen, sofern der Ausführende auf alle drei Tabellen INSERT/UPDATE-Recht hat.

## Nächster Schritt

Batch 33c „Wohnheim standardisieren" — exakt dasselbe Muster (1× teaser_2col_v1, 1× cards_v1 Anforderungen, 3× cards_v1 Leistungen nach Gruppe, 1× cta_v1 Broschüre, alles inaktiv).
Erst nach 33c kommt der Renderer-Umbau (Batch 33d) und anschließend die Deaktivierung von B-255/B-256.

Stopp hier.
