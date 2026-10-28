# Batch 49c — B-566 Signage-Scroller: Analyse und Begründung

**Stand:** 2026-06-05
**Status:** ⚠️ Kein Code-Fix umgesetzt — Begründung warum (siehe §3). SignagePage unverändert.

---

## 1. Ist-Zustand B-566

| Feld | Wert |
|---|---|
| Seite | `signage.root` |
| `cms_pages.status` | **`archived`** |
| `cms_pages.is_active` | **`false`** |
| Section `section_key` | `products` |
| Section `section_type` | `cards_v1` |
| Section `is_active` | `true` |
| Kindkarten | `products__farbvielfalt`, `products__hausnummern`, `products__tuerklingeln`, `products__tuerschilder` (alle `card_v1`, aktiv) |
| Admin-Label (Heuristik `effectiveContainerKindOf`) | `cards_v1.scroller` ("Kartenscroller") |
| Live-Rendering vorher | bespoke `FeatureBlock`-Stack über i18n-Fallback |

---

## 2. Renderer-Pfad

`SignagePage.tsx` rendert die Produkte über einen eigenen Block:

- `productCards = cms.sections.filter(parent_section_key='products' && section_type='card_v1')`
- Wenn `productCards.length === 0` → Fallback auf `PRODUCT_KEYS`-Liste mit Übersetzungs-Keys (`t("products.items.<legacy>.headline" / ".text")`)
- Jede Karte rendert als `<FeatureBlock>` (großformatige Editorial-Komponente, vertikal gestapelt mit `space-y-12`).

Diese Render-Logik ist Sonderlogik. Sie könnte technisch durch `renderPageSectionByType` ersetzt werden — was via Batch-49/49b-Weiche dann automatisch zu `ProductScrollerV1` würde.

---

## 3. Warum kein Live-Fix umgesetzt wurde

Bei der Umstellung auf `renderPageSectionByType` zeigte die Live-Preview **gar keinen Produkt-Block** mehr — nur noch Hero + Intro + Badge `Body aus Code (Fallback)`. Ursache:

- `signage.root` hat in `cms_pages` den Status `archived` und `is_active=false`.
- RLS-Policy `cms_sections public read published` filtert auf `is_active = true AND cms_page_is_public(page_key)`. Die Public-Read-Pfade liefern für `signage.root` daher **keine Sections** an die öffentliche Seite.
- Die bisherige Bespoke-Logik kaschiert das, weil sie auf den `PRODUCT_KEYS`-i18n-Fallback fällt, sobald `productCards.length === 0`.
- Eine Umstellung auf `renderPageSectionByType` entfernt diesen Fallback — die Seite verliert den Produkt-Block komplett.

**Konsequenz:** Der Live-Test entlarvte, dass B-566 öffentlich überhaupt nicht aus der DB gelesen wird. Das Admin-Label „Kartenscroller" ist eine **Heuristik-Nebenwirkung**, kein gelebter Vertrag — die Karten werden öffentlich nicht aus B-566 gezogen, sondern aus den signage-i18n-Keys.

Damit kollidiert ein Fix mit den Stopp-Regeln:

- **Keine DB-Migration**, außer Klassifikation nachweislich falsch — die Klassifikation ist nicht "falsch", die Seite ist nur archiviert.
- **Keine flächigen Veröffentlichungen** ohne Auftrag — `signage.root` von `archived → published` zu schalten ist eine redaktionelle Freigabe-Entscheidung, kein Render-Fix.
- **Keine Inhalte ändern** — das i18n-Fallback ist die aktuell sichtbare Inhaltsquelle, eine Umstellung auf DB würde sichtbare Inhalte verändern (bullets/chips/links statt FeatureBlock-Storytelling).

**Entscheidung:** SignagePage bleibt unverändert. SignagePage-Änderung wurde verifiziert (Preview zeigte Fallback-Badge + leerer Produkt-Block) und sofort revertiert.

---

## 4. Empfehlung

Drei saubere Entkopplungsoptionen — alle **außerhalb dieses Batches**, jeweils explizit zu beauftragen:

1. **Page veröffentlichen** (`signage.root.status='published'`, `is_active=true`): Greift dann automatisch über die Batch-49b-Weiche → `ProductScrollerV1`. Aber: redaktionelle Freigabe nötig + sichtbarer Inhaltswechsel (vertikal Stack → horizontaler Scroller).
2. **Admin-Klassifikation anpassen**: `effectiveContainerKindOf` lokal für `signage.root|products` ausnehmen, sodass Admin nicht mehr „Kartenscroller" sagt. Behebt nur die Label-Drift, ändert nichts am Public-Rendering.
3. **Bespoke-Page-Registry**: B-566 explizit in `bespokePageSections.ts` als „bespoke, eigene Render-Logik" markieren und im Admin entsprechend hinweisen.

---

## 5. Verifikation

- **B-082** (`/zutrittskontrolle/zufahrten-parkplaetze`) — Sichtprüfung: ✅ Scroller (Chevron-Buttons + Snap-Cards).
- **B-075** (`/zutrittskontrolle/mobiler-zutritt`) — bereits in Batch 49b als Scroller bestätigt; nicht erneut angefasst.
- **B-566** (`/signage`) — Sichtprüfung: weiter bespoke FeatureBlock-Stack aus i18n-Fallback. Begründet (siehe §3).
- `node scripts/cms/wahrheits-check-ci.mjs` → ✅ OK.
- Build grün (keine bleibenden Code-Änderungen).

---

## 6. Geänderte Dateien

**Keine.** Probeweise umgeschriebene `SignagePage.tsx` wurde nach Live-Test unmittelbar auf den vorherigen Zustand zurückgesetzt. Harvester (`docs/04-betrieb/faq-cta-toggle-inventar.md` + `knownPageObjectContracts.ts`) entsprechend nach dem Revert nochmals neu erzeugt und mit dem Repo-Stand abgeglichen — Wahrheits-Check grün.

---

## 7. Restpunkte

- **B-566 (`signage.root`)**: dokumentierter Sonderfall, kein 1-Zeilen-Fix möglich, weil die Seite archiviert ist und der Public-Render rein aus i18n-Fallback kommt. Drei Folgepfade siehe §4 — keiner ohne expliziten Auftrag.

---

**Ende Batch 49c.**
