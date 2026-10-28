# Sprint-0 „Eine Wahrheit" — Redaktionssicherung & Audit

Stand: 2026-05-28
Etappe: `cms-light-eine-wahrheit-sprint-0-redaktionssicherung-und-audit-1`

## Zweck

Erste sichere Etappe des „Eine Wahrheit"-Umbaus. Inhalte und Strukturen
bleiben unverändert; der Section-Type-Vertrag wird sichtbar gemacht und
gefährliche Strukturaktionen werden vor Ausführung gewarnt. Redaktionelle
Text- und Bildpflege läuft unverändert weiter.

## Geänderte Dateien

Neu:
- `src/features/admin/lib/sectionContractStatus.ts` — Read-only Drift-Auswertung
  (Vertrag vs. DB-Felder vs. Whitelist vs. Asset-Slots vs. Parent-Regeln).
- `src/features/admin/components/SectionContractStatus.tsx` — kompaktes
  Statuspanel je Block (Badges + Hinweisliste).
- `src/features/admin/components/AdminHardeningNotice.tsx` — kleiner
  Hinweisstreifen über dem Arbeitsbereich (dismissbar pro Browser).

Erweitert:
- `src/features/admin/components/PageEditor.tsx` — rendert
  `<SectionContractStatus>` pro Block-Karte (Top-Level und Kinder).
- `src/features/admin/components/MasterDetailWorkbench.tsx`
  - `AdminHardeningNotice` über `ClipboardBanner` eingehängt.
  - `handlePasteFromClipboard` ruft vor `pasteSection` `evaluatePasteRisk(...)`
    auf und verlangt bei Vertragsverletzung eine bewusste Confirm-Bestätigung.
- `src/features/admin/components/NavigationTreeEditor.tsx`
  - Delete-Dialog zeigt eine Vertrags-/Strukturwarnung mit Anzahl der
    Kind-Blöcke, die mitgelöscht werden.

Nicht geändert: i18n-JSONs, öffentliche Routen, Navigation/Footer/Breadcrumb,
Renderer-Logik, Produktdatenbank, Migrationen, RPCs, Whitelist-Inhalte.

## Audits

- Bestehendes statisches Audit (`scripts/cms/contract-audit.mjs`) bleibt
  unverändert und prüft weiterhin Renderer-↔-Vertrag-Konsistenz in CI.
- Neue **Live-Drift-Anzeige direkt im Admin** über
  `evaluateSectionStatus(...)` — jede Section trägt ihre Drift-Diagnose
  selbst sichtbar, ohne separates Skript. Diese „In-Admin-Audit"-Variante
  wurde gewählt, weil Node-CI keinen DB-Zugriff hat und der Wrapper
  `cmsSupabase/client.ts` bewusst nur browserseitig läuft. Ein
  Node-Drift-Audit folgt in Sprint-1, wenn die RPC-Quelle steht.

## Sichtbare Status pro Block

Jeder Block zeigt jetzt einen Streifen „Vertrag &amp; Renderer (Sprint-0, nur
Diagnose)" mit Kombinationen aus:

- `Vertrag: erkannt` / `Vertrag: fehlt (<typ>)` / `Vertrag: unbekannt`
- `Renderer: generisch` / `Renderer: Spezial/Legacy` / `Renderer: bewusst übersprungen` / `Warnung: kein Renderer`
- `Warnung: N Feld(er) nicht im Vertrag` (DB-Felder ohne Vertragspartner)
- `Warnung: Pflichtfeld(er) fehlen`
- `Warnung: Bildslot(s) nicht im Vertrag`
- `Hinweis: N Whitelist-Feld(er) nicht im Vertrag`
- `Kindstruktur: OK` / `Kindstruktur: Warnung`

Texte und Bilder lassen sich weiterhin normal pflegen — das Statuspanel
blockiert nichts.

## Strukturaktionen

| Aktion | Verhalten in Sprint-0 |
|---|---|
| Block-Inhalt bearbeiten (Text/Bild) | unverändert, keine Warnung |
| Sichtbar ↔ ausgeblendet | unverändert |
| Verschieben (Pfeile) | unverändert |
| In Zwischenablage legen (⧉) | unverändert |
| **Einfügen aus Zwischenablage** | `evaluatePasteRisk` läuft vorab. Bei Vertragsverletzung (z. B. `card_v1` als Top-Level, Kind unter falschem Parent, unbekannter Typ) erscheint `window.confirm` mit Begründung; Abbruch verhindert den Schreibvorgang vollständig. Keine harte Blockade. |
| **Löschen eines Blocks** | Bestehender Eingabe-Confirm-Dialog bleibt; zusätzlich amber-Warnhinweis mit Anzahl Kind-Blöcke, die mitgelöscht werden. |
| Karten umbenennen | unverändert (serverseitig auf `card_v1` beschränkt). |

## Erkennbare Drift-Klassen (Sprint-0)

Die fünf größten Klassen, die `evaluateSectionStatus(...)` erkennen kann
und die in der Admin-UI jetzt sichtbar werden:

1. **`fields_unknown_to_contract`** — DB hat Feld, Vertrag kennt es nicht
   (typisch: Pilot-/Legacy-Feldnamen, FAQ-Items mit Sonderschema,
   Türsprechanlagen-Spezialfelder).
2. **`whitelist_unknown_to_contract`** — Freigabe-Eintrag ohne
   Vertragspartner (Whitelist ist breiter als Vertrag).
3. **`active_without_renderer`** — aktive Top-Level-Section ohne Renderer
   (Risiko: öffentlich unsichtbar trotz `is_active`).
4. **`asset_slot_unknown_to_contract`** — Bildslot in `cms_assets`, der im
   Vertrag nicht vorgesehen ist (z. B. Legacy `image_desktop/tablet/mobile`,
   `icon_image` an Stellen ohne Bildicon-Vertrag).
5. **`child_only_at_top_level` / `disallowed_parent`** — strukturelle
   Anomalien (Kind-Typ als Top-Level oder Karte unter falschem Container).

Die exakten Zahlen je Seite/Section werden im Admin live angezeigt; eine
aggregierte Tabelle folgt in Sprint-1 (`contract-drift-audit.mjs` via RPC).

## Akzeptanzkriterien — Status

- ✅ Keine Migration, keine neue RPC, keine Produktdatenbank-Berührung.
- ✅ Keine Inhalte, Bilder, i18n-JSONs, Whitelisten verändert.
- ✅ Öffentliche Website-Renderer, Routen, Navigation, Footer unverändert.
- ✅ Bestehende Text-/Bildpflege funktioniert wie vorher.
- ✅ Admin zeigt pro Block Vertrag-/Renderer-/Strukturstatus.
- ✅ Riskante Paste-/Delete-Aktionen sind nicht mehr still — sie verlangen
  bewusste Bestätigung mit Begründung.
- ✅ **Sprint-0-Finish:** Move/Parent-Änderungen (`onSectionSetParent` →
  `setSectionParent`) prüfen vor dem RPC-Aufruf
  `evaluateStructurePlacementRisk(...)` und verlangen bei Vertragsrisiko
  ein bewusstes Confirm. Paste und Move nutzen denselben Helper — keine
  zweite Wahrheit.
- ✅ Paste-Risiko erweitert: child-only als Top-Level, child-only unter
  falschem Parent, Top-Level-only unter Parent, `allowed_children`-
  Whitelist verletzt, Ziel-Parent ohne Vertrag — alle Fälle warnen.
- ✅ `npm run cms:audit:contract`: 15 OK · 2 Warn · 0 Konflikt (Stand
  Sprint-0-Finish).
- ⚠ `npm run build` in dieser Etappe nicht ausgeführt. Lovable-Tooling
  überlässt Builds dem Harness; ein manueller Build-Lauf wurde bewusst
  nicht angestoßen. Statisches Contract-Audit ist grün, neue Logik nutzt
  ausschließlich vorhandene Typen (`SectionRow`, Contract-Helpers,
  `normalizeType`, `getContract`).

## Empfohlene nächste Etappe

`cms-light-eine-wahrheit-sprint-1-vertrag-admin-feldquelle-1`

- Admin-Feldliste je Block aus dem Vertrag generieren (statt aus
  DB-Vorkommen + Whitelist), DB/Whitelist nur noch als Diagnose-Overlay.
- `contract-drift-audit.mjs` als Node-Skript via dediziertem
  `rpc_admin_export_contract_drift()` (read-only, ohne `service_role`).
- Engerer Vertrag für `tabs_v1.allowed_children` und Container-Slots.
