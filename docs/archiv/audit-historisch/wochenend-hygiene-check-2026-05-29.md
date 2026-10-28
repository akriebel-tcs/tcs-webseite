# Wochenend-Hygiene-Check CMS-Light „Eine Wahrheit"

Stand: 2026-05-29 · Sprint `cms-light-wochenend-hygiene-check-stand-plan-validierung-1`
Modus: **read-only** — keine DB-, Migrations-, RPC-, Inhalts-, Bild-, Feldwert-, Whitelist-, i18n-, Public-Renderer-, Routen-, Navigations-, Footer-, Breadcrumb- oder Produktdatenbank-Änderung.

---

## A. Kurzfazit

- **Stabil:** R2 (`content_v1 → card_v1`) ist vollständig geräumt. D1 = 0, D8 = 0. Renderer-/Vertragskonsolidierung greift; Admin-Sprungmarken (N-/P-/B-/A-IDs, auch Kind-Karten in Scrollern) funktionieren. Baustein-Atlas liegt als neutraler Ist-Katalog vor.
- **Offen:** Die Standardisierungs-Entscheidung („flexible Standardkarte" + Container-Hüllen) ist fachlich noch nicht getroffen. Die Layout-/Baustein-Matrix wird fachlich vorbereitet. Solange diese nicht entschieden ist, sind D3/D5-Massen, i18n-Fallbacks und das `card_v1`-Variantenmodell **bewusst nicht** technisch durchformuliert.
- **Größter Hebel jetzt:** Layout-/Baustein-Matrix klären → flexible Standardkarte entscheiden → erst danach Contract/Presets schärfen und D3/D5 zielgerichtet seeden. Alles davor ist Vorarbeit.

---

## A.1 DB-first vs. DB-only — Begriffsklärung

Beide Begriffe tauchen in den Audits und Renderer-Klassen (S1/S2/S3 etc.) auf und werden gerne verwechselt:

- **DB-first** bedeutet: Der Renderer liest **zuerst** den CMS-/DB-Wert (`cms_section_fields`, `cms_assets`). Existiert dort kein Wert, fällt er **bewusst** auf einen i18n-Schlüssel oder einen hartkodierten Code-Default zurück. Der DB-Wert hat Vorrang, sobald er gepflegt ist — der Fallback ist Sicherheitsnetz, nicht zweite Wahrheit für die Redaktion. Praktisch realisiert über den Hook `useCmsI18n` (`t("…")` → `cms.text(...)` mit i18n-Fallback) bzw. `cms.asset(slot, fallbackImport)`.
- **DB-only** bedeutet: Die sichtbare Wahrheit kommt **ausschließlich** aus CMS/DB. i18n-/Code-Fallbacks sind entfernt oder nur noch technische Notfallpfade (z. B. Ladezustand, harter Fehler). Eine leere DB-Zeile ⇒ leerer Bildschirm — keine zweite Quelle.

**Konsequenz für die 19 S2-Seiten im Renderer-Inventar:** S2 heißt **nicht** „DB-first ist kaputt". S2 heißt: Die Seite ist bereits DB-first verdrahtet, hat aber an einzelnen Stellen noch i18n-/Hardcoding-Fallbacks, die als zweite Wahrheit wirken könnten, falls die DB-Zeile fehlt. Der i18n-/Hardcoding-Abbau (Etappenschritt 5) überführt diese Seiten von **DB-first** nach **DB-only** — fachlich erst nach Layout-/Baustein-Matrix und gezieltem D3/D5-Seeding, damit nirgendwo leere Slots live gehen.

---

## B. Aktueller Stand „Eine Wahrheit"

| Thema | Stand | Quelle |
|---|---|---|
| R2 `content_v1 → card_v1` | **0 offen** (vollständig migriert in Sprint 2j) | Drift-Audit, Renderer-Inventar |
| D1 Vertrag fehlt | **0** | `contract-drift-audit-latest.md` |
| D8 aktiv ohne Renderer | **0** | dito |
| D9 Parent/Child-Verletzungen | **25 Treffer / 2 distinct Relations** | `d9-relations-latest.md` |
| D3 Vertragsfeld ohne DB-Zeile | **3502 gesamt** / **2004 nur aktiv** | `d3-d5-rest-triage-latest.md` |
| D5 Vertragsfeld ohne Whitelist | **3416 gesamt** / **2000 nur aktiv** | dito |
| D2 DB-Feld unbekannt im Vertrag | **2649** | Drift-Audit |
| D4 Whitelist unbekannt im Vertrag | **3074** | dito |
| D6 Asset-Slot unbekannt im Vertrag | **184** | dito |
| D10 i18n/Spezialrenderer-Risiko | **28** | dito |
| Renderer-Inventar (79 Pages) | G0 2 · G1 4 · S1 54 · S2 19 · S3 2 · P1 1 — 59 low · 20 medium · 2 high | `renderer-fallback-inventar-latest.md` |
| Baustein-Atlas | 19-seitiger neutraler Ist-Katalog + JSON-Index | `baustein-atlas-visuell.md/.pdf` |
| Admin-Sprungmarken | Parser + 4 Resolver-RPCs verifiziert; B-538/B538/Karten unter Scrollern springen | `admin-kurz-id-sprung-test.md` |
| Redaktionsbetrieb | Prototyp ohne Login; Inhalts-Prompts erlaubt, fließen über `rpc_admin_*` in DB | `.lovable/always-follow.md` |

**D9-Details (2 echte Beziehungen):**

| Parent | Child | Count | Pattern | Pages |
|---|---|---:|---|---|
| `(none/top-level)` | `card_v1` | 19 | `child_only_at_top_level` | `anwendungen.root` (alle inaktiv/Kopien) |
| `rich_v1` | `rich_v1` | 6 | `top_level_only_under_parent` | `home.start` (Persona-Sections, davon 1 aktiv) |

→ 5 von 25 sind aktive Sections. Kein Live-Renderbruch, aber Vertragsdrift bleibt.

---

## C. Admin-Validierung (Tab „Validierung")

### Was sie ist — und was sie nicht ist

Der Tab „Validierung" im Admin (`SlotValidationView.tsx`) ist eine **Bildslot-Validierung**, kein Gesamt-CMS-Audit. Geprüft wird ausschließlich, ob der DB-Bestand an Bildern (`cms_assets`) zur Renderer-Erwartung passt.

**Datenquellen (alle read-only):**
- `rpc_admin_read_assets_overview` → aktive/inaktive `cms_assets`-Zeilen mit Page-/Section-Kontext.
- `cms_sections`-SELECT über den CMS-Light-Client (Typ, aktiv/inaktiv, Parent).
- Statische Renderer-Erwartungskarte `src/features/admin/lib/rendererSlotMap.ts`.

**Vergleichsregel:** Pro `page_key | section_key | field_key` werden DB-Assets und erwartete Renderer-Slots gegenübergestellt.

### Bedeutung der Befunde

| Badge | Befund | Bedeutung |
|---|---|---|
| **OK** | `match` | Renderer erwartet Slot, DB liefert aktives Bild |
| **Hinweis** | `empty_required` | Renderer erwartet Pflicht-Bild (z. B. Hero), DB hat keinen aktiven Slot → **fehlt live** |
| **Hinweis** | `empty_optional` | Renderer kann ein Bild zeigen, DB hat keinen aktiven Slot → nur Reservierung |
| **Hinweis** | `orphan` (Section inaktiv) | Bild liegt an deaktivierter Section, wird nicht öffentlich gerendert |
| **Problem** | `orphan` (Renderer ignoriert) | DB liefert Bild, Renderer liest `field_key` nicht → verwaister Slot, oft Legacy oder Tippfehler |
| **Problem** | `unknown_section_type` | `section_type` nicht im Renderer-Katalog → kein Renderer-Konsument |
| **Problem** | `no_section` | DB-Asset ohne dazugehörige Section → echte Datenmüll-Zeile |

**Warum „Hinweis"/„Problem" ≠ Public-Fehler:**
- `empty_optional` ist Default für Karten (`image`/`thumbnail`/`icon_image`) — Karten ohne Bild sind im Layout vorgesehen.
- `orphan` an inaktiver Section ist nicht öffentlich sichtbar.
- `orphan` (Renderer ignoriert) ist Admin-Lärm: das Bild liegt zwar in der DB, erscheint aber nicht auf der Website, weil ein Spezial-/Legacy-Renderer den `field_key` nicht liest.

**Wirklich kritisch sind:**
1. `empty_required` an aktiven `hero_v1`/`teaser_2col_v1` → Bild fehlt live.
2. `no_section` → DB-Inkonsistenz.
3. `unknown_section_type` an aktiven Sections.

### Aktuelle Zahlen (reproduziert am 2026-05-29 aus DB)

> Reproduziert mit `scripts/cms/slot-validation-audit.py` (read-only, gleiche Logik wie `SlotValidationView.buildReport()`). Skript liest `cms_assets` / `cms_sections` / `cms_pages` und wendet `rendererSlotMap.ts` an.

| Kennzahl | Wert |
|---|---:|
| Seiten mit Bildslots | **115** |
| Slots gesamt (Union DB-Assets + Renderer-Erwartung) | **2515** |
| **OK** | **284** |
| **Hinweis** | **2046** |
| **Problem** | **185** |

> Hinweis: Die im Auftrag genannten Zahlen (OK 246 / Hinweis 1214 / Problem 288) konnten nicht 1:1 bestätigt werden. Wahrscheinliche Ursache: Filter `Nur Hinweise & Probleme` ist im UI aktiv und die Zahlen stammen aus einer früheren DB-Stichprobe. Aktuelle, ungefilterte Reproduktion ergibt obige Werte.

### Befund-Verteilung

| Befund | Count |
|---|---:|
| `empty_optional` (Hinweis) | 1981 |
| `match` (OK) | 284 |
| `orphan` Renderer ignoriert (Problem) | 137 |
| `orphan` Section inaktiv (Hinweis) | 65 |
| `no_section` (Problem) | 48 |

### Top-10 Problemgruppen

**Nach `field_key`:** `image` (59) · `img_2` (12) · `img_0` (12) · `img_1` (12) · `image_desktop` (8) · `thumbnail` (3) · `image_mfh` (2) · `items.funkgong.image` (2) · `image_gewerbe` (2) · `image_efh` (2).

**Nach `section_type`:** `content_v1` (94) · `cards_v1` (28) · `hero_v1` (8) · `product_scroller_v1` (7).

**Nach Seite:** `anwendungen.root` (14) · `mobile-tk-preview.root` (13) · `produkte.hub` (13) · `gebaeudekommunikation.root.kopie` (9) · `gebaeudekommunikation.tuersprechanlagen` (7) · `eingangssysteme.funktionalitaet` (7) · `gebaeudekommunikation.snipdoo-ip` (6) · `eingangssysteme.referenzen` (6) · `personas.architekt.kopie` (5) · `gebaeudekommunikation.beschilderung` (4).

### Top-Hinweise (zur Einordnung „nur Reservierung")

**Nach `field_key`:** `icon_image` (702) · `thumbnail` (677) · `image` (621). **Nach `section_type`:** `card_v1` (1995). → Karten-Slots, die optional sind. Kein Public-Fehler, sondern Whitelist-/Platzhalter-Pflege.

### Was ist kritisch, was nur Hinweis/Altlast?

- **Kritisch (Public-Risiko):** die ~8 `hero_v1`-Probleme und alle `no_section` (48) — dort fehlt entweder das Hero-Bild live oder das Asset hat keine Section. Diese sollten in einer eigenen Mini-Tranche aufgeräumt werden (Whitelist/Asset-Hygiene), aber **nicht jetzt**, sondern nach der Layout-Matrix-Entscheidung (sonst wandern Slots noch einmal).
- **Altlast (Admin-Lärm, nicht Public-Fehler):** 137 `orphan` (Renderer ignoriert) — meist `content_v1`-Sections mit `items.<key>.image`, `img_0/1/2`-Galerien, Persona-/Anwendungs-Kopien. Wird durch Variantenmodell `card_v1` + Renderer-Slot-Erweiterung adressiert, nicht durch Asset-Löschung.
- **Reine Reservierung:** ~1981 `empty_optional` an `card_v1`-Slots. Verlangt keine Aktion; wird durch Karten-Presets fachlich entschärft.

### Empfohlene nächste Maßnahme zur Admin-Validierung

1. Filter im Admin bewusst auf **„Nur Probleme"** stellen — 185 statt 2515 Befunde, deutlich übersichtlicher.
2. Nach Layout-Matrix-Entscheidung gezielt 48 `no_section` und ~8 `empty_required` Hero abräumen.
3. `orphan (Renderer ignoriert)` bleibt liegen, bis das Variantenmodell für `card_v1` und der Container-Vertrag stehen.

---

## D. Baustein-/Layout-Stand

- **Flexible Standardkarte** (`card_v1` mit Toggles `eyebrow_enabled`, `image_enabled`, `icon_enabled`, `features_0..4_enabled`, `link_1..3_enabled`) ist im Atlas als **Zielstandard-Kandidat** markiert. Pilot: B-538/B-539/B-540/B-2195 unter B-026 `aussenstationen` (Schwester-Scroller B-027 `innenstationen`) auf `gebaeudekommunikation.tuersprechanlagen` (P-004).
- **Container** (`cards_v1`, `product_scroller_v1`, `feature_grid_v1`, `card_grid_v1`, `catalog_filter_grid_v1`) sind im Atlas konsequent als **Layout-Hüllen** geführt — sie sind kein eigener sichtbarer Baustein.
- **Layout-/Baustein-Matrix wird fachlich vorbereitet.** Bis die Matrix bewertet ist, wird keine technische Festlegung getroffen (kein neuer `standard_card_v1`-Vertrag, kein flächiges Preset-Roll-out, kein Container-Stilllegen).
- **Anhang „manuell prüfen":** `icon_card_image`, `download_card`, `download_list_v1`, `produkte.eingangsloesungen.kopie` — stehen bewusst nicht im Hauptkatalog.

---

## E. Nächste Schritte (Reihenfolge)

1. **Layout-/Baustein-Matrix fachlich klären.** Ergebnis: welche der heutigen `card_v1`-Varianten werden Presets, welche fallen weg, welche Container bleiben.
2. **Flexible Standardkarte entscheiden.** Wenn ja → eigener Sprint, der `standard_card_v1`-Vertrag und Preset-Mapping einführt (Migration nur Vertrag/Schema, keine Inhalte verschoben).
3. **Contract/Presets schärfen.** `card_v1` in Variantengruppen aufteilen (Click-/CTA-/Icon-/Download-/Multi-Link-/Feature-Card). Erst danach werden D3/D5-Pflichtfelder pro Variante sinnvoll.
4. **Gezieltes D3/D5-Basis-Seeding** für Container-Header (`cards_v1.intro`, `content_v1.title/label`) und `card_v1.description` (S1/S2, ~43 Felder) — kein pauschales Seeding.
5. **i18n-/Hardcoding-Fallbacks bereichsweise abbauen** (S2-Pages aus Renderer-Inventar: 19 Seiten, bereichsweise: gebaeudekommunikation → zutrittskontrolle → gebaeudemanagement → kontakt → eingangssysteme.root → produkte.hub/tuerkommunikation → home.ueber-tcs).
6. **Verbleibende D9-Reste / Legacy-Cleanup** (`anwendungen.root` Kopien deaktiviert/aufräumen, `home.start` Persona-`rich_v1`-Verschachtelung beibringen oder Vertrag erweitern).

---

## F. Nicht jetzt tun

- **Kein pauschales D3/D5-Seeding** — würde 1500+ Karten-Felder als Pflicht definieren, bevor das Variantenmodell steht.
- **Keine Baustein-Migration ohne Zielmatrix** — Karten-Renames/Retypes vor der Matrix erzeugen doppelte Arbeit.
- **Keine i18n-Fallback-Entfernung ohne DB-Gegenstück** — sonst leere Seiten live.
- **Keine Änderung an der Produktdatenbank** (`src/lib/supabase/client.ts`, Katalog, PDP) — separater Bereich.
- **Keine nebenbei-Änderung an Public-Navigation, Footer, Routen, Breadcrumb** — eigene Etappen.
- **Keine Whitelist-Großbereinigung** vor der Variantenentscheidung — würde Admin-Felder wegklicken, die das Variantenmodell wieder braucht.

---

## Reproduktion / Quellen

| Audit | Befehl | Ausgabe |
|---|---|---|
| Contract-Audit | `npm run cms:audit:contract` | Stdout (15 OK · 7 Warnungen · 0 Konflikte) |
| Contract-Drift | `npm run cms:audit:contract-drift` (mit `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` in env) | `docs/04-betrieb/contract-drift-audit-latest.md` |
| D9 Owner-Buckets | `npm run cms:audit:d9` | `docs/04-betrieb/sprint-2c-d9-owner-entscheidungen.md` |
| D9 Relations | `npm run cms:audit:d9-relations` | `docs/04-betrieb/d9-relations-latest.md` |
| D3/D5-Triage | `npm run cms:audit:d3-d5-triage` | `docs/04-betrieb/d3-d5-rest-triage-latest.md` |
| Renderer-Fallback | `npm run cms:audit:renderer-fallback-inventory` | `docs/04-betrieb/renderer-fallback-inventar-latest.md` |
| Admin-Slot-Validierung (Reproduktion) | `python3 scripts/cms/slot-validation-audit.py` (vorher `psql`-TSV-Exports nach `/tmp/`) | Stdout |

**`npm run build`:** im Lovable-Harness nicht manuell vorgesehen — Build läuft automatisch über die Vorschau. Bewusst nicht manuell ausgeführt.

**Weitere relevante bestehende CMS-/Admin-Hygiene-Audits (nur genannt, nicht ausgeführt, kein Neubau):**
`cms:audit:renderer`, `cms:audit:renderer:strict`, `cms:audit:dead-i18n`, `scripts/cms/admin-hygiene-audit.mjs`, `scripts/cms/icon-sync-audit.mjs`, `scripts/cms/medien-konsistenz-audit.mjs`, `scripts/cms/redaktions-fluss-audit.mjs`, `scripts/cms/rendertreue-audit.mjs`, `scripts/cms/validate-cms-overlay.mjs`, `cms:check:fout`.

---

## Geänderte Dateien in dieser Tranche

- **Neu:** `docs/04-betrieb/wochenend-hygiene-check-2026-05-29.md` (dieses Dokument)
- **Neu:** `scripts/cms/slot-validation-audit.py` (read-only Reproduktionsskript)
- **Aktualisiert:** `docs/04-betrieb/contract-drift-audit-latest.md` (Re-Generierung)
- **Aktualisiert:** `docs/04-betrieb/d9-relations-latest.md` (Re-Generierung, inhaltsgleich)
- **Aktualisiert:** `docs/04-betrieb/d3-d5-rest-triage-latest.md` (Re-Generierung, inhaltsgleich)
- **Aktualisiert:** `docs/04-betrieb/renderer-fallback-inventar-latest.md` (Re-Generierung, inhaltsgleich)
- **Aktualisiert:** `docs/04-betrieb/sprint-2c-d9-owner-entscheidungen.md` (Re-Generierung durch `npm run cms:audit:d9`)
- **Aktualisiert:** `docs/current-status.md` (Header-Eintrag Wochenend-Hygiene-Check)

Keine Migration, keine RPC, keine Inhalte, keine Bilder, keine Whitelist, keine i18n-Datei, kein Public-Renderer, keine Route, keine Navigation, kein Footer, keine Breadcrumb, keine Produktdatenbank verändert.
