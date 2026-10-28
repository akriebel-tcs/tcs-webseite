# Standardkarte — Admin-Arbeitsbereich Vollausbau

Etappe `cms-light-standardkarte-admin-arbeitsbereich-vollausbau-1`.
Stand: 2026-06-01. Scope: nur Admin-UI für `card_v1`. Keine DB-, Migrations-,
RPC-, Whitelist-, i18n- oder Public-Renderer-Änderung.

## Ziel

Der Admin-Pflegebereich für `card_v1` ist jetzt ein allgemeiner, übersichtlicher
Karten-Arbeitsbereich mit Akkordeon-Gruppen. Die Pilotlogik für Bildkarten
(`BildkartenCardWorkspace` auf `gebaeudekommunikation.tuersprechanlagen`,
Container B-026/B-027) bleibt unverändert — sie ist Vorbild, nicht Vorlage zum
Kopieren ihrer Sonderannahmen.

## Was sich geändert hat

### Neue Dateien
- `src/features/admin/lib/cardFieldsWorkspaceGroups.ts`
  - Definiert die 6 Anzeigegruppen für `card_v1`-Felder und die Funktion
    `classifyCardFieldKey(fieldKey)`.
  - Liefert per `presetHintForGroup` einen kurzen Hinweistext pro
    Preset/Gruppe (z. B. „Thumbnail-Karte: Slot `thumbnail` ist relevant").
  - Versteckt nie ein vorhandenes DB-Feld — Unbekanntes landet in
    „Technisch / Legacy" und bleibt sichtbar.
- `src/features/admin/components/CardFieldsWorkspace.tsx`
  - Reine Anzeigeschicht (kein Schreibweg).
  - Bekommt die fertigen `AdminFieldPlanEntry[]` aus
    `buildAdminFieldPlanForSection` und rendert pro Eintrag exakt das, was
    der Aufrufer in `renderEntry` übergibt → die bestehende
    `EditableField`-/Whitelist-/Speicherbarkeitslogik bleibt 1:1 erhalten.
  - Akkordeon (Radix) mit Default-Aufklapp-Verhalten: Gruppen mit Inhalt
    oder Warnungen sind offen; „Technisch / Legacy" ist standardmäßig zu,
    außer es enthält Warnungen.
  - Pro Gruppe: Feldanzahl + „n Hinweis"-Badge, wenn Einträge mit
    „fehlt in DB" oder „nicht speicherbar" vorhanden sind.

### Geänderte Dateien
- `src/features/admin/components/PageEditor.tsx`
  - Per-Entry-JSX (Badges, FreigabeSwitch, EditableField) in eine lokale
    `renderEntry`-Closure extrahiert.
  - Für `grp.section_type === "card_v1"` (außerhalb des Bildkarten-Pilots,
    der davor schon abgefangen wird) wird der neue
    `CardFieldsWorkspace` verwendet statt der flachen `divide-y`-Liste.
  - Alle anderen Section-Typen bleiben exakt wie vorher inkl.
    „technische Felder einblenden"-Toggle.
  - `CardPresetBadge` und `SectionContractStatus` werden weiter oben
    gerendert und bleiben sichtbar.
- Doku: `docs/current-status.md` und dieses Dokument.

### Nicht geändert
- Keine DB-Spalte, kein RPC, keine Migration, keine Whitelist, keine
  i18n-JSON, keine Public-Renderer/Routen/Navigation/Footer/Breadcrumb,
  keine Produktdatenbank.
- `BildkartenCardWorkspace`, `cardFieldGroups.ts`, `CardPresetBadge`,
  `EditableField`, `AssetUploader`, `SectionAssetsBlock`, `sectionTypes.ts`
  bleiben unverändert.

## Gruppenlogik (allgemein, für jede `card_v1`)

| Gruppe | Inhalt (Field-Keys) |
|---|---|
| **Grunddaten** | `eyebrow`, `label`, `kicker`, `subtitle`, `subheadline`, `subline`, `title`, `headline`, `intro`, `lead`, `text`, `description`, `beschreibung`, `desc`, `body` |
| **Medien & Icon** | Textfeld `icon` (Lucide). Bildslots (`image`/`thumbnail`/`icon_image`) laufen weiter über `SectionAssetsBlock` weiter unten. |
| **Sichtbarkeit (Toggles)** | Alles auf `*_enabled` (z. B. `eyebrow_enabled`, `features_0_enabled`, `link_1_enabled`) |
| **Features (Aufzählung)** | `features.0` – `features.4` |
| **Links / CTA** | `cta_label`, `cta_href`, `cta_link`, `href`, `link_1_*` – `link_3_*`, `items.N.href` |
| **Technisch / Legacy** | Aliase, Legacy-Felder, fehlende Vertragsfelder, alles nicht klassifizierte |

Vorhandene DB-Felder werden nie versteckt. „Fehlt in DB" (Vertrag erwartet)
wird preset-spezifisch über `isCardFieldExpectedForVariant` aus
`buildAdminFieldPlan` gefiltert — wie bisher.

## Preset-spezifische Hinweise

Pro Gruppe blendet `presetHintForGroup` einen kurzen Hinweistext ein. Auswahl:

| Preset | Hinweis |
|---|---|
| `image_card` | Medien: Slot `image` relevant. Features/Multi-Links nur, wenn vorhanden. |
| `thumbnail_card` | Medien: `thumbnail` relevant — `image` wird hier nicht gelesen. |
| `icon_card_lucide` | Medien: Textfeld `icon` Pflicht; `icon_image` nicht genutzt. |
| `icon_card_image` | Medien: Slot `icon_image` Pflicht; Lucide-`icon` nicht genutzt. |
| `multi_link_card` | Links: mehrere Link-Ziele (link_1 – link_3). |
| `text_card` | Medien optional. |
| `download_card` | Links: `cta_href` ist der Dateilink. Keine Bild-/Icon-Slots. |

Die Hinweise sind rein informativ. Sie ändern nicht, welche Felder sichtbar sind.

## Asset-Slots

Werden weiterhin durch `SectionAssetsBlock` gerendert (Asset-Slot-UI bleibt
unverändert). Die Bildkarten-Pilotlogik mit der harten Ausblendung von
`thumbnail`/`icon_image` ist **nicht** in den neuen `CardFieldsWorkspace`
übernommen worden — Slots werden je Karte gezeigt, wie sie real existieren.

## Legacy / Alias

Felder wie `headline`, `beschreibung`, `subtitle` bleiben sichtbar und
pflegbar (sofern DB-Zeile + Whitelist vorhanden). Sie werden über das
bestehende `Alias`-Badge im `renderEntry` markiert und nicht automatisch
umbenannt.

## Bildkarten-Pilot

Der Pilot-Pfad in `PageEditor.tsx` (Page `gebaeudekommunikation.tuersprechanlagen`,
Container `aussenstationen`/`innenstationen`) ist **vor** der neuen
`card_v1`-Verzweigung wirksam. Pilotkarten B-538/B-539/B-540/B-2195 laufen
also weiter über `BildkartenCardWorkspace`. Andere `card_v1`-Sections (Hub-
Teaser, Thumbnail-, Icon-, Text-, Multi-Link-, Download-Karten) nutzen den
neuen `CardFieldsWorkspace`.

## Speicherwege

Unverändert. `EditableField` rendert nur dann editierbar, wenn DB-Zeile +
Whitelist vorhanden sind. Fehlende DB-Zeilen werden nicht still angelegt;
fehlende Whitelist verhindert Speichern. „Nicht speicherbar" bleibt als
rotes Badge sichtbar.

## Keine Seedings in dieser Etappe

Dokumentiert, aber nicht ausgeführt:

- S1-Seeding für Whitelist von `card_v1`-Basisfeldern (`title`,
  `description`) auf Karten ohne EN-Eintrag → bleibt für Sprint
  `cms-light-standardkarte-sichere-seedings-und-preset-review-1`.
- S2-Seeding für preset-spezifische Vertragsfelder (z. B.
  `link_1_label`/`link_1_href` an erkannten `multi_link_card`-Karten) →
  bleibt für denselben Sprint, mit vorheriger Preset-Review.
- Spätere Felder (Tags, Feature-Toggle), Kontakt-/Download-/News-/Karriere-
  Migration: bleiben außerhalb dieses Sprints.

## Audit-Ergebnis (Stand 2026-06-01)

- `cms:audit:contract` → 15 OK · 7 Warnung · 0 Konflikt.
- `cms:audit:contract-drift` → unverändert (kein neuer Drift durch UI-Etappe).
- `cms:audit:d3-d5-triage` → D3=2004 · D5=2000 (unverändert).
- `cms:audit:renderer-fallback-inventory` → 82 Seiten · Klassen
  G0:2 · G1:4 · S1:54 · S2:19 · S3:2 · P1:1.
- TypeScript: `tsc --noEmit` → grün.

## Bestätigung

- Keine DB-Änderung.
- Keine Migration.
- Keine neue RPC.
- Keine Inhalte/Bilder/Feldwerte geändert.
- Keine Whitelist geändert.
- Keine i18n-Dateien geändert.
- Keine Public-Renderer-/Routen-/Navigation-/Footer-/Breadcrumb-Änderung.
- Keine Produktdatenbank berührt.

## Empfehlung nächste Etappe

`cms-light-standardkarte-sichere-seedings-und-preset-review-1` — auf Basis
des neuen Arbeitsbereichs eine kleine, kontrollierte Preset-Review pro
Container fahren (Stichprobe ≤ 10 Karten) und nur dann S1-/S2-Seedings
ableiten, wenn das Preset für die Karte eindeutig ist.
