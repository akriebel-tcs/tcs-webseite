> **Historisch — ersetzt durch das Dachdokument** (`docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md`). Verschoben im Batch 27, 2026-06-05. Inhalt unverändert darunter erhalten.

# Bildkarten im Scroller — Zielbild & Umsetzungsstrategie (Stand 2026-05-27)

> Strategie-Dokument. **Keine Codeänderung**, keine Migration, keine RPC,
> kein Renderer-Eingriff. Baut auf `bildkarten-blueprint-audit.md` und
> dem lokalen Vorlagenbereich (`CardBlueprintWorkshop.tsx`) auf.

---

## 0 · Kurzfazit

- Langfristig gibt es im Layout nur noch **zwei starke redaktionelle
  Muster**: (1) **Wechselteaser** (`teaser_2col_v1`) und (2) **Bildkarten
  in einem Scroller-/Kartencontainer** (`card_v1`-Kinder unter einem
  Container).
- **Bildkarte** = `card_v1` mit Hauptbild (`image`) und/oder
  `icon_image`/`thumbnail` plus Titel/Eyebrow/Description und bis zu drei
  Linkzeilen.
- **Führender Container für Bildkarten wird `product_scroller_v1`** —
  als „Scroller-Container, der bei wenigen Karten wie ein Raster wirkt
  und erst bei Überlauf horizontal scrollt". `cards_v1` bleibt als
  klassisches Rasterlayout erhalten, teilt sich aber **dieselbe
  Karten-Logik** (`card_v1` + Standardfelder + Linkfelder).
- `feature_grid_v1` (reine Iconkarten) und `teaser_2col_v1`
  (Wechselteaser) **gehören nicht** in dieses Modell und bleiben
  eigenständig.
- Vorgehen in sechs kleinen Etappen: erst Doku, dann **additive**
  Renderer-Erweiterung, dann Admin-Schatten, dann Pilot, dann
  flächendeckende Pflege, dann Alias-Markierung. **Erst ganz am Ende**
  werden alte Aliase deprecated — niemals gelöscht ohne Migrationslog.

---

## 1 · Was IST eine Bildkarte (gehört ins Zielmodell)

| Fall | Heute | Zukunft |
|---|---|---|
| `cards_v1` + `card_v1` mit `image` | klassische Bildkarten im Raster | bleibt, Container = `cards_v1`, Karten = vereinheitlichte Bildkarte |
| `product_scroller_v1` + `card_v1` mit `image` | horizontaler Scroller, heute ohne CTA-Render | bleibt, wird **führendes** Container-Muster für „mehrere Bildkarten" |
| `card_v1` mit `thumbnail` (z. B. `card_grid_v1`/`catalog_filter_grid_v1`) | aktuell kein Renderer aktiv | wird Spezialfall der Bildkarte: Bildslot = `thumbnail` statt `image` |
| `card_v1` mit `icon_image` als Hauptvisual | wird heute als „Bildicon-Karte" gerendert | bleibt Bildkarte mit Bildslot-Priorität `image` → `icon_image` → `icon` |
| `card_v1` mit Lucide-`icon` zusätzlich zu Bild | wird heute optional gerendert | bleibt erlaubt, aber `image` hat Vorrang |
| Hardcoded Karten in `CmsProductSolutionShell.tsx` (Felder `href`, `cta_href`) | Sonderfall mit eigenem Feldnamen `href` | wird auf die Standard-Bildkarte gemappt; `href` → `link_1_href` |

**Merksatz:** Sobald eine Karte ein **Hauptvisual** (Bild oder Bildicon
oder Thumbnail) trägt und in einer Liste/Reihe steht, ist es eine
Bildkarte und gehört in das Zielmodell.

---

## 2 · Was ist KEINE Bildkarte (bleibt eigenständig)

| Fall | Begründung | Bleibt als |
|---|---|---|
| `feature_grid_v1` + `card_v1` mit nur Lucide-`icon` | bewusst icon-zentriertes Layout, kein Hauptbild | eigener Section-Typ, eigener Renderer |
| `teaser_2col_v1` (Wechselteaser) | eigenständige Section, kein `card_v1`, eigenes Linkfeld `cta_link`, eigene Layout-Flags | bleibt 1:1 wie heute |
| `cta_v1`, `contact_block_v1`, `download_list_v1` | thematisch andere Bausteine, keine Karten-Familie | unverändert |
| `rich_v1`, `content_section_v1`, `stats_v1`, `faq_v1`, `tabs_v1` | keine Karten | unverändert |
| Persona-Hero-Layouts mit nur einem großen Visual | kein wiederholtes Kartenelement | unverändert |

**Merksatz:** Wenn entweder **kein Hauptvisual** vorhanden ist (reine
Icon-/Textkachel) oder die Section **strukturell kein Wiederholungs-
Element** ist (Wechselteaser, Hero), gehört sie **nicht** ins Bildkarten-
Modell.

---

## 3 · Welcher Container wird führend?

**Empfehlung:** Beide Container behalten, aber mit **gemeinsamer
Karten-Logik**. `product_scroller_v1` wird das **Standardmuster für
Bildkarten in einer Reihe**.

| Container | Rolle im Zielbild | Verhalten |
|---|---|---|
| `product_scroller_v1` | **führend für Bildkarten-Reihen** | Bei wenigen Karten (≤4 Desktop) wirkt es wie ein normales Raster, bei mehr Karten wird es horizontal scrollbar. Pfeile **nur bei echtem Overflow** (gemessen am Container, nicht an einer festen Zahl). |
| `cards_v1` | klassisches Bildkarten-Raster ohne Scrollen | bleibt für Fälle, in denen Redaktion bewusst „Raster, kein Scrollen" möchte. Liest dieselben Karten-Felder, **inkl. der neuen Linkfelder**. |
| `feature_grid_v1` | reine Iconkarten | bleibt eigenständig, **nicht** vereinheitlicht. |
| `card_grid_v1` / `catalog_filter_grid_v1` | Hub-/Filter-Übersichten mit `thumbnail` | erst aktivieren, wenn ein Renderer wirklich gebraucht wird. Im Zielbild eine **Variante** des Bildkarten-Modells mit Bildslot `thumbnail`. |

**Begründung gegen „nur ein Container":** Redakteurinnen erkennen heute
am Section-Typ sofort die Lesefunktion (Raster vs. Scrollen). Ein einziger
„Universal-Container" mit Flag würde die Pflege schwerer machen und das
Strukturbild verwischen. Stattdessen: **zwei klar benannte Container,
identische Karten-Logik darunter**.

---

## 4 · Scroller-Verhalten (Renderer-Ziel)

| Aspekt | Zielverhalten | Begründung |
|---|---|---|
| Kartenhöhe | alle Karten in einer Reihe **gleich hoch**; die höchste bestimmt die Höhe | verhindert optisches Zittern beim Scrollen |
| Bild | oben, festes **Seitenverhältnis 4:3**, `object-cover` | konsistente Optik, kein Layout-Sprung beim Bildladen |
| Textbereich | wächst natürlich, **kein Truncate** | Inhalt bleibt vollständig lesbar |
| Linkzeilen | sitzen **unten** in der Karte (`mt-auto` im Flex-Container) | gleicher CTA-Anker in allen Karten |
| Overflow-Pfeile | erscheinen **nur, wenn der Scroller wirklich überläuft** (Messung per `scrollWidth > clientWidth` oder ResizeObserver) | „ab 5 Karten" ist eine Faustregel — die Wahrheit ist Overflow |
| Desktop | Pfeile links/rechts, Tastatur-fokussierbar; Maus-Wheel scrollt nicht zwingend horizontal | gewohnte Bedienung, keine Wheel-Hijacking |
| Mobile | nativer horizontaler Touch-Scroll mit `snap-x snap-mandatory`; **keine Pfeile** | folgt OS-Konventionen |
| Tastatur/A11y | Pfeil-Links/-Rechts springen eine Karte weiter; `aria-label` für Scroller-Region; jede Karte als `<article>` mit eigenem Titel-Anker | Screenreader-tauglich |
| Layout-Sprünge | Bild-Slot reserviert die 4:3-Fläche per `aspect-ratio` schon vor dem Laden | kein CLS |
| Reduzierte Motion | bei `prefers-reduced-motion: reduce` kein Auto-Scroll, keine Smooth-Animation | Barrierefreiheit |

---

## 5 · CMS-Light-Arbeitsbereich (Zielbild)

**Baumstruktur (Admin links):**

```
Seite
└─ Scroller-Container (product_scroller_v1) / Rastercontainer (cards_v1)
   ├─ Bildkarte 1  (card_v1)
   ├─ Bildkarte 2  (card_v1)
   └─ Bildkarte n  (card_v1)
```

**Rechter Arbeitsbereich pro Bildkarte — immer dieselbe Reihenfolge:**

1. **Inhalte** — `subtitle` (Karten-Eyebrow), `title`, `description`
2. **Assets / Bildslots** — `image` (mit Viewports desktop/tablet/mobile),
   `thumbnail` (nur wenn relevant), `icon_image`
3. **Icon** — Lucide-Picker für `icon` (kebab-case)
4. **Features** — dynamische Liste `features.0..n` (Hinzufügen/Entfernen)
5. **Links** — bis zu drei Linkzeilen, je mit `label`, `href`, `kind`
   (extern / intern / Kurz-ID)
6. **Technische Felder** — einklappbar (`section_key`, `sort_order`,
   `is_active`, Schema-Hinweise)

**Rechter Arbeitsbereich pro Container:**

- **Inhalte** — `label` (Container-Eyebrow), `title`, `intro`
- **Layout-Hinweis** — read-only Anzeige: „Scroller, Pfeile bei Overflow"
  oder „Raster, keine Pfeile"
- **Technische Felder** einklappbar

**Wichtig:** Keine seitenspezifischen Pflegeformen mehr. Eine Bildkarte
auf Seite A sieht im Admin identisch aus wie auf Seite B.

---

## 6 · Feld-Mapping (Realität → Zielmodell)

| Heute (Renderer/DB) | Zielfeld | Übergangsregel |
|---|---|---|
| `cta_label` | `link_1_label` | Renderer liest **beide**, Admin pflegt neu nur `link_1_*`. Alt-Feld bleibt lesbar bis flächendeckende Migration. |
| `cta_href` | `link_1_href` | wie oben |
| `href` (nur `CmsProductSolutionShell`) | `link_1_href` (Kartenkontext) | Migration pro Seite; Renderer liest beide während Übergang. |
| `cta_link` (nur `teaser_2col_v1`) | **bleibt** `cta_link` | Wechselteaser ist **keine** Bildkarte. Nicht anfassen. |
| `subtitle` (Karte) | bleibt `subtitle` | Karten-Eyebrow, kanonisch. |
| `label` (Container) | bleibt `label` | Container-Eyebrow, kanonisch. |
| `eyebrow`, `headline` (Alias) | dokumentieren, **kein Renderer** | Aliase im Admin-Display behalten oder entfernen; keine DB-Wirkung. |
| `image` (Asset) | bleibt `image` | Hauptbild mit Viewports. |
| `thumbnail` (Asset) | bleibt `thumbnail` | Hub-/Filter-Kontext. **Nicht** mit `image` mischen. |
| `icon_image` (Asset) | bleibt `icon_image` | TCS-Bildicon, Vorrang vor Lucide. **Nicht** mit `image` mischen. |
| `icon` (String, Lucide) | bleibt `icon` | nur wenn weder `image` noch `icon_image` vorhanden. |
| `features.0..n` | bleibt `features.0..n` | flach, dynamisch. |
| neu: `link_n_kind` | neu | Werte `extern` / `intern` / `shortid`; Renderer/`resolveCardLink` interpretiert. |

**Regel:** Bildslots werden **nie vermischt**. Priorität im Renderer
bleibt `image` → `icon_image` → `icon`. `thumbnail` ist eine **eigene
Variante**, nicht eine Alternative für `image`.

---

## 7 · Umsetzung in Etappen

Jede Etappe ist ein eigener Prompt. Reihenfolge ist verbindlich —
keine Etappe überspringen.

### Etappe 1 — Doku & Zielmodell festschreiben (jetzt)
- Dieses Dokument als Beschluss eintragen.
- `subtitle`/`title`/`description` als kanonische Karten-Felder
  bestätigen.
- `link_1..3_label/href/kind` als Zielmodell festschreiben.
- `cta_label`/`cta_href`/`href` als **Übergangs-Aliase** dokumentieren.
- `bildkarten-blueprint-audit.md` als Anhang führen.
- **Keine Codeänderung.**

### Etappe 2 — Public Renderer additiv vorbereiten
- `CardsSectionV1` und `ProductScrollerV1` erweitern, sodass sie
  zusätzlich zu `cta_label`/`cta_href` auch `link_1_*..link_3_*`
  rendern, **wenn vorhanden**.
- `ProductScrollerV1`: gleiche Kartenhöhe via `items-stretch`,
  Linkzeilen `mt-auto`, Pfeile bei echtem Overflow (ResizeObserver).
- **Alte Felder bleiben aktiv.** Kein Datenmodell-Eingriff. Keine
  optische Änderung an bestehenden Seiten ohne neue Felder.

### Etappe 3 — Admin-Arbeitsbereich vorbereiten
- `PageEditor` zeigt für `card_v1` die Standardgruppen (Inhalte / Assets
  / Icon / Features / Links / Technik).
- `cmsAdminCardLinks.ts` um `cta_href`, `link_1_href`, `link_2_href`,
  `link_3_href` erweitern, damit die Linkpillen im Baum auch für
  Karten-CTAs erscheinen.
- `fieldDisplay.ts` um Labels für `link_n_*` ergänzen.
- `editorialSectionKind.ts` bleibt zunächst unverändert; ggf. später
  „Mehrfach-Link-Karte" als zusätzliche Klassifikation.
- **Noch keine** Schreib-Pfade auf neue Felder verbinden — erst lesbarer
  Schatten, dann Pflege.

### Etappe 4 — Pilot-Container
- **Eine** Seite mit `product_scroller_v1` (Vorschlag: eine
  Anwendungs-Seite mit vier bis sechs Karten) wird zum Pilot.
- `link_1_*`-Felder per RPC-Pflege füllen, `cta_*` parallel stehen
  lassen.
- Sichtprüfung Desktop + Mobile + Tastatur.
- Pilot bestätigen oder nachjustieren, bevor Etappe 5 beginnt.

### Etappe 5 — Weitere Bildkartenfamilien migrieren
- Übrige `product_scroller_v1`- und `cards_v1`-Seiten nachziehen, eine
  nach der anderen.
- `CmsProductSolutionShell`-Karten (`href`) auf `link_1_href` umstellen.
- `card_grid_v1`/`catalog_filter_grid_v1` nur aktivieren, wenn ein
  Renderer wirklich gebraucht wird.

### Etappe 6 — Alte Aliase markieren (nicht löschen)
- `cta_label`/`cta_href`/`href` in der Whitelist als **deprecated**
  flaggen (z. B. neues Flag in `cms_admin_editable_fields` oder Hinweis
  im Admin-Label).
- Renderer liest weiterhin beide Pfade.
- Löschen erst, wenn ein vollständiges Migrations-Audit zeigt, dass
  **kein** Datensatz mehr nur den Alt-Schlüssel trägt — und dann mit
  Migrationslog.

---

## 8 · Nicht-Ziele (zur Sicherheit)

- Keine Codeänderung in dieser Etappe.
- Keine Migration, keine RPC, keine Supabase-Schreib-/Leselogik.
- Keine Produktdatenbank berührt.
- Keine Public-Renderer jetzt geändert.
- Keine bestehenden Karten jetzt migriert.
- Keine neuen Section-Typen.
- Keine optische Änderung an bestehenden Seiten.

---

## 9 · Offene Punkte (für spätere Prompts)

1. **Kurz-ID-Auflösung.** `link_n_kind = "shortid"` braucht eine
   Auflösungstabelle (z. B. `cms_short_id` oder zusätzliche Spalte an
   `cms_pages`/Block-Ebene). Heute existiert keine — Kurz-IDs bleiben
   bis dahin Konzeptfeld.
2. **Locale-Pflege für `link_n_label`.** Über das bestehende `locale`-
   Feld in `cms_section_fields` problemlos möglich; muss in Etappe 3
   in der Admin-UI sauber gespiegelt werden.
3. **Container-Auto-Erkennung „Raster vs. Scroller".** Optional könnte
   `cards_v1` bei vielen Karten automatisch in Scroller-Modus wechseln;
   bewusst **nicht** Teil des Zielmodells, weil es die Pflegelogik
   verwischt.
4. **`feature_grid_v1`-Brücke.** Wenn eine Redaktion eine Feature-Grid-
   Karte später mit Bild ergänzen will, ist der saubere Weg
   „Section-Typ wechseln auf `cards_v1`/`product_scroller_v1`", nicht
   `feature_grid_v1` aufzubohren.

---

## 10 · Bestätigungen

- Geänderte Dateien: **nur** dieses Dokument (`docs/03-redaktion/
  bildkarten-scroller-zielbild.md`).
- **Keine** Migration, **keine** RPC, **keine** Supabase-Schreib-/
  Leselogik.
- **Keine** Public-Renderer, **keine** Public-Routen, **keine**
  Produktdatenbank berührt.
- Doku-Anpassung folgt der Projektregel „Inhalt zuerst, Code nur wenn
  nötig" — hier rein Doku, kein Code.
