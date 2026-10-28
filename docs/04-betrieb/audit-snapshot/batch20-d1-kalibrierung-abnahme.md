# Batch 20 — D1-Audit-Kalibrierung (Abnahme)

Datum: 2026-06-04

## Ausgangslage
- `aktive-db-sections-ohne-renderpfad` (D1): **41 Befunde**
- Triage (Batch-19-Folge): alle 41 sind Audit-Blindflecke, kein echter Renderbruch
  - 38 × Anwendungs-Pages, die über die zentrale `AnwendungDetailPage`-Komponente rendern (Wrapper liest 6 Standard-Sections aus DB, mit Gates seit B19)
  - 3 × Serviceportal-Pages (Login, Passwort vergessen, Registrieren — parkiert, bereits im `sonderseiten-register.json`)

## Maßnahmen (alle audit-seitig, kein Public-Code angefasst)

### Schritt 1 — `AnwendungDetailPage`-Wrapper erkennen
In `scripts/cms/page-renderer-coverage.mjs` (`classifyPageFile`) hinzugefügt:

```js
const usesAnwendungDetailWrapper =
  /from\s+["'][^"']*AnwendungDetailPage["']/.test(src) &&
  /<AnwendungDetailPage[^>]*pageKey=/.test(src);
if (usesAnwendungDetailWrapper) {
  for (const k of ["content", "anforderungen", "leistungen", "systembausteine", "broschure", "faq"]) {
    handledSetKeys.push(k);
  }
}
```

Analog zu Batch 19 D2b: Pages, die diese Wrapper-Komponente mit `pageKey` einsetzen, gelten für die 6 zentral gerenderten Keys als handled.

### Schritt 2 — `content` global-handled bei `useCmsI18n` + `PageLayout`
Nicht nötig: kein D1-Befund hängt mehr daran. Die `content`-Bindung der Anwendungs-Pages wird bereits durch Schritt 1 abgedeckt (Wrapper rendert Header aus `cms.text("content", …)`). Schritt 2 wird zurückgestellt, bis ein D1-Befund auf dieses Muster zeigt.

### Schritt 3 — registrierte Sonderseiten überspringen
In der Findings-Schleife eingefügt:

```js
if (isRegistered) continue;
```

Sonderseiten sind durch `docs/02-architektur/sonderseiten-register.json` dokumentiert und stehen unter eigener Pflege. Der bisherige `is_registered_sonderseite`-Flag wurde nur im Markdown-Report gezeigt, aber Findings trotzdem emittiert — das war inkonsistent.

## Ergebnis

| Audit | Vor B20 | Nach B20 |
|---|---:|---:|
| D1 `aktive-db-sections-ohne-renderpfad` | 41 | **0** |
| D2b `public-blocks-ignorieren-admin-visibility` (rot/medium/restschuld) | 0/0/0 | 0/0/0 |
| Globaler Spiegel-Audit | 0 | 0 |
| Wahrheits-Check CI | grün | grün |

## Geänderte Dateien
- `scripts/cms/page-renderer-coverage.mjs`
  - `classifyPageFile`: Wrapper-Erkennung für `AnwendungDetailPage`
  - Main-Schleife: `if (isRegistered) continue;`
- Diverse Audit-Snapshots `.json` / `.md`

## Stand der „Eine-Wahrheit"-Frontlinie
- Launch-kritisch (Admin aus → Public aus): **100 % geschlossen**
- Alle CI-Gates: grün
- Verbleibend: 13 Pages `public_ohne_admin_pflege` (Layout-/Textseiten, kein Spiegel-Bruch) — kein Audit-Restbefund mehr.

Empfehlung: nächste Stufe ist nicht mehr Audit, sondern Inhalts-/Admin-Erlebnis (z. B. Whitelist-Vervollständigung für die noch nicht im Admin pflegbaren Texte). Audit-Seite ist konsolidiert.
