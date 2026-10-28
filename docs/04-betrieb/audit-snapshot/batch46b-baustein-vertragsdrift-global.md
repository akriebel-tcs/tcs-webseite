# Batch 46b — Globaler Audit: Baustein-Vertragsdrift außerhalb von `card_v1`

Datum: 2026-06-05
Bereich: CMS-Light / Audit-Bericht (Code-Querschnitt)
Modus: **nur Prüfung & Bericht**. Keine Renderer-Umbauten, keine
Datenänderung, keine Migration, keine Inhaltsänderung.

Wahrheits-Check CI: ✅ grün.

## 1. Methode

1. Inventar der Standard-Renderer in
   `src/features/cms/components/sections/`:
   `ContentSectionV1`, `CardsSectionV1`, `FeatureGridV1`,
   `ProductScrollerV1`, `ProductShowcaseListV1`, `DownloadListV1`,
   `ContactBlockV1`, `StatsV1`, `CtaV1`, `RichV1`, `FaqV1`,
   `Teaser2ColV1`, `TabsV1`.
2. Dispatcher: `CmsBodyRenderer` (`RENDERERS`-Tabelle) + Tail-Renderer
   `CmsTailCta` / `CmsTailFaq` (rendert global aus DB, beachtet Skip-Set).
3. Code-Sweep über `src/features/**` (außer `cms/**`, `admin/**`) nach:
   - eigenständigem Filtern von Sections nach `section_type` einer
     V1-Familie (`hero_v1`, `teaser_2col_v1`, `cta_v1`, `faq_v1`,
     `contact_block_v1`, `download_list_v1`, `tabs_v1`, `rich_v1`,
     `product_scroller_v1`, `feature_grid_v1`),
   - hartcodierten CTAs (`to="/kontakt"` / `href="/kontakt"`) in Pages,
     die parallel zu einer `cta_v1`-Section laufen könnten,
   - eigenen `.map(...)`/`.filter(...)`-Renderings, die Standardbausteine
     simulieren.
4. Pro Fund Vertrags-Check je Baustein (siehe Abschnitt 3).

## 2. Klassifikation pro Bausteintyp

Legende:
- 🟢 **Grün** — zentraler Renderer, keine Sonderpfade gefunden
- 🟡 **Gelb** — eigener Pfad nutzt aber die Standardkomponente direkt
  (`<Teaser2ColV1 …/>`, `<FaqV1 …/>`, …) → vertragstreu
- 🔴 **Rot** — eigener Renderer / Markup ohne Standardvertrag
- ⚪ **Grau** — bewusst eigenes Layout, gehört nicht zum Standardvertrag

| Bausteintyp | Status | Bemerkung |
|---|---|---|
| `hero_v1` | 🟢 | Keine Page rendert Hero selbst. Hero läuft ausschließlich über `CmsPageLayout`. Page-Filter wie `s.section_type !== "hero" && s.section_type !== "hero_v1"` (in `Anwendungen*Page`, `Bildungseinrichtungen`, `Gesundheitseinrichtungen`, `Objektloesungen`, `OeffentlicheHand`, `Referenzprojekte`, `InterneKommunikation`) sind nur **Skip-Filter**, kein Hero-Eigenrender. |
| `teaser_2col_v1` | 🟡 | Folgende Pages filtern teaser_2col_v1 selbst aus dem DB-Set, rendern dann aber **die Standard-Komponente** `Teaser2ColV1` direkt: `HomePage` (Z. 102), `TuerkommunikationPage` (Z. 45–57), `GebaeudemanagementPage` (Z. 32–57), `EntrySystemPage` (Z. 53–124), `BeschilderungPage` (Z. 25–54), `personas/wohnungswirtschaft`, `personas/fachhandel`, `personas/architekt`, `personas/handwerk`, `personas/bauherr`, `personas/fachplaner`. Layout/Sortierung sind Sonderlogik (z. B. „nur `bereich_*`", „Wechsel-Muster"), die Inhaltsbindung folgt aber dem `teaser_2col_v1`-Vertrag der Standardkomponente. → **Vertragstreu, kein Public-Schaden** zu erwarten. |
| `cards_v1` (Container) | 🟢 | Container immer über `CardsSectionV1`. Die kartendrift sitzt **in den Karten-Kindern** (`card_v1`) und wurde in Batch 45/46 separat behandelt. |
| `card_v1` (Kinder) | 🔴 (Referenz) | Siehe Batch 45/46. Hier nicht erneut auditiert. |
| `cta_v1` | 🟡 | Keine Page rendert `cta_v1` als Section selbst. Allerdings hartcodierte CTAs zu `/kontakt` in: `AnwendungDetailPage` (Z. 518), `ReferenzprojektDetailPage` (Z. 178), `EntryBeratungPage` (Z. 92), `EntrySystemPage` (Z. 186), `SystemloesungenPage` (Z. 240), `wissen/AkademiePage` (Z. 129), `service/DownloadsPage` (Z. 228+325), `service/TechnischerSupportPage` (Z. 150+206) sowie Legal-Seiten. Labels kommen über `t(...)`. → **Gelb**, weil das eigene fachliche Mini-CTAs sind (Beratungsschnipsel, Spec-Schluss); sie kollidieren nicht mit `CmsTailCta`, sind aber **nicht CMS-pflegbar**. Empfehlung als Hygiene-Punkt, nicht als Drift. |
| `faq_v1` | 🟡 | `EntryReferenzenPage` (Z. 104–106) und `EntryBeratungPage` (Z. 105–107) iterieren `faq_v1`-Sections selbst, rendern aber die Standardkomponente `<FaqV1 …/>`. Vertragstreu. Bemerkung: `CmsTailFaq` rendert FAQs global; in beiden Pages werden die FAQs jedoch **inline** ausgegeben **ohne `useMarkRendered`** → potenzielle Doppel-Ausgabe, wenn `CmsTailFaq` aktiv ist (siehe Risikohinweis Abschnitt 4). |
| `product_scroller_v1` | 🟢 | Keine Sonderpfade außerhalb von `CmsBodyRenderer`. |
| `feature_grid_v1` | 🟢 | Keine Sonderpfade. |
| `tabs_v1` | 🟢 | Keine Sonderpfade. |
| `rich_v1` | 🟢 | Keine Sonderpfade. |
| `contact_block_v1` | 🟢 | Keine Sonderpfade. |
| `download_list_v1` | 🟢 | Keine Sonderpfade. Hinweis: `service/DownloadsPage` hat einen eigenen, fachlich anderen Download-Block (`/kontakt`-Fallback) — das ist **⚪ Grau**, keine `download_list_v1`-Drift. |
| `product_showcase_list_v1` | 🟢 | Keine Sonderpfade. |
| `stats_v1` | 🟢 | Keine Sonderpfade. |

## 3. Vertragsprüfung in Stichproben

| Aspekt | `teaser_2col_v1`-Sonderpfade | `faq_v1`-Sonderpfade | Hartcodierte `/kontakt`-CTAs |
|---|---|---|---|
| `is_active` beachtet? | indirekt (Standardkomponente prüft) | indirekt | n/a (kein DB-Schalter) |
| `sort_order` beachtet? | teilweise — eigene Reihenfolge nach `section_key`-Prefix oder festgelegter Liste, nicht `sort_order` | ja (DB-Reihenfolge) | n/a |
| DE/EN korrekt? | ja (Standardkomponente) | ja | nein — Labels nur über `t()` |
| Sichtbar-/Enabled-Schalter? | ja (Standardkomponente) | ja | n/a |
| Links korrekt? | ja (Standardkomponente) | ja | hartcodiert, kein DB-Link |
| Bilder priorisiert? | ja | n/a | n/a |
| Standardfallback? | ja | ja | n/a |
| Nichts hartcodiert, was Admin-pflegbar wäre? | überwiegend ja | ja | **nein** — Labels & Hrefs hartcodiert |

Konsequenz:
- `teaser_2col_v1`- und `faq_v1`-Sonderpfade sind **vertragstreu**.
  Einziger struktureller Schwachpunkt: einige `teaser_2col_v1`-Pfade
  ignorieren `sort_order` und nutzen stattdessen `section_key`-Konventionen
  oder hardcoded Listen (z. B. `TEASER_SECTION_KEYS` in EntrySystemPage).
  Das ist **bewusste Sortierlogik**, kein Public-Inhaltsverlust.
- Hartcodierte `/kontakt`-CTAs sind **keine** echte Drift gegenüber
  `cta_v1`, sondern Layout-Beilagen außerhalb des CMS-Vertrags.
  Wenn die Redaktion an diesen Stellen Texte oder Ziele ändern wollte,
  müsste der Code angefasst werden — das ist Doku-Risiko, nicht
  Public-Wirkungs-Risiko.

## 4. Echte Vertragsdrift außerhalb `card_v1`

**Keine.** Es wurde **kein** Sonderpfad gefunden, bei dem ein
Standardbaustein (`hero_v1`, `teaser_2col_v1`, `cta_v1`, `faq_v1`,
`product_scroller_v1`, `feature_grid_v1`, `tabs_v1`, `rich_v1`,
`contact_block_v1`, `download_list_v1`, `stats_v1`,
`product_showcase_list_v1`) ohne Standardkomponente nachgebaut wird.

Die in Batch 45 dokumentierte Drift-Klasse ist auf `card_v1` beschränkt:
nur dort gibt es Pages, die Karten-Kinder mit eigenem Markup statt mit
`CardsSectionV1` rendern und dadurch den `card_v1`-Vertrag
(Links/Bullets/Chips) verlieren.

### Sekundäre Risiken (nicht Vertragsdrift)

1. **Inline-FAQ ohne `useMarkRendered`**: `EntryReferenzenPage` und
   `EntryBeratungPage` rendern `faq_v1` inline, melden das aber nicht
   an die `CmsRenderRegistry`. Wenn `CmsTailFaq` aktiv ist und dieselbe
   Section in DB liegt, droht eine **Doppel-Ausspielung**. Aktuell sind
   beide Pages laut Wahrheits-Check grün — der Effekt tritt nur ein,
   sobald eine zusätzliche FAQ-Section dazu kommt. **Klein, aber
   reparaturwürdig.**
2. **`sort_order` ignoriert in einigen teaser_2col_v1-Sonderpfaden**:
   bewusste Layoutwahl (`bereich_*`, `solution_teaser_*`,
   `TEASER_SECTION_KEYS`). Spiegel-treu im Sinne von Inhalt, aber nicht
   im Sinne von Reihenfolgesteuerung über Admin. Sollte dokumentiert
   bleiben, kein Fix nötig.
3. **Hartcodierte `/kontakt`-CTAs** in Anwendungs-Detail-, Service-,
   Eingangssystem-, Akademie-, Referenzprojekt-Seiten: nicht
   CMS-pflegbar, aber auch nicht im Konflikt mit einem CMS-Vertrag.
   Hygiene-Schuld, nicht Drift.

## 5. Schwerpunkt-Bereiche (laut Auftrag)

| Bereich | Drift außerhalb `card_v1`? |
|---|---|
| Anwendungen / TCS in Bauten | nein |
| Gebäudekommunikation | nein |
| Zutrittskontrolle | nein |
| Gebäudemanagement | nein |
| Eingangssysteme | nein (zwei `faq_v1`-Inlines, vertragstreu — Sekundärrisiko Doppel-Render, s. 4.1) |
| Service | nein (hartcodierte `/kontakt`-CTAs als Hygiene-Punkt) |
| Sonderseiten (Kontakt, Karriere, Presse, Serviceportal) | nein |

## 6. Empfehlung für nächste Schritte

1. **Kein Folge-Fixbatch nötig** für Vertragsdrift außerhalb `card_v1`.
   Die strukturelle Drift-Klasse bleibt auf `card_v1` begrenzt
   (Batch 45/46/47).
2. **Hygiene-Batch (optional, später)**:
   - `useMarkRendered("…")` in den zwei FAQ-Inlines von
     `EntryReferenzenPage` und `EntryBeratungPage` ergänzen.
   - Inventar der hartcodierten `/kontakt`-CTAs als Doku-Anhang oder
     Redaktions-Backlog erfassen; Entscheidung pro Stelle: in `cta_v1`
     überführen oder bewusst Code-CTA lassen.
3. **Lint-Gate** (wie in Batch 45 empfohlen) bleibt sinnvoll und würde
   das gleiche Muster auch für künftige Hand-Renderings von
   `teaser_2col_v1`/`faq_v1` blockieren:
   „`*Page.tsx` darf Sections vom Typ X nicht ohne die zugehörige
   Standardkomponente rendern".

## 7. Ist das ein strukturelles Muster?

Nein. Der globale Sweep zeigt, dass das in Batch 44/45 gefundene
Muster **fast ausschließlich `card_v1`** trifft. Alle anderen
V1-Bausteine werden entweder zentral über `CmsBodyRenderer` gerendert
oder — bei Sonderlayouts — über die jeweilige Standardkomponente direkt
eingebunden. Der `card_v1`-Sonderfall hat strukturell andere Ursachen
(Karten-Kinder lassen sich nicht so einfach „komplett-übergeben" wie
ganze Sections und werden deshalb häufiger nachgebaut).

## 8. Scope-Bestätigung

- Keine Renderer geändert.
- Keine DB-Daten geändert.
- Keine Migration angelegt.
- Keine Navigation, keine neuen Section-Typen, keine Produkt-DB-Arbeit.
- Wahrheits-Check CI grün.

## 9. Geänderte Artefakte

- **Doku**: dieser Bericht.
- **Code / DB**: keine Änderung.
