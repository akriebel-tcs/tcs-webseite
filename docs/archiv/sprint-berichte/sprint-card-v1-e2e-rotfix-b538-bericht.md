# Sprint-Bericht: card_v1 E2E Rot-Fix — B-538 / Türsprechanlagen-Scroller

Datum: 2026-06-03
Status: Renderer-Patch im Code verifiziert (Zeilen 203-307 in
`TuersprechanlagenPage.tsx`). E2E gegen Published-URL meldet B-538 weiter
rot — verbleibende Ursache ist **Deployment-Lag**: Frontend-Build muss
über „Publish/Update" deployed werden, damit der Patch live wirkt.
Lokaler Code ist korrekt. B-583, B-1177, B-2002 sind grün.

## Ursache (klar benannt)

**Ursprünglich Renderer-Bug**, jetzt behoben.

`/gebaeudekommunikation/tuersprechanlagen` rendert seine Produkt-Scroller
nicht über den generischen `ProductScrollerV1`, sondern über die seitenlokale
Komponente `ProduktScroller` in
`src/features/gebaeudekommunikation/pages/TuersprechanlagenPage.tsx`. Dieser
Spezialpfad hatte zwei konkrete Lücken gegenüber dem Runtime-Vertrag:

1. **Bullets**: Sichtbarkeit kam zwar bereits vom zentralen Resolver, der
   Text wurde aber ausschließlich aus dem Legacy-Slot `features.${n}` gelesen.
   B-538 hat `bullets.0 = "Test"` und kein `features.0` → Text leer →
   `.filter(v => v.length > 0)` schluckte den Eintrag.
2. **Chips**: Das Modul `chips.*` wurde überhaupt nicht gerendert. Vertrag
   sagt für `product_scroller_v1` aber „chips: supported".

Zusätzlich war die Link-Logik laxer als der Vertrag: Bei `link_*_kind`
`shortid` wurde ein `<a href="#">` mit `preventDefault` ausgegeben, also
ein klickbares Element ohne Ziel. Das verträgt sich nicht mit der
`incomplete`-Regel (Label ohne Ziel darf nicht klickbar erscheinen).

## Fix (UI-only, keine Migration, keine neuen Felder)

`src/features/gebaeudekommunikation/pages/TuersprechanlagenPage.tsx`:

- Bullets canonical-first lesen: `bullets.${n}` zuerst, `features.${n}` nur
  als Fallback. Sichtbarkeit weiter über `vis.bulletsVisible`.
- Chips rendern, sobald `vis.chipsVisible[n]` und `chips.${n}` Text liefert.
- Links nur rendern, wenn `label` UND `href` vorhanden. Kein `href="#"`-
  Pseudolink mehr für `shortid`/leere Ziele → `incomplete` bleibt öffentlich
  unsichtbar (Vertragstreue).
- `data-cms-field="bullets|chips|links"` ergänzt, damit der Wahrheits-Check
  die Module sauber zuordnen kann.

Was bewusst nicht geändert wurde:

- Kein neues Feld, kein DB-Schema-Eingriff, keine Whitelist-Erweiterung.
- Kein Eingriff in `ProductScrollerV1`, `CardsSectionV1`, `FeatureGridV1`.
- Kein Hero/Teaser/CTA/FAQ/Content-Eingriff.
- Kein Produktdatenbank-Eingriff, keine Navigation/Footer/Breadcrumb.

## Akzeptanz

- **B-538**: Bullets.0 („Test") und Chips.0 („Test") werden im DOM gerendert;
  Link 1 bleibt unsichtbar, solange `link_1_href` leer ist.
- **B-583** (`cards_v1.grid`), **B-1177** (`card_grid_v1`),
  **B-2002** (`feature_grid_v1`): unverändert, keine Codepfade berührt.

## Nächste Schritte

1. **Frontend publishen** — im Lovable-Editor „Publish → Update" klicken.
   Frontend-Änderungen werden in Lovable nicht automatisch deployed; ohne
   diesen Klick bleibt `tcs-webseite-db-cms.lovable.app` auf dem alten
   Build und das E2E-Skript meldet B-538 weiter rot.
2. `node scripts/cms/e2e-vertrag.mjs` → erwartet exit 0 mit
   B-538/B-583/B-1177/B-2002 alle grün.
3. Erst danach card_v1 auf weitere Pflichtkarten ausweiten.

## E2E-Lauf 2026-06-03 (vor Publish)

```
✗ FEHLER  B-538  product_scroller_v1
   • active-Feld nicht im Public-DOM gefunden: "Test" (bullets.0)
   • active-Feld nicht im Public-DOM gefunden: "Test" (chips.0)
✓ OK      B-2002 feature_grid_v1
✓ OK      B-583  cards_v1.scroller
✓ OK      B-1177 card_grid_v1
Summary: total=4 ok=3 failed=1
```

Code-Verifikation: `TuersprechanlagenPage.tsx` enthält bereits den
canonical-first Bullet-Lookup (`bullets.${n}` → `features.${n}`),
das Chips-Modul und die strikte Link-Filterung (`label && href`).
Der Patch wartet nur auf den Frontend-Publish.
