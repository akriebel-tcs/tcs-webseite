# Launch-Freeze-Abnahme

Stand: 2026-06-04 · Quelle: frische Läufe gegen `scripts/sync/snapshot` und Quellcode-Statik · Sandbox ohne Live-DB.

## Tabelle

| Kennzahl                                   | Wert | Quelle |
|--------------------------------------------|-----:|--------|
| Wahrheits-Check Kritisch                   | **0** | `wahrheits-check-ci.mjs` (mit neuem Launch-Gate auf Zähler) |
| FAQ ORPHAN                                 | **0** | `faq-cta-toggle-inventar.mjs` |
| FAQ MIXED                                  | **0** | `faq-cta-toggle-inventar.mjs` |
| FAQ OK_DEDUP_ONLY                          | **0** | `faq-cta-toggle-inventar.mjs` |
| CTA ORPHAN                                 | **0** | `faq-cta-toggle-inventar.mjs` |
| CTA MIXED                                  | **0** | `faq-cta-toggle-inventar.mjs` |
| CTA OK_DEDUP_ONLY                          | **0** | `faq-cta-toggle-inventar.mjs` |
| FAQ OK / „nicht vorhanden" / UNKNOWN       | 101 / 11 / 1 | derselbe Lauf |
| CTA OK / „nicht vorhanden" / UNKNOWN       | 111 / 1 / 1  | derselbe Lauf |
| Body-Pfad ok / unknown                     | 115 / 2 | derselbe Lauf |
| Spiegel-Audit High                         | **0** | `globaler-spiegel-audit.mjs` — keine Befunde mit Severity-Klasse „high/critical" |
| Spiegel-Audit Restschuld (rot)             | 43   | dito — sechs Klassen, siehe Backlog |
| page-renderer-coverage Befunde             | 73   | `page-renderer-coverage.mjs` (Klasse AKTIVE_DB_SECTION_OHNE_PUBLIC_RENDERPFAD) |
| public-blocks Ampel rot / gelb_medium / gelb_restschuld / grau | 0 / 32 / 33 / 2 | `public-blocks-ignorieren-admin-visibility.mjs` |
| Sub-Gates (Persona, Card-Parität, Sort-Order) | grün | aus dem Spiegel-Audit-Header |
| TypeScript-Fehler (`tsc --noEmit`)         | wird in CI hart geprüft; lokal nicht ausgeführt (Sandbox-Regel) | neue Workflow-Stufe |

## Interpretation

- **Launch-kritische Klasse** (Kritisch, Orphan, Mixed, Dedup-Only, Spiegel-High): vollständig 0.
- **Restschuld-Klasse**: 43 Spiegel-Audit-Befunde + 73 Coverage-Befunde + 65 Public-Blocks-Gelb. Alle als Restschuld klassifiziert, siehe `launch-restschuld-backlog.md`.
- **Bekannte fachliche Ausnahme**: Snipdoo-IP-Tertiärbutton („Schulung / Demo buchen") — bewusst nicht im `cta_v1`-Vertrag. Siehe `snipdoo-ip-tertiaerbutton.md`.

## Was sich seit Batch 6 geändert hat

- `scripts/cms/wahrheits-check-ci.mjs` prüft jetzt **zusätzlich** harte Schwellen (FAQ/CTA orphan/mixed/dedup-only = 0). Damit blockt CI sofort, wenn eine neue Seite an den Admin-Schaltern vorbeiläuft — nicht erst beim nächsten Harvester-Diff.
- `.github/workflows/cms-audit.yml` hat einen Kopfkommentar „Launch-Gate: Kritisch verboten, Restschuld erlaubt und dokumentiert" und einen neuen Job `TypeScript no-emit (Launch-Gate)`.

## Fazit

Technisch launchfähig: ja. Es gibt keinen offenen Punkt, der vor Launch zwingend ist.
Verbleibende Arbeit ist Restschuld + Login-Aktivierung (geplant in `admin-login-vorbereitung.md`).
