# CMS-Steuerbarkeit — Entscheidungsvorlage

Stand: 2026-06-04. Login ausdrücklich nicht Teil dieser Vorlage.

## 1. Sind wir technisch stabil?

**Ja.** Wahrheits-Check 0 Kritisch, FAQ/CTA-Orphans/Mixed/Dedup-Only = 0, kein Spiegel-High, kein Public-Blocks-Rot. CI-Gate (`scripts/cms/wahrheits-check-ci.mjs`) blockt Drift. Public-Release wäre möglich.

## 2. Was ist noch nicht „eine Wahrheit"?

Zwei Themenfelder.

**Thema 1 — Custom-Page rendert DB-Section nicht.**
73 aktive DB-Sections in 28 Pages werden im Admin verwaltet, aber von der Page-Komponente nicht aufgerufen. Redaktion sieht „aktiv", Public ignoriert. Das ist der Hauptgrund für den „Schein-CMS"-Eindruck.

**Thema 2 — Header/Inhalt sichtbar, im Admin nicht pflegbar.**
12 Container-Header ohne Whitelist + 6 i18n-JSX-Sections ohne DB-Gegenstück. Sichtbarer Text, der nicht im Admin auftaucht.

## 3. Welche 5–10 konkreten Blöcke müssen als Nächstes in CMS/DB?

Priorität nach Sichtbarkeit + Häufigkeit:

| # | Page | Sections | Maßnahme |
|---|------|---------:|----------|
| 1 | `gebaeudekommunikation.snipdoo-ip` | 12 | Page-Renderer-Loop einbauen ODER auf `GenericCmsPage` migrieren |
| 2 | `home.start` | 3 | Restliche Top-Level-Sections, die im Code nicht in `TOP_LEVEL_KEYS` stehen, in den Render-Pfad heben |
| 3 | `karriere.root` | 3 | siehe #1 |
| 4 | `kontakt.root` + `kontakt-bcm.root` | 3 + 3 | DB-Begleittexte rendern, Formular-Mechanik bleibt Code |
| 5 | `gebaeudemanagement.root` + `gebaeudemanagement.alarmanlagenkopplung` | 1 + 2 | siehe #1 |
| 6 | `gebaeudekommunikation.beschilderung` | 2 | siehe #1 |
| 7 | 12× `CONTAINER_HEADER_WHITELIST_FEHLT` | — | Sammel-Migration `cms_admin_editable_fields` |
| 8 | 6× `I18N_JSX_SECTION_OHNE_DB_GEGENSTUECK` | — | Inhalte aus i18n in `cms_section_fields` heben, Whitelist setzen |
| 9 | Snipdoo-IP Tertiärbutton | — | nach Entscheidung D1 |
| 10 | 4× hartcodierte Hub-/Kategorie-Pages | — | nach Entscheidung D2 |

## 4. Welche Themen sind nur Layout und dürfen bleiben?

- Page-Layout-Komponenten (`HeroSection`, `StatsSection`, `PersonaSection`, `Teaser2ColV1`, `CmsBodyRenderer`, `Footer`, `MainNavigation`).
- Renderer-Komponenten unter `src/features/cms/components/sections/*`.
- Sonderseiten aus `sonderseiten-register.json` (Kontakt, Serviceportal, Merkliste, PDP, Referenzprojekt-Detail).
- Reine Container-Mechanik (Tabs, Cards-Grid, Scroller).
- `CONTAINER_LEER` und `PUNKT_KEY_IN_INAKTIVER_CONTAINER` aus dem Spiegel-Audit (kein Public-Effekt).

## 5. Was muss getestet werden, damit Kopieren/Verschieben/Ein-/Ausblenden zuverlässig gilt?

**E2E-Mindesttests pro Standard-Page:**

1. Reihenfolge im Admin ändern → öffentliche Seite spiegelt neue Reihenfolge.
2. Section im Admin auf „aus" → Section verschwindet auf öffentlicher Seite.
3. Section duplizieren → Kopie erscheint und ist editierbar.
4. Page duplizieren (sobald Admin-Feature kommt) → neue Page rendert mit denselben Sections, ohne Code-Änderung.
5. Whitelist-Spiegel: jedes im Admin sichtbare Feld erzeugt nach Save eine sichtbare Public-Änderung.

**Voraussetzung 1–5**: die unter Punkt 3 genannten 28 Custom-Pages müssen vorher entweder auf `GenericCmsPage`/`renderPageSectionByType` umgestellt sein oder explizit als Sonderseite registriert.

## 6. Empfohlener nächster Batch (genau einer)

**Batch 7 — „Custom-Page-Render-Pfad härten" (eine klare Linie, kein Mischbatch):**

- Scope: die unter Punkt 3 Zeilen 1–6 genannten 28 Custom-Pages.
- Vorgehen:
  1. Pro Page entscheiden: `GenericCmsPage` reicht? → einfacher Tausch.
  2. Wenn nein: `renderPageSectionByType`-Loop hinter den bestehenden statischen Block setzen, damit Admin-Sections automatisch sichtbar werden.
  3. Ergebnis pro Page: `page-renderer-coverage` für diese Page = 0.
- Out of scope dieses Batches: Whitelist-Pflege (B2), Public-Blocks-Gelb (B3), neue Block-Typen (D1/D2), Login.
- Erfolgsmaß: `AKTIVE_DB_SECTION_OHNE_PUBLIC_RENDERPFAD` < 10, Wahrheits-Check bleibt 0 Kritisch.

Direkt danach **kein** automatischer Folge-Batch. Stattdessen Thomas-Entscheidungen D1–D4 einholen, dann Batch 8 planen.
