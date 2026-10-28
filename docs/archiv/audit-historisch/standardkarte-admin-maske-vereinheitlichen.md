# Standardkarte — Admin-Maske vereinheitlichen

Etappe `cms-light-standardkarte-admin-maske-vereinheitlichen-1`.
Stand: 2026-06-01. Scope: **UI-only**. Keine DB-, Migrations-, RPC-,
Whitelist-, i18n-, Public-Renderer- oder Produktdatenbank-Änderung.
Keine Inhalts-, Bild- oder Feldwert-Änderung. Keine Seedings.

## A. Kurzfazit

Standardkarten (`card_v1`) sind im Admin jetzt nicht nur gleich benannt,
sondern auch gleich bedienbar. Der allgemeine `CardFieldsWorkspace` zeigt
für jede Karte dieselben sechs Akkordeon-Gruppen in derselben Reihenfolge
(Grunddaten → Medien → Sichtbarkeit → Features → Links/CTA →
Technisch/Legacy), beschriftet den darüberliegenden Container redaktionell
(Kartenraster / Kartenscroller / Hub-Raster / Feature-/Icon-Raster / …)
und erklärt im Medien-Akkordeon, welcher Bild-/Icon-Slot im jeweiligen
Container überhaupt wirksam ist.

Die Pilot-Bildkartenmaske (B-538/B-539/B-540/B-2195 unter B-026/B-027 auf
`gebaeudekommunikation.tuersprechanlagen`) bleibt 1:1 erhalten — sie ist
weiterhin das *Bedienmuster*, aus dem die allgemeine Maske ihren Aufbau
ableitet, ohne deren harte Türsprechanlagen-Sonderlogik zu kopieren.

Zusätzlich zeigt der Baum bei jedem Block einen redaktionellen
Parent-Hinweis („Teil von Kartenraster B-082" statt nur „Teil von
products").

## B. Pilot-Maske vs. allgemeine Standardkarten-Maske

| Aspekt | Pilot `BildkartenCardWorkspace` (B-538 …) | Allgemeiner `CardFieldsWorkspace` |
|---|---|---|
| Akkordeon-Aufbau | 6 Gruppen, klare Reihenfolge, eingeklappte Tech-Gruppe | **übernommen**: 6 redaktionelle Gruppen in fester Reihenfolge |
| Speicherweg | `saveSectionField` (RPC) direkt | unverändert über `EditableField` / RPC (kein Schreibweg geändert) |
| DE/EN-Pflege | kompakt nebeneinander, pro Sprache Whitelist-Switch | unverändert über `EditableField` |
| Sichtbarkeit von Feldern | Slots `thumbnail`/`icon_image` werden hart ausgeblendet (Pilot-Annahme) | **nicht übernommen** — Slots werden nicht global versteckt, weil andere Karten sie real nutzen |
| Container-Annahme | hart auf `aussenstationen` / `innenstationen` | **nicht übernommen** — Container kommt aus `parentSectionType` |
| Container-Hinweise | implizit (Pilot weiß, dass es ein Scroller ist) | **explizit** über `containerHintFor(parentSectionType)` |
| Empty-State-Hinweise pro Gruppe | nein (Pilot zeigt nur Inhalte) | **neu** — leere Gruppen werden mit kurzem Hinweis sichtbar gelassen (Redaktion sieht, dass das Modul existiert, aber leer ist) |

**Übernommen aus dem Pilot:** Gruppenreihenfolge, Akkordeon-Verhalten,
Trennung sichtbarer Inhalte vom Technik-/Legacy-Bereich, redaktionell
verständliche Gruppentitel.

**Bewusst nicht übernommen:** harte Slot-Ausblendung, Türsprechanlagen-
Sonderfelder (`link_N_kind`, Default-Icon `shield-check`), Renderer-
spezifische Speicherlogik (Pilot schreibt eigene Toggle-Felder direkt).

## C. Einheitliche Gruppen / Reihenfolge

Für jede `card_v1` (außerhalb des Pilot-Pfads):

1. **Grunddaten** — `eyebrow` / `label` / `kicker` / `subtitle` /
   `subheadline` / `subline` / `title` / `headline` / `intro` / `lead` /
   `text` / `description` / `beschreibung` / `desc` / `body`.
2. **Medien & Icon** — Lucide-`icon`-Textfeld; Bild-/Thumbnail-/Bildicon-
   Slots werden weiter unten als Asset-Slots gepflegt. Containerabhängiger
   Slot-Hinweis (siehe D).
3. **Sichtbarkeit (Toggles)** — alle `*_enabled`-Felder.
4. **Features** — `features.0` – `features.4`.
5. **Links / CTA** — `cta_label` / `cta_href` / `cta_link` / `href` /
   `link_1_*` – `link_3_*` / `items.N.href`.
6. **Technisch / Legacy** — Aliase, nicht-im-Vertrag-Felder,
   nicht-speicherbare Felder. Standardmäßig zugeklappt; sichtbar erst,
   wenn Inhalte vorhanden sind.

Leere Gruppen 1–5 bleiben sichtbar mit Empty-State-Text
(`emptyGroupHint`), z. B. „Für diese Karte sind noch keine Sichtbarkeits-
Schalter angelegt." Gruppe 6 (Technisch) wird nur gezeigt, wenn sie
Inhalte hat.

## D. Container-/Medien-Hinweise

Im Workspace-Header und im Medien-Akkordeon zeigt der Arbeitsbereich
jetzt einen kompakten Hinweis, in welchem Container die Karte liegt und
welcher Bild-/Icon-Slot dort wirksam ist:

| Container | Label | Wirksamer Slot | Slot Pflicht? |
|---|---|---|---|
| `cards_v1` | Kartenraster | `image` | nein (Textkarte legitim) |
| `product_scroller_v1` | Kartenscroller | `image` | **ja** (sonst leer) |
| `card_grid_v1` | Hub-Raster | `thumbnail` | **ja** |
| `catalog_filter_grid_v1` | Produktfilter-Raster | `thumbnail` | **ja** |
| `feature_grid_v1` | Feature-/Icon-Raster | `icon_image` (oder Lucide-`icon`) | **ja** |
| `download_list_v1` | Download-Liste | — | nein (Renderer ignoriert `card_v1`) |

Implementierung: `containerHintFor(parentSectionType)` in
`src/features/admin/lib/cardFieldsWorkspaceGroups.ts`. Wird vom
`CardFieldsWorkspace` als Workspace-Header und Medien-Akkordeon-Subline
gerendert. Keine Verhaltensänderung, keine zusätzlichen Warnungen — nur
Erklärtext für die Redaktion.

## E. Baum-Badges / Modul-Badges

Aus dem Vorgängersprint bereits aktiv (`editorialSectionKind.ts`):

- `card_v1` heißt im Baum immer **Standardkarte**.
- Zusatz-Hint nennt aktive Module: „Bild aktiv", „Thumbnail aktiv",
  „Icon aktiv (Lucide)", „Icon aktiv (TCS-Bildicon)", „Features aktiv",
  „Links aktiv".
- Warnung „Bild fehlt" nur, wenn der Container das Bild wirklich braucht
  (Scroller). Im Raster führt fehlendes Bild **nicht** zur Warnung.

In dieser Etappe **neu**: redaktioneller **Parent-Hinweis** im Baum.
Statt nur „Teil von products" zeigt das Badge jetzt:

- „Teil von Kartenraster B-082" (für `cards_v1`-Parent)
- „Teil von Kartenscroller B-244" (für `product_scroller_v1`-Parent)
- „Teil von Hub-Raster B-…" (für `card_grid_v1`)
- „Teil von Feature-/Icon-Raster B-…" (für `feature_grid_v1`)

Tooltip enthält weiterhin den technischen `section_key` des Parents.
Reine Anzeige; kein Reparenting, kein neuer Schreibweg.

Implementierung: `SectionLevel.tsx` baut pro Knoten ein `parentInfo` aus
`allSections` + `blockTypeStyle(parentRow.section_type).label` und der
Section-Kurz-ID; `SectionRowView.tsx` rendert das Badge mit
`parentInfo?.editorialLabel ?? currentParentKey`.

## F. Prüfbeispiele

### B-538 / B-539 / B-540 / B-2195 — Pilot (Referenz)
- Seite: `gebaeudekommunikation.tuersprechanlagen`, Parent
  B-026 „Außenstationen" (Scroller) / B-027 „Innenstationen" (Scroller).
- Workspace: bleibt **Pilot** (`BildkartenCardWorkspace`). Reihenfolge
  und Aufbau sind die Vorlage für die allgemeine Maske.
- **Nicht geändert** — Pilot-Sonderlogik bleibt 1:1.

### B-591 / B-592 / B-593 — Kartenraster auf `zutrittskontrolle.zufahrten-parkplaetze`
- Parent: **B-082** (`products`, `cards_v1` = **Kartenraster**).
- Workspace: nutzt jetzt den neuen `CardFieldsWorkspace`.
- **Gruppen sichtbar:** alle sechs Akkordeons werden gerendert; leere
  Gruppen bekommen Empty-State-Text statt zu verschwinden.
- **Reihenfolge:** identisch zum Pilot (Grunddaten → Medien → … →
  Technisch).
- **Container-Erklärung:** Header zeigt „Container: Kartenraster · Bild
  ist empfohlen, aber nicht Pflicht — eine Textkarte ohne Bild ist hier
  legitim."
- **Bild optional:** Medien-Akkordeon zeigt „Im aktuellen Container
  wirksam: Bild (Slot `image`) · fehlt der Slot, ist das kein Fehler."
- **Bild ergänzen:** technisch über `SectionAssetsBlock` weiter unten im
  Editor möglich (`image`-Slot ist vom Renderer `CardsSectionV1` gelesen
  → `effective_modules` enthält `image`). Hochladen ist also bereits
  möglich, sobald Redaktion das macht. Keine Vorab-Uploads in diesem
  Sprint.
- **Baum-Badge:** „Teil von Kartenraster B-082".
- **Unterschied zur Pilot-Maske:** keine harten Slot-Ausblendungen, keine
  Türsprechanlagen-Toggles — also für diese Standardkarten korrekt.

### B-082 — Parent-Container `products`
- Typ: `cards_v1` = **Kartenraster** (bestätigt).
- Renderer: `CardsSectionV1` → responsives Grid (1 / 2 / 3 Spalten).
- Admin-Anzeige stimmt mit Render-Realität überein.

### B-071 — Vorvergleichsfall auf `zutrittskontrolle.tueren-tore`
- Typ: `cards_v1` = **Kartenraster** (bestätigt aus Vorgängersprint).
- Karte B-1237 ohne Bild ist in diesem Raster **legitim**, kein Fehler.
- **Warum wirkt es im Browser scroller-ähnlich?** Der `CardsSectionV1`-
  Renderer ist kein Scroller — es ist ein responsives Grid. Auf
  breiten Viewports und mit wenigen Karten kann es optisch wie ein
  angeschnittenes Raster wirken, ist aber technisch kein
  `product_scroller_v1`. Kein Spezialrenderer im Spiel.
- **Drift:** keine. Admin-Bezeichnung (Kartenraster) entspricht der
  Render-Realität.

## G. Offene Punkte

1. **Asset-Slot-UI** wird weiterhin von `SectionAssetsBlock` gerendert —
   nicht vom Karten-Arbeitsbereich. Die Verbindung „Medien-Akkordeon
   sagt: Slot ist hier wirksam" → „Asset-Block weiter unten zeigt
   denselben Slot mit Upload-Button" ist redaktionell richtig, aber
   visuell noch getrennt. Eine engere Verzahnung (z. B. Sprung-Link
   „→ zum Bild-Slot") ist Folge-Etappe, kein Sprint-Inhalt.
2. **Pilot-Workspace** könnte langfristig durch die allgemeine Maske +
   Container-Hint ersetzt werden. Solange die Pilot-Karten weiter laufen,
   keine Migration nötig.
3. **`features.*` an Standardkarten in `cards_v1`** (10 Karten, siehe
   Vorgängersprint) bleibt unverändert — Renderer-Sprint offen.
4. **Top-Level-`card_v1`** (4 Karten auf archivierter Seite) bleibt
   unverändert — Cleanup-Sprint offen.
5. **D9-Drift** zeigt heute 25 `invalid_parent_child` (statt 0 vorher).
   Ursache liegt in der DB-Tranchen-Triage, nicht in dieser UI-Etappe.
   Wird im nächsten Audit-Sprint geprüft.

## H. Nächste Schritte

Empfohlen: `cms-light-baustein-workspaces-wechselteaser-hero-content-1` —
analoge Akkordeon-Workspaces für `teaser_2col_v1`, `hero_v1`, `content_v1`
nach demselben Muster (klare Gruppen, redaktionelle Labels, kein
Schreibweg-Eingriff).

---

## Geänderte Dateien (UI-only)

- `src/features/admin/lib/cardFieldsWorkspaceGroups.ts`
  → neue Helper `containerHintFor()` + `emptyGroupHint()`.
- `src/features/admin/components/CardFieldsWorkspace.tsx`
  → akzeptiert `parentSectionType`, zeigt Container-Header,
  Medien-Slot-Hinweis und Empty-State-Texte für leere Gruppen.
- `src/features/admin/components/PageEditor.tsx`
  → reicht `parentSectionType={parentTypeForPlan}` durch.
- `src/features/admin/components/tree/SectionRowView.tsx`
  → neue Prop `parentInfo`; Badge zeigt „Teil von <Container-Label> B-…".
- `src/features/admin/components/tree/SectionLevel.tsx`
  → baut `parentInfo` aus `allSections` + `blockTypeStyle`.
- `docs/04-betrieb/standardkarte-admin-maske-vereinheitlichen.md` (neu).
- `docs/current-status.md` (neuer Sprint-Block oben).

## Audit-Status (Stand 2026-06-01)

- `cms:audit:contract` → **15 OK · 7 Warnung · 0 Konflikt** (stabil).
- `cms:audit:contract-drift` → D7=0 · D8=0 · D9=25 · D10=28.
  Anmerkung: D9 hat sich gegenüber dem Vorgängersprint verändert
  (vorher 0); Ursache liegt in der DB-Tranchen-Triage, **nicht** in
  dieser UI-Etappe. Wird separat geprüft.
- `cms:audit:renderer-fallback-inventory` → 82 Pages · G0=2 · G1=4 ·
  S1=54 · S2=19 · S3=2 · P1=1 (stabil).
- `tsc --noEmit` → grün.
- `npm run build` nicht manuell ausgeführt (Lovable-Harness baut
  automatisch).

## Bestätigung — Nicht geändert

- Keine DB-Änderung, keine Migration, keine neue RPC.
- Keine Whitelist-Änderung.
- Keine i18n-Dateien geändert.
- Keine Inhalte, Bilder, Feldwerte überschrieben.
- Keine Public-Renderer-/Routen-/Navigation-/Footer-/Breadcrumb-Änderung.
- Keine Produktdatenbank berührt.
- Keine automatische Kartenmigration, keine neuen Section-Type-Familien.
- Keine Seedings.
- Pilot-Workspace `BildkartenCardWorkspace` unverändert.
