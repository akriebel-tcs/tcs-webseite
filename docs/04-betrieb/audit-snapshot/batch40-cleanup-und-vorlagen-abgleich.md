# Batch 40 — Anwendungen: Cleanup-Prüfung & Vorlagen-Abgleich

Datum: 2026-06-05
Modus: Hygiene/Doku — kein Renderer-Umbau, keine Navigation, keine neuen
Section-Typen, keine P-077-Arbeit, keine Produkt-DB.

## 0. Kurzfazit

- **Gelöscht:** 1 Altcontainer (`broschure` auf P-071, leerer Stub
  ohne Felder/Assets/Whitelist).
- **Bewusst behalten:** 8 weitere inaktive Altcontainer (FAQ-Sections
  + Sondercontainer mit Backup-Inhalten).
- **Vorlagen-Katalog:** zieht automatisch nach (Live-Abfrage mit
  `is_active=true`), keine Code-/Doku-Änderung nötig.
- **Wahrheits-Check:** ✅ grün.
- **Public-Website:** unverändert (gelöschter Stub war öffentlich
  bereits unsichtbar).

## 1. Teil 1 — Inventar inaktiver Altcontainer

Vollständiger Bestand (Stand nach Batch 39):

| Seite | section_key | section_type | Felder | Assets | Whitelist | Entscheidung |
|---|---|---|---:|---:|---:|---|
| P-056 anwendungen.objektloesungen | `faq` | faq_v1 | 36 | 0 | 36 | **behalten** |
| P-057 anwendungen.bildungseinrichtungen | `faq` | faq_v1 | 36 | 0 | 36 | **behalten** |
| P-059 anwendungen.gesundheitseinrichtungen | `section` | content_v1 | 12 | 0 | 0 | **behalten** |
| P-059 anwendungen.gesundheitseinrichtungen | `cards` | content_v1 | 36 | 2 | 0 | **behalten** |
| P-059 anwendungen.gesundheitseinrichtungen | `faq` | faq_v1 | 36 | 0 | 36 | **behalten** |
| P-060 anwendungen.oeffentliche-hand | `section` | content_v1 | 12 | 0 | 0 | **behalten** |
| P-060 anwendungen.oeffentliche-hand | `cards` | content_v1 | 49 | 3 | 0 | **behalten** |
| P-060 anwendungen.oeffentliche-hand | `faq` | faq_v1 | 36 | 0 | 36 | **behalten** |
| P-071 anwendungen.interne-kommunikation | `broschure` | content_v1 | 0 | 0 | 0 | **gelöscht** |

Hinweis P-057: Die in Batch 38 erwähnten Altcontainer `sections` und
`einrichtungen` existieren nicht (mehr) in der DB — wurden bereits in
vorigen Wellen entfernt; Doku-Lücke geschlossen.

### 1.1 Renderer-Referenzen auf Altcontainer (Public-Code)

Suchlauf in `src/features/anwendungen/pages/` und
`src/features/cms/`:

- Keine der fünf Anwendungen-Index-Seiten (P-056/P-057/P-059/P-060/
  P-071) liest die inaktiven `section`/`cards`/`broschure`-Container
  noch direkt. Renderpfad geht ausschließlich über
  `renderPageSectionByType` + Standard-Sections.
- `AnwendungDetailPage.tsx` (Detailseiten Pflege, Klinik, Behörde …)
  liest weiter einen Subkey `broschure` — das ist eine **andere
  Seitenfamilie** (T05-Detailseiten) und nicht von diesem Cleanup
  betroffen.
- `CmsTailFaq.tsx` und `BroschureLink` greifen auf neue Standard-
  Sections (`faq_v1`, `cta_v1` mit Key `broschure_intern`) zu, nicht
  auf die hier inventarisierten Altcontainer.

### 1.2 Begründung „behalten"

- **4× `faq` (faq_v1, je 36 Felder + 36 Whitelist):** redaktionell
  bewusst auf `is_active=false` gesetzt („FAQ aktuell ausgeblendet").
  Inhalt ist nicht redundant — er wartet auf Wiederaktivierung
  durch Redaktion. Whitelist behalten, damit der Toggle im Admin
  funktioniert.
- **2× `section` (content_v1, je 12 Felder, 0 Whitelist):** Alte
  Intro-Container mit eigenem `eyebrow`/`title`/`intro` (z. B.
  „Lösungen für Pflege und Medizin"). Die aktuellen Hero-Sections
  von P-059/P-060 enthalten **inhaltlich ähnliche, aber nicht
  identische** Texte. Ein Löschen würde nicht-trivialen Altbestand
  vernichten, der nicht eindeutig im Standardersatz liegt.
- **2× `cards` (content_v1, 36 bzw. 49 Felder + 2/3 Assets):** Die
  Inhalte wurden in Batch 36 in die neuen `card_v1`-Kinder migriert.
  Stichprobe zeigt: Karten-Texte sind übertragen, aber **die 2/3
  Asset-Backups (alte Karten-Bilder) hängen ausschließlich am
  Altcontainer**. Bei Löschung wären sie weg. Bis ein expliziter
  Auftrag „Assets endgültig verwerfen" vorliegt: behalten.

### 1.3 Sicher gelöscht: `broschure` (P-071)

- `is_active=false`, 0 Felder, 0 Assets, 0 Whitelist — komplett
  leerer Stub.
- Standardersatz aktiv: `broschure_intern` (cta_v1) mit allen
  Inhalten und Link.
- Renderer (`InterneKommunikationPage.tsx`) liest nur
  `broschure_intern`, nie `broschure`.
- Idempotente Löschung mit eingebauter `NOT EXISTS`-Sicherung:
  ```sql
  DELETE FROM cms_sections
  WHERE page_key='anwendungen.interne-kommunikation'
    AND section_key='broschure'
    AND is_active=false
    AND NOT EXISTS (… fields …)
    AND NOT EXISTS (… assets …)
    AND NOT EXISTS (… whitelist …);
  ```
- Verifiziert: `SELECT COUNT(*) … = 0`. Wahrheits-Check bleibt grün.

## 2. Teil 2 — Vorlagen-Katalog (Admin „Vorlagen")

### 2.1 Vorkommen-Zähler

`src/features/admin/lib/blockTemplates.ts`:

- `loadBlockTemplateOccurrences()` liest live aus `cms_sections`
  mit `parent_section_id IS NULL` **und** `is_active=true`.
- `loadCardOccurrencesGrouped()` liest live aus `cms_sections`
  mit `is_active=true`.

Damit zieht der Vorlagen-Katalog automatisch korrekt nach:

- `cards_v1` zählt jetzt u. a. `anforderungen`,
  `leistungen_intern_*`, `systembausteine_intern` (P-071),
  3× `cards_standard` (P-056/P-059/P-060), 12× `cards_v1` (P-057).
- `card_v1` zählt alle neuen Karten inkl. der in Batch 39
  ergänzten 5. Anforderungskarte „Raum-zu-Raum" auf P-071.
- `content_v1`-Vorkommen sinken sichtbar, weil die inaktiven
  Sondercontainer (`section`, `cards`, `broschure`) nicht mehr
  mitgezählt werden.

### 2.2 Vorlagen-Texte

Geprüft:

- `cards_v1` / `card_v1`: Beschreibung in
  `docs/01-strategie/templates.md` und in `BLOCK_TEMPLATE_REGISTRY`
  passt zur Standardisierung. Karten-Felder (38 keys × 2 Locales =
  76 Whitelist-Einträge pro Karte) sind unverändert das, was in
  Batch 36/37/39 angelegt wurde.
- `teaser_2col_v1` (Wechselteaser): Beschreibung weiter gültig —
  Verwendung u. a. P-057 (3× `einrichtung_<id>`) und P-071
  (`einrichtung_intern`, B-2608).
- `faq_v1`: Beschreibung weiter gültig — gilt sowohl für aktive
  FAQ (P-071) als auch für bewusst ausgeblendete FAQ-Sections
  (4× behalten in §1).
- `cta_v1`: Beschreibung weiter gültig — neu ist nur, dass
  `broschure_intern` (P-071) und `broschure_<id>` (P-057-Subseiten)
  inline als Download-Link gerendert werden (SKIP_TYPES-Muster,
  bereits in Batch 33d/34b dokumentiert).

### 2.3 Hinweise auf alte Sonderlogik

`CONTAINER_ORDER_ACTIVE` in `VorlagenKatalog.tsx` listet bewusst
nur Standardbausteine. Es gibt **keinen Hinweis mehr auf
Sonderlogik** im aktiven Katalog — passt zum Stand nach Batch 36/37.
Hinweise auf historische Bausteine (`feature_grid_v1`,
`download_list_v1`, `contact_block_v1`, `rich_v1`) stehen
ausschließlich in `templates.md` als „technische Reserve / 0× aktiv"
und sind weiterhin korrekt.

### 2.4 Änderungen an `docs/01-strategie/templates.md`?

**Nicht nötig.** Die Vorlagen-Palette ist seit Tranche 13 eingefroren
und durch Batch 36/37/39 nicht erweitert worden. Die Datei nennt
keine Seitenzahlen, die jetzt falsch wären, und die Standardvertrag-
Beschreibungen (`card_v1`-Felder, Asset-Slots) stimmen weiterhin.

## 3. DB-first / Eine Wahrheit

- Inhalte: weiterhin in `cms_section_fields` / `cms_assets`.
- Sichtbarkeit: weiterhin `is_active`.
- Reihenfolge: weiterhin `sort_order`.
- Vorkommen-Zähler im Admin: Live-Abfrage, keine doppelte Wahrheit.
- Keine parallele Datenhaltung entstanden.

## 4. Public-Änderung

- Vor Batch 40 war `broschure` (P-071) bereits `is_active=false` und
  öffentlich unsichtbar (RLS).
- Nach Batch 40 ist er aus der DB entfernt, weiter unsichtbar.
- **Keine sichtbare Änderung auf der öffentlichen Website.**

## 5. Verifikation

- `node scripts/cms/wahrheits-check-ci.mjs` → ✅ **grün**.
- Kein Quellcode geändert → kein Build notwendig.

## 6. Was wurde NICHT angefasst

- Navigation, Public-Renderer, Section-Typ-Katalog, RPC-Layer,
  RLS-Policies.
- P-077 `anwendungen.referenzprojekte`.
- Produkt-DB / Katalog / PDP.
- Keine Inhalte umgeschrieben.
- Keine FAQ-Sections (4×) gelöscht — bleiben als redaktionelles
  Reservoir.
- Keine `section`/`cards`-Container mit Inhalten gelöscht — bleiben
  als Backup.

## 7. Offene Restpunkte

| ID | Punkt | Empfehlung |
|---|---|---|
| R-B2608 | Bild für `einrichtung_intern` (P-071) | Redaktionspflege |
| R3 | 8 inaktive Altcontainer mit Inhalt/Assets | später eigener Cleanup-Batch mit explizitem „Backup verwerfen"-Auftrag und vorherigem SQL-Export |
| R-077 | P-077 Sonderlogik | eigener Auftrag |
| R-DOC | `cms-steuerbarkeit-status.md` / `current-status.md` um Batch 36–40 ergänzen | redaktioneller Mini-Batch |

Stopp nach diesem Batch — keine Folgearbeit gestartet.
