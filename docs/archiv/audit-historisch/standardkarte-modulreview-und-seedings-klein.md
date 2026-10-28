# Standardkarte: Modulreview & kleine Seedings (read-only)

Stand: 2026-06-01
Sprint: `cms-light-standardkarte-modulreview-und-seedings-klein-1`

## A. Kurzfazit

Es wurden ausschließlich die im Vorgängerbericht
(`docs/04-betrieb/standardkarte-modulmodell-latest.md`) benannten echten
Befunde geprüft. Die 569 legitimen Textkarten ohne Bild wurden bewusst
nicht angefasst. **Keine DB-Änderung, keine Migration, keine RPC, kein
Renderer-, Routen-, Navigations-, Footer- oder i18n-Eingriff.** Es wurde
auch keinerlei Seeding angewendet — die Befunde wurden ausschließlich
benannt, bewertet und für eigene Folgesprints empfohlen.

Begründung „kein Seeding in diesem Sprint":
- Die 2 Scroller-Bildlücken brauchen redaktionelle Fotoauswahl (kein
  Standard-Asset auf Lager) und Alt-Texte DE/EN. Idempotente
  „Platzhalter-Seeds" würden die Public-Anzeige sichtbar verändern.
- Die 10 `features.*`-Fälle sind keine Lücken, sondern echte Inhalte —
  hier ist die offene Frage Renderer, nicht Seeding.
- Die 4 Top-Level-Karten liegen alle auf einer **archivierten,
  inaktiven** Seite (`page_active=false`, `status=archived`) und sind
  Public nicht sichtbar.

## B. Scroller-Karten ohne Bild

Renderer-Bezug: `src/features/cms/components/sections/ProductScrollerV1.tsx`
rendert je Kind-Karte einen `image`-Asset-Slot (`img(ctx, c.section_key)`).
Fehlt das Asset, wird das `<img>` weggelassen — Karte erscheint im
Scroller als reine Textkachel, was für diesen Container fachlich
unerwartet ist.

| # | page_key | section_key | B-ID | Parent (Container) | Parent-B-ID | Public-Page | Textfelder DE | Image-Asset | Bewertung |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `gebaeudemanagement.digitale-namensanzeige` | `products__adx5` | **B-624** | `products` (`product_scroller_v1`) | B-244 | published, aktiv | title „Kompakte Außenstation ADx5" · subtitle „Digitale Namensanzeige" · description gepflegt | **fehlt** | **Echte Inhaltslücke** — Produkt-Scroller-Karte, Text vollständig, nur Produktbild fehlt. |
| 2 | `gebaeudemanagement.digitale-namensanzeige` | `products__briefkasten` | **B-626** | `products` (`product_scroller_v1`) | B-244 | published, aktiv | title „Digitale Briefkastenanlage" · subtitle „Briefkästen & Namensschilder" · description gepflegt | **fehlt** | **Echte Inhaltslücke** — wie oben. |

Empfehlung: Redaktioneller Bild-Pflege-Auftrag (eigener Mini-Prompt, kein
Massen-Seeding). Bilder kommen über den Admin-Asset-Upload mit
`image`-Slot und DE/EN-Alt-Text. **Kein Schreibzugriff in diesem
Sprint.**

## C. Features in `cards_v1`

Renderer-Bezug: `src/features/cms/components/sections/CardsSectionV1.tsx`
nutzt für jede Karte nur `title`, `description`, `image` und `cta`.
`features.0..N` werden **nicht** ausgelesen — die Werte sind in der DB
vorhanden, im Public-Frontend aber unsichtbar.

Alle 10 Fälle liegen auf zwei Seiten in `eingangssysteme.*` unter dem
Container `items` (`cards_v1`):

### C.1 `eingangssysteme.funktionalitaet` (Parent B-211)

| section_key | B-ID | befüllte features (DE) |
|---|---|---|
| `card_accessControl` | B-1109 | features.0 „Einfache Stand-alone Installationen" · features.1 „Komplexe netzwerkangebundene Installationen" |
| `card_gebaeudesicherheit` | B-1111 | features.0 „Feuerwehrdurchsage" · features.1 „Brandschutzinstallationen (FSE, FSD, BMA)" · features.2 „Löschwasser-Einspeiseeinrichtungen" |
| `card_tuerkommunikation` | B-1108 | features.0 „Concierge- und Schrankenanlagen" · features.1 „Interne Kommunikation und Türöffnerautomatik" · features.2 „Digitale Namensverwaltung" · features.3 „Feuerwehrdurchsage" · features.4 „Bidirektionale Videosprechanlage" · features.5 „Ambient Assisted Living (AAL)" |
| `card_wayfinding` | B-1112 | features.0 „Tür- und Informationsschilder" · features.1 „Piktogramme" · features.2 „Hausnummern und Türklingeln" · features.3 „Newsfeed-Displays" |

### C.2 `eingangssysteme.material` (Parent B-213)

| section_key | B-ID | befüllte features (DE) |
|---|---|---|
| `card_aluminium` | B-1096 | Werkstoff AlMg1 · Dekorativ farbige Oberflächenveredelung · Erhöhte Kratz- und Bruchfestigkeit · Guter Korrosionsschutz · Gut recyclingfähig |
| `card_bronze_baubronze` | B-1099 | Werkstoff Zinnbronze (CuSn6) · Gute Verschleiß- und Korrosionsbeständigkeit · Handpatiniert für unikale Oberflächenschwärzung |
| `card_edelstahl` | B-1097 | V2A (V4A möglich) · 400er Korn geschliffen · Gehärtete kratzfeste Metalloberfläche · UV-beständige Dekore · Verbesserte Korrosionsbeständigkeit |
| `card_messing_satiniert` | B-1098 | Werkstoff Messing MS63 (CuZn37) · Härter als reines Kupfer · Goldgelbes Erscheinungsbild |
| `card_mineralwerkstoff` | B-1101 | Große Dekor- und Farbenvielfalt · Für geschützten Außen- oder Innenbereich |
| `card_pulverbeschichtung` | B-1100 | Maximales Farbspektrum · Effektlackierungen möglich (z.B. Metallic) · Matt oder glänzende Oberflächen · Guter Korrosionsschutz |

Bewertung je Fall: **echter Inhaltsverlust** — die Features beschreiben
fachliche Eigenschaften (Material, Funktionalität), sind DE+EN gepflegt
und gehören redaktionell zur Karte. Die Daten sind nicht „Pflege-
Verschwendung" im Sinne von „Müll", sondern „Pflege-Verschwendung" im
Sinne von „Renderer ignoriert sie heute".

Empfehlung (kein Schritt in diesem Sprint):

1. **Bevorzugt:** Eigener Renderer-Sprint, der in `CardsSectionV1` ein
   optionales `features.0..N`-Anzeigemodul ergänzt (z. B. kleine
   Aufzählungsliste unterhalb von `description`). Dann werden die
   bereits gepflegten Inhalte ohne Migration sichtbar.
2. **Alternativ:** Kartenverschiebung in `feature_grid_v1` (Container
   wechseln). Würde aber Layout der beiden Seiten ändern → eigene
   Layout-Etappe nötig.
3. **Nicht empfohlen:** Features in `description` einkopieren — würde
   bestehende `description`-Inhalte überschreiben.

Keine Aktion in diesem Sprint: Inhalte bleiben in der DB, kein
Datenverlust, Public-Anzeige unverändert.

## D. Top-Level-`card_v1` (4 Fälle)

Alle 4 Karten liegen auf derselben Seite und sind Public **nicht
sichtbar**:

| section_key | B-ID | Page | page.status | page.is_active | Thumbnail | Bewertung |
|---|---|---|---|---|---|---|
| `category-grid.standard-briefkaesten` | B-1199 | `produkte.eingangsloesungen.kopie` | archived | **false** | ja | Legacy / Arbeitskopie |
| `category-grid.architektur-entry` | B-1200 | `produkte.eingangsloesungen.kopie` | archived | **false** | ja | Legacy / Arbeitskopie |
| `category-grid.individueller-metallbau` | B-1201 | `produkte.eingangsloesungen.kopie` | archived | **false** | ja | Legacy / Arbeitskopie |
| `category-grid.signage` | B-1202 | `produkte.eingangsloesungen.kopie` | archived | **false** | ja | Legacy / Arbeitskopie |

Bewertung: **Rest-D9-Drift auf einer archivierten Seitenkopie.** Da die
Seite `is_active=false` und `status=archived` ist, greift die RLS-
Sichtbarkeitsregel nicht, und der Public-Renderer rendert die Seite
ohnehin nicht. Es besteht kein Public-Risiko.

Empfehlung (kein Schritt in diesem Sprint):
- Späterer Cleanup als Teil eines „Archivseiten-Aufräum"-Sprints
  (entweder Seite komplett löschen oder die 4 Karten unter einen
  Container hängen). **Keine Reparenting-Migration jetzt.**

## E. S1/S2-Seeding-Prüfung

Geprüft gegen `scripts/cms/output/d3-d5-rest-triage-latest.json` und
`renderer-fallback-inventar-latest.json` (Stand 2026-06-01):

- D3=2004 / D5=2000 unverändert.
- S1 (54 Pages) und S2 (19 Pages) betreffen vor allem Container-Inhalte
  und Hero-/Content-Felder, **nicht** die in A–D benannten
  Standardkarten-Befunde.
- Für die 12 echten Standardkarten-Befunde (2 Scroller-Bilder + 10
  Features) gibt es **keine sichere Idempotenz-Seed**: Bilder sind
  redaktionelle Inhalte, Features sind bereits gepflegt.

Entscheidung: **Kein Seeding angewendet, kein Dry-Run-SQL erzeugt.**
Begründung siehe Abschnitt A.

## F. Admin-Hinweise

Bestandsaufnahme `CardPresetBadge` (UI-only, Stand vorheriger Sprint):
- Zeigt bereits „Container · Layout · erwarteter Bildslot".
- Zeigt bereits „Wirksam & aktiv / Vorhanden, aber von diesem Container
  nicht gerendert / Empfohlen, aber leer".
- Für Scroller-Karten ohne Bild erscheint heute schon der Hinweis
  „Für diesen Container empfohlen, aber noch leer: image".
- Für `cards_v1`-Karten mit befüllten Features erscheint heute schon
  der Hinweis „Vorhanden, aber von diesem Container nicht gerendert:
  features".
- Für Top-Level-Karten erscheint bereits eine Warnung (Container/
  Parent nicht erkennbar).

**Ergebnis:** Die Admin-Hinweise decken alle drei Befundklassen aus
A–D bereits ab. **Keine UI-Änderung in diesem Sprint nötig.** Eine
feinere Pro-Feld-Markierung („dieses Feld ist Legacy / wird nicht
gerendert") bleibt für die eigene Folge-Etappe vorgesehen.

## G. Entscheidung: angewendet / nur Dry-Run / später

| Befundklasse | Maßnahme | Status |
|---|---|---|
| Scroller-Bildlücken (2) | Redaktioneller Bild-Pflege-Prompt | **später**, kein Seeding |
| `features.*` in `cards_v1` (10) | Renderer-Erweiterung (eigener Sprint) | **später**, Inhalte bleiben |
| Top-Level-Karten (4) | Cleanup im Archivseiten-Sprint | **später**, kein Public-Risiko |
| S1/S2 generell | Keine pauschalen Seeds | **nicht angewendet** |
| Admin-Hinweise | Bereits ausreichend | **keine Änderung** |

## H. Nächste Schritte

- **Direkt empfohlen:** `cms-light-baustein-workspaces-wechselteaser-hero-content-1`
  — Akkordeon-Workspaces für `teaser_2col_v1`, `hero_v1` und
  `content_v1` (vorbereitete Vorlage aus `CardFieldsWorkspaceGroups`).
- **Eigene Folge-Etappe:** Renderer-Erweiterung `cards_v1`-Features
  (oder bewusste Entscheidung „Legacy, nicht weiter beworben").
- **Eigene Folge-Etappe:** Redaktioneller Bildauftrag für ADx5 +
  Briefkastenanlage.
- **Spätere Pflege-Etappe:** Archivseite `produkte.eingangsloesungen.kopie`
  aufräumen.

## I. Audit-Ergebnisse (2026-06-01)

- `cms:audit:contract` — **15 OK · 7 Warnung · 0 Konflikt** (unverändert)
- `cms:audit:contract-drift` — D7=0 · D8=0 · D9=0 · D10=28
  (unverändert)
- `cms:audit:d3-d5-triage` — DB-Lauf timeout (`statement timeout`,
  Read-Replica), letzter erfolgreicher Lauf D3=2004 / D5=2000 bleibt
  Referenz. Kein Schreibzugriff erfolgt.
- `cms:audit:renderer-fallback-inventory` — 82 Pages, G0=2 · G1=4 ·
  S1=54 · S2=19 · S3=2 · P1=1 (unverändert)

## J. Scope-Bestätigung

- Keine DB-Änderung. Keine Migration. Keine neue RPC.
- Keine Inhalte, Bilder oder Feldwerte überschrieben.
- Keine Whitelist gelöscht / deaktiviert / verändert.
- Keine i18n-Datei verändert.
- Keine Public-Renderer-, Routen-, Navigations-, Footer- oder
  Breadcrumb-Änderung.
- Keine Produktdatenbank berührt.
- Keine automatische Massenmigration, kein Reparenting.
- Nur dieser Bericht + Update `docs/current-status.md`.
- Kein TS/TSX geändert → `tsc --noEmit` nicht erneut nötig (bleibt
  grün aus Vorgängersprint). `npm run build` nicht manuell ausgeführt
  (Lovable-Harness baut automatisch).
