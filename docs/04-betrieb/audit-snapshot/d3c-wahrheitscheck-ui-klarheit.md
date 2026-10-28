# D3c — Wahrheits-Check UI-Klarheit

Stand: 2026-06-04 · Auftrag: Vor Batch 4 sicherstellen, dass die UI Launch-Blocker, Restschuld und Warnungen eindeutig unterscheidet.

## D3c.1 — UI-Darstellung geprüft

| Frage | Befund vorher | Befund nachher |
|---|---|---|
| Zeigt die Liste standardmäßig mehrere Schwereklassen? | Ja, Default = `critical + restschuld`. | Unverändert (Default bleibt), aber jede Zeile zeigt jetzt ihre Schwereklasse als **Hauptbadge** (Kritisch · Restschuld · Warnung · Grün). |
| Wurden Restschuld-Zeilen rechts mit „Rot" markiert? | **Ja** — der alte Objektstatus (DB-/Renderer-Ampel) lief auf `red`, sobald irgendein aktiver Baustein „rot" war (z. B. `card_v1.icon_image` ohne Renderer). Im Screenshot des Auftrags klar sichtbar. | **Nein.** Hauptbadge ist jetzt die Schwereklasse. Der alte Objektstatus erscheint nur noch als sekundärer 9-px-Hinweis unter dem Hauptbadge, mit Tooltip „Alter Objektstatus (DB/Renderer-Ampel)". |
| Sind die sichtbaren `card_v1.icon_image`-Einträge wirklich `severity=restschuld`? | Ja (siehe `recordSeverity` in `truthSources.ts`, Zeilen 370–404: `renderer_orphan + isOptionalSlot → restschuld`). Klassifikation war korrekt, **nur die Anzeige war irreführend**. | Klassifikation bleibt korrekt; die Schwereklasse ist jetzt auch optisch eindeutig. |

### Änderung im Code

- `src/features/admin/components/SlotValidationView.tsx`
  → `SectionRow`: rechte Spalte zeigt **Schwereklasse als Hauptbadge** (Kritisch/Restschuld/Warnung/Grün), darunter klein der alte Objektstatus als sekundäre Information.
- Keine Logik-Änderung an `recordSeverity` / `objectSeverity`.

## D3c.2 — Critical-Liste validiert

Filter „Kritisch / Launch-Blocker" → es werden ausschließlich Records mit
`severity === "critical"` angezeigt. Aus der Klassifikation in
`recordSeverity`/`objectSeverity` folgt deterministisch, dass dort
**nicht** mehr auftauchen:

- `card_v1.icon_image` ohne Renderer-Read → `renderer_orphan + isOptionalSlot` → restschuld
- `card_v1.thumbnail` ohne Renderer-Read → dito → restschuld
- `*_image_alt` ohne Renderer-Read → dito → restschuld
- Sections, die der Admin ausgeblendet hat → deckelt auf `warning`
- Sonderseiten mit registriertem `page_component_read` → `green`

Was im Filter „Kritisch" verbleibt, sind exakt die in D3b genannten echten
Launch-Blocker (FAQ/CTA-Orphans + `unknown_section_type` + `db_dupes` +
required-renderer-Orphans).

## D3c.3 — `product_showcase_list_v1`

| Quelle | Vorher | Nachher |
|---|---|---|
| Public-Renderer (`src/features/cms/components/sections/ProductShowcaseListV1.tsx`) | ✅ vorhanden | ✅ |
| `CmsBodyRenderer.RENDERERS` | ✅ Zeile 75 | ✅ |
| `RENDERER_SLOT_MAP` (`KNOWN_SECTION_TYPES`) | ❌ **fehlte** → 2 Sections schlugen als `unknown_section_type` auf und wurden critical gezählt | ✅ ergänzt als Container ohne Bildslots; Bilder liegen auf Kind-`card_v1` (analog `cards_v1` / `product_scroller_v1`) |
| `RENDERER_COMPONENT_HINT` | ❌ fehlte | ✅ ergänzt |

Datei: `src/features/admin/lib/rendererSlotMap.ts`.

Folge: Die 2 `product_showcase_list_v1`-Sections sind jetzt im Wahrheits-Check
kein Launch-Blocker mehr, sondern werden über den generischen Kind-Vertrag
des `card_v1` bewertet.

## D3c.4 — Stand nach D3c

| Frage | Antwort |
|---|---|
| Wie viele echte Kritisch-Zeilen bleiben nach sauberem Filter? | **~109** — ergibt sich aus D3b.4-Aufschlüsselung (111) **minus 2** `product_showcase_list_v1`-Orphans. Exakter Wert erst beim nächsten Browser-Run sichtbar; Größenordnung ändert sich nicht. |
| Davon FAQ-Orphans | **52** (unverändert ggü. D3b) |
| Davon CTA-Orphans | **58 + 1 mixed = 59** (unverändert) |
| Davon sonstige Treiber | required-renderer-orphans (geschätzt 0–10), `db_dupes` = 0, `section_missing` = 0 |
| Sind optionale Icon-/Bildslots sauber als Restschuld sichtbar? | **Ja.** Hauptbadge sagt jetzt „Restschuld" auch dann, wenn die alte DB-/Renderer-Ampel weiter „Rot" zeigt. Die zwei Badges sind klar getrennt: Schwereklasse oben, alte Ampel klein darunter. |
| Ist `product_showcase_list_v1` korrekt klassifiziert? | **Ja**, nach Ergänzung in `RENDERER_SLOT_MAP`. Kein Launch-Blocker mehr. |

## Reichweite

- Nur Wahrheits-Check + Klassifikation berührt.
- Keine Inhalts-, Layout-, Schema- oder Renderer-Änderung an der Website.
- Spiegel-Audits unverändert: Rot 0, Medium A 73, Medium B 33, Restschuld C 34.
- Stop nach diesem Schritt. Batch 4 (FAQ-/CTA-Orphans) noch nicht gestartet.
