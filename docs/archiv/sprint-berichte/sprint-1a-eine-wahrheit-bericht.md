# Sprint 1a — Vertrag wird Admin-Feldquelle (ohne RPC)

Stand: 2026-05-28

## Ziel

Der Admin zeigt pro Section jetzt die laut Section-Type-Vertrag erwarteten
Felder — nicht mehr nur die, die zufällig schon eine Zeile in
`cms_section_fields` haben. So sieht Redaktion sofort, was ein Block laut
Vertrag haben sollte, ohne dass im Hintergrund still Felder angelegt werden.

## Was sich geändert hat

- Neuer read-only Helper:
  `src/features/admin/lib/buildAdminFieldPlan.ts`
  → `buildAdminFieldPlanForSection({ sectionType, dbFieldKeys })`
  liefert pro Section eine Anzeige-Liste mit Quellen-Markierung
  (`contract`, `contract_alias`, `missing`, `legacy`, `dynamic`).

- `src/features/admin/components/PageEditor.tsx` zeigt Felder jetzt
  über diesen Plan. Reihenfolge: erst Vertrag (in Vertrag-Reihenfolge,
  inkl. „fehlt in DB"), dann Legacy/Dynamisch (alphabetisch).

## Wie das Bild aussieht

Jedes Feld trägt kleine Badges:

- `Vertrag` (grün) — im Section-Type-Vertrag definiert, DB-Zeile vorhanden.
- `Alias` (blau) — DB nutzt einen alten Alias-Namen statt des Vertrag-Namens.
  Wird **nicht** still umbenannt.
- `fehlt in DB` (amber) — laut Vertrag erwartet, in der DB (noch) nicht
  vorhanden. Wird hier **nicht** automatisch angelegt (keine RPC, keine
  Migration in dieser Etappe).
- `Legacy / nicht im Vertrag` (grau) — in der DB vorhanden, aber im
  Vertrag nicht erfasst. Bleibt sichtbar und pflegbar, solange die
  Whitelist dies erlaubt.
- `dynamisch` — Felder mit Mustern `items.*` / `features.*`, die der
  Vertrag dynamisch zulässt.
- `nicht speicherbar` (rot) — entweder fehlt die DB-Zeile oder die
  Whitelist (`cms_admin_editable_fields`) für dieses Feld. Der Admin
  bietet dann nur eine Leseansicht, kein stilles Speichern.

## Was sich nicht geändert hat

- **Schreibweg unverändert:** weiterhin ausschließlich
  `rpc_admin_update_section_field` über `saveSectionField`.
- **Whitelist unverändert:** keine neuen Einträge, keine Entfernungen.
- **Asset-Slots unverändert:** Bilder laufen weiter über
  `SectionAssetsBlock` / `AssetUploader`. `icon` bleibt Textfeld
  (Lucide-Name), Bild-Slots (`image`, `thumbnail`, …) bleiben Assets.
- **Public-Renderer/Routen/Navigation/Footer/i18n:** keine Änderungen.
- **Produktdatenbank:** nicht berührt.

## Akzeptanz

- Bekannte Section-Typen zeigen Vertragsfelder auch ohne DB-Zeile. ✅
- Bestehende Text-/Bildpflege bleibt möglich. ✅ (Whitelist + DB-Zeile
  vorhanden ⇒ EditableField wie bisher.)
- DB-Felder ohne Vertrag bleiben sichtbar, markiert als Legacy. ✅
- Felder ohne DB-Zeile oder ohne Whitelist werden nicht still gespeichert. ✅
  (EditableField bekommt `deEditable=enEditable=false` und rendert ReadOnly.)
- Keine Migration, keine neue RPC, keine Produktdatenbank, keine
  Whitelist-/Inhaltsänderungen. ✅

## Checks

- `npm run cms:audit:contract`: **15 OK · 2 Warn · 0 Konflikt**.
- `npm run build`: wird vom Harness automatisch ausgeführt; eine manuelle
  Ausführung ist in dieser Umgebung nicht vorgesehen und wurde daher
  bewusst nicht über Workarounds ersetzt.

## Nächste Etappe (Empfehlung)

`cms-light-eine-wahrheit-sprint-1b-contract-drift-audit-read-rpc-1`
— aggregiertes DB-Drift-Audit als Skript, ggf. mit einer Read-RPC, die
ohne service_role einen serverseitigen Vergleich zwischen Vertrag und
DB ermöglicht.
