<!-- ARCHIVKOPIE -->

> **Historische Fassung — kein Ist-Zustand.**
> Ursprungspfad: `docs/03-redaktion/checkliste-redaktion.md`
> Stand dieser Fassung: 2026-05-27 (Hotfix-Tranche 25)
> Archiviert am: 2026-09-14 (Etappe 1, Doku-Nachtrag)
> Aktiver Nachfolger: docs/03-redaktion/checkliste-redaktion.md (jetzt kurzer Wegweiser) + Dachdokument Abschnitt 11
>
> Diese Fassung ist **keine aktuelle Betriebs-, Sprach- oder
> Freigabezusage** und **kein aktueller Prüfwert**. Genannte Sollwerte,
> Audit-Zahlen, Sprachregeln und Abschlussregeln sind Historie.
> Relative Verweise wurden auf die Archivtiefe umgestellt; Basis der
> Originalpfade ist `docs/03-redaktion/checkliste-redaktion.md`.

---

# Redaktions-Checkliste — was geht im Admin, wie geht es

Stand: 2026-05-27 (Hotfix-Tranche 25 — Hinweis zur Footer-/Inhaltseditor-Trennung
ergänzt; fachliche Inhalte unverändert, geprüft nach Batch 28).

> **Für Prompts an Lovable:** ausschließlich die Schablone im Dachdokument
> verwenden: [`redaktions-uebergabe-und-prompt-regeln.md`](../../03-redaktion/redaktions-uebergabe-und-prompt-regeln.md),
> Abschnitt 2. Archivierte Prompt-Dokumente (`redaktions-prompts.md`,
> `prompt-leitplanken.md`, `prompt-kurzanleitung.md`,
> `start-fuer-neue-redakteure.md`) sind nicht mehr gültig. Bei Konflikt
> gilt das Dachdokument.

> **Wichtig (Footer vs. Inhalt):**
> Wenn du eine **P-ID** öffnest oder im Baum auf eine Karten-Pille (B-…) klickst,
> landest du immer im **Inhaltseditor der Zielseite** — auch dann, wenn dieselbe
> Seite zusätzlich als Wort im Footer verlinkt ist. Der **Footer-Link-Editor**
> („Reiner Footer-Link") erscheint nur, wenn du den Footer-Eintrag im Navigationsbaum
> **direkt** anklickst. Dort pflegst du nur das Wort und die Sichtbarkeit;
> Texte/Bilder der Seite gehören in den Inhaltseditor.

> Eine kompakte Schritt-für-Schritt-Liste für die häufigen redaktionellen
> Aufgaben. Vollversion: [`redaktionshandbuch.md`](../../03-redaktion/redaktionshandbuch.md).
> Wann Admin, wann Prompt: [`../04-betrieb/prompts-vs-admin.md`](../../04-betrieb/prompts-vs-admin.md).
> Nach jeder Redaktionsrunde: [`qa-nach-redaktionsrunde.md`](../../03-redaktion/qa-nach-redaktionsrunde.md).


## 1. Seite finden über Kurz-ID

Jede Seite, Navigation oder Karte hat eine **Kurz-ID** (4-stellig, mit
Buchstaben-Präfix):

| Präfix | Was es ist | Beispiel |
|---|---|---|
| `P-…` | Seite (Page) | `P-063` = Anwendungen / Großanlage |
| `N-…` | Navigationsknoten | `N-078` = Main-Knoten Großanlagen |
| `B-…` | Block / Section auf einer Seite | `B-1234` = ein einzelner Wechselteaser |
| `A-…` | Asset (Bild / Bildicon) | `A-456` = ein Bild |

Im Admin oben: **„Springen zu Kurz-ID"** → ID eingeben → Enter.

Bei Knoten ohne eigene Inhaltsseite (Container/Spalten wie `N-057`,
`N-042`): Der Editor zeigt eine Box „Container / Spalte — keine eigene
Inhaltsseite" mit Liste der Unterknoten. Klick auf **„Zielseite
bearbeiten"** öffnet die echte Inhaltsseite.

## 2. Block oder Karte kopieren

Funktioniert für Wechselteaser, Bildkarten, Iconkarten und alle anderen
Standard-Section-Typen.

1. Quell-Block im Section-Baum auswählen
2. **Kopieren** klicken — Banner oben zeigt: „in Zwischenablage"
3. Ziel-Seite/Position wählen
4. **Einfügen** klicken
5. neuer Block bekommt automatisch einen `…_kopie`-Schlüssel
6. Inhalte überschreiben, Bilder austauschen, Speichern

Mitkopiert wird automatisch:
- alle DE+EN-Felder
- alle Bildslots inkl. Desktop/Tablet/Mobile-Varianten
- alle Whitelist-Einträge → Karte ist **sofort im Admin pflegbar**

**Mehrfaches Einfügen** derselben Quelle ist erlaubt — jede Kopie bekommt
einen neuen eindeutigen Schlüssel.

## 3. Karte bearbeiten

1. Block auswählen (Wechselteaser, Bildkarte, Iconkarte etc.)
2. DE-Feld ändern → EN wird beim Speichern automatisch per
   KI-Übersetzung mitgepflegt (Standardregel).
3. Wenn EN bewusst unverändert bleiben soll: vorher auf das
   Sprachschloss-Symbol klicken (sperrt EN für diesen Schritt).
4. Speichern → Vorschau prüfen.

## 4. Bild austauschen

1. Block auswählen
2. Im Medien-Bereich beim vorhandenen Bildslot auf **Hochladen**
3. Datei wählen
4. Alt-Text DE+EN ergänzen
5. Optional Desktop/Tablet/Mobile-Varianten hochladen (sonst dient
   Desktop als Fallback)
6. Speichern → Vorschau prüfen

**Bildslot-Sorten — wann was:**
- `image` → normales Karten- oder Teaser-Bild (vollflächig)
- `thumbnail` → Filtergrid-Kachel (kleinere Vorschau)
- `icon_image` → **TCS-Bildicon** (grafische Bildmarke statt Lucide-Icon)

Im Medien-Workbench erscheint pro Slot ein Badge, das den Sortentyp
anzeigt (**Bild**, **Thumbnail**, **TCS-Bildicon**, **Lucide-Icon
(Textfeld)**).

**Schnellsuche für Bildredaktion (Tranche 20):** im Medien-Workbench
gezielt filtern nach
- Seite (Dropdown „Titel · page_key · Route", oder „Alle Seiten")
- Slotart (Bild / Thumbnail / TCS-Bildicon / Lucide-Icon)
- Slotstatus (mit/ohne aktivem Bild, Legacy/Inaktiv)
- Viewport fehlt (Desktop / Tablet / Mobile / Tablet+Mobile / nur Desktop)
- Alt-Text (DE fehlt / EN fehlt / DE oder EN fehlt)

Standardansicht zeigt nur sichtbare aktuelle Medienplätze auf
veröffentlichten Seiten — Legacy/Inaktiv nur bei Bedarf einblenden.
„In Vorschau" ist grau, wenn der Slot nicht im Frontend landet (Tooltip
nennt den Grund: keine Route, Page inaktiv/archiviert/fehlt, Section
inaktiv/fehlt, Renderer ignoriert den Slot).

## 5. Lucide-Icon ändern

Lucide-Icons sind **Textfelder** (kein Bild). Sie heißen z. B. `shield`,
`check-circle-2`, `key-round`.

1. Iconkarte auswählen
2. Beim Feld `icon` auf **Iconauswahl** klicken (IconPicker-Dialog)
3. Suchen, gewünschtes Icon klicken
4. Speichern → Vorschau prüfen

Der Renderer wendet folgende Priorität an (gilt für `cards_v1` und
`feature_grid_v1`):
1. `icon_image`-Bild (TCS-Bildicon) — wenn vorhanden, hat Vorrang
2. `icon`-Textfeld (Lucide) — wenn `icon_image` fehlt
3. Code-Fallback — wenn nichts gesetzt ist

## 6. TCS-Bildicon (`icon_image`) verwenden

Wenn statt eines Lucide-Icons ein **gestaltetes TCS-Bildicon** verwendet
werden soll:

1. Iconkarte auswählen
2. Im Medien-Bereich den Slot `icon_image` öffnen (Badge **„TCS-Bildicon"**)
3. Bildicon hochladen (Desktop/Tablet/Mobile optional, Desktop reicht
   als Default)
4. Alt-Text DE+EN ergänzen
5. Speichern → Renderer zeigt automatisch das Bildicon statt des
   Lucide-Icons.

Wenn das Bildicon wieder weg soll: Asset deaktivieren → Lucide-Icon
greift erneut.

## 7. Neue Seite per Prompt nach Template anlegen lassen

Neue Seiten **nicht** im Admin selbst erfinden — sie sollen einem
**bestehenden Template** entsprechen, damit Pflegbarkeit, Karten-Modell
und Bildslots sauber stehen. Ablauf:

1. Im Prompt an die technische Steuerung folgende Angaben mitliefern:
   - **Seitenzweck** (z. B. „neue Anwendungsseite XYZ")
   - **Vorlagenseite** (Template-Referenz, z. B. „nach Vorbild von
     `anwendungen.grossanlage` / P-063")
   - **gewünschte Blöcke** in Reihenfolge (Hero, Kartenblock, Wechselteaser,
     CTA, Kontaktblock — nur aus eingefrorener Standardpalette)
   - **Sprachen**: DE-Inhalte (mit Text) + EN automatisch
   - **Bilder**: Slots vorbereiten (`image`, optional `icon_image`)
2. Lovable legt an:
   - `cms_pages`-Eintrag (Draft, `is_active=false`)
   - `cms_sections` in passender Reihenfolge (`sort_order`)
   - `cms_section_fields` DE+EN
   - `cms_admin_editable_fields`-Whitelist DE+EN für jedes Feld
   - Asset-Slots vorbereitet (ohne Bilder — die kommen redaktionell)
3. Redaktion pflegt Inhalte und Bilder im Admin nach.
4. Veröffentlichung läuft als **eigener Schritt** (Status auf `published`,
   `is_active=true`) — nicht beiläufig.

**Eingefrorene Standardpalette** (Stand Tranche 13, keine neuen Typen):

| Kartenart | Section-Typen |
|---|---|
| Bildkarte | `cards_v1` + `card_v1` + Asset `image` |
| Iconkarte Lucide | `cards_v1` / `feature_grid_v1` + `card_v1` + Feld `icon` |
| Iconkarte TCS-Bildicon | wie oben + Asset `icon_image` |
| Wechselteaser | `teaser_2col_v1` + Asset `image` |
| Kennzahlen | `stats_v1` + `stat_v1` |
| CTA / Kontakt | `cta_v1` / `contact_block_v1` |

Andere Typen (`role_tabs_v1`, `faq_v1`, `list_v1`, `rich_v1` etc.) sind
echte Spezialblöcke und werden nur mit Begründung neu vergeben.

## 8. Wann Admin reicht, wann ein Prompt nötig ist

Admin reicht für:
- Texte, Headlines, Sublines, CTA-Beschriftungen
- Bilder, Alt-Texte, Fokuspunkte
- Reihenfolge und Sichtbarkeit (`is_active`) von Blöcken
- Lucide-Icon-Auswahl
- TCS-Bildicon hochladen (`icon_image`)
- Karten / Wechselteaser kopieren und einfügen
- Navigations-Labels umbenennen

Prompt nötig für:
- neue Seite nach Template anlegen
- neuen Bildslot oder neues Textfeld in einem Template hinzufügen
- Layout, Spacing, Animation ändern
- neue Section-Typen (sehr selten — Palette ist eingefroren)
- größere Navigations-Umbauten
- CI-/Designsystem-Änderungen
- alles, was Code betrifft

Details und Beispielprompts: [`../04-betrieb/prompts-vs-admin.md`](../../04-betrieb/prompts-vs-admin.md).

## 9. Wenn etwas nicht klappt

| Problem | Was tun |
|---|---|
| Feld ist grau / nur lesbar | Whitelist fehlt → an techn. Steuerung melden, Kurz-ID nennen |
| „duplicate key"-Fehler beim Einfügen | Sollte nicht mehr passieren (Hotfix 2026-05-24). Wenn doch: Kurz-ID + Quellblock melden. |
| Bild wird nach Upload nicht angezeigt | Vorschau hart neu laden; wenn weiterhin leer: melden |
| Lucide-Icon wird nicht aktualisiert | Prüfen, ob `icon_image`-Slot belegt ist (hat Vorrang) — wenn ja, dort das Bildicon entfernen oder Lucide auch dort akzeptieren |
| Kurz-ID-Sprung landet auf Footer-Link statt Inhaltsseite | Im Footer-Link-Editor auf **„Zielseite bearbeiten"** klicken |
| Block ist im Admin aktiv, Änderung wirkt aber nicht auf der Seite | Vermutlich Source-only-/Legacy-Block. **Nicht weiterbearbeiten**, sondern melden. Beispiel (vor Tranche 17/18 vorhanden): alter `contentBlocks`-Container, `ueberTcs`, `persona_*`-Legacy neben sichtbarem `personas_item_*`. Regel: sichtbarer Block = Datenquelle = editierbarer Admin-Block. 


## 10. Goldene Regel

- **Inhalt an vorhandener Stelle ändern** → Admin.
- **Strukturen / Templates / neue Felder / neue Funktionen** → Prompt.
- **Produktdaten / Specs / PDP** → Produktprozess (eigener Weg).
- Bei Unsicherheit: nicht raten, melden.

## Rendertreue (Tranche 16, 2026-05-26)

Copy/Paste gilt erst als bestanden, wenn der eingefügte Block in der
Live-Vorschau **sichtbar rendert**. Der Admin-Baum allein reicht nicht.

- Meldung „Admin geändert, Vorschau unverändert" ⇒ Rendertreue-Bug,
  bitte melden (nicht eigenständig deaktivieren).
- Vor Redaktionsübergabe Pflicht: `node scripts/cms/rendertreue-audit.mjs`
  (R3/R4 = Risiko, müssen erklärt oder behoben sein).

## Tranche 19 — Kartenarten erkennen

- **Bildkarte**: Karte mit großem Bild oben (Slot `image`).
- **Thumbnail-Karte**: Karte mit kleinem Vorschaubild (Slot `thumbnail`,
  z. B. auf Hub-Übersichten wie `/produkte`).
- **Iconkarte**: Karte mit Icon — Lucide-Icon (`icon`) oder grafisches
  Bildicon (`icon_image`).
- **Textkarte**: Karte ohne Bild/Icon, nur Titel + Beschreibung.
- **Kartencontainer**: Sammelblock für mehrere Karten — Karten liegen
  darunter als Kind-Blöcke.
- **Wechselteaser**: 2-Spalten-Teaser (Bild + Text), Seitenwechsel im
  Wechsel.
- **Legacy / inaktiv**: Block ist im CMS deaktiviert und wird öffentlich
  nicht angezeigt. Bleibt im Admin sichtbar, damit du ihn wieder
  einblenden kannst.

`card_v1` ist der technische Grundtyp; Bildkarte/Iconkarte/Textkarte sind
redaktionelle Varianten davon, automatisch aus den vorhandenen
Feldern/Asset-Slots erkannt.

## Admin-Hygiene (was du nicht mehr siehst)

Seit der Hygiene-Tranche (2026-05-27) sind aufgeräumt:

- Pflegefelder, deren Block gar nicht mehr existiert oder ausgeblendet ist,
  sind **deaktiviert** — sie tauchen nicht mehr als „pflegbares Feld" auf.
- Aktive Bilder auf ausgeblendeten Blöcken sind als Legacy markiert —
  sie erscheinen nur noch im Legacy-Filter der Medien-Workbench.
- Bildslots, die der Renderer auf bestimmten Block-Typen ohnehin nicht
  anzeigt (z. B. `image` auf `content_v1` / `series_override_v1`), sind
  deaktiviert.

Wichtig: Es wurde **nichts gelöscht**. Wer einen Block reaktiviert, kann
die zugehörigen Felder und Bilder mit einem Klick wieder einschalten.
Wenn du in der Standardansicht ein Feld vermisst, das du sicher
gebraucht hast: prüfe, ob der Block aktiv ist, oder melde es.


---

## Hotfix 27b-1 (2026-05-27) — Iconkarten Anwendungen-Anforderungen

- Lucide-Icon → DB-Feld `icon` (Lucide-Name, z. B. `fence`, `accessibility`). DOM-Marker `data-cms-field="icon"`.
- TCS-Bildicon → Asset-Slot `icon_image` (PNG/SVG). DOM-Marker `data-cms-field="icon_image"`. Hat Priorität vor `icon`.
- Anwendungen-Anforderungen sind echte `card_v1`-Kindsections unter Parent `anforderungen` (jetzt Typ `cards_v1`). Pflege im Admin pro Karte über Felder `title`, `description`, `icon` + Asset `icon_image`.
- Medienbereich und Live-Vorschau benutzen denselben Marker: Vorschau-Klick auf eine Karte trifft genau den `<span>`, der das tatsächlich gerenderte Icon trägt.
- Legacy `<key>.label/.text/.icon` im content_v1-Sammelblock bleibt nur Fallback und wird nicht mehr empfohlen.
