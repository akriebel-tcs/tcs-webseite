# `card_v1` — Bulletpoints und Chips (Semantik-Referenz)

Stand 2026-06-03 nach Sprint „Kartenmodell Semantik — Bulletpoints und Chips trennen".

## Worum es geht

In `card_v1`-Standardkarten gibt es ab jetzt **zwei semantisch getrennte
Module** für kurze Stichpunkte:

| Modul | Felder | Sichtbarkeits-Toggle | Darstellung | Admin-Bereich |
|---|---|---|---|---|
| **Bulletpoints** | `bullets.0` … `bullets.4` | `bullets_0_enabled` … `bullets_4_enabled` | echte Bullet-Liste mit Anstrich (Punkt) unter der Beschreibung | „Bulletpoints" |
| **Chips / Merkmale** | `chips.0` … `chips.4` | `chips_0_enabled` … `chips_4_enabled` | kleine graue Pillen / Tags | „Chips / Merkmale" |

Beide sind unabhängig. Eine Karte kann nur Bulletpoints, nur Chips, beides
oder gar nichts haben.

## Legacy: `features.*`

`features.0` … `features.4` und `features_N_enabled` sind ab sofort
**Legacy/Fallback** für Bulletpoints. Sie werden nicht gelöscht.

| Regel | Verhalten |
|---|---|
| `bullets.N` gefüllt | Renderer zeigt `bullets.N`. |
| `bullets.N` leer, `features.N` gefüllt | Renderer zeigt `features.N` als Fallback. Admin zeigt einen kleinen Hinweis „Legacy-Wert aus `features.N` wird angezeigt, bis dieses Feld gefüllt ist." |
| beides gefüllt und gleich | OK. |
| beides gefüllt, unterschiedlich | `bullets.N` gewinnt im Renderer, `features.N` bleibt unangetastet (kein Datenverlust, im Sprintbericht protokollierbar). |
| mehr als 5 `features.*` (z. B. `features.5`, `features.6`) | werden nicht in Bulletpoints überführt, bleiben als Legacy stehen und werden nicht gerendert. |

## Canonical-first Leselogik (Renderer)

```ts
// CardsSectionV1, CmsProductSolutionShell
const text = cf(ctx, key, `bullets.${i}`) || cf(ctx, key, `features.${i}`);
```

Im zentralen Resolver `cardVisibility.ts` ist die Wahrheit gebündelt:

```ts
const textBullet = readBoth(v, `bullets.${i}`);
const textLegacy = readBoth(v, `features.${i}`);
const text = textBullet.length > 0 ? textBullet : textLegacy;
const rawBulletEnabled = readBoth(v, `bullets_${i}_enabled`);
const enabled = rawBulletEnabled === ""
  ? readBool(v, `features_${i}_enabled`, true)
  : rawBulletEnabled === "1";
bulletsVisible.push(text.length > 0 && enabled);
```

`featuresVisible` ist nur noch ein Alias auf `bulletsVisible` — bestehende
Renderer brechen damit nicht.

## Admin-Workspace

- Bereich **„Bulletpoints"** schreibt `bullets.N` / `bullets_N_enabled`.
- Bereich **„Chips / Merkmale"** schreibt `chips.N` / `chips_N_enabled`.
- Der frühere Bereich „Features" ist entfallen. Falls in einer Karte nur
  Legacy-`features.*` existiert, zeigt der Bulletpoint-Eintrag den Inhalt
  als Hinweis an, bis die Redaktion ihn übernimmt.

## Whitelist

Pro aktiver `card_v1`-Section sind in DE+EN freigeschaltet:

- `bullets.0` … `bullets.4`
- `bullets_0_enabled` … `bullets_4_enabled`
- `chips.0` … `chips.4`
- `chips_0_enabled` … `chips_4_enabled`

Default-Leerzeilen sind in `cms_section_fields` für alle aktiven Karten
angelegt, damit der Workspace die Felder sofort anzeigt.

## Konflikt- und Sonderfälle (Sprintlauf 2026-06-03)

- Aktive `card_v1`-Sections: **701**
- Karten mit `features.*`-Inhalt (vor Migration): **29**
- Backfill `features.N` → `bullets.N` (DE+EN-Zeilen): **262**
- Inhaltliche Konflikte (`features.N` ≠ `bullets.N`): **0** — `bullets.*`
  war vor der Migration komplett leer.
- Karten mit `chips.*`-Inhalt: **0** (Modul neu eingeführt, keine
  redaktionelle Pflege bisher).
- `features.5`/`features.6`/`features.7`-Restfälle (2 Karten): bleiben als
  Legacy stehen, werden nicht gerendert.

## Was sich für die öffentliche Website ändert

Nichts sichtbar, solange keine `chips.*` gepflegt sind. Die heutigen
Bullet-Listen erscheinen optisch identisch — die Quelle ist jetzt nur
canonical-first `bullets.*` statt direkt `features.*`.
