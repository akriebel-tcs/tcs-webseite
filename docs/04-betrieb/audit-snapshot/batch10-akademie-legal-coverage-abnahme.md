# Batch 10 — Akademie FAQ + Legal Content-Renderpfad (Abnahme)

Stand: 2026-06-04 · Scope: 4 verbliebene Coverage-Befunde außerhalb von Login
(Akademie 1× FAQ, Legal 3× content). Serviceportal/Login bewusst nicht angefasst.

## Vorprüfung

### Akademie

Datei: `src/features/wissen/pages/AkademiePage.tsx`.

- Kein `FaqV1`, kein `CmsTailFaq`, kein inline FAQ-Renderer.
- DB hat eine aktive Top-Level-Section `faq` (Typ `faq_v1`, `sort_order=60`,
  ohne Kinder).
- **Ergebnis:** echte Lücke. Minimal-Fix möglich.

### Legal (AGB / Datenschutz / Impressum)

Dateien:
- `src/features/legal/pages/AgbPage.tsx`
- `src/features/legal/pages/DatenschutzPage.tsx`
- `src/features/legal/pages/ImpressumPage.tsx`

Alle drei Seiten hatten dieselbe Struktur:

- `useCmsI18n("legal.<key>", "legal")` **ohne** `rootPrefix`.
- PageLayout-Props (`label`, `headline`, `intro`) wurden über
  `t("seiten.<key>.label|headline|intro")` aus dem i18n-Namespace `legal`
  gelesen.
- DB hat pro Page eine aktive `content`-Section (`content_v1`) mit genau den
  Feldern `label`, `headline`, `intro` (auf DE/EN gepflegt, Werte identisch
  zur i18n-Quelle). Felder `title` und `text` sind aktuell leer.
- Der i18n-Lookup griff nie auf die DB-Section, weil der Section-Key
  `content` und nicht `seiten` lautet. → Admin-Edits an
  `legal.<key>.content.{label|headline|intro}` waren ohne Public-Wirkung.

**Ergebnis:** echte Lücke, sauber minimal reparierbar:
`cms.text("content", "<field>", loc, t("..."))` als dünner DB-first-Wrapper
um die bestehenden i18n-Calls. Layout, Draft-Hinweis und Kontakt-CTA bleiben
unverändert. Leere DB-Felder (`title`, `text`) werden nicht gerendert — keine
Doppelung, keine Inhaltsentscheidung.

## Änderungen

### Akademie

- `CmsTailFaq` importiert und unmittelbar vor `CmsSourceBadge` als Tail
  eingefügt. Dedup über `CmsRenderRegistry` greift automatisch.

### Legal

In allen drei Pages dieselbe Mini-Diff in PageLayout:

```tsx
label={cms.text("content", "label", loc, t("seiten.<key>.label"))}
headline={cms.text("content", "headline", loc, t("seiten.<key>.headline"))}
intro={cms.text("content", "intro", loc, t("seiten.<key>.intro"))}
```

i18n bleibt sicherer Fallback. Keine sonstigen Änderungen am Legal-Layout.
Rechtstexte wurden nicht angefasst.

## Bewusst nicht geändert

- `serviceportal.login`, `serviceportal.registrieren`,
  `serviceportal.passwort-vergessen` — Login-Sonderfälle, out of scope.

## Vorher / Nachher

| Audit | Vorher | Nachher |
|---|---:|---:|
| `AKTIVE_DB_SECTION_OHNE_PUBLIC_RENDERPFAD` | 7 | **3** (nur Serviceportal) |
| Hartcode `db_aktiv_aber_public_ignoriert` | 7 Pages | **3** Pages (nur Serviceportal) |
| FAQ orphan / mixed / dedup-only | 0 / 0 / 0 | 0 / 0 / 0 |
| CTA orphan / mixed / dedup-only | 0 / 0 / 0 | 0 / 0 / 0 |
| Spiegel-Audit Restschuld | 43 | 43 (unverändert, keine neuen Klassen) |
| Public-Blocks rot | 0 | 0 |

## Audit-Ergebnisse

- `node scripts/cms/page-renderer-coverage.mjs` → 3 Befunde.
- `node scripts/cms/hartcode-steuerbarkeit-inventar.mjs` →
  `db_aktiv_aber_public_ignoriert: 3`.
- `node scripts/cms/faq-cta-toggle-inventar.mjs --snapshot scripts/sync/snapshot`
  → 0/0/0 für FAQ und CTA orphan/mixed/dedup-only. Artefakte
  (`knownPageObjectContracts.ts`, `faq-cta-toggle-inventar.md`)
  wurden vom Harvester aktualisiert (Akademie hat jetzt `<CmsTailFaq>`,
  Legal-Pages lesen `cms.text("content", …)`).
- `node scripts/cms/wahrheits-check-ci.mjs` → `✅ Launch-Gate erfüllt`.
- `node scripts/cms/globaler-spiegel-audit.mjs` → 43 Befunde, identische
  Klassenverteilung wie nach Batch 9.
- `node scripts/cms/public-blocks-ignorieren-admin-visibility.mjs` →
  rot=0, gelb_medium=32, gelb_restschuld=33, grau=2 (unverändert).

## Browser-Smoke

Routen aus `src/navigation/routes.ts`:
`/akademie`, `/agb`, `/datenschutz`, `/impressum`.

- `/akademie`: rendert vollständig, FAQ-Section am Tail einmal, CTA einmal,
  Source-Badge „Body aus DB · wissen.akademie · 6 Sections". Keine
  Console-Errors.
- `/agb`: rendert vollständig, Label „Rechtliches", Headline „Allgemeine
  Geschäftsbedingungen", Draft-Hinweis und Kontakt-CTA unverändert,
  Source-Badge „Body aus DB · legal.agb · 3 Sections". Layout unverändert.
- `/datenschutz`, `/impressum`: identischer Codepfad zu `/agb`, gleiche
  visuelle Ausgabe (Stichprobe AGB durchgeführt).

## Was bleibt übrig

- **Coverage:** 3 Serviceportal-Login-Pages, geparkt bis Login-Batch.
- **Hartcode Klasse A:** 2 Pages (`produkte.hub`,
  `produkte.tuerkommunikation`) — bewusst außerhalb dieses Batches, da
  Produktdatenbank/PDP per Projektregel nicht angefasst wird.
- **Spiegel-Restschuld:** 43 Befunde in 6 Klassen, davon 32
  Whitelist-/Punkt-Key-Themen — separat als Whitelist-/Hygiene-Welle planbar.
- **Public-Blocks gelb:** 65 (medium/restschuld) — Sichtbarkeitsschalter
  ohne Public-Wirkung in 30er-Gruppe „Admin-Schalter ohne Wirkung".

## Empfehlung für nächsten Batch

**Batch 11 — Whitelist- und Punkt-Key-Hygiene.** Die größte verbleibende
Spiegel-Restschuld sind 20 Befunde `PUNKT_KEY_IN_INAKTIVER_CONTAINER`
und 12 `CONTAINER_HEADER_WHITELIST_FEHLT`. Beides ist mechanisch lösbar
(idempotente Migration auf `cms_admin_editable_fields` plus optional
deaktivieren verwaister Punkt-Keys), ohne Inhaltsentscheidungen. Würde die
Spiegel-Restschuld auf ~11 drücken und „Eine Wahrheit" sichtbar weiter
schließen, ohne Login oder Produkt-Hub anzufassen.

Alternativ: **Batch 11b — Admin-Schalter-Ehrlichkeit Welle 1.** Die 30er-Gruppe
in `hartcode-steuerbarkeit-inventar` so refactoren, dass `is_active`-Toggle
im Admin tatsächlich Public-Wirkung hat — größerer Aufwand, aber höchste
Wirkung auf die Aussage „eine Wahrheit".

Nicht als nächstes: Login (out of scope), Produkt-Hub/PDP (per Regel
geschützt).
