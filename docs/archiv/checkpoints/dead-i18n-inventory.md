# Tote i18n-Codepfade — Inventur

Stand: 2026-05-17

Pro Namespace: Anzahl Code-Keys, davon in DB gespiegelt, Lösch-Kandidaten.
Löschen erst nach Preview-Sichtprüfung jeder betroffenen Seite.

| Namespace | Code-Keys | in DB gespiegelt | Coverage |
|---|---:|---:|---:|
| anwendungen | 898 | 614 | 68% |
| common | 14 | 0 | 0% |
| eingangssysteme | 234 | 172 | 74% |
| gebaeudekommunikation | 409 | 402 | 98% |
| gebaeudemanagement | 120 | 108 | 90% |
| home | 137 | 134 | 98% |
| karriere | 31 | 28 | 90% |
| kontakt | 22 | 19 | 86% |
| kontakt-bcm | 19 | 16 | 84% |
| legal | 15 | 0 | 0% |
| navigation | 222 | 3 | 1% |
| personas | 378 | 374 | 99% |
| presse | 26 | 23 | 88% |
| service | 593 | 588 | 99% |
| serviceportal | 153 | 4 | 3% |
| signage | 17 | 14 | 82% |
| wissen | 37 | 34 | 92% |
| zutrittskontrolle | 320 | 298 | 93% |

## Lösch-Workflow (pro Template)

1. Im Admin Preview-Locale erzwingen und die Seite öffnen.
2. Im DevTools Network nachweisen: Keine i18n-Fallbacks geladen (alle Texte aus `cms_section_fields`).
3. Im JSON-Locale die zugehörigen Keys löschen (pro Seite/Section, nicht Namespace-weit).
4. Vite-Restart + visuell QA, dann commit.

Niemals Namespace-weit löschen, niemals ohne Sichtprüfung.