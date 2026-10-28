# Archiv

Stand: 2026-09-15


Alles hier drin ist **Historie**. Es war zum jeweiligen Zeitpunkt korrekt,
ist aber heute nicht mehr Grundlage für Entscheidungen. Maßgeblich sind
die Dokumente im Hauptverzeichnis von [`../`](../).

## Was hier liegt

| Ordner | Inhalt | Stand |
| ------ | ------ | ----- |
| `pilot-plans/`         | Pilot-Pläne der Etappen B–H | bis 2026-05 |
| `checkpoints/`         | Etappen- und Architektur-Checkpoints | bis 2026-05 |
| `inventories/`         | i18n-/Navigation-/Asset-Inventuren | bis 2026-05 |
| `strategie-historisch/`| Frühe Strategiepapiere (Admin-Zielbild, ID-Key-Modell, Public-Vollmigration, Production-Readiness) | bis 2026-05 |
| `architektur-historisch/`| Frühere Architektur-Snapshots (Code-Landkarte, Routing-Plan, Hygiene-Check) | bis 2026-05 |
| `sync/`                | Diff-Reports aus Sync-Läufen | bis 2026-05 |
| `regeln-historisch/`   | Überholte Fassungen des Lovable-Regelwerks und der Einstiegsdokumente | bis 2026-09 |
| `redaktion-historisch/`| Überholte Redaktions-/Prompt-Dokumente | bis 2026-09 |

## Warum aufgehoben, nicht gelöscht

- Nachvollziehbarkeit der Entscheidungen (Audit-Trail).
- Wiederverwendbare Bausteine, falls eine Etappe nochmal Thema wird.
- Manche Migrationen referenzieren diese Dokumente.

## Warum nicht im Hauptverzeichnis

Doku, die nicht den aktuellen Stand beschreibt, ist gefährlich. Sie wirkt
gleich autoritär wie aktuelle Doku, ist es aber nicht. Trennung schützt vor
falschen Entscheidungen.

## Ersetzte Fassungen aus Etappe 1 (archiviert 2026-09-14, ergänzt in den Restkorrekturen)

Nur die in Etappe 1 tatsächlich ersetzten Regel- und Statusdokumente wurden
archiviert — **keine pauschale Archivierung aller Berichte**. Die aktiven
Pfade bestehen unverändert weiter und tragen den überarbeiteten Inhalt.

| Archivdatei | Ursprungspfad | Stand der Fassung | Nachfolger (aktiv) |
| ----------- | ------------- | ----------------- | ------------------ |
| [`regeln-historisch/lovable-custom-rules-compact-bis-2026-09-14.md`](./regeln-historisch/lovable-custom-rules-compact-bis-2026-09-14.md) | `docs/lovable-custom-rules-compact.md` | bis 2026-09-14 | [`../lovable-custom-rules-compact.md`](../lovable-custom-rules-compact.md) + [`../03-redaktion/redaktions-uebergabe-und-prompt-regeln.md`](../03-redaktion/redaktions-uebergabe-und-prompt-regeln.md) |
| [`status-historisch/current-status-bis-2026-09-14.md`](./status-historisch/current-status-bis-2026-09-14.md) | `docs/current-status.md` | 2026-06-05 (Batch 27/28) | [`../current-status.md`](../current-status.md) |
| [`audit-historisch/cms-steuerbarkeit-status-bis-2026-09-14.md`](./audit-historisch/cms-steuerbarkeit-status-bis-2026-09-14.md) | `docs/04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md` | Messung 2026-06-04 | [`../04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md`](../04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md) |
| [`regeln-historisch/always-follow-bis-2026-09-14.md`](./regeln-historisch/always-follow-bis-2026-09-14.md) | `.lovable/always-follow.md` | 2026-06-05 (Batch 25/26/27) | [`../../.lovable/always-follow.md`](../../.lovable/always-follow.md) + Dachdokument |
| [`regeln-historisch/lovable-custom-rules-bis-2026-09-14.md`](./regeln-historisch/lovable-custom-rules-bis-2026-09-14.md) | `docs/lovable-custom-rules.md` | vor CMS-Light-DB-first | [`../lovable-custom-rules-compact.md`](../lovable-custom-rules-compact.md) (aktiver Pfad ist Kurzverweis) |
| [`regeln-historisch/ai-start-prompt-bis-2026-09-14.md`](./regeln-historisch/ai-start-prompt-bis-2026-09-14.md) | `docs/ai-start-prompt.md` | 2026-06-05 | [`../ai-start-prompt.md`](../ai-start-prompt.md) (Kurzverweis) |
| [`redaktion-historisch/redaktions-uebergabe-und-prompt-regeln-bis-2026-09-14.md`](./redaktion-historisch/redaktions-uebergabe-und-prompt-regeln-bis-2026-09-14.md) | `docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md` | 2026-06-05 + Abschnitt 11 vom 2026-09-14 | [`../03-redaktion/redaktions-uebergabe-und-prompt-regeln.md`](../03-redaktion/redaktions-uebergabe-und-prompt-regeln.md) |
| [`redaktion-historisch/kurzanleitung-bis-2026-09-14.md`](./redaktion-historisch/kurzanleitung-bis-2026-09-14.md) | `docs/03-redaktion/kurzanleitung.md` | 2026-06-05 (Batch 27/28) | [`../03-redaktion/kurzanleitung.md`](../03-redaktion/kurzanleitung.md) (Wegweiser) + Dachdokument |
| [`redaktion-historisch/redaktionshandbuch-bis-2026-09-14.md`](./redaktion-historisch/redaktionshandbuch-bis-2026-09-14.md) | `docs/03-redaktion/redaktionshandbuch.md` | 2026-05-17 | [`../03-redaktion/redaktionshandbuch.md`](../03-redaktion/redaktionshandbuch.md) (Wegweiser) + Dachdokument Abschnitt 11 |
| [`redaktion-historisch/checkliste-redaktion-bis-2026-09-14.md`](./redaktion-historisch/checkliste-redaktion-bis-2026-09-14.md) | `docs/03-redaktion/checkliste-redaktion.md` | 2026-05-27 (Hotfix-Tranche 25) | [`../03-redaktion/checkliste-redaktion.md`](../03-redaktion/checkliste-redaktion.md) (Wegweiser) + Dachdokument Abschnitt 11 |
| [`redaktion-historisch/qa-nach-redaktionsrunde-bis-2026-09-14.md`](./redaktion-historisch/qa-nach-redaktionsrunde-bis-2026-09-14.md) | `docs/03-redaktion/qa-nach-redaktionsrunde.md` | 2026-05-27 (Tranche 22) | [`../03-redaktion/qa-nach-redaktionsrunde.md`](../03-redaktion/qa-nach-redaktionsrunde.md) (Wegweiser) + Dachdokument 11.6 |
| [`redaktion-historisch/mitarbeiter-fahrplan-bis-2026-09-14.md`](./redaktion-historisch/mitarbeiter-fahrplan-bis-2026-09-14.md) | `docs/mitarbeiter-fahrplan.md` | 2026-06-05 (Batch 25/26/27) | [`../mitarbeiter-fahrplan.md`](../mitarbeiter-fahrplan.md) |

Jede Archivdatei beginnt mit einem Kopf, der Ursprungspfad, Archivdatum,
Stand und Nachfolger nennt. Relative Verweise wurden auf die neue Tiefe
angepasst; wo das nicht möglich war, ist die Ursprungsbasis im Kopf
dokumentiert. **Historische Messwerte sind keine aktuellen grünen Gates.**

## Archiviert 2026-09-15 (Doku-/Hilfeabschluss)

| Archivdatei | Ursprungspfad | Stand der Fassung | Nachfolger (aktiv) |
| ----------- | ------------- | ----------------- | ------------------ |
| [`status-historisch/current-status-bis-2026-09-15.md`](./status-historisch/current-status-bis-2026-09-15.md) | `docs/current-status.md` | 2026-09-15, Zwischenstände der Nacht | [`../current-status.md`](../current-status.md) |

**Ausnahme bewusst ohne Kopfzeile:** Diese Datei ist eine **byteidentische**
Kopie der Vorfassung (SHA256
`6e196efb785ed385dafcb9163021cb82926a4bb7c1a084dd592afc52f1894c05`, `cmp` ohne
Abweichung). Ein eingefügter Kopf würde die verlangte Inhaltsgleichheit
zerstören; Ursprung, Datum und Nachfolger stehen deshalb hier. Sie enthält die
inzwischen aufgelösten widersprüchlichen Zwischenstände (u. a. „Datenbank
weiterhin 414", „SQL nicht angewendet", „Vertrag angewendet, Import offen")
sowie den Juni-2026-Abnahmestand, die Freeze-Lesart, den Polnisch-Pilot und die
Langfassung zum Übersetzungs-Arbeitsbereich — alles **Historie**.

## Sicherungen / Backups

Die Übergabestände (Codebase-ZIP, CMS-Light-Snapshot `rls_public_only`,
Medieninventar) sind **logische Exporte plus Medien**, **kein vollständig
getesteter PostgreSQL-Restore**: ohne `auth.*`, `storage.*`, RPC-Körper,
vollständige Policies und ohne geprobte Wiederherstellung. Backup-Dateien
werden nicht verändert oder gelöscht.

