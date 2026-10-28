# Batch 46 — `card_v1`-Vertragsdrift: Fix der drei größten Cluster

Datum: 2026-06-05
Bereich: CMS-Light / Renderer-Angleichung + Datenkorrektur (kein neuer Section-Typ, keine Navigation, keine Produkt-DB)
Wahrheits-Check CI: ✅ grün.

## 1. Scope

Fix der **drei größten roten Cluster** aus Batch 45. Die restlichen sieben roten Sonderpfade (R5–R10) bleiben für Batch 47 dokumentiert.

| Cluster | Datei | Container(s) | Karten |
|---|---|---|---:|
| R3 | `gebaeudekommunikation/pages/SystemloesungenPage.tsx` | `vorteile`, `fachplanung` | 6 + 3 = 9 |
| R4 | `anwendungen/components/AnwendungDetailPage.tsx` → `anforderungen`-Block (T-031-Familie) | `anforderungen_item_*` über 15 Detailseiten | 73 |
| R1/R2 | `gebaeudekommunikation/pages/TuersprechanlagenPage.tsx` → `VorteileSection` + `AnwendungsumfelderSection` | `vorteile`, `anwendungsumfelder` | 4 + 3 = 7 |

Summe Karten in Batch 46: **89**.

## 2. Was wurde am Vertrag nachgezogen

Pro Cluster wurde der bisherige eigene Renderer um genau die fehlenden
Vertragsbestandteile ergänzt — alle über die zentralen Resolver, keine
Parallel-Logik:

- `resolveCardVisibility` (`@/features/cms/lib/cardVisibility`) für
  Bullets-, Chips- und Link-Sichtbarkeit.
- `resolveHref` + `useShortIdResolver`
  (`@/features/cms/lib/cardCanonical`, `@/features/cms/hooks/useShortIdResolver`)
  für Link-Ziel-Auflösung (interne Pfade, externe URLs, mailto/tel,
  Anker, Kurz-IDs `P-…` / `B-…`).

Layout/Klassen blieben in allen Renderern unverändert — die neuen
Bullets-/Chips-/Links-Blöcke erscheinen **nur**, wenn die Karte
tatsächlich freigeschaltete Inhalte hat. Wenn nichts freigeschaltet ist
(heutiger Zustand für alle 89 Karten), ändert sich am öffentlichen
Erscheinungsbild nichts.

Eine zusätzliche Korrektur in `AnwendungsumfelderSection`
(Türsprechanlagen): das statische Pseudo-`learnMore`-Label mit Pfeil
**ohne** `href` wurde durch einen echten `card_v1`-Link ersetzt
(`link_1` aus DB, nur sichtbar wenn aktiv + auflösbar). Damit
verschwindet die irreführende, nicht-klickbare „Mehr erfahren"-Optik
bis zur Redaktions-Pflege.

## 3. `/kontakt`-Default-Linkpillen — Befund + Datenentscheidung

Vor dem Renderer-Fix wurde der Datenstand pro Cluster geprüft:

| Cluster | Karten | `link_1_enabled='1'` | `link_1_href='/kontakt'` | andere `link_1_href` |
|---|---:|---:|---:|---:|
| R4 `anforderungen` | 73 | 73 | 73 | 0 |
| R3 `vorteile` | 6 | 6 | 6 | 0 |
| R3 `fachplanung` | 3 | 3 | 3 | 0 |
| R1/R2 `vorteile` | 4 | 4 | 4 | 0 |
| R1/R2 `anwendungsumfelder` | 3 | 3 | 3 | 0 |
| **Summe** | **89** | **89** | **89** | **0** |

Befund: **uniformer Batch-38-Seed-Default**, null abweichende Hrefs.
Die Karten sind inhaltlich beschreibend (Anforderungen wie
„Barrierefreiheit", „Cloud", „Orientierung"; Vorteile, Fachplanung,
Anwendungsumfelder) — der per Seed gesetzte CTA `/kontakt` ist
redaktionell nicht gewollt.

**Entscheidung gemäß Regel 1 (Default-Seed → nicht öffentlich sichtbar
machen):** alle 89 Karten bekommen `link_1_enabled='0'`. Hrefs und
Labels bleiben unverändert erhalten, sodass die Redaktion sie im Admin
sofort wieder aktivieren oder das Ziel anpassen kann.

Migration: `20260605201546_…` (idempotent, betrifft nur Kombination
`link_1_enabled='1' AND link_1_href='/kontakt'` in den drei Clustern,
DE+EN).

Verifikation nach Migration:
```
 cluster | count
---------+-------
(0 rows)
```
→ 0 Karten mit `link_1_enabled='1'` in den Zielclustern.

Offene redaktionelle Punkte (kein Renderer-/Datenfix in diesem Batch):

- `anwendungsumfelder` (efh / mfh / gewerbebau): Hier gäbe es — analog
  Batch 44 (Snipdoo IP) — naheliegende interne Ziele
  (`/anwendungen/einfamilienhaus`, `…/mehrfamilienhaus`,
  `…/grossanlage`). Bewusst **nicht automatisch** gesetzt, weil die
  Cluster-Regel „Default deaktivieren" einheitlich angewendet wurde
  und die Redaktion das Ziel im Admin per Klick aktivieren kann.

## 4. Platzhalter-Sichtbarkeit (Batch 43/44)

Quercheck-SQL `bullets.N`/`chips.N` = `Punkt N` / `Merkmal N` /
`Point N` / `Feature N` mit Toggle `'1'`: weiterhin **0** öffentlich
sichtbare Platzhalter. Die in den drei Clustern vorhandenen
Platzhalter-Bullets/Chips sind seit Batch 44 explizit auf
`enabled='0'` und erscheinen damit auch nach dem Renderer-Fix nicht
öffentlich.

## 5. Vertragskonformität nach Batch 46

| Vertragsbestandteil | R3 vorteile | R3 fachplanung | R4 anforderungen | R1 vorteile | R2 anwendungsumfelder |
|---|---|---|---|---|---|
| Eyebrow | n/a (Layout) | n/a (Layout) | n/a (Layout) | n/a (Layout) | n/a (Layout) |
| Icon | ✅ vorher schon | n/a (Layout) | ✅ vorher schon | ✅ vorher schon | n/a (Layout) |
| Bild | n/a (Layout) | n/a (Layout) | n/a (Layout) | n/a (Layout) | ✅ vorher schon |
| Title / Description | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Bullets (aktiv ⇒ sichtbar)** | ✅ neu | ✅ neu | ✅ neu | ✅ neu | ✅ neu |
| **Chips (aktiv ⇒ sichtbar)** | ✅ neu | ✅ neu | ✅ neu | ✅ neu | ✅ neu |
| **Links 1..3 (aktiv + auflösbar ⇒ sichtbar)** | ✅ neu | ✅ neu | ✅ neu | ✅ neu | ✅ neu (ersetzt Pseudo-Label) |
| Default-Toggle-Vertrag (link_1 default an, link_2/3 default aus) | ✅ | ✅ | ✅ | ✅ | ✅ |

Damit gilt für alle 89 Karten der drei Cluster die gleiche eine
Wahrheit wie für Standardrenderer (`CardsSectionV1`) und Admin-
Workspace: **aktiv + (für Links) auflösbares Ziel ⇒ öffentlich
sichtbar**.

## 6. Stichprobenprüfung

- **R4 / `anwendungen.behoerde / anforderungen_item_barrierefreiheit`**:
  Bullets `Punkt 1`/`Punkt 2` toggle `'0'` → unsichtbar. Chips
  `Merkmal 1`/`Merkmal 2` toggle `'0'` → unsichtbar.
  `link_1_enabled` jetzt `'0'` → kein `/kontakt`-Link. Icon + Label +
  Text unverändert sichtbar.
- **R3 / `gebaeudekommunikation.systemloesungen / vorteile__steuerung`**:
  Bullets/Chips alle `'0'`, `link_1_enabled='0'`. Icon + Title + Desc
  unverändert.
- **R1 / `gebaeudekommunikation.tuersprechanlagen / vorteile__qualitaet`**:
  identisch zu R3-Stichprobe.
- **R2 / `gebaeudekommunikation.tuersprechanlagen / anwendungsumfelder__einfamilienhaus`**:
  Bild + Title + Teaser unverändert. Pseudo-`learnMore`-Label entfällt
  (siehe Abschnitt 2). Sobald die Redaktion `link_1_enabled='1'` setzt
  und ein Ziel pflegt (oder das vorhandene `/kontakt` aktiviert),
  erscheint ein echter Link.

Admin-Link-Pillen aus Batch 42: lesen unverändert `link_N_enabled` und
`link_N_href` aus derselben DB-Quelle und zeigen jetzt für die 89
betroffenen Karten korrekt „Link aus" statt grauer `/kontakt`-Pille.

## 7. Restpunkte für Batch 47

Aus Batch 45 verbleibend (Rot, niedriges Volumen, gleiches Muster):

| # | Datei | Container(s) | Karten mit aktivem `link_1` |
|---|---|---|---:|
| R5 | `karriere/pages/KarrierePage.tsx` | `benefits`, `jobs` | 4 + 5 = 9 |
| R6 | `presse/pages/PressePage.tsx` | `releases` | 5 |
| R7 | `signage/pages/SignagePage.tsx` | `products` | 0 |
| R8 | `wissen/pages/AkademiePage.tsx` | `formate`, `zielgruppen`, `partner` | 0 |
| R9 | `eingangssysteme/pages/EntrySystemPage.tsx` | `pillars` | 3 |
| R10 | `zutrittskontrolle/pages/FahrstuhlsteuerungPage.tsx` | `benefits` | 0 |

Vorgehen empfohlen identisch zu Batch 46 (Resolver + Default-Deaktivierung
für `/kontakt`-Seeds, falls vorhanden).

Optional Folgearbeit (nicht in diesem Auftrag): Lint-Gate, das eigene
Page-Renderer ohne `resolveCardVisibility` flaggt — verhindert
zukünftige Drift.

## 8. Geänderte Artefakte

- **Code**:
  - `src/features/gebaeudekommunikation/pages/SystemloesungenPage.tsx`
    (Imports + `buildCardExtras`-Helper, Wiring in `vorteile` und
    `fachplanung`).
  - `src/features/gebaeudekommunikation/pages/TuersprechanlagenPage.tsx`
    (Imports, `VorteileSection`, `AnwendungsumfelderSection` —
    Pseudo-Label durch echten Link ersetzt).
  - `src/features/anwendungen/components/AnwendungDetailPage.tsx`
    (Imports, `useShortIdResolver`, `resolveCardVisibility` + `resolveHref`
    pro `anforderungen_item_*`-Karte).
- **DB-Daten / Migration**: `supabase/migrations/20260605201546_*.sql`
  — setzt `link_1_enabled='0'` für 89 Karten in 3 Clustern, idempotent.
- **Doku**: dieser Bericht.
- **Renderer-Coverage / RendererPath**: unverändert nötig (keine neuen
  Section-Typen, keine neuen Routen, keine neuen Renderer-Pfade — nur
  Vertragsangleichung in bestehenden Pfaden).

## 9. Scope-Bestätigung

- Keine Navigation geändert.
- Keine neuen Seiten / Routen / Section-Typen.
- Keine Produkt-DB-Arbeit.
- Keine i18n-JSON-Änderung.
- Keine flächige Veröffentlichung.
- Keine neuen Schreib-RPCs.
- `/admin` isoliert.
- Wahrheits-Check CI: ✅ grün.
- Build: Code geändert → wird vom Harness automatisch geprüft.
- Folgearbeit (Batch 47, Lint-Gate) bewusst nicht gestartet.
