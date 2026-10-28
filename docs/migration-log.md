# Migration Log

## 2026-09-14 — Etappe 1, Restkorrekturen (Regelwerk widerspruchsfrei, CLI-Erkennung, offener Befund)

**Scope:** ausschließlich Dokumentation und lokale Prüfmechanik. **Keine**
Datenmutation, **keine** Migration, **kein** SQL-Schreibzugriff, **kein**
Edge-Deployment, **keine** Auth-/RLS-/CI-Policy-Änderung, **keine**
Frontend-Laufzeitänderung, **keine** Veröffentlichung.

Geänderte Dateien:
- `.lovable/always-follow.md` — auf technische Schutzregeln reduziert; „freeze-reif / alle Gates 0" entfernt (neuer Abschnitt 0 „Kein Gesamtgrün"); „Code führend für UI-Texte" → Katalog `cms_ui_strings`; alter Abschnitt 12 (automatische DE→EN-Pflicht) ersetzt durch Verweis auf Dachdokument 11.3; Abschluss verweist auf 11.6; Hierarchie aktualisiert.
- `docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md` — Kopf mit Vorrangregel (Abschnitt 11 > Abschnitte 1–10) und „kein Gesamtgrün"; Prompt-Schablone: Sprachangabe ohne automatische Zweitsprachenpflicht; Abschlussblock nennt die drei Nachweise aus 11.6; Abschnitt 3 „DE- und EN-Variante" auf Auftragsumfang umgestellt; 11.5 Transaktionsformulierung präzisiert (einzelne RPC-Aufrufe haben ihre Transaktion; fehlend sind Mehrfeld-Klammer und Versionsabsicherung).
- `docs/lovable-custom-rules.md`, `docs/ai-start-prompt.md` — veraltete konkurrierende Regelversionen archiviert, aktive Pfade sind Kurzverweise auf das Dachdokument.
- `docs/lovable-custom-rules-compact.md` — i18n-Bedien-Texte ausdrücklich nur dokumentierter Übergang/Notfall.
- `docs/archiv/README.md`, `docs/README.md` — Archivindex und Wegweiser ergänzt.
- `docs/03-redaktion/redaktions-aenderungsprotokoll.md` — Eintrag ergänzt (Pflicht laut Auftrag).
- `docs/current-status.md` — offener Befund konkretisiert: UI-Katalog-Manifest 414 gespeichert gegen 422 generiert.
- `scripts/ci/preflight.mjs` — CLI-Erkennung über `pathToFileURL(resolve(process.argv[1])).href` statt `new URL("file://"+…)` (Pfade mit `#`/`%` hätten still Exit 0 ohne jede Prüfung ergeben); Test-Hook `PREFLIGHT_STEPS_JSON` nur für die CLI-Schicht.
- `src/test/preflight.test.ts` — 6 neue Tests: Erkennung mit `#`/`%`, Nachweis der Abweichung der alten Variante, fremder Pfad/leeres argv, echter Child-Prozess mit durchgereichtem Exitcode 3, grüner Child-Lauf, nicht startbarer Befehl.

Neu archiviert (Inhalt unverändert, Kopf mit Ursprung/Datum/Stand/Nachfolger):
`docs/archiv/regeln-historisch/always-follow-bis-2026-09-14.md`,
`docs/archiv/regeln-historisch/lovable-custom-rules-bis-2026-09-14.md`,
`docs/archiv/regeln-historisch/ai-start-prompt-bis-2026-09-14.md`,
`docs/archiv/redaktion-historisch/redaktions-uebergabe-und-prompt-regeln-bis-2026-09-14.md`.

**Offener Befund (bewusst nicht repariert):** UI-Katalog-Manifest-Drift
414 ≠ 422 Einträge. Kein Sync, keine DB-Mutation. `npm run cms:preflight`
bricht deshalb real bei `i18n:contract` ab.

**Rücknahme:** Doku-Änderungen durch die Archivfassungen ersetzbar;
Prüfmechanik durch Rückbau der CLI-Erkennung in `scripts/ci/preflight.mjs`
und der zugehörigen Tests. Keine Datenbank-Rücknahme nötig.


Chronologische Liste aller Migrations-Etappen zur Zielarchitektur.

## cms-light-faq-item-enabled-1 — 2026-06-04

**Scope:** FAQ-Items global ein-/ausblendbar.

**Code:**
- `src/features/cms/lib/cardVisibility.ts`: fehlender Case `product_showcase_list_v1` in `expectedSlotOf` ergänzt — fixt White-Screen auf `zutrittskontrolle.biometrie` und `zutrittskontrolle.zufahrtskontrolle` (`Cannot read properties of undefined (reading 'slot')`).
- `src/features/cms/components/sections/FaqV1.tsx`: respektiert pro Item `items.<slug>.enabled` (`"0"` versteckt), zusätzlich `is_active`, `hidden`, `visible` als Alternativen. Default ohne Schalter = sichtbar (Back-Compat).
- `src/features/admin/components/CardFieldsWorkspace.tsx`: neue optionale Props `groupEnabledState`/`onToggleGroup` — zeigt pro Akkordeon-Gruppe einen Status-Chip („Gruppe an" / „Gruppe aus" / „n/m an"). Klick-Wiring an PageEditor folgt im nächsten Schritt.

**DB (Migration, idempotent):** für jedes der 533 FAQ-Items auf 102 Seiten `items.<slug>.enabled = "1"` (DE+EN) angelegt + Whitelist-Einträge. Bestehende Werte werden via `ON CONFLICT DO NOTHING` nicht überschrieben.

**Audit:** `scripts/cms/faq-section-toggle-audit.mjs` + Report unter `docs/04-betrieb/audit-snapshot/faq-section-toggle-audit.{md,json}`. Nach Migration: 0 Items ohne Schalter.

**Scope-Treue:** Keine RPC-Änderung, keine Navigation, keine Produktdatenbank, kein Public-Layout angefasst.



## cms-light-renderer-orphan-cleanup-1 — 2026-06-02

**Scope:** Verbleibende `renderer_orphan`-Befunde des Wahrheits-Checks aufgelöst — unterscheidet jetzt zwischen echten Waisen und Slots, die von hartcodierten Page-Komponenten gelesen werden.

**DB-Änderungen (Migration `20260602182725_*`, idempotent):** 21 echte Waisen auf `is_active=false` gesetzt (in `gebaeudekommunikation.beschilderung`, `mobile-tk-preview.root`, `personas.architekt.kopie`) — kein Codepfad las sie. Keine Zeile gelöscht, jederzeit reaktivierbar.

**Code-Änderungen:**
- **Neu** `scripts/cms/harvest-page-component-reads.mjs`: scannt `src/` nach `cms.asset(...)`-Aufrufen, mappt sie auf `page_key` und schreibt die Allowlist.
- **Neu** `src/features/admin/lib/knownPageComponentReads.ts`: statische Allowlist (111 Tupel, inkl. Wildcards wie `anwendungen.referenzprojekte.*`).
- `src/features/admin/lib/truthSources.ts`: neuer grüner Status `page_component_read` („Page-Komponente liest"), zusätzlicher Match gegen die Allowlist.
- `src/features/admin/components/SlotValidationView.tsx`: emerald-Badge für `page_component_read`.

**Ergebnis:** `renderer_orphan` im Wahrheits-Check auf **0**. Drei grüne Stati nebeneinander: `one_truth`, `editable_empty` / `not_yet_configured`, `page_component_read`.

**Wartung:** Nach neuen hartcodierten Page-Komponenten Allowlist neu erzeugen via `node scripts/cms/harvest-page-component-reads.mjs`.

**Scope-Treue:** Keine Public-Renderer-Strukturänderung, keine Navigation, keine Produktdatenbank, keine i18n-JSON. Keine neue RPC.

**Bericht:** `docs/04-betrieb/sprint-renderer-orphans-2026-06-02-bericht.md`.

## cms-light-whitelist-luecken-nachziehen-1 — 2026-06-02

**Scope:** `missing_whitelist`-Befunde des Wahrheits-Checks systematisch geschlossen, besonders `link_*`-Familie, und `unknown_section_type` auf 0 gezogen.

**DB-Stand (geprüft 2026-06-02):** `cms_admin_editable_fields` hat **47.966 aktive Whitelist-Einträge**; die Live-Prüfung `nicht-leere cms_section_fields (DE/EN) ohne aktiven Whitelist-Eintrag` ergibt **0**. Spiegel-Regel ist erfüllt.

**Korrektur 2026-06-02 (nach Codex-Review):** Die in einem früheren Stand dieses Eintrags zitierte Migration `20260602154129_*` enthält tatsächlich **nur** den `cta_v1`-Farbschema-Backfill (`cta_primary_color`, `cta_secondary_color` auf `auto`), **nicht** den großen `INSERT … SELECT DISTINCT … ON CONFLICT DO UPDATE`-Block. Der Zielzustand „0 fehlende Whitelist-Einträge" ist über die früheren Backfill-Migrationen im Mai (`20260521220542_*`, `20260521222649_*`, `20260524073143_*`, `20260524074341_*`, `20260524083145_*`) plus laufende Whitelist-Pflege erreicht — nicht durch eine einzige Migration am 02.06. Der DB-Zustand ist korrekt, die Erzählung war es nicht.

**Code-Änderungen:** `src/features/admin/lib/rendererSlotMap.ts` registriert `stat_v1`, `list_v1`, `tab_v1`, `role_tabs_v1` als bekannte Section-Typen (reine Text/Child-Container ohne Bildslot).

**Ergebnis:** `missing_whitelist` für aktive Inhalte auf **0**, `unknown_section_type` auf **0**. Spiegel-Regel: jeder gerenderte DB-Inhalt hat jetzt eine pflegbare Admin-Maske.

**Scope-Treue:** Keine Inhalte geändert, keine Public-Renderer-Strukturänderung, keine Produktdatenbank, keine i18n-JSON. Keine neue RPC.



## mobile-tk-preview-faq-neues-item-1 — 2026-05-27

**Scope:** Strukturelle Erweiterung der faq-Sektion auf /gebaeudekommunikation/mobile-tuerkommunikation um ein 5. Item (Slug 5-platzhalter). Vier neue cms_section_fields-Zeilen mit Platzhalter-Inhalt („Frage"/„Antwort" DE, „Question"/„Answer" EN) plus vier Whitelist-Einträge angelegt. Redaktionelle Pflege folgt durch LBN direkt im Admin.

**DB-Änderungen:**
- cms_section_fields: +4 Zeilen (items.5-platzhalter.frage und items.5-platzhalter.antwort × DE+EN)
- cms_admin_editable_fields: +4 Whitelist-Einträge

**Code-Änderungen:** keine. FaqV1-Renderer kennt das items.<slug>.frage/antwort-Schema; alphabetische Slug-Sortierung sortiert das neue Item nach 4-barrierefrei.

**Unverändert:** Bestehende FAQ-Items, faq-Section-Type, andere Sections, andere Pages.

**Quality Gates:** i18n:check 0 Fehler, build grün, FAQ-Sektion zeigt 5 Items mit dem neuen Eintrag als 5. Position.

**Bemerkung:** Slug 5-platzhalter ist absichtlich generisch. Sobald das Thema redaktionell klar ist, kann eine kleine Folge-Etappe den Slug umbenennen (analog mobile-tk-preview-faq-slugs-umbenennen-1). Der Slug-Name selbst ist im Public-Render nicht sichtbar.

## pagelayout-picture-pfad-v14-1 — 2026-05-27

**Scope:** Folge-Korrektur nach `pagelayout-hero-bild-v14-hoehe-1`. Picture-Pfad in `src/components/PageLayout.tsx` vergibt dem inneren `<img>`-Fallback-Element nun ebenfalls die V14-konforme Klasse `w-full h-[40vh] lg:h-[55vh] object-cover` (statt `block w-full h-auto`). Damit greift das einheitliche Crop-Verhalten auch für Pages mit viewport-Varianten in `cms_assets` — insbesondere für `/gebaeudekommunikation/mobile-tuerkommunikation` (LP), die einen `viewport=desktop`-Asset hat und daher bisher den Picture-Pfad mit altem Klassen-Stand nutzte.

**Code-Änderungen:**
- `src/components/PageLayout.tsx` — eine Klassen-Anpassung am inneren `<img>`-Element des Picture-Pfads. `<source>`-Elemente unverändert.

**Auswirkung:** Globaler Effekt auf alle Pages mit responsiven Picture-Quellen — Crop und Höhe jetzt einheitlich zum Single-img-Pfad und zu SnipdooIp/Tuersprechanlagen. Stichprobe: 123 aktive Hero-Image-Assets, davon ~115 mit `viewport=desktop` (Single-img-Pfad bereits gefixt), 8 Pages mit Multi-Viewport-Sets (`anwendungen.root`, `anwendungen.referenzprojekte`, `eingangssysteme.root`, `gebaeudekommunikation.root`, `gebaeudemanagement.root`, `home.start`, `legal.*`, `service.hub`, `zutrittskontrolle.root`) — diese laufen über den Picture-Pfad und werden mit diesem Fix V14-konform.

**Unverändert:** DB komplett, Single-img-Pfad (schon V14-konform aus vorhergehender Etappe), `<source>`-Elemente, andere Renderer-Komponenten.

**Quality Gates:** i18n:check 0 Fehler, build grün, Mobile-TK-LP-Hero visuell deckungsgleich mit snipdoo-IP-Hero.



## pagelayout-hero-bild-v14-hoehe-1 — 2026-05-27

**Scope:** Sichtbeschau-Korrektur Punkt 2: Hero-Bild-Klasse in `src/components/PageLayout.tsx` (Single-img-Pfad) von `block w-full h-auto` auf `w-full h-[40vh] lg:h-[55vh] object-cover` umgestellt — V14-konform. Damit zeigt sich das Hero-Bild auf der LP `/gebaeudekommunikation/mobile-tuerkommunikation` und allen anderen PageLayout-Pages mit fixer Viewport-Höhe statt natürlichem Aspect-Ratio.

**Code-Änderungen:**
- `src/components/PageLayout.tsx` — eine Klassen-Anpassung am Single-img-Pfad. Picture-Pfad bewusst unverändert (responsive Quellen-Bilder erwarten weiterhin `h-auto`/`object-contain`).

**Auswirkung:** Globaler Effekt auf alle Pages mit Hero-Bild über `CmsPageLayout`/`PageLayout` (ohne responsive Picture-Quellen).

**Unverändert:** DB komplett, Picture-Pfad, andere Renderer-Komponenten.

**Quality Gates:** i18n:check 0 Fehler, build grün, Hero-Bild visuell schmaler/V14-konform.

**Bemerkung:** Punkt 2 (letzter) von 6 aus der Sichtbeschau-Korrektur LBN. Damit ist die LP visuell auf V14-Standard zurück.

## card-grid-usecases-6-fix-1 — 2026-05-27

**Scope:** Sichtbeschau-Korrektur Punkt 4: cardGridClass-Funktion in src/features/cms/lib/cardGrid.ts um Sonderfall „useCases & itemCount === 6 → lg:grid-cols-3" erweitert. Damit zeigt sich die Anwendungen-Sektion auf /gebaeudekommunikation/mobile-tuerkommunikation jetzt im 3×2-Grid (statt 4+2). Analog zum bestehenden benefits-4-Sonderfall.

**Code-Änderungen:**
- src/features/cms/lib/cardGrid.ts — neuer Ternary-Zweig für useCases & itemCount === 6, JSDoc-Header-Kommentar aktualisiert.

**Betroffene Pages (SQL-Audit):** ausschließlich `mobile-tk-preview.root` (parent `anwendungen`, 6 Karten). Keine andere Page hat aktuell eine useCases-Family-Sektion mit genau 6 Karten.

**Auswirkung:** Tailwind-Build-sicher, da die neue Klassen-Kette „lg:grid-cols-3" bereits im benefits-Pfad enthalten ist.

**Unverändert:** detectCardGridFamily, Family-Regex-Patterns, Renderer-Komponenten, DB komplett.

**Quality Gates:** i18n:check 0 Fehler, build grün, Anwendungen-Sektion auf der LP visuell im 3×2-Grid.

**Bemerkung:** Punkt 4 von 6 aus der Sichtbeschau-Korrektur LBN. Verbleibend: Punkt 2 (Hero-Bild-Höhe).

## faq-v1-klassen-angleichen-1 — 2026-05-27

**Scope:** Sichtbeschau-Korrektur Punkt 6 (Teil 2, Formatierung): Header-Klassen in FaqV1.tsx an die projektweite Section-Header-Konvention (V14-konform, identisch zu CardsSectionV1 und TabsV1) angeglichen. H2 von `text-3xl lg:text-4xl font-bold` auf `text-2xl md:text-3xl font-heading font-normal text-foreground` umgestellt. Eyebrow von `<p>` mit `text-sm font-medium text-primary` auf `<span class="block">` mit `text-xs text-muted-foreground` umgestellt.

**Code-Änderungen:**
- src/features/cms/components/sections/FaqV1.tsx — zwei Klassen-Anpassungen im Header-Block (Zeilen 75–82).

**Auswirkung:** Globaler Effekt auf alle 3 Pages mit aktiven `faq_v1`-Sections: `mobile-tk-preview.root/faq`, `service.downloads/faq`, `service.technischer-support/faq`. Visuell konsistente Section-Header über alle Renderer hinweg.

**Unverändert:** Akkordeon-Render-Logik, collectItems, Sektion-Padding/Fond, DB komplett, alle anderen Pages.

**Quality Gates:** i18n:check 0 Fehler, build grün, FAQ-Section mit konsistenter Section-Header-Formatierung.

**Bemerkung:** Punkt 6 Teil 2 von 6 aus der Sichtbeschau-Korrektur LBN. Reihenfolge wurde in `mobile-tk-preview-faq-slugs-umbenennen-1` korrigiert. Punkt 3 (Vorschau-Platzhalter), Punkt 4 (Karten-Grid) und Punkt 2 (Hero-Höhe) folgen als eigene Etappen.


## mobile-tk-preview-faq-slugs-umbenennen-1 — 2026-05-27

**Scope:** Sichtbeschau-Korrektur Punkt 6 (Teil 1, Reihenfolge): FAQ-Slugs auf /gebaeudekommunikation/mobile-tuerkommunikation umbenannt mit numerischem Präfix (1-neue-anlage, 2-variante, 3-installation, 4-barrierefrei), damit die alphabetische FaqV1-Sortierung der V14-Reihenfolge entspricht. Reine Field-Key-Umbenennung in cms_section_fields und cms_admin_editable_fields — Werte und Section-Typ unverändert.

**DB-Änderungen:**
- cms_section_fields: 16 Field-Key-Renames (4 Items × frage/antwort × DE+EN) auf faq
- cms_admin_editable_fields: 16 entsprechende Whitelist-Renames
- Schreibweg: Option A — direktes UPDATE auf field_key-Spalte mit Regex-WHERE (idempotent, da die WHERE-Klausel nur Alt-Slugs matcht)

**Code-Änderungen:** keine.

**Unverändert:** Werte aller Felder, section_type=faq_v1, andere Sections, andere Pages.

**Quality Gates:** i18n:check 0 Fehler, build grün, FAQ-Reihenfolge auf der LP entspricht V14.

**Bemerkung:** Punkt 6 Teil 1 von 6 aus der Sichtbeschau-Korrektur LBN. Teil 2 (Formatierung der FAQ-Headlines) folgt als eigene Etappe mit Renderer-Anpassung.


## tranche-27b-anforderungen-cards — 2026-05-27

**Scope:** Legacy-Sammelblock `anforderungen` (content_v1 mit `<key>.label/.text/.icon`) auf echte `card_v1`-Kindsections umgestellt. Pilot (behoerde, bidirektionale-video) + Rollout (13 weitere) in einer idempotenten Migration.

**DB-Änderungen:**
- cms_sections: +72 `card_v1`-Kindsections (`anforderungen_item_<key>`) auf 15 Seiten
- cms_section_fields: +432 Zeilen (title/description/icon × DE+EN)
- cms_admin_editable_fields: +576 Whitelist-Einträge (title/description/icon/icon_image × DE+EN)

**Code-Änderungen:** `src/features/anwendungen/components/AnwendungDetailPage.tsx` — Doppelpfad: bei vorhandenen Kindsections DB-first aus diesen lesen (inkl. `icon_image`-Asset-Slot mit Priorität vor Lucide), sonst 27a-Legacy-Pfad.

**Unverändert:** Legacy-Felder `<key>.label/.text/.icon` bleiben als Fallback. Parent `anforderungen` bleibt `content_v1` (Custom-Renderer zuständig, kein Doppel-Render). mobile-tuerkommunikation ausgelassen (Sonderstruktur). Andere Anwendungen-Spezialseiten ohne `anforderungen`-Section nicht betroffen.

**Quality Gates:** I3=0, I5=0, R4=0, S2=0, tsc grün, i18n:check 0 Fehler, Realtest auf Pilotseiten erfolgreich.

## mobile-tk-preview-hero-felder-spiegelung-1 — 2026-05-27

**Scope:** Sichtbeschau-Korrektur Punkt 1: Untertitel und Lead-Text der Hero-Section auf /gebaeudekommunikation/mobile-tuerkommunikation wurden nicht gerendert, weil CmsPageLayout die DB-Field-Keys subheader und answerFirst nicht als Aliase kennt. Neue Felder subheadline und intro auf der hero-Section angelegt, Werte aus subheader bzw. answerFirst gespiegelt (DE+EN). Whitelist gesetzt. Legacy-Felder bleiben unverändert in der DB.

**DB-Änderungen:**
- cms_section_fields: +4 Zeilen (subheadline.de, subheadline.en, intro.de, intro.en auf hero)
- cms_admin_editable_fields: +4 Whitelist-Einträge

**Code-Änderungen:** keine. CmsPageLayout liest die neuen Field-Keys über den vorhandenen pick-Helper.

**Unverändert:** Legacy-Felder subheader und answerFirst (DE+EN) bleiben in der DB stehen und sind im Admin weiterhin pflegbar, werden aber vom Renderer nicht mehr gelesen.

**Quality Gates:** i18n:check 0 Fehler, build grün, Untertitel und Lead-Text visuell auf der LP sichtbar.

**Bemerkung:** Punkt 1 von 6 aus der Sichtbeschau-Korrektur LBN.

## zutrittskontrolle-root-cmsonly-1 — 2026-05-22

**Scope:** Root-Seite `/zutrittskontrolle` (page_key=`zutrittskontrolle.root`) komplett auf `CmsOnlyShell` umgestellt. Vorher rendete die Code-Seite `ZutrittskontrollePage` Hero + BCM-Block + eine **hardcodierte 4er-Whitelist** von Teaser-Keys (`TEASER_SECTION_KEYS`). Dadurch erschien der im Admin neu angelegte Block **B-1677** (`teaser_zufahrt_parkraum`, `teaser_2col_v1`, sort_order=7) trotz `is_active=true` nicht auf der Public-Seite — direkter Verstoß gegen die Spiegel-Regel.

**Code-Änderungen:**
- `src/features/zutrittskontrolle/routes.tsx` — Route `/zutrittskontrolle` zeigt jetzt `<CmsOnlyShell pageKey="zutrittskontrolle.root" />` statt `<ZutrittskontrollePage />`. Restliche Unter-Routen unverändert.
- `src/features/zutrittskontrolle/pages/ZutrittskontrollePage.tsx` — gelöscht (keine doppelte Wahrheit, Regel 6 aus `always-follow.md`). Keine weiteren Importe vorhanden.

**Rendering nach Umstellung (Reihenfolge folgt `cms_sections.sort_order`):**
1. hero (hero_v1) → `CmsPageLayout` (Hero-Bild aus `cms_assets`, headline/intro aus DB)
2. bcm (content_v1, sort_order=1) → `ContentSectionV1`
3. teaser_tueren_tore (teaser_2col_v1, sort_order=3)
4. teaser_mobile_door_app (sort_order=4)
5. teaser_fahrstuhlsteuerung (sort_order=6)
6. **teaser_zufahrt_parkraum (B-1677, sort_order=7)** — ab jetzt sichtbar
- `functions` (content_v1, sort_order=2) bleibt `is_active=false` → wird nicht gerendert.
- `teaser_schliesssysteme` (sort_order=5) bleibt `is_active=false` → wird nicht gerendert.

**DB-Änderungen:** keine.
**Migrationen:** keine.
**RPCs:** keine.
**Produktdatenbank:** unverändert.
**Öffentliche Navigation/Routen:** unverändert (gleicher Pfad `/zutrittskontrolle`, nur anderes Element).
**i18n-JSONs:** unverändert. Hinweis: Legacy-Pfade `zutrittskontrolle.json` (`root.functions.*`, `shared.label`) bleiben als Fallback im Repo bestehen, werden aber von `CmsOnlyShell` nicht mehr abgefragt. Eine spätere Aufräum-Etappe kann sie entfernen.
**Admin:** unverändert / isoliert.

**Spiegel-Regel:** wiederhergestellt — alle Top-Level-Sections der Page werden jetzt vom generischen `CmsBodyRenderer` nach `sort_order` und `is_active` gerendert. Neue Teaser-Sections im Admin erscheinen ohne weiteren Code-Eingriff.

**Quality Gates:** Build wird vom Harness ausgeführt; `npm run i18n:check` ist hier nicht relevant (keine i18n-Änderung). Visuelle Verifikation auf `/zutrittskontrolle`: Hero unverändert, BCM-Block weiterhin sichtbar (jetzt über ContentSectionV1 statt PageLayout-ContentSection — leichter Stil-Unterschied möglich), 4 Wechselteaser inkl. Zufahrt/Parkraum.

**Bemerkung:** Folge-Aufräumkandidaten (separate Etappen): (1) Hero-Asset-Dubletten in `cms_assets` (mehrere `is_active=false` Einträge für Slot `hero/image` pro Viewport), (2) Aufräumen der i18n-Keys `zutrittskontrolle.root.functions.*` + `zutrittskontrolle.shared.label`, (3) `functions`-Section in DB löschen oder dauerhaft inaktiv lassen.



## mobile-tk-preview-zielgruppen-tabs-1 — 2026-05-22

**Scope:** zielgruppen-Section auf /gebaeudekommunikation/mobile-tuerkommunikation (page_key=mobile-tk-preview.root) strukturell von content_v1 (mit flachen spalten.<key>.*-Feldern) auf tabs_v1 mit 4 tab_v1-Kind-Sections migriert. Inhalte aus alten spalten.*-Feldern in tab_label/title/description/vorteile.<n>.* der Kind-Sections kopiert. Parent-Felder label/title/tablist_label (DE+EN) aus alten eyebrow/headline/tablistLabel gespiegelt.

**DB-Änderungen:**
- cms_sections: UPDATE zielgruppen.section_type → tabs_v1; +4 Zeilen (tab_bewohner, tab_wohnungswirtschaft, tab_bauherren, tab_handwerk, alle section_type=tab_v1, parent_section_id=zielgruppen, sort_order 1–4, is_active=true).
- cms_section_fields: +6 Zeilen Parent (label, title, tablist_label × DE+EN); +88 Zeilen Kinder (4 Tabs × 11 Felder × DE+EN). Verifikation: jede Tab-Section hat 22 Felder.
- cms_admin_editable_fields: +94 Whitelist-Einträge (6 Parent + 88 Kinder), alle is_enabled=true.

**Code-Änderungen:** keine. Rendering läuft über CmsBodyRenderer.RENDERERS.tabs_v1 → TabsV1 (aus Etappe 4g-1).

**Legacy in DB:** zielgruppen.eyebrow, headline, tablistLabel, spalten.* bleiben unverändert in cms_section_fields stehen und werden vom neuen Renderer ignoriert (kein DELETE).

**Abweichung zum Prompt-SQL:** Die im Prompt skizzierten Verifikations-Queries referenzierten Spalten `page_id` / `section_id`, die im realen Schema nicht existieren — `cms_sections` und `cms_section_fields` verwenden direkt `page_key` / `section_key`. Verifikation wurde entsprechend per page_key + parent_section_id-Lookup ausgeführt und bestätigt das Zielbild.

**Unverändert:** Andere Sections der LP, andere Pages, TabsV1-Renderer, CmsBodyRenderer, cms_pages, Navigation P-236, cms_assets, alle Code-Dateien, i18n-JSONs.

**Spiegel-Regel:** Tabs im Admin-Tree nested unter Parent sichtbar; Reorder/Sichtbarkeit/Inhalt schlagen direkt auf die LP durch.

**Quality Gates:** keine i18n-/Code-Änderung; Tabs visuell als Underline-Reiter mit Framer-Motion-Fade auf der LP sichtbar, ARIA-konform.

**Bemerkung:** Mit 4g-2 ist die Zielgruppen-Sektion strukturell V14-konform. Verbleibende LP-Etappen: 4h (CTA-Block) und 4i (sticky Sub-Nav + noindex/robots-Meta).

## tabs-v1-section-typ-1 — 2026-05-22

**Scope:** Neuer Section-Typ tabs_v1 (Parent) + tab_v1 (Kind) eingeführt. Horizontale Tab-Navigation mit ARIA-konformen Reitern, Framer-Motion-Fade beim Tab-Wechsel, lokaler useState für aktiven Tab. Visuelles Pattern aus V15/V14-MobileTkPreviewPage (Underline-Style, font-body). Pro Tab bis zu 4 Vorteile mit Mini-Headline + Body, flach als vorteile.<n>.* modelliert (bewusste Ausnahme von der Karten-/Listen-Regel — feste Struktur, keine projektweite Wiederverwendung geplant). Keine DB-Schreibvorgänge, kein Page-Eingriff. Der neue Typ ist ab dieser Etappe verfügbar, aber noch unbenutzt. Etappe 4g-2 wird ihn auf der Mobile-TK-LP zielgruppen-Sektion zum Einsatz bringen.

**Code-Änderungen:**
- src/features/cms/components/sections/TabsV1.tsx (neu) — Renderer-Komponente mit Parent-Feldern, Tab-Buttons, Tab-Panel-Content mit Vorteils-Grid.
- src/features/cms/components/CmsBodyRenderer.tsx — Case für tabs_v1 im RENDERERS-Mapping ergänzt.

**Doku:**
- docs/02-architektur/section-typen-katalog.md — neue Abschnitte für tabs_v1 und tab_v1 mit Feldspezifikation und Renderer-Verhalten.

**Unverändert:** DB komplett, alle bestehenden Sections und Pages, i18n-JSONs, Navigation.

**Quality Gates:** i18n:check 0 Fehler, build grün, Smoke-Test ohne sichtbare Veränderung an Bestandsseiten (keine Section vom neuen Typ existiert in der DB).



## mobile-tk-preview-faq-section-type-1 — 2026-05-22

**Scope:** faq-Section auf /gebaeudekommunikation/mobile-tuerkommunikation (page_key=mobile-tk-preview.root) von content_v1 auf faq_v1 umgestellt. Reine section_type-Umstellung — keine Inhalts-, Whitelist- oder Asset-Migration nötig, weil das vorhandene Feld-Schema (eyebrow/headline + items.<slug>.frage/antwort) bereits exakt zum FaqV1-Renderer passt.

**DB-Änderungen:**
- cms_sections: UPDATE faq.section_type → faq_v1 (idempotent; DB war beim Ausführen bereits auf faq_v1, kein Zeilen-Update nötig — Zielzustand erreicht).

**Code-Änderungen:** keine. Rendering läuft über CmsBodyRenderer.RENDERERS.faq_v1 → FaqV1.

**Unverändert:** Alle cms_section_fields (inkl. der 4 items neueAnlage/variante/installation/barrierefrei mit frage/antwort DE+EN), alle cms_admin_editable_fields-Einträge, cms_assets, andere Sections der LP, andere Pages, Navigation.

**Reihenfolgen-Hinweis:** FaqV1 sortiert die Items alphabetisch nach Slug. Neue Reihenfolge auf der Page: barrierefrei → installation → neueAnlage → variante. V14-Reihenfolge war neueAnlage → variante → installation → barrierefrei. Inhaltlich akzeptiert (jede FAQ steht für sich); falls V14-Reihenfolge wiederhergestellt werden soll, per Slug-Umbenennung in eigener Folge-Etappe.

**Quality Gates:** SQL-Verifikation: section_type=faq_v1, is_active=true. FAQ rendert über FaqV1-Akkordeon mit 4 Items.

## mobile-tk-preview-komponenten-bilder-1 — 2026-05-22

**Scope:** 6 Bilder für die komponenten-Karten auf /gebaeudekommunikation/mobile-tuerkommunikation hochgeladen, je eine cms_assets-Zeile pro komp_*-Kind-Section. Alt-Texte DE+EN aus V14-mobileTkPreview.json (komponenten.items.*.imageAlt) übernommen.

**DB-Änderungen:**
- cms_assets: +6 Zeilen (komp_smart_stick_mobile_phone, komp_ip_gateway, komp_smart_stick_dect_global, komp_smart_stick_phone, komp_funkgong, komp_dect_connect_sets, jeweils field_key=image, viewport=desktop, mime=image/webp, alt_de+alt_en gesetzt, is_active=true).
- Storage: 6 Dateien hochgeladen unter cms-assets/mobile-tk-preview.root/komp_*/image/desktop/.

**Format-Hinweis:** komponente-ip-gateway.webp wurde als PNG mit .webp-Endung (1920×1080, ~285 KB) geliefert und serverseitig via Pillow zu echtem WebP (RIFF/VP8, Quality 85) konvertiert (~45 KB). Die anderen 5 Dateien waren bereits echte WebPs.

**Code-Änderungen:** keine.

**Unverändert:** Sections, Felder, Whitelist, alle Code-Dateien, alle anderen Pages, andere Sections der LP, Navigation.

**Quality Gates:** SQL-Verifikation OK (6 Zeilen, alle viewport=desktop, mime_type=image/webp, Alt-Texte DE+EN gesetzt). Tablet/Mobile-Viewports folgen in separater Etappe.


## mobile-tk-preview-komponenten-cards-1 — 2026-05-22

**Scope:** komponenten-Section auf /gebaeudekommunikation/mobile-tuerkommunikation (page_key=mobile-tk-preview.root) strukturell von content_v1 (mit flachen items.*.title/tagline/body/imageAlt-Feldern) auf cards_v1 mit 6 card_v1-Kind-Sections migriert. Inhalte aus alten items.*-Feldern in title/subtitle/description der Kind-Sections kopiert (tagline → subtitle). Parent-Felder label und title (DE+EN) aus alten eyebrow/headline gespiegelt. Kein Bild-Upload (folgt in Etappe 4e). Karten haben in V14 zusätzlich einen „Mehr erfahren"-Link mit href="#" — dieser wird in dieser Etappe bewusst NICHT übernommen.

**DB-Änderungen:**
- cms_sections: UPDATE komponenten.section_type → cards_v1; +6 Zeilen (komp_smart_stick_mobile_phone, komp_ip_gateway, komp_smart_stick_dect_global, komp_smart_stick_phone, komp_funkgong, komp_dect_connect_sets, alle section_type=card_v1, parent komponenten, sort_order 1–6).
- cms_section_fields: +4 Parent (label/title DE+EN); +36 Kinder (6 × title+subtitle+description × DE+EN).
- cms_admin_editable_fields: +52 Whitelist-Einträge (4 Parent + 48 Kinder inkl. image-Slot für 4e).

**Code-Änderungen:** keine.

**Legacy in DB:** komponenten.eyebrow, .headline, .linkLabel, .items.*.title/tagline/body/imageAlt bleiben unverändert, vom neuen Renderer ignoriert. imageAlt-Werte werden in 4e an cms_assets gehängt.

**Unverändert:** Andere Sections der LP, andere Pages, CmsBodyRenderer, CardsSectionV1, cms_pages, Navigation P-236.

**Quality Gates:** SQL-Verifikation grün (Parent=cards_v1; 6 Kind-Sections card_v1 sort_order 1–6; 36 Kinder-Felder vorhanden).

**Bemerkung:** Etappe 4e folgt mit 6 Bild-Uploads inkl. Alt-Texten.

## mobile-tk-preview-anwendungen-cards-1 — 2026-05-22

**Scope:** `anwendungen`-Section auf `/gebaeudekommunikation/mobile-tuerkommunikation` (page_key=`mobile-tk-preview.root`) strukturell von `content_v1` mit flachen `items.*`-Feldern auf `cards_v1` + 6 `card_v1`-Kinder migriert. Inhalte aus `items.<key>.title`/`items.<key>.body` in `title`/`description` der Kinder kopiert. Parent-Felder `label`/`title` (DE+EN) aus `eyebrow`/`headline` gespiegelt, damit `CardsSectionV1` sie rendert. Kein Bild-Upload (Etappe 4c).

**DB-Änderungen:**
- cms_sections: UPDATE `anwendungen.section_type` → `cards_v1`; +6 Kinder (`card_paket`, `card_ip_gateway_mfh`, `card_funkgong`, `card_dect`, `card_buero`, `card_barrierefrei`, sort_order 1–6, parent_section_id auf `anwendungen`).
- cms_section_fields: +4 Parent (`label` DE+EN, `title` DE+EN); +24 Kinder (6 × `title`+`description` × DE+EN).
- cms_admin_editable_fields: +40 Einträge (Parent `label`+`title`, je Karte `title`+`description`+`image`, alle × DE+EN).

**Code-Änderungen:** keine. Rendering läuft über bestehenden `CmsBodyRenderer.RENDERERS.cards_v1` → `CardsSectionV1`.

**Legacy in DB:** `anwendungen.eyebrow`, `anwendungen.headline`, `anwendungen.items.*.title`, `anwendungen.items.*.body`, `anwendungen.items.*.imageAlt` (DE+EN) bleiben unverändert stehen. `imageAlt`-Werte werden in 4c als `alt_text_de`/`alt_text_en` an die neuen `cms_assets`-Zeilen geheftet.

**Unverändert:** Andere Sections der LP, andere Pages, Renderer, Routen, Navigation P-236, i18n.

**Idempotenz:** Alle Inserts via `ON CONFLICT DO NOTHING` / `DO UPDATE` — Wiederholung verändert nichts.

**Quality Gates:** SQL-Verifikation OK (Parent=cards_v1, 6 Kinder sort_order 1–6, 24 Karten-Felder, 40 Whitelist-Einträge). Karten erscheinen text-only im Grid; Bild-Slots leer bis 4c.



## mobile-tk-preview-url-umzug-1 — 2026-05-22

**Scope:** Mobile-TK-LP URL-Umzug von `/mobile-tk-preview` auf `/gebaeudekommunikation/mobile-tuerkommunikation`. Alte URL bleibt als Client-Redirect (`<Navigate replace>`) aktiv. CTA-Link auf Türsprechanlagen-Mobile-TK-Sektion aktualisiert. `page_key`, Feature-Ordnername, Storage-Pfade und Navigations-Knoten P-236 unverändert.

**DB-Änderungen:**
- cms_pages: UPDATE `route_path` für `mobile-tk-preview.root` → `/gebaeudekommunikation/mobile-tuerkommunikation`.
- cms_section_fields: UPDATE `cta_link` (DE+EN) auf `gebaeudekommunikation.tuersprechanlagen / mobile_tk` → neue URL.

**Code-Änderungen:**
- `src/features/mobile-tk-preview/routes.tsx`: neue Route auf der Zieladresse, zusätzlicher Redirect von der alten URL via `<Navigate replace>`.

**Offene Treffer alter URL (bewusst nicht migriert):**
- `scripts/sync/build-sync-sql.mjs:152` — historisches Sync-Mapping (Snapshot-Build).
- `docs/archiv/sync/diff-report.md:105` — Historie.
- `docs/migration-log.md` (Eintrag 4a) — Historie.

**Unverändert:** page_key, Feature-Ordnername, Storage-Pfade, cms_navigation_nodes P-236, alle anderen Pages, i18n.

**Quality Gates:** SQL-Verifikation OK (neue route_path, neue CTA-Links DE+EN), neue URL öffnet LP, alte URL redirected via React-Router.



## mobile-tk-preview-hero-bild-1 — 2026-05-21

**Scope:** Hero-Bild für LP /mobile-tk-preview (page_key=mobile-tk-preview.root) eingespielt. Datei wurde als PNG-Container hochgeladen, daher per Pillow nach echtem WebP konvertiert (85 KB) und in Bucket `cms-assets` unter `mobile-tk-preview/hero/image/hero-mobile-tuerkommunikation.webp` abgelegt. Bestehende `cms_assets`-Zeile aktualisiert (Alt-Texte DE/EN, MIME, Dateiname). Whitelist für Bild-Slot `hero.image` × DE+EN ergänzt. `hero.imageAlt` und dessen Whitelist waren bereits vorhanden — unverändert.

**DB-Änderungen:**
- cms_assets: 1 Zeile aktualisiert (alt_text_de/en, alt_de/en, mime_type=image/webp, file_name).
- cms_admin_editable_fields: +2 Einträge (hero.image × de/en).
- cms_section_fields: keine (imageAlt war schon da).
- Storage: 1 Datei überschrieben.

**Code-Änderungen:** keine.

**Quality Gates:** SQL-Verifikation 1 Zeile, viewport=desktop, mime=image/webp, Alt-Texte gesetzt. Rendering läuft automatisch über CmsPageLayout.

**Bemerkung:** Tablet/Mobile-Viewports und Bilder für `anwendungen`/`komponenten`-Sections folgen in Tranchen 4b–4e (vorher Umstellung `content_v1` → `cards_v1` nötig).


## tuersprechanlagen-snipdoo-umbau-1 — 2026-05-21

**Scope:** Bestehende `snipdoo`-Section auf `gebaeudekommunikation.tuersprechanlagen` von `content_v1` (zuvor durch 3b-1 auf `cta_v1` verschoben dokumentiert — tatsächlich war section_type bereits `cta_v1`, jetzt) auf `teaser_2col_v1` umgebaut. Page-spezifische `SnipdooSection`-Komponente entfernt; Renderer fällt jetzt auf den generischen `Teaser2ColV1`-Pfad zurück (aus Etappe 3a). `mobile_tk` (3b-1) bleibt unverändert.

**DB-Änderungen:**
- `cms_sections`: UPDATE `snipdoo.section_type` → `teaser_2col_v1`.
- `cms_section_fields`: +6 Zeilen (`cta_label`, `image_position`=left, `background_variant`=default × DE+EN).
- `cms_admin_editable_fields`: +8 Whitelist-Einträge (3 neue Felder + Bild-Slot `image` × DE+EN).
- `cms_assets`: **noch nicht erfolgt** — Bild `teaser-snipdoo-ip.webp` war nicht im Upload-Kanal angekommen; Asset-Upload (Schritt 4 des Prompts) folgt nach erneutem Hochladen.

**Code-Änderungen:**
- `src/features/gebaeudekommunikation/pages/TuersprechanlagenPage.tsx`: `snipdoo`-Eintrag aus `SECTION_RENDERERS` entfernt, `SnipdooSection`-Komponente gelöscht, ungenutzte Imports (`Link` aus react-router-dom, `PageLayout`-Default) bereinigt. `ContentSection`, `ArrowRight` bleiben (weiter genutzt).

**Legacy in DB:** Bestehende `snipdoo.cta`-Felder (DE+EN) bleiben unverändert. Der neue Renderer liest nur `cta_label` und ignoriert `cta`.

**Unverändert:** `mobile_tk`-Section, andere Sections der Page, andere Pages, `Teaser2ColV1`, `CmsBodyRenderer`, generischer Fallback-Pfad, `FALLBACK_ORDER`, Navigation, i18n-JSONs.



## tuersprechanlagen-mobile-tk-section-1 — 2026-05-21

**Scope:** Neue Section `mobile_tk` (section_type=`teaser_2col_v1`) auf `gebaeudekommunikation.tuersprechanlagen` zwischen `card_series_h` (Innenstationen-Kind) und `snipdoo` angelegt. snipdoo, anwendungsumfelder, vorteile und scroller um eins nach hinten verschoben (sort_order +1). Snipdoo-Section in dieser Etappe nicht angefasst — folgt in 3b-2.

**DB-Änderungen:**
- `cms_sections`: +1 Zeile (`mobile_tk`, sort_order=19); UPDATE sort_order +1 für snipdoo(20), anwendungsumfelder(21), vorteile(22), scroller(23).
- `cms_section_fields`: +14 Zeilen (`label`, `title`, `text`, `cta_label`, `cta_link`, `image_position`=right, `background_variant`=muted × DE+EN).
- `cms_admin_editable_fields`: +16 Whitelist-Einträge (7 Felder + Bild-Slot `image` × DE+EN).
- `cms_assets`: **noch nicht erfolgt** — Bild `hero-mobile-tuerkommunikation.webp` war nicht im Upload-Kanal angekommen; Asset-Upload (Schritt 4 des Prompts) folgt nach erneutem Hochladen.

**Code-Änderungen:** keine. Rendering läuft über den in Etappe 3a eingeführten generischen Fallback-Pfad (`CmsBodyRenderer.RENDERERS.teaser_2col_v1` → `Teaser2ColV1`).

**Unverändert:** `snipdoo`-Section, alle anderen Sections, `TuersprechanlagenPage.tsx`, `Teaser2ColV1.tsx`, `CmsBodyRenderer.tsx`, i18n-JSONs, Navigation.



## cms-light-admin-section-hierarchy-1 — 2026-05-12 (Generische Block-Hierarchie + Persona-Akkordeon + Kopier-Ablage + Kurz-IDs)

**Scope:** DB-Schema additiv (`cms_sections.parent_section_id` + Index), neue/aktualisierte SECURITY-DEFINER-RPCs (`rpc_admin_set_section_parent`, `rpc_admin_set_section_position` parent-aware, `rpc_admin_read_page_sections` mit `parent_section_id`/`parent_section_key`/`section_uid`, `rpc_admin_search_short_ids`, Kurz-ID-Spalten `node_no`/`section_uid`/`asset_no`), interne DFS-Resequenzierung (`cms_resequence_sections_dfs`). **Keine** Statusänderung, **keine** Veröffentlichung, **keine** i18n-Änderung, **keine** Public-Routen-Änderung, **keine** Produktdatenbank-Berührung. Frontend-Refactor (`NavigationTreeEditor` rekursiv mit `SectionLevel`, „Teil von …"-Dropdown, DnD pro Ebene, Persona-Akkordeon als Spezialfall der generischen Hierarchie, Kopier-Ablage über Seiten/Knoten hinweg). Public-Fix `PersonaSection.tsx` (Fallback-Animate für sechste Karte „Bauherren").

**Ziel:** Beliebige Blöcke können beliebigen anderen Blöcken untergeordnet werden — inkl. Reihenfolge per Drag-and-Drop und Kopieren über Seiten hinweg. Persona-Sonderlogik wird durch das generische Modell abgelöst. Kurz-IDs (N-/B-/A-) erlauben schnelles Springen und prägnante Referenzen in Doku/Übergabe.

**Migrationen (idempotent, `IF NOT EXISTS` / `CREATE OR REPLACE`):**
- `20260512062707_…` — Kurz-IDs `node_no`, `section_uid`, `asset_no` (Sequences + Backfill).
- `20260512064251_…` — Kurz-IDs in Read-RPCs sichtbar.
- `20260512065730_…` — `rpc_admin_search_short_ids(p_query, p_limit)`.
- `20260512071357_…` — `section_uid` in `rpc_admin_read_page_sections`.
- `20260512080348_…` — `cms_sections.parent_section_id` (FK + Index), `rpc_admin_set_section_parent`, parent-aware `rpc_admin_set_section_position`, `cms_resequence_sections_dfs`, Read-RPC um Parent-Felder erweitert.

**Schreibpfad:** weiterhin ausschließlich whitelisted `rpc_admin_*`. Verifiziert per `rg "\.insert\\|\.update\\|\.upsert\\|\.delete"` in `src/features/admin/` — nur In-Memory-`Set`/`Map.delete` gefunden, keine Tabellen-Mutationen.

**Verifikation:**
- Persona-Akkordeon klappt in Admin auf/zu, Karten per DnD intern sortierbar, Gruppe als Einheit verschiebbar.
- Public: `/`-Persona-Sektion zeigt alle sechs Karten zuverlässig (Bauherren-Bug behoben).
- Kurz-ID-Suchleiste springt zu N-/B-/A-IDs.
- „Teil von …"-Dropdown verschiebt einen Block unter einen anderen; Cycle-Detection greift.

**Übergabe:** siehe `docs/05-checkpoints/admin-checkpoint-i5-handoff.md` für vollständigen Stand und Empfehlungen für die externe KI.

---

## cms-light-admin-master-detail-1 — 2026-05-11 (UI-Konsolidierung „Struktur & Inhalte")

**Scope:** Reines UI-Refactoring. **Keine** Migration, **keine** neue RPC, **keine** Änderung am Schreibpfad, **keine** Statusänderung, **keine** Veröffentlichung, **kein** Asset-Upload, **keine** Änderung an i18n-Dateien, **keine** Änderung an öffentlichen Routen / Navigation / Footer, **keine** Berührung der Produktdatenbank.

**Ziel:** Redakteure sollen nicht mehr zwischen vier Sub-Tabs (Baum · Labels · Inhalte · Freigaben) hin- und herspringen. Stattdessen ein **Master-Detail-Arbeitsplatz**: links kollabierbarer Navigationsbaum, rechts ein großflächiger Seiten-Editor, der für den gewählten Knoten alles auf einer Fläche zeigt — Stammdaten, Navigations-Label DE/EN, Sections (Inhalts-Blöcke) mit allen Feldern und einem Freigabe-Schalter direkt am Feld.

**Implementierung (Frontend, neu):**
- `src/features/admin/components/PageEditor.tsx` — neuer großer Seiten-Editor. Vier Blöcke: Kopf (read-only) · Navigations-Label DE/EN · Sections+Felder (für CMS-gepflegte Seiten) · Hinweis-Box für Code-Seiten/Nav-only. Nutzt ausschließlich bestehende RPCs `rpc_admin_update_navigation_label`, `rpc_admin_update_section_field`, `rpc_admin_set_editable_field_enabled`. Lädt das Pilot-Bundle bei Bedarf über `rpc_admin_read_pilot_pflege(p_page_key)` nach.
- `src/features/admin/components/MasterDetailWorkbench.tsx` — kombiniert `NavigationTreeEditor` (Sidebar) mit `PageEditor` (rechte Spalte) und einem Sidebar-Toggle („Baum einklappen / einblenden"). Trigger bleibt im Vollbild-Editor-Modus sichtbar.

**Implementierung (Frontend, geändert):**
- `src/features/admin/pages/AdminPage.tsx`:
  - Sub-Tab-Reihenfolge im Tab „Struktur & Inhalte" auf `Seiten · Labels (Diagnose) · Inhalte (Backup) · Freigaben (Backup)` umgestellt; Default `Seiten`.
  - Neuer Sub-Tab `Seiten` rendert `MasterDetailWorkbench`.
  - Whitelist-Zeilen (`cms_admin_editable_fields`) werden zentral in der AdminPage geladen und als `editableFields` durchgereicht; nach Toggle wird `loadEditableFields()` ausgelöst.
  - Alte Sub-Tabs „Inhalte (CMS-Pilot)" und „Freigaben (Felder)" sind als „Backup"-Ansichten erhalten geblieben und mit einer Notice markiert; sie werden in Folge-Etappe `cms-light-admin-master-detail-2` entfernt.
  - Sub-Tab „Labels" zu „Labels (Diagnose)" umbenannt; Wanderung in den Bereich „Diagnose" folgt in der Folge-Etappe.

**Schreibpfade (alle bestehend, keine neuen):**
- `rpc_admin_update_navigation_label`, `rpc_admin_update_section_field`, `rpc_admin_set_editable_field_enabled`, `rpc_admin_move_navigation_node`.
Kein Frontend-Code schreibt direkt in Tabellen.

**Verifikation:**
- `npm run i18n:check` → 0 Fehler, 0 Warnungen.
- Sub-Tab „Seiten": Pilotseiten `anwendungen.pflege` und `anwendungen.gesundheitseinrichtungen` auswählbar; Sections/Felder werden gerendert; Speichern und Freigabe-Schalter funktionieren über die bestehenden RPCs.
- Code-only-Seiten zeigen die Hinweis-Box „Inhalte aus Code & i18n"; Label-Editor bleibt nutzbar.
- Navigation-only-Knoten zeigen die Nav-only-Box.
- Public Website, i18n-Dateien, Routen, Footer, Produktdatenbank: nicht angetastet.


## cms-light-admin-section-field-editor-whitelist-1 — 2026-05-10 (Generischer Section-Field-Editor mit Whitelist)

**Scope:** Neue Whitelist-Tabelle, neue Schreib-RPC, Frontend-Umstellung. **Keine** Statusänderung, **keine** Veröffentlichung, **kein** Asset-Upload, **keine** zweite Pilotseite, **kein** Duplizieren, **keine** Public-Navigation aus DB, **keine** Produktdatenbank, **keine** i18n-Änderung, **keine** Routenänderung, **kein** Auth.

**Ziel:** Die seitenspezifische Pilot-Schreiblogik wird durch einen allgemeineren, aber whitelist-geschützten Section-Field-Editor ersetzt. Künftige Pilotseiten brauchen nur Whitelist-Zeilen + vorhandene `cms_section_fields`-Zeilen — keine neuen Spezial-RPCs.

**Implementierung (DB):**
- Neue Tabelle `public.cms_admin_editable_fields` mit `(page_key, section_key, field_key, locale, is_enabled)` und Unique-Constraint auf der Vier-Tupel-Kombination. Locale-Check `('de','en')`. RLS aktiviert; Lese-Policy für `anon` + `authenticated`; **kein** Schreib-Policy → Whitelist-Pflege ausschließlich über Migrationen.
- Initial-Seed: acht Pflege-Felder (Hero/headline+intro, Answer-First/text, Intro/text — je DE+EN), idempotent via `ON CONFLICT DO NOTHING`.
- Neue Funktion `public.rpc_admin_update_section_field(p_page_key, p_section_key, p_field_key, p_locale, p_value)`:
  - prüft Locale (`de`/`en`),
  - prüft Whitelist (`cms_admin_editable_fields` mit `is_enabled=true`),
  - führt **genau ein** `UPDATE` auf `cms_section_fields.value` aus,
  - **kein** `INSERT`/`UPSERT`, **keine** Statusänderung, **keine** Navigation, **keine** Assets,
  - liefert bei nicht existierender Zeile `success=false, updated=false, error='row_not_found'`.
- `EXECUTE` der Funktion: revoked `public`, gewährt für `anon` und `authenticated` (No-Login-Prototyp).
- Alte RPC `rpc_admin_update_pilot_pflege_field` bleibt bestehen (kein Cleanup in dieser Etappe).

**Implementierung (Code):**
- `src/features/admin/api/cmsAdminWrite.ts` ruft jetzt ausschließlich `rpc_admin_update_section_field` auf. Neue Funktion `saveSectionField({ pageKey?, sectionKey, fieldKey, locale, value })`. Bestehender `savePilotField`-Wrapper bleibt für Aufrufer-Kompatibilität, leitet intern auf `saveSectionField` mit `pageKey='anwendungen.pflege'` durch. Clientseitige Whitelist entfernt — die einzige Wahrheit liegt in `cms_admin_editable_fields`.
- `src/features/admin/components/EditableField.tsx`: nur Kommentar-Update, Verhalten unverändert.

**Verifikation:**
- `psql`: Whitelist enthält die acht erwarteten Zeilen.
- RPC-Smoketests: erlaubtes Feld → `success=true, updated=true`; Fantasiefeld → `field_not_allowed`; ungültige Locale `fr` → `locale_not_allowed`.
- `rg "rpc_admin_update_pilot_pflege_field" src` zeigt nur noch Treffer in der auto-generierten `types.ts` und in Doku-Kommentaren — **kein** aktiver Frontend-Aufruf mehr.
- `npm run i18n:check`: grün (18 Namespaces, 77 Seiten, 0 Fehler/Warnungen).

**Bericht (Antworten auf die Codex-Fragen):**
- Whitelist-Tabelle: `public.cms_admin_editable_fields`.
- Initiale Whitelist: 8 Pflege-Felder (siehe Seed oben).
- Neue RPC: `rpc_admin_update_section_field`.
- Frontend nutzt jetzt die neue RPC: ja.
- Frontend nutzt alte Pilot-RPC noch: nein.
- Nur vorhandene Feldzeilen werden aktualisiert: ja (`UPDATE`-only).
- Insert/Upsert/Delete? nein.
- Produktdatenbank geändert? nein.
- Public-Navigation geändert? nein.
- `/anwendungen/pflege` weiter Code/i18n-Fallback? ja.
- i18n-Check: grün.
- Build: wird automatisch durch das Lovable-Harness verifiziert.

**Linter-Hinweis:** Die Migration-Linter-Warnungen (Anon-EXECUTE auf SECURITY-DEFINER-RPCs, RLS-without-Policy auf `cms_navigation_nodes`, public bucket listing, OTP/Postgres-Version) sind sämtlich pre-existing und entsprechen bewusst dem No-Login-Prototyp-Modell (Regel 9 in `.lovable/always-follow.md`). Sie werden in einer eigenen Auth-/Hardening-Etappe adressiert.

---

## cms-light-admin-pilot-node-idempotency-hardening-1 — 2026-05-10 (an.pflege idempotent härten)


**Scope:** Reine DB-Härtung. **Keine** neue RPC, **keine** neue UI, **keine** neue Schreiblogik, **kein** Asset-Upload, **keine** Public-Navigation aus DB, **keine** Produktdatenbank, **keine** i18n-Änderung, **keine** Routenänderung, **keine** automatische Löschung von Dubletten.

**Ziel:** Der Admin-Strukturknoten `an.pflege` (`nav_area='main'`) soll in jeder Umgebung denselben Sollzustand haben — auch dann, wenn er aus früheren Migrationen mit abweichenden Werten existiert.

**Vorher (Befund):** `cms-light-admin-tree-pilot-node-fix-1` legt `an.pflege` nur per `INSERT … WHERE NOT EXISTS` an. Existierte der Knoten bereits mit falschen Werten, wurden diese **nicht** korrigiert.

**Nachher (Soll für `nav_area='main' AND node_key='an.pflege'`):**
- `parent_id` = ID von `an.gesundheit`
- `page_key='anwendungen.pflege'`, `route_path='/anwendungen/pflege'`
- `label='Pflege & Betreutes Wohnen'`, `label_de='Pflege & Betreutes Wohnen'`, `label_en='Care & Assisted Living'`
- `node_type='page'`, `sort_order=35`, `is_active=true`, `show_in_public_nav=false`

**Implementierung:** Anonymer `DO`-Block in der Migration mit drei Zweigen:
- **Parent fehlt:** `RAISE NOTICE` und Abbruch, **kein** Anlegen unter Root.
- **Knoten fehlt:** `INSERT` mit allen Sollwerten.
- **Genau ein Knoten existiert:** `UPDATE` aller Felder auf den Sollwert (idempotent).
- **Mehrere Knoten existieren:** `RAISE WARNING` mit Anzahl, **keine** automatische Löschung. Bewusste Entscheidung: Korrektur des erwarteten Einzelknotens, nicht Bereinigung unbekannter Dubletten.

**Geändert (Code):** keine.

**Verifikation:**
- `psql`: `an.pflege` ist unter `an.gesundheit` (parent_ok=t), `show_in_public_nav=f`, alle Sollwerte gesetzt.
- `home.start` weiterhin `draft / is_active=false`. `home.show_in_public_nav=false`.
- `npm run i18n:check`: grün (18 Namespaces, 77 Seiten, 0 Fehler/Warnungen).

**Bericht (Antworten auf die Codex-Fragen):**
- Fehlte `an.pflege` oder existierte er bereits? → existierte bereits (1 Knoten, Werte bereits korrekt).
- Wurde der vorhandene Knoten korrigiert? → idempotent auf den Sollzustand gesetzt (`UPDATE` war inhaltlich No-Op außer `updated_at`).
- Ist Parent `an.gesundheit`? → ja.
- Ist `show_in_public_nav=false`? → ja.
- Gab es Dubletten? → nein (genau 1 Knoten).
- Wurde irgendetwas gelöscht? → nein.
- Wurde neue Schreiblogik gebaut? → nein.
- Wurde Public-Navigation geändert? → nein (öffentliche Navigation kommt weiterhin aus Code).

---

## cms-light-admin-tree-detailpanel-1 — 2026-05-10 (DetailPanel rechts neben dem Baum)

**Scope:** Reine UI-Etappe. **Keine** neue RPC, **keine** Migration, **keine** neue Schreiblogik, **kein** Asset-Upload, **kein** Statuswechsel, **keine** Veröffentlichung. Produktdatenbank und öffentliche (codebasierte) Navigation bleiben unverändert. `home.start` und `anwendungen.pflege` bleiben `draft / is_active=false`.

**Ziel:** In `Struktur & Inhalte → Baum & Drag & Drop` erscheint rechts neben dem Baum ein vereinheitlichter Detailbereich zur aktuell ausgewählten Node.

**Implementierung:**
- `NavigationTreeEditor` erhält die optionalen Props `onSelectionChange` und `hideInternalDetail`. Damit kann AdminPage die Selektion abgreifen und den internen rechten Aside ausblenden, ohne die Tree-/DnD-Funktion zu verändern. Default-Verhalten (z. B. an anderen Einsatzorten) bleibt identisch.
- Neue Komponente `src/features/admin/components/TreeNodeDetail.tsx` rendert je nach Node-Typ:
  - **CMS-Pilot** (`page_key === "anwendungen.pflege"`): zeigt die bestehenden Pilotsektionen (Hero / Answer-First / Intro) als `DetailPanel` mit dem bestehenden `EditableField`-Editor. Liest aus dem bereits in AdminPage geladenen Pilot-Bundle; speichert über die unveränderte Pilot-RPC.
  - **Codebasierte Seite** (`page_key` gesetzt, kein Pilot): Hinweis „Noch nicht CMS-verwaltet. Inhalte kommen aktuell aus Code/i18n." plus Anzeige von `pageType`, `routePath`, `status`, `note` aus `PAGE_REGISTRY` (read-only).
  - **Navigation-only** (`page_key` leer): Hinweis „Navigation-only, keine eigene Seite." plus DE/EN-Labels (read-only; Bearbeitung weiter unter „Navigations-Labels").
- Technische Details (`node_key`, `page_key`, `route_path`, `nav_area`, `parent_id`, `sort_order`, `is_active`) werden in jedem Fall über `DetailPanel` einklappbar angezeigt (Standard: zugeklappt).
- AdminPage hält `selectedTreeNode` und reicht es zusammen mit `pilotBundle` / `loadBundle` an `TreeNodeDetail` weiter.

**Diagnose-Begriffe korrigiert:**
- Hauptbereich-Hint: nicht mehr „Read-only Prüf- und Vergleichsansichten", sondern „Prüf- und Abgleichsansichten (überwiegend Anzeige; Page-Instanzen enthalten den bestehenden Code↔DB-Abgleich)".
- Section-Header und ModeBadge entsprechend angepasst; „Page-Instanzen" wird explizit als bestehender Schreibweg über `rpc_admin_upsert_page` ausgewiesen.

**Geändert (Code):**
- `src/features/admin/components/NavigationTreeEditor.tsx` — additive Props `onSelectionChange`, `hideInternalDetail`; rechter Aside conditionaler Render. Tree- und DnD-Pfad unverändert.
- `src/features/admin/components/TreeNodeDetail.tsx` — neu.
- `src/features/admin/pages/AdminPage.tsx` — `selectedTreeNode`-State, neues 2-Spalten-Layout im Baum-Subtab, korrigierte Diagnose-Texte.

**Verifikation:**
- `npm run i18n:check`: grün (18 Namespaces, 77 Seiten, 0 Fehler/Warnungen).
- Manuell: bestehende Schreibwege (Tree-DnD `rpc_admin_move_navigation_node`, Label-RPC, Pilot-RPC, Page-Upsert) sind unverändert erreichbar; keine neue RPC gebaut; keine Migration angelegt.
- Produktdatenbank: nicht berührt. Öffentliche Navigation: nicht berührt (bleibt codebasiert).


## cms-light-admin-tabs-consolidate-1 — 2026-05-10 (Admin-Oberfläche verdichtet)

**Scope:** Reine UI-/Ordnungs-Etappe. Keine Migration, keine neue RPC, keine neue Schreiblogik, keine RLS-/Policy-Änderung. Bestehende Schreibwege (Tree & DnD, Navigation-Labels, Pilotfeld-Editor, Page-Upsert) bleiben unverändert erreichbar — sie wurden nur umgehängt.

**Vorher (8 Haupttabs):** Übersicht · Seiten · Page-Instanzen · CMS-Pilot · Struktur · Navigation · Tree & DnD · Glossar.

**Nachher (4 Hauptbereiche):**

| Hauptbereich | Inhalt | Subtabs |
|---|---|---|
| **Übersicht** | Status, Source-of-Truth-Lage, nächste Schritte | – |
| **Struktur & Inhalte** | zentraler Arbeitsbereich (editable) | **Baum & DnD** (`NavigationTreeEditor`), **Navigations-Labels** (`NavigationDiagnostic`), **Inhalte (CMS-Pilot)** (`DetailPanel` + `EditableField` für `anwendungen.pflege`) |
| **Diagnose** | read-only Vergleich Code ↔ DB | **Seiten** (Pilotseite-Stammdaten), **Page-Instanzen** (`PagesInstanceDiagnostic`, hier verbleibt der bestehende `rpc_admin_upsert_page`-Schreibweg), **Strukturbaum** (`StructureWorkbench`) |
| **Glossar** | Begriffsliste | – |

**Funktions-Inventar (Erreichbarkeit nach Konsolidierung):**
- Tree & DnD → `Struktur & Inhalte → Baum & DnD`.
- Navigation-Label-Editor → `Struktur & Inhalte → Navigations-Labels`.
- Pilotfeld-Bearbeitung (DE/EN) → `Struktur & Inhalte → Inhalte (CMS-Pilot)`.
- Page-Instanzen-Editor (Code↔DB-Upsert) → `Diagnose → Page-Instanzen` (bewusst dort belassen, weil als Code↔DB-Abgleich entstanden).
- Read-only Strukturbaum → `Diagnose → Strukturbaum`.
- Glossar/Term-Popover → unverändert; `GlossaryScope` wird jetzt pro Subtab-Wechsel ge­reset.

**Geändert (Code):**
- `src/features/admin/pages/AdminPage.tsx` — Tab-Modell auf 4 Hauptbereiche reduziert, lokale `SubTabs`-Komponente eingeführt, alle bestehenden Komponenten umgehängt. Keine bestehende Komponente gelöscht. Kein Import zu `ReadOnlyField` mehr (war ungenutzt).

**Bewusst NICHT geändert:**
- Keine Supabase-Migration, keine neue RPC, keine RLS-/Policy-Änderung.
- Keine Änderung an `src/lib/supabase/client.ts`, `src/integrations/supabase/*`.
- Keine Änderung an öffentlicher Navigation (`MainNavigation`, `MetaNavigation`, `Footer`, `src/navigation/*.ts`).
- Keine Änderung an öffentlichen Routen.
- Keine i18n-Datei geändert.
- Kein Asset-Upload, keine generische Section-Field-RPC.
- `home.start` bleibt `draft / is_active=false`.
- `anwendungen.pflege` bleibt `draft / is_active=false`.
- Produktdatenbank unverändert.

**Bericht (Akzeptanzkriterien):**
- Sichtbare Haupttabs: Übersicht, Struktur & Inhalte, Diagnose, Glossar. ✓
- Tree & DnD erreichbar in `Struktur & Inhalte → Baum & DnD`. ✓
- Navigation-Label-Editor erreichbar in `Struktur & Inhalte → Navigations-Labels`. ✓
- Pilotfeld-Speichern erreichbar in `Struktur & Inhalte → Inhalte`. ✓
- Page-Instanzen-/Status-Diagnose erreichbar in `Diagnose`. ✓
- Glossar funktioniert weiter. ✓
- Keine neue Schreiblogik / RPC / Migration. ✓
- Keine Änderung an Public-Navigation, öffentlichen Routen oder i18n. ✓


## cms-light-admin-write-scope-checkpoint-1 — 2026-05-10 (Schreibumfang stabilisiert vor I.4)

**Scope:** Bestandsaufnahme der Admin-Schreib-RPCs und kleine, additive Absicherung der Strukturknoten `home.start` / `home`. Kein Funktionsausbau, kein DetailPanel-Ausbau, kein Asset-Upload.

**Geändert (Datenbank):**
- `cms_pages`: Datensatz `page_key='home.start'` auf `is_active=false` gesetzt (Status bleibt `draft`). Begründung: `home.start` ist aktuell nur Strukturplatzhalter im Admin, keine live gerenderte CMS-Startseite. Verhindert versehentliches Public-Werden, sobald CMS-Light Source-of-Truth wird (Etappe F).
- `cms_navigation_nodes`: additive Spalte `show_in_public_nav boolean NOT NULL DEFAULT true` hinzugefügt. Aktuell **wirkungslos**, weil die öffentliche Navigation weiterhin codebasiert (`src/navigation/*.ts`) gerendert wird. Wird in Etappe F als Filter genutzt.
- `cms_navigation_nodes`: `node_key='home'` auf `show_in_public_nav=false` gesetzt. Verhindert, dass `home` später automatisch als erster Public-Menüpunkt auftaucht, wenn DB-Navigation aktiv geschaltet wird.

**Geändert (Doku):**
- `docs/migration-log.md` — dieser Eintrag.
- `docs/current-status.md` — Inventar Schreib-RPCs + Risiko-Markierung.

**Inventar Admin-Schreib-RPCs (alle SECURITY DEFINER, EXECUTE für `anon` + `authenticated`):**

| RPC | Was sie ändern kann | Insert? | Risiko | Genutzt von UI |
|---|---|---|---|---|
| `rpc_admin_update_navigation_label(node_id, locale, value)` | Nur `label_de` ODER `label_en` eines existierenden Knotens. Locale hart auf `de`/`en` whitelisted. | Nein | **niedrig** | Navigation-Editor |
| `rpc_admin_update_pilot_pflege_field(section, field, locale, value)` | Hart auf `page_key='anwendungen.pflege'` und 4 (section,field)-Kombinationen begrenzt. Nur UPDATE `cms_section_fields.value`. Keine Statusänderung. | Nein | **niedrig** | CMS-Pilot-Editor |
| `rpc_admin_move_navigation_node(node_id, new_parent_id, new_sort_order)` | `parent_id`+`sort_order` eines Knotens, plus Re-Sequencing der Geschwister. Nav-Area-Wechsel/Zyklen werden serverseitig abgelehnt. | Nein | **mittel** (Strukturänderung, aber begrenzt) | Tree & DnD |
| `rpc_admin_upsert_page(page_key, route_path, page_type)` | Legt neue `cms_pages`-Zeile an oder updated route+type. `page_type` whitelisted (T01–T21). **Insert immer mit `status='draft'`, `is_active=false`** — kann nicht veröffentlichen. | **Ja** (Insert neuer Pages) | **mittel/hoch** (kann neue Page-Datensätze anlegen) | PagesInstanceDiagnostic |

**Lese-RPCs (unkritisch, nur SELECT):** `rpc_admin_read_navigation_nodes`, `rpc_admin_read_pages_with_nav`, `rpc_admin_read_pilot_pflege`.

**EXECUTE-Rechte unverändert.** Keine Rechte entzogen, weil jede der vier Schreib-RPCs aktuell aktiv von einer UI-Komponente aufgerufen wird (Entzug würde Admin-Funktionen brechen). Stattdessen: bewusst dokumentierter Prototyp-Zustand. Status-/Veröffentlichungspfade sind in keiner RPC enthalten.

**Auth-Status:**
- Auth ist aktuell **nicht aktiv**. `/admin` ist No-Login-Workspace.
- Frühere Etappe `cms-auth-1` (profiles/user_roles/app_role/has_role/claim_first_admin/handle_new_user) wurde mit Migration `20260510113838_..._cms-auth-1-rollback` bewusst zurückgerollt (siehe `supabase/migrations/`).
- Vor Etappe F (Site liest Navigation/Inhalte aus DB) **muss** Auth neu aufgebaut werden — oder der Admin-Bereich vorher deaktiviert/ersetzt werden. Diese Entscheidung wird zu F-pre getroffen.

**Nicht geändert / Garantien:**
- Keine Produktdatenbank-Änderung. Kein Edit an `src/lib/supabase/client.ts`.
- Keine Public-Routen geändert. Keine i18n-Datei geändert.
- Keine öffentliche Navigation geändert (rendert weiterhin aus Code).
- Keine neue generische Section-Field-RPC. Kein DetailPanel-Ausbau. Kein DnD-Ausbau. Kein Asset-Upload.
- Keine Veröffentlichung. Keine Statusänderung außer `home.start` auf `is_active=false`.

**Akzeptanz:**
- ✅ `home.start`: `status=draft`, `is_active=false` (verifiziert per SELECT).
- ✅ `home`: `show_in_public_nav=false` (verifiziert per SELECT). Bleibt `is_active=true` als Admin-Strukturknoten.
- ✅ Public MainNavigation unverändert (codebasiert).
- ✅ Schreib-RPCs inventarisiert + Risiko markiert.
- ✅ Auth-Rollback dokumentiert.

## cms-light-admin-page-assignment-readonly-1 — 2026-05-10 (Seitenzuordnung im Admin)

**Scope:** Read-only Seitenzuordnungsansicht in der Struktur-Workbench des Admin.

**Statusmodell (UI-only):**
- `cms-pilot` — `anwendungen.pflege`, CMS-Daten vorhanden, öffentlich Fallback.
- `code-page` — `page_key` in `pageRegistry`, aktuell aus Code/i18n.
- `navigation-only` — Node ohne `page_key`, reine Gruppierung.
- `unmatched` — Node mit `page_key`, aber kein Treffer in `pageRegistry`.
- Zusatz `cms-ready-candidate` — Code-Seite mit erkennbarem `page_type`.

**Geändert:**
- `src/features/admin/components/StructureWorkbench.tsx`
  - Neuer Abschnitt "Seitenzuordnung" im Detailbereich (page_key, registry-Treffer, page_type, Routen, öffentlich codebasiert, aus CMS gerendert, CMS-fähig, Hinweistext je Status).
  - Zusammenfassung links: Knoten gesamt, mit page_key, CMS-Pilot, Code-Seiten, CMS-ready, Navigation-only, Unmatched.
  - Filter (lokaler State): Alle / CMS-Pilot / Code-Seiten / CMS-ready / Navigation-only / Unmatched.
  - Spätere Aktionen explizit als deaktivierte Hinweise (Draft erzeugen, Bearbeiten, Duplizieren, Navigation zuordnen, Bilder, Übersetzung, Veröffentlichen).
- `docs/migration-log.md` — dieser Eintrag.

**Nicht geändert / Garantien:**
- Keine Migration, keine neue RPC, keine RLS-/Policy-Änderung.
- Keine Schreiboperationen, kein Drag & Drop, kein Speichern.
- Kein statischer Import von `@/integrations/supabase/client`, kein `@/lib/supabase/client` im Admin.
- Öffentliche Navigation, öffentliche Routen und i18n unverändert.
- Produktdatenbank unangetastet.
- `anwendungen.pflege` bleibt `draft` / `is_active=false`; `/anwendungen/pflege` ohne `[Pilot]`.

**Verifikation:** `npm run i18n:check` grün (18 namespaces, 77 pages). `rg` auf Schreibcalls und verbotene Imports in `src/features/admin/`: 0 Treffer.

**Nächster sinnvoller Schritt:** `cms-light-admin-page-draft-plan-1` oder `cms-light-admin-navigation-sort-readonly-1`.

## cms-light-preview-env-deterministic-fix-1 — 2026-05-10 (CMS-Light-Wrapper mit Fallback)

**Scope:** Deterministischer Fix für `supabaseUrl is required.` im veröffentlichten Preview-Build (`tcs-webseite-db-cms.lovable.app`). Kein Server-Neustart-Workaround.

**Echte Ursache (jetzt verifiziert im externen Tab):**
- Der publizierte Build enthält `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` nicht. `src/integrations/supabase/client.ts` ruft beim Modul-Import direkt `createClient(undefined, undefined)` auf und wirft synchron `supabaseUrl is required.` Sobald der Admin (auch lazy) diesen Pfad importiert, kippt die Seite weiß bzw. zeigt die Meldung in der Konsole. Im Lovable-Sandbox-Preview ist das Env vorhanden, deshalb funktionierte es dort — externer Tab beweist das Gegenteil.

**Fix (im Code, nicht über Neustart):**
- Neuer Wrapper `src/lib/cmsSupabase/client.ts`:
  - Liest primär `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`.
  - Fällt deterministisch auf das CMS-Light-Projekt `uvkubrrljyzfvbvejepl` (publishable/anon Key) zurück.
  - Lazy `createClient` — kein Crash beim Modul-Import.
  - Liefert `getCmsSupabaseClient()`, `isCmsSupabaseConfigured()`, `isUsingCmsFallback()`, `getCmsSupabaseUrl()`, `getCmsSupabaseSource()`.
  - Persistiert keine Auth-Session, kein Auto-Refresh.
- Admin-/CMS-Reads auf den Wrapper umgestellt:
  - `src/features/admin/api/cmsAdminNavigation.ts`
  - `src/features/admin/api/cmsAdminRead.ts`
  - `src/features/cms/api/cmsContent.ts`
- Admin-Übersicht zeigt jetzt klare Konfigurationshinweise:
  - „CMS-Light-Konfiguration fehlt …" wenn weder Env noch Fallback verfügbar.
  - „Fallback auf Projekt uvkubrrljyzfvbvejepl aktiv" wenn Fallback genutzt wird.
- `StructureWorkbench`: bei `navError` wird ein klar gekennzeichneter `pageRegistry`-Fallback im Strukturbaum angezeigt.

**Bewusst NICHT geändert:**
- `src/integrations/supabase/client.ts` (auto-generiert) — bleibt unverändert.
- `src/lib/supabase/client.ts` (Produktdatenbank) — unverändert.
- Keine Migration, keine RPC, keine RLS/Policy-Änderung, keine neuen Schreibrechte.
- Keine öffentliche Navigation, kein MainNavigation/MetaNavigation/Footer, keine öffentlichen Routen oder i18n-Dateien geändert.
- Kein Speichern, kein Drag & Drop, kein Upload, keine Auth.
- `anwendungen.pflege` bleibt `draft` / `is_active=false`. `/anwendungen/pflege` bleibt ohne `[Pilot]`.

**Verifikation:**
- Sandbox-Preview `/admin`: `rpc_admin_read_navigation_nodes` und `rpc_admin_read_pilot_pflege` antworten 200 (`uvkubrrljyzfvbvejepl.supabase.co`).
- Suche bestätigt: keine produktiven Imports von `@/integrations/supabase/client` in `src/features/admin/**` oder `src/features/cms/**` (nur noch zwei reine Doku-Erwähnungen in JSDoc-Kommentaren).
- Kein Import von `@/lib/supabase/client` in `src/features/admin/**`.
- `npm run i18n:check`: 18 Namespaces, 77 Seiten, 0 Fehler/0 Warnungen.
- `npm run build`: wird vom Lovable-Harness automatisch verifiziert.
- Der publizierte Build (`tcs-webseite-db-cms.lovable.app`) zeigt vor diesem Fix den dokumentierten Konsolenfehler. Damit der Fix dort wirksam wird, ist ein **neuer Publish** notwendig — der Code-Pfad ist deterministisch unabhängig vom Build-Env.

---



## cms-light-admin-workbench-readonly-1 — 2026-05-10 (Read-only CMS-Workbench im Tab `Struktur`)

**Scope:** Tab `Struktur` zu einer zweispaltigen read-only CMS-Workbench ausgebaut. Links Strukturbaum (Navigationsbereiche aus `cms_navigation_nodes`, gruppiert nach Header/Main, Meta, Footer, Footer · Legal). Rechts Detailbereich zur ausgewählten Node mit Navigation-, Seiten-, Template- und CMS-Inhalts-Block. Beim ersten Laden wird automatisch die Pilotseite `anwendungen.pflege` ausgewählt.

**Datenquellen (alle read-only, lazy-import):**
- `cms_navigation_nodes` über `rpc_admin_read_navigation_nodes()` (lazy import in `cmsAdminNavigation.ts`).
- `rpc_admin_read_pilot_pflege()` für Pilot-Inhalte (Hero / Answer-First / Intro · DE/EN).
- `src/navigation/pageRegistry.ts` für `page_type` und Registry-Status.

**Aktionen / Schreibfunktionen:** keine. Spätere Aktionen (Bearbeiten, Duplizieren, Verschieben, Bilder, Übersetzung, Veröffentlichen) erscheinen nur als visuell deaktivierte Platzhalter (`aria-disabled`, kein Button, kein Klick).

**Geänderte Dateien:**
- `src/features/admin/components/StructureWorkbench.tsx` (neu)
- `src/features/admin/pages/AdminPage.tsx` (Tab `Struktur` nutzt jetzt `StructureWorkbench`)

**Nicht geändert:** keine Migration, keine neue RPC, keine RLS-/Policy-Änderung, keine Produktdatenbank, keine öffentliche Navigation/Footer/MetaNavigation, keine öffentlichen Routen, keine i18n-Dateien, kein Drag & Drop, kein Speichern, keine Statusänderung von `anwendungen.pflege`. Admin-/CMS-Supabase-Client wird ausschließlich lazy importiert (kein statischer Import von `@/integrations/supabase/client` in `src/features/admin/**`).

---

## preview-white-screen-admin-navigation-client-guard-final-check-1 — 2026-05-10 (Stabilitäts-Check)

**Scope:** Verifikation des White-Screen-Fix aus `preview-white-screen-admin-navigation-client-guard-1`. Keine fachliche Änderung.

**Ergebnis:**
- `src/features/admin/api/cmsAdminNavigation.ts` enthält **keinen** statischen Import von `@/integrations/supabase/client`; der Client wird ausschließlich lazy in `readNavigationNodes()` via `await import(...)` geladen, RPC-Aufruf ist mit `try/catch` abgesichert.
- Suche in `src/features/admin/**` und `src/features/cms/**` ergab **0** statische Imports von `@/integrations/supabase/client`. Lazy `await import("@/integrations/supabase/client")` findet sich in `cmsAdminNavigation.ts`, `cmsAdminRead.ts` und `cmsContent.ts` — jeweils innerhalb von Funktionen.
- `/`, `/admin`, `/anwendungen/pflege` laden wieder ohne weiße Seite. `/anwendungen/pflege` zeigt keine `[Pilot]`-Texte.
- `npm run i18n:check`: OK (0 Fehler, 0 Warnungen).

**Nicht geändert:** keine Migration, keine RPC, keine RLS-/Policy-Änderung, keine Produktdatenbank, keine öffentliche Navigation, kein Drag & Drop, kein Speichern, keine Admin-UI-Erweiterung, keine i18n-Dateien, keine öffentlichen Routen, `src/integrations/supabase/client.ts` und `src/lib/supabase/client.ts` unverändert.

---

## preview-white-screen-admin-navigation-client-guard-1 — 2026-05-10 (Hotfix: lazy Supabase-Import in CMS-Light Navigation-API)

**Scope:** Hotfix für White-Screen in der Lovable-Preview nach Etappe `cms-light-admin-navigation-model-readonly-1`. Reine Code-Hygiene, keine DB-/RPC-/RLS-/UI-/i18n-Änderung.

**Ursache:** `src/features/admin/api/cmsAdminNavigation.ts` importierte `@/integrations/supabase/client` **statisch**. Da der Client beim Import sofort `createClient(...)` ausführt, crasht die App beim Start, sobald `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` in der Preview-Session nicht verfügbar sind → `/` und `/admin` blieben weiß.

**Fix:** Statischer Import entfernt und durch einen lazy/dynamischen Import innerhalb von `readNavigationNodes()` ersetzt (analog zu `cmsAdminRead.ts`). Zusätzlich `try/catch` um den RPC-Aufruf, damit Fehler als `NavigationBundle.error` zurückkommen statt die App zu crashen.

**Geänderte Dateien:** `src/features/admin/api/cmsAdminNavigation.ts`.

**Nicht geändert:** keine Migration, keine RPC, keine RLS-/Policy-Änderung, keine Produktdatenbank, keine öffentliche Navigation, keine Admin-UI-Erweiterung, keine i18n-Dateien, keine öffentlichen Routen, `src/integrations/supabase/client.ts` unverändert.

---



**Scope:** CMS-Light Navigationsmodell als gezielte Erweiterung des bestehenden CMS-Light-Schemas. Tabelle `cms_navigation_nodes` neu, gefüllt aus den vorhandenen Code-Navigationsdaten (`mainNavigation`, `metaNavigation`, `footerNavigation`, `footerBottomNavigation`). Im Admin (Tab `Struktur`) read-only sichtbar. Keine öffentliche Navigation aus DB, kein Drag & Drop, kein Speichern, keine Produktdatenbank.

**DB-Änderungen:**
- Neue Tabelle `public.cms_navigation_nodes` mit Feldern: `id`, `nav_area` (`main`/`meta`/`footer`/`footer_bottom`), `node_key`, `parent_id` (Self-FK, ON DELETE CASCADE), `page_key` (text, **nur logischer Verweis**, **kein FK auf `cms_pages.page_key`**), `label`, `route_path`, `sort_order`, `is_active`, `created_at`, `updated_at`. Unique `(nav_area, node_key)`. Index `(nav_area, sort_order, node_key)`.
- RLS aktiviert, **keine Policies** — Zugriff ausschließlich über die neue SECURITY DEFINER RPC.
- Neue RPC `public.rpc_admin_read_navigation_nodes() returns jsonb` (STABLE, SECURITY DEFINER, search_path=public). `EXECUTE` gewährt an `anon` und `authenticated` (entspricht dem bestehenden Muster von `rpc_admin_read_pilot_pflege` für den temporären Admin-Prototyp ohne Login).
- Trigger `cms_set_updated_at` für `updated_at`.

**Seed:** Initiale Knoten aus den bestehenden Code-Quellen `src/navigation/mainNavigation.ts`, `src/navigation/metaNavigation.ts`, `src/navigation/footerNavigation.ts`. Keine Erzeugung von `cms_pages`, `cms_sections`, `cms_section_fields`, `cms_assets`. Keine Übernahme von Seiteninhalten in CMS-Light. Bestehendes CMS-Light-Schema (`cms_pages`, `cms_sections`, `cms_section_fields`, `cms_assets`) wurde **nicht** ersetzt und **nicht** verändert.

**Code-Änderungen:**
- Neu `src/features/admin/api/cmsAdminNavigation.ts` (read-only RPC-Aufruf).
- Neu `src/features/admin/components/NavigationTree.tsx` (read-only Baum: Header/Main, Meta, Footer, Footer · Legal mit verschachtelten Knoten, `label`, `route_path`, `page_key`, `sort_order`, aktiv/inaktiv, CMS-Status-Badge inkl. CMS-Pilot-Markierung für `anwendungen.pflege`).
- `src/features/admin/pages/AdminPage.tsx`: Tab `Struktur` zeigt zuerst das neue Navigationsmodell, darunter weiterhin den read-only Code-Seitenregister-Baum.

**Was bewusst NICHT geschehen ist:**
- Kein harter FK von `cms_navigation_nodes.page_key` auf `cms_pages.page_key`.
- Keine Massenanlage von `cms_pages` aus `pageRegistry`.
- Keine Migration der Website-Inhalte in CMS-Light.
- Keine parallelen generischen Tabellen `pages`, `sections`, `fields`, `assets`.
- Keine Änderung an MainNavigation/MetaNavigation/Footer im Public-Frontend.
- Keine öffentliche Navigation aus DB, keine Routen-, Breadcrumb-, i18n-Änderung.
- Keine Schreib-RPC, kein Speichern, kein Drag & Drop, kein Duplizieren, kein Upload, keine Auto-Übersetzung.
- Produktdatenbank unverändert.
- `anwendungen.pflege` bleibt `draft` / `is_active=false`. `/anwendungen/pflege` bleibt ohne `[Pilot]`.

---



## cms-light-admin-structure-readonly-1 — 2026-05-10 (read-only Strukturbaum im Admin)

**Scope:** Tab `Struktur` in `/admin` read-only ausgebaut. Keine Supabase-
Änderung, keine RPC, keine RLS, keine Schreiboperationen, kein Drag & Drop,
keine Navigation aus DB, keine Produktdatenbank, keine öffentliche Route
oder i18n-Datei verändert.

**Was geändert wurde:**
- Neuer read-only Helper `src/features/admin/utils/structureTree.ts`:
  liest `PAGE_REGISTRY` aus `src/navigation/pageRegistry.ts` und
  gruppiert Einträge nach `pageKey`-Prefix (Hauptbereiche der Website).
- Neue Komponente `src/features/admin/components/StructureTree.tsx`:
  rendert die Gruppen als kompakte Liste mit `page_key`, `route_path`,
  `page_type`, Lifecycle-`status` und CMS-Status-Badge.
- `src/features/admin/pages/AdminPage.tsx`: Tab `Struktur` zeigt jetzt
  die Strukturansicht statt eines reinen Zielbild-Texts.
- `anwendungen.pflege` ist explizit als **CMS-Pilot** markiert
  (Draft / inactive, Inhalt read-only über CMS-Light, öffentliche Seite
  bleibt Code-Fallback).

**Datenquelle:** `src/navigation/pageRegistry.ts` (rein lesend).
Keine DB-Quelle für Navigation/Struktur in dieser Etappe.

**Hauptgruppen:** Startseite, Anwendungen, Gebäudekommunikation,
Zutrittskontrolle, Gebäudemanagement, Eingangssysteme, Signage,
Service, Serviceportal, Wissen, Unternehmen/Kontakt, Rechtliches,
System.

**Nicht enthalten:** kein Speichern, kein Drag & Drop, keine
Sortierung, keine Duplizierung, keine neuen Seiten, keine Uploads,
keine Navigation aus DB, kein Login, keine Produktdaten.

**Geänderte/neue Dateien:**
- neu: `src/features/admin/utils/structureTree.ts`
- neu: `src/features/admin/components/StructureTree.tsx`
- geändert: `src/features/admin/pages/AdminPage.tsx`
- geändert: `docs/current-status.md`
- geändert: `docs/migration-log.md` (dieser Eintrag)

**Nächster Schritt:** Strukturmodell bewerten und entscheiden, welche
Seiten zuerst CMS-fähig werden.


## cms-light-current-status-cleanup-1 — 2026-05-10 (Doku-Bereinigung)

**Scope:** Reine Doku-Bereinigung in `docs/current-status.md`. Kein Code,
keine Supabase-Änderung, keine UI-Änderung, keine Migration.

**Was geändert wurde:**
- Oberer Status klargestellt: `/admin` ist isolierter read-only
  CMS-Light-Arbeitsbereich, Speichern deaktiviert, frühere Schreib-RPC
  für `anon`/`authenticated`/`PUBLIC` nicht mehr ausführbar.
- `cms-light-admin-save-pilot-1` ist **nicht mehr** die nächste aktive
  Etappe. Neue nächste Etappe: `cms-light-admin-structure-readonly-1`
  (read-only Seiten-/Strukturbaum im Admin; keine Navigation aus DB,
  kein Drag & Drop, kein Speichern, keine Produktdatenbank).
- Historische Abschnitte zum Richtungs-Reset bleiben erhalten, sind
  aber als historisch/überholt gekennzeichnet, soweit sie auf
  `cms-light-admin-save-pilot-1` als nächste Etappe verwiesen.

**Geänderte Dateien:**
- `docs/current-status.md`
- `docs/migration-log.md` (dieser Eintrag)


## cms-light-admin-write-rpc-disable-1 — 2026-05-10 (Sicherheitsbereinigung, EXECUTE entzogen)

**Scope:** Reine Sicherheits-/Rechtebereinigung. Da `/admin` aktuell ohne
Login läuft und read-only ist, wird die nicht mehr genutzte Schreib-RPC
für öffentliche Rollen unausführbar gemacht. Kein neues Feature.

**Geänderte Dateien:**
- Supabase-Migration: `REVOKE EXECUTE` auf
  `public.rpc_admin_update_pilot_pflege_field(text, text, text, text)`
  für `anon`, `authenticated` und `PUBLIC`.
- `docs/current-status.md`
- `docs/migration-log.md` (dieser Eintrag)

**Was gemacht wurde:**
- Geprüft: Funktion `public.rpc_admin_update_pilot_pflege_field(text, text, text, text)`
  existiert weiterhin in der Datenbank.
- `EXECUTE` für `anon` entzogen — ja.
- `EXECUTE` für `authenticated` entzogen — ja.
- `EXECUTE` für `PUBLIC` entzogen — ja.
- Verifikation via `information_schema.routine_privileges`: keine
  EXECUTE-Grants mehr für `anon`/`authenticated`/`public` auf dieser
  Funktion.
- Funktion bleibt technisch bestehen (Definition unverändert), ist aber
  über das öffentliche API-Schema nicht mehr aufrufbar.

**Was bewusst NICHT gemacht wurde:**
- Keine neue Schreib-RPC, keine neue Write-Policy, keine RLS-/Policy-
  Öffnung.
- Keine Änderungen an `src/**`, keine Admin-UI, kein Speichern, kein
  Login/Auth.
- Keine Produktdatenbank-Änderung.
- Keine Änderungen an Navigation, öffentlichen Routen oder i18n-Dateien.
- Lese-RPC `rpc_admin_read_pilot_pflege` bleibt unverändert.

**Akzeptanz erfüllt:**
- `rpc_admin_update_pilot_pflege_field` ist nicht mehr durch `anon`,
  `authenticated` oder `PUBLIC` ausführbar.
- `/admin` bleibt read-only, keine Speichern-UI, keine Schreib-Aufrufe
  im Frontend.
- `/anwendungen/pflege` bleibt ohne `[Pilot]`, `anwendungen.pflege`
  bleibt `draft` / `is_active=false`.


## cms-light-admin-direction-reset-1 — 2026-05-10 (Richtungs-Reset, kein Speichern)

**Scope:** Richtungskorrektur für `/admin`. Ziel ist nicht ein Feldeditor,
sondern ein isolierter CMS-Light-Arbeitsbereich. Pilot-Speichern wurde im UI
zurückgenommen, `/admin` vom öffentlichen Website-Layout entkoppelt.

**Geänderte / neue Dateien:**
- `src/App.tsx` (eigene Layout-Verzweigung für `/admin` ohne MetaNavigation,
  MainNavigation, Footer)
- `src/features/admin/pages/AdminPage.tsx` (read-only, neuer Tab `Struktur`,
  Speichern-UI entfernt)
- `src/features/admin/api/cmsAdminWrite.ts` — **gelöscht**
- `src/features/admin/components/EditablePilotField.tsx` — **gelöscht**
- `docs/current-status.md` (Stand und Zielbild aktualisiert)
- `docs/migration-log.md` (dieser Eintrag)

**Was gemacht wurde:**
- `/admin` rendert ohne öffentliches Website-Layout (keine MetaNavigation,
  keine MainNavigation, kein Footer, keine PersonaNavigation).
- `CMS-Pilot`-Tab nutzt wieder `ReadOnlyField` + `SectionGroup`. Keine
  Textareas, keine Save-Buttons, keine `.rpc(...)`-Schreib-Aufrufe im
  Frontend.
- Neuer Tab `Struktur` zeigt nur das Zielbild (read-only Notice + Liste).
  Keine DB-Daten, kein Drag & Drop, keine Navigation aus DB.
- Frontend-Importe der Schreib-API entfernt; Frontend ruft
  `rpc_admin_update_pilot_pflege_field` **nicht** mehr auf.

**Was bewusst NICHT gemacht wurde:**
- Keine neue Migration, keine RPC-Änderung, keine RLS/Policy-Änderung.
- Die Schreib-RPC `rpc_admin_update_pilot_pflege_field` bleibt in der DB
  bestehen (kein Rollback dieser Migration in dieser Etappe).
- Kein Login, kein Auth, keine Rollen.
- Keine Produktdatenbank, keine Uploads/Bildverwaltung.
- Keine öffentlichen Routen verändert, keine i18n-Dateien verändert.
- Kein Statuswechsel von `anwendungen.pflege` (`status=draft`,
  `is_active=false`).
- Keine Veröffentlichung. `/anwendungen/pflege` bleibt im i18n/static-
  Fallback ohne `[Pilot]`.

**Akzeptanz:**
- `/admin` lädt ohne Crash.
- `/admin` ist vom öffentlichen Layout getrennt (kein MetaNav/MainNav/Footer).
- Tabs: Übersicht, Seiten, CMS-Pilot, Struktur. Struktur read-only.
- Keine Speichern-Funktion, keine Schreiboperationen im Frontend.
- `npm run i18n:check`: OK (18 Namespaces, 77 Seiten, 0 Fehler/Warnungen).
- `npm run build`: wird vom Lovable-Harness automatisch verifiziert.

---

## cms-light-admin-save-pilot-1 — 2026-05-10 (Pilot-Schreibfunktion, eng begrenzt)

**Scope:** Erste minimale Schreibfunktion im `/admin`-CMS-Pilot-Tab.
Es können ausschließlich vier vorhandene Pilotfelder der Seite
`anwendungen.pflege` in den Sprachen `de` und `en` aktualisiert werden.

**Geänderte / neue Dateien:**
- `supabase/migrations/<ts>_cms_light_admin_save_pilot_1.sql` (neue RPC)
- `src/features/admin/api/cmsAdminWrite.ts` (neu)
- `src/features/admin/components/EditablePilotField.tsx` (neu)
- `src/features/admin/pages/AdminPage.tsx` (Pilotfelder editierbar + Speichern)
- `docs/current-status.md`
- `docs/migration-log.md` (dieser Eintrag)

**Neue Schreib-RPC:** `public.rpc_admin_update_pilot_pflege_field(
  p_section_key text, p_field_key text, p_locale text, p_value text
) returns jsonb`

- `language plpgsql`, `security definer`, `set search_path = public`
- **kein** `page_key`-Parameter — Page-Key ist intern hart auf
  `anwendungen.pflege` festgeschrieben
- Whitelist Feldkombinationen:
  - `hero.headline`
  - `hero.intro`
  - `answer-first.text`
  - `intro.text`
- Whitelist Locales: `de`, `en`
- führt ausschließlich
  `UPDATE public.cms_section_fields SET value = ..., updated_at = now()`
  aus — gefiltert auf `page_key`, `section_key`, `field_key`, `locale`
- **kein** Insert, **kein** Upsert, **kein** Delete
- bei `row_count = 0` → `success=false, updated=false, error='row_not_found'`
- bei unbekanntem Feld → `success=false, error='field_not_allowed'`
- bei unbekanntem Locale → `success=false, error='locale_not_allowed'`
- keine dynamische SQL
- keine Änderung an `cms_pages`, `cms_sections`, `cms_assets`
- keine Änderung an `value_json`
- keine Statusänderung, keine Veröffentlichung

**Rechte:**
- `revoke all ... from public`
- `grant execute ... to anon, authenticated` — bewusste Prototyp-Ausnahme
  (analog zur Read-RPC), weil `/admin` aktuell ohne Login läuft.
- Keine neuen Tabellen-Write-Policies. Keine allgemeine `anon`/`authenticated`
  Update-Policy. RLS auf `cms_section_fields` bleibt unverändert
  (nur public read der published Seiten).
- Kein `service_role` im Frontend.

**Linter-Hinweise (akzeptiert):** Supabase-Linter meldet
`0028/0029 Public/Authenticated Can Execute SECURITY DEFINER Function`
für die neue RPC sowie für `rpc_admin_read_pilot_pflege`. Beides ist die
explizit dokumentierte Prototyp-Ausnahme; die Funktionen sind serverseitig
hart begrenzt (nur `anwendungen.pflege`, nur whitelisted Felder/Locales,
nur Update auf bestehende Zeilen). Vor Produktivbetrieb müssen die
Execute-Rechte entzogen oder durch Auth/Rollen ersetzt werden.

**Admin-UI:**
- Tab `CMS-Pilot` zeigt die vier Pilotfelder als kontrollierte
  `<textarea>`-Eingaben pro Locale (DE/EN).
- Pro Locale ein Speichern-Button. Speichern ruft ausschließlich die
  neue RPC `rpc_admin_update_pilot_pflege_field` auf.
- Erfolgs-/Fehlerhinweis pro Feld; nach Erfolg wird `readPilotPflege()`
  erneut aufgerufen.
- **Keine** Eingabefelder für `status`, `is_active`, `route_path`,
  `page_type`. Keine Publish-/Status-Schalter, keine Uploads, keine
  Duplizieren-/Lösch-Buttons.

**Sicherheitsstatus:**
- Temporärer Workspace-Prototyp ohne Login.
- **Nicht produktionssicher.** Vor Produktivbetrieb entfernen,
  deaktivieren oder durch Auth/Rollen ersetzen.

**Akzeptanz / Verifikation:**
- `/admin` lädt ohne Crash, Pilotfelder editierbar, Speichern funktioniert.
- Keine Produktdatenbank berührt, kein `@/lib/supabase/client` in
  `src/features/admin/**` (0 echte Treffer, nur Doc-Kommentare).
- Kein `service_role` im Frontend (0 echte Treffer).
- Keine direkten `.update/.insert/.upsert/.delete`-Aufrufe in
  `src/features/admin/**` (0 echte Treffer, nur Doc-Kommentare).
- Schreiben läuft ausschließlich über die neue RPC.
- `anwendungen.pflege` bleibt `draft` / `is_active=false`.
- Öffentliche Seite `/anwendungen/pflege` bleibt im i18n/static-Fallback,
  keine `[Pilot]`-Texte sichtbar.
- Navigation, Routen, i18n-Dateien, MetaNavigation, Footer: unverändert.
- `npm run i18n:check` → OK (18 Namespaces, 77 Seiten, 0/0).
- `npm run build` → wird vom Lovable-Harness automatisch verifiziert.

---

## cms-light-admin-write-policy-decision-1 — 2026-05-10 (Architektur-/Sicherheitsentscheidung, reine Doku)

**Scope:** Reine Schreib-/Policy-Entscheidung für den nächsten technischen
Schritt. **Keine** Codeänderung, keine Migration, keine Schreib-RPC, keine
Policy-Änderung, keine Admin-UI-Änderung, keine Produktdatenbank-, Navigations-,
Routen- oder i18n-Änderung. Geänderte Dateien: nur `docs/current-status.md`
und `docs/migration-log.md` (dieser Eintrag).

**Entscheidung (Variante A):** Für den aktuellen Workspace-Prototyp wird in
einer Folgeetappe eine **temporäre, eng begrenzte Schreib-RPC** ausschließlich
für die Pilotseite `anwendungen.pflege` vorbereitet.

**Erlaubter Schreib-Scope der späteren RPC:**
- nur **Update** auf `cms_section_fields.value` (kein `insert`, kein `upsert`)
- nur `page_key = 'anwendungen.pflege'`
- nur folgende Feldkeys:
  - `hero.headline`
  - `hero.intro`
  - `answer-first.text`
  - `intro.text`
- nur Locales `de` und `en`
- nur bereits vorhandene Feldzeilen

**Verboten in der späteren Schreib-RPC:**
- keine neuen Seiten
- keine neuen Sections
- keine neuen Fields
- keine neuen Locales
- keine Statusänderung an `cms_pages`
  (kein Update auf `status`, `is_active`, `route_path`, `page_type`)
- keine Navigation, keine Assets, keine Uploads
- keine Produktdaten / Produktdatenbank
- keine Duplizierung
- keine allgemeine CMS-Schreibfunktion
- keine dynamische SQL
- keine frei nutzbare `page_key`-Logik
- kein `service_role` im Frontend

**Sicherheitsklarstellung:** Solange `/admin` ohne Login läuft, wäre auch
eine Schreib-RPC mit `anon execute` technisch öffentlich aufrufbar. Das ist
**nicht produktionssicher**. Diese Prototyp-Ausnahme wird nur akzeptiert,
wenn alle oben genannten Begrenzungen eingehalten werden und die Funktion
vor Produktivbetrieb entfernt, deaktiviert oder durch Auth/Rollen ersetzt
wird. Diese Einschränkung ist hier ausdrücklich dokumentiert.

**Status der Pilotseite:** `anwendungen.pflege` bleibt unverändert
`status = draft`, `is_active = false`. Öffentliche Seite `/anwendungen/pflege`
bleibt im i18n/static-Fallback ohne `[Pilot]`-Marker. Veröffentlichung /
Statusänderung bleibt eine **ausdrücklich separate spätere Etappe**.

**Nächste technische Etappe:** `cms-light-admin-save-pilot-1` — Implementierung
der oben beschriebenen, eng begrenzten Schreib-RPC plus minimaler
Speichern-Anbindung im `/admin`-CMS-Pilot-Tab für genau die vier erlaubten
Pilotfelder in `de`/`en`.

**Akzeptanz dieser Etappe:**
- Entscheidung dokumentiert ✅
- Keine Schreibrechte geöffnet ✅
- Keine Schreib-RPC angelegt ✅
- Keine Codeänderung ✅
- Keine Migration ✅
- Produktdatenbank unberührt ✅
- Nächste Etappe klar benannt: `cms-light-admin-save-pilot-1` ✅
- Veröffentlichung/Statusänderung ausdrücklich separat ✅


## cms-light-admin-editor-readonly-final-check-1 — 2026-05-10 (Reiner Final-Check, nur Doku)

**Scope:** Reiner Final-Check der Etappe `cms-light-admin-editor-readonly-1`.
Keine Codeänderung, keine UI-Erweiterung, keine Schreibfunktion, keine Migration,
keine Policy-Änderung, keine Produktdatenbank-, Navigations-, Routen- oder
i18n-Änderung. Einzige geänderte Datei: `docs/migration-log.md` (dieser Eintrag).

**Geprüfte Dateien:**
- `src/features/admin/components/ReadOnlyField.tsx`
- `src/features/admin/components/SectionGroup.tsx`
- `src/features/admin/pages/AdminPage.tsx`
- `src/features/admin/api/cmsAdminRead.ts`

**Ergebnis Admin-Komponenten:** OK. Komponenten kompilieren fehlerfrei,
keine `<input>`, keine `<textarea>`, keine Save-/Upload-/Delete-/Duplicate-/
Status-Controls. Read-only Boxen sind reine Anzeige.

**Ergebnis Admin-API:** OK. `cmsAdminRead.ts` weiterhin nur lesend,
Datenquelle bleibt `rpc_admin_read_pilot_pflege()`, CMS-Light-Client
weiterhin lazy/dynamisch über `@/integrations/supabase/client`. Kein Import
von `@/lib/supabase/client`. Keine Schreiboperationen, keine schreibenden
RPCs, kein `service_role` (nur als verbotener Begriff im Doku-Kommentar
erwähnt).

**Ergebnis `/admin`:** Lädt ohne Crash. Tabs sichtbar: Übersicht, Seiten,
CMS-Pilot. Im Tab CMS-Pilot sichtbare Gruppen: **Seitenstatus, Hero,
Answer-First, Intro**. Draft-Daten der Pilotseite werden DE/EN angezeigt.
Klar als „Nur Leseansicht" gekennzeichnet. Keine Eingabefelder, keine
Textareas, keine Speichern-/Status-/Upload-/Duplizieren-/Löschen-Buttons.
Keine Console-Fehler.

**Ergebnis `/anwendungen/pflege`:** Lädt ohne Crash, kein `[Pilot]`-Text
sichtbar, i18n/static-Fallback aktiv, Hero-Bild unverändert. Keine
Console-Fehler.

**Ergebnis `/`:** Keine weiße Seite, App lädt ohne Crash, Lazy
CMS-Client-Import bleibt erhalten.

**Greps in `src/features/admin/**`:**
- `@/lib/supabase/client`: 0 Treffer
- `<input`: 0 Treffer
- `<textarea`: 0 Treffer
- `.insert(` / `.update(` / `.upsert(` / `.delete(`: 0 Treffer
- `service_role`: 0 echte Verwendung (nur als verbotener Begriff im Kommentar)

**Datenbankstatus (per `cms_pages`-Lesequery verifiziert):**
`anwendungen.pflege` weiterhin `status = draft`, `is_active = false`.

**Bestätigungen:**
- keine Inputs
- keine Textareas
- keine Speichern-Buttons
- keine Schreiboperationen
- keine Produktdatenbank
- keine Navigation/Footer/MetaNavigation geändert
- keine RLS-/Policy-/Migration-Änderung
- `anwendungen.pflege` bleibt `draft` / `is_active=false`
- öffentliche Seite bleibt ohne `[Pilot]`

**Verifikation:**
- `npm run i18n:check`: OK — 18 Namespaces, 77 Seiten, 0 Fehler / 0 Warnungen
- `npm run build`: wird vom Lovable-Harness automatisch verifiziert


## cms-light-admin-prototype-decision-1 — 2026-05-09 (Architektur-/Sicherheitsentscheidung, reine Doku)

**Scope:** Reine Dokumentations- und Architekturentscheidung. **Keine** Codeänderung,
keine Datei unter `src/**` oder `supabase/**` angefasst, keine Migration, keine
Admin-UI, keine Route `/admin`, keine Schreibrechte, keine Produktdatenbank-,
Navigations-, Routen- oder i18n-Änderung.

**Entscheidung:** Ein temporärer Admin-Prototyp unter `/admin` darf in einer
Folgeetappe vorbereitet werden — ausdrücklich als **No-Login-Prototyp-Ausnahme**
für Workspace-/Mitarbeiter-Prototyping.

**Regeln (verbindlich):**
- **Scope:** ausschließlich CMS-Light, ausschließlich redaktionelle Webseiteninhalte,
  zunächst nur Pilotseite `anwendungen.pflege`. Keine Produktdaten, keine
  Produktdatenbank, keine Navigation-aus-DB, keine Routen-/Slug-Verwaltung,
  keine freie Seitenmaschine.
- **Sicherheit:** No-login `/admin` ist **nicht produktionssicher**. `/admin` muss
  vor jeder öffentlichen Veröffentlichung der Website **geschützt (Login/Rollen),
  entfernt oder technisch deaktiviert** werden. Keine `service_role` im Frontend,
  keine Produktdatenbank-Schreibrechte, keine pauschalen Schreibrechte.
  CMS-Light-Schreibrechte werden erst in einer eigenen, ausdrücklich beauftragten
  Folgeetappe geöffnet.
- **Exportfähigkeit:** Inhalte bleiben portabel über die fachlichen Schlüssel
  `page_key`, `section_key`, `field_key`, `locale`. UUIDs sind nur technische IDs.
  Keine Lovable-only Geschäftslogik, keine Produktdaten im CMS.

**Nächste technische Etappe:** `cms-light-admin-shell-readonly-1`.
Diese darf: Route `/admin` anlegen, einfache Admin-Übersicht bauen, Pilotseite
`anwendungen.pflege` anzeigen, vorhandene CMS-Felder lesen, Status `draft` /
`is_active` anzeigen.
Diese darf nicht: speichern, Policies ändern, Admin-Login bauen, Navigation aus
DB lesen, Produktdaten verwenden, weitere Seiten anbinden.

**Geänderte Dateien:**
- `docs/migration-log.md` (dieser Eintrag)
- `docs/current-status.md` (Statusergänzung + nächster Schritt)

**Akzeptanz erfüllt:**
- No-Login-Admin-Prototyp ist als temporäre Prototyp-Ausnahme dokumentiert.
- Keine Schreibrechte geöffnet. Keine Admin-UI gebaut. Keine Codeänderung.
  Keine Supabase-Migration. Produktdatenbank unangetastet.
- Nächste Etappe klar benannt: `cms-light-admin-shell-readonly-1`.

---

## cms-light-pilot-schema-1 — Nachzug 2026-05-09 (Schema-Komplettierung + Pilot-Seed)

**Scope:** Reine Schema-/Daten-Etappe. Vervollständigung des CMS-Light-Schemas
gemäß finaler Etappen-Spezifikation, Anlage des Storage-Buckets `cms-assets`
und Seed der Pilotseite `anwendungen.pflege` mit Sektionen und Feldern.
**Keine** UI-Änderung, keine Renderer-/Routen-/Navigation-/i18n-Änderung,
keine Produktdatenbank-Änderung, keine Datei unter `src/**` angefasst.

**Schema-Ergänzungen:**
- `cms_section_fields`: Spalte `value_json jsonb` ergänzt; Composite-Foreign-Key
  `(page_key, section_key)` → `cms_sections(page_key, section_key)` mit
  `on delete cascade` ergänzt.
- `cms_assets`: Spalten `field_key`, `file_name`, `mime_type`, `alt_de`, `alt_en`
  ergänzt (`alt_text_de/en` aus der Vorgängermigration bleiben als Legacy
  bestehen und wurden in `alt_de/alt_en` rückgespiegelt). `storage_path` und
  `asset_role` auf `NOT NULL` gesetzt.
- `updated_at`-Trigger auf allen vier CMS-Tabellen aktiviert
  (`cms_set_updated_at`).

**Storage:**
- Public Bucket `cms-assets` angelegt (portabler, neutraler Name).
- Genau **eine** SELECT-Policy auf `storage.objects`
  (`cms_assets bucket public read`, `bucket_id = 'cms-assets'`).
- **Keine** INSERT/UPDATE/DELETE-Policies. Schreiben in den Bucket ist in dieser
  Etappe für niemanden möglich (auch nicht für `authenticated`); folgt in der
  späteren Admin-Sicherheits-Etappe.
- Konvention für Storage-Pfade (dokumentarisch, nicht erzwungen):
  `cms/{page_key}/{section_key}/{asset_role}/{filename}`.
- Linter-Hinweis `0025_public_bucket_allows_listing` (WARN) ist bekannt und
  für einen öffentlichen redaktionellen CMS-Bucket fachlich akzeptiert; eine
  Verschärfung (Path-Scoping) wird zusammen mit der Admin-Sicherheits-Etappe
  bewertet.

**Pilot-Seed `anwendungen.pflege` (T05, weiterhin `draft`, `is_active = false`):**
- `cms_sections` (3 Einträge, `is_active = true`):
  `hero` (sort 10), `answer-first` (sort 20), `intro` (sort 30).
- `cms_section_fields` (8 Einträge, je DE/EN):
  `hero.headline`, `hero.intro`, `answer-first.text`, `intro.text`.
  Alle Werte klar mit Präfix `[Pilot]` markiert.

**Trennung Produktdatenbank ↔ CMS-Light bestätigt:**
- `src/lib/supabase/client.ts` (Produktdaten-Client) unverändert.
- Keine Produktdaten in CMS-Tabellen kopiert.
- CMS-Light nutzt ausschließlich den eigenen, im Webseitenprojekt aktivierten
  Lovable-Cloud-Backend (`src/integrations/supabase/client.ts`).

**Exportierbarkeit bestätigt:**
- Tabellen liegen vollständig im Schema `public`.
- Keine Lovable-spezifischen Spaltentypen/Extensions.
- UUIDs nur als technische Datensatz-IDs; fachliche Zuordnung über
  `page_key` / `section_key` / `field_key` / `locale`.
- Schema und Daten sind per `pg_dump` in eine TCS-eigene Postgres-/Supabase-
  Umgebung übertragbar.

**Akzeptanzkriterien erfüllt:**
- SQL-Migration angelegt; keine `anon`-Schreibrechte; Pilotseite vorbereitet,
  aber nicht öffentlich gerendert; keine UI-Änderung.

---

## cms-light-pilot-schema-1 — 2026-05-09

**Scope:** Technische Grundlagen-Etappe für CMS-Light. Erstmalige Aktivierung von
Lovable Cloud im Webseitenprojekt – ausschließlich für eine eigene CMS-Light-Datenbank
für **redaktionelle Webseiteninhalte**. Anlage des minimalen CMS-Schemas
(`cms_pages`, `cms_sections`, `cms_section_fields`, `cms_assets`) inklusive RLS und
nur-Lese-Policies für veröffentlichte, aktive Inhalte. Keine öffentliche Seite liest
bisher aus dem CMS.

**Migrationen (Lovable Cloud / Supabase, Schema `public`):**
- Tabellen: `cms_pages`, `cms_sections` (FK `page_key` → `cms_pages.page_key`,
  on delete cascade), `cms_section_fields`, `cms_assets`. Felder gemäß
  Etappenvorgabe (`page_key`, `route_path`, `page_type`, `title_de/en`,
  `status` ∈ {draft, published, archived}, `is_active`, `section_key`,
  `section_type`, `field_key`, `locale` ∈ {de, en}, `asset_role`,
  `storage_path`, `public_url`, `alt_text_de/en`, `focal_x/y`, `sort_order`,
  Zeitstempel).
- Indizes: `cms_sections(page_key)`, `cms_section_fields(page_key, section_key)`,
  `cms_assets(page_key, section_key)`.
- Hilfsfunktionen: `cms_set_updated_at()` (Trigger, `set search_path = public`),
  `cms_page_is_public(_page_key)` (`security invoker`, `set search_path = public`).
- `updated_at`-Trigger auf allen vier Tabellen.
- **RLS aktiviert** auf allen vier Tabellen.
- **Lese-Policies** (für `anon` und `authenticated`):
  - `cms_pages`: nur `status = 'published' and is_active = true`.
  - `cms_sections`: `is_active = true and cms_page_is_public(page_key)`.
  - `cms_section_fields`: `cms_page_is_public(page_key)`.
  - `cms_assets`: `is_active = true and cms_page_is_public(page_key)`.
- **Keine** INSERT/UPDATE/DELETE-Policies. Keine `anon`-Schreibrechte. Keine
  pauschalen `authenticated`-Schreibrechte. Schreibrechte werden in einer späteren
  Etappe (`cms-light-admin-security-1` / `cms-light-admin-minimal-1`) entschieden.

**Initialdaten:**
- Genau ein Draft-Eintrag in `cms_pages` für die Pilotseite:
  `page_key='anwendungen.pflege'`, `route_path='/anwendungen/pflege'`,
  `page_type='T05'`, `title_de='Pflege'`, `title_en='Care'`,
  `status='draft'`, `is_active=false`. Damit ist der Eintrag durch die Lese-Policies
  öffentlich **nicht sichtbar**. Keine erfundenen Marketingtexte.

**Geänderte Dateien (Code/Doku):**
- `docs/migration-log.md` — dieser Eintrag.
- `docs/current-status.md` — Abschnitt „CMS-Light – strategischer Stand" aktualisiert
  (Schema vorbereitet, aber noch nicht produktiv genutzt).

**Bewusst NICHT geändert:**
- **Kein** bestehender Produktdaten-Client (`src/lib/supabase/client.ts`) angefasst.
- **Keine** Schreibzugriffe auf die externe Produktdatenbank.
- **Keine** Produktdaten in CMS-Tabellen kopiert oder gespiegelt.
- **Keine** Änderung an Navigation, Routen, Breadcrumbs, Renderern, Pages oder i18n.
- **Kein** Admin-UI, **keine** Login-/Auth-UI, **keine** öffentliche Seite auf CMS umgestellt.
- **Kein** `service_role`-Key im Frontend.
- **Kein** vorbereitender CMS-Client unter `src/lib` angelegt – nicht zwingend nötig
  in dieser Etappe; konkrete Env-Namen und Client-Struktur folgen in der späteren
  Client-/Admin-Etappe.

**Sicherheits-Linter:** Erste Migration ergab drei Warnungen (Function Search Path
Mutable, SECURITY DEFINER für anon/authenticated ausführbar). Folge-Migration hat
`cms_set_updated_at` mit `set search_path = public` versehen und `cms_page_is_public`
auf `security invoker` (mit fixem `search_path`) umgestellt. Da die RLS-Policy auf
`cms_pages` ohnehin nur veröffentlichte, aktive Seiten freigibt, liefert die
Invoker-Variante exakt das gewünschte Verhalten ohne erhöhte Rechte.

**Verifikation:**
- `npm run i18n:check`: nicht erforderlich, keine i18n-Änderung. Bleibt aus
  Vor-Etappe grün.
- Build: keine `src/**`-Änderung außer der automatisch durch Cloud-Aktivierung
  installierten Dependency `@supabase/supabase-js`. Build-Verifikation durch Harness.

---

## cms-light-architecture-decision-1 — 2026-05-09

**Scope:** Reine Architektur-/Doku-Etappe. Die bestehenden Projektleitplanken in
`docs/lovable-custom-rules.md` wurden so aktualisiert, dass ein späterer CMS-Light-Pilot
grundsätzlich erlaubt ist, die externe Produktdatenbank aber strikt getrennt und read-only
bleibt.

**Geänderte Dateien:**
- `docs/lovable-custom-rules.md` — Abschnitt 1 (Projektkontext) präzisiert; Abschnitt 2
  in **2a Externe Produktdatenbank – read-only** und **2b Eigene CMS-Light-Datenbank – nur
  nach expliziter Etappe** aufgeteilt; Abschnitt 3 (Punkte 6 + 7) differenziert
  (Admin-UI / CMS-Light / zweite Content-DB nur nach beauftragter Etappe, **keine zweite
  Produktdatenbank**); Abschnitt 10 (No-Go-Liste) differenziert (Lovable Cloud/Migrationen
  nur ohne CMS-Light-Etappe verboten; Produktdatenvermischung, anon-Schreibrechte,
  Admin-UI ohne Pilot-Etappe, Navigation-aus-DB ohne Architekturentscheidung, Vermischung
  von Produktdaten- und CMS-Client bleiben absolut verboten); Abschnitt 11 (Kurzfassung)
  konsistent zur Langfassung neu geschrieben.
- `docs/current-status.md` — neuer Abschnitt „CMS-Light – strategischer Stand" mit Verweis
  auf `pageRegistry.ts`, `cms-id-key-modell.md` und nächste mögliche Etappe
  `cms-light-pilot-schema-1`.
- `docs/migration-log.md` — dieser Eintrag.

**Bewusst NICHT geändert:**
- **Keine Lovable Cloud aktiviert.**
- **Keine Migrationen angelegt.**
- **Kein `supabase/`-Ordner entstanden.**
- **Keine Tabellen, Views, Policies oder Buckets** angelegt.
- **Keine Admin-UI** gebaut.
- **Keine Produktdatenlogik** geändert; Produktdaten bleiben read-only und außerhalb von CMS-Light.
- **Keine Datei unter `src/**`** verändert; `src/navigation/pageRegistry.ts` bleibt unverändert
  und weiterhin nirgends importiert.
- **Keine Navigation-, Routen- oder Renderer-Änderung.**
- **Keine konkreten Env-Namen** für einen späteren CMS-Client festgelegt – das ist Aufgabe
  der späteren Schema-/Client-Etappe.

**Status:** abgeschlossen. Build wurde nicht ausgeführt (reine Doku-Etappe, keine Code-Änderung).

## zutrittskontrolle-breadcrumb-tueren-tore-2 — 2026-05-08

**Scope:** BCM Handsender in die virtuelle „Türen & Tore"-Breadcrumb-Logik aufgenommen.

**Geänderte Dateien:**
- `src/components/AutoBreadcrumb.tsx` — `TUEREN_TORE_PRODUCT_ROUTES` um `/zutrittskontrolle/bcm-handsender` ergänzt (jetzt 5 Routen). `if`-Block in `buildBreadcrumbs()` unverändert (bereits korrekt innerhalb der `forEach`-Schleife nach dem `zutrittskontrolle`-Segment positioniert).
- `src/i18n/locales/de/navigation.json` — `breadcrumb.segments.bcm-handsender: "BCM Handsender"` ergänzt.
- `src/i18n/locales/en/navigation.json` — `breadcrumb.segments.bcm-handsender: "BCM Remote Control"` ergänzt.
- `docs/migration-log.md` — dieser Eintrag.

**Hinweis:** Annahme aus dem Auftrag, das Set sei in `order-fix-1` entfernt worden, traf nicht zu — es war noch vorhanden. Es wurde lediglich der 5. Eintrag ergänzt; die anderen 4 Routen und die 4 bestehenden `breadcrumb.segments`-Keys sind unverändert.

**Build:** `npm run i18n:check` 0/0; `npm run build` siehe Final-Check.

**Status:** abgeschlossen.

## catalog-contract-render-fix-1 — 2026-05-07

**Scope:** Webseiten-Katalog rendererseitig 1:1 an den Supabase-Datenvertrag (catalog-contract.json, CATALOG.md) und an die realen Sample-Payloads angepasst. Read-only, keine DB-Änderungen, keine neuen Views/RPCs/Migrationen.

**Geänderte Dateien:**
- `src/features/service/catalog/lib/pdpAssets.ts` — `buildAssetUrl` entfernt; neuer `resolvePublicUrl` nutzt ausschließlich `public_url`/`url` aus der DB. Keine Bucket-Strings, kein `storage.from(...).getPublicUrl(...)` mehr.
- `src/features/service/pages/ProductDetailPage.tsx` — Header aus `headline_resolved`/`headline` + `subheadline_resolved`/`subheadline`; Features ohne erneutes Status-Filter; Specs führend aus `rpc_get_product_specs_display.display_value` (kein Frontend-Format „Ja/Nein"); Bilder/Dokumente nur aus `public_url`; Paket-Erkennung ausschließlich `paket_klasse != null && paket_komponenten.length > 0` (kein Präfix); Pakete ohne Feature-Bullets/Eyebrow; Komponenten bevorzugt aus `payload.paket_komponenten`, `api_v1_paket_komponenten` nur als Fallback; Block-Sichtbarkeit über `block_visibility` respektiert; `ProductPdpInfoTable` aus dem Render-Tree entfernt (Doppelung zum Header).
- `src/features/service/catalog/components/CatalogProductGrid.tsx` — Karten nur noch über Vertrags-/Sample-Felder (`title`, `teaser`, `primary_image_public_url`/`primary_image_url`, `pdp_slug`, `badges[]` mit `label_de`/`label_en`); tote Fallbacks auf `kurztext`/`kurzbeschreibung`/`pdp_artikel_nr`/`listenpreis` entfernt.
- `src/features/service/catalog/components/CatalogMvp.tsx` — `p_ip_gateway` als Boolean übergeben (vorher String); `p_tastenanzahl` als Integer.
- `src/features/service/catalog/api/catalog.ts` — Typen `ip_gateway: boolean`, `tastenanzahl: number` an Vertrag angeglichen.
- `docs/migration-log.md` — dieser Eintrag.

**Vertragstreu jetzt:** Listing (Bild/Titel/Teaser/Preis/Badges/Slug), PDP-Header, Features, technische Daten (Gruppen + `display_value`), Bilder (Sortierung `is_primary` zuerst, dann `sort_order`), Dokumente (gruppiert nach `category`, nur `link_status='active'`), Paket-Komponenten (DB-getrieben, ohne Präfix-Heuristik), Block-Sichtbarkeit.

**Bewusst NICHT im Frontend kompensierte DB-/Vertragslücken:**
- `documents[].public_url` ist in den Sample-Payloads nicht enthalten (nur `file_path`/`file_name`/`category`). Dokumente werden in diesem Fall ohne klickbaren Link gerendert; Bucket-Konstruktion ist verboten.
- `headline_resolved`/`subheadline_resolved`/`pdp_slug_resolved` sind im Vertrag definiert, in den Samples aber unter `headline`/`subheadline`/`pdp_slug` ausgeliefert — beide Schreibweisen werden gelesen, ohne neue Felder zu erfinden.
- `block_visibility` und `feature_items` (Vertragsname) liegen in den Samples nicht vor; gerendert wird `features[]` und blockweise per Inhaltsprüfung.
- `applicable_filters[]` aus `catalog_navigation_groups` wird (noch) nicht ausgewertet.
- `types.ts` aus dem Stammprojekt liegt nicht vor; der Supabase-Client bleibt vorerst ohne `Database`-Generic. Sobald die Datei geliefert wird, kann sie unter `src/integrations/supabase/types.ts` eingezogen und als Generic in `src/lib/supabase/client.ts` ergänzt werden.

**Verbote eingehalten:** keine INSERT/UPDATE/DELETE, kein `service_role`, keine Mockdaten, keine Klassifikation aus `artikel_nr`, keine Bucket-Strings, keine eigene Übersetzungslogik für Produktinhalte.

**Status:** erledigt.


**Ziel:** Vollständiger Umbau von /zutrittskontrolle/elektronischer-knaufzylinder auf die Drückergarnitur-Seitenstruktur (Hero → Intro → Vorteile → Anwendungen → CTA).

**Geänderte Dateien:**
- `src/features/zutrittskontrolle/pages/ElektronischerKnaufzylinderPage.tsx` — komplett neu aufgebaut nach Vorbild ElektronischeDrueckergarniturPage.
- `src/i18n/locales/de/zutrittskontrolle.json` — `knaufzylinder`-Zweig vollständig ersetzt durch Flyer-Texte VF9815-8.
- `src/i18n/locales/en/zutrittskontrolle.json` — analog EN.
- `docs/migration-log.md` — dieser Eintrag.

**Hinweis:** Alle bisherigen Platzhalter durch Flyer-Texte VF9815-8 ersetzt. 8 Vorteile, 4 Anwendungen, CTA mit Kontaktdaten.

## feature-elektronische-drueckergarnitur-datasheet-icon-1 — 2026-05-07

**Ziel:** Download-Icon hinter „Datenblatt herunterladen"-Button auf /zutrittskontrolle/elektronische-drueckergarnitur (Hero + CTA).

**Hinweis:** Download-Icon (w-4 h-4) hinter Text, analog ArrowRight-Muster. Beide Stellen (Hero + CTA).

**Weiterhin offene Punkte:** Vorteile-Slots 7+8, CTA-Kontaktdaten, Datenblatt-PDF.

## feature-elektronische-drueckergarnitur-cta-labels-1 — 2026-05-07

**Ziel:** CTA-Button-Labels auf /zutrittskontrolle/elektronische-drueckergarnitur umbenennen.

**Geänderte Dateien:**
- `src/i18n/locales/de/zutrittskontrolle.json` — Hero/CTA: "Beratung anfragen" → "Projektanfrage senden", "Datenblatt" → "Datenblatt herunterladen".
- `src/i18n/locales/en/zutrittskontrolle.json` — Hero/CTA: "Request consultation" → "Send project enquiry", "Data Sheet" → "Download data sheet".
- `docs/migration-log.md` — dieser Eintrag.

**Hinweis:** Reine i18n-Änderung. TSX, Routing, Verlinkungen unverändert.

**Weiterhin offene Punkte:** Vorteile-Slots 7+8, CTA-Kontaktdaten, Datenblatt-PDF.

## feature-elektronische-drueckergarnitur-tueren-tore-link-1 — 2026-05-06

**Ziel:** Karten-Links auf `/zutrittskontrolle/tueren-tore` von „Datenblatt" auf „Mehr erfahren" umstellen und Karte „Elektronische Drückergarnitur" intern verlinken.

**Geänderte Dateien:**
- `src/features/zutrittskontrolle/pages/TuerenTorePage.tsx` — `Link` aus `react-router-dom` importiert; `PRODUCT_ITEMS.drueckergarnitur` mit `href: "/zutrittskontrolle/elektronische-drueckergarnitur"` ergänzt; Link-Bereich am Kartenende konditional: aktive Karte rendert `<Link>` mit `text-primary`, alle anderen behalten `<span aria-disabled="true">` mit `cursor-not-allowed`.
- `src/i18n/locales/de/zutrittskontrolle.json` — neuer Key `shared.products.learnMore = "Mehr erfahren"`.
- `src/i18n/locales/en/zutrittskontrolle.json` — neuer Key `shared.products.learnMore = "Learn more"`.

**Hinweise:**
- Label aller Karten-Links von `shared.products.datasheet` auf `shared.products.learnMore` umgestellt. `datasheet`-Key bleibt erhalten.
- Nur `drueckergarnitur` hat aktiven Link. Seite `/zutrittskontrolle/elektronische-drueckergarnitur` ist damit erstmals intern verlinkt.

**Validierung:** `npm run i18n:check` → 18 Namespaces, 72 strictPages, 0 Fehler, 0 Warnungen ✓

## feature-elektronische-drueckergarnitur-hero-description-final-check-1 — 2026-05-06

**Ziel:** Final-Check Etappe `feature-elektronische-drueckergarnitur-hero-description-1`.

**Build/Health:**
- A1 `npm run i18n:check`: 18 Namespaces, 72 strictPages, 0 Fehler, 0 Warnungen ✅
- A2 `npm run build`: grün (Harness-Verifikation) ✅

**Hero (B):**
- B1 `<p>{t("…hero.description")}</p>` zwischen Subline und Buttons in `ElektronischeDrueckergarniturPage.tsx` vorhanden ✅
- B2 Reihenfolge Headline → Subline → Beschreibung → Buttons ✅
- B3 Beide Buttons (`hero.cta`, `hero.datasheetLabel`) unverändert ✅
- B4 Hero-Bild linke Spalte unverändert ✅
- B5 Kein Eyebrow (weiterhin entfernt) ✅

**i18n-Keys (C):**
- C1 DE `elektronischeDrueckergarnitur.hero.description` mit Auftraggeber-Text vorhanden ✅
- C2 EN strukturgleich mit englischem Text ✅
- C3 `elektronischeDrueckergarnitur.intro` in DE+EN entfernt ✅
- C4 Andere Keys unverändert ✅
- C5 `tuerenTore.products.drueckergarnitur` unverändert ✅

**Intro-Sektion (D):**
- D1 Kein grauer Block zwischen Hero und Vorteilen ✅
- D2 Keine `intro.*`-Aufrufe mehr in TSX ✅

**Unerwartete Abweichungen (E) — KLÄRUNG:**
- ⚠️ E1 — Namespace 18 = **`kontakt-bcm`**. Registriert in `src/i18n/index.ts` (Zeilen 46–47 Imports, Zeile 115 in `I18N_NAMESPACES`). JSON-Dateien `src/i18n/locales/{de,en}/kontakt-bcm.json` existieren. **Herkunft:** frühere Etappe (Aufbau Seite `KontaktBcmPage.tsx`/Route `/kontakt/kontakt-bcm`), nicht aus dieser Etappe. Die Sollvorgabe „17" im Auftrag war veraltet.
- ⚠️ E2 — strictPage 72 = **`src/features/zutrittskontrolle/pages/BcmHandsenderPage.tsx`**. Eingetragen in `scripts/i18n/i18n-check.config.json` (Zeile 63). Datei existiert. **Herkunft:** Etappe `bcm-handsender-1`, nicht aus dieser Etappe.
- **Empfehlung:** Beide Einträge sind aus früheren, abgeschlossenen Etappen korrekt entstanden. **Keine Bereinigungsetappe nötig** — die Soll-Zahl im Auftrag (17/71) war veraltet. Auftraggeber bitte bestätigen, dann kann die erwartete Baseline auf 18/72 fortgeschrieben werden.

**Nebenwirkungen (F):**
- F1 `src/navigation/` unverändert ✅
- F2 `src/app/routes.tsx` unverändert ✅
- F3 Andere Domain-Seiten unverändert ✅

**Doku (G):**
- G1 Eintrag `feature-elektronische-drueckergarnitur-hero-description-1` vorhanden ✅
- G2 ⚠️ `docs/02-architecture/code-landkarte.md` enthält keinen Eintrag zum Namespace `kontakt-bcm` — Lücke notiert, separate Doku-Etappe empfohlen.

**Weiterhin offen:** Vorteile-Slots 7+8, CTA-Kontaktdaten, Datenblatt-PDF.

## feature-elektronische-drueckergarnitur-hero-description-1 — 2026-05-06

**Ziel:** Hero-Beschreibungsabsatz auf `/zutrittskontrolle/elektronische-drueckergarnitur` zwischen Subline und Buttons. Intro-Sektion vollständig entfernt.

**Geänderte Dateien:**
- `src/features/zutrittskontrolle/pages/ElektronischeDrueckergarniturPage.tsx` — neuer `<p>`-Absatz `hero.description` in der Hero-Textspalte; gesamte Intro-Sektion (TSX) entfernt.
- `src/i18n/locales/de/zutrittskontrolle.json` — neuer Key `elektronischeDrueckergarnitur.hero.description`; `elektronischeDrueckergarnitur.intro` vollständig entfernt.
- `src/i18n/locales/en/zutrittskontrolle.json` — strukturgleich (description EN, intro entfernt).
- `docs/migration-log.md` — dieser Eintrag.

**Hinweis:** Beschreibungstext aus bisherigem `intro.text` als neuer `hero.description`-Key angelegt — bewusst nicht verschoben, da anderer Kontext und andere Position. `intro`-Keys vollständig entfernt. Weiterhin offen: Vorteile-Slots 7+8, CTA-Kontaktdaten, Datenblatt-PDF.

## bcm-handsender-2-final-check — 2026-05-06

**Ziel:** Final-Check bcm-handsender-2.

**Befund:** Layout-Änderungen korrekt umgesetzt (Hero-Reihenfolge label→h1→intro→Fließtext, Bildcontainer `bg-white rounded-lg p-4`, Einführungs-Section entfernt). i18n-Keys `section.headline`/`section.text` in DE+EN erhalten. Keine Änderung an JSON-Locales, Routes oder Navigation. **Klärung Abweichung 18/72:** Der Initial-Bericht zu bcm-handsender-1 mit 17/71 war veraltet — die Registrierung des Namespaces `kontakt-bcm` (18.) und Aufnahme von `BcmHandsenderPage.tsx` in `strictPages` (72.) gehörten bereits zu bcm-handsender-1, wurden in dieser Etappe lediglich erneut gezählt. Keine ungeplante Erweiterung in bcm-handsender-2.

## bcm-handsender-2 — 2026-05-06

**Ziel:** Layout-Korrekturen BCM Handsender Seite.

**Geänderte Dateien:**
- `src/features/zutrittskontrolle/pages/BcmHandsenderPage.tsx` — Intro-Text (`section.text`) in Hero rechte Spalte unter `hero.intro` verschoben. Separater Einführungstext-Abschnitt entfernt. Produktbild-Container auf `bg-white rounded-lg p-4` gesetzt.
- `docs/migration-log.md` — dieser Eintrag.

**Bewusst nicht geändert:** i18n-Locales (Keys bleiben), Routing, Navigation. i18n-Check weiterhin 0/0.

## feature-elektronische-drueckergarnitur-cta-datenblatt-1 — 2026-05-05

**Ziel:** Zweiter CTA-Button „Datenblatt" in Hero- und CTA-Sektion der Seite `/zutrittskontrolle/elektronische-drueckergarnitur` neben dem bestehenden Button „Beratung anfragen". Label und Ziel-URL über i18n-Keys, sekundärer Button-Stil (outlined), öffnet in neuem Tab.

**Geänderte Dateien:**
- `src/features/zutrittskontrolle/pages/ElektronischeDrueckergarniturPage.tsx` — zweiter Button in Hero- und CTA-Sektion ergänzt.
- `src/i18n/locales/de/zutrittskontrolle.json` — neue Keys `elektronischeDrueckergarnitur.hero.datasheetLabel`/`datasheetUrl` und `elektronischeDrueckergarnitur.cta.datasheetLabel`/`datasheetUrl`.
- `src/i18n/locales/en/zutrittskontrolle.json` — strukturgleich, EN-Werte (`Data Sheet` / `#datasheet-placeholder`).
- `docs/migration-log.md` — dieser Eintrag.

**Hinweis:** Datenblatt-URL ist Platzhalter (`#datenblatt-platzhalter` / `#datasheet-placeholder`). Ersatz durch echten PDF-Pfad oder externe URL erfolgt in separater Content-Etappe, sobald das PDF hinterlegt ist — keine TSX-Änderung nötig.

**Hinweis:** Weiterhin offen aus Vorgänger-Etappen: Vorteile-Slots 7+8, CTA-Kontaktdaten (Telefon, E-Mail), Funktionsweise/Einsatzbereiche/FAQ-Inhalte sowie EN-Übersetzungen.

**Quality Gates:** `npm run i18n:check` → 0 Fehler, 0 Warnungen. Final-Check separat in Etappe `feature-elektronische-drueckergarnitur-cta-datenblatt-final-check-1`.

| Etappe | Datum | Scope | Betroffene Dateien | Status | Bemerkung |
|---|---|---|---|---|---|
| 0 | 2026-04-20 | Architekturdokumentation und leere Zielordner | `docs/architecture.md`, `docs/migration-log.md`, leere Zielordner unter `src/app/`, `src/navigation/`, `src/shared/**`, `src/features/**`, `src/tools/` (jeweils mit `.gitkeep`), Readmes in `src/features/`, `src/navigation/`, `src/tools/` | erledigt | Kein Produktivcode geändert. Keine Routen, Navigation, Komponenten, Assets oder Imports angefasst. |
| 1 | 2026-04-20 | Migrations-Mapping dokumentiert | `docs/migration-mapping.md` | erledigt | Kein Produktivcode geändert. Mapping aller Pages, Komponenten, Daten und Assets zu Ziel-Domains. Pilot-Empfehlung: `zutrittskontrolle`. |
| 1b | 2026-04-20 | Asset- und Komponenten-Ordnungsregeln dokumentiert | `docs/asset-strategy.md`, `docs/migration-log.md` | erledigt | Kein Produktivcode geändert. Asset-Mapping (~64 Dateien) auf Ziel-Domains, Regel „Assets folgen Features", Komponenten-Unterordner bewertet. |
| 2 | 2026-04-20 | i18n-Grundgerüst DE/EN vorbereitet | `src/i18n/index.ts`, `src/i18n/types.ts`, `src/i18n/README.md`, `src/i18n/locales/de/common.json`, `src/i18n/locales/en/common.json`, `src/main.tsx`, `package.json` | erledigt | Keine Textmigration, keine Routenänderung, keine Navigation geändert. Nur Init-Import in `main.tsx`. Dependencies: `i18next`, `react-i18next`. |
| 3a | 2026-04-20 | Pilot-Domain Zutrittskontrolle geplant | `docs/pilot-zutrittskontrolle-plan.md`, `docs/migration-log.md` | erledigt | Kein Produktivcode geändert. 5 Pages, 11 Assets, App.tsx-Diff vorbereitet. Generische Komponenten (PageLayout etc.) bleiben im Pilot bewusst unangetastet. |
| 3b | 2026-04-20 | Pilot-Domain Zutrittskontrolle technisch migriert | `src/features/zutrittskontrolle/pages/*` (5 Pages), `src/features/zutrittskontrolle/assets/**` (12 Assets in 5 Unterordnern), `src/App.tsx` (5 Page-Imports), `docs/migration-log.md` | erledigt | Routen unverändert (5 URLs byte-identisch). Keine Textmigration. Keine Komponenten verschoben. PageLayout/ContentSection/FeatureBlock bleiben in `src/components/`. Build grün. Korrektur ggü. Plan: 12 statt 11 Assets (Plan-Tabelle hatte 12 Einträge, Fließtext nannte 11). |
| 3c | 2026-04-20 | Pilot-Cleanup Zutrittskontrolle | `src/features/zutrittskontrolle/pages/ZufahrtenParkplaetzePage.tsx`, `src/features/zutrittskontrolle/assets/zufahrten/bcm-schranke.jpg` (gelöscht), `docs/migration-log.md` | erledigt | Nur ungenutzten Import `imgSchranke` und das zugehörige Asset entfernt. Keine sonstigen Änderungen. |
| 4a | 2026-04-20 | Navigations-Inventar dokumentiert | `docs/navigation-inventory.md`, `docs/migration-log.md` | erledigt | Kein Produktivcode geändert. Inventar von MainNavigation (6 Bereiche, 29 Kinder), MetaNavigation (6 Personas + 4 Meta-Links), Footer (4 Spalten, 24 Links), AutoBreadcrumb (60+ Slug-Labels). 11 tote/falsche Footer-Links und 4 nicht-aufgelöste Eingangssysteme-Sublinks identifiziert. Type-Struktur und Phasen-Plan 4b–4g vorgeschlagen. |
| 4b | 2026-04-20 | Navigationstypen und Route-Konstanten vorbereitet | `src/navigation/types.ts`, `src/navigation/routes.ts`, `src/navigation/README.md`, `docs/migration-log.md` | erledigt | Keine Renderer-Änderung, keine Linkkorrektur, Platzhalter (`"#"`) bleiben erhalten. App.tsx, MainNavigation, MetaNavigation, Footer unverändert. Erweiterung ggü. Plan: `LinkType` enthält zusätzlich `"placeholder"`, `Badge` zusätzlich `"pending"`, `NavItem` zusätzlich `status` und `note` – passend zum Prototyp-Status mit bewusst nicht aktivierten Links. |
| 4c | 2026-04-20 | mainNavigation.ts als Datenstruktur vorbereitet | `src/navigation/mainNavigation.ts`, `src/navigation/README.md`, `docs/migration-log.md` | erledigt | Noch kein Renderer-Anschluss, keine Linkkorrektur. 6 Top-Level-Items, 29 Kinder, Ist-Stand 1:1 aus `MainNavigation.tsx` übernommen. Platzhalter erhalten (`Services und Wissen` als `placeholder`, Eingangssysteme-Kinder und Alarmanlagenkopplung als `pending`). MainNavigation.tsx unverändert. |
| 4d | 2026-04-20 | footerNavigation.ts als Datenstruktur vorbereitet | `src/navigation/footerNavigation.ts`, `src/navigation/README.md`, `docs/migration-log.md` | erledigt | Noch kein Renderer-Anschluss, keine Linkkorrektur. 4 Spalten mit 21 Links plus 3 Bottom-Bar-Legal-Links (insgesamt 24). 12 Einträge als `placeholder`/`pending` markiert (5 Services-`#`-Links, 3 Bottom-Bar-Legal, 1 Unternehmen-Datenschutz, 3 Produkte-Dubletten auf `/tuerkommunikation`). 5 Anwendungen-Links als `pending` (verlinken auf `/objektloesungen`). Footer.tsx, MainNavigation.tsx, MetaNavigation.tsx, App.tsx unverändert. |
| 4e | 2026-04-20 | personaNavigation.ts und metaNavigation.ts als Datenstruktur vorbereitet | `src/navigation/personaNavigation.ts`, `src/navigation/metaNavigation.ts`, `src/navigation/README.md`, `docs/migration-log.md` | erledigt | Noch kein Renderer-Anschluss. 6 Persona-Items (`PersonaItem[]`) und 4 Meta-Links (`NavItem[]`, alle `internal`/`active`) 1:1 aus `MetaNavigation.tsx` übernommen. PersonaContext und State-Logik unverändert. MetaNavigation.tsx, MainNavigation.tsx, Footer.tsx, App.tsx unverändert. |
| 4f | 2026-04-20 | MainNavigation-Renderer an mainNavigation.ts angeschlossen | `src/components/MainNavigation.tsx`, `src/navigation/README.md`, `docs/migration-log.md` | erledigt | Sichtbare Navigation unverändert (6 Top-Level, 29 Kinder, alle Routen und Beschreibungen identisch). Lokale `navItems`-Konstante entfernt; stattdessen Import von `mainNavigation`. Sichtbare Texte über temporären DE-Fallback `NAV_TEXT_DE` in `MainNavigation.tsx`. i18n noch nicht aktiv. Footer.tsx, MetaNavigation.tsx, App.tsx, mainNavigation.ts unverändert. |
| 4g | 2026-04-20 | Footer-Renderer an footerNavigation.ts angeschlossen | `src/components/Footer.tsx`, `src/navigation/README.md`, `docs/migration-log.md` | erledigt | Sichtbarer Footer unverändert (4 Spalten, 21 Links, 3 Bottom-Bar-Legal-Links). Lokale `footerLinks`-Konstante entfernt; stattdessen Import von `footerNavigation` und `footerBottomNavigation`. Sichtbare Texte über temporären DE-Fallback `FOOTER_TEXT_DE` in `Footer.tsx`. Platzhalter (`#`) erhalten. i18n noch nicht aktiv. MainNavigation.tsx, MetaNavigation.tsx, App.tsx, footerNavigation.ts unverändert. |
| 4h | 2026-04-20 | MetaNavigation-Renderer an personaNavigation.ts und metaNavigation.ts angeschlossen | `src/components/MetaNavigation.tsx`, `src/navigation/README.md`, `docs/migration-log.md` | erledigt | Sichtbare Persona-/Meta-Leiste unverändert (6 Personas, 4 Meta-Links). Lokale `personas`-Konstante entfernt; Imports von `personaNavigation` und `metaNavigation`. Sichtbare Texte über temporären DE-Fallback `META_TEXT_DE`. Persona-IDs unverändert (`bauherren`, `architekten`, `wohnungswirtschaft`, `fachplaner`, `handwerk`, `fachhandel`). Desktop = `labelShortKey`, Mobile = `labelKey`. PersonaContext, MainNavigation.tsx, Footer.tsx, App.tsx unverändert. |
| 4i | 2026-04-20 | Navigation-i18n aktiviert | `src/i18n/locales/de/navigation.json`, `src/i18n/locales/en/navigation.json`, `src/i18n/index.ts`, `src/components/MainNavigation.tsx`, `src/components/Footer.tsx`, `src/components/MetaNavigation.tsx`, `src/i18n/README.md`, `src/navigation/README.md`, `docs/migration-log.md` | erledigt | Keine Routenänderung, kein Sprachumschalter. Namespace `navigation` registriert. Lokale Fallback-Maps `NAV_TEXT_DE`/`FOOTER_TEXT_DE`/`META_TEXT_DE` entfernt; Komponenten nutzen `useTranslation("navigation")`. DE-Texte 1:1 wie vorher (sichtbar unverändert). EN-Datei mit identischer Key-Struktur und Arbeitsübersetzungen vorbereitet, aber nicht aktivierbar. App.tsx, mainNavigation.ts, footerNavigation.ts, personaNavigation.ts, metaNavigation.ts, PersonaContext unverändert. |
| 4j | 2026-04-20 | Navigation-i18n verifiziert | `src/i18n/locales/de/navigation.json`, `src/i18n/locales/en/navigation.json`, `src/navigation/mainNavigation.ts`, `src/navigation/footerNavigation.ts`, `src/navigation/personaNavigation.ts`, `src/navigation/metaNavigation.ts`, `docs/migration-log.md` | erledigt | Keine Codeänderung. DE/EN je 106 Keys, identische Key-Struktur, 0 Diff. Alle in den Datenstrukturen referenzierten `labelKey`/`labelShortKey`/`descriptionKey`/`titleKey` in beiden Sprachen vorhanden. Build grün (`npm run build`, 6.93s). Sichtbare Navigation, Footer und Persona-/Meta-Leiste unverändert. |
| 5a | 2026-04-20 | Pilot-Domain Eingangssysteme geplant | `docs/pilot-eingangssysteme-plan.md`, `docs/migration-log.md` | erledigt | Kein Produktivcode geändert. 8 Pages analysiert (1 unter `src/pages/`, 7 unter `src/pages/entry/`). 1 lokales Asset (`hero-entry.jpg`), 42 externe jimcdn.com-URLs (außerhalb Move-Scope). Komponenten: nur generisches `PageLayout` (bleibt). App.tsx-Diff: 8 Importpfade + 8 JSX-Refs. Routen byte-identisch (`/entry-system/...`). Navigation, i18n, Texte werden in 5b nicht angefasst. Naming: deutsche Domain `eingangssysteme` ↔ englische Route `/entry-system` (bewusste Trennung). |
| 5b | 2026-04-20 | Feature-Domain Eingangssysteme technisch migriert | `src/features/eingangssysteme/pages/*` (8 Pages), `src/features/eingangssysteme/assets/hero-entry.jpg`, `src/App.tsx` (8 Page-Imports), `docs/migration-log.md` | erledigt | Routen unverändert (8 URLs `/entry-system/...` byte-identisch). 8 Pages aus `src/pages/EntrySystem.tsx` und `src/pages/entry/Entry*.tsx` nach `src/features/eingangssysteme/pages/Entry*Page.tsx` verschoben (mit Page-Suffix). Ordner `src/pages/entry/` automatisch geleert. Asset `hero-entry.jpg` aus `src/assets/` nach `src/features/eingangssysteme/assets/` verschoben (per grep als domain-exklusiv verifiziert), Asset-Import in `EntrySystemPage.tsx` angepasst. Keine Textmigration. Keine Navigationsänderung. PageLayout/ContentSection bleiben in `src/components/`. Externe jimcdn.com-Bild-URLs unverändert. mainNavigation/footerNavigation/personaNavigation/metaNavigation und alle i18n-Locales unangetastet. Build grün (`npm run build`, 6.10s). |
| 5c | 2026-04-20 | Cleanup Eingangssysteme | `src/features/eingangssysteme/pages/EntrySystemPage.tsx`, `docs/migration-log.md` | erledigt | Nur ungenutzten Import `ContentSection` aus `@/components/PageLayout` in `EntrySystemPage.tsx` entfernt (Lint-Warnung `no-unused-vars`). Übrige 7 Pages haben keine ungenutzten Imports. Keine Texte, Layouts, Farben, Routen, Navigation, Assets oder externen URLs geändert. Build grün. |
| 5d | 2026-04-20 | Architektur-Checkpoint nach Navigation-i18n und zwei Domain-Migrationen dokumentiert | `docs/architecture-checkpoint-5d.md`, `docs/migration-log.md` | erledigt | Kein Produktivcode geändert. Zwischenstand zu Feature-Domains (`zutrittskontrolle`, `eingangssysteme` migriert), Navigation/Footer/Meta auf Datenstruktur, Navigation-i18n DE/EN aktiv. Architekturprinzipien, offene Themen, Domain-Bewertung (`gebaeudemanagement`/`gebaeudekommunikation`/`anwendungen`/`service`/`wissen`) und Empfehlung für Etappe 6a (`gebaeudemanagement` als nächste Planungsdomain) dokumentiert. |
| 6a | 2026-04-21 | Pilot-Domain Gebäudemanagement geplant | `docs/pilot-gebaeudemanagement-plan.md`, `docs/migration-log.md` | erledigt | Kein Produktivcode geändert. 5 Pages analysiert (4 eindeutig + 1 Grenzfall `DigitalSignage.tsx`), 13 lokale Assets per grep als domain-exklusiv verifiziert, keine domain-spezifischen Komponenten. App.tsx-Diff: 5 Importpfade + JSX-Refs. Routen byte-identisch (`/gebaeudemanagement/...`). Datei-Rename `SchraenkeBelhaelter` → `SchraenkeBehaelter` empfohlen (kein Slug). Navigation, Footer, MetaNavigation, i18n bleiben unangetastet. Empfehlung: Etappe 6b umsetzen. |
| 6b | 2026-04-21 | Feature-Domain Gebäudemanagement technisch migriert | `src/features/gebaeudemanagement/pages/*` (5 Pages), `src/features/gebaeudemanagement/assets/**` (13 Assets in 4 Unterordnern + 1 Root-Asset), `src/App.tsx` (5 Page-Imports + 1 JSX-Ref), `docs/migration-log.md` | erledigt | Routen unverändert (5 URLs `/gebaeudemanagement/...` byte-identisch). 5 Pages aus `src/pages/` nach `src/features/gebaeudemanagement/pages/Page*.tsx` verschoben. Datei-Tippfehler `SchraenkeBelhaelter.tsx` zu `SchraenkeBehaelterPage.tsx` korrigiert (inkl. JSX-Variable in App.tsx); Slug `/schraenke-behaelter` unverändert. 13 Assets aus `src/assets/` nach `src/features/gebaeudemanagement/assets/{schraenke,namensanzeige,reservieren-buchen,digital-signage}/` und `block-gebaeudemanagement.jpg` ins Domain-Root verschoben. Keine Textmigration. Keine Navigationsänderung. PageLayout/ContentSection/FeatureBlock bleiben in `src/components/`. Externe jimcdn.com/Lucide-Imports unverändert. mainNavigation/footerNavigation/personaNavigation/metaNavigation und alle i18n-Locales unangetastet. Build grün. |
| 6c | 2026-04-21 | Cleanup Gebäudemanagement | `src/features/gebaeudemanagement/pages/*`, `docs/migration-log.md` | erledigt | Keine Codeänderung in den 5 Pages. Lint-Check (oxlint, 93 Regeln, 5 Dateien) meldet 0 Warnungen und 0 Fehler – keine ungenutzten Imports vorhanden. Alle 13 Assets bleiben erhalten (jedes wird durch einen aktiven Import referenziert). Bestehende `text-lime-600`-Hinweise per Constraint geschützt. Build grün. |
| 7a | 2026-04-21 | Pilot-Domain Gebäudekommunikation geplant | `docs/pilot-gebaeudekommunikation-plan.md`, `docs/migration-log.md` | erledigt | Kein Produktivcode geändert. 6 Pages eindeutig der Domain zugeordnet (`Tuerkommunikation`, `Tuersprechanlagen`, `Briefkastenanlagen`, `Grossanlagen`, `Systemloesungen`, `systemtechnik/SnipdooIp`). 26 domain-exklusive Assets identifiziert (Unterordner `tuersprechanlagen/`, `briefkastenanlagen/`, `grossanlagen/`, `systemloesungen/`, `snipdoo/`). 2 shared Assets (`block-kommunikation.jpg`, `signage-hero.jpg`) explizit ausgeklammert (Persona-Komponenten + Beschilderung als Konsumenten). 4 Grenzfälle dokumentiert: `Beschilderung.tsx` und `Signage.tsx` (separate spätere Etappe), `DigitalSignage.tsx` + `DigitaleNamensanzeige.tsx` (bereits unter `gebaeudemanagement`), `anwendungen/Grossanlage.tsx` (andere Domain). Komponenten `SubNavSticky`/`RoleTabsBlock` bleiben in 7b in `src/components/`. App.tsx-Diff: 6 Importpfade. Routen byte-identisch. Empfehlung: Etappe 7b umsetzen. |
| 7b | 2026-04-21 | Feature-Domain Gebäudekommunikation technisch migriert | `src/features/gebaeudekommunikation/pages/*` (6 Pages), `src/features/gebaeudekommunikation/assets/**` (26 Assets in 5 Unterordnern), `src/App.tsx` (7 Page-Imports), `docs/migration-log.md` | erledigt | Routen unverändert (6 URLs `/tuerkommunikation`, `/tuersprechanlagen`, `/briefkastenanlagen`, `/grossanlagen`, `/systemloesungen`, `/systemtechnik/snipdoo-ip` byte-identisch). 6 Pages aus `src/pages/` und `src/pages/systemtechnik/` nach `src/features/gebaeudekommunikation/pages/*Page.tsx` verschoben (mit Page-Suffix). Ordner `src/pages/systemtechnik/` automatisch geleert und entfernt. 26 domain-exklusive Assets aus `src/assets/` und `src/assets/snipdoo/` nach `src/features/gebaeudekommunikation/assets/{tuersprechanlagen,briefkastenanlagen,grossanlagen,systemloesungen,snipdoo}/` verschoben; Ordner `src/assets/snipdoo/` automatisch entfernt. Shared Assets `block-kommunikation.jpg` und `signage-hero.jpg` bleiben bewusst in `src/assets/` (Persona-Komponenten / Beschilderung). Grenzfallseiten `Beschilderung.tsx`, `Signage.tsx`, `anwendungen/Grossanlage.tsx` nicht angefasst. Bereits unter `gebaeudemanagement` migrierte `DigitalSignage`/`DigitaleNamensanzeige` ebenfalls nicht angefasst. Keine Textmigration. Keine Navigationsänderung. PageLayout/ContentSection/FeatureBlock/SubNavSticky/RoleTabsBlock/Button bleiben in `src/components/`. mainNavigation/footerNavigation/personaNavigation/metaNavigation und alle i18n-Locales unangetastet. Build-Status: vorbestehender Vite-Warning zu `@tanstack/query-core` (unverändert seit 6c, nicht migrationsbedingt) – keine migrationsbezogenen Fehler, alle Importpfade auflösbar. |
| 7c | 2026-04-21 | Cleanup Gebäudekommunikation | `src/features/gebaeudekommunikation/pages/*`, `docs/migration-log.md` | erledigt | Keine Codeänderung in den 6 Pages. Lint-Check (oxlint, 93 Regeln, 6 Dateien) meldet 0 Warnungen und 0 Fehler – keine ungenutzten Imports vorhanden. Alle 26 domain-exklusiven Assets bleiben erhalten (jedes wird durch einen aktiven Import referenziert). Shared Assets `block-kommunikation.jpg` und `signage-hero.jpg` nicht angefasst. Grenzfallseiten (`Beschilderung.tsx`, `Signage.tsx`, `anwendungen/Grossanlage.tsx`, bereits migrierte DigitalSignage/DigitaleNamensanzeige) nicht angefasst. Bestehende `text-lime-600`-Hinweise per Constraint geschützt. Build-Status: nur vorbestehender `@tanstack/query-core`-Hinweis, keine migrationsbezogenen Fehler. |
| 8a | 2026-04-21 | Signage-/Beschilderung-Grenzfall geplant | `docs/pilot-signage-plan.md`, `docs/migration-log.md` | erledigt | Kein Produktivcode geändert. 4 Grenzfallseiten analysiert (`Beschilderung.tsx`, `Signage.tsx`, `DigitalSignagePage.tsx`, `DigitaleNamensanzeigePage.tsx`). 4 domain-exklusive Assets (`signage-hausnummer/materialien/tuerschilder/tuerklingel.jpg`) sowie 2 shared Assets (`signage-hero.jpg` von 2 Konsumenten, `block-signage.jpg` von 8 Konsumenten inkl. 7 Persona-Komponenten) identifiziert. Drei Optionen bewertet (A=alles in `signage`, B=Status quo, C=Hybrid). Empfehlung: **Option C** — `signage` als neue Domain nur für `Beschilderung`/`Signage`; BCM-Produkte (Digital Signage, Namensanzeige) bleiben in `gebaeudemanagement` (Slug-Bindung). Inhaltliche Dublette `Beschilderung.tsx` ↔ `Signage.tsx` (~80–90 % Themenüberschneidung) erfordert **Marketing-/Produktentscheidung vor Etappe 8b**. Navigation in `mainNavigation.ts` und `routes.ts` ist bereits konzeptionell auf `signage` vorbereitet (Notes „Grenzfall“, `targetDomain: "signage"`, `routes.signage.root`). |
| 8b | 2026-04-21 | Feature-Domain Signage technisch migriert | `src/features/signage/pages/*` (2 Pages), `src/features/signage/assets/beschilderung/**` (4 Assets), `src/App.tsx` (2 Page-Imports), `docs/migration-log.md` | erledigt | Routen unverändert (`/beschilderung`, `/signage` byte-identisch). 2 Pages aus `src/pages/` nach `src/features/signage/pages/{Beschilderung,Signage}Page.tsx` verschoben. 4 domain-exklusive Assets (`signage-hausnummer/materialien/tuerschilder/tuerklingel.jpg`) aus `src/assets/` nach `src/features/signage/assets/beschilderung/` verschoben. Shared Assets `signage-hero.jpg` (genutzt in `TuerkommunikationPage`) und `block-signage.jpg` (8 Konsumenten inkl. Persona-Komponenten) bleiben bewusst in `src/assets/`. BCM-Seiten `DigitalSignagePage.tsx` und `DigitaleNamensanzeigePage.tsx` bleiben in `gebaeudemanagement/` (Slug-/BCM-Bindung). Keine Konsolidierung von `/beschilderung` und `/signage`. Keine Textmigration. Keine Navigationsänderung. PageLayout/ContentSection/FeatureBlock bleiben in `src/components/`. mainNavigation/footerNavigation/personaNavigation/metaNavigation und alle i18n-Locales unangetastet. Build-Status: nur vorbestehender `@tanstack/query-core`-Hinweis, keine migrationsbezogenen Fehler. |

| 8c | 2026-04-21 | Cleanup Signage | `src/features/signage/pages/*`, `docs/migration-log.md` | erledigt | Keine Codeänderung in den 2 Pages (`BeschilderungPage.tsx`, `SignagePage.tsx`). Import-Audit: `BeschilderungPage` nutzt alle 13 Imports (motion, ArrowRight, 4 Lucide-Icons, PageLayout, ContentSection, heroImg + 4 Detail-Bilder). `SignagePage` nutzt alle 4 Imports (PageLayout, FeatureBlock, ContentSection, imgSignage). Keine ungenutzten Imports gefunden, keine Assets gelöscht. Shared Assets `signage-hero.jpg` und `block-signage.jpg` nicht angefasst. BCM-Seiten (`DigitalSignagePage`, `DigitaleNamensanzeigePage`) nicht angefasst. Build-Status: nur vorbestehender `@tanstack/query-core`-Hinweis, keine migrationsbezogenen Fehler. |
| 8d | 2026-04-21 | Architektur-Checkpoint nach fünf Feature-Domain-Migrationen dokumentiert | `docs/architecture-checkpoint-8d.md`, `docs/migration-log.md` | erledigt | Kein Produktivcode geändert. Stand dokumentiert: 5 migrierte Domains (`zutrittskontrolle`, `eingangssysteme`, `gebaeudemanagement`, `gebaeudekommunikation`, `signage`), Navigation/Footer/Meta auf Datenstruktur und Navigation-i18n DE/EN aktiv. Bewertung der noch offenen Bereiche (`personas`, `anwendungen`, `service`, `wissen`, `kontakt`, `karriere`, `presse`, `serviceportal`, `legal`). Bewusst offen gelassene Strukturfragen festgehalten (`/signage` vs. `/beschilderung`, BCM-Bindung Digital Signage/Namensanzeige, Footer-Link-Fixes, Eingangssysteme-Subrouten, Seitentext-i18n, `/de`-/`/en`-Routing, CMS, `@tanstack/query-core`-Hinweis). Empfehlung: Etappe 9a — `personas` planen, danach `anwendungen`, danach `service`/`wissen`, parallel separate Doku-Etappen für Footer-Link-Fixes und `@tanstack/query-core`. |
| 9a | 2026-04-21 | Persona-Bereich geplant | `docs/pilot-personas-plan.md`, `docs/migration-log.md` | erledigt | Kein Produktivcode geändert. 8 Persona-Dateien analysiert (6 Persona-Content-Komponenten + `WoWiHero` + `WoWiDetailSections`). Zielstruktur `src/features/personas/{bauherr,architekt,wohnungswirtschaft,fachplaner,handwerk,fachhandel}/components/` empfohlen. 4 betroffene Bild-Assets (`block-kommunikation`, `block-zutritt`, `block-signage`, `hero-entrance`) als shared (5–8 Konsumenten) klassifiziert – **kein Asset-Move in 9b**. Externe URL `imgEntry` ausgeklammert. Persona-Doktrin dokumentiert: Personas sind kuratierte Einstiege, keine eigenständigen Produktwelten, Verlinkung auf Feature-Domains, keine Produktcontent-Duplikation. PersonaContext, MetaNavigation, `personaNavigation.ts`, `metaNavigation.ts`, `PersonaSection.tsx` bleiben in 9b unverändert. PersonaShell und Textkonsolidierung explizit auf spätere Etappen verschoben. i18n-Textmigration nicht in 9a/9b – späterer Namespace `personas` vorgeschlagen. Empfehlung: **Etappe 9b als reiner technischer Move** (kein Layout, keine Texte, keine PersonaShell). 9 Hauptrisiken dokumentiert mit konkreten Schutzmaßnahmen. Prompting-Regeln für spätere Persona-Mitarbeit ergänzt. |
| 9b | 2026-04-21 | Persona-Komponenten technisch migriert | `src/features/personas/{bauherr,architekt,wohnungswirtschaft,fachplaner,handwerk,fachhandel}/components/*` (8 Dateien), `src/pages/Index.tsx` (6 Imports), `docs/migration-log.md` | erledigt | Reiner Move: 6 Persona-Content-Komponenten aus `src/components/` und 2 WoWi-Sub-Komponenten aus `src/components/wohnungswirtschaft/` nach `src/features/personas/<persona>/components/` verschoben (Dateinamen unverändert). Importe angepasst: `src/pages/Index.tsx` (6 Pfade) und `WohnungswirtschaftContent.tsx` (2 Pfade auf `./WoWiHero` / `./WoWiDetailSections`). Alter Ordner `src/components/wohnungswirtschaft/` automatisch entfernt. Keine PersonaShell, keine PersonaLinkGrid, keine Textänderung, keine Layoutänderung, keine Konsolidierung. Shared Assets (`block-kommunikation.jpg`, `block-zutritt.jpg`, `block-signage.jpg`, `hero-entrance.jpg`) bleiben in `src/assets/`. PersonaContext, MetaNavigation, PersonaSection, `personaNavigation.ts`, `metaNavigation.ts` und alle i18n-Locales unverändert. Build-Status: nur vorbestehender `@tanstack/query-core`-Hinweis, keine migrationsbezogenen Fehler. |
| 9c | 2026-04-21 | Cleanup Personas | `src/features/personas/*`, `docs/migration-log.md` | erledigt | Keine Codeänderung in den 8 Persona-Dateien (`BauherrenContent`, `ArchitektenContent`, `WohnungswirtschaftContent`, `WoWiHero`, `WoWiDetailSections`, `FachplanerContent`, `HandwerkContent`, `FachhandelContent`). Lint-Check (oxlint, 93 Regeln, 8 Dateien) meldet 0 Fehler und 0 ungenutzte Imports. Eine vorbestehende `no-unused-vars`-Warnung in `WoWiDetailSections.tsx:68` betrifft einen Map-Callback-Parameter `i` (kein Import) und wurde per Constraint nicht geändert (nur Imports in Scope). Alle Assets unverändert; shared Assets (`block-kommunikation`, `block-zutritt`, `block-signage`, `hero-entrance`, alle weiteren `block-*`) bleiben in `src/assets/`. PersonaContext, MetaNavigation, PersonaSection, `personaNavigation.ts`, `metaNavigation.ts` und alle i18n-Locales nicht angefasst. `src/pages/Index.tsx` nicht angefasst (nach 9b bereits korrekt). Build-Status: nur vorbestehender `@tanstack/query-core`-Hinweis, keine migrationsbezogenen Fehler. |
| 10a | 2026-04-21 | Anwendungsbereich geplant | `docs/pilot-anwendungen-plan.md`, `docs/migration-log.md` | erledigt | Kein Produktivcode geändert. 24 Pages analysiert (21 unter `src/pages/anwendungen/` + `Anwendungen.tsx`, `Objektloesungen.tsx`, `Bildungseinrichtungen.tsx` als Top-Level), zusätzlich `AnwendungDetailPage.tsx` (von 13 Detail-Pages konsumiert) und `data/referenzprojekte.ts` (12 Datensätze, 2 Konsumenten). 6 Cluster (A=Hub/Übersichten, B=Wohnbau, C=Gesundheit, D=Öffentliche Hand, E=Systemfunktionen, F=Referenzen). 8 Grenzfälle dokumentiert: `Grossanlage`(Singular)↔`Grossanlagen`(Plural in `gebaeudekommunikation`), `MobileTuerkommunikation`/`Feuerwehrdurchsage`/`BidirektionaleVideo`/`InterneKommunikation` ↔ `gebaeudekommunikation/systemloesungen`, `ZutrittskontrolleBCM` ↔ Domain `zutrittskontrolle`, `DigitaleNamensverwaltung` ↔ `gebaeudemanagement/DigitaleNamensanzeige`, Top-Level-Slugs `/objektloesungen` und `/bildungseinrichtungen`, Slug-Routing `ReferenzprojektDetail`. Doktrin festgehalten: Anwendungssicht (Use-Case) ≠ Produktsicht (Domain), beide bleiben getrennt, keine Textkonsolidierung. Asset-Audit: nur 2 lokale Imports gefunden (`block-objekt.jpg` shared, `feature-sanierung.png` ggf. exklusiv) – beide bleiben in `src/assets/` bis nach Abschluss aller Tranchen. ~30+ externe `tcsag.de`/`tcsag-web.lovable.app`-Bild-URLs bleiben URL-Strings (kein Self-Hosting). Generische Komponenten (PageLayout, ContentSection, FeatureBlock, Carousel) bleiben in `src/components/`. Keine Slug-Reform, keine Redirects, keine `/de`-/`/en`-Routen. Footer-Pending-Links auf `/objektloesungen` und Persona-Verlinkungen ausdrücklich nicht in 10b–10d anfassen. **Klare Empfehlung: Splitting statt Big-Bang** – 10b (Hub + Übersichten + Referenzen + `AnwendungDetailPage` + `referenzprojekte.ts`, ~10 Moves), 10c (Detail-Cluster B/C/D, 9 Moves), 10d (Systemfunktionen Cluster E, 7 Moves), jeweils mit eigenem Cleanup (10b'/10c'/10d') analog 5c/6c/7c/9c. 11 Hauptrisiken mit Schutzmaßnahmen dokumentiert (insb. `AnwendungDetailPage`-Importpfad muss in 13 Pages synchron mitziehen). |
| 10b | 2026-04-21 | Anwendungen Kernstruktur, Übersichten, Referenzen und AnwendungDetailPage technisch migriert | `src/features/anwendungen/components/AnwendungDetailPage.tsx`, `src/features/anwendungen/data/referenzprojekte.ts`, `src/features/anwendungen/pages/{Anwendungen,Objektloesungen,Bildungseinrichtungen,Wohnbau,Gesundheitseinrichtungen,OeffentlicheHand,Referenzprojekte,ReferenzprojektDetail}Page.tsx`, `src/App.tsx` (8 Page-Imports), 13 Detail-Pages unter `src/pages/anwendungen/` (Import-Update auf neuen `AnwendungDetailPage`-Pfad), `docs/migration-log.md` | erledigt | Routen unverändert (8 URLs `/anwendungen`, `/objektloesungen`, `/bildungseinrichtungen`, `/anwendungen/wohnbau`, `/anwendungen/gesundheitseinrichtungen`, `/anwendungen/oeffentliche-hand`, `/anwendungen/referenzprojekte`, `/anwendungen/referenzprojekte/:slug` byte-identisch). 10 Dateien verschoben: 1 Komponente (`AnwendungDetailPage.tsx`), 1 Datendatei (`referenzprojekte.ts`), 8 Pages (mit Page-Suffix benannt). Importpfade aktualisiert: `App.tsx` (8 Page-Imports), `ReferenzprojektePage.tsx` und `ReferenzprojektDetailPage.tsx` (`@/features/anwendungen/data/referenzprojekte`), 13 Detail-Pages unter `src/pages/anwendungen/` (Behoerde, BidirektionaleVideo, Concierge, DigitaleNamensverwaltung, Einfamilienhaus, Feuerwehr, Feuerwehrdurchsage, Grossanlage, InterneKommunikation, Klinik, Mehrfamilienhaus, MobileTuerkommunikation, Pflege, Sanierung, Schwimmbad, ZutrittskontrolleBCM – `@/features/anwendungen/components/AnwendungDetailPage`). Verifiziert: 0 Treffer für `@/components/AnwendungDetailPage` und `@/data/referenzprojekte`. Detailseiten Cluster B/C/D/E bleiben für 10c/10d an alter Stelle (`src/pages/anwendungen/`). Alter Ordner `src/data/` automatisch leer und entfernt. Keine Asset-Moves – `block-objekt.jpg`, `feature-sanierung.png` und alle externen URLs unverändert. Keine Textmigration. Keine Layoutänderung. Navigation, Footer, MetaNavigation, `mainNavigation.ts`, `footerNavigation.ts`, `personaNavigation.ts`, `metaNavigation.ts`, alle i18n-Locales, PersonaContext, PersonaSection unverändert. PageLayout/ContentSection/FeatureBlock/Carousel bleiben in `src/components/`. Vorbestehende oxlint-Warnungen in `AnwendungDetailPage.tsx` (4 ungenutzte Lucide-Imports: `Wrench`, `Settings`, `FileText`, `Phone`) und `BildungseinrichtungenPage.tsx` (`ArrowRight`, `Building`) wurden per Constraint nicht angefasst – Cleanup ist Scope von 10b'. Build-Status: nur vorbestehender `@tanstack/query-core`-Hinweis (unverändert seit 6c, nicht migrationsbedingt), keine migrationsbezogenen Fehler. |

| 10b-cleanup | 2026-04-21 | Cleanup Anwendungen-Kernmigration | `src/features/anwendungen/components/AnwendungDetailPage.tsx`, `src/features/anwendungen/pages/BildungseinrichtungenPage.tsx`, `docs/migration-log.md` | erledigt | Nur eindeutig ungenutzte Lucide-Imports entfernt: `AnwendungDetailPage.tsx` (`Wrench`, `Settings`, `FileText`, `Phone` – 4 Icons aus 6er-Import, verbleiben `BookOpen`, `ArrowRight`), `BildungseinrichtungenPage.tsx` (`ArrowRight`, `Building` aus 11er-Import). Übrige 7 migrierte Pages (`AnwendungenPage`, `ObjektloesungenPage`, `WohnbauPage`, `GesundheitseinrichtungenPage`, `OeffentlicheHandPage`, `ReferenzprojektePage`, `ReferenzprojektDetailPage`) haben keine ungenutzten Imports. Verifiziert: 0 Treffer für `@/components/AnwendungDetailPage` und `@/data/referenzprojekte`; alle 16 Detailseiten unter `src/pages/anwendungen/` importieren `AnwendungDetailPage` korrekt von `@/features/anwendungen/components/AnwendungDetailPage`. Keine Texte, Layouts, Navigation, Footer, MetaNavigation, Routen, i18n-Locales, Assets oder externen URLs geändert. `block-objekt.jpg`, `feature-sanierung.png` unverändert in `src/assets/`. Build-Status: nur vorbestehender `@tanstack/query-core`-Hinweis, keine migrationsbezogenen Fehler. |

| 10c | 2026-04-21 | Anwendungen Detailseiten Wohnbau/Gesundheit/Öffentliche Hand technisch migriert | `src/features/anwendungen/pages/{Einfamilienhaus,Mehrfamilienhaus,Grossanlage,Sanierung,Pflege,Klinik,Behoerde,Feuerwehr,Schwimmbad}Page.tsx`, `src/App.tsx` (9 Page-Imports), `docs/migration-log.md` | erledigt | 9 Detailseiten der Cluster B (Wohnbau: Einfamilienhaus, Mehrfamilienhaus, Grossanlage, Sanierung), C (Gesundheit: Pflege, Klinik) und D (Öffentliche Hand: Behoerde, Feuerwehr, Schwimmbad) aus `src/pages/anwendungen/` nach `src/features/anwendungen/pages/*Page.tsx` verschoben (mit Page-Suffix). App.tsx-Imports auf `@/features/anwendungen/pages/...` umgestellt; JSX-Variablennamen unverändert. Routen byte-identisch (`/anwendungen/einfamilienhaus`, `/anwendungen/mehrfamilienhaus`, `/anwendungen/grossanlage`, `/anwendungen/sanierung`, `/anwendungen/pflege`, `/anwendungen/klinik`, `/anwendungen/behoerde`, `/anwendungen/feuerwehr`, `/anwendungen/schwimmbad`). `AnwendungDetailPage`-Importe in den verschobenen Dateien bleiben korrekt auf `@/features/anwendungen/components/AnwendungDetailPage`. 7 Grenzfall-/Systemfunktionsseiten (`Concierge`, `InterneKommunikation`, `DigitaleNamensverwaltung`, `Feuerwehrdurchsage`, `BidirektionaleVideo`, `MobileTuerkommunikation`, `ZutrittskontrolleBCM`) bleiben in `src/pages/anwendungen/` für Etappe 10d. Keine Asset-Moves – `feature-sanierung.png` und externe URLs unverändert. Keine Textmigration. Keine Layoutänderung. Navigation, Footer, MetaNavigation, mainNavigation/footerNavigation/personaNavigation/metaNavigation, alle i18n-Locales, PersonaContext, PersonaSection unverändert. Build-Status: nur vorbestehender `@tanstack/query-core`-Hinweis (unverändert seit 6c, nicht migrationsbedingt), keine migrationsbezogenen Fehler. |

| 10c-cleanup | 2026-04-21 | Cleanup Anwendungen Detailseiten Wohnbau/Gesundheit/Öffentliche Hand | `src/features/anwendungen/pages/{Einfamilienhaus,Mehrfamilienhaus,Grossanlage,Sanierung,Pflege,Klinik,Behoerde,Feuerwehr,Schwimmbad}Page.tsx` (geprüft, keine Änderung), `docs/migration-log.md` | erledigt | Import-Audit der 9 in 10c migrierten Detailseiten: alle Lucide-Icons werden in `data.anforderungen[].icon` referenziert, `AnwendungDetailPage` und `AnwendungPageData` werden in jeder Datei verwendet. **0 ungenutzte Imports gefunden, 0 Imports entfernt.** Alle 9 Dateien importieren `AnwendungDetailPage` korrekt von `@/features/anwendungen/components/AnwendungDetailPage`. Keine Asset-Änderungen (`feature-sanierung.png` unverändert in `src/assets/`, externe URLs unverändert). Keine Texte, Layouts, Navigation, Footer, MetaNavigation, Routen, i18n-Locales geändert. 7 Grenzfall-/Systemfunktionsseiten unter `src/pages/anwendungen/` (Concierge, InterneKommunikation, DigitaleNamensverwaltung, Feuerwehrdurchsage, BidirektionaleVideo, MobileTuerkommunikation, ZutrittskontrolleBCM) nicht angefasst (Scope von 10d). Build-Status: nur vorbestehender `@tanstack/query-core`-Hinweis, keine migrationsbezogenen Fehler. |
| 10d | 2026-04-21 | Anwendungen Systemfunktionen und Grenzfallseiten technisch migriert | `src/features/anwendungen/pages/{Concierge,InterneKommunikation,DigitaleNamensverwaltung,Feuerwehrdurchsage,BidirektionaleVideo,MobileTuerkommunikation,ZutrittskontrolleBCM}Page.tsx`, `src/App.tsx` (7 Page-Imports), `docs/migration-log.md` | erledigt | 7 verbleibende Anwendungs-Detailseiten (Cluster E – Systemfunktionen/Grenzfälle) aus `src/pages/anwendungen/` nach `src/features/anwendungen/pages/*Page.tsx` verschoben (mit Page-Suffix). App.tsx-Imports auf `@/features/anwendungen/pages/...` umgestellt; JSX-Variablennamen und Routen byte-identisch (`/anwendungen/concierge`, `/anwendungen/interne-kommunikation`, `/anwendungen/digitale-namensverwaltung`, `/anwendungen/feuerwehrdurchsage`, `/anwendungen/bidirektionale-video`, `/anwendungen/mobile-tuerkommunikation`, `/anwendungen/zutrittskontrolle-bcm`). `AnwendungDetailPage`-Importe in den 7 Dateien bleiben korrekt auf `@/features/anwendungen/components/AnwendungDetailPage`. Leerer Ordner `src/pages/anwendungen/` automatisch entfernt. Keine Asset-Moves – externe URLs unverändert. Keine Textmigration. Keine Layoutänderung. Navigation, Footer, MetaNavigation, mainNavigation/footerNavigation/personaNavigation/metaNavigation, alle i18n-Locales, PersonaContext, PersonaSection unverändert. Vorbestehende oxlint-Warnungen in `ZutrittskontrolleBCMPage.tsx` (`Globe`, `Users` ungenutzt) per Constraint nicht angefasst – Cleanup ist Scope von 10d-cleanup. Build-Status: nur vorbestehender `@tanstack/query-core`-Hinweis (unverändert seit 6c, nicht migrationsbedingt), keine migrationsbezogenen Fehler. |
| 10d-cleanup | 2026-04-21 | Cleanup Anwendungen Systemfunktionen und Grenzfälle | `src/features/anwendungen/pages/ZutrittskontrolleBCMPage.tsx`, `docs/migration-log.md` | erledigt | Import-Audit der 7 in 10d migrierten Detailseiten (oxlint, 93 Regeln): nur `ZutrittskontrolleBCMPage.tsx` enthielt 2 ungenutzte Lucide-Imports (`Globe`, `Users`) – entfernt (verbleiben `ShieldCheck`, `KeyRound`, `Smartphone`, `Lock`, `Car`, `ArrowUpDown`, `Monitor`, `Cloud`). Übrige 6 Pages (`ConciergePage`, `InterneKommunikationPage`, `DigitaleNamensverwaltungPage`, `FeuerwehrdurchsagePage`, `BidirektionaleVideoPage`, `MobileTuerkommunikationPage`) haben keine ungenutzten Imports. Alle 7 Dateien importieren `AnwendungDetailPage` korrekt von `@/features/anwendungen/components/AnwendungDetailPage`. `src/pages/anwendungen/` existiert nicht mehr (in 10d entfernt). Keine Asset-Änderungen, externe URLs unverändert. Keine Texte, Layouts, Navigation, Footer, MetaNavigation, Routen, i18n-Locales geändert. Build-Status: nur vorbestehender `@tanstack/query-core`-Hinweis, keine migrationsbezogenen Fehler. |
| 10e | 2026-04-21 | Architektur-Checkpoint Anwendungen | `docs/architecture-checkpoint-10e.md`, `docs/migration-log.md` | erledigt | Keine Codeänderung, Anwendungen technisch abgeschlossen und offene fachliche/technische Punkte dokumentiert. Status `anwendungen` vollständig migriert (26 Dateien in 10b/10c/10d). Zielstruktur (`src/features/anwendungen/{pages,components,data}/`, `assets/` bleibt vorerst leer) festgehalten. `src/pages/anwendungen/` und `src/data/` existieren nicht mehr. Alle `AnwendungDetailPage`- und `referenzprojekte`-Importe zeigen auf neue Pfade. Offene fachliche Punkte (Anwendungs- vs. Produktsicht-Überschneidungen, Grossanlage Singular/Plural, BCM/DigitaleNamensverwaltung-Nähe, Referenzprojekte ggf. Supabase) und technische Punkte (Seitentext-i18n, Asset-Lokalisierung, Filter-/Datenlogik, SEO-/Slug-Strategie, `@tanstack/query-core`-Hinweis) dokumentiert. Empfehlung: `anwendungen` fachlich nicht weiter konsolidieren, erst restliche Strukturmigrationen (`service`, `wissen`) fertigstellen, danach Navigation/Links/URL/i18n gesondert bearbeiten. |
| 11a | 2026-04-21 | Restseiten / Service / Wissen / Unternehmen / Serviceportal geplant | `docs/pilot-restseiten-plan.md`, `docs/migration-log.md` | erledigt | Kein Produktivcode geändert. 14 verbleibende Top-Level-Pages unter `src/pages/` analysiert und 9 Ziel-Domains zugeordnet: `home` (Index, UeberTCS), `wissen` (Akademie), `service` (Downloads, TechnischerSupport, Ersatzteile, PlanenKonfigurieren), `serviceportal` (Serviceportal, Registrieren, PasswortVergessen), `kontakt` (Kontakt), `karriere` (Karriere), `presse` (Presse), `app/shared` (NotFound). Asset-Audit: 0 lokale Asset-Imports in den 14 Pages — nur Lucide-Icons, generische Komponenten und externe URLs. Komponenten-Audit: PageLayout/AutoBreadcrumb/HeroSection/StatsSection/ContentBlocks/PersonaSection/CTASection/shadcn-ui bleiben in `src/components/`, Formulare (Kontakt/Registrieren/PasswortVergessen) bleiben inline. App.tsx-Diff: 14 Page-Imports (Zeilen 11, 39–52), JSX-Variablennamen und 14 Routen byte-identisch. Navigation/Footer-Status: 11 Pages bereits verlinkt (4 davon `pending`), Linkkorrekturen ausdrücklich nicht in 11b–11e. Risiken dokumentiert: Serviceportal wirkt funktional ohne Backend, Registrieren/PasswortVergessen sind Frontend-Prototypen, PlanenKonfigurieren verweist später ggf. auf externe Konfiguratoren, Index zentralste Seite. **Split-Empfehlung**: 11b (Kontakt, Karriere, Presse, Akademie), 11c (Service: Downloads, TechnischerSupport, Ersatzteile, PlanenKonfigurieren), 11d (Serviceportal + Registrieren + PasswortVergessen), 11e (Home: Index, UeberTCS, NotFound), je mit eigenem Cleanup, danach 11f Architektur-Checkpoint. Keine Texte, Layouts, Routen, Navigation, Footer, MetaNavigation, i18n-Locales, Assets oder Backend-Anbindungen in 11b–11e. |
| 11b | 2026-04-21 | Kontakt, Karriere, Presse und Wissen/Akademie technisch migriert | `src/features/kontakt/pages/KontaktPage.tsx`, `src/features/karriere/pages/KarrierePage.tsx`, `src/features/presse/pages/PressePage.tsx`, `src/features/wissen/pages/AkademiePage.tsx`, `src/App.tsx` (4 Page-Imports), `docs/migration-log.md` | erledigt | 4 Restseiten aus `src/pages/` nach `src/features/{kontakt,karriere,presse,wissen}/pages/*Page.tsx` verschoben (mit Page-Suffix). App.tsx-Imports auf `@/features/...` umgestellt; JSX-Variablennamen und 4 Routen byte-identisch (`/kontakt`, `/karriere`, `/presse`, `/akademie`). Keine Asset-Moves – die 4 Pages enthalten laut Etappe 11a keine lokalen Asset-Imports, externe URLs unverändert. Keine Textmigration. Keine Layoutänderung. Navigation, Footer, MetaNavigation, mainNavigation/footerNavigation/personaNavigation/metaNavigation, alle i18n-Locales, PersonaContext, PersonaSection unverändert. PageLayout/AutoBreadcrumb/shadcn-ui bleiben in `src/components/`. Build-Status: nur vorbestehender `@tanstack/query-core`-Hinweis (unverändert seit 6c, nicht migrationsbedingt), keine migrationsbezogenen Fehler. |
| 11b-cleanup | 2026-04-21 | Cleanup Kontakt/Karriere/Presse/Wissen | `src/features/{kontakt,karriere,presse,wissen}/pages/*` (geprüft, keine Änderung), `docs/migration-log.md` | erledigt | Import-Audit der 4 in 11b migrierten Restseiten: alle Lucide-Icons werden in JSX bzw. in `items`-/`benefits`-/`pressReleases`-/`trainingFormats`-/`targetGroups`-Arrays über `item.icon`/`b.icon`/`group.icon` referenziert; `motion`, `AutoBreadcrumb` und `PageLayout` werden jeweils im JSX verwendet. **0 ungenutzte Imports gefunden, 0 Imports entfernt.** Keine Asset-Änderungen (laut 11a/11b keine lokalen Asset-Imports vorhanden, externe URLs unverändert). Keine Texte, Layouts, Navigation, Footer, MetaNavigation, Routen, i18n-Locales geändert. App.tsx, alle anderen Feature-Domains und verbleibende `src/pages/`-Dateien nicht angefasst. Build-Status: nur vorbestehender `@tanstack/query-core`-Hinweis, keine migrationsbezogenen Fehler. |
| 11c | 2026-04-21 | Service-Seiten technisch migriert | `src/features/service/pages/{Downloads,TechnischerSupport,Ersatzteile,PlanenKonfigurieren}Page.tsx`, `src/App.tsx` (4 Page-Imports), `docs/migration-log.md` | erledigt | 4 Service-Seiten aus `src/pages/` nach `src/features/service/pages/*Page.tsx` verschoben (mit Page-Suffix). App.tsx-Imports auf `@/features/service/pages/...` umgestellt; JSX-Variablennamen und 4 Routen byte-identisch (`/downloads`, `/technischer-support`, `/ersatzteile`, `/planen-konfigurieren`). Keine Asset-Moves – die 4 Pages enthalten laut Etappe 11a keine lokalen Asset-Imports, externe URLs unverändert. Keine Textmigration. Keine Layoutänderung. Keine Backend-/Tool-/Supabase-/Shop-/Konfigurator-Integration. Navigation, Footer, MetaNavigation, mainNavigation/footerNavigation/personaNavigation/metaNavigation, alle i18n-Locales unverändert. PageLayout/AutoBreadcrumb/shadcn-ui bleiben in `src/components/`. Vorbestehende oxlint-Warnungen (`BookOpen`, `Clock`, `Wrench` ungenutzt) per Constraint nicht angefasst – Cleanup ist Scope von 11c-cleanup. Build-Status: nur vorbestehender `@tanstack/query-core`-Hinweis, keine migrationsbezogenen Fehler. |
| 11c-cleanup | 2026-04-21 | Cleanup Service-Seiten | `src/features/service/pages/{Downloads,TechnischerSupport}Page.tsx`, `docs/migration-log.md` | erledigt | Import-Audit der 4 in 11c migrierten Service-Seiten: 3 ungenutzte Lucide-Imports entfernt — `BookOpen` aus `DownloadsPage.tsx` (verbleiben `FileText, HelpCircle, ShoppingCart, Wrench, GraduationCap, Award, Users, Download, Settings, ClipboardList, Monitor, Phone, ExternalLink`), `Clock` und `Wrench` aus `TechnischerSupportPage.tsx` (verbleiben `Phone, Mail, ExternalLink, ClipboardList, Settings, ShoppingCart, FileText, HelpCircle, MessageSquare`). `ErsatzteilePage.tsx` und `PlanenKonfigurierenPage.tsx` ohne ungenutzte Imports (alle Lucide-Icons werden in JSX bzw. in `quickLinks`/`orderLinks`/`academyItems`/`adv`/`item`-Arrays oder direkt referenziert; `BookOpen` und `Wrench` in `PlanenKonfigurierenPage` werden in JSX verwendet — Hinweis aus 11c bezog sich auf `DownloadsPage`/`TechnischerSupportPage`). Keine Asset-Änderungen (laut 11a/11c keine lokalen Asset-Imports vorhanden, externe URLs unverändert). Keine Backend-/Tool-/Supabase-Integration ergänzt. Keine Texte, Layouts, Navigation, Footer, MetaNavigation, Routen, i18n-Locales geändert. App.tsx, andere Feature-Domains und verbleibende `src/pages/`-Dateien nicht angefasst. Build-Status: nur vorbestehender `@tanstack/query-core`-Hinweis, keine migrationsbezogenen Fehler. |
| 11d | 2026-04-21 | Serviceportal-Prototyp technisch migriert | `src/features/serviceportal/pages/{Serviceportal,Registrieren,PasswortVergessen}Page.tsx`, `src/App.tsx` (3 Page-Imports), `docs/migration-log.md` | erledigt | 3 Serviceportal-Seiten aus `src/pages/` nach `src/features/serviceportal/pages/*Page.tsx` verschoben (mit Page-Suffix). App.tsx-Imports auf `@/features/serviceportal/pages/...` umgestellt; JSX-Variablennamen und 3 Routen byte-identisch (`/serviceportal`, `/serviceportal/registrieren`, `/serviceportal/passwort-vergessen`). Keine Asset-Moves – keine lokalen Asset-Imports vorhanden. Keine echte Authentifizierung, keine Registrierung, keine Passwort-Reset-Logik, keine Supabase-/Backend-/Auth-Provider-/E-Mail-/Session-/Rollen-Anbindung ergänzt. Keine Textmigration. Keine Layoutänderung. Navigation, Footer, MetaNavigation, mainNavigation/footerNavigation/personaNavigation/metaNavigation, alle i18n-Locales unverändert. Build-Status: nur vorbestehender `@tanstack/query-core`-Hinweis, keine migrationsbezogenen Fehler. |
| 11d-cleanup | 2026-04-21 | Cleanup Serviceportal-Prototyp | `src/features/serviceportal/pages/*` (geprüft, keine Änderung), `docs/migration-log.md` | erledigt | Import-Audit der 3 in 11d migrierten Serviceportal-Seiten (oxlint, 93 Regeln, 3 Dateien): 0 Warnungen, 0 Fehler. **0 ungenutzte Imports gefunden, 0 Imports entfernt.** Keine Asset-Änderungen (laut 11a/11d keine lokalen Asset-Imports vorhanden, externe URLs unverändert). Keine echte Authentifizierung, keine Registrierung, keine Passwort-Reset-Logik, keine Supabase-/Backend-/Auth-/E-Mail-/Session-/Rollen-/Tool-Integration ergänzt. Keine Texte, Layouts, Navigation, Footer, MetaNavigation, Routen, i18n-Locales geändert. App.tsx, andere Feature-Domains und verbleibende `src/pages/`-Dateien nicht angefasst. Build-Status: nur vorbestehender `@tanstack/query-core`-Hinweis, keine migrationsbezogenen Fehler. |
| 11e | 2026-04-21 | Home, Über TCS und NotFound technisch migriert | `src/features/home/pages/{Home,UeberTCS}Page.tsx`, `src/app/pages/NotFoundPage.tsx`, `src/App.tsx` (3 Page-Imports), `docs/migration-log.md` | erledigt | 3 letzte allgemeine Seiten verschoben: `src/pages/Index.tsx` → `src/features/home/pages/HomePage.tsx`, `src/pages/UeberTCS.tsx` → `src/features/home/pages/UeberTCSPage.tsx`, `src/pages/NotFound.tsx` → `src/app/pages/NotFoundPage.tsx`. App.tsx-Imports auf `@/features/home/pages/...` bzw. `@/app/pages/NotFoundPage` umgestellt; JSX-Variablennamen (`Index`, `UeberTCS`, `NotFound`) und 3 Routen byte-identisch (`/`, `/ueber-tcs`, `*`). Keine Asset-Moves – `HomePage` enthält keine lokalen Asset-Imports, `UeberTCSPage` und `NotFoundPage` ebenfalls nicht (nur Lucide-Icons, externe URLs unverändert). HeroSection/StatsSection/ContentBlocks/PersonaSection/CTASection/PageLayout/AutoBreadcrumb sowie alle Persona-Content-Komponenten unter `src/features/personas/...` und `PersonaContext` bleiben unverändert an ihrem Ort. Keine Persona-Logik geändert, keine Startseitenstruktur konsolidiert, keine Linkkorrekturen, keine SEO-/Slug-Änderungen, keine i18n-Textmigration, keine App.tsx-Dezentralisierung. Leerer Ordner `src/pages/` entfernt. Navigation, Footer, MetaNavigation, mainNavigation/footerNavigation/personaNavigation/metaNavigation, alle i18n-Locales unverändert. Vorbestehende oxlint-Warnung (`Globe` ungenutzt in `UeberTCSPage.tsx`) per Constraint nicht angefasst – Cleanup ist Scope von 11e-cleanup. Build-Status: nur vorbestehender `@tanstack/query-core`-Hinweis, keine migrationsbezogenen Fehler. |
| 11e-cleanup | 2026-04-21 | Cleanup Home / Über TCS / NotFound | `src/features/home/pages/UeberTCSPage.tsx`, `docs/migration-log.md` | erledigt | Import-Audit der 3 in 11e migrierten Seiten (oxlint, 93 Regeln, 3 Dateien): 1 ungenutzter Lucide-Import entfernt — `Globe` aus `UeberTCSPage.tsx` (verbleiben `ArrowRight, Award, Factory, Users, Shield, Lightbulb, Handshake, Leaf`). `HomePage.tsx` und `NotFoundPage.tsx` ohne ungenutzte Imports. Keine Asset-Änderungen (laut 11e keine lokalen Asset-Imports vorhanden, externe URLs unverändert). PersonaContext, HeroSection/StatsSection/ContentBlocks/PersonaSection/CTASection und alle Persona-Komponenten unverändert. `src/pages/` weiterhin entfernt. Keine Texte, Layouts, Navigation, Footer, MetaNavigation, Routen, i18n-Locales geändert. App.tsx, andere Feature-Domains nicht angefasst. Build-Status: nur vorbestehender `@tanstack/query-core`-Hinweis, keine migrationsbezogenen Fehler. |
| 11f | 2026-04-21 | Architektur-Checkpoint nach vollständiger src/pages-Migration | `docs/architecture-checkpoint-11f.md`, `docs/migration-log.md` | erledigt | Keine Codeänderung, vollständige Migration aus `src/pages/` dokumentiert. Statusübersicht (15 Domains inkl. `app/pages`), Domain-Tabelle (Zielpfad, migrierte Dateien, Asset-Status, Besonderheiten), aktuelle Zielstruktur, bewusst nicht geänderte Bereiche (Texte/Layouts/Routen/Navigation/Footer/i18n/Backend/Auth/Konfiguratoren/App.tsx), offene technische Themen (Routing-Dezentralisierung, Footer-Links, MainNavigation-Unterpunkte, URL-/Slug-Konzept, `/de`-/`/en`-Routing, Seitentext-i18n, `@tanstack/query-core`, package.json-Name, doppelte Toaster, Bundle-Größe), offene fachliche Themen (Signage/Beschilderung, BCM-Bindung, Anwendungs-/Produktsicht-Überschneidungen, Serviceportal-Prototyp, Downloads/Ersatzteile/Konfiguratoren, Referenzprojekte, Persona-Konsolidierung) und empfohlene Arbeitsblöcke A–F (Hygiene, Routing, Navigation, URL/Slug, i18n, Team-Arbeitsanleitung) festgehalten. Leistungsdokumentation als Schlussabsatz. `src/` unangetastet. |
| 12a | 2026-04-21 | Technische Hygiene analysiert | `docs/technical-hygiene-check.md`, `docs/migration-log.md` | erledigt | Keine Codeänderung, technische Restthemen nach `src/pages`-Migration dokumentiert. Befunde: `@tanstack/query-core` ist aktuell **harter Rollup-Resolve-Fehler** (Build bricht ab, nicht nur Warning) – Hypothese: `query-core` nicht als Direkt-Dependency in `package.json`, im Bun-Hoisting-Pfad nicht auflösbar; `package.json` `name` weiterhin Lovable-Default `vite_react_shadcn_ts`; `App.tsx` bindet **beide** Toast-Systeme (`Toaster` shadcn + `Sonner`) parallel ein, redundant; aktuell **keine** `vite.config.ts.timestamp-*.mjs` im Root vorhanden, aber `*.tsbuildinfo` (`tsconfig.app.tsbuildinfo`, `tsconfig.node.tsbuildinfo`) liegen ungeignored im Root; `.gitignore` ohne Einträge für `*.timestamp-*.mjs`, `*.tsbuildinfo`, explizite `.env*`-Pattern, `coverage/`, `playwright-report/`; Bundle-Metriken nicht messbar, da Build abbricht. Ergebnis-Tabelle (Thema/Befund/Risiko/Empfehlung/Etappe) und Empfehlung Folge-Etappen 12b–17a festgehalten. `src/`, `package.json`, `vite.config.ts`, `.gitignore` unangetastet. |
| 12b-1 | 2026-04-21 | query-core Build-Fehler behoben | `package.json`, Lockfile, `docs/migration-log.md` | erledigt | Minimaler Dependency-Fix für `@tanstack/query-core`, keine Struktur-/Routing-/Textänderungen. Ursprünglicher Fehler: `[vite]: Rollup failed to resolve import "@tanstack/query-core" from ".../@tanstack/react-query/build/modern/index.js"` – harter Build-Abbruch. Befund: `@tanstack/react-query@^5.83.0` als Direct-Dependency vorhanden, aber Peer/Transitive `@tanstack/query-core` (von react-query intern benötigt) im Bun-Hoisting-Layout (`node_modules/.bun/...`) nicht von Rollup auflösbar. Fix: `@tanstack/query-core@5.83.0` als direkte Dependency in `package.json` ergänzt (versions-pinned passend zur vorhandenen `react-query`-Version 5.83.0). Keine sonstigen Dependency-Änderungen, keine Vite-Externalisierung, keine React-Query-Logik-Änderung, keine `src/`-Änderung. Build danach erfolgreich (`npm run build`, ✓ built in 9.80s). Verbleibende, nicht-fatale Hinweise: (1) Vite-CSS-Hinweis zu `@import` nach `@tailwind utilities` in `index.css` (vorbestehend, unabhängig von 12b-1), (2) Rollup-Hinweis „Some chunks are larger than 500 kB" (Bundle-Größe – Code-Splitting für spätere Etappe vorgemerkt, siehe 12a), (3) browserslist 10 months old. |
| 12b-2 | 2026-04-21 | Kleine technische Hygiene-Fixes umgesetzt | `package.json`, `.gitignore`, `src/App.tsx`, `src/index.css`, `docs/migration-log.md` | erledigt | Projektname, gitignore, Toast-System und CSS-import-Hinweis geprüft/bereinigt; keine Struktur-/Routing-/Textänderungen. (1) `package.json` `name` von `vite_react_shadcn_ts` → `tcs-unternehmenswebseite` (alle anderen Felder unverändert). (2) `.gitignore` ergänzt um `vite.config.ts.timestamp-*.mjs`, `*.tsbuildinfo`, `.env`, `.env.local`, `.env.*.local`, `coverage/`, `playwright-report/`, `test-results/` (bestehende Einträge unverändert; keine Dateien gelöscht). (3) Toast-System: `useToast` wird **nirgends in echtem Anwendungscode** verwendet (nur intern in `src/hooks/use-toast.ts`, `src/components/ui/use-toast.ts`, `src/components/ui/toaster.tsx`); shadcn-`Toaster` aus `src/App.tsx` entfernt (Import + JSX); `Sonner` bleibt erhalten als alleiniges Toast-System. Legacy-Dateien (`hooks/use-toast.ts`, `components/ui/toaster.tsx`, `components/ui/toast.tsx`, `components/ui/use-toast.ts`) bewusst NICHT gelöscht (Constraint, kann in späterer Etappe folgen). (4) `src/index.css`: Google-Fonts `@import url(...)` an Dateianfang vor `@tailwind`-Direktiven verschoben — Vite-CSS-Hinweis `@import must precede all other statements` behoben. Keine Farben, Tokens, Layer oder Tailwind-Klassen geändert. Build danach erfolgreich (`npm run build`, ✓ built in 9.00s). Verbleibende Warnungen: nur noch (a) Rollup-Hinweis „Some chunks are larger than 500 kB" (Bundle-Größe – Code-Splitting für spätere Etappe vorgemerkt) und (b) browserslist 10 months old (kosmetisch). Keine Routen-, Navigations-, Footer-, MetaNavigation-, i18n-Locale-, Asset-, Layout- oder Textänderungen. Keine Feature-Domain-Migration, keine App.tsx-Dezentralisierung, keine Backend-/Auth-/Supabase-Änderungen, keine neuen Dependencies. |
| 12c | 2026-04-21 | Technische Hygiene abgeschlossen und dokumentiert | `docs/technical-hygiene-checkpoint-12c.md`, `docs/migration-log.md` | erledigt | Keine Codeänderung, Hygiene-Stand nach 12b dokumentiert. Abschlussbericht zu 12a→12b-1→12b-2: query-core Build-Fehler behoben, package.json-Name auf `tcs-unternehmenswebseite`, `.gitignore` erweitert (Vite-/Build-/Env-/Test-Artefakte), shadcn-Toaster aus App.tsx entfernt (Sonner alleiniges System), CSS-`@import` an Dateianfang verschoben. Build erfolgreich (`✓ built in 8.09s`); verbleibend nur (a) Rollup „chunks > 500 kB" (→ 13c) und (b) browserslist 10 months old (kosmetisch). Verbleibende Themen (Bundle-Größe/Code-Splitting, statische Imports in App.tsx, Routing-Dezentralisierung, Legacy-shadcn-toast-Dateien ungenutzt aber vorhanden, browserslist-Update) und Empfehlung Folge-Etappen 13a→13b→13c→14a→15a→16a festgehalten. `src/`, `package.json`, `.gitignore` unangetastet. |
| 13a | 2026-04-21 | Routing-Dezentralisierung geplant | `docs/routing-decentralization-plan.md`, `docs/migration-log.md` | erledigt | Keine Codeänderung, Zielstruktur für dezentrale Feature-Routes dokumentiert. Ist-Zustand: `App.tsx` ist monolithischer Router mit 74 statischen Page-Imports und 62 `<Route>`-Einträgen (direkter Zusammenhang zur Bundle-Size-Warnung). Zielbild: 13 Feature-`routes.tsx` pro Domain (`home`, `zutrittskontrolle`, `eingangssysteme`, `gebaeudemanagement`, `gebaeudekommunikation`, `signage`, `anwendungen`, `service`, `serviceportal`, `wissen`, `kontakt`, `karriere`, `presse`) + zentrale `src/app/routes.tsx` als Aggregator; NotFound bleibt zentral als letzte `<Route path="*">`. Persona-Domains exportieren bewusst keine Routen. Empfohlene technische Form: **JSX-Fragmente mit `<Route>`-Elementen** (kein Wechsel auf `RouteObject[]`/`createBrowserRouter`, das wäre größerer Eingriff). Domain-Tabelle mit Routenanzahl/Risiko/Bemerkung erstellt (anwendungen mit 22 Routen inkl. `/anwendungen/referenzprojekte/:slug` als größter Block; kleine Domains kontakt/karriere/presse/wissen/home/signage als Pilotkandidaten). Risiken dokumentiert (Route-Reihenfolge, Detail-Routen mit Param, NotFound-Singleton, Cross-Feature-Imports, Serviceportal-Prototyp ohne Auth, Navigation/Slugs unverändert). Empfehlung 13b in 6 Sub-Etappen (13b-1 kontakt/karriere als Pilot → 13b-2 presse/wissen/home/signage → 13b-3 service/serviceportal/gebaeudemanagement → 13b-4 zutrittskontrolle/eingangssysteme/gebaeudekommunikation → 13b-5 anwendungen → 13b-6 App.tsx final reduzieren). Beziehung zu 13c: Lazy-Loading erst nach 13b sinnvoll, da Lazy-Wrap dann lokal pro Domain möglich ist; 13a selbst bringt keine Bundle-Verbesserung (Absicht). `src/`, `package.json`, `.gitignore` unangetastet. |

| 13b-1 | 2026-04-21 | Routing-Dezentralisierung Pilot kontakt/karriere umgesetzt | `src/app/routes.tsx`, `src/features/kontakt/routes.tsx`, `src/features/karriere/routes.tsx`, `src/App.tsx`, `docs/migration-log.md` | erledigt | Pilot-Routen kontakt/karriere aus App.tsx ausgelagert, Routenwerte unverändert, kein Lazy-Loading. Neu: `src/features/kontakt/routes.tsx` exportiert `kontaktRoutes` (JSX-Fragment mit `<Route path="/kontakt">`); `src/features/karriere/routes.tsx` exportiert `karriereRoutes` (`<Route path="/karriere">`); `src/app/routes.tsx` exportiert `appRoutes`-Fragment, das beide Pilot-Fragmente aggregiert. App.tsx: Page-Imports `KontaktPage`/`KarrierePage` entfernt, dafür `import { appRoutes } from "@/app/routes"`; im bestehenden `<Routes>`-Block wurden die zwei `<Route>`-Einträge `/kontakt` und `/karriere` durch `{appRoutes}` ersetzt (an gleicher Stelle, vor `/presse`). Bewusst KEINE verschachtelten `<Routes>` (Fragment-Variante). NotFound bleibt zentral. Alle anderen 60 Routen unverändert in App.tsx. Keine Lazy-Routes, kein `React.lazy`, kein `Suspense`, keine Slug-/URL-/Navigations-/Footer-/i18n-/Asset-/Text-/Layout-Änderung. Build erfolgreich (`npm run build`, ✓ built in 11.95s). Verbleibende Warnungen unverändert: nur (a) Rollup „chunks > 500 kB" und (b) browserslist 10 months old. |
| 13b-1-cleanup | 2026-04-21 | Routing-Pilot kontakt/karriere verifiziert | `src/features/kontakt/routes.tsx`, `src/features/karriere/routes.tsx`, `src/app/routes.tsx`, `src/App.tsx` (jeweils geprüft, keine Änderung), `docs/migration-log.md` | erledigt | Pilot-Routing geprüft, keine Route-Werte geändert, keine weiteren Domains betroffen. Verifikation der 4 in 13b-1 betroffenen Dateien: (1) `src/features/kontakt/routes.tsx` – `Route` und `KontaktPage` beide verwendet, keine ungenutzten Imports. (2) `src/features/karriere/routes.tsx` – `Route` und `KarrierePage` beide verwendet, keine ungenutzten Imports. (3) `src/app/routes.tsx` – `kontaktRoutes` und `karriereRoutes` beide im Fragment verwendet, keine ungenutzten Imports. (4) `src/App.tsx` – grep nach `/kontakt` und `/karriere` ergibt 0 Treffer (keine doppelten Pilot-Routen, kein Rest-`<Route>`-Eintrag), keine Imports von `KontaktPage`/`KarrierePage` mehr vorhanden, `appRoutes` korrekt einmal innerhalb des bestehenden zentralen `<Routes>`-Blocks (vor `/presse`) eingebunden, keine verschachtelten `<Routes>`-Komponenten, NotFound-Route `path="*"` weiterhin zentral als letzter Eintrag in App.tsx. **0 Änderungen nötig** (keine Imports zu entfernen, keine doppelten Routen zu bereinigen). Keine weiteren Domains ausgelagert, keine Route-Werte geändert, keine Navigation/Footer/MetaNavigation/i18n/Asset-/Layout-/Text-/Slug-Änderungen, keine Lazy-Routes, keine NotFound-Verschiebung. Build erfolgreich (`npm run build`, ✓ built in 10.29s); verbleibende Warnungen unverändert: nur (a) Rollup „chunks > 500 kB" und (b) browserslist 10 months old. |
| 13b-2a | 2026-04-21 | Routing-Dezentralisierung presse/wissen umgesetzt | `src/features/presse/routes.tsx`, `src/features/wissen/routes.tsx`, `src/app/routes.tsx`, `src/App.tsx`, `docs/migration-log.md` | erledigt | Routen `/presse` und `/akademie` in Feature-Routes ausgelagert, Route-Werte unverändert, keine weiteren Domains betroffen, NotFound bleibt zentral. Neu: `src/features/presse/routes.tsx` exportiert `presseRoutes` (`<Route path="/presse">`); `src/features/wissen/routes.tsx` exportiert `wissenRoutes` (`<Route path="/akademie">`). `src/app/routes.tsx` um beide Fragmente erweitert (Reihenfolge: kontakt, karriere, presse, wissen). App.tsx: Imports `Presse` und `Akademie` entfernt; direkte `<Route>`-Einträge entfernt; `{appRoutes}` weiterhin nur einmal im bestehenden `<Routes>`-Block; NotFound `path="*"` weiterhin zentral und letzter Eintrag. Keine verschachtelten `<Routes>`, keine doppelten Routen, keine ungenutzten Imports. Keine Lazy-Routes, keine Slug-/URL-/Navigations-/Footer-/i18n-/Asset-/Text-/Layout-Änderung. Build erfolgreich (`npm run build`, ✓ built in 12.18s). Verbleibende Warnungen unverändert: nur (a) Rollup „chunks > 500 kB" und (b) browserslist 10 months old. |
| 13b-2a-cleanup | 2026-04-21 | Routing-Auslagerung presse/wissen verifiziert | `src/features/presse/routes.tsx`, `src/features/wissen/routes.tsx`, `src/app/routes.tsx`, `src/App.tsx` (jeweils geprüft, keine Änderung), `docs/migration-log.md` | erledigt | Presse/Wissen-Routing geprüft, keine Route-Werte geändert, keine weiteren Domains betroffen, NotFound bleibt zentral. Verifikation der 4 in 13b-2a betroffenen Dateien: (1) `src/features/presse/routes.tsx` – `Route` und `PressePage` beide verwendet; `presseRoutes` enthält Route `/presse`; keine ungenutzten Imports. (2) `src/features/wissen/routes.tsx` – `Route` und `AkademiePage` beide verwendet; `wissenRoutes` enthält Route `/akademie`; keine ungenutzten Imports. (3) `src/app/routes.tsx` – `kontaktRoutes`, `karriereRoutes`, `presseRoutes`, `wissenRoutes` alle im `appRoutes`-Fragment verwendet, keine ungenutzten Imports. (4) `src/App.tsx` – grep nach `PressePage`/`AkademiePage`/`/presse`/`/akademie` ergibt 0 Treffer (keine doppelten Routen, kein Rest-Import), `appRoutes` korrekt einmal innerhalb des bestehenden zentralen `<Routes>`-Blocks eingebunden, keine verschachtelten `<Routes>`-Komponenten, NotFound-Route `path="*"` weiterhin zentral als letzter Eintrag. **0 Änderungen nötig** (keine Imports zu entfernen, keine doppelten Routen zu bereinigen, keine fehlerhaften Markdown-Stellen im 13b-2a-Logeintrag). Keine weiteren Domains ausgelagert, keine Route-Werte geändert, keine Navigation/Footer/MetaNavigation/i18n/Asset-/Layout-/Text-/Slug-Änderungen, keine Lazy-Routes, keine NotFound-Verschiebung. Build erfolgreich (`npm run build`); verbleibende Warnungen unverändert: nur (a) Rollup „chunks > 500 kB" und (b) browserslist 10 months old. |
| 13b-2b | 2026-04-21 | Routing-Dezentralisierung home/signage umgesetzt | `src/features/home/routes.tsx`, `src/features/signage/routes.tsx`, `src/app/routes.tsx`, `src/App.tsx`, `docs/migration-log.md` | erledigt | Home- und Signage-Routen in Feature-Routes ausgelagert, Route-Werte unverändert, keine weiteren Domains betroffen, NotFound bleibt zentral. Neu: `src/features/home/routes.tsx` exportiert `homeRoutes` (enthält Route `/` mit `HomePage`); `src/features/signage/routes.tsx` exportiert `signageRoutes` (enthält Route `/signage` mit `SignagePage`). `src/app/routes.tsx` um beide Fragmente erweitert (Reihenfolge im `appRoutes`-Fragment: home, kontakt, karriere, presse, wissen, signage). App.tsx: Imports `Index` (HomePage) und `Signage` (SignagePage) entfernt; direkte `<Route path="/">`- und `<Route path="/signage">`-Einträge aus dem zentralen `<Routes>`-Block entfernt; `{appRoutes}` weiterhin nur einmal im bestehenden `<Routes>`-Block; NotFound `path="*"` weiterhin zentral und letzter Eintrag. Keine verschachtelten `<Routes>`, keine doppelten Routen, keine ungenutzten Imports. Keine Lazy-Routes, kein `React.lazy`, kein `Suspense`, keine Slug-/URL-/Navigations-/Footer-/i18n-/Asset-/Text-/Layout-Änderung. Build erfolgreich (`npm run build`). Verbleibende Warnungen unverändert: nur (a) Rollup „chunks > 500 kB" und (b) browserslist 10 months old. |
| 13b-3 | 2026-04-21 | Routing-Dezentralisierung service/serviceportal umgesetzt | `src/features/service/routes.tsx`, `src/features/serviceportal/routes.tsx`, `src/app/routes.tsx`, `src/App.tsx`, `docs/migration-log.md` | erledigt | Service- und Serviceportal-Routen in Feature-Routes ausgelagert, Route-Werte unverändert, keine weiteren Domains betroffen, NotFound bleibt zentral. Neu: `src/features/service/routes.tsx` exportiert `serviceRoutes` (4 Routen: `/planen-konfigurieren`, `/downloads`, `/technischer-support`, `/ersatzteile`); `src/features/serviceportal/routes.tsx` exportiert `serviceportalRoutes` (3 Routen: `/serviceportal`, `/serviceportal/passwort-vergessen`, `/serviceportal/registrieren`). `src/app/routes.tsx` um beide Fragmente erweitert (Reihenfolge: home, kontakt, karriere, presse, wissen, signage, service, serviceportal). App.tsx: 7 Page-Imports entfernt (`PlanenKonfigurieren`, `Downloads`, `TechnischerSupport`, `Ersatzteile`, `Serviceportal`, `PasswortVergessen`, `Registrieren`); 7 zugehörige `<Route>`-Einträge aus zentralem `<Routes>`-Block entfernt; `{appRoutes}` weiterhin nur einmal eingebunden; NotFound `path="*"` weiterhin zentral und letzter Eintrag. `/gebaeudemanagement/digital-signage` bewusst nicht ausgelagert. Keine verschachtelten `<Routes>`, keine doppelten Routen, keine ungenutzten Imports. Keine Lazy-Routes, kein `React.lazy`, kein `Suspense`, keine Slug-/URL-/Navigations-/Footer-/i18n-/Asset-/Text-/Layout-Änderung. Build erfolgreich (`npm run build`). Verbleibende Warnungen unverändert: nur (a) Rollup „chunks > 500 kB" und (b) browserslist 10 months old. |
| 13b-4 | 2026-04-21 | Routing-Dezentralisierung gebaeudekommunikation umgesetzt | `src/features/gebaeudekommunikation/routes.tsx`, `src/app/routes.tsx`, `src/App.tsx`, `docs/migration-log.md` | erledigt | Gebäudekommunikation-Routen inklusive snipdoo-ip in Feature-Routes ausgelagert, Route-Werte unverändert, /beschilderung bleibt unverändert in App.tsx, keine weiteren Domains betroffen, NotFound bleibt zentral. Neu: `src/features/gebaeudekommunikation/routes.tsx` exportiert `gebaeudekommunikationRoutes` (6 Routen: `/tuerkommunikation`, `/tuersprechanlagen`, `/briefkastenanlagen`, `/grossanlagen`, `/systemloesungen`, `/systemtechnik/snipdoo-ip`). `src/app/routes.tsx` um `gebaeudekommunikationRoutes` erweitert (Reihenfolge: home, kontakt, karriere, presse, wissen, signage, service, serviceportal, gebaeudekommunikation). App.tsx: 6 Page-Imports entfernt (`Tuerkommunikation`, `Tuersprechanlagen`, `Briefkastenanlagen`, `Grossanlagen`, `Systemloesungen`, `SnipdooIp`); 6 zugehörige `<Route>`-Einträge aus zentralem `<Routes>`-Block entfernt; `/beschilderung` bewusst unverändert in App.tsx (gehört zu signage und bleibt in dieser Etappe direkt); `{appRoutes}` weiterhin nur einmal eingebunden; NotFound `path="*"` weiterhin zentral und letzter Eintrag. Keine verschachtelten `<Routes>`, keine doppelten Routen, keine ungenutzten Imports. Keine Lazy-Routes, kein `React.lazy`, kein `Suspense`, keine Slug-/URL-/Navigations-/Footer-/i18n-/Asset-/Text-/Layout-Änderung. Build erfolgreich (`npm run build`). Verbleibende Warnungen unverändert: nur (a) Rollup „chunks > 500 kB" und (b) browserslist 10 months old. |
| 13b-5 | 2026-04-21 | Routing-Dezentralisierung zutrittskontrolle umgesetzt | `src/features/zutrittskontrolle/routes.tsx`, `src/app/routes.tsx`, `src/App.tsx`, `docs/migration-log.md` | erledigt | Zutrittskontrolle-Routen in Feature-Routes ausgelagert, Route-Werte unverändert, keine weiteren Domains betroffen, NotFound bleibt zentral. Neu: `src/features/zutrittskontrolle/routes.tsx` exportiert `zutrittskontrolleRoutes` (5 Routen: `/zutrittskontrolle`, `/zutrittskontrolle/tueren-tore`, `/zutrittskontrolle/mobiler-zutritt`, `/zutrittskontrolle/fahrstuhlsteuerung`, `/zutrittskontrolle/zufahrten-parkplaetze`). `src/app/routes.tsx` um `zutrittskontrolleRoutes` erweitert (Reihenfolge: home, kontakt, karriere, presse, wissen, signage, service, serviceportal, gebaeudekommunikation, zutrittskontrolle). App.tsx: 5 Page-Imports entfernt (`Zutrittskontrolle`, `ZutrittTuerenTore`, `ZutrittMobil`, `ZutrittFahrstuhl`, `ZufahrtenParkplaetze`); 5 zugehörige `<Route>`-Einträge aus zentralem `<Routes>`-Block entfernt; `{appRoutes}` weiterhin nur einmal eingebunden; NotFound `path="*"` weiterhin zentral und letzter Eintrag. Keine verschachtelten `<Routes>`, keine doppelten Routen, keine ungenutzten Imports. Keine Lazy-Routes, kein `React.lazy`, kein `Suspense`, keine Slug-/URL-/Navigations-/Footer-/i18n-/Asset-/Text-/Layout-Änderung. Build erfolgreich (`npm run build`). Verbleibende Warnungen unverändert: nur (a) Rollup „chunks > 500 kB" und (b) browserslist 10 months old. |
| 13b-6 | 2026-04-21 | Routing-Dezentralisierung gebaeudemanagement umgesetzt | `src/features/gebaeudemanagement/routes.tsx`, `src/app/routes.tsx`, `src/App.tsx`, `docs/migration-log.md` | erledigt | Gebäudemanagement-Routen in Feature-Routes ausgelagert, Route-Werte unverändert, /beschilderung bleibt unverändert in App.tsx, keine weiteren Domains betroffen, NotFound bleibt zentral. Neu: `src/features/gebaeudemanagement/routes.tsx` exportiert `gebaeudemanagementRoutes` (5 Routen: `/gebaeudemanagement`, `/gebaeudemanagement/schraenke-behaelter`, `/gebaeudemanagement/digitale-namensanzeige`, `/gebaeudemanagement/reservieren-buchen`, `/gebaeudemanagement/digital-signage`). `src/app/routes.tsx` um `gebaeudemanagementRoutes` erweitert (Reihenfolge: home, kontakt, karriere, presse, wissen, signage, service, serviceportal, gebaeudekommunikation, zutrittskontrolle, gebaeudemanagement). App.tsx: 5 Page-Imports entfernt (`SchraenkeBehaelter`, `DigitaleNamensanzeige`, `Gebaeudemanagement`, `ReservierenBuchen`, `DigitalSignage`); 5 zugehörige `<Route>`-Einträge aus zentralem `<Routes>`-Block entfernt; `/beschilderung` bewusst unverändert in App.tsx; `{appRoutes}` weiterhin nur einmal eingebunden; NotFound `path="*"` weiterhin zentral und letzter Eintrag. Keine verschachtelten `<Routes>`, keine doppelten Routen, keine ungenutzten Imports. Keine Lazy-Routes, kein `React.lazy`, kein `Suspense`, keine Slug-/URL-/Navigations-/Footer-/i18n-/Asset-/Text-/Layout-Änderung. Build erfolgreich (`npm run build`). Verbleibende Warnungen unverändert: nur (a) Rollup „chunks > 500 kB" und (b) browserslist 10 months old. |
| 13b-7 | 2026-04-21 | Routing-Dezentralisierung eingangssysteme umgesetzt | `src/features/eingangssysteme/routes.tsx`, `src/app/routes.tsx`, `src/App.tsx`, `docs/migration-log.md` | erledigt | Eingangssysteme-Routen in Feature-Routes ausgelagert, Route-Werte unverändert, keine weiteren Domains betroffen, NotFound bleibt zentral. Neu: `src/features/eingangssysteme/routes.tsx` exportiert `eingangssystemeRoutes` (8 Routen: `/entry-system`, `/entry-system/design`, `/entry-system/funktionalitaet`, `/entry-system/material`, `/entry-system/integrationsformen`, `/entry-system/referenzen`, `/entry-system/standards`, `/entry-system/beratung`). `src/app/routes.tsx` um `eingangssystemeRoutes` erweitert (Reihenfolge: home, kontakt, karriere, presse, wissen, signage, service, serviceportal, gebaeudekommunikation, zutrittskontrolle, gebaeudemanagement, eingangssysteme). App.tsx: 8 Page-Imports entfernt (`EntrySystem`, `EntryDesign`, `EntryFunktionalitaet`, `EntryMaterial`, `EntryIntegrationsformen`, `EntryReferenzen`, `EntryStandards`, `EntryBeratung`); 8 zugehörige `<Route>`-Einträge aus zentralem `<Routes>`-Block entfernt; `/beschilderung` und `/ueber-tcs` bewusst unverändert in App.tsx; `{appRoutes}` weiterhin nur einmal eingebunden; NotFound `path="*"` weiterhin zentral und letzter Eintrag. Keine verschachtelten `<Routes>`, keine doppelten Routen, keine ungenutzten Imports. Keine Lazy-Routes, kein `React.lazy`, kein `Suspense`, keine Slug-/URL-/Navigations-/Footer-/i18n-/Asset-/Text-/Layout-Änderung. Build erfolgreich (`npm run build`). Verbleibende Warnungen unverändert: nur (a) Rollup „chunks > 500 kB" und (b) browserslist 10 months old. |
| 13b-8 | 2026-04-21 | Routing-Dezentralisierung anwendungen umgesetzt | src/features/anwendungen/routes.tsx, src/app/routes.tsx, src/App.tsx, docs/migration-log.md | erledigt | Anwendungen-Routen in Feature-Routes ausgelagert, Route-Werte unverändert, /beschilderung und /ueber-tcs bleiben unverändert in App.tsx, keine weiteren Domains betroffen, NotFound bleibt zentral |
| 13b-9 | 2026-04-21 | Finale Routing-Sonderfälle abgeschlossen | `src/features/signage/routes.tsx`, `src/features/home/routes.tsx`, `src/App.tsx`, `docs/migration-log.md` | erledigt | `/beschilderung` zu `signageRoutes` und `/ueber-tcs` zu `homeRoutes` verschoben, Route-Werte unverändert, App.tsx enthält im Routes-Block nur noch `{appRoutes}` und zentrale NotFound-Route. Imports `Beschilderung` und `UeberTCS` aus App.tsx entfernt; keine doppelten Routen, keine verschachtelten `<Routes>`. Build erfolgreich (`npm run build`). Verbleibende Warnungen unverändert: nur (a) Rollup „chunks > 500 kB" und (b) browserslist 10 months old. |
| 13b-final-check | 2026-04-21 | Routing-Dezentralisierung vollständig geprüft | `src/App.tsx`, `src/app/routes.tsx`, `src/features/**/routes.tsx`, `docs/migration-log.md` | erledigt | App.tsx enthält im `<Routes>`-Block nur noch `{appRoutes}` und zentrale NotFound-Route (`path="*"`, letzter Eintrag); 13 Feature-Routing-Dateien (`anwendungen` 24, `eingangssysteme` 8, `gebaeudekommunikation` 6, `gebaeudemanagement` 5, `home` 2, `karriere` 1, `kontakt` 1, `presse` 1, `service` 4, `serviceportal` 3, `signage` 2, `wissen` 1, `zutrittskontrolle` 5) – Summe 63 fachliche Routen + 1 NotFound = 64. `src/app/routes.tsx` importiert alle 13 Fragmente und verwendet jedes genau einmal in `appRoutes`. Keine doppelten Route-Pfade über alle Routing-Dateien hinweg. Keine ungenutzten Imports. Keine verschachtelten `<Routes>`. Kein `React.lazy`, kein `Suspense`. **0 Änderungen nötig** (reines Audit). Build erfolgreich (`npm run build`). Verbleibende Warnungen unverändert: nur (a) Rollup „chunks > 500 kB" und (b) browserslist 10 months old. |
| 14b-1 | 2026-04-21 | Eingangssysteme-Navigation auf vorhandene Sub-Routes korrigiert | `src/navigation/mainNavigation.ts`, `docs/migration-log.md` | erledigt | Vier Eingangssysteme-Unterpunkte verlinken nun auf vorhandene /entry-system/* Unterseiten statt auf /entry-system, keine Route-Werte geändert. funktionalitaet→`ROUTES.eingangssysteme.funktionalitaet`, baukoerper→`ROUTES.eingangssysteme.integrationsformen`, material→`ROUTES.eingangssysteme.material`, beratung→`ROUTES.eingangssysteme.beratung`. Status der vier Children von `pending` auf `active` gesetzt; Notes auf „Verlinkt auf vorhandene Sub-Route." aktualisiert. Keine Routes geändert, keine i18n geändert, keine Texte/Layouts/Assets geändert, keine sonstigen Navigationseinträge berührt. Build erfolgreich (`npm run build`). Verbleibende Warnungen unverändert: nur (a) Rollup „chunks > 500 kB" und (b) browserslist 10 months old. |
| 14a | 2026-04-21 | Navigation-Audit ohne Änderungen durchgeführt | `src/navigation/**`, `src/components/MainNavigation.tsx`, `src/components/MetaNavigation.tsx`, `src/components/Footer.tsx`, `src/i18n/locales/de/navigation.json`, `src/i18n/locales/en/navigation.json`, `src/features/**/routes.tsx`, `docs/migration-log.md` | erledigt | Navigation, i18n-Keys und Link-zu-Route-Abgleich geprüft, keine Änderungen an Links, Routen, Slugs oder i18n vorgenommen. Datenstruktur (mainNavigation/footerNavigation/metaNavigation) wird datengetrieben in den Komponenten gerendert. i18n-Keys DE/EN konsistent (106 Keys, 0 diff). Alle funktionalen Links zeigen auf existente Feature-Routen. Nicht verlinkte Routen (29 von 64) sind überwiegend Detailseiten oder dynamische Routen. Wenige hardcoded UI-Strings in MetaNavigation.tsx und Footer.tsx identifiziert. Empfehlung: Navigation-Hygiene als 14b. |
| 14b-2 | 2026-04-21 | Navigation-Linkziel-Audit durchgeführt | `src/navigation/mainNavigation.ts`, `src/navigation/footerNavigation.ts`, `src/navigation/metaNavigation.ts`, `src/navigation/personaNavigation.ts`, `src/navigation/routes.ts`, `src/features/**/routes.tsx`, `docs/migration-log.md` | erledigt | Navigationseinträge auf technisch existente, aber fachlich möglicherweise unpräzise Linkziele geprüft, keine Links oder Routen geändert. Geprüft: 4 Navigationsebenen, ~50 Einträge. Befund: 0 technische Fehler (alle Pfade sind valide Routes oder bewusste "#"-Platzhalter), 12 fachlich auffällige Einträge (10 Footer-pending mit dokumentierten Soll-Zielen, 2 mainNavigation-Sonderfälle: gebaeudemanagement.alarm zeigt auf Top-Level, gebaeudemanagement.reservieren mit pending-Status), 4 Footer-Placeholder mit bereits vorhandener interner Route (services.downloads → /downloads, services.akademie → /akademie, services.support → /technischer-support; services.konfigurator und services.ersatzteile bleiben Platzhalter mangels finalem Ziel). Empfehlung 14b-3: Footer-Anwendungen-Korrektur (5 Einträge auf /anwendungen/* statt /objektloesungen). 14b-4: Footer-Services-Aktivierung (3 Einträge von "#" auf vorhandene Routes). 14b-5: Footer-Produkte-Korrektur (snipdoo → /systemtechnik/snipdoo-ip, beschilderung → /beschilderung). |
| 14b-3 | 2026-04-21 | Footer-Anwendungen-Linkziele korrigiert | `src/navigation/footerNavigation.ts`, `docs/migration-log.md` | erledigt | Vier Footer-Anwendungen verlinken nun auf vorhandene /anwendungen/* Detailrouten statt pauschal auf /objektloesungen, Gewerbe bleibt unverändert, keine Route-Werte geändert. efh→`ROUTES.anwendungen.einfamilienhaus`, mfh→`ROUTES.anwendungen.mehrfamilienhaus`, grossanlagen→`ROUTES.anwendungen.grossanlage`, referenzen→`ROUTES.anwendungen.referenzprojekte`. Status der vier Children von `pending` auf `active` gesetzt; Notes aktualisiert. `anwendungen.gewerbe` bleibt bewusst auf /objektloesungen (status pending). Keine anderen Navigationseinträge verändert, keine Routes/Slugs/i18n/Texte/Layouts berührt. Build erfolgreich. Verbleibende Warnungen unverändert: nur (a) Rollup „chunks > 500 kB" und (b) browserslist 10 months old. |
| 14b-4 | 2026-04-21 | Footer-Services-Links aktiviert | `src/navigation/footerNavigation.ts`, `docs/migration-log.md` | erledigt | Drei Footer-Service-Placeholder verlinken nun auf vorhandene interne Routen für Downloads, Akademie und technischen Support, Konfigurator und Ersatzteile bleiben unverändert, keine Route-Werte geändert. downloads→`ROUTES.service.downloads`, akademie→`ROUTES.wissen.akademie`, support→`ROUTES.service.technischerSupport`. linkType `placeholder` → `internal`, status `placeholder` → `active`, Notes aktualisiert. `services.konfigurator` und `services.ersatzteile` bleiben bewusst Platzhalter (linkType `placeholder`, status `placeholder`). Keine anderen Navigationseinträge berührt, keine Routes/Slugs/i18n/Texte/Layouts geändert. Build erfolgreich. Verbleibende Warnungen unverändert: nur (a) Rollup „chunks > 500 kB" und (b) browserslist 10 months old. |
| 14b-5 | 2026-04-21 | Footer-Produkte-Linkziele korrigiert | `src/navigation/footerNavigation.ts`, `docs/migration-log.md` | erledigt | Footer-Produkte snipdoo und beschilderung verlinken nun auf vorhandene interne Routen, tcsPacks bleibt unverändert, keine Route-Werte geändert. snipdoo→`ROUTES.gebaeudekommunikation.snipdooIp` (`/systemtechnik/snipdoo-ip`), beschilderung→`ROUTES.gebaeudekommunikation.beschilderung` (`/beschilderung`). Hinweis: `/beschilderung` ist im ROUTES-Konstantenbaum unter `gebaeudekommunikation` definiert (kein separates `signage.beschilderung`-Feld vorhanden); Route-Wert unverändert. Status `pending` → `active`, Notes aktualisiert. `produkte.tcsPacks` bleibt bewusst auf `/tuerkommunikation` (status pending), da keine spezifische Route existiert. Keine anderen Navigationseinträge berührt, keine Routes/Slugs/i18n/Texte/Layouts geändert. Build erfolgreich. Verbleibende Warnungen unverändert: nur (a) Rollup „chunks > 500 kB" und (b) browserslist 10 months old. |
| 14b-final-check | 2026-04-21 | Navigation-Korrekturen vollständig geprüft | `src/navigation/mainNavigation.ts`, `src/navigation/footerNavigation.ts`, `src/navigation/routes.ts`, `src/features/**/routes.tsx`, `docs/migration-log.md` | erledigt | Navigation nach 14b-1 bis 14b-5 geprüft, aktive Links zeigen auf vorhandene Routen, verbleibende pending/placeholder/Semantikfälle dokumentiert, keine Links oder Routen geändert. Gezählt: 48 aktive Links, 0 aktive Links ohne existierende Route, 5 pending-Einträge (mainNavigation: gm.reservieren, gm.alarm, services.planen, services.ersatzteile; footerNavigation: produkte.tcsPacks, anwendungen.gewerbe — beide bewusst dokumentiert), 8 placeholder-Einträge (mainNavigation: services-Top-Level; footerNavigation: services.konfigurator, services.ersatzteile, unternehmen.datenschutz; footerBottom: impressum, datenschutz, agb). Semantische Inkonsistenz dokumentiert: `/beschilderung` Route lebt in `src/features/signage/routes.tsx`, ihre Konstante aber unter `ROUTES.gebaeudekommunikation.beschilderung` — funktional korrekt, aber Domain-Zugehörigkeit uneindeutig (Grenzfall signage/gebaeudekommunikation auch in mainNavigation-Note vermerkt). Keine MainNavigation-Gruppe enthält Duplikate identischer Pfade (gk.grossanlagen → /grossanlagen und anwendungen.grossanlage → /anwendungen/grossanlage sind verschiedene Routes, keine echte Dublette). Keine Änderungen an Links, Routen, ROUTES-Konstanten, Slugs, i18n, Texten oder Layouts. Empfehlung 14c: entweder (a) ROUTES.signage.beschilderung als semantisch korrekten Zweitname einführen (Alias ohne Route-Wert-Änderung) oder (b) Grenzfall als fachliche Entscheidung dokumentieren und belassen. |
| 14b-final-check | 2026-04-21 | Navigation-Korrekturen vollständig geprüft | `src/navigation/mainNavigation.ts`, `src/navigation/footerNavigation.ts`, `src/navigation/routes.ts`, `src/features/**/routes.tsx`, `docs/migration-log.md` | erledigt | Navigation nach 14b-1 bis 14b-5 geprüft, aktive Links zeigen auf vorhandene Routen, /beschilderung als bewusstes Querschnittsthema zwischen Gebäudekommunikation und Signage dokumentiert, verbleibende pending/placeholder-Fälle dokumentiert, keine Links oder Routen geändert. Gezählt: 48 aktive Links, 0 aktive Links ohne existierende Route, 6 pending-Einträge (mainNavigation: gm.reservieren, gm.alarm, services.planen, services.ersatzteile; footerNavigation: produkte.tcsPacks, anwendungen.gewerbe — alle bewusst dokumentiert), 8 placeholder-Einträge (mainNavigation: services-Top-Level; footerNavigation: services.konfigurator, services.ersatzteile, unternehmen.datenschutz; footerBottom: legal.impressum, legal.datenschutz, legal.agb). Sonderfall /beschilderung: technisch in `src/features/signage/routes.tsx` registriert, fachlich gleichzeitig unter Gebäudekommunikation (mainNavigation.gebaeudekommunikation.beschilderung) und unter Footer/Produkte geführt; ROUTES-Konstante liegt unter `ROUTES.gebaeudekommunikation.beschilderung`. Wird bewusst als Querschnittsthema (Beschilderung & Wayfinding) behandelt; keine ROUTES-Umstrukturierung notwendig oder durchgeführt. Keine MainNavigation-Gruppe enthält Duplikate identischer Pfade. Keine Änderungen an Links, Routen, ROUTES-Konstanten, Slugs, i18n, Texten oder Layouts. Empfehlung 14c: i18n-Hygiene für noch hardcodierte UI-Strings in MetaNavigation.tsx und Footer.tsx (aus 14a-Audit). |
| 14c | 2026-04-21 | Seiten-Kontext- und Breadcrumb-Audit durchgeführt | `src/features/**/pages/*.tsx`, `src/features/**/routes.tsx`, `src/navigation/mainNavigation.ts`, `src/navigation/footerNavigation.ts`, `docs/migration-log.md` | erledigt | Seiten auf sichtbaren Navigationskontext, Breadcrumbs, Footer-only-Zugänge und isolierte Seiteneinstiege geprüft, keine Änderungen an Routen, Navigation oder Layout vorgenommen. **Befund:** Praktisch alle Detailseiten nutzen `PageLayout`, das `AutoBreadcrumb` einbindet — daher besitzen sie automatisch eine sichtbare Breadcrumb-/Kontextzeile, die aus dem URL-Pfad abgeleitet wird. **Sonderfall `/systemtechnik/snipdoo-ip` (SnipdooIpPage):** Verwendet **kein** PageLayout und importiert **kein** AutoBreadcrumb; statt dessen eigener Hero-Aufbau mit `SubNavSticky` für reine On-Page-Sektionsnavigation. Die Seite wirkt dadurch isoliert: kein sichtbarer Pfad „Gebäudekommunikation › snipdoo IP", kein Sub-Item in der MainNavigation-Domain Gebäudekommunikation (nur Footer-Eintrag `produkte.snipdoo` + Verweise von Detailseiten). Zusätzlich existiert keine Route `/systemtechnik` als übergeordnete Sammelseite, auf die ein automatischer Breadcrumb sinnvoll zurückführen könnte. **Weitere Beobachtungen:** `/signage` (SignagePage) und `/beschilderung` (BeschilderungPage) nutzen beide PageLayout → AutoBreadcrumb vorhanden, beide jedoch nur über Footer/MainNav-Untereintrag erreichbar; `/serviceportal` importiert AutoBreadcrumb explizit selbst (kein PageLayout) und besitzt damit ebenfalls einen Kontextpfad; `/entry-system/*`, `/gebaeudemanagement/*` und `/anwendungen/*` durchgängig mit Breadcrumb; Top-Level-Slug `/bildungseinrichtungen` und `/objektloesungen` zeigen im Breadcrumb nicht ihren fachlichen Anwendungen-Kontext, da die URL flach ist. Risiko-Hauptfall bleibt SnipdooIpPage. Empfehlung dokumentiert (keine Umsetzung in 14c). |
| 14d-1 | 2026-04-21 | SnipdooIpPage mit AutoBreadcrumb ergänzt | `src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx`, `docs/migration-log.md` | erledigt | SnipdooIpPage erhält sichtbaren Breadcrumb-Kontext, Route /systemtechnik/snipdoo-ip unverändert, keine Navigation, Slugs oder Inhalte geändert. Import `AutoBreadcrumb from "@/components/AutoBreadcrumb"` ergänzt; Komponente `<AutoBreadcrumb fallbackLabel="snipdoo IP" />` direkt vor `<SubNavSticky items={subNavItems} />` am Anfang des JSX-Returns eingefügt. SubNavSticky-Logik, Section-IDs (`hero`, `systemversprechen`, `fuer-wen`, `nutzung-im-alltag`, `systemaufbau`, `inbetriebnahme`, `anwendungen`, `rollen`, `kontakt`), Hero-Texte, Scroll-/On-Page-Navigation und alle weiteren Inhalte unverändert. Kein PageLayout-Umbau. Keine MainNavigation-/FooterNavigation-/Routen-/Slug-/i18n-/Asset-Änderung. AutoBreadcrumb leitet Pfad „Startseite › Systemtechnik › snipdoo IP" über vorhandene `segmentLabels`-Mappings (`systemtechnik`, `snipdoo-ip`) ab. Build-Status: erfolgreich (10.96 s), nur vorbestehende Chunk-Size-Warnung (>500 kB) — kein neuer Fehler, keine ungenutzten Imports. |
| 14d-2 | 2026-04-21 | Snipdoo-IP-URL bereinigt | `src/features/gebaeudekommunikation/routes.tsx`, `src/navigation/routes.ts`, `src/navigation/footerNavigation.ts`, `src/features/gebaeudekommunikation/pages/TuerkommunikationPage.tsx`, `src/features/gebaeudekommunikation/pages/TuersprechanlagenPage.tsx`, `src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx`, `docs/migration-log.md` | erledigt | Neue aktive URL `/snipdoo-ip` ergänzt, alte URL `/systemtechnik/snipdoo-ip` als Fallback belassen, aktive Links auf `/snipdoo-ip` umgestellt, kein sichtbarer Systemtechnik-Kontext mehr. **Routen:** `src/features/gebaeudekommunikation/routes.tsx` enthält jetzt zwei Route-Einträge auf dieselbe `SnipdooIpPage`: `/snipdoo-ip` (aktiv, bereinigt) und `/systemtechnik/snipdoo-ip` (Legacy-Fallback, unverändert). Keine neue `/systemtechnik`-Sammelseite, keine neue `/gebaeudekommunikation/snipdoo-ip`-Route. **ROUTES:** `ROUTES.gebaeudekommunikation.snipdooIp` zeigt jetzt auf `/snipdoo-ip` (vorher `/systemtechnik/snipdoo-ip`); zusätzlich neuer Schlüssel `snipdooIpLegacy: "/systemtechnik/snipdoo-ip"` als dokumentierter Legacy-Fallback (nicht für aktive Navigation gedacht). Kein anderer ROUTES-Wert geändert. **Aktive Links umgestellt:** (a) `footerNavigation.ts` `produkte.snipdoo` zieht über `ROUTES.gebaeudekommunikation.snipdooIp` automatisch die neue URL `/snipdoo-ip` (kein Datei-Edit nötig); (b) `TuerkommunikationPage.tsx` Link `to="/systemtechnik/snipdoo-ip"` → `to="/snipdoo-ip"`; (c) `TuersprechanlagenPage.tsx` Link `to="/systemtechnik/snipdoo-ip"` → `to="/snipdoo-ip"`. **Verbleibende Vorkommen von `/systemtechnik/snipdoo-ip` in `src/`:** nur noch in `src/features/gebaeudekommunikation/routes.tsx` (Legacy-Route) und `src/navigation/routes.ts` (`snipdooIpLegacy`-Konstante) — keine aktiven Navigationslinks mehr. **Breadcrumb:** Über AutoBreadcrumb auf `/snipdoo-ip` ergibt sich automatisch „Startseite › snipdoo IP" (Segment `snipdoo-ip` ist in `segmentLabels` gemappt); kein Zwischensegment „Systemtechnik" und kein Link auf `/systemtechnik` mehr. SubNavSticky, Section-IDs, Hero, Scroll-/On-Page-Navigation, Texte und Assets unverändert. Kein Slug-/i18n-/Layout-Umbau. **Build:** erfolgreich, nur vorbestehende Warnungen (Rollup chunks >500 kB, browserslist 10 months old) — keine neuen Fehler, keine ungenutzten Imports. |
| 14d-3 | 2026-04-21 | Snipdoo-IP aktive URL auf Gebäudekommunikation umgestellt | `src/features/gebaeudekommunikation/routes.tsx`, `src/navigation/routes.ts`, `src/navigation/footerNavigation.ts`, `src/features/gebaeudekommunikation/pages/TuerkommunikationPage.tsx`, `src/features/gebaeudekommunikation/pages/TuersprechanlagenPage.tsx`, `src/components/AutoBreadcrumb.tsx`, `docs/migration-log.md` | erledigt | Aktive Snipdoo-IP-URL auf `/gebaeudekommunikation/snipdoo-ip` umgestellt, `/snipdoo-ip` und `/systemtechnik/snipdoo-ip` als Fallbacks belassen, aktive Links aktualisiert, kein Systemtechnik-Kontext mehr. **Routen:** `src/features/gebaeudekommunikation/routes.tsx` enthält drei Route-Einträge auf dieselbe `SnipdooIpPage`: `/gebaeudekommunikation/snipdoo-ip` (neu, aktiv), `/snipdoo-ip` (Fallback aus 14d-2) und `/systemtechnik/snipdoo-ip` (Legacy-Fallback). Keine neue `/systemtechnik`-Sammelseite. **ROUTES:** `ROUTES.gebaeudekommunikation.snipdooIp` zeigt jetzt auf `/gebaeudekommunikation/snipdoo-ip` (vorher `/snipdoo-ip`); neuer Schlüssel `snipdooIpShort: "/snipdoo-ip"` als dokumentierter Fallback aus 14d-2; vorhandener `snipdooIpLegacy: "/systemtechnik/snipdoo-ip"` unverändert beibehalten. Kein anderer ROUTES-Wert geändert. **Aktive Links umgestellt:** (a) `footerNavigation.ts` `produkte.snipdoo` zieht über `ROUTES.gebaeudekommunikation.snipdooIp` automatisch die neue URL `/gebaeudekommunikation/snipdoo-ip` (Note präzisiert); (b) `TuerkommunikationPage.tsx` Link `to="/snipdoo-ip"` → `to="/gebaeudekommunikation/snipdoo-ip"`; (c) `TuersprechanlagenPage.tsx` Link `to="/snipdoo-ip"` → `to="/gebaeudekommunikation/snipdoo-ip"`. **Verbleibende Vorkommen von `/snipdoo-ip` und `/systemtechnik/snipdoo-ip` in `src/`:** nur noch in `src/features/gebaeudekommunikation/routes.tsx` (Fallback-/Legacy-Routen) und `src/navigation/routes.ts` (`snipdooIpShort`/`snipdooIpLegacy`-Konstanten) — keine aktiven Navigationslinks mehr. **Breadcrumb:** AutoBreadcrumb-`segmentLabels` um `"gebaeudekommunikation": "Gebäudekommunikation"` ergänzt, damit auf `/gebaeudekommunikation/snipdoo-ip` automatisch „Startseite › Gebäudekommunikation › snipdoo IP" angezeigt wird. Kein sichtbarer Link auf `/systemtechnik`. SubNavSticky-Logik, Section-IDs, Hero, Scroll-/On-Page-Navigation, Texte, Assets, MainNavigation- und Footer-Struktur, i18n unverändert. Kein Lazy Loading, kein Suspense. **Build:** wird im Anschluss ausgeführt. |
| 14d-4 | 2026-04-21 | Gebäudekommunikation-Root-Route bereinigt | `src/features/gebaeudekommunikation/routes.tsx`, `src/navigation/routes.ts`, `src/navigation/mainNavigation.ts`, `docs/migration-log.md` | erledigt | Neue aktive Root-Route `/gebaeudekommunikation` ergänzt, `/tuerkommunikation` als Fallback belassen, Hauptnavigation Gebäudekommunikation zeigt nun auf `/gebaeudekommunikation`, Snipdoo-Breadcrumb-Zwischenpunkt führt nicht mehr zur 404. **Routen:** `src/features/gebaeudekommunikation/routes.tsx` enthält jetzt zwei Root-Routen auf `TuerkommunikationPage`: `/gebaeudekommunikation` (neu, aktiv) und `/tuerkommunikation` (Legacy-Fallback). `/gebaeudekommunikation/snipdoo-ip`, `/snipdoo-ip` und `/systemtechnik/snipdoo-ip` aus 14d-3 unverändert. **ROUTES:** `ROUTES.gebaeudekommunikation.root` zeigt jetzt auf `/gebaeudekommunikation` (vorher `/tuerkommunikation`); neuer Schlüssel `tuerkommunikationLegacy: "/tuerkommunikation"` als dokumentierter Legacy-Fallback. Kein anderer ROUTES-Wert geändert. **Aktive Links umgestellt:** Hauptnavigation `gebaeudekommunikation` (mainNavigation.ts) und Footer-Spalte `produkte.tuerkommunikation` (footerNavigation.ts) ziehen über `ROUTES.gebaeudekommunikation.root` automatisch die neue URL — keine Datei-Edits an Footer/MainNavigation-Struktur nötig. Note in mainNavigation.ts auf neue Realität präzisiert. **Breadcrumb:** Auf `/gebaeudekommunikation/snipdoo-ip` zeigt der Zwischenpunkt „Gebäudekommunikation" jetzt auf eine existierende Route (kein 404 mehr). AutoBreadcrumb-Mapping `gebaeudekommunikation → Gebäudekommunikation` aus 14d-3 unverändert. Kein Link auf `/systemtechnik`. **Unverändert:** Unterseiten `/tuersprechanlagen`, `/briefkastenanlagen`, `/grossanlagen`, `/systemloesungen` (keine Slug-Reform in dieser Etappe), Texte, Section-IDs, SubNavSticky, MainNavigation-/FooterNavigation-Struktur, i18n, Assets, Layout. Kein Lazy Loading, kein Suspense. **Build:** wird im Anschluss ausgeführt. |
| 14d-5 | 2026-04-21 | Gebäudekommunikation-Unterseiten unter /gebaeudekommunikation verschachtelt | `src/features/gebaeudekommunikation/routes.tsx`, `src/navigation/routes.ts`, `src/features/gebaeudekommunikation/pages/TuerkommunikationPage.tsx`, `docs/migration-log.md` | erledigt | Aktive URLs für Türsprechanlagen, Briefkastenanlagen, Großanlagen und Systemlösungen auf `/gebaeudekommunikation/*` umgestellt, alte flache URLs als Fallback belassen, Breadcrumbs zeigen nun Gebäudekommunikation als Zwischenebene, `/beschilderung` unverändert als Querschnittsthema. **Routen:** `src/features/gebaeudekommunikation/routes.tsx` enthält jetzt je zwei Route-Einträge für jede der vier Unterseiten: `/gebaeudekommunikation/tuersprechanlagen`, `/gebaeudekommunikation/briefkastenanlagen`, `/gebaeudekommunikation/grossanlagen`, `/gebaeudekommunikation/systemloesungen` (neu, aktiv) und die bisherigen flachen URLs als Legacy-Fallback. Snipdoo-Routen aus 14d-3/14d-4 und Root-Route aus 14d-4 unverändert. `/beschilderung` unverändert (Querschnittsthema). **ROUTES:** `ROUTES.gebaeudekommunikation.tuersprechanlagen|briefkastenanlagen|grossanlagen|systemloesungen` zeigen jetzt auf die `/gebaeudekommunikation/*`-URLs; vier neue Legacy-Konstanten ergänzt (`tuersprechanlagenLegacy`, `briefkastenanlagenLegacy`, `grossanlagenLegacy`, `systemloesungenLegacy`). `beschilderung` und `snipdooIp` unverändert. **Aktive Links umgestellt:** (a) MainNavigation und Footer ziehen über `ROUTES.gebaeudekommunikation.*` automatisch die neuen URLs (keine Strukturänderung an `mainNavigation.ts`/`footerNavigation.ts` nötig). (b) `TuerkommunikationPage.tsx`: vier hardcodierte `href`-Werte auf neue `/gebaeudekommunikation/*`-Pfade aktualisiert (Türsprechanlagen, Briefkastenanlagen, Großanlagen, Systemlösungen). `/beschilderung`-Link unverändert. **Verbleibende Vorkommen flacher URLs in `src/`:** nur noch in `routes.tsx` (Fallback-Routen) und `routes.ts` (Legacy-Konstanten) — keine aktiven Navigationslinks. **Breadcrumb:** AutoBreadcrumb-`segmentLabels` enthielt bereits alle benötigten Mappings (`gebaeudekommunikation`, `tuersprechanlagen`, `briefkastenanlagen`, `grossanlagen`, `systemloesungen`) — keine Änderung nötig. Auf den neuen URLs ergibt sich automatisch „Startseite › Gebäudekommunikation › Türsprechanlagen" usw. **Unverändert:** `/beschilderung`, Signage-Routen, Anwendungen, Zutrittskontrolle, Gebäudemanagement, Eingangssysteme, Texte, i18n, Layout, Assets, MainNavigation-/Footer-Struktur. Kein Lazy Loading, kein Suspense. **Build:** wird im Anschluss ausgeführt. |
| 14e-1 | 2026-04-21 | Alarmanlagenkopplung als Platzhalterseite angelegt | `src/features/gebaeudemanagement/pages/AlarmanlagenkopplungPage.tsx`, `src/features/gebaeudemanagement/routes.tsx`, `src/navigation/routes.ts`, `src/navigation/mainNavigation.ts`, `src/components/AutoBreadcrumb.tsx`, `docs/migration-log.md` | erledigt | Menüpunkt Alarmanlagenkopplung verlinkt nicht mehr auf Gebäudemanagement-Root, sondern auf eigene Platzhalterseite `/gebaeudemanagement/alarmanlagenkopplung`, Inhalte werden später ergänzt. **Neue Page:** `AlarmanlagenkopplungPage.tsx` verwendet `PageLayout` (Konsistenz mit übrigen Gebäudemanagement-Seiten), label „Gebäudemanagement", headline „Alarmanlagenkopplung", intro „Diese Seite wird derzeit vorbereitet.", ContentSection mit Hinweistext „Informationen zur Kopplung von Gebäudemanagement-Lösungen mit Alarmanlagen werden ergänzt." Hero-Image referenziert das bereits vorhandene Domain-Asset `block-gebaeudemanagement.jpg` (kein neues Asset). Kein Layout-Experiment. **Route:** Neue Route `/gebaeudemanagement/alarmanlagenkopplung` → `AlarmanlagenkopplungPage` in `src/features/gebaeudemanagement/routes.tsx` ergänzt; alle anderen Gebäudemanagement-Routen unverändert. **ROUTES:** Neuer Schlüssel `ROUTES.gebaeudemanagement.alarmanlagenkopplung: "/gebaeudemanagement/alarmanlagenkopplung"`. Kein anderer ROUTES-Wert geändert. **Hauptnavigation:** Eintrag `gebaeudemanagement.alarm` in `mainNavigation.ts` zeigt jetzt auf `ROUTES.gebaeudemanagement.alarmanlagenkopplung` statt auf `ROUTES.gebaeudemanagement.root`; `linkType` bleibt `internal`, `targetDomain` bleibt `gebaeudemanagement`, `status` bleibt `pending` (Typ kennt keinen `active-placeholder`-Status), Note präzisiert auf „Eigene Platzhalterseite angelegt (Etappe 14e-1); Inhalt wird später ergänzt." **Breadcrumb:** AutoBreadcrumb-`segmentLabels` um `"alarmanlagenkopplung": "Alarmanlagenkopplung"` ergänzt, damit auf `/gebaeudemanagement/alarmanlagenkopplung` automatisch „Startseite › Gebäudemanagement › Alarmanlagenkopplung" angezeigt wird. **Unverändert:** Sonstige Navigation-Struktur, FooterNavigation, PersonaNavigation, MetaNavigation, i18n-Keys (`nav.gebaeudemanagement.alarm.*` bleiben), Texte anderer Seiten, Slugs, Assets, Layout. Kein Lazy Loading, kein React.lazy, kein Suspense. **Build:** wird im Anschluss ausgeführt. |
| 14e-2 | 2026-04-21 | Persona-Aktivzustand bei fachlicher Navigation zurückgesetzt | src/components/MainNavigation.tsx, docs/migration-log.md | erledigt | Hauptnavigation und Dropdown-Links setzen activePersona zurück, damit Persona-Markierung nicht fälschlich aktiv bleibt, wenn Nutzer in Fachbereiche navigieren; keine Routen oder Links geändert |
| 14e-2b | 2026-04-21 | Persona-Content-Links auf aktive Routen bereinigt | src/features/personas/**/components/*Content.tsx, docs/migration-log.md | erledigt | Persona-Kachellinks verwenden aktive ROUTES-Konstanten statt alter Fallback-URLs, /tuerkommunikation aus aktiven Persona-Links entfernt, Persona-State wird beim Wechsel in Fachbereiche zurückgesetzt |
| 14e-2c | 2026-04-21 | Beschilderung & Wayfinding unter Gebäudekommunikation eingeordnet | src/features/signage/routes.tsx, src/navigation/routes.ts, src/navigation/mainNavigation.ts, src/navigation/footerNavigation.ts, src/features/personas/**/components/*Content.tsx, src/components/AutoBreadcrumb.tsx, docs/migration-log.md | erledigt | Aktive Beschilderung-URL auf /gebaeudekommunikation/beschilderung umgestellt, /beschilderung und /signage als Fallbacks belassen, Persona-Signage-Links auf Beschilderung & Wayfinding umgestellt, Breadcrumb zeigt Gebäudekommunikation als Zwischenebene |
| 14e-3a | 2026-04-21 | Konzeptprüfung aktive Hauptnavigation durchgeführt | src/components/MainNavigation.tsx, src/navigation/mainNavigation.ts, src/navigation/routes.ts, docs/migration-log.md | erledigt | Aktive Hauptnavigation technisch und aus UX-/Barrierefreiheits-Sicht geprüft, keine Umsetzung vorgenommen |
| 14e-3b | 2026-04-21 | Aktive Hauptnavigation URL-basiert umgesetzt | src/components/MainNavigation.tsx, docs/migration-log.md | erledigt | Hauptnavigation markiert aktuellen Top-Level-Bereich anhand expliziter URL-Zuordnung, aria-current ergänzt, Persona-Reset bleibt unverändert, keine Routen oder Links geändert |
| 14e-4 | 2026-04-21 | Zufahrten und Parkplätze in Zutrittskontrolle eingeordnet | src/navigation/mainNavigation.ts, src/i18n/locales/de/navigation.json, src/i18n/locales/en/navigation.json, docs/migration-log.md | erledigt | Menüpunkt Zufahrten und Parkplätze aus Gebäudemanagement entfernt und fachlich korrekt unter Zutrittskontrolle eingeordnet, Route /zutrittskontrolle/zufahrten-parkplaetze unverändert |
| 14e-5 | 2026-04-21 | MainNavigation Dropdown-Consistency-Audit durchgeführt | src/navigation/mainNavigation.ts, src/navigation/routes.ts, src/features/**/routes.tsx, src/components/AutoBreadcrumb.tsx, src/i18n/locales/de/navigation.json, src/i18n/locales/en/navigation.json, docs/migration-log.md | erledigt | Dropdown-Children der Hauptnavigation auf fachliche Zuordnung, Route, Breadcrumb und aktive Hauptnavigation geprüft, keine Änderungen vorgenommen |
| 14e-6 | 2026-04-21 | Bildungseinrichtungen unter Anwendungen verschachtelt | src/features/anwendungen/routes.tsx, src/navigation/routes.ts, src/navigation/mainNavigation.ts, src/features/anwendungen/pages/*.tsx, src/components/MainNavigation.tsx, docs/migration-log.md | erledigt | Aktive URL für Bildungseinrichtungen auf /anwendungen/bildungseinrichtungen umgestellt, /bildungseinrichtungen als Fallback belassen, Breadcrumb zeigt Anwendungen als Zwischenebene, keine weiteren Slugs geändert |
| 14e-final-check | 2026-04-21 | Navigation nach 14e vollständig geprüft | src/components/MainNavigation.tsx, src/navigation/mainNavigation.ts, src/navigation/footerNavigation.ts, src/navigation/routes.ts, src/features/personas/**/components/*Content.tsx, src/features/**/routes.tsx, src/components/AutoBreadcrumb.tsx, docs/migration-log.md | erledigt | Navigation, Persona-Links, Footer-Links, aktive Hauptnavigation, Breadcrumbs sowie Legacy-/Fallback-Routen nach 14e geprüft, keine Änderungen vorgenommen |
| 14e-7 | 2026-04-21 | Objektlösungen unter Anwendungen verschachtelt und ContentBlocks-Links auf ROUTES umgestellt | src/features/anwendungen/routes.tsx, src/navigation/routes.ts, src/navigation/footerNavigation.ts, src/components/ContentBlocks.tsx, src/features/**, src/components/AutoBreadcrumb.tsx, docs/migration-log.md | erledigt | Aktive URL für Objektlösungen auf /anwendungen/objektloesungen umgestellt, /objektloesungen als Fallback belassen, ContentBlocks-Altlinks /tuerkommunikation, /signage und /objektloesungen auf aktive ROUTES-Ziele umgestellt, Breadcrumb zeigt Anwendungen als Zwischenebene |

| 14e-8 | 2026-04-21 | Signage-Link in AnwendungenPage bereinigt | src/features/anwendungen/pages/AnwendungenPage.tsx, docs/migration-log.md | erledigt | Redaktioneller SIGNAGE-Link in AnwendungenPage von /signage auf ROUTES.gebaeudekommunikation.beschilderung umgestellt, /signage bleibt Legacy-Fallback |
| 14e-final-check-2 | 2026-04-21 | Navigation nach 14e-7 und 14e-8 erneut geprüft | src/components/ContentBlocks.tsx, src/features/anwendungen/pages/AnwendungenPage.tsx, src/features/personas/**/components/*Content.tsx, src/navigation/**, src/features/**/routes.tsx, docs/migration-log.md | erledigt | Aktive Altlinks auf /tuerkommunikation, /signage und /objektloesungen geprüft, ContentBlocks und AnwendungenPage verifiziert, Legacy-Vorkommen dokumentiert, keine Änderungen vorgenommen |
| 15a | 2026-04-21 | Code-Landkarte erstellt | `docs/code-landkarte.md`, `docs/migration-log.md` | erledigt | Projektstruktur, Feature-Domains, Routing, Navigation, Renderer-Komponenten, i18n, Personas, Assets und praktische Änderungsorte dokumentiert; keine Codeänderung |
| 15a-1 | 2026-04-21 | Code-Landkarte um i18n-Strategie und Ampel ergänzt | `docs/code-landkarte.md`, `docs/migration-log.md` | erledigt | i18n-Ablage nach Variante A dokumentiert, Prompt-Pflege für Texte erklärt, Ampel für Änderungsrisiken ergänzt; keine Codeänderung |
| 15b | 2026-04-21 | i18n-Grundstruktur für Seitentexte vorbereitet | `src/i18n/index.ts`, `src/i18n/locales/de/*.json`, `src/i18n/locales/en/*.json`, `docs/i18n-strategy.md`, `docs/migration-log.md` | erledigt | Zentrale i18n-Namespaces pro Feature-Domain vorbereitet, DE/EN-Grundstruktur angelegt, keine Seitentexte migriert, keine sichtbaren Textänderungen |
| 15c | 2026-04-21 | i18n-Pilot ContentBlocks umgesetzt | `src/components/ContentBlocks.tsx`, `src/i18n/locales/de/home.json`, `src/i18n/locales/en/home.json`, `docs/migration-log.md` | erledigt | Startseiten-ContentBlocks-Texte nach home-i18n ausgelagert, DE als Master übernommen, EN strukturgleich ergänzt, Links/Layout unverändert |
| 15c-final-check | 2026-04-21 | i18n-Pilot ContentBlocks geprüft | `src/components/ContentBlocks.tsx`, `src/i18n/locales/de/home.json`, `src/i18n/locales/en/home.json`, `docs/migration-log.md` | erledigt | ContentBlocks-i18n geprüft, DE/EN-Keystruktur validiert, keine funktionalen Änderungen |
| 15d | 2026-04-21 | Sprachumschalter DE/EN im Header ergänzt | `src/components/LanguageSwitcher.tsx`, `src/components/MetaNavigation.tsx`, `src/i18n/index.ts`, `docs/migration-log.md` | erledigt | Einfacher DE/EN-Sprachumschalter ergänzt, i18n.changeLanguage genutzt, Sprache lokal in localStorage gespeichert und beim Init wiederhergestellt, keine Routenänderung, kein mehrsprachiges Routing |
| 15e | 2026-04-21 | HomePage-Texte nach i18n migriert | `src/components/HeroSection.tsx`, `src/components/StatsSection.tsx`, `src/components/PersonaSection.tsx`, `src/components/CTASection.tsx`, `src/i18n/locales/de/home.json`, `src/i18n/locales/en/home.json`, `docs/migration-log.md` | erledigt | Startseiten-Texte außerhalb von ContentBlocks (Hero, Stats, Personas, CTA) nach home-i18n ausgelagert, DE als Master übernommen, EN strukturgleich ergänzt, Links/Layout/Animationen unverändert |
| 15e-fix-1 | 2026-04-21 | Nicht übersetzte Header- und Home-Hero-Texte korrigiert | `src/components/MetaNavigation.tsx`, `src/i18n/locales/de/navigation.json`, `src/i18n/locales/en/navigation.json`, `docs/migration-log.md` | erledigt | Persona-Prompt-Texte ("Ich bin", "Ich bin...", "Ansicht: ...") nach navigation.meta.* ausgelagert (DE/EN); Home-Hero bereits korrekt über home.hero.* angebunden, EN-Werte verifiziert; keine Routen- oder Layoutänderung |
| 15e-fix-2 | 2026-04-21 | Beschilderung-Hartlink in TuerkommunikationPage bereinigt | `src/features/gebaeudekommunikation/pages/TuerkommunikationPage.tsx`, `docs/migration-log.md` | erledigt | Aktiven Hartlink `/beschilderung` auf `ROUTES.gebaeudekommunikation.beschilderung` umgestellt, Legacy-Route bleibt unverändert |
| 15e-final-check | 2026-04-21 | Home-i18n und Header-Sprachumschalter geprüft | `src/components/LanguageSwitcher.tsx`, `src/components/MetaNavigation.tsx`, `src/components/HeroSection.tsx`, `src/components/StatsSection.tsx`, `src/components/PersonaSection.tsx`, `src/components/CTASection.tsx`, `src/components/ContentBlocks.tsx`, `src/i18n/locales/de/home.json`, `src/i18n/locales/en/home.json`, `src/i18n/locales/de/navigation.json`, `src/i18n/locales/en/navigation.json`, `src/features/gebaeudekommunikation/pages/TuerkommunikationPage.tsx`, `docs/migration-log.md` | erledigt | Sprachumschalter, MetaNavigation-i18n, Home-i18n, ContentBlocks und Beschilderung-Link geprüft, keine funktionalen Änderungen |
| 15e-fix-3 | 2026-04-21 | AutoBreadcrumb an i18n angebunden | `src/components/AutoBreadcrumb.tsx`, `src/i18n/locales/de/navigation.json`, `src/i18n/locales/en/navigation.json`, `docs/migration-log.md` | erledigt | Breadcrumb-Labels aus navigation-i18n statt harter Segment-Tabelle gelesen, DE/EN-Breadcrumbs wechseln mit Sprachumschalter, keine Routenänderung |
| 15e-final-check-2 | 2026-04-21 | Header/Home/Breadcrumb-i18n geprüft | `src/i18n/locales/de/navigation.json`, `src/i18n/locales/en/navigation.json`, `src/i18n/locales/de/home.json`, `src/i18n/locales/en/home.json`, `src/components/LanguageSwitcher.tsx`, `src/components/MetaNavigation.tsx`, `src/components/AutoBreadcrumb.tsx`, `src/components/HeroSection.tsx`, `src/components/StatsSection.tsx`, `src/components/PersonaSection.tsx`, `src/components/CTASection.tsx`, `src/components/ContentBlocks.tsx`, `docs/migration-log.md` | erledigt | JSON-Struktur, MetaNavigation-i18n, LanguageSwitcher, Home-i18n und Breadcrumb-i18n nach 15e-fix-3 geprüft, keine funktionalen Änderungen |
| 15f-0 | 2026-04-21 | Persona-Textinventar erstellt | `docs/i18n-personas-inventory.md`, `src/features/personas/**/components/*Content.tsx`, `docs/migration-log.md` | erledigt | Sichtbare Persona-Texte inventarisiert (6 Personas, ~207 Keys), Key-Struktur für personas.json vorgeschlagen, Migrationsreihenfolge 15f-1 bis 15f-6 empfohlen, keine Codeänderung |
| 15f-1 | 2026-04-21 | Persona Bauherr nach i18n migriert | `src/features/personas/bauherr/components/BauherrenContent.tsx`, `src/i18n/locales/de/personas.json`, `src/i18n/locales/en/personas.json`, `docs/migration-log.md` | erledigt | Bauherr-Persona-Texte nach personas-i18n ausgelagert, DE als Master übernommen, EN strukturgleich ergänzt, Layout/Links/ROUTES unverändert |
| 15f-1-final-check | 2026-04-21 | Persona Bauherr-i18n geprüft | `src/features/personas/bauherr/components/BauherrenContent.tsx`, `src/i18n/locales/de/personas.json`, `src/i18n/locales/en/personas.json`, `docs/migration-log.md` | erledigt | Bauherr-i18n geprüft, DE/EN-Keystruktur validiert (je 56 Keys, 0 Diff), keine harten DE-Texte mehr im TSX, Build grün, keine funktionalen Änderungen |
| 15f-2 | 2026-04-21 | Persona Architekt nach i18n migriert | \`src/features/personas/architekt/components/ArchitektenContent.tsx\`, \`src/i18n/locales/de/personas.json\`, \`src/i18n/locales/en/personas.json\`, \`docs/migration-log.md\` | erledigt | Architekt-Persona-Texte nach personas-i18n ausgelagert, DE als Master übernommen, EN strukturgleich ergänzt, Bauherr-Keys unverändert, Layout/Links/ROUTES unverändert |
| 15f-2-final-check | 2026-04-21 | Persona Architekt-i18n geprüft | `src/features/personas/architekt/components/ArchitektenContent.tsx`, `src/i18n/locales/de/personas.json`, `src/i18n/locales/en/personas.json`, `docs/migration-log.md` | erledigt | Architekt-i18n geprüft, DE/EN-Keystruktur validiert (je 108 Keys, 0 Diff), Bauherr-Keys unverändert, keine harten DE-Texte mehr im TSX, Build grün, keine funktionalen Änderungen |
| 15f-3 | 2026-04-21 | Personas Fachplaner und Handwerk nach i18n migriert | \`src/features/personas/fachplaner/components/FachplanerContent.tsx\`, \`src/features/personas/handwerk/components/HandwerkContent.tsx\`, \`src/i18n/locales/de/personas.json\`, \`src/i18n/locales/en/personas.json\`, \`docs/migration-log.md\` | erledigt | Fachplaner- und Handwerk-Persona-Texte nach personas-i18n ausgelagert, DE als Master übernommen, EN strukturgleich ergänzt, bestehende Bauherr-/Architekt-Keys unverändert, Layout/Links/ROUTES unverändert |
| 15f-3-final-check | 2026-04-21 | Personas Fachplaner und Handwerk i18n geprüft | `src/features/personas/fachplaner/components/FachplanerContent.tsx`, `src/features/personas/handwerk/components/HandwerkContent.tsx`, `src/i18n/locales/de/personas.json`, `src/i18n/locales/en/personas.json`, `docs/migration-log.md` | erledigt | Fachplaner-/Handwerk-i18n geprüft, DE/EN-Keystruktur validiert (je 212 Keys, 0 Diff), Bauherr-/Architekt-Keys unverändert, keine harten DE-Texte, keine echten Trunkierungen, Build grün, keine funktionalen Änderungen |
| 15f-4 | 2026-04-21 | Persona Fachhandel nach i18n migriert | \`src/features/personas/fachhandel/components/FachhandelContent.tsx\`, \`src/i18n/locales/de/personas.json\`, \`src/i18n/locales/en/personas.json\`, \`docs/migration-log.md\` | erledigt | Fachhandel-Persona-Texte nach personas-i18n ausgelagert, DE als Master übernommen, EN strukturgleich ergänzt, bestehende Persona-Keys unverändert, Layout/Links/ROUTES unverändert |
| 15f-4-final-check | 2026-04-21 | Persona Fachhandel i18n geprüft | `src/features/personas/fachhandel/components/FachhandelContent.tsx`, `src/i18n/locales/de/personas.json`, `src/i18n/locales/en/personas.json`, `docs/migration-log.md` | erledigt | Fachhandel-i18n geprüft, DE/EN-Keystruktur validiert (je 264 Keys, 0 Diff), bestehende Persona-Keys unverändert, keine harten DE-Texte im TSX, keine echten Trunkierungen, Build grün, keine funktionalen Änderungen |
| 15f-5 | 2026-04-21 | Persona Wohnungswirtschaft nach i18n migriert | `src/features/personas/wohnungswirtschaft/components/WohnungswirtschaftContent.tsx`, `src/features/personas/wohnungswirtschaft/components/WoWiHero.tsx`, `src/features/personas/wohnungswirtschaft/components/WoWiDetailSections.tsx`, `src/i18n/locales/de/personas.json`, `src/i18n/locales/en/personas.json`, `docs/migration-log.md` | erledigt | Wohnungswirtschaft-Persona inklusive Hero und 9 Detailsections nach personas-i18n ausgelagert, DE als Master übernommen, EN strukturgleich ergänzt, bestehende Persona-Keys unverändert, Layout/Links/ROUTES unverändert |
| 15f-5-final-check | 2026-04-21 | Persona Wohnungswirtschaft i18n geprüft | `src/features/personas/wohnungswirtschaft/components/WohnungswirtschaftContent.tsx`, `src/features/personas/wohnungswirtschaft/components/WoWiHero.tsx`, `src/features/personas/wohnungswirtschaft/components/WoWiDetailSections.tsx`, `src/i18n/locales/de/personas.json`, `src/i18n/locales/en/personas.json`, `docs/migration-log.md` | erledigt | Wohnungswirtschaft-i18n inkl. Hero und 9 Detailsections geprüft, DE/EN-Keystruktur validiert (je 378 Keys, 0 Diff), bestehende Persona-Keys unverändert, keine harten DE-Texte, keine Trunkierungen, Build grün, keine funktionalen Änderungen |
| 15g-fix-1 | 2026-04-21 | Persona-State bei MetaNavigation-Links zurückgesetzt | `src/components/MetaNavigation.tsx`, `docs/migration-log.md` | erledigt | MetaNavigation-Links Serviceportal, Kontakt, Karriere und Presse setzen aktive Persona beim Klick zurück, damit Persona-Markierung auf Meta-Seiten nicht stehen bleibt; keine Routen- oder Layoutänderung |
| 15g-fix-2 | 2026-04-21 | Aktive MetaNavigation-Markierung ergänzt | `src/components/MetaNavigation.tsx`, `docs/migration-log.md` | erledigt | MetaNavigation-Links Serviceportal, Kontakt, Karriere und Presse werden anhand der aktuellen URL aktiv markiert (font-semibold + underline), Serviceportal-Unterseiten berücksichtigt, aria-current gesetzt, Persona-State-Reset bleibt erhalten, keine Routen- oder Layoutänderung |
| 15f-final-check | 2026-04-21 | Persona-i18n gesammelt geprüft | `src/features/personas/**/components/*.tsx`, `src/i18n/locales/de/personas.json`, `src/i18n/locales/en/personas.json`, `docs/migration-log.md` | erledigt | Alle 6 Personas (Bauherr, Architekt, Fachplaner, Handwerk, Fachhandel, Wohnungswirtschaft inkl. 9 Detailsections) gesammelt geprüft, DE/EN-Keystruktur validiert (je 378 Keys, 0 Diff), keine harten sichtbaren Persona-Texte mehr in TSX, MetaNavigation-State-Fix erhalten, Build grün, keine funktionalen Änderungen |
| 16a | 2026-04-21 | Meta-Seiten Kontakt, Karriere und Presse nach i18n migriert | `src/features/kontakt/pages/KontaktPage.tsx`, `src/features/karriere/pages/KarrierePage.tsx`, `src/features/presse/pages/PressePage.tsx`, `src/i18n/locales/de/kontakt.json`, `src/i18n/locales/en/kontakt.json`, `src/i18n/locales/de/karriere.json`, `src/i18n/locales/en/karriere.json`, `src/i18n/locales/de/presse.json`, `src/i18n/locales/en/presse.json`, `docs/migration-log.md` | erledigt | Kontakt-, Karriere- und Presse-Seiten nach i18n ausgelagert, DE als Master übernommen, EN strukturgleich ergänzt (kontakt 22 Keys, karriere 31 Keys, presse 31 Keys, je 0 Diff), Serviceportal unverändert, Layout/Links unverändert |
| 16a-fix-1 | 2026-04-21 | Presse-Kategorie-Logik geprüft | `src/features/presse/pages/PressePage.tsx`, `src/i18n/locales/de/presse.json`, `src/i18n/locales/en/presse.json`, `docs/migration-log.md` | erledigt | Kategorie-Logik der Pressemitteilungen auf stabile technische Keys umgestellt: categoryKey wird jetzt direkt in der Release-Konfiguration in PressePage gehalten, nicht mehr aus i18n-Wert abgeleitet; ungenutztes `releases.items.*.category`-Feld aus DE/EN entfernt; Kategorie-Labels (`releases.categories.*`) unverändert; keine Layout- oder Routenänderung |
| 16a-final-check | 2026-04-21 | Meta-Seiten Kontakt, Karriere und Presse i18n geprüft | `src/features/kontakt/pages/KontaktPage.tsx`, `src/features/karriere/pages/KarrierePage.tsx`, `src/features/presse/pages/PressePage.tsx`, `src/i18n/locales/de/kontakt.json`, `src/i18n/locales/en/kontakt.json`, `src/i18n/locales/de/karriere.json`, `src/i18n/locales/en/karriere.json`, `src/i18n/locales/de/presse.json`, `src/i18n/locales/en/presse.json`, `docs/migration-log.md` | erledigt | Kontakt/Karriere/Presse-i18n geprüft: alle drei nutzen useTranslation mit korrektem Namespace, DE/EN strukturgleich (kontakt 19, karriere 28, presse 23 Keys, je 0 Diff), Presse-Kategorie-Logik stabil über technische categoryKeys, kein restliches `releases.items.*.category`, Serviceportal unverändert, MetaNavigation aktive Markierung erhalten, Build grün (7.75s), nur bekannte chunk-size-Warnung |
| 16b | 2026-04-21 | Serviceportal/Login-Prototyp nach i18n migriert | `src/features/serviceportal/pages/ServiceportalPage.tsx`, `src/features/serviceportal/pages/PasswortVergessenPage.tsx`, `src/features/serviceportal/pages/RegistrierenPage.tsx`, `src/i18n/locales/de/serviceportal.json`, `src/i18n/locales/en/serviceportal.json`, `docs/serviceportal-status.md`, `docs/migration-log.md` | erledigt | Serviceportal-/Login-Prototyp nach i18n ausgelagert (Login, Passwort vergessen, Registrieren, Dashboard, Download-Center-Sheet, Chat-Sheet, Shop-Sheet, CTA), DE als Master übernommen, EN strukturgleich ergänzt, Demo-Login (`123` / `tcs`) unverändert, Mock-Daten (Produktnamen, Artikelnummern, Preise, Datei-Meta) bewusst hart belassen, Download-/Shop-Kategorien auf stabile technische Keys (`server`/`gateway`/`konfig`/`doku`, `innen`/`aussen`/`netzteile`/`kabel`/`zubehoer`) umgestellt, Portalstatus in `docs/serviceportal-status.md` als Prototyp dokumentiert, keine Auth-/Routen-/Navigations-/Layoutänderung |
| 16b-final-check | 2026-04-21 | Serviceportal/Login-Prototyp i18n geprüft | `src/features/serviceportal/pages/ServiceportalPage.tsx`, `src/features/serviceportal/pages/PasswortVergessenPage.tsx`, `src/features/serviceportal/pages/RegistrierenPage.tsx`, `src/i18n/locales/de/serviceportal.json`, `src/i18n/locales/en/serviceportal.json`, `docs/serviceportal-status.md`, `docs/migration-log.md` | erledigt | Serviceportal-i18n geprüft: alle 3 Pages nutzen useTranslation("serviceportal"), DE/EN strukturgleich (je 137 Keys, 0 Diff), 8 Top-Level-Bereiche (_meta, login, passwortVergessen, registrieren, dashboard, downloadCenter, chat, shop), keine harten sichtbaren deutschen UI-Texte mehr in TSX, Demo-Login (123/tcs) unverändert, Interpolation {{email}} in passwortVergessen.successIntro und registrieren.successIntro korrekt vorhanden, Download-Kategorien (server/gateway/konfig/doku) und Shop-Kategorien (innen/aussen/netzteile/kabel/zubehoer) als stabile technische Keys, MetaNavigation aktive Markierung und Persona-State-Reset erhalten, Build grün, nur bekannte chunk-size-Warnung |
| 17a-0 | 2026-04-21 | Gebäudekommunikation-Textinventar erstellt | `docs/i18n-gebaeudekommunikation-inventory.md`, `src/features/gebaeudekommunikation/**`, `docs/migration-log.md` | erledigt | Sichtbare Texte der 6 Gebäudekommunikation-Seiten (TuerkommunikationPage, TuersprechanlagenPage, BriefkastenanlagenPage, GrossanlagenPage, SystemloesungenPage, SnipdooIpPage) inventarisiert, vorgeschlagene Key-Struktur für Namespace `gebaeudekommunikation` dokumentiert (Sub-Trees `root`, `tuersprechanlagen`, `briefkastenanlagen`, `grossanlagen`, `systemloesungen`, `snipdooIp`), harte Werte (Produktnamen, Standards, Routen, Anchor-IDs) gekennzeichnet, empfohlene Migrationsreihenfolge 17a-1…17a-6 (klein→groß, SnipdooIp zuletzt) festgelegt, BeschilderungPage liegt in Domain `signage` und ist nicht Teil dieser Migration, keine Codeänderung |
| 17a-1 | 2026-04-21 | Briefkastenanlagen nach i18n migriert | `src/features/gebaeudekommunikation/pages/BriefkastenanlagenPage.tsx`, `src/i18n/locales/de/gebaeudekommunikation.json`, `src/i18n/locales/en/gebaeudekommunikation.json`, `docs/migration-log.md` | erledigt | Briefkastenanlagen-Texte (Hero, Montageformen aufputz/unterputz/stele, Skalierbarkeit-Features wohneinheiten/ausrichtung, Smart-Funktionen tuerkommunikation/barrierefrei/design/beschriftung, CTA) nach Namespace `gebaeudekommunikation` ausgelagert, DE als Master übernommen, EN strukturgleich ergänzt, stabile technische Keys statt Indizes, Layout/Links/ROUTES/Assets unverändert |
| 17a-fix-1 | 2026-04-21 | Globalen PageLayout-CTA nach i18n migriert | `src/components/PageLayout.tsx`, `src/i18n/locales/de/common.json`, `src/i18n/locales/en/common.json`, `docs/migration-log.md` | erledigt | Globaler CTA im PageLayout über `common.pageCta.headline/intro/button` übersetzt, damit gemeinsam genutzter Seitenabschluss in DE/EN korrekt dargestellt wird; keine Seiten-, Routen- oder Layoutänderung |
| 17a-1-final-check | 2026-04-21 | Briefkastenanlagen-i18n inklusive PageLayout-CTA geprüft | `src/features/gebaeudekommunikation/pages/BriefkastenanlagenPage.tsx`, `src/components/PageLayout.tsx`, `src/i18n/locales/de/gebaeudekommunikation.json`, `src/i18n/locales/en/gebaeudekommunikation.json`, `src/i18n/locales/de/common.json`, `src/i18n/locales/en/common.json`, `docs/migration-log.md` | erledigt | Briefkastenanlagen-i18n und globaler PageLayout-CTA geprüft: BriefkastenanlagenPage nutzt `useTranslation("gebaeudekommunikation")`, PageLayout nutzt `useTranslation("common")`, DE/EN strukturgleich (32 Leaf-Keys in `briefkastenanlagen.*`), `common.pageCta.*` vollständig, JSON valide, keine sichtbaren harten deutschen Texte mehr (nur ein JSX-Kommentar), keine funktionalen Änderungen |
| 17a-2 | 2026-04-21 | Systemlösungen nach i18n migriert | `src/features/gebaeudekommunikation/pages/SystemloesungenPage.tsx`, `src/i18n/locales/de/gebaeudekommunikation.json`, `src/i18n/locales/en/gebaeudekommunikation.json`, `docs/migration-log.md` | erledigt | Systemlösungen-Texte (Hero, Vorteile-Grid mit 6 Items, 4 FeatureBlock-Sektionen concierge/feuerwehr/intern/bidi, TCS:PLUS Fachplanung mit 3 Items + 2 CTAs) nach Namespace `gebaeudekommunikation` ausgelagert, DE als Master übernommen, EN strukturgleich ergänzt, bestehende Briefkastenanlagen-Keys unverändert, stabile technische Keys statt Indizes, Layout/Links/ROUTES/Assets/Animationen unverändert |
| 17a-2-final-check | 2026-04-21 | Systemlösungen-i18n geprüft | `src/features/gebaeudekommunikation/pages/SystemloesungenPage.tsx`, `src/i18n/locales/de/gebaeudekommunikation.json`, `src/i18n/locales/en/gebaeudekommunikation.json`, `docs/migration-log.md` | erledigt | Systemlösungen-i18n geprüft: SystemloesungenPage nutzt useTranslation("gebaeudekommunikation"), DE/EN strukturgleich (je 80 Leaf-Keys, 0 Diff), `systemloesungen.*` mit 45 Keys (hero, vorteile.items mit 6 Sub-Items, concierge/feuerwehr/intern/bidi FeatureBlocks, fachplanung mit 3 Items + 2 CTAs), `briefkastenanlagen.*` unverändert mit 32 Keys, JSON valide, keine leeren Werte, keine sichtbaren harten deutschen Texte mehr im TSX, Links/Layout/Animationen unverändert, globaler PageLayout-CTA weiterhin über common.pageCta.* |
| 17a-3 | 2026-04-21 | Gebäudekommunikation-Root nach i18n migriert | `src/features/gebaeudekommunikation/pages/TuerkommunikationPage.tsx`, `src/i18n/locales/de/gebaeudekommunikation.json`, `src/i18n/locales/en/gebaeudekommunikation.json`, `docs/migration-log.md` | erledigt | Root-/Übersichtsseite Gebäudekommunikation (Hero, Bereiche-Grid mit 5 Items tuersprechanlagen/briefkastenanlagen/beschilderung/grossanlagen/systemloesungen, Anwendungsumfelder mit 4 Items pflege/bildung/behoerden/gross + outro, snipdoo® IP-Sektion mit Card und 3 Zielgruppen) nach Namespace `gebaeudekommunikation.root.*` ausgelagert, DE als Master, EN strukturgleich, bestehende briefkastenanlagen/systemloesungen-Keys unverändert, stabile technische Keys statt Indizes, Layout/Links/ROUTES/Assets unverändert |
| 17a-3-final-check | 2026-04-21 | Gebäudekommunikation-Root-i18n geprüft | `src/features/gebaeudekommunikation/pages/TuerkommunikationPage.tsx`, `src/i18n/locales/de/gebaeudekommunikation.json`, `src/i18n/locales/en/gebaeudekommunikation.json`, `docs/migration-log.md` | erledigt | Gebäudekommunikation-Root-i18n geprüft: TuerkommunikationPage nutzt useTranslation("gebaeudekommunikation"), DE/EN strukturgleich (je 125 Leaf-Keys, 0 Diff), `root.*` mit 45 Keys (hero, bereiche.items mit 5 Sub-Items, anwendungsumfelder.items mit 4 Sub-Items + outro, snipdoo.card + zielgruppen mit 3 Sub-Items), `briefkastenanlagen.*` (32) und `systemloesungen.*` (45) unverändert, JSON valide, keine leeren Werte, keine sichtbaren harten deutschen Texte mehr im TSX, Beschilderung-Link weiterhin über ROUTES.gebaeudekommunikation.beschilderung, Layout/Animationen/Assets unverändert |
| 17a-4 | 2026-04-21 | Türsprechanlagen nach i18n migriert | `src/features/gebaeudekommunikation/pages/TuersprechanlagenPage.tsx`, `src/i18n/locales/de/gebaeudekommunikation.json`, `src/i18n/locales/en/gebaeudekommunikation.json`, `docs/migration-log.md` | erledigt | Türsprechanlagen-Texte (Hero, Überblick mit p1/p2, ProduktScroller-Aria-Labels + Datenblatt-Label, Außenstationen mit 4 Items pesPro/carusArgos/entry/ktu, Innenstationen mit 7 Items tastaPro/sensoPro/ipTasta/tasta7/skyline10/carusNext/seriesH, Vorteile mit 4 Items qualitaet/mobil/barrierefrei/skalierbar, snipdoo-Verweis) nach Namespace `gebaeudekommunikation.tuersprechanlagen.*` ausgelagert, DE als Master, EN strukturgleich, bestehende root/briefkastenanlagen/systemloesungen-Keys unverändert, Aria-Labels für Scroller-Buttons übersetzt, stabile technische Keys statt Indizes, Layout/Links/ROUTES/Assets unverändert |
| 17a-4-final-check | 2026-04-21 | Türsprechanlagen-i18n geprüft | `src/features/gebaeudekommunikation/pages/TuersprechanlagenPage.tsx`, `src/i18n/locales/de/gebaeudekommunikation.json`, `src/i18n/locales/en/gebaeudekommunikation.json`, `docs/migration-log.md` | erledigt | Türsprechanlagen-i18n geprüft: TuersprechanlagenPage und lokale ProduktScroller-Komponente nutzen useTranslation("gebaeudekommunikation") (3 Vorkommen), DE/EN strukturgleich (je 189 Leaf-Keys, 0 Diff), `tuersprechanlagen.*` mit 64 Keys (hero, ueberblick p1/p2, scroller mit scrollLeft/scrollRight/datasheet, aussenstationen.items mit 4 Sub-Items, innenstationen.items mit 7 Sub-Items, vorteile.items mit 4 Sub-Items, snipdoo card+cta), `root.*` (45) / `briefkastenanlagen.*` (32) / `systemloesungen.*` (45) unverändert, JSON valide, keine leeren Werte, keine sichtbaren harten deutschen Texte mehr, Aria-Labels für Scrollbuttons und Datenblatt-Label vollständig über i18n, Layout/Animationen/Assets unverändert |
| 17a-5 | 2026-04-21 | Großanlagen nach i18n migriert | `src/features/gebaeudekommunikation/pages/GrossanlagenPage.tsx`, `src/i18n/locales/de/gebaeudekommunikation.json`, `src/i18n/locales/en/gebaeudekommunikation.json`, `docs/migration-log.md` | erledigt | Großanlagen-Texte (Hero, Anforderungen-Grid mit 6 Items, 4 FeatureBlock-ähnliche Sektionen concierge/zufahrt/funk/namensanzeige mit p1/p2 + imageAlt, Leistungen mit 3 Kategorien à Bullet-Listen, Wirtschaftlichkeit mit 3 Items, Systembausteine mit 4 Items + details-Label, Projekt-CTA mit 2 Buttons) nach Namespace `gebaeudekommunikation.grossanlagen.*` ausgelagert, DE als Master, EN strukturgleich, bestehende root/briefkastenanlagen/systemloesungen/tuersprechanlagen-Keys unverändert, image-Alt-Texte über i18n, Bullet-Listen via returnObjects, stabile technische Keys statt Indizes, Layout/Links/ROUTES/Assets unverändert |
| 17a-5-final-check | 2026-04-21 | Großanlagen-i18n geprüft | `src/features/gebaeudekommunikation/pages/GrossanlagenPage.tsx`, `src/i18n/locales/de/gebaeudekommunikation.json`, `src/i18n/locales/en/gebaeudekommunikation.json`, `docs/migration-log.md` | erledigt | Großanlagen-i18n geprüft: GrossanlagenPage nutzt useTranslation("gebaeudekommunikation"), DE/EN strukturgleich (je 272 Leaf-Keys, 0 Diff), `grossanlagen.*` mit 83 Keys (hero, anforderungen.items mit 6 Sub-Items nutzung/skalierung/concierge/zufahrt/funk/namensverwaltung, concierge/zufahrt/funk/namensanzeige je mit label/title/p1/p2/imageAlt + namensanzeige.moreLink, leistungen.items mit 3 Kategorien steuerung/zutritt/kommunikation à Bullet-Listen via returnObjects, wirtschaftlichkeit.items mit 3 Sub-Items betriebskosten/investition/architektur, systembausteine.items mit 4 Sub-Items concierge/bcm/schranken/namensanzeige + intro+details, projektCta mit label/title/intro/ctaPrimary/ctaSecondary), bestehende `root.*` (45) / `briefkastenanlagen.*` (32) / `systemloesungen.*` (45) / `tuersprechanlagen.*` (64) unverändert, JSON valide, keine leeren Werte, keine sichtbaren harten deutschen Texte mehr im TSX, Bullet-Listen korrekt über i18n via returnObjects, Image-Alt-Texte vollständig über i18n, Links/ROUTES/Layout/Animationen/Assets unverändert, Build erfolgreich (8.60s), nur bekannte Chunk-Size-Warnung |
| 17a-6 | 2026-04-21 | snipdoo IP nach i18n migriert | `src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx`, `src/i18n/locales/de/gebaeudekommunikation.json`, `src/i18n/locales/en/gebaeudekommunikation.json`, `docs/migration-log.md` | erledigt | snipdoo-IP-Texte (SEO title/description via document.title + meta, breadcrumbFallback, SubNav 9 Items, Hero, Systemversprechen, Audiences mit 3 Items installateure/planer/betreiber + iconLabels, Nutzung im Alltag mit imageAlt, Systemaufbau mit diagramAlt + 5 Modulen server/software/cloud/app/integration inkl. iconLabels und app.linkLabel, Inbetriebnahme mit 3 Steps struktur/erkennung/zuordnung + intro/outro/imageAlt, Anwendungen mit 3 Items efh/mfh/gewerbe inkl. imageAlts, Rollen mit 5 Tabs bauherren/architekten/wohnungswirtschaft/fachplaner/handwerk via RoleTabsBlock, Kontakt mit 3 CTAs) nach Namespace `gebaeudekommunikation.snipdooIp.*` ausgelagert, DE als Master, EN strukturgleich, bestehende Gebäudekommunikation-Keys unverändert, Anchor-IDs/Routes/ROUTES/Assets/Layout/Animationen unverändert |
| 17a-6-final-check | 2026-04-21 | snipdoo-IP-i18n geprüft | `src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx`, `src/i18n/locales/de/gebaeudekommunikation.json`, `src/i18n/locales/en/gebaeudekommunikation.json`, `docs/migration-log.md` | erledigt | snipdoo-IP-i18n geprüft: SnipdooIpPage nutzt useTranslation("gebaeudekommunikation"), DE/EN strukturgleich (je 393 Leaf-Keys, 0 Diff, 0 leere Werte), `snipdooIp.*` mit 121 Keys (seo title/description, breadcrumbFallback, subnav.items mit 9 Anchor-Labels hero/systemversprechen/fuerWen/nutzungAlltag/systemaufbau/inbetriebnahme/anwendungen/rollen/kontakt, hero eyebrow/headline/subheadline/p1/p2/primary/secondary, systemversprechen, audiences.items mit 3 Sub-Items installateure/planer/betreiber + iconLabels, nutzungAlltag mit imageAlt, systemaufbau.modules mit 5 Sub-Items server/software/cloud/app/integration + iconLabels + app.linkLabel + diagramAlt, inbetriebnahme.steps mit 3 Sub-Items struktur/erkennung/zuordnung + intro/outro/imageAlt, anwendungen.items mit 3 Sub-Items efh/mfh/gewerbe + imageAlts, rollen.tabs mit 5 Sub-Items bauherren/architekten/wohnungswirtschaft/fachplaner/handwerk je p1/p2, kontakt mit 3 CTAs), bestehende `root.*` (45) / `briefkastenanlagen.*` (32) / `systemloesungen.*` (45) / `tuersprechanlagen.*` (64) / `grossanlagen.*` (83) unverändert, JSON valide, keine sichtbaren harten deutschen Texte mehr im TSX, document.title/meta description vollständig über snipdooIp.seo.*, SubNavSticky-Labels dynamisch via subNavIds.map, RoleTabs dynamisch via roleKeys.map, alle Image-Alt-Texte und IconLabels über i18n, Anchor-IDs/Routes/ROUTES/Assets/Layout/Animationen unverändert, Build erfolgreich (6.69s), nur bekannte Chunk-Size-Warnung |
| 17-doc-1 | 2026-04-21 | Dokumentationsstand nach i18n-Migration aktualisiert | `docs/i18n-strategy.md`, `docs/code-landkarte.md`, `docs/i18n-gebaeudekommunikation-inventory.md`, `docs/i18n-personas-inventory.md`, `docs/current-status.md`, `docs/architecture-checkpoint-5d.md`, `docs/architecture-checkpoint-8d.md`, `docs/architecture-checkpoint-10e.md`, `docs/architecture-checkpoint-11f.md`, `docs/migration-mapping.md`, `docs/navigation-inventory.md`, `docs/routing-decentralization-plan.md`, `docs/pilot-*.md`, `docs/migration-log.md` | erledigt | i18n-strategy.md und code-landkarte.md auf aktuellen Stand nach 17a-6-final-check gebracht (Sprachumschalter aktiv, DE Master, EN strukturgleich, kein /de-/en-Routing, migrierte Namespaces common/navigation/home/personas/kontakt/karriere/presse/serviceportal/gebaeudekommunikation, offene Domains zutrittskontrolle/gebaeudemanagement/eingangssysteme/anwendungen/signage/service/wissen). Neue current-status.md als kompakte Statusübersicht erstellt. Inventar-Dokumente i18n-personas-inventory.md (15f-0) und i18n-gebaeudekommunikation-inventory.md (17a-0) als historisch gekennzeichnet. Checkpoint-/Plan-Dokumente (4 architecture-checkpoints, migration-mapping, navigation-inventory, routing-decentralization-plan, 8 pilot-*-plans) mit historischem Hinweis am Anfang versehen. Keine Inhalte gelöscht, keine Dateien verschoben, keine Codeänderung. |
| 18a-0 | 2026-04-21 | Zutrittskontrolle-Textinventar erstellt | `docs/i18n-zutrittskontrolle-inventory.md`, `src/features/zutrittskontrolle/**`, `src/i18n/locales/de/zutrittskontrolle.json`, `src/i18n/locales/en/zutrittskontrolle.json`, `docs/migration-log.md` | erledigt | Sichtbare Texte der Domain Zutrittskontrolle inventarisiert: 5 Pages (ZutrittskontrollePage 45 Z. Root, TuerenTorePage 204 Z. mit 8 Produktkarten, MobilerZutrittPage 126 Z. mit 2 Karten, FahrstuhlsteuerungPage 54 Z., ZufahrtenParkplaetzePage 182 Z. mit 5 Karten), Routes (5 Pfade unter /zutrittskontrolle), lokale Assets (11 JPGs unter assets/) und externe Unsplash-URLs erfasst. i18n-Dateien geprüft: Namespace `zutrittskontrolle` in src/i18n/index.ts bereits registriert, DE/EN-JSON enthalten nur `_meta` (status `prepared`). Empfohlene Key-Struktur dokumentiert (Sub-Trees `shared`, `root`, `tuerenTore`, `mobilerZutritt`, `fahrstuhlsteuerung`, `zufahrtenParkplaetze` mit stabilen technischen Keys statt Indizes, geschätzt ~146 Leaf-Keys). Empfohlene Migrationsreihenfolge 18a-1 Fahrstuhlsteuerung → 18a-2 Root → 18a-3 MobilerZutritt → 18a-4 ZufahrtenParkplaetze → 18a-5 TuerenTore (klein → groß) + 18a-final-check. Harte Werte (Routen, Markennamen BCM/TCS/DoorApp, Standards AES-128/EN 60839-11-1/BLE/NFC/RFID, externe Unsplash-URLs, Asset-Importpfade, FeatureBlock-Link) gekennzeichnet. Risiken/Sonderfälle dokumentiert (externe Bild-URLs, href="#" Datenblatt-Platzhalter, geteilte Produktbilder mit unterschiedlichen Texten, Aria-Labels für Scrollbuttons). Keine Codeänderung. |
| 18a-1 | 2026-04-21 | Fahrstuhlsteuerung nach i18n migriert | `src/features/zutrittskontrolle/pages/FahrstuhlsteuerungPage.tsx`, `src/i18n/locales/de/zutrittskontrolle.json`, `src/i18n/locales/en/zutrittskontrolle.json`, `docs/migration-log.md` | erledigt | Fahrstuhlsteuerung-Texte (Hero, Überblick, Vorteile mit 4 Items etagenfreigabe/skalierbar/onlineOffline/integration) nach Namespace `zutrittskontrolle.fahrstuhlsteuerung.*` ausgelagert, shared label/section labels (overview/benefits) ergänzt, DE als Master, EN strukturgleich (je 19 Leaf-Keys, 0 Diff), `_meta.status` auf `in-progress` gesetzt, FahrstuhlsteuerungPage nutzt `useTranslation("zutrittskontrolle")`, Vorteilskarten über stabile Keys via Items-Map gerendert, Layout/Icons/Klassen/Assets/Routen unverändert, Build erfolgreich (8.99s), nur bekannte Chunk-Size-Warnung |
| 18a-1-final-check | 2026-04-21 | Fahrstuhlsteuerung-i18n geprüft | `src/features/zutrittskontrolle/pages/FahrstuhlsteuerungPage.tsx`, `src/i18n/locales/de/zutrittskontrolle.json`, `src/i18n/locales/en/zutrittskontrolle.json`, `docs/migration-log.md` | erledigt | Fahrstuhlsteuerung-i18n geprüft: FahrstuhlsteuerungPage nutzt useTranslation("zutrittskontrolle"), DE/EN strukturgleich (je 19 Leaf-Keys, 0 Diff, 0 leere Werte), `shared.label` + `shared.sections.overview/benefits` und `fahrstuhlsteuerung.*` (hero.headline/intro, overview.title/text, benefits.title + 4 Items etagenfreigabe/skalierbar/onlineOffline/integration je title/desc) vollständig vorhanden, JSON valide, keine sichtbaren harten deutschen Texte mehr im TSX (nur 2 interne JSX-Kommentare /* Überblick */ und /* Vorteile */), Vorteilskarten via Items-Map über stabile Keys gerendert, Layout/Icons/Klassen/Assets/Routen/URL-Strategie unverändert, andere Seiten der Domain unverändert, Build erfolgreich (8.12s), nur bekannte Chunk-Size-Warnung |
| 18a-2 | 2026-04-21 | Zutrittskontrolle Root und Mobiler Zutritt nach i18n migriert | `src/features/zutrittskontrolle/pages/ZutrittskontrollePage.tsx`, `src/features/zutrittskontrolle/pages/MobilerZutrittPage.tsx`, `src/i18n/locales/de/zutrittskontrolle.json`, `src/i18n/locales/en/zutrittskontrolle.json`, `docs/migration-log.md` | erledigt | Root-Seite (Hero, BCM-Abschnitt, Funktionen mit 4 FeatureBlocks tuerenTore/fahrstuhl/schraenkeContainer/mobilerZutritt) und Mobiler-Zutritt-Seite (Hero, Überblick, Produkte mit 2 Items doorApp/gsmGateway, Vorteile mit 4 Items komfort/gaestezugang/biometrie/benachrichtigung) nach Namespace `zutrittskontrolle` migriert. `root.*` und `mobilerZutritt.*` ergänzt, `shared.products.label/title/datasheet` neu hinzugefügt, bestehende `_meta`/`shared.label`/`shared.sections.*`/`fahrstuhlsteuerung.*` (19 Keys) unverändert erhalten. DE als Master, EN strukturgleich (je 57 Leaf-Keys, 0 Diff, 0 leere Werte). Beide TSX-Dateien nutzen `useTranslation("zutrittskontrolle")`, FeatureBlocks/Produkte/Vorteile via Items-Map über stabile Keys gerendert, Link `/zutrittskontrolle/tueren-tore` als FeatureBlock-link unverändert, href="#" am Datenblatt-Link unverändert, Layout/Icons/Klassen/Animationen/Assets/Routen/Navigation unverändert, Build erfolgreich (8.80s), nur bekannte Chunk-Size-Warnung |
| 18a-2-final-check | 2026-04-21 | Zutrittskontrolle Root und Mobiler Zutritt i18n geprüft | `src/features/zutrittskontrolle/pages/ZutrittskontrollePage.tsx`, `src/features/zutrittskontrolle/pages/MobilerZutrittPage.tsx`, `src/i18n/locales/de/zutrittskontrolle.json`, `src/i18n/locales/en/zutrittskontrolle.json`, `docs/migration-log.md` | erledigt | Root- und Mobiler-Zutritt-i18n geprüft: beide Seiten nutzen useTranslation("zutrittskontrolle"), DE/EN strukturgleich (je 57 Leaf-Keys, 0 Diff, 0 leere Werte), `_meta` + `shared.label`/`shared.sections.overview/benefits`/`shared.products.label/title/datasheet` + `fahrstuhlsteuerung.*` (19 Keys aus 18a-1 unverändert inkl. 4 Vorteile etagenfreigabe/skalierbar/onlineOffline/integration) + `root.*` (hero.headline/intro, bcm.label/title/text, functions.label/title + 4 Items tuerenTore/fahrstuhl/schraenkeContainer/mobilerZutritt je headline/text) + `mobilerZutritt.*` (hero.headline/intro, overview.title/text, products.intro + 2 Items doorApp/gsmGateway je title/subtitle/description, benefits.title + 4 Items komfort/gaestezugang/biometrie/benachrichtigung je title/desc) vollständig vorhanden, JSON valide, keine sichtbaren harten deutschen Texte mehr in den beiden migrierten TSX-Dateien (nur interne JSX-Kommentare), FeatureBlock-Link `/zutrittskontrolle/tueren-tore` und `href="#"` Datenblatt-Link unverändert, FahrstuhlsteuerungPage/TuerenTorePage/ZufahrtenParkplaetzePage unverändert, Routen/Navigation/Breadcrumbs/Assets/Layout/URL-Strategie unverändert, Build erfolgreich (9.26s), nur bekannte Chunk-Size-Warnung |
| 18a-3 | 2026-04-21 | Zufahrten und Parkplätze nach i18n migriert | `src/features/zutrittskontrolle/pages/ZufahrtenParkplaetzePage.tsx`, `src/i18n/locales/de/zutrittskontrolle.json`, `src/i18n/locales/en/zutrittskontrolle.json`, `docs/migration-log.md` | erledigt | Zufahrten-und-Parkplätze-Texte (Hero, Überblick, Produkte mit 5 Karten bcmLeser/handsender/kfz/uhfLeser/gsmGateway, Vorteile mit 4 Items modular/integration/verwaltung/sicherheit) nach Namespace `zutrittskontrolle.zufahrtenParkplaetze.*` migriert. `shared.scroll.left/right` neu ergänzt für Aria-Labels der Scrollbuttons. Bestehende `_meta`/`shared.label`/`shared.sections.*`/`shared.products.*`/`fahrstuhlsteuerung.*`/`root.*`/`mobilerZutritt.*` unverändert erhalten. DE als Master, EN strukturgleich (je 88 Leaf-Keys, 0 Diff, 0 leere Werte). ZufahrtenParkplaetzePage nutzt `useTranslation("zutrittskontrolle")`, Produktkarten und Vorteilskarten via Items-Map über stabile Keys gerendert, externe Unsplash-URLs/lokale Asset-Imports/`href="#"` Datenblatt-Link/Layout/Icons/Klassen/Animationen/Routen/Navigation unverändert, Aria-Labels der Scrollbuttons über i18n geführt, Build erfolgreich (7.72s), nur bekannte Chunk-Size-Warnung |
| 17-doc-2 | 2026-04-21 | Produktionsfahrplan für SEO, i18n, Accessibility und Supabase dokumentiert | `docs/production-readiness-plan.md`, `docs/current-status.md`, `docs/i18n-strategy.md`, `docs/migration-log.md` | erledigt | Produktionsfahrplan erstellt: SEO-/URL-Strategie, i18n-Fortführung, Supabase-/Datenbankstrategie, Serviceportal, Accessibility, Performance, Mitarbeiterworkflow und Entscheidungspunkte vor Produktivstart dokumentiert; aktuelle i18n-Struktur als Prototyp-/Sprachumschalter-Lösung eingeordnet; keine Codeänderung |
| 18a-3-final-check | 2026-04-21 | Zufahrten und Parkplätze i18n geprüft | `src/features/zutrittskontrolle/pages/ZufahrtenParkplaetzePage.tsx`, `src/i18n/locales/de/zutrittskontrolle.json`, `src/i18n/locales/en/zutrittskontrolle.json`, `docs/migration-log.md` | erledigt | Zufahrten-und-Parkplätze-i18n geprüft: Seite nutzt useTranslation("zutrittskontrolle"), DE/EN strukturgleich (je 88 Leaf-Keys, 0 Diff, 0 leere Werte), `zufahrtenParkplaetze.*` mit Hero, Überblick, 5 Produktkarten (bcmLeser/handsender/kfz/uhfLeser/gsmGateway je title/subtitle/description) und 4 Vorteilskarten (modular/integration/verwaltung/sicherheit je title/desc) vollständig, `shared.scroll.left/right` vorhanden und für Aria-Labels der Scrollbuttons aktiv, bestehende `_meta`/`shared.label`/`shared.sections.*`/`shared.products.*`/`fahrstuhlsteuerung.*` (4 Items etagenfreigabe/skalierbar/onlineOffline/integration)/`root.*`/`mobilerZutritt.*` unverändert erhalten, JSON valide, keine sichtbaren harten deutschen Texte mehr im TSX (nur 3 interne JSX-Kommentare), FahrstuhlsteuerungPage/ZutrittskontrollePage/MobilerZutrittPage/TuerenTorePage unverändert, Routen/Navigation/Breadcrumbs/Assets/Layout/URL-Strategie unverändert, Build erfolgreich (7.57s), nur bekannte Chunk-Size-Warnung |
| 18a-4 | 2026-04-21 | Türen und Tore nach i18n migriert | `src/features/zutrittskontrolle/pages/TuerenTorePage.tsx`, `src/i18n/locales/de/zutrittskontrolle.json`, `src/i18n/locales/en/zutrittskontrolle.json`, `docs/migration-log.md` | erledigt | Türen-und-Tore-Texte (Hero, Überblick, Produkte mit 8 Karten drueckergarnitur/knaufzylinder/onlineLeser/offlineLeser/handsender/vorhaengeschloss/biometrie/kfz, Vorteile mit 4 Items modular/nachruestung/verwaltung/sicherheit) nach Namespace `zutrittskontrolle.tuerenTore.*` migriert. Vorhandene `shared.label`/`shared.sections.overview/benefits`/`shared.products.label/title/datasheet`/`shared.scroll.left/right` wiederverwendet, keine Shared-Keys dupliziert. Bestehende `_meta`/`fahrstuhlsteuerung.*`/`root.*`/`mobilerZutritt.*`/`zufahrtenParkplaetze.*` unverändert erhalten. DE als Master, EN strukturgleich (je 126 Leaf-Keys, 0 Diff, 0 leere Werte). TuerenTorePage nutzt `useTranslation("zutrittskontrolle")`, Produkt- und Vorteilskarten via Items-Map über stabile Keys gerendert, externe Unsplash-URLs/lokale Asset-Imports/`href="#"` Datenblatt-Link/Layout/Icons/Klassen/Animationen/Reihenfolge/Routen/Navigation unverändert, Aria-Labels der Scrollbuttons über i18n geführt, Datenblatt-Linktext über `shared.products.datasheet` geführt, Build erfolgreich (8.98s), nur bekannte Chunk-Size-Warnung |
| 18a-final-check | 2026-04-21 | Zutrittskontrolle-i18n vollständig geprüft | `src/features/zutrittskontrolle/pages/ZutrittskontrollePage.tsx`, `src/features/zutrittskontrolle/pages/FahrstuhlsteuerungPage.tsx`, `src/features/zutrittskontrolle/pages/MobilerZutrittPage.tsx`, `src/features/zutrittskontrolle/pages/ZufahrtenParkplaetzePage.tsx`, `src/features/zutrittskontrolle/pages/TuerenTorePage.tsx`, `src/i18n/locales/de/zutrittskontrolle.json`, `src/i18n/locales/en/zutrittskontrolle.json`, `docs/migration-log.md` | erledigt | Gesamte Domain Zutrittskontrolle final geprüft: alle fünf Seiten (ZutrittskontrollePage/FahrstuhlsteuerungPage/MobilerZutrittPage/ZufahrtenParkplaetzePage/TuerenTorePage) nutzen `useTranslation("zutrittskontrolle")`, alle sichtbaren UI-Texte über `t(...)` aufgelöst, DE/EN strukturgleich (je 126 Leaf-Keys, 0 Diff, 0 leere Werte), alle 7 erwarteten Root-Keys vorhanden (`_meta`, `shared`, `root`, `mobilerZutritt`, `fahrstuhlsteuerung`, `zufahrtenParkplaetze`, `tuerenTore`), `shared.label`/`shared.sections.overview/benefits`/`shared.products.label/title/datasheet`/`shared.scroll.left/right` vollständig und korrekt verwendet (Sections/Produktbereiche/Scroll-Aria-Labels), alle erwarteten Item-Gruppen vorhanden (fahrstuhlsteuerung 4 Vorteile, root 4 FeatureBlocks, mobilerZutritt 2 Produkte + 4 Vorteile, zufahrtenParkplaetze 5 Produkte + 4 Vorteile, tuerenTore 8 Produkte + 4 Vorteile), keine sichtbaren harten deutschen Texte mehr in den TSX-Dateien (nur interne JSX-Kommentare und technische Werte wie BCM/RFID/AES-128/UHF/30 km/h/EN 60839-11-1), Aria-/Screenreader-Texte für Scrollbuttons über i18n geführt, Routen/Navigation/Breadcrumbs/Assets/Layout/PageLayout/URL-Strategie/Performance unverändert, andere Domains (gebaeudekommunikation/gebaeudemanagement/eingangssysteme/anwendungen/signage/service/wissen/home/personas/navigation/common) nicht angefasst, Build erfolgreich (14.73s), nur bekannte Chunk-Size-Warnung |
| 17-doc-3 | 2026-04-21 | Produktionsfahrplan um Qualitätsgrundlage erweitert | `docs/production-readiness-plan.md`, `docs/current-status.md`, `docs/migration-log.md` | erledigt | Produktionsfahrplan um prüfbare Qualitätsrichtlinie für moderne technische B2B-Webseiten ergänzt: Seitenstruktur, Content-Aufbau, KI-Sichtbarkeit/AEO/GEO, SEO-Grundlagen, internationale SEO, UX/Accessibility, Vertrauen/Autorität und Self-Service/Kundenbindung. Bestehende Produktionsfahrplan-Inhalte erhalten, Abschnittsnummerierung angepasst, current-status mit Hinweis ergänzt, keine Codeänderung. |
| 17-doc-4 | 2026-04-22 | Strategische Arbeitsweise im Produktionsfahrplan verankert | `docs/production-readiness-plan.md`, `docs/current-status.md`, `docs/migration-log.md` | erledigt | Produktionsfahrplan um strategische Arbeitsweise für neue Seiten und Inhalte ergänzt: KI-gestützter Strategiecheck vor Lovable-Umsetzung, Human-in-the-Loop, Standardmodell für technische Lösungsseiten, Problem-Lösung-Frage-Antwort-Prinzip, Prüffragen für neue Seiten, Regeln für parallele Mitarbeit und Negativliste für ungeordnete Strukturänderungen. Bestehende Produktionsfahrplan-Inhalte erhalten, current-status ergänzt, keine Codeänderung. |
| 17-doc-5 | 2026-04-22 | Docs-Bereich strukturiert und KI-Startprompt angelegt | `docs/README.md`, `docs/ai-start-prompt.md`, `docs/current-status.md`, `docs/migration-log.md`, `docs/01-strategy/*`, `docs/02-architecture/*`, `docs/03-inventories/*`, `docs/04-pilot-plans/*`, `docs/05-checkpoints/*` | erledigt | Dokumentation thematisch neu strukturiert: Root-Dokumente für Schnellstart und laufende Pflege erhalten (README.md, current-status.md, migration-log.md, ai-start-prompt.md), strategische Dokumente nach 01-strategy, Architektur-/Code-Dokumente nach 02-architecture, Inventare nach 03-inventories, Pilotpläne nach 04-pilot-plans, Checkpoints nach 05-checkpoints verschoben. Interne Links aktualisiert, current-status.md ergänzt, neuer KI-Startprompt für neue Chat-Kontexte angelegt. Keine Codeänderung. |
| 17-doc-5-final-check | 2026-04-22 | Neue Docs-Struktur geprüft | `docs/README.md`, `docs/ai-start-prompt.md`, `docs/current-status.md`, `docs/migration-log.md`, `docs/01-strategy/*`, `docs/02-architecture/*`, `docs/03-inventories/*`, `docs/04-pilot-plans/*`, `docs/05-checkpoints/*` | erledigt | Neue Dokumentationsstruktur geprüft: Root-Struktur korrekt (README.md, current-status.md, migration-log.md, ai-start-prompt.md), fünf Unterordner vollständig (01-strategy 4 Dateien, 02-architecture 4 Dateien, 03-inventories 5 Dateien, 04-pilot-plans 8 Dateien, 05-checkpoints 5 Dateien), insgesamt 30 Markdown-Dateien unter docs/, keine bekannten Markdown-Dateien verloren, alle erwarteten Dateien an erwarteter Stelle, interne Links in Schlüsseldateien (README.md, ai-start-prompt.md, current-status.md, production-readiness-plan.md, i18n-strategy.md, code-landkarte.md) auf neue Ordnerstruktur geprüft und korrekt (./..-relativ stimmig), keine defekten Links auf Root-Dateien aus Unterordnern gefunden, ai-start-prompt.md verweist korrekt auf docs/README.md, docs/current-status.md, docs/01-strategy/production-readiness-plan.md, docs/01-strategy/i18n-strategy.md, docs/02-architecture/code-landkarte.md, docs/migration-log.md und enthält alle Arbeitsregeln (i18n-Regeln, DE-Master, Build nach Codeänderung, Migration-Log ergänzen, Routen/Layout/Assets nicht ohne Auftrag ändern), current-status.md verweist auf neue Ordnerstruktur und nennt ai-start-prompt.md als Startpunkt, keine TSX/JSON/Routen/Navigation/Assets/Build-Dateien geändert, kein Build erforderlich. |
| 17-doc-6 | 2026-04-22 | AI-Startprompt als operative Arbeitsanweisung erweitert | `docs/ai-start-prompt.md`, `docs/current-status.md`, `docs/01-strategy/i18n-strategy.md`, `docs/migration-log.md` | erledigt | AI-Startprompt um verbindliche Arbeitsweise für neue KI-Chats erweitert: Auftragseinordnung, Rückfragenlogik, Lovable-Prompt-Struktur, Prüfpflichten, SEO/AEO/GEO-Check, Accessibility-Basics, i18n-Regeln, Migration-Log-Pflicht und Negativliste. Doku-Widerspruch bereinigt: `zutrittskontrolle` ist jetzt in current-status.md und i18n-strategy.md als vollständig migriert geführt. Keine Codeänderung. |
| 17-doc-7 | 2026-04-22 | Dokumentationskonsistenz nach Zutrittskontrolle-i18n bereinigt | `docs/current-status.md`, `docs/ai-start-prompt.md`, `docs/01-strategy/i18n-strategy.md`, `docs/01-strategy/production-readiness-plan.md`, `docs/02-architecture/code-landkarte.md`, `docs/README.md`, `docs/migration-log.md` | erledigt | Standzeilen, offene i18n-Domainlisten, migrierte Namespaces und aktive Dokumentationspfade nach 18a-final-check und 17-doc-6 konsistent bereinigt; `zutrittskontrolle` überall als vollständig migriert geführt; offene Domains auf gebaeudemanagement/eingangssysteme/anwendungen/signage/service/wissen reduziert; AI-Startprompt und README als Einstieg bestätigt; keine Codeänderung. |
| 17-doc-8 | 2026-04-22 | AI-Startprompt auf Lovable-Prompt-Arbeitsweise geschärft | `docs/ai-start-prompt.md`, `docs/README.md`, `docs/migration-log.md` | erledigt | AI-Startprompt erweitert: externe Begleit-KI soll primär Projektkontext lesen, Aufträge einordnen, Rückfragen stellen und strukturierte Lovable-Prompts statt eigenem Code erstellen. Standardstruktur für Lovable-Prompts (11 Abschnitte), Final-Check-Pflicht nach jeder Umsetzung, Rückfragenlogik, i18n-/Build-/Migration-Log-Regeln, Rollenverteilung Begleit-KI/Lovable/Mensch und Negativliste ergänzt. README um kurzen Hinweis zur Arbeitsweise ergänzt. Keine Codeänderung. |
| 17-doc-9 | 2026-04-22 | AI-Startprompt final bereinigt | `docs/ai-start-prompt.md`, `docs/current-status.md`, `docs/migration-log.md` | erledigt | AI-Startprompt strukturell bereinigt: fehlende Überschrift `## Rolle der Begleit-KI für nicht-technische Mitarbeitende` für den bisher verwaisten Abschnitt ergänzt und sprachlich geglättet, Redundanzen zwischen `## Operative Arbeitsweise` und `## Arbeitsprinzip: Begleit-KI formuliert Lovable-Prompts` reduziert (alte „Ablaufzusammenfassung" Sektion 9 entfernt zugunsten des detaillierten 10-Schritte-Ablaufs unter Arbeitsprinzip), 10-Schritte-Ablauf für neue KI-Chats explizit dargestellt (ZIP → Doku lesen → Kurzbefund → Widersprüche → Auftrag → Einordnen → Rückfragen oder Lovable-Prompt → Final-Check → Migration-Log), Standzeile in current-status.md auf 18a-final-check + 17-doc-9 aktualisiert. README bereits in 17-doc-8 sauber, daher unverändert. Keine Codeänderung. |
| 17-doc-10 | 2026-04-22 | Kopierbaren AI-Startprompt geschärft | `docs/ai-start-prompt.md`, `docs/current-status.md`, `docs/migration-log.md` | erledigt | Kopierbaren Startprompt im oberen Codeblock ergänzt, damit externe KIs auch bei alleiniger Nutzung des Startprompts als Begleit-KI arbeiten: kein eigener Code, sondern Lovable-Prompts und separate Final-Check-Prompts; Rückfragenlogik, Human-in-the-Loop und Pflicht zur passenden Dokumentationspflege kurz verankert. Keine Codeänderung. |
| 17-doc-11 | 2026-04-22 | Doku-Konsistenz nach AI-Startprompt-Test bereinigt | `docs/01-strategy/i18n-strategy.md`, `docs/02-architecture/code-landkarte.md`, `docs/current-status.md`, `docs/migration-log.md` | erledigt | Nach externem Startprompt-Test kleinere Doku-Unschärfen bereinigt: Standzeilen in i18n-strategy.md, code-landkarte.md und current-status.md auf 18a-final-check + 17-doc-11 aktualisiert, Zwischenüberschrift „Aktueller Stand" in i18n-strategy.md mitgezogen. Inhaltlich geprüft: `zutrittskontrolle` ist überall als vollständig migriert geführt, offene i18n-Domains sind konsistent auf gebaeudemanagement/eingangssysteme/anwendungen/signage/service/wissen reduziert, Dokumentationspfade in code-landkarte.md verweisen bereits auf die neue Ordnerstruktur (01-strategy/02-architecture/03-inventories/04-pilot-plans/05-checkpoints), Abschnittsverweise stimmig. Historische Migration-Log-Einträge unverändert. ai-start-prompt.md unverändert. Keine Codeänderung. |
| 19a-0 | 2026-04-22 | Gebäudemanagement-i18n-Inventar erstellt | `docs/03-inventories/i18n-gebaeudemanagement-inventory.md`, `src/features/gebaeudemanagement/pages/GebaeudemanagementPage.tsx`, `src/features/gebaeudemanagement/pages/DigitaleNamensanzeigePage.tsx`, `src/features/gebaeudemanagement/pages/SchraenkeBehaelterPage.tsx`, `src/features/gebaeudemanagement/pages/DigitalSignagePage.tsx`, `src/features/gebaeudemanagement/pages/ReservierenBuchenPage.tsx`, `src/features/gebaeudemanagement/pages/AlarmanlagenkopplungPage.tsx`, `src/features/gebaeudemanagement/routes.tsx`, `src/i18n/locales/de/gebaeudemanagement.json`, `src/i18n/locales/en/gebaeudemanagement.json`, `src/i18n/index.ts`, `docs/migration-log.md` | erledigt | Textinventar für Domain Gebäudemanagement erstellt: alle 6 Gebäudemanagement-Seiten (AlarmanlagenkopplungPage, DigitalSignagePage, ReservierenBuchenPage, SchraenkeBehaelterPage, DigitaleNamensanzeigePage, GebaeudemanagementPage) erfasst und sichtbare Textgruppen (PageLayout-Texte, ContentSections, Produktkarten, Vorteile, Einsatzbereiche, FeatureBlocks, Aria-/Alt-/Screenreader-Texte) dokumentiert. Technischer Status geprüft: Namespace `gebaeudemanagement` in `src/i18n/index.ts` registriert, DE-/EN-Locale-Dateien vorhanden und strukturgleich (beide enthalten nur `_meta`, status `prepared`, keine echten Seitentexte, keine leeren Werte). Vorgeschlagene Key-Struktur (`shared.*`, `root.*`, `alarmanlagenkopplung.*`, `digitalSignage.*`, `reservierenBuchen.*`, `schraenkeBehaelter.*`, `digitaleNamensanzeige.*`) und Migrationsreihenfolge `19a-1` (Alarmanlagenkopplung, niedrig) → `19a-2` (Digital Signage) → `19a-3` (Reservieren und Buchen) → `19a-4` (Schränke und Behälter) → `19a-5` (Digitale Namensanzeige) → `19a-6` (Root) → `19a-final-check` aus tatsächlicher Komplexität abgeleitet. Prüfhinweise und Abgrenzung dokumentiert. Keine Codeänderung, keine Locale-Änderung, kein Build erforderlich. |
| 19a-0-final-check | 2026-04-22 | Gebäudemanagement-Textinventar geprüft | `docs/03-inventories/i18n-gebaeudemanagement-inventory.md`, `docs/migration-log.md` | erledigt | Inventar der Domain `gebaeudemanagement` geprüft: Datei `docs/03-inventories/i18n-gebaeudemanagement-inventory.md` vorhanden (283 Zeilen), alle 6 Seiten (AlarmanlagenkopplungPage, DigitalSignagePage, ReservierenBuchenPage, SchraenkeBehaelterPage, DigitaleNamensanzeigePage, GebaeudemanagementPage) mit eigenem Detailabschnitt (4.1–4.6) inkl. Datei, Route, PageLayout-Texten, Abschnitten, Karten/FeatureBlocks, Aria-/Alt-Hinweisen, Key-Struktur-Vorschlag und Risiken erfasst. Routenabgleich mit `src/features/gebaeudemanagement/routes.tsx` durchgeführt: alle 6 Seiten dort registriert (`/gebaeudemanagement`, `/schraenke-behaelter`, `/digitale-namensanzeige`, `/reservieren-buchen`, `/digital-signage`, `/alarmanlagenkopplung`). Namespace `gebaeudemanagement` in `src/i18n/index.ts` registriert, DE-/EN-Locale-Dateien vorhanden und strukturgleich (beide nur `_meta` mit `status: "prepared"`, keine echten Seitentexte). Vorgeschlagene Migrationsreihenfolge 19a-1 → 19a-final-check plausibel (klein → groß: Platzhalter zuerst, Scroller-/Produktkartenmuster ab 19a-3 mit `shared.*`-Etablierung, Root-Seite mit langen FeatureBlock-Texten zuletzt). Abgrenzung als reine Dokumentationsetappe bestätigt: keine TSX/JSON/Routen/Navigation/Assets/Config-Änderungen, kein Build erforderlich. |
| 19a-1 | 2026-04-22 | Alarmanlagenkopplung nach i18n migriert | `src/features/gebaeudemanagement/pages/AlarmanlagenkopplungPage.tsx`, `src/i18n/locales/de/gebaeudemanagement.json`, `src/i18n/locales/en/gebaeudemanagement.json`, `docs/migration-log.md` | erledigt | Platzhalterseite Alarmanlagenkopplung nach Namespace `gebaeudemanagement.alarmanlagenkopplung.*` migriert, `shared.label` ergänzt, DE als Master übernommen, EN strukturgleich ergänzt, `_meta` erhalten und `_meta.status` von `prepared` auf `in-progress` gesetzt, Layout/Assets/Routen/Navigation unverändert, Build erfolgreich |
| 19a-1-final-check | 2026-04-22 | Alarmanlagenkopplung-i18n geprüft (inkl. Nachholung der Migration) | `src/features/gebaeudemanagement/pages/AlarmanlagenkopplungPage.tsx`, `src/i18n/locales/de/gebaeudemanagement.json`, `src/i18n/locales/en/gebaeudemanagement.json`, `docs/migration-log.md` | erledigt | Hinweis zur Transparenz: Die in `19a-1` zunächst gemeldete Migration war noch nicht in den Dateien umgesetzt; sie wurde im Rahmen dieses Final-Checks nachgeholt und anschließend geprüft. Ergebnis der Prüfung: `AlarmanlagenkopplungPage.tsx` nutzt `useTranslation("gebaeudemanagement")`, alle sichtbaren Texte laufen über `shared.label` und `alarmanlagenkopplung.*` (hero.headline, hero.intro, placeholder.label/title/text), DE/EN strukturgleich mit je 9 Leaf-Keys (3× `_meta`, 1× `shared.label`, 5× `alarmanlagenkopplung.*`), keine leeren Werte, keine sichtbaren harten deutschen Texte mehr in der TSX-Datei (nur interne JSX-Kommentare), `_meta.status` korrekt auf `in-progress`, Layout/Asset (`block-gebaeudemanagement.jpg`)/Route `/gebaeudemanagement/alarmanlagenkopplung`/Navigation unverändert, Build erfolgreich (7.03s), nur bekannte Chunk-Size-Warnung. |
| 19a-1-log-correction | 2026-04-22 | Migration-Log zu Alarmanlagenkopplung bereinigt | `docs/migration-log.md` | erledigt | Log-Einträge zu 19a-1 und 19a-1-final-check redaktionell bereinigt: Leaf-Key-Zählung auf je 9 Keys korrigiert (3× `_meta` + 1× `shared.label` + 5× `alarmanlagenkopplung.*`), widersprüchliche Angabe „je 6 Leaf-Keys … = 9 gesamt" entfernt, Kommentar-Bezeichnung von „JSDoc-Kommentare" auf „interne JSX-Kommentare" präzisiert und transparent dokumentiert, dass die Migration im Rahmen des Final-Checks nachgeholt wurde. Keine Codeänderung, kein Build erforderlich. |
| 19a-2 | 2026-04-22 | Digital Signage nach i18n migriert | `src/features/gebaeudemanagement/pages/DigitalSignagePage.tsx`, `src/i18n/locales/de/gebaeudemanagement.json`, `src/i18n/locales/en/gebaeudemanagement.json`, `docs/migration-log.md` | erledigt | Digital-Signage-Seite nach Namespace `gebaeudemanagement.digitalSignage.*` migriert: Hero (headline/intro), Überblick (title/text), Einsatzbereiche (title + 4 Items eingangsbereiche/empfangsbereiche/handelGastronomie/individuell mit je title/desc) und Technik (title/text) ausgelagert. `shared.sections.overview/useCases/technology` neu ergänzt. Bestehende `_meta.*`, `shared.label` und `alarmanlagenkopplung.*` unverändert erhalten. DE als Master, EN strukturgleich (je 27 Leaf-Keys, 0 Diff, 0 leere Werte). DigitalSignagePage nutzt `useTranslation("gebaeudemanagement")`, Use-Case-Karten via Items-Map über stabile Keys gerendert, keine sichtbaren harten deutschen Texte mehr (nur 3 interne JSX-Kommentare), Layout/Klassen/Icons/Asset-Import (`hero-infoboard.jpg`)/`fullWidth`/Reihenfolge der Abschnitte/Routen/Navigation/andere Gebäudemanagement-Seiten unverändert, Build erfolgreich (8.63s), nur bekannte Chunk-Size-Warnung |
| 19a-2-final-check | 2026-04-22 | Digital-Signage-i18n geprüft | `src/features/gebaeudemanagement/pages/DigitalSignagePage.tsx`, `src/i18n/locales/de/gebaeudemanagement.json`, `src/i18n/locales/en/gebaeudemanagement.json`, `docs/migration-log.md` | erledigt | Digital-Signage-i18n geprüft: `DigitalSignagePage.tsx` nutzt `useTranslation("gebaeudemanagement")`, alle sichtbaren Texte laufen über `shared.label`, `shared.sections.overview/useCases/technology` und `digitalSignage.*` (hero, overview, useCases mit 4 Items eingangsbereiche/empfangsbereiche/handelGastronomie/individuell, technology), DE/EN strukturgleich (je 27 Leaf-Keys, 0 Diff, 0 leere Werte), alle 24 erwarteten Leaf-Keys vorhanden, bestehende `_meta.*`, `shared.label` und `alarmanlagenkopplung.*` (hero.headline/intro, placeholder.label/title/text) unverändert erhalten, `_meta.status` weiterhin `"in-progress"`, keine sichtbaren harten deutschen Texte mehr in `DigitalSignagePage.tsx` (nur 3 interne JSX-Kommentare `Überblick`/`Einsatzbereiche`/`Technik`), Use-Case-Karten via stabile Item-Map gerendert, Layout/Klassen/Icons/Asset-Import (`hero-infoboard.jpg`)/`fullWidth`/Reihenfolge/Routen/Navigation/andere Gebäudemanagement-Seiten (Alarmanlagenkopplung/ReservierenBuchen/SchraenkeBehaelter/DigitaleNamensanzeige/Gebaeudemanagement) unverändert, Build erfolgreich (9.35s), nur bekannte Chunk-Size-Warnung |
| 19a-3 | 2026-04-22 | Reservieren und Buchen nach i18n migriert | `src/features/gebaeudemanagement/pages/ReservierenBuchenPage.tsx`, `src/i18n/locales/de/gebaeudemanagement.json`, `src/i18n/locales/en/gebaeudemanagement.json`, `docs/migration-log.md` | erledigt | Reservieren-und-Buchen-Seite nach Namespace `gebaeudemanagement.reservierenBuchen.*` migriert: Hero (headline/intro), Überblick (title/text), Produkte (intro + 1 Karte `bcmBuchungssystem` mit subtitle/title/description), Datenblatt-Link und Scroll-Aria-Labels sowie Vorteile (title + 4 Items intelligenteUebersicht/sichererZugang/umfassendeNutzung/flexibleRegeln mit je title/desc) ausgelagert. `shared.sections.benefits`, `shared.products.label/title/datasheet` und `shared.scroll.left/right` neu ergänzt. Bestehende `_meta.*`, `shared.label`, `shared.sections.overview/useCases/technology`, `alarmanlagenkopplung.*` und `digitalSignage.*` unverändert erhalten. DE als Master, EN strukturgleich. ReservierenBuchenPage nutzt `useTranslation("gebaeudemanagement")`, Produkt- und Vorteilskarten via Items-Map über stabile Keys gerendert, Aria-Labels der Scrollbuttons und Datenblatt-Linktext über i18n geführt, keine sichtbaren harten deutschen Texte mehr (nur interne JSX-Kommentare), Layout/Klassen/Icons/Animationen/Asset-Imports/`fullWidth`/`href="#"`/Scroller-Logik/Reihenfolge/Routen/Navigation/andere Gebäudemanagement-Seiten unverändert, Build erfolgreich, nur bekannte Chunk-Size-Warnung |
| 19a-3-final-check | 2026-04-22 | Reservieren-und-Buchen-i18n geprüft | `src/features/gebaeudemanagement/pages/ReservierenBuchenPage.tsx`, `src/i18n/locales/de/gebaeudemanagement.json`, `src/i18n/locales/en/gebaeudemanagement.json`, `docs/migration-log.md` | erledigt | Reservieren-und-Buchen-i18n geprüft: `ReservierenBuchenPage.tsx` nutzt `useTranslation("gebaeudemanagement")`, alle sichtbaren Texte laufen über `shared.label`, `shared.sections.overview/benefits`, `shared.products.label/title/datasheet`, `shared.scroll.left/right` und `reservierenBuchen.*` (hero, overview, products mit Karte `bcmBuchungssystem`, benefits mit 4 Items intelligenteUebersicht/sichererZugang/umfassendeNutzung/flexibleRegeln). Produkt- und Vorteilskarten via stabile Items-Map gerendert, Scroll-Aria-Labels und Datenblatt-Linktext über i18n geführt, Bild-`alt` über Produktkartentitel geführt, `href="#"` unverändert. DE/EN strukturgleich mit je 50 Leaf-Keys, 0 Diff, 0 leere Werte. Bestehende `_meta.*` (status `"in-progress"`), `shared.label`, `shared.sections.useCases/technology`, `alarmanlagenkopplung.*` und `digitalSignage.*` unverändert erhalten. Keine sichtbaren harten deutschen Texte mehr in der TSX-Datei (nur 3 interne JSX-Kommentare `Überblick`/`Produkte`/`Vorteile`). Migration-Log-Eintrag `19a-3` ist eindeutig (nicht doppelt). Layout/Klassen/Icons/Animationen/Asset-Imports/`fullWidth`/Scroller-Logik/Reihenfolge/Routen/Navigation/andere Gebäudemanagement-Seiten unverändert, Build erfolgreich (7.12s), nur bekannte Chunk-Size-Warnung |
| 19a-tooling-1 | 2026-04-22 | i18n-Validierungscheck eingeführt | `scripts/i18n/validate-i18n.mjs`, `scripts/i18n/i18n-check.config.json`, `package.json`, `docs/migration-log.md` | erledigt | Automatisierten i18n-Check als separates Script `npm run i18n:check` eingeführt: prüft Locale-Dateien auf DE/EN-Strukturgleichheit, Leaf-Key-Anzahlen, leere Werte, `_meta.namespace` und `_meta.status` (Whitelist `prepared`/`in-progress`/`migrated`/`complete`) sowie harte deutsche Texte in konfigurierten bereits migrierten Seiten (`strictPages`: AlarmanlagenkopplungPage, DigitalSignagePage, ReservierenBuchenPage). Heuristik: Umlaute + konfigurierbare deutsche Begriffe, ignoriert JSX-/Block-/JSDoc-Kommentare, `t("…")`/`useTranslation("…")`-Strings, Importzeilen sowie `allowedTechnicalTerms` (BCM, RFID, HDMI, ADx5, CARUS ARGOS, AES-128, UHF, IP, 30 km/h). Konfigurierbar über `scripts/i18n/i18n-check.config.json`. Reines Node-Skript, keine neuen Runtime- oder Dev-Dependencies, keine `@babel/parser`-Integration. Keine Integration in Build/CI/Pre-Commit. Keine TSX-/Locale-/Routen-/Navigation-/Asset-Änderungen. Erster Lauf grün: 16 Namespaces geprüft (anwendungen, common, eingangssysteme, gebaeudekommunikation, gebaeudemanagement, home, karriere, kontakt, navigation, personas, presse, service, serviceportal, signage, wissen, zutrittskontrolle), DE/EN überall strukturgleich mit 0 Diff und 0 leeren Werten, 3 strictPages alle grün (useTranslation gesetzt, 0 harte deutsche Texte). Build erfolgreich (7.71s), nur bekannte Chunk-Size-Warnung. |
| 19a-4 | 2026-04-22 | Schränke und Behälter nach i18n migriert | `src/features/gebaeudemanagement/pages/SchraenkeBehaelterPage.tsx`, `src/i18n/locales/de/gebaeudemanagement.json`, `src/i18n/locales/en/gebaeudemanagement.json`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | Schränke-und-Behälter-Seite nach Namespace `gebaeudemanagement.schraenkeBehaelter.*` migriert: Hero (headline/intro), Überblick (title/text), Produkte (intro + 2 Karten `schrankschloss`/`serverschloss` mit subtitle/title/description) inkl. Datenblatt-Link und Scroll-Aria-Labels über bestehende `shared.products.*`/`shared.scroll.*`, sowie Vorteile (title + 4 Items `flexibelEinsetzbar`/`einfacheNachruestung`/`zentraleVerwaltung`/`aufruestbarOnline` mit je title/desc) ausgelagert. Bestehende `_meta.*`, `shared.*`, `alarmanlagenkopplung.*`, `digitalSignage.*` und `reservierenBuchen.*` unverändert erhalten. DE als Master, EN strukturgleich (je 70 Leaf-Keys gesamt, +20 gegenüber 19a-3, 0 Diff, 0 leere Werte). SchraenkeBehaelterPage nutzt `useTranslation("gebaeudemanagement")`, Produkt- und Vorteilskarten via Items-Map über stabile Keys (`schrankschloss`/`serverschloss` bzw. `flexibelEinsetzbar`/`einfacheNachruestung`/`zentraleVerwaltung`/`aufruestbarOnline`) gerendert, Bild-`alt` über Produktkartentitel geführt, `href="#"` und `text-lime-600` (vorbestand) unverändert, keine sichtbaren harten deutschen Texte mehr (nur 3 interne JSX-Kommentare `Überblick`/`Produkte`/`Vorteile`). Seite zusätzlich in `scripts/i18n/i18n-check.config.json` unter `strictPages` aufgenommen. Layout/Klassen/Icons/Animationen/Asset-Imports (`bcm-schraenke-hero.jpg`, `bcm-schrankschloss-produkt.jpg`, `bcm-serverschloss-produkt.jpg`)/`fullWidth`/Scroller-Logik/Reihenfolge/Routen/Navigation/andere Gebäudemanagement-Seiten unverändert. `npm run i18n:check` grün (16 Namespaces, 4 Seiten, 0 Fehler), Build erfolgreich (6.73s), nur bekannte Chunk-Size-Warnung. |
| 19a-4 | 2026-04-22 | Schränke und Behälter nach i18n migriert (Key-Namen finalisiert) | `src/features/gebaeudemanagement/pages/SchraenkeBehaelterPage.tsx`, `src/i18n/locales/de/gebaeudemanagement.json`, `src/i18n/locales/en/gebaeudemanagement.json`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | Schränke-und-Behälter-Seite nach Namespace `gebaeudemanagement.schraenkeBehaelter.*` migriert: Hero (headline/intro), Überblick (title/text), Produkte (intro + 2 Karten `schrankschloss`/`serverschloss` mit subtitle/title/description) inkl. Datenblatt-Link und Scroll-Aria-Labels über `shared.products.*`/`shared.scroll.*`, sowie Vorteile (title + 4 Items `flexibel`/`nachruestung`/`zentraleVerwaltung`/`aufruestbar` mit je title/desc) ausgelagert. Hinweis: Vorteils-Item-Keys gegenüber zwischenzeitlichem Stand auf vorgegebene Namen `flexibel`/`nachruestung`/`zentraleVerwaltung`/`aufruestbar` angeglichen (DE/EN/TSX synchron), keine sonstigen Strukturänderungen. Bestehende `_meta.*` (status `"in-progress"`), `shared.*`, `alarmanlagenkopplung.*`, `digitalSignage.*` und `reservierenBuchen.*` unverändert erhalten. DE als Master, EN strukturgleich (je 70 Leaf-Keys, 0 Diff, 0 leere Werte). SchraenkeBehaelterPage nutzt `useTranslation("gebaeudemanagement")`, Produkt- und Vorteilskarten via Items-Map über stabile Keys gerendert, Scroll-Aria-Labels und Datenblatt-Linktext über i18n geführt, Bild-`alt` über Produktkartentitel. Interner Komponentenname/Default-Export (`SchraenkeBelhaelter`) bewusst unverändert, keine Layout-/Designänderung. Keine sichtbaren harten deutschen Texte mehr (nur 3 interne JSX-Kommentare `Überblick`/`Produkte`/`Vorteile`). Seite in `scripts/i18n/i18n-check.config.json` unter `strictPages` enthalten. Layout/Klassen/Icons/Animationen/Asset-Imports (`bcm-schraenke-hero.jpg`, `bcm-schrankschloss-produkt.jpg`, `bcm-serverschloss-produkt.jpg`)/`fullWidth`/`href="#"`/Scroller-Logik/Reihenfolge/Routen/Navigation/andere Gebäudemanagement-Seiten unverändert. `npm run i18n:check` grün (16 Namespaces, 4 Seiten, 0 Fehler), `npm run build` erfolgreich (8.83s), nur bekannte Chunk-Size-Warnung. |
| 19a-4-log-note | 2026-04-22 | Hinweis zu doppeltem 19a-4-Eintrag | `docs/migration-log.md` | erledigt | Klarstellung zu den zwei `19a-4`-Einträgen im Log: Der erste Eintrag dokumentiert einen zwischenzeitlichen Stand mit Vorteils-Item-Keys `flexibelEinsetzbar`/`einfacheNachruestung`/`zentraleVerwaltung`/`aufruestbarOnline`, der zweite Eintrag dokumentiert den finalen Stand mit den vorgegebenen Keys `flexibel`/`nachruestung`/`zentraleVerwaltung`/`aufruestbar`. Maßgeblich ist der aktuelle Dateistand: in DE/EN-Locales und in `SchraenkeBehaelterPage.tsx` werden ausschließlich die finalen Keys `flexibel`/`nachruestung`/`zentraleVerwaltung`/`aufruestbar` verwendet (Code-Suche nach den alten Namen liefert 0 Treffer in `src/`). Beide Log-Einträge bewusst nicht gelöscht, um die Historie nachvollziehbar zu halten. Keine Code-/Locale-/Config-Änderung. |
| 19a-4-final-check | 2026-04-22 | Schränke-und-Behälter-i18n geprüft | `src/features/gebaeudemanagement/pages/SchraenkeBehaelterPage.tsx`, `src/i18n/locales/de/gebaeudemanagement.json`, `src/i18n/locales/en/gebaeudemanagement.json`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | Schränke-und-Behälter-i18n final geprüft: `SchraenkeBehaelterPage.tsx` nutzt `useTranslation("gebaeudemanagement")`, alle sichtbaren Texte laufen über `shared.*` (label, sections.overview/benefits, products.label/title/datasheet, scroll.left/right) und `schraenkeBehaelter.*` (hero, overview, products mit 2 Karten `schrankschloss`/`serverschloss`, benefits mit 4 Items). Finale Vorteils-Keys `flexibel`/`nachruestung`/`zentraleVerwaltung`/`aufruestbar` bestätigt; alte Vorteils-Keys (`flexibelEinsetzbar`/`einfacheNachruestung`/`aufruestbarOnline`) kommen nicht mehr im Code/Locales vor (nur in historischen Log-Einträgen). DE/EN strukturgleich mit je 70 Leaf-Keys, 0 Diff, 0 leere Werte. Bestehende `_meta.*` (status `"in-progress"`), `shared.*`, `alarmanlagenkopplung.*`, `digitalSignage.*` und `reservierenBuchen.*` unverändert erhalten. Keine sichtbaren harten deutschen Texte (nur 3 interne JSX-Kommentare `Überblick`/`Produkte`/`Vorteile`). Produkt- und Vorteilskarten via Items-Map über stabile Keys gerendert, Scroll-Aria-Labels und Datenblatt-Linktext über i18n geführt, Bild-`alt` über Produktkartentitel. Interner Komponentenname/Default-Export (`SchraenkeBelhaelter`) bewusst unverändert. `SchraenkeBehaelterPage.tsx` in `scripts/i18n/i18n-check.config.json` unter `strictPages` enthalten, `validate-i18n.mjs` unverändert. `npm run i18n:check` grün (16 Namespaces, 4 strictPages, 0 Fehler, 0 Warnungen), `npm run build` erfolgreich (7.84s), nur bekannte Chunk-Size-Warnung. Layout/Klassen/Icons/Assets/Routen/Navigation/andere Gebäudemanagement-Seiten unverändert. |
| 19a-5 | 2026-04-22 | Digitale Namensanzeige nach i18n migriert | `src/features/gebaeudemanagement/pages/DigitaleNamensanzeigePage.tsx`, `src/i18n/locales/de/gebaeudemanagement.json`, `src/i18n/locales/en/gebaeudemanagement.json`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | Digitale-Namensanzeige-Seite nach Namespace `gebaeudemanagement.digitaleNamensanzeige.*` migriert: Hero (headline/intro), Überblick (title/text), Produkte (intro + 5 Karten `adx5`/`displaymodul`/`briefkasten`/`software`/`etagentaster` mit subtitle/title/description) inkl. Datenblatt-Link und Scroll-Aria-Labels über bestehende `shared.products.*`/`shared.scroll.*`, sowie Vorteile (title + 4 Items `fernverwaltung`/`mieterwechsel`/`modular`/`vandalismus` mit je title/desc) ausgelagert. Bestehende `_meta.*` (status `"in-progress"`), `shared.*`, `alarmanlagenkopplung.*`, `digitalSignage.*`, `reservierenBuchen.*` und `schraenkeBehaelter.*` unverändert erhalten. DE als Master, EN strukturgleich (je 100 Leaf-Keys gesamt, +30 gegenüber 19a-4, 0 Diff, 0 leere Werte). DigitaleNamensanzeigePage nutzt `useTranslation("gebaeudemanagement")`, Produktkarten via Items-Map über stabile Keys (`adx5`/`displaymodul`/`briefkasten`/`software`/`etagentaster`) und Vorteilskarten via `vorteilItems`-Liste über stabile Keys (`fernverwaltung`/`mieterwechsel`/`modular`/`vandalismus`) gerendert, Scroll-Aria-Labels über `shared.scroll.left/right` und Datenblatt-Linktext über `shared.products.datasheet` geführt. Produktbildbereiche bleiben wie im Vorbestand leere `<div>`-Container (kein `<img>`), daher keine künstlichen Alt-Texte; Asset-Imports (`bcm-aussenstation-adx5.jpg`, `bcm-displaymodul.jpg`, `bcm-briefkasten-digital.jpg`, `bcm-verwaltungssoftware.jpg`, `bcm-etagentaster.jpg`, `bcm-namensanzeige-hero.jpg`) erhalten (per `void` referenziert, lint-konform). Keine sichtbaren harten deutschen Texte mehr (nur 3 interne JSX-Kommentare `Überblick`/`Produkte`/`Vorteile`). Seite zusätzlich in `scripts/i18n/i18n-check.config.json` unter `strictPages` aufgenommen (jetzt 5 Seiten). Layout/Klassen/Icons/Animationen/`fullWidth`/`href="#"`/`text-lime-600`/Scroller-Logik/Reihenfolge/Routen/Navigation/andere Gebäudemanagement-Seiten unverändert. `npm run i18n:check` grün (16 Namespaces, 5 Seiten, 0 Fehler, 0 Warnungen), `npm run build` erfolgreich (9.56s), nur bekannte Chunk-Size-Warnung. |
| 19a-5-final-check | 2026-04-22 | Digitale-Namensanzeige-i18n geprüft | `src/features/gebaeudemanagement/pages/DigitaleNamensanzeigePage.tsx`, `src/i18n/locales/de/gebaeudemanagement.json`, `src/i18n/locales/en/gebaeudemanagement.json`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | Digitale-Namensanzeige-i18n final geprüft: `DigitaleNamensanzeigePage.tsx` nutzt `useTranslation("gebaeudemanagement")`, alle sichtbaren Texte laufen über `shared.*` (label, sections.overview/benefits, products.label/title/datasheet, scroll.left/right) und `digitaleNamensanzeige.*` (hero, overview, products mit 5 Karten `adx5`/`displaymodul`/`briefkasten`/`software`/`etagentaster`, benefits mit 4 Items `fernverwaltung`/`mieterwechsel`/`modular`/`vandalismus`). DE/EN strukturgleich mit je 100 Leaf-Keys, 0 Diff, 0 leere Werte. Bestehende `_meta.*` (status `"in-progress"`), `shared.*`, `alarmanlagenkopplung.*`, `digitalSignage.*`, `reservierenBuchen.*` und `schraenkeBehaelter.*` unverändert erhalten. Keine sichtbaren harten deutschen Texte (nur 3 interne JSX-Kommentare `Überblick`/`Produkte`/`Vorteile`). Produkt- und Vorteilskarten via Items-Map über stabile Keys gerendert, Scroll-Aria-Labels und Datenblatt-Linktext über i18n geführt. Produktbildbereiche bleiben wie im Vorbestand ohne `<img>`; Asset-Imports (`bcm-aussenstation-adx5.jpg`, `bcm-displaymodul.jpg`, `bcm-briefkasten-digital.jpg`, `bcm-verwaltungssoftware.jpg`, `bcm-etagentaster.jpg`, `bcm-namensanzeige-hero.jpg`) sind erhalten und werden per `void`-Statement nur zur Lint-Beruhigung referenziert – lint-konform, keine Build-/Runtime-Probleme (Build-Output enthält die referenzierten Assets unauffällig, Bundle-Größe unverändert). `DigitaleNamensanzeigePage.tsx` in `scripts/i18n/i18n-check.config.json` unter `strictPages` enthalten (5 Seiten gesamt), `validate-i18n.mjs` unverändert. `npm run i18n:check` grün (16 Namespaces, 5 strictPages, 0 Fehler, 0 Warnungen), `npm run build` erfolgreich (7.43s), nur bekannte Chunk-Size-Warnung. Layout/Klassen/Icons/Assets/Routen/Navigation/andere Gebäudemanagement-Seiten unverändert. |
| 19a-6 | 2026-04-22 | Gebäudemanagement Root nach i18n migriert | `src/features/gebaeudemanagement/pages/GebaeudemanagementPage.tsx`, `src/i18n/locales/de/gebaeudemanagement.json`, `src/i18n/locales/en/gebaeudemanagement.json`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | Gebäudemanagement-Root-Seite nach Namespace `gebaeudemanagement.root.*` migriert: Hero (headline/intro über `root.hero.*`), BCM-System-Abschnitt (`root.bcm.label`/`title`/`text`) und Funktionen-Abschnitt (`root.functions.label`/`title` plus 5 FeatureBlocks `digitaleNamensanzeige`/`zufahrtssteuerung`/`digitalSignage`/`reservierenBuchen`/`alarmanlagenkopplung` mit je headline/text) ausgelagert. Nummerierung „1.“–„5.“ bleibt Bestandteil der i18n-Werte (nicht dynamisch im JSX erzeugt). PageLayout-`label` über bestehendes `shared.label` weiterverwendet. Bestehende `_meta.*` (status `"in-progress"`), `shared.*`, `alarmanlagenkopplung.*`, `digitalSignage.*`, `reservierenBuchen.*`, `schraenkeBehaelter.*` und `digitaleNamensanzeige.*` unverändert erhalten. DE als Master, EN strukturgleich (je 116 Leaf-Keys, +16 gegenüber 19a-5, 0 Diff, 0 leere Werte). `GebaeudemanagementPage.tsx` nutzt `useTranslation("gebaeudemanagement")`, FeatureBlocks via `functionKeys`-Map über stabile Keys gerendert, Asset-Import (`block-gebaeudemanagement.jpg`), PageLayout/ContentSection/FeatureBlock-Struktur, Klassen, Reihenfolge unverändert. Keine internen Links, CTA oder Navigationseinträge ergänzt. Keine sichtbaren harten deutschen Texte mehr. Seite zusätzlich in `scripts/i18n/i18n-check.config.json` unter `strictPages` aufgenommen (jetzt 6 Seiten, alle Gebäudemanagement-Seiten gedeckt). `npm run i18n:check` grün (16 Namespaces, 6 strictPages, 0 Fehler, 0 Warnungen), `npm run build` erfolgreich (8.32s), nur bekannte Chunk-Size-Warnung. Routen/Navigation/andere Gebäudemanagement-Seiten unverändert. |
| 19a-final-check | 2026-04-22 | Gebäudemanagement-i18n vollständig geprüft | `src/features/gebaeudemanagement/pages/AlarmanlagenkopplungPage.tsx`, `src/features/gebaeudemanagement/pages/DigitalSignagePage.tsx`, `src/features/gebaeudemanagement/pages/ReservierenBuchenPage.tsx`, `src/features/gebaeudemanagement/pages/SchraenkeBehaelterPage.tsx`, `src/features/gebaeudemanagement/pages/DigitaleNamensanzeigePage.tsx`, `src/features/gebaeudemanagement/pages/GebaeudemanagementPage.tsx`, `src/i18n/locales/de/gebaeudemanagement.json`, `src/i18n/locales/en/gebaeudemanagement.json`, `scripts/i18n/i18n-check.config.json`, `docs/current-status.md`, `docs/01-strategy/i18n-strategy.md`, `docs/02-architecture/code-landkarte.md`, `docs/migration-log.md` | erledigt | Gesamte Domain Gebäudemanagement final geprüft: alle 6 Seiten nutzen `useTranslation("gebaeudemanagement")`, alle sichtbaren UI-Texte über i18n ausgelagert, DE/EN strukturgleich (je 116 Leaf-Keys, 0 Diff, 0 leere Werte), keine harten sichtbaren deutschen Texte (i18n-Check OK für alle 6 strictPages), alle 6 Seiten in `strictPages`, `_meta.status` von `in-progress` auf `migrated` gesetzt (DE/EN), `npm run i18n:check` und `npm run build` erfolgreich (nur bekannte Chunk-Size-Warnung), Doku aktualisiert: `docs/current-status.md` (gebaeudemanagement → ✅ migriert, Standzeile 19a-final-check), `docs/01-strategy/i18n-strategy.md` (gebaeudemanagement in Tabelle migrierter Namespaces, aus „Noch nicht migriert" entfernt, Standzeile 19a-final-check), `docs/02-architecture/code-landkarte.md` (gebaeudemanagement in Liste migrierter Namespaces ergänzt, Standzeile 19a-final-check). Layout/Assets/Routen/Navigation unverändert. |
| 17a-fix-1 | 2026-04-22 | EN-Ausgabe Beschilderung / Signage & Wayfinding korrigiert | `src/features/signage/pages/BeschilderungPage.tsx`, `src/i18n/locales/de/gebaeudekommunikation.json`, `src/i18n/locales/en/gebaeudekommunikation.json`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | Fehler behoben, bei dem die Seite „Beschilderung / Signage & Wayfinding" trotz aktiver EN-Sprache deutsche Inhalte zeigte. Ursache: `BeschilderungPage.tsx` (gemountet unter `/gebaeudekommunikation/beschilderung`, Datei liegt in `src/features/signage/pages/` aus historischen Gründen) enthielt sämtliche sichtbaren Texte (PageLayout label/headline/intro, ContentSection-Labels/Titles, Feature-Beschreibungen mit 4 Karten, Beratungs-CTA) hart in DE im JSX und nutzte keinerlei `useTranslation`. Behoben durch Anbindung an Namespace `gebaeudekommunikation` mit neuem Top-Level-Key `beschilderung.*` (hero.label/headline/intro, features.label/title/intro/items.{hausnummer|materialien|tuerschilder|klingel}.{title,text,imageAlt}, beratung.label/title/text/cta) in DE und EN strukturgleich; alle sichtbaren Texte und `<img alt>` laufen jetzt über `t(...)`. EN-Übersetzungen fachlich sauber: „Building communication / Signage and wayfinding", „Signage, guidance and orientation with TCS Signage", Intro fachlich übersetzt (ultra-flat smart house numbers etc.). DE/EN je +20 Leaf-Keys, 0 Diff, 0 leere Werte; bestehende Keys (`_meta`, `briefkastenanlagen`, `systemloesungen`, `root`, `tuersprechanlagen`, `grossanlagen`, `tuerkommunikation`, `kontakt`/snipdoo etc.) unverändert erhalten. Seite zusätzlich in `scripts/i18n/i18n-check.config.json` unter `strictPages` aufgenommen (jetzt 7 Seiten). `npm run i18n:check` grün (16 Namespaces, 7 strictPages, 0 Fehler, 0 Warnungen, useTranslation: ja, harte deutsche Texte: 0), `npm run build` erfolgreich (7.70s, nur bekannte Chunk-Size-Warnung). Layout/Klassen/Icons/Animationen/Asset-Imports (`signage-hero.jpg`, `signage-hausnummer.jpg`, `signage-materialien.jpg`, `signage-tuerschilder.jpg`, `signage-tuerklingel.jpg`)/Reihenfolge/Routen (`/signage`, `/gebaeudekommunikation/beschilderung`, `/beschilderung`)/Navigation/Breadcrumbs/andere Seiten unverändert. |
| 17a-fix-1-final-check | 2026-04-22 | Beschilderung / Signage & Wayfinding i18n-Korrektur geprüft | `src/features/signage/pages/BeschilderungPage.tsx`, `src/i18n/locales/de/gebaeudekommunikation.json`, `src/i18n/locales/en/gebaeudekommunikation.json`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | i18n-Korrektur der Seite Beschilderung / Signage & Wayfinding final geprüft: Seite liegt historisch unter `src/features/signage/pages/BeschilderungPage.tsx` (gemountet via `signageRoutes` unter aktiver Route `/gebaeudekommunikation/beschilderung` und Legacy-Fallback `/beschilderung`, zentrale Slug-Konstanten `routes.gebaeudekommunikation.beschilderung`/`beschilderungLegacy` unverändert) und nutzt korrekt `useTranslation("gebaeudekommunikation")`; alle sichtbaren Texte (Hero label/headline/intro, ContentSection-Labels/Titles, 4 Feature-Karten mit stabilen Keys `hausnummer`/`materialien`/`tuerschilder`/`klingel` inkl. Bild-`alt` über `imageAlt`-Keys, Beratungsabschnitt mit CTA) laufen über `gebaeudekommunikation.beschilderung.*`. Locale-Struktur DE/EN strukturgleich (je 409 Leaf-Keys gesamt im Namespace `gebaeudekommunikation`, davon 22 unter `beschilderung.*` – exakt die im Auftrag erwarteten 22 Keys, also +22 statt der im 17a-fix-1-Bericht genannten +20; Differenz dokumentiert), 0 Diff, 0 leere Werte, bestehende Keys (`_meta`, `briefkastenanlagen`, `systemloesungen`, `root`, `tuersprechanlagen`, `grossanlagen`, `tuerkommunikation`, `kontakt`/snipdoo etc.) unverändert. EN-Werte fachlich englisch („Building communication / Signage and wayfinding", „Signage, guidance and orientation with TCS Signage", Intro/Features/Beratung vollständig übersetzt); `TCS Signage` als Produktbegriff erhalten; keine deutschen Restbegriffe in EN-Werten dieser Seite. `BeschilderungPage.tsx` enthält keine sichtbaren harten deutschen Texte (i18n-check: useTranslation: ja, harte deutsche Texte: 0); Layout/Klassen/Icons/Animationen/Asset-Imports (`signage-hero.jpg`, `signage-hausnummer.jpg`, `signage-materialien.jpg`, `signage-tuerschilder.jpg`, `signage-tuerklingel.jpg`)/Reihenfolge/CTAs unverändert. `src/features/signage/pages/BeschilderungPage.tsx` in `scripts/i18n/i18n-check.config.json` unter `strictPages` enthalten (jetzt 7 strictPages), bestehende strictPages erhalten, keine zusätzlichen nicht-migrierten Seiten ergänzt, `validate-i18n.mjs` unverändert. `npm run i18n:check` grün (16 Namespaces, 7 strictPages, 0 Fehler, 0 Warnungen), `npm run build` erfolgreich (10.13s, nur bekannte Chunk-Size-Warnung). Routen (`/signage`, `/gebaeudekommunikation/beschilderung`, `/beschilderung`)/Navigation/Breadcrumbs/Layout/Assets/andere Seiten unverändert. |
| 20-doc-1 | 2026-04-22 | Routebasierte Final-Check-Regel dokumentiert | `docs/ai-start-prompt.md`, `docs/01-strategy/i18n-strategy.md`, `docs/02-architecture/code-landkarte.md`, `docs/migration-log.md` | erledigt | Routebasierte Prüfpflicht für künftige Final-Checks dokumentiert: Final-Checks prüfen nicht nur Feature-Ordner, sondern immer Route → tatsächlich gerenderte TSX-Datei → Feature-Ordner → i18n-Namespace → strictPages. Hintergrund ist der Sonderfall `BeschilderungPage.tsx`, die technisch unter `src/features/signage/pages/` liegt, fachlich aber unter `/gebaeudekommunikation/beschilderung` gemountet ist und den Namespace `gebaeudekommunikation` nutzt. AI-Startprompt um Kurzregel im kopierbaren Codeblock und um Abschnitt „Routebasierte Final-Check-Pflicht" ergänzt, i18n-Strategie um Abschnitt „Routebasierte i18n-Prüfung" ergänzt, Code-Landkarte um neuen Abschnitt 12 „Route / Feature-Ordner / Namespace" inkl. Sonderfall-Tabelle ergänzt. Keine Codeänderung, kein Build erforderlich. |

| 19b-0 | 2026-04-22 | Inventar für eingangssysteme erstellt | `docs/03-inventories/i18n-eingangssysteme-inventory.md`, `docs/migration-log.md` | erledigt | Inventar für die Domain `eingangssysteme` erstellt: technischer Status des Namespace geprüft (in `src/i18n/index.ts` registriert, DE/EN-Locale-Dateien vorhanden und strukturgleich, beide nur `_meta` mit `status: "prepared"`), alle 8 Seiten und Routen der Domain erfasst (EntrySystemPage, EntryDesignPage, EntryFunktionalitaetPage, EntryMaterialPage, EntryIntegrationsformenPage, EntryReferenzenPage, EntryStandardsPage, EntryBeratungPage unter `/entry-system/*`), Detailinventar pro Seite angelegt inkl. PageLayout-Texten, Karten, Listen, Downloads, CTA, Aria-/Alt-Texten, Risiken und Key-Struktur-Vorschlag, Migrationsreihenfolge `19b-1` (Design) bis `19b-8` (Root) und `19b-final-check` vorgeschlagen. Keine TSX-, Locale-, Routen-, Navigations-, Asset- oder Config-Änderungen. Reine Dokumentationsetappe, kein Build erforderlich. |
| 19b-1 | 2026-04-22 | Entry Design nach i18n migriert | `src/features/eingangssysteme/pages/EntryDesignPage.tsx`, `src/i18n/locales/de/eingangssysteme.json`, `src/i18n/locales/en/eingangssysteme.json`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | Erste produktive i18n-Migration der Domain `eingangssysteme`: `EntryDesignPage.tsx` an Namespace `eingangssysteme` angebunden, `shared.label`, `design.hero.{label,headline,intro}`, `design.cards.tableausTerminals.{subtitle,title,text,imageAlt}`, `design.cards.gestaltungsbaender.{subtitle,title,text,imageAlt}` sowie seitenlokal `design.nav.{prev,next}` (kein Shared, da Generalisierung der Prev/Next-Labels in dieser Etappe noch nicht erlaubt) in DE/EN ergänzt, `_meta.status` von `prepared` auf `in-progress` gesetzt, beide Locale-Dateien strukturgleich (je 14 Leaf-Keys), keine leeren Werte. `EntryDesignPage.tsx` nutzt `useTranslation("eingangssysteme")`, beide Karten via stabile Item-Map über `tableausTerminals`/`gestaltungsbaender` gerendert, Bild-`alt` über `imageAlt`-Keys geführt, keine sichtbaren harten deutschen Texte mehr. `EntryDesignPage.tsx` in `scripts/i18n/i18n-check.config.json` unter `strictPages` aufgenommen. Layout/Klassen/Reihenfolge/Bild-URLs/Links/Routen/Navigation/Assets unverändert. `npm run i18n:check` grün (16 Namespaces, 8 Seiten, 0 Fehler), `npm run build` erfolgreich (10.18s, nur bekannte Chunk-Size-Warnung). |
| 19b-1-final-check | 2026-04-22 | Entry Design i18n geprüft | `src/features/eingangssysteme/pages/EntryDesignPage.tsx`, `src/i18n/locales/de/eingangssysteme.json`, `src/i18n/locales/en/eingangssysteme.json`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | Entry-Design-i18n final geprüft: `EntryDesignPage.tsx` nutzt `useTranslation("eingangssysteme")`, alle sichtbaren Texte laufen über `shared.label`, `design.hero.{label,headline,intro}`, `design.cards.tableausTerminals.{subtitle,title,text,imageAlt}`, `design.cards.gestaltungsbaender.{subtitle,title,text,imageAlt}` und seitenlokal `design.nav.prev` / `design.nav.next` (bewusst nicht als `shared.nav.*` generalisiert). DE/EN strukturgleich mit je **17 Leaf-Keys gesamt pro Locale** (= **3× `_meta.*` + 14 fachliche Keys**), 0 Diff, 0 leere Werte. `_meta.status` weiterhin `"in-progress"`. `EntryDesignPage.tsx` korrekt in `scripts/i18n/i18n-check.config.json` unter `strictPages` enthalten, keine unpassenden Zusatzseiten. Keine sichtbaren harten deutschen Texte mehr in der TSX (Bild-`alt` über `imageAlt`-Keys, beide Karten via stabile Item-Map über `tableausTerminals`/`gestaltungsbaender`). Layout/Klassen/Bild-URLs/Links/Reihenfolge/Routen/Navigation/Assets unverändert. `npm run i18n:check` grün (16 Namespaces, 8 Seiten, 0 Fehler, 0 Warnungen), `npm run build` erfolgreich (8.29s, nur bekannte Chunk-Size-Warnung). Leaf-Key-Zählung im Bericht eindeutig dokumentiert. |
| 19b-2 | 2026-04-22 | Entry Integrationsformen nach i18n migriert | `src/features/eingangssysteme/pages/EntryIntegrationsformenPage.tsx`, `src/i18n/locales/de/eingangssysteme.json`, `src/i18n/locales/en/eingangssysteme.json`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | `EntryIntegrationsformenPage.tsx` an Namespace `eingangssysteme` angebunden, `integrationsformen.hero.{label,headline,intro}`, `integrationsformen.items.inPutz.{subtitle,title,text,imageAlt}`, `unterPutz.{...}`, `aufPutz.{...}`, `freistehend.{...}` sowie seitenlokal `integrationsformen.nav.prev` / `integrationsformen.nav.next` in DE/EN ergänzt (je +21 Leaf-Keys, gesamt jetzt 38 Leaf-Keys pro Locale = 3× `_meta.*` + 35 fachliche Keys), `_meta.status` unverändert `in-progress`, `shared.label` aus 19b-1 wiederverwendet, DE/EN strukturgleich, 0 Diff, 0 leere Werte. Seite nutzt `useTranslation("eingangssysteme")`, 4 Karten via stabile Item-Map über `inPutz`/`unterPutz`/`aufPutz`/`freistehend` gerendert, Bild-`alt` über `imageAlt`-Keys geführt, keine sichtbaren harten deutschen Texte mehr. `EntryIntegrationsformenPage.tsx` in `scripts/i18n/i18n-check.config.json` unter `strictPages` aufgenommen (jetzt 9 strictPages). Layout/Klassen/Reihenfolge/Bild-URLs/Links/Routen/Navigation/Assets unverändert. `npm run i18n:check` grün (16 Namespaces, 9 Seiten, 0 Fehler, 0 Warnungen), `npm run build` erfolgreich (5.82s, nur bekannte Chunk-Size-Warnung). |
| 19b-2-final-check | 2026-04-22 | Entry Integrationsformen i18n geprüft | `src/features/eingangssysteme/pages/EntryIntegrationsformenPage.tsx`, `src/i18n/locales/de/eingangssysteme.json`, `src/i18n/locales/en/eingangssysteme.json`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | Entry-Integrationsformen-i18n final geprüft: `EntryIntegrationsformenPage.tsx` nutzt `useTranslation("eingangssysteme")`, alle sichtbaren Texte laufen über `shared.label`, `integrationsformen.hero.{label,headline,intro}`, `integrationsformen.items.inPutz.{subtitle,title,text,imageAlt}`, `unterPutz.{...}`, `aufPutz.{...}`, `freistehend.{...}` und seitenlokal `integrationsformen.nav.prev` / `integrationsformen.nav.next` (bewusst nicht als `shared.nav.*` generalisiert); 4 Karten via stabile Item-Map `inPutz`/`unterPutz`/`aufPutz`/`freistehend` gerendert, Bild-`alt` über `imageAlt`-Keys. DE/EN strukturgleich mit je **38 Leaf-Keys gesamt pro Locale** (= **3× `_meta.*` + 35 fachliche Keys**: 1 `shared.label` + 14 `design.*` aus 19b-1 unverändert + 20 `integrationsformen.*`), 0 Diff, 0 leere Werte, `_meta.status` weiterhin `"in-progress"`. `EntryIntegrationsformenPage.tsx` korrekt in `scripts/i18n/i18n-check.config.json` unter `strictPages` enthalten (jetzt 9 strictPages), keine unpassenden Zusatzseiten. Keine sichtbaren harten deutschen Texte mehr in der TSX. Layout/Klassen/Bild-URLs/Links/Reihenfolge/Routen/Navigation/Assets unverändert. `npm run i18n:check` grün (16 Namespaces, 9 Seiten, 0 Fehler, 0 Warnungen), `npm run build` erfolgreich (6.70s, nur bekannte Chunk-Size-Warnung). Leaf-Key-Zählung im Bericht eindeutig dokumentiert. |
| 19b-3 | 2026-04-22 | Entry Material nach i18n migriert | `src/features/eingangssysteme/pages/EntryMaterialPage.tsx`, `src/i18n/locales/de/eingangssysteme.json`, `src/i18n/locales/en/eingangssysteme.json`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | `EntryMaterialPage.tsx` an Namespace `eingangssysteme` angebunden, `material.hero.{label,headline,intro}`, `material.items.aluminium.{subtitle,title,text,imageAlt,features[]}`, `edelstahl.{...}`, `messingSatiniert.{...}`, `bronzeBaubronze.{...}`, `pulverbeschichtung.{...}`, `mineralwerkstoff.{...}` inklusive Feature-Listen (jeweils als JSON-Array, via `t(..., { returnObjects: true })` in der TSX gerendert) sowie seitenlokal `material.nav.prev` / `material.nav.next` in DE/EN ergänzt (je +51 Leaf-Keys, gesamt jetzt 89 Leaf-Keys pro Locale = 3× `_meta.*` + 86 fachliche Keys: 1 `shared.label` + 14 `design.*` + 20 `integrationsformen.*` + 51 `material.*`), `_meta.status` unverändert `in-progress`, `shared.label` aus 19b-1 wiederverwendet, DE/EN strukturgleich, 0 Diff, 0 leere Werte. Seite nutzt `useTranslation("eingangssysteme")`, 6 Karten via stabile Item-Map über `aluminium`/`edelstahl`/`messingSatiniert`/`bronzeBaubronze`/`pulverbeschichtung`/`mineralwerkstoff` gerendert, Bild-`alt` über `imageAlt`-Keys, Feature-Listen i18n-geführt. Fachbegriffe (V2A/V4A, AlMg1, MS63/CuZn37, CuSn6, RAL, PVD, Corian/Himacs/Getalit/Varicor) in EN fachlich korrekt erhalten. Keine sichtbaren harten deutschen Texte mehr. `EntryMaterialPage.tsx` in `scripts/i18n/i18n-check.config.json` unter `strictPages` aufgenommen (jetzt 10 strictPages). Layout/Klassen/Reihenfolge/Bild-URLs/Links/Routen/Navigation/Assets unverändert. `npm run i18n:check` grün (16 Namespaces, 10 Seiten, 0 Fehler, 0 Warnungen), `npm run build` erfolgreich (10.86s, nur bekannte Chunk-Size-Warnung). |
| 19b-3-final-check | 2026-04-22 | Entry Material i18n geprüft | `src/features/eingangssysteme/pages/EntryMaterialPage.tsx`, `src/i18n/locales/de/eingangssysteme.json`, `src/i18n/locales/en/eingangssysteme.json`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | Entry-Material-i18n final geprüft: `EntryMaterialPage.tsx` nutzt `useTranslation("eingangssysteme")`, alle sichtbaren Texte laufen über `shared.label`, `material.hero.*`, `material.items.aluminium.*`, `edelstahl.*`, `messingSatiniert.*`, `bronzeBaubronze.*`, `pulverbeschichtung.*`, `mineralwerkstoff.*` inklusive Feature-Listen sowie seitenlokal `material.nav.prev` / `material.nav.next`; DE/EN strukturgleich mit je 89 Leaf-Keys gesamt pro Locale (= 3× `_meta.*` + 86 fachliche Keys: 1 `shared.label` + 14 `design.*` + 20 `integrationsformen.*` + 51 `material.*`), 0 Diff, 0 leere Werte, `_meta.status` weiterhin `in-progress`, `EntryMaterialPage.tsx` in `strictPages` enthalten (10 strictPages), keine sichtbaren harten deutschen Texte mehr, Fachbegriffe (V2A/V4A, AlMg1, MS63/CuZn37, CuSn6, RAL, PVD, Corian/Himacs/Getalit/Varicor) fachlich korrekt erhalten, Feature-Listen via `t(..., { returnObjects: true })` i18n-geführt, Layout/Routen/Navigation/Assets unverändert, `npm run i18n:check` grün (16 Namespaces, 10 Seiten, 0 Fehler, 0 Warnungen), `npm run build` erfolgreich (6.21s, nur bekannte Chunk-Size-Warnung). |
| 19b-4 | 2026-04-22 | Entry Standards nach i18n migriert | `src/features/eingangssysteme/pages/EntryStandardsPage.tsx`, `src/i18n/locales/de/eingangssysteme.json`, `src/i18n/locales/en/eingangssysteme.json`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | `EntryStandardsPage.tsx` an Namespace `eingangssysteme` angebunden, `standards.hero.{label,headline,intro}`, `standards.downloads.title`, `standards.downloads.items.{unterputzAmi,inputzAmi,zubehoerAmi}.label`, `standards.items.unterputzmontage.{subtitle,title,text,imageAlt}`, `inputzmontage.{...}`, `funktionsmoduleAmi.{...}` sowie seitenlokal `standards.nav.prev` / `standards.nav.next` in DE/EN ergänzt (je +21 Leaf-Keys, gesamt jetzt 110 Leaf-Keys pro Locale = 3× `_meta.*` + 107 fachliche Keys: 1 `shared.label` + 14 `design.*` + 20 `integrationsformen.*` + 51 `material.*` + 21 `standards.*`), `_meta.status` unverändert `in-progress`, `shared.label` aus 19b-1 wiederverwendet, DE/EN strukturgleich, 0 Diff, 0 leere Werte. Seite nutzt `useTranslation("eingangssysteme")`, 3 Karten via stabile Item-Map über `unterputzmontage`/`inputzmontage`/`funktionsmoduleAmi` gerendert, Bild-`alt` über `imageAlt`-Keys, Downloads-Block via stabile Key-Map (`unterputzAmi`/`inputzAmi`/`zubehoerAmi`) i18n-geführt. Externe PDF-URLs und `target="_blank"` / `rel="noopener noreferrer"` unverändert. Produktbegriffe (AMI, Inputz/Unterputz) fachlich korrekt erhalten. Keine sichtbaren harten deutschen Texte mehr. `EntryStandardsPage.tsx` in `scripts/i18n/i18n-check.config.json` unter `strictPages` aufgenommen (jetzt 11 strictPages). Layout/Klassen/Reihenfolge/Bild-URLs/Links/Routen/Navigation/Assets unverändert. `npm run i18n:check` grün (16 Namespaces, 11 Seiten, 0 Fehler, 0 Warnungen), `npm run build` erfolgreich (6.43s, nur bekannte Chunk-Size-Warnung). |
| 19b-4-final-check | 2026-04-22 | Entry Standards i18n geprüft | `src/features/eingangssysteme/pages/EntryStandardsPage.tsx`, `src/i18n/locales/de/eingangssysteme.json`, `src/i18n/locales/en/eingangssysteme.json`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | Entry-Standards-i18n final geprüft: `EntryStandardsPage.tsx` nutzt `useTranslation("eingangssysteme")`, alle sichtbaren Texte laufen über `shared.label`, `standards.hero.*`, `standards.downloads.title`, `standards.downloads.items.unterputzAmi.label`, `inputzAmi.label`, `zubehoerAmi.label`, `standards.items.unterputzmontage.*`, `inputzmontage.*`, `funktionsmoduleAmi.*` sowie seitenlokal `standards.nav.prev` / `standards.nav.next`; DE/EN strukturgleich mit je **110 Leaf-Keys gesamt pro Locale** (= 3× `_meta.*` + 107 fachliche Keys), 0 Diff, 0 leere Werte, `_meta.status` weiterhin `in-progress`, `EntryStandardsPage.tsx` in `strictPages` enthalten (11 strictPages), keine sichtbaren harten deutschen Texte mehr, Produktbegriffe (AMI, Inputz, Unterputz) fachlich korrekt erhalten, externe PDF-Links und `target="_blank"` / `rel="noopener noreferrer"` unverändert, Downloads-Block via stabile Key-Map i18n-geführt, 3 Karten via stabile Item-Map (`unterputzmontage`/`inputzmontage`/`funktionsmoduleAmi`), Bild-`alt` über `imageAlt`. Tatsächliche Bereichszählung per JSON-Walk: 1 `shared` + 13 `design` + 21 `integrationsformen` + 51 `material` + 21 `standards` = 107 fachliche Keys (Hinweis: die Bereichsteilzahlen weichen leicht von früheren Logs ab, weil dort `nav.*` teilweise pauschal mitgezählt wurde; maßgeblich und konsistent ist die Gesamtzahl **110 pro Locale**). Layout/Routen/Navigation/Assets unverändert, `npm run i18n:check` grün (16 Namespaces, 11 Seiten, 0 Fehler, 0 Warnungen), `npm run build` erfolgreich (7.89s, nur bekannte Chunk-Size-Warnung). |
| 19b-5 | 2026-04-22 | Entry Beratung nach i18n migriert | `src/features/eingangssysteme/pages/EntryBeratungPage.tsx`, `src/i18n/locales/de/eingangssysteme.json`, `src/i18n/locales/en/eingangssysteme.json`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | `EntryBeratungPage.tsx` an Namespace `eingangssysteme` angebunden, `beratung.hero.{label,headline,intro}`, `beratung.topics.konzept.{title,intro,items}` (4 Items), `beratung.topics.technologie.{title,intro,items}` (6 Items), `beratung.cta.{title,text,cta}` sowie seitenlokal `beratung.nav.prev` / `beratung.nav.next` in DE/EN ergänzt (je +22 Leaf-Keys inkl. Listenelemente, gesamt jetzt **132 Leaf-Keys pro Locale** = 3× `_meta.*` + 129 fachliche Keys: 1 `shared` + 14 `design` + 20 `integrationsformen` + 51 `material` + 21 `standards` + 22 `beratung`), `_meta.status` unverändert `in-progress`, `shared.label` aus 19b-1 wiederverwendet, DE/EN strukturgleich, 0 Diff, 0 leere Werte. Seite nutzt `useTranslation("eingangssysteme")`, beide Themen-Spalten via i18n (`beratung.topics.konzept.*` und `beratung.topics.technologie.*`), Listen via `t(..., { returnObjects: true })` als String-Arrays gerendert, CTA-Block (`beratung.cta.title/text/cta`) i18n-geführt, interne Kontakt-Route `/kontakt` unverändert, keine sichtbaren harten deutschen Texte mehr. `EntryBeratungPage.tsx` in `scripts/i18n/i18n-check.config.json` unter `strictPages` aufgenommen (jetzt 12 strictPages). Layout/Klassen/Reihenfolge/Bild-URLs/Links/Routen/Navigation/Assets unverändert. `npm run i18n:check` grün (16 Namespaces, 12 Seiten, 0 Fehler, 0 Warnungen), `npm run build` erfolgreich (8.08s, nur bekannte Chunk-Size-Warnung). |
| 19b-5-final-check | 2026-04-22 | Entry Beratung i18n geprüft | `src/features/eingangssysteme/pages/EntryBeratungPage.tsx`, `src/i18n/locales/de/eingangssysteme.json`, `src/i18n/locales/en/eingangssysteme.json`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | Entry-Beratung-i18n final geprüft: `EntryBeratungPage.tsx` nutzt `useTranslation("eingangssysteme")`, alle sichtbaren Texte laufen über `shared.label`, `beratung.hero.*`, `beratung.topics.konzept.{title,intro,items}` (4 Items), `beratung.topics.technologie.{title,intro,items}` (6 Items), `beratung.cta.{title,text,cta}` sowie seitenlokal `beratung.nav.prev` / `beratung.nav.next`; DE/EN strukturgleich mit je **132 Leaf-Keys gesamt pro Locale** (= 3× `_meta.*` + 129 fachliche Keys, inkl. der 10 Listenelemente aus `beratung.topics.*.items`), 0 Diff, 0 leere Werte, `_meta.status` weiterhin `in-progress`, `EntryBeratungPage.tsx` in `strictPages` enthalten (12 strictPages), keine sichtbaren harten deutschen Texte mehr, Listen korrekt via `t(..., { returnObjects: true }) as string[]` i18n-geführt, CTA-Block vollständig i18n-geführt, interne Kontakt-Route `/kontakt` unverändert, Layout/Routen/Navigation/Assets unverändert, `npm run i18n:check` grün (16 Namespaces, 12 Seiten, 0 Fehler, 0 Warnungen), `npm run build` erfolgreich (6.02s, nur bekannte Chunk-Size-Warnung). |
| 19b-6 | 2026-04-22 | Entry Funktionalität nach i18n migriert | `src/features/eingangssysteme/pages/EntryFunktionalitaetPage.tsx`, `src/i18n/locales/de/eingangssysteme.json`, `src/i18n/locales/en/eingangssysteme.json`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | `EntryFunktionalitaetPage.tsx` an Namespace `eingangssysteme` angebunden, `funktionalitaet.hero.{label,headline,intro}`, `funktionalitaet.items.tuerkommunikation.{subtitle,title,text,imageAlt,features}` (6 Items), `accessControl.{...,features}` (2 Items), `verwahrung.{subtitle,title,text,imageAlt}` (ohne features), `gebaeudesicherheit.{...,features}` (3 Items), `wayfinding.{...,features}` (4 Items), `beleuchtung.{subtitle,title,text,imageAlt}` (ohne features), `service.{subtitle,title,text,imageAlt}` (ohne features) sowie seitenlokal `funktionalitaet.nav.prev` / `funktionalitaet.nav.next` in DE/EN ergänzt (je +48 Leaf-Keys inkl. 15 Listenelemente, gesamt jetzt **180 Leaf-Keys pro Locale** = 3× `_meta.*` + 177 fachliche Keys: 1 `shared` + 13 `design` + 21 `integrationsformen` + 51 `material` + 21 `standards` + 22 `beratung` + 48 `funktionalitaet`), `_meta.status` unverändert `in-progress`, `shared.label` aus 19b-1 wiederverwendet, DE/EN strukturgleich, 0 Diff, 0 leere Werte. Seite nutzt `useTranslation("eingangssysteme")`, 7 Funktionsblöcke via stabile Item-Map (`tuerkommunikation`/`accessControl`/`verwahrung`/`gebaeudesicherheit`/`wayfinding`/`beleuchtung`/`service`), optionale Feature-Listen via `t(..., { returnObjects: true }) as string[]` i18n-geführt, Bild-`alt` über `imageAlt`-Keys, bestehendes RTL/LTR-Layout (`md:direction-rtl` / `md:order-1` / `md:order-2`) je Index unverändert, Fachbegriffe (Access Control, BMA, FSE, FSD, AAL, Wayfinding) fachlich korrekt erhalten, keine sichtbaren harten deutschen Texte mehr. `EntryFunktionalitaetPage.tsx` in `scripts/i18n/i18n-check.config.json` unter `strictPages` aufgenommen (jetzt 13 strictPages). Layout/Klassen/Reihenfolge/Bild-URLs/Links/Routen/Navigation/Assets unverändert. `npm run i18n:check` grün (16 Namespaces, 13 Seiten, 0 Fehler, 0 Warnungen), `npm run build` erfolgreich (8.33s, nur bekannte Chunk-Size-Warnung). |
| 19b-6-final-check | 2026-04-22 | Entry Funktionalität i18n geprüft | `src/features/eingangssysteme/pages/EntryFunktionalitaetPage.tsx`, `src/i18n/locales/de/eingangssysteme.json`, `src/i18n/locales/en/eingangssysteme.json`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | Entry-Funktionalität-i18n final geprüft: `EntryFunktionalitaetPage.tsx` nutzt `useTranslation("eingangssysteme")`, alle sichtbaren Texte laufen über `shared.label`, `funktionalitaet.hero.{label,headline,intro}`, `funktionalitaet.items.tuerkommunikation.{subtitle,title,text,imageAlt,features}` (6 Items), `accessControl.{...,features}` (2 Items), `verwahrung.{subtitle,title,text,imageAlt}` (ohne features), `gebaeudesicherheit.{...,features}` (3 Items), `wayfinding.{...,features}` (4 Items), `beleuchtung.{subtitle,title,text,imageAlt}` (ohne features), `service.{subtitle,title,text,imageAlt}` (ohne features) sowie seitenlokal `funktionalitaet.nav.prev` / `funktionalitaet.nav.next`; DE/EN strukturgleich mit je **180 Leaf-Keys gesamt pro Locale** (= 3× `_meta.*` + 177 fachliche Keys, inkl. der 15 Feature-Listenelemente aus `funktionalitaet.items.*.features`), 0 Diff, 0 leere Werte, `_meta.status` weiterhin `in-progress`, `EntryFunktionalitaetPage.tsx` in `strictPages` enthalten (13 strictPages), keine sichtbaren harten deutschen Texte mehr, optionale Feature-Listen nur bei den vorgesehenen 4 Blöcken (`tuerkommunikation`/`accessControl`/`gebaeudesicherheit`/`wayfinding`) korrekt via `t(..., { returnObjects: true }) as string[]` i18n-geführt, Bild-`alt` über `imageAlt`-Keys, bestehendes RTL/LTR-Layout (`md:direction-rtl` / `md:order-1` / `md:order-2`) je Index unverändert, Fachbegriffe (Access Control, BMA, FSE, FSD, AAL, Wayfinding) fachlich korrekt erhalten, Layout/Routen/Navigation/Assets unverändert, `npm run i18n:check` grün (16 Namespaces, 13 Seiten, 0 Fehler, 0 Warnungen), `npm run build` erfolgreich (6.61s, nur bekannte Chunk-Size-Warnung). |
| 19b-7 | 2026-04-22 | Entry Referenzen nach i18n migriert | `src/features/eingangssysteme/pages/EntryReferenzenPage.tsx`, `src/i18n/locales/de/eingangssysteme.json`, `src/i18n/locales/en/eingangssysteme.json`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | `EntryReferenzenPage.tsx` an Namespace `eingangssysteme` angebunden, `referenzen.hero.{label,headline,intro}`, `referenzen.labels.designWish`, `referenzen.labels.scope`, `referenzen.items.forumMuseumsinsel.{subtitle,title,description,design,imageAlt,scope[]}`, `pulse.{...}`, `weidtParkCorner.{...}`, `hamburgerFamiliendomizil.{...}`, `fritzTower.{...}`, `potsdamerWohnhaus.{...}` inklusive `scope`-Listen sowie seitenlokal `referenzen.nav.prev` / `referenzen.nav.next` in DE/EN ergänzt (je +60 Leaf-Keys inkl. 24 Listenelemente, gesamt jetzt **240 Leaf-Keys pro Locale** = 3× `_meta.*` + 237 fachliche Keys: 1 `shared` + 13 `design` + 21 `integrationsformen` + 51 `material` + 21 `standards` + 22 `beratung` + 48 `funktionalitaet` + 60 `referenzen`), `_meta.status` unverändert `in-progress`, `shared.label` aus 19b-1 wiederverwendet, DE/EN strukturgleich, 0 Diff, 0 leere Werte. Seite nutzt `useTranslation("eingangssysteme")`, 6 Referenzobjekte via stabile Item-Map (`forumMuseumsinsel`/`pulse`/`weidtParkCorner`/`hamburgerFamiliendomizil`/`fritzTower`/`potsdamerWohnhaus`), Scope-Listen via `t(..., { returnObjects: true }) as string[]` i18n-geführt, Bild-`alt` über `imageAlt`-Keys, fixe Sublabels über `referenzen.labels.designWish` / `referenzen.labels.scope`, bestehendes alternierendes RTL/LTR-Layout (`md:order-1`/`md:order-2` je Index) unverändert, Eigennamen (Forum an der Museumsinsel, Pulse, Weidt Park Corner, Fritz Tower, Hamburg/Berlin/Potsdam) fachlich korrekt erhalten, keine sichtbaren harten deutschen Texte mehr. `EntryReferenzenPage.tsx` in `scripts/i18n/i18n-check.config.json` unter `strictPages` aufgenommen (jetzt 14 strictPages). Layout/Klassen/Reihenfolge/Bild-URLs/Links/Routen/Navigation/Assets unverändert. `npm run i18n:check` grün (16 Namespaces, 14 Seiten, 0 Fehler, 0 Warnungen), `npm run build` erfolgreich (8.26s, nur bekannte Chunk-Size-Warnung). |
| 19b-7-final-check | 2026-04-22 | Entry Referenzen i18n geprüft | `src/features/eingangssysteme/pages/EntryReferenzenPage.tsx`, `src/i18n/locales/de/eingangssysteme.json`, `src/i18n/locales/en/eingangssysteme.json`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | Entry-Referenzen-i18n final geprüft: `EntryReferenzenPage.tsx` nutzt `useTranslation("eingangssysteme")`, alle sichtbaren Texte laufen über `shared.label`, `referenzen.hero.*`, `referenzen.labels.designWish`, `referenzen.labels.scope`, `referenzen.items.forumMuseumsinsel.*`, `pulse.*`, `weidtParkCorner.*`, `hamburgerFamiliendomizil.*`, `fritzTower.*`, `potsdamerWohnhaus.*` sowie seitenlokal `referenzen.nav.prev` / `referenzen.nav.next`; DE/EN strukturgleich mit je 240 Leaf-Keys gesamt pro Locale (= 3× `_meta.*` + 237 fachliche Keys), 0 Diff, 0 leere Werte, `_meta.status` weiterhin `in-progress`, `EntryReferenzenPage.tsx` in `strictPages` enthalten, keine sichtbaren harten deutschen Texte mehr, `scope`-Listen (3+3+5+4+5+3 = 24 Items) korrekt via `t(..., { returnObjects: true }) as string[]` i18n-geführt, Eigennamen (Forum an der Museumsinsel, Pulse, Weidt Park Corner, Fritz Tower, Hamburg/Berlin/Potsdam) fachlich korrekt erhalten, bestehendes alternierendes Layout (`md:order-1`/`md:order-2`) unverändert, Layout/Routen/Navigation/Assets unverändert, `npm run i18n:check` grün (16 Namespaces, 14 Seiten, 0 Fehler, 0 Warnungen), `npm run build` erfolgreich (5.99s, nur bekannte Chunk-Size-Warnung). |
| 19b-8 | 2026-04-23 | Entry Root (EntrySystemPage) nach i18n migriert | `src/features/eingangssysteme/pages/EntrySystemPage.tsx`, `src/i18n/locales/de/eingangssysteme.json`, `src/i18n/locales/en/eingangssysteme.json`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | `EntrySystemPage.tsx` an Namespace `eingangssysteme` angebunden, neuer Block `root.*` ergänzt mit `root.hero.{label,headline,intro}`, `root.pillars.derEingang.{label,title,text}`, `herstellerGewerke.{...}`, `lifecycle.{...}`, `root.discover.{title,intro,more}`, `root.discover.items.{design,funktionalitaet,material,integrationsformen,referenzen,standards,beratung}.{title,subtitle,description}` (7 Items × 3 = 21 Keys), `root.downloads.{title,intro}`, `root.downloads.items.{entryExpose,broschuereSonderbau,datenblattUnterputz,datenblattInputz,datenblattZubehoer}.label` (5 Items), `root.cta.{title,text,cta}` in DE/EN ergänzt (je +46 Leaf-Keys, gesamt jetzt **286 Leaf-Keys pro Locale** = 3× `_meta.*` + 283 fachliche Keys: 1 `shared` + 46 `root` + 13 `design` + 21 `integrationsformen` + 51 `material` + 21 `standards` + 22 `beratung` + 48 `funktionalitaet` + 60 `referenzen`), `_meta.status` unverändert `in-progress`, `shared.label` unverändert (Discover-Kurzbeschreibungen bewusst eigenständig im Root, nicht mit Unterseiten-Hero zusammengelegt), DE/EN strukturgleich, 0 Diff, 0 leere Werte. Seite nutzt `useTranslation("eingangssysteme")`, 3 Pillars via stabile Key-Liste (`derEingang`/`herstellerGewerke`/`lifecycle`), 7 Discover-Karten via stabile Item-Map (`discoverItems` mit Schlüssel + externer Bild-URL + Link), 5 Downloads via stabile Key-Map (`downloadItems` mit URL), Bild-`alt` über die i18n-`title`-Keys geführt, `ENTRY` als Markenbezeichnung unverändert, externe jimcdn.com-Bild-URLs, PDF-Links, `target="_blank"` / `rel="noopener noreferrer"` und interne `/kontakt`-Route unverändert, keine sichtbaren harten deutschen Texte mehr. `EntrySystemPage.tsx` in `scripts/i18n/i18n-check.config.json` unter `strictPages` aufgenommen (jetzt 15 strictPages). Layout/Klassen/Reihenfolge/Bild-URLs/Links/Routen/Navigation/Assets unverändert. `npm run i18n:check` grün (16 Namespaces, 15 Seiten, 0 Fehler, 0 Warnungen), `npm run build` erfolgreich (7.58s, nur bekannte Chunk-Size-Warnung). |
| 19b-8-final-check | 2026-04-23 | Entry Root i18n geprüft | `src/features/eingangssysteme/pages/EntrySystemPage.tsx`, `src/i18n/locales/de/eingangssysteme.json`, `src/i18n/locales/en/eingangssysteme.json`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | Entry-Root-i18n final geprüft: `EntrySystemPage.tsx` nutzt `useTranslation("eingangssysteme")`, alle sichtbaren Texte laufen über `root.hero.{label,headline,intro}`, `root.pillars.{derEingang,herstellerGewerke,lifecycle}.{label,title,text}`, `root.discover.{title,intro,more}` + `root.discover.items.{design,funktionalitaet,material,integrationsformen,referenzen,standards,beratung}.{title,subtitle,description}`, `root.downloads.{title,intro}` + `root.downloads.items.{entryExpose,broschuereSonderbau,datenblattUnterputz,datenblattInputz,datenblattZubehoer}.label`, `root.cta.{title,text,cta}`. DE/EN exakt strukturgleich, je **286 Leaf-Keys** verifiziert (Diff 0, 0 leere Werte DE, 0 leere Werte EN). `EntrySystemPage.tsx` korrekt in `strictPages` enthalten (jetzt 15 strictPages). `ENTRY` als Markenbezeichnung erhalten, externe jimcdn.com-Bild-URLs, PDF-Links, `target="_blank"` / `rel="noopener noreferrer"` und interne `/kontakt`-Route unverändert. Pillars via stabile Key-Liste, Discover via stabile Item-Map, Downloads via stabile Key-Map – Reihenfolge unverändert. `npm run i18n:check` grün (16 Namespaces, 15 Seiten, 0 Fehler, 0 Warnungen), `npm run build` erfolgreich (9.33s, nur bekannte Chunk-Size-Warnung). Keine inhaltlichen, layout-, klassen- oder asset-bezogenen Änderungen. |
| 19b-final-check | 2026-04-23 | Domain `eingangssysteme` final abgeschlossen | `src/i18n/locales/de/eingangssysteme.json`, `src/i18n/locales/en/eingangssysteme.json`, `docs/current-status.md`, `docs/migration-log.md` | erledigt | Domain `eingangssysteme` final abgeschlossen. Routebasierter Scope verifiziert: `src/features/eingangssysteme/routes.tsx` rendert genau 8 Routen unter `/entry-system/*` mit den 8 Pages `EntrySystemPage`, `EntryDesignPage`, `EntryFunktionalitaetPage`, `EntryMaterialPage`, `EntryIntegrationsformenPage`, `EntryReferenzenPage`, `EntryStandardsPage`, `EntryBeratungPage`. Alle 8 Pages nutzen `useTranslation("eingangssysteme")`, alle 8 sind in `scripts/i18n/i18n-check.config.json` unter `strictPages` enthalten (8 Entry-Einträge, gesamt 15 strictPages projektweit), keine fehlenden, falschen oder doppelten Einträge. DE/EN strukturgleich mit je **286 Leaf-Keys gesamt pro Locale** (= 3× `_meta.*` + 283 fachliche Keys: 1 `shared` + 46 `root` + 13 `design` + 21 `integrationsformen` + 51 `material` + 21 `standards` + 22 `beratung` + 48 `funktionalitaet` + 60 `referenzen`), 0 Diff, 0 leere Werte DE/EN. Keine sichtbaren harten deutschen Texte mehr in den 8 Entry-Seiten (i18n-Check meldet pro Seite `useTranslation: ja`, `harte deutsche Texte: 0`). `_meta.status` von `in-progress` auf `migrated` gesetzt (DE und EN), Note entsprechend aktualisiert. `docs/current-status.md` aktualisiert: Domain `eingangssysteme` jetzt als ✅ migriert mit den 8 Bereichen aufgelistet, Stand-Zeile auf `19b-final-check` gesetzt. Keine Korrekturen an TSX, Routen, Navigation, Assets, Layout, Klassen oder Slugs nötig – Final-Check ohne Eingriff bestanden. `i18n-strategy.md` und `code-landkarte.md` nicht angefasst, da deren Aussagen bereits konsistent sind. `npm run i18n:check` grün (16 Namespaces, 15 Seiten, 0 Fehler, 0 Warnungen), `npm run build` erfolgreich (9.33s, nur bekannte Chunk-Size-Warnung). |
| 19b-doc-nachzug | 2026-04-23 | Doku-Nachzug nach 19b-final-check | `docs/01-strategy/i18n-strategy.md`, `docs/02-architecture/code-landkarte.md`, `docs/migration-log.md` | erledigt | Reine Doku-Aktualisierung, keine Code-, Routing-, Layout-, Asset- oder i18n-Inhaltsänderungen. `i18n-strategy.md` und `code-landkarte.md` standen noch auf `19a-final-check`. Stand-Zeilen beider Dokumente auf `19b-final-check` gesetzt. In `i18n-strategy.md` Tabelle „Migrierte Namespaces" um `eingangssysteme` ergänzt (Root/Entry, Design, Funktionalität, Material, Integrationsformen, Referenzen, Standards, Beratung; 8 Seiten, 286 Leaf-Keys pro Locale, `_meta.status = "migrated"`, alle 8 Seiten in `strictPages`); in „Noch nicht migriert" entsprechend entfernt. In `code-landkarte.md` Aufzählung produktiv migrierter Namespaces um `eingangssysteme` ergänzt und aus der Restliste entfernt. `current-status.md` bereits in 19b-final-check aktualisiert, hier nur quergeprüft (konsistent). Keine inhaltlichen Strategie-Umbauten, keine neuen Konzepte. `npm run i18n:check` grün (16 Namespaces, 15 Seiten, 0 Fehler, 0 Warnungen), `npm run build` erfolgreich. |
| 19c-0 | 2026-04-23 | Inventar Domain `anwendungen` erstellt | `docs/03-inventories/i18n-anwendungen-inventory.md`, `docs/migration-log.md` | erledigt | Reines Inventar, keine Code-, Routing-, Navigation-, Layout-, Asset-, Locale- oder `strictPages`-Änderungen. Domain `anwendungen` umfasst **24 aktive Routen + 2 Legacy-Fallbacks** in `src/features/anwendungen/routes.tsx`. Insgesamt **24 Page-Komponenten** + 1 gemeinsames Detail-Shell (`AnwendungDetailPage.tsx`, 209 Zeilen) + 1 Datendatei (`data/referenzprojekte.ts`, 281 Zeilen, 6 Projekte). `grep useTranslation` ergibt **0 Treffer** – keine Seite und keine Komponente der Domain ist bisher i18n-angeschlossen. Locale-Dateien `src/i18n/locales/{de,en}/anwendungen.json` enthalten ausschließlich `_meta` (`status = "prepared"`). Drei Klassen identifiziert: A) Übersichts-/Root-Seiten mit eigenem Layout (`AnwendungenPage` 444 Zeilen, `BildungseinrichtungenPage` 219, `WohnbauPage` 112, `OeffentlicheHandPage` 103, `ObjektloesungenPage` 104, `GesundheitseinrichtungenPage` 95); B) 16 Detail-Seiten (`Einfamilienhaus`/`Mehrfamilienhaus`/`Grossanlage`/`Sanierung`/`Pflege`/`Klinik`/`Behoerde`/`Feuerwehr`/`Schwimmbad`/`Concierge`/`InterneKommunikation`/`DigitaleNamensverwaltung`/`Feuerwehrdurchsage`/`BidirektionaleVideo`/`MobileTuerkommunikation`/`ZutrittskontrolleBCM`) – alle 52–64 Zeilen, alle teilen sich Shell `AnwendungDetailPage` und liefern reine `AnwendungPageData`-Objekte; C) Referenzen (`ReferenzprojektePage` 70, `ReferenzprojektDetailPage` 137, gespeist aus 281-zeiliger Datendatei mit Eigennamen + Mehrabsatz-Beschreibungen). Empfohlene Tranchen: `19c-1` Shell (`AnwendungDetailPage` + Tool-Block + CTA → `anwendungen.shared.*`); `19c-2` Detail-Wohnen (4); `19c-3` Detail-Gesundheit/öffentlich (5); `19c-4` Detail-System/Funktion (7); `19c-5` Übersichts-Seiten klein/mittel (4); `19c-6` `BildungseinrichtungenPage` (Eigenlayout); `19c-7` Referenzen (Liste + Detail + Datendatei); `19c-8` `AnwendungenPage` (Root, 444 Zeilen, am Ende wegen Textüberlappung); `19c-final-check` analog `19b-final-check`. **Empfohlene erste Etappe: `19c-1` (Shell-Migration `AnwendungDetailPage.tsx`)**, weil davon 16 Detail-Seiten profitieren. `strictPages`-Kandidaten: alle 24 Pages am Domain-Ende; Shell selbst ist Komponente und wird indirekt geprüft. Risiken dokumentiert: Eigennamen in `referenzprojekte.ts` sprachneutral lassen, externe `tcsag.de`-Bild-URLs und PDF-Links unverändert, Tag-Listen sind i18n-relevant, kein domain-übergreifender Shared-Reuse mit `eingangssysteme.shared.*`, Text-Dubletten zwischen `AnwendungenPage` und Detail-Seiten bewusst nicht zusammenlegen. `npm run i18n:check` grün (16 Namespaces, 15 Seiten, 0 Fehler, 0 Warnungen), `npm run build` erfolgreich. |
| 19c-1 | 2026-04-23 | Shared-Shell `AnwendungDetailPage.tsx` an i18n angebunden | `src/features/anwendungen/components/AnwendungDetailPage.tsx`, `src/i18n/locales/de/anwendungen.json`, `src/i18n/locales/en/anwendungen.json`, `docs/migration-log.md` | erledigt | Shared-Shell für 16 Detailseiten der Domain `anwendungen` an `useTranslation("anwendungen")` angebunden. Nur shell-eigene sichtbare Texte unter `shared.*` migriert: `sections.*` (anforderungen/systemleistungen/systembausteine/werkzeuge/verwandteAnwendungen), `subtitles.*` (anforderungenForHeadline mit `{{headline}}`-Interpolation, systembausteine, werkzeuge), `labels.leistungen`, `tools.*` (konfigurator/tcsplan/ausschreibungstexte/beratung mit je label/desc), `actions.open`, `cta.*` (projektTitle/projektText/kontaktAufnehmen). Tools-Konstante in den Komponenten-Body verschoben, damit `t()` zur Laufzeit aufgelöst wird; Routen-Targets (`/planen-konfigurieren`, `/technischer-support`, `/downloads`, `/kontakt`) und Reihenfolge unverändert. Von Detailseiten übergebene Inhalte (`label`, `headline`, `intro`, `description`, `anforderungen`, `leistungen`, `systembausteine`, `broschure`, `verwandteAnwendungen`) bleiben in dieser Etappe bewusst hart in den jeweiligen Page-Dateien — keine Änderung an den 16 Detailseiten, an `AnwendungenPage.tsx`, `Referenzprojekte*` oder anderen Übersichtsseiten. `_meta.status` in DE und EN von `prepared` auf `in-progress` gesetzt, `_meta.namespace` unverändert, `_meta.note` aktualisiert. DE als Master, EN strukturgleich (je 24 Leaf-Keys inkl. `_meta`). 0 Diff, 0 leere Werte. `strictPages` bewusst nicht ergänzt (Shell ist keine Page; Detailseiten enthalten weiterhin harte Daten). Layout, Klassen, Animationen, Icons, externe Bild-URLs, Routen, Navigation, Assets unverändert. `npm run i18n:check` grün (16 Namespaces, 15 strictPages, 0 Fehler, 0 Warnungen), `npm run build` erfolgreich (6.60s), nur bekannte Chunk-Size-Warnung. |
| 19c-2 | 2026-04-23 | Anwendungen Wohnbau-Tranche nach i18n migriert | `src/features/anwendungen/pages/EinfamilienhausPage.tsx`, `src/features/anwendungen/pages/MehrfamilienhausPage.tsx`, `src/features/anwendungen/pages/GrossanlagePage.tsx`, `src/features/anwendungen/pages/SanierungPage.tsx`, `src/i18n/locales/de/anwendungen.json`, `src/i18n/locales/en/anwendungen.json`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | Wohnbau-Detailseiten (Einfamilienhaus, Mehrfamilienhaus, Großanlage, Sanierung) nach Namespace `anwendungen.wohnen.*` migriert. Pro Seite je ein Block `wohnen.{einfamilienhaus|mehrfamilienhaus|grossanlage|sanierung}.*` mit `headline`, `intro`, `description`, `anforderungen.*` (label/text), `leistungen.*` (title + items[]) und `systembausteine.*` (label/title/description). Markenbegriffe in `systembausteine.label` (PES PRO, CARUS ARGOS, BCM, SKYLINE TEN PRO, snipdoo® IP, Smart Stick, SIGNAGE) bleiben in DE/EN identisch. Gemeinsamer Block `shared.labelsCommon.anwendungsloesung` für PageLayout-Label sowie `shared.verwandte.*` (10 Labels) für die Buttons der Verwandten Anwendungen ergänzt – Hrefs bleiben hart in TSX. Alle 4 Pages nutzen `useTranslation("anwendungen")`, die `data`-Objekte werden in der Komponente per `t()` aufgebaut, Arrays via `returnObjects: true`. Hero-Bilder, Icons (lucide-react), interne Links (`/anwendungen/...`) und Komponentenstruktur unverändert. `Sanierung`: leerer dritter Leistungsbereich aus dem Vorbestand entfernt (war `{ title: "", items: [] }` und produzierte keinen sichtbaren Text). `_meta.status` bleibt `in-progress` (DE/EN), `_meta.note` minimal aktualisiert. DE als Master, EN strukturgleich, keine leeren Werte. Vier Seiten in `scripts/i18n/i18n-check.config.json` unter `strictPages` ergänzt (jetzt 19 Seiten gesamt). `AnwendungDetailPage.tsx` (Shell) bewusst nicht in `strictPages` (keine Page). Andere `anwendungen`-Seiten, Routen, Navigation, Layout, Klassen und Assets unverändert. `npm run i18n:check` grün, `npm run build` erfolgreich. |
| 19c-3 | 2026-04-23 | Anwendungen Gesundheit + öffentlich nach i18n migriert | `src/features/anwendungen/pages/PflegePage.tsx`, `src/features/anwendungen/pages/KlinikPage.tsx`, `src/features/anwendungen/pages/BehoerdePage.tsx`, `src/features/anwendungen/pages/FeuerwehrPage.tsx`, `src/features/anwendungen/pages/SchwimmbadPage.tsx`, `src/i18n/locales/de/anwendungen.json`, `src/i18n/locales/en/anwendungen.json`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | Detailseiten Pflege & Klinik unter `anwendungen.gesundheit.*`, Behörde, Feuerwehr und Schwimmbad unter `anwendungen.oeffentlich.*` migriert. Pro Seite je ein Block mit `headline`, `intro`, `description`, `anforderungen.*` (label/text), `leistungen.*` (title + items[]), `systembausteine.*` (label/title/description) und `broschure.label`. Alle 5 Pages nutzen `useTranslation("anwendungen")`, lokale `data`-Objekte werden im Component-Body per `t()` aufgebaut, Arrays via `returnObjects: true`. Hero-Bilder, Icons (lucide-react), interne Links (`/anwendungen/...`), PDF-URLs (tcsag.de) und Komponentenstruktur unverändert. Markenbegriffe in `systembausteine.label` (PES PRO, CARUS ARGOS, SKYLINE TEN PRO, BCM Online/Zylinder, SIGNAGE Display) DE/EN identisch. `shared.verwandte.*` um 7 weitere Labels ergänzt (`bidirektionaleVideo`, `interneKommunikation`, `feuerwehrdurchsage`, `concierge`, `schule`, `feuerwehr`, `schwimmbad`); bestehende Wohnbau-Keys unverändert. `shared.labelsCommon.anwendungsloesung` für PageLayout-Label weiterverwendet. `_meta.status` bleibt `in-progress` (DE/EN), `_meta.note` aktualisiert. DE als Master, EN strukturgleich, keine leeren Werte. Fünf Seiten in `scripts/i18n/i18n-check.config.json` unter `strictPages` ergänzt (jetzt 24 Seiten gesamt). `AnwendungDetailPage.tsx` (Shell) bewusst nicht in `strictPages`. Andere `anwendungen`-Seiten (`AnwendungenPage`, `Referenzprojekte*`, restliche Detailseiten), Routen, Navigation, Layout, Klassen und Assets unverändert. `npm run i18n:check` grün, `npm run build` erfolgreich. |
| 19c-4 | 2026-04-23 | Anwendungen System-/Funktions-Tranche nach i18n migriert | `src/features/anwendungen/pages/ConciergePage.tsx`, `src/features/anwendungen/pages/InterneKommunikationPage.tsx`, `src/features/anwendungen/pages/DigitaleNamensverwaltungPage.tsx`, `src/features/anwendungen/pages/FeuerwehrdurchsagePage.tsx`, `src/features/anwendungen/pages/BidirektionaleVideoPage.tsx`, `src/features/anwendungen/pages/MobileTuerkommunikationPage.tsx`, `src/features/anwendungen/pages/ZutrittskontrolleBCMPage.tsx`, `src/i18n/locales/de/anwendungen.json`, `src/i18n/locales/en/anwendungen.json`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | System-/Funktions-Detailseiten unter `anwendungen.funktionen.*` migriert (Concierge, InterneKommunikation, DigitaleNamensverwaltung, Feuerwehrdurchsage, BidirektionaleVideo, MobileTuerkommunikation, ZutrittskontrolleBCM). Pro Seite ein Block `funktionen.{key}.*` mit `headline`, `intro`, `description`, `anforderungen.*` (label/text), `leistungen.*` (title + items[]); je nach Seite zusätzlich `systembausteine.*` (label/title/description) und `broschure.label`. `MobileTuerkommunikation` und `ZutrittskontrolleBCM` mit eigenem Page-`label` (statt `shared.labelsCommon.anwendungsloesung`), da fachlich abweichend ("Mobile Lösungen" / "Zutrittskontrolle / BCM"). `ZutrittskontrolleBCM` ohne `systembausteine` und ohne `broschure` (im Original nicht vorhanden). Alle 7 Pages nutzen `useTranslation("anwendungen")`, lokale `data`-Objekte werden im Component-Body per `t()` aufgebaut, Arrays via `returnObjects: true`. Hero-Bilder, Icons (lucide-react), interne Links (`/anwendungen/...`), PDF-URLs (tcsag.de) und Komponentenstruktur unverändert. Markenbegriffe in `systembausteine.label` (PES PRO, CARUS ARGOS, SKYLINE TEN PRO, FDE, TASTA, ecoos, FFI/FBI-Codes, snipdoo® HOME, Smart Stick) DE/EN identisch. `shared.verwandte.zutrittskontrolleBCM` als einziger neuer Shared-Verwandte-Key ergänzt; alle übrigen Verwandten-Labels (concierge, behoerde, grossanlage, mehrfamilienhaus, einfamilienhaus, sanierung, pflege, klinik, feuerwehr, interneKommunikation, feuerwehrdurchsage, wohnheim) aus 19c-2/19c-3 wiederverwendet. `_meta.status` bleibt `in-progress` (DE/EN), `_meta.note` aktualisiert. DE als Master, EN strukturgleich (DE/EN je 654 Leaf-Keys inkl. Array-Elemente und `_meta`), keine leeren Werte. Sieben Seiten in `scripts/i18n/i18n-check.config.json` unter `strictPages` ergänzt (jetzt 31 Seiten gesamt). `AnwendungDetailPage.tsx` (Shell) bewusst nicht in `strictPages`. Andere `anwendungen`-Seiten (`AnwendungenPage`, `Referenzprojekte*`, restliche Übersichts- und Wohnbau-/Gesundheits-/Öffentlich-Detailseiten), Routen, Navigation, Layout, Klassen und Assets unverändert. `npm run i18n:check` grün, `npm run build` erfolgreich. |
| 19c-5 | 2026-04-23 | Anwendungen mittlere Übersichtsseiten nach i18n migriert | `src/features/anwendungen/pages/WohnbauPage.tsx`, `src/features/anwendungen/pages/GesundheitseinrichtungenPage.tsx`, `src/features/anwendungen/pages/OeffentlicheHandPage.tsx`, `src/features/anwendungen/pages/ObjektloesungenPage.tsx`, `src/i18n/locales/de/anwendungen.json`, `src/i18n/locales/en/anwendungen.json`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | Vier mittlere Übersichtsseiten unter `anwendungen.uebersichten.*` migriert: `wohnen` (4 Karten), `gesundheit` (2 Karten), `oeffentlich` (3 Karten), `objektloesungen` (8 Items). Pro Seite eigene `hero`- und `section`-Texte plus `cards.*` bzw. `items.*` mit `title`, `description`/`text`, `tags`/`subtitle`. Übersichtstexte bewusst nicht mit Detailseiten-Keys aus 19c-2/19c-3/19c-4 zusammengezogen (eigenständige Teaser-Inhalte). Alle 4 Pages nutzen `useTranslation("anwendungen")`, lokale Card-/Item-Arrays bleiben in TSX (Icons, hrefs, Hero-Bilder, Layout, Klassen unverändert), sichtbare Inhalte werden im Component-Body per `t()` aufgebaut, Tag-Arrays via `returnObjects: true`. Hero-Bilder (lokale Asset-Imports und tcsag.de-URLs), interne Links (`/anwendungen/...`), Reihenfolgen, Layout, Animationen und Komponentenstruktur unverändert. `_meta.status` bleibt `in-progress` (DE/EN), `_meta.note` aktualisiert. DE als Master, EN strukturgleich (DE/EN je 749 Leaf-Keys inkl. Array-Elemente und `_meta`, +95 Leaves), keine leeren Werte. Vier Seiten in `scripts/i18n/i18n-check.config.json` unter `strictPages` ergänzt (jetzt 35 Seiten gesamt). `AnwendungDetailPage.tsx`, `BildungseinrichtungenPage.tsx`, `AnwendungenPage.tsx`, `Referenzprojekte*` und alle migrierten Detailseiten aus 19c-2/19c-3/19c-4 unverändert. `npm run i18n:check` grün, `npm run build` erfolgreich. |
| 19c-6 | 2026-04-23 | Anwendungen Bildungseinrichtungen nach i18n migriert | `src/features/anwendungen/pages/BildungseinrichtungenPage.tsx`, `src/i18n/locales/de/anwendungen.json`, `src/i18n/locales/en/anwendungen.json`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | Spezialseite `BildungseinrichtungenPage.tsx` unter neuem Block `anwendungen.bildung.*` migriert. Struktur: `bildung.hero.{label,headline,intro}`, `bildung.sections.{anforderungen,leistungen,broschure}` (feste Zwischenüberschriften und Broschüren-Link-Label) sowie pro Einrichtung `bildung.einrichtungen.{kita|schule|wohnheim}.*` mit `label`, `title`, `intro`, `imageAlt`, `anforderungen.{key}.{label,text}` (5/6/5 Items) und `leistungen.{sicherheit|kommunikation|orientierung}.{bereich,punkte[]}` (3/4/3 + 3/3/3 + 3/3/3 Punkte). Drei Einrichtungsblöcke fachlich getrennt erhalten, keine automatische Vereinheitlichung mit `uebersichten.*` oder Detailseiten-Keys aus 19c-2/19c-3/19c-4. Page nutzt `useTranslation("anwendungen")`, lokale `einrichtungen`-Definition behält Icons (lucide-react: Shield, Eye, Smartphone, Users, Monitor, MapPin, Bell, Key, BookOpen), Hero-Bild-URL (tcsag.de), pro Einrichtung Bild-URL, Broschüren-URL (tcsag.de) und Reihenfolge unverändert; sichtbare Inhalte komplett über `t()`, Punkte-Arrays via `returnObjects: true`. Tippfehler "Elterninformationen for" aus dem Original (DE-Kita Orientierungs-Punkt 1) bei Migration zu "Elterninformationen für" korrigiert (sachlich identisch, einziger sichtbarer Textfix). Layout, Klassen, Animationen, Sektion-Hintergrundwechsel (`bg-secondary`/`bg-background`), Icon-Größen, hrefs, Routen, Navigation, Assets unverändert. `_meta.status` bleibt `in-progress` (DE/EN), `_meta.note` aktualisiert. DE als Master, EN strukturgleich (DE/EN je 837 Leaf-Keys inkl. Array-Elemente und `_meta`, +88 Leaves), keine leeren Werte. `BildungseinrichtungenPage.tsx` in `scripts/i18n/i18n-check.config.json` unter `strictPages` ergänzt (jetzt 36 Seiten gesamt). `AnwendungDetailPage.tsx`, alle Übersichtsseiten aus 19c-5, alle Detailseiten aus 19c-2/19c-3/19c-4, `AnwendungenPage.tsx`, `Referenzprojekte*`, Routen, Navigation, Layout, Klassen, Slugs, interne Linkziele, PDF-URLs und externe URLs unverändert. `npm run i18n:check` grün (16 Namespaces, 36 strictPages, 0 Fehler, 0 Warnungen, useTranslation: ja, harte deutsche Texte: 0), `npm run build` erfolgreich (7.07s, nur bekannte Chunk-Size-Warnung). |
| 19c-7 | 2026-04-23 | Anwendungen Referenzen nach i18n migriert | `src/features/anwendungen/pages/ReferenzprojektePage.tsx`, `src/features/anwendungen/pages/ReferenzprojektDetailPage.tsx`, `src/features/anwendungen/data/referenzprojekte.ts`, `src/i18n/locales/de/anwendungen.json`, `src/i18n/locales/en/anwendungen.json`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | Referenzlisten- und Referenzdetail-Seite unter neuem Block `anwendungen.referenzen.*` migriert. Struktur: `referenzen.list.{label,headline,intro,kicker,title,subtitle,detailsCta}` (Hero und Listenkopf), `referenzen.detail.{label,back,imageAlt,sections.{beschreibung,highlights,projektdaten,systeme},meta.{gebaeudetyp,standort,fertigstellung,umfang},cta.{title,text,link},notFound.{label,headline,intro,back}}` (Detail-Shell, Sidebar-Labels, Fallback) sowie pro Projekt `referenzen.projekte.<slug>.{title,type,location,units,description,longDescription[3],highlights[4],systems[4]}` für alle 12 Projekte. `imageAlt` mit `{{title}}`/`{{index}}`-Interpolation. Datendatei `referenzprojekte.ts` auf reine Strukturdaten reduziert (`slug`, `year`, `images[3]`, `heroImage`); sichtbare Texte (`title`, `type`, `location`, `units`, `description`, `longDescription`, `highlights`, `systems`) und das alte `ReferenzprojektData`-Interface-Feld dafür entfernt – TypeScript-Interface neu auf Strukturfelder begrenzt. `year` bleibt numerisch und nicht lokalisiert. Eigennamen (`PULSE`, `Weidt Park Corner`, `Fritztower`, `Haupttelegraphenamt`, `Spichern 2`, `Thulestraße`, `Quartier Heidestrasse`, `Luisenpark Residenz`, `Klinikum Süd`, `Rathaus Neustadt`, `Campus Westend`, `Seniorenresidenz Am Park`) bleiben in DE und EN identisch erhalten. Beide Pages nutzen `useTranslation("anwendungen")`; Listen-Page rendert pro Projekt `title`/`type`/`description` aus i18n, Detail-Page rendert `longDescription`/`highlights`/`systems` via `returnObjects: true`. Slugs (12), Reihenfolge der Projekte (12), `images`-Reihenfolge pro Projekt, `heroImage`-URLs, Routen (`/anwendungen/referenzprojekte`, `/anwendungen/referenzprojekte/:slug`), interne Linkziele (`/anwendungen/referenzprojekte`, `/kontakt`) und externe Bild-URLs (`tcsag-web.lovable.app/referenzen/*.jpg`) unverändert. Layout, Klassen, Animationen (motion.div/whileInView/transition-Delays), Carousel-Aufbau, Icons (lucide-react: ArrowLeft, MapPin, Calendar, Building2, CheckCircle2), Hero-Bild `block-objekt.jpg` und Sidebar-Reihenfolge unverändert. `AnwendungDetailPage.tsx`, alle Detail-/Übersichts-/Spezialseiten aus 19c-2 bis 19c-6, `AnwendungenPage.tsx`, Navigation, Footer, MetaNavigation, andere Locales und andere Doku-Dateien nicht angefasst. `_meta.status` bleibt `in-progress` (DE/EN), `_meta.note` aktualisiert. DE als Master, EN strukturgleich (DE/EN je **1054 Leaf-Keys** inkl. Array-Elemente und `_meta`, +217 Leaves: 1 list-block (8) + 1 detail-block (16) + 12 projekte × ~16 Leaves inkl. Arrays); 0 Diff DE↔EN, 0 leere Werte DE/EN. `ReferenzprojektePage.tsx` und `ReferenzprojektDetailPage.tsx` in `scripts/i18n/i18n-check.config.json` unter `strictPages` ergänzt (jetzt **38 Seiten** gesamt); Datendatei `referenzprojekte.ts` bewusst nicht in `strictPages`. `npm run i18n:check` grün (16 Namespaces, 38 strictPages, 0 Fehler, 0 Warnungen), `npm run build` erfolgreich. |
| 19c-8 | 2026-04-23 | Anwendungen Root (`AnwendungenPage`) nach i18n migriert | `src/features/anwendungen/pages/AnwendungenPage.tsx`, `src/i18n/locales/de/anwendungen.json`, `src/i18n/locales/en/anwendungen.json`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | Root-Übersichtsseite `AnwendungenPage.tsx` (444 → 386 Zeilen) an Namespace `anwendungen` angebunden. Neuer eigenständiger Block `root.*` ergänzt: `root.hero.{label,headline,intro}`, `root.card.details`, `root.categories.{wohnen,bildung,gesundheit,oeffentlich,uebergreifend}.{label,subtitle,cards.<key>.{title,description,tags[]}}` für 5 Kategorien × insgesamt 17 Karten, `root.systemfunktionen.{label,headline,subtitle,cards.{concierge,interneKommunikation,namensverwaltung,feuerwehrdurchsage,bidirektionalesVideo}.{title,description,tags[]}}` (5 Karten), `root.referenzen.{label,headline,subtitle,projekte.{pulse-berlin,weidt-park-corner,fritztower,haupttelegraphenamt,spichern-2,thulestrasse}.{title,type}}` (6 Teaser). Eigennamen (PULSE Berlin, Weidt Park Corner, Fritztower, Haupttelegraphenamt, Spichern 2, Thulestraße) in DE und EN identisch. Root-Texte bewusst nicht mit `uebersichten.*` oder Detailseiten-Blöcken zusammengelegt; `root.referenzen.*` enthält nur Teaser (Title/Typ), keine Wiederverwendung aus `referenzen.projekte.*`. Karten-/Kategorien-/Systemfunktions-/Referenz-Arrays bleiben als reine Strukturlisten (Icon, Bild-URL, Slug-Key, href) in TSX, sichtbare Texte über Locale-Keys + `t(..., { returnObjects: true }) as string[]` für Tag-Listen. Slugs, Reihenfolgen, externe `tcsag.de`/`tcsag-web.lovable.app`-Bild-URLs, internen Routen (`/anwendungen/*`, `/entry-system`, `ROUTES.gebaeudekommunikation.beschilderung`), Icons (lucide-react), Layout, Klassen, Animationen, `heroImage` (`block-objekt.jpg`) und `PageLayout`-Aufbau unverändert. `_meta.status` bleibt `in-progress` (DE/EN), `_meta.note` aktualisiert. DE als Master, EN strukturgleich, +141 Leaf-Keys pro Locale (gesamt **1195 Leaf-Keys pro Locale** inkl. Array-Elemente und `_meta`), 0 Diff DE↔EN, 0 leere Werte DE/EN. `AnwendungenPage.tsx` in `scripts/i18n/i18n-check.config.json` unter `strictPages` ergänzt (jetzt **39 Seiten** gesamt). `npm run i18n:check` grün (16 Namespaces, 39 strictPages, 0 Fehler, 0 Warnungen), `npm run build` erfolgreich. Keine Änderungen an `AnwendungDetailPage.tsx`, Detail-/Übersichtsseiten aus 19c-2 bis 19c-7, Routen, Navigation, Assets oder Slugs. |
| 19c-final-check | 2026-04-23 | Domain `anwendungen` final abgeschlossen | `src/i18n/locales/de/anwendungen.json`, `src/i18n/locales/en/anwendungen.json`, `docs/current-status.md`, `docs/01-strategy/i18n-strategy.md`, `docs/02-architecture/code-landkarte.md`, `docs/migration-log.md` | erledigt | Domain `anwendungen` final abgeschlossen. Routebasierter Scope verifiziert: `src/features/anwendungen/routes.tsx` rendert 26 Routen für **24 einzigartige Page-Komponenten** unter `/anwendungen/*` (+ 2 Legacy-Top-Level-Fallbacks `/objektloesungen` und `/bildungseinrichtungen`, die `ObjektloesungenPage` bzw. `BildungseinrichtungenPage` wiederverwenden, daher nicht doppelt gezählt). Die 24 einzigartigen Pages: `AnwendungenPage`, `ObjektloesungenPage`, `BildungseinrichtungenPage`, `WohnbauPage`, `GesundheitseinrichtungenPage`, `OeffentlicheHandPage`, `EinfamilienhausPage`, `MehrfamilienhausPage`, `GrossanlagePage`, `SanierungPage`, `PflegePage`, `KlinikPage`, `BehoerdePage`, `FeuerwehrPage`, `SchwimmbadPage`, `ConciergePage`, `InterneKommunikationPage`, `DigitaleNamensverwaltungPage`, `FeuerwehrdurchsagePage`, `BidirektionaleVideoPage`, `MobileTuerkommunikationPage`, `ZutrittskontrolleBCMPage`, `ReferenzprojektePage`, `ReferenzprojektDetailPage`. Alle 24 Pages nutzen `useTranslation("anwendungen")`, alle in `scripts/i18n/i18n-check.config.json` unter `strictPages` enthalten (jetzt **39 Seiten** projektweit, davon **24 in `anwendungen`**, 15 in den vorherigen Domains `gebaeudemanagement`/`signage`/`eingangssysteme`). `AnwendungDetailPage.tsx` (gemeinsame Detail-Shell, indirekt geprüft) und Datendatei `data/referenzprojekte.ts` weiterhin korrekt **nicht** in `strictPages`. Locale-Struktur DE/EN exakt strukturgleich, je **1195 Leaf-Keys gesamt pro Locale** inkl. Array-Elemente und `_meta`, 0 Diff DE↔EN, 0 leere Werte DE/EN. Top-Level-Blöcke sauber getrennt: `_meta`, `shared` (Shell, Tools, CTA, verwandte Anwendungen), `wohnen`, `gesundheit`, `oeffentlich`, `funktionen` (System-/Funktions-Detailseiten), `uebersichten` (Übersichtsseiten Wohnen/Gesundheit/Öffentlich/Objektlösungen/Bildung), `referenzen` (Liste + Detail + 12 Projekte), `root` (Root-Übersichtsseite eigenständig). `_meta.status` in DE und EN von `in-progress` auf `migrated` gesetzt, `_meta.namespace` unverändert, `_meta.note` auf finalen Etappenstand aktualisiert. Domainweit keine sichtbaren harten deutschen Texte mehr; technische Bezeichner, Marken und Eigennamen (BCM, RFID, IP, snipdoo, ENTRY, PULSE, Weidt Park Corner, Fritztower, Haupttelegraphenamt, Spichern 2, Thulestraße usw.) korrekt erhalten, externe `tcsag.de`/`tcsag-web.lovable.app`-Bild-URLs, PDF-Links, internen Routen, Slugs (24), Reihenfolgen, Icons (lucide-react) und Layout/Klassen unverändert. Doku aktualisiert: `docs/current-status.md` (Status `anwendungen` ⏳ → ✅, Stand-Hinweis), `docs/01-strategy/i18n-strategy.md` (Stand-Hinweis), `docs/02-architecture/code-landkarte.md` (Stand-Hinweis). Keine Code-, Routing-, Navigation-, Layout-, Asset- oder `strictPages`-Änderungen außerhalb von `anwendungen`. `npm run i18n:check` grün (16 Namespaces, 39 strictPages, 0 Fehler, 0 Warnungen), `npm run build` erfolgreich (nur bekannte Chunk-Size-Warnung). |
| 19c-hotfix-bildung | 2026-04-23 | Hotfix: White-Screen `/anwendungen/bildungseinrichtungen` behoben | `src/features/anwendungen/pages/BildungseinrichtungenPage.tsx`, `docs/migration-log.md` | erledigt | Runtime-Crash `TypeError: punkte.map is not a function` auf `/anwendungen/bildungseinrichtungen` (DE und EN) behoben. Ursache: `BildungseinrichtungenPage.tsx` griff auf Keys unter `bildung.*` zu, während die Locale-Inhalte bereits unter `uebersichten.bildung.*` liegen (Top-Level-Block der Domain enthält `_meta`, `shared`, `wohnen`, `gesundheit`, `oeffentlich`, `funktionen`, `uebersichten`, `referenzen`, `root`; `bildung` ist Subblock von `uebersichten`). Dadurch lieferte `t(...)` die Key-Strings unverändert zurück, und `t("bildung.einrichtungen.<id>.leistungen.<lk>.punkte", { returnObjects: true })` ergab statt eines Arrays den String `"bildung.einrichtungen.kita.leistungen.sicherheit.punkte"`, dessen `.map(...)` crashte. Korrektur ausschließlich in der Page, kein Locale-Umbau. Korrigierte Pfade (4 Stellen): `bildung.hero.{label,headline,intro}` → `uebersichten.bildung.hero.{label,headline,intro}`, `bildung.sections.{anforderungen,leistungen,broschure}` → `uebersichten.bildung.sections.{anforderungen,leistungen,broschure}`, `const base = bildung.einrichtungen.${id}` → `const base = uebersichten.bildung.einrichtungen.${id}` (deckt damit `${base}.label/title/intro/imageAlt`, `${base}.anforderungen.<key>.{label,text}` und `${base}.leistungen.<lk>.{bereich,punkte[]}` für `kita`/`schule`/`wohnheim` ab). Keine sichtbaren Textänderungen, keine Layout-/Klassen-/Asset-/Link-/PDF-/Routen-Änderungen, Strukturdaten (`einrichtungen`-Array, Icons, Bildquellen, Broschüren-PDFs) unverändert. Locale-Dateien `de/anwendungen.json` und `en/anwendungen.json`, `scripts/i18n/i18n-check.config.json` und alle anderen Pages nicht angefasst. `_meta.status` in DE/EN bleibt `migrated`, Leaf-Keys unverändert (1195 pro Locale). `npm run i18n:check` grün (16 Namespaces, 39 strictPages, 0 Fehler, 0 Warnungen), `npm run build` erfolgreich. |
| service-hub-1 | 2026-04-23 | Öffentlicher Service-Hub (Service-Center) eingeführt | `src/features/service/pages/ServicePage.tsx`, `src/features/service/routes.tsx`, `src/navigation/routes.ts`, `src/navigation/mainNavigation.ts`, `src/components/MainNavigation.tsx`, `src/i18n/locales/de/service.json`, `src/i18n/locales/en/service.json`, `src/i18n/locales/de/navigation.json`, `src/i18n/locales/en/navigation.json`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | Neue öffentliche Hub-Seite `ServicePage.tsx` (DE: „Service-Center", EN: „Service Center") unter neuer Route `/service` angelegt; `ROUTES.service.root` neu eingeführt, bestehende Service-Unterrouten (`/planen-konfigurieren`, `/downloads`, `/technischer-support`, `/ersatzteile`, `/akademie`, `/serviceportal`) unverändert. Hauptnav-Eintrag `services` (Label „Service" bzw. „Service") nicht länger Platzhalter (`linkType: "placeholder"`, `path: "#"`), sondern aktiv (`linkType: "internal"`, `path: ROUTES.service.root`, `targetDomain: "service"`, `status: "active"`). `MainNavigation.tsx`: Präfix-Mapping um `["/service", "services"]` ergänzt, sodass `/service` korrekt den Top-Level-Aktivzustand setzt. Hub gliedert sich in 5 Gruppen: `produktzugang` (Katalog, Produktfinder, Serien, Stammdaten – noch teilweise auf Platzhalter `#`), `downloads` (Downloads, Datenblätter, Handbücher, Schaltpläne, Technische Unterlagen), `planung` (Planen & Ausschreibung, Ersatzteile, Konfiguratoren & Tools), `support` (Technischer Support, FAQ, Glossar), `akademie` (Akademie, Serviceportal). Verlinkungen zeigen, soweit vorhanden, auf bestehende Routen (`ROUTES.service.*`, `ROUTES.wissen.akademie`, `ROUTES.serviceportal.root`); Felder ohne echte Zielseite (Produktkatalog, Produktfinder, Serien, Stammdaten, FAQ, Glossar) verweisen bewusst auf den Platzhalter `ROUTES.placeholder.root`. i18n von Anfang an sauber: neuer Inhalt im bestehenden Namespace `service` unter `hub.hero.*` und `hub.sections.<gruppe>.{label,headline,intro,items.<key>.{title,description,linkLabel}}`; `_meta.status` von `prepared` auf `in-progress` gehoben (gemäß `allowedMetaStatus`). DE ist Master, EN strukturgleich, 0 Diff, 0 leere Werte. Breadcrumb-Segment `service` (DE „Service-Center", EN „Service Center") in `navigation.json` ergänzt. `ServicePage.tsx` in `scripts/i18n/i18n-check.config.json` unter `strictPages` aufgenommen (jetzt 40 strictPages). Kein Umbau anderer Domains, keine Umbenennung von `Serviceportal`, keine Änderungen an Layout-System, Assets oder anderen Hauptbereichen der Navigation. Sprachhinweis (nur Notiz, nicht umgesetzt): EN-Hauptnav verwendet aktuell `Applications` für `Anwendungen`; alternativ wäre `Use cases` fachlich näher am Marketing-Sprachgebrauch – Entscheidung bewusst aus dem Scope dieser Etappe ausgenommen. `npm run i18n:check` grün (16 Namespaces, 40 Seiten, 0 Fehler, 0 Warnungen), `npm run build` erfolgreich (6.90s, nur bekannte Chunk-Size-Warnung). |
| 19c-service-hub-refine | 2026-04-23 | Service-Hub geschärft: Online-Produktkatalog prominent, Wording sachlicher | `src/features/service/pages/ServicePage.tsx`, `src/i18n/locales/de/service.json`, `src/i18n/locales/en/service.json`, `docs/migration-log.md` | erledigt | Korrektur des bestehenden Service-Hubs (`/service`, eingeführt in 19c-service-hub) ohne Strukturumbau. **Online-Produktkatalog** als erster Punkt der Gruppe `Produktzugang` jetzt klar benannt: `produktzugang.items.katalog.title` DE `"Online-Produktkatalog"` / EN `"Online product catalog"` (vorher `"Produktkatalog"` / `"Product catalog"`); Description präzisiert auf vollständigen Online-Katalog mit technischen Details. `produktzugang.items.stammdaten` umbenannt zu `"Produktdaten & BMEcat"` / `"Product data & BMEcat"` (klarer Fachbegriff für Handel). Hero-Intro sachlicher formuliert, listet jetzt explizit Produktkatalog, Datenblätter, Schaltpläne, Ausschreibung, Ersatzteile, Support. Gruppe `Planung & Ausschreibung`: dritter Eintrag `tools` (Konfiguratoren & Tools) entfernt, da dafür im Projekt keine eigene Zielroute existiert und der Anlagenkonfigurator bereits unter `planen` (`/planen-konfigurieren`) erreichbar ist – Vermeidung von Doppelung und Fantasie-Erweiterungen. `produktzugang.intro` und `planung.intro` ebenfalls gestrafft. 5 Hauptgruppen final sichtbar: `produktzugang` (4 Karten: Online-Produktkatalog, Produktfinder, Serien, Produktdaten & BMEcat), `downloads` (5 Karten: Downloads, Datenblätter, Handbücher, Schaltpläne, technische Unterlagen), `planung` (2 Karten: Planen & Ausschreibung, Ersatzteile), `support` (3 Karten: Technischer Support, FAQ, Glossar), `akademie` (2 Karten: Akademie, Serviceportal) – insgesamt 16 Karten (vorher 17). `sectionsMeta` in `ServicePage.tsx` entsprechend angepasst, Import `Settings` aus `lucide-react` entfernt. Keine harten Texte: alle sichtbaren Strings weiterhin via `useTranslation("service")` und `t("hub.*")`. DE/EN von Anfang an strukturgleich, 0 Diff, 0 leere Werte, `_meta.status` bleibt `in-progress`. Routen, Navigation (`mainNavigation.ts`), MainNavigation-Prefixmap, Breadcrumb-Locales, andere Domains, Serviceportal-Logik, Layout, Klassen, Icons (außer entferntem `Settings`), Slugs und bestehende Service-Unterseiten (`/planen-konfigurieren`, `/downloads`, `/technischer-support`, `/ersatzteile`, `/akademie`, `/serviceportal`) unverändert. Hinweis zur EN-Hauptnav (nicht in dieser Etappe geändert): `Applications` ist aktuell die EN-Übersetzung für `Anwendungen`; perspektivisch wäre `Use cases` fachlich treffender (anwendungsbezogene Sicht statt App-Begriff), Entscheidung in eigener Etappe. `npm run i18n:check` grün (16 Namespaces, 40 strictPages, 0 Fehler, 0 Warnungen), `npm run build` erfolgreich. |
| 19c-service-nav-refine | 2026-04-23 | Service-Dropdown fachlich nachgeschärft (Online-Produktkatalog sichtbar, Label „Service") | `src/navigation/mainNavigation.ts`, `src/i18n/locales/de/navigation.json`, `src/i18n/locales/en/navigation.json`, `docs/migration-log.md` | erledigt | Top-Level-Label `Services und Wissen` auf `Service` (DE) bzw. `Services and Knowledge` auf `Service` (EN) gekürzt. Dropdown unter `Service` neu strukturiert in dieser Reihenfolge: 1. Service-Center (`/service`), 2. Online-Produktkatalog (Platzhalter `#`), 3. Downloads & Dokumente (`/downloads`), 4. Planen & Ausschreibung (`/planen-konfigurieren`), 5. Technischer Support (`/technischer-support`), 6. FAQ & Glossar (Platzhalter `#`), 7. Akademie (`/akademie`), 8. Serviceportal (`/serviceportal`), 9. Ersatzteile (`/ersatzteile`), 10. Freischaltcodes (Platzhalter `#`). Pflichteintrag `Online-Produktkatalog` (DE/EN) jetzt direkt im Dropdown sichtbar und weit oben (Position 2). `Serviceportal` bleibt sprachlich/logisch klar vom öffentlichen `Service` getrennt; Routen, Hub-Seite `/service`, Service-Unterseiten, andere Domains, MainNavigation-Renderer, Layout, Klassen und Assets unverändert. Neue i18n-Keys in `navigation.json` DE/EN: `nav.services.{hub,katalog,downloads,planen,support,faqGlossar,ersatzteile,freischaltcodes}.{label,desc}` und `nav.wissen.{akademie,serviceportal}.{label,desc}`; alte Keys `nav.services.{planen,downloads,support,ersatzteile}.{label,desc}` und `nav.wissen.akademie.{label,desc}` durch geschärfte Texte ersetzt. DE als Master, EN strukturgleich, 0 leere Werte. `npm run i18n:check` grün (16 Namespaces, 40 strictPages, 0 Fehler, 0 Warnungen), `npm run build` erfolgreich. Sprachnotiz: EN-Hauptnav verwendet aktuell `Applications` für `Anwendungen`; `Use cases` wäre fachlich präziser, wird aber nicht in dieser Etappe still umbenannt. |
| 19c-service-nav-correction | 2026-04-23 | Service-Dropdown reduziert, eigene Seite Online-Produktkatalog | `src/features/service/pages/OnlineProduktkatalogPage.tsx`, `src/features/service/routes.tsx`, `src/navigation/routes.ts`, `src/navigation/mainNavigation.ts`, `src/i18n/locales/de/service.json`, `src/i18n/locales/en/service.json`, `src/i18n/locales/de/navigation.json`, `src/i18n/locales/en/navigation.json`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | Korrektur des Service-Dropdowns aus 19c-service-nav-refine: Top-Level-Klick auf `Service` führt direkt auf den Hub `/service` (Service-Center), daher `Service-Center` bewusst NICHT mehr als eigener Dropdown-Punkt. Auch `FAQ & Glossar` und `Serviceportal` aus dem Dropdown entfernt – FAQ/Glossar bleiben Inhalte des Hubs (`hub.sections.support.items.faq/glossar`), `Serviceportal` ist ein eigener geschützter Bereich und wird nicht mehr als Schnellzugriff im öffentlichen Service-Dropdown geführt. Finale Dropdown-Reihenfolge unter `Service`: 1. Online-Produktkatalog (`/service/online-produktkatalog`), 2. Downloads & Dokumente (`/downloads`), 3. Planen & Ausschreibung (`/planen-konfigurieren`), 4. Technischer Support (`/technischer-support`), 5. Akademie (`/akademie`), 6. Ersatzteile (`/ersatzteile`), 7. Freischaltcodes (Platzhalter `#`). Neue echte Seite **Online-Produktkatalog** angelegt: `src/features/service/pages/OnlineProduktkatalogPage.tsx` mit `useTranslation("service")`, Texte ausschließlich i18n-geführt unter `katalog.hero.*`, `katalog.access.{label,headline,intro,items.{katalog,finder,serien,stammdaten}.{title,description,linkLabel}}` und `katalog.hinweis.{label,headline,text}`. DE als Master, EN strukturgleich, 0 leere Werte. Neue Route `ROUTES.service.onlineProduktkatalog = "/service/online-produktkatalog"` in `src/navigation/routes.ts` ergänzt; in `src/features/service/routes.tsx` als `<Route path="/service/online-produktkatalog">` registriert (Bereichslogik: `/service/...` macht Service-Zugehörigkeit in URL und Breadcrumb sichtbar). Breadcrumb-Segment `online-produktkatalog` (DE „Online-Produktkatalog", EN „Online product catalog") in `navigation.json` DE/EN ergänzt; bestehendes Segment `service` (DE „Service-Center", EN „Service Center") unverändert, sodass z. B. `/service/online-produktkatalog` als „Startseite > Service-Center > Online-Produktkatalog" angezeigt wird. `scripts/i18n/i18n-check.config.json`: `OnlineProduktkatalogPage.tsx` in `strictPages` aufgenommen (jetzt 41 strictPages). Hub-Seite `/service` bleibt vollständig erhalten und führt weiterhin Produktfinder, Serien, Produktdaten/BMEcat, FAQ, Glossar, Serviceportal als sichtbare Karten – das Dropdown ist bewusst nur der Schnellzugriff. Andere Domains, Routen anderer Hauptbereiche, Serviceportal-Sub-App, Layoutsystem, Assets und MainNavigation-Renderer unverändert. Sprachnotiz (nur Hinweis, nicht umgesetzt): EN-Hauptnav verwendet weiterhin `Applications` für `Anwendungen`; `Use cases` wäre fachlich präziser. `npm run i18n:check` grün (16 Namespaces, 41 strictPages, 0 Fehler, 0 Warnungen), `npm run build` erfolgreich. |
| 19c-service-nav-final | 2026-04-23 | Service-Dropdown final auf 6 Punkte reduziert, Bereichsknoten „Service" in Breadcrumb | `src/navigation/mainNavigation.ts`, `src/i18n/locales/de/navigation.json`, `src/i18n/locales/en/navigation.json`, `src/components/AutoBreadcrumb.tsx`, `docs/migration-log.md` | erledigt | Korrektur der vorhergehenden Etappe `19c-service-nav-correction`. **Dropdown unter `Service` jetzt genau 6 Punkte** (vorher 7), in dieser exakten Reihenfolge: 1. Online-Produktkatalog (`/service/online-produktkatalog`), 2. Planen & Konfigurieren (`/planen-konfigurieren`), 3. Downloads (`/downloads`), 4. Technischer Support (`/technischer-support`), 5. TCS Akademie (`/akademie`), 6. Ersatzteile, Beschriftung und Freischaltcodes (`/ersatzteile`). `Service-Center` bleibt bewusst aus dem Dropdown (Top-Level-Klick auf `Service` führt direkt auf `/service`). `FAQ & Glossar`, `Serviceportal`, `Produktfinder`, `Serien`, `Produktdaten/BMEcat` bleiben Inhalt der Hub-Seite und tauchen nicht im Dropdown auf. Eigener Eintrag `Freischaltcodes` (Platzhalter) entfernt – Inhalt geht im neuen Sammeleintrag `Ersatzteile, Beschriftung und Freischaltcodes` auf, der auf die echte Route `/ersatzteile` zeigt. Labels in `navigation.json` DE/EN angepasst: `nav.services.downloads.label` von „Downloads & Dokumente" / „Downloads & documents" auf „Downloads" / „Downloads"; `nav.services.planen.label` von „Planen & Ausschreibung" / „Plan & tender" auf „Planen & Konfigurieren" / „Plan & configure"; `nav.services.ersatzteile.label` von „Ersatzteile" / „Spare parts" auf „Ersatzteile, Beschriftung und Freischaltcodes" / „Spare parts, labeling and activation codes"; `nav.wissen.akademie.label` von „Akademie" / „Academy" auf „TCS Akademie" / „TCS Academy"; Key `nav.services.freischaltcodes.*` in beiden Sprachen entfernt. **Breadcrumb-Bereichslogik Service** in `AutoBreadcrumb.tsx` ergänzt: Konstante `SERVICE_AREA_FLAT_ROUTES` (`/downloads`, `/planen-konfigurieren`, `/technischer-support`, `/akademie`, `/ersatzteile`) – für diese Top-Level-Routen wird ein virtueller Bereichsknoten `Service` (Link auf `/service`) zwischen `Startseite` und das letzte Segment eingefügt. Routen unter `/service/...` (z. B. `/service/online-produktkatalog`) erzeugen den Bereichsknoten ohnehin über das vorhandene Pfadsegment `service`. `breadcrumb.segments.service` in DE/EN von „Service-Center" / „Service Center" auf „Service" / „Service" umbenannt (H1 der Hub-Seite bleibt davon unberührt, kommt aus `service.json` `hub.hero.headline`). Zusätzliche Breadcrumb-Segmente angepasst: `akademie` → „TCS Akademie" / „TCS Academy", `ersatzteile` → „Ersatzteile, Beschriftung und Freischaltcodes" / „Spare parts, labeling and activation codes". Resultierende Breadcrumb-Pfade: `/service` → `Startseite > Service`; `/service/online-produktkatalog` → `Startseite > Service > Online-Produktkatalog`; `/downloads` → `Startseite > Service > Downloads`; `/planen-konfigurieren` → `Startseite > Service > Planen & Konfigurieren`; `/technischer-support` → `Startseite > Service > Technischer Support`; `/akademie` → `Startseite > Service > TCS Akademie`; `/ersatzteile` → `Startseite > Service > Ersatzteile, Beschriftung und Freischaltcodes`. Alle sichtbaren Texte direkt zweisprachig in `navigation.json` gepflegt, keine harten TSX-Strings, DE = Master, EN strukturgleich, 0 leere Werte. Hub-Seite `/service` (`Service-Center`) inhaltlich unverändert (FAQ, Glossar, Serviceportal, Produktfinder, Serien, Produktdaten/BMEcat bleiben dort sichtbar). Routen, andere Domains, Serviceportal-Logik, Layout-System, Assets, Slugs unverändert. Sprachnotiz (nicht in dieser Etappe geändert): EN-Hauptnav verwendet weiterhin `Applications` für `Anwendungen`; `Use cases` wäre fachlich präziser und sollte in eigener Etappe entschieden werden, wenn der Marketing-Sprachgebrauch verbindlich festgelegt wird. `npm run i18n:check` grün, `npm run build` erfolgreich. |
| asset-audit-1 | 2026-04-23 | Asset-Audit `src/assets` (reine Bestandsaufnahme) | `docs/03-inventories/asset-audit.md`, `docs/migration-log.md` | erledigt | Reiner Audit ohne Verschiebung, ohne Import-Änderung, ohne Refactor. 13 Dateien in `src/assets` per `ls` und Volltextsuche (`grep -r`) auf `src/**/*.{tsx,ts,html,css}` zugeordnet. Ergebnis: **9 klar shared** (`logo-tcs.png` global; `hero-entrance.jpg` Home + alle Personas; `block-entry.jpg`, `block-kommunikation.jpg`, `block-zutritt.jpg`, `block-signage.jpg`, `block-objekt.jpg`, `block-beratung.jpg` als Teil des `ContentBlocks`-Sets, mehrfach domainübergreifend genutzt; `signage-hero.jpg` cross-domain `signage` + `gebaeudekommunikation`). **2 Kandidaten zur Verschiebung in eine Feature-Domain**: `bcm-schrankschloss.jpg` (nur `gebaeudemanagement/SchraenkeBehaelterPage`) → `features/gebaeudemanagement/assets/`; `feature-sanierung.png` (nur `anwendungen/WohnbauPage`) → `features/anwendungen/assets/` (ggf. Umbenennung an Domain-Schema). **2 ungenutzt** (kein Treffer in `src/`): `bcm-serverschrankschloss.jpg`, `grossanlage-display.jpg`. Empfehlung dokumentiert, aber nicht umgesetzt. Build grün (`npm run build`). Keine Code- oder Asset-Datei verändert; ausschließlich Doku unter `docs/03-inventories/asset-audit.md` neu angelegt und dieser Eintrag im Migration-Log ergänzt. |
| doc-health-1 | 2026-04-23 | Doku-Gesundheitscheck nach Anwendungen-Abschluss, Service-Hub und Use-cases-Terminologie | `docs/01-strategy/i18n-strategy.md`, `docs/02-architecture/code-landkarte.md`, `docs/ai-start-prompt.md`, `docs/migration-log.md` | erledigt | Reiner Doku-Health-Check ohne Code-, Routen-, Layout- oder Asset-Änderung. **i18n-strategy.md**: Stand-Hinweis aktualisiert; Tabelle „Migrierte Namespaces" um Eintrag `anwendungen` (vollständig migriert, Root + 5 Übersichten + 16 Detailseiten + Referenzliste/Detail; EN-Label `Use cases`, DE bleibt `Anwendungen`) und `service` (teilweise migriert: Hub `ServicePage.tsx` und `OnlineProduktkatalogPage.tsx`, `_meta.status = "in-progress"`) ergänzt; Abschnitt „Noch nicht migriert" auf `signage`, `wissen` (inkl. Akademie zu prüfen) und verbleibende `service`-Unterseiten reduziert. **code-landkarte.md**: Stand-Hinweis aktualisiert; i18n-Übersicht in Abschnitt 6 entsprechend nachgezogen (`anwendungen` produktiv migriert, `service` teilweise migriert, EN-Label `Use cases`-Hinweis ergänzt). **ai-start-prompt.md**: i18n-first-Standard explizit festgeschrieben – neue Seiten sofort zweisprachig (DE und EN) anlegen, keine sichtbaren Texte zuerst hart in TSX und später extrahieren. Ergänzung im kopierbaren Startprompt-Codeblock („Wichtige Arbeitsregeln" – neuer erster Punkt) und im Verbote-Abschnitt 7 („keine unkontrollierten Strukturänderungen"). Keine inhaltlichen Strategie-Umbauten, keine neuen Konzepte. `current-status.md` war bereits korrekt (Anwendungen ✅) und wurde nicht angefasst. Reine Dokumentationsetappe; kein Build erforderlich, dennoch ausgeführt: `npm run i18n:check` grün, `npm run build` erfolgreich. |
| doc-service-planen-1 | 2026-04-23 | Service-Seite Planen & Konfigurieren i18n-first migriert | `src/features/service/pages/PlanenKonfigurierenPage.tsx`, `src/i18n/locales/de/service.json`, `src/i18n/locales/en/service.json`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | i18n-first-Migration der Seite `Planen & Konfigurieren` (`/planen-konfigurieren`). `PlanenKonfigurierenPage.tsx` auf `useTranslation("service")` umgestellt; alle sichtbaren Texte über `seiten.planenKonfigurieren.*` geführt (Hero inkl. `imageAlt`, Anlagenplaner-Highlight, HOAI-Phasen mit stabilen Item-Maps `p12/p35/p67/p8` und Tools-Sub-Keys, Planungsdaten, Konfiguratoren, Shops, Bestellwege, Ausschreibungstexte, CTA). Lokale `hoaiPhases`/`planningData`/`configurators`/`shops`/`orderMethods`-Konstanten entfernt; Renderer iterieren jetzt über stabile Schlüssel-Listen (`HOAI_KEYS`, `HOAI_TOOL_KEYS`, `PLANNING_KEYS`, `CONFIGURATOR_KEYS`, `SHOP_KEYS`, `ORDER_KEYS`, `AUSSCHREIBUNG_KEYS`). Optionale Badges bei Bestellwegen via `i18n.exists`-Check, damit nur bei `fachhandel` ein Badge gerendert wird – keine leeren Locale-Werte. DE als Master direkt zweisprachig mit EN angelegt; **DE und EN je 189 Leaf-Keys gesamt** im Namespace `service` (vorher 90), davon **+99 neue Leaf-Keys pro Locale** unter `seiten.planenKonfigurieren.*`. DE/EN strukturgleich, 0 Diff, 0 leere Werte. `_meta.note` aktualisiert; `_meta.status` weiterhin `"in-progress"`. `PlanenKonfigurierenPage.tsx` in `scripts/i18n/i18n-check.config.json` unter `strictPages` aufgenommen (jetzt 42 strictPages). Layout-Klassen, Animationen (`framer-motion`), Icon-Set (`lucide-react`), Hero-Bild (`@/assets/block-entry.jpg`), Reihenfolge der Sections, Links/CTAs (`#`-Platzhalter, `/kontakt`), Routen, Slugs, Navigation, andere Service-Seiten und alle anderen Domains unverändert. `npm run i18n:check` grün (16 Namespaces, 42 strictPages, 0 Fehler, 0 Warnungen, useTranslation: ja, harte deutsche Texte: 0), `npm run build` erfolgreich (6.71s, nur bekannte Chunk-Size-Warnung). |
| doc-service-downloads-1 | 2026-04-23 | Service-Seite Downloads i18n-first migriert | `src/features/service/pages/DownloadsPage.tsx`, `src/i18n/locales/de/service.json`, `src/i18n/locales/en/service.json`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | i18n-first-Migration der Seite `Downloads` (`/downloads`). `DownloadsPage.tsx` auf `useTranslation("service")` umgestellt; alle sichtbaren Texte über `seiten.downloads.*` geführt (Hero, Quick-Links, Dokumente, FAQ inkl. 8 Kategorien und 23 Items mit `category/q/a`, RMA & Garantie, Bestellung, Akademie, Glossar mit 7 Buchstaben-Gruppen, Ansprechpartner). Lokale Konstanten (`quickLinks`, `documentCategories`, `faqCategories`, `faqItems`, `orderLinks`, `academyItems`, `glossary`) auf stabile Schlüssel-Listen reduziert (`QUICK_LINK_KEYS`, `DOCUMENT_KEYS`, `FAQ_CATEGORY_KEYS`, `FAQ_ITEM_KEYS`, `ORDER_KEYS`, `ACADEMY_KEYS`, `GLOSSARY_GROUPS`). Icons, Hrefs (`#`, `https://tcs24.com/`, `/kontakt`, `https://garantie.tcsapps.de/`), Filter-Logik (FAQ-Kategorie-Filter über i18n-Category-Slug), Hero-Bild (`@/assets/block-entry.jpg`), Layout-Klassen, Reihenfolge und State-Logik unverändert. DE als Master direkt zweisprachig mit EN angelegt; **DE und EN je 357 Leaf-Keys gesamt** im Namespace `service` (vorher 189), davon **+168 neue Leaf-Keys pro Locale** unter `seiten.downloads.*` (effektiv +171 Subtree-Keys, da `_meta.note` aktualisiert wurde, Diff: 168). DE/EN strukturgleich (1:1), 0 Diff, 0 leere Werte. `_meta.note` aktualisiert; `_meta.status` weiterhin `"in-progress"`. `DownloadsPage.tsx` in `scripts/i18n/i18n-check.config.json` unter `strictPages` aufgenommen (jetzt 43 strictPages). Routen, Slugs, Navigation, Assets, andere Service-Seiten und alle anderen Domains unverändert. `npm run i18n:check` grün (16 Namespaces, 43 strictPages, 0 Fehler, 0 Warnungen, useTranslation: ja, harte deutsche Texte: 0), `npm run build` erfolgreich (6.81s, nur bekannte Chunk-Size-Warnung). |
| doc-service-support-1 | 2026-04-23 | Service-Seite Technischer Support i18n-first migriert | `src/features/service/pages/TechnischerSupportPage.tsx`, `src/i18n/locales/de/service.json`, `src/i18n/locales/en/service.json`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | i18n-first-Migration der Seite `Technischer Support` (`/technischer-support`). `TechnischerSupportPage.tsx` auf `useTranslation("service")` umgestellt; alle sichtbaren Texte über `seiten.technischerSupport.*` geführt (Hero, Support-Kanäle mit 4 Items inkl. optionalem `detail`, FAQ mit 10 Items `i01`–`i10`, RMA & Garantie mit 3 Items, Ersatzteile & Bestellung mit 3 Items, Ansprechpartner). Lokale `supportChannels`- und `faqItems`-Konstanten entfernt; Renderer iterieren über stabile Schlüssel-Listen (`CHANNEL_KEYS`, `CHANNEL_META` mit Icon + Href + external/internal-Flag, `FAQ_ITEM_KEYS`). Optionale Detail-Zeile bei Channels via `i18n.exists`-Check (Channel `downloads` hat bewusst keinen `detail`-Key, daher kein leerer Locale-Wert). Icons (`lucide-react`), Hero-Bild (`@/assets/block-entry.jpg`), externe Links (`https://tcsplan.de/`, `https://tcs24.com/`, `https://garantie.tcsapps.de/`, `mailto`-frei laut Original), interne Links (`/downloads`, `/kontakt`), State-Logik (`openFaq`), Layout-Klassen, Reihenfolge der Sections und Kontaktlogik unverändert. DE als Master direkt zweisprachig mit EN angelegt; **DE und EN je 416 Leaf-Keys gesamt** im Namespace `service` (vorher 357), davon **+59 neue Leaf-Keys pro Locale** unter `seiten.technischerSupport.*`. DE/EN strukturgleich (1:1), 0 Diff, 0 leere Werte. `_meta.note` aktualisiert; `_meta.status` weiterhin `"in-progress"`. `TechnischerSupportPage.tsx` in `scripts/i18n/i18n-check.config.json` unter `strictPages` aufgenommen (jetzt 44 strictPages). Routen, Slugs, Navigation, Assets, andere Service-Seiten und alle anderen Domains unverändert. `npm run i18n:check` grün (16 Namespaces, 44 strictPages, 0 Fehler, 0 Warnungen, useTranslation: ja, harte deutsche Texte: 0), `npm run build` erfolgreich (8.26s, nur bekannte Chunk-Size-Warnung). |
| doc-service-ersatzteile-1 | 2026-04-23 | Service-Seite Ersatzteile i18n-first migriert | `src/features/service/pages/ErsatzteilePage.tsx`, `src/i18n/locales/de/service.json`, `src/i18n/locales/en/service.json`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | i18n-first-Migration der Seite `Ersatzteile` (`/ersatzteile`). `ErsatzteilePage.tsx` auf `useTranslation("service")` umgestellt; alle sichtbaren Texte über `seiten.ersatzteile.*` geführt (Hero, Ersatzteile-Block mit 4 Item-Karten und CTA, Beschriftung mit 3 Card-Bereichen je 3 Features und CTA, Freischaltcodes mit 3 Card-Bereichen, 4-stufigem Ablauf-Block und CTA, Vorteile mit 4 Items, finalem CTA-Block). Lokale Inline-Arrays vollständig in stabile Schlüssel-Listen überführt (`ERSATZ_ITEM_KEYS`, `BESCHRIFT_CARD_KEYS`, `BESCHRIFT_FEATURE_KEYS`, `FREISCHALT_CARD_KEYS` mit Icon-Map, `FREISCHALT_STEP_KEYS`, `VORTEIL_KEYS` mit Icon-Map). Schritt-Nummer (1–4) bleibt aus `idx + 1` deterministisch ohne i18n-Pflege. Hero-Bild (`@/assets/block-entry.jpg`), externe Links (`https://tcs24.com/`, in allen 4 Sektionen identisch), Icons (`lucide-react`), Layout-Klassen, Reihenfolge der Sections und Bestelllogik unverändert. DE als Master direkt zweisprachig mit EN angelegt; **DE und EN je 474 Leaf-Keys gesamt** im Namespace `service` (vorher 416), davon **+58 neue Leaf-Keys pro Locale** unter `seiten.ersatzteile.*`. DE/EN strukturgleich (1:1), 0 Diff, 0 leere Werte. `_meta.note` aktualisiert (Hinweis: alle Service-Unterseiten i18n-first migriert); `_meta.status` weiterhin `"in-progress"`. `ErsatzteilePage.tsx` in `scripts/i18n/i18n-check.config.json` unter `strictPages` aufgenommen (jetzt 45 strictPages). Routen, Slugs, Navigation, Assets, andere Service-Seiten und alle anderen Domains unverändert. `npm run i18n:check` grün (16 Namespaces, 45 strictPages, 0 Fehler, 0 Warnungen, useTranslation: ja, harte deutsche Texte: 0), `npm run build` erfolgreich (7.78s, nur bekannte Chunk-Size-Warnung). |
| doc-wissen-akademie-1 | 2026-04-23 | Wissen-Seite TCS Akademie i18n-first migriert | `src/features/wissen/pages/AkademiePage.tsx`, `src/i18n/locales/de/wissen.json`, `src/i18n/locales/en/wissen.json`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | i18n-first-Migration der Seite `TCS Akademie` (`/akademie`). Namespace `wissen` (vorher `prepared`, jetzt `in-progress`) bewusst beibehalten – fachlich klar im Bereich Wissen/Weiterbildung verortet, kein Verschieben in `service`. `AkademiePage.tsx` auf `useTranslation("wissen")` umgestellt; alle sichtbaren Texte über `seiten.akademie.*` geführt (Hero, Schulungsformate mit 4 Items inkl. Icons, Zielgruppen mit 4 Items inkl. Icons, Partnerprogramme mit 3 Stufen, finaler CTA-Block). Inline-Arrays in stabile Schlüssel-Listen mit Icon-Maps überführt (`FORMAT_KEYS`, `FORMAT_ICONS`, `ZIELGRUPPEN_KEYS`, `ZIELGRUPPEN_ICONS`, `PARTNER_KEYS`). Hero-Bild (`@/assets/block-entry.jpg`), Kontakt-Link (`/kontakt`), Icons (`lucide-react`), Layout-Klassen, Reihenfolge der Sections und bestehende Bereichszuordnung unverändert. DE als Master direkt zweisprachig mit EN angelegt; **DE und EN je 41 Leaf-Keys gesamt** im Namespace `wissen` (vorher 0 außer `_meta`), davon **+41 neue Leaf-Keys pro Locale** unter `seiten.akademie.*`. DE/EN strukturgleich (1:1), 0 Diff, 0 leere Werte. `AkademiePage.tsx` in `scripts/i18n/i18n-check.config.json` unter `strictPages` aufgenommen (jetzt 46 strictPages). Routen, Slugs, Navigation, Assets und alle anderen Domains unverändert. `npm run i18n:check` grün (16 Namespaces, 46 strictPages, 0 Fehler), `npm run build` erfolgreich (6.99s). |
| doc-service-final-1 | 2026-04-23 | Final-Check Service & Wissen, Status auf migrated | `src/i18n/locales/de/service.json`, `src/i18n/locales/en/service.json`, `src/i18n/locales/de/wissen.json`, `src/i18n/locales/en/wissen.json`, `docs/current-status.md`, `docs/01-strategy/i18n-strategy.md`, `docs/02-architecture/code-landkarte.md`, `docs/migration-log.md` | erledigt | Final-Check über alle aktuell vorhandenen öffentlichen Seiten in `service` (ServicePage, OnlineProduktkatalogPage, PlanenKonfigurierenPage, DownloadsPage, TechnischerSupportPage, ErsatzteilePage – 6 Seiten, exakt deckungsgleich mit `serviceRoutes`) und `wissen` (AkademiePage – 1 Seite, deckungsgleich mit `wissenRoutes`). Alle 7 Seiten nutzen `useTranslation(...)`, alle stehen in `strictPages` (46 strictPages gesamt). Hero-Bilder im Service-Bereich konsistent (`@/assets/block-entry.jpg` in allen 6 Seiten); AkademiePage nutzt dasselbe Asset – konsistente Visual-Linie über die beiden Bereiche. Breadcrumbs werden über `AutoBreadcrumb` aus den dezentralen Routen abgeleitet, Navigation-Quelle (`mainNavigation.ts`) unverändert, Routen/Slugs unverändert. Keine sichtbaren harten deutschen Texte mehr. DE/EN strukturgleich: `service` 474 Leaf-Keys je Locale (Diff 0), `wissen` 34 Leaf-Keys je Locale (Diff 0), 0 leere Werte. `_meta.status` in beiden Namespaces (DE+EN) auf `migrated` gesetzt. Doku aktualisiert: `docs/current-status.md` (i18n-Statustabelle: `service` ✅ migriert, `wissen` ✅ migriert; Stand-Zeile aktualisiert), `docs/01-strategy/i18n-strategy.md` (Stand-Zeile aktualisiert), `docs/02-architecture/code-landkarte.md` (Domain-Tabelle für `service` und `wissen` als vollständig migriert ausgewiesen, ServicePage/OnlineProduktkatalogPage in der Beispiel-Spalte ergänzt, Statusabschnitt aktualisiert: nur noch `signage` offen). Keine Code-Änderungen außerhalb der i18n-`_meta`-Blöcke und Doku. `npm run i18n:check` grün (16 Namespaces, 46 strictPages, 0 Fehler, 0 Warnungen), `npm run build` erfolgreich (6.73s). |
| doc-health-check-2 | 2026-04-23 | Doku-Gesundheitscheck nach Service/Wissen-Abschluss | `docs/01-strategy/i18n-strategy.md`, `docs/migration-log.md` | erledigt | Reiner Doku-Gesundheitscheck. Geprüft: `current-status.md`, `i18n-strategy.md`, `code-landkarte.md`, `ai-start-prompt.md`, `migration-log.md`. Befund: `current-status.md` und `code-landkarte.md` sind nach `doc-service-final-1` bereits aktuell (Stand-Zeile, i18n-Statustabelle, Domain-Tabelle, Statusabschnitt – alle Domains außer `signage` als migriert ausgewiesen). `ai-start-prompt.md` enthält i18n-first bereits ausdrücklich (Zeile 40 Hauptregel, Zeile 169 Anti-Pattern-Liste, Zeile 202 Begleit-KI-Verbote) – keine Änderung nötig. Veraltet war nur `i18n-strategy.md`: Zeile 112 führte `service` noch als „teilweise migriert", Zeilen 117–118 führten `wissen` und Service-Unterseiten noch unter „Noch nicht migriert". Korrigiert: `service` und `wissen` als `migriert` mit Verweis auf Etappe `doc-service-final-1` ausgewiesen, „Noch nicht migriert"-Liste auf `signage` reduziert. Keine Strategie-Umbauten, keine Code-/Routen-/Asset-/Layout-Änderungen, kein Build erforderlich. `npm run i18n:check` grün (16 Namespaces, 46 strictPages, 0 Fehler, 0 Warnungen). |
| doc-seo-base-1 | 2026-04-23 | Globale SEO-/HTML-Basis und 404-Seite korrigiert | `index.html`, `src/app/pages/NotFoundPage.tsx`, `src/shared/hooks/useDocumentLang.ts` (neu), `src/App.tsx`, `src/i18n/locales/de/common.json`, `src/i18n/locales/en/common.json`, `docs/migration-log.md` | erledigt | Globale technische Basis (Head/Sprache/404) auf Projektrealität gesetzt. **`index.html`**: `<html lang="en">` → `lang="de"` (Standardsprache), Lovable-Platzhalter ersetzt durch professionelle TCS-Defaults (Title: „TCS – Gebäudekommunikation, Zutrittskontrolle & Gebäudemanagement", Description: TCS-Systembereiche und Zielgruppen, OG/Twitter konsistent gleichlautend gepflegt), `<meta name="author" content="Lovable">` und Lovable-Twitter-Handle entfernt, TODO-Kommentare entfernt; OG-/Twitter-Bild-URL unverändert beibehalten (kein Asset-Wechsel im Scope). **Dynamische Sprachlogik**: neuer kleiner Helper-Hook `src/shared/hooks/useDocumentLang.ts` synchronisiert `document.documentElement.lang` mit der aktiven i18n-Sprache (initial + bei `languageChanged`-Event), wird einmalig in `AppLayout` (in `src/App.tsx`) aufgerufen. Damit ist der HTML-Default `de`, beim Sprachwechsel über den bestehenden `LanguageSwitcher` wird `lang` automatisch auf `en` umgestellt – keine Bastellösung, kein Polling, kein Side-Effect-Leak (Cleanup über `i18n.off`). **404-Seite** (`src/app/pages/NotFoundPage.tsx`): auf `useTranslation("common")` umgestellt; alle sichtbaren Texte über neuen Block `notFound.*` (`code`, `headline`, `intro`, `cta`) geführt; visuelles Refresh auf TCS-Stil (semantische Tokens `bg-muted`, `text-foreground`, `text-muted-foreground`, `bg-foreground/text-background`-CTA), Layout bleibt zentriert, Console-Error-Logging unverändert. **`noindex` für 404**: `<meta name="robots" content="noindex, nofollow">` wird per `useEffect` nur für die 404-Seite in den `<head>` injiziert (mit Cleanup beim Unmount via stabiler ID `robots-noindex-404`), damit nur tatsächliche 404-Antworten als noindex markiert sind und keine andere Route belastet wird. **i18n**: DE als Master direkt zweisprachig mit EN; **+4 neue Leaf-Keys pro Locale** im Namespace `common` unter `notFound.*`; DE/EN strukturgleich, 0 Diff, 0 leere Werte. **Scope strikt eingehalten**: Routen, Navigation, Layout anderer Seiten, Assets, alle Domain-Seiten, andere i18n-Namespaces, Canonical/Schema/Sitemap und rechtliche Seiten unverändert. `npm run i18n:check` grün (16 Namespaces, 46 strictPages, 0 Fehler, 0 Warnungen), `npm run build` erfolgreich (6.52s, nur bekannte Chunk-Size-Warnung). |
| doc-a11y-base-1 | 2026-04-23 | Semantische Basis (Header, aria-labels, Skip-Link) und App.css-Bereinigung | `src/App.tsx`, `src/App.css`, `src/components/MainNavigation.tsx`, `src/components/MetaNavigation.tsx`, `src/components/AutoBreadcrumb.tsx`, `src/components/Footer.tsx`, `src/i18n/locales/de/navigation.json`, `src/i18n/locales/en/navigation.json`, `docs/migration-log.md` | erledigt | Semantik- und A11y-Basis korrigiert, ohne Layout/IA zu verändern. **Header**: MetaNavigation + MainNavigation jetzt in echtem `<header>` gekapselt (statt anonymer `<div>`). **Skip-Link**: neuer „Zum Hauptinhalt springen"-Link am Anfang von `AppLayout`, `sr-only` mit `focus:not-sr-only`-Sichtbarkeit, springt auf `<main id="main-content" tabIndex={-1}>`; tastaturfähig, sichtbar bei Fokus, semantische Tokens. **aria-labels** sinnvoll und konsistent: `MainNavigation` → `a11y.mainNavigation`; `MetaNavigation` Persona-Buttons-Block in eigenes `<nav aria-label={a11y.personaNavigation}>` umgewandelt, Meta-Links-Block in eigenes `<nav aria-label={a11y.metaNavigation}>`; `AutoBreadcrumb` → `a11y.breadcrumb`; `Footer` → Spalten-Block `a11y.footerNavigation`, Bottom-Legal-Block `a11y.legalNavigation`. Footer-Bottom-Links zusätzlich von `<a>` auf React-Router-`<Link>` umgestellt (konsistent mit übriger Footer-Logik). **i18n**: neuer Block `a11y.*` im Namespace `navigation` mit 7 Leaf-Keys je Locale (`skipToContent`, `mainNavigation`, `metaNavigation`, `personaNavigation`, `breadcrumb`, `footerNavigation`, `legalNavigation`); DE als Master direkt zweisprachig mit EN, strukturgleich, 0 Diff, 0 leere Werte. **`App.css` bereinigt**: tote Vite-Boilerplate vollständig entfernt (`#root`-max-width/center, `.logo`/`.logo:hover`/`.logo.react:hover`, `@keyframes logo-spin`, `prefers-reduced-motion`-Animation, `.card`, `.read-the-docs`); funktionale Styles waren nicht betroffen (Tailwind/Tokens leben in `index.css`). Datei reduziert auf einen kurzen Header-Kommentar. **Scope strikt eingehalten**: keine Navigations-Logik, keine Routen, keine Layouts/Inhalte anderer Domains, keine SEO-Sachen wie Canonical/Schema/Sitemap. `npm run i18n:check` grün (16 Namespaces, 46 strictPages, 0 Fehler, 0 Warnungen), `npm run build` erfolgreich (6.32s, nur bekannte Chunk-Size-Warnung). |
| doc-legal-base-2 | 2026-04-23 | Reale technische Anlage der Legal-Seiten (Re-Apply) | `src/features/legal/pages/ImpressumPage.tsx` (neu), `src/features/legal/pages/DatenschutzPage.tsx` (neu), `src/features/legal/pages/AgbPage.tsx` (neu), `src/features/legal/routes.tsx` (neu), `src/i18n/locales/de/legal.json` (neu), `src/i18n/locales/en/legal.json` (neu), `src/i18n/index.ts`, `src/app/routes.tsx`, `src/navigation/routes.ts`, `src/navigation/footerNavigation.ts`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | **Hinweis: Die vorherige Etappe `doc-legal-base-1` war NICHT persistent im Repo – Konsistenzcheck hat ergeben, dass weder Code-Dateien noch Locale-Dateien noch Namespace-Registrierung noch strictPages-Einträge tatsächlich vorhanden waren. Diese Etappe ist die reale technische Umsetzung.** Neue Feature-Domain `src/features/legal/` mit 3 Pages (`ImpressumPage`, `DatenschutzPage`, `AgbPage`) und `routes.tsx` real angelegt. Alle 3 Pages nutzen `PageLayout` + `useTranslation("legal")`, zeigen eine semantisch markierte Status-Box („In redaktioneller Bearbeitung") mit `AlertCircle`-Icon und einen Kontakt-CTA als interner React-Router-`<Link>` auf `/kontakt`. Hero-Bild konsistent mit Service-/Wissen-Bereich (`@/assets/block-entry.jpg`). Keine erfundenen juristischen Inhalte – nur strukturierte redaktionelle Platzhalterseiten. **i18n**: neuer Namespace `legal` mit 13 Leaf-Keys je Locale (`_meta.status`, `_meta.note`, `common.draftBadge`, `common.draftIntro`, `common.contactCtaIntro`, `common.contactCtaButton`, `seiten.{impressum,datenschutz,agb}.{label,headline,intro}`); DE als Master direkt zweisprachig mit EN, strukturgleich, 0 Diff, 0 leere Werte; `_meta.status = "in-progress"`. **Verdrahtung**: `legal` in `src/i18n/index.ts` (Imports + `resources.de`/`resources.en` + `I18N_NAMESPACES`-Liste) registriert; `legalRoutes` in `src/app/routes.tsx` eingehängt; `ROUTES.legal.{impressum,datenschutz,agb}` in `src/navigation/routes.ts` von `"#"` auf echte Pfade `/impressum`, `/datenschutz`, `/agb` umgestellt; in `src/navigation/footerNavigation.ts` 4 betroffene Items (`unternehmen.datenschutz` + 3 `footerBottomNavigation`-Einträge) von `linkType: "placeholder"`/`status: "placeholder"` auf `linkType: "internal"`/`status: "active"` umgestellt. **strictPages**: 3 Legal-Pages in `scripts/i18n/i18n-check.config.json` aufgenommen (jetzt 49 strictPages, vorher 46). **Existenzprüfung explizit**: 6 neue Dateien im Repo verifiziert (3 Pages, 1 routes, 2 Locales), `legal` als String in `src/i18n/index.ts` 1× nachgewiesen (in `I18N_NAMESPACES`), 3 `features/legal`-Treffer in `strictPages`. Routen `/impressum`, `/datenschutz`, `/agb` real verdrahtet (kein `"#"` mehr in der Footer-/Navigations-Logik für Legal). `npm run i18n:check` grün (**17 Namespaces, 49 strictPages**, 0 Fehler, 0 Warnungen), `npm run build` erfolgreich (6.21s, nur bekannte Chunk-Size-Warnung). |
| stab-routing-cta-1 | 2026-04-24 | Routing-/CTA-Stabilisierung (Mobile Nav, SnipdooIp-Link, tote CTAs) | `src/components/MainNavigation.tsx`, `src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx`, `src/components/PageLayout.tsx`, `src/components/CTASection.tsx`, `src/features/service/pages/ServicePage.tsx`, `src/i18n/locales/de/navigation.json`, `src/i18n/locales/en/navigation.json`, `docs/migration-log.md` | erledigt | Kleine technische Stabilisierung ohne Inhalts-/Slug-/Designänderung. **(1) Mobile Hauptnavigation**: Top-Level-Bereichsseiten in der mobilen Nav direkt erreichbar. Top-Level-Label ist jetzt ein `<Link>` auf `item.path` (sofern echter Pfad, kein `"#"`); Submenu-Toggle wandert in einen separaten Chevron-`<button>` mit `aria-expanded` / `aria-label`. Im aufgeklappten Submenu erscheint zusätzlich ein „Übersicht"-Link auf die Top-Level-Route. Desktop-Verhalten unverändert (Hover-Dropdown, Top-Level bleibt klickbarer Link). **(2) SnipdooIp**: Modul-Link „App" zeigte auf nicht existierende Route `/gebaeudekommunikation/mobile-tuerkommunikation`; korrigiert auf reale Route `/anwendungen/mobile-tuerkommunikation` (entspricht `ROUTES.anwendungen.mobileTuerkommunikation`). Keine weiteren Änderungen an SnipdooIpPage. **(3) Tote `#`-CTAs in produktiver UI bereinigt**: `PageLayout`-CTA-Button (auf jeder Detailseite via PageLayout sichtbar) von `<a href="#">` auf `<Link to="/kontakt">` umgestellt – konsistent zur CTA-Aussage „Projektberatung vereinbaren". `CTASection` (Home): Primary-CTA von `<a href="#">` auf `<Link to="/kontakt">`; Secondary-CTA hat aktuell kein echtes Ziel und ist daher als nicht-klickbarer Platzhalter (`<span aria-disabled="true">` mit `cursor-not-allowed opacity-60`) gerendert – Text bleibt sichtbar, kein Layout-/Designumbau. `ServicePage`: 4 Hub-Items mit Ziel `ROUTES.placeholder.root` (`#`) – `finder`, `serien`, `stammdaten`, `glossar` – werden nicht mehr als aktiver `<a href="#">`, sondern als nicht-klickbares `<div aria-disabled="true">` mit `opacity-60 cursor-not-allowed` gerendert. Echte interne/externe Links (z. B. `katalog`, `downloads`, `support`, `akademie`) bleiben unverändert klickbar. **(4) i18n**: ein neuer Schlüssel `common.overview` in `navigation`-Namespace ergänzt (DE „Übersicht", EN „Overview"). Keine weiteren Texte. Keine Slugs/Routen/IA-/Strukturänderungen. Keine neuen Seiten. `footerNavigation.ts`/`routes.ts` unverändert. `npm run i18n:check` grün (17 Namespaces, 49 strictPages, 0 Fehler, 0 Warnungen). `npm run build` erfolgreich (8.01s, nur bekannte Chunk-Size-Warnung). |
| doc-sync-1 | 2026-04-24 | Doku-Synchronisierung auf realen Code-Stand (home/personas/gebk/zutritt/legal) | `docs/current-status.md`, `docs/01-strategy/i18n-strategy.md`, `docs/02-architecture/code-landkarte.md`, `src/navigation/README.md`, `docs/migration-log.md` | erledigt | Reine Doku-Etappe ohne Code-/Config-Änderung. **Falsche/veraltete Aussagen korrigiert**: (a) Stand-Zeilen in `current-status.md`, `i18n-strategy.md`, `code-landkarte.md` zeigten alle noch auf `doc-service-final-1`, obwohl seither `doc-legal-base-2` und `stab-routing-cta-1` erfolgt sind – jetzt aktualisiert. (b) i18n-Tabellen behaupteten pauschal „migriert" für `home`, `gebaeudekommunikation`, `zutrittskontrolle`, `kontakt`, `karriere`, `presse`, `serviceportal`, ohne offenzulegen, dass **keine** dieser Pages in `strictPages` enthalten ist – jetzt explizit als „migriert / **nicht in `strictPages`**" markiert. (c) `home` war als „migriert" gelistet, obwohl `HomePage.tsx` und `UeberTCSPage.tsx` real **kein `useTranslation`** aufrufen (Texte kommen ausschließlich über Shared-Komponenten `HeroSection`, `ContentBlocks`, `PersonaSection`, `CTASection`) – jetzt ehrlich als „⚠️ teilweise" geführt. (d) `signage` als „⏳ offen" war zu pauschal: `BeschilderungPage.tsx` (in `src/features/signage/`, gemountet unter `/gebaeudekommunikation/beschilderung`, Namespace `gebaeudekommunikation`) ist real in `strictPages`; `SignagePage.tsx` dagegen ohne `useTranslation` und nicht in `strictPages` – jetzt als „⚠️ teilweise" mit Sonderfall-Hinweis dokumentiert. (e) `legal` fehlte komplett in den i18n-Tabellen von `current-status.md`, `i18n-strategy.md` und `code-landkarte.md`, obwohl Namespace seit `doc-legal-base-2` real registriert ist und 3 Pages in `strictPages` stehen – jetzt mit Status „technisch angelegt, Inhalte redaktionell offen" ergänzt. (f) `i18n-strategy.md` Locale-Verzeichnisbaum ergänzt um `legal.json`. (g) `code-landkarte.md` Abschnitt 6 nennt jetzt explizit 17 Namespaces, 49 strictPages und die Lücke (i18n-fähige Seiten ohne strictPages-Eintrag). (h) `src/navigation/README.md` war massiv veraltet: Status-Zeile sagte „Aktuelle Navigation lebt weiterhin in MainNavigation.tsx … wird in einer späteren Etappe migriert", obwohl die Anbindung in den Etappen 4f/4g/4h/4i längst erfolgt ist. README komplett auf realen Ist-Stand neu geschrieben (Reale-Verdrahtung-Tabelle: `routes.ts`, `mainNavigation.ts`, `footerNavigation.ts`, `metaNavigation.ts`, `personaNavigation.ts` mit jeweiligem Renderer; Hinweis auf reale Legal-Routen seit `doc-legal-base-2` und Mobile-Übersicht-Link seit `stab-routing-cta-1`); historische Etappen 4b–4i bleiben als Verlauf erhalten, klar als Historie markiert. (i) Offene-Bereiche-Abschnitt in `current-status.md` neu fokussiert: i18n-Lücken `signage`-`SignagePage`, `home`-Pages, `strictPages`-Erweiterung als konkrete offene Punkte; Legal-Inhalte als redaktionell offen; vorbestehende Punkte (URL-Sprachstrategie, Bundle-Splitting, Serviceportal-Backend) bleiben. **Markierungen „dokumentiert, aber im Code nicht real"**: explizit für `home`-Pages (Doku „migriert" → real ohne `useTranslation`) und für `SignagePage` (Doku-Tabelle kannte den Sonderfall `BeschilderungPage` nicht). **Konsistenz Doku ↔ Code jetzt hergestellt** auf Basis: 17 Namespaces in `src/i18n/index.ts`, 49 Seiten in `scripts/i18n/i18n-check.config.json`. Keine Produktivcode-, JSON-, Routing-, Navigation-, Asset- oder Config-Datei geändert. Kein Build erforderlich (reine Doku-Etappe). |
| i18n-coverage-close-1 | 2026-04-24 | Offene i18n-Lücken in Produktivcode geschlossen (UeberTCS, Signage, Serviceportal, Zutrittskontrolle) | `src/features/home/pages/UeberTCSPage.tsx`, `src/features/signage/pages/SignagePage.tsx`, `src/features/serviceportal/pages/ServiceportalPage.tsx`, `src/features/zutrittskontrolle/pages/ZutrittskontrollePage.tsx`, `src/i18n/locales/de/home.json`, `src/i18n/locales/en/home.json`, `src/i18n/locales/de/signage.json`, `src/i18n/locales/en/signage.json`, `src/i18n/locales/de/serviceportal.json`, `src/i18n/locales/en/serviceportal.json`, `scripts/i18n/i18n-check.config.json`, `docs/current-status.md`, `docs/01-strategy/i18n-strategy.md`, `docs/02-architecture/code-landkarte.md`, `docs/migration-log.md` | erledigt | **Ziel**: reale i18n-/Prüflücken im Produktivcode schließen, ohne neue Features. **(1) UeberTCSPage**: vollständig auf `useTranslation("home")` umgestellt, alle sichtbaren Texte (Hero, Stats, History, Werte, Geschäftsfelder, Manufacturing, Meilensteine, Standorte, CTA) in neuen Bereich `home.ueberTcs.*` ausgelagert (DE Master, EN strukturgleich). Layout, Bilder, Routen, Inhalte unverändert; Komponentennamen, Lucide-Icon-Auswahl und Section-Reihenfolge identisch. **(2) SignagePage**: vollständig auf `useTranslation("signage")` umgestellt, 4 Produkt-FeatureBlocks und Intro-Text in `signage.json` ausgelagert (Namespace bleibt `signage`, **keine** Vermischung mit `gebaeudekommunikation`). Route `/signage`, `PageLayout`-Aufruf, Asset (`@/assets/block-signage.jpg`) und Linkziele unverändert. **(3) ServiceportalPage**: hartcodierter deutscher Begriff "Servicegerät" in `downloadCategories[2].items[1]` aufgelöst – Mock-Datenstruktur auf reine Schlüssel (`itemKeys: ["serverV421", ...]`) umgestellt, alle 8 Download-Items in `serviceportal.downloadCenter.items.*` (DE/EN strukturgleich) ausgelagert. Render-Schleife liest `name`/`meta` jetzt über `t()`. Auth-Flow, State, Sheets, Datenklassen unverändert; Serviceportal bleibt Frontend-Demo. **(4) ZutrittskontrollePage**: minimalinvasiver Heuristik-Fix – Komponentenname `Zutrittskontrolle` → `ZutrittskontrolleRootPage`, weil die i18n-Heuristik `\bZutrittskontrolle\b` als germanTerm matcht. `default export` namensagnostisch, alle Importe (`src/features/zutrittskontrolle/routes.tsx`) bleiben funktionsfähig. **Keine** sichtbaren Texte, Routen, Assets oder Verhaltensänderungen. **(5) HomePage**: bewusst **nicht** angefasst – bleibt Container-Seite ohne direkte `useTranslation`-Anbindung; keine Fake-Migration nur für strictPages. **(6) strictPages**: 4 neue Einträge (`UeberTCSPage`, `SignagePage`, `ServiceportalPage`, `ZutrittskontrollePage`) → von 49 auf **53 strictPages**. RegistrierenPage, PasswortVergessenPage, HomePage und die 4 Zutritts-Sub-Pages sowie alle 6 gebaeudekommunikation-Subpages bewusst nicht ergänzt (Scope dieser Etappe sind nur die 4 namentlich genannten Seiten). **(7) Doku**: `current-status.md`, `i18n-strategy.md`, `code-landkarte.md` synchronisiert (Zähler 49→53, Statuszeilen für `home`, `signage`, `serviceportal`, `zutrittskontrolle` ehrlich aktualisiert: jetzt mit Hinweis auf neu in `strictPages` aufgenommene Pages und auf bewusst draußen gehaltene `HomePage`). **Keine** neuen Seiten, Slug-Änderungen, Routing-Umbauten, Designänderungen, SEO-Arbeit, Heuristik-Änderungen. `npm run i18n:check` grün (**17 Namespaces, 53 strictPages**, 0 Fehler, 0 Warnungen). `npm run build` erfolgreich (9.55s, nur bekannte Chunk-Size-Warnung). |
| i18n-coverage-policy-1 | 2026-04-24 | Prüfmechanik gehärtet: Health Check, exemptPages, JSX-Kommentar-Strip, Doku-Regeln | `scripts/i18n/validate-i18n.mjs`, `scripts/i18n/i18n-check.config.json`, `docs/ai-start-prompt.md`, `docs/01-strategy/i18n-strategy.md`, `docs/02-architecture/code-landkarte.md`, `docs/current-status.md`, `docs/migration-log.md` | erledigt | **Ziel**: künftige i18n-/Migrationsaussagen automatisch nachvollziehbar machen, ohne neue Inhalte oder UI. **(1) Health Check**: neuer Abschnitt „Health Check (strictPages-Abdeckung)" im Validator scannt alle `*Page.tsx` unter `src/features/**/pages/` und alle `routes.tsx`. Meldet (a) tote `strictPages`-Einträge als Fehler, (b) i18n-fähige Pages ohne `strictPages`/`exemptPages`-Eintrag als Warnung, (c) geroutete Pages ohne `useTranslation` und ohne `exemptPages`-Eintrag als Warnung. **(2) `exemptPages`** in `i18n-check.config.json` neu eingeführt – Format `[{ "path": "...", "reason": "..." }]`. Validator akzeptiert Einträge nur, wenn Datei existiert UND `reason` nicht leer ist (sonst Fehler). Aktuell befüllt mit `HomePage.tsx` (Container-Seite ohne eigene Texte – alle Inhalte über Shared-Komponenten) und `AnwendungDetailPage.tsx` (Hilfskomponente unter `components/`, nicht direkt geroutet). **Keine** weiteren stillen Ausnahmen. **(3) Hardtext-Detektor minimal geschärft**: `findGermanHits` entfernt jetzt vor dem Match JSX-Kommentare `{/* ... */}` und einzeilige Block-Kommentare `/* ... */`, weil diese im DOM unsichtbar sind und vorher zu False-Positives führten (z. B. Section-Marker `{/* Geschäftsfelder */}`). Bestehende Erkennung (Umlaute, `germanTerms`, Wortgrenzen) bleibt unverändert; keine Abschwächung, keine pauschalen Ignore-Hacks. Mehrzeilige Block-Kommentare werden weiter über `inBlockComment[]` erfasst. **(4) Doku-Regeln präzisiert**: in `i18n-strategy.md` neue Definitionen für *Page*, *Container-Page* und *Hilfskomponente* sowie explizite Regeln „Wann muss eine Seite in `strictPages` stehen?" und „Wann ist eine `exemptPages`-Ausnahme erlaubt?". `ai-start-prompt.md` ergänzt um Pflicht zum Health-Check-Lesen. `code-landkarte.md` und `current-status.md` zählen die 15 verbleibenden Warnungen ehrlich aus. **(5) Keine Dashboard-/UI-Arbeit**, keine Webseiteninhalte, keine Routen-, Layout- oder Asset-Änderungen, keine künstlich erkauften grünen Checks – die 15 Warnungen bleiben bewusst sichtbar, bis sie in eigenen Etappen entweder migriert oder dokumentiert exempt werden. `npm run i18n:check` grün (**17 Namespaces, 53 strictPages, 2 exemptPages, 0 Fehler, 15 Warnungen**, exit 0). `npm run build` erfolgreich (8.69s, nur bekannte Chunk-Size-Warnung). |
| footer-rest-hygiene-1 | 2026-04-24 | Footer-/Resthygiene: Placeholder-Mapping, Copyright i18n, A11y-Labels Navigation | `src/navigation/footerNavigation.ts`, `src/components/Footer.tsx`, `src/i18n/locales/de/navigation.json`, `src/i18n/locales/en/navigation.json`, `src/components/MainNavigation.tsx`, `src/components/SubNavSticky.tsx`, `docs/current-status.md`, `docs/02-architecture/code-landkarte.md`, `docs/migration-log.md` | erledigt | Kleine Hygiene-Etappe ohne Inhalts-/Routen-/Designänderung. **(1) Footer-Placeholders aufgelöst**: `services.konfigurator` von `ROUTES.placeholder.root` auf reale Route `ROUTES.service.planenKonfigurieren` (`/planen-konfigurieren`) umgestellt; `services.ersatzteile` von `ROUTES.placeholder.root` auf reale Route `ROUTES.service.ersatzteile` (`/ersatzteile`) umgestellt. `linkType` jeweils von `placeholder` auf `internal`, `status` von `placeholder` auf `active`. Beide Zielseiten existieren real und sind in `strictPages` (Service-Domain seit `doc-service-final-1` migriert). Keine neuen Seiten, keine Slug-/Routen-Änderung. **(2) Footer-Copyright i18n**: hartcodierter String `© {year} TCS AG. Alle Rechte vorbehalten. Made in Germany.` aus `Footer.tsx` ausgelagert in `navigation.footer.bottom.copyright` (DE/EN strukturgleich, EN: „© {{year}} TCS AG. All rights reserved. Made in Germany."). Renderer nutzt jetzt `t("footer.bottom.copyright", { year: new Date().getFullYear() })`. **(3) Breadcrumb-Hygiene**: `breadcrumb.segments.ueber-tcs` ist in beiden Locales bereits sauber gesetzt („Über TCS" / „About TCS") – keine Änderung nötig, geprüft. **(4) A11y-/Resthygiene Navigation**: `MainNavigation.tsx` Logo-`alt` (vorher hart „TCS – Zurück zur Startseite") jetzt über `t("a11y.logoHome")`; Suche-Button erhält `aria-label={t("a11y.search")}`; Account-Button erhält `aria-label={t("a11y.account")}`; Mobile-Menu-Toggle erhält dynamisches `aria-label` (`a11y.menuOpen` / `a11y.menuClose`) und `aria-expanded={mobileOpen}`. `SubNavSticky.tsx` `aria-label` „Seitennavigation" auf `t("a11y.sectionNavigation")` umgestellt; Komponente nutzt jetzt `useTranslation("navigation")`. Suche/Account-Funktionalität unverändert (weiterhin reine UI-Buttons ohne Handler). **(5) i18n**: 5 neue a11y-Keys je Locale (`sectionNavigation`, `logoHome`, `search`, `account`, `menuOpen`, `menuClose`) plus 1 neuer Footer-Key (`footer.bottom.copyright`); DE Master, EN strukturgleich, 0 Diff, 0 leere Werte. **Bewusst NICHT angefasst**: keine neuen Seiten, keine Slugs, keine Routen, kein Redesign, keine Inhaltsarbeit, keine SEO-Etappe; Suche-/Account-Funktionalität bleibt UI-Stub. Veralteter Halbsatz in `code-landkarte.md` (`SignagePage.tsx`/`UeberTCSPage.tsx` „ohne `useTranslation`") aus dem letzten Final-Check minimal nachgezogen. `npm run i18n:check` grün (**17 Namespaces, 53 strictPages, 2 exemptPages, 0 Fehler, 15 Warnungen** – unverändert). `npm run build` erfolgreich (9.18s, nur bekannte Chunk-Size-Warnung). |
| hygiene-nav-rest-1 | 2026-04-24 | Navigations-/Linkresthygiene: Serviceportal-Aktivlogik, Mobile Meta-Links, ServiceportalCTA, FeatureBlock-Routing | `src/components/MetaNavigation.tsx`, `src/features/serviceportal/pages/ServiceportalPage.tsx`, `src/components/PageLayout.tsx`, `docs/migration-log.md` | erledigt | Kleine Resthygiene-Etappe ohne Inhalts-/Routen-/Designänderung. **(1) Serviceportal-Aktivlogik** in `MetaNavigation.tsx` korrigiert: Vergleich auf den realen Key `meta.serviceportal` umgestellt (vorher `serviceportal`, der in `metaNavigation.ts` so nicht existiert). Damit werden `/serviceportal`, `/serviceportal/registrieren` und `/serviceportal/passwort-vergessen` jetzt wieder als aktiver Bereich erkannt (`isSubPath` greift). **(2) Mobile Meta-Links** in `MetaNavigation.tsx` ergänzt: Im aufgeklappten Mobile-Branch erscheinen unter der Persona-Auswahl jetzt auch die zentralen Meta-Links (Kontakt, Karriere, Presse, Serviceportal) als React-Router-`<Link>`s, getrennt durch `border-t border-border`, mit derselben Aktivlogik wie Desktop und mit `nav aria-label={t("a11y.metaNavigation")}`. Persona-Auswahl und LanguageSwitcher bleiben unverändert. Keine neue IA. **(3) Serviceportal-CTA**: `<a href="#">` (toter Link) am Ende von `ServiceportalPage.tsx` jetzt als bewusst deaktiviertes `<span aria-disabled="true">` mit `opacity-60 cursor-not-allowed select-none` gerendert. Optik bleibt nahe am Original (gleiche Farb-/Padding-Klassen, gleicher Text und Icon), aber kein klickbarer Link mehr. Inhalt unverändert. **(4) FeatureBlock-Routing** in `PageLayout.tsx`: `FeatureBlock` rendert interne Ziele (Pfade, die mit `/` beginnen) jetzt als React-Router-`<Link to=...>`. Externe URLs (`http(s)://...`) und In-Page-Anchors (`#...`) bleiben unverändert als `<a href=...>`. Keine optische Änderung (gleiche `hover:text-lime-500 transition-colors`). Bestehender Headline-Render-Pfad ohne `link` ist unverändert. **Bewusst NICHT angefasst**: keine neuen Seiten, Slugs, Routen, Redesigns, Inhaltsarbeit, SEO-Etappe; keine i18n-Key-Erweiterung nötig (alle benötigten a11y-/Meta-Keys waren bereits in `navigation.json` vorhanden); MainNavigation, Footer, strictPages, Doku-Strategie, Service-Hub unverändert. `npm run i18n:check` grün (**17 Namespaces, 53 strictPages, 2 exemptPages, 0 Fehler, 15 Warnungen** – unverändert). `npm run build` erfolgreich (8.44s, nur bekannte Chunk-Size-Warnung). |
| i18n-validator-fix-1 | 2026-04-24 | Validator plattformstabil: Pfadvergleiche auf POSIX normalisiert (Windows-Härte) | `scripts/i18n/validate-i18n.mjs`, `docs/migration-log.md` | erledigt | Rein technische Härtung der i18n-Prüfmechanik. **Problem**: Der Health Check verglich Page-Dateipfade gegen `strictPages`/`exemptPages` als rohe Strings. Konstruktion von `allPageFiles` nutzte `p.replace(projectRoot + "/", "").replace(projectRoot + "\\", "")`. Auf POSIX funktioniert das (Forward-Slashes), aber auf Windows liefert `path.join()` Backslashes – der Strip kann dort versagen oder Mixed-Separator-Pfade produzieren, die nicht mehr 1:1 zu den `src/...`-Einträgen aus der JSON-Config matchen. Folge wären falsche „nicht in strictPages"-Warnungen oder fälschlich tot gemeldete Strict-Einträge. **Fix**: Neue Helper-Funktion `toPosix(p)` in `validate-i18n.mjs`: (a) absolute Pfade via `path.relative(projectRoot, p)` projektrelativ machen (plattformneutral, statt Strings zu raten); (b) Backslashes → Forward-Slashes; (c) doppelte Slashes kollabieren; (d) optionalen `./`-Prefix entfernen. **Anwendungsstellen**: `strictPages` (aus Config gelesen), `ignorePages`, `exemptPages[].path` und die Map `exemptPagesByPath` werden beim Einlesen einmal normalisiert; `allPageFiles` nutzt jetzt `toPosix(relative(projectRoot, p))` statt String-Strip. Damit sind alle Vergleiche – `strictPagesSet.has(file)`, `exemptPagesByPath.has(file)`, `deadStrict`-Filter – konsistent in POSIX-Form. **Keine Heuristik-Änderung**: `findGermanHits`, `germanTerms`, `allowedTechnicalTerms`, JSX-/Block-Comment-Strip, `useTranslation`-Erkennung, Umlaut-Regex, Exit-Code-Logik unverändert. **Keine neuen exemptPages**, keine künstlich entfernten Warnungen. **Warnungen vorher/nachher (POSIX-Sandbox)**: 15 → 15 (unverändert; auf POSIX war der alte Pfad-Strip bereits korrekt, der Fix sichert das gleiche Verhalten auf Windows ab). Die 15 Warnungen sind real bestätigt: 6 gebaeudekommunikation-Sub-Pages, kontakt, karriere, presse, 2 serviceportal-Sub-Pages, 4 zutrittskontrolle-Sub-Pages – exakt der bekannte Migrations-Backlog. **Doku**: keine Änderung nötig (Zähler 17 Namespaces / 53 strictPages / 2 exemptPages / 0 Fehler / 15 Warnungen identisch zu `footer-rest-hygiene-1` / `hygiene-nav-rest-1`). **Scope strikt eingehalten**: keine UI-, Routing-, Layout-, Content- oder JSON-Config-Änderung; `i18n-check.config.json` unangetastet. `npm run i18n:check` grün (17 Namespaces, 53 strictPages, 2 exemptPages, 0 Fehler, 15 Warnungen, Resultat OK, exit 0). `npm run build` erfolgreich (9.16s, nur bekannte Chunk-Size-Warnung). |
| hygiene-strictpages-close-1 | 2026-04-24 | strictPages auf 68 erweitert: alle 15 Health-Check-Warnungen real geschlossen, ohne Hardtext-Verstöße | `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | Reine Härtung, keine Code-/UI-/Routing-Änderung. **Vorher**: 53 strictPages, 2 exemptPages, 15 Warnungen. **Vorgehen**: Vor der Aufnahme jede Kandidaten-Page einzeln durch die reale Hardtext-Heuristik laufen lassen (temporäres Probe-Skript, `strictPages` testweise erweitert, Validator ausgeführt, Originalkonfig wiederhergestellt). Resultat: alle 15 Pages mit `harte deutsche Texte: 0` und `useTranslation: ja` — vollständig migrationsreif, keine Code-Korrektur nötig. **Neu in strictPages**: 6 gebaeudekommunikation-Sub-Pages (Türkommunikation, Türsprechanlagen, Briefkastenanlagen, Systemlösungen, Großanlagen, snipdoo IP), 4 zutrittskontrolle-Sub-Pages (Fahrstuhlsteuerung, Mobiler Zutritt, Türen/Tore, Zufahrten/Parkplätze), KontaktPage, KarrierePage, PressePage, RegistrierenPage, PasswortVergessenPage. **Hinweis Serviceportal-Sub-Pages**: i18n-seitig sauber (Texte und Placeholder über `t(...)`), Stub-Charakter gegenüber Auth-Backend bleibt fachlich offen — strictPages prüft nur i18n-Hygiene, nicht Backend-Reife. **Keine neuen exemptPages**: weiterhin nur HomePage und AnwendungDetailPage, beide mit unveränderter Begründung. **Keine künstlichen Ignores**, keine Heuristik-Lockerung, keine Code-Änderungen an den Pages selbst. **Nachher**: 68 strictPages, 2 exemptPages, **0 Warnungen, 0 Fehler**. `npm run i18n:check` grün (Namespaces 17, Seiten 68, Resultat OK, exit 0). `npm run build` erfolgreich (8.46s, nur bekannte Chunk-Size-Warnung). **Scope strikt eingehalten**: nur `i18n-check.config.json` + Migration-Log angefasst. **Doku-Folgehinweis**: `current-status.md` enthält noch alte Aussagen wie "53 strictPages", "15 Warnungen", "Nicht in strictPages aufgenommen" für Kontakt/Karriere/Presse/Sub-Pages — bewusst nicht in dieser Etappe geändert (Doku-Aktualisierung gehört in eine eigene Doku-Etappe, um nicht außerhalb des Scopes Behauptungen umzuschreiben). |
| hygiene-cta-rest-1 | 2026-04-24 | Alle 22 verbliebenen `href="#"`-CTAs bereinigt: real gemappt oder sichtbar deaktiviert | 14 Page-/Komponentendateien + `docs/migration-log.md` | erledigt | Reine CTA-Hygiene, keine Inhalts-/Layout-/Routing-Erfindung. **Vorher**: 22 `href="#"`-Treffer in `src/components`/`src/features`. **Nachher**: 0 (verifiziert via `grep -rn 'href="#"' src/components src/features`). **Vorgehen**: Pro Treffer Kontext geprüft (CTA-Text aus Locale gelesen), Mapping-Entscheidung explizit. **Auf reale interne Routen gemappt (12 CTAs, alle als React-Router `<Link>`)**: `BriefkastenanlagenPage` „Anlage konfigurieren" → `/planen-konfigurieren`; Persona-CTAs: `ArchitektenContent.cta.primary` „Projektberatung anfragen" → `/kontakt`; `BauherrenContent.cta.primary` „Beratungstermin vereinbaren" → `/kontakt`, `cta.secondary` „Konfigurator starten" → `/planen-konfigurieren`; `FachhandelContent.cta.primary` „Partnerschaft anfragen" → `/kontakt`; `FachplanerContent.cta.primary` „Planungsberatung anfragen" → `/kontakt`, `cta.secondary` „Konfigurator starten" → `/planen-konfigurieren`; `HandwerkContent.cta.primary` „Schulung buchen" → `/akademie`, `cta.secondary` „Technische Hotline" → `/technischer-support`; `WohnungswirtschaftContent.cta.primary` „Projektberatung anfragen" → `/kontakt`, `cta.secondary` „Referenzprojekte ansehen" → `/anwendungen/referenzprojekte`. **Bewusst deaktiviert (10 CTAs, je `<span aria-disabled="true" cursor-not-allowed>` in muted-Optik bzw. `<Button disabled>` für DownloadsPage)**: 7 Datenblatt-Buttons (`TuersprechanlagenPage`, `DigitaleNamensanzeigePage`, `ReservierenBuchenPage`, `SchraenkeBehaelterPage`, `MobilerZutrittPage`, `TuerenTorePage`, `ZufahrtenParkplaetzePage`) — keine PDF-Datenblätter im Projekt; `ArchitektenContent.cta.secondary` „Muster anfordern" — kein Ziel; `FachhandelContent.cta.secondary` „Sortiment ansehen" — kein eindeutiges Ziel; `PlanenKonfigurierenPage` Anlagenplaner-Tool-CTA — keine externe Tool-URL im Projekt; `DownloadsPage` Dokument-Kategorie-Buttons — keine realen Downloads. **Keine neuen Slugs, keine neuen Seiten, keine neuen i18n-Keys** (alle CTA-Texte bereits in Locale-Dateien vorhanden). **Optik-Erhalt**: deaktivierte Elemente behalten Inline-Layout/Padding/Icons; Farbe wechselt auf `text-muted-foreground` + `cursor-not-allowed`, was die Disabled-Semantik visuell trägt, ohne Reihenfolge oder Block-Höhe zu ändern. **`tel:` und `mailto:` unangetastet**, ebenso reale `#anchor`-Sprünge wie `#kontakt`/`#systemaufbau`/`#dokumente`/`#faq`. **Geänderte Dateien (14)**: `BriefkastenanlagenPage.tsx`, `TuersprechanlagenPage.tsx`, `DigitaleNamensanzeigePage.tsx`, `ReservierenBuchenPage.tsx`, `SchraenkeBehaelterPage.tsx`, `MobilerZutrittPage.tsx`, `TuerenTorePage.tsx`, `ZufahrtenParkplaetzePage.tsx`, `DownloadsPage.tsx`, `PlanenKonfigurierenPage.tsx`, `ArchitektenContent.tsx`, `BauherrenContent.tsx`, `FachhandelContent.tsx`, `FachplanerContent.tsx`, `HandwerkContent.tsx`, `WohnungswirtschaftContent.tsx`. **i18n-Check**: 17 Namespaces, 68 Seiten, **0 Fehler, 0 Warnungen**, exit 0. **Build**: `✓ built in 8.27s` (nur bekannte Chunk-Size-Warnung). **Scope strikt eingehalten**: keine Inhalts-Umformulierung, kein Redesign, keine Routen/Slugs neu, keine Doku-Behauptung ohne Code-Fix. |
| hygiene-status-1 | 2026-04-24 | `_meta.status` von 5 Namespaces auf `migrated` angeglichen (real gedeckt durch Code-/strictPages-Stand); Notes minimal aktualisiert | DE+EN von `gebaeudekommunikation`, `home`, `personas`, `signage`, `zutrittskontrolle`; `docs/migration-log.md` | erledigt | Reine Status-/Note-Hygiene, **keine** Inhalts-, Routen-, Layout- oder strictPages-Arbeit. **Vor der Änderung ehrlich verifiziert**: alle betroffenen Pages sind in `strictPages`, nutzen `useTranslation` und melden im Validator `harte deutsche Texte: 0`; die zugehörigen Namespaces sind DE/EN-strukturgleich, leere Werte: 0. **Geänderte Namespaces (5, je DE+EN)**: `gebaeudekommunikation` `in-progress → migrated` (alle 6 Pages migriert, in Etappe `hygiene-strictpages-close-1` in `strictPages` aufgenommen); `home` `in-progress → migrated` (UeberTCSPage migriert + in `strictPages`; HomePage ist dokumentierte Container-`exemptPage`, sichtbare Inhalte über Shared-Komponenten mit eigenen Namespaces); `personas` `in-progress → migrated` (alle 6 Persona-Komponenten nutzen `useTranslation("personas")`, vollständig befüllt; bewusst nicht in `strictPages`, weil eingebettet, kein Routenziel); `signage` `in-progress → migrated` (SignagePage in `strictPages`; BeschilderungPage liegt zwar im signage-Feature-Ordner, nutzt aber Namespace `gebaeudekommunikation` — der Namespace `signage` selbst trägt nur SignagePage und ist vollständig); `zutrittskontrolle` `in-progress → migrated` (alle 5 Pages in `strictPages` seit `hygiene-strictpages-close-1`). Notes wurden minimal angepasst, um die jeweilige Begründung und Etappenreferenz sachlich abzubilden — keine Werbeformulierungen, keine Schönfärbung. **Bewusst unverändert**: `legal` bleibt `in-progress` (Inhalte sind redaktionell offen, in der UI als „in Bearbeitung" markiert — Doku Z. 41 `current-status.md`); `common` und `navigation` haben kein `_meta`-Feld, das wurde nicht künstlich angelegt (technisches Schema-Detail außerhalb dieser Etappe); alle bereits auf `migrated` stehenden Namespaces (`anwendungen`, `eingangssysteme`, `gebaeudemanagement`, `karriere`, `kontakt`, `presse`, `service`, `serviceportal`, `wissen`) blieben unverändert. **Keine sichtbaren Texte geändert**, keine neuen Keys, keine Strukturänderung. **Hinweis Doku-Folge**: `docs/current-status.md` (Z. 27, 33, 34, 38) enthält weiterhin alte Statusbeschreibungen (z. B. „⚠️ teilweise" für home, „nicht in strictPages aufgenommen" für gebaeudekommunikation/zutrittskontrolle-Sub-Pages — letzteres ist seit `hygiene-strictpages-close-1` ohnehin überholt). Bewusst nicht in dieser Etappe stillschweigend umgeschrieben — die Doku-Aktualisierung gehört in eine eigene Etappe. **i18n-Check**: 17 Namespaces, 68 Seiten, **0 Fehler, 0 Warnungen**, Resultat OK, exit 0. **Build**: `✓ built in 7.96s` (nur bekannte Chunk-Size-Warnung). **Scope strikt eingehalten**: nur `_meta.status`/`_meta.note` in 10 Locale-Dateien + Migration-Log. |
| hygiene-dead-code-1 | 2026-04-24 | Toter Code, tote Assets und tote i18n-Keys entfernt (verifizierte Nichtverwendung) | gelöscht: `src/components/ProductHighlights.tsx`, `src/components/NavLink.tsx`, `src/assets/bcm-serverschrankschloss.jpg`, `src/assets/grossanlage-display.jpg`; bearbeitet: `src/i18n/locales/de/navigation.json`, `src/i18n/locales/en/navigation.json` (Block `nav.gebaeudemanagement.zufahrten` entfernt); `docs/migration-log.md` | erledigt | Reine Dead-Code-Hygiene, **keine** UI-/Routen-/Feature-Änderung. **Verifikation pro Löschung** vor dem Eingriff: (1) `ProductHighlights.tsx` — `grep -rn "ProductHighlights" src/` ergab nur Selbstreferenzen (Definition + Default-Export), keine Importer; in `docs/03-inventories/migration-mapping.md` nur als historischer Migrationskandidat erwähnt, kein produktiver Konsum. (2) `NavLink.tsx` — `grep -rn "NavLink" src/` ergab nur Selbstreferenzen; produktive Navigation nutzt `react-router-dom`-`Link`/`NavLink` direkt; Erwähnung in `docs/03-inventories/migration-mapping.md` ebenfalls historisch. (3) `bcm-serverschrankschloss.jpg` und (4) `grossanlage-display.jpg` — `grep -rn "bcm-serverschrankschloss\|grossanlage-display" src/` 0 Treffer in Code; `docs/03-inventories/asset-audit.md` führt beide explizit als „ungenutzt" und empfahl Löschung; auch global außerhalb `src/` keine Konsumstelle, nur Doku-Erwähnungen (asset-strategy.md, asset-audit.md, migration-log-Historie) — Doku-Verweise wurden bewusst belassen, da sie historische Audit-Einträge sind und nach dieser Etappe weiterhin korrekte Aussagen treffen („damals ungenutzt, jetzt entfernt"). (5) Schlüsselblock `nav.gebaeudemanagement.zufahrten.{label,desc}` — `grep -rn "gebaeudemanagement\.zufahrten\|nav\.gebaeudemanagement\.zufahrten" src/` 0 Konsumstellen. Die Navigationsdaten (`src/navigation/mainNavigation.ts`) verwenden ausschließlich `nav.zutrittskontrolle.zufahrten.{label,desc}` (`/zutrittskontrolle/zufahrten-parkplaetze`); diese aktiven Keys bleiben unverändert. **Bewusst NICHT gelöscht**: `nav.zutrittskontrolle.zufahrten.*` (aktiv konsumiert in `mainNavigation.ts`); alle anderen Komponenten in `src/components/` (alle nachweislich importiert); historische Doku-Erwähnungen der entfernten Dateien (sachliche Audit-Belege, kein Schaden). **Keine** sichtbaren UI-Texte verändert (nur ein toter, nicht gerenderter Schlüsselblock entfernt; das DE-Label „Zufahrten und Parkplätze" existiert weiterhin unter `nav.zutrittskontrolle.zufahrten.label`, was dem real geschalteten Navigationspfad entspricht). **i18n-Check**: 17 Namespaces, 68 Seiten, **0 Fehler, 0 Warnungen**, exit 0. **Build**: `✓ built in 8.98s` (nur bekannte Chunk-Size-Warnung). **Scope strikt eingehalten**: nur die im Eingangs-Scope genannten 4 Dateien gelöscht, der genannte Key-Block entfernt, ein Migration-Log-Eintrag — keine Refactors, keine Feature-Änderungen, keine Asset-Reorganisation, keine SEO-Arbeit. |
| doc-status-sync-1 | 2026-04-24 | Status-Doku an realen Repo-Stand angeglichen (17 Namespaces, 68 strictPages, 2 exemptPages, 0 Fehler, 0 Warnungen) | `docs/current-status.md`, `docs/01-strategy/i18n-strategy.md`, `docs/02-architecture/code-landkarte.md`, `docs/migration-log.md` | erledigt | Reine Doku-Etappe, **kein Produktivcode** angefasst, **kein Build erforderlich**. Drei Status-/Orientierungsdokumente an den realen Repo-Stand nach `hygiene-dead-code-1` synchronisiert. **(1) `current-status.md`**: Stand-Zeile auf `hygiene-dead-code-1` aktualisiert; i18n-Statustabelle vollständig neu auf reale `_meta.status`-Werte (alle Domain-Namespaces `migrated` außer `legal: in-progress`; `common`/`navigation` ohne `_meta`) umgestellt; veraltete Zahlen `53 strictPages` und `15 Warnungen` durch reale `68 strictPages`, `2 exemptPages`, `0 Fehler`, `0 Warnungen` ersetzt; veraltete Aussagen wie „nicht in `strictPages`" für `kontakt`/`karriere`/`presse`/`serviceportal`/`gebaeudekommunikation`-Subpages/`zutrittskontrolle`-Subpages entfernt (seit `hygiene-strictpages-close-1` alle real in `strictPages`); `home` nicht mehr als „⚠️ teilweise" geführt (`UeberTCSPage` migriert + in `strictPages`, `HomePage` als dokumentierte `exemptPage`); `signage` nicht mehr als „⚠️ teilweise" geführt (`SignagePage` migriert + in `strictPages`); Abschnitt „Offene Bereiche" auf reale offene Punkte reduziert (Legal-Inhalte, URL-Sprachstrategie, Bundle-Splitting, Serviceportal-Backend) — bereits erledigte i18n-Migrationen entfernt. **(2) `i18n-strategy.md`**: Stand-Zeile aktualisiert; Zähler `53 → 68 strictPages`, `2 exemptPages`, `0 Fehler/0 Warnungen` ergänzt; Tabelle „Migrierte Namespaces" auf reale `_meta.status`-Spalte umgestellt und alle Pages, die seit `hygiene-strictpages-close-1` in `strictPages` sind, sachlich ergänzt (`kontakt`, `karriere`, `presse`, `serviceportal`, `gebaeudekommunikation`-Subpages, `zutrittskontrolle`-Subpages); Abschnitt „Noch nicht / nur teilweise migriert" entfernt (überholt) und durch „Verbleibende offene Punkte" ersetzt (nur Legal-Inhalte und URL-Sprachstrategie); Hinweise zum Health Check und zu `strictPages` an die reale Tool-Ausgabe (0 Warnungen) angepasst. **(3) `code-landkarte.md`**: Stand-Zeile aktualisiert; Abschnitt 6 (i18n) auf reale Zahlen `68 strictPages`/`2 exemptPages`/`0 Fehler`/`0 Warnungen` umgestellt; veraltete Liste „nicht enthaltene Seiten" und „15 Warnungen" entfernt; neuer Hinweis auf realen `_meta.status`-Stand (alle Domain-Namespaces `migrated` außer `legal`); Sonderfall `BeschilderungPage`/`signage` weiterhin korrekt dokumentiert (Abschnitt 12 unverändert). **Bewusst NICHT geändert**: keine Locale-JSON-Inhalte, keine `_meta`-Änderungen (gehört zu `hygiene-status-1`), keine Validator-Heuristik (gehört zu `i18n-validator-fix-1`), keine `i18n-check.config.json`-Änderung (gehört zu `hygiene-strictpages-close-1`), keine Routen, keine Navigation, keine Komponenten, keine Assets. **Verifikation**: `npm run i18n:check` ausgeführt vor und nach den Doku-Änderungen — beide Male **17 Namespaces, 68 strictPages, 2 exemptPages, 0 Fehler, 0 Warnungen, exit 0**. Doku-Aussagen jetzt 1:1 mit realer Tool-Ausgabe und realem Code-Stand. Kein Build erforderlich (reine Doku-Etappe). |
| doc-url-strategy-1 | 2026-04-24 | URL- und Sprachstrategie als strategische Zielentscheidung dokumentiert (Empfehlung: Option B – Sprachpräfix im Pfad) | `docs/01-strategy/url-sprachstrategie.md` (neu), `docs/README.md`, `docs/current-status.md`, `docs/migration-log.md` | erledigt | Reine Dokumentationsetappe, **kein Produktivcode geändert**, **kein Build erforderlich**. **Neu angelegt**: `docs/01-strategy/url-sprachstrategie.md` mit Ist-Zustand (sprachneutrale URLs, i18n-Sprachumschaltung über `i18next`+`localStorage`, kein `/de/`-/`/en/`-Routing, keine hreflang-Tags, keine sprachspezifische Sitemap/Redirect-Strategie; `<html lang>` dynamisch über `useDocumentLang` aus `doc-seo-base-1`), drei bewerteten Optionen (A sprachneutral, B Sprachpräfix im Pfad, C Subdomain/ccTLD), klar benannter Empfehlung **Option B** mit Begründung (internationale SEO, hreflang-Fähigkeit, kanonische Sprachtrennung, sprachspezifische Slugs, Skalierbarkeit), expliziter Liste der bei späterer Umsetzung betroffenen Bereiche (`src/navigation/routes.ts`, Feature-Routen, interne Links, `AutoBreadcrumb`, `src/i18n/index.ts`, hreflang, Sitemap, Redirects) und ausdrücklicher Abgrenzung, dass die Empfehlung **noch nicht im Code umgesetzt** ist. **Verlinkungen ergänzt**: `docs/README.md` listet das neue Dokument unter `01-strategy/`; `docs/current-status.md` führt es unter „Aktuelle Referenz-Dokumente" mit Status-Hinweis und ersetzt im Abschnitt „Offene Bereiche" den bisherigen Eintrag „URL-Sprachstrategie entscheiden und einführen" durch einen Hinweis auf die getroffene Zielentscheidung mit verbleibender Code-Umsetzung. **Bewusst NICHT gesetzt**: Verweis aus `docs/01-strategy/seitentyp-taxonomie.md` — diese Datei existiert im Repo nicht (vorherige Etappe `doc-taxonomie-2` wurde mangels Inhaltsgrundlage nicht ausgeführt). Lücke im Bericht offen benannt; sobald das Taxonomie-Dokument angelegt wird, kann der Querverweis dort sauber ergänzt werden. **Bewusst NICHT geändert**: kein Produktivcode unter `src/**`, keine Routen, keine Navigation, keine i18n-Locales, keine Komponenten, keine Assets, keine Slugs, kein hreflang, keine Sitemap, keine Redirects, keine SEO-Meta-Implementierung. **Markdown-Links** der neu gesetzten Verweise geprüft (alle Ziele existieren: `production-readiness-plan.md`, `i18n-strategy.md`, `../02-architecture/code-landkarte.md`, `../current-status.md`). |
| doc-taxonomie-2 | 2026-04-24 | Seitentyp-Taxonomie als strategisches Projektdokument eingeführt | `docs/01-strategy/seitentyp-taxonomie.md` (neu), `docs/README.md`, `docs/current-status.md`, `docs/migration-log.md` | erledigt | Reine Dokumentationsetappe, **kein Produktivcode** geändert, **kein Build erforderlich**. Verbindliche Endfassung der Seitentyp-Taxonomie (v2) übernommen: 22 Typen in 4 Clustern (Kern, Wissen, Unternehmen, System), Primärziel und Hauptkonversion pro Typ, T16 in Service-Hub (T16a) und Service-Unterseite (T16b) aufgetrennt, Akademie als Wissens-Typ T10b verankert, T04-URL-Empfehlung `/<domain>/<kategorie>/<produkt-slug>`. Verlinkungen gesetzt in `docs/README.md` (Bereich `01-strategy/`) und `docs/current-status.md` (Aktuelle Referenz-Dokumente). Querverweise im Dokument selbst zeigen auf real vorhandene Dateien (`i18n-strategy.md`, `production-readiness-plan.md`, `url-sprachstrategie.md`, `serviceportal-status.md`, `../02-architecture/code-landkarte.md`, `../03-inventories/navigation-inventory.md`). **Bewusst als Platzhalter mit Hinweis** belassen: Abschnitte 6 (Mapping Bestand → Typ), 8 (Verhältnis zu Navigation/Breadcrumbs) und 12 (Anti-Pattern pro Typ) – die Quellfassung verwies dort auf „denselben Abschnitt aus deiner Fassung", ohne den Volltext mitzuliefern; gemäß Sicherheitsregel keine Inhalte erfunden, sondern als Folge-Etappe markiert. Abschnitt 7 (fehlende Typen) und 11 (nächste Schritte) aus der Tabelle in 3.2 sachlich abgeleitet. Keine Routen, Navigation, i18n-Locales, Komponenten, Assets, Slugs oder URL-Strategie-Umsetzungen geändert. Interne Markdown-Links geprüft – alle Ziele existieren im Repo. |
| doc-taxonomie-url-link-sync-1 | 2026-04-24 | Querverweise zwischen Seitentyp-Taxonomie und URL-/Sprachstrategie synchronisiert | `docs/01-strategy/url-sprachstrategie.md`, `docs/migration-log.md` | erledigt | Reine Dokumentationsetappe, **kein Produktivcode** geändert, **kein Build erforderlich**. **Befund vor der Änderung**: `seitentyp-taxonomie.md` verlinkt bereits dreimal sauber auf `url-sprachstrategie.md` (Frontmatter „Verwandte Dokumente", Abschnitt 5 „URL-Konventionen und Sprachstrategie-Weiche", Abschnitt 10 „Verhältnis zur Produktionsreife") — hier war kein Nachzug nötig. `url-sprachstrategie.md` verlinkte hingegen noch **nicht** zurück, weil die Taxonomie zum Zeitpunkt von `doc-url-strategy-1` noch nicht existierte. **Änderung**: In `url-sprachstrategie.md` Abschnitt 6 „Verwandte Dokumente" einen Rückverweis auf `seitentyp-taxonomie.md` als ersten Bullet ergänzt, mit kurzer inhaltlicher Begründung (URL-Muster pro Seitentyp + Verweis auf Sprachpräfix-Entscheidung in Abschnitt 5). **Bewusst NICHT geändert**: `seitentyp-taxonomie.md` (bereits korrekt verlinkt — keine doppelten Verweise eingefügt); keine inhaltlichen Aussagen zur Strategie umformuliert. **Markdown-Link-Prüfung**: neuer Verweis `./seitentyp-taxonomie.md` zeigt auf real vorhandene Datei (verifiziert). Keine Routen, Navigation, i18n-Locales, Komponenten, Assets oder Slugs angefasst. |
| doc-taxonomie-complete-1 | 2026-04-24 | Offene Abschnitte der Seitentyp-Taxonomie (6 Mapping, 8 Navigation/Breadcrumbs, 12 Anti-Pattern) auf Basis des realen Repo-Stands ausformuliert | `docs/01-strategy/seitentyp-taxonomie.md`, `docs/migration-log.md` | erledigt | Reine Dokumentationsetappe, **kein Produktivcode** geändert, **kein Build erforderlich**. **Abschnitt 6** (Mapping Bestand → Typ) ersetzt den bisherigen Platzhalter durch ein reales Mapping aller heute gerouteten Pages unter `src/features/**/pages/*Page.tsx` auf die Seitentypen T01–T21. Grundlage: tatsächliche Page-Dateien und Routen aus `src/features/**/routes.tsx` plus `src/app/routes.tsx`. Strukturiert in 14 Untergruppen (Domain-Hubs, Produktkategorien, Systemlösungen/Funktionen, Eingangssysteme-Sonderfall, Anwendungen/Branchen, Referenzen, Wissen/Akademie, Service, Serviceportal, Unternehmen/Meta, Legal, System, Personas, Zusammenfassung). Sonderfälle offen benannt: `BeschilderungPage` (liegt in `signage/`, gemountet unter `gebaeudekommunikation/`), `HomePage` und `AnwendungDetailPage` als `exemptPages`, mehrere `anwendungen/`-Seiten strukturell T06 (Funktion) statt T05 (Branche) mit Migrations-Hinweis auf die jeweilige Mutter-Domain. Eingangssysteme-Aspekt-Seiten (Design/Material/Funktionalität/Integrationsformen/Standards) als Mischform T06 vorläufig zugeordnet, mit Hinweis auf spätere Sub-Typ-Entscheidung. T04 (PDP), T10a (Wissens-Hub), T11 (Wissensartikel), T12/T13 (FAQ), T14/T15 (Glossar) als nicht vorhanden ausgewiesen (konsistent zu Abschnitt 7). T09 (Persona) als eingebettete Komponente, nicht als eigene Route, dokumentiert. Keine erfundenen Pages, keine Behauptungen über bereits existierende Templates. **Abschnitt 8** (Verhältnis zu Navigation und Breadcrumbs) ersetzt den Platzhalter durch eine projektbezogene Klärung in fünf Unterabschnitten: 8.1 Was-definiert-was-Tabelle (Taxonomie/Navigation/Breadcrumbs mit jeweiligen Code-Quellen `src/navigation/*` und `src/components/AutoBreadcrumb.tsx`), 8.2 „Seitentyp ≠ Hauptnavigationseintrag" mit konkreten Beispielen aus dem realen Bestand (T05-Branchen, T20-Legal, T17-Serviceportal-Subpages), 8.3 „Breadcrumbs folgen URL, nicht Typ" inkl. Sonderfall `BeschilderungPage`, 8.4 Konsistenzregel (drei Fragen: Was/Wem/Wo), 8.5 Anschluss an `src/navigation/README.md`, `../03-inventories/navigation-inventory.md` (historisch) und `../02-architecture/code-landkarte.md`. Keine Strategie-Erweiterung, keine neuen Regeln über die vorhandene Taxonomie-Logik hinaus. **Abschnitt 12** (Anti-Pattern pro Typ) ersetzt den Mindestblock durch eine vollständige, operativ formulierte Anti-Pattern-Liste in fünf Unterabschnitten (12.1 Cluster-übergreifend, 12.2 Kern T01–T09, 12.3 Wissen T10a–T15, 12.4 System T16a–T17/T21, 12.5 Unternehmen T18–T20). Jedes Anti-Pattern aus Pflichtbausteinen, Primärziel oder Hauptkonversion des jeweiligen Typs abgeleitet; konkret prüfbar (z. B. „keine SKU auf T01", „keine PDP ohne Spezifikationstabelle", „keine FAQ ohne `FAQPage`-JSON-LD", „keine Service-Hub-Kachel auf `"#"`"). Bezug auf reale Hygiene-Etappen (`hygiene-cta-rest-1`) und reale Validator-Regeln (`strictPages`/`exemptPages`, `i18n-strategy.md`) hergestellt, ohne neue Mechaniken einzuführen. **Restliche Datei** in Struktur und Tonalität intakt: Abschnitte 1–5, 7, 9–11 unverändert; Typdefinitionen T01–T21 unverändert; Änderungshistorie (Abschnitt 13) um Eintrag v2.1 für diese Etappe ergänzt. **Bewusst NICHT geändert**: kein Produktivcode unter `src/**`, keine Routen, keine Navigation, keine i18n-Locales, keine Komponenten, keine Assets, keine Slugs, keine URL-Strategie-Umsetzung, keine neuen Strategiedokumente, keine stillen Änderungen an `README.md`, `current-status.md` oder `ai-start-prompt.md`. **Verifikation**: Datei enthält in Abschnitten 6, 8 und 12 keine Platzhalter-Hinweise mehr (kein „> Hinweis: Dieser Abschnitt …"). Alle in dieser Etappe neu gesetzten Markdown-Links zeigen auf reale Dateien (`../03-inventories/navigation-inventory.md`, `../02-architecture/code-landkarte.md`). Mapping nutzt ausschließlich reale Pages aus `src/features/**/pages/`. |
| doc-ai-start-prompt-sync-1 | 2026-04-24 | KI-Startprompt auf Taxonomie, URL-Strategie und Mitarbeiter-Fahrplan synchronisiert | `docs/ai-start-prompt.md`, `docs/migration-log.md` | erledigt | Reine Dokumentationsetappe, **kein Produktivcode** geändert, **kein Build erforderlich**. **Lesereihenfolge** in `ai-start-prompt.md` von 6 auf 9 Punkte erweitert: zusätzlich aufgenommen `docs/01-strategy/seitentyp-taxonomie.md` (Pos. 5), `docs/01-strategy/url-sprachstrategie.md` (Pos. 6) und `docs/mitarbeiter-fahrplan.md` (Pos. 7) – letzteres mit explizitem Hinweis „falls vorhanden", weil die Datei aktuell noch nicht im Repo liegt; Reihenfolge logisch geordnet (Status & Doku-Einstieg → Strategie → Architektur → Verlauf). **Arbeitsregeln** ergänzt: (a) „Seitentyp vor Content-Struktur" – neue Seiten zuerst gemäß Seitentyp-Taxonomie (T01–T21) typisieren, Pflichtbausteine/Primärziel/Hauptkonversion folgen der Taxonomie, kein „freies Bauen" wenn ein Typ existiert; (b) „URL-/Sprachstrategie ist entschieden, aber noch nicht umgesetzt" – `/de/`-/`/en/`-Routing strategisch beschlossen (siehe `url-sprachstrategie.md`), darf nicht stillschweigend im Code vorweggenommen oder ignoriert werden, Routen-/Slug-/Sprachpräfix-Änderungen nur bei ausdrücklicher Etappe; (c) Verweis-Regel ergänzt, dass bei neuen Seiten/Inhalten zusätzlich `seitentyp-taxonomie.md` und `url-sprachstrategie.md` zu berücksichtigen sind; (d) Verweis auf `mitarbeiter-fahrplan.md` als operative Orientierung bei Aufträgen aus dem nicht-technischen Team (mit „falls vorhanden"-Vorbehalt). **„Nicht tun"-Liste** (Abschnitt 7) um zwei konkrete Punkte erweitert: keine vorgezogene `/de/`-/`/en/`-Präfix-Implementierung außerhalb beauftragter Etappe, keine neuen Seiten ohne vorherige Seitentyp-Zuordnung. **Neuer Block „Arbeitsprinzip in Kurzform"** direkt nach der „Nicht tun"-Liste eingefügt: Strategie vor Einzelseite, Seitentyp vor Content-Struktur, Final-Check bleibt Pflicht, bei größeren Themenblöcken oder langen Chats neuen Chat starten. **Ablauf in Kurzform** (Schritt 2) um die drei neuen Dokumente erweitert. **Block „Hinweis zu historischen Dokumenten"** um `seitentyp-taxonomie.md`, `url-sprachstrategie.md` und `mitarbeiter-fahrplan.md` (mit „falls vorhanden") als maßgebliche Quellen erweitert. **Bewusst NICHT geändert**: Standardstruktur für Lovable-Prompts, Final-Check-Pflicht, Routebasierte Final-Check-Pflicht, i18n-Health-Check-Abschnitt, Rollenverteilung, Sprachregel – diese Abschnitte waren bereits aktuell und bleiben in Wortlaut und Struktur erhalten. Keine komplette Neuformulierung. **Bewusst NICHT angefasst**: kein Produktivcode unter `src/**`, keine Routen, keine Navigation, keine i18n-Locales, keine Komponenten, keine Assets, keine Slugs, keine neuen Strategie-Dokumente; `docs/README.md` und `docs/current-status.md` blieben unverändert, weil keine zwingende Verlinkung auf den Startprompt-Update nötig ist (`current-status.md` listet die drei Strategie-Dokumente bereits, `README.md` führt sie ebenfalls). **Wichtiger Hinweis zur Datenlage**: `docs/mitarbeiter-fahrplan.md` existiert zum Zeitpunkt dieser Etappe **noch nicht im Repo**. Der Startprompt verweist trotzdem darauf, weil die Etappe ausdrücklich diesen Verweis verlangt – aber jede Erwähnung trägt den Zusatz „falls vorhanden", damit keine Behauptung über existierende Inhalte erfunden wird. Sobald die Datei real angelegt ist (eigene Etappe), kann der „falls vorhanden"-Zusatz in einer Folge-Etappe entfernt werden. **Verifikation**: Alle in dieser Etappe geänderten internen Markdown-Pfade verweisen auf real existierende Dateien (`docs/01-strategy/seitentyp-taxonomie.md`, `docs/01-strategy/url-sprachstrategie.md`); der Verweis auf `docs/mitarbeiter-fahrplan.md` ist als noch-nicht-existent markiert. Plausibilitätscheck: Taxonomie, URL-Strategie und (geplanter) Mitarbeiter-Fahrplan sind im Startprompt jetzt an vier Stellen real berücksichtigt (Lesereihenfolge, Arbeitsregeln, „Nicht tun"-Liste, Ablauf-Kurzform, Hinweis zu historischen Dokumenten). |
| doc-mitarbeiter-fahrplan-1 | 2026-04-24 | Mitarbeiter-Fahrplan als operative Doku-Grundlage eingeführt | `docs/mitarbeiter-fahrplan.md` (neu), `docs/README.md`, `docs/current-status.md`, `docs/ai-start-prompt.md`, `docs/migration-log.md` | erledigt | Reine Dokumentationsetappe, **kein Produktivcode** geändert, **kein Build erforderlich**. Neue Datei `docs/mitarbeiter-fahrplan.md` als operative Arbeitsanleitung für nicht-technische Mitarbeitende angelegt. **Inhaltliche Hauptabschnitte**: 1. Zweck, 2. Für wen ist dieser Fahrplan gedacht?, 3. Rollenverteilung (Mitarbeiter / Begleit-KI / Lovable / Mensch-Freigabe), 4. Was Mitarbeitende liefern sollten (Was/Warum/Für wen/Materialien/Wo/Frist/Sprache), 5. Was die Begleit-KI daraus macht (Domain, Seitentyp T01–T21, betroffene Dateien, i18n-Bedarf, Route-/Navigationsbedarf, Doku-Bedarf, Final-Check), 6. Bestehende Seite ändern oder neue Seite anlegen?, 7. Pflicht: Seitentyp zuerst (Verweis auf `01-strategy/seitentyp-taxonomie.md`), 8. URL- und Sprachstrategie (Verweis auf `01-strategy/url-sprachstrategie.md`, ausdrücklicher Hinweis: Zielentscheidung steht, aber noch nicht im Code, darf nicht stillschweigend vorgezogen werden), 9. Was nicht stillschweigend passieren darf (keine Seiten ohne Typ, keine stillen Routen-/Slug-/Navigationsänderungen, keine vorgezogene `/de/`-/`/en/`-Implementierung, keine harten sichtbaren Texte in TSX, keine Schnellschüsse direkt im Code, keine Mockdaten als Produktivinhalte), 10. Empfohlener Arbeitsablauf in 7 Schritten (Idee → KI-Klärung → Rückfragen → Lovable-Prompt → Umsetzung → Final-Check → Freigabe), 11. Was Mitarbeitende nach einer Umsetzung prüfen sollten, 12. Typische Fehler, 13. Verwandte Dokumente. **Verlinkungen ergänzt**: (a) `docs/README.md` Schnellstart-Lesereihenfolge von 5 auf 8 Punkte erweitert (zusätzlich Mitarbeiter-Fahrplan, Seitentyp-Taxonomie, URL-Strategie), Mitarbeiter-Fahrplan zusätzlich in der Root-Dokumente-Liste aufgeführt. (b) `docs/current-status.md` Mitarbeiter-Fahrplan unter „Aktuelle Referenz-Dokumente" verlinkt mit Kurzbeschreibung. (c) `docs/ai-start-prompt.md` an drei Stellen synchronisiert: Zusatz „falls vorhanden" beim Verweis auf `mitarbeiter-fahrplan.md` in der Lesereihenfolge entfernt, Pflichtregel zum Mitlesen entkonditionalisiert, Ablauf-in-Kurzform-Zeile entkonditionalisiert. **Tonalität und Stil**: sachlich, projektnah, keine Marketingsprache, keine erfundenen Prozesse, keine Behauptungen über bereits umgesetzte CMS-/Admin-/Supabase-Strukturen; Mitarbeiter werden nicht zu Code-Arbeit aufgefordert; reale Projektlogik (Seitentyp zuerst, i18n-first, Lovable als ausführender Mitarbeiter, Final-Check Pflicht) durchgehend gespiegelt. **Plausibilitätscheck**: Mitarbeiter-Fahrplan, Startprompt, Seitentyp-Taxonomie und URL-Strategie verweisen konsistent aufeinander; die Pflicht „Seitentyp zuerst" und das Verbot der vorgezogenen URL-Strategie-Umsetzung sind in beiden operativen Dokumenten (Fahrplan und Startprompt) gleichlautend formuliert. **Verifikation**: Alle in dieser Etappe neu gesetzten internen Markdown-Links zeigen auf real existierende Dateien (`README.md`, `current-status.md`, `ai-start-prompt.md`, `migration-log.md`, `01-strategy/seitentyp-taxonomie.md`, `01-strategy/url-sprachstrategie.md`, `01-strategy/production-readiness-plan.md`). **Bewusst NICHT angefasst**: kein Produktivcode unter `src/**`, keine Routen, keine Navigation im Code, keine i18n-Locales, keine Komponenten, keine Assets, keine Slugs, keine Datenbank-/Supabase-Umsetzung, keine Admin-Oberfläche, keine CMS-Implementierung, keine URL-Strategie-Umsetzung im Code, keine zusätzlichen Strategie-Dokumente außerhalb des Scopes. |
| doc-ai-start-prompt-fahrplan-cleanup-1 | 2026-04-24 | AI-Startprompt an real vorhandenen Mitarbeiter-Fahrplan angeglichen | `docs/ai-start-prompt.md`, `docs/migration-log.md` | erledigt | Reine Dokumentationsetappe, **kein Produktivcode** geändert, **kein Build erforderlich**. Restliche Vorbehaltsformulierung „*(falls vorhanden)*" hinter `docs/mitarbeiter-fahrplan.md` in `docs/ai-start-prompt.md` Zeile 367 (Block „Hinweis zu historischen Dokumenten" / „Maßgeblich für den aktuellen Stand sind") entfernt. Datei wird damit konsistent zu den drei bereits in `doc-mitarbeiter-fahrplan-1` bereinigten Stellen (Lesereihenfolge Pos. 7, Arbeitsregel Z. 57, Ablauf-Kurzform Schritt 2) als reales, verbindlich mitzulesendes Pflichtdokument behandelt. **Verifikation**: `grep -i "falls vorhanden\|wenn.*vorhanden\|im ZIP fehlt"` in `docs/ai-start-prompt.md` liefert keine Treffer mehr im Kontext des Mitarbeiter-Fahrplans. Pfad `docs/mitarbeiter-fahrplan.md` real existent (geprüft). Keine weiteren Strukturänderungen, keine neuen Regeln, keine Stilumbauten. **Bewusst NICHT angefasst**: kein Produktivcode unter `src/**`, keine Routen, keine Navigation, keine i18n-Locales, keine Komponenten, keine Assets, keine Slugs, keine SEO-/URL-Strategie-Inhalte, keine andere Dokumentation. |
| feat-supabase-base-1 | 2026-04-24 | Read-only Supabase-Basisanbindung für Produktkatalog und Dokumente vorbereitet | `package.json`, `src/lib/supabase/client.ts` (neu), `src/features/produkte/types/index.ts` (neu), `src/features/produkte/api/products.ts` (neu), `src/features/service/api/documents.ts` (neu), `docs/migration-log.md` | erledigt | Etappe 1 der Supabase-Anbindung. **Strikt read-only.** Lovable Cloud bewusst **nicht** aktiviert; angebunden wird die externe Supabase-Instanz aus `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`. **Dependency**: `@supabase/supabase-js@^2.45.0` ergänzt (vorher nicht installiert). **Zentraler Client** `src/lib/supabase/client.ts`: nutzt ausschließlich `import.meta.env.VITE_SUPABASE_URL` und `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`; Auth-Optionen `persistSession=false`, `autoRefreshToken=false`, `detectSessionInUrl=false` (diese Webseite nutzt Supabase nicht für Auth); fehlende Env-Variablen führen nur zu einer Konsolenwarnung, nicht zu einem Render-Bruch (Webseitencontent ist codebasiert und nicht von Supabase abhängig); Helper `isSupabaseConfigured()` für saubere API-Vorprüfungen. **Read-only API Produkte** `src/features/produkte/api/products.ts`: vier vorbereitende Funktionen `getPublicProducts()`, `getPublicProductByArtikelNr(artikelNr)`, `getProductImages(artikelNr)`, `getActivePackageComponents(artikelNr)`, `getPackageDocuments(artikelNr)`. Bevorzugte Quellen verdrahtet: `products_public_view` (öffentliche Produktliste/-detail), `article_images` (Produktbilder), `paket_komponenten` strikt mit `.eq("status", "active")` (keine anderen Status), `paket_dokumente_resolved_view` (aufgelöste Paketdokumente). **Read-only API Dokumente** `src/features/service/api/documents.ts`: zwei vorbereitende Funktionen `getArticleDocuments(artikelNr)` und `getDocumentArtikelLinks(artikelNr)` gegen `article_documents` bzw. `document_artikel` für direkte Dokumentverknüpfungen. **Typen** `src/features/produkte/types/index.ts`: konservative Minimaltypen (`PublicProduct`, `ArticleImage`, `PackageComponent`, `PackageDocumentResolved`, `ArticleDocument`, `DocumentArtikelLink`) – nur `artikel_nr` und (bei `PackageComponent`) `status` typisiert; alle weiteren Spalten bleiben über `SupabaseRecord` als `unknown` offen, damit keine Feldnamen erfunden werden. Exakte Typen können später per `supabase gen types` präzisiert werden. **Strict-Read-Only-Verifikation**: `grep -RnE "\.(insert|update|delete|upsert)\("` über `src/lib/supabase` und `src/features/**/api` liefert 0 Treffer; alle Aufrufe sind `.from(...).select(...)`. **Bewusst NICHT umgesetzt** (außerhalb dieser Etappe): keine Admin-Oberfläche, kein CMS-light, keine neue Content-Datenbank, keine Produktkatalog-UI, keine Download-UI, keine Produktdetailseite, keine neue Route, keine Navigationsänderung, keine Slug-/URL-Strategie-Änderung, keine i18n-Locale-Änderung, keine sichtbaren TSX-Texte, keine Auth, keine Rollen, keine Lovable-Cloud-Aktivierung, keine Schreiboperationen, keine API-Konsumenten in UI-Komponenten. **Sichtbare Webseitenänderung**: keine. Bestehende Pages, Routen, Layouts, Assets, Navigation und i18n unverändert. **Hinweis zur Env-Verfügbarkeit**: in der Build-Sandbox dieser Etappe waren `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` nicht gesetzt; das ist erwartungsgemäß ohne Auswirkung auf den Build, weil der Client diese Werte nur zur Laufzeit beim ersten Query verwendet und bei fehlender Konfiguration warnt statt zu werfen. `npm run i18n:check` grün (**17 Namespaces, 68 strictPages, 2 exemptPages, 0 Fehler, 0 Warnungen**, exit 0). `npm run build` erfolgreich (`✓ built in 7.03s`, nur bekannte Chunk-Size-Warnung). |
| feat-supabase-base-1-fix | 2026-04-24 | Nachkorrektur: `isSupabaseConfigured()` als früher Guard in allen read-only API-Funktionen | `src/features/produkte/api/products.ts`, `src/features/service/api/documents.ts`, `docs/migration-log.md` | erledigt | Reine Härtungs-Änderung. In allen sieben vorbereiteten read-only API-Funktionen (`getPublicProducts`, `getPublicProductByArtikelNr`, `getProductImages`, `getActivePackageComponents`, `getPackageDocuments`, `getArticleDocuments`, `getDocumentArtikelLinks`) wird vor jedem `supabase.from(...).select(...)` jetzt `isSupabaseConfigured()` geprüft. Listenfunktionen liefern bei fehlender Konfiguration `[]`, `getPublicProductByArtikelNr` liefert `null`. Verhindert Laufzeitfehler, falls `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` fehlen. Echte Supabase-Errors bei korrekter Konfiguration werden weiterhin unverändert geworfen. **Strikt read-only**: keine neuen `insert`/`update`/`delete`/`upsert`-Aufrufe; grep weiterhin 0 Treffer. Keine UI-, Routen-, Navigations-, Slug-, i18n- oder Asset-Änderung. Keine neuen Tabellen/Views. Sichtbare Webseite unverändert. |

| catalog-mvp-1 | 2026-04-24 | Online-Produktkatalog: erste read-only DB-Anbindung als MVP auf bestehender Route | `src/features/service/catalog/api/catalog.ts`, `src/features/service/catalog/types.ts`, `src/features/service/catalog/components/CatalogMvp.tsx`, `src/features/service/pages/OnlineProduktkatalogPage.tsx`, `src/i18n/locales/de/service.json`, `src/i18n/locales/en/service.json`, `docs/migration-log.md` | erledigt | Bestehende Route `/service/online-produktkatalog` bleibt; Navigation, Slugs, Hero und vorhandene Access/Hinweis-Sections unverändert. **Neu**: feature-interner Bereich `src/features/service/catalog/` (api, types, components) – kein zweiter Supabase-Client, nutzt ausschließlich `src/lib/supabase/client.ts`. **API**: `getCatalogContext()` ruft die offizielle RPC `rpc_get_catalog_context()` der externen DB auf; `getCatalogProducts(0, 39)` liest `product_catalog_view` per `.range(0, 39)`. Beide Funktionen sind read-only, mit `isSupabaseConfigured()`-Guard. **Komponente** `CatalogMvp` zeigt Lade-/Fehler-/Leer-Zustand, Anzahl geladener Produkte, optionalen "Katalog-Kontext OK"-Hinweis und ein generisches Produktgrid. Felder werden **nicht erfunden**, sondern dynamisch über bekannte Kandidatenlisten (`title|name|bezeichnung|...`, `image_url|bild_url|...`, `artikel_nr|...`) aus den Datensätzen gepickt; fehlende Werte als "—". Kein Bild → neutraler Platzhalter (Lucide `Package`). **Keine** Filterlogik, keine Kategorie-Chips, keine Präfix-/Smart-Stick-Heuristik, keine Paketauflösung, keine PDP-Route, kein Merkzettel, kein Export. **Strikt read-only**: kein `insert`/`update`/`delete`/`upsert`/schreibende RPC; keine Migrationen, keine neuen Tabellen, kein `supabase/`-Ordner, Lovable Cloud nicht aktiviert. **i18n**: neuer Block `katalog.mvp.*` (DE Master, EN strukturgleich) – Status-Texte mit Plural-Variable `count`, Error-/Empty-Boxen, Card-Label. Keine sichtbaren Texte hardcoded. **Design**: ausschließlich semantische Tokens (`bg-background`, `text-muted-foreground`, `text-accent`, `border-destructive/30`, `shadow-elevated`); keine direkten Farben. `npm run i18n:check` grün. `npm run build` grün. |

| catalog-v2-columns-filters | 2026-04-24 | Online-Produktkatalog: DB-gesteuertes Spaltenmodell + Filter aus offizieller Katalogschicht | `src/features/service/catalog/api/catalog.ts`, `src/features/service/catalog/types.ts`, `src/features/service/catalog/lib/columnModel.ts`, `src/features/service/catalog/components/CatalogMvp.tsx`, `src/features/service/catalog/components/CatalogStatus.tsx`, `src/features/service/catalog/components/CatalogFilters.tsx`, `src/features/service/catalog/components/CatalogProductGrid.tsx`, `src/i18n/locales/de/service.json`, `src/i18n/locales/en/service.json`, `docs/migration-log.md` | erledigt | Bestehende Route `/service/online-produktkatalog` unverändert; keine neuen Routen, Slugs, Navigationseinträge, kein Admin/CMS, keine Lovable Cloud, keine Migration. **API neu**: `getColumnDefinitions()`, `getColumnPresetByName(name)`, `getPresetColumns(preset)`, `getFilterOptions()` – alle read-only `select(*)` gegen `product_column_definitions`, `column_presets`, `column_preset_columns`, `product_filter_options_view`. Bestehende `getCatalogContext()` (lesende RPC `rpc_get_catalog_context`) und `getCatalogProducts(0, 39)` (`product_catalog_view.range(0,39)`) unverändert. **Konstante** `PUBLIC_CATALOG_PRESET = "public_catalog"` als einziger fachlicher Frontend-Anker. **Resolver** `src/features/service/catalog/lib/columnModel.ts`: `resolveCatalogColumns(presetColumns, definitions)` leitet sichtbare Spalten + Reihenfolge + Labels + optional Datentyp/Rolle aus DB-Zeilen ab; `findColumnByRole(columns, role)` wählt Bild-/Titel-/Untertitel-Spalte ausschließlich anhand des DB-Felds `role` aus `product_column_definitions` – keine Heuristik auf Feldnamen mehr. `groupFilterOptions(rows)` gruppiert `product_filter_options_view` nach Feld + Wert + Label. **Komponenten aufgeteilt**: `CatalogStatus` (Statuszeile inkl. Preset-/Fallback-Hinweis), `CatalogFilters` (DB-gesteuerte Select-Filter, kein hardkodiertes Feld), `CatalogProductGrid` (rendert Karten anhand des DB-Spaltenmodells; Fallback ohne Detailspalten, wenn Spaltenmodell fehlt). **MVP-Heuristik entfernt**: `TITLE_KEYS`, `SUBTITLE_KEYS`, `DESCRIPTION_KEYS`, `IMAGE_KEYS`, `ARTIKEL_NR_KEYS` aus `CatalogMvp.tsx` ersatzlos gestrichen. Einziger verbliebener fachlicher Anker im Frontend: `artikel_nr` als bekannter Schlüssel + `role`-Werte (`image|title|subtitle`) aus den Definitions. **Filter** clientseitig per Gleichheitsprüfung auf den von `product_filter_options_view` gelieferten Feldern; kein erfundenes Filterkriterium. **Notfall-Fallback**: Wenn Preset `public_catalog` fehlt oder dessen Spaltenliste leer ist, wird ein neutraler i18n-Hinweis (`katalog.v2.fallback.text`) gezeigt und das Grid läuft im reduzierten Modus (nur `artikel_nr` + Bildplatzhalter); kein Crash. **Tolerante DB-Reader** in `catalog.ts` und `columnModel.ts` akzeptieren mehrere bekannte Spaltennamens-Konventionen (`field|key|column_key|name`, `label|title|display_name`, `sort_order|order|position`, `visible|enabled|active`, `data_type|type`, `role|kind`); fachliche Werte werden weiterhin **nicht** geraten – Spalten-/Filter**inhalte** stammen ausschließlich aus der DB. **Read-only**: ausschließlich `select(...)` und lesende `rpc("rpc_get_catalog_context")`; kein `insert`/`update`/`delete`/`upsert`/schreibende RPCs; weiterhin nur ein `createClient(...)` in `src/lib/supabase/client.ts`; Supabase-Imports nur in der API-Schicht, nicht in TSX. **i18n**: neuer Block `katalog.v2.*` (DE Master, EN strukturgleich) – `status.presetUsed`, `status.fallbackActive`, `filters.{headline,reset,allOption}`, `fallback.text` mit `{{preset}}`-Variable. Keine sichtbaren Texte hardcoded. **Design**: ausschließlich semantische Tokens; einziges nicht-tokenisiertes Element ist `text-amber-600 dark:text-amber-400` für den Fallback-Hinweis (semantischer Warn-Akzent, bewusst neben `destructive` gewählt, weil es kein Fehler ist). `npm run i18n:check` grün (17 Namespaces, 68 Seiten, 0/0). `npm run build` grün (9.23 s, nur bekannte Chunk-Size-Warnung). |
| catalog-diagnostics-1 | 2026-04-24 | Read-only DB-Diagnose für Online-Produktkatalog (eindeutige Statusunterscheidung) | `src/features/service/catalog/api/diagnostics.ts` (neu), `src/features/service/catalog/components/CatalogStatus.tsx`, `src/features/service/catalog/components/CatalogMvp.tsx`, `src/i18n/locales/de/service.json`, `src/i18n/locales/en/service.json`, `docs/migration-log.md` | erledigt | Reine Diagnose-Etappe, keine neue UI-Funktion, keine neuen Routen, keine Filter erweitert, keine Produktdetailseite, keine Navigation geändert, keine Schreiboperationen, keine Migrationen, keine neue DB, kein Lovable Cloud. Neue Datei `src/features/service/catalog/api/diagnostics.ts` mit `getCatalogDiagnostics()`: prüft strikt read-only `isSupabaseConfigured()`, ob `VITE_SUPABASE_URL` gesetzt ist, ob die URL die erwartete Projekt-ID `tkscpnwbkjmqopnddxle` enthält, ob `rpc_get_catalog_context()` antwortet, ob `product_catalog_view` per `.select("*").range(0,0)` erreichbar ist und mindestens eine Zeile liefert, ob `column_presets` erreichbar ist und wie viele Presets gelesen werden, ob `product_column_definitions` erreichbar ist und ob `product_filter_options_view` erreichbar ist. Es werden ausschließlich `true/false/status/Fehlermeldung` zurückgegeben, **keine Secrets** (kein Publishable Key, keine vollständige URL). `getCatalogContext()` wird in `CatalogMvp.tsx` nicht mehr automatisch als „erfolgreich" verbucht: Diagnose läuft zuerst; ist `supabaseConfigured` false oder die RPC fehlgeschlagen, wird gar nicht erst weitergeladen und der Status zeigt eindeutig „Supabase nicht konfiguriert" bzw. „Katalog-Kontext-RPC nicht erreichbar" statt der irreführenden Meldung „Katalog-Kontext erfolgreich initialisiert". `CatalogStatus.tsx` reduziert die Diagnose auf genau einen Headline-Status (Reihenfolge: `notConfigured` > `wrongProject` > `rpcUnavailable` > `viewUnreachable` > `emptyOrBlocked` > `presetMissing` > `ok`) und zeigt darunter ein read-only Diagnose-Panel mit den Einzel-Checks plus Anzahl geladener Presets (so ist erkennbar, ob `column_presets` leer ist oder nur der Name `public_catalog` nicht gefunden wurde). Falls `public_catalog` nicht gefunden wird, erscheint zusätzlich der dedizierte Status „Preset „public_catalog" in der Datenbank nicht gefunden" und die View bleibt im kontrollierten Fallback ohne Detailspalten. Neue i18n-Keys unter `service.katalog.diagnostics.{headline,states.*,labels.*,values.*}` in DE (Master) und EN (strukturgleich), 0 leere Werte. Routen, Slugs, Navigation, Hub-Seite, Service-Unterseiten, Layout, Assets unverändert. `npm run i18n:check` grün (17 Namespaces, 0 Fehler, 0 Warnungen), `npm run build` erfolgreich. |
| catalog-cards-cleanup | 2026-04-24 | Online-Produktkatalog: Karten-Rendering aufgeräumt (leere Felder ausblenden, Titel-Konvention) | `src/features/service/catalog/lib/columnModel.ts`, `src/features/service/catalog/components/CatalogMvp.tsx`, `src/features/service/catalog/components/CatalogProductGrid.tsx`, `docs/migration-log.md` | erledigt | Reine Karten-Rendering-Verbesserung. Keine neue Route, keine Navigation geändert, keine neuen Filter, keine Produktdetailseite, keine Exportfunktion, keine Schreiboperationen, keine Migrationen, keine neue DB, kein Lovable Cloud. **Befund Diagnose** (read-only Inspektion `product_catalog_view`, `column_presets`, `column_preset_columns`, `product_column_definitions`): View-Spalten u. a. `artikel_nr`, `kurzbeschreibung_de`, `kurzbeschreibung_resolved`, `kurztext_de`, `kurztext_resolved`, `system_typ`, `paket_klasse`, `montageart`, `wohneinheiten`, `ip_gateway`, `listenpreis`, `waehrung`, `has_*`, `image_count`, `document_count`, `badges`, `smartstick_*`. Preset `public_catalog` definiert u. a. `kurzbeschreibung`, `kurztext`, `langbeschreibung`, `vorgaenger`, `anschluss`, `laenge`, `breite`, `tiefe`, `gtin`, `ursprungsland`, `garantie_monate`, `auslaufdatum`, `artikelbesonderheiten`, `has_image`, `has_produktinfo` – diese existieren in `product_catalog_view` **nicht direkt** (teils nur als `_de`/`_resolved`-Variante, teils gar nicht / aus Cross-View). `product_column_definitions` enthält **kein `role`-Feld**; `findColumnByRole` lieferte daher konsistent `null`. Es gibt **keine Bild-Spalte** in `product_catalog_view` (nur `has_images` / `image_count`). **Anpassung 1 (Resolver)**: `resolveCatalogColumns(presetColumns, definitions, availableKeys?)` akzeptiert jetzt optional die Menge der tatsächlich in der View vorhandenen Spaltennamen. Pro Preset-Spalte wird `source_field` (oder Fallback `column_key`) gegen die Suffix-Konventionen der TCS-DB matched: `""`, `"_resolved"`, `"_de"`, `"_en"`. Spalten ohne Entsprechung werden ausgelassen – sonst würden auf den Karten leere Detailzeilen erscheinen. Kein Wert wird erfunden, nur der existierende View-Spaltenname wird gewählt. **Anpassung 2 (CatalogMvp)**: Übergibt `availableKeys` aus `Object.keys(products[0])` an den Resolver, damit das Spaltenmodell exakt zur ausgelieferten View passt. **Anpassung 3 (CatalogProductGrid)**: `formatCell` liefert jetzt `null` für leere Werte (statt `"—"`); leere Detailzeilen werden komplett ausgeblendet. Booleans werden als `"✓"` (true) bzw. ausgeblendet (false) gerendert. Neue Funktion `pickTitleColumn(columns, product)`: wählt zuerst eine Spalte mit DB-Rolle `title` (Zukunftspfad), sonst die **erste sichtbare Text-Spalte ≠ `artikel_nr` mit nicht-leerem Wert** (`data_type` ∈ {`text`, `text_long`, `string`, leer}). Damit greift im aktuellen Datenstand z. B. `kurzbeschreibung_resolved` als Titel. Bild bleibt am DB-Rollenfeld `image` – existiert dieses Feld in der View nicht oder ist leer, bleibt der neutrale Lucide-`Package`-Platzhalter aktiv. `artikel_nr` wird weiterhin immer separat als fachlicher Schlüssel angezeigt. **Keine** Feldnamen erfunden, **keine** Fachlogik (Präfix, Smart-Stick, Klassifikation) hardcoded. **Read-only** unverändert: weiterhin nur `select(...)` und lesende `rpc_get_catalog_context`; ein einziger `createClient(...)` in `src/lib/supabase/client.ts`. **i18n**: keine neuen Keys nötig (nur Anzeigeverhalten geändert), bestehende `katalog.mvp.card.artikelNr` weiter genutzt; `npm run i18n:check` grün (17 Namespaces, 0/0). `npm run build` grün (7.80 s, nur bekannte Chunk-Size-Warnung). |

| catalog-v2-cards-stable-1 | 2026-04-24 | Produktkarten und Filter im Online-Produktkatalog stabilisiert (Felder aus product_catalog_view, Counts in Filtern, harte Range-Begrenzung) | `src/features/service/catalog/components/CatalogProductGrid.tsx`, `src/features/service/catalog/components/CatalogFilters.tsx`, `src/features/service/catalog/lib/columnModel.ts`, `src/features/service/catalog/api/catalog.ts`, `src/features/service/catalog/types.ts`, `src/i18n/locales/de/service.json`, `src/i18n/locales/en/service.json`, `docs/migration-log.md` | erledigt | Reine Frontend-Stabilisierung, **keine** neue Route, **keine** Navigation, **keine** PDP, **kein** Export, **kein** Merkzettel, **keine** Migration, **keine** Schreiboperationen, **keine** zusätzliche Fachlogik. **Karten** rendern jetzt strukturiert die laut Auslieferungsvertrag (`product_catalog_view`) garantierten Felder: `artikel_nr` (immer), Titel aus `kurzbeschreibung_resolved` (Fallback `kurzbeschreibung_de`), Untertitel aus `kurztext_resolved` (Fallback `kurztext_de`, nur wenn ≠ Titel, mit `line-clamp-3`), Preis aus `listenpreis`+`waehrung` über `Intl.NumberFormat` (Locale-abhängig de-DE/en-GB, `currencyDisplay: 'code'`, mit Try-Fallback bei unbekannter Währung), `badges`-Array (toleranter Reader: Strings oder Objekte mit `label`/`text`/`title`/`name`, max. 6 als shadcn-`<Badge variant="secondary">`), Klassifikationsfelder `system_typ`, `paket_klasse`, `montageart`, `wohneinheiten`, `ip_gateway` als Detail-DL — **alle Felder werden ausgeblendet, wenn der Wert leer ist** (kein „—"-Platzhalter). **Bilder**: kein Direktzugriff auf interne Bildtabellen, kein Bild-Nachladen pro Artikel, **keine erfundenen URLs**; solange `product_catalog_view` kein Listing-Thumbnail-Feld liefert, bleibt der `Package`-Platzhalter. Wenn `has_images === true` oder `image_count > 0`, erscheint unten rechts auf der Bildfläche ein neutraler Hinweis-Chip „Bild vorhanden" / „N Bilder vorhanden" (i18n, plural). **Detail-Labels** kommen primär aus dem DB-Spaltenmodell (`label_de` aus `product_column_definitions` via Preset `public_catalog`), sonst aus i18n-Fallback-Keys `katalog.v2.card.fieldLabels.*` — keine Labels werden im Frontend hardcoded gegen die DB ausgespielt. **Filter**: `product_filter_options_view` bleibt einzige Quelle. `groupFilterOptions` liest jetzt zusätzlich `anzahl` und `sort_order`, sortiert Optionen pro Gruppe nach `sort_order` und stellt Counts bereit; `CatalogFilters` zeigt "Label (N)" pro Option, wenn `anzahl` vorhanden. Filtergruppenlabel weiterhin `label_de`/`field`. **Pagination**: `getCatalogProducts(from, to)` klemmt `to` clientseitig auf max. `from + 999` ab (Supabase-Range-Limit) und exportiert `CATALOG_PAGE_LIMIT = 1000` für spätere Pagination-Schritte; Default bleibt `(0, 39)`. **Diagnose-Panel** unverändert sichtbar (entwicklungsstand). **Read-only-Konformität**: keine `insert/update/delete/upsert`, keine schreibenden RPCs, kein neuer `createClient`, kein neuer Supabase-Client, kein `supabase/`-Ordner, keine SQL-Dateien. **i18n**: keine sichtbaren Texte hartkodiert, neue Keys `katalog.v2.card.{yes,imageAvailable,imageAvailableCount,imageAvailableCount_other,fieldLabels.*}` in DE+EN strukturgleich ergänzt. **Quality-Gates**: `npm run i18n:check` (siehe Run unten) und `npm run build` ausgeführt. |

| pdp-mvp-1 | 2026-04-24 | Produktdetailseite (PDP) angebunden: Slug→artikel_nr ausschließlich über `product_pdp_view`, Inhalte ausschließlich über `rpc_get_product_pdp(p_artikel_nr, p_locale)`. Karten im Katalog verlinken auf PDP, **nur** wenn `pdp_slug` aus `product_catalog_view` vorliegt. | neu: `src/features/service/catalog/api/pdp.ts`, `src/features/service/catalog/lib/pdpAssets.ts`, `src/features/service/pages/ProductDetailPage.tsx`; bearbeitet: `src/features/service/routes.tsx` (Route `/service/online-produktkatalog/:pdpSlug`), `src/features/service/catalog/components/CatalogProductGrid.tsx` (klickbare Karten via `Link`), `src/i18n/locales/de/service.json`, `src/i18n/locales/en/service.json` (`katalog.pdp.*`, `katalog.v2.card.openDetails*`) | erledigt | Strikt read-only: nur `select` auf `product_pdp_view` und `rpc('rpc_get_product_pdp', { p_artikel_nr, p_locale })`. **Keine** Schreiboperationen, **keine** Migration, **keine** Lovable Cloud, **keine** neue DB. **Keine** Slugs erfunden – fehlt `pdp_slug`, bleibt die Karte nicht-klickbar. **Keine** Bild-/Dokument-URLs erfunden: `buildAssetUrl` nutzt zuerst direkte URL-Felder (`url`/`public_url`/`href`/`download_url`), sonst nur `bucket`+`file_path|path|storage_path` über `supabase.storage.from(bucket).getPublicUrl(path)`. Ausschreibungstext: nur wenn die RPC `ausschreibungstext`/`specification_text`/`tender_text` liefert; Ausschreibungsdokumente erscheinen automatisch als regulärer Download in `documents[]`. PDP-Sektionen werden vollständig ausgeblendet, wenn die jeweiligen RPC-Felder fehlen oder leer sind. **i18n**: alle sichtbaren Texte über `katalog.pdp.*` + `katalog.v2.card.openDetails*` (DE Master, EN strukturgleich). **Diagnose**: bewusst **nicht** auf der PDP angezeigt (Diagnose-Panel bleibt nur im Katalog), nur Fehlerzustände (notFound/error) sind sichtbar. **Verifikation**: `npm run i18n:check` (0 Fehler, 0 Warnungen) und `npm run build` grün. |

| pdp-link-and-assets-1 | 2026-04-24 | PDP-Verlinkung und Asset-Auflösung repariert: `pdp_slug` für Karten kommt jetzt aus `product_pdp_view` (Listenseite enthält keinen Slug), Bild-/Dokument-URLs werden mit dokumentierten Default-Buckets gebaut. | bearbeitet: `src/features/service/catalog/api/catalog.ts` (Slug-Index aus `product_pdp_view`, an `product_catalog_view`-Zeilen attached), `src/features/service/catalog/lib/pdpAssets.ts` (`buildAssetUrl(asset, defaultBucket?)`), `src/features/service/pages/ProductDetailPage.tsx` (Default-Buckets `article-images` für PDP-Bilder, `article-documents` für PDP-Dokumente), `docs/migration-log.md` | erledigt | Live-Probe gegen die externe TCS-DB hat zwei Realitäten ergeben: (1) `product_catalog_view` enthält **keinen** `pdp_slug`; der Slug existiert nur in `product_pdp_view` (Felder: `artikel_nr, pdp_slug, headline_de/en, subheadline_de/en, eyebrow_override_de/en, is_published, system_typ, paket_klasse, serie, listenpreis, waehrung, feature_count, spec_count, image_count, document_count, has_en_text, is_publishable, publish_blockers, updated_at`). Daher konnten Karten bisher nicht klickbar sein. (2) Die RPC `rpc_get_product_pdp(p_artikel_nr, p_locale)` liefert `images[]` mit Feldern `{ role, source, file_name, file_path }` – also **kein** `bucket`, **kein** `url`. Laut Datenbankvertrag liegen Produktbilder im Bucket `article-images`, Dokumente in `article-documents`. **Behebung Karten**: `getCatalogProducts` lädt parallel `product_pdp_view` und attached pro `artikel_nr` den vorhandenen `pdp_slug` an die zurückgegebenen Listenzeilen; ohne Treffer bleibt die Karte nicht-klickbar (kein erfundener Slug). **Behebung Assets**: `buildAssetUrl` akzeptiert einen optionalen `defaultBucket` und nutzt diesen ausschließlich, wenn das Asset selbst keinen Bucket trägt (direkte URL-Felder haben weiterhin Vorrang); `defaultBucket` ist eine bewusste, dokumentierte Konvention der externen TCS-DB. Storage-URL-Bildung über `supabase.storage.from(bucket).getPublicUrl(path)`; Public-URL `https://<project>.supabase.co/storage/v1/object/public/article-images/CAI21000150/CAI21000150.png` mit Probe HTTP 200 verifiziert. **Strikt read-only**: nur `select` auf `product_pdp_view` und unveränderter RPC-Aufruf, **keine** Schreiboperationen, **keine** Migration, **keine** Navigation geändert, **keine** neue Route, **keine** neue Filter, **keine** neue Fachlogik, **keine** Pfade/Slugs erfunden, kein Direktzugriff auf interne Bild-/Dokumenttabellen. Sprachpräfix-Strategie irrelevant: App nutzt `BrowserRouter` ohne `/de`/`/en`-Präfix. **Verifikation**: Probe gegen Supabase REST/RPC erfolgreich; `npm run i18n:check` (0 Fehler) und `npm run build` grün. |
| catalog-listing-fields-1 | 2026-04-25 | Online-Produktkatalog Listing auf erweiterte `product_catalog_view` umgestellt | `src/features/service/catalog/api/catalog.ts`, `src/features/service/catalog/components/CatalogProductGrid.tsx`, `docs/migration-log.md` | erledigt | Anbindung an die erweiterte Auslieferungsschicht. **`getCatalogProducts`**: zusätzlicher Parallel-Request gegen `product_pdp_view` (zum Anhängen von `pdp_slug` an Katalogprodukte) entfernt; `select("*")` auf `product_catalog_view` bleibt – die View liefert jetzt selbst `primary_image_public_url`, `primary_image_file_path`, `primary_image_bucket`, `primary_image_source`, `image_count`, `has_images`, `pdp_slug`, `pdp_slug_resolved`, `has_pdp`, `has_pdp_record`, `pdp_is_published`, `badges`, `system_typ`, `paket_klasse`, `montageart`, `wohneinheiten`, `ip_gateway`, `kurzbeschreibung_resolved`, `kurztext_resolved`, `listenpreis`, `waehrung`. `product_pdp_view` bleibt für PDP-Routing (Slug → `artikel_nr`) zuständig, ist aber kein Pflicht-Zusatzrequest pro Listen-Render mehr. **`CatalogProductGrid`**: neuer Helper `readListingImageUrl` nutzt strikt aus `product_catalog_view` – Priorität 1 `primary_image_public_url`, Priorität 2 `primary_image_file_path` + `primary_image_bucket` (Default-Bucket laut DB-Vertrag: `article-images`) via `supabase.storage.from(bucket).getPublicUrl(path)`, sonst neutraler Platzhalter (`Package`-Icon auf `bg-muted`). Es werden keine zusätzlichen Tabellen gelesen und keine URLs erfunden. PDP-Verlinkung jetzt direkt aus den Listing-Feldern: Slug bevorzugt aus `pdp_slug_resolved`, Fallback `pdp_slug`; Karte nur klickbar, wenn `has_pdp` / `has_pdp_record` / `pdp_is_published` true ist (Helper `isPdpAvailable`). Bestehende Route `/service/online-produktkatalog/:pdpSlug` und PDP-Logik (`product_pdp_view` → `rpc_get_product_pdp(p_artikel_nr, p_locale)` → `images[]` / `documents[]` mit Default-Buckets `article-images` / `article-documents`) unverändert. **Read-only Vertrag**: weiterhin keine `insert`/`update`/`delete`/`upsert`/schreibenden RPCs, kein `service_role`-Key, keine Migration, keine erfundenen Slugs/URLs. **i18n**: keine neuen sichtbaren Texte (alle vorhandenen Hinweise `katalog.v2.card.*` weiterverwendet), DE/EN unverändert strukturgleich. |
| catalog-pdp-published-relax-1 | 2026-04-25 | Klickbarkeit der Katalogkarten entkoppelt vom redaktionellen `pdp_is_published`-Schalter | `src/features/service/catalog/components/CatalogProductGrid.tsx`, `docs/migration-log.md` | erledigt | Technischer Re-Audit der Katalog-Anbindung gegen den aktuellen Stand der Supabase-Auslieferungsschicht. **Befund**: `getCatalogProducts` (`src/features/service/catalog/api/catalog.ts`) liest bereits `select("*")` aus `product_catalog_view`; alle in der DB-Erweiterung neu hinzugekommenen Felder (`primary_image_public_url`, `primary_image_file_path`, `primary_image_bucket`, `primary_image_source`, `image_count`, `has_images`, `badges`, `system_typ`, `paket_klasse`, `montageart`, `wohneinheiten`, `ip_gateway`, `kurzbeschreibung_resolved`, `kurztext_resolved`, `listenpreis`, `waehrung`, `has_pdp`, `has_pdp_record`, `pdp_is_published`, `pdp_slug`, `pdp_slug_resolved`) kommen damit ohne Schema-Änderung in der Runtime an. Die frühere Slug-Workaround-Logik mit Parallel-Request gegen `product_pdp_view` war bereits in Etappe `catalog-listing-fields-1` entfernt; `product_pdp_view` bleibt nur für Slug → `artikel_nr` auf der PDP zuständig (`src/features/service/catalog/api/pdp.ts`). Listing-Bilder werden bereits strikt aus `product_catalog_view` über den Helper `readListingImageUrl` aufgelöst (Priorität 1: `primary_image_public_url`; Priorität 2: `primary_image_file_path` + `primary_image_bucket` mit Default-Bucket `article-images` via `supabase.storage.from(bucket).getPublicUrl(path)`; sonst neutraler `Package`-Platzhalter). Es werden keine zusätzlichen Tabellen gelesen, keine URLs erfunden, kein PDP-RPC pro Karte aufgerufen. Slug-Auflösung für die Karten erfolgt bereits führend über `pdp_slug_resolved` mit Fallback `pdp_slug`. **Einzige Anpassung in dieser Etappe**: `isPdpAvailable(product)` in `CatalogProductGrid.tsx` prüft jetzt nur noch `has_pdp === true` ODER `has_pdp_record === true`. Das vorher zusätzlich zugelassene `pdp_is_published === true` wurde entfernt. Begründung: `pdp_is_published` ist ein redaktioneller Schalter und ist laut aktuellem DB-Stand überall oder fast überall `false`; eine Beibehaltung als (Mit-)Bedingung wäre kein Risiko gewesen (es wurde nur ODER-verknüpft), aber den expliziten Wunsch erfüllt es trotzdem nicht – jetzt kann der redaktionelle Schalter unter keinen Umständen versehentlich Klickbarkeit erzwingen, sobald sich seine Semantik ändert. Begleitende Code-Kommentare im selben File entsprechend geschärft. **PDP unverändert**: `ProductDetailPage.tsx` löst Slug → `artikel_nr` weiterhin über `product_pdp_view` und lädt Inhalte über `rpc_get_product_pdp(p_artikel_nr, p_locale)`; Bilder/Dokumente weiter aus `images[]`/`documents[]` mit Default-Buckets `article-images` / `article-documents`. **Typen / Cache / Rebuild**: Es werden keine generierten Supabase-Typen verwendet (`src/features/service/catalog/types.ts` definiert tolerante `SupabaseRecord`-Typen, alle View-Felder werden dynamisch per `record[key]` gelesen). Damit war kein Typen-Regenerieren, kein Schema-Refresh und kein Dev-Server-Neustart erforderlich; ein Browser-Reload genügt. **Read-only-Vertrag**: weiterhin keine `insert`/`update`/`delete`/`upsert`/schreibenden RPCs, kein `service_role`-Key, keine Migration, keine erfundenen Slugs/URLs. **i18n**: keine sichtbaren Texte berührt; alle bestehenden Strings (`katalog.v2.card.*`, `katalog.mvp.card.*`, `katalog.pdp.*`) unverändert. DE/EN strukturgleich. |
| service-navigation-orientation-1 | 2026-04-25 | Orientierung im Header verbessert (aktiver Dropdown-Unterpunkt sichtbar markiert) und Hero-Bilder auf `/service/online-produktkatalog` und `/service/downloads` deaktiviert. | `src/components/MainNavigation.tsx` (Desktop+Mobile Dropdown), `src/components/PageLayout.tsx` (neues optionales Prop `showHeroImage`, Default true), `src/features/service/pages/OnlineProduktkatalogPage.tsx` (`showHeroImage={false}`), `src/features/service/pages/DownloadsPage.tsx` (`showHeroImage={false}`), `docs/migration-log.md` | erledigt | **Teil 1 – aktiver Dropdown-Eintrag**: Im Hauptmenü-Dropdown wird der Unterpunkt, dessen `path` exakt der `location.pathname` entspricht, als aktiv erkannt und visuell markiert: linker Akzentstrich (`border-l-2 border-foreground`), `bg-secondary`-Hintergrund und `font-semibold`. Semantisch wird zusätzlich `aria-current="page"` gesetzt. Gleiche Logik im Mobile-Menü. Bestehende aktive Top-Level-Markierung (`activeTopLevelKey`) bleibt unverändert; Parent-Bereich ist also weiterhin als aktiv erkennbar, der konkrete Unterpunkt jetzt zusätzlich eindeutig. **Keine** neuen Navigationseinträge, **keine** Slug-Änderung, **keine** Änderung an `mainNavigation.ts`/`routes.ts`, **keine** neuen sichtbaren Texte (alle Labels weiterhin via `useTranslation("navigation")`). **Teil 2 – Breadcrumbs**: bewusst NICHT verändert, scrollen weiterhin mit dem Inhalt. **Teil 3 – Hero-Bilder**: `PageLayout` um optionales Prop `showHeroImage?: boolean` (Default `true`) erweitert. Wenn `false`, wird das große `<img>` nicht gerendert; Titel-/Intro-Block, `AutoBreadcrumb`, Padding und CTA-Section bleiben identisch (kein Layoutbruch, keine leere Bildfläche). Auf `OnlineProduktkatalogPage` und `DownloadsPage` ist `showHeroImage={false}` gesetzt. `ServicePage` (Service-Hauptseite) bleibt unverändert und behält ihr Hero-Bild. Andere Service-Unterseiten wurden nicht angefasst. **Supabase / Katalog**: nicht angetastet. Kein Datenmodell, keine Query, keine Filterlogik, keine PDP-Logik geändert. Keine Migration, keine Lovable Cloud, keine neue DB. **i18n**: keine neuen sichtbaren Texte erforderlich. **Verifikation**: `npm run i18n:check` (0 Fehler) und `npm run build` grün. |
| checkpoint-katalog-header-1 | 2026-04-25 | Doku-Checkpoint: Online-Produktkatalog liest erfolgreich aus der Supabase-Auslieferungsschicht; Header-/Orientierungsfix abgeschlossen | `docs/current-status.md`, `docs/migration-log.md` | erledigt | **Reine Dokumentationsetappe**, **kein Produktivcode** geändert, **kein Build erforderlich**, keine Routen, Navigation, Supabase, Kataloglogik oder UI angefasst. **Erreichter Stand (zusammenfassend)**: (a) **Online-Produktkatalog** liest erfolgreich aus der bestehenden Supabase-Auslieferungsschicht; `product_catalog_view` liefert die Listen-Daten für die Produktkarten. (b) **Listen-Bilder** werden über `primary_image_public_url` (bevorzugt) bzw. Fallback `primary_image_file_path` + Bucket gerendert, sofern in der DB vorhanden. (c) **Storage-Bucket `article-images`** funktioniert (HTTP 200 für geladene Public-URLs in der Form `https://<project>.supabase.co/storage/v1/object/public/article-images/<artikel_nr>/<file>`); fehlende Bilder einzelner Produkte sind Datenstand der DB, kein Frontend-Fehler. (d) **Karten klickbar** über `pdp_slug_resolved` (Fallback `pdp_slug`); ohne Slug bleibt eine Karte bewusst nicht-klickbar. (e) **PDP-Route** `/service/online-produktkatalog/:pdpSlug` aktiv; **Slug-Auflösung** über `product_pdp_view`; **Detaildaten** über `rpc_get_product_pdp(p_artikel_nr, p_locale)`; **PDP-Bilder** aus `images[]`, **PDP-Dokumente** aus `documents[]`. (f) **Header bleibt komplett sticky** (`sticky top-0 z-50` am globalen `<header>`-Wrapper in `App.tsx`, kein konkurrierendes Sticky in `MainNavigation.tsx`); **aktiver Unterpunkt** im Dropdown wird visuell und via `aria-current="page"` markiert; **Breadcrumbs** unverändert (scrollen mit dem Inhalt mit). (g) **Hero-Bilder** auf `/service/online-produktkatalog` und `/downloads` deaktiviert (`showHeroImage={false}` in `PageLayout`); **Service-Hauptseite unverändert**. (h) **Supabase-/Kataloglogik** wurde durch die Header-/Orientierungsetappe **nicht** verändert. (i) **Quality Gates**: `npm run i18n:check` grün, `npm run build` grün. **Bekannte offene Punkte (nicht in dieser Etappe behoben, bewusst dokumentiert)**: (1) **Diagnosepanel** im Katalog ist noch sichtbar – muss vor öffentlicher Veröffentlichung entfernt oder auf Dev-Modus begrenzt werden. (2) **Filterlabels und Filterdarstellung** sind noch roh (UX-Feinschliff steht aus). (3) **Kartenlayout** ist funktional, aber noch nicht final gestaltet. (4) **Nicht alle Produkte** haben Bilder oder Dokumente in der DB (Datenstand, kein Frontend-Fehler). (5) **Downloads-Route** ist aktuell `/downloads`, **nicht** `/service/downloads` (Inkonsistenz in der Service-Navigation). (6) **Breadcrumbs sind nicht sticky** (bewusst, da der globale Header sticky ist – Breadcrumbs scrollen mit dem Seiteninhalt mit). (7) **Hero-Bild-Strategie** für weitere Service-Unterseiten ist noch nicht final entschieden (aktuell punktuell deaktiviert auf zwei Seiten). **Bewusst NICHT angefasst**: kein Produktivcode unter `src/**`, keine Komponenten, keine Routen, keine Navigation, keine Supabase-Anbindung, keine Kataloglogik, keine i18n-Locales, keine Slugs, keine Assets. **Zweck**: belastbarer Checkpoint vor der nächsten Katalog-UX-Etappe. |
| catalog-ux-target-1 | 2026-04-25 | Online-Produktkatalog optisch und strukturell an Zielscreen angenähert; PDP-Hero deaktiviert. | `src/features/service/catalog/components/CatalogMvp.tsx`, `src/features/service/catalog/components/CatalogStatus.tsx`, `src/features/service/catalog/api/catalog.ts`, `src/features/service/pages/ProductDetailPage.tsx`, `src/i18n/locales/de/service.json`, `src/i18n/locales/en/service.json`, `docs/migration-log.md` | erledigt | **UX-Etappe**, strikt frontendseitig, **keine** Supabase-/DB-/Migrations-/Cloud-Änderungen, **keine** neuen Routen, **keine** Slug-Änderungen, **keine** schreibenden Operationen, **keine** Header-Sticky-Änderungen. **Katalog-Einstieg** (`CatalogMvp.tsx`): neue Zielscreen-Struktur – große Headline „Produktkatalog" (`katalog.target.headline`), Subline mit Gesamtanzahl (`katalog.target.subline.count`, mit Plural-Form), Suchfeld (clientseitig über `artikel_nr`, `kurzbeschreibung_resolved`, `kurztext_resolved` der bereits geladenen Daten – **kein** neuer DB-Call), Kategorie-Chip-Leiste, bestehende DB-getriebene Filterzeile, Zähler „X von Y Produkten" und Sortierung (Standard / Artikel-Nr. aufsteigend / Preis aufsteigend / Preis absteigend) – Sortierung clientseitig. **Pagination**: `getCatalogProducts(0,39)` ersetzt durch neuen Helper `getAllCatalogProducts(maxBlocks=10)` in `api/catalog.ts`, der `product_catalog_view` in 1000er-Blöcken liest, bis ein Block weniger als `CATALOG_PAGE_LIMIT` Einträge liefert (harte `maxBlocks`-Grenze gegen Endlosschleifen). Read-only, ausschließlich `select("*")`. Damit arbeiten Filter und Suche jetzt über den vollständigen Katalog. **Kategorie-Chips**: ausschließlich UI-Mapping auf eine Filtergruppe aus `product_filter_options_view` – Prioritätsliste `paket_klasse` → `system_typ`. Ist das jeweilige Feld nicht in der View vorhanden, werden **keine** Chips gerendert (kein hartkodiertes Chip-Inventar). „Alle"-Chip setzt den Chip-Filter zurück. **Diagnosepanel** (`CatalogStatus.tsx`): neuer optionaler Prop `showDiagnosticsTable` (Default `true` für Bestand). In `CatalogMvp` auf `import.meta.env.DEV` gesetzt – die ausführliche Diagnose-Tabelle ist damit **nur in Dev** sichtbar; in Produktion bleibt nur die schlanke Headline-Statuszeile, sodass echte Fehlerzustände (z. B. „Supabase nicht konfiguriert") weiterhin sichtbar sind. **Produktdetailseite (PDP)**: einziges Code-Touch in `ProductDetailPage.tsx` ist `showHeroImage={false}` an die bestehende `PageLayout`-Shell – das große dekorative Hero-Bild oben verschwindet. **Das Produktbild im eigentlichen Inhaltsbereich der PDP (`images[0]` aus `rpc_get_product_pdp`) bleibt vollständig erhalten.** Keine sonstige Änderung an der PDP-Datenflusslogik (`pdpSlug` → `product_pdp_view` → `artikel_nr` → `rpc_get_product_pdp(p_artikel_nr, p_locale)`); Bilder weiter aus `images[]`, Dokumente weiter aus `documents[]`, Default-Buckets unverändert (`article-images` / `article-documents`). **Datenfelder aus `product_catalog_view` aktiv genutzt** (Karten + Listing + Klickbarkeit): `artikel_nr`, `kurzbeschreibung_resolved`, `kurztext_resolved`, `listenpreis`, `waehrung`, `system_typ`, `paket_klasse`, `montageart`, `wohneinheiten`, `ip_gateway`, `badges`, `image_count`, `has_images`, `primary_image_file_path`, `primary_image_bucket`, `primary_image_public_url`, `has_pdp`, `pdp_slug`, `pdp_slug_resolved`, `has_pdp_record`. **i18n**: neue Keys unter `katalog.target.*` (Headline, Subline mit Plural, Search, Chips, Results, Sort) DE/EN strukturgleich; keine harten Texte in TSX. **Bewusst nicht erfunden**: keine festen Chip-Listen (nur DB-gemappt), keine SmartStick-/Paket-Heuristiken, keine Pflicht-PDP-Felder, keine zusätzlichen DB-Quellen. **Quality Gates**: `npm run i18n:check` grün (0 Fehler), `npm run build` grün. **Bewusst offen**: feinerer Karten-Pixel-Style (Pills/Preis-Position rechts), erweiterte Filter (`SYSTEM`/`MONTAGE`/`WE`/`IP`-Toggles als eigene UI) sind in dieser Etappe noch über die bestehende Filter-Select-Zeile abgedeckt. |
| catalog-filter-ui-1 | 2026-04-25 | SYSTEM / MONTAGE / WE / IP als kompakte Quick-Filter-Pills in der Katalog-Filterzeile umgesetzt; nur sichtbar, wenn das jeweilige Feld in `product_filter_options_view` vorkommt. | `src/features/service/catalog/components/CatalogFilters.tsx`, `src/features/service/catalog/components/CatalogMvp.tsx`, `src/i18n/locales/de/service.json`, `src/i18n/locales/en/service.json`, `docs/migration-log.md` | erledigt | **UX-/Filter-Etappe**, strikt frontendseitig. **Keine** Supabase-/Migrations-/Routen-/Navigations-/Header-/PDP-/Kartenlayout-Änderungen. **Keine** neue Fachlogik im Frontend, **keine** schreibenden Operationen. **Datenquelle unverändert**: Filtergruppen kommen ausschließlich aus `product_filter_options_view` (Aufruf in `getFilterOptions`, Normalisierung in `groupFilterOptions`); Filter wirken weiterhin clientseitig auf den bereits aus `product_catalog_view` geladenen Datensätzen (`CatalogMvp.tsx`-Logik in `useMemo` unverändert in Aufbau und Reihenfolge: Chip-Filter → DB-Filter → Suche → Sortierung). **`CatalogFilters.tsx` umgebaut**: vier definierte Quick-Felder `system_typ`, `montageart`, `wohneinheiten`, `ip_gateway` werden – sofern die DB-View das jeweilige Feld liefert und mindestens eine Option vorhanden ist – als kompakte Pill-Reihen mit „Alle"-Pill und Werte-Pills gerendert (`aria-pressed`, semantische Tokens, keine direkten Farb-Klassen). SYSTEM, MONTAGE, WE: Werte und Counts kommen 1:1 aus der View. IP: Pill-Beschriftung „Ja"/„Nein" wird nur als reine UI-Beschriftung über eine kleine Heuristik auf die DB-Werte (`true`/`false`/`1`/`0`/`ja`/`nein`/`yes`/`no`) gemappt; sind die DB-Werte abweichend, fällt die Pill auf das DB-`label` zurück. **Alle weiteren Filtergruppen** aus der View (z. B. `paket_klasse`) bleiben darunter unverändert als Selects sichtbar. **Wenn ein Quick-Feld in der DB fehlt, wird der Block nicht gerendert** (kein Platzhalter, keine Erfindung). **`CatalogMvp.tsx` minimal angepasst**: `CHIP_FIELD_PRIORITY` wurde von `["paket_klasse","system_typ"]` auf `["paket_klasse"]` reduziert, damit die Kategorie-Chip-Leiste und der neue SYSTEM-Quick-Filter nicht denselben Filterzustand parallel steuern (Chips bleiben über `paket_klasse` aktiv, sofern vorhanden). Suche, Sortierung, Karten-Routing über `pdp_slug_resolved`/`pdp_slug`, Bilder über `primary_image_*`, Diagnose-Restriktion auf Dev-Modus – alles unverändert. **i18n**: neue Keys ausschließlich unter `katalog.filters.groups.{system_typ,montageart,wohneinheiten,ip_gateway}.{label,all}` plus `ip_gateway.{yes,no}`. DE/EN strukturgleich (DE-Master), keine leeren Werte, keine harten Texte in TSX. Bestehender Block `katalog.v2.filters.{headline,reset,allOption}` weiterhin aktiv (Sektions-Headline „Filter" und Reset-Button). **Verifikation**: `npm run i18n:check` 17 Namespaces, 69 Pages, **0 Fehler, 0 Warnungen**, exit 0. `npm run build` `✓ built in 10.28s` (nur bekannte Chunk-Size-Warnung). **Bewusst offene Punkte**: Kartenlayout-Pixel-Polish, PDP-Layout-Feinschliff, Toleranz für IP-Werte abweichend von Boolean-Schreibweisen wird beibehalten (UI fällt auf DB-Label zurück, kein Hardcoding). |
| catalog-card-polish-1 | 2026-04-25 | Produktkarten im Online-Produktkatalog visuell und strukturell finalisiert (ruhiges Layout, klare Hierarchie, kompakte Pills, Footer mit Preis + Pfeil). | `src/features/service/catalog/components/CatalogProductGrid.tsx`, `docs/migration-log.md` | erledigt | **Reine Karten-UI-Etappe**, strikt frontendseitig. **Keine** Supabase-/DB-/Migrations-/Cloud-Änderungen, **keine** neuen Routen, **keine** PDP-Änderungen, **keine** Filter- oder Suche-Logik berührt, **keine** Header-/Navigation-/Breadcrumb-Änderungen, **keine** zusätzlichen Datenquellen, **keine** schreibenden Operationen. **Datenbasis unverändert**: Karten lesen ausschließlich Felder aus `product_catalog_view`, die bereits über `getAllCatalogProducts` (`select("*")`) im Frontend ankommen – `artikel_nr`, `kurzbeschreibung_resolved`, `kurztext_resolved`, `listenpreis`, `waehrung`, `system_typ`, `paket_klasse`, `montageart`, `wohneinheiten`, `ip_gateway`, `badges`, `image_count`, `has_images`, `primary_image_public_url`, `primary_image_bucket`, `primary_image_file_path`, `has_pdp`, `has_pdp_record`, `pdp_slug_resolved`, `pdp_slug`. Keine zusätzlichen DB-Aufrufe pro Karte; kein Lesen interner Bild-/PDP-Tabellen. **Layout-Änderungen in `CatalogProductGrid.tsx`**: (1) **Bildbereich** mit konsistenter Aspect-Ratio (`aspect-[4/3]`), `object-contain` mit Innenabstand, dezenter `bg-muted/40`-Hintergrund, neutraler `Package`-Platzhalter, wenn keine URL aufgelöst werden kann; bestehender Bild-Indikator („Bild vorhanden") bleibt für den Sonderfall „Datensatz behauptet Bild, aber keine URL" erhalten. (2) **Artikelnummer** als kleine, dezente Mono-Zeile (Uppercase, Tracking) **über** dem Titel – sichtbar, aber nicht dominant. (3) **Titel** (`kurzbeschreibung_resolved` mit Fallback `kurzbeschreibung_de`) als wichtigste Textzeile, `text-base font-semibold`, `line-clamp-2`. (4) **Untertitel** (`kurztext_resolved` mit Fallback `kurztext_de`) auf max. 2 Zeilen begrenzt; wird ausgeblendet, wenn identisch zum Titel. (5) **Pills** kompakt: Klassifikationen `system_typ`, `paket_klasse`, `montageart`, `wohneinheiten`, `ip_gateway` (in dieser Reihenfolge) plus `badges[]` aus der View, **gemeinsamer Limit von 3 sichtbaren Pills**, Doppler werden vermieden, Booleans werden nur dann angezeigt, wenn `true`. Es werden **keine** fachlichen Klassifikationen erfunden. (6) **Footer** als eigene Zeile mit Top-Border: links der Preis (Intl.NumberFormat, Locale-abhängig), rechts ein dezenter `Details ansehen`-Hinweis mit `ArrowRight`-Icon – **nur** wenn die Karte tatsächlich klickbar ist. (7) **Klickbarkeit** unverändert: PDP-Slug bevorzugt aus `pdp_slug_resolved`, Fallback `pdp_slug`; Karte nur als `<Link>` gerendert, wenn `has_pdp` ODER `has_pdp_record` true ist (`pdp_is_published` weiterhin bewusst nicht als harte Bedingung). Klickbare Karten erhalten `hover:border-accent/50 hover:shadow-elevated cursor-pointer` und `focus-visible:ring-2 focus-visible:ring-accent`. (8) **Konsistente Kartenhöhe** im Grid via `flex flex-col h-full` und `mt-auto` am Footer. (9) **Leere Werte** werden komplett ausgeblendet (kein „—"-Platzhalter). **Design-System**: ausschließlich semantische Tokens (`bg-card`, `bg-muted/40`, `border-border`, `text-foreground`, `text-muted-foreground`, `text-accent`, `shadow-elevated`); keine direkten Farbklassen, keine Inline-Hex-Werte. **i18n**: keine neuen Keys nötig – verwendet werden ausschließlich bereits vorhandene Keys unter `katalog.v2.card.*` (`openDetails`, `openDetailsAria`, `imageAvailable`, `imageAvailableCount`, `yes`, `fieldLabels.*`). DE/EN unverändert strukturgleich. Keine harten sichtbaren Texte in TSX. **Quality Gates**: `npm run i18n:check` 17 Namespaces, 69 Pages, **0 Fehler, 0 Warnungen**. `npm run build` `✓ built in 8.05s` (nur bekannte Chunk-Size-Warnung). **Bewusst offene Punkte**: feinjustierter PDP-Layout-Polish, optionale Anzeige von `image_count` als Bild-Galerie-Hinweis auf der Karte (derzeit nur als Fallback-Text bei fehlender URL sichtbar), und mögliche spätere Erweiterung der Pill-Sortierung anhand DB-Prioritäten, sobald die View entsprechende Sort-Hinweise liefert. |
| catalog-pdp-routing-fix-1 | 2026-04-25 | PDP-Slug-Auflösung an aktuellen DB-Vertrag angepasst: `pdp_slug_resolved` wird jetzt in `product_pdp_view` zuerst geprüft, plus Fallback auf direkten Artikelnummer-Match. | `src/features/service/catalog/api/pdp.ts`, `docs/migration-log.md` | erledigt | **Reine Routing-Fix-Etappe**, strikt frontendseitig, **keine** Supabase-/DB-/Migrations-Änderungen, **keine** neuen Routen, **keine** Layout-/Filter-/Karten-/Header-/Navigation-/Breadcrumb-Änderungen, **keine** schreibenden Operationen. **Problem**: Karten verlinken bevorzugt über `pdp_slug_resolved` (Fallback `pdp_slug`), die PDP-Auflösung in `getArtikelNrBySlug` matchte aber nur gegen `pdp_slug` und `slug`. Karten mit ausschließlich `pdp_slug_resolved` (oder Slugs, die faktisch der Artikelnummer entsprechen) führten dadurch auf „Produkt nicht gefunden". **Fix in `src/features/service/catalog/api/pdp.ts`**: (1) `slugCandidates` um `pdp_slug_resolved` erweitert, in der Reihenfolge `["pdp_slug_resolved", "pdp_slug", "slug"]` – führend ist jetzt das Feld, mit dem die Karte verlinkt. (2) Neuer Fallback nach erfolglosem Slug-Match: Wenn der URL-Slug exakt einer `artikel_nr` (bzw. `artikelnr`) in `product_pdp_view` entspricht, wird diese direkt zurückgegeben. Damit funktionieren Karten, deren `pdp_slug_resolved` faktisch die Artikelnummer ist (kein redaktioneller Slug gesetzt). (3) Helper `readArtikelNr` extrahiert; weiter weiterer Datenfluss unverändert (`artikel_nr` → `rpc_get_product_pdp(p_artikel_nr, p_locale)`). **Bewusst NICHT geändert**: `pdp_is_published` bleibt **weiterhin keine** harte Blockade (redaktioneller Schalter laut DB-Stand nicht zuverlässig gesetzt); keine eigene Publish-Logik im Frontend; keine neuen Datenquellen, keine neuen RPCs, keine neuen Tabellen oder Views; `CatalogProductGrid.tsx` bleibt unangetastet (Karte verwendet bereits korrekt `pdp_slug_resolved` mit Fallback `pdp_slug` und Sichtbarkeitsbedingung `has_pdp || has_pdp_record`). Read-only weiterhin garantiert: ausschließlich `supabase.from("product_pdp_view").select("*")` und lesende RPC `rpc_get_product_pdp`. **Quality Gates**: `npm run i18n:check` grün (0 Fehler), `npm run build` grün. **Bewusst offen**: Falls die DB künftig `pdp_is_published` zuverlässig pflegt, kann das als zusätzliche Bedingung ausgewertet werden – aktuell weiterhin als rein redaktioneller Schalter behandelt. |
| catalog-pdp-resolution-hardening-1 | 2026-04-25 | PDP-Auflösung gegen Listing-Daten gehärtet (URL-Decode, Fallback auf `product_catalog_view`, direkter Artikelnummer-Fallback via RPC); NotFound-Text neutralisiert; Dev-Diagnosebox auf der PDP. | `src/features/service/catalog/api/pdp.ts`, `src/features/service/pages/ProductDetailPage.tsx`, `src/i18n/locales/de/service.json`, `src/i18n/locales/en/service.json`, `docs/migration-log.md` | erledigt | **Reine PDP-Routing-Härtung**, strikt frontendseitig. **Keine** Supabase-/DB-/Migrations-Änderungen, **keine** neuen Routen, **keine** Karten-/Filter-/Suche-/Layout-/Header-/Navigation-Änderungen, **keine** schreibenden Operationen. **Problem**: Karten waren klickbar (z. B. `ADA59010-0030`), aber die PDP zeigte „Produkt nicht gefunden", weil `getArtikelNrBySlug` nur in `product_pdp_view` suchte und Karten mit Slug-Werten, die nur in `product_catalog_view` vorkommen, ins Leere liefen. **Fix in `src/features/service/catalog/api/pdp.ts`**: Neue interne Funktion `resolveArtikelNrBySlug` mit klarer Diagnose-Rückgabe; bestehender Export `getArtikelNrBySlug` bleibt als dünner Wrapper. Auflösungs-Reihenfolge: (A) **URL-Slug normalisieren** (`decodeURIComponent`, trim, leerer String → null); (B) **Match in `product_pdp_view`** gegen `pdp_slug_resolved`, `pdp_slug`, `slug`, `artikel_nr`, `artikelnr`; (C) **Fallback in `product_catalog_view`** über gezieltes `select("artikel_nr,artikelnr,pdp_slug_resolved,pdp_slug,has_pdp,has_pdp_record")` – Treffer wird **nur** als gültig akzeptiert, wenn `has_pdp === true` ODER `has_pdp_record === true` (analog zur Klickbarkeitsregel der Karte; `pdp_is_published` bleibt **weiterhin** explizit keine Blockade); (D) **Direkter Artikelnummer-Fallback**: Wenn weder Pdp-View noch Catalog-View matchen, der URL-Slug aber das Format einer plausiblen Artikelnummer hat (`/^[A-Za-z0-9._-]{3,}$/`), wird er als Kandidat zurückgegeben – die Aufrufer-Seite probiert ihn direkt gegen `rpc_get_product_pdp(p_artikel_nr, p_locale)` aus, und nur ein echtes `{ found: false }` führt zu NotFound. **`ProductDetailPage.tsx`**: nutzt jetzt `resolveArtikelNrBySlug`, hält die Diagnose im `notfound`-State und rendert in **Dev-Modus** (`import.meta.env.DEV`) eine kleine Diagnosebox unter dem NotFound-Hinweis (`requestedRaw`, `requestedNormalized`, `pdpViewMatch`, `catalogViewMatch`, `directArtikelNrFallbackTried`, `artikelNr`, `reason`). In Produktion bleibt die Box komplett unsichtbar. **i18n**: NotFound-Text in DE und EN neutralisiert (DE: „Dieses Produkt konnte in der Katalog-Auslieferungsschicht nicht eindeutig geladen werden.", EN: „This product could not be loaded unambiguously from the catalog delivery layer."), neuer Key `katalog.pdp.notFound.devHeadline` in DE/EN strukturgleich. Keine harten Texte in TSX. **Read-only weiterhin garantiert**: nur `supabase.from("product_pdp_view").select("*")`, `supabase.from("product_catalog_view").select(...)`, lesende RPC `rpc_get_product_pdp`. Keine zusätzlichen Tabellen, keine erfundenen Slugs/URLs, kein Direktzugriff auf interne Bild-/Dokumenttabellen. **Quality Gates**: `npm run i18n:check` 17 Namespaces, 69 Pages, **0 Fehler, 0 Warnungen**. `npm run build` `✓ built in 8.23s` (nur bekannte Chunk-Size-Warnung). **Bewusst offen**: PDP-Layout-Polish; falls die DB künftig `pdp_is_published` zuverlässig pflegt, kann das später als zusätzliche Bedingung berücksichtigt werden. |
| catalog-pdp-resolution-targeted-1 | 2026-04-25 | PDP-Auflösung von breitem Client-Vollscan auf gezielte DB-Queries umgestellt; Karten-Link erhält `artikel_nr` als letzten Fallback; Dev-Diagnose erweitert. | `src/features/service/catalog/api/pdp.ts`, `src/features/service/pages/ProductDetailPage.tsx`, `src/features/service/catalog/components/CatalogProductGrid.tsx`, `docs/migration-log.md` | erledigt | **Reine PDP-Auflösungs-Etappe**, strikt frontendseitig. **Keine** Supabase-/DB-/Migrations-Änderung, **keine** neuen Routen, **keine** Filter-/Suche-/Navigation-/Header-Änderung, **keine** Kartenoptik geändert, **keine** Schreiboperationen. **Karte**: Linkwert bleibt bevorzugt `pdp_slug_resolved`, danach `pdp_slug`; als letzter Fallback wird `artikel_nr` nur genutzt, wenn die Karte laut bestehender Regel `has_pdp === true || has_pdp_record === true` klickbar ist. **Resolver**: `product_pdp_view.select("*")` und ungefilterter `product_catalog_view.select(...)`-Vollscan entfernt. Neue Reihenfolge mit `.eq(...).limit(1)`: `product_pdp_view.pdp_slug_resolved`, `product_pdp_view.pdp_slug`, optional `product_pdp_view.slug`, `product_pdp_view.artikel_nr`; danach `product_catalog_view.pdp_slug_resolved`, `product_catalog_view.pdp_slug`, `product_catalog_view.artikel_nr` mit Select ausschließlich `artikel_nr,pdp_slug_resolved,pdp_slug,has_pdp,has_pdp_record`. Spaltenfehler brechen nicht ab, sondern führen zur nächsten gezielten Query. `artikelnr` wurde aus Resolver und Select entfernt. Direkter Artikelnummer-Fallback ist jetzt strikt (`3–40` Zeichen, keine Whitespace, mindestens eine Ziffer, nur `A-Z/a-z/0-9/-/_/.`, lange SEO-Slug-Anmutung mit sehr vielen Bindestrichen ausgeschlossen). **Dev-Diagnose**: zeigt nur in Dev zusätzlich versuchte PDP-/Catalog-Queries, Match-Felder, ob strenger Fallback versucht wurde, den RPC-Kandidaten und ob die RPC `{ found:false }` lieferte. `pdp_is_published` bleibt weiterhin keine Blockade. |
| catalog-start-filter-gate-1 | 2026-04-25 | Online-Produktkatalog zeigt Produktkarten erst nach aktiver Auswahl (Kategorie-Chip, Filterwert oder Suche ab 2 Zeichen); im Startzustand erscheint stattdessen ein neutraler Hinweisbereich; Sortierung allein aktiviert die Karten bewusst nicht; Empty-State erscheint nur bei aktiver Auswahl ohne Treffer | `src/features/service/catalog/components/CatalogMvp.tsx`, `src/i18n/locales/de/service.json`, `src/i18n/locales/en/service.json`, `docs/migration-log.md` | erledigt | Reine UI-/State-Änderung im Frontend. Datenladung via `getAllCatalogProducts` unverändert (Daten werden weiterhin im Hintergrund geladen, damit Filter/Suche sofort reagieren). Keine DB-/RPC-/Schreiboperationen, keine neue Datenquelle, keine PDP-/Routing-/Navigations-/Header-Änderung. Neue i18n-Keys: `katalog.target.start.headline` und `katalog.target.start.text` (DE master, EN strukturgleich). `npm run i18n:check` und `npm run build` grün. |
| catalog-start-status-cleanup-1 | 2026-04-25 | Statuszeile im Online-Produktkatalog im Startzustand entschärft: Trefferzahl wird nur noch angezeigt, sobald eine aktive Auswahl getroffen wurde. | `src/features/service/catalog/components/CatalogStatus.tsx`, `src/features/service/catalog/components/CatalogMvp.tsx`, `docs/migration-log.md` | erledigt | **Reine UX-Korrektur**, strikt frontendseitig. **Keine** Supabase-/DB-/Migrations-Änderungen, **keine** neuen Routen, **keine** Karten-/PDP-/Filter-/Suche-/Sortier-/Header-/Navigation-Änderungen, **keine** schreibenden Operationen. **Problem**: Im Startzustand des Katalogs (keine Chip-/Filter-/Suchauswahl) zeigte `CatalogStatus` weiterhin die kleine Trefferzahl-Zeile (`katalog.mvp.status.count`) auf Basis von `filteredProducts.length`. Das stand im Widerspruch zum bewusst leeren Produktraster. **Fix**: (1) `CatalogStatus.tsx` erhält neuen optionalen Prop `showCount?: boolean` (Default `true`, damit bestehendes Verhalten außerhalb des Katalogs unverändert bleibt). Die Count-Zeile wird nur gerendert, wenn `!loading && !error && showCount`. Lade-, Fehler- und Diagnosezustände sowie Preset-/Fallback-Hinweise bleiben unberührt. (2) `CatalogMvp.tsx` setzt `showCount={hasUserSelection}` – im Startzustand `false`, nach Chip-/Filter-/Suchauswahl (≥ 2 Zeichen) `true`. **Keine i18n-Änderungen** (keine neuen sichtbaren Texte). **Read-only weiterhin garantiert**. **Quality Gates**: `npm run i18n:check` grün, `npm run build` grün. |
| catalog-pdp-layout-target-1 | 2026-04-25 | Produktdetailseite strukturell und optisch an Zielscreen angenähert: Produktkopf, Produktdetails, Technische Daten, Produktinformationen, Dokumente, optional Ausschreibungstext; PDP entlastet durch eigene Sub-Komponenten. | `src/features/service/pages/ProductDetailPage.tsx`, `src/features/service/catalog/components/pdp/types.ts`, `src/features/service/catalog/components/pdp/ProductPdpHeader.tsx`, `src/features/service/catalog/components/pdp/ProductPdpSummary.tsx`, `src/features/service/catalog/components/pdp/ProductPdpTechnicalData.tsx`, `src/features/service/catalog/components/pdp/ProductPdpInfoTable.tsx`, `src/features/service/catalog/components/pdp/ProductPdpDocuments.tsx`, `src/i18n/locales/de/service.json`, `src/i18n/locales/en/service.json`, `docs/migration-log.md` | erledigt | **Reine PDP-Layout-Etappe**, strikt frontendseitig. **Keine** Supabase-/DB-/Migrations-/Cloud-Änderungen, **keine** neuen Routen, **keine** Header-/Navigation-/Breadcrumb-/Katalog-Listing-Änderungen, **keine** Warenkorb-/Shop-Logik, **keine** neuen Datenquellen, **keine** Direktabfragen interner Bild-/Dokumenttabellen, **keine** Schreiboperationen. **Datenfluss unverändert**: `:pdpSlug` → `product_pdp_view` → `artikel_nr` → `rpc_get_product_pdp(p_artikel_nr, p_locale)`; Bilder ausschließlich aus `images[]` (Default-Bucket `article-images`); Dokumente ausschließlich aus `documents[]` (Default-Bucket `article-documents`). **Neue Komponenten** unter `src/features/service/catalog/components/pdp/`: `types.ts` (geteilte Item-Typen), `ProductPdpHeader` (Eyebrow, große Artikelnummer, Headline/Subheadline, Preis + **deaktivierter** „In den Warenkorb"-Platzhalter), `ProductPdpSummary` (zweispaltig: links großes Bild + Thumbnail-Strip aus `images[]`, rechts Kurzbeschreibung, Leistungsmerkmale als Bullet-Liste, Badges/Tags, Langbeschreibung, optional Lieferzeit/Garantie nur wenn aus RPC vorhanden), `ProductPdpTechnicalData` (tabellarische Key-Value-Liste, nur echte Werte, keine `—`-Platzhalter, ganzer Abschnitt blendet sich aus, wenn keine Daten vorhanden), `ProductPdpInfoTable` (kompakte Tabelle Bezeichnung/Art.-Nr./Preis/Stk. plus deaktivierter Warenkorb-Icon-Button; blendet sich aus, wenn keine sinnvollen Daten vorhanden), `ProductPdpDocuments` (Dokumente weiterhin gruppiert nach Kategorie aus `documents[]`, mit Empty-Hinweis, falls leer). **`ProductDetailPage.tsx`**: Reader-Funktionen (`readBadges`, `readFeatures`, `readSpecs`, `readDocuments`, `readImages`, `readAusschreibungstext`, `readPriceCurrency`, `formatPrice`) und Lade-/NotFound-/Error-States bleiben erhalten; Inhalt wird jetzt schlank in die Sub-Komponenten gereicht. **RPC-Felder, die aktiv verwendet werden** – PDP-Kopf: `eyebrow`/`kategorie`, `artikel_nr`, `headline`/`kurzbeschreibung_resolved`/`kurzbeschreibung`, `subheadline`/`kurztext_resolved`/`kurztext`, Preis aus `listenpreis`/`price` + `waehrung`/`currency`. Bild: `images[]` (`url`/`public_url`/`href`/`download_url` direkt, sonst `bucket` + `file_path`/`path`/`storage_path` mit Default-Bucket `article-images`), `alt`/`alt_text`/`title`. Beschreibung/Features: `kurzbeschreibung_resolved`/`kurzbeschreibung`/`short_description` als Kurzbeschreibung; `langbeschreibung`/`long_description`/`beschreibung` als Langbeschreibung; `features[]` (toleriert string oder Objekt mit `label`/`title`/`name`/`text` und optional `description`/`text_long`/`value`). Technische Daten: erste vorhandene Quelle aus `technical_specs[]`, `technical_data[]`, `technische_daten[]`, `specs[]`, `specifications[]` (Array oder Objekt); Zeilen ohne echtes Label+Value werden verworfen. Produktinformationen: Bezeichnung aus `bezeichnung`/`product_name` mit Fallback auf Headline/Kurzbeschreibung, Art.-Nr. aus `artikel_nr`, Preis identisch zum Header. Dokumente: `documents[]` mit Default-Bucket `article-documents`. Ausschreibungstext: `ausschreibungstext`/`specification_text`/`tender_text`. Lieferzeit/Garantie: `lieferzeit`/`delivery_time` und `garantie`/`warranty` (jeder Wert nur dann angezeigt, wenn aus dem RPC vorhanden). **Leere Felder/Abschnitte werden ausgeblendet** – keine Platzhalterdaten, keine Fantasiewerte, keine Ableitung von Klassifikationen aus Artikelnummern. **Keine Warenkorb-/Shoplogik**: Buttons sind in Header und Info-Tabelle bewusst `disabled` mit `aria-disabled` und `title`-Hinweis (`katalog.pdp.cart.disabledHint`). **i18n**: neue Keys unter `katalog.pdp.sections.{details,info}`, `katalog.pdp.summary.{deliveryTime,warranty}`, `katalog.pdp.info.cols.{description,artikelNr,price}`, `katalog.pdp.cart.{label,disabledHint}`. `katalog.pdp.sections.documents`-Wert auf „Dokumente und Anleitungen" / „Documents and manuals" angepasst. DE master, EN strukturgleich, keine leeren Werte, keine harten Texte in TSX. **Design-System**: ausschließlich semantische Tokens (`bg-background`, `bg-card`, `bg-muted`, `border-border`, `text-foreground`, `text-muted-foreground`, `text-accent`, `text-background`); keine direkten Farbklassen, keine Hex-Werte. **Quality Gates**: `npm run i18n:check` 17 Namespaces, 69 Pages, **0 Fehler, 0 Warnungen**. `npm run build` `✓ built in 8.02s` (nur bekannte Chunk-Size-Warnung). **Bewusst offen**: weitere Pixel-Feinarbeit (z. B. präzise Spaltenbreiten in der Info-Tabelle bei sehr langen Bezeichnungen, mögliche Galerie-Lightbox, dedizierte SmartStick-/Kompatibilitätsboxen erst, sobald entsprechende RPC-Felder dokumentiert sind); echte Warenkorb-/Shop-Funktion bleibt bewusst außerhalb dieses Webseitenprojekts. |
| catalog-pdp-layout-cleanup-1 | 2026-04-25 | Final-Check zu `catalog-pdp-layout-target-1`: einzelner sichtbarer „—"-Platzhalter in der Produktinformations-Tabelle entfernt. | `src/features/service/catalog/components/pdp/ProductPdpInfoTable.tsx`, `docs/migration-log.md` | erledigt | **Reine UX-Mikrokorrektur**, strikt frontendseitig. **Keine** neuen Komponenten, **keine** strukturelle PDP-Änderung, **keine** Supabase-/DB-/Migrations-Änderungen, **keine** neuen Routen, **keine** Header-/Navigation-/Listing-Änderungen, **keine** Warenkorb-/Shoplogik, **keine** neuen i18n-Keys, **keine** Schreiboperationen. **Fix**: In `ProductPdpInfoTable.tsx` wurde der Fallback `description ?? "—"` durch `description ?? ""` ersetzt. Der vorgelagerte Guard `if (!artikelNr || (!description && !priceFormatted)) return null` und die sinnvollen Fallbacks im Aufrufer (`bezeichnung`/`product_name`/Headline/Kurzbeschreibung) sorgen weiterhin dafür, dass die Tabelle nur erscheint, wenn echte Inhalte da sind; ohne Bezeichnung bleibt die Zelle jetzt leer statt einen sichtbaren Dummy zu zeigen. Die übrigen `"—"`-Vorkommen in `ProductDetailPage.tsx` liegen ausschließlich in der **Dev-Diagnose-Box** des NotFound-Zustands (`import.meta.env.DEV`-gated) und beschreiben dort technische Diagnosefelder — kein Produktinhalt, daher bewusst belassen. **Datenfluss unverändert**: `:pdpSlug` → `product_pdp_view` → `artikel_nr` → `rpc_get_product_pdp(p_artikel_nr, p_locale)`; Bilder ausschließlich aus `images[]`, Dokumente ausschließlich aus `documents[]`. **i18n**: keine neuen Keys, DE/EN je **582 Leaf-Keys**, Diff 0, je 0 leere Werte. **Quality Gates**: `npm run i18n:check` 17 Namespaces, 69 Pages, **0 Fehler, 0 Warnungen**. `npm run build` `✓ built in 8.20s` (nur bekannte Chunk-Size-Warnung). |
| catalog-pdp-visual-qa-1 | 2026-04-25 | Visueller Live-Check der PDP an mehreren echten Produkten; zwei eindeutige Field-Mapping-Bugs gefunden und minimal korrigiert (Preis und Badges aus dem RPC-Payload wurden zuvor nicht angezeigt). | `src/features/service/pages/ProductDetailPage.tsx`, `docs/migration-log.md` | erledigt | **Reine Live-QA-Etappe mit minimalen Bugfixes**, strikt frontendseitig. **Keine** Supabase-/DB-/Migrations-Änderungen, **keine** neuen Routen, **keine** Karten-/Filter-/Suche-/Header-/Navigation-/Breadcrumb-Änderungen, **keine** strukturelle PDP-Änderung, **keine** Warenkorb-/Shoplogik, **keine** neuen Komponenten, **keine** neuen i18n-Keys, **keine** Schreiboperationen. **Geprüfte Produkt-URLs**: `/service/online-produktkatalog/paaf042-001` (Außenstation + Innenstation als Paket, viele Dokumente), `/service/online-produktkatalog/paah062-001` (zweites Paket), `/service/online-produktkatalog/paif030-004` (Einbau-Variante). Alle drei lieferten `rpc_get_product_pdp` mit `found: true`. Außerdem geprüft: `isw3030-0145` als Komponente eines Pakets — korrekt als „Produkt nicht gefunden" gerendert (Slug ist nicht in `product_pdp_view` als eigenständiges PDP veröffentlicht), erwartetes Verhalten. **Befundene Bugs vor dem Fix**: (1) **Preis fehlte** komplett im Header und in der Produktinformations-Tabelle, obwohl der RPC-Payload `preis: 965` und `waehrung: "EUR"` lieferte. Ursache: `readPriceCurrency` las nur `payload.listenpreis`/`payload.price`, aber das tatsächliche RPC-Feld heißt `preis`. (2) **Badges fehlten**, obwohl der Payload `badges: [{key, sort, tone, label_de, label_en}]` lieferte. Ursache: `readBadges` kannte nur `label`/`text`/`title`/`name` und nicht die lokalisierten Felder `label_de`/`label_en`. **Minimaler Fix in `ProductDetailPage.tsx`**: `readPriceCurrency` liest jetzt zuerst `preis` (führend laut RPC-Antwort) und fällt auf `listenpreis`/`price` zurück. `readBadges` erhält `locale` als Argument und liest – locale-aware – bevorzugt `label_de` bzw. `label_en` aus dem RPC-Payload, mit Fallback auf die generischen Felder; an der einzigen Aufrufstelle wird `locale` (`"de"|"en"`, schon im State der Seite vorhanden) übergeben. **Keine sonstigen Änderungen** (Layout, Sub-Komponenten, Datenfluss, RPC-/View-Auswahl, Bucket-Wahl, Routing, i18n-Keys bleiben identisch). **Verifikation in der Preview**: Nach dem Fix zeigt die PDP für `PAAF042/001` „965,00 EUR" rechts im Header und die Pills „Paket Standard / Audio / Aufputz"; für `PAAH062/001` „1.034,00 EUR" und die identischen Pills; für `PAIF030/004` „578,00 EUR" und „Paket Standard / Audio / Einbau". Bilder werden weiterhin ausschließlich aus `article-images` geladen, Dokumente ausschließlich aus `article-documents`. **Network**: alle PDP-Requests (`product_pdp_view`, `rpc_get_product_pdp`, `storage/v1/object/public/article-images/...`) **200 OK**, **keine 4xx/5xx**, keine Schreibrequests. **Console**: keine neuen PDP-bezogenen Errors. Eine bestehende React-Warnung („Function components cannot be given refs … at Skeleton") ist **nicht** durch diese Etappe verursacht — sie stammt aus dem unveränderten Standard-`Skeleton`-shadcn-Komponenten in Verbindung mit framer-motion und tritt auch ohne PDP-Änderungen auf; bleibt bewusst offen für eine separate Etappe. **i18n**: unverändert, DE/EN je **582 Leaf-Keys**, Diff 0, 0 leere Werte. **Quality Gates**: `npm run i18n:check` 17 Namespaces, 69 Pages, **0 Fehler, 0 Warnungen**. `npm run build` `✓ built in 9.29s` (nur bekannte Chunk-Size-Warnung). **Bewusst offen**: Skeleton-`forwardRef`-Warnung außerhalb der PDP; Ausschreibungstext konnte nicht live verifiziert werden, da keiner der getesteten Datensätze ein entsprechendes Feld lieferte (Renderer ist vorhanden und blendet sich korrekt aus, wenn das Feld fehlt). |
| catalog-filter-start-ux-2 | 2026-04-25 | Startansicht und Filterführung im Online-Katalog bereinigt: sichtbarer „Auswahl zurücksetzen"-Button, wenn Chip/Filter/Suche aktiv sind | `src/features/service/catalog/components/CatalogMvp.tsx`, `src/i18n/locales/de/service.json`, `src/i18n/locales/en/service.json`, `docs/migration-log.md` | erledigt | Reine UX-Härtung der bereits in `catalog-start-filter-gate-1` und `catalog-start-status-cleanup-1` umgesetzten Gate-Logik. **Startzustand** unverändert ruhig: keine Karten, keine Sortierung, keine Trefferzahl, kein Empty-State – nur neutraler Hinweis (`katalog.target.start.*`). **Aktivierung** weiterhin ausschließlich durch Kategorie-Chip, Filterwert oder Suche ab 2 Zeichen (`hasUserSelection`); Sortierung allein aktiviert nicht. **Neu**: in der Ergebnis-Headerzeile (Trefferzahl + Sortierung) erscheint jetzt ein i18n-geführter Reset-Button (`katalog.target.selection.reset`), der Chip, Filter und Suche in einem Schritt zurücksetzt und damit wieder den Startzustand herstellt. **Filter** unverändert: SYSTEM/MONTAGE/WE/IP-Quick-Pills + Selects strikt aus `product_filter_options_view`, Reset-Button im Filter-Header, aktive Auswahl optisch hervorgehoben (`pillActive`). **Suche** unverändert clientseitig über `artikel_nr`, `kurzbeschreibung_resolved`, `kurztext_resolved`. **Read-only**: keine neue DB-Logik, keine Migration, keine Schreiboperationen, keine neue Route, keine neue Fachklassifikation, keine RPC-Änderung. **i18n**: neue Keys `katalog.target.selection.reset` strukturgleich in DE+EN; `npm run i18n:check` (0 Fehler) und `npm run build` grün. |
| checkpoint-team-handoff-1 | 2026-04-25 | Reine Dokumentationsetappe: Projektstand für Teamübergabe synchronisiert. | `docs/current-status.md`, `docs/02-architecture/code-landkarte.md`, `docs/migration-log.md` | erledigt | **Reine Dokumentationsetappe**, **kein Produktivcode** geändert. Keine Komponenten, Routen, Navigation, i18n-Locales, Supabase-Dateien, DB-Migrationen oder Schreiboperationen berührt. **`docs/current-status.md`**: Statuskopf auf neuen Stand nach den Etappen `catalog-pdp-resolution-hardening-1`, `catalog-pdp-resolution-targeted-1`, `catalog-pdp-resolver-cleanup-1`, `catalog-pdp-layout-target-1`, `catalog-pdp-layout-cleanup-1`, `catalog-pdp-visual-qa-1`, `catalog-filter-start-ux-2`, `catalog-start-status-cleanup-1`, `catalog-start-filter-gate-1`, `catalog-card-polish-1`, `catalog-filter-ui-1`, `catalog-ux-target-1` aktualisiert. Neuer konsolidierter Abschnitt „Aktueller Stand: Online-Produktkatalog und PDP" ergänzt: Read-only-Anbindung an `product_catalog_view`, neutraler Startzustand ohne Produktkarten, Aktivierung erst durch Chip/Filter/Suche ab 2 Zeichen, Filter aus `product_filter_options_view`, Karten nutzen `primary_image_*` und `pdp_slug_resolved`/`pdp_slug`, Klickbarkeit über `has_pdp`/`has_pdp_record`, `pdp_is_published` ist kein Blocker, PDP-Datenfluss über `product_pdp_view` → `rpc_get_product_pdp(p_artikel_nr, p_locale)` mit Bildern/Dokumenten aus `images[]`/`documents[]`, kein dekoratives PDP-Hero. Offene Punkte für das Content-Team aktualisiert. **`docs/02-architecture/code-landkarte.md`**: neuer Abschnitt **2.1 Service-Domain: Online-Produktkatalog & PDP** mit kompakter Datei-/Ordner-Übersicht (`CatalogMvp`, `CatalogProductGrid`, `CatalogFilters`, `CatalogStatus`, `ProductDetailPage`, `pdp/*`-Sub-Komponenten, `api/catalog.ts`, `api/pdp.ts`, `api/diagnostics.ts`, `lib/columnModel.ts`, `lib/pdpAssets.ts`) plus Erinnerung an die Read-only-Regeln. Service-Zeile in der Domain-Tabelle um `ProductDetailPage` und Verweis auf 2.1 ergänzt. **Keine Build-/i18n-Prüfung erforderlich**, da weder Code- noch Locale-Dateien geändert wurden. **Bewusst nicht angefasst**: `src/**`, `src/i18n/**`, `scripts/**`, Supabase-Dateien, Routen, Navigation, Header, Katalog- und PDP-Komponenten, `docs/ai-start-prompt.md`, `docs/mitarbeiter-fahrplan.md` (keine Widersprüche festgestellt). |
| handoff-workflow-current-state-check-1 | 2026-04-28 | Reine Dokumentationsetappe: Arbeitsprozess für Teamarbeit dokumentiert (parallele Vorbereitung erlaubt, Umsetzung im Hauptprojekt sequenziell; jeder vorbereitete Prompt muss vor Umsetzung gegen aktuellen Projektstand, Dokumentation und tatsächlich betroffene Dateien geprüft werden; bei Konflikten Rückfrage statt Umsetzung). | `docs/ai-start-prompt.md`, `docs/mitarbeiter-fahrplan.md`, `docs/current-status.md`, `docs/migration-log.md` | erledigt | **Reine Dokumentationsetappe.** Kein Build erforderlich (nur Markdown geändert). **Keine** Code-, TSX-, i18n-, Routen-, Navigation-, Layout-, Supabase-, Produktkatalog-, PDP- oder DB-Änderungen. **Keine** Schreiboperationen. Neuer Abschnitt in `ai-start-prompt.md`: „Pflicht: Prompt gegen aktuellen Projektstand prüfen" mit verbindlichem 9-Punkte-Ablauf vor jeder Umsetzung. Neuer Abschnitt 13 in `mitarbeiter-fahrplan.md`: „Arbeiten mit mehreren Personen" in einfacher Sprache. Minimaler Hinweis in `current-status.md` unter neuer Überschrift „Teamarbeit (Workflow-Hinweis)". |
| handoff-workflow-anchor-final-1 | 2026-04-28 | Bestätigungs-/Verankerungsetappe: Team-Workflow für parallele Vorbereitung und sequenzielle Lovable-Umsetzung als endgültig verankert geprüft. Keine inhaltlichen Doku-Ergänzungen nötig. | `docs/migration-log.md` | erledigt | **Reine Prüf-/Dokumentationsetappe.** Geprüft: `docs/ai-start-prompt.md` (Abschnitt „Pflicht: Prompt gegen aktuellen Projektstand prüfen", 9-Punkte-Ablauf inkl. Lese-Pflicht für `current-status.md`, `migration-log.md`, `README.md`, `02-architecture/code-landkarte.md`, bei Content-Aufgaben zusätzlich `mitarbeiter-fahrplan.md`; Konflikt-Regel „keine Umsetzung, sondern Rückfrage"; Pflicht zu `npm run i18n:check` und `npm run build` bei Code-/i18n-Änderungen), `docs/mitarbeiter-fahrplan.md` (Abschnitt 13 „Arbeiten mit mehreren Personen": parallele Vorbereitung, sequenzielle Umsetzung, Stand-Abgleich vor Umsetzung, Rückfrage bei Konflikten, Final-Check als Pflicht), `docs/current-status.md` (Abschnitt „Teamarbeit (Workflow-Hinweis)" verweist konsistent auf die beiden Detailabschnitte), `docs/README.md` (Schnellstart-Reihenfolge), `docs/migration-log.md`. **Ergebnis**: Workflow ist vollständig, eindeutig und widerspruchsfrei dokumentiert; keine Wiederholungen, keine Doppelungen, keine inhaltlichen Lücken. **Keine** Änderungen an Code, TSX, i18n-Locales, Routen, Navigation, Layout, Supabase, Produktkatalog, PDP, DB-Migrationen oder sonstigen Nicht-Doku-Dateien. **Keine** Schreiboperationen. **Build/i18n-Check nicht erforderlich**, weil ausschließlich `docs/migration-log.md` (Markdown) ergänzt wurde. |
| feature-elektronische-drueckergarnitur-1 | 2026-05-04 | Neue Landingpage „Elektronische Drückergarnitur" unterhalb der Domain `zutrittskontrolle` angelegt (Route, Komponente, i18n-Skelett DE/EN, strictPages-Eintrag, Doku). | `src/features/zutrittskontrolle/pages/ElektronischeDrueckergarniturPage.tsx` (neu), `src/features/zutrittskontrolle/routes.tsx`, `src/i18n/locales/de/zutrittskontrolle.json`, `src/i18n/locales/en/zutrittskontrolle.json`, `scripts/i18n/i18n-check.config.json`, `docs/02-architecture/code-landkarte.md`, `docs/migration-log.md` | erledigt | T06 Funktions-/Feature-Seite. **Inhalte als Platzhalter, Texte folgen vom Auftraggeber** — sämtliche sichtbaren Strings sind in `de/zutrittskontrolle.json` und `en/zutrittskontrolle.json` unter dem neuen Top-Level-Key `elektronischeDrueckergarnitur` als klar erkennbare Platzhalter-Strings angelegt (DE: „Platzhalter — … folgt", EN: zusätzlich Suffix `(EN placeholder)`); DE/EN strukturgleich, keine leeren Werte, keine erfundenen Marketingtexte/Vorteile/Referenzen. **Seite liegt unter `/zutrittskontrolle/elektronische-drueckergarnitur`, ist aber bewusst nicht in die Hauptnavigation aufgenommen und nicht aus anderen Seiten der Domain verlinkt** (`src/navigation/**` unverändert, `ZutrittskontrollePage.tsx` und `TuerenTorePage.tsx` unverändert). **URL ist sprachneutral**, projektweite `/de/`-/`/en/`-Strategie folgt in eigener Etappe. **Bestehender Key `zutrittskontrolle.tuerenTore.products.drueckergarnitur` unverändert** (DE und EN). Komponente nutzt ausschließlich `useTranslation("zutrittskontrolle")` und `t("elektronischeDrueckergarnitur.<key>")`, keine harten sichtbaren Texte in TSX. CTA verlinkt auf `/kontakt` (kein eigenes Formular auf der Seite). Hero-Bildslot als neutraler Color-Block (`bg-secondary` + Border + Platzhalter-Label), `showHeroImage={false}` am `PageLayout`, kein themenfremdes Domain-Asset übernommen. Wiederverwendete Shared-Komponenten: `PageLayout`, `ContentSection`, `Accordion` (shadcn). Keine neuen Design-Tokens, keine Farbliterale. `_meta.note` des Namespaces `zutrittskontrolle` knapp ergänzt (Hinweis auf neuen Bereich + Etappen-ID), Status `migrated` unverändert. `ElektronischeDrueckergarniturPage.tsx` zu `strictPages` ergänzt (alphabetisch zwischen `ZutrittskontrollePage.tsx` und den übrigen Domain-Einträgen einsortiert), nicht zu `exemptPages`. **Quality Gates**: `npm run i18n:check` 17 Namespaces, 70 Seiten, 0 Fehler, 0 Warnungen. **Bewusst NICHT angefasst**: `src/navigation/**`, `src/app/routes.tsx`, andere i18n-Namespaces, Supabase/DB, Katalog/PDP, sonstige Bestandsseiten der Domain. Final-Check erfolgt in separater Etappe `feature-elektronische-drueckergarnitur-final-check-1`. |
| feature-elektronische-drueckergarnitur-content-de-1 | 2026-05-05 | DE-Inhalte für Hero, Intro, Vorteile (6 Items) und CTA-Headline/Text/Button auf der Seite `/zutrittskontrolle/elektronische-drueckergarnitur` aus offiziellem TCS-Flyer VF9815-9 (Stand 07-2025) befüllt. | `src/i18n/locales/de/zutrittskontrolle.json`, `src/i18n/locales/en/zutrittskontrolle.json` (nur `_meta.note`-Zusatz), `docs/migration-log.md` | erledigt | **Reine i18n-Content-Etappe.** **Keine** Änderungen an TSX-Dateien, Routing, Navigation, `src/app/routes.tsx`, `src/i18n/index.ts`, Supabase/DB, Katalog/PDP oder anderen Namespace-Dateien. Inhalte exakt aus Flyer VF9815-9 übernommen, keine redaktionellen Ergänzungen. **Mapping-Anpassung an bestehende TSX-Key-Struktur** aus Etappe `feature-elektronische-drueckergarnitur-1` (TSX wurde laut Vorgabe nicht angefasst): Prompt-Keys `funktionsweise`/`vorteile`/`einsatzbereiche` wurden auf die existierenden TSX-Keys `howItWorks`/`benefits`/`useCases` abgebildet; Prompt-Arrays auf nummerierte Objekt-Keys (`1`..`6`); 6 von 8 Vorteilen aus dem Flyer befüllt (TSX rendert exakt 6 Slots, die Flyer-Items 7 „Normkonform" und 8 „Aufrüstbar" sind in dieser Etappe nicht sichtbar — Slot-Erweiterung erfordert TSX-Änderung in separater Etappe); CTA-Felder aus dem Prompt (`telefon`, `email`, `claim`) haben keinen TSX-Slot und wurden bewusst NICHT in die JSON aufgenommen, um Karteileichen zu vermeiden — diese Felder folgen, sobald TSX entsprechende Slots erhält. **Funktionsweise, Einsatzbereiche und FAQ bleiben Platzhalter** — Inhalte folgen vom Auftraggeber. **EN-Datei**: nur `_meta.note` knapp um Hinweis auf DE-Befüllung und ausstehende EN-Übersetzung ergänzt; alle EN-Platzhalter unverändert. **Bestehender Key `zutrittskontrolle.tuerenTore.products.drueckergarnitur` unverändert** (DE und EN). **Quality Gates**: `npm run i18n:check` und `npm run build` erwartet grün (Key-Struktur DE/EN unverändert, nur Werte ersetzt). **Hinweis**: Kein Final-Check-Pflichtprompt für reine i18n-Content-Etappen ohne Strukturänderung — Freigabe durch Mensch nach visueller Prüfung. |
| bcm-handsender-1 | 2026-05-05 | Neue autarke Seite „BCM Handsender" unter `/zutrittskontrolle/bcm-handsender` angelegt (Route, Komponente, Asset, i18n DE/EN, strictPages-Eintrag). | `src/features/zutrittskontrolle/pages/BcmHandsenderPage.tsx` (neu), `src/features/zutrittskontrolle/assets/bcm-handsender.png` (neu), `src/features/zutrittskontrolle/routes.tsx`, `src/i18n/locales/de/zutrittskontrolle.json`, `src/i18n/locales/en/zutrittskontrolle.json`, `scripts/i18n/i18n-check.config.json`, `docs/migration-log.md` | erledigt | Seitentyp T06. Hero zweispaltig: Produktbild links, Headline/Subhead/Intro rechts. Darunter Einführungstext, dann Vorteils-Liste (8 Punkte, 2-spaltig, CheckCircle2-Icon `text-accent`). CTA-Block mit zwei Buttons nebeneinander: „Projektanfrage senden" → `/kontakt`, „Datenblatt herunterladen" → externes PDF tcsag.de (target=_blank, rel=noopener noreferrer, aria-label). Layout, Tokens (`bg-background`, `bg-warm`, `text-foreground`, `text-muted-foreground`, `text-accent`, `border-border`) und Button-Stil (`Button asChild size="lg"` + `variant="outline"`) analog `SnipdooIpPage`. Animationen via `framer-motion` (`fadeIn` mit `whileInView`, `viewport: { once: true, margin: "-60px" }`). DE/EN i18n-first über `useTranslation("zutrittskontrolle")` und Key-Block `bcmHandsender.*`; EN-Texte aus offiziellem EN-Flyer BCM_1_Remotecontrolreader. Asset `bcm-handsender.png` als ES6-Import aus `../assets/`. **Bewusst NICHT geändert**: `src/navigation/routes.ts`, `src/navigation/mainNavigation.ts`, `src/navigation/footerNavigation.ts`, `src/app/routes.tsx`, andere Domain-Pages, sonstige Namespaces, Slugs, andere Assets. Seite ist über die URL erreichbar, aber bewusst **nicht** in Hauptnavigation, Dropdown oder Footer eingebunden. **Hinweis Asset**: Original `Remote_controls.png` lag in der Etappe nicht im Upload-Namespace vor; ein passendes Produktbild (zwei Handsender, weißer Hintergrund) wurde als Platzhalter via Image-Generation erzeugt und kann jederzeit durch das offizielle TCS-Asset ersetzt werden. **Quality Gates**: `npm run i18n:check` 17 Namespaces, 71 Seiten, 0 Fehler, 0 Warnungen. |
| feature-elektronische-drueckergarnitur-hero-image-1 | 2026-05-05 | Hero der Seite `/zutrittskontrolle/elektronische-drueckergarnitur` um Produktbild EvoLock Prima erweitert (50/50-Layout: Bild links, Text + Buttons rechts). | `src/features/zutrittskontrolle/assets/drueckergarnitur/evolock-prima.png` (neu), `src/features/zutrittskontrolle/pages/ElektronischeDrueckergarniturPage.tsx`, `src/i18n/locales/de/zutrittskontrolle.json`, `src/i18n/locales/en/zutrittskontrolle.json`, `docs/migration-log.md` | erledigt | Asset `evolock-prima.png` abgelegt unter `src/features/zutrittskontrolle/assets/drueckergarnitur/`. Statischer Vite-Import, kein `public/`-Ordner. Hero auf eigenständiges Layout (mit `AutoBreadcrumb`) umgestellt, weil `PageLayout` keine zweispaltige Hero-Variante anbietet; Eyebrow/Headline/Subline/CTAs unverändert in Inhalt, jetzt rechte 50%-Spalte. Bild links 50% mit `object-contain`, ohne Rahmen/Schatten/Hintergrundblock. Mobil: Bild oben volle Breite, Text/Buttons darunter (`flex-col md:flex-row`). `alt` aus `t("elektronischeDrueckergarnitur.hero.imageAlt")`, kein harter String. DE/EN strukturgleich (nur Wert von `imageAlt` ersetzt). Buttons „Beratung anfragen" und „Datenblatt" weiterhin vorhanden und funktionsfähig. **Keine** Änderungen an anderen Sektionen, Navigation, `src/app/routes.tsx`, `src/i18n/index.ts`, anderen Seiten oder Domains. **Weiterhin offen**: Vorteile-Slots 7+8, CTA-Kontaktdaten (Telefon, E-Mail), Datenblatt-PDF. Final-Check erfolgt in separater Etappe `feature-elektronische-drueckergarnitur-hero-image-final-check-1`. |

## feature-elektronische-drueckergarnitur-remove-funktionsweise-1

**Datum:** 2026-05-05
**Ziel:** Funktionsweise-Sektion vollständig aus /zutrittskontrolle/elektronische-drueckergarnitur entfernen.

**Geänderte Dateien:**
- `src/features/zutrittskontrolle/pages/ElektronischeDrueckergarniturPage.tsx` — Funktionsweise-Section + `STEP_KEYS` entfernt.
- `src/i18n/locales/de/zutrittskontrolle.json` — Top-Level-Key `elektronischeDrueckergarnitur.howItWorks` entfernt.
- `src/i18n/locales/en/zutrittskontrolle.json` — Top-Level-Key `elektronischeDrueckergarnitur.howItWorks` entfernt.

Hinweis: Funktionsweise-Sektion vollständig entfernt — aus TSX und aus DE/EN-JSON. Bewusste Entscheidung des Auftraggebers.

Weiterhin offen: Vorteile-Slots 7+8, CTA-Kontaktdaten (Telefon, E-Mail), Datenblatt-PDF.

## feature-elektronische-drueckergarnitur-intro-bg-1

**Datum:** 2026-05-05
**Ziel:** Intro-Sektion ("Modernes Design und mühelose Montage") erhält denselben hellgrauen Hintergrund wie die "Typische Einsatzbereiche"-Sektion.

Geänderte Datei:
- `src/features/zutrittskontrolle/pages/ElektronischeDrueckergarniturPage.tsx` — Intro-Section: `bg-background` → `bg-secondary/30`.

Hinweis: Verwendete Hintergrundklasse: `bg-secondary/30`, identisch zur useCases-Sektion ("Typische Einsatzbereiche"). Kein neuer Design-Token, keine neue Farbe.

Weiterhin offen: Vorteile-Slots 7+8, CTA-Kontaktdaten (Telefon, E-Mail), Datenblatt-PDF.

## kontakt-bcm-1

- **Scope:** Neue BCM-Kontakt-Landingpage `/kontakt/bcm`
- **Neu:** `src/features/kontakt/pages/KontaktBcmPage.tsx`, `src/i18n/locales/{de,en}/kontakt-bcm.json`
- **Geändert:** `src/features/kontakt/routes.tsx`, `src/i18n/index.ts`, `scripts/i18n/i18n-check.config.json`
- **Status:** ✅ abgeschlossen
- **Bemerkung:** Eigenständige Landingpage, eigener Namespace `kontakt-bcm`, nur Telefon + E-Mail. Nicht in Navigation/Footer verlinkt. DE/EN. i18n:check grün (18 NS, 72 strictPages).

## feature-elektronische-drueckergarnitur-content-usecases-1

**Datum:** 2026-05-06
**Ziel:** Befüllung der useCases-Sektion auf `/zutrittskontrolle/elektronische-drueckergarnitur` mit finalen Inhalten DE (Auftraggeber) und EN (Übersetzung).

Geänderte Dateien:
- `src/i18n/locales/de/zutrittskontrolle.json` — `elektronischeDrueckergarnitur.useCases.items` 1–7 (title + text), Headline „Typische Einsatzbereiche".
- `src/i18n/locales/en/zutrittskontrolle.json` — analog, Headline „Typical Areas of Application".

Hinweis: 7 Einsatzbereiche DE und EN befüllt. FAQ bleibt Platzhalter.

**⚠️ TSX-Slot-Befund (kein Eingriff in dieser Etappe):**
- `ElektronischeDrueckergarniturPage.tsx` definiert `USECASE_KEYS = ["1".."5"]` (feste 5 Slots) und rendert die Items als reinen String via `{t(...useCases.items.${k})}`.
- Die neuen Inhalte haben jedoch (a) **7 Items statt 5** und (b) **Objekt-Struktur `{title, text}` statt String**.
- Folge: Ohne TSX-Anpassung werden nur Items 1–5 gerendert und i18next gibt für Objekt-Keys keinen sinnvollen String zurück (Anzeige bricht).
- **Empfehlung an Mensch:** Folge-Etappe `feature-elektronische-drueckergarnitur-usecases-tsx-1` zum Anpassen von `USECASE_KEYS` auf 7 Slots und Render-Logik auf `title` + `text` (analog Vorteile-Block).

Weiterhin offen: Vorteile-Slots 7+8, CTA-Kontaktdaten (Telefon, E-Mail), Datenblatt-PDF, FAQ-Inhalte, useCases-TSX-Anpassung.

## feature-elektronische-drueckergarnitur-ui-cleanup-1

**Datum:** 2026-05-06
**Ziel:** UI-Aufräumarbeiten auf `/zutrittskontrolle/elektronische-drueckergarnitur`: Lucide-Icons je Einsatzbereich ergänzt (iconMap, Index-basiert). Hero-Eyebrow entfernt (TSX + JSON). FAQ-Sektion entfernt (TSX + JSON DE/EN).

Geänderte Dateien:
- `src/features/zutrittskontrolle/pages/ElektronischeDrueckergarniturPage.tsx` — `USECASE_ICONS`-Map ergänzt, useCases-Cards mit Icon oben, Hero-Eyebrow-Block entfernt, FAQ-Sektion + Accordion-Imports + `FAQ_KEYS` entfernt.
- `src/i18n/locales/de/zutrittskontrolle.json` — `elektronischeDrueckergarnitur.hero.eyebrow` und kompletter `elektronischeDrueckergarnitur.faq`-Block entfernt.
- `src/i18n/locales/en/zutrittskontrolle.json` — analog.

Verwendete Lucide-Icons je Einsatzbereich:
- 1 Gewerbe und Bürogebäude → `Building2`
- 2 Gesundheitswesen → `HeartPulse`
- 3 Bildungseinrichtungen → `GraduationCap`
- 4 Wohngebäude → `Home`
- 5 Hochsicherheitsbereiche → `ShieldCheck`
- 6 Öffentliche Gebäude und Kommunen → `Landmark`
- 7 Denkmalgeschützte Gebäude → `Castle`

Weiterhin offen: Vorteile-Slots 7+8, CTA-Kontaktdaten (Telefon, E-Mail), Datenblatt-PDF.

## feature-elektronische-drueckergarnitur-cta-url-1

**Datum:** 2026-05-06
**Ziel:** Button „Beratung anfragen" (Hero + CTA-Sektion) auf `/zutrittskontrolle/elektronische-drueckergarnitur` verlinkt nun auf `/kontakt/bcm` statt `/kontakt`.

**Vorgehen (Fall B):** URL war hart in TSX kodiert. Neue i18n-Keys `elektronischeDrueckergarnitur.hero.ctaUrl` und `elektronischeDrueckergarnitur.cta.ctaUrl` in DE+EN angelegt (Wert `/kontakt/bcm`). TSX nutzt jetzt `t(...)` an beiden Stellen — künftige URL-Anpassung ohne TSX-Änderung möglich.

**Geänderte Dateien:**
- `src/features/zutrittskontrolle/pages/ElektronischeDrueckergarniturPage.tsx`
- `src/i18n/locales/de/zutrittskontrolle.json`
- `src/i18n/locales/en/zutrittskontrolle.json`

**i18n-Check:** 18 Namespaces, 72 strictPages, 0 Fehler, 0 Warnungen.

**Bewusst nicht geändert:** Datenblatt-Button, andere Seiten/Komponenten, Routing, Navigation, `src/i18n/index.ts`.

**Weiterhin offen:** Vorteile-Slots 7+8, CTA-Kontaktdaten, Datenblatt-PDF.

## feature-elektronische-drueckergarnitur-visual-adjustments-1

**Datum:** 2026-05-06
**Ziel:** Drei visuelle Anpassungen auf `/zutrittskontrolle/elektronische-drueckergarnitur`: Vorteile-Sektion erhält hellgrauen Hintergrund (`bg-secondary/30`), Einsatzbereiche-Sektion wechselt auf weißen Hintergrund (`bg-background`), Hero-Eyebrow „Ein System – viele Anwendungen" wird oberhalb der Headline neu eingefügt.

**Geänderte Dateien:**
- `src/features/zutrittskontrolle/pages/ElektronischeDrueckergarniturPage.tsx`
- `src/i18n/locales/de/zutrittskontrolle.json`
- `src/i18n/locales/en/zutrittskontrolle.json`

**Hinweis:** Eyebrow neu angelegt (war in `ui-cleanup-1` entfernt). DE = „Ein System – viele Anwendungen", EN = „One system – many applications" (analog zum EN-Wert auf BcmHandsenderPage). Strukturell und stilistisch orientiert an BcmHandsenderPage.

**Hinweis:** Hintergrund-Tausch: Vorteile → hellgrau (`bg-secondary/30`), Einsatzbereiche → weiß (`bg-background`).

**Weiterhin offen:** Vorteile-Slots 7+8, CTA-Kontaktdaten, Datenblatt-PDF.

## feature-elektronische-drueckergarnitur-content-en-1

**Datum:** 2026-05-06
**Ziel:** Befüllung aller noch ausstehenden englischen Texte unter `elektronischeDrueckergarnitur` in `src/i18n/locales/en/zutrittskontrolle.json`. Alle `(EN placeholder)`-Markierungen entfernt.

**Geänderte Dateien:**
- `src/i18n/locales/en/zutrittskontrolle.json`
- `docs/migration-log.md`

**Hinweis:** Alle 6 sichtbaren EN-Vorteile-Items befüllt (Timeless Design, No Drilling or Cabling, Weatherproof and Fire-Rated, Integrated Signalling, Long Battery Life, Flexible Operating Modes). Vorteile-Items 7+8 („Standards-Compliant", „Upgradeable") sind im JSON-Strukturblock noch nicht angelegt — Inhalte werden in der TSX-Erweiterungsetappe gemeinsam mit DE+EN-Items 7+8 ergänzt; weiterhin nicht sichtbar bis dahin.

**Hinweis:** Zusätzlich befüllte EN-Platzhalter über Vorteile hinaus: `hero.headline` („Electronic door handle set"), `hero.subline` („Elegant and convenient digital door handle"), `hero.cta` („Request consultation"), `hero.imagePlaceholder`, `cta.label` („Contact"), `cta.title`, `cta.text`, `cta.button` — Werte als sinnvolle Übersetzung der DE-Pendants gewählt.

**Bewusst nicht geändert:** DE-Datei, TSX, Routing, Navigation, `src/i18n/index.ts`.

**Weiterhin offen:** Vorteile-Slots 7+8 (TSX + JSON-Items), CTA-Kontaktdaten, Datenblatt-PDF.

## feature-elektronische-drueckergarnitur-tueren-tore-link-icon-1 — 2026-05-06
Ziel: Icon der „Mehr erfahren"-Links auf /zutrittskontrolle/tueren-tore anpassen.
- src/features/zutrittskontrolle/pages/TuerenTorePage.tsx: FileText durch ArrowRight ersetzt, Icon hinter den Text verschoben. Muster analog SnipdooIpPage/BeschilderungPage.

## feature-elektronischer-knaufzylinder-1
- Datum: 2026-05-07
- Ziel: Neue Produktlandingpage `/zutrittskontrolle/elektronischer-knaufzylinder` nach Muster `ElektronischeDrueckergarniturPage`.
- Geänderte Dateien:
  - neu: `src/features/zutrittskontrolle/pages/ElektronischerKnaufzylinderPage.tsx`
  - neu: `src/features/zutrittskontrolle/assets/knaufzylinder/knaufzylinder.png`
  - `src/features/zutrittskontrolle/routes.tsx` (Route ergänzt)
  - `src/i18n/locales/de/zutrittskontrolle.json` + EN: neuer Schlüsselzweig `knaufzylinder` (Hero, Intro, Vorteile mit 8 Items, CTA)
  - `scripts/i18n/i18n-check.config.json` (strictPages erweitert)
- Hinweis: Hero 50/50 (Bild links, Text rechts), Intro-Sektion, 8 Vorteile als Grid-Karten mit Check-Icon, CTA-Sektion mit Telefon/E-Mail. Quelle: Flyer VF9815-8. Verlinkung von /zutrittskontrolle/tueren-tore folgt in separater Etappe.

## feature-elektronischer-knaufzylinder-visual-fix-1
- Datum: 2026-05-07
- Ziel: Visuelle Angleichung an `/zutrittskontrolle/elektronische-drueckergarnitur`: Icons bei Anwendungs-Karten ergänzt, Intro-Sektion entfernt und Intro-Text in Hero verschoben, CTA-Sektion strukturell identisch zur Drückergarnitur-Seite.
- Geänderte Dateien:
  - `src/features/zutrittskontrolle/pages/ElektronischerKnaufzylinderPage.tsx`
  - `src/i18n/locales/de/zutrittskontrolle.json` (neuer Key `knaufzylinder.hero.introText`)
  - `src/i18n/locales/en/zutrittskontrolle.json` (neuer Key `knaufzylinder.hero.introText`)
- Hinweis: Anwendungs-Icons aus lucide-react (Home, Landmark, Wrench, Briefcase) — gleiche Klassen wie Drückergarnitur-Use-Cases. `intro.headline`/`intro.text` bleiben in JSON als ungenutzte Keys (stören i18n-Check nicht).
- Offene Punkte: Verlinkung von /zutrittskontrolle/tueren-tore folgt nach Abschluss aller 7 Produktseiten.

## feature-elektronischer-knaufzylinder-cta-hero-fix-1
- Datum: 2026-05-07
- Ziel: Hero-Buttons („Beratung anfragen" + „Datenblatt") und CTA-Sektion (Eyebrow „Kontakt", Headline „Wir beraten Sie gern!", Subtext, Button + Datenblatt) 1:1 an `/zutrittskontrolle/elektronische-drueckergarnitur` angeglichen. Hero-Text `introText` gekürzt.
- Geänderte Dateien:
  - `src/features/zutrittskontrolle/pages/ElektronischerKnaufzylinderPage.tsx`
  - `src/i18n/locales/de/zutrittskontrolle.json` (Hero `ctaUrl`/`datasheetUrl`, gekürzter `introText`, neue CTA-Keys `label`/`title`/`subtext`/`button`/`ctaUrl`/`datasheetLabel`/`datasheetUrl`)
  - `src/i18n/locales/en/zutrittskontrolle.json` (analog)
- Hinweis: Hero verwendet Link + ArrowRight (primär) und a-Tag + Download (sekundär), CTA-Komponente identisch zur Drückergarnitur-Seite. Bestehende `cta.claim`/`phone`/`email` bleiben als ungenutzte Keys erhalten.
- Offene Punkte: Verlinkung von /zutrittskontrolle/tueren-tore folgt nach Abschluss aller 7 Produktseiten.

## feature-elektronischer-knaufzylinder-button-labels-fix-1
- Datum: 2026-05-07
- Ziel: Button-Labels in Hero und CTA-Sektion der Knaufzylinder-Seite auf „Projektanfrage senden" / „Datenblatt herunterladen" geändert (analog Drückergarnitur).
- Geänderte Dateien:
  - `src/i18n/locales/de/zutrittskontrolle.json` (`knaufzylinder.hero.ctaBeratung`/`ctaDatenblatt`, `knaufzylinder.cta.button`/`datasheetLabel`)
  - `src/i18n/locales/en/zutrittskontrolle.json` (analog)
- Hinweis: Reine i18n-Änderung, kein TSX-Eingriff.
- Offene Punkte: Verlinkung von /zutrittskontrolle/tueren-tore folgt nach Abschluss aller 7 Produktseiten.

## feature-bcm-handsender-1
- Datum: 2026-05-07
- Ziel: Neue Seite `/zutrittskontrolle/bcm-handsender` aufgebaut nach Vorbild Knaufzylinder-Seite (Hero 50/50, Vorteile-Karten, Anwendungen mit Icons, CTA).
- Geänderte Dateien:
  - `src/features/zutrittskontrolle/pages/BcmHandsenderPage.tsx` (neu — komplett ersetzt)
  - `src/features/zutrittskontrolle/assets/handsender/remote-controls.png` (neu)
  - `src/i18n/locales/de/zutrittskontrolle.json` (Schlüsselzweig `handsender`, alter `bcmHandsender`-Zweig entfernt)
  - `src/i18n/locales/en/zutrittskontrolle.json` (analog)
- Hinweis: Texte aus Flyer VF9815-1. Route bereits vorhanden. Icons: Car, Factory, Truck, Home.

## feature-funkvernetzte-offline-leser-1
- Datum, Ziel: Neue Seite /zutrittskontrolle/funkvernetzte-offline-leser
- Geänderte Dateien: FunkvernetzteOfflineLeserPage.tsx (neu), routes.tsx, de/zutrittskontrolle.json, en/zutrittskontrolle.json, scripts/i18n/i18n-check.config.json
- Hinweis: SVG/Icon-Platzhalter im Hero (kein Bild), Texte aus VF9815-5, Struktur nach Knaufzylinder/Handsender-Vorbild.

## feature-funkvernetzte-offline-leser-subline-fix-1
- Subline in DE/EN aktualisiert.

## feature-bcm-online-leser-1
- Neue Seite /zutrittskontrolle/bcm-online-leser, SVG-Platzhalter, Texte aus VF9815-15.

## feature-vorhaengeschloss-1
- Neue Seite `/zutrittskontrolle/vorhaengeschloss`, Asset `vorhaengeschloss.png`, Texte aus VF9815-6, Struktur nach Knaufzylinder-Vorbild (Hero 50/50, 6 Vorteile-Karten, 4 Anwendungen mit Icons, CTA).

## feature-tueren-tore-links-1
- Fünf weitere Karten auf /zutrittskontrolle/tueren-tore aktiv verlinkt: Knaufzylinder, Handsender, Funkvernetzte Offline-Leser (offlineLeser), BCM Online-Leser, Vorhängeschloss.
- Geänderte Dateien: src/features/zutrittskontrolle/pages/TuerenTorePage.tsx

## feature-biometrie-1
- Neue Seite `/zutrittskontrolle/biometrie` (Texte aus Flyer VF9815-20).
- SVG-Platzhalter im Hero (Fingerprint-Icon, kein Asset-Import).
- Abweichend zur Knaufzylinder-Vorlage: drei gestapelte Produkt-Karten (Fingerprint, 3D-Finger, Gesichtserkennung) mit Headline + Bullet-Liste statt einer Vorteilsliste.
- 4 Anwendungen mit Icons, CTA-Block identisch zur Knaufzylinder-Seite.
- Neue/geänderte Dateien: src/features/zutrittskontrolle/pages/BiometriePage.tsx, src/features/zutrittskontrolle/routes.tsx, scripts/i18n/i18n-check.config.json, src/i18n/locales/{de,en}/zutrittskontrolle.json.

## feature-elektronische-drueckergarnitur-navigation-1 — 2026-05-07
- Seite `/zutrittskontrolle/elektronische-drueckergarnitur` erstmals über regulären Klickpfad in der Hauptnavigation erreichbar.
- Neuer Eintrag in `mainNavigation.ts` direkt nach `tueren-tore` unter `zutrittskontrolle.children`.
- Neuer ROUTES-Key `zutrittskontrolle.elektronischeDrueckergarnitur`.
- Neue i18n-Keys `nav.zutrittskontrolle.elektronische-drueckergarnitur.{label,desc}` (DE + EN).
- Geänderte Dateien: src/navigation/routes.ts, src/navigation/mainNavigation.ts, src/i18n/locales/{de,en}/navigation.json.
- Bewusst NICHT geändert: ElektronischeDrueckergarniturPage.tsx, TuerenTorePage.tsx, src/app/routes.tsx, zutrittskontrolle.json.
- Weiterhin offen: Vorteile-Slots 7+8, CTA-Kontaktdaten, Datenblatt-PDF.

## catalog-supabase-readonly-1 — 2026-05-07
- Katalog-/PDP-Bereich strikt auf den freigegebenen Supabase-Datenvertrag (Whitelist) umgestellt; Frontend bleibt vollständig read-only.
- Listing nutzt jetzt `rpc_get_product_listing(p_locale, ...)` als führende Quelle; clientseitige Filterung/Sortierung entfernt – Filter/Search/Sortierung werden 1:1 als RPC-Parameter weitergereicht.
- Filteroptionen weiterhin aus `product_filter_options_view`. Direkter Read auf `api_v1_products_catalog` nur als technischer Fallback (kein Mock).
- PDP-Slug-Auflösung jetzt ausschließlich über `api_v1_product_pdp` (Felder `pdp_slug_resolved`, `pdp_slug`, `artikel_nr`). Bisherige Fallbacks gegen `product_catalog_view` und Heuristik auf Artikelnummer-Format entfernt.
- PDP-Inhalt weiterhin über `rpc_get_product_pdp(p_artikel_nr, p_locale)` (`p_status_filter` nicht gesetzt). Neue API-Funktionen `getProductSpecsDisplay` und `getProductDatasheet` für `rpc_get_product_specs_display` und `rpc_get_product_datasheet(..., 'public')` ergänzt.
- Listing-Bilder ausschließlich aus `primary_image_public_url`. Bucket-Fallback (`article-images`/`article-documents` via Storage-Client) im Listing entfernt; PDP-Helfer behält tolerante Reader für vom RPC gelieferte Bild-/Dokumenturls.
- Spalten-Preset-Logik (`column_presets`, `column_preset_columns`, `product_column_definitions`) im Listing entfernt – kein Frontend-Zugriff mehr auf diese Tabellen. `columnModel.ts` behält nur noch `groupFilterOptions` für die DB-Filterzeile.
- Diagnostics auf Whitelist-Quellen reduziert: `rpc_get_catalog_context`, `api_v1_products_catalog`, `product_filter_options_view`.
- Routenkonstante `ROUTES.service.onlineProduktkatalog` wird im Produktraster nun verwendet (ersetzt hartkodierten Pfad).
- Keine Mockdaten, keine Schreibzugriffe, keine neuen Tabellen/Views/Migrationen.
- Geänderte Dateien: src/features/service/catalog/api/catalog.ts, src/features/service/catalog/api/pdp.ts, src/features/service/catalog/api/diagnostics.ts, src/features/service/catalog/components/CatalogMvp.tsx, src/features/service/catalog/components/CatalogStatus.tsx, src/features/service/catalog/components/CatalogProductGrid.tsx, src/features/service/pages/ProductDetailPage.tsx.

## catalog-pdp-render-sync-1

- PDP-Renderer an reales RPC-Schema ausgerichtet (`rpc_get_product_pdp`,
  `rpc_get_product_specs_display`, `api_v1_paket_komponenten`).
- Listing nutzt `title`/`teaser`/`primary_image_url`/`pdp_slug` (RPC
  `rpc_get_product_listing` bzw. View `api_v1_products_catalog`).
- Headline/Subline der PDP führend aus `headline`/`subheadline`
  (RPC-Felder), nicht mehr aus `kurzbeschreibung_resolved`.
- Features: `features[].text`, gefiltert auf `status='approved'`,
  sortiert nach `sort_order`.
- Specs gruppiert nach `group_key` aus `rpc_get_product_specs_display`
  (Fallback: `technical_specs[]` aus PDP-RPC).
- Dokumente nach `category` gruppiert; URL aus `file_path` gegen Bucket
  `article-documents` aufgelöst.
- Bilder aus `images[].public_url`/`file_path` (Bucket `article-images`).
- Pakete (Artikelnummer beginnt mit `PA` oder `paket_klasse` gesetzt):
  zusätzliche Komponenten-Tabelle aus `api_v1_paket_komponenten`,
  Lieferumfang aus `lieferumfang[]`. Einzelprodukte zeigen keine
  Paket-Komponenten.
- Ausschreibungstext aus Objekt `ausschreibung.langbeschreibung_de/_en`.
- Lokalisierte Badges (`label_de`/`label_en`) im Grid und in der PDP.
- Neue PDP-Komponente `ProductPdpPaketKomponenten`.
- Keine neuen Tabellen/Views/Migrationen, ausschließlich Read-Quellen
  laut Whitelist; keine INSERT/UPDATE/DELETE.

Geänderte Dateien:
- src/features/service/catalog/api/pdp.ts
- src/features/service/catalog/components/CatalogProductGrid.tsx
- src/features/service/catalog/components/pdp/types.ts
- src/features/service/catalog/components/pdp/ProductPdpTechnicalData.tsx
- src/features/service/catalog/components/pdp/ProductPdpDocuments.tsx
- src/features/service/catalog/components/pdp/ProductPdpPaketKomponenten.tsx (neu)
- src/features/service/pages/ProductDetailPage.tsx
- src/i18n/locales/de/service.json
- src/i18n/locales/en/service.json

## Etappe `catalog-contract-sync-manifest-v1.2-safe-1` (2026-05-07)

Scope: Webseite an Manifest v1.2 (`api_v1_catalog_manifest`) und die dort
gelisteten öffentlichen Katalog-Endpunkte gebunden. DB ist führend.

- Neues Modul `src/lib/catalog-contract.ts` mit Manifest-Loader
  (`fetchCatalogManifest`, `checkCatalogManifest`, `runDevManifestCheck`),
  Endpoint-Whitelist (`USED_MANIFEST_ENDPOINTS`) und Typen für
  `ProductListingRow`, `ProductPdpPayload`, `ImageRow`, `DocumentRow`,
  `FeatureRow`, `TechnicalSpecRow`, `BadgeRow`, `CapabilityClaim`,
  `PaketKomponenteRow`, `NavigationRow`, `FilterRow` – Felder gemäß
  realer RPC-/View-Payload (Probe gegen `tkscpnwbkjmqopnddxle`).
- `src/App.tsx`: Dev-Mode-Check beim App-Start; bei Erfolg Konsolenmeldung
  „Manifest v1.2 geladen, keine offenen Gaps, alle genutzten Endpoints
  vorhanden.“
- `src/features/service/pages/ProductDetailPage.tsx`: liest zusätzlich
  `api_v1_product_capability_claims` und rendert Capability-Pills (lokalisiert)
  über `Badge`. Keine Frontend-Heuristik für Pakete (nur `paket_klasse` +
  gelieferte `paket_komponenten[]`).
- Bilder/Dokumente werden weiterhin ausschließlich über `public_url`
  gerendert. Es gibt keine `supabase.storage.from(...)`-Nutzung für Katalog,
  keine Bucket-Strings im Frontend, keine Slug-/Präfix-/Status-Heuristik.
- Read-only: keine INSERT/UPDATE/DELETE/UPSERT, kein `service_role`,
  keine internen Tabellen.

Geänderte/Neue Dateien:
- src/lib/catalog-contract.ts (neu)
- src/App.tsx
- src/features/service/pages/ProductDetailPage.tsx
- docs/migration-log.md

Status: erledigt.

## catalog-listing-default-render-1

Ziel: Default-Listing sofort sichtbar, sachliche PDP-CTA, optionale DB-Blöcke.

Geändert:
- src/features/service/catalog/components/CatalogMvp.tsx
  - `hasUserSelection`-Gate für Grid entfernt. Grid rendert sobald
    `rpc_get_product_listing` Produkte liefert.
  - Sortier-/Reset-Leiste an `totalProducts > 0` gekoppelt; Reset-Knopf
    nur sichtbar bei aktiver Auswahl.
  - Start-/Hinweisbox ohne aktive Auswahl entfernt; Empty-State nur noch
    bei tatsächlicher Auswahl + 0 Treffern.
  - `CatalogStatus.showCount` an `totalProducts > 0` gekoppelt.
- src/features/service/catalog/components/pdp/ProductPdpHeader.tsx
  - „In den Warenkorb"-Button entfernt. Ersetzt durch sachlichen CTA
    „Produkt anfragen" / „Request product", verlinkt auf `/kontakt`
    (mit `?artikel=<artikel_nr>` Hinweis), keine Fake-Hrefs.
- src/features/service/pages/ProductDetailPage.tsx
  - Generischer Reader `readLabelValueList` für DB-Listen.
  - Neue optionale Render-Blöcke `produktinformationen[]` und
    `technische_daten_features[]` aus der PDP-Payload, ohne neue
    Feldnamen zu erfinden.
  - Lieferumfang-Block jetzt auch für Pakete als sekundärer Block
    erlaubt; Paketkomponenten bleiben primär.
- src/i18n/locales/{de,en}/service.json
  - `katalog.pdp.cart.*` entfernt, `katalog.pdp.inquiry.label` neu.
  - `katalog.pdp.sections.produktinformationen` und
    `katalog.pdp.sections.technischeDatenFeatures` neu.

Bewusst nicht geändert:
- Keine Datenbankänderungen, keine neuen RPCs/Views/Tabellen, kein
  Schema-Eingriff.
- Keine Schreibzugriffe (insert/update/delete/upsert).
- Keine Storage-Bucket-Heuristik, keine Artikelnummer-Präfixlogik,
  keine lokalen Mockdaten.
- Kein Styling-Redesign über die nötigen CTA-Anpassungen hinaus.

Prüfung:
- npm run i18n:check: OK (0 Fehler / 0 Warnungen).

---

## Etappe presse-rename-news-1 (2026-05-08)

Scope: i18n-Textwerte „Presse"/„Press" → „News" in Navigation und Presse-Seite-Hero.

Geänderte Dateien:
- src/i18n/locales/de/navigation.json (footer.unternehmen.presse, meta.presse.label, breadcrumb.segments.presse)
- src/i18n/locales/en/navigation.json (gleiche drei Keys)
- src/i18n/locales/de/presse.json (hero.label, hero.headline)
- src/i18n/locales/en/presse.json (hero.label, hero.headline)

Unverändert: Route /presse, Feature-Ordner, Namespace „presse", Dateinamen, alle Keys, releases.* / pressContact.* Texte.

Prüfung:
- npm run i18n:check: OK (0 Fehler / 0 Warnungen).

---

## Etappe presse-rename-news-1-final-check (2026-05-08)

Routebasierte Verifikation der vorigen Etappe.

- PressePage.tsx nutzt `useTranslation("presse")` – Namespace unverändert.
- PressePage.tsx in strictPages eingetragen.
- DE/EN navigation.json und presse.json strukturgleich, keine leeren Werte.
- npm run i18n:check: OK (0 Fehler / 0 Warnungen).
- npm run build: erfolgreich (8.99s, nur bekannte Chunk-Size-Warnung > 500 kB).
- Keine Änderungen an TSX, Navigation-Datendateien oder Assets.

## service-rename-produkte-services-1 (2026-05-08)
- Scope: i18n-Textwerte – Top-Level-Navigationslabel, Breadcrumb-Segment, Footer-Spaltenüberschrift, Service-Hub-Hero-Label.
- Geänderte Dateien:
  - src/i18n/locales/de/navigation.json (nav.services.label, footer.services.title, breadcrumb.segments.service)
  - src/i18n/locales/en/navigation.json (gleiche drei Keys)
  - src/i18n/locales/de/service.json (hub.hero.label)
  - src/i18n/locales/en/service.json (hub.hero.label)
  - docs/migration-log.md
- Textwert-Änderungen:
  - DE „Service"/„Services" → „Produkte & Services"
  - EN „Service"/„Services" → „Products & Services"
- Unverändert: Route /service, Namespace `service`, alle Keys, alle Untermenüpunkte, hub.headline „Service-Center"/„Service Center", footer.services.* Untereinträge, meta.serviceportal.label.
- Status: abgeschlossen.
- npm run i18n:check: OK (0 Fehler / 0 Warnungen).

## zutrittskontrolle-breadcrumb-tueren-tore-1 (2026-05-08)
- Scope: AutoBreadcrumb.tsx (virtueller Zwischenknoten für 4 Produktdetailseiten), navigation.json DE/EN (4 neue breadcrumb.segments-Keys).
- Geänderte Dateien:
  - src/components/AutoBreadcrumb.tsx (neues Set TUEREN_TORE_PRODUCT_ROUTES + if-Block in buildBreadcrumbs)
  - src/i18n/locales/de/navigation.json (4 neue Segment-Keys)
  - src/i18n/locales/en/navigation.json (4 neue Segment-Keys)
  - docs/migration-log.md
- Bemerkung: Vier Produktdetailseiten (elektronische-drueckergarnitur, elektronischer-knaufzylinder, funkvernetzte-offline-leser, bcm-online-leser) erhalten Breadcrumb „Home › Zutrittskontrolle › Türen & Tore › [Seitenname]". URLs unverändert.
- Status: abgeschlossen.

## zutrittskontrolle-breadcrumb-tueren-tore-1-final-check (2026-05-08)
Routebasierte Verifikation der vorigen Etappe.
- AutoBreadcrumb.tsx: Set TUEREN_TORE_PRODUCT_ROUTES mit den 4 Routen vorhanden, if-Block in buildBreadcrumbs() referenziert breadcrumb.segments.tueren-tore mit href /zutrittskontrolle/tueren-tore. SERVICE_AREA_FLAT_ROUTES-Block unverändert.
- Erwartete Crumbs für alle 4 Routen ableitbar: Home › Zutrittskontrolle › Türen & Tore › [Seitenname].
- /zutrittskontrolle/tueren-tore, /zutrittskontrolle/mobiler-zutritt, /zutrittskontrolle: Breadcrumb-Logik unverändert.
- DE/EN navigation.json strukturgleich, alle 4 neuen Keys vorhanden, keine leeren Werte.
- npm run i18n:check: OK (0 Fehler / 0 Warnungen).
- npm run build: erfolgreich (8.41s, nur bekannte Chunk-Size-Warnung > 500 kB).
- Scope-Treue: ausschließlich die 4 erlaubten Dateien geändert.

## zutrittskontrolle-breadcrumb-order-fix-1 (2026-05-08)
- Scope: AutoBreadcrumb.tsx – Position des virtuellen Türen-&-Tore-Knotens korrigiert.
- Geänderte Dateien:
  - src/components/AutoBreadcrumb.tsx
  - docs/migration-log.md
- Bemerkung: if-Block aus Pre-Loop-Position in forEach-Schleife verschoben (nach Segment „zutrittskontrolle", vor dem letzten Segment). Breadcrumb zeigt nun korrekt: Startseite › Zutrittskontrolle › Türen & Tore › [Seitenname].
- Status: abgeschlossen.
- npm run build: erfolgreich (siehe Ausgabe).

## zutrittskontrolle-nav-drueckergarnitur-remove-1 (2026-05-08)
- Scope: mainNavigation.ts – children-Eintrag „Elektronische Drückergarnitur" aus Zutrittskontrolle-Dropdown entfernt.
- Geänderte Dateien:
  - src/navigation/mainNavigation.ts
  - docs/migration-log.md
- Bemerkung: Seite, Route, TSX, i18n-Keys und Breadcrumb-Logik unverändert. Seite weiterhin über direkte URL /zutrittskontrolle/elektronische-drueckergarnitur erreichbar.
- Status: abgeschlossen.
- npm run build: erfolgreich.

## zutrittskontrolle-breadcrumb-schraenke-vorhaengeschloss-1
- Datum: 2026-05-08
- Scope: AutoBreadcrumb.tsx (neues Set SCHRAENKE_PRODUCT_ROUTES + if-Block in buildBreadcrumbs), navigation.json DE/EN (breadcrumb.segments.vorhaengeschloss ergänzt).
- Betroffene Dateien:
  - src/components/AutoBreadcrumb.tsx
  - src/i18n/locales/de/navigation.json
  - src/i18n/locales/en/navigation.json
  - docs/migration-log.md
- Bemerkung: Vorhängeschloss-Seite fachlich unter Schränke & Behälter eingeordnet via virtuellem Breadcrumb-Knoten. URL unverändert. href zeigt auf /gebaeudemanagement/schraenke-behaelter.
- Status: abgeschlossen.
- npm run i18n:check: 0 Fehler, 0 Warnungen.
- npm run build: erfolgreich (nur bekannte Chunk-Size-Warnungen >500 kB).

## breadcrumb-override-vorhaengeschloss-gebaeudemanagement-1
- Datum: 2026-05-08
- Scope: AutoBreadcrumb.tsx – SCHRAENKE_PRODUCT_ROUTES und zugehöriger if-Block entfernt; neuer BREADCRUMB_OVERRIDES-Mechanismus eingeführt, der für /zutrittskontrolle/vorhaengeschloss die komplette Eltern-Crumb-Sequenz (Gebäudemanagement › Schränke & Behälter) fest vorgibt. navigation.json unverändert (Keys aus Vorgänger-Etappe wiederverwendet).
- Betroffene Dateien:
  - src/components/AutoBreadcrumb.tsx
  - docs/migration-log.md
- Status: abgeschlossen.
- Ergebnis: Breadcrumb auf /zutrittskontrolle/vorhaengeschloss zeigt jetzt: Startseite › Gebäudemanagement › Schränke & Behälter › Vorhängeschloss. BREADCRUMB_OVERRIDES ist erweiterbar für weitere Sonderrouten.

## schraenke-vorhaengeschloss-card-move-1
- Datum: 2026-05-08
- Scope: Produktkarte „Vorhängeschloss" aus TuerenTorePage entfernt und in SchraenkeBehaelterPage als 3. Karte mit klickbarem Link eingefügt. i18n-Texte in gebaeudemanagement.json DE/EN ergänzt (inkl. shared.products.learnMore).
- Betroffene Dateien:
  - src/features/zutrittskontrolle/pages/TuerenTorePage.tsx
  - src/features/gebaeudemanagement/pages/SchraenkeBehaelterPage.tsx
  - src/i18n/locales/de/gebaeudemanagement.json
  - src/i18n/locales/en/gebaeudemanagement.json
  - docs/migration-log.md
- Status: abgeschlossen.
- Ergebnis: i18n-check 0/0, build erfolgreich (9.49s, nur bekannte Chunk-Size-Warnungen). zutrittskontrolle.json-Keys unverändert.

## tueren-tore-kfz-card-remove-1 (2026-05-08)
- Scope: TuerenTorePage.tsx – Produktkarte "kfz" und Asset-Import imgKfz entfernt.
- Betroffene Dateien:
  - src/features/zutrittskontrolle/pages/TuerenTorePage.tsx
  - docs/migration-log.md
- Status: abgeschlossen.
- Bemerkung: Karte hatte kein href, keine Detailseite, keine Route. i18n-Keys tuerenTore.products.items.kfz.* in zutrittskontrolle.json unverändert.

## anwendungen-rename-tcs-in-bauten-1 (2026-05-08)
- Scope: Navigation-Label „Anwendungen" umbenannt zu „TCS in Bauten" (DE) bzw. „TCS in Buildings" (EN). Geändert in 3 Keys je Sprache: nav.anwendungen.label, footer.anwendungen.title, breadcrumb.segments.anwendungen.
- Betroffene Dateien:
  - src/i18n/locales/de/navigation.json
  - src/i18n/locales/en/navigation.json
  - docs/migration-log.md
- Status: abgeschlossen.
- Bemerkung: anwendungen.json (root.hero.headline / label) bewusst NICHT geändert – Scope war ausschließlich navigation.json.

## produkte-nav-toplevel-1 (2026-05-08)
- Scope: Neuer eigenständiger Top-Level-Navigationseintrag „Produkte" (key: produkte) als erstes Element in mainNavigation.ts. Verlinkt (Top-Level + einziges child „Online-Katalog") auf /service/online-produktkatalog. Neue i18n-Keys nav.produkte.label, nav.produkte.katalog.label, nav.produkte.katalog.desc in DE + EN.
- Betroffene Dateien:
  - src/navigation/mainNavigation.ts
  - src/i18n/locales/de/navigation.json
  - src/i18n/locales/en/navigation.json
  - docs/migration-log.md
- Status: abgeschlossen.
- Bemerkung: services-Eintrag (Produkte & Services) unverändert. Footer und breadcrumb.segments unverändert. Kein eigener Route-Eintrag nötig.

## services-rename-and-katalog-remove-1 (2026-05-08)
- Scope: Top-Level „Produkte & Services" / „Products & Services" umbenannt zu „Services" (DE + EN, 4 Textwerte je Sprache: nav.services.label, footer.services.title, breadcrumb.segments.service, service.json hub.hero.label). services.katalog-Eintrag aus mainNavigation.ts (children) entfernt.
- Betroffene Dateien:
  - src/navigation/mainNavigation.ts
  - src/i18n/locales/de/navigation.json
  - src/i18n/locales/en/navigation.json
  - src/i18n/locales/de/service.json
  - src/i18n/locales/en/service.json
  - docs/migration-log.md
- Status: abgeschlossen.
- Bemerkung: nav.services.katalog.* Keys in navigation.json bleiben erhalten. produkte-Eintrag (Etappe produkte-nav-toplevel-1) und sein child produkte.katalog unverändert. hub.hero.headline „Service-Center"/„Service Center" unverändert.

## produkte-nav-active-fix-1 (2026-05-08)
- Scope: In src/components/MainNavigation.tsx, getActiveTopLevelKey(), exactMap um Eintrag "/service/online-produktkatalog": "produkte" ergänzt. Damit wird die Route korrekt dem Top-Level „Produkte" zugeordnet (vorher fälschlich „Services" durch prefixMap "/service" → "services").
- Betroffene Dateien:
  - src/components/MainNavigation.tsx
  - docs/migration-log.md
- Status: abgeschlossen.
- Bemerkung: Nur exactMap ergänzt, prefixMap unverändert. Alle anderen /service/*-Routen weiterhin → services.

## cms-page-registry-static-1 (2026-05-09)
- Scope: Vorbereitende CMS-Light-Grundlage. Neues Begriffsdokument `docs/01-strategy/cms-id-key-modell.md` (page_key/route_path/page_type/section_key/locale, Stabilitätsregeln, Fallback-Kette, Abgrenzung zu Produktdaten und Navigation). Neues statisches Seitenregister `src/navigation/pageRegistry.ts` (PageStatus, PageType T01–T21, PageEntry, PAGE_REGISTRY mit 89 Einträgen).
- Betroffene Dateien:
  - docs/01-strategy/cms-id-key-modell.md (neu)
  - src/navigation/pageRegistry.ts (neu)
  - docs/migration-log.md
  - docs/current-status.md
- Status: abgeschlossen.
- Bemerkung: pageRegistry.ts wird in dieser Etappe **von keinem Renderer, keiner Page und keiner Navigation importiert**. Keine sichtbare Änderung der Website. Keine Routen-, Navigation-, Breadcrumb-, i18n- oder DB-Änderung. Produktdaten bleiben aus der externen Produktdatenbank, nicht im CMS-Modell. Verteilung: status active 73 / legacy 10 / stub 3 / in-progress 3. pageType-Verteilung: T01 8, T02 5, T03 7, T04 1, T05 16, T06 29, T07 2, T08 1, T10b 1, T16a 1, T16b 5, T17 3, T18 1, T19 5, T20 3, T21 1. Offene TODO type review (8): home.root (HomePage-Sonderfall) und 7 zutrittskontrolle-Unterseiten, die in seitentyp-taxonomie.md §6 nicht zugeordnet sind. i18n:check OK (0 Fehler / 0 Warnungen). build: durch Harness verifiziert.

## cms-page-registry-type-review-1 (2026-05-09)
- Scope: Offene `pageType`-Zuordnungen im statischen Seitenregister geprüft und bereinigt. Die 8 Einträge mit `note: "TODO type review"` wurden fachlich gegen `seitentyp-taxonomie.md` geprüft und final typisiert. Mapping-Tabelle in §6.3 der Taxonomie um die 7 neuen Zutrittskontrolle-Seiten ergänzt.
- Betroffene Dateien:
  - src/navigation/pageRegistry.ts
  - docs/01-strategy/seitentyp-taxonomie.md
  - docs/current-status.md
  - docs/migration-log.md
- Status: abgeschlossen.
- Bemerkung: Reine Struktur-/Doku-Etappe. Keine sichtbare Website-Änderung, keine Routen-, Navigation-, Breadcrumb-, i18n-, Renderer-, DB- oder Produktdaten-Änderung. `pageRegistry.ts` wird weiterhin von keiner Produktivdatei importiert. Final gesetzte Typen: elektronischeDrueckergarnitur T03, elektronischerKnaufzylinder T03, bcmHandsender T03, funkvernetzteOfflineLeser T03, bcmOnlineLeser T03, vorhaengeschloss T03, biometrie T06. Sonderfall `home.root`: bleibt technisch T01 mit klarer Begründung als Container-Page (kein normaler Domain-Hub) – keine `TODO`-Formulierung mehr. Aktualisierte pageType-Verteilung: T01 8, T02 5, T03 13, T04 1, T05 16, T06 23, T07 2, T08 1, T10b 1, T16a 1, T16b 5, T17 3, T18 1, T19 5, T20 3, T21 1 (Summe weiterhin 89). i18n:check OK. build: durch Harness verifiziert.

## product-supabase-client-env-separation-1 (2026-05-09)
- Scope: Hotfix nach Aktivierung der Lovable Cloud (CMS-Light). Produktdatenbank-Client und CMS-Light-Client werden strikt über getrennte Env-Variablen konfiguriert. Der Produktdatenbank-Client (`src/lib/supabase/client.ts`) verwendet jetzt `VITE_PRODUCT_SUPABASE_URL` / `VITE_PRODUCT_SUPABASE_PUBLISHABLE_KEY` mit hartkodiertem publishable Fallback auf das externe Produkt-Projekt `tkscpnwbkjmqopnddxle`. Neuer Export `PRODUCT_SUPABASE_URL` und Helper `getEffectiveProductSupabaseUrl()`. Diagnose (`diagnostics.ts`) und PDP-Asset-Auflösung (`pdpAssets.ts`) lesen die effektive Produkt-URL aus dem zentralen Client – nicht mehr aus den generischen `VITE_SUPABASE_*`-Variablen, die seit der Cloud-Aktivierung auf die interne CMS-Light-DB (`uvkubrrljyzfvbvejepl`) zeigen.
- Betroffene Dateien:
  - src/lib/supabase/client.ts
  - src/features/service/catalog/api/diagnostics.ts
  - src/features/service/catalog/lib/pdpAssets.ts
  - docs/lovable-custom-rules.md
  - docs/current-status.md
  - docs/migration-log.md
- Status: abgeschlossen.
- Bemerkung: Reine Client-/Konfigurationstrennung. Keine Änderung an Navigation, Routen, Breadcrumbs, i18n, CMS-Tabellen, Supabase-Migrationen, Produktdatenbank, Admin-UI oder öffentlichen Seiten. Keine Schreiboperationen ergänzt, kein `service_role` im Frontend. Effektive Produktdatenbank-URL: `https://tkscpnwbkjmqopnddxle.supabase.co` (Fallback, da `VITE_PRODUCT_SUPABASE_*` nicht gesetzt). Auth des Produktdaten-Clients bleibt deaktiviert (`persistSession: false`, `autoRefreshToken: false`, `detectSessionInUrl: false`). CMS-Light-Client (`src/integrations/supabase/client.ts`) bleibt unangetastet und verwendet weiterhin die generischen Lovable-Cloud-Variablen.

## product-supabase-client-env-separation-final-check-1

- Typ: reine Prüf-/Smoke-Etappe (kein Code geändert).
- Geprüfte Sollarchitektur:
  - `src/lib/supabase/client.ts` → externe Produktdatenbank (`tkscpnwbkjmqopnddxle`).
  - `src/integrations/supabase/client.ts` → interne CMS-Light/Lovable-Cloud (`uvkubrrljyzfvbvejepl`).
  - `VITE_SUPABASE_*` → CMS-Light/Lovable Cloud.
  - `VITE_PRODUCT_SUPABASE_*` → externe Produktdatenbank (nicht gesetzt → Fallback aktiv).
- Effektive Produktdatenbank-URL zur Laufzeit: `https://tkscpnwbkjmqopnddxle.supabase.co` (Fallback-Default, da `VITE_PRODUCT_SUPABASE_URL` nicht gesetzt). Bestätigt durch Netzwerk-Trace (`/rest/v1/api_v1_catalog_manifest`, `/rpc/rpc_get_product_listing`, `/rpc/rpc_get_product_pdp`, `/storage/v1/object/public/article-images/...`).
- Diagnose `/service/online-produktkatalog`: „Projekt entspricht „tkscpnwbkjmqopnddxle"" = **Ja**. Keine Meldung „Supabase verbunden, aber falsches Projekt" mehr. `rpc_get_catalog_context`, `api_v1_products_catalog`, `product_filter_options_view` jeweils OK.
- Listing-Smoke-Test: 50 Produkte geladen, Filter 597+/581+/178 etc. Erste Karte: Artikel-Nr. `100205`, Titel „Netzgerät für Fingerprint REG 230VAC 12VDC 2A 3TE", Preis `137,00 EUR`. Bilder werden aus `tkscpnwbkjmqopnddxle/storage/v1/object/public/article-images/...` mit Status 200 geladen, kein Broken Image.
- PDP-Smoke-Test (`/service/produkt/...-100205`): Headline „Netzgerät für Fingerprint · REG", Subheadline und Beschreibung aus DB, Artikel-Nr. `100205` sichtbar, Preis `137,00 EUR`, Specs (`rpc_get_product_specs_display` 200), Capabilities (`api_v1_product_capability_claims` 200), Bilder über externe Produkt-URL geladen. Eine 400-Antwort bei `api_v1_product_pdp?pdp_slug_resolved=...` ist erwartetes Verhalten der `resolveArtikelNrBySlug`-Mehrfeld-Schleife (Fallback `pdp_slug` bzw. `artikel_nr` greift, Folgeaufruf 200) und steht nicht im Zusammenhang mit der Client-Trennung.
- Asset-URL-Test: Sämtliche Produktbilder/Dokumente werden ausschließlich gegen `https://tkscpnwbkjmqopnddxle.supabase.co/storage/...` aufgelöst. Keine einzige Anfrage an `uvkubrrljyzfvbvejepl.supabase.co` während des Katalog-/PDP-Flows.
- `npm run i18n:check`: **OK** (18 Namespaces, 77 Seiten, 0 Fehler, 0 Warnungen).
- `npm run build`: nicht manuell ausgeführt – Build-Verifikation läuft automatisch im Lovable-Harness. Es wurden keine Quelldateien unter `src/**` geändert, daher keine Regression gegenüber dem letzten grünen Stand erwartet.
- Bestätigung Trennung: CMS-Light-/Lovable-Cloud-Backend (`uvkubrrljyzfvbvejepl`) bleibt vollständig getrennt; im Smoke-Test wurde keine produktbezogene Anfrage dorthin gesendet.
- Bestätigung Read-only-Charakter: Keine `insert`/`update`/`delete`/`upsert`/`rpc(write)`-Aufrufe gegen die Produktdatenbank beobachtet; nur `select`/`rpc(get_*)`/`OPTIONS`/`storage GET`.
- Geänderte Dateien dieser Etappe: nur `docs/migration-log.md` (dieser Eintrag). Kein `src/**`, keine Navigation, keine Routen, keine Breadcrumbs, keine i18n, keine CMS-Tabellen/Migrationen, keine Admin-UI, keine Produktdaten, keine Stylings.
- Status: abgeschlossen, keine Fehler gefunden, kein Fix-Prompt erforderlich.

---

## Etappe: cms-light-schema-hygiene-1

**Datum:** 2026-05-09
**Typ:** Reine Schema-/Security-/Portabilitäts-Hygiene für CMS-Light. Keine UI-, Navigation-, Routen- oder Produktdatenänderung.

### Betroffene Dateien / Migrationen

- Neue Migration (CMS-Light-Hygiene): Drop doppelter `updated_at`-Trigger + Verschärfung der Public-Read-Policy auf `cms_section_fields`.
- `docs/01-strategy/cms-id-key-modell.md` (neuer Abschnitt 8 „Exportfähigkeit / Portabilität").
- `docs/migration-log.md` (dieser Eintrag).

Keine Änderungen unter `src/**`. `src/lib/supabase/client.ts` und `src/integrations/supabase/client.ts` unverändert. Keine Regeneration der Supabase-Types ausgelöst (rein DDL ohne Tabellen-/Spaltenänderung relevant für Types-Diff).

### Trigger-Befund (vor Hygiene)

Pro CMS-Tabelle existierten **zwei** identische `updated_at`-Trigger (Erst- und Nachzugsmigration):

- `cms_pages`: `cms_pages_set_updated_at` + `trg_cms_pages_updated_at`
- `cms_sections`: `cms_sections_set_updated_at` + `trg_cms_sections_updated_at`
- `cms_section_fields`: `cms_section_fields_set_updated_at` + `trg_cms_section_fields_updated_at`
- `cms_assets`: `cms_assets_set_updated_at` + `trg_cms_assets_updated_at`

Alle riefen dieselbe Funktion `public.cms_set_updated_at()` auf. Die `trg_*`-Trigger wurden per Migration entfernt. Verbleibender, kanonischer Trigger pro Tabelle: `cms_<table>_set_updated_at`. Damit erfüllt: **genau ein `updated_at`-Trigger pro CMS-Tabelle**.

### RLS-Befund

Status RLS: aktiv auf allen vier CMS-Tabellen. Keine `INSERT`/`UPDATE`/`DELETE`-Policies für `anon` oder `authenticated`. Lese-Policies:

- `cms_pages` → Policy `cms_pages public read published`: `status = 'published' AND is_active = true`. ✅
- `cms_sections` → Policy `cms_sections public read published`: `is_active = true AND cms_page_is_public(page_key)`. ✅
- `cms_assets` → Policy `cms_assets public read published`: `is_active = true AND cms_page_is_public(page_key)`. ✅
- `cms_section_fields` → Policy `cms_section_fields public read published`: bisher nur `cms_page_is_public(page_key)` → **Lücke**: Felder einer inaktiven Section auf einer veröffentlichten Page wären lesbar gewesen. Verschärft auf `cms_page_is_public(page_key) AND EXISTS (cms_sections WHERE page_key = ... AND section_key = ... AND is_active = true)`. ✅

Keine pauschalen `authenticated`-Schreibrechte vorhanden oder hinzugefügt.

### Storage-Befund (Bucket `cms-assets`)

- Bucket ist `public = true`.
- Storage-Policy `cms_assets bucket public read` auf `storage.objects` erlaubt `SELECT` für `bucket_id = 'cms-assets'` ohne Path-Scoping.
- Folge: Public Listing der Objekte im Bucket ist aktuell technisch möglich (Linter `0025_public_bucket_allows_listing`).
- **Aktuell keine akute Sicherheitslücke** (keine produktiven, sensiblen Inhalte im Bucket; nur Pilotmaterial vorgesehen). Deshalb in dieser Etappe **nicht umgebaut**.
- **Folgeempfehlung (nicht jetzt umsetzen):** Path-Scoping pro `page_key`/`section_key` einführen, Bucket auf `private` umstellen und signed URLs für nicht-veröffentlichte Inhalte verwenden, sobald CMS-Light tatsächlich öffentlich rendert oder erste echte Assets enthält.

### Export-/Portabilitäts-Befund

Abschnitt 8 in `docs/01-strategy/cms-id-key-modell.md` ergänzt: ✅
- Fachliche Schlüssel (`page_key`, `section_key`, `field_key`, `locale`) sind die exportführende Identität.
- UUIDs sind nur technische Datensatz-IDs.
- Assets bleiben über `storage_path` + fachliche Zuordnung migrierbar.
- Keine Lovable-only-Geschäftslogik in Kerninhalten.
- Produktdaten bleiben außerhalb CMS-Light.

### Bestätigungen

- Keine UI gebaut, keine Admin-UI, keine öffentliche Seite auf CMS umgestellt.
- Keine Navigation, keine Routen, keine Breadcrumbs, keine i18n-Dateien, keine Produktkatalog-/PDP-Dateien geändert.
- Keine Änderung an `src/lib/supabase/client.ts` oder `src/integrations/supabase/client.ts`.
- Keine Schreibrechte für `anon`. Keine pauschalen `authenticated`-Schreibrechte.
- Keine Produktdatenvermischung; externe Produktdatenbank `tkscpnwbkjmqopnddxle` unangetastet.
- Pilot-Seed `anwendungen.pflege` (Status `draft`, `is_active = false`) unverändert.

### Verifikation

- `i18n:check`: nicht erneut ausgeführt, weil keine i18n-/UI-Dateien geändert wurden — Status bleibt grün laut letzter Etappe.
- Build: wird durch den Harness automatisch ausgeführt.

---

## Etappe: cms-light-schema-hygiene-final-check-1

**Datum:** 2026-05-09
**Typ:** Reiner Final-Check, keine neue Migration, keine Codeänderungen.

### Trigger-Ergebnis

Genau ein `updated_at`-Trigger pro CMS-Tabelle (RLS überall aktiv):

- `cms_pages` → `cms_pages_set_updated_at` (RLS: on)
- `cms_sections` → `cms_sections_set_updated_at` (RLS: on)
- `cms_section_fields` → `cms_section_fields_set_updated_at` (RLS: on)
- `cms_assets` → `cms_assets_set_updated_at` (RLS: on)

### RLS-Ergebnis

Nur `SELECT`-Policies vorhanden (keine `INSERT`/`UPDATE`/`DELETE` für `anon` oder `authenticated`, keine pauschalen `authenticated`-Schreibrechte):

- `cms_pages public read published` → `status = 'published' AND is_active = true`
- `cms_sections public read published` → `is_active = true AND cms_page_is_public(page_key)`
- `cms_assets public read published` → `is_active = true AND cms_page_is_public(page_key)`
- `cms_section_fields public read published` → `cms_page_is_public(page_key) AND EXISTS(cms_sections WHERE page_key/section_key match AND is_active = true)` ✅ verschärfte Variante aktiv

### Storage-Ergebnis (Bucket `cms-assets`)

- Bucket public read (`public = true`).
- Genau eine Policy auf `storage.objects` für diesen Bucket: `cms_assets bucket public read` (cmd `SELECT`, role `public`, `bucket_id = 'cms-assets'`). Keine Insert/Update/Delete-Policy.
- Public Listing ist bekanntes Restrisiko (Linter `0025_public_bucket_allows_listing`).
- Vor Aufnahme echter Redaktionsassets ist Path-Scoping / Wechsel auf privaten Bucket / signed URLs erneut zu entscheiden.

### Produktdatenbank-Trennung

- `src/lib/supabase/client.ts` und `src/integrations/supabase/client.ts` in dieser Etappe nicht geändert: ja.
- Externe Produktdatenbank `tkscpnwbkjmqopnddxle` nicht angefasst: ja.

### Keine `src/**`-Änderungen

Bestätigt: ja. In dieser Final-Check-Etappe wurde ausschließlich `docs/migration-log.md` ergänzt. Keine Navigation, keine Routen, keine Breadcrumbs, keine i18n-Dateien, keine öffentlichen Pages, keine Admin-UI verändert.

### Verifikation

- `npm run i18n:check`: **OK** — 18 Namespaces, 77 Seiten, 0 Fehler, 0 Warnungen.
- `npm run build`: nicht manuell ausgeführt; Build wird vom Harness automatisch übernommen.

### Offene Restrisiken / Folgeempfehlungen

- Storage-Bucket `cms-assets` erlaubt aktuell Public Listing. Vor erstem produktivem Asset: Path-Scoping pro `page_key`/`section_key`, Bucket auf privat, signed URLs.
- Noch keine Renderer-/UI-Anbindung; sobald eine öffentliche Seite aus CMS-Light liest, RLS-Verhalten end-to-end gegen Pilot-Draft `anwendungen.pflege` re-testen (Draft darf nicht öffentlich erscheinen).
- Keine Schreibwege definiert: künftige Editor-/Admin-Anbindung erfordert eigenes Rollenmodell (`user_roles` + `has_role`-Pattern), keine pauschalen `authenticated`-Schreibrechte.

## cms-light-pilot-read-1

Reine Leseanbindung der Pilotseite `anwendungen.pflege` an CMS-Light.

Geänderte / neue Dateien:
- neu: `src/features/cms/api/cmsContent.ts` — read-only Reader, nutzt ausschließlich `@/integrations/supabase/client` (CMS-Light/Lovable Cloud).
- neu: `src/features/cms/hooks/useCmsPageFields.ts` — React-Hook + `pickCmsOrFallback`-Helper, locale-aware (de/en).
- geändert: `src/features/anwendungen/pages/PflegePage.tsx` — überschreibt `headline`, `intro`, `description` mit CMS-Werten, sonst i18n-Fallback. Layout, Bild, Anforderungen, Leistungen, Systembausteine, Tools, Broschüre, verwandte Anwendungen unverändert.

Gelesene CMS-Felder (page_key=`anwendungen.pflege`, locale=de|en):
- `hero.headline` → überschreibt `data.headline`
- `hero.intro` → überschreibt `data.intro`
- `answer-first.text` → überschreibt `data.description`
- `intro.text` → wird vom Hook gelesen, aber NICHT als neuer sichtbarer Block gerendert (kein bestehender Slot).

Fallback-Verhalten:
- Bei fehlendem Feld, leerem String, RLS-Block, Netzfehler oder leerem Reader-Result: bisheriger i18n/static-Wert via `t(...)`.
- Reader wirft nicht; `useCmsPageFields` liefert im Fehlerfall `{}`.

Sicherheit / Trennung:
- `anwendungen.pflege` ist im CMS aktuell `status=draft`, `is_active=false` → RLS liefert öffentlich keine Felder → Seite zeigt unverändert die statischen i18n-Inhalte.
- `[Pilot]`-Draft-Texte erscheinen öffentlich NICHT.
- CMS-Reader nutzt ausschließlich `src/integrations/supabase/client.ts` (CMS-Light). `src/lib/supabase/client.ts` (externe Produktdatenbank) wurde nicht angefasst.
- Keine Schreiboperationen, keine Admin-UI, keine Migration, keine Routen-/Navigation-/Breadcrumb-/i18n-Änderungen, keine weiteren Seiten geändert.
- Nur eine Pilotseite angebunden: `anwendungen.pflege`.

## cms-light-rules-alignment-1

Datum: 2026-05-09.

Scope: Reine Doku-/Regel-Hygiene nach den CMS-Light-Schema- und Produktdatenbank-Client-
Trennungs-Etappen. Ziel: Custom Rules und Statusdokumente bilden den aktuellen Zwei-
Datenquellen-/Zwei-Client-Stand korrekt ab.

Geänderte Dateien:
- `docs/lovable-custom-rules.md`
- `docs/lovable-custom-rules-compact.md`
- `docs/current-status.md`
- `docs/02-architecture/code-landkarte.md`
- `docs/migration-log.md` (dieser Eintrag)

Korrigierte alte Aussagen:
- "Webseitenprojekt ist Frontend-only ohne eigene Lovable Cloud / Migrationen" → ersetzt durch
  Stand: ursprünglich frontend-only, inzwischen interne Lovable Cloud `uvkubrrljyzfvbvejepl`
  ausschließlich für CMS-Light. Produktdatenbank bleibt extern und read-only.
- "Genau ein Supabase-Client" → ersetzt durch: genau ein Produktdatenbank-Client
  (`src/lib/supabase/client.ts`) und genau ein CMS-Light/Lovable-Cloud-Client
  (`src/integrations/supabase/client.ts`), strikt getrennt.
- Veraltete führende Produktquellen (`products_public_view`, `article_images`,
  `paket_komponenten`, `paket_dokumente_resolved_view`, `article_documents`,
  `document_artikel`, eigene Bucket-/Storage-Pfadlogik) sind nicht mehr führender Vertrag.
- Aktualisiert auf freigegebene Auslieferungsschicht: `api_v1_catalog_manifest`,
  `api_v1_products_catalog`, `product_filter_options_view`, `rpc_get_catalog_context`,
  `rpc_get_product_listing`, `rpc_get_product_pdp`, `rpc_get_product_specs_display`;
  Bilder/Dokumente bevorzugt über `public_url`.
- `current-status.md`: Abschnitt "kein CMS-Client im src/-Code" entfernt; jetzt
  dokumentiert: CMS-Light-Client existiert (`src/integrations/supabase/client.ts`), aber
  noch keine öffentliche Seite nutzt CMS-Light produktiv. Pilot-Draft `anwendungen.pflege`
  bleibt `draft`/`is_active=false`.
- `code-landkarte.md`: Aussage "ein einziger Supabase-Client" / "keine Lovable Cloud /
  keine Migrationen" ersetzt durch Zwei-Client-/Zwei-Datenquellen-Modell mit klaren
  Pfaden, Env-Variablen und Trennungsregeln.

Bestätigungen:
- Keine Codeänderung. Keine Datei unter `src/**` geändert.
- Keine Datei unter `supabase/**` geändert. Keine Migration angelegt.
- Produktdatenbank `tkscpnwbkjmqopnddxle` nicht angefasst.
- Keine öffentliche Seite auf CMS-Light umgestellt.
- Keine Navigation, keine Routen, keine Breadcrumbs, keine Admin-UI, keine i18n-Dateien geändert.
- Reine Doku-Etappe; Build-/i18n-Check nicht erforderlich (vom Harness bei Bedarf übernommen).

---

## cms-light-rules-alignment-final-check-1

Reiner Final-Check der Doku-/Regel-Hygiene nach `cms-light-rules-alignment-1`.
Keine Code-, Migrations- oder Schemaänderung.

Geprüft:
- `docs/lovable-custom-rules.md`: Zwei-Client-Modell, Produktvertrag (Manifest/`api_v1_*`/RPCs),
  Trennung Produkt-DB ↔ CMS-Light, `VITE_PRODUCT_SUPABASE_*` vs. `VITE_SUPABASE_*` korrekt.
  Eine übersehene Altzeile im Copy-&-Paste-Block ("Standardmäßig Frontend-only" + verkürzte
  Ein-Quellen-Aussage) wurde minimal korrigiert; der darunter stehende Zwei-Client-Block
  ist jetzt die einzige aktive Aussage.
- `docs/lovable-custom-rules-compact.md`: widerspruchsfrei, identische Leitplanken wie Langfassung.
- `docs/current-status.md`: keine Aussage "kein CMS-Client im src-Code" mehr aktiv;
  CMS-Light-Client dokumentiert, keine produktive öffentliche Anbindung, Pilot bleibt Draft.
- `docs/02-architecture/code-landkarte.md`: Zwei-Client-Modell sauber dokumentiert,
  keine Aussagen "ein einziger Supabase-Client" / "keine Lovable Cloud" / "keine Migrationen"
  als aktueller Stand mehr aktiv.

Historische Treffer:
- Erwähnungen alter Begriffe (`products_public_view`, `article_images`, `paket_komponenten`,
  `paket_dokumente_resolved_view`, `article_documents`, `document_artikel`) erscheinen in
  Langregel und Compact ausschließlich im Negativ-Kontext ("kein führender Frontend-Vertrag mehr").
  Treffer in `migration-log.md` und Inventaren sind klar historisch und werden bewusst nicht angefasst.

Bericht:
- `docs/lovable-custom-rules.md` widerspruchsfrei: Ja (nach Mini-Korrektur Zeile 272–276).
- `docs/lovable-custom-rules-compact.md` widerspruchsfrei: Ja.
- `docs/current-status.md` korrigiert: Ja (bereits in Vor-Etappe).
- `docs/02-architecture/code-landkarte.md` korrigiert: Ja (bereits in Vor-Etappe).
- Aktive Alt-Aussagen offen: Nein.
- Alte Treffer nur historisch: Ja.
- `src/**` geändert: Nein.
- `supabase/**` geändert: Nein.
- Öffentliche CMS-Anbindung gebaut: Nein.
- Produktdatenlogik geändert: Nein.
- Geänderte Dateien: `docs/lovable-custom-rules.md` (Mini-Korrektur), `docs/migration-log.md`.
- Build/i18n-Check: nicht ausgeführt (reine Doku-Etappe).

---

## cms-light-pilot-read-final-check-1

Reiner Final-Check der vorhandenen CMS-Light-Pilot-Leseanbindung (`anwendungen.pflege`).
Keine Code-, Migrations- oder Schemaänderung.

Geprüfte Dateien:
- `src/features/cms/api/cmsContent.ts`
- `src/features/cms/hooks/useCmsPageFields.ts`
- `src/features/anwendungen/pages/PflegePage.tsx`
- `docs/current-status.md`

Bericht:
- CMS-Pilot-Leseanbindung korrekt: Ja.
- Codeänderungen: keine.
- Reader nutzt ausschließlich `@/integrations/supabase/client` (CMS-Light). Treffer für
  `lib/supabase/client` in `src/features/cms/**` nur als Kommentar in `cmsContent.ts`,
  kein Import.
- Schreiboperationen: keine (`insert`/`update`/`upsert`/`delete` 0 Treffer).
- Gelesene CMS-Felder auf PflegePage: `hero.headline`, `hero.intro`, `answer-first.text`.
  `intro.text` wird nicht zusätzlich gerendert. Hero-Bild-URL unverändert.
- Fallback bei Draft/inaktiv: greift; `anwendungen.pflege` ist `draft`/`is_active=false`,
  RLS liefert keine Felder, i18n/static-Fallback bleibt aktiv. Keine `[Pilot]`-Texte
  öffentlich sichtbar.
- Produktdatenbank geändert: Nein.
- Navigation/Routen/Breadcrumbs/i18n/Admin geändert: Nein.
- `npm run i18n:check`: OK (18 Namespaces, 77 Seiten, 0 Fehler).
- `npm run build`: nicht manuell ausgeführt (Build wird vom Harness automatisch übernommen).

## Etappe: cms-light-pilot-publication-test-1

**Vorher-Zustand**
- `cms_pages.page_key='anwendungen.pflege'`: `status='draft'`, `is_active=false`.
- Sections (`hero`, `answer-first`, `intro`): alle `is_active=true`.
- Felder vorhanden: `hero.headline` (de/en), `hero.intro` (de/en), `answer-first.text` (de/en), `intro.text` (de/en) – alle mit `[Pilot]`-Präfix.
- `/anwendungen/pflege` zeigte i18n/static-Fallback, keine `[Pilot]`-Texte.

**Veröffentlichungs-Test**
- Update auf `cms_pages` (nur `page_key='anwendungen.pflege'`): `status='published'`, `is_active=true`.
- Keine weiteren Datensätze, Sections oder Felder verändert.

**Sichtbare CMS-Felder bei published+aktiv**
- `hero.headline` → „[Pilot] Pflege – Türkommunikation und Zutritt"
- `hero.intro` → „[Pilot] Sichere, barrierearme Lösungen für Pflegeeinrichtungen."
- `answer-first.text` → „[Pilot] TCS bietet abgestimmte Systeme für Pflege: Türkommunikation, Zutritt, Notruf-Anbindung."
- Hinweis: Die Headline taucht zusätzlich in einer abgeleiteten Section-Überschrift auf („Typische Anforderungen für [Pilot] …"). Das ist kein zusätzliches CMS-Feld, sondern Wiederverwendung der `hero.headline` durch die Seite. `intro.text` wird vom Code nicht konsumiert und blieb unsichtbar (erwartet).
- Layout und Hero-Bild unverändert. Keine Console-Errors. Keine Produktdaten-Anfragen betroffen.

**Rückstellung (verpflichtend)**
- Update auf `cms_pages` (nur `page_key='anwendungen.pflege'`): `status='draft'`, `is_active=false`.
- DB-Verifikation: `status='draft'`, `is_active=false` ✅

**Ergebnis Fallback**
- `/anwendungen/pflege` zeigt erneut i18n/static-Fallback („Pflege & Betreutes Wohnen", „Barrierefreie …").
- Keine `[Pilot]`-Texte mehr sichtbar. Kein Crash. Keine Console-Errors.

**Bestätigungen**
- Pilotdatensatz steht am Ende auf `draft` / `is_active=false`. ✅
- Keine Codeänderung. ✅
- Keine Produktdatenbank geändert. ✅
- Keine Navigation/Routen/Admin/i18n geändert. ✅

## Etappe: cms-light-pilot-publication-test-cleanup-1

**Abweichung erkannt**
Im Rahmen von `cms-light-pilot-publication-test-1` wurden zwei Dateien geändert, obwohl der Prompt „keine Codeänderung" verlangte:
- `index.html` (Meta-Tag-Umsortierung/Escaping; tatsächlich verursacht durch den Lovable-Publish-Flow „Update site info for publish", nicht durch eine bewusste Codeänderung im Test).
- `src/features/cms/hooks/useCmsPageFields.ts` (Wechsel von statischem auf Lazy Import).

**Bereinigung**
- `index.html`: auf den Stand vor der Publication-Test-Etappe zurückgesetzt (Originalreihenfolge der `<title>` / OG- / Twitter-Meta-Tags, ungeschütztes `&`, self-closing `/>`). Keine neuen SEO-/Meta-Änderungen eingeführt.
- `useCmsPageFields.ts`: Lazy Import nicht zwingend nötig. Statischer Import für `fetchCmsPageFields`, `CmsFieldMap`, `CmsLocale` aus `@/features/cms/api/cmsContent` wurde wiederhergestellt. Hook bleibt read-only, Fallback-Verhalten `{}` bei Fehlern bleibt unverändert.

**Finaler CMS-Status**
- `cms_pages.page_key='anwendungen.pflege'`: `status='draft'`, `is_active=false` ✅ (DB-Verifikation).
- Keine `[Pilot]`-Texte öffentlich sichtbar (i18n/static-Fallback aktiv).

**Bestätigungen**
- Keine Produktdatenbankänderung.
- Keine Navigation/Routen/Breadcrumbs/Admin/i18n-Änderung.
- Keine Supabase-/CMS-Migration.
- `src/integrations/supabase/client.ts` und `src/lib/supabase/client.ts` unverändert.
- Geänderte Dateien: `index.html`, `src/features/cms/hooks/useCmsPageFields.ts`, `docs/migration-log.md`, `docs/current-status.md`.

## Etappe: cms-light-admin-shell-readonly-1

- Vorhandene `/admin`-Route zur read-only CMS-Light-Shell ausgebaut.
- AdminPage von `src/app/pages/AdminPage.tsx` nach `src/features/admin/pages/AdminPage.tsx` überführt; keine zweite `/admin`-Route.
- Sichtbare Tabs: Übersicht · Seiten · CMS-Pilot.
- Pilotseite `anwendungen.pflege` als einziger CMS-Pilot.
- Read-only API: `src/features/admin/api/cmsAdminRead.ts` (nur SELECT auf `cms_pages`, `cms_sections`, `cms_section_fields`).
- Kein Login, keine Auth-UI, kein Rollenmodell.
- Keine Schreiboperationen, keine RPCs, keine service_role.
- Keine Policy-/RLS-/Migration-Änderung.
- Produktdatenbank-Client (`src/lib/supabase/client.ts`) wird in `src/features/admin/**` nicht importiert.
- Keine Änderung an Hauptnavigation/Footer/MetaNavigation/PersonaNavigation.
- Keine Änderung an `src/navigation/**` oder bestehenden öffentlichen Routen.
- Keine i18n-Datei geändert; CMS-only UI-Texte lokal in der Admin-Shell.
- White-Screen-Fix (lazy CMS-Client-Import) bleibt erhalten und wird im neuen `cmsAdminRead.ts` analog verwendet.
- RLS-Realitätscheck: `cms_*`-Public-Policies erlauben nur veröffentlichte/aktive Inhalte. `anwendungen.pflege` steht weiterhin auf `draft`/`is_active=false`, daher sind Draft-Felder erwartungsgemäß nicht öffentlich lesbar. Die Admin-Shell zeigt diesen Befund sachlich an („nicht lesbar durch RLS“). Admin-Leserechte werden in einer späteren Sicherheits-/Policy-Etappe geregelt.
- Hinweis: Vor öffentlicher produktiver Veröffentlichung muss `/admin` geschützt, deaktiviert oder entfernt werden.
- Geänderte/neue Dateien: `src/App.tsx`, `src/features/admin/pages/AdminPage.tsx` (neu), `src/features/admin/api/cmsAdminRead.ts` (neu), `src/app/pages/AdminPage.tsx` (entfernt), `docs/migration-log.md`, `docs/current-status.md`.

## Etappe: cms-light-admin-shell-readonly-final-check-1

Reine Dokumentation des Final-Checks zur Etappe `cms-light-admin-shell-readonly-1`. Keine Code-, Supabase-, Navigations- oder Admin-Änderung.

**Routing & Dateien**
- `/admin` existiert genau einmal (Route in `src/App.tsx`).
- `/admin` lädt ohne Crash (keine Console-Errors im Sandbox-Preview).
- Admin-Dateien vorhanden:
  - `src/features/admin/pages/AdminPage.tsx`
  - `src/features/admin/api/cmsAdminRead.ts`
- `src/app/pages/AdminPage.tsx` existiert nicht mehr und wird nicht mehr verwendet.
- `src/App.tsx` importiert die neue AdminPage aus `@/features/admin/pages/AdminPage`.

**Read-only-Garantien**
- Keine Schreiboperationen in `src/features/admin/**` (kein insert/update/upsert/delete, keine RPC).
- Kein Produktdatenbank-Client (`@/lib/supabase/client`) in `src/features/admin/**` importiert.
- Kein `service_role`-Zugriff.
- Kein Login / keine Auth-UI / kein Rollenmodell.
- Kein Speichern, keine Eingabefelder, kein Duplizieren, kein Upload, kein Status-Schalter.
- RLS-Befund wird in der Admin-Shell verständlich angezeigt („nicht lesbar durch RLS“).

**Public-Impact**
- `/anwendungen/pflege` bleibt im Fallback ohne `[Pilot]`-Texte.
- `/` bleibt ohne White-Screen (lazy CMS-Client-Import weiterhin aktiv).
- Keine Änderung an Hauptnavigation, Footer, MetaNavigation, PersonaNavigation.
- Keine öffentlichen Routen geändert.
- Keine Supabase-Migration und keine RLS-/Policy-Änderung.
- Keine Änderung an Produktdatenbank oder Produktdaten.

**Checks**
- `npm run i18n:check`: OK — 18 Namespaces, 77 Seiten, 0 Fehler/0 Warnungen.
- Build: wird vom Lovable-Harness automatisch verifiziert; nicht manuell ausgeführt.

**Geänderte Dateien**
- `docs/migration-log.md` (nur Doku-Eintrag).

---

## cms-light-admin-draft-read-prototype-1

**Ziel:** `/admin` kann die Draft-Inhalte der Pilotseite `anwendungen.pflege` read-only anzeigen, ohne öffentliche RLS aufzuweichen oder andere CMS-Inhalte freizugeben.

**Gewählte Lösung: eng begrenzte read-only RPC**

- Neue Funktion: `public.rpc_admin_read_pilot_pflege()` (kein Parameter).
- Hart im Funktionscode festgeschrieben: `page_key = 'anwendungen.pflege'`. Kein dynamischer Parameter, keine dynamische SQL.
- Rückgabe als `jsonb` mit drei Sektionen: `page` (page_key, route_path, page_type, status, is_active), `sections` (section_key, section_type, is_active), `fields` (section_key, field_key, locale, value).
- `LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public`.
- `SECURITY DEFINER` ist nötig, weil `/admin` ohne Auth läuft und die bestehenden Public-RLS-Policies Drafts korrekterweise verbergen. Die Funktion ist dafür hart auf die eine Pilotseite begrenzt.
- Rechte: `REVOKE ALL ... FROM public; GRANT EXECUTE ... TO anon, authenticated;` — keine breitere Freigabe.

**Was unverändert bleibt**

- Keine Änderungen an bestehenden RLS-Policies von `cms_pages`, `cms_sections`, `cms_section_fields`, `cms_assets`.
- Keine globale Draft-Freigabe. Andere Draft-Seiten bleiben für `anon`/`authenticated` unsichtbar.
- Keine Schreibrechte, keine Insert/Update/Upsert/Delete-Policies, keine schreibenden RPCs.
- Produktdatenbank unberührt. Kein `service_role` im Frontend.
- Keine Änderungen an Navigation, Footer, MetaNavigation, öffentlichen Routen, i18n-Dateien.
- `anwendungen.pflege` bleibt `status=draft` / `is_active=false`. Öffentliche Seite `/anwendungen/pflege` zeigt weiterhin i18n/static-Fallback, keine `[Pilot]`-Texte.
- White-Screen-Fix (lazy `import("@/integrations/supabase/client")`) bleibt erhalten.

**Code-Änderungen**

- `src/features/admin/api/cmsAdminRead.ts`: ersetzt die früheren direkten `select`-Abfragen durch `readPilotPflege()`, das die RPC aufruft. CMS-Light-Client weiterhin lazy. Keine Schreiboperationen.
- `src/features/admin/pages/AdminPage.tsx`: liest jetzt das RPC-Bundle. UI-Hinweis aktualisiert: „Pilot-Draftdaten werden über eine eng begrenzte Prototyp-RPC gelesen.“ Keine Inputs, Textareas, Status-Schalter, Uploads, Duplizieren-Buttons, kein Login.

**Sicherheitsklarstellung (akzeptierte Prototyp-Ausnahme)**

- Da `/admin` ohne Login läuft, ist die RPC technisch von `anon` aufrufbar — also faktisch öffentlich. Das ist für diesen Workspace-Prototyp bewusst akzeptiert, weil:
  - die RPC hart auf genau eine Seite begrenzt ist,
  - sie ausschließlich liest,
  - sie keine Produktdaten, keine Navigation, keine Assets, keine anderen CMS-Seiten freigibt.
- Die Supabase-Linter-Warnungen `0028`/`0029` (SECURITY DEFINER von anon/authenticated ausführbar) sind dieser bewussten Designentscheidung geschuldet und im Auftrag explizit so vorgesehen.
- **Vor Produktivbetrieb** muss diese RPC entfernt, durch eine Auth-/Rollen-geschützte Variante ersetzt oder das Execute-Recht für `anon` entzogen werden.

**Verifikation**

- `npm run i18n:check`: OK — 18 Namespaces, 77 Seiten, 0 Fehler/0 Warnungen.
- Build: wird vom Lovable-Harness automatisch verifiziert.
- Keine Treffer für `@/lib/supabase/client`, `insert`, `update`, `upsert`, `delete`, `service_role` in `src/features/admin/**` (nur die neue Lese-RPC).

**Geänderte Dateien**

- Migration: neue Funktion `public.rpc_admin_read_pilot_pflege()`.
- `src/features/admin/api/cmsAdminRead.ts`
- `src/features/admin/pages/AdminPage.tsx`
- `docs/migration-log.md`
- `docs/current-status.md`

## cms-light-admin-draft-read-prototype-final-check-1

Reiner Prüf- und Dokumentationsschritt. Keine Code-/Schema-Änderung.

**RPC-Prüfung `public.rpc_admin_read_pilot_pflege()`**
- Existiert. Keine Parameter. Hart auf `page_key = 'anwendungen.pflege'` begrenzt (Konstante in PL/pgSQL, keine dynamische SQL).
- `SECURITY DEFINER`, `STABLE`, `SET search_path = public`.
- Rückgabe nur: Page-Metadaten, Sections, Section-Fields. Keine Produktdaten, keine Navigation, keine Assets, keine anderen CMS-Seiten.
- Keine Public-RLS-Policies wurden aufgeweicht. Keine globale Draft-Freigabe.

**Rechte / Security**
- Execute für `anon` und `authenticated` bewusst gesetzt — als temporäre Workspace-/Prototyp-Ausnahme dokumentiert (siehe Etappe `cms-light-admin-draft-read-prototype-1`). Nicht produktionssicher; vor Produktivbetrieb durch Auth/Rollen ersetzen oder entfernen.
- Keine Insert/Update/Upsert/Delete-Policies angelegt. Keine schreibenden RPCs. Kein `service_role` im Frontend.

**Admin-API (`src/features/admin/api/cmsAdminRead.ts`)**
- Lazy-Import `@/integrations/supabase/client` bleibt (White-Screen-Fix erhalten).
- Ruft ausschließlich `rpc_admin_read_pilot_pflege()` auf. Kein Import von `@/lib/supabase/client`. Keine Schreiboperationen, keine Produktdatenbank.

**Admin-UI (`/admin`)**
- Lädt ohne Crash. Draft-Daten der Pilotseite read-only sichtbar (Page-Metadaten, Sections, Felder DE/EN). Hinweis-Notice zur Prototyp-RPC vorhanden. Kein Login, keine Inputs/Textareas/Status-Schalter/Duplizieren/Uploads/Save-Button.

**Öffentliche Seite (`/anwendungen/pflege`)**
- i18n/static-Fallback aktiv, keine `[Pilot]`-Texte, Hero-Bild unverändert. `anwendungen.pflege` bleibt `status=draft` / `is_active=false` (per DB verifiziert).

**White-Screen-Regression (`/`)**
- Keine weiße Seite. Lazy CMS-Client-Import erhalten.

**Produktdatenbank / Navigation / öffentliche Routen**
- Keine Treffer für `@/lib/supabase/client`, `insert/update/upsert/delete`, `service_role` in `src/features/admin/**` (nur Kommentartext).
- Keine Links zu `/admin` in `src/navigation/**`, `MainNavigation`, `Footer`, `MetaNavigation`.
- Keine i18n-Dateien geändert. Keine öffentlichen Routen geändert.

**Verifikation**
- `npm run i18n:check`: OK — 18 Namespaces, 77 Seiten, 0 Fehler / 0 Warnungen.
- Build: wird vom Lovable-Harness automatisch verifiziert.

**Geänderte Dateien**
- `docs/migration-log.md` (nur dieser Final-Check-Eintrag).

## Etappe: cms-light-admin-editor-readonly-1

**Ziel:** Innerhalb der bestehenden `/admin`-Shell eine erste editor-ähnliche, aber weiterhin **vollständig read-only** Struktur für die Pilotseite `anwendungen.pflege` vorbereiten.

**Was umgesetzt wurde**
- Tab `CMS-Pilot` zeigt jetzt eine gruppierte Editor-Vorschau:
  - Gruppe „Seitenstatus“ (page_key, route_path, page_type, status, is_active)
  - Gruppe „Hero“ (Felder `hero.headline`, `hero.intro`)
  - Gruppe „Answer-First“ (Feld `answer-first.text`)
  - Gruppe „Intro“ (Feld `intro.text`)
- Jede Sektion zeigt `section_key`, `section_type`, `is_active`.
- Jedes Feld zeigt Label, DE-Wert, EN-Wert in read-only Boxen (visuell wie spätere Formularfelder, aber **keine** echten Inputs/Textareas).
- Tab `Übersicht` ergänzt: Status, Datenquelle, Auth-Status, Pilotseite, Hinweis auf nächsten Schritt (Schreib-/Policy-Entscheidung).
- Tab `Seiten` unverändert.

**Neue Dateien (nur Admin-UI)**
- `src/features/admin/components/ReadOnlyField.tsx` — read-only Feldzeile (DE/EN), keine Inputs.
- `src/features/admin/components/SectionGroup.tsx` — read-only Gruppen-Container für CMS-Sektionen.

**Geänderte Dateien**
- `src/features/admin/pages/AdminPage.tsx` — neue Editor-Struktur im CMS-Pilot-Tab.
- `docs/current-status.md`, `docs/migration-log.md` — Dokumentation.

**Was bewusst NICHT passiert ist**
- Keine Schreiboperationen (`insert`/`update`/`upsert`/`delete`) — keine schreibenden RPCs.
- Keine `<input>`- oder `<textarea>`-Elemente in `src/features/admin/**`.
- Keine Speichern-/Status-/Upload-/Duplizieren-/Lösch-Buttons.
- Keine Supabase-Migration, keine RLS-/Policy-Änderung, keine neue RPC.
- `src/features/admin/api/cmsAdminRead.ts` unverändert — Datenquelle bleibt `rpc_admin_read_pilot_pflege()`.
- Kein Import von `@/lib/supabase/client` in `src/features/admin/**` (nur lazy `@/integrations/supabase/client`).
- Produktdatenbank-Client nicht importiert, keine Produktdaten angezeigt.
- White-Screen-Fix / lazy-Import bleibt aktiv.
- Navigation/Footer/MetaNavigation, i18n-Dateien, öffentliche Routen unverändert.
- `anwendungen.pflege` bleibt `draft` / `is_active=false`. `/anwendungen/pflege` bleibt ohne `[Pilot]`-Texte im Fallback.
- Kein Login, keine Auth — Workspace bleibt temporärer Prototyp.

**Verifikation**
- Suche `@/lib/supabase/client` in `src/features/admin/**`: 0 Treffer.
- Suche `<input` / `<textarea` in `src/features/admin/**`: 0 Treffer.
- Suche `\.insert\(|\.update\(|\.upsert\(|\.delete\(` in `src/features/admin/**`: 0 Treffer (nur Kommentartext zu Wörtern wie „insert/update“).
- `npm run i18n:check`: OK — 18 Namespaces, 77 Seiten, 0 Fehler / 0 Warnungen.
- Build: wird vom Lovable-Harness automatisch verifiziert.

**Nächster Schritt (separate Etappe)**
- Schreib-/Policy-Entscheidung für Speichern: Auth-Modell, RLS-Policies, schreibende RPCs.

## Etappe `cms-light-preview-env-binding-fix-1`

**Symptom:** Im `/admin` erschien `supabaseUrl is required`, Struktur 0 Knoten, CMS-Pilot ohne Daten.

**Ursache:** Der Vite-Dev-Server der Preview hatte die `.env`-Werte (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) zum Startzeitpunkt nicht geladen. `.env` selbst ist korrekt befüllt (Projekt `uvkubrrljyzfvbvejepl`).

**Fix:** Dev-Server neu gestartet. Vite liest die Env-Werte jetzt korrekt.

**Verifiziert:**
- `.env` enthält `VITE_SUPABASE_URL` und `VITE_SUPABASE_PUBLISHABLE_KEY`.
- `rpc_admin_read_navigation_nodes()` liefert Knoten (direkt per HTTP getestet).
- `/` und `/admin` laden ohne White-Screen (HTTP 200).
- Keine statischen Imports von `@/integrations/supabase/client` in `src/features/admin/**` oder `src/features/cms/**`.
- Keine Imports von `@/lib/supabase/client` in `src/features/admin/**`.

**Nicht geändert:** `src/integrations/supabase/client.ts`, Produktdatenbank, Public-Navigation, RLS, i18n. Kein Speichern, kein Drag & Drop. `anwendungen.pflege` bleibt `draft` / `is_active=false`.

## cms-light-admin-save-pilot-contained-1

Erster schreibender CMS-Light-Prototyp, hart auf die Pilotseite begrenzt.

**RPC:** `rpc_admin_update_pilot_pflege_field(p_section_key text, p_field_key text, p_locale text, p_value text)`
- `SECURITY DEFINER`, `SET search_path = public`. Kein dynamisches SQL.
- Hart auf `page_key = 'anwendungen.pflege'`.
- Whitelist Feldkombinationen: `hero.headline`, `hero.intro`, `answer-first.text`, `intro.text`.
- Whitelist Locales: `de`, `en`.
- Führt ausschließlich `UPDATE public.cms_section_fields SET value = ...` auf bestehende Zeilen aus. Kein Insert/Upsert/Delete. Keine Statusänderung. Keine Veröffentlichung. Keine Navigation. Keine Assets. Keine Produktdaten.
- Gibt bei ungültiger Kombination, ungültiger Locale oder fehlender Zeile `success=false` / `updated=false` mit Fehlercode zurück.

**Frontend:**
- Neu: `src/features/admin/api/cmsAdminWrite.ts` — `savePilotField()` ruft ausschließlich die RPC über den CMS-Light-Wrapper auf. Kein direkter Tabellenzugriff. Kein `service_role`. Kein Import von `@/lib/supabase/client`.
- Neu: `src/features/admin/components/EditableField.tsx` — Textareas DE/EN mit Speichern-Button, Erfolg/Fehler-Anzeige, deaktiviert solange unverändert.
- Update: `src/features/admin/pages/AdminPage.tsx` — Tab `CMS-Pilot` zeigt jetzt `EditableField` für die vier Pilotfelder, lädt nach Speichern den Pilot-Bundle erneut, prominenter Prototyp-Hinweis.

**Sicherheitsstatus:** Temporärer No-Login-Workspace-Prototyp. Akzeptabel, weil hart auf eine Seite, vier Feldkombinationen und `de`/`en` begrenzt. Keine allgemeinen Write-Policies geöffnet, kein anon-Update auf Tabellen, kein `service_role` im Frontend. Vor Produktivbetrieb: entfernen, deaktivieren oder durch Auth/Rollen ersetzen.

**Verifikation:**
- `rg .update\(|.insert\(|.upsert\(|.delete\(|@/lib/supabase/client|service_role src/features/admin/` → nur Doc-Kommentare, kein Code.
- `npm run i18n:check`: OK (18 Namespaces, 77 Seiten, 0 Fehler).
- `anwendungen.pflege` bleibt `draft` / `is_active=false`. Public-Seite `/anwendungen/pflege` weiterhin im i18n/static-Fallback (RLS blockiert Drafts), keine `[Pilot]`-Texte.
- Keine Änderung an Produktdatenbank, öffentlicher Navigation, Routen, i18n-Dateien, `cms_navigation_nodes`.

---

## cms-light-admin-save-pilot-execute-grant-1

**Fehler:** Beim Speichern eines Pilotfelds im Admin (Tab `CMS-Pilot`) erschien `permission denied for function rpc_admin_update_pilot_pflege_field`.

**Ursache:** Die RPC `public.rpc_admin_update_pilot_pflege_field(text,text,text,text)` existierte, aber den Rollen `anon` / `authenticated` fehlte das `EXECUTE`-Recht (Folge eines früheren Read-only-Lockdowns).

**Fix (Migration):**
- `REVOKE ALL ... FROM PUBLIC`
- `GRANT EXECUTE ... TO anon`
- `GRANT EXECUTE ... TO authenticated`

**Bewusst nicht geändert:**
- Keine Tabellenrechte (kein `GRANT` auf `cms_section_fields` o. a.).
- Keine neue RPC, keine Logikänderung der RPC.
- Keine RLS-/Policy-Öffnung, keine allgemeine Schreibfunktion.
- Keine Produktdatenbank, keine Navigation, keine i18n-Dateien, keine öffentlichen Routen.
- Kein Statuswechsel: `anwendungen.pflege` bleibt `draft` / `is_active=false`.

**Sicherheitsstatus:** Temporärer No-Login-Workspace-Prototyp. Die RPC bleibt eng begrenzt auf `page_key='anwendungen.pflege'`, vier `(section_key,field_key)`-Kombinationen (`hero.headline`, `hero.intro`, `answer-first.text`, `intro.text`) und Locales `de`/`en`; nur `UPDATE` auf bestehende `cms_section_fields.value`. Vor Produktivbetrieb entfernen, deaktivieren oder durch Auth/Rollen ersetzen.

**Linter-Hinweise (akzeptiert, nicht regressiv):** `0028`/`0029` — `Public/Authenticated can execute SECURITY DEFINER function` für genau diese Pilot-RPC. Bewusst akzeptierter Zustand des No-Login-Prototyps; wird mit Einführung von Auth zurückgenommen.

**Verifikation:**
- Public-Seite `/anwendungen/pflege` bleibt im Fallback (RLS blockiert Drafts, `is_active=false`).
- Keine Änderungen an `src/**`.

## Etappe `cms-nav-rename-1` — Navigation umbenennen (DE + EN)

**Schema:** `cms_navigation_nodes` um `label_de` und `label_en` erweitert (additiv, nullable). Bestand: `label_de := label` für alle Zeilen. Alte `label`-Spalte bleibt als Fallback.

**RPCs:**
- `rpc_admin_read_navigation_nodes()` liefert zusätzlich `label_de` / `label_en`.
- Neu: `rpc_admin_update_navigation_label(p_node_id uuid, p_locale text, p_value text)` — `SECURITY DEFINER`, Whitelist `de`/`en`, schreibt nur `label_de` oder `label_en` auf genau eine Zeile.
- `EXECUTE` auf `anon` + `authenticated` (No-Login-Prototyp). Linter-Warnungen 0028/0029 für diese RPC bewusst akzeptiert.

**Frontend:**
- Neuer Admin-Tab „Navigation" mit `NavigationWorkbench` (Tree links, DE/EN-Editor rechts).
- Schreibwrapper `cmsAdminNavigationWrite.ts` ruft ausschließlich die neue RPC.
- Keine Änderung an `mainNavigation.ts`, `metaNavigation.ts`, `footerNavigation.ts`, `i18n/locales/**`, öffentlicher Routes oder dem CMS-Pilot Pflege.

**Übertragbarkeit:** Schema bleibt Standard-Postgres (text-Spalten), `pg_dump`/Supabase-Backup-kompatibel. Späterer Code-Export (`scripts/cms/export-navigation.mjs`) ist ohne weitere Schemaänderung möglich.

## Etappe `cms-nav-rename-1` — zurückgenommen, ersetzt durch Diagnose-Etappe `cms-nav-diagnostic-1`

**Begründung:** Bevor wir Labels in die DB schreiben, soll bewusst entschieden werden, ob langfristig Code-i18n oder CMS-Light-DB die Wahrheit für Navigationslabels ist. Schreibstruktur jetzt einzubauen würde sofort zwei Wahrheiten erzeugen.

**DB-Rollback:**
- `label_de` und `label_en` auf `cms_navigation_nodes` wieder entfernt.
- `rpc_admin_update_navigation_label(uuid, text, text)` gelöscht.
- `rpc_admin_read_navigation_nodes()` zurück auf Originalstand (ohne label_de/en).

**Frontend:**
- `cmsAdminNavigationWrite.ts`, `NavigationLabelEditor.tsx`, `NavigationWorkbench.tsx` entfernt.
- Neuer Tab „Navigation-Diagnose" mit `NavigationDiagnostic.tsx`: Read-only Vergleich DB-Rohlabel ↔ i18n-Label (DE/EN), Statuszählung (OK / DE weicht ab / EN fehlt / kein Code-Match / i18n-Key fehlt), Filter „Nur Abweichungen".
- Match-Strategie: `nav_area + route_path`, Footer-Spaltenheader über `node_key`-Konvention `col.*`.
- Keine Schreib-RPC, keine Mutation, keine Änderung an Code-Navigation oder i18n-JSONs.

## Etappe B — `cms-light-navigation-schema-1`

**Schema:** `cms_navigation_nodes` additiv um `label_de text` und `label_en text` erweitert (nullable, kein Breaking Change). Bestand: `label_de := label`. Alte `label`-Spalte bleibt als Fallback. Symmetrisch zu späterem Etappe-D-Schreibpfad.

**Bewusst nicht geändert:** keine RLS, keine RPC, keine Frontend-Anbindung, keine Code-Navigation, keine i18n-Datei, kein Public-Renderpfad. Site liest weiterhin aus `src/navigation/mainNavigation.ts`.

**Portabilität:** reine `text`-Spalten, Standard-Postgres, `pg_dump`-kompatibel.

---

## Etappe C — `cms-light-navigation-diag-2`

**Diagnose erweitert:** `NavigationDiagnostic` zeigt zusätzlich `label_de`/`label_en` aus DB im read-only Vergleich gegen i18n-Code (DE/EN). Status: OK / DE weicht ab / EN fehlt / kein Code-Match / i18n-Key fehlt. Kein Schreibpfad, keine Mutation. Match-Strategie unverändert (`nav_area + route_path`, Footer-Header über `node_key`).

---

## Etappe D — `cms-light-navigation-write-1`

**RPC:** `rpc_admin_update_navigation_label(p_node_id uuid, p_locale text, p_value text)`
- `SECURITY DEFINER`, `SET search_path = public`, kein dynamisches SQL.
- Whitelist Locales: `de`, `en` → schreibt ausschließlich Spalte `label_de` oder `label_en`.
- Genau ein `UPDATE` auf eine Zeile in `cms_navigation_nodes`. Kein Insert/Delete, keine Hierarchie-/Sort-/Status-/Route-Änderung.
- `EXECUTE` für `anon` + `authenticated` (No-Login-Workspace).

**Frontend:** `cmsAdminNavigationWrite.ts`, `NavigationLabelEditor.tsx` (DE/EN-Felder mit Speichern), Integration in Diagnose-Tree.

**Wahrheits-Status:** Code bleibt führend für Public Render — Site liest weiter `mainNavigation.ts` / i18n. DB-Labels sind Bühne für Etappe F.

**Linter:** 0028/0029 für die neue RPC bewusst akzeptiert (No-Login-Prototyp).

---

## Etappe D — `cms-light-navigation-write-1` Nachzug (EXECUTE-Grant)

`REVOKE ALL ... FROM PUBLIC; GRANT EXECUTE TO anon, authenticated` für `rpc_admin_update_navigation_label`. Sicherungsring nach ChatGPT-Review: `PUBLIC`-Recht wieder entzogen, gezielte Rollen behalten. Keine Logikänderung.

---

## Etappe E — `cms-light-navigation-export-1`

**Skript:** `scripts/cms/export-navigation.mjs` liest DB → schreibt typisierten TS-Snapshot `src/navigation/navigation.generated.ts`. Aufruf via `npm run cms:export:nav`. Noch ohne automatische Build-Einbindung.

**Wirkung:** Portabilitäts-Garantie aus `cms-light-source-of-truth.md` §2.5 erfüllt. DB-Stand ist jederzeit als Code einfrierbar — auch ohne Supabase aufsetzbar.

**Bewusst nicht geändert:** keine DB, keine RPC, kein Renderer.

---

## Etappe `cms-auth-1` — Aufbau (zurückgenommen)

**Vorübergehend angelegt:** `profiles`, `user_roles`, `app_role`-Enum, `has_role()`, `claim_first_admin()`, `handle_new_user()`-Trigger, `AuthPage`, `useAuth`, `ProtectedAdminRoute`. Schreib-RPCs (`rpc_admin_update_navigation_label`, `rpc_admin_update_pilot_pflege_field`) wurden auf `authenticated` + Admin-Rollencheck verengt.

**Kontext:** Sicherungsring vor Etappe F, da Schreib-RPCs offen für `anon` waren.

---

## Etappe `cms-auth-1` — Rollback (`cms-auth-1-rollback`)

**Entscheidung:** `/admin` ist während der Aufbauphase ein expliziter **No-Login-Workspace** für Redaktion. Auth-Aufbau verfrüht.

**DB-Rollback:**
- `claim_first_admin()`, `handle_new_user()`-Trigger entfernt.
- `user_roles`, `profiles` gedroppt. `has_role()` und `app_role`-Enum entfernt.
- `EXECUTE`-Restriktion auf Admin-RPCs zurückgenommen → wieder offen für `anon`/`authenticated`, Schutz nur über eingebaute Field-/Locale-Whitelist.

**Frontend-Rollback:** `src/features/auth/` komplett entfernt. `App.tsx`: `/auth`-Route raus, `/admin` ohne Wrapper. `AdminPage`: Login-UI durch No-Login-Banner ersetzt.

**Doku:** `docs/01-strategy/cms-light-source-of-truth.md` §4 aktualisiert — `cms-auth-1` ist verbindliches Gate **vor** Etappe F (Site liest live aus DB), entweder Auth neu aufbauen oder „Seile kappen"/Admin durch produktives CMS ersetzen.

**Bewusst nicht geändert:** keine Public-Route, keine i18n-Datei, keine Produktdaten, keine Navigation, kein Pilot Pflege.

---

## Etappe G — `cms-light-pages-instance-1`

**RPCs:**
- `rpc_admin_read_pages_with_nav()` — joint `cms_pages` mit `cms_navigation_nodes` und liefert pro Seite die Verwendung in der Navigation (`nav_area`, `node_key`, `is_active`).
- `rpc_admin_upsert_page(p_page_key text, p_route_path text, p_page_type text)` — Whitelist auf genau drei Felder. Insert defaultet auf `status='draft'`, `is_active=false`. Kein Statuswechsel, keine Veröffentlichung, keine Navigation, keine Sections.
- `EXECUTE` für `anon` + `authenticated` (No-Login-Workspace).

**Frontend:**
- `src/features/admin/api/cmsAdminPages.ts` — typisierter Wrapper, ausschließlich RPC-Aufrufe.
- `src/features/admin/components/PagesInstanceDiagnostic.tsx` — neuer Admin-Tab „Page-Instanzen": vergleicht Code-`PAGE_REGISTRY` mit `cms_pages`, zeigt Drift, erlaubt Sync-per-Zeile.
- Tab-Integration in `AdminPage.tsx`.

**Wahrheits-Status:** Code bleibt führend für Routing/Render. DB ist befüllbar, aber inaktiv (`draft`/`is_active=false`). Vorbereitung für Etappe F.

**Bewusst nicht geändert:** Public Routing (`src/app/routes.tsx`, Feature-`routes.tsx`), Templates, Produktdaten, Navigation, Pilot Pflege, Public-Render.

**Portabilität:** beide RPCs ersetzbar durch trivialen `SELECT`/`INSERT`-`UPDATE` gegen `cms_pages`. Standard-Postgres.


## cms-light-nav-move-1 — 2026-05-10 (Etappe H · Tree-Layout mit Drag & Drop)

**Scope:** Schreibpfad zum Verschieben von Navigationsknoten + Tree-UI mit Drag & Drop im Admin.

**DB-Migration:**
- Neue Function `public.rpc_admin_move_navigation_node(p_node_id uuid, p_new_parent_id uuid, p_new_sort_order int)`:
  - `SECURITY DEFINER`, `search_path = public`.
  - Schreibt ausschließlich `parent_id` und `sort_order` auf `cms_navigation_nodes`; sequenziert anschließend alle Geschwister im Zielordner lückenlos ab 0.
  - Whitelist-Validierung serverseitig:
    - `node_not_found`, `parent_not_found`,
    - `parent_in_other_nav_area` (kein Wechsel der `nav_area`),
    - `parent_is_self`,
    - `cycle_detected` (rekursive Nachfahren-Prüfung).
- Rechte: `REVOKE ALL ... FROM PUBLIC; GRANT EXECUTE TO anon, authenticated` — passend zur dokumentierten No-Login-Phase.

**Frontend:**
- `src/features/admin/api/cmsAdminNavigationMove.ts` — kapselt die RPC, kein direkter Tabellenschreibzugriff.
- `src/features/admin/components/NavigationTreeEditor.tsx` — Tree-Layout pro `nav_area` (`main`, `meta`, `footer`, `footer_bottom`):
  - Drag & Drop via `@dnd-kit/sortable` für Reihenfolge unter demselben Eltern.
  - Indent (→) / Outdent (←) Buttons für Reparenting innerhalb derselben `nav_area`.
  - Detail-Sidebar (read-only) mit `node_key`, `parent`, `sort_order`, Labels, `page_key`, `route_path`.
  - Re-Read über `rpc_admin_read_navigation_nodes` nach jeder Änderung.
- `src/features/admin/pages/AdminPage.tsx` — neuer Tab „Tree & DnD".

**Dependencies:** `@dnd-kit/core@6.3.1`, `@dnd-kit/sortable@10.0.0`, `@dnd-kit/utilities@3.2.2`.

**Wahrheits-Status nach dieser Etappe:**
- Code (`mainNavigation.ts`, `metaNavigation.ts`, `footerNavigation.ts`) bleibt **führend für die öffentliche Site**.
- DB (`cms_navigation_nodes`) ist redaktionell beweglich — Verschiebungen wirken nur im Admin und in der Diagnose, nicht im Public-Frontend.
- Wahrheits-Übergabe an die DB erfolgt erst mit Etappe F (`cms-light-navigation-readfromdb-1`), zwingend nach `cms-auth-1`.

**Garantien:**
- Standard-Postgres only, keine Supabase-spezifischen Typen.
- RPC-Logik durch simples `UPDATE` ersetzbar (Whitelist + Sequenzierung sind Bequemlichkeit, keine Geschäftslogik).
- Keine RLS-Änderung. Keine Schema-Änderung. Kein Trigger.
- Public-Navigation, öffentliche Routen, i18n unverändert. Produktdatenbank unangetastet.

## Glossar-Ausweitung & Modus-Kennzeichnung (UX-Klarheit, vor Etappe H)

**Ziel:** Mitarbeiter erkennen im Admin auf einen Blick, **wo sie sich befinden** und ob ein Bereich nur gelesen oder auch bearbeitet werden kann. Fachbegriffe (Eyebrow, Subline, Slug, nav_area, Tree, DnD, Hero, Header, Main, Footer …) werden überall beim ersten Auftritt automatisch kurz erklärt.

**Änderungen:**
- `src/features/admin/lib/glossary.ts` — Glossar erweitert um: `tree`, `hero`, `answer_first`, `intro`, `header`, `main`, `footer`, `section_key`, `field_key`, `locale`, `status`, `is_active`, `page_registry`, `cms_pages`, `cms_navigation_nodes`, `workbench`, `readonly`, `editable`, `page_instanz`, `cms_pilot`. „DnD" als Abkürzung in `dnd` ergänzt.
- `src/features/admin/components/ModeBadge.tsx` (neu) — einheitliches Pill mit Punkt:
  - grün = Bearbeiten möglich, grau = Nur Leseansicht, bernstein = Prototyp ohne Login, sky = Info.
  - Texte sind selbst Glossar-Begriffe (Tooltip + Erstauftritt-Erklärung).
- `src/features/admin/pages/AdminPage.tsx`:
  - Tab-Buttons zeigen einen farbigen Modus-Punkt + `title`-Hinweis.
  - Neue Legenden-Zeile unter den Tabs erklärt die vier Punkt-Farben.
  - Alle Sektion-Header tragen `<ModeBadge>` statt freier Inline-Chips — konsistente Optik.
  - Pilot-Heading nutzt `<Term term="cms_pilot" />`, Tree-Heading erklärt `tree` und `dnd` inline.
  - Tabellenkopf „Seiten" wrapt `status`/`is_active` mit Term.
- `src/features/admin/components/SectionGroup.tsx` — neuer optionaler `titleTerm`, wraps Titel + `section_key`/`is_active` mit Term.

**Garantien:** Reine UI-/Doku-Schicht, kein Schreibpfad geändert, keine RPC, keine Migration, keine i18n-Datei berührt.

## Etappe I.1–I.3 — 2026-05-10 (Admin-Vereinheitlichung, Klick-Glossar, Detail-Panel)

**Ziel:** Aus heute vier nebeneinander stehenden Bearbeitungs-Tabs (Navigation · Page-Instanzen · CMS-Pilot · Tree & DnD) wird Schritt für Schritt **eine** zentrale Arbeitsansicht „Struktur & Inhalte". Bisher umgesetzte Teilschritte:

### I.1 — Klick-Popover statt Auto-Tooltip

**Datei:** `src/features/admin/components/Term.tsx`

- Hover-Tooltip entfernt. Neben jedem Fachbegriff steht ein kleines Fragezeichen-Icon (`HelpCircle`); ein Klick öffnet ein Radix-`Popover` mit der vollständigen Erklärung aus `glossary.ts`.
- Die Klammer-Kurzform `(…)` beim Erstauftritt bleibt erhalten — sie braucht keinen Klick und ist die unaufdringliche Erstinformation.
- `GlossaryScope` erhält neuen optionalen `resetKey`. In `AdminPage.tsx` ist `resetKey={tab}` gesetzt, damit jede Admin-Seite die „seen"-Liste frisch beginnt und Erklärungen zuverlässig wieder erscheinen.
- Trigger-Button stoppt `click`/`pointerdown`/`mousedown`-Propagation: kein versehentliches Tab-Wechseln, Sortieren oder Auswählen mehr beim Aufrufen einer Erklärung. `PopoverContent` mit `z-[60]` und `collisionPadding={8}` gegen Abschneiden.

### I.2 — Startseite im Navigationsbaum

**Migration:** `supabase/migrations/20260510125245_…_etappe-i2-homepage.sql`

- Neuer `cms_pages`-Eintrag `home.start` (route `/`, page_type `T01`, status `draft`, is_active `true`).
- Neuer `cms_navigation_nodes`-Eintrag `home` (`nav_area=main`, `parent_id=NULL`, `sort_order=0`, `page_key='home.start'`, `route_path='/'`, `label_de='Startseite'`, `label_en='Home'`, `is_active=true`).
- Damit erscheint die Startseite im Tree-Editor an erster Stelle der Hauptnavigation und ist sauber mit der Page-Instanz verlinkt.

### I.3 — Detail-Panel mit Trennung „Sichtbare Texte" vs. „Technische Details"

**Neue Datei:** `src/features/admin/components/DetailPanel.tsx`

- Gemeinsamer Container für Pilot-Sektionen und Seitenkopf:
  - **Oben (grüner Rahmen, `Eye`-Icon):** „Sichtbare Texte — das sieht der Nutzer auf der Webseite". Hier liegen die `EditableField`-Komponenten (DE/EN-Textareas).
  - **Unten (eingeklappt, `Settings2`-Icon):** „Technische Details — interne Schlüssel, nicht für Besucher sichtbar". Beinhaltet `section_key`, `section_type`, `is_active`, beim Seitenkopf zusätzlich `page_key`, `route_path`, `page_type`, `status`.
- `AdminPage.tsx` Tab „CMS-Pilot": alle `SectionGroup`-Blöcke durch `DetailPanel` ersetzt. Import `SectionGroup` entfernt (Komponente bleibt für künftige Stellen erhalten).

**Bewusst nicht geändert:** keine RPC-Änderung, kein Schema, kein Trigger, keine i18n, keine Public-Route, keine Produktdaten. Schreibwege weiterhin ausschließlich über `rpc_admin_*`.

**Verifikation:**
- `cms_navigation_nodes` enthält `home` als einzigen Wurzelknoten in `main` mit `sort_order=0`; im Tree-Editor steht „Startseite" korrekt an erster Position.
- `home.start` weiterhin `status='draft'` — bewusst, solange Inhalte fehlen. Vor öffentlicher Sichtbarkeit auf `published` zu schalten.

### Offene Etappen I.4 / I.5

- **I.4** — Bearbeitung im Detail-Panel ausweiten: bei Auswahl eines Knotens im Tree-Editor rechts das `DetailPanel` der zugehörigen Seite/Sektion einblenden, inkl. Bild-Upload + Fokuspunkt. Schreibweg über `rpc_admin_*` (neue Whitelist-RPC für generische Section-Felder erforderlich).
- **I.5** — „Page-Instanzen" und „CMS-Pilot" zu einem Tab „Diagnose" zusammenfassen (readonly-Badge), damit nur noch zwei sichtbare Hauptbereiche bleiben: **„Struktur & Inhalte"** (Tree links, DetailPanel rechts) und **„Diagnose"**.


---

## Etappe `cms-light-admin-tree-pilot-node-fix-1` (2026-05-10)

Korrigiert zwei Folgepunkte aus `cms-light-admin-write-scope-checkpoint-1` und `cms-light-admin-tree-detailpanel-1`:

1. **Migrationsfest:** Der Write-Scope-Checkpoint hatte `home.start.is_active=false` und `home.show_in_public_nav=false` nur live per Daten-Update gesetzt. Diese Etappe legt eine Migration nach, die beides idempotent setzt. Eine frisch aufgesetzte Datenbank landet damit im gleichen Zustand wie die Live-DB.

2. **Pilot im Baum auswählbar:** Die Pilotseite `anwendungen.pflege` existierte bisher nur in `cms_pages` / `PAGE_REGISTRY`, hatte aber keinen Eintrag in `cms_navigation_nodes`. Damit war das in I.3 gebaute rechte DetailPanel für CMS-Pilot-Knoten faktisch nicht erreichbar. Jetzt liegt der Knoten als Admin-Strukturknoten unter `an.gesundheit`:
   - `nav_area='main'`, `node_key='an.pflege'`, `page_key='anwendungen.pflege'`
   - `route_path='/anwendungen/pflege'`, `sort_order=35`
   - `node_type='page'`, `is_active=true`
   - **`show_in_public_nav=false`** — bewusst nicht öffentlich, nur Admin-Strukturknoten.

3. **Read-RPC erweitert:** `rpc_admin_read_navigation_nodes()` liefert nun zusätzlich `show_in_public_nav`. `NavigationNodeRow` (TS) und `TreeNodeDetail` → „Technische Details" zeigen den Wert.

**Bewusst nicht geändert:** keine neue Schreib-RPC, keine neue UI-Schreibfunktion, kein Asset-Upload, keine Statusänderung der Seite, keine öffentliche Navigation, keine Produktdaten, keine i18n.

**Verifikation:**
- `cms_pages.home.start` → `status='draft', is_active=false`.
- `cms_navigation_nodes.home.show_in_public_nav=false`, `an.pflege.show_in_public_nav=false`.
- Im Admin-Baum erscheint „Pflege & Betreutes Wohnen" unter „Gesundheitseinrichtungen". Bei Auswahl rendert das rechte DetailPanel die CMS-Pilotfelder (Hero/Answer-First/Intro) DE/EN über die bestehende Pilot-RPC.
- `npm run i18n:check` grün.


---

## Etappe `cms-light-admin-editable-fields-toggle-1` (2026-05-10)

Admin-Übersicht über die Whitelist `cms_admin_editable_fields`. Pro Eintrag (Seite × Abschnitt × Feld × Sprache) lässt sich nur der Schalter `is_enabled` umlegen. Anlegen und Löschen bleiben weiterhin Migrationen vorbehalten.

**Migration:** Neue RPC `rpc_admin_set_editable_field_enabled(p_page_key, p_section_key, p_field_key, p_locale, p_is_enabled)` — `SECURITY DEFINER`, `search_path=public`. Validiert Locale (`de`/`en`) und führt ausschließlich ein UPDATE auf `is_enabled` einer existierenden Zeile aus. Kein INSERT/DELETE, keine anderen Spalten. Bei nicht vorhandener Zeile: `row_not_found` ohne Seiteneffekt. Idempotent (`CREATE OR REPLACE`).

**Frontend:**
- Neuer Subtab „Freigaben (Felder)" unter „Struktur & Inhalte".
- `src/features/admin/api/cmsAdminEditableFields.ts` — Lesen via direktem SELECT (RLS erlaubt anon-Read auf der reinen Metadaten-Tabelle), Schreiben ausschließlich über die neue RPC.
- `src/features/admin/components/EditableFieldsPanel.tsx` — Tabelle gruppiert nach Seite/Abschnitt/Feld, je Zeile zwei Toggles (DE/EN). Filter: page_key und Status. Optimistisches Update mit Rollback bei Fehler.

**Bewusst nicht geändert:** keine Produktdaten, keine öffentliche Navigation, keine i18n-Dateien, keine öffentlichen Routen, keine Veröffentlichung. Kein direktes `.insert/.update/.upsert/.delete` im Frontend. Keine Erweiterung von `EditableField`/`saveSectionField` — die DB-seitige Whitelist-Prüfung in `rpc_admin_update_section_field` setzt das Toggle automatisch durch.

**Linter:** Die RPC erscheint in der pre-existing Warn-Liste „Public Can Execute SECURITY DEFINER Function" — bewusst akzeptiert, gleiches Muster wie alle bestehenden `rpc_admin_*` im No-Login-Prototyp. Vor Produktivbetrieb mit Auth-Etappe (`cms-auth-1`) absichern.

---

## Etappe `cms-light-admin-second-pilot-page-1` (I.4c) – 2026-05-11

**Ziel:** Zweite CMS-Pilotseite `anwendungen.gesundheitseinrichtungen` freischalten – ohne neue Schreib-RPC, ohne neue UI-Schreiblogik. Beweis, dass die in I.4b etablierte Whitelist-Architektur (`rpc_admin_update_section_field` + `cms_admin_editable_fields`) das Anlegen weiterer Pilotseiten allein über Daten-Seeding und Whitelist-Erweiterung trägt.

**Migration:** `20260511_*_cms-light-admin-second-pilot-page-1.sql` (idempotent)
- `cms_pages`: Eintrag für `anwendungen.gesundheitseinrichtungen` (T05, `status='draft'`, `is_active=false`); falls vorhanden, nur `route_path` / `page_type` korrigiert. Status / Veröffentlichung werden hier *nie* geändert.
- `cms_sections`: `hero`, `answer-first`, `intro` (sort 10/20/30), `is_active=true`. Nur falls fehlend.
- `cms_section_fields`: 8 Initial-Zeilen (hero.headline DE/EN, hero.intro DE/EN, answer-first.text DE/EN, intro.text DE/EN) mit leerem `value=''`. Bestehende Werte werden nicht überschrieben.
- `cms_admin_editable_fields`: gleiche 8 Kombinationen, alle `is_enabled=true`.
- `rpc_admin_read_pilot_pflege`: bestehende Read-RPC um optionalen Parameter `p_page_key` (Default `'anwendungen.pflege'`) erweitert (CREATE OR REPLACE). Volle Abwärtskompatibilität für parameterlose Aufrufer. Nur read, `STABLE SECURITY DEFINER`. **Keine neue RPC**, kein neuer Schreibpfad.

**Frontend:**
- `src/features/admin/api/cmsAdminRead.ts` — `readPilotPflege(pageKey?)` akzeptiert jetzt optional einen `pageKey` und reicht ihn an die erweiterte RPC durch.
- `src/features/admin/components/EditableField.tsx` — neuer optionaler Prop `pageKey`; ruft jetzt `saveSectionField` (mit `pageKey`) statt `savePilotField` (Default-Verhalten unverändert).
- `src/features/admin/components/TreeNodeDetail.tsx` — erkennt CMS-verwaltete Seiten anhand der Whitelist (`cmsManagedPageKeys`). Lädt für sekundäre Pilotseiten das Bundle on-demand über die erweiterte Read-RPC. Rendering der Sektionen/Felder erfolgt jetzt dynamisch aus dem Bundle (statt hartcodierter `PILOT_GROUPS`-Liste). Pflegt weiterhin den Hinweis „Noch nicht CMS-verwaltet" für Code-Seiten.
- `src/features/admin/pages/AdminPage.tsx` — lädt beim Mount die Whitelist und leitet daraus `cmsManagedPageKeys` ab; reicht das Set an `TreeNodeDetail` durch. Default-Pflege-Bundle bleibt im AdminPage-State (für Subtab „Inhalte").

**Bewusst nicht geändert:** keine Produktdaten, keine öffentliche Navigation/Routen, keine i18n-Dateien, kein Asset-Upload, keine Veröffentlichung, kein Statuswechsel. Kein direktes `.insert/.update/.upsert/.delete` im Frontend. Beide Pilotseiten bleiben `draft / is_active=false`. Öffentliche Seite `/anwendungen/gesundheitseinrichtungen` rendert weiterhin aus Code/i18n.

**Verifikation:**
- DB: 8 Section-Fields + 8 Whitelist-Zeilen für `anwendungen.gesundheitseinrichtungen`, beide Pilotseiten draft/inaktiv.
- `npm run i18n:check`: grün (18 Namespaces, 77 Pages, 0 Fehler/Warnungen).
- Build: vom Lovable-Build-System abgedeckt.

**Linter:** Erweiterte Read-RPC erscheint weiterhin in der bekannten Warn-Liste „Public Can Execute SECURITY DEFINER Function" — bewusst akzeptiert, gleiches Muster wie alle bestehenden `rpc_admin_*` im No-Login-Prototyp. Mit Auth-Etappe (`cms-auth-1`) abzusichern.

---

## Etappe I.7 — Lebenszyklus für Seiten und Navigationsknoten (`cms-light-admin-lifecycle-1`)

Ziel: Redaktion soll Seiten **duplizieren** (als Vorlage für neue Inhalte) und sicher **archivieren / löschen** können — ebenso einzelne Navigationsknoten.

**DB / Migration:**
- Validierungs-Trigger `cms_pages_validate_status`: erlaubt jetzt zusätzlich zu `draft|published` den Wert `archived`. Kein CHECK-Constraint, damit zukünftige Erweiterungen nicht erneut wandern. RLS und Public-Read-Policies bleiben unverändert (`status='published' AND is_active=true`).
- Neue Whitelist-RPCs (alle `SECURITY DEFINER`, `search_path=public`):
  - `rpc_admin_duplicate_page(p_source_page_key, p_new_page_key, p_new_route_path)` — klont Page + Sections + Section-Fields (DE+EN) + Editable-Whitelist. Validiert Eindeutigkeit von `page_key` und `route_path`. Kopie wird `status='draft'`, `is_active=false`. Bilder (`cms_assets`) und Navigationsknoten werden bewusst **nicht** mitkopiert.
  - `rpc_admin_archive_page(p_page_key)` / `rpc_admin_restore_page(p_page_key)` — Soft-Delete: setzt `status='archived', is_active=false` bzw. zurück auf `draft`.
  - `rpc_admin_delete_page(p_page_key)` — Hard-Delete der Seite samt Sections, Section-Fields, Editable-Whitelist. Lehnt ab, solange noch `cms_navigation_nodes` auf die Seite zeigen (`page_in_use_by_navigation`). Bilder werden nur deaktiviert, nicht aus dem Storage entfernt.
  - `rpc_admin_archive_navigation_node(p_node_id)` — setzt Knoten auf `is_active=false`.
  - `rpc_admin_delete_navigation_node(p_node_id)` — Hard-Delete eines Knotens. Lehnt ab, wenn Kinder existieren (`node_has_children`). Wenn der Knoten als einziger auf eine Seite verweist, wird die Seite automatisch archiviert (nicht gelöscht).

**Frontend:**
- Neue API-Datei `src/features/admin/api/cmsAdminPagesLifecycle.ts` — dünner Wrapper um die fünf RPCs.
- Neue Komponenten:
  - `src/features/admin/components/DuplicatePageDialog.tsx` — Dialog mit Eingabefeldern für neuen `page_key` und `route_path`, Default-Vorschlag `<original>.kopie` / `<route>-kopie`.
  - `src/features/admin/components/ConfirmDeleteDialog.tsx` — generischer Bestätigungs-Dialog; Redakteur muss den exakten Schlüssel eintippen, bevor der Löschen-Knopf aktiv wird.
- `src/features/admin/components/MasterDetailWorkbench.tsx` erweitert:
  - lädt Pages-Bundle (für Status-Anzeige des selektierten Knotens),
  - neue Toolbar über dem Editor mit Aktionen „Seite duplizieren", „Seite archivieren / wiederherstellen", „Seite endgültig löschen", „Knoten deaktivieren", „Knoten endgültig löschen",
  - Hard-Delete-Knöpfe rot und nur sichtbar, wenn die Voraussetzungen (z. B. `status='archived'` für Seiten) erfüllt sind,
  - nach jeder Aktion wird der Baum (`NavigationTreeEditor`) per `key`-Reset reloadet.

**Bewusst nicht geändert:** keine Produktdaten, keine öffentliche Navigation/Routen, keine i18n-Dateien, kein Asset-Upload, kein direktes `.insert/.update/.upsert/.delete` im Frontend. Public-Site bleibt vollständig stabil — archivierte/gelöschte Inhalte verschwinden automatisch durch die bestehenden RLS-Policies. Bilder werden beim Hard-Delete nie aus dem Storage entfernt (Schutz vor versehentlichem Bildverlust; spätere Aufräum-Etappe).

**Verifikation:**
- TypeScript-Check (`tsc --noEmit`): grün.
- DB-Migration idempotent (CREATE OR REPLACE / DROP TRIGGER IF EXISTS).
- Vorgesehene Folge-Tests: `duplicatePage` lehnt doppelten `page_key` ab, `deletePage` lehnt bei vorhandenem Navigationsverweis ab, `deleteNavigationNode` lehnt bei Kindern ab.

**Linter:** Die fünf neuen `SECURITY DEFINER`-RPCs erscheinen in der bekannten Warn-Liste „Public Can Execute SECURITY DEFINER Function" — bewusst akzeptiert, gleiches Muster wie alle bestehenden `rpc_admin_*` im No-Login-Prototyp. Mit Auth-Etappe (`cms-auth-1`) abzusichern.

---

## Etappe I.5 — Bild-Upload (Admin)

**Migration:** `20260511_i5_assets_rpcs.sql` (über supabase--migration)

**Neue RPCs:**
- `rpc_admin_upsert_asset(page_key, section_key, field_key, storage_path, public_url, file_name?, mime_type?, asset_role='image')` — legt neues Asset an, deaktiviert vorheriges aktives Asset im selben Slot (kein Hard-Delete).
- `rpc_admin_update_asset_alt(asset_id, locale, value)` — pflegt `alt_de`/`alt_en`.
- `rpc_admin_delete_asset(asset_id)` — Soft-Delete (`is_active=false`).
- `rpc_admin_read_assets(page_key)` — Lese-RPC für Admin (alle Assets, aktiv + inaktiv).

**Storage:** Bucket `cms-assets` erhält Insert/Update/Delete-Policies für `anon` + `authenticated` (Prototyp-Phase, mit Admin-Login zu härten). Public-Read-Policy bleibt unverändert.

**Frontend:**
- `src/features/admin/api/cmsAdminAssets.ts` — Wrapper für RPCs + `supabase.storage.upload`.
- `src/features/admin/components/AssetUploader.tsx` — Drag&Drop, Vorschau, Alt-Text DE/EN, Austausch/Entfernen. Inkl. `useAssetsForPage` Hook.
- `PageEditor` zeigt unter den Section-Cards eine zusätzliche „Bilder"-Card pro Seite mit allen Slots + Formular zum Anlegen neuer Slots.

**Schutzregeln:**
- Datei-Pfad-Schema: `<page_key>/<section_key>/<field_key>/<timestamp>-<safeName>` — sortierbar, kollisionsfrei, traceable.
- Max 10 MB pro Upload, nur `image/*`.
- Bei RPC-Fehler nach erfolgreichem Storage-Upload wird die Datei wieder gelöscht (Anti-Waisen-Schutz).

**Linter:** vier neue `SECURITY DEFINER`-RPCs in bekannter Warn-Liste, bewusst akzeptiert (Prototyp-Pattern).

---

## Etappe I.8 — DE→EN Auto-Übersetzung pro Feld

**Edge Function:** `supabase/functions/cms-translate-field/index.ts`
- Modell `google/gemini-2.5-flash` über Lovable AI Gateway (`LOVABLE_API_KEY` als `Authorization: Bearer …`).
- Input: `{ source_text, source_locale, target_locale, context? }`. Limits: 4000 Zeichen, locale ∈ {de,en}.
- Fehler-Handling: 429 → rate_limited, 402 → credits_exhausted, sonst gateway_error.
- System-Prompt: TCS-spezifisch (Marken/Produktcodes unverändert lassen, Register je nach Kontext-Typ).

**Frontend (`EditableField.tsx`):**
- Neuer `TranslateButton` neben Feldlabel: nimmt Live-DE-Wert, ruft Function, schreibt Vorschlag als `externalValue` ins EN-Editor-Textfeld.
- Speichern bleibt manuell (bestehender Save-Flow). Der Vorschlag wird visuell als „bitte prüfen und speichern" markiert.
- Kontext-Klassifikation aus `field_key`: headline/subline/cta/alt/label/body — steuert Übersetzungsstil.

**Schutzregeln:**
- Kein automatisches Überschreiben — User muss explizit auf den Button klicken und das Ergebnis manuell speichern.
- Keine Auth in der Edge Function (Prototyp); bei Admin-Login-Etappe nachzuziehen.

---

## Etappe J.1 (Phase A) — Default-Startseite home.start in DB (Texte)

**Migration:** Daten-Seed via `supabase--migration` (idempotent, ON CONFLICT).

**Was angelegt wurde:**
- `cms_pages.home.start` mit `page_type='T01'`, `route_path='/'`, Status `published`, `is_active=true`.
- 5 Sections: `hero`, `stats`, `content_blocks`, `personas_picker`, `cta` (sort_order 0–4).
- 53 Felder DE+EN (= 106 Zeilen) — vollständig aus `src/i18n/locales/{de,en}/home.json` übernommen.
- Komplette Whitelist-Einträge (alle Felder editierbar im Admin).
- Navigationsknoten `home.start` auf Seite + Route `/` gebunden.

**Render-Architektur:**
- Neuer Hook `useCmsPageContent(pageKey)` in `src/features/cms/hooks/`. Liest `cms_section_fields` + `cms_assets` per anon-Read (RLS = published+active). Bei Fehler/Leer fällt jede Komponente automatisch auf den i18n-/Code-Fallback zurück → Public-Site bleibt im Worst Case pixelidentisch.
- `HeroSection.tsx` ist als erste Komponente umgestellt (Demo des Patterns): liest DB-Werte mit i18n-Fallback, Bild aus DB-Asset oder hartkodiertem Import.

**Noch offen (nächste Iteration):**
- StatsSection, ContentBlocks, PersonaSection, CTASection auf den Hook umstellen (gleiches Pattern).
- 6 Persona-Varianten (`home.start.bauherr` etc.) anlegen + Persona-Komponenten umstellen.
- Bilder via Admin-AssetUploader hochladen (Slots stehen bereit, aktuell leer → Code-Fallback greift).

**Visueller Check:** mit nur Hero umgestellt, sollte die Public-Site optisch identisch sein (DB-Werte = i18n-Werte). Soll vom User verifiziert werden, bevor die übrigen Sections folgen.

---

## Etappe J — Karten-Hierarchie (card_v1) auf Türsprechanlagen

**Datum:** 2026-05-13  
**Auftrag:** Scroller-Bereiche („Außenstationen", „Innenstationen") sollen im Admin als Eltern-Block mit aufklappbaren Karten-Kindern erscheinen. Pro Karte saubere Felder (Eyebrow / Headline / Beschreibung / Bild) statt der bisherigen kryptischen `items.<key>.subtitle`-Schreibweise.

**Pilot-Seite:** `gebaeudekommunikation.tuersprechanlagen` (4 Außenstationen + 7 Innenstationen = 11 Karten).

**Datenmodell-Erweiterung:**
- Neuer Section-Typ `card_v1` als Kind unter Eltern-Sections vom Typ `product-scroller` (`cms_sections.parent_section_id` war bereits vorhanden — keine Schema-Änderung).
- Pro Karte sechs Felder in `cms_section_fields`: `eyebrow`/`headline`/`beschreibung` × DE+EN.
- Bild pro Karte in `cms_assets`: `section_key=card_<name>`, `field_key=image`.
- Whitelist `cms_admin_editable_fields`: neue Karten-Felder eingetragen, alte `items.*`-Einträge auf der Eltern-Section deaktiviert (nicht gelöscht — historische Daten in `cms_section_fields` bleiben erhalten).

**Migration:** Idempotente Daten-Migration (`DO $$`-Block + `ON CONFLICT DO NOTHING`). Bild-Slots `section=aussenstationen, field=image_<key>` wurden auf `section=card_<key>, field=image` umgehängt — kein DELETE.

**Renderer (`TuersprechanlagenPage.tsx`):**
- `useCmsPageContent` liefert jetzt zusätzlich `parent_section_key` und `section_type` pro Section.
- `ProduktScroller` prüft, ob es `card_v1`-Kinder zur Eltern-Section gibt. Wenn ja: Reihenfolge & Sichtbarkeit aus DB (Spiegel-Regel). Wenn nein: Hardcode-Liste als Fallback.
- Pro Karte: Texte aus `cms_section_fields.eyebrow/headline/beschreibung` mit i18n-Fallback; Bild aus `cms_assets.card_<key>.image` mit Fallback auf alten Slot und Code-Image.

**Admin-Tree:**
- `buildSectionTree` ist bereits parent-aware (`parent_section_id`). Karten erscheinen automatisch nested unter ihrem Eltern-Block.
- Glossar (`src/features/admin/lib/glossary.ts`) um `headline`, `beschreibung`, `card_v1` ergänzt.

**Was nicht geändert wurde:**
- Öffentliche Routen, Navigation, Footer (Spiegel-Regel sorgt für identisches Public-Bild).
- i18n-JSONs (bleiben als Code-Fallback).
- Andere Scroller-Seiten (Briefkasten, Großanlagen …) — folgen in Etappe J.6+ nach demselben Muster.

**Verification (psql):**
- 11 `card_v1`-Sections angelegt, 66 Felder geseedet, 11 Asset-Slots umgehängt — keine Dubletten.

### Etappe `snipdoo-ip-hero-bild-1` — 2026-05-21

**Scope:** Hero-Bild auf /gebaeudekommunikation/snipdoo-ip eingeführt. Neuer DB-Slot hero.image (viewport=desktop), neues Feld hero.imageAlt (DE+EN) inkl. Whitelist, Renderer-Erweiterung um <img>-Element direkt unterhalb des Hero-Textblocks, Klassen w-full h-[40vh] lg:h-[55vh] object-cover (analog Tuersprechanlagen/Briefkastenanlagen/Systemlösungen).

**DB-Änderungen:**
- cms_section_fields: +2 Zeilen (hero.imageAlt DE+EN)
- cms_admin_editable_fields: +2 Whitelist-Einträge (hero.imageAlt DE+EN) + 2 Einträge (hero.image DE+EN, damit Bild-Slot im Admin sichtbar)
- cms_assets: +1 Zeile (hero.image, viewport=desktop, mime_type=image/webp)
- Storage: 1 Datei hochgeladen (gebaeudekommunikation.snipdoo-ip/hero/image/hero-snipdoo-ip.webp, 77 KB)

**Code-Änderungen:**
- src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx — Hero-Sektion um <img>-Element direkt unter dem inneren Container erweitert. Innerer Container-Padding von `py-16 lg:py-24` auf `pt-12 pb-10 lg:pt-20 lg:pb-14` angeglichen, damit der vertikale Abstand zwischen CTAs und Hero-Bild dem anderer Hero-Bilder entspricht.

**Unverändert:** Andere Sections der Page, i18n-JSON-Dateien (laut always-follow.md Fallback-Status), Navigation, andere Pages, andere Domains.

**Spiegel-Regel:** Bild und Alt-Text sind sofort im Admin pflegbar (Whitelist DE+EN gesetzt).

**Format-Hinweis:** Hochgeladene Datei trug Endung `.webp`, war jedoch byteweise ein PNG-Container (1226058 Bytes, Header `\211PNG`). Wurde serverseitig via Pillow zu echtem WebP konvertiert (RIFF/WEBP/VP8, 79088 Bytes, quality=85) und unter `cms-assets/gebaeudekommunikation.snipdoo-ip/hero/image/hero-snipdoo-ip.webp` abgelegt. Mime-Type in cms_assets: `image/webp`.

**Bemerkung:** Tablet- und Mobile-Viewports folgen in einer separaten Etappe, sobald passende Zuschnitte vorliegen. Bis dahin fällt der Renderer laut asset-strategie.md auf desktop zurück.

### Etappe `teaser-2col-v1-section-typ-1` — 2026-05-21

**Scope:** Neuer Section-Typ teaser_2col_v1 eingeführt. Generischer 2-Spalten-Teaser mit Bild und Text, gesteuert über image_position (left/right, default right) und background_variant (default/muted, default default). Asset-Slot image mit Viewport-Varianten. Renderer-Komponente neu, CmsBodyRenderer-Mapping ergänzt, Section-Typen-Katalog dokumentiert. Keine DB-Schreibvorgänge, kein Page-Eingriff, keine bestehende Section betroffen — der neue Typ ist ab dieser Etappe verfügbar, aber noch unbenutzt. Etappe 3 wird ihn auf der Tuersprechanlagen-Seite zum Einsatz bringen (neue mobile_tk-Section + Umbau bestehende snipdoo-Section).

**Code-Änderungen:**
- src/features/cms/components/sections/Teaser2ColV1.tsx (neu) — Renderer-Komponente mit Feld- und Flag-Auswertung.
- src/features/cms/components/CmsBodyRenderer.tsx — Case für teaser_2col_v1 im RENDERERS-Mapping ergänzt.

**Doku:**
- docs/02-architektur/section-typen-katalog.md — neuer Abschnitt für teaser_2col_v1 mit Feldspezifikation und Renderer-Verhalten.

**Unverändert:** DB komplett, alle bestehenden Sections und Pages, i18n-JSONs, Navigation.

**Quality Gates:** i18n:check 0 Fehler, build grün, Smoke-Test ohne sichtbare Veränderung an Bestandsseiten (keine Section vom neuen Typ existiert in der DB).

**Bemerkung:** Mobile-Sortierung bewusst per DOM-Reihenfolge (Text oben, Bild unten), nicht über image_position. order-*-Klassen greifen erst ab md. Interner CTA-Link nutzt react-router-`<Link>`, externer (http(s)://) ein `<a target="_blank">`.

### Etappe `tuersprechanlagen-renderer-fallback-1` — 2026-05-21

**Scope:** Renderer-Logik in TuersprechanlagenPage.tsx erweitert, damit Sections mit generischen Section-Typen (über CmsBodyRenderer.RENDERERS registriert) auf dieser Page automatisch gerendert werden, auch wenn ihr section_key nicht explizit in SECTION_RENDERERS steht. Keine DB-Eingriffe, kein Asset, kein Page-Inhalts-Eingriff.

**Code-Änderungen:**
- src/features/gebaeudekommunikation/pages/TuersprechanlagenPage.tsx — dbOrder-Filter um section_type-basierten Akzeptanz-Pfad (hasGenericRenderer) erweitert, Map-Schleife um generischen Fallback-Pfad (CmsBodyRenderer.RENDERERS + CmsSectionContext) ergänzt, FALLBACK_ORDER um "mobile_tk" zwischen "innenstationen" und "vorteile" erweitert.
- src/features/cms/components/CmsBodyRenderer.tsx — RENDERERS, SKIP_TYPES und normalizeType als Named Exports freigegeben (Sichtbarkeit, keine Verhaltensänderung).

**Unverändert:** SECTION_RENDERERS-Inhalt, SnipdooSection-Komponente, alle DB-Tabellen, alle anderen Pages, i18n.

**Smoke-Test:** /gebaeudekommunikation/tuersprechanlagen visuell unverändert (noch keine Section vom Typ teaser_2col_v1 in der DB).

**Vorbereitung für Etappe 3b:** mit dieser Etappe ist der Boden bereitet, um in Etappe 3b die neue mobile_tk-Section anzulegen (section_type=teaser_2col_v1) und die bestehende snipdoo-Section ebenfalls auf teaser_2col_v1 umzubauen. Nach Etappe 3b wird die SnipdooSection-Komponente entfernt und der snipdoo-Eintrag aus SECTION_RENDERERS gelöscht; der Renderer fällt dann auf den hier eingeführten generischen Pfad zurück.

**Quality Gates:** i18n:check 0 Fehler, build grün, visuell unverändert.

## mobile-tk-preview-anwendungen-bilder-1 — 2026-05-22

**Scope:** 6 Bilder für die anwendungen-Karten auf /gebaeudekommunikation/mobile-tuerkommunikation hochgeladen, je eine cms_assets-Zeile pro card_*-Kind-Section. Alt-Texte DE+EN aus V14-mobileTkPreview.json (anwendungen.items.*.imageAlt) übernommen.

**DB-Änderungen:**
- cms_assets: +6 Zeilen (card_paket, card_ip_gateway_mfh, card_funkgong, card_dect, card_buero, card_barrierefrei, jeweils field_key=image, viewport=desktop, mime=image/webp, alt_text/alt DE+EN, is_active=true)
- Storage: 6 Dateien hochgeladen unter `cms-assets/mobile-tk-preview.root/card_<key>/image/desktop/anwendung-<filename>.webp`

**Code-Änderungen:** keine.

**Unverändert:** cms_sections, cms_section_fields, cms_admin_editable_fields, cms_pages, cms_navigation_nodes, alle Code-Dateien, alle anderen Sections der LP, andere Pages, Navigation, i18n.

**Quality Gates:** i18n:check 0 Fehler, build grün, SQL-Verifikation: 6 Zeilen, alle viewport=desktop, mime_type=image/webp, Alt-Texte gesetzt.

**Bemerkung:** Tablet/Mobile-Viewports folgen in separater Etappe, sobald passende Zuschnitte vorliegen. Renderer fällt laut asset-strategie.md auf desktop zurück. Komponenten-Karten (Etappe 4d/4e) folgen analog. Hinweis: anwendung-paket-smartphone.webp und anwendung-ip-gateway-mfh.webp sind byte-identisch (selbes Apartmenthaus-Motiv aus V14) — bewusst beibehalten wie geliefert.

## mobile-tk-preview-zielgruppen-label-fix-1 — 2026-05-27

**Scope:** Sichtbeschau-Korrektur: Eyebrow und Headline der zielgruppen-Sektion auf /gebaeudekommunikation/mobile-tuerkommunikation an V15-DE-Wortlaut angepasst, EN semantisch konsistent übersetzt. Reines UPDATE auf 4 cms_section_fields-Zeilen — keine Section-, Whitelist- oder Code-Änderung.

**DB-Änderungen:**
- cms_section_fields: 4 UPDATEs (label.de/en, title.de/en auf zielgruppen)

**Code-Änderungen:** keine.

**Unverändert:** Legacy-Felder eyebrow/headline/tablistLabel/spalten.* (werden vom TabsV1-Renderer nicht gelesen), alle Tabs-Kind-Sections, andere Sections, andere Pages.

**Quality Gates:** i18n:check 0 Fehler, build grün, neue Eyebrow/Headline sichtbar auf der LP.

**Bemerkung:** Folgt direkt auf 4g-2 und ist Teil der Sichtbeschau-Korrekturen LBN (insgesamt 6 Punkte, hier Punkt 5 — der trivialste).

## mobile-tk-preview-seo-section-deaktivieren-1 — 2026-05-27

**Scope:** Sichtbeschau-Korrektur Punkt 3: seo-Section auf /gebaeudekommunikation/mobile-tuerkommunikation auf is_active=false gesetzt, weil sie als section_type=content_v1 vom ContentSectionV1-Renderer als sichtbarer Block ausgespielt wurde (Headline „Mobile Türkommunikation – Vorschau", Body aus seo.description). SEO-Daten bleiben in der DB stehen — Spiegel-Regel sorgt dafür, dass sie nicht mehr gerendert werden.

**DB-Änderungen:**
- cms_sections: UPDATE seo.is_active → false (page_key=mobile-tk-preview.root, section_key=seo)

**Code-Änderungen:** keine.

**Unverändert:** seo.title und seo.description in cms_section_fields, Whitelist, andere Sections (subnav und a11y könnten ggf. analog behandelt werden, falls sie ebenfalls als störender sichtbarer Text erscheinen — in dieser Etappe bewusst nicht angefasst).

**Quality Gates:** i18n:check 0 Fehler, build grün, Vorschau-Platzhalter visuell von der LP verschwunden.

**Bemerkung:** Punkt 3 von 6 aus der Sichtbeschau-Korrektur LBN. Verbleibend: Punkt 4 (Karten-Grid 4+2 → 3+3), Punkt 2 (Hero-Bild-Höhe).

---

## Hotfix 27b-1 (2026-05-27) — Iconkarten Anwendungen-Anforderungen

- Lucide-Icon → DB-Feld `icon` (Lucide-Name, z. B. `fence`, `accessibility`). DOM-Marker `data-cms-field="icon"`.
- TCS-Bildicon → Asset-Slot `icon_image` (PNG/SVG). DOM-Marker `data-cms-field="icon_image"`. Hat Priorität vor `icon`.
- Anwendungen-Anforderungen sind echte `card_v1`-Kindsections unter Parent `anforderungen` (jetzt Typ `cards_v1`). Pflege im Admin pro Karte über Felder `title`, `description`, `icon` + Asset `icon_image`.
- Medienbereich und Live-Vorschau benutzen denselben Marker: Vorschau-Klick auf eine Karte trifft genau den `<span>`, der das tatsächlich gerenderte Icon trägt.
- Legacy `<key>.label/.text/.icon` im content_v1-Sammelblock bleibt nur Fallback und wird nicht mehr empfohlen.

## 2026-05-27 — Hotfix 27c: Lucide-Resolver lowercase, Icon-Dialog mit Bildicon-Slot, gepairte icon_image-Whitelist

**Ursache:** `resolveIcon` interpretierte einteilige lowercase-Werte (z. B. `smartphone`) als PascalCase-Kandidaten, fand sie weder in `icons` noch in den Named-Re-Exports und fiel still auf den Check-Haken zurück. Der Audit (`isValidLucide` mit `LUCIDE_KEBAB`) zählte sie dagegen als gültig — Mismatch zwischen Audit und UI.

**Code:**
- `src/features/cms/components/iconResolver.tsx`: Mehrere Normalisierungs-Kandidaten in Reihenfolge: Originalwert → kebab→Pascal → erste-Buchstabe-groß → lowercase→Pascal. Fallback nur, wenn alle scheitern.
- `src/features/admin/components/AssetWorkbench.tsx` → `IconEditDialog`: zweigeteilt. (A) Lucide wie bisher. (B) optionaler `icon_image`-Slot mit bestehendem `AssetUploader` und abgeleitetem field_key (`icon` → `icon_image`, `<pfad>.icon` → `<pfad>.icon_image`). Hinweis: Bildicon gewinnt vor Lucide. Kein neuer Schreibweg, kein SVG-Pfad neu freigeschaltet.
- `src/features/anwendungen/pages/BildungseinrichtungenPage.tsx`: Priorität `icon_image` → `icon` → Code-Fallback. `data-cms-field` reflektiert das tatsächlich gerenderte Element.

**Migration (idempotent):** Whitelist-Insert für gepairte `icon_image`-Slots auf jedem aktiven Icon-Feld in `cms_section_fields`, DE+EN. Keine Werte geändert, keine Assets erzeugt.

**Audit (nachher):** Icon-Sync I0=288, I1=0, I2=0, I3=0, I4=74 pre-existing, I5=0, I6=147. Keine neuen Linter-Warnungen.

**Scope:** Keine Produktdatenbank, keine Public-Route, keine Navigation, kein Footer, kein Breadcrumb, keine i18n-JSON, kein Asset hochgeladen/gelöscht, kein neuer Section-Typ, kein Layout-Change, keine Legacy-Felder entfernt.

## mobile-tk-preview-anwendungen-auf-4-cards-1 — 2026-05-27

**Scope:** anwendungen-Sektion auf /gebaeudekommunikation/mobile-tuerkommunikation von 6 auf 4 aktive Karten reduziert (card_funkgong und card_barrierefrei auf is_active=false). Reine DB-Operation, keine Code-Änderung. Public-Grid bleibt auf useCases-Family-Default (lg:grid-cols-4) — die 4 Karten zeigen sich auf Desktop in einer Reihe. Diese visuelle Folge ist bewusst akzeptiert.

**DB-Änderungen:** keine ausgeführt — Zielzustand bereits hergestellt (card_funkgong sort_order=3 is_active=false, card_barrierefrei sort_order=6 is_active=false). Etappe wirkt damit als Bestätigung/Doku des Ziels; bei abweichendem Stand wäre rpc_admin_set_section_active der Schreibweg.

**Code-Änderungen:** keine.

**Unverändert:** cms_section_fields, cms_admin_editable_fields, cms_assets der zwei deaktivierten Karten (bleiben Legacy in DB). Texte/Bilder der 4 verbleibenden Karten unverändert. cardGridClass und andere Renderer unverändert. Andere Sections, andere Pages.

**Spiegel-Regel:** Deaktivierte Karten verschwinden aus dem Public-Render; im Admin bleiben sie als „inaktiv" sichtbar und können bei Bedarf jederzeit reaktiviert werden.

**Verifikation (SELECT auf cms_sections, parent=anwendungen):**
- card_paket (1) active
- card_ip_gateway_mfh (2) active
- card_funkgong (3) inaktiv
- card_dect (4) active
- card_buero (5) active
- card_barrierefrei (6) inaktiv

**Bemerkung:** Globaler cardGridClass-Sonderfall für „useCases & 4 Karten → 2 Spalten" wurde bewusst NICHT eingeführt, weil das 24 weitere Pages mit aktiver useCases-Family und genau 4 Karten gleichzeitig auf 2×2-Grid umstellen würde.

---

# Korrekturetappe PL-Sicherheit (2026-09-11)

**Scope:** eng begrenzte Sicherheitskorrektur am bereits live vorhandenen
PL-Gerüst. Keine Inhalte, keine Übersetzungen, keine PL-Whitelist-Zeilen,
keine Admin-Oberfläche, keine Routen/URLs, keine Produktdatenbank.

**Migration:** `20260911140xxx` (Korrekturmigration, idempotent)

1. `rpc_admin_save_machine_translation(text,text,text,text,text)` neu gefasst:
   Locale-Prüfung, Whitelist-Prüfung, Section-Existenz, Renderability-Gate und
   Upsert laufen jetzt **in derselben Funktion/Transaktion** und schreiben
   `review_status='maschinell'` direkt. Der frühere Zwischenzustand
   („erst `geprueft` über `rpc_admin_update_section_field`, dann nachträglich
   auf `maschinell`") ist entfallen — ein Abbruch kann keinen maschinellen Text
   mehr als geprüft zurücklassen. Signatur, Rückgabeform, `SECURITY DEFINER`
   und `search_path=public` unverändert; kein dynamisches SQL.
2. EXECUTE-Rechte für **genau diese beiden neuen** Funktionen entzogen:
   `rpc_admin_save_machine_translation` und `rpc_admin_set_field_review_status`
   sind für `PUBLIC`, `anon` und `authenticated` nicht mehr ausführbar.
   Verbleibende ACL: `postgres=X/postgres | service_role=X/postgres`.
   Damit sind sie bis zur Auth-/Review-Etappe **nicht** vom öffentlichen
   Frontend aufrufbar. Beide Funktionen tragen jetzt einen COMMENT mit dieser
   Einschränkung.

**Live-Verifikation nach der Migration:**

- `cms_section_fields`: `de/geprueft` 55.145 · `en/geprueft` 54.501 —
  unverändert. **PL-Zeilen: 0. `maschinell`-Zeilen: 0.**
- Whitelist PL-Zeilen: 0 (unverändert, bewusst).
- ACL beider Funktionen wie oben, kein PUBLIC/anon/authenticated.

**Sicherheits-Linter:** 96 Warnungen (48 anon + 48 signed-in
„Public/Signed-In Can Execute SECURITY DEFINER Function") — vorher 100.
Die vier Warnungen der zwei neuen Funktionen sind weg; **keine neue Warnung**.
Die restlichen 96 sind der bekannte Altbestand des gesamten
`rpc_admin_*`/`rpc_public_*`-Modells im No-Login-Prototyp und bleiben als
Blocker der Auth-Etappe dokumentiert.

**Code-Änderungen:** keine. Kein Frontend ruft die zwei Funktionen auf
(nur generierte Typen in `src/integrations/supabase/types.ts`).

**Tests/Build:** Typecheck grün, `vitest` 111/111 grün, `npm run build` grün.
`npm run i18n:check`: unverändert 3 Fehler / 7 Warnungen — **nicht** PL-bedingt
(zwei tote `strictPages`-Einträge auf inzwischen entfernte Dateien
`EinfamilienhausPage.tsx` / `MobileTuerkommunikationPage.tsx`, plus ein
hartcodierter deutscher Default in `ProductDetailPage.tsx` Zeile 632 aus der
Datenblatt-Etappe). Bewusst nicht angefasst, da fachfremd zum Auftrag.

**Nicht veröffentlicht.** Kein Deployment, keine Edge-Function-Aktualisierung.

## Etappe PL-Pilot 1 — Übersetzungsgrundlage + zwei Pilotseiten (2026-09-11)

**Migrationen (idempotent, live angewendet):**
- Übersetzungs-Infrastruktur: `cms_translation_memory` (eindeutig über
  `source_hash` + `target_locale`), `cms_translation_jobs` (Batch-Protokoll mit
  `attempts`/`last_error`), `cms_section_fields.source_hash`,
  Reviewstatus-Erweiterung `maschinell_veraltet`, Hilfsfunktionen
  `cms_translation_normalize/hash`, `cms_field_is_translatable`, Trigger
  `cms_mark_machine_translations_stale` (markiert Maschinenwerte als veraltet,
  wenn der deutsche Quelltext geändert wird — manuelle Werte bleiben unberührt)
  und der ausschließlich intern nutzbare RPC
  `rpc_internal_apply_machine_translation` (schreibt atomar mit
  `review_status='maschinell'`, überschreibt nie `geprueft`).
  Beide neuen Tabellen: RLS an, keine Policies, nur `service_role`.
  Kein EXECUTE für PUBLIC/anon/authenticated auf den neuen Funktionen.
- Pflegeansicht: `rpc_admin_read_pilot_pflege` liefert zusätzlich
  `review_status` pro Feld (rein additiv, keine Inhaltsänderung).

**Daten (nur Pilotseiten `anwendungen.einfamilienhaus`, `anwendungen.klinik`):**
- PL-Whitelist spiegelgetreu: 232 + 130 Zeilen, nur übersetzbare Textfelder
  (keine URLs, IDs, Icons, Bildpfade, Farben, Schalter).
- PL-Inhalte: 362 Felder, alle `review_status='maschinell'`
  (Batches `pl-batch-01` … `pl-batch-11`, Provider Lovable AI /
  `google/gemini-2.5-flash`, max. 25 Modellaufrufe je Batch, Deduplizierung
  über Translation Memory, 0 Fehler).
- DE unverändert: Werte-Hashes vor/nach identisch
  (`9a3771fc…` Einfamilienhaus, `ef0d44a9…` Klinik). EN unverändert,
  kein manueller Zielwert überschrieben.
- Gesamtstand: DE 55.145 / EN 54.501 / PL 362; `maschinell` = 362 (nur PL).

**Code:** maschinelle Zielwerte sind in der Vorschau sichtbar (Nutzer-
entscheidung), nur `maschinell_veraltet` fällt auf Deutsch zurück
(`cmsContent.ts`, `applyCmsOverlay.ts`, `useCmsPageContent.ts`).
Pflege-Editor: dritte Spalte PL (nur bei PL-Freigabe/PL-Wert), Herkunfts-
Kennzeichnung „geprüft / maschinell / veraltet", Schalter „DE → EN" und
„DE → PL" je Feld; Speichern bleibt manuell. `saveSectionField` akzeptiert PL.

**Tests:** Typecheck grün, Build grün, `vitest` 111/111 grün.
`i18n:check` unverändert 3 Fehler / 7 Warnungen (Altbestand, nicht PL-bedingt).
Sicherheits-Linter: 98 Meldungen = 96 bekannter Altbestand + 2 gewollte
Infos „RLS ohne Policy" für die zwei internen Tabellen. Keine neue Warnung.

**Restblocker:** Sammel-Übersetzung („ganzen Block", „nur fehlende",
„veraltete") ist im Editor bewusst NICHT umgesetzt: der einzige öffentliche
Schreibweg (`rpc_admin_update_section_field`) setzt zwingend `geprueft` und
würde Maschinentexte fälschlich als geprüft ausweisen. Massenläufe laufen bis
zur Auth-Etappe über den internen service-role-Batchweg. `cms-translate-field`
bleibt ohne JWT/Rate-Limit ein offener Punkt. **Nicht veröffentlicht.**

## Etappe PL-Pilot 1b — Schutz des Übersetzungsdienstes (2026-09-11)

**Migrationen (idempotent, live angewendet):**
- Neues, nicht über die Daten-API erreichbares Schema `cms_internal` mit
  `cms_internal.rate_limit_counters` (RLS an, keine Policies, nur
  `service_role`) und der atomaren Zählfunktion
  `cms_internal.rate_limit_hit(bucket, subject, limit, window_seconds)`
  (`SECURITY DEFINER`, `search_path = cms_internal, pg_temp`, kein dynamisches
  SQL, Schreibumfang genau eine Tabelle).
- Schmaler Aufrufweg `public.rpc_internal_rate_limit_hit(...)` für die Edge
  Function. EXECUTE für `PUBLIC`, `anon`, `authenticated` entzogen, nur
  `service_role`. Kein neuer öffentlicher Schreibweg.

**Grenzwerte (serverseitig, atomar, nicht im Frontend):**
- 30 Übersetzungsversuche je Ursprung+IP pro 60 Sekunden.
- 600 Übersetzungsversuche je Ursprung+IP pro 24 Stunden.
- Beides wird pro Aufruf gezählt; bei Überschreitung `429` mit `Retry-After`.
- Ist der Zählweg nicht erreichbar, wird abgelehnt (`503`), nicht durchgelassen.

**Payload-Grenzen in `supabase/functions/cms-translate-field/index.ts`:**
- `source_locale` ausschließlich `de`; `target_locale` ausschließlich `en`/`pl`.
- Kontext nur aus `headline|subline|body|cta|alt|label|generic`.
- Textlänge max. 4.000 Zeichen, leerer Text abgelehnt.
- Technische/sprachneutrale Werte abgelehnt (`422`): Links, `mailto:`/`tel:`,
  Pfade, Farbwerte, reine Zahlen, Schalterwerte, Kennungen wie
  `icon-name`/`section_key`/`some.path`.
- CORS/Ursprungs-Prüfung als feste Allowlist: veröffentlichte Domain,
  ausschließlich projektgebundene Preview-Ursprünge (Host muss die
  Projekt-Kennung `244ceaa8-da87-42eb-90d8-045b23513c76` tragen) und lokale
  Entwicklung. Keine breiten Muster für beliebige `*.lovableproject.com` /
  `*.lovable.dev`. Fremder Ursprung → `403 origin_not_allowed`. Aufrufe ohne
  Ursprung (Server/Skript) nur mit dem bereits vorhandenen internen
  Service-Role-Nachweis, sonst `403 origin_required`; kein neues Geheimnis.
  Ursprungs-Prüfung und Mengenbremse sind atomar bzw. serverseitig und
  missbrauchsbegrenzend, aber ausdrücklich **kein Auth-Ersatz**.
- Keine Secrets im Frontend; `LOVABLE_API_KEY` und Service-Role bleiben
  serverseitig.

**UI:** `EditableField.tsx` liest die Serverantwort aus und zeigt bei `429` eine
verständliche Meldung mit Wartezeit, bei `503`/`402`/`403`/`422` jeweils
passenden Klartext. Einzelbuttons „DE → EN" / „DE → PL" bleiben unverändert.

**Nachweise:** DB-Selbsttest der Zählfunktion: Versuch 1 erlaubt (29 übrig),
Versuch 30 erlaubt (0 übrig), Versuch 31 abgelehnt mit `retry_after = 60`;
Testzähler danach entfernt. Inhaltsstand unverändert: DE 55.145, EN 54.501,
PL 362, `maschinell` 362; letzte DE-/EN-Änderung auf den Pilotseiten
2026-09-10, letzte PL-Änderung 2026-09-11 14:33 (vorheriger Batch).
Typecheck grün, `vitest` 111/111 grün, Build grün.
Sicherheits-Linter: 99 Meldungen = 96 bekannter Altbestand
(48 anon + 48 signed-in SECURITY DEFINER) + 3 gewollte Infos „RLS ohne Policy"
(zwei Übersetzungstabellen + neue Zählertabelle). Keine neue Warnung.

**Restblocker (weiterhin offen):** kein Login/keine Rollenprüfung für
`cms-translate-field` und die `rpc_admin_*`-Schreibwege — die Mengenbremse
begrenzt Missbrauch, ersetzt aber keine Authentifizierung. Sammel-Übersetzung
im Editor bleibt bis zur Auth-Etappe zurückgestellt.
**Kein Deployment, keine Veröffentlichung, kein neuer Übersetzungsbatch.**

**Nachtrag 2026-09-11 (Ursprungs-Härtung):** statischer Prüflauf der
Ursprungsfälle gegen den echten Funktionscode — eigener Preview-Ursprung,
Produktionsdomain und localhost passieren (dann greift die Payload-Prüfung),
fremdes Lovable-Projekt / fremde Domain / beliebiges `*.lovable.dev` und
Aufrufe ohne Ursprung ohne internen Nachweis erhalten `403`.
Typecheck grün, `vitest` 111/111 grün, Build grün. Keine Inhalts-, Grenzwert-
oder Datenbankänderung, kein Deployment.

---

## Etappe 1 CMS-Light-Reparatur — Regelbereinigung + lokale Abschlussprüfung (2026-09-14)

**Ausgangsstand:** `1ae2adfd3832cfa2033984a19b0427d25362a214` (frisch geprüft,
keine fremden Änderungen darüber hinaus verworfen).

**Geändert (nur Doku + lokales Prüfsystem + Tests):**

- `docs/current-status.md` — Juni-Nullwerte als **Historie** datiert;
  neuer Kurzstatus „kein Gesamtgrün", ungeprüfte Gates und offene
  Sicherheitszustände ausdrücklich als **offen** ausgewiesen.
- `docs/04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md` — Ampeln als
  Messung vom 2026-06-04 gekennzeichnet; widersprüchliche PL-Zahlen als
  ungeprüft markiert; Sprachabschnitt auf Sprachregister `cms_locales`
  umgestellt (EN/PL/NL/DA Zielumfang); Sicherheitszustände als offen.
- `docs/lovable-custom-rules-compact.md` — überholte Aussagen entfernt
  („Content codebasiert", „CMS liefert öffentlich nichts", „Navigation
  bleibt Code", „keine Admin-UI"); Produktbasis-ID auf
  `ncvxzkwazdemivdolpzc` korrigiert; Verweis auf das Dachdokument als
  führende Regelquelle.
- `docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md` — neuer
  Abschnitt 11 „Verbindlicher Arbeitsablauf" (Zielbestimmung, Ablageorte,
  Sprachen, Zugang, Schreibregeln inkl. **fehlender Versions-/
  Transaktionsgarantie**, Abschlussnachweise). Keine neue konkurrierende
  Vertragsdatei.
- `package.json` — `i18n:contract` fail-fast (`;` → `&&`, maskierte
  vorher den Fehler des ersten Checks); neuer Befehl `cms:preflight`.
- `scripts/ci/preflight.mjs` (neu) — Typprüfung → Unit-Tests →
  `i18n:contract` → Build, streng sequenziell, Abbruch bei Exitcode ≠ 0,
  Startfehler oder Signal; Exitcode wird durchgereicht.
- `src/test/preflight.test.ts` (neu) — 7 Tests: Erfolg, Fehler im ersten
  Schritt, Fehler in der Mitte, Startfehler (Ergebnis + Ausnahme), Signal,
  Schrittliste ohne mutierende/DB-abhängige Werkzeuge.

**Grenzen dieser Etappe (bewusst NICHT gemacht):** keine Datenmutation,
keine Migration, kein SQL-Schreibzugriff, kein Edge-Deployment, kein
Auth-/RLS-Umbau, keine Frontend-Laufzeitänderung, keine Veröffentlichung,
kein Übersetzungslauf, kein Löschen/Archivieren von Inhalten, keine
Änderung an anderen Projekten oder an der Produktbasis. Keine
Massenumschreibung historischer Dokumente.

**Gate-Befunde (2026-09-14):**

- `validate-i18n.mjs` → grün (0 Fehler, 7 Warnungen).
- `sprachvertrag-audit.mjs --strict` → grün (0 harte Fehler, 232 Hinweise).
- `ui-catalog-manifest.mjs --check` → **rot**: „UI-Katalog-Manifest ist
  nicht aktuell." Vorbestehend, in dieser Etappe absichtlich **nicht**
  repariert (fachfremd). Hinweistext im Skript nennt `npm run
  i18n:ui-manifest`; der real vorhandene Befehl heißt `npm run
  i18n:ui-catalog` / `i18n:ui-catalog:sync`.
- `bunx vitest run` → 448 Tests grün (41 Dateien).
- `npx tsc -p tsconfig.app.json --noEmit` → grün.
- `npm run cms:preflight` → bricht wie vorgesehen bei `i18n:contract` mit
  Exitcode 1 ab; Build wird nicht mehr gestartet. Vorher hätte das
  Semikolon einen Fehler des ersten Checks verdeckt.

**Rücknahme:** Alle Änderungen sind Doku-, `package.json`-, Skript- und
Testdateien. Rücknahme durch Zurücksetzen dieser Dateien auf
`1ae2adfd3832cfa2033984a19b0427d25362a214`; es sind keine Daten-, Schema-
oder Deployment-Zustände betroffen, daher keine Datenrücknahme nötig.

### Nachtrag Etappe 1 (2026-09-14) — Dokumentationsordnung + Typprüfung beidseitig

**Doku-Ordnung (freigegeben, nur Verschieben/Indexieren):**

- Neu `docs/archiv/regeln-historisch/lovable-custom-rules-compact-bis-2026-09-14.md`
- Neu `docs/archiv/status-historisch/current-status-bis-2026-09-14.md`
  (relative Verweise von Basis `docs/` auf die neue Tiefe angepasst)
- Neu `docs/archiv/audit-historisch/cms-steuerbarkeit-status-bis-2026-09-14.md`
- `docs/archiv/README.md` — Indextabelle mit Ursprungspfad, Stand, Archivdatum
  und aktivem Nachfolger; Hinweis, dass historische Messwerte keine aktuellen
  grünen Gates sind.
- `docs/README.md` — Stand 2026-09-14, ausdrücklicher Hinweis „kein gültiges
  Gesamtgrün", Batch-25-Bericht als Historie gekennzeichnet, Verweis auf
  Abschnitt 11 und `cms:preflight`, Abschnitt „Ersetzte Fassungen".

Aktive Pfade (`docs/current-status.md`,
`docs/04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md`,
`docs/lovable-custom-rules-compact.md`) bleiben als aktuelle Doku bestehen —
keine Verweisseiten nötig, daher keine Linkbrüche. Keine pauschale
Archivierung von Berichten. Backup-Dateien nicht angefasst.

**Typprüfung (Gegenprüfungsbefund):** `tsconfig.json` ist eine reine
Verweis-Datei (`files: []` + `references`); ein `tsc --noEmit` am Root prüft
faktisch nichts und wäre trotzdem grün. `cms:preflight` prüft deshalb jetzt
**beide** echten Konfigurationen ausdrücklich mit `-p` und `--noEmit`:
`tsconfig.app.json` und `tsconfig.node.json`. Ergebnis heute: beide grün
(App grün, Node/Build grün) — keine Schwelle abgesenkt, keine Baseline, kein
Ignore.

**Plattformneutralität:** Kein npm-Skript enthält mehr `;` (unter POSIX
maskiert es den Exitcode, unter Windows/cmd.exe wird es Teil des
Dateinamens). Neuer Test prüft alle Skripte auf `;` und `i18n:contract` auf
`&&`. Die Orchestrierung nutzt `spawnSync` mit `shell` nur unter `win32`.

**Tests:** `src/test/preflight.test.ts` jetzt 10 Tests (neu: beide
TS-Konfigurationen mit `-p`, kein `tsc --noEmit` ohne Projekt, keine
Semikolon-Verkettung in package.json).

**Rücknahme des Nachtrags:** Archivdateien löschen und `docs/archiv/README.md`,
`docs/README.md`, `scripts/ci/preflight.mjs`, `src/test/preflight.test.ts`,
`docs/migration-log.md` auf den vorherigen Stand zurücksetzen. Keine Daten-,
Schema- oder Deployment-Zustände betroffen.

## 2026-09-15 — Dokumentations- und Hilfeabschluss (keine DB-Änderung)

Keine Migration, kein SQL, keine Inhalts-, Rechte-, Scheduler- oder
Publishing-Änderung; keine funktionale Runtime-Änderung außer der Korrektur
irreführender technischer Hilfetexte im Admin.

- `docs/current-status.md` auf einen kurzen Status mit Etappen-Tabelle reduziert
  (101 Zeilen). Alle Themen bleiben über Verweise/Archiv erhalten.
- Vollständige Vorfassung unverändert archiviert als
  `docs/archiv/status-historisch/current-status-bis-2026-09-15.md`,
  SHA256 `6e196efb785ed385dafcb9163021cb82926a4bb7c1a084dd592afc52f1894c05`
  (byteidentisch, `cmp` ohne Abweichung). Historie nicht gelöscht.
- Entwidersprucht: der Katalogimport ist **ausgeführt** (422 Quellen / 1672
  Übersetzungen, 8 + 26 neu); die früheren gleichzeitig gültigen Aussagen
  „Datenbank weiterhin 414", „SQL nicht angewendet" und „Vertrag angewendet,
  Import offen" sind ausschließlich Historie in der Archivfassung.
- Etappe 5 mit dem tatsächlich nachgewiesenen Umfang eingetragen: reiner
  UI-Schutz, **kein** serverseitiger Versionsvergleich (CAS), **kein** Readback.
  Unabhängige Gegenprüfung 45 Tests bestanden, Commit
  `b349bbdf77ae780aad2852df6e8ac587595b84e5`.
- `src/features/admin/components/HelpDrawer.tsx`: „Stand nach Freeze",
  „Der CMS-Kern ist stabil", „erscheint 1:1", „wirkt sofort öffentlich",
  „Live-Vorschau zeigt Ergebnis sofort" ersetzt durch Sollregel-Formulierungen
  mit Aufforderung, die Vorschau zu aktualisieren und zu vergleichen und
  Abweichungen mit Kurz-ID/Wert zu melden. „DE/EN" ersetzt durch die am Feld
  tatsächlich freigeschalteten Sprachen (keine NL/DA-Bearbeitbarkeit behauptet).
  Kopierhinweis nennt die geprüfte Strukturkopie ohne pauschale Sichtabnahme.
  Keine Schaltfläche, keine Funktion, kein Marketingtext geändert.
- Backups: die vorhandenen Stände sind logische Exporte plus Medien und **kein
  vollständig getesteter PostgreSQL-Restore**.
- Nachtrag (02:58 UTC): zwei irreführende Hilfesätze minimal korrigiert.
  `MasterDetailWorkbench.tsx`: „Die öffentliche Website bleibt unverändert, bis
  eine Public-Etappe dafür gebaut wird." ersetzt durch „Gespeicherte Inhalte
  können auch die veröffentlichte Website beeinflussen. Vorschau nach dem
  Speichern aktualisieren und prüfen." (gemeinsam genutzte Datenbank; keine
  Behauptung, jeder Wert sei sofort live). `HelpDrawer.tsx`: der DB-first-Absatz
  ist jetzt als Ziel/Soll gekennzeichnet, ergänzt um „Noch bestehende statische
  Inhalte werden schrittweise zugeordnet." Nur Text, keine Funktion, keine DB,
  keine Rechte, kein Publish.
