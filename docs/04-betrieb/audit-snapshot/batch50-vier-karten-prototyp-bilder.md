# Batch 50 — Prototyp-Bilder für vier Standardkarten

**Stand:** 2026-06-05
**Auftrag:** Generische Prototyp-Bilder für vier bildlose Standardkarten erzeugen und im CMS-Light hinterlegen.

## Betroffene Karten

| B-ID  | page_key                                    | section_key            | Titel (DE)                  |
|-------|---------------------------------------------|------------------------|-----------------------------|
| B-591 | zutrittskontrolle.zufahrten-parkplaetze     | card_bcm_leser         | BCM-Leser                   |
| B-595 | zutrittskontrolle.zufahrten-parkplaetze     | card_gsm_gateway       | GSM-Gateway                 |
| B-624 | gebaeudemanagement.digitale-namensanzeige   | products__adx5         | Kompakte Außenstation ADx5  |
| B-626 | gebaeudemanagement.digitale-namensanzeige   | products__briefkasten  | Digitale Briefkastenanlage  |

Vor Batch 50: keine Einträge in `cms_assets` für diese vier Sections (0 Zeilen, bestätigt per SQL-Abfrage). Whitelist (`cms_admin_editable_fields`) für `field_key='image'` war bereits aktiv — kein Whitelist-Eingriff nötig.

## Vorgehen

1. **Bilder generiert** (1280×896, JPEG, neutral, ohne Logos/Texte/Personen):
   - B-591: Wandmontierter Zutrittsleser an Parkplatzzugang
   - B-595: Kompaktes weißes GSM-Gateway-Gerät im Technikraum
   - B-624: Außenstation mit Kamera/Ruftaste am modernen Gebäudeeingang
   - B-626: Brushed-Steel-Briefkastenanlage an moderner Fassade

2. **Hochgeladen** in Storage-Bucket `cms-assets` unter `<page_key>/<section_key>/prototype-*.jpg`.

3. **Eingetragen** über `rpc_admin_upsert_asset` (asset_role='image', viewport='desktop'). Erzeugte asset_ids:
   - B-591: `10de2f2f-93f8-41db-bdda-829bd4b64d3b`
   - B-595: `4497c54c-009e-463c-b69b-76f86b0a7d59`
   - B-624: `da13e2a1-5365-4bf8-b1eb-808f54ed1c0d`
   - B-626: `f1f5e573-32b8-4b76-a968-37959ebaacb9`

4. **Alt-Texte** (DE/EN) über `rpc_admin_update_asset_alt` neutral gesetzt.

## Verifikation

- SQL-Stichprobe `cms_assets`: alle 4 Zeilen `is_active=true`, `asset_role='image'`, public_url vorhanden, alt_de/alt_en gesetzt.
- Wahrheits-Check (`scripts/cms/eine-wahrheit-systemaudit.mjs`): Lauf OK, Standard 90 / Detail 11 / Sonder 9 / Legacy 1 — unverändert ggü. Batch 49c. Gesamt-Ampel "rot" durch vorbestehende CMS/Public-Sperren (=9) und Sonderlogik (=9), nicht durch Batch 50.
- Keine Code-Änderung, kein Build nötig.

## Restpunkte / Hinweise

- Keine Inhalte, Links, Navigation oder Renderer geändert. Nur diese vier Karten haben jetzt jeweils einen aktiven `cms_assets`-Eintrag (asset_role='image').
- Bilder sind als **generische Prototyp-Visuals** markiert (Dateiname-Präfix `prototype-`) und können später durch echte Produktfotos ersetzt werden, ohne weitere Strukturänderung.
