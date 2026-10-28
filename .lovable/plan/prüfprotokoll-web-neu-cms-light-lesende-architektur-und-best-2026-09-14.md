# Prüfprotokoll Web-neu / CMS-Light — lesende Architektur- und Bestandsprüfung

Stand: 2026-09-14, 16:20 UTC. Nur gelesen: keine Änderung, keine Migration, keine Veröffentlichung.
Gegenstand ist ausschließlich Web-neu / CMS-Light (`uvkubrrljyzfvbvejepl`).

## 0. Alter der vorhandenen Berichte (nicht vertrauen, wo alt)

| Bericht | Stand im Dokument | Bewertung |
| --- | --- | --- |
| `cms-steuerbarkeit-status.md` | 2026-06-04 | 3 Monate alt, Sprachthemen (PL/NL/DA) fehlen völlig |
| `globaler-spiegel-audit.{md,json}` | 2026-06-18 | veraltet |
| `eine-wahrheit-offene-befunde-masterliste` | 2026-06-04 | veraltet |
| `current-status.md` | 2026-06-05 | veraltet |
| `renderability-gate.json` | heute neu erzeugt (Lauf unten) | aktuell |
| `sprachvertrag-oeffentliche-webseite.md` | Ergänzung 2026-09-12 | aktuell |
| `bausteine-inventar.json`, `seiten-klassifikation.json`, u. a. | ohne Zeitstempel, teils leer (`[]`) | nicht belastbar |

Die „grünen" Freeze-Berichte aus Batch 25–28 beschreiben einen Zustand **vor** der Sprachöffnung und sind für die heutige Frage nicht aussagefähig.

## 1. Heute ausgeführte Prüfläufe (read-only)

| Lauf | Ergebnis |
| --- | --- |
| `contract-audit` | 16 OK · 7 Warnungen · 0 Konflikte |
| `renderer-audit --strict` | 84 Seiten, 80 DB-first; 1 Verstoß (`AdminLoginPage`, unkritisch) |
| `wahrheits-check-ci` | grün (Harvester, Body-Map, FAQ/CTA = 0) |
| `renderability-gate` | **4 NEUE Befunde** + 70 Altbestand offen (74 gesamt) |
| `whitelist-coverage-audit` | **ROT**: 1.375 Textfelder ohne Whitelist, ~1.494 weitere Slots |
| `redaktions-fluss-audit` | 1.000 aktive Sections: S0 857, S1 25, S4 96, S5 22 |
| `sprachvertrag-audit --strict` | 0 harte Fehler, 0 verdächtige Literale, 232 Hinweise |
| `ui-catalog-manifest --check` | **nicht aktuell** (Manifest driftet) |
| `validate-i18n` | 0 Fehler, 7 Warnungen |

Neue Gate-Befunde: `legal.agbEinkauf`, `legal.datenschutzSnipdoo`, `legal.einwilligung`, `legal.garantiebedingungen` — jeweils `standard_cta` (`cta_v1`) ohne `title` in DE und EN.

## 2. Sprach-Bestand in der Datenbank

`cms_locales`: de aktiv/öffentlich, en aktiv/öffentlich, pl aktiv/öffentlich, nl aktiv/öffentlich, **da aktiv aber nicht öffentlich**.

| Tabelle | de | en | pl | nl | da |
| --- | --- | --- | --- | --- | --- |
| `cms_section_fields` | 55.145 | 54.503 | 17.869 | 17.869 | 4.699 |
| `cms_admin_editable_fields` (aktiv) | 62.395 | 61.831 | 17.869 | 17.869 | 17.869 |
| `cms_page_translations` | 125 | 125 | 125 | 125 | 37 |
| `cms_navigation_node_translations` | 141 | 141 | 141 | 141 | 41 |
| `cms_asset_translations` | 598 | 595 | 269 | 269 | 122 |
| `cms_ui_string_translations` (von 414) | – | 414 | 414 | 409 | 409 |

PL und NL haben nur rund **32 %** der deutschen Feldmenge. DA-Lauf `4d875298` steht unverändert auf `paused` bei 5.315/18.855 (unangetastet).

## 3. Priorisierte Befundtabelle

### A. Sofortblocker

| Befund | Stelle | Auswirkung | Zielzustand | Empfohlene Korrektur |
| --- | --- | --- | --- | --- |
| „Feld übersetzen" akzeptiert nur EN/PL | `supabase/functions/cms-translate-field/index.ts:33-34,278-289` | NL/DA-Übersetzung im Editor serverseitig abgelehnt | Zielsprachen aus `cms_locales` | Whitelist dynamisch aus `cms_locales` lesen |
| Schreibpfad Feldwert hart auf de/en/pl | `src/features/admin/api/cmsAdminWrite.ts:29,56` | NL/DA-Werte lassen sich im Admin nicht speichern | Locale-Prüfung serverseitig | Client-Guard entfernen, RPC prüft |
| Sichtbarkeits-Schalter schreibt nur de/en | `src/features/admin/components/PageEditor.tsx:2202` | Sichtbarkeit für PL/NL/DA nie gesetzt → Spiegel-Regel bricht | alle aktiven Sprachen | Schleife über `cms_locales` |
| Alt-Texte und Navigation nur de/en/pl | `cmsAdminAssets.ts:169`, `cmsAdminNavigationWrite.ts:15`, `useCmsPageContent.ts:292` (`alt_de/en/pl`) | NL/DA-Alt-Texte und Menütexte nicht pflegbar/lesbar | sprachneutral über `cms_asset_translations` | Übersetzungstabelle statt Spalten |
| Block kopieren/einfügen kopiert dokumentiert nur DE/EN | `cmsAdminSectionOrder.ts:220-243` (`rpc_admin_paste_section`, `rpc_admin_duplicate_section`) | kopierte Blöcke verlieren PL/NL/DA | alle Sprachen mitkopieren | RPC-SQL prüfen, dann sprachneutral |
| Whitelist-Lücke 1.375 Textfelder | `whitelist-coverage-audit` (u. a. `anwendungen.bildungseinrichtungen`, `anwendungen.kindertagesstaetten`) | Redaktion sieht „nicht CMS-gepflegt", Texte nur per Prompt änderbar | jedes Feld freigegeben | Whitelist-Nachzug je Seite |
| 4 neue Gate-Befunde `standard_cta` ohne `title` | `legal.*` (siehe oben) | CTA rendert ohne Überschrift | Pflichtfeld gefüllt | Titel in DE/EN nachtragen |

### B. Strukturelle Schulden

| Befund | Stelle | Auswirkung | Zielzustand | Korrektur |
| --- | --- | --- | --- | --- |
| Nur 15 von 84 Seiten laufen über `GenericCmsPage`; 69 haben Struktur im Code | `src/features/**/pages` | Reihenfolge/Sichtbarkeit nur teilweise gespiegelt | alle Seiten über `CmsBodyRenderer` | Seitenweise Umschaltung nach Muster Batch 33/34 |
| Redaktioneller Volltext in i18n-JSON | `de/home.json` (`ueberTcs.*`, `contentBlocks.*`), `de/service.json` (`hub.*`, `katalog.*`), `de/common.json` (`pageCta`, `notFound`); vermutlich auch `anwendungen.json` (1.668 Zeilen), `personas.json`, `zutrittskontrolle.json` | zweite Inhaltswahrheit neben CMS-Light | Inhalte nur in DB | Namespace-weise nach `cms_section_fields` + Whitelist; JSON nur Notfall |
| Download-Center-Microcopy komplett im Code | `src/features/service/downloadCenter/DownloadCenter.tsx:66-134` | in PL/NL/DA deutsch, nicht redaktionell änderbar | `cms_ui_strings` | Labels als `ui_string`-Einheiten aufnehmen |
| Fallback-Überschriften und CTA-Texte im Routing | `src/features/legal/routes.tsx:26,31,35`, `src/features/produkte/routes.tsx:34,48,57,65,71`, `ProduktHubPage.tsx:28,33`, `SitemapPage.tsx:31-35,240-277` | deutsche Texte ohne DB-Feld | DB-Feld je Baustein | Feld `hero.headline`/`cta_label` anlegen + Whitelist |
| Renderbarkeits-Vertrag prüft nur DE/EN | `src/features/cms/contract/renderability.ts:27` | PL/NL/DA-Lücken laufen unbemerkt öffentlich | Prüfung über aktive Sprachen | `REQUIRED_LOCALES` aus `cms_locales` |
| Admin-Auswertungen filtern `["de","en"]` | `structureMapData.ts:72`, `cmsAdminCardLinks.ts:80`, `cmsAdminIconFields.ts:64`, `TemplateWorkshop.tsx:1599` | Audits blind für PL/NL/DA | sprachvollständig | Filter dynamisch |
| Vertragstypen ohne Renderer / Legacy | `sectionTypes.ts` (`tab_v1`, `detection`, `series_override_v1`), `redaktions-fluss-audit` S4 (96: `list_v1`, `product_showcase_list_v1`, `catalog_filter_grid_v1`, `series_override_container_v1`) | Blöcke im Admin ohne Wirkung | Renderer oder Stilllegung | pro Typ entscheiden |
| 96 Kartencontainer ohne aktive Karten, 22 S5-Fälle | `redaktions-fluss-audit` | leere Abschnitte, Redaktion sucht Ursache | Karten oder Container inaktiv | Bereinigungsliste abarbeiten |
| UI-Katalog-Manifest driftet | `scripts/i18n/ui-catalog-manifest.mjs --check` | Bedientexte in DB und Code laufen auseinander | Manifest aktuell | `i18n:ui-catalog:sync` im nächsten Auftrag |
| Whitelist im öffentlichen Pfad nicht wirksam | kein Treffer für `cms_admin_editable_fields` in `src/features/cms/**` | Whitelist steuert nur Admin-Sichtbarkeit | bewusst dokumentieren | Doku klarstellen |

### C. Bewusst technische Texte (kein Handlungsbedarf)

- shadcn-Primitive: `ui/breadcrumb.tsx:77`, `ui/carousel.tsx:189,217`, `ui/pagination.tsx:52,59,68` (englische a11y-Texte der Bibliothek).
- `src/app/RootErrorBoundary.tsx` — Notfallmeldung ohne i18n (Allowlist-Eintrag vorhanden).
- Leer-/Anker-Fallbacks im Renderpfad: `CtaV1.tsx:57`, `DownloadListV1.tsx:34`, `FaqV1.tsx:63-82`, `ContentSectionV1.tsx:55,92`, `TabsV1.tsx:177-179`.
- Ausnahme mit sichtbarem deutschen Text: `CmsProductSolutionShell.tsx:216` „Produktbild-Platzhalter" — gehört in `cms_ui_strings`.
- `CmsSourceBadge.tsx:37` („Body aus DB"/„Body aus Code") — Sichtbarkeit im öffentlichen Betrieb offen, bitte klären.
- i18n-Microcopy `common.json` (`actions.*`, `language.*`, `ui.*`) bleibt bewusst im Code als Notfall-Rückfall.

## 4. Offene Fragen für den nächsten Schritt

1. Die SQL-Körper von `rpc_admin_paste_section`, `rpc_admin_duplicate_page`, `rpc_admin_duplicate_section` wurden nicht gelesen; die Sprachabdeckung beim Kopieren ist damit unbestätigt (Kommentare nennen nur DE/EN).
2. Vollständige Klassifikation redaktionell/technisch je i18n-Schlüssel liegt für `anwendungen.json`, `personas.json`, `gebaeudekommunikation.json`, `zutrittskontrolle.json`, `eingangssysteme.json` noch nicht vor.
3. Soll DA weiter als Sprache geführt werden (aktiv, nicht öffentlich, Lauf pausiert) oder vorerst ruhen?

Kein Umsetzungsauftrag enthalten — dies ist reines Protokoll.
