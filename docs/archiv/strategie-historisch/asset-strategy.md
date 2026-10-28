# Asset- und Komponenten-Ordnungsregeln

> Status: Etappe 1b – reine Dokumentation. Es wird **kein Asset und keine Komponente verschoben**.
> Bezug: [`docs/architecture.md`](../02-architecture/architecture.md), [`docs/migration-mapping.md`](../03-inventories/migration-mapping.md)

---

## 1. Warum die aktuelle flache Asset-Struktur jetzt funktioniert

Die heutige Struktur unter `src/assets/` ist **flach** und nutzt **Datei-Präfixe** (`bcm-*`, `tk-*`, `block-*`, `signage-*`, `grossanlage-*`, `briefkasten-*`, `systemloesungen-*`, `hero-*`) als informelle Gruppierung.

Für den aktuellen Prototyp-Stand ist das **akzeptabel**, weil:

- Die Anzahl der Bilder ist überschaubar (~60 Dateien).
- Vite hashed alle importierten Assets ohnehin beim Build.
- Imports sind explizit (`import x from '@/assets/...'`) und damit nachverfolgbar.
- Das Projekt befindet sich noch in einer Findungsphase – Bereiche werden gerade erst klar abgegrenzt.

## 2. Warum die flache Struktur langfristig nicht trägt

- **Keine Modulgrenzen:** Jede Komponente kann jedes Bild ziehen → keine Eigentümerschaft.
- **Unklare Zuständigkeit:** `bcm-*` umfasst heute Bilder aus mindestens **4 verschiedenen** späteren Domains (Zutrittskontrolle, Gebäudemanagement, Signage, ggf. Gebäudekommunikation).
- **Refactor-Risiko:** Wer ein Bild umbenennt oder löscht, sieht ohne Suche nicht, wo es verwendet wird.
- **Wachstumsproblem:** Mit jedem neuen Produkt wächst der flache Ordner ungebremst.
- **Keine i18n-Vorbereitung:** Bildvarianten pro Sprache (z. B. EN-Screenshots) wären ohne Domain-Ordner unsortierbar.

## 3. Warum NICHT pauschal nach Datei-Präfix verschoben werden darf

Datei-Präfixe spiegeln die **Asset-Lieferkette** (woher kam das Bild) wider, nicht die **fachliche Nutzung**. Beispiel:

- `bcm-briefkasten-digital.jpg` → fachlich Gebäudekommunikation/Briefkästen, nicht Zutrittskontrolle
- `bcm-namensanzeige-hero.jpg` → fachlich Signage, nicht Zutrittskontrolle
- `bcm-parkhaus-hero.jpg` → fachlich Zutrittskontrolle (Zufahrten), aber nutzt evtl. auch Anwendungen
- `block-*` → teils Home, teils Cross-Feature-Teaser

→ **Asset-Migration erfolgt domain-by-domain anhand der tatsächlichen Imports**, nicht via `mv bcm-* features/zutrittskontrolle/assets/`.

---

## 4. Asset-Mapping-Tabelle

Legende:
- **Migrationsart** wird in der späteren Pilot-Etappe pro Datei festgelegt.
- **Risiko**: niedrig = klare Domain, mittel = Cross-Feature-Verdacht, hoch = Mehrfachnutzung oder unklare Zuordnung.

### 4.1 `snipdoo/` (Unterordner)

| Aktuelle Gruppe | Aktuelle Nutzung | Empfohlene Ziel-Domain | Empfohlener Zielpfad | Mehrfach genutzt? | Risiko | Hinweis |
|---|---|---|---|---|---|---|
| `snipdoo/*` | Snipdoo-IP-Systemtechnik-Seite | gebaeudekommunikation (Sub: systemtechnik) | `src/features/gebaeudekommunikation/assets/snipdoo/` | vermutlich nein | niedrig | Bereits sauber unterordnerstrukturiert. Vorerst nicht verschieben. |

### 4.2 `bcm-*` (heterogene Gruppe – AUFTEILEN)

| Datei | Vermutete Nutzung | Empfohlene Ziel-Domain | Empfohlener Zielpfad | Risiko | Hinweis |
|---|---|---|---|---|---|
| `bcm-aussenstation-adx5.jpg` | Außenstation | gebaeudekommunikation | `features/gebaeudekommunikation/assets/tuersprechanlagen/` | mittel | Trotz `bcm-`-Präfix fachlich Türsprech. Import prüfen. |
| `bcm-biometrie.jpg` | Zutritt biometrisch | zutrittskontrolle | `features/zutrittskontrolle/assets/` | niedrig | – |
| `bcm-briefkasten-digital.jpg` | Briefkasten | gebaeudekommunikation | `features/gebaeudekommunikation/assets/briefkastenanlagen/` | mittel | Präfix irreführend. |
| `bcm-buchungssystem-produkt.jpg` | Reservieren/Buchen | gebaeudemanagement | `features/gebaeudemanagement/assets/` | mittel | Buchungssystem ist Gebäudemanagement. |
| `bcm-displaymodul.jpg` | Display-Hardware | unklar | – | mittel | Erst Importanalyse: Signage oder Zutritt? |
| `bcm-doorapp.jpg` | DoorApp | zutrittskontrolle | `features/zutrittskontrolle/assets/mobil/` | niedrig | – |
| `bcm-etagentaster.jpg` | Fahrstuhl | zutrittskontrolle | `features/zutrittskontrolle/assets/fahrstuhl/` | niedrig | – |
| `bcm-gsm-gateway.jpg` | GSM-Gateway | unklar | – | mittel | Cross-Domain möglich (Zutritt + Gebäudemgmt). |
| `bcm-handsender.jpg` | Handsender | zutrittskontrolle | `features/zutrittskontrolle/assets/` | niedrig | – |
| `bcm-kfz-kennzeichen.jpg` | KFZ-Kennzeichen | zutrittskontrolle | `features/zutrittskontrolle/assets/zufahrten/` | niedrig | – |
| `bcm-namensanzeige-hero.jpg` | Digitale Namensanzeige | signage | `features/signage/assets/` | mittel | Grenzfall – siehe §4.7. |
| `bcm-parkhaus-hero.jpg` | Parkplatz/Zufahrt | zutrittskontrolle | `features/zutrittskontrolle/assets/zufahrten/` | niedrig | – |
| `bcm-schraenke-hero.jpg` | Schränke/Behälter | gebaeudemanagement | `features/gebaeudemanagement/assets/` | mittel | – |
| `bcm-schranke.jpg` | Schranke | zutrittskontrolle | `features/zutrittskontrolle/assets/zufahrten/` | niedrig | – |
| `bcm-schrankschloss-produkt.jpg` | Schrankschloss | gebaeudemanagement | `features/gebaeudemanagement/assets/` | niedrig | – |
| `bcm-schrankschloss.jpg` | Schrankschloss | gebaeudemanagement | `features/gebaeudemanagement/assets/` | niedrig | Mögliche Dublette mit obigem. |
| `bcm-serverschloss-produkt.jpg` | Serverschloss | gebaeudemanagement | `features/gebaeudemanagement/assets/` | niedrig | – |
| `bcm-serverschrankschloss.jpg` | Serverschrankschloss | gebaeudemanagement | `features/gebaeudemanagement/assets/` | niedrig | – |
| `bcm-verwaltungssoftware.jpg` | Verwaltungs-SW | unklar | – | hoch | Wahrscheinlich Cross-Feature (Zutritt + Gebäudemgmt). |
| `bcm-vorhaengeschloss.jpg` | Vorhängeschloss | gebaeudemanagement | `features/gebaeudemanagement/assets/` | niedrig | – |

→ **`bcm-*` ist KEINE fachliche Einheit.** Pauschale Verschiebung wäre falsch.

### 4.3 `grossanlage-*`

| Datei | Vermutete Nutzung | Empfohlene Ziel-Domain | Empfohlener Zielpfad | Risiko | Hinweis |
|---|---|---|---|---|---|
| `grossanlage-concierge.jpg` | Concierge-Anwendung | gebaeudekommunikation | `features/gebaeudekommunikation/assets/grossanlagen/` | mittel | Auch verlinkt von `anwendungen/grossanlage`. |
| `grossanlage-display.jpg` | Großanzeige | gebaeudekommunikation | `features/gebaeudekommunikation/assets/grossanlagen/` | mittel | – |
| `grossanlage-funkzylinder.jpg` | Funkzylinder | gebaeudekommunikation | `features/gebaeudekommunikation/assets/grossanlagen/` | mittel | Cross-Verdacht zu Zutrittskontrolle. |
| `grossanlage-hero.jpg` | Hero Großanlagen-Seite | gebaeudekommunikation | `features/gebaeudekommunikation/assets/grossanlagen/` | niedrig | – |
| `grossanlage-namensanzeige.jpg` | Namensanzeige | signage **oder** gebaeudekommunikation | – | hoch | Grenzfall – siehe §4.7. |
| `grossanlage-schranke.jpg` | Schranke in Großanlage | zutrittskontrolle | `features/zutrittskontrolle/assets/zufahrten/` | mittel | Trotz Präfix nicht GK. |

> **Überschneidung dokumentiert:** Die Page `pages/anwendungen/Grossanlage.tsx` (Domain `anwendungen`) verwendet voraussichtlich Bilder aus dieser Gruppe. Asset-Eigentum bleibt aber bei `gebaeudekommunikation`; `anwendungen` referenziert via `import` aus der fremden Domain – das ist die EINE legitime Cross-Feature-Ausnahme für Asset-Re-Use, sofern dokumentiert.

### 4.4 `briefkasten-*`

| Datei | Vermutete Nutzung | Empfohlene Ziel-Domain | Empfohlener Zielpfad | Risiko | Hinweis |
|---|---|---|---|---|---|
| `briefkasten-aufputz.jpg` | Briefkastenanlagen | gebaeudekommunikation | `features/gebaeudekommunikation/assets/briefkastenanlagen/` | niedrig | – |
| `briefkasten-hero.jpg` | Hero Briefkasten | gebaeudekommunikation | `features/gebaeudekommunikation/assets/briefkastenanlagen/` | niedrig | – |
| `briefkasten-stele.jpg` | Stele | gebaeudekommunikation | `features/gebaeudekommunikation/assets/briefkastenanlagen/` | niedrig | – |
| `briefkasten-unterputz.jpg` | Unterputz | gebaeudekommunikation | `features/gebaeudekommunikation/assets/briefkastenanlagen/` | niedrig | – |

→ Saubere fachliche Einheit. Geeignet für frühe Migration zusammen mit der Domain.

### 4.5 `tk-*`

| Datei | Vermutete Nutzung | Empfohlene Ziel-Domain | Empfohlener Zielpfad | Risiko | Hinweis |
|---|---|---|---|---|---|
| `tk-aussenstation-carus.jpg` | Türsprech Außen | gebaeudekommunikation | `features/gebaeudekommunikation/assets/tuersprechanlagen/` | niedrig | – |
| `tk-aussenstation-entry.jpg` | Türsprech Außen | gebaeudekommunikation | `features/gebaeudekommunikation/assets/tuersprechanlagen/` | mittel | Cross-Verdacht zu `eingangssysteme`. |
| `tk-aussenstation-pes-pro.jpg` | Türsprech Außen | gebaeudekommunikation | `features/gebaeudekommunikation/assets/tuersprechanlagen/` | niedrig | – |
| `tk-innenstation-senso-pro.jpg` | Türsprech Innen | gebaeudekommunikation | `features/gebaeudekommunikation/assets/tuersprechanlagen/` | niedrig | – |
| `tk-innenstation-series-h.jpg` | Türsprech Innen | gebaeudekommunikation | `features/gebaeudekommunikation/assets/tuersprechanlagen/` | niedrig | – |
| `tk-innenstation-skyline.jpg` | Türsprech Innen | gebaeudekommunikation | `features/gebaeudekommunikation/assets/tuersprechanlagen/` | niedrig | – |
| `tk-innenstation-tasta-pro.jpg` | Türsprech Innen | gebaeudekommunikation | `features/gebaeudekommunikation/assets/tuersprechanlagen/` | niedrig | – |

→ Saubere fachliche Einheit. Idealkandidat für Migration mit Domain.

### 4.6 `signage-*`

| Datei | Vermutete Nutzung | Empfohlene Ziel-Domain | Empfohlener Zielpfad | Risiko | Hinweis |
|---|---|---|---|---|---|
| `signage-hausnummer.jpg` | Beschilderung | signage | `features/signage/assets/` | niedrig | – |
| `signage-hero.jpg` | Hero Beschilderung | signage | `features/signage/assets/` | niedrig | – |
| `signage-materialien.jpg` | Materialien | signage | `features/signage/assets/` | mittel | Mögliche Doppelnutzung mit `eingangssysteme/material`. |
| `signage-tuerklingel.jpg` | Türklingel/Schild | signage | `features/signage/assets/` | mittel | Grenzfall zu Gebäudekommunikation. |
| `signage-tuerschilder.jpg` | Türschilder | signage | `features/signage/assets/` | niedrig | – |

### 4.7 `block-*` (Startseiten- / ContentBlock-Teaser)

| Datei | Vermutete Nutzung | Empfohlene Ziel-Domain | Empfohlener Zielpfad | Mehrfach genutzt? | Risiko | Hinweis |
|---|---|---|---|---|---|---|
| `block-beratung.jpg` | Home/ContentBlock | home | `features/home/assets/content-blocks/` | möglich | mittel | – |
| `block-entry.jpg` | Teaser Eingangssysteme | home | `features/home/assets/content-blocks/` | wahrscheinlich | mittel | Auch in `eingangssysteme` möglich. |
| `block-fahrstuhlsteuerung.jpg` | Teaser Fahrstuhl | home | `features/home/assets/content-blocks/` | möglich | mittel | – |
| `block-gebaeudemanagement.jpg` | Teaser GM | home | `features/home/assets/content-blocks/` | möglich | mittel | – |
| `block-kommunikation.jpg` | Teaser GK | home | `features/home/assets/content-blocks/` | möglich | mittel | – |
| `block-mobiler-zutritt.jpg` | Teaser Zutritt mobil | home | `features/home/assets/content-blocks/` | möglich | mittel | – |
| `block-objekt.jpg` | Teaser Objektlösungen | home | `features/home/assets/content-blocks/` | möglich | mittel | – |
| `block-signage.jpg` | Teaser Signage | home | `features/home/assets/content-blocks/` | möglich | mittel | – |
| `block-tueren-tore.jpg` | Teaser Türen/Tore | home | `features/home/assets/content-blocks/` | möglich | mittel | – |
| `block-zutritt.jpg` | Teaser Zutritt | home | `features/home/assets/content-blocks/` | möglich | mittel | – |

> **Regel:** Wenn ein `block-*`-Bild **ausschließlich** auf der Startseite genutzt wird → Home-Domain. Wird es auch auf der Ziel-Feature-Seite verwendet → Ziel-Domain wird Eigentümer, Home importiert von dort. **Niemals doppelt ablegen.**

### 4.8 `hero-*` (Einzelfall-Prüfung)

| Datei | Empfohlene Ziel-Domain | Empfohlener Zielpfad | Risiko | Hinweis |
|---|---|---|---|---|
| `hero-buchungssystem.jpg` | gebaeudemanagement | `features/gebaeudemanagement/assets/` | niedrig | – |
| `hero-entrance.jpg` | unklar | – | hoch | Eingangssysteme oder Home? Importanalyse nötig. |
| `hero-entry.jpg` | eingangssysteme | `features/eingangssysteme/assets/` | mittel | – |
| `hero-infoboard.jpg` | signage | `features/signage/assets/` | mittel | – |
| `hero-zutrittskontrolle.jpg` | zutrittskontrolle | `features/zutrittskontrolle/assets/` | niedrig | – |

### 4.9 `systemloesungen-*`

| Datei | Empfohlene Ziel-Domain | Empfohlener Zielpfad | Risiko | Hinweis |
|---|---|---|---|---|
| `systemloesungen-bidi.jpg` | gebaeudekommunikation | `features/gebaeudekommunikation/assets/systemloesungen/` | mittel | – |
| `systemloesungen-feuerwehr.jpg` | gebaeudekommunikation | `features/gebaeudekommunikation/assets/systemloesungen/` | mittel | – |
| `systemloesungen-hero.jpg` | gebaeudekommunikation | `features/gebaeudekommunikation/assets/systemloesungen/` | niedrig | – |
| `systemloesungen-intern.jpg` | gebaeudekommunikation | `features/gebaeudekommunikation/assets/systemloesungen/` | mittel | – |

### 4.10 Globale Einzelassets

| Datei | Empfohlene Ziel-Domain | Empfohlener Zielpfad | Risiko | Hinweis |
|---|---|---|---|---|
| `logo-tcs.png` | shared | `src/shared/assets/` | niedrig | Globale Marke, gehört nicht in Feature. |
| `feature-sanierung.png` | anwendungen | `features/anwendungen/assets/` | niedrig | Genutzt von `pages/anwendungen/Sanierung.tsx`. |

---

## 5. Migrationsregel: Assets folgen Features

> **Regel:** Asset-Migration erfolgt **immer zusammen mit der zugehörigen Feature-Migration** – niemals als globaler Sweep.

Konkret beim späteren Pilot `zutrittskontrolle`:

1. Liste aller Imports aus `src/assets/` innerhalb der Pilot-Pages erzeugen.
2. **Nur diese** Bilder nach `src/features/zutrittskontrolle/assets/` verschieben.
3. Imports in den Pilot-Pages aktualisieren.
4. Bilder, die **auch** außerhalb der Pilot-Domain importiert werden:
   - Entweder im alten Pfad belassen, bis die andere Domain migriert wird.
   - Oder direkt verschieben und den fremden Importpfad mitziehen – nur wenn dokumentiert.
5. **Keine** Bilder „prophylaktisch“ verschieben.
6. **Keine** Duplikate erzeugen (kein Bild zweimal im Repo).

Vorteile:
- Jeder Migrationsschritt ist klein und reviewbar.
- Build bricht nicht durch übersehene Imports.
- Eigentümerschaft pro Bild ist nach jeder Etappe eindeutig.

---

## 6. Komponenten-Unterordner

### `src/components/wohnungswirtschaft/`

- Aktuell: domänenspezifische Sub-Sections (`WoWiHero.tsx`, `WoWiDetailSections.tsx`).
- Zielzuordnung: Domain `personas/wohnungswirtschaft` (siehe `migration-mapping.md`).
- Langfristige Konsolidierung: Wird Teil der **PersonaShell-Refaktorierung** (eine generische Persona-Shell + kuratierte `links.ts` pro Persona). Bis dahin bleiben die Komponenten unverändert.
- **In dieser Etappe nichts verschieben.**

### `src/components/ui/` (shadcn)

- Aktuell: 50+ shadcn-Primitives.
- Zielzuordnung: `src/shared/ui/` als geschlossener Block.
- Migration: **Erst spät** und **als Ganzes** (eine Etappe, ein PR) – nicht stückweise. shadcn-Komponenten werden untereinander importiert; ein Splitting würde den Importgraph zerreißen.
- Risiko bei voreiliger Migration: hoch (jede Feature-Komponente, jede Page importiert mindestens eine `ui/`-Komponente → globaler Import-Sweep nötig).
- **In dieser Etappe nichts verschieben.**

### Weitere Top-Level-Komponenten (`src/components/*.tsx`)

- Mapping bereits in `docs/migration-mapping.md` dokumentiert.
- Keine Verschiebung in dieser Etappe.

---

## 7. Grenzfälle (Sammelübersicht)

| Asset / Gruppe | Grund für Grenzfall |
|---|---|
| `bcm-displaymodul.jpg` | Hardware kann Signage oder Zutritt sein |
| `bcm-gsm-gateway.jpg` | Cross-Domain Zutritt + Gebäudemgmt |
| `bcm-namensanzeige-hero.jpg` | Signage vs. Zutritt (bcm-Präfix verwirrt) |
| `bcm-verwaltungssoftware.jpg` | Mehrere Features pflegen Verwaltung |
| `grossanlage-namensanzeige.jpg` | Signage vs. Gebäudekommunikation |
| `signage-tuerklingel.jpg` | Signage vs. Gebäudekommunikation |
| `signage-materialien.jpg` | Signage vs. Eingangssysteme/Material |
| `block-*` (alle) | Home vs. jeweilige Ziel-Domain – Eigentümerschaft erst nach Importanalyse |
| `hero-entrance.jpg` | Eingangssysteme vs. Home-Hero |
| `tk-aussenstation-entry.jpg` | Gebäudekommunikation vs. Eingangssysteme |
| Signage als Domain insgesamt | Eigene Domain `signage` vs. Sub von `gebaeudemanagement` oder `eingangssysteme` – wird in Pilot-Etappe entschieden |

---

## 8. Zusammenfassung

- Flache Asset-Struktur ist für jetzt OK, langfristig nicht tragfähig.
- Pauschales Verschieben nach Datei-Präfix wäre falsch – Präfixe spiegeln Lieferung, nicht Fachlichkeit.
- Asset-Migration **folgt immer** der Feature-Migration, **niemals umgekehrt** und **niemals global**.
- `tk-*`, `briefkasten-*`, `signage-*` sind die saubersten Kandidaten für die jeweils erste Domain-Migration.
- `bcm-*` ist die problematischste Gruppe und wird auf 4+ Domains aufgeteilt.
- shadcn-`ui/` und `wohnungswirtschaft/` bleiben in dieser Etappe unverändert.
