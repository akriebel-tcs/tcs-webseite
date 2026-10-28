# Standard-Karte (`card_v1`) — Admin-Presets & sichere Seedings

Stand: 2026-06-01
Sprint: `cms-light-standardkarte-admin-presets-und-sichere-seedings-1`
Modus: UI-Sichtbarmachung + Dokumentation. Keine Inhalts-, Whitelist-,
DB- oder Renderer-Änderung.

## 1. Leitregel

- **Container** (z. B. `cards_v1`, `feature_grid_v1`, `product_scroller_v1`,
  `card_grid_v1`, `download_list_v1`) bestimmt das **Layout** auf der Seite.
- **Karte** (`card_v1`) bestimmt den **Inhalt**.
- **Preset** (`image_card`, `thumbnail_card`, `icon_card_lucide`,
  `icon_card_image`, `multi_link_card`, `text_card`, `download_card`)
  bestimmt die **Bedienform im Admin**.

Das Preset ist heute **keine eigene DB-Spalte**. Es wird aus
Parent-Container, Asset-Slot und vorhandenen Feldern abgeleitet
(`detectCardVariant` in `src/features/cms/contract/sectionTypes.ts`).
Ein Wechsel verlangt echte Inhalts-Arbeit (anderer Container oder
anderes Asset) — kein stiller Admin-Toggle.

## 2. Bestehendes Bildkarten-Arbeitsmodell (Pilot, Bestandsaufnahme)

`BildkartenCardWorkspace.tsx` ist der vorhandene Pilot-Arbeitsbereich für
die `card_v1`-Bildkarten unter den Scrollern **B-026 „Außenstationen"**
und **B-027 „Innenstationen"** auf der Seite
`gebaeudekommunikation.tuersprechanlagen`.

Eigenschaften, die als Muster taugen:

- klare Trennung **Grunddaten · Medien · Features · Links · Technisch**
- Akkordeon/Ein- und Ausklappen über `cardFieldGroups.ts`
  (`groupBildkartenFields`)
- DE/EN-Sprachenpaare bleiben pro Feld zusammen
- Asset-Slot läuft über bestehenden `AssetUploader` / Section-Assets-Block
- Toggles (`*_enabled`) werden nur gezeigt, wenn DB-Zeile + Whitelist da sind
- nicht klassifizierte Felder landen in `tech` (eingeklappt) — nichts wird
  versteckt oder still gelöscht

Heute Sonderlogik (nicht allgemein):

- harter Pilot-Filter auf Page-Key und zwei Parent-Section-Keys
- Ausblenden der Slots `thumbnail` und `icon_image`
  (für eine Bildkarte korrekt, aber für andere Presets falsch)
- feste Container-Labels „Außenstationen" / „Innenstationen"

Daraus folgt für den nächsten Vollausbau-Sprint: Gruppierungs-Helper
verallgemeinern auf alle Presets, Slot-Filter pro Preset aus
`CARD_V1_VARIANTS.asset_slots` ableiten, Pilot-Filter entfernen.

## 3. Was in diesem Sprint im Admin neu sichtbar wird

Neue Komponente: `src/features/admin/components/CardPresetBadge.tsx`.

Sie hängt im `PageEditor` direkt unter `SectionContractStatus` und nur bei
`section_type === "card_v1"`. Sie zeigt **read-only**:

- erkannte Kartenart (Label + `variant_key`)
- Parent-Container (Section-Type)
- Konfidenz der Erkennung (sicher / wahrscheinlich / heuristisch) mit
  Begründung
- aufklappbares Glossar aller sieben Standard-Presets
- Hinweis-Satz zur Leitregel (Container/Karte/Preset)

Sie schreibt nichts, ändert nichts an der DB, am Vertrag oder an der
Whitelist. Der bestehende Feldplan und alle Pflege-Wege bleiben
unverändert; `buildAdminFieldPlanForSection` nutzt `detectCardVariant`
weiterhin bereits intern (Sprint 2l), das ist also keine neue
Datenquelle, sondern derselbe Mechanismus jetzt **sichtbar gemacht**.

## 4. Akkordeon-/Gruppen-Logik für `card_v1` (vorbereitet, nicht umgesetzt)

Vorschlag für `cms-light-standardkarte-admin-arbeitsbereich-vollausbau-1`:

| Gruppe | Felder | Quelle |
|---|---|---|
| Grunddaten | `eyebrow`/`subtitle`, `title`/`headline`, `description`/`text` | Vertrag + Aliase |
| Medien | `image`, `thumbnail`, `icon_image` | Asset-Slots aus `variant.asset_slots` |
| Icon | `icon` (Lucide-Name) | nur `icon_card_lucide` |
| Features | `features.0..4` | nur Icon-Karten |
| Links | `cta_label`, `cta_href`, `href`, `link_1..3_*` | je nach Preset |
| Darstellung | alle `*_enabled` | je nach DB-Bestand |
| Technisch / Legacy | Aliase, Felder nicht im Vertrag, nicht speicherbar | Plan-Klassifikation |

Bereits vorhandener Helper als Startpunkt:
`src/features/admin/lib/cardFieldGroups.ts` (`groupBildkartenFields`).
Vollausbau heißt: Helper auf Preset-Variante umstellen, im
`PageEditor` als allgemeiner `card_v1`-Renderer einsetzen,
`BildkartenCardWorkspace` daraus speisen.

## 5. Toggle-Felder (`*_enabled`) — Status

Mögliche Toggles: `eyebrow_enabled`, `image_enabled`, `icon_enabled`,
`features_0_enabled`..`features_4_enabled`, `link_1_enabled`..`link_3_enabled`.

- Im Vertrag (`sectionTypes.ts`) als `technical_fields` führbar, aber
  **nicht in `card_v1` als Pflichtfeld** verlangt — Aufnahme erst,
  wenn Renderer + Whitelist gemeinsam nachgezogen sind.
- Im Admin werden vorhandene Toggle-Zeilen über den bestehenden
  Feldplan + `EditableField` angezeigt; ohne DB-Zeile + Whitelist
  werden sie **nicht** stillschweigend angelegt.
- Wirkung auf den Public-Renderer: nur dort, wo der Renderer
  ausdrücklich darauf liest (heute Pilot-Bildkarten unter B-026/B-027).
- Empfehlung: kein flächendeckendes Seeding in diesem Sprint —
  Toggles sind nur dann sinnvoll, wenn der Renderer der jeweiligen
  Card-Variante sie tatsächlich auswertet.

## 6. Sichere Seedings — Befund (keine Anwendung)

Datengrundlage: `npm run cms:audit:d3-d5-triage` vom 2026-06-01
(D3=2004, D5=2000; Klassen S5 256 · S3 1541 · S4 88 · S2 38 · S1 5 · S7 76/72).

| Tranche | Umfang | Eingriff | Public-Risiko | Entscheidung |
|---|---|---|---|---|
| **S1** | `card_v1.description` auf 1 Page / 5 Sections | DB-Zeile + Whitelist | sehr gering (leere DE/EN, Renderer hat Fallback) | **als Dry-Run bereit**, Anwendung erst nach Preset-Badge-Review |
| **S2** | Container-Header-Felder (`eyebrow`/`title`/`description`) ~38 Felder | nur Whitelist (DB-Zeilen existieren teils) | gering, sofern Werte leer bleiben | **als Dry-Run bereit**, Anwendung pro Container-Klasse einzeln |
| S3 | 1541 Felder, gemischte Kontexte | groß, heterogen | mittel — Inhalts-/Renderer-Wirkung möglich | **nicht in diesem Sprint** |
| S4 | 88 Felder, Spezialfälle | klein, aber heterogen | mittel | **nicht in diesem Sprint** |
| S5 | 256 Felder, i18n-/Custom-Renderer | sehr heterogen | hoch | **nicht in diesem Sprint** |
| S7 | 72–76 Felder, Owner-Risiko | klären | hoch | **nicht in diesem Sprint** |

In diesem Sprint **wurde nichts geseedet**. Begründung: zuerst soll der
Preset-Badge in der Redaktion ankommen, damit ein S1-Pilot in einem
sichtbaren, verständlichen Kontext erfolgt. Das vermeidet
„Whitelist-Phantome" ohne erkennbare Karte im Admin.

Wenn der S1-Pilot später erfolgt, gilt:

- idempotent (kein `INSERT` ohne `ON CONFLICT DO NOTHING`-Äquivalent)
- nur leere DE/EN-Werte; bestehende Werte werden nie überschrieben
- nur über bestehende `rpc_admin_*`-Schreibwege bzw. Migration
- vor und nach dem Seed: `npm run cms:audit:contract-drift` zum Beweis,
  dass D1=0 bleibt und keine neuen Konflikte entstehen
- vollständiger Eintrag in `docs/04-betrieb/`

## 7. Audit-Lage 2026-06-01

| Audit | Ergebnis |
|---|---|
| `cms:audit:contract` | 15 OK · 7 Warnung · 0 Konflikt (unverändert) |
| `cms:audit:contract-drift` | D1 0 · D2 2649 · D3 3502 · D4 3074 · D5 3416 · D6 184 · D7 0 · D8 0 · D9 25 · D10 28 · D0 5 |
| `cms:audit:d3-d5-triage` | D3 2004 · D5 2000 (Klassenverteilung unverändert) |
| `cms:audit:renderer-fallback-inventory` | 82 Pages: S2 19 · S1 54 · G0 2 · G1 4 · S3 2 · P1 1 (20 medium · 59 low · 2 high · 1 kein CMS-Ziel) |

`npm run build` wurde nicht manuell ausgeführt (Lovable-Harness baut
automatisch).

## 8. Geänderte Dateien

- **neu:** `src/features/admin/components/CardPresetBadge.tsx`
- **geändert:** `src/features/admin/components/PageEditor.tsx`
  (Import + bedingter Render unter `SectionContractStatus`)
- **neu:** `docs/04-betrieb/standardkarte-admin-presets-und-sichere-seedings.md` (dieses Dokument)
- **geändert:** `docs/current-status.md` (neuer Sprint-Block oben)

## 9. Nicht-Änderungen (Scope-Treue)

- keine DB-Änderung
- keine Migration
- keine neue RPC, kein neuer Schreibweg
- keine Inhalte, Bilder oder Feldwerte geändert
- keine Whitelist-Einträge angelegt, gelöscht oder deaktiviert
- keine i18n-Dateien geändert
- keine Public-Renderer-/Routen-/Navigation-/Footer-/Breadcrumb-Änderung
- keine Produktdatenbank berührt
- keine Kontakt-/Download-/News-/Karriere-Migration angewendet
- keine neue Section-Type-Familie für Kartenvarianten

## 10. Empfohlene nächste Etappe

`cms-light-standardkarte-admin-arbeitsbereich-vollausbau-1`

- `cardFieldGroups.ts` von „nur Bildkarte" auf alle sieben Presets
  verallgemeinern (Asset-Slot-Filter aus `variant.asset_slots`)
- Pilot-Filter in `BildkartenCardWorkspace` entfernen und Komponente
  zu einem generellen `CardWorkspace` umbauen
- danach S1-Mini-Seeding (`card_v1.description`, 5 Sections) **mit**
  idempotenter Migration und Drift-Audit davor/danach
