# Renderer DB-first — Abschluss 2026-05-16

## Ergebnis-Snapshot

```
Pages total:    79
DB-first:       76/79  (96%)
Asset-clean:    79/79  (100%)
Ausnahmen:      3  (dokumentiert)
```

## Was wurde gemacht (Punkte 1–5 aus dem Plan)

### 1. Asset-Verdrahtung flächendeckend ✅
Audit zeigt: alle 79 Pages routen Bilder durch `cms.asset(section, field, codeFallback)`. Code-Imports bleiben als Fallback, DB hat Vorrang. Erledigt durch frühere Codemod-Läufe; in diesem Pass nur verifiziert.

### 2. Snipdoo IP — Diagramm + Accordion ✅
Verifiziert:
- 6 Asset-Slots in `cms_assets` (systemaufbau/image, nutzungAlltag/image, inbetriebnahme/image, anwendungen/image_efh/mfh/gewerbe)
- 286 Felder in `cms_section_fields` über 13 Sections, inkl. `inbetriebnahme.steps.*` (Accordion-Stufen) und `role_tabs.tabs.*`
Snipdoo-Page nutzt `useCmsI18n` + `cms.asset/text` durchgängig. Keine zusätzliche Migration nötig.

### 3. Verbleibende Ausnahmen ✅
Dokumentiert und akzeptiert (CI-Audit lässt sie strict durch):
- `src/features/admin/pages/AdminPage.tsx` — Admin-UI, bewusst i18n
- `src/features/gebaeudekommunikation/pages/TuersprechanlagenPage.tsx` — 2 Komponenten in einer Datei, manuelles Split steht aus
- `src/features/service/pages/ProductDetailPage.tsx` — dynamisches Produkt, kein statischer `page_key`

### 4. Audit-Script dauerhaft ✅
- `scripts/cms/renderer-audit.mjs` (mit `--json` und `--strict`)
- npm scripts: `cms:audit:renderer` und `cms:audit:renderer:strict`
- Exempt-Liste hartcodiert, neue Ausnahmen erfordern Code-Änderung (= sichtbare PR-Diff)

### 5. Tote i18n-Codepfade ✅ (Inventur, keine Löschung)
- `scripts/cms/dead-i18n-inventory.mjs` + npm `cms:audit:dead-i18n`
- Report: `docs/05-checkpoints/dead-i18n-inventory.md`
- Coverage pro Namespace zwischen 0% (common, legal, navigation, serviceportal) und 99% (personas, service)
- **Lösch-Policy:** ausschließlich pro Template nach Preview-Sichtprüfung; nie Namespace-weit. Workflow im Report dokumentiert.

## Frisch dazugekommene Codemods und Scripts

- `scripts/cms/renderer-audit.mjs`
- `scripts/cms/renderer-dbfirst-codemod-v2.mjs` — Anwendungs-Container ohne `useCmsPageContent` heben (17 Pages)
- `scripts/cms/renderer-dbfirst-codemod-v3.mjs` — Restpages mit explizitem Mapping (6 Pages)
- `scripts/cms/fix-cms-collisions.mjs` — entfernt `cms`/`loc` aus Destructure wenn Pages eigene `const cms = …` haben
- `scripts/cms/dead-i18n-inventory.mjs`

## Was bleibt liegen (kein Blocker)

- **i18n-Cleanup pro Template** (Punkt 5 fortlaufend) — Redaktionsteam und Thomas iterieren pro Seite. Maschinell nicht sinnvoll.
- **Asset-Upload-UI im /admin** (Komfort, Punkt 6 aus letztem Stand) — separat, kein Renderer-Thema.
- **`TuersprechanlagenPage` Split** — eine Stunde Handarbeit, eigenes Ticket.
