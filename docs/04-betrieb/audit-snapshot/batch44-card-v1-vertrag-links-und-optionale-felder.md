# Batch 44 — `card_v1`-Vertrag: Links, Bullets, Chips konsistent (B-063 Fix)

Datum: 2026-06-05
Bereich: CMS-Light / Sonderpfad an Standardvertrag angleichen + Datenfix
Hinweis: Dieser Bericht trägt dieselbe Batch-Nummer wie der vorherige
Sichtbarkeits-Fix (Karten-Platzhalter). Beide Themen wurden vom
Auftraggeber unter „Batch 44" geführt. Inhalte sind unabhängig und
ergänzen sich.

## 1. Ursache (lokaler Befund B-063)

| Frage | Antwort |
|---|---|
| Betroffene Seite | `gebaeudekommunikation.snipdoo-ip` (P — Snipdoo IP) |
| Container B-063 | `anwendungen` (Typ `cards_v1`) |
| Kinder | B-1954 `anwendungen.efh`, B-1955 `anwendungen.mfh`, B-1956 `anwendungen.gewerbe` (alle `card_v1`) |
| `link_1_enabled` | `'1'` (DE+EN) — aktiv |
| `link_1_href` (vorher) | `/kontakt` (für alle drei) |
| `link_1_label` | `Mehr erfahren` / `Learn more` |
| `link_1_kind` | leer |

**Warum erschienen die Links öffentlich nicht?**

Die Seite `SnipdooIpPage.tsx` rendert den `anwendungen`-Container über
einen **handgemachten Sonderpfad** (Datei `src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx`,
Zeilen 339–378 vorher). Dieser Sonderpfad gab nur **Bild + Subtitle +
Title + Description** aus. Er las weder `link_1..3_*` noch
`bullets.*` noch `chips.*` aus der DB. Die Standard-Renderer-Pfad
`CardsSectionV1` wäre für eine `cards_v1`-Section zuständig — wurde
hier aber durch das Handlayout übersprungen.

**Einordnung:** lokaler Sonderpfad-Bug. Der globale Standardrenderer
`CardsSectionV1` und der Resolver `resolveCardVisibility` rendern
Links korrekt nach der Regel `href vorhanden && enabled !== "0"`.

## 2. Globaler `card_v1`-Vertragscheck

Geprüft:

- `resolveCardVisibility` (`src/features/cms/lib/cardVisibility.ts`,
  Zeilen 200–212): Links 1..3 = `href.length > 0 && enabled` mit
  Default `enabled=true` nur für `link_1`. Vertragstreu.
- `CardsSectionV1` (`src/features/cms/components/sections/CardsSectionV1.tsx`):
  rendert `vis.linksVisible` über `resolveHref` und `useShortIdResolver`.
  Vertragstreu.
- `ProductScrollerV1` und `CmsProductSolutionShell`: nutzen denselben
  zentralen Resolver — eine Wahrheit.
- Bullets/Chips: gleicher Resolver (`bulletsVisible`, `chipsVisible`)
  → genau eine Wahrheit, keine parallele Logik.
- Batch-43-Platzhalter (`Punkt N`, `Merkmal N`, …): bereits durch den
  vorigen Batch-44-Sichtbarkeitsfix (Toggle = `'0'` bei exaktem
  Platzhalter-Match) öffentlich unsichtbar. Quercheck-SQL: 0 leakende
  Platzhalter.

**Einzige Abweichung vom Vertrag**: der Sonderpfad in
`SnipdooIpPage.tsx`. Kein weiterer Sonderpfad im Repo, der eine
`cards_v1`/`card_v1`-Section ohne Links/Bullets/Chips rendert.

## 3. Umsetzung

### A) Sonderpfad an Standardvertrag angleichen

`SnipdooIpPage.tsx`: Die drei Karten lesen Links/Bullets/Chips jetzt
über **denselben zentralen Resolver** (`resolveCardVisibility`) und
**dieselbe Href-Auflösung** (`resolveHref`) wie der
Standardrenderer. Keine zweite Parallel-Logik. Bild/Title/Description-
Layout bleibt visuell unverändert (gleiche Struktur, gleiche Klassen).

Neu gerendert pro Karte (nur wenn vom Vertrag freigeschaltet):
- Bullets (`bullets.0..4`, canonical-first mit Legacy-Fallback)
- Chips (`chips.0..4`)
- Links 1..3 (`link_N_enabled='1'` + gültiges `link_N_href`)

### B) Falsche Linkziele korrigiert (DB-Datenfix)

Vorher: alle drei Karten zeigten `link_1_href = /kontakt` (Platzhalter).

Nachher (DE + EN, beide Locales identisch gesetzt):

| Karte | Titel | Neues `link_1_href` | Zielseite (CMS, published) |
|---|---|---|---|
| B-1954 `anwendungen.efh` | Schneller Einstieg mit geringem Aufwand (EFH) | `/anwendungen/einfamilienhaus` | `anwendungen.einfamilienhaus` |
| B-1955 `anwendungen.mfh` | Strukturiert für mehrere Einheiten (MFH) | `/anwendungen/mehrfamilienhaus` | `anwendungen.mehrfamilienhaus` |
| B-1956 `anwendungen.gewerbe` | Flexibel für komplexe Anforderungen (Gewerbe / größere Anlagen) | `/anwendungen/grossanlage` | `anwendungen.grossanlage` („Großanlage") |

Hinweis zu B-1956: Es existiert keine Seite mit exakt dem Namen
„Gewerbe / größere Anlagen". Die nächstliegende veröffentlichte CMS-
Seite ist `anwendungen.grossanlage` („Großanlage"), die thematisch
„größere Anlagen" abdeckt. Diese Zuordnung ist im Bericht markiert;
falls die Redaktion eine andere bestehende Seite bevorzugt
(`anwendungen.objektloesungen`, `anwendungen.wohnbau`), kann das Ziel
im Admin mit einem einzigen Klick umgesetzt werden.

`link_1_label` blieb wie gepflegt (`Mehr erfahren` / `Learn more`).
`link_2`/`link_3` blieben `enabled='0'` und damit öffentlich unsichtbar
(Default-Verhalten aus Batch 43 + Sichtbarkeits-Fix). Keine Inhalte
frei umgeschrieben.

`link_1_kind` wurde nicht angefasst — der Resolver braucht das Feld
nicht, um Sichtbarkeit oder Auflösung zu entscheiden.

### C) Batch-43-Platzhalter-Sichtbarkeit

Bereits im vorigen Batch-44-Lauf (Sichtbarkeitsfix für Defaults)
erledigt: 0 leakende `Punkt N` / `Merkmal N` / `Point N` / `Feature N`
in der öffentlichen Ausgabe (Quercheck-SQL = 0). Texte bleiben im
Admin als vorbereitete Defaults sichtbar.

## 4. Verifikation

| Kriterium | Status |
|---|---|
| B-063 zeigt öffentlich drei „Mehr erfahren"-Links | ✅ — Sonderpfad nutzt jetzt `resolveCardVisibility` + `resolveHref`. |
| Links führen auf die richtigen internen Seiten | ✅ — EFH/MFH/Großanlage (siehe Tabelle). |
| Admin-Link-Pillen (Batch 42) zeigen die Ziele korrekt | ✅ — Pillen lesen `link_N_href` aus derselben DB-Quelle. |
| Platzhalter-Bullets/Chips öffentlich unsichtbar | ✅ — Quercheck = 0. |
| Bestehende echte Karten/Links unverändert | ✅ — Renderer-Logik identisch zum Standardvertrag, keine Parallel-Pfade. |
| Wahrheits-Check CI | ✅ — grün. |
| Build (Renderer-Code geändert) | ✅ — TypeScript-Imports ergänzt, kein neuer Fehler. |
| Coverage / RendererPath | unverändert nötig — kein neuer Section-Typ, keine neue Route, kein neuer Renderer-Pfad. |

## 5. Konsistenz-Bestätigung `card_v1`

Ab Batch 44 gilt für **alle** Pfade, die `card_v1`-Karten rendern
(Standard + Sonderpfade):

- Link `N` sichtbar ⇔ `link_N_enabled` aktiv (Default `true` nur für
  `N=1`) **UND** `link_N_href` ergibt nach `resolveHref` ein gültiges
  Ziel.
- Bullet `N` sichtbar ⇔ Text vorhanden **UND** `bullets_N_enabled`
  nicht `'0'` (Default „an", solange Text gepflegt; Batch-44-
  Sichtbarkeitsfix hat Platzhalter explizit auf `'0'` gesetzt).
- Chip `N` sichtbar ⇔ Text vorhanden **UND** `chips_N_enabled`
  nicht `'0'`.

Eine Wahrheit: `src/features/cms/lib/cardVisibility.ts`. Alle
Renderer (Standard + Snipdoo-IP-Sonderpfad) lesen aus diesem
Resolver, keine eigene Schalterlogik.

## 6. Geänderte Artefakte

- **Code**: `src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx`
  - Imports: `resolveCardVisibility`, `resolveHref` ergänzt.
  - Renderer-Block für `anwendungen` (B-063): rendert jetzt Bullets,
    Chips und Links 1..3 über den zentralen Resolver. Bild/Title/
    Description visuell unverändert.
- **DB-Daten**: `cms_section_fields` — drei `link_1_href`-Werte (je
  DE+EN, gesamt 6 Zeilen) von `/kontakt` auf die korrekten internen
  Routen gesetzt.
- **Doku**: dieser Bericht.
- **Migrationen / RPCs**: keine.
- **Navigation, neue Section-Typen, Produkt-DB, neue Seiten**: nicht angefasst.

## 7. Scope-Bestätigung

- Keine Navigation geändert.
- Keine neuen Seiten angelegt.
- Keine Inhalte frei umgeschrieben (nur falsche Platzhalter-Href ersetzt
  durch existierende publizierte Routen).
- Keine neuen Section-Typen.
- Keine Produkt-DB-Arbeit.
- Keine Folgearbeit gestartet.
