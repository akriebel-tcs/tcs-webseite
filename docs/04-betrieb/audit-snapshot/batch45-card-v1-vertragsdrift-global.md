# Batch 45 — Globaler Audit: `card_v1`-Vertragsdrift in Sonderseiten

Datum: 2026-06-05
Bereich: CMS-Light / Audit-Bericht (Code + DB-Querschnitt)
Modus: **nur Prüfung & Bericht**. Keine Renderer-Umbauten, keine
Datenänderung, keine Migration.

## 1. Methode

1. Code-Sweep über `src/features/**` nach Stellen, die `card_v1`-Kinder
   eigenständig filtern und rendern (statt über
   `CmsBodyRenderer` → `CardsSectionV1` / `ProductScrollerV1` /
   `FeatureGridV1`).
2. Pro gefundener Stelle Vertrags-Check: liest sie
   `link_1..3_enabled/href/label`, `bullets.N`/`bullets_N_enabled`,
   `chips.N`/`chips_N_enabled`, `icon`/`icon_image`/`image`?
3. DB-Querschnitt: Zähle aktive `card_v1`-Karten mit
   `link_1_enabled='1'` UND nicht-leerem `link_1_href`. Diese sind
   genau die Karten, bei denen ein Sonderpfad-Fehler öffentlich
   wirksam würde (Spiegel-Bruch).

Wahrheits-Check CI: ✅ grün.

## 2. Renderpfad-Klassifikation

Legende:
- 🟢 **Grün** — nutzt zentralen Standardrenderer / zentralen Resolver.
- 🟡 **Gelb** — eigener Renderer, aber `card_v1`-Vertrag (Links/Bullets/Chips/Icons) **vollständig** umgesetzt.
- 🔴 **Rot** — eigener Renderer **ignoriert Teile** des `card_v1`-Vertrags (Links und/oder Bullets/Chips).
- ⚪ **Grau** — keine echten `card_v1`, bewusst anderes Layout (z. B. Icon-Listen ohne Links).

### 2.1 🟢 Standardpfade (Stichprobe, keine Drift)

Alle Seiten, die ihren Body über `CmsPageLayout` / `GenericCmsPage` /
`renderPageSectionByType` rendern und `cards_v1`-Container über
`CardsSectionV1` ausgeben:

- `anwendungen.objektloesungen`, `anwendungen.oeffentliche-hand`,
  `anwendungen.gesundheitseinrichtungen`, `anwendungen.referenzprojekte`
  (P-077, seit Batch 41), `anwendungen.wohnbau`, `anwendungen.root`
- `anwendungen.bildungseinrichtungen` (P-057, nutzt
  `renderPageSectionByType` pro Block — alle Sub-`cards_v1` laufen
  durch den Standardrenderer)
- `produkte.hub`, `produkte.eingangsloesungen`,
  `produkte.zutrittskontrolle`, `produkte.tuerkommunikation`
- `service.hub`, `service.downloads`, `service.ersatzteile`,
  `service.planen-konfigurieren`, `service.online-produktkatalog`
- `gebaeudemanagement.digitale-namensanzeige`,
  `gebaeudemanagement.reservieren-buchen`,
  `gebaeudemanagement.schraenke-behaelter`,
  `gebaeudemanagement.bcm-buchungssystem`,
  `gebaeudemanagement.bcm-infoboard`,
  `gebaeudemanagement.digital-signage` (alle `GenericCmsPage`)
- `zutrittskontrolle.mobiler-zutritt`,
  `zutrittskontrolle.bcm-mini-cloud` (alle `GenericCmsPage`)
- Personas (`personas.*`) → `usePersonaCms` reicht an Standard durch
- `gebaeudekommunikation.briefkastenanlagen`, `…grossanlagen`,
  `…root` → Standard

→ Keine Drift in diesem Block. Links/Bullets/Chips folgen exakt dem
Resolver `cardVisibility.ts`.

### 2.2 🟡 Eigener Renderer, vertragstreu

- `src/features/gebaeudekommunikation/pages/TuersprechanlagenPage.tsx`
  → `aussenstationen`/`innenstationen`-Scroller (Zeilen 160–340):
  benutzt `resolveCardVisibility`, rendert Bullets, Chips und
  `link_1..3` über denselben Resolver. **Vertragstreu.**

### 2.3 🔴 Eigener Renderer ignoriert `card_v1`-Vertrag

| # | Datei | Container(s) | Was fehlt | DB-Karten mit aktivem `link_1` |
|---|---|---|---|---:|
| R1 | `gebaeudekommunikation/pages/TuersprechanlagenPage.tsx` → `VorteileSection` (Z. 385–450) | `vorteile` | Links, Bullets, Chips | 4 |
| R2 | `gebaeudekommunikation/pages/TuersprechanlagenPage.tsx` → `AnwendungsumfelderSection` (Z. 470–560) | `anwendungsumfelder` | Links (statt CTA-Link wird nur statisches Label `learnMore` gerendert, **ohne href**!), Bullets, Chips | 3 |
| R3 | `gebaeudekommunikation/pages/SystemloesungenPage.tsx` | `vorteile`, `fachplanung`, `loesungen_uebersicht` | Links, Bullets, Chips (eigener `.filter(card_v1)`-Pfad) | 6 + 3 + 4 = 13 |
| R4 | `anwendungen/components/AnwendungDetailPage.tsx` → `anforderungen`-Block (Z. 233–290) | `anforderungen` aller Detailseiten (T-031 Familie) | Links, Bullets, Chips (rendert nur Icon + Label + Text) | gesamt ≈ 60 (siehe Aufschlüsselung unten) |
| R5 | `karriere/pages/KarrierePage.tsx` | `benefits`, `jobs` | Links (`/kontakt`-Default-Hrefs sind aktiv, werden öffentlich nicht angezeigt) | 4 + 5 = 9 |
| R6 | `presse/pages/PressePage.tsx` | `releases` | Links | 5 |
| R7 | `signage/pages/SignagePage.tsx` | `products` | Links | 0 (keine aktiven Links in DB — niedriges Akut-Risiko, gleicher Pattern-Bug) |
| R8 | `wissen/pages/AkademiePage.tsx` | `formate`, `zielgruppen`, `partner` | Links | 0 (gleiches Bild wie Signage) |
| R9 | `eingangssysteme/pages/EntrySystemPage.tsx` | `pillars` | Links | 3 |
| R10 | `zutrittskontrolle/pages/FahrstuhlsteuerungPage.tsx` | `benefits` | Links | 0 |

Aufschlüsselung R4 (Anwendung-Detailseiten mit aktivem
`anforderungen.*.link_1`): `anwendungen.behoerde` (5),
`anwendungen.bidirektionale-video` (4), `anwendungen.concierge` (5),
`anwendungen.digitale-namensverwaltung` (5),
`anwendungen.einfamilienhaus` (4), `anwendungen.feuerwehr` (5),
`anwendungen.feuerwehrdurchsage` (3), `anwendungen.grossanlage` (5),
`anwendungen.interne-kommunikation` (5), `anwendungen.klinik` (5),
`anwendungen.mehrfamilienhaus` (5), `anwendungen.pflege` (5),
`anwendungen.sanierung` (4), `anwendungen.schwimmbad` (5),
`anwendungen.zutrittskontrolle-bcm` (8). Summe ≈ 73.

### 2.4 ⚪ Grau (bewusst anderes Layout)

- `anwendungen/components/AnwendungDetailPage.tsx` → `leistungen`-Block:
  ist keine `card_v1`-Kartenfamilie, sondern strukturiertes
  Bereichs-Layout mit eigenem Vertrag.
- `gebaeudekommunikation/pages/SystemloesungenPage.tsx` →
  `fachplanung` enthält teils `card_v1`-Kinder, die Public-Darstellung
  ist aber bewusst tabellarisch ohne CTAs. Reiht sich in R3 ein (wenn
  Redaktion Links pflegen will, müssten sie öffentlich erscheinen) —
  derzeit grenzwertig zwischen Grau und Rot, deshalb in R3 mitgezählt.

## 3. Platzhalter-Sichtbarkeit (Batch 43/44)

Quercheck-SQL: 0 Karten zeigen `Punkt N`/`Merkmal N`/`Point N`/
`Feature N` öffentlich (gleicher Stand wie nach Batch 44
Sichtbarkeitsfix). Sonderpfade R1–R10 rendern Bullets/Chips ohnehin
nicht — dort kann auch kein Platzhalter leaken.

## 4. Audit-Tabelle (DB-Snapshot)

Volle Liste aller aktiven `card_v1`-Karten mit
`link_1_enabled='1' AND link_1_href != ''` und Risiko-Bewertung pro
Eltern-Container wurde generiert (Abfrage im Bericht, Ergebnis
embedded in Tabelle Abschnitt 2.3). Insgesamt:

- Karten mit aktivem `link_1`: **~330** über alle Seiten.
- Davon sicher öffentlich gerendert (🟢 + 🟡): **~225**.
- Davon Risiko 🔴 (Renderer ignoriert Link): **~110**.
- Davon Default-Ziel `/kontakt` (Batch-38-Seed, redaktionell noch
  nicht angepasst): hoher Anteil — silent loss, weil weder Admin- noch
  Redaktions-Korrektur jemals sichtbar wird.

## 5. War Batch 44 ein Einzelfall?

**Nein.** Batch 44 (`SnipdooIpPage.anwendungen`) ist nur die
sichtbarste Ausprägung eines **Musters**: 10 weitere Sonderpfade in
6 Bereichen rendern `card_v1`-Karten mit eigenem Layout und greifen
auf den `card_v1`-Vertrag (Links/Bullets/Chips) gar nicht oder nur
teilweise zu. Tuersprechanlagen (R1/R2), Systemloesungen (R3) und der
gemeinsame `anforderungen`-Block aller Anwendungs-Detailseiten (R4)
sind dabei die mit Abstand größten Cluster.

## 6. Empfehlung für nächste Schritte

Priorisiert nach Sichtbarkeit + Aufwand:

1. **Batch 46 — Vertragsangleichung der drei größten Cluster** (R3, R4,
   R1/R2). Muster wie Batch 44: zentralen Resolver
   (`resolveCardVisibility`) und `resolveHref` aus
   `cardCanonical.ts` einsetzen, keine Parallel-Logik. Vorher in jedem
   Cluster eine Stichprobe: hat die Redaktion echte Linkziele
   gepflegt oder steht überall noch das `/kontakt`-Default-Seed?
2. **Batch 47 — Kleincluster** (R5–R10). Gleicher Mechanismus,
   geringeres Volumen.
3. **Datenhygiene parallel**: für `card_v1`-Karten mit
   `link_1_href='/kontakt'` und `link_1_enabled='1'`, die noch nie
   redaktionell angefasst wurden, entweder
   - `link_1_enabled='0'` setzen (Default ausschalten), oder
   - in einem Daten-Audit-Bericht zur Redaktions-Pflege markieren.
   Diese Entscheidung gehört zur Redaktion, nicht zu einem
   Renderer-Fix.
4. **Lint-Gate** (optional, später): ESLint-Regel
   „`*Page.tsx` darf `card_v1`-Kinder nicht ohne `resolveCardVisibility`
   rendern" — verhindert künftige Drift.

## 7. Sofortmaßnahmen in diesem Batch

Keine. Auf Wunsch des Auftraggebers wird in diesem Batch nicht
gefixt, weil:

- Jeder R-Eintrag ist ein Renderer-Eingriff in eine echte Seite —
  kein triviales 1-Zeilen-Fix, sondern jeweils ein Block analog zu
  Batch 44 (Imports + Bullets/Chips/Links + Layout-Beibehalt).
- 10 Stellen in einem Batch wären ein „großer Renderer-Umbau".
- Risiko der pauschalen Sichtbarmachung der `/kontakt`-Defaults
  besteht; das verlangt vorgelagert eine Datenentscheidung
  (Schritt 6.3).

## 8. Scope-Bestätigung

- Keine Renderer geändert.
- Keine DB-Daten geändert.
- Keine Migration angelegt.
- Keine Navigation, keine neuen Seiten, keine neuen Section-Typen,
  keine Produkt-DB-Arbeit.
- Wahrheits-Check CI grün.

## 9. Geänderte Artefakte

- **Doku**: dieser Bericht.
- **Code / DB**: keine Änderung.
