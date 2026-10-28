# Batch 15 — Standardkarten-Slot-Vertrag · Abnahme

Stand: 2026-06-04

## Was wurde gemacht

Reine Kalibrierung des Wahrheits-Checks. Keine Inhaltsänderungen, keine
Migration, keine Renderer-Änderungen, keine Page-Änderungen.

Zwei chirurgische Änderungen in `src/features/admin/lib/truthSources.ts`:

1. **`card_v1` Slot-Erwartung erweitert.** Vorher: pro Karte wurde nur
   der container-erwartete Bildslot (z. B. `image`) als „vom Renderer
   gelesen" anerkannt; die anderen zwei (`thumbnail`, `icon_image`)
   liefen in `renderer_orphan`. Jetzt: alle drei Bildslots gelten als
   bekannt (`optional`), und nur der containerbewusst erwartete Slot
   trägt ggf. das `required`-Flag. Begründet durch Renderer-Code:
   `CardsSectionV1`, `ProductScrollerV1`, `ProductShowcaseListV1` und
   `FeatureGridV1` lesen image/thumbnail/icon_image als Fallback-Kette.

2. **`recordSeverity()` für optionale `renderer_orphan` differenziert.**
   Vorher: optionaler verwaister Slot ⇒ immer Restschuld. Jetzt:
   - leer + optional ⇒ `warning` (nicht Restschuld)
   - befüllt + optional ⇒ `restschuld` (echte Schuld, weil Renderer
     einen vorhandenen Inhalt ignoriert)
   - befüllt + Pflicht ⇒ `critical` (unverändert)

## Was ist `icon_image`?

Offizieller optionaler Bildslot der Standardkarte. Ersetzt das
Lucide-Icon durch ein grafisches TCS-Bildicon. Primärer Slot im
`feature_grid_v1`, Fallback-Slot in `cards_v1`, `product_scroller_v1`,
`product_showcase_list_v1`. Kein Legacy, kein Alias.

## Standardkarten-Slots offiziell

Pflicht: `title`. Optional: `eyebrow`, `description`, `link_label`,
`link_href`, `icon`, `icon_enabled`, `image_enabled`, `badge`,
`image`, `thumbnail`, `icon_image`. Vollständig in
`docs/04-betrieb/audit-snapshot/batch15-standardkarten-slotvertrag.md`.

## Welche Restschuld war Messfehler?

Restschuld-Records auf `card_v1` mit `field_key in (image, thumbnail,
icon_image)`, bei denen der Slot leer ist (kein aktives Asset). DB-Stand
zum Zeitpunkt der Vorprüfung:

- 622 aktive `card_v1`-Sections
- davon mit `icon_image`-Asset aktiv: 0
- davon mit `thumbnail`-Asset aktiv: 27 (innerhalb passender Hub/Filter-Container — kein Fehler)
- davon mit `image`-Asset aktiv: 87

Folge: praktisch alle bislang als Restschuld markierten Karten-Bildslots
(`icon_image`, sekundäre `thumbnail`/`image`-Slots) sind leer und
zählen ab sofort als `warning` (Hinweis) statt `restschuld`.

## Welche Restschuld bleibt echt?

Nur noch Fälle, in denen:

- ein Renderer einen Slot nachweislich nicht liest UND
- der Slot tatsächlich befüllt ist

Diese sind echte Aufräumkandidaten und bleiben sichtbar.

## Vorher/Nachher Audit-Zahlen

| Audit                                    | vorher | nachher | Bewertung |
|------------------------------------------|--------|---------|-----------|
| Wahrheits-Check kritisch                 | 0      | 0       | stabil    |
| Spiegel-Audit                            | 0      | 0       | stabil    |
| Coverage `aktive_db_ohne_renderpfad`     | 3      | 3       | stabil (nur Serviceportal/Login) |
| FAQ/CTA orphan / mixed / dedup-only      | 0/0/0  | 0/0/0   | stabil    |
| Public-Blocks rot                        | 0      | 0       | stabil    |
| `admin_schalter_ohne_public_wirkung`     | 14     | 14      | stabil (Welle 2 separat) |
| Restschuld-Anzeige Admin (`card_v1`-Bildslots) | hoch (~Hunderte) | nahezu 0 für leere Slots | korrekt kalibriert |

Die exakte „323"-Zahl wird vom Admin-UI (`SlotValidationView`) live
berechnet — sie wird nach der Kalibrierung deutlich sinken. Die
CI-Gates bleiben unverändert grün, weil sie nie auf Restschuld
gefiltert haben.

## Browser-Smoke

Nicht erforderlich — keine Render-Änderungen, keine Inhaltsänderungen.
Build-Pipeline durch TypeScript abgesichert (Admin-Lib wird beim
Bauen geprüft).

## Was bleibt übrig

- `admin_schalter_ohne_public_wirkung` = 14 Pages → Batch 16 Welle 2
  Kandidat
- Coverage 3 (Serviceportal/Login) → geparkt bis Auth-Etappe
- Klasse-A Marketing-Pages → separat
- Public-Blocks „gelb" / Admin-Schalter-ohne-Wirkung Reste → separat

## Empfehlung für Batch 16

**Admin-Schalter-ohne-Public-Wirkung Welle 2**: die verbliebenen ~10
Pages mit echtem Schalterbruch nach demselben Muster wie Batch 14
(Visibility-Gate aus `cms.sections.some(...)`). Mittleres Risiko,
keine Inhaltsänderungen. Vorher Vorprüfungs-Doku wie Batch 14 erstellen.

Alternativ — falls Thomas zuerst Klarheit über die neue
Restschuld-Zahl will: nach Reload des Admin-UI die neue Zahl
notieren und entscheiden, ob noch echte Restschuld-Befunde übrig sind,
die individuell adressiert werden müssen.

**Batch 16 wurde nicht gestartet.**
