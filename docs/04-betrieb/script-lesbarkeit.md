# Script-CMS / Audit-Skripte — Lesbarkeit

Stand: 2026-06-04

## Warum dieser Hinweis

Die Audit- und CMS-Skripte unter `scripts/cms/*.mjs` (Wahrheits-Check,
Spiegel-Audit, Coverage, FAQ/CTA-Inventar, Hartcode-Inventar etc.) sind
für Maschinen geschrieben, nicht für Menschen. Ihre Roh-Ausgaben sind
oft schwer lesbar:

- viele Spalten, kryptische Schlüssel (`page_key.section_key`, Klassen-Codes)
- JSON-Dumps statt Fließtext
- gemischte Sprachen (Englisch in Klassen-Codes, Deutsch in Beschreibungen)
- mehrere hundert Zeilen, ohne Priorisierung

Das ist Absicht — die Skripte sind die Quelle, nicht der Bericht.

## Wo man stattdessen liest

Für jeden Skript-Lauf gibt es eine **lesbare Markdown-Fassung**:

| Roh-Ausgabe (für Maschine)                                    | Lesbarer Bericht (für Mensch) |
|---------------------------------------------------------------|-------------------------------|
| `scripts/cms/output/*.json`                                   | `docs/04-betrieb/audit-snapshot/*.md` |
| `scripts/cms/wahrheits-check-ci.mjs` (Konsolen-Output)        | `docs/04-betrieb/wahrheits-check.md` + `audit-snapshot/launch-freeze-abnahme.md` |
| `scripts/cms/globaler-spiegel-audit.mjs`                      | `audit-snapshot/globaler-spiegel-audit.md` |
| `scripts/cms/page-renderer-coverage.mjs`                      | `audit-snapshot/page-renderer-coverage.md` |
| `scripts/cms/public-blocks-ignorieren-admin-visibility.mjs`   | `audit-snapshot/public-blocks-ignorieren-admin-visibility.md` |
| `scripts/cms/faq-cta-toggle-inventar.mjs`                     | `docs/04-betrieb/faq-cta-toggle-inventar.md` |
| `scripts/cms/hartcode-steuerbarkeit-inventar.mjs`             | `audit-snapshot/hartcode-steuerbarkeit-inventar.md` + `cms-steuerbarkeit-status.md` |

Regel: **Wenn ein Skript-Output im Chat oder PR auftaucht und schwer
lesbar ist, immer zuerst die zugehörige `.md` aus
`docs/04-betrieb/audit-snapshot/` öffnen.** Dort steht dieselbe
Information in deutschen Sätzen, mit Klassifizierung und Empfehlung.

## Pflicht beim Anlegen neuer Skripte

Jedes neue Audit-Skript unter `scripts/cms/` muss zusätzlich zur
JSON-Ausgabe einen kurzen Markdown-Bericht nach
`docs/04-betrieb/audit-snapshot/<name>.md` schreiben (oder einen
bestehenden aktualisieren). Ohne Markdown-Pendant gilt das Skript als
nicht abnahmefähig — es bricht die „lesbar für Mitarbeitende"-Regel
aus `mem://index.md` (Core: klares Deutsch, ohne Buzzwords).

## Hinweis für KI-Sessions

Wenn eine KI-Session nach „dem letzten Audit" gefragt wird, soll sie
**nicht** die `.mjs`-Quelle oder das `.json` zitieren, sondern den
Markdown-Bericht. Die Roh-Ausgabe ist nur dann sinnvoll, wenn jemand
die Audit-Logik selbst debuggen will.
