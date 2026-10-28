# Sprint-Bericht: card_v1 Runtime-Parität — gemeinsame Karten-Matrix und Resolver-Wahrheit

Datum: 2026-06-03
Auslöser: B-538 (`card_pak`) zeigte gespeicherte `bullets.0`, `chips.0`,
`link_1_label` nicht öffentlich; Admin meldete „Links 0 von 3 aktiv",
obwohl Label gepflegt war (href fehlte).

## Ergebnis

- **Zentrale Container-Matrix** in `src/features/cms/lib/cardRuntimeMatrix.ts`.
- **Container-aware Resolver** `resolveCardRuntime` in
  `src/features/cms/lib/cardVisibility.ts` (Status: empty/unsupported/
  disabled/incomplete/active; Linkstatus mit `incomplete`-Differenzierung).
- **`ProductScrollerV1`** rendert jetzt bullets, chips, links 1..3
  passend zur Matrix.
- **Admin-Workspace** (`BildkartenCardWorkspace.tsx`):
  - Gruppen Bulletpoints/Chips/Links markieren „in diesem Layout nicht
    sichtbar", wenn der Container das Modul nicht rendert.
  - Link-Zähler differenziert nach `aktiv · unvollständig · befüllt`.
  - Pro Linkzeile Statusbadge mit Begründung.
- **Doku**: `docs/04-betrieb/card-v1-runtime-paritaet.md`.

## Auswirkung B-538

- `bullets.0` und `chips.0` sind nun öffentlich sichtbar
  (Scroller-Karte zeigt Liste und Chips).
- `link_1_label` ohne href wird im Admin korrekt als „unvollständig
  · Beschriftung vorhanden, Ziel fehlt" angezeigt und bleibt
  öffentlich aus (kein toter Link).
- Sobald `link_1_href` gesetzt ist, erscheint der Link öffentlich.

## Nicht geändert

- DB-Schema, Whitelist, RPCs.
- Produktdatenbank, Navigation, Footer, i18n.
- Audit-Skripte (`wahrheits-check-ci`, `renderer-audit` etc.) — der
  Wahrheits-Check arbeitet weiter auf den bisherigen Quellen. Die
  Matrix ist die Code-Grundlage, auf der der nächste Schritt
  („Matrix-aware Wahrheits-Check") aufsetzen kann.

## Nächste Schritte (optional)

1. `scripts/cms/wahrheits-check-ci.mjs` und `renderer-audit.mjs` auf
   die neue Matrix heben, damit die CI eine Matrix-Lücke rot meldet.
2. Andere Renderer (`CardsSectionV1`, `FeatureGridV1`) zusätzlich auf
   `resolveCardRuntime` umstellen, sobald deren Containerlogik einen
   neuen Modulwunsch (z. B. Links in `cards_v1.grid`) bringt.
