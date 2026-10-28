# Redaktions-Übergabe und Prompt-Regeln (Dachdokument)

Stand: 2026-09-14 · Status: **führende Startseite und führende Regelquelle
für Redaktion und Prompt-Arbeit**. Die früheren Prompt-Dokumente
(`start-fuer-neue-redakteure.md`, `prompt-kurzanleitung.md`,
`prompt-leitplanken.md`, `redaktions-prompts.md`) liegen seit Batch 27
unter [`../archiv/redaktion-historisch/`](../archiv/redaktion-historisch/)
und sind **nicht mehr führend**. Bei Widerspruch gilt **dieses** Dokument.

> **Vorrang innerhalb dieses Dokuments:** Bei Widerspruch zwischen den
> Abschnitten 1–10 und **Abschnitt 11 (Verbindlicher Arbeitsablauf)** gilt
> Abschnitt 11. Die frühere Fassung liegt unter
> [`../archiv/redaktion-historisch/redaktions-uebergabe-und-prompt-regeln-bis-2026-09-14.md`](../archiv/redaktion-historisch/redaktions-uebergabe-und-prompt-regeln-bis-2026-09-14.md).
> **Es gibt derzeit kein Gesamtgrün**; früher gemeldete Nullwerte sind
> Historie, kein aktueller Messwert.

> Ziel dieses Dokuments: **eine** Wahrheit für Redaktion und Prompt-Arbeit.
> Redakteure müssen nicht die ganze Doku lesen — sie nutzen die Schablone
> in Abschnitt 2. Projekt-Knowledge und der Startblock der Schablone
> **weisen das Lesen der Pflicht-Dokumente an**; eine technisch
> garantierte Kontrolle darüber gibt es nicht. Deshalb muss der
> Ausführende **vor dem ersten Schreibzugriff** kurz benennen, was er
> gelesen hat und wohin geschrieben wird (siehe Startblock in Abschnitt 2
> und Abschnitt 11.1).

---

## 1. So funktioniert die Übergabe (Kurz-Erklärung)

Die Redaktion gibt einen **Lovable-Prompt** mit drei Teilen ab:

1. **Startblock** (unverändert übernehmen) — sagt Lovable, was zuerst zu
   lesen ist und welche Arbeitsregeln gelten.
2. **Arbeitsauftrag** (Redaktion füllt nur diesen Teil aus) — was, wo,
   in welcher Sprache, mit welchen Inhalten.
3. **Abschlussblock** (unverändert übernehmen) — sagt Lovable, wie der
   Bericht aussehen muss und dass keine Folgearbeiten beginnen.

Die Schablone steht direkt darunter in Abschnitt 2.

---

## 2. Prompt-Schablone für Redakteure (kopieren, Mittelteil ausfüllen)

> **Diese Schablone ist die einzige verbindliche Prompt-Quelle.**
> Komplett kopieren, **Mittelteil** ausfüllen, **Start- und Abschluss-
> block unverändert lassen**.

````md
# Redaktionsprompt für Lovable / CMS-Light

Bitte lies zuerst diese Dokumente in dieser Reihenfolge:

1. docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md
2. docs/current-status.md
3. docs/04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md
4. .lovable/always-follow.md

Arbeitsregel:

Arbeite DB-first im bestehenden CMS-Light-Baukasten. Keine zweite
Wahrheit erzeugen (kein Hardcoding, keine parallelen Inhalte in Code
oder i18n), alles über `cms_pages`, `cms_sections`, `cms_section_fields`,
`cms_assets`, `cms_navigation_nodes` und `rpc_admin_*`.

Innerhalb des Baukastens ist die Redaktion frei: Seiten und Unterseiten
anlegen, Navigation bearbeiten (Knoten anlegen/verschieben/ausblenden,
Sortierung, `nav_area`, „Hauptmenü aus"), Karten ergänzen/sortieren/
löschen, Bausteine sortieren, Bilder/Links/Texte/FAQ/CTA/Chips/
Bulletpoints pflegen, bestehende Seitentypen / Section-Typen /
Kartenmodelle wiederverwenden. Alles bleibt spiegel-treu, idempotent und
wird am Ende über Wahrheits-Check verifiziert.

Technische Rückfrage stellen — nicht improvisieren — nur dann, wenn ein
neuer Baukasten-Baustein fehlt (neuer Seitentyp, neuer Section-Typ, neue
Renderer-Sonderlogik, DB-Migration außerhalb normaler CMS-Datenpflege,
Produkt-DB-Arbeit, Login/Auth, Änderung der technischen Routing-/
Navigationsarchitektur). In diesem Fall bitte kurz erklären, welches
Systemelement fehlt, und einen sauberen Folgeauftrag vorschlagen — die
Redaktion selbst wird dadurch nicht ausgebremst.

Keine Folgearbeiten starten, wenn sie nicht ausdrücklich beauftragt sind.

Bitte **vor dem ersten Schreibzugriff** kurz nennen (drei Zeilen
genügen):

- welche führenden Quellen tatsächlich gelesen wurden,
- Ziel-ID, Feld bzw. Bildslot und Sprache,
- welcher bestehende Schreibweg benutzt wird (`rpc_admin_*`).

Ist eine Zuordnung ungeklärt, wird **nur der betroffene Schreibschritt**
gestoppt und gemeldet — keine Hardcode-Ersatzlösung, keine geratene
Zuordnung.

---

## Arbeitsauftrag der Redaktion

Ziel:
[Was soll geändert, angelegt oder geprüft werden?]

Betroffene Stelle:
- Seite / Kurz-ID: [P-… oder page_key]
- Block / Kurz-ID: [B-… oder section_key]
- Navigation / Kurz-ID: [N-… falls betroffen]
- Asset / Kurz-ID: [A-… falls betroffen]

Art der Änderung:
[Textänderung / Bildtausch / neue Karte / neue Unterseite /
 Navigation ändern / QA prüfen / anderes]

Sprachen (bitte ausdrücklich nennen — es gibt keine automatische
Zweitsprachenpflicht, siehe Abschnitt 11.3):
[nur DE / DE+EN / nur EN / bestehende Übersetzungen unverändert lassen]


Inhalte:
[Hier konkrete Texte, Bilder, Links, Reihenfolge, Karten, Wünsche
 usw. einfügen]

---

## Abschluss und Prüfung

Bitte am Ende berichten:

- Was wurde geändert?
- Welche Seiten/Blöcke/Assets/Navigation-Knoten waren betroffen?
- Wurde alles im CMS-Light/DB-first-Modell umgesetzt?
- Wurde keine zweite Wahrheit in Code/i18n erzeugt?
- Wurden bestehende Seitentypen und Section-Typen verwendet?
- Falls Navigation betroffen war: sind Route, Breadcrumb und
  Kartenlinks konsistent?
- Liegen die drei Abschlussnachweise aus Abschnitt 11.6 vor
  (Rücklesen aus der Datenbank, CMS-Bearbeitbarkeit, sichtbare
  Preview-Prüfung)? Fehlt einer, lautet der Status **offen**.
- Welche Prüfungen liefen (z. B. `npm run cms:preflight`) und welche
  nicht? Nicht Gemessenes bitte als **ungeprüft** melden, nicht als grün.
- Gibt es offene Punkte oder Rückfragen?


Zusätzlich: Wenn **mehrere Seiten** betroffen sind oder die Änderung
**navigationell/strukturell relevant** ist (neue Seite, neuer Block,
Reihenfolge, Sichtbarkeit, Navigation), bitte einen **kurzen Eintrag**
oben in `docs/03-redaktion/redaktions-aenderungsprotokoll.md` anhängen
(Format steht dort). Für reine Tippfehler/Bildtausch reicht der
Chat-Bericht.

Keine Folgearbeiten starten, wenn sie nicht ausdrücklich beauftragt sind.

````

---

## 3. Was ist jetzt freigegeben?

Die Redaktion darf im laufenden Betrieb:

- Texte, Überschriften, Sublines, Bildunterschriften, Linktitel pflegen.
- Bilder und Alt-Texte austauschen.
- Karten (Bildkarten, Iconkarten), Bulletpoints, Chips, FAQ-Einträge,
  CTA-Blöcke pflegen.
- Sprachvarianten genau in dem Umfang pflegen, den der Auftrag nennt
  (Abschnitt 11.3) — keine automatische DE→EN-Pflicht, keine
  Nebenläufe in weitere Sprachen.
- Sichtbarkeit (`is_active`) und Reihenfolge (`sort_order`) bestehender
  Blöcke ändern.
- **Neue Seiten und Unterseiten** anlegen (bestehender Seitentyp,
  bestehende Section-Typen).
- **Navigation** anpassen: neue Navigationselemente, neue Unterseiten,
  Sortierung, Punkte ausblenden, Punkte ersetzen.

**Alles bleibt im CMS-/DB-first-Modell.** Inhalte landen in `cms_pages`,
`cms_sections`, `cms_section_fields`, `cms_assets`,
`cms_navigation_nodes` — nicht im Code.

---

## 4. Was darf nicht einfach nebenbei passieren?

- Keine hartcodierten neuen Inhaltsseiten im Code.
- Keine zweite Wahrheit (gleicher Text in Code und DB).
- Keine neuen Renderer-Sonderfälle ohne eigenen technischen Auftrag.
- Keine neuen Section-Typen ohne Architekturentscheidung.
- Keine verdeckten Public-Blöcke, die im Admin nicht pflegbar sind.
- Keine Admin-Schalter, die öffentlich keine Wirkung haben.
- Kein Login/Auth im normalen Redaktionsprompt (eigenes Folgeprojekt).
- Keine Eingriffe in Produktdatenbank, Produktkatalog oder PDP.

---

## 5. Regeln für neue Seiten

Vor jedem Anlegen prüfen:

- [ ] Passender bestehender **Seitentyp / T-Code** vorhanden?
  (`docs/01-strategie/seitentyp-taxonomie.md`)
- [ ] Passende bestehende **Section-Typen** vorhanden?
  (`docs/02-architektur/section-typen-katalog.md`)
- [ ] CMS-Page mit `page_key`, `route_path` und `status` ist angelegt.
- [ ] Bei Bedarf `cms_navigation_nodes`-Eintrag (Parent, Sortierung,
  `nav_area`).
- [ ] Parent/Child-Struktur, Sortierung und Breadcrumb funktionieren.
- [ ] Die Seite ist über mindestens einen Weg erreichbar
  (Karte / Navigation / Footer / Direkt-Route).
- [ ] **Alle sichtbaren Inhalte sind im Admin pflegbar**
  (`cms_admin_editable_fields` für jedes neue Feld gesetzt).
- [ ] Standard auf T03/T04/T05: `faq_v1` + `cta_v1` mitbestellen,
  default `is_active=false`.
- [ ] Nach Anlage: **Wahrheits-Check ohne Kritisch/Restschuld**.

Wenn auch nur **eine** Box leer bleibt → kein Workaround. Stattdessen
kurz erklären, welches Systemelement fehlt, und einen sauberen
Folgeauftrag vorschlagen — die Redaktion bleibt arbeitsfähig.

---

## 6. Regeln für Navigation

„**Hauptmenü aus**" bedeutet **nicht** „Seite offline":

- Der Knoten erscheint nicht im oberen Hauptmenü.
- Die Seite kann trotzdem live und erreichbar sein.
- Erreichbarkeit darf über Karten, Footer, Direkt-Route oder andere
  Einstiege laufen.

Navigation darf redaktionell weiterentwickelt werden, aber:

- DB-first über `cms_navigation_nodes` / `rpc_admin_*` arbeiten.
- Parent/Child-Beziehungen müssen konsistent bleiben.
- Breadcrumbs müssen geprüft werden (auch bei `is_active=false`).
- Karten-Verlinkungen müssen mit der echten Route übereinstimmen.
- Subknoten behalten die graue Verlinkungs-Pille im Admin-Baum.
- Nach Navigationsänderungen: Wahrheits-Check + kurze Preview-Prüfung.

---

## 7. Eskalationspfad — wann fehlt ein Baukasten-Baustein?

Sobald der Wunsch über den bestehenden CMS-Light-Baukasten hinausgeht,
soll Lovable **nicht improvisieren**, sondern kurz erklären, **welches
technische Systemelement fehlt**, und einen sauberen Folgeauftrag
vorschlagen. Die Redaktion selbst wird dadurch nicht ausgebremst —
sie bekommt einen klaren nächsten Schritt. Auslöser sind:

- Neuer Section-Typ wird benötigt (`section_type` existiert nicht).
- Neues Layoutmodell, das kein bestehender Renderer abbildet.
- Neue Renderer-Sonderlogik (Sonderfälle für eine bestimmte Seite).
- Neue Felder, die nicht in das bestehende Karten-/Section-Modell passen.
- Änderung an `rpc_admin_*`, RLS, Whitelist-Mechanik.
- Änderung an Produktdatenbank, PDP, Katalog, Footer-Logik.
- Login / Auth / Rollenmodell.
- Änderung der technischen Routing-/Navigationsarchitektur (über die
  redaktionelle Pflege von `cms_navigation_nodes` hinaus).
- Klasse-A-Marketing-Pages, die noch hartcodiert sind.

In diesen Fällen: **eigener technischer Auftrag**, mit klarem Scope.

---

## 8. T-Codes & Container — Kurzreferenz

Detail- und Pflegeregeln stehen jeweils in einer einzigen Quelle
(Single Source). Diese Kurzreferenz ist nur Orientierung.

**T-Codes (Seitentypen):** T01 Hub, T02 Listing, T03 Detail, T04
Spezial-Detail, T05 Sub-Detail, T11 Funktional, T17/T19 Sonderformen.
Vollständige Definition + Pflichtbausteine →
[`../01-strategie/seitentyp-taxonomie.md`](../01-strategie/seitentyp-taxonomie.md).

**Container-Typen für Karten (aktiv im Standardbetrieb):**

- `cards_v1` — klassisches Raster (gleichförmige Karten).
- `product_scroller_v1` — Scroller, wirkt bei wenigen Karten wie Raster,
  scrollt bei Überlauf horizontal.
- `teaser_2col_v1` — Wechselteaser (zwei Spalten, Bild/Text wechselnd).

`feature_grid_v1` ist historisch (0× aktiv) — für neue Vorteils-/Merkmal-
Raster bitte `cards_v1` verwenden; Icons funktionieren dort gleichwertig
(`icon` als Lucide-Textfeld oder `icon_image` als Bildslot).

Karten selbst sind immer `card_v1` als Kind-Sections (nicht `items.N.*`).
Vollständige Definition →
[`../02-architektur/section-typen-katalog.md`](../02-architektur/section-typen-katalog.md).

**Karten-Raster-Regel:** Spalten/Reihen werden zentral über
`cardGridClass()` / `cardGridItemClass()` aus
`src/features/cms/lib/cardGrid.ts` berechnet (keine hartcodierten
`grid-cols-*`-Klassen in Custom-Pages). Familien:

- `benefits` → max 3 pro Reihe
- `default` (Use-Cases, Lieferumfang, Module, etc.) → max 4 pro Reihe

Beispiele und Ausnahmen →
[`../02-architektur/karten-raster-regel.md`](../02-architektur/karten-raster-regel.md).

**Standard auf T03/T04/T05:** `faq_v1` + `cta_v1` als Bausteine
mitbestellen, default `is_active=false`. Whitelist
(`cms_admin_editable_fields`) für jedes neue Feld im selben
Migrationsschritt.

---

## 9. Wenn etwas nicht funktioniert

Fehler kurz dokumentieren und mit **Kurz-ID** melden:

- **N-…** Navigationsknoten
- **P-…** Page (Seite)
- **B-…** Block / Section
- **A-…** Asset (Bild)

Typische Fehlermeldungen: `field_not_allowed` (Whitelist fehlt),
`section_not_found`, `asset_not_valid_for_edit`.

Nicht doppelt speichern — Vorgang dokumentieren und Rückfrage stellen.

---

## 10. Verweise (für Nachschlagen, nicht Pflichtlektüre für Redaktion)

- [Always-Follow Projektregeln](../../.lovable/always-follow.md)
- [CMS-Steuerbarkeit aktueller Stand](../04-betrieb/audit-snapshot/cms-steuerbarkeit-status.md)
- [Seitentyp-Taxonomie](../01-strategie/seitentyp-taxonomie.md)
- [Section-Typen-Katalog](../02-architektur/section-typen-katalog.md)
- [Karten-Raster-Regel](../02-architektur/karten-raster-regel.md)
- [Asset-Strategie](../01-strategie/asset-strategie.md)
- [Wahrheits-Check Admin-Tab](../04-betrieb/wahrheits-check.md)
- [Prompt oder Admin?](../04-betrieb/prompts-vs-admin.md)
- [Redaktionshandbuch (Vollversion)](./redaktionshandbuch.md)
- [Kurzanleitung Redaktion (Print)](./kurzanleitung.md)
- [Redaktions-Änderungsprotokoll](./redaktions-aenderungsprotokoll.md)


---

## 11. Verbindlicher Arbeitsablauf (ergänzt 2026-09-14, Etappe 1)

Dieser Abschnitt ist Teil des Dachdokuments und damit die führende
Regelquelle. Es gibt bewusst **keine** zweite Vertragsdatei.

### 11.1 Ziel vor der Arbeit feststellen

Vor jeder Änderung muss eindeutig feststehen:

- **Seite** (Slug und Kurz-ID/`page_key`),
- **Baustein** (Section, Typ, `sort_order`),
- **Feld** (bestehender Feldname) bzw. **Bildslot**,
- **Sprache** (`locale`),
- **führende Quelle** für diesen Inhalt.

Bestehende Felder, Section-Typen und Medienzuordnungen werden
wiederverwendet. **Bei mehrdeutigem Ziel wird nicht geraten** — kurz
melden, Rückfrage stellen, nichts schreiben.

Das Lesen der Pflicht-Dokumente ist **angewiesen, nicht technisch
erzwungen**. Deshalb gilt die kurze Selbstauskunft aus dem Startblock in
Abschnitt 2: gelesene führende Quellen, Ziel-ID/Feld/Sprache, benutzter
Schreibweg — vor dem ersten Schreibzugriff. Ungeklärte Zuordnung stoppt
nur den betroffenen Schreibschritt.

### 11.2 Wo welcher Inhalt hingehört

- Redaktionelle Texte, Überschriften, Bildunterschriften, Linktitel,
  Bilder und Alt-Texte → CMS-Tabellen (`cms_pages`, `cms_sections`,
  `cms_section_fields`, `cms_assets`, `cms_navigation_nodes`).
- Zentrale Bedien-/UI-Texte → vorhandener Katalog `cms_ui_strings`
  samt zugehörigen Übersetzungen. Keine neue Parallelstruktur.
- Produktdaten (Katalog, PDP, Specs, Downloads) → ausschließlich lesend
  aus der bestehenden Produktbasis. Niemals ins CMS kopieren.
- Code bleibt zuständig für Layout, Anordnung, Interaktion und
  Typregeln — nicht für Inhalte.

Bestehende Code-/i18n-Fallbacks werden **jetzt nicht entfernt**; sie
gelten als **Übergang** und sind als solcher zu kennzeichnen. In der
Anzeige sind vier Zustände zu unterscheiden: **leer**, **verborgen**,
**fehlend** und **Ladefehler** — kein Vermischen zu „nichts da".

### 11.3 Sprachen

- Zielumfang: EN, PL, NL, DA.
- Welche Sprachen tatsächlich verfügbar/öffentlich sind, kommt
  ausschließlich aus dem bestehenden Sprachregister (`cms_locales` über
  `src/i18n/localeRegistry.ts`). **Keine neue Whitelist im Code.**
- Übersetzungen werden ohne zusätzliche Kuratierungssperre ausgespielt.
  Freigabe- und Herkunftsangaben dürfen dabei **nicht** verfälscht oder
  unterdrückt werden.
- **Keine automatischen neuen Übersetzungsläufe**, keine HU-Arbeiten.
  Ein pausierter Lauf bleibt pausiert.
- Ein deutscher Inhaltspilot wird zunächst **nur in DE** gepflegt; alle
  anderen Sprachen bleiben unverändert.

### 11.4 Zugang

Bestehender legitimer Zugang bleibt erhalten. Es wird **jetzt keine neue
Kontopflicht** eingeführt. Der No-Login-Zustand von `/admin` und der
fehlende Herkunftsschutz auf Serverseite sind dokumentierte **offene**
Sicherheitszustände, keine Abnahme.

### 11.5 Schreibarbeiten

1. Vor dem Schreiben **aktuelle Ausgangswerte lesen**.
2. Gleichzeitige Fremdänderungen erkennen und **nicht blind
   überschreiben**; bei Abweichung stoppen und melden.
3. Schreiben nur über die vorgesehenen `rpc_admin_*`-Verträge.

**Ehrliche Grenze (präzise, Stand 2026-09-14):** Jeder einzelne
`rpc_admin_*`-Aufruf läuft weiterhin in seiner eigenen
Datenbank-Transaktion — eine einzelne Schreib-RPC ist also entweder
vollständig wirksam oder gar nicht. **Nicht** vorhanden ist:

- eine **feldübergreifende** Klammer über **mehrere getrennte
  RPC-Aufrufe** (mehrere Felder/Bausteine sind nicht gemeinsam atomar;
  ein Abbruch mitten in einer Reihe hinterlässt Teiländerungen),
- eine **Versionsabsicherung** beim Schreiben (kein
  `updated_at`-/Versionsvergleich im Schreibvertrag, keine
  optimistische Sperre) — parallele Bearbeitung kann sich damit
  gegenseitig überschreiben.

Der Schutz dagegen ist derzeit rein prozedural (vorher lesen,
vergleichen, bei Abweichung stoppen und melden). Eine echte
Versionsprüfung und eine Mehrfeld-Klammer sind offene Folgeaufträge.

### 11.6 Abschluss

Eine Aufgabe gilt erst dann als erledigt, wenn alle drei Nachweise
vorliegen:

1. **Rücklesen aus der Datenbank** (geschriebene Werte erneut gelesen),
2. **CMS-Bearbeitbarkeit** (Feld ist im Admin sichtbar und pflegbar,
   Whitelist-Eintrag vorhanden),
3. **sichtbare Preview-Prüfung** der betroffenen Seite/Sprache.

Fehlt ein Nachweis, lautet der Status **offen** — nicht „erfolgreich".

Zusätzlich lokal: `npm run cms:preflight`. Eine Pipeline ist **keine**
Garantie, dass ein frei formulierter Prompt alle Regeln befolgt; die
Regeln gelten unabhängig von jeder Automatik.
