# i18n-Inventar – Anwendungen

> Stand: nach Etappe 19c-0 (Inventar erstellt, noch keine Textmigration).
> Verwandte Dokumente: [`../01-strategy/i18n-strategy.md`](../01-strategy/i18n-strategy.md), [`../02-architecture/code-landkarte.md`](../02-architecture/code-landkarte.md), [`../migration-log.md`](../migration-log.md), [`../current-status.md`](../current-status.md).

---

## 1. Zweck

- Dieses Dokument ist ein **vorbereitendes Inventar** für die spätere i18n-Migration der Domain `anwendungen`.
- Es **migriert noch keine Texte** und ändert weder TSX- noch Locale-Dateien.
- Es dient als Grundlage für die nachfolgenden Etappen `19c-1`, `19c-2`, … bis `19c-final-check`.
- Vorgehen orientiert sich an den abgeschlossenen Domains `gebaeudekommunikation`, `zutrittskontrolle`, `gebaeudemanagement` und zuletzt `eingangssysteme`.

---

## 2. Technischer Status

| Aspekt | Status |
|---|---|
| Namespace `anwendungen` in `src/i18n/index.ts` registriert | ✅ ja (über bestehende I18N_NAMESPACES, JSON-Dateien existieren) |
| DE-Locale-Datei vorhanden | ✅ `src/i18n/locales/de/anwendungen.json` |
| EN-Locale-Datei vorhanden | ✅ `src/i18n/locales/en/anwendungen.json` |
| DE/EN strukturgleich | ✅ ja (beide enthalten ausschließlich `_meta`) |
| Vorhandene Root-Keys | nur `_meta` (Felder: `namespace`, `status`, `note`) |
| Status der Locale-Dateien | **vorbereitet** – `_meta.status = "prepared"`, keine echten Seitentexte |
| Routen-Registrierung | `src/features/anwendungen/routes.tsx` mit 25 aktiven Routen + 2 Legacy-Fallbacks |
| Bestehende `useTranslation`-Aufrufe in der Domain | ❌ **keine** (alle Texte bislang hart in TSX) |
| Bestehende `strictPages`-Einträge | keine (für `anwendungen` noch nichts gelistet) |

---

## 3. Routen-Übersicht

Quelle: `src/features/anwendungen/routes.tsx`.

### 3.1 Aktive Routen (rendern eine eigene Page)

| # | Route | Page (TSX) |
|---|---|---|
| 1 | `/anwendungen` | `AnwendungenPage.tsx` |
| 2 | `/anwendungen/objektloesungen` | `ObjektloesungenPage.tsx` |
| 3 | `/anwendungen/bildungseinrichtungen` | `BildungseinrichtungenPage.tsx` |
| 4 | `/anwendungen/einfamilienhaus` | `EinfamilienhausPage.tsx` |
| 5 | `/anwendungen/mehrfamilienhaus` | `MehrfamilienhausPage.tsx` |
| 6 | `/anwendungen/grossanlage` | `GrossanlagePage.tsx` |
| 7 | `/anwendungen/sanierung` | `SanierungPage.tsx` |
| 8 | `/anwendungen/pflege` | `PflegePage.tsx` |
| 9 | `/anwendungen/klinik` | `KlinikPage.tsx` |
| 10 | `/anwendungen/behoerde` | `BehoerdePage.tsx` |
| 11 | `/anwendungen/feuerwehr` | `FeuerwehrPage.tsx` |
| 12 | `/anwendungen/schwimmbad` | `SchwimmbadPage.tsx` |
| 13 | `/anwendungen/concierge` | `ConciergePage.tsx` |
| 14 | `/anwendungen/interne-kommunikation` | `InterneKommunikationPage.tsx` |
| 15 | `/anwendungen/digitale-namensverwaltung` | `DigitaleNamensverwaltungPage.tsx` |
| 16 | `/anwendungen/feuerwehrdurchsage` | `FeuerwehrdurchsagePage.tsx` |
| 17 | `/anwendungen/bidirektionale-video` | `BidirektionaleVideoPage.tsx` |
| 18 | `/anwendungen/mobile-tuerkommunikation` | `MobileTuerkommunikationPage.tsx` |
| 19 | `/anwendungen/zutrittskontrolle-bcm` | `ZutrittskontrolleBCMPage.tsx` |
| 20 | `/anwendungen/wohnbau` | `WohnbauPage.tsx` |
| 21 | `/anwendungen/gesundheitseinrichtungen` | `GesundheitseinrichtungenPage.tsx` |
| 22 | `/anwendungen/oeffentliche-hand` | `OeffentlicheHandPage.tsx` |
| 23 | `/anwendungen/referenzprojekte` | `ReferenzprojektePage.tsx` |
| 24 | `/anwendungen/referenzprojekte/:slug` | `ReferenzprojektDetailPage.tsx` |

### 3.2 Legacy-Fallbacks (nicht aktiv verlinken)

| Route | Page (TSX) | Hinweis |
|---|---|---|
| `/objektloesungen` | `ObjektloesungenPage.tsx` | Etappe 14e-7-Fallback |
| `/bildungseinrichtungen` | `BildungseinrichtungenPage.tsx` | Etappe 14e-6-Fallback |

### 3.3 Indirekt domain-relevant (nicht Page, aber von Pages konsumiert)

| Datei | Funktion |
|---|---|
| `src/features/anwendungen/components/AnwendungDetailPage.tsx` | gemeinsames Detail-Layout für 13 Detail-Seiten (siehe Klasse B unten) |
| `src/features/anwendungen/data/referenzprojekte.ts` | Datenquelle für `ReferenzprojektePage` und `ReferenzprojektDetailPage` (6 Projekte mit umfangreichen Texten) |

---

## 4. Klassifizierung der Seiten nach Aufbau

Die Domain enthält **24 Page-Komponenten** + 1 Shared-Detail-Layout + 1 Datendatei. Es lassen sich drei Hauptmuster erkennen:

### Klasse A – Root- und Übersichts-Seiten (vollständig in TSX)

Eigene große TSX-Dateien mit lokalen `categories`/`cards`-Konstanten und mehrteiligem Layout.

| Page | Datei | Zeilen | Komplexität | Besonderheiten |
|---|---|---|---|---|
| Root | `AnwendungenPage.tsx` | 444 | **sehr hoch** | 5 Kategorien × bis zu 5 Karten + 5 Systemfunktionen + 6 Referenz-Teaser; eigene `SolutionCardComponent`; sehr viel Marketing-Text |
| Wohnbau | `WohnbauPage.tsx` | 112 | mittel | 4 Karten (EFH/MFH/Großanlage/Sanierung) |
| Gesundheitseinrichtungen | `GesundheitseinrichtungenPage.tsx` | 95 | niedrig–mittel | 2 Karten (Pflege/Klinik) |
| Öffentliche Hand | `OeffentlicheHandPage.tsx` | 103 | mittel | 3 Karten (Behörde/Feuerwehr/Schwimmbad) |
| Bildungseinrichtungen | `BildungseinrichtungenPage.tsx` | 219 | hoch | 3 Einrichtungen (Kita/Schule/Wohnheim) je mit Anforderungen + Leistungen + PDF-Broschüre, **eigenes Layout** (nicht über `AnwendungDetailPage`) |
| Objektlösungen | `ObjektloesungenPage.tsx` | 104 | mittel | 8 Solution-Karten (Kita/Schule/Wohnheim/Pflege/Medizin/Behörden/Feuerwehr/Schwimmbad), eigene Karten-Sektion |

### Klasse B – Detail-Seiten via `AnwendungDetailPage`

13 Seiten teilen sich ein gemeinsames Layout-Shell (`AnwendungDetailPage`) und liefern reine Daten-Objekte (`AnwendungPageData`) mit `label`, `headline`, `intro`, `description`, `anforderungen[]`, `leistungen[]`, optional `systembausteine[]`, `broschure`, `verwandteAnwendungen[]`.

| Page | Datei | Zeilen |
|---|---|---|
| Einfamilienhaus | `EinfamilienhausPage.tsx` | 57 |
| Mehrfamilienhaus | `MehrfamilienhausPage.tsx` | 59 |
| Großanlage | `GrossanlagePage.tsx` | 57 |
| Sanierung | `SanierungPage.tsx` | 52 |
| Pflege | `PflegePage.tsx` | 62 |
| Klinik | `KlinikPage.tsx` | 62 |
| Behörde | `BehoerdePage.tsx` | 63 |
| Feuerwehr | `FeuerwehrPage.tsx` | 64 |
| Schwimmbad | `SchwimmbadPage.tsx` | 63 |
| Concierge | `ConciergePage.tsx` | 62 |
| Interne Kommunikation | `InterneKommunikationPage.tsx` | 63 |
| Digitale Namensverwaltung | `DigitaleNamensverwaltungPage.tsx` | 63 |
| Feuerwehrdurchsage | `FeuerwehrdurchsagePage.tsx` | 62 |
| Bidirektionale Video | `BidirektionaleVideoPage.tsx` | 62 |
| Mobile Türkommunikation | `MobileTuerkommunikationPage.tsx` | 57 |
| Zutrittskontrolle BCM | `ZutrittskontrolleBCMPage.tsx` | 61 |

> Hinweis: Damit sind effektiv **16 Detail-Seiten** im selben Datenformat vorhanden (Tabelle gekürzt – alle nutzen `AnwendungDetailPage`).

Zentrales Shell:
- `src/features/anwendungen/components/AnwendungDetailPage.tsx` (209 Zeilen)
  - rendert: `description`, „Anforderungen“-Block, „Systemleistungen“-Block, optional „Systembausteine“, fester „Passende Werkzeuge“-Block (4 Tools, hart in TSX), optional Broschüre, optional „Verwandte Anwendungen“, fester CTA-Block „Projekt konkretisieren?“ → `/kontakt`.
  - **Wichtig:** Auch in dieser Shell-Komponente sind sichtbare Strings hart codiert (z.B. „Anforderungen“, „Systemleistungen“, „Systembausteine“, „Passende Werkzeuge“, „Verwandte Anwendungen“, „Öffnen“, „Projekt konkretisieren?“, „Kontakt aufnehmen“, „Typische Anforderungen für …“, Tool-Labels „Konfigurator“ / „tcsplan“ / „Ausschreibungstexte“ / „Technische Beratung“).

### Klasse C – Referenzprojekte

| Page | Datei | Zeilen | Besonderheit |
|---|---|---|---|
| Referenzprojekte (Liste) | `ReferenzprojektePage.tsx` | 70 | Liest aus `data/referenzprojekte.ts` |
| Referenzprojekt-Detail | `ReferenzprojektDetailPage.tsx` | 137 | Slug-basiert, Carousel, Sidebar mit Projektdaten + Systeme + CTA |
| Daten | `data/referenzprojekte.ts` | 281 | 6 Projekte je mit `title`, `type`, `location`, `year`, `units`, `description`, `longDescription[]` (Mehrabsatz), `highlights[]`, `systems[]`, `images[]`, `heroImage` |

---

## 5. i18n-Status pro Seite (kurz)

Alle Seiten der Domain sind **noch nicht** i18n-angeschlossen. Kein einziger `useTranslation`-Aufruf in `src/features/anwendungen/`.

| Page | `useTranslation`? | Sichtbare harte deutsche Texte? | Klasse |
|---|---|---|---|
| `AnwendungenPage` | ❌ | viel | A |
| `ObjektloesungenPage` | ❌ | mittel | A |
| `BildungseinrichtungenPage` | ❌ | viel | A |
| `WohnbauPage` | ❌ | mittel | A |
| `GesundheitseinrichtungenPage` | ❌ | mittel | A |
| `OeffentlicheHandPage` | ❌ | mittel | A |
| 16 Detail-Seiten (Klasse B) | ❌ | mittel je Seite, gleiches Schema | B |
| `AnwendungDetailPage` (Shell) | ❌ | ja (Strukturlabels + Tool-Block + CTA) | B-Shell |
| `ReferenzprojektePage` | ❌ | mittel | C |
| `ReferenzprojektDetailPage` | ❌ | mittel + Daten | C |
| `data/referenzprojekte.ts` | n/a | ja (Inhalt = Texte) | C-Daten |

---

## 6. Empfohlene Migrationsreihenfolge

Die Domain ist **die größte verbliebene** im Projekt. Sinnvoll ist eine geordnete Aufteilung in Schritte mit jeweils klarer Verantwortung. Vorschlag:

| Etappe | Inhalt | Begründung |
|---|---|---|
| `19c-0` | **Inventar (dieses Dokument)** | Grundlage schaffen, kein Code |
| `19c-1` | `AnwendungDetailPage.tsx` (Shell) auf i18n umstellen, gemeinsame Struktur-Labels + Tool-Block + CTA-Block in `anwendungen.shared.*` ablegen | Shell zuerst, weil 16 Detail-Seiten davon profitieren. Nach `19c-1` sind die Detail-Seiten sichtbar bereits konsistenter. |
| `19c-2` | Detail-Seiten Klasse B (Datenobjekte) – **Tranche 1: Wohnen**: `Einfamilienhaus`, `Mehrfamilienhaus`, `Grossanlage`, `Sanierung` (4 Seiten) | Klares fachliches Cluster, gleiche Datenstruktur. |
| `19c-3` | Detail-Seiten Klasse B – **Tranche 2: Gesundheit + öffentlich**: `Pflege`, `Klinik`, `Behoerde`, `Feuerwehr`, `Schwimmbad` (5 Seiten) | Cluster „Spezialgebäude“. |
| `19c-4` | Detail-Seiten Klasse B – **Tranche 3: System-/Funktions-Anwendungen**: `Concierge`, `InterneKommunikation`, `DigitaleNamensverwaltung`, `Feuerwehrdurchsage`, `BidirektionaleVideo`, `MobileTuerkommunikation`, `ZutrittskontrolleBCM` (7 Seiten) | Querschnittsfunktionen. |
| `19c-5` | Übersichts-Seiten Klasse A klein/mittel: `WohnbauPage`, `GesundheitseinrichtungenPage`, `OeffentlicheHandPage`, `ObjektloesungenPage` (4 Seiten) | Ähnlicher Karten-/Cluster-Aufbau. |
| `19c-6` | `BildungseinrichtungenPage` (eigenes Großlayout, 3 Einrichtungen × Anforderungen/Leistungen/Broschüre) | Größere Einzeletappe wegen Eigenstruktur. |
| `19c-7` | Referenzen: `ReferenzprojektePage` + `ReferenzprojektDetailPage` + Texte aus `data/referenzprojekte.ts` (6 Projekte) | Datendatei + 2 Seiten als Block, viele Mehrabsatz-Texte. |
| `19c-8` | Root: `AnwendungenPage.tsx` (5 Kategorien, 5 Systemfunktionen, 6 Referenz-Teaser) | Größte Einzelseite – am Ende, da viele Texte mit den Detail-Seiten überlappen und dann konsolidiert wiederverwendet werden können. |
| `19c-final-check` | Domain-Final-Check analog `19b-final-check` | Verifizieren: alle Seiten in `strictPages`, DE/EN strukturgleich, `_meta.status = "migrated"`. |

> Tranchenbildung der Detail-Seiten ist bewusst klein gehalten (4–7 Seiten pro Etappe), damit jede Etappe in einer Sitzung vollständig + final-check-fähig bleibt.

### Erste konkrete Unteretappe

**`19c-1` – `AnwendungDetailPage.tsx` (Shell) i18n-anschließen.**
- Datei: `src/features/anwendungen/components/AnwendungDetailPage.tsx`
- Neue Keys (Vorschlag, im Namespace `anwendungen` unter `shared.*`):
  - `shared.sections.anforderungen`, `shared.sections.systemleistungen`, `shared.sections.systembausteine`, `shared.sections.werkzeuge`, `shared.sections.verwandteAnwendungen`
  - `shared.subtitles.anforderungenForHeadline` (mit `{{headline}}`)
  - `shared.subtitles.systembausteine`, `shared.subtitles.werkzeuge`
  - `shared.tools.konfigurator.{label,desc}`, `shared.tools.tcsplan.{label,desc}`, `shared.tools.ausschreibungstexte.{label,desc}`, `shared.tools.beratung.{label,desc}`
  - `shared.actions.open`, `shared.cta.projektTitle`, `shared.cta.projektText`, `shared.cta.kontaktAufnehmen`
- Vorteil: Nach `19c-1` sind die 16 Detail-Seiten visuell und semantisch konsistent vorbereitet, jede einzelne Datenmigration in `19c-2`/`19c-3`/`19c-4` betrifft dann nur noch das jeweilige Daten-Objekt.

---

## 7. Kandidaten für `strictPages`

Spätestens am Ende der Domain sollen alle 24 Page-Komponenten in `strictPages` (`scripts/i18n/i18n-check.config.json`) registriert sein. Frühzeitig aufnehmbar (sobald migriert):

- `src/features/anwendungen/pages/AnwendungenPage.tsx`
- `src/features/anwendungen/pages/ObjektloesungenPage.tsx`
- `src/features/anwendungen/pages/BildungseinrichtungenPage.tsx`
- `src/features/anwendungen/pages/WohnbauPage.tsx`
- `src/features/anwendungen/pages/GesundheitseinrichtungenPage.tsx`
- `src/features/anwendungen/pages/OeffentlicheHandPage.tsx`
- alle 16 Detail-Seiten (Klasse B)
- `src/features/anwendungen/pages/ReferenzprojektePage.tsx`
- `src/features/anwendungen/pages/ReferenzprojektDetailPage.tsx`

> `AnwendungDetailPage.tsx` (Shell) ist eine **Komponente**, keine Page – nicht in `strictPages` aufnehmen, sondern indirekt über die Detail-Seiten geprüft.

---

## 8. Risiken & Hinweise

- **Datendatei `referenzprojekte.ts`:** enthält Eigennamen (PULSE, Weidt Park Corner, Fritztower, Haupttelegraphenamt, Spichern 2, Thulestraße) und Standorte – diese bleiben sprachneutral. Übersetzt werden müssen `description`, `longDescription[]`, `highlights[]`, `systems[]`, `type`, `units`. Konvention wie in `eingangssysteme/referenzen`: Eigennamen unverändert, Beschreibungen via i18n.
- **Externe Bild-URLs (`tcsag.de/fileadmin/_processed_/...`)** und **PDF-Broschüren-URLs** bleiben unverändert (gleicher Vertrag wie in `gebaeudemanagement` und `eingangssysteme`).
- **Lucide-Icons** sind keine i18n-Inhalte und bleiben unverändert.
- **Tag-Listen** in `AnwendungenPage.tsx` (z.B. „Audio/Video“, „App“, „Einzelsystem“) sind sichtbarer redaktioneller Text und müssen i18n-geführt werden.
- **Shared-Reuse mit `eingangssysteme.shared.*`:** **nicht** projektübergreifend wiederverwenden. Für `anwendungen` einen eigenen `shared.*`-Block im Namespace `anwendungen` anlegen (Konvention der bisherigen Domains).
- **`AnwendungenPage.tsx` (444 Zeilen)** hat sehr viele duplizierte Texte mit den Detail-Seiten (z.B. EFH-Beschreibung steht sowohl im Root als auch in `EinfamilienhausPage`). Beim Migrieren NICHT automatisch vereinheitlichen; eigenständige Kurzbeschreibungen erhalten (analog zu `EntrySystemPage`-Discover-Karten in `eingangssysteme`).
- **Inhaltliche Dubletten zu anderen Domains:** „SIGNAGE“-Karte verlinkt auf `ROUTES.gebaeudekommunikation.beschilderung`; „ENTRY“-Karte verlinkt auf `/entry-system`. Texte bleiben in `anwendungen` (Marketing-Beschreibung, kein Re-Use von `eingangssysteme.root.discover.items.*`).

---

## 9. Geänderte Dateien für dieses Inventar

- **Neu:** `docs/03-inventories/i18n-anwendungen-inventory.md` (dieses Dokument)
- **Ergänzt:** `docs/migration-log.md` (Eintrag `19c-0`)

Keine TSX-Dateien, keine Locale-Dateien, keine Routen, keine Navigation, keine Assets, keine `strictPages`-Liste angefasst.
