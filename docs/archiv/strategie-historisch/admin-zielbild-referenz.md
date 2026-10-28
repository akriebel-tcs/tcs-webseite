# Admin-Zielbild — Referenz aus tcsag-web

Stand: 2026-05-10

Diese Datei dokumentiert das **visuelle und funktionale Zielbild** für den
CMS-Light-Admin auf Basis der parallel gepflegten Lovable-Webseite
**tcsag-web** (`https://lovable.dev/projects/2fea214b-1180-49b9-b694-66628b4c8df9`,
Preview: `preview--tcsag-web.lovable.app/admin/...`).

Wichtig: tcsag-web ist **nicht** unsere Codebasis. Wir übernehmen von dort
**keine Implementierung**, sondern nutzen die Screenshots als
**Referenzbilder** für die kommenden Etappen I.4 ff. Reihenfolge bleibt
strikt nach Codex' Vorgabe (erst Stabilität, dann Breite).

---

## Was tcsag-web zeigt (Zielbild)

### 1. Tab-Leiste oben

Horizontal scrollbare Tab-Leiste mit vielen gleichwertigen Reitern:
`Admin · Übersicht · Stammdaten · Dokumente · Bilder · Ausschreibung ·
Validierung · Uploads · Startseite · News · Fokuspunkte · Content Hubs ·
Seiten`.

→ Bei uns aktuell **vier** konsolidierte Reiter. Sobald wir den fünften
brauchen (z. B. Assets oder News), Tab-Leiste **horizontal scrollbar**
machen — nicht umbrechen, nicht stapeln.

### 2. Content Hubs — Listenansicht (`/admin/content-hubs`)

- Filter-Chips oben: `Alle (32) · Themenwelt (6) · Lösung (18) · Perspektive (8)`
- Suche nach Titel oder Slug
- Button `+ Neuer Hub` rechts
- Gruppen-Header pro Typ (Themenwelten, Lösungen, Perspektiven)
- Eine Zeile pro Hub mit:
  - Drag-Handle links (Reihenfolge)
  - Thumbnail
  - Sichtbarkeits-Icon (Auge offen/durchgestrichen)
  - Titel + Slug (`/architekt`)
  - Block-Counter (`13 Blocks`)
  - Hover-Aktionen rechts: Sektionen, Duplizieren, Bearbeiten, Löschen

→ Vorbild für unsere spätere **Pages-/Hubs-Übersicht** (nach I.4c).

### 3. Hub bearbeiten — Modal-Editor

Eine modale Maske mit klar gruppierten Feldern:

- **Stammdaten**: Slug*, Typ* (Dropdown), Titel DE/EN*, Tagline DE/EN,
  Icon-Name, Sortierung, Aktiv-Switch
- **Hero-Bild**: Vorschau + Pfad + Upload-Button
- **PDF-Broschüre**: URL
- **Problem-Block**: Titel + mehrzeilige Liste (eine Zeile = ein Punkt)
- **TCS-Block**: Titel + mehrzeilige Liste
- (weiter unten weitere Blöcke)

→ Vorbild für **I.4b/c**: generischer Section-Editor mit DE/EN-Paaren
und einer kleinen, fest definierten Menge an Block-Typen.
**Nicht** alles auf einmal bauen — Stück für Stück, jede neue
Sektionsform braucht eine eigene RPC.

### 4. Bilder & Fokuspunkte (`/admin/bilder`)

- Linke Spalte: Liste der Bildslots, gruppiert nach Bereich
  (`HERO`, `SPIELFELD`, `THEMENWELTEN`, …) mit Mini-Thumbnail
  und „% / %" als aktueller Fokuspunkt-Position
- Rechte Spalte:
  - Großes Bild mit **Klick-Fokuspunkt** (Fadenkreuz)
  - Slider „Skalierung 100 %"
  - **Live-Vorschau in 3 Seitenverhältnissen**: Desktop 16:9 · Kachel 4:3 · Thumbnail 1:1
  - Buttons: `Bild tauschen · Zurücksetzen · Speichern`
- Erklär-Boxen oben („Was kann ich hier tun?", „Tipp: Inline-Bearbeitung")

→ Vorbild für eigenen, **deutlich späteren** Etappenblock
„Asset-Fokuspunkt-Editor". Kein Vorziehen vor I.4.

### 5. News & Events (`/admin/news`)

- Zwei Erklär-Boxen (Aufgaben + Fokuspunkt-How-To)
- Button `+ Neuer Eintrag`
- Linke Spalte: Liste der News mit Drag-Handle, Titel, Jahr · Slug
- Rechte Spalte: Detail-/Bearbeitungsformular

→ Eigenes Modul, frühestens nach Asset-Upload.

---

## Wo wir heute stehen (tcs-webseite_db_cms)

- `/admin` ohne Login (Prototyp), vier Reiter:
  Übersicht · Struktur & Inhalte · Diagnose · Glossar
- Struktur & Inhalte → Sub-Tabs Baum · Labels · Inhalte
- Baum mit DnD und rechts angedocktem **DetailPanel** (Etappe I.4a)
- Genau **ein** CMS-Pilot: `anwendungen.pflege` mit Hero / Answer-First / Intro DE+EN
- Schreibwege: vier whitelisted RPCs
  - `rpc_admin_update_navigation_label`
  - `rpc_admin_update_pilot_pflege_field`
  - `rpc_admin_upsert_page`
  - `rpc_admin_move_navigation_node`

Noch **nicht** vorhanden:
Asset-Upload, Fokuspunkt-Editor, generischer Section-Editor,
Hub-Listenansicht mit Filter-Chips, News/Events, mehrere Pilotseiten.

---

## Mapping Zielbild → geplante Etappen

| tcsag-web-Element             | Bei uns geplant in       |
|-------------------------------|--------------------------|
| Tab-Leiste horizontal scrollbar | Sobald 5. Haupttab nötig wird |
| Content-Hubs-Liste (Filter, Counter, Drag) | Nach I.4c (mehrere Pilotseiten existieren) |
| Hub-Modal mit DE/EN-Feldern   | I.4b — generischer Section-Editor |
| Mehrere Block-Typen (Problem, TCS, …) | I.4c — pro Block-Typ eine eigene RPC |
| Hero-Bild + Upload            | Eigene Etappe „Asset-Upload" (nach I.4) |
| Fokuspunkt-Editor mit 3-Ratio-Vorschau | Eigene Etappe „Fokuspunkte" (nach Asset-Upload) |
| News & Events                 | Eigenes Modul (deutlich später) |
| Erklär-Boxen „Was kann ich hier tun?" | Schon jetzt im Stil der Übersicht — bei jedem neuen Tab mitliefern |

---

## Leitlinien beim Übernehmen

1. **Keine Code-Übernahme** aus tcsag-web. Nur visuelles und konzeptionelles Vorbild.
2. **Schreibpfad bleibt RPC-only.** Jede neue Maske braucht zuerst eine
   whitelisted RPC, dann das UI.
3. **Deutsch ohne Buzzwords**, Fachbegriffe in Klammern erklärt
   (Slug, nav_area, Fokuspunkt …).
4. **Reihenfolge nicht aufweichen**: erst Stabilität auf einer Pilotseite,
   dann Breite. Asset-Upload und Fokuspunkte werden **nicht** vorgezogen.
5. **Erklär-Boxen pro Tab** sind Pflicht (siehe `/admin/bilder`-Beispiel) —
   Mitarbeiter sollen ohne Vorwissen verstehen, was der Tab tut.
