# Nächste Schritte nach dem CMS-Freeze

Stand: 2026-06-05 (nach Batch 25/26/27 — CMS-Freeze + Doku-Hygiene).

Der harte CMS-Kern ist seit Batch 25 freeze-reif (alle Gates auf 0). Was
hier steht, sind eigene **Folgeprojekte** — sie laufen nicht beiläufig,
sondern als getrennte Aufträge mit eigenem Scope.

Live-Status der Audits:
[`audit-snapshot/cms-steuerbarkeit-status.md`](./audit-snapshot/cms-steuerbarkeit-status.md).

## A — Login / Auth / Rollen (Folgeprojekt)

- `/admin` läuft heute bewusst ohne Login (interner Workspace).
- Vor produktivem Betrieb: Auth + Rollen (`admin`, `redaktion`) über
  separate `user_roles`-Tabelle + `has_role()`-Funktion.
- E-Mail + Google. Schreibwege bleiben über bestehende `rpc_admin_*`.
- Erst danach: externe Redaktion auf `/admin` loslassen.

## B — Restliche hartcodierte Klasse-A-Marketing-Pages

- Einzelne Marketing-Pages liegen noch hartcodiert (statt DB-first).
- Eigener Track: nach T-Code-Taxonomie sortieren, je Seite einzeln in
  CMS-Light überführen, Whitelist + Wahrheits-Check pro Migration.
- Während dieses Tracks gilt der CMS-Freeze für alle übrigen Bereiche
  weiter.

## C — Admin-UX-Kosmetik

- Kleine UI-Politur am Admin (Whitelist-Race, Sprung-Verhalten, Tooltips,
  Tastatur-Navigation).
- Keine neuen Schreibwege, keine neue Logik.
- Sammeln und gebündelt bearbeiten, nicht einzeln.

## D — Inhalts-Audit nach nächstem Marketing-Update

- Sobald Marketing neue Inhalte liefert: Diff gegen aktuellen DB-Stand,
  redaktionell einspielen, Snapshot aktualisieren
  (`scripts/sync/source-raw/i18n`).
- Spiegel-Audit muss nach dem Update wieder auf 0 stehen.

## E — Optionaler Feinschliff (nur falls Status das hergibt)

- Mobile/Tablet-Asset-Varianten füllen, wo der Desktop-Fallback heute
  greift.
- Whitelist-Seeding-Reste nachziehen, falls
  `cms-steuerbarkeit-status.md` welche ausweist.
- Linter-Warnungen (SECURITY DEFINER auf `rpc_admin_*`, Public-Bucket)
  final mit Security-Memory begründen oder umstellen.

## Bewusst NICHT auf dieser Liste

- Neue Section-Typen, neue Renderer-Logik, neue DB-Migrationen ohne
  expliziten Auftrag (siehe CMS-Freeze in `.lovable/always-follow.md`).
- Produktdatenbank / Produktkatalog / PDP.
- Externe Mailversand-Pipeline.
- Bezahlfunktionen.
- Designsystem-Tausch.

## Nachlese

Frühere Tranche-Pläne (Tranche 7–10, Mai-Roadmap) liegen unter
[`../archiv/sprint-berichte/`](../archiv/sprint-berichte/) und
[`../archiv/status-historisch/`](../archiv/status-historisch/) — Beleg,
nicht aktive Roadmap.
