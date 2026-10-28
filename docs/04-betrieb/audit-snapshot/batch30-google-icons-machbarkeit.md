# Batch 30 — Machbarkeitsstudie: Lucide Icons → Google Material Symbols

Stand: 2026-06-05 · Status: **Prüfbericht (read-only)** · Kein Code,
keine DB, keine Pakete, keine Icon-Werte geändert.

Geprüfte Quellen:

- `src/features/cms/components/iconResolver.tsx` (51 Z.)
- `src/features/admin/components/IconPickerDialog.tsx`
- `src/features/admin/components/EditableField.tsx`
- `src/features/admin/components/BildkartenCardWorkspace.tsx`
- Renderer mit Icons: `CardsSectionV1`, `FeatureGridV1`,
  `ProductShowcaseListV1`, `CmsProductSolutionShell`
- `src/features/cms/contract/sectionTypes.ts` (Feld-Vertrag „icon")
- `package.json` (Lucide-Importe)
- Live-DB-Abfragen auf `cms_section_fields` und `cms_assets`
- Doku-Treffer für „lucide" in `docs/` und `docs/archiv/`

---

## 1 — Ist der Wechsel sinnvoll?

**Kurzantwort: technisch machbar, im aktuellen Freeze-Stand aber nicht
sinnvoll.**

Gründe:

- CMS-Kern ist seit Batch 25 freeze-reif (Wahrheits-Check / Coverage /
  Spiegel-Audit / FAQ-CTA / Public-Blocks alle 0). Ein Icon-System-Wechsel
  berührt Renderer, Resolver, Admin-Picker und alle Karten-Sections —
  das ist ein Cross-Cutting-Change, der den Freeze bricht.
- Lucide funktioniert: 1.541 Icons im Picker, DE-Synonymsuche eingebaut,
  Resolver akzeptiert kebab/camel/Pascal, harter Fallback `CheckCircle2`
  verhindert Render-Errors.
- Material Symbols bietet ~3.000 Icons und eine variable Font — das ist
  kein brennendes Problem, sondern eine optische Designentscheidung.
- DB enthält bereits 1.166 Datensätze mit `field_key='icon'` und
  **106 verschiedenen Icon-Werten** (Live-Stand). Jeder muss bei einem
  Wechsel migriert werden — ohne Mapping landen alle auf dem Fallback
  `CheckCircle2`.

---

## 2 — Welche Dateien wären betroffen?

### 2.1 CMS-Kern (dynamische Icon-Auflösung — Pflicht-Umbau)

| Datei | Rolle | Umbau |
|---|---|---|
| `src/features/cms/components/iconResolver.tsx` | String → React-Komponente | komplett ersetzen |
| `src/features/admin/components/IconPickerDialog.tsx` | Picker mit 1.541 Lucide-Icons | komplette Quelle ersetzen |
| `src/features/admin/components/EditableField.tsx` | Editor-UI für `icon`-Felder | Render-Site anpassen |
| `src/features/admin/components/BildkartenCardWorkspace.tsx` | Karten-Workspace mit `import * as LucideIcons` | Resolver-Aufruf umstellen |
| `src/features/cms/contract/sectionTypes.ts` (Z. 368) | Feldlabel „Lucide-Iconname" | Text aktualisieren |

### 2.2 Renderer (Public-Sichtbarkeit)

| Datei | Was wird gerendert |
|---|---|
| `CardsSectionV1.tsx` | Karten-Icons (`icon`-String, Priorität 3 nach `image`/`icon_image`) |
| `FeatureGridV1.tsx` | Iconkarten-Grid (reine Icon-Karten) |
| `ProductShowcaseListV1.tsx` | Produktteaser mit Icons |
| `CmsProductSolutionShell` | Lösungsseiten-Icons |

### 2.3 Statische Lucide-JSX-Imports (≈ 95 % aller Lucide-Nutzung)

Ca. **95 Dateien**, davon:

- `features/anwendungen` — 22 Dateien (Persona-/Anwendungsseiten)
- `features/admin` — 21 Dateien (Admin-Shell, Buttons, Toolbars,
  Hilfe-Drawer)
- `features/service` — 14 Dateien
- `features/zutrittskontrolle` — 7 Dateien
- `features/cms` — 6 Dateien (Renderer + Resolver)
- weitere ≈ 12 Dateien (legal, kontakt, presse, karriere, wissen, components)

> `components/ui/*` (shadcn) verwendet Lucide intern — diese 18 Dateien
> bleiben so oder so bestehen, weil shadcn-Komponenten Lucide hartcodiert
> verwenden. Lucide ist also in keinem Szenario komplett entfernbar.

### 2.4 Doku

Aktive Doku-Treffer „lucide":

- `docs/migration-log.md`
- `docs/04-betrieb/audit-snapshot/batch22-service-hub-pilot-abnahme.md`

Archiv-Treffer (Historie, nicht aktiv) — keine Aktion nötig:

- `docs/archiv/audit-historisch/*` (mehrere, `icon_lucide` /
  `icon_card_lucide`)
- `docs/archiv/redaktion-historisch/bildkarten-blueprint-audit.md`
- `docs/archiv/sprint-berichte/sprint-2l-eine-wahrheit-bericht.md`

---

## 3 — Welche DB-Werte wären betroffen?

Live-Abfrage `cms_section_fields` (2026-06-05):

| Feld-Konvention | Datensätze | distinct Werte |
|---|---|---|
| `icon` (kanonisch) | **1.166** | **106** |
| `icon_enabled` (Toggle „0"/„1") | 1.244 | 3 |
| `*.icon` (Legacy-Sub-Keys, z. B. `zutritt.icon`) | ca. 220 | je 1–2 |
| `*.iconLabel` (Modul-/Persona-Labels) | ca. 12 | je 2 |

`cms_assets.field_key='icon_image'` ist ein **separater Bild-Slot**
(Storage-URL, keine Icon-Bibliothek) und wird vom Wechsel **nicht
berührt**. Renderer-Priorität bleibt: `image → icon_image → icon`.

### 3.1 Beispiele (Top-20 nach Häufigkeit)

```
142  check-circle-2          16  GraduationCap        12  shield
 74  ShieldCheck             16  key-round            10  settings
 50  shield-check            14  HeartPulse           10  phone
 20  layers                  14  users                 8  shopping-cart
 18  monitor                 14  Building2             8  palette
 18  smartphone              14  accessibility         8  file-text
 16  video                   14  Home                  8  user-cog
 16  wrench                  12  network               6  fence
```

### 3.2 Wichtiger Befund: gemischte Schreibweisen in der DB

Dieselben Lucide-Icons liegen in **drei Schreibweisen** parallel vor:

- kebab-case (Picker-Standard): `shield-check` (50×), `check-circle-2`
  (142×)
- PascalCase (Legacy-Seedings): `ShieldCheck` (74×), `Building2` (14×),
  `HeartPulse` (14×)
- lowercase Einzelwort: `monitor`, `smartphone`, `eye`, `shield`

Der `iconResolver` löst aktuell alle drei auf — das ist robust, macht
aber eine spätere Mapping-Tabelle Lucide→Material aufwendiger
(106 Quellnamen statt z. B. ~70 kanonischer Namen).

### 3.3 Toggle „icon_enabled"

`icon_enabled` ist ein reiner String-Toggle („0"/„1"/leer) und Lucide-
unabhängig. Bleibt bei jedem Migrationspfad unverändert.

---

## 4 — Brauchen wir Mapping Lucide → Material?

**Ja, zwingend.** Die Namensräume sind nicht deckungsgleich:

| Lucide-Wert (DB) | Material Symbol (Beispiel) |
|---|---|
| `shield-check` / `ShieldCheck` | `verified_user` / `security` |
| `building-2` / `Building2` | `apartment` |
| `briefcase` | `work` |
| `check-circle-2` | `task_alt` / `check_circle` |
| `eye` | `visibility` |
| `users` | `group` |
| `map-pin` | `location_on` |
| `bell` | `notifications` |
| `book-open` | `menu_book` |
| `key-round` | `key` |
| `heart-pulse` / `HeartPulse` | `monitor_heart` |
| `smartphone` / `monitor` / `cloud` / `home` | gleichnamig vorhanden |

Abdeckungsschätzung: **~100 % der 106 distinct Werte haben ein
sinnvolles Material-Äquivalent**, aber kein einziger Name ist 1:1
identisch in Konvention (Material verwendet `snake_case`,
Lucide `kebab-case` oder `PascalCase`).

Mapping-Tabelle muss **manuell** gepflegt werden — eine deterministische
Konvertierung ist nicht möglich.

---

## 5 — Empfohlene Migrationswege

### Variante A — Material Symbols als variabler Font (CSS-Class)

Konzept: Google-Font `Material Symbols Outlined` laden, Icon-Name als
String in `<span class="material-symbols-outlined">verified_user</span>`.

- **Vorteile:** Ein Font, ~3.000 Icons, kein JS-Bundle-Overhead, DSGVO-
  fähig (self-hostbar), `FILL`/`weight`/`grade`/`opsz` per CSS-Variable.
- **Nachteile:** Typ-Bruch (kein React-Component-API mehr), Render-Sites
  müssen alle umgebaut werden, FOUT-Risiko (CI `validate-no-fout.mjs`
  greift bereits), `strokeWidth`-Prop entfällt, kein TypeScript-Lookup
  für Iconnamen.

### Variante B — npm-Paket mit React-Komponenten

Kandidaten: `@material-symbols/svg-*`, `material-symbols-react`,
`react-material-symbols`. Reifegrad und Bundle-Größe **nicht in dieser
Session verifiziert** — vor einer Umsetzung Pflicht-Recherche.

- **Vorteile:** API bleibt nahe an Lucide (`<Icon className="h-5 w-5"/>`),
  tree-shakeable, TypeScript-Support, Render-Sites bleiben weitgehend
  unverändert, `iconResolver` ändert „nur" Map und Normalisierung.
- **Nachteile:** Bundle-Größe ähnlich Lucide, Maintenance-Risiko je
  nach Paket, Material verwendet intern `snake_case` — `IconPickerDialog`
  braucht eigene Liste, Mapping-Tabelle für Bestandsdaten weiterhin
  Pflicht.

### Variante C — Dual-Betrieb (Lucide-Fallback + Material-Neuwerte)

Konzept: Resolver erkennt Präfix (`material:verified_user` vs.
Roh-String), neue Inhalte verwenden Material, Altinhalte bleiben Lucide,
bis re-seeded.

- **Vorteile:** Schrittweise Migration, keine sofortige DB-Migration
  von 1.166 Datensätzen, keine kaputten Bestands-Karten.
- **Nachteile:** Zwei Icon-Bibliotheken dauerhaft im Bundle, Picker
  muss zwei Namensräume anbieten, Doku/Glossar wird komplizierter,
  technische Schuld bleibt bis zur vollständigen Bereinigung.

### Hard-Switch (NICHT empfohlen)

Bei direktem Austausch ohne Mapping:

- 1.166 DB-Datensätze rendern den hartcodierten Fallback `CheckCircle2`
  bzw. dessen Material-Pendant — visuell falsch, aber kein Error.
- Picker zeigt Material-Liste, aber Bestandswerte sehen falsch aus.
- Public-Render auf jeder Karte mit `icon`-Wert ist betroffen.

### Empfehlung (falls Wechsel beauftragt wird)

**Variante B** (npm-Paket mit React-Komponenten) als saubersten Weg,
weil Render-Sites weitgehend unverändert bleiben und Variante C
nur als Übergangs-Strategie mit klarem Ausstiegsdatum sinnvoll wäre.

Reihenfolge in einem späteren Batch:

1. Paket-Recherche (Maintenance, Tree-shaking, Lizenz).
2. Mapping-Tabelle Lucide-DB-Werte → Material-Namen (106 Werte).
3. `iconResolver` umbauen (mit Fallback auf Lucide für Übergangsphase).
4. `IconPickerDialog` umstellen, neue Icon-Liste, DE-Synonyme neu
   aufbauen.
5. DB-Migration: kontrollierter Bulk-Update auf neue Namen
   (idempotent, mit Backup).
6. Lucide aus dynamischer CMS-Auflösung entfernen, statische Imports
   in `features/anwendungen` etc. **separater Batch** (oder bewusst
   lassen — Lucide bleibt sowieso durch shadcn im Bundle).

---

## 6 — Risiko für Public-Render

| Risiko | Bewertung |
|---|---|
| Karten ohne `icon_image`, nur mit `icon`-String | hoch — 1.166 Datensätze betroffen |
| Karten mit `icon_image`-Bildslot | kein Risiko — Bild gewinnt Priorität |
| Hero / Content / Teaser-Blöcke | kein Risiko — kein dynamischer Icon-Slot |
| Service-Hub-Karten, Persona-Übersichten | mittel — viele `feature_grid_v1` |
| Fallback bei unbekanntem Wert | bricht nicht (rendert `CheckCircle2`), aber inhaltlich falsch |
| shadcn-UI-Icons | nicht betroffen (statische Lucide-Imports) |
| FOUT bei Font-Variante (A) | mittel — bestehender CI-Check `validate-no-fout.mjs` müsste angepasst werden |

**Schlimmster Fall ohne Mapping:** 1.166 Karten zeigen denselben
Fallback-Icon (`CheckCircle2`/`task_alt`). Kein Crash, aber Marketing-
sichtbar.

---

## 7 — Empfehlung

**→ Nicht jetzt umsetzen. Eigener Folgeauftrag erforderlich, wenn
Designentscheidung getroffen ist.**

Begründung:

1. **Freeze-Schutz.** Der CMS-Kern ist seit Batch 25 grün. Ein Icon-
   System-Wechsel berührt Resolver, Picker, alle Karten-Renderer und
   1.166 DB-Datensätze. Das ist kein Hygiene-Batch, sondern ein
   eigenständiges Folgeprojekt.
2. **Kein zwingender Vorteil.** Lucide funktioniert, ist gepflegt
   (v0.462), liefert 1.541 Icons und ist über shadcn ohnehin
   dauerhaft im Bundle. Material Symbols ist eine optische/CI-
   Designentscheidung, kein technischer Zwang.
3. **DB-Migration zwingend.** 106 distinct Werte in drei
   Schreibweisen müssen manuell gemappt werden — sonst rendert die
   gesamte Website denselben Fallback-Icon.
4. **Bessere Reihenfolge:** Erst die im
   `docs/04-betrieb/naechste-schritte.md` priorisierten Post-Freeze-
   Folgeprojekte (Login/Auth, Klasse-A-Pages, Admin-UX-Politur,
   Inhalts-Audit) abschließen, danach — falls Marketing/Brand-Design
   den Wechsel wirklich fordert — als eigener Batch
   „Icon-System-Migration" mit klarem Scope und eigener Abnahme.

### Falls später beauftragt — Mindest-Scope für den Folgebatch

- Designentscheidung: welcher Material-Stil (Outlined, Rounded, Sharp)
  und welche Variante (A Font / B Paket / C Dual).
- Vollständige Mapping-Tabelle 106 Lucide-Werte → Material-Namen,
  redaktionell abgenommen.
- Idempotente DB-Migration auf `cms_section_fields` (Backup pflicht).
- Picker-Umbau inkl. DE-Synonymsuche neu aufgebaut.
- CI-Anpassung `validate-no-fout.mjs` (falls Variante A).
- Wahrheits-Check + Preview-Stichprobe nach Migration.

---

## 8 — Stopp

Dieser Batch endet hier. Keine Codeänderung, keine DB-Migration,
keine neuen Packages, keine Icon-Werte geändert. Folgeauftrag wird
nur auf ausdrückliche Anweisung mit Mindest-Scope (Abschnitt 7)
gestartet.
