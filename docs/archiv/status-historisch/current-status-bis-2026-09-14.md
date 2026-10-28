# ARCHIV — Kurzstatus, Fassung bis 2026-09-14

> **Historie. Nicht mehr maßgeblich.**
>
> - Ursprungspfad: `docs/current-status.md`
> - Archiviert am: 2026-09-14 (Etappe 1 CMS-Light-Reparatur)
> - Inhaltlicher Stand dieser Fassung: 2026-06-05 (Batch 27/28)
> - Nachfolger (aktiv): `docs/current-status.md (überarbeitet, ohne Gesamtgrün-Aussage)`
>
> Die hier genannten Prüfwerte sind **historische Messwerte** und
> **keine aktuellen grünen Gates**. Der Inhalt unterhalb ist
> unverändert erhalten.
>
> Relative Verweise wurden beim Verschieben von der Ursprungsbasis
> `docs/` auf `docs/archiv/status-historisch/` angepasst.

---

# Aktueller Stand

Stand: 2026-06-05 — nach Batch 26 (Doku-Freeze) / Batch 27 (Doku-Hygiene).

## Kurzstatus

**CMS-Kern ist freeze-reif / grün.**

Alle harten Gates sind 0:

- Wahrheits-Check: 0 Kritisch / 0 Restschuld
- Coverage (aktive DB-Sections ohne Renderpfad): 0
- Globaler Spiegel-Audit: 0
- FAQ/CTA orphan/mixed/dedup-only: 0
- Public-Blocks rot/gelb_restschuld: 0

**„Freeze" heißt: kein unkontrollierter Umbau — nicht Stillstand.**
Kontrollierte redaktionelle Arbeit innerhalb des bestehenden CMS-Light-
Baukastens ist ausdrücklich erlaubt: Seiten und Unterseiten anlegen,
Navigation anpassen, Karten ergänzen/sortieren/entfernen, Bausteine
sortieren, Bilder tauschen, Links setzen, bestehende Seitentypen /
Section-Typen / Kartenmodelle verwenden. Wenn ein Wunsch außerhalb
des Baukastens liegt (neuer Seitentyp, neuer Section-Typ, neue
Renderer-Logik, DB-Migration außerhalb normaler CMS-Datenpflege,
Produkt-DB-Arbeit, Login/Auth, Änderung der technischen Routing-/
Navigationsarchitektur), improvisiert Lovable nicht, sondern erklärt
kurz, welches Systemelement fehlt, und schlägt einen sauberen
Folgeauftrag vor — die Redaktion selbst wird dadurch nicht ausgebremst.
Details siehe `.lovable/always-follow.md`, Abschnitt CMS-Freeze.

Detail-Live-Status: [`04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md`](../../04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md).
Abnahmebericht: [`04-betrieb/audit-snapshot/batch25-cms-abschluss-freeze.md`](../../04-betrieb/audit-snapshot/batch25-cms-abschluss-freeze.md).
Führende Startseite für Redaktion und Prompts:
[`03-redaktion/redaktions-uebergabe-und-prompt-regeln.md`](../../03-redaktion/redaktions-uebergabe-und-prompt-regeln.md).

## Was im Scope abgeschlossen ist

- DB-first-Rendering auf allen aktiven CMS-Seiten via `useCmsI18n`.
- Spiegelregel greift flächendeckend (Reihenfolge, Sichtbarkeit, Inhalt).
- Whitelist-Pflicht (`cms_admin_editable_fields`) ist eingehalten.
- Service-Hub, Navigations-Pillen, Breadcrumbs, Schattenfeld-Bereinigung,
  „Hauptmenü aus"-Hint — alle erledigt.
- ZIP-Übergabestand dokumentiert (Codebase-ZIP + CMS-Light-Snapshot,
  beide manuell; Snapshot = `rls_public_only`, kein vollständiges DB-Backup).

## Bewusst offen / nicht im CMS-Scope

- Login / Auth / Rollenmodell (eigenes Folgeprojekt)
- Einzelne Klasse-A-Marketing-Pages, die noch hartcodiert sind
- Admin-UX-Kosmetik (z. B. Whitelist-Race, kleine UI-Politur)
- Inhalts-Audit nach dem nächsten Marketing-Stand
- **Polnisch (PL): Pilot läuft, noch nicht redaktionell abgenommen.**
  Übersetzungsgrundlage (Übersetzungsspeicher, Auftrags-Protokoll,
  Herkunftsstatus) steht; PL-Inhalte bisher nur auf
  `anwendungen.einfamilienhaus` und `anwendungen.klinik` (362 Felder, alle
  „maschinell"). Der Pflege-Editor hat die dritte Spalte PL samt
  Herkunfts-Kennzeichnung und Einzelübersetzung je Feld. Offen: PL-Freigabe
  („geprüft") und PL-Veröffentlichung.
- **Übersetzungs-Arbeitsbereich (seit 2026-09-11):** `/admin` hat direkt nach
  „Wahrheits-Check" den Bereich **Übersetzungen** — Sprachliste aus der
  Datenbank (DE Quelle, EN/PL aktiv, NL/DA vorbereitet und aus),
  Abdeckungsübersicht, Umfangswahl (eine Seite / Auswahl / ganze Sprache),
  Pflicht-Vorschau mit Kostenschätzung, echte fortsetzbare Läufe in der
  Datenbank (Pause/Fortsetzen/Abbruch, Fortschritt, Restzeit) und ein
  Prüfbericht mit CSV bzw. Druck/PDF. Seit 2026-09-11 umfasst der Bereich
  **alle** übersetzbaren Datenbereiche (15.855 deutsche Texte: 15.278
  Baustein-Texte, 125 Seitentitel, 141 Navigations-Beschriftungen, 42
  Navigations-Beschreibungen, 269 Bild-Alternativtexte) und eine durchsuchbare
  Textliste zum Übersetzen von Hand. Die Modell-Auswahl kommt seit 2026-09-11
  ausschließlich aus der Datenbank: Standard für große Läufe
  `google/gemini-3.6-flash`, Qualitätsmodus `openai/gpt-6-astra`, dazu
  Gemini 3.7 Flash, 3.1 Flash Lite und 3.1 Pro (Vorschau); die alten
  Gemini-2.5-Einträge sind entfernt. „Anderes Modell" öffnet ein geprüftes
  Eingabefeld (`anbieter/modell`). Für Gateway-Modelle wird bewusst keine
  Kostenschätzung ausgewiesen (Abrechnung nach Token). Titel, Navigation und Bild-Alternativtexte
  sind für Läufe nur dort vorbereitet, wo die Seite in der Sprache vorbereitet
  ist — Polnisch bleibt damit auf die Pilotseiten begrenzt.
  Seit 2026-09-12 führt der Bereich einen kompakten Hauptablauf in drei
  Schritten („1 Sprache wählen", „2 Fehlende Texte prüfen", „3 Alles Fehlende
  übersetzen"); alles Weitere liegt in geschlossenen Akkordeons. Geplant und
  übersetzt wird ausschließlich Fehlendes und Veraltetes; die Pflicht-Vorschau
  wird per Haken bestätigt. Vorbereitungs- und Übersetzungsstand werden getrennt
  gezählt („vorhanden / fehlt / muss aktualisiert werden / Fehler" gegenüber
  „für diese Sprache noch nicht vorbereitet"). Es gibt genau eine Laufanzeige;
  die Restzeit erscheint erst nach mindestens 25 verarbeiteten Texten. Im
  normalen Ablauf gibt es keine Eingabe für Sprachkürzel oder Freigabewort —
  ohne serverseitige Freigabe steht dort neutral „Gesamtlauf noch nicht
  administrativ freigeschaltet" und die Schaltfläche bleibt gesperrt.
  Die Verarbeitung läuft seit 2026-09-11 vollständig auf

  dem Server: eine Nachschau im Minutentakt arbeitet offene Läufe weiter,
  nimmt hängengebliebene Schritte wieder auf und schaltet sich ab, sobald
  kein Lauf mehr offen ist. Ein geschlossener Browser hält nichts an. Details:

  [`04-betrieb/uebersetzungswerkzeug.md`](../../04-betrieb/uebersetzungswerkzeug.md).
  Weiterhin ohne Login/Rollenmodell; Schutz kommt aus serverseitiger
  Mengenbremse (30/Minute, 600/Tag je Ursprung+IP), harten Eingabegrenzen und
  CORS nur für die eigenen Ursprünge. Gesamtläufe über eine ganze Sprache sind
  serverseitig gesperrt, solange kein Freigabewort hinterlegt ist.
  Live-Details:
  [`04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md`](../../04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md).



## Historie

Lange Sprint- und Etappen-Erzählungen sowie der frühere Langstatus liegen
unter [`archiv/status-historisch/current-status-bis-batch26.md`](../../archiv/status-historisch/current-status-bis-batch26.md)
und [`archiv/sprint-berichte/`](../../archiv/sprint-berichte/). Sie sind
Belege, aber keine aktive Arbeitsgrundlage mehr.
