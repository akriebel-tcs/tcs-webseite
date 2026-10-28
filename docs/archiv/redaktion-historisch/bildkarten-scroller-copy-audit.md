> **Historisch — ersetzt durch das Dachdokument** (`docs/03-redaktion/redaktions-uebergabe-und-prompt-regeln.md`). Verschoben im Batch 27, 2026-06-05. Inhalt unverändert darunter erhalten.

# Audit: Copy/Paste-Zielbild für Scroller und Bildkarten

Stand: 2026-05-27 · Reiner Lese-Audit, keine Code-/DB-/RPC-Änderungen.

Gelesen:
- `.lovable/always-follow.md`, `docs/current-status.md`,
  `docs/04-betrieb/prompts-vs-admin.md`,
  `docs/03-redaktion/bildkarten-blueprint-audit.md`,
  `docs/03-redaktion/bildkarten-scroller-zielbild.md`,
  `docs/02-architektur/section-typen-katalog.md`,
  `docs/01-strategie/asset-strategie.md`
- Code: `src/features/admin/components/MasterDetailWorkbench.tsx`,
  `src/features/admin/components/tree/SectionLevel.tsx`,
  `src/features/admin/components/tree/SectionRowView.tsx`,
  `src/features/admin/components/ClipboardBanner.tsx`,
  `src/features/admin/api/cmsAdminSectionOrder.ts`,
  `src/features/admin/api/cmsAdminPagesLifecycle.ts`
- DB: aktuelle Definition `rpc_admin_paste_section`, Liste aller
  `rpc_admin_*`-Funktionen, Bestand aller `product_scroller_v1` und
  `cards_v1` in `cms_sections`.

Hinweis: Die im Prompt erwähnten Dateien `src/features/admin/api/cmsAdminSections.ts`
und `src/features/admin/api/cmsAdminClipboard.ts` existieren nicht. Die gesamte
Clipboard-Logik lebt **im Komponenten-State** von `MasterDetailWorkbench.tsx`,
die DB-Aufrufe in `cmsAdminSectionOrder.ts` (`pasteSection`,
`duplicateSection`, `setSectionParent`, `deleteSection`, …). Ebenso existiert
keine API-Datei für „Karte hinzufügen" — siehe Frage 3.

---

## 1. Scroller kopieren (`product_scroller_v1` mit `card_v1`-Kindern)

| Frage | Status | Beleg |
|---|---|---|
| Kompletter Unterbaum (Container + Karten) wird kopiert | **Ja** | `rpc_admin_paste_section` baut einen rekursiven CTE `WITH RECURSIVE tree` über `parent_section_id`, sammelt alle Nachfahren in `_paste_key_map` und legt sie per Loop neu an (`INSERT INTO public.cms_sections … parent_section_id := new_id des Eltern`). |
| Neue B-IDs für Scroller und Karten | **Ja** | Alle neuen Zeilen in `cms_sections` bekommen frische `id` (`gen_random_uuid()`) und einen neuen `section_uid` (Sequence `cms_sections_section_uid_seq`). |
| Kindstruktur bleibt korrekt | **Ja** | `parent_section_id` wird beim Insert über `(SELECT new_id FROM _paste_key_map WHERE src_id = _node.src_parent_id)` gesetzt — Eltern werden vor Kindern eingefügt (Loop bis kein `new_id IS NULL`). |
| Reihenfolge bleibt korrekt | **Ja** | `src_sort` wird als `sort_order` übernommen; danach läuft `cms_resequence_sections_dfs(p_target_page_key)` und repariert die globale DFS-Reihenfolge. |
| Felder DE/EN | **Ja** | `INSERT INTO cms_section_fields … JOIN _paste_key_map ON src_section_key = f.section_key` — alle Locales und `value` + `value_json`. |
| Assets inkl. Viewports + Alt-Texten | **Ja, mit Schutz** | Insert auf `cms_assets` kopiert `viewport`, `field_key`, `alt_text_de/en`, `focal_x/y`, `sort_order`. Hotfix 2026-05-24 ist drin (`viewport` mitkopiert, Doppel-Aktiv-Slot wird übersprungen statt überschrieben). Bildbinaries werden **nicht** kopiert — beide Sections zeigen auf dieselbe `storage_path` URL. |
| Whitelist-Einträge | **Ja** | `INSERT INTO cms_admin_editable_fields … ON CONFLICT DO NOTHING`. |
| Linkfelder | **Ja, generisch** | Linkfelder leben heute als `cms_section_fields`-Zeilen (`cta_label`, `cta_href`, `href`, später `link_1_label`/`link_1_href`/`link_1_kind`). Da der Kopierpfad **alle** Felder per `JOIN` kopiert, sind diese ohne Sonderlogik abgedeckt. |
| Risiken bei `cta_*` / `href` / künftigen `link_1_*` | **Niedrig** | Solange neue Felder als reguläre Einträge in `cms_section_fields` (oder `value_json`) landen, werden sie automatisch mitkopiert. Risiko nur dann, wenn ein Linkfeld zusätzlich in `cms_assets` oder einer Sondertabelle gespeichert würde — beides ist aktuell nicht vorgesehen. |

**Ergebnis:** Scroller-Komplettkopie ist DB-seitig **funktionsfähig**.

---

## 2. Einzelne Bildkarte kopieren (`card_v1`)

| Frage | Status | Beleg |
|---|---|---|
| Kopierbar und unter anderem Scroller einfügbar | **Ja, technisch** | `pasteSection({ targetParentSectionKey: 'aussenstationen', … })` setzt `_parent_id` über `WHERE page_key = target AND section_key = _normalized_parent`. Der „Hier einfügen"-Slot in `SectionLevel.tsx` ruft mit dem korrekten `parentSectionKey` auf. |
| `parent_section_id` auf Ziel-Scroller | **Ja** | Wurzel-Insert nutzt `_parent_id`, der oben aus dem Ziel-Parent aufgelöst wird. |
| Neue B-ID | **Ja** | Wie 1. |
| Assets/Felder/Whitelist | **Ja** | Gleicher Pfad, rekursiv über `_paste_key_map` (bei single card ist die Rekursion trivial = 1 Knoten). |
| Risiko: Karte landet ohne Container | **Vorhanden** | `_paste_key_map`-Logik erlaubt jeden Parent oder NULL. Die UI in `SectionLevel.tsx` zeigt aber Paste-Slots auch auf oberster Ebene (`parentSectionKey = null`) — wer dort einfügt, kappt die Containerbindung. Es gibt keinen UI-Schutz „Bildkarte darf nur unter Scroller/Cards-Grid eingefügt werden". |

**Zusätzliche Lücke (UI ⇄ Tests inkonsistent):**

- `SectionLevel.tsx:211`: `duplicable = !node.section_key.startsWith("content")` — erlaubt fast alles außer `content_*`.
- `__tests__/NavigationTreeEditor.duplicate-rule.test.tsx`: behauptet die Regel sei `/^(persona|block)_/`.
- DB: aktueller `rpc_admin_paste_section` hat **keinen** Quell-Regex-Guard mehr (kein `source_not_duplicable` mehr im Code).

Die Drift ist harmlos (die strengere Erwartung im Test ist nirgends scharf geschaltet), aber Test + Kommentare in `cmsAdminSectionOrder.ts` müssen vor jeder neuen Etappe synchronisiert werden, sonst wird Unklarheit beim nächsten Refactor zur Falle.

---

## 3. Neue Bildkarte in Scroller anlegen

**Befund: existiert heute nicht.**

- Es gibt **keinen** `rpc_admin_create_section` (vgl. Liste aller
  `rpc_admin_*`). Es existieren `rpc_admin_duplicate_section` (flach,
  deprecated), `rpc_admin_paste_section` (rekursiv), `rpc_admin_delete_section`,
  Reorder/Parent/Active — aber kein „neu anlegen".
- Es gibt **keinen** UI-Eintrag „Karte hinzufügen" in `SectionRowView.tsx`
  oder `SectionLevel.tsx`. Der einzige Schreibweg, der neue Sections
  anlegt, ist Paste aus dem Klemmbrett.
- Konsequenz: Neue Karten entstehen heute ausschließlich, indem man eine
  vorhandene Karte kopiert. Das ist umständlich und führt zu sprechenden
  Keys wie `products__adx5_kopie`.

**Was für komfortables Hinzufügen fehlt:**

1. RPC `rpc_admin_create_section(p_page_key, p_parent_section_key,
   p_section_type, p_position, p_section_key?)` mit:
   - Default-`section_key`: aus `parent_section_key + '__' + slug(timestamp/zähler)`
     oder editierbar.
   - Default `section_type`: für „+ Bildkarte" → `card_v1`.
   - Default `is_active = true`, `sort_order` ans Ende oder an `p_position`.
2. Optional: Whitelist-Vorbefüllung (`subtitle`/`title`/`description`/
   `link_1_label`/`link_1_href`/`link_1_kind` für DE+EN) und ein leerer
   `cms_assets`-Slot mit `field_key = 'image'`, `viewport = 'desktop'`,
   `is_active = false` ist nicht zwingend — `useCmsAssetSlot` toleriert
   fehlende Slots, der Admin-Block „Assets" zeigt einen Leer-Slot.
3. UI: Button „+ Bildkarte" am Ende der Kinder eines Containers
   (`product_scroller_v1` und `cards_v1`), in `SectionLevel.tsx` direkt
   unter dem letzten `nodes.map(...)`-Eintrag.
4. Klassifikation als „Bildkarte" passiert in `editorialSectionKind.ts`
   automatisch, sobald `section_type = 'card_v1'` unter passendem
   Container hängt (siehe vorherige Etappe).

---

## 4. Namens- und Label-Konzept

**Heutiger Bestand (Beispiele aus DB):**

- `gebaeudemanagement.digitale-namensanzeige`: Container `products`,
  Kinder `products__adx5`, `products__displaymodul`, `products__briefkasten`,
  `products__software`, `products__etagentaster`.
- `zutrittskontrolle.biometrie`: Container `produkte`, Kinder `produkte__*`.
- `gebaeudekommunikation.tuersprechanlagen`: `aussenstationen` + Kinder
  `aussenstationen__*`, `innenstationen` + Kinder `innenstationen__*`.

→ Heute bereits konsistent: `parent__suffix` ist gelebte Konvention.

**Beim Kopieren:** `rpc_admin_paste_section` benennt die Wurzel um
(`p_new_section_key`, default = Quell-Key, bei Konflikt UI-seitig
`…_kopie`, `…_kopie_2`, …). Kinder behalten zunächst ihren `src_section_key`;
bei Kollision wird mit numerischem Suffix `_2`, `_3` aufgelöst
(`_candidate := _node.src_section_key; WHILE EXISTS … LOOP _candidate := … END LOOP`).
Das führt nach einer Scrollerkopie zu Kindern wie
`products__adx5_2` neben `products__adx5` — technisch sauber, redaktionell
unschön.

**Kollisionsschutz:** Vorhanden, sowohl für die Wurzel
(`target_section_key_exists` + UI-Auto-Suffix bis 20×) als auch für Kinder
(DB-Loop) und Asset-Slots (Partial-Unique-Index `cms_assets_active_slot_idx`
+ defensives Überspringen).

**Format-Guard:** `_root_new_key !~ '^[a-z][a-z0-9_]*$'` →
`new_section_key_invalid`. Konsistent mit `cms_sections.section_key`-Regeln
aus Migrationen.

**Empfehlung für neue Bildkarten (gilt für „+ Bildkarte" und Paste):**

1. **Automatisch generischer Key** mit Container-Präfix:
   `<parent>__<n>` (n = 1 + aktuelle Kinderzahl). Beispiel: Im Scroller
   `aussenstationen` mit 8 Kindern wird der nächste neue Key
   `aussenstationen__9`.
2. **Manuell editierbar** vor dem Anlegen (in einem leichten Dialog,
   wie bereits beim Rename via `rpc_admin_rename_section_key`).
3. **Nicht aus Titel ableiten** beim Anlegen — Titel kommt erst nach
   Inhaltspflege; sprechende Keys lieber später per Rename setzen
   (RPC existiert: `rpc_admin_rename_section_key` für `card_v1`).
4. **Paste-Kinder umbenennen:** Optional „nach Paste alle Kinder auf
   `<neuer-wurzel-key>__<index>` normalisieren" als eigene RPC. Heute
   nicht vorhanden — bewusst als Folge-Etappe einplanen, nicht jetzt.

**Anzeige im Baum:** `SectionRowView` benutzt `display_label_de` (erste
gefüllte DE-Quelle: headline → title → label → eyebrow → intro) plus
B-ID + Kind-Label „Bildkarte". Damit bleibt der Baum verständlich auch
bei generischen `section_key`s wie `aussenstationen__9`.

---

## 5. Zielmodell (Soll-Bild)

```text
Scroller (product_scroller_v1)              ← kopierbarer Container
├── Bildkarte (card_v1)  parent_section_id  ← kopierbar einzeln
├── Bildkarte (card_v1)                       und neu erzeugbar
└── …

Cards-Grid (cards_v1)                       ← gleiche Logik
├── Bildkarte (card_v1)
└── …
```

Regeln:

1. **Container = kopierbar.** Scroller-Kopie nimmt alle Kindkarten,
   Felder DE/EN, Assets (alle Viewports), Whitelist-Flags, Linkfelder mit.
2. **Bildkarte = kopierbar einzeln.** Paste-Ziel ist ein anderer
   Container derselben oder einer anderen Seite.
3. **Kopieren erzeugt neue IDs** (`id`, `section_uid`) und neue
   Section-Keys (Auto-Suffix bei Kollision).
4. **Inhalte werden übernommen.** Storage-Bilder werden geteilt, nicht
   dupliziert (gleiche `storage_path`). Wer ein Bild ersetzt, ersetzt
   nur im eigenen Slot.
5. **Redaktion editiert danach individuell.** Texte/Bilder/Links wandern
   in das whitelistete Pflegeformular im Arbeitsbereich.
6. **Alte und neue Felder bleiben erhalten.** `cta_label`/`cta_href`/
   `href` und künftige `link_1_*..link_3_*` laufen denselben Weg, weil
   Paste alle Feldzeilen kopiert.
7. **„+ Bildkarte"** legt eine leere `card_v1` mit Auto-Key
   `<parent>__<n>` an. Keine Inhalte, keine Bilder — Redaktion füllt im
   Arbeitsbereich.
8. **Keine Produktdatenbank.** Bildkarten bleiben pure CMS-Sections.

---

## 6. Risiken / Altlasten

1. **`rpc_admin_duplicate_section` (flach, deprecated).**
   `cmsAdminSectionOrder.ts` exportiert die Funktion noch („nur als
   Export, weil Tests die Signatur spiegeln"), die UI ruft sie nirgends
   mehr auf. RPC existiert in der DB weiterhin. → Empfehlung: Funktion
   im nächsten Aufräumen ganz entfernen (Code-Export + RPC), nachdem
   ein Audit „keine Stelle im Repo ruft sie auf" bestätigt.
2. **UI ⇄ Test ⇄ DB Drift bei `duplicable`-Regel.** UI:
   `!startsWith("content")`. Test: `/^(persona|block)_/`. DB: keine
   Quellregex mehr. Drei Wahrheiten — Test ist veraltet, Kommentar in
   `cmsAdminSectionOrder.ts` ebenfalls (spricht von „home.start"-Begrenzung,
   die in `rpc_admin_paste_section` nicht mehr existiert). Vor jeder
   weiteren Etappe **Test und Kommentare entstauben**.
3. **Karte ohne Container.** Paste-Slot auf oberster Ebene erlaubt es,
   eine `card_v1` als Top-Level-Section einzufügen — sie wird dann
   nirgends gerendert (Renderer iteriert über Container). Risiko ist
   redaktioneller Natur, nicht datenzerstörend. Möglicher Guard:
   im UI Paste-Slots für `card_v1`-Klemmbrett nur unter einem
   Container-Knoten anzeigen.
4. **Asset-Storage wird geteilt, nicht dupliziert.** Die Kopie zeigt
   auf dieselbe `storage_path` wie die Quelle. Ersetzt jemand die
   Quell-Datei direkt im Storage (statt per Admin-Upload), ändert sich
   das Bild in beiden Karten. Im Admin-Flow nicht möglich — dort
   erzeugt jeder Upload einen neuen Pfad — daher Risiko niedrig, aber
   in Doku festhalten.
5. **Asset-Slot-Konflikte beim Paste.** Hotfix 2026-05-24 fängt
   `cms_assets_active_slot_idx`-Verletzungen ab; trotzdem als Warnung in
   UI hinterlegt („Ein Bildslot wäre doppelt aktiv geworden"). Bei
   neuen Asset-Feldern (z. B. `thumbnail`, `icon_image`) gleiche
   Partial-Unique-Logik mitführen.
6. **Sort-Order nach Paste:** stützt sich vollständig auf
   `cms_resequence_sections_dfs`. Solange die Funktion korrekt arbeitet
   (was sie bei aktuellen Tests tut), ist Reihenfolge robust. Vor
   jeder Schemaänderung an `parent_section_id` muss diese Funktion
   mitwandern.
7. **Kein Schreibweg „neu anlegen".** Heißt: Redaktion kann ohne
   Vorlage keine neue Bildkarte erzeugen. Größte funktionale Lücke
   zum Zielbild — siehe Punkt 3 oben.

---

## Empfehlungen (Reihenfolge, keine Umsetzung jetzt)

1. **Doku konsolidieren** (dieser Bericht, plus Update von
   `bildkarten-scroller-zielbild.md`-Etappenliste: Punkt „Add-Card"
   wird eigene Etappe).
2. **Test + Kommentare aufräumen**
   (`NavigationTreeEditor.duplicate-rule.test.tsx`,
   `cmsAdminSectionOrder.ts` Doc-Kommentare zu „home.start" und
   `^(persona|block)_`). Reiner Doku-/Test-Patch.
3. **`rpc_admin_duplicate_section` entfernen** (Code-Export + DB-Funktion)
   nach Bestätigung „keine UI-Aufrufe".
4. **Etappe „+ Bildkarte"**:
   - RPC `rpc_admin_create_section` (Whitelist auf `card_v1` unter
     `product_scroller_v1`/`cards_v1`).
   - UI-Button am Ende der Container-Kinder.
   - Auto-Key `<parent>__<n>` mit editierbarem Dialog.
5. **Optional Etappe „Paste-Kinder normalisieren"**:
   nach Container-Paste Kinder-Keys auf `<neuer-wurzel-key>__<index>`
   umbenennen (RPC analog `rpc_admin_rename_section_key`, batched).
6. **UI-Guard** „Bildkarte nur unter Container einfügen" als kleines
   Folge-Quality-Of-Life.

---

## Bestätigung Nicht-Ziele

- Kein Code geändert.
- Keine Migration angelegt.
- Keine RPC angelegt/geändert.
- Keine Supabase-Schreiblogik gebaut.
- Keine Inhalte, Bilder oder Karten kopiert.
- Keine Public-Renderer berührt.
- Keine Produktdatenbank berührt.
