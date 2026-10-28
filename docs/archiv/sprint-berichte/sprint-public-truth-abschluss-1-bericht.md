# Sprint „cms-light-public-truth-abschluss-1" — Bericht

**Datum:** 2026-06-03
**Scope:** Review-/Admin-/Tooling-Logik + Doku. Kein Public-Code, keine Produktdatenbank.

## Ergebnis in Zahlen

| Metrik | Vorher | Nachher |
|---|---:|---:|
| Renderer-Audit DB-first | 73/80 | **74/80** |
| Renderer-Audit Asset-clean | 80/80 | 80/80 |
| Body-Pfad `ok` | 101/117 | **115/117** |
| Body-Pfad `unknown` | 16/117 | **2/117** (beide dokumentierte Sonderfälle) |
| `db_dupes` (aktive Asset-Dubletten) | 0 | 0 |
| `section_inactive` (DB) | 140 | 140 (bewusst behalten, triagiert) |
| D10 `i18n_or_special_owner_risk` | 28 | 28 (gruppiert, dokumentiert) |
| CI-Gates grün | 3/3 | 5/5 (+ contract-audit, contract-drift-audit) |

## 1. HomePage-Ausnahme abgebaut

`src/features/home/pages/HomePage.tsx` ersetzt
`useTranslation()` + `useCmsPageContent("home.start")` durch
`useCmsI18n("home.start", undefined)`. Damit ist die letzte bewusste
Renderer-Sonderausnahme weg.

Entfernt aus:
- `scripts/cms/renderer-audit.mjs` (`EXEMPT`-Set)
- `scripts/i18n/i18n-check.config.json` (`exemptPages`)

`renderer-audit.mjs --strict` bleibt grün → die Page ist real DB-first.

## 2. Body-Inventur final klassifiziert

Erweiterungen in `scripts/cms/faq-cta-toggle-inventar.mjs`:

- **Shared-Template-Detection:** `findComponentForPageKeyProp(clean, pageKey)`
  durchsucht jede pageKey-Stelle und blickt rückwärts auf das nächste
  `<Component`, um die JSX-Element-Klasse zu finden, die diese Prop
  bekommt. Wird per `findTemplateFile` aufgelöst und absorbiert dessen
  DB-first-Marker. Beweis: `produkte.eingangsloesungen` und
  `produkte.zutrittskontrolle` werden so über `CategoryListPage` grün.
- **Dynamic-Slug-Registry `KNOWN_DYNAMIC_TEMPLATES`:** explizite
  Pattern→Template-Datei-Zuordnung. Aktuell genau ein Eintrag:
  `/^anwendungen\.referenzprojekte\.[a-z0-9-]+$/` →
  `src/features/anwendungen/pages/ReferenzprojektDetailPage.tsx`.
  Erfordert weiterhin DB-first-Code-Evidenz im Template (`useCmsPageContent`
  + `cms.sections`/`data-cms-section`/Renderer-Dispatch).
- **`INTENTIONAL_SPECIAL_CASES`:** zwei page-key-Einträge ohne eigene
  Page-Datei werden als bewusster Sonderfall dokumentiert, nicht als
  „none / no-page-file":
  - `service.online-produktkatalog` → Legacy-Redirect auf
    `/produkte/tuerkommunikation`.
  - `personas.architekt.kopie` → Redaktions-Arbeitskopie der
    `personas.architekt`-Seite.

`CmsPageLayout` allein zählt weiterhin **nicht** als Body-Beweis — nur
für Hero/Tail-CTA.

**Body-Pfad-Aufschlüsselung nach Evidenz (115 ok / 2 unknown):**

| Evidenz | Seiten |
|---|---:|
| `page-iterates-cms-sections` | 58 |
| `cms-body-renderer` | 17 |
| `page-iterates-cms-sections-no-marker` | 17 |
| `cms-only-shell` | 9 |
| `cms-product-solution-shell` | 2 |
| `dynamic-slug-template:ReferenzprojektDetailPage` | 12 |
| `intentional-special:legacy-redirect` | 1 |
| `intentional-special:duplicate-copy` | 1 |

## 3. `db_dupes` / `section_inactive` triagiert

Read-only Inventar: `docs/04-betrieb/db-dupes-section-inactive-triage.md`.

- `db_dupes` = 0 aktive Asset-Dubletten in der DB.
- `section_inactive` = 140 Sections über 31 Seiten — drei klar
  beschriebene Buckets, alle bewusst behalten. Keine Migration.

## 4. D10-Spezialrisiken inventarisiert

Inventur: `docs/04-betrieb/d10-spezialrisiken-inventar.md`.

Die 28 D10-Hinweise sind keine Daten-Drift, sondern dokumentierte
Renderer-Sonderheiten pro `section_type`. In 6 Buckets gruppiert.
Keiner ist in diesem Sprint risikoarm **und** innerhalb der
Scope-Grenzen reparierbar — die 2 Befunde der Gruppe A werden mit dem
geplanten Whitelist-Sprint (Etappe 4) adressiert.

## 5. CI-Gates

Alle grün nach dem Sprint:

```
node scripts/cms/wahrheits-check-ci.mjs        → ✅
node scripts/cms/renderer-audit.mjs --strict   → ✅ (74/80 DB-first)
node scripts/cms/validate-no-fout.mjs          → ✅
node scripts/cms/contract-audit.mjs            → 15 OK · 7 Warn · 0 Konflikt
node scripts/cms/contract-drift-audit.mjs      → D1–D9 = 0 · D10 = 28
```

## Scope-Treue

- Keine Produktdatenbank angefasst.
- Keine Public-Routen, Navigation, Footer, Breadcrumbs oder Layouts geändert.
- Keine neue RPC.
- Keine i18n-JSON-Löschung.
- Keine Migration (db_dupes = 0; section_inactive bewusst behalten).
- Keine pauschalen grünen Ampeln ohne Code-Evidenz: jede neue grüne
  Body-Bewertung verlangt entweder generischen DB-Renderer, ein
  Shared-Template mit DB-first-Markern oder einen explizit registrierten
  Dynamic-Slug-Template-Eintrag.

## Nächste Etappen

1. Sprint „cms-light-baustein-workspaces-wechselteaser-hero-content-1".
2. Pro-Feld-Text-Whitelist je `section_type` (löst D10-Gruppe A auf).
3. Admin-Login + RLS-Härtung als letzter Schritt vor Public-Live.
