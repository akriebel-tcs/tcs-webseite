# Einstieg für KI / neue Mitarbeit (Kurzverweis)

Stand: 2026-09-15 (Doku-/Hilfeabschluss; Regelquelle unverändert das Dachdokument).

Die frühere Langfassung nannte die Batch-25-Nullwerte als Ist-Zustand und
beschrieb Regeln parallel zum Dachdokument. Sie liegt unverändert unter
[`archiv/regeln-historisch/ai-start-prompt-bis-2026-09-14.md`](./archiv/regeln-historisch/ai-start-prompt-bis-2026-09-14.md)
und ist **Historie, nicht Ist-Zustand**. Um keine zweite Regelkopie zu
führen, ist diese Datei nur noch ein Einstiegs-Wegweiser.

## Zuerst lesen, in dieser Reihenfolge

1. [`03-redaktion/redaktions-uebergabe-und-prompt-regeln.md`](./03-redaktion/redaktions-uebergabe-und-prompt-regeln.md)
   — **führende Regelquelle**, inklusive Abschnitt 11 (Verbindlicher
   Arbeitsablauf: Ziel/Feld/Sprache vorher feststellen, Ablageorte,
   Sprachen, Schreibarbeiten, Abschlussnachweise).
2. [`current-status.md`](./current-status.md) — Kurzstatus.
   **Kein Gesamtgrün**; alte Nullwerte sind Historie.
3. [`04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md`](./04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md)
   — technischer Status.
4. [`../.lovable/always-follow.md`](../.lovable/always-follow.md)
   — technische Schutzregeln und Scope-Grenzen.
5. [`lovable-custom-rules-compact.md`](./lovable-custom-rules-compact.md)
   — technische Kurzfassung.

## Worum es geht (Kurz)

TCS-Unternehmenswebseite: React 18 + Vite + Tailwind + TypeScript,
Backend über Lovable Cloud.

**Zielarchitektur** (Sollzustand, **nicht überall vollständig
angebunden**): Redaktionelle Inhalte liegen in den CMS-Light-Tabellen
(`cms_pages`, `cms_sections`, `cms_section_fields`, `cms_assets`,
`cms_navigation_nodes`, `cms_admin_editable_fields`) und werden über
`/admin` gepflegt; die öffentliche Website rendert daraus. Zentrale
Bedien-Texte gehören in den Katalog `cms_ui_strings`. Produktdaten kommen
ausschließlich **lesend** aus der Produktbasis.

Wie weit das je Stelle tatsächlich umgesetzt ist, sagt
[`current-status.md`](./current-status.md) — dieser Kurzstatus ist
maßgeblich, nicht die Zielbeschreibung hier. Bestehende Fallbacks
(i18n-Ressourcen, Code-Bilder) sind dokumentierter Übergang.

Datenmodell im Detail:
[`02-architektur/datenmodell-erklaert.md`](./02-architektur/datenmodell-erklaert.md).

Lokale Abschlussprüfung: `npm run cms:preflight` — ersetzt **keine**
Struktur-, Datenbank- oder Preview-Abnahme.

Bei Konflikt zwischen Auftrag und Regelwerk: **stoppen und melden**,
nicht improvisieren (Hierarchie: `.lovable/always-follow.md`, Abschnitt 16).
