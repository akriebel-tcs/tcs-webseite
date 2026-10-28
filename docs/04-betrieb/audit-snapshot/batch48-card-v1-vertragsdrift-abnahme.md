# Batch 48 — `card_v1`-Vertragsdrift Abschlussabnahme

**Stand:** 2026-06-05
**Status:** ✅ Abnahme grün
**Scope:** Reine Lese-/Prüfabnahme über Batch 44–47a. Keine Code- oder DB-Änderungen.

---

## 1. Drift-Abschluss (Batch 45 → 47)

| Cluster | Datei | Status |
|---|---|---|
| R1 | `AnwendungDetailPage.tsx` | ✅ Batch 46 |
| R2 | `SystemloesungenPage.tsx` | ✅ Batch 46 |
| R3 | `TuersprechanlagenPage.tsx` | ✅ Batch 46 |
| R4 | (Datenmigration `/kontakt`-Defaults R1–R4) | ✅ Batch 46 |
| R5 | `KarrierePage.tsx` | ✅ Batch 47 |
| R6 | `PressePage.tsx` | ✅ Batch 47 |
| R7 | `SignagePage.tsx` | ✅ Batch 47 |
| R8 | `AkademiePage.tsx` | ✅ Batch 47 |
| R9 | `EntrySystemPage.tsx` | ✅ Batch 47 |
| R10 | `FahrstuhlsteuerungPage.tsx` | ✅ Batch 47 (Restfix) |

**Alle 10 roten Befunde aus Batch 45 sind geschlossen.**

Gegenprüfung mit `rg "buildCardExtras|resolveCardVisibility|useShortIdResolver"` über alle in Batch 45 markierten Page-Komponenten bestätigt: jeder vormals eigene Karten-Branch verwendet jetzt den zentralen Vertrag aus `@/features/cms/contract/runtime/card_v1` (Resolver für Sichtbarkeit, Href, Kurz-IDs). Bullets, Chips und Links werden konsistent nur sichtbar bei aktiv + Ziel.

**Keine bekannten Sonderpfade mehr, die `card_v1`-Links/Bullets/Chips ignorieren.** Eigene Renderer existieren nur noch dort, wo sie strukturell nicht `card_v1` sind (z. B. Hero, FAQ, Stats) — und das ist per Batch 46b als „kein Vertragsbruch" eingestuft.

---

## 2. Link-Regel

Datenseitige Bereinigung der R1–R10-Cluster aus Batch 46/47-Migrationen (`link_1_enabled='0'` bei `link_1_href='/kontakt'` im jeweiligen Scope) ist idempotent und persistent.

- **R1–R10-Scope:** 0 aktive `/kontakt`-Defaultlinks (Live-DB-Prüfquery bestätigt, siehe Batch 46 §4 / Batch 47 §4).
- **Globaler Restbestand `link_1_href='/kontakt' AND link_1_enabled='1'`:** existiert, ist aber außerhalb des R1–R10-Drift-Scopes und entspricht **echten redaktionellen Kontakt-CTAs** (Kontakt-Sections, Service-Cards mit gewolltem Kontakt-Ziel). Diese fallen unter die Batch-45-Regel: „Wenn `/kontakt` fachlich wirklich gewollt ist, bleibt der Link aktiv." Kein Vertragsbruch.
- **Aktive echte Links mit Ziel:** werden über `resolveHref` + `useShortIdResolver` öffentlich aufgelöst (intern via `route_path`, extern via `http(s)://`/`mailto:`/`tel:`).
- **Deaktivierte Links:** `resolveCardVisibility` filtert auf `link_N_enabled='1'` UND vorhandenem Ziel — bleiben öffentlich unsichtbar.

---

## 3. Platzhalter-Regel

`resolveCardVisibility` blendet Bullets/Chips/Links ohne aktiven Toggle oder ohne Inhalt aus, **bevor** sie an den Renderer gehen. Da alle R1–R10-Pages jetzt `buildCardExtras` benutzen, gilt systemweit:

- `Punkt 1` / `Point 1` (Bullets-Defaults) erscheinen **nicht** öffentlich, solange `bullets_N_enabled != '1'`.
- `Merkmal 1` / `Feature 1` (Chips-Defaults) erscheinen **nicht** öffentlich, solange `chips_N_enabled != '1'`.
- Admin behält die Defaults als Seed (`cms_admin_editable_fields`-Whitelist + Feld-Eintrag in DB) — Redakteure können sie jederzeit aktivieren.

Keine Sonderbranch mehr, der Defaults durchschleust.

---

## 4. Admin-Link-Pillen (Batch 47a)

Stale-Pillen-Problem im Navigationsbaum gefixt:

- `MasterDetailWorkbench` propagiert `linksRefreshToken` nach jedem `onSectionFieldsMutated`.
- `SectionList` zieht Pillen über `readPageCardLinks` neu, sobald sich Token ändert.

**Geprüfte Karten:**

| Karte | Erwartetes Ziel | Pille jetzt |
|---|---|---|
| B-1954 / B-1955 / B-1956 (Snipdoo IP) | P061 / P062 / P063 | ✅ aktuell |
| B-063 (Kontakt-Default) | aktuelle Route | ✅ aktuell |
| P-077 Referenzkarten | jeweilige Referenzseite | ✅ unverändert korrekt |

`resolveCardLink` + `resolveNavNodeLink` bleiben die einzige Quelle für Pillen — Baum und Workspace stimmen überein.

---

## 5. Bausteine außerhalb `card_v1` (Batch 46b)

Zusammenfassung der globalen Baustein-Vertragsdrift-Inventur:

- **Keine echte Vertragsdrift** außerhalb `card_v1`. Hero, FAQ, CTA, Stats, RoleTabs etc. folgen ihren jeweiligen Renderer-Verträgen ohne strukturellen Drift.
- **Sekundäre Hygienepunkte (kein Vertragsbruch):**
  - Vereinzelte hardcoded `/kontakt`-CTAs in `AnwendungDetailPage`, `ServicePage` (echte Buttons, keine Karten).
  - Inline-FAQ-Renderings ohne `useMarkRendered()` in `EntryReferenzenPage` / `EntryBeratungPage` (Doppel-Render-Symptom-Risiko, kein Vertragsbruch).

Empfehlung Batch 46b unverändert: separater Hygiene-Batch außerhalb der `card_v1`-Welle, nicht eskalieren.

---

## 6. Wahrheits-Check

`node scripts/cms/wahrheits-check-ci.mjs` → **OK**
„Harvester reproduzierbar, keine Drift, Body-Map vollständig, Launch-Gate erfüllt (FAQ/CTA orphan/mixed/dedup-only = 0)."

Kein Build nötig — in diesem Batch wurden keine Quelldateien geändert.

---

## 7. Abschlussstatus

- **`card_v1`-Vertrag:** systemweit eingehalten. R1–R10 vollständig zurückgeführt auf den zentralen Resolver-/Helper-Pfad.
- **Public-Defaultlinks/Platzhalter:** keine bekannten mehr live. `/kontakt` erscheint öffentlich nur noch dort, wo es fachlich gewollt ist.
- **Admin-Pillen:** synchron mit Feldwerten.
- **Außerhalb `card_v1`:** keine Vertragsdrift, nur dokumentierte Hygienepunkte.

**Offene Restpunkte:** keine vertragsrelevanten. Hygiene-Punkte aus Batch 46b (hardcoded CTAs, FAQ-Render-Mark) bleiben als optionaler Folge-Hygiene-Batch dokumentiert.

---

## 8. Empfehlung

✅ **Normale Redaktions- und Strukturarbeit ist wieder freigegeben.** Die `card_v1`-Welle (Batch 44 → 47a) ist abgenommen. Folgearbeit kann sich auf reguläre Inhaltspflege, Navigationsfeinarbeit und optionale Hygienepunkte konzentrieren — kein weiterer Vertrags-Restfix nötig.

---

**Ende Batch 48 — Abnahme grün.**
