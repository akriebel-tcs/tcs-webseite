# Batch 47 — `card_v1`-Vertragsdrift Restfix (R5–R10)

**Stand:** 2026-06-05
**Status:** ✅ Abgeschlossen
**Scope:** Restliche rote Cluster R5–R10 aus Batch 45 + finale Bereinigung der `/kontakt`-Defaultlinks.

---

## 1. Gefixte R5–R10-Pfade

| Cluster | Datei | Eltern-Section | Status |
|---|---|---|---|
| R5 | `src/features/karriere/pages/KarrierePage.tsx` | `benefits`, `jobs` | ✅ `buildCardExtras` aktiv |
| R6 | `src/features/presse/pages/PressePage.tsx` | `releases` | ✅ `buildCardExtras` aktiv |
| R7 | `src/features/signage/pages/SignagePage.tsx` | `products` | ✅ `buildCardExtras` aktiv |
| R8 | `src/features/wissen/pages/AkademiePage.tsx` | `formate`, `zielgruppen`, `partner` | ✅ `buildCardExtras` aktiv |
| R9 | `src/features/eingangssysteme/pages/EntrySystemPage.tsx` | `pillars` | ✅ `buildCardExtras` aktiv |
| R10 | `src/features/zutrittskontrolle/pages/FahrstuhlsteuerungPage.tsx` | `benefits` | ✅ **in diesem Batch finalisiert** |

R5–R9 wurden bereits in der ersten Batch-47-Welle umgesetzt. Die Gegenprüfung (siehe `rg buildCardExtras|resolveCardVisibility`) bestätigt, dass alle fünf Dateien den vollen Vertrag fahren:
`resolveCardVisibility` + `resolveHref` + `useShortIdResolver` + zentraler `buildCardExtras`-Helper, Bullets/Chips/Links jeweils nur sichtbar bei aktiv + Ziel.

---

## 2. R10 — Was ergänzt wurde

`FahrstuhlsteuerungPage.tsx`:

1. `useShortIdResolver()` instanziiert (Hook ergänzt).
2. Identischer `buildCardExtras(sectionKey, parentSectionKey)`-Helper wie in Signage/Akademie/Karriere eingebaut.
3. Im DB-Card-Branch des `benefits`-Blocks:
   - `const extras = buildCardExtras(sk, "benefits");`
   - Bullets-Liste (`<ul data-cms-field="bullets">`) — nur sichtbar wenn `extras.bullets.length > 0`.
   - Chips-Liste (`<ul data-cms-field="chips">`) — nur sichtbar wenn `extras.chips.length > 0`.
   - Links-Block (`<div data-cms-field="links">`) — nur sichtbar wenn `extras.links.length > 0`, Href über zentralen Resolver.
4. Fallback-Branch unverändert (kein CMS-Vertrag).
5. Layout, `cardGridClass`/`cardGridItemClass`, Icon, Title, Description unverändert.

---

## 3. Schluss der roten Batch-45-Befunde

Alle 10 in Batch 45 als **rot** klassifizierten Sonderpfade sind jetzt vertragskonform:

- R1–R4: in Batch 46 geschlossen (Anwendungen, Systemlösungen, Türsprechanlagen + Datenmigration).
- R5–R9: in der ersten Batch-47-Welle geschlossen.
- R10: in dieser Welle geschlossen.

→ **0 rote Batch-45-Sonderpfade offen.**

---

## 4. `/kontakt`-Defaults

Datenseitige Bereinigung aus Migration `20260605203244_…batch47…sql` ist idempotent und bleibt aktiv (`link_1_enabled='0'` für alle `card_v1`-Karten in R5–R10, deren `link_1_href='/kontakt'` ist).

Prüfquery (Live-DB):

```
WITH target AS (… Scope R5–R10 …)
SELECT count(*) FROM cms_section_fields f JOIN target USING(page_key,section_key)
WHERE f.field_key='link_1_enabled' AND f.value='1'
  AND EXISTS (… h.field_key='link_1_href' AND h.value='/kontakt' …);
```

**Ergebnis:** `0` aktive `/kontakt`-Defaultlinks im Batch-47-Scope.

Echte Links (z. B. PDFs, Mailto, andere Routen) bleiben unberührt — die Migration filtert ausschließlich auf exakten Wert `/kontakt`.

---

## 5. Wahrheits-Check & Build

- `node scripts/cms/wahrheits-check-ci.mjs` → **OK** („Harvester reproduzierbar, keine Drift, Body-Map vollständig, Launch-Gate erfüllt").
- Build wird vom Harness automatisch nach den Quellcode-Änderungen ausgeführt; keine TypeScript-Fehler im geänderten Code (Imports bereits in Vorwelle gesetzt, jetzt vollständig verwendet).

Keine zusätzlichen Migrationen in diesem Schritt.

---

## 6. Restpunkte

Aus Batch 46b (Baustein-Vertragsdrift global) bleiben **nur Hygiene**, keine Vertragsdrift:

- Hardcoded `/kontakt`-CTAs auf einzelnen Seiten (z. B. `AnwendungDetailPage`, `ServicePage`).
- Inline-FAQ-Renderings ohne `useMarkRendered()` in `EntryReferenzenPage` / `EntryBeratungPage` (potenzielle Doppel-Render-Symptome, kein Vertragsbruch).

Empfehlung: separater **Hygiene-Batch** außerhalb Batch 47. Nicht eskalieren, nicht in diesem Auftrag fortführen.

---

**Ende Batch 47.**
