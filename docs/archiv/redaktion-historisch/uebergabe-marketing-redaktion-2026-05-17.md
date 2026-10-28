> **Historisch — ersetzt durch das Dachdokument** (`docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md`). Verschoben im Batch 27, 2026-06-05. Inhalt unverändert darunter erhalten.

# Übergabe CMS-Light / TCS-Webseite

Datum: 2026-05-17
Empfänger: Marketingchef + Redaktionsteam
Absender: Thomas (technische Projektsteuerung)

Dieses Dokument fasst zusammen, was übergeben wird, was das Redaktionsteam
ab morgen tun kann und über welche Wege darüber hinausgehende Änderungen
laufen. **Es gibt keine grundsätzlich ausgeschlossenen Änderungswünsche.
Entscheidend ist, auf welcher Ebene eine Änderung umgesetzt wird.**

---

## 1. Was wurde aufgebaut?

- Eine neue **TCS-Webseite** in React/TypeScript, gehostet bei Lovable.
- Ein eigenes **CMS-Light** mit 6 Datenbank-Tabellen (Seiten, Blöcke, Felder,
  Assets, Navigation, Whitelist).
- Ein interner **Admin-Bereich** unter `/admin` für die Inhaltspflege.
- **DB-first-Rendering** für redaktionelle Inhalte: die Website liest Texte
  und Bilder weit überwiegend aus der Datenbank, nicht aus dem Quellcode.
  Wenige dokumentierte Ausnahmen sind technische Hub-, Produkt- oder
  Container­seiten ohne eigene redaktionelle CMS-Texte.
- Der **Produktkatalog** (Türkommunikation u. a.) ist über die **separate
  Produktdatenbank** angebunden und im CMS-Light nicht editierbar.

### Was in den letzten Wochen passiert ist

- **Komplette Inhalts-Übernahme** der bisherigen redaktionellen Seiten aus
  der Vorgänger-Content-Webseite ins CMS-Light: 94 Seiten, 8.288 Felder,
  Diff = 0 gegen Snapshot in `scripts/sync/source-raw/i18n`.
- **Bilder aus der Remix-/Vorgängerseite** wurden in den Storage migriert
  und mit den passenden Slots verbunden. Desktop-Varianten flächendeckend
  vorhanden, Mobile/Tablet teilweise lückenhaft (Fallback greift sauber).
- **Asset-Modell vereinheitlicht** (2026-05-16): Ein Bild-Slot je `field_key`
  mit drei Geräte-Varianten (`mobile`, `tablet`, `desktop`). Legacy-Slots
  bleiben für Rollback in der DB, werden vom Renderer aber ignoriert.
- **Spiegelregel** auch für Bilder durchgesetzt: `cms_assets`-RLS koppelt
  Bilder an aktive Sections, analog zu Textfeldern.
- **Renderer-Hook** `useCmsI18n(pageKey, ns, rootPrefix)` flächendeckend
  ausgerollt — i18n-JSON nur noch Fallback.
- **Schreibwege gehärtet**: Admin schreibt ausschließlich über 34
  `rpc_admin_*`-Funktionen (Whitelist + RLS, kein direkter Tabellen-Schreibzugriff).
- **Merkliste/Vergleich** für 2–4 Produkte als interner Prototyp (Route
  `/produkte/merkliste`, Speicherung lokal im Browser, kein Login).
  Finale Freigabe der Funktion durch Marketing/Geschäftsführung steht aus.

---

## 2. Die vier Änderungsebenen

| Ebene | Was passiert dort | Wer macht das |
|---|---|---|
| **1. Admin / CMS-Light** | tägliche redaktionelle Pflege | Redaktionsteam |
| **2. Lovable / Prompt / Code** | Templates, Layouts, neue Felder, Logik, CI | techn. Steuerung |
| **3. Produktdatenbank** | Artikel, Specs, Produktbilder, PDP | Produkt-/Katalogprozess |
| **4. Strategie / CI / Konzept** | grundsätzliche Entscheidungen | fachlich entscheiden → Ebene 2 |

Alle Ebenen sind offen. Sie laufen über **unterschiedliche Wege**, damit
Änderungen kontrolliert, geprüft und dokumentiert sind.

---

## 3. Was läuft im Admin (Ebene 1)

- **Texte** in Überschrift, Subline (kurzer Untertitel), Fließtext, Button-
  Beschriftungen (sofern Feld vorhanden).
- **DE/EN-Felder** — jedes Textfeld hat DE- und EN-Variante.
- **Bilder tauschen** an vorhandenen Bild-Slots, Upload in den Storage.
- **Alt-Texte** (DE/EN) für Barrierefreiheit und SEO.
- **Reihenfolge** von Blöcken einer Seite per Drag & Drop.
- **Sichtbarkeit** einzelner Blöcke ein-/ausschalten.
- **Navigations-Labels** (Menü-Beschriftungen) DE/EN.
- **Seite duplizieren** als Vorlage — Kopie ist automatisch Entwurf.
- **Übersetzungsvorschlag DE→EN** als Hilfsfunktion (Vorschlag, kein
  Auto-Speichern).

Bei **veröffentlichten, aktiven und verlinkten** Seiten wirken gespeicherte
Änderungen direkt auf die öffentliche Website (Spiegelregel). Bei
**Entwürfen, deaktivierten Blöcken oder nicht verlinkten Seiten** ist die
Änderung nur im Admin bzw. in der Vorschau sichtbar. Vorschau nach jedem
Speichern prüfen.

---

## 4. Was über Ebene 2 läuft (Lovable / Prompt / Code)

Diese Änderungen sind ausdrücklich möglich, werden aber nicht im Admin
gemacht, sondern als **Änderungswunsch** an die technische Steuerung:

- neue Templates / neue Seitentypen
- neue Layouts, Layoutgrößen ändern, Bildgrößen-/Bildverhalten
- neue Inhaltsblöcke, neue Bildplätze, neue technische Felder
- neue Buttons an neuer Stelle, neue Logik
- neue Konfigurator-Anbindungen, neue Katalog-Funktionen
- größere Navigationsstrukturen, neue Hauptkategorien
- CI-/Designänderungen (Farben, Typografie, Spacing-System)
- ganze Seiten umbauen, neu strukturieren oder entfernen
- erstmalige Veröffentlichung neuer Seitenarten

---

## 5. Was über Ebene 3 läuft (Produktdatenbank)

- Türkommunikation: eigener Produktkatalog + PDP aus separater Produktdatenbank.
- Zutrittskontrolle: teilweise produktverknüpft, sonst Contentseiten.
- Eingangslösungen: Systembeschreibungen, Anfrage-/Konfigurator-Verweise.
- Briefkasten: Contentseite mit Verweis auf externen Konfigurator.

**Produktbilder im Katalog / auf Produktdetailseiten** gehören zum
Produktprozess und werden dort gepflegt. **Redaktionelle Website-Bilder**
(Hero, Intro, Persona-Karten, Content-Sektionen) werden im CMS-Light über
den Admin gepflegt.

Es gibt **keinen Shop**, **keinen Warenkorb**, **keine Bestellfunktion**.

Produktdaten werden im **eigenen Produktprozess** gepflegt, nicht im Admin.

---

## 6. Was über Ebene 4 läuft (Strategie / CI / Konzept)

- CI komplett ändern
- Designsystem austauschen
- Hauptnavigation neu denken
- Seitenkonzept oder Produktbereich neu aufbauen

→ fachlich entscheiden, danach technisch über Ebene 2 umsetzen.

---

## 7. Wie ein Änderungswunsch aussieht

Kurz und präzise:

1. **Was** soll geändert werden? (Seite / Block / Bereich)
2. **Warum**? (fachlicher Grund / Wirkung)
3. **Wie**? (gewünschtes Ergebnis, ggf. Skizze oder Screenshot)
4. **Bis wann**? (falls relevant)

Die technische Steuerung übersetzt das in einen Prompt / Migration /
Code-Auftrag und meldet das Ergebnis zurück (Build-Status, geänderte
Dateien, ggf. Migrationen).

---

## 8. Wie Lovable mit Prompts umgeht

Lovable wird mit festen Projektregeln aus `.lovable/always-follow.md` und
den verlinkten Strategie-Dokumenten gesteuert. Prompts, die gegen diese
Regeln verstoßen würden — z. B. Produktdaten anfassen, Inhalte fest in
Code schreiben, öffentliche Navigation ohne Auftrag umbauen —, sollen
gestoppt und gemeldet werden. Diese Regeln reduzieren das Risiko,
ersetzen aber keine fachliche Prüfung.

Betriebsmodell nach Übergabe:

- **Admin** ist der Standardweg für bestehende redaktionelle Inhalte
  (Texte, Bilder, Reihenfolge, Sichtbarkeit, Nav-Labels).
- **Lovable-Prompts** sind der Arbeitsweg für Struktur, Funktion,
  Layout, Datenmodell und größere Bulk-Anpassungen. Die für ihren
  Bereich verantwortliche Person aus Marketing/Redaktion kann Prompts
  selbst formulieren und auslösen.
- **Wer promptet, verantwortet** Ziel, Scope, Sprachen (DE/EN),
  Ausschlüsse, ausgeführte Checks und den Bericht. Vorlage und
  Standard-Leseliste: [`../04-betrieb/prompts-vs-admin.md`](../04-betrieb/prompts-vs-admin.md).
- **Technischer Gegencheck** kann bei Bedarf eingeholt werden, ist aber
  nicht dauerhafte zentrale Ausführungsstelle.
- Nach jeder Prompt-Etappe gehören Build und Checks zur Abnahme
  (`npm run build`, `npm run i18n:check`, ggf. `cms:audit`).
- Migrationen werden idempotent geschrieben (frische und bestehende DB
  führen zum selben Zielzustand).

### DE/EN-Verhalten

- DE und EN sind im Admin **getrennte Felder pro Inhaltsfeld**. Eine
  DE-Änderung wirkt sich **nicht automatisch** auf EN aus.
- Es gibt eine **Auto-Übersetzungsfunktion DE→EN** pro Feld als
  Vorschlag in das EN-Eingabefeld (Edge Function
  `cms-translate-field`). Der Vorschlag wird erst durch manuelles
  Speichern übernommen und ersetzt keine fachliche Prüfung.
- Lovable-Prompts müssen Sprachen **explizit nennen** (DE, EN oder
  beide). Wird nur DE genannt, bleibt EN unberührt.

---

## 9. Wie ihr im Admin arbeitet

1. **Admin öffnen** (`/admin`).
2. **Seite im Strukturbaum** wählen.
3. **Block (Section)** im Detail-Panel wählen.
4. **Text oder Bild ändern** (DE und EN beachten).
5. **Speichern**.
6. **Vorschau prüfen** — erscheint die Änderung?
7. Bei Fehlern: **Kurz-ID + Screenshot** an die technische Steuerung
   (Präfixe: N-… Navigation, P-… Seite, B-… Block, A-… Asset).

---

## 10. Offene Punkte (ehrlich)

- **Admin läuft aktuell bewusst ohne Login** im internen Workspace.
  Vor einem echten produktiven Betrieb muss der Admin abgesichert oder
  deaktiviert werden.
- **SEO-Härtung** (Sitemap, strukturierte Daten, Meta-Daten in der Breite)
  noch offen.
- **Mobile/Tablet-Bildvarianten** teilweise lückenhaft (Fallback greift).
- **Wenige Hub-/Container-Seiten** ohne eigene redaktionelle CMS-Texte —
  dokumentierte Ausnahmen vom DB-first-Rendering.
- **Bucket `cms-assets`** im Prototyp offen, wird vor produktivem Betrieb gehärtet.
- **Merkliste** als Prototyp vorhanden, finale Freigabe durch Marketing/GF offen.
- **Finale Freigabe** durch Marketing / Geschäftsführung steht aus.

---

## 11. Drei Arbeitsprinzipien fürs Team

1. **Tägliche Inhaltsarbeit gehört in den Admin.**
2. **Strukturelle, funktionale und gestalterische Änderungen** werden über
   Lovable-Prompts mit klarem Scope, expliziter Sprachangabe (DE/EN) und
   Checks umgesetzt. Bei Bedarf technischer Gegencheck.
3. **Vorschau nach jedem Speichern prüfen**; bei Fehlern Vorgang
   dokumentieren (Seite, Kurz-ID, Screenshot) und Folgeschritt entscheiden.

---

## Verweise

- [Startseite für neue Redakteure](./start-fuer-neue-redakteure.md)
- [Redaktionshandbuch (Vollversion)](./redaktionshandbuch.md)
- [Kurzanleitung (1 Seite)](./kurzanleitung.md)
- [Prompt oder Admin?](../04-betrieb/prompts-vs-admin.md)
- [Aktueller Stand](../current-status.md)
