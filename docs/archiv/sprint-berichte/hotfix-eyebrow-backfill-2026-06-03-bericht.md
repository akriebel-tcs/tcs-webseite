# Hotfix: Eyebrow-Backfill für Standardkarten

Datum: 2026-06-03 · Auslöser: Rückmeldung Thomas zu `card_aluminium` (B-1096), Eyebrow DE leer.

## Befund

Nach dem Sprint „Kartenmodell vereinheitlichen" lag in 9 Karten-Zeilen der Eyebrow-Text noch in einem Alt-Feld statt im kanonischen `eyebrow`:

| Alt-Feld | DE | EN | Karten |
|---|---|---|---|
| `subtitle` | 1 | 0 | `card_aluminium` |
| `label` | 4 | 4 | `card_bidi`, `card_concierge`, `card_feuerwehr`, `card_intern` (alle auf `gebaeudekommunikation.systemloesungen`) |

Ursache: Die ursprüngliche Backfill-Migration berücksichtigte nur `subtitle` als Eyebrow-Alias, nicht `label`/`kicker`/`subline`. Die eine fehlende `subtitle`→`eyebrow`-Zeile bei `card_aluminium` ist vermutlich entstanden, weil `subtitle.de` erst nach dem Migrationslauf gesetzt wurde.

## Maßnahme

Idempotente Hotfix-Migration `20260603082736_*.sql`:
- Kopiert `subtitle | kicker | label | subline` → `eyebrow` für alle aktiven `card_v1`-Sections in DE+EN.
- Nur wenn `eyebrow` aktuell leer ist (kein Überschreiben).
- Ergebnis: 9 Zeilen geschrieben. Erneuter Lauf = 0 Zeilen.

## Verifikation

- `card_aluminium`: `eyebrow.de = "Geschliffen, gestrahlt und eloxiert"`, `eyebrow.en = "Ground, blasted and anodised"`.
- 4 × `card_bidi`/`card_concierge`/`card_feuerwehr`/`card_intern`: Eyebrow DE+EN gesetzt.
- Public-Renderer (`CardsSectionV1`, `ProductScrollerV1`) liest seit dem Vereinheitlichungs-Sprint canonical-first → keine sichtbare Veränderung erwartet, weil der Eyebrow vorher schon über die Alias-Fallback-Kette gerendert wurde. Admin zeigt jetzt aber dieselbe Wahrheit.

## Hinweis zu „Bullet Points als zusätzlicher Bereich"

Die Bulletpoints unter dem Beschreibungstext (z. B. „Werkstoff AlMg1", „Dekorativ farbige Oberflächenveredelung" bei `card_aluminium`) sind **bereits jetzt** als eigener Bereich im Karten-Workspace pflegbar:

- Akkordeon **„FEATURES · N VON 5 AKTIV"** im Bildkarten-Workspace.
- Felder `features.0` … `features.4` (Text DE/EN) plus Sichtbarkeits-Toggle `features_N_enabled`.
- Werden vom öffentlichen Renderer `CardsSectionV1` als Liste unter der Beschreibung angezeigt.

Kein zusätzlicher DB- oder Renderer-Schritt nötig — der Bereich war im Screenshot nur zugeklappt.
