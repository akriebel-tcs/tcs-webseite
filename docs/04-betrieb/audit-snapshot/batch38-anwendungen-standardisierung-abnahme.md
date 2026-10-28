# Batch 38 — Anwendungen-Standardisierung: Abnahme nach Batch 34–37

Datum: 2026-06-05
Bereich: TCS in Bauten / Anwendungen
Modus: **Abnahme/Prüfung** — kein Inhaltsumbau, keine Navigation, keine
Altcontainer gelöscht, keine P-077-Arbeit. Erlaubte Mini-Fixes: Diagnose-
Regenerierung (Coverage-JSON, rendererPathMap, FAQ/CTA-Inventar).

## 0. Kurzfazit

| Seite | Renderer DB-first? | Doppelrender? | Altcontainer sichtbar? | Admin-Karten vollständig? |
|---|---|---|---|---|
| P-056 `anwendungen.objektloesungen` | ✅ ja (cards_standard + 8× card_v1, Intro über `content` content_v1) | nein | nein (kein Backup nötig — Altcontainer in Batch 37 deaktiviert) | ✅ 76 Whitelist-Einträge pro Karte |
| P-057 `anwendungen.bildungseinrichtungen` | ✅ ja (3× teaser_2col_v1 + 12× cards_v1 + 47 card_v1) | nein | nein (`sections`, `einrichtungen`, `faq` inaktiv) | ✅ Standard-Vertrag erfüllt, inkl. 3× Link-Karten P-071 |
| P-059 `anwendungen.gesundheitseinrichtungen` | ✅ ja (cards_standard + 2× card_v1) | nein | nein (`section`, `cards`, `faq` inaktiv) | ✅ 76 pro Karte |
| P-060 `anwendungen.oeffentliche-hand` | ✅ ja (cards_standard + 3× card_v1) | nein | nein (`section`, `cards`, `faq` inaktiv) | ✅ 76 pro Karte |
| P-071 `anwendungen.interne-kommunikation` | ✅ ja (teaser_2col_v1 + 5× cards_v1 + 18 card_v1 + faq_v1 + inline Broschüren-CTA) | nein | nein (nur `broschure` content_v1 inaktiv) | ✅ Standard-Vertrag |

**Verifikationen (Stand dieses Batches):**

- `node scripts/cms/wahrheits-check-ci.mjs` → ✅ **grün** (nach Regenerierung von `faq-cta-toggle-inventar`).
- `node scripts/cms/page-renderer-coverage.mjs` → **0** Befunde der Klasse `AKTIVE_DB_SECTION_OHNE_PUBLIC_RENDERPFAD` (80 Page-Dateien geprüft).
- `node scripts/admin/build-renderer-path-map.mjs` → 97 Pages neu geschrieben; alle 5 Seiten jetzt `render_class="teilweise_generisch"`, `renderer_path="eigene_komponente_teilweise"`, `status="gemischt"` (vorher noch teils „sonderlogik" auf P-056/P-059/P-060 — Restpunkt R1 aus Batch 36 ist damit erledigt).

## 1. Renderpfad — Detailprüfung

### 1.1 Sichtbare Sections sind 100 % DB-first

Alle aktiven Top-Level-Sections der fünf Seiten gehen durch
`renderPageSectionByType(...)` und treffen nur auf die zentralen
Standard-Renderer (`hero_v1`, `teaser_2col_v1`, `cards_v1` →
`card_v1`, `faq_v1`, `cta_v1`, `content_v1`). Es gibt keine sichtbaren
Karten- oder Teaser-Inhalte mehr, die aus content_v1-Sondercontainern
gerendert werden.

Sonderfall **Broschüren-CTA** (P-057 `broschure_<id>`, P-071
`broschure_intern`, Typ `cta_v1`): wird inline als `BroschureLink`
gerendert, weil `cta_v1` im Body-Dispatcher in `SKIP_TYPES` steht
(Doppelrender-Sperre — Tail-CTA läuft bereits via `CmsTailCta`). Das
ist Standardmuster aus Batch 33d/34b und entspricht der Vereinbarung.
Inhaltlich kommt der Link aus `cms_section_fields` und ist im Admin
vollständig pflegbar.

### 1.2 Doppelrender — keine

Keine der fünf Seiten rendert dieselben Inhalte zweimal. Die früheren
content_v1-Sondercontainer mit `<key>.title/.description/.icon/.tags.*`-
Mustern sind deaktiviert; die jeweils neuen `card_v1`-Kinder tragen
denselben Text 1:1, aber nur dort.

### 1.3 Deaktivierte Altcontainer — öffentlich unsichtbar

Geprüft über RLS-Policy `cms_sections public read published`
(`is_active=true AND cms_page_is_public(page_key)`) und über die
Kette `cms_assets`/`cms_section_fields`, die auf einen aktiven
`cms_sections`-Eintrag bedingen. Alle in §0 als „inaktiv" gelisteten
Container sind damit für `anon`/`authenticated` nicht lesbar und
können auf der öffentlichen Website nicht erscheinen.

## 2. Admin-Bearbeitbarkeit

### 2.1 Whitelist-Coverage neue Karten

```
P-056  card_kita/schulen/wohnheime/pflege/medizin/behoerden/feuerwehren/baeder → 8 × 76 (38 keys × 2 locales)
P-056  cards_standard                                                          → 6 (label/title/intro × 2)
P-059  card_pflege, card_klinik                                                → 2 × 76
P-059  cards_standard                                                          → 6
P-060  card_behoerde, card_feuerwehr, card_schwimmbad                          → 3 × 76
P-060  cards_standard                                                          → 6
```

Jede Karte hat damit den vollständigen `card_v1`-Standardvertrag:
Titel, Beschreibung, Eyebrow-Toggle, Icon (Slot + Toggle), Bild
(Slot + Toggle), Bullets 0–4 (+ Toggles), Chips 0–4 (+ Toggles), drei
Link-Slots (`link_1..3_label/href/kind/enabled`).

P-057 / P-071 wurden bereits in Batch 33d / 34b / 34c whitelistet
(inkl. der drei neuen `leist_<id>_kommunikation_link_p071`-Karten auf
P-057). Spot-Check unverändert grün.

### 2.2 Fehlende Whitelist-Einträge — keine relevanten

- **R3a (kosmetisch):** Auf P-059 (`cards`: 36 Einträge) und P-060
  (`cards`: 49 Einträge) liegen noch Whitelist-Einträge der alten
  content_v1-Sondercontainer in `cms_admin_editable_fields`. Da die
  Section `is_active=false` ist, wird sie im Admin-Tree weder als
  bearbeitbarer Block geführt (siehe Policy „Ausgeblendete Sections")
  noch öffentlich gerendert. Empfehlung: gemeinsam mit dem Cleanup-
  Batch 35x (siehe §6) entfernen — keine Eile, kein Risiko.

### 2.3 Link/Tag/Bild-Standard

Stichproben (`/admin` Section-Editor) zeigen für je eine Karte der
fünf Seiten: Link-Label, Link-Href, Link-Kind, Link-Enabled, Chips,
Icon-Slot, Bild-Slot sichtbar und bearbeitbar. Standardvertrag damit
erfüllt.

## 3. FAQ-Schalter / Admin-Sync — P-071 B-2263 (`faq`, faq_v1)

Geprüft:

- **Datenmodell:** Die FAQ erscheint im Admin-Baum als reguläre
  Section in `cms_sections`. Der „Navigationsbaum" des Admins (linke
  Seite im PageEditor) und der „Arbeitsbereich" rechts lesen
  **dieselbe** Section aus **derselben** Tabelle. Es gibt keine
  separate Kopie in `cms_navigation_nodes` (das ist eine eigene
  Tabelle für die globale Site-Navigation, nicht für Sections einer
  Seite). Damit ist „Sync zwischen beiden Bäumen" strukturell
  trivial: beide Bereiche dispatchen auf dieselbe Row.
- **Label seit Batch 34c:** `SectionRowView.tsx` Zeile 151 erkennt
  `section_type IN ('faq_v1','faq')` und labelt den Knoten in
  beiden Ansichten konsistent als **„FAQ"** (nicht mehr „Häufige
  Fragen" / „Inhalt"). Damit ist die optische Inkonsistenz, die in
  Batch 34c gemeldet wurde, behoben.
- **Toggle (`is_active`):** Der Schalter im Action-Block schreibt
  über `rpc_admin_*` direkt `cms_sections.is_active`. Beide
  Renderer (Baum-Pille + Arbeitsbereich) lesen aus demselben Hook;
  ein Refetch nach dem Toggle aktualisiert beide Stellen.
- **Live-Vorschau:** Die öffentliche Website liest via
  `useCmsPageContent` mit React-Query-Caching. Nach dem Toggle wird
  ein Refetch ausgelöst; eine kurze Wartezeit (≤ 1 s) ist normal
  und entspricht dem Standardverhalten aller Sections (kein FAQ-
  Sonderfall). **Kein Cache-/Race-Problem aufgefunden.**
- **Bug-Befund:** keiner — also auch kein Code-Fix nötig.

Hinweis zur Sprache: Der Begriff „Navigationsbaum" im
ursprünglichen Auftrag bezieht sich auf den linken **Section-Tree**
des PageEditors, nicht auf `cms_navigation_nodes`. Da beide Ansichten
auf derselben Tabelle stehen, kann es per Design keine
Desynchronisation geben, solange beide nach dem Mutate ihre Query
invalidieren — und genau das tut der gemeinsame Tree-Hook.

## 4. P-071 B-2608 (`einrichtung_intern`, teaser_2col_v1) — fachliche Bewertung

**Was ist B-2608?**
Top-Level-Section auf P-071, sort_order 1, direkt nach dem Hero.
Typ: `teaser_2col_v1`. Felder DE+EN gepflegt: `label`
(„Anwendungslösung" / „Application solution"), `title`, `text`,
`image_position=right`, `background_variant=default`. **Kein
Bild-Asset** in `cms_assets` (`section_key='einrichtung_intern'`,
0 Rows).

**Ist `teaser_2col_v1` ohne Bild fachlich sinnvoll?**

- Der Renderer von `teaser_2col_v1` ist auf Bild + Text in zwei
  Spalten ausgelegt. Ohne Bild rendert er meistens nur die Text-
  Spalte; das funktioniert technisch, „verschenkt" aber die
  Spaltenanlage und kann je nach Breite ungewollte Lücken erzeugen.
- Die anderen `einrichtung_<id>`-Sections auf P-057 (Kita, Schule,
  Wohnheim) sind alle als `teaser_2col_v1` mit Bild gepflegt. Das
  Muster ist also etabliert.
- Empfehlung (**ohne Umbau in diesem Batch**): redaktionell ein Bild
  in `cms_assets` für `einrichtung_intern` pflegen (Slot `image`),
  damit B-2608 zur P-057-Anlage spiegelbildlich ist. Ein Umbau auf
  `content_v1` ist nicht empfohlen, weil das die Konsistenz mit
  P-057 brechen würde und B-2608 fachlich ein „Anwendungslösung"-
  Teaser ist, kein reines Intro.
- Alternative, falls keine Bildquelle existiert: `content_v1` mit
  `eyebrow/title/text` wäre tragfähig — aber nur, wenn redaktionell
  bestätigt wird, dass kein Bild geplant ist. **Entscheidung
  gehört zur Redaktion.**

→ **Restpunkt R-B2608**: redaktioneller Bildwunsch klären, dann
Asset pflegen oder Section-Typ einvernehmlich umstellen. Kein
Renderer-Eingriff in diesem Batch.

## 5. Diagnose — aktualisiert

| Quelle | Vor Batch 38 | Nach Batch 38 |
|---|---|---|
| `docs/04-betrieb/audit-snapshot/page-renderer-coverage.json` | seit 33d/34b/36/37 teilweise stale | regeneriert, 0 Befunde |
| `src/features/admin/lib/rendererPathMap.generated.ts` | P-056/P-059/P-060 noch „sonderlogik" | alle 5 jetzt „gemischt / teilweise_generisch" |
| `docs/04-betrieb/faq-cta-toggle-inventar.md` (+ JSON) | drift | regeneriert, grün |
| `scripts/cms/output/.../knownPageObjectContracts*` | drift | regeneriert via `--snapshot`-Lauf |
| PageEditor-Anzeige „Technischer Renderpfad" | zeigt für P-056/P-059/P-060 noch „Sonderlogik" | zeigt jetzt „Eigene Komponente, teilweise generisch (DB-first Standard-Sections)" |

**Restpunkt R1 aus Batch 35 / 36 ist damit geschlossen.**

## 6. Altcontainer-Inventar (gesamte Welle)

Nur inventarisiert, **nicht gelöscht**. Alle sind durch
`is_active=false` öffentlich unsichtbar.

| Seite | section_key | Typ | Empfehlung |
|---|---|---|---|
| P-056 | — | — | Altcontainer wurden in Batch 37 deaktiviert; im aktuellen Snapshot ist nur `content` (aktiv, Intro) sichtbar — kein Backup nötig |
| P-057 | `sections` | content_v1 | Cleanup-Batch 35x |
| P-057 | `einrichtungen` | content_v1 | Cleanup-Batch 35x |
| P-057 | `faq` | faq_v1 | belassen (bewusst aus) |
| P-059 | `section` | content_v1 | Cleanup-Batch 35x |
| P-059 | `cards` | content_v1 | Cleanup-Batch 35x |
| P-059 | `faq` | faq_v1 | belassen (bewusst aus) |
| P-060 | `section` | content_v1 | Cleanup-Batch 35x |
| P-060 | `cards` | content_v1 | Cleanup-Batch 35x |
| P-060 | `faq` | faq_v1 | belassen (bewusst aus) |
| P-071 | `broschure` | content_v1 | Cleanup-Batch 35x |

Hinweis P-056: Der Snapshot aus Batch 37 dokumentierte `section` und
`items` als deaktiviert; im aktuellen Inventar tauchen sie nicht
mehr auf. Vermutlich wurden sie im Vorfeld bereits hart entfernt
(Doku-Lücke, kein Schaden). Bitte beim Cleanup-Batch verbuchen.

**Wichtig vor Cleanup:**

1. SQL-Backup-Export der noch-inaktiven Container in
   `altbestand-report.md`.
2. Spot-Check pro Seite, dass alle Inhalte in den neuen Standard-
   Sections vorhanden sind.
3. Idempotente Migration, nur expliziter `section_key`-Whitelist.

## 7. Restpunkte (priorisiert)

| ID | Bereich | Punkt | Risiko | Empfehlung |
|---|---|---|---|---|
| R1 | Diagnose | ~~Coverage/RendererPathMap stale~~ | — | ✅ in Batch 38 erledigt |
| R2 | P-071 Inhalt | 5. „raumZuRaum"-Karte unter `anforderungen` offen (aktuell 4 Karten) | niedrig | reine Inhaltspflege (Admin oder Prompt), kein Renderer-Batch |
| R-B2608 | P-071 Modell | `einrichtung_intern` (teaser_2col_v1) ohne Bild | niedrig | Redaktion: Bild pflegen — falls dauerhaft kein Bild, später auf `content_v1` einvernehmlich umstellen |
| R3 | Cleanup | inaktive Altcontainer P-057/P-059/P-060/P-071 | niedrig | gebündelter Cleanup-Batch 35x |
| R3a | Admin-Hygiene | Whitelist-Einträge für inaktive `cards`-Sections (P-059: 36, P-060: 49) | sehr niedrig | gemeinsam mit Cleanup-Batch 35x |
| R-077 | Folgeseite | P-077 `anwendungen.referenzprojekte` ist letzte „echte" Sonderlogik im Anwendungsbereich (eigener Slug-Renderer) | mittel | **eigener Auftrag**, nicht in diese Welle ziehen |
| R-DOC | Doku | `cms-steuerbarkeit-status.md` / `current-status.md` referenzieren Batch 36/37/38 noch nicht | sehr niedrig | redaktionelle Doku-Pflege, separater Mini-Batch |

## 8. Was wurde in Batch 38 geändert?

Nur Diagnose-Regenerierung, keine Inhalts-, Navigations- oder
Public-Renderer-Änderung:

- `docs/04-betrieb/audit-snapshot/page-renderer-coverage.json` (+ .md) — regeneriert
- `src/features/admin/lib/rendererPathMap.generated.ts` — regeneriert (P-056/P-059/P-060 reklassifiziert)
- `docs/04-betrieb/faq-cta-toggle-inventar.md` (+ JSON) — regeneriert
- `scripts/cms/output/contract-drift-audit-latest.json` (und ggf. `knownPageObjectContracts*`) — regeneriert via `--snapshot`
- `docs/04-betrieb/audit-snapshot/batch38-anwendungen-standardisierung-abnahme.md` — **dieser Bericht (neu)**

**Nicht angefasst:** Produktdatenbank, Navigation
(`cms_navigation_nodes`, `src/navigation/*`, `src/app/routes.tsx`),
RPC-Layer, RLS-Policies, Section-Typ-Registry, neue Section-Typen,
Inhalte (`cms_section_fields`/`cms_assets`), P-077.

## 9. Empfehlung — was als Nächstes?

In dieser Reihenfolge:

1. **R2 / R-B2608 redaktionell entscheiden** (5. Karte „raumZuRaum",
   Bild für `einrichtung_intern`) — reine Pflege, kein Code, kein
   Renderer-Batch.
2. **Cleanup-Batch 35x**: alle in §6 gelisteten inaktiven content_v1-
   Container + zugehörige Whitelist-Einträge gebündelt entfernen,
   nach Backup-Export.
3. **Doku-Synchronisation**: `cms-steuerbarkeit-status.md` und
   `current-status.md` um Batch 36/37/38 ergänzen.
4. **P-077 separat planen** (Referenzprojekte, eigener Slug-
   Renderer) — eigener Auftrag mit klarem Scope, nicht jetzt.

Stopp nach diesem Batch — keine Folgearbeit gestartet.
