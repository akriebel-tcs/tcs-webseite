# i18n-Inventar: Domain `zutrittskontrolle`

**Status:** Etappe 18a-0 – Inventar, keine Codeänderung.
**Datum:** 2026-04-21
**Namespace:** `zutrittskontrolle`

---

## 1. Überblick

Die Domain `zutrittskontrolle` umfasst **5 Seiten** unter `src/features/zutrittskontrolle/`. Der i18n-Namespace ist in `src/i18n/index.ts` bereits **registriert**, die DE/EN-JSON-Dateien enthalten aktuell **nur `_meta`** (Status `prepared`). Sämtliche sichtbaren Texte stehen noch hart in TSX.

---

## 2. Gefundene Dateien

### 2.1 Pages

| Datei | Zeilen | Komplexität |
|-------|-------:|-------------|
| `pages/ZutrittskontrollePage.tsx` | 45 | klein – Root-Übersicht, 4 FeatureBlocks |
| `pages/TuerenTorePage.tsx` | 204 | **groß** – Hero, Überblick, 8 Produktkarten (horizontal scroll), 4 Vorteile |
| `pages/MobilerZutrittPage.tsx` | 126 | mittel – Hero, Überblick, 2 Produktkarten, 4 Vorteile |
| `pages/FahrstuhlsteuerungPage.tsx` | 54 | klein – Hero, Überblick, 4 Vorteile |
| `pages/ZufahrtenParkplaetzePage.tsx` | 182 | groß – Hero, Überblick, 5 Produktkarten (horizontal scroll), 4 Vorteile |

### 2.2 Routes

`src/features/zutrittskontrolle/routes.tsx`

```
/zutrittskontrolle
/zutrittskontrolle/tueren-tore
/zutrittskontrolle/mobiler-zutritt
/zutrittskontrolle/fahrstuhlsteuerung
/zutrittskontrolle/zufahrten-parkplaetze
```

### 2.3 Lokale Assets

```
assets/hero-zutrittskontrolle.jpg
assets/tueren-tore/hero.jpg
assets/mobil/hero.jpg
assets/mobil/bcm-doorapp.jpg
assets/mobil/bcm-gsm-gateway.jpg
assets/fahrstuhl/hero.jpg
assets/zufahrten/hero.jpg
assets/produkte/bcm-handsender.jpg
assets/produkte/bcm-vorhaengeschloss.jpg
assets/produkte/bcm-biometrie.jpg
assets/produkte/bcm-kfz-kennzeichen.jpg
```

### 2.4 Externe Bild-URLs (Unsplash)

In `TuerenTorePage` (4×) und `ZufahrtenParkplaetzePage` (2×) werden Produktbilder noch von `images.unsplash.com` geladen. Diese URLs sind **nicht übersetzbar** und bleiben hart oder werden später durch lokale Assets ersetzt – nicht Teil dieser i18n-Migration.

---

## 3. Bestehende i18n-Dateien

| Datei | Status |
|-------|--------|
| `src/i18n/locales/de/zutrittskontrolle.json` | nur `_meta` (`status: "prepared"`) |
| `src/i18n/locales/en/zutrittskontrolle.json` | nur `_meta` (`status: "prepared"`) |
| Registrierung in `src/i18n/index.ts` | ✅ vorhanden (Zeile 28–29, 60, 78, 98) |

Beide Sprachen sind also strukturgleich vorbereitet, aber leer.

---

## 4. Sichtbare Textbereiche je Seite

### 4.1 ZutrittskontrollePage (Root)

- **PageLayout**: `label`, `headline`, `intro`, `heroImage`
- **ContentSection 1 „BCM-System"**: `label`, `title`, 1 Fließtext-Absatz
- **ContentSection 2 „Funktionen"**: `label`, `title`, 4 × `FeatureBlock` mit:
  - `tueren` (`headline`, `text`, **`link` → /zutrittskontrolle/tueren-tore**)
  - `fahrstuhl` (`headline`, `text`)
  - `schraenke` (`headline`, `text`)
  - `mobil` (`headline`, `text`)

### 4.2 TuerenTorePage

- **PageLayout**: `label`, `headline`, `intro`, `heroImage`
- **Section „Überblick"**: `label`, `title`, 1 Fließtext-Absatz
- **Section „Produkte"**:
  - Eyebrow „Produkte", Headline „Lösungen im Überblick", Intro
  - Aria-Labels: „Zurück scrollen", „Weiter scrollen"
  - **8 Produktkarten** – je `subtitle`, `title`, `description`, Alt-Text (= title), Linktext „Datenblatt"
    - drueckergarnitur, knaufzylinder, onlineLeser, offlineLeser, handsender, vorhaengeschloss, biometrie, kfzKennzeichen
- **Section „Vorteile"**: `label`, `title`, **4 Vorteile** je `title` + `desc`
  - modular, nachruestung, zentrale, sicherheit

### 4.3 MobilerZutrittPage

- **PageLayout**: `label`, `headline`, `intro`, `heroImage`
- **Section „Überblick"**: `label`, `title`, 1 Fließtext-Absatz
- **Section „Produkte"**: Eyebrow, Headline, Intro
  - **2 Produktkarten** je `subtitle`, `title`, `description`, Alt-Text, „Datenblatt"
    - doorApp, gsmGateway
- **Section „Vorteile"**: `label`, `title`, **4 Vorteile**
  - komfort, gaeste, biometrie, benachrichtigungen

### 4.4 FahrstuhlsteuerungPage

- **PageLayout**: `label`, `headline`, `intro`, `heroImage`
- **Section „Überblick"**: `label`, `title`, 1 Fließtext-Absatz
- **Section „Vorteile"**: `label`, `title`, **4 Vorteile**
  - etagenfreigabe, skalierbar, onlineOffline, integration

### 4.5 ZufahrtenParkplaetzePage

- **PageLayout**: `label`, `headline`, `intro`, `heroImage`
- **Section „Überblick"**: `label`, `title`, 1 Fließtext-Absatz
- **Section „Produkte"**: Eyebrow, Headline, Intro, Aria-Labels (Zurück/Weiter scrollen)
  - **5 Produktkarten** je `subtitle`, `title`, `description`, Alt-Text, „Datenblatt"
    - bcmLeser, handsender, kfzKennzeichen, uhfLeser, gsmGateway
- **Section „Vorteile"**: `label`, `title`, **4 Vorteile**
  - modular, integration, zentrale, sicherheit

---

## 5. Empfohlene Key-Struktur

Analog zu `gebaeudekommunikation`. Top-Level je Seite + optional `shared`:

```
zutrittskontrolle
├── _meta
├── shared
│   ├── label                       // "Zutrittskontrolle"
│   ├── datenblatt                  // "Datenblatt"
│   └── scroll
│       ├── prev                    // "Zurück scrollen"
│       └── next                    // "Weiter scrollen"
├── root
│   ├── hero { headline, intro }
│   ├── bcm { label, title, body }
│   └── funktionen
│       ├── label
│       ├── title
│       └── items
│           ├── tueren     { headline, text }
│           ├── fahrstuhl  { headline, text }
│           ├── schraenke  { headline, text }
│           └── mobil      { headline, text }
├── tuerenTore
│   ├── hero { headline, intro }
│   ├── ueberblick { label, title, body }
│   ├── produkte
│   │   ├── eyebrow
│   │   ├── title
│   │   ├── intro
│   │   └── items
│   │       ├── drueckergarnitur { subtitle, title, description }
│   │       ├── knaufzylinder    { … }
│   │       ├── onlineLeser      { … }
│   │       ├── offlineLeser     { … }
│   │       ├── handsender       { … }
│   │       ├── vorhaengeschloss { … }
│   │       ├── biometrie        { … }
│   │       └── kfzKennzeichen   { … }
│   └── vorteile
│       ├── label
│       ├── title
│       └── items.{modular|nachruestung|zentrale|sicherheit} { title, desc }
├── mobilerZutritt
│   ├── hero, ueberblick
│   ├── produkte.items.{doorApp|gsmGateway}
│   └── vorteile.items.{komfort|gaeste|biometrie|benachrichtigungen}
├── fahrstuhlsteuerung
│   ├── hero, ueberblick
│   └── vorteile.items.{etagenfreigabe|skalierbar|onlineOffline|integration}
└── zufahrtenParkplaetze
    ├── hero, ueberblick
    ├── produkte.items.{bcmLeser|handsender|kfzKennzeichen|uhfLeser|gsmGateway}
    └── vorteile.items.{modular|integration|zentrale|sicherheit}
```

Alle Keys sind **stabile technische IDs**, keine Indizes. Karten und Vorteile bleiben über die Items-Map renderbar.

---

## 6. Empfohlene Migrationsreihenfolge

| Etappe | Seite | Begründung |
|--------|-------|------------|
| **18a-1** | `FahrstuhlsteuerungPage` | Klein (54 Z.), nur Hero + Überblick + 4 Vorteile. Idealer Einstieg. |
| **18a-2** | `ZutrittskontrollePage` (Root) | 45 Z., aber semantisch zentral; legt `root.*` und `shared` an. |
| **18a-3** | `MobilerZutrittPage` | Mittel (126 Z.), nur 2 Produktkarten. |
| **18a-4** | `ZufahrtenParkplaetzePage` | Groß (182 Z.), 5 Karten + Scroll-Pattern. |
| **18a-5** | `TuerenTorePage` | Größte Seite (204 Z., 8 Karten). Zuletzt – Strukturen sind dann eingespielt. |
| **18a-final-check** | alle 5 Seiten | DE/EN-Diff, Build, harte Texte, Layout/Links unverändert |

Pro Seite: Keys ergänzen, TSX umstellen, Build, Final-Check separat ggf. nur am Ende kollektiv.

---

## 7. Bewusst hart bleibende Werte

- **Routen/Pfade** (`/zutrittskontrolle/tueren-tore` etc.)
- **Markennamen**: „BCM", „BCM DoorApp", „BCM Online-Leser", „TCS", „GSM-Gateway", „UHF-Leser"
- **Technische Standards**: „AES-128", „EN 60839-11-1", „BLE", „NFC", „RFID", „Face ID", „IP-Kamera", „PIN", „SMS"
- **Lucide-Icon-Komponenten**: keine Texte
- **Externe Unsplash-URLs**: nicht übersetzbar (zukünftig durch lokale Assets ersetzbar)
- **Asset-Importpfade**

---

## 8. Risiken / Sonderfälle

1. **Externe Unsplash-Bilder** in `TuerenTorePage` und `ZufahrtenParkplaetzePage` – Alt-Texte werden i18n-fähig, das Bild selbst bleibt extern.
2. **`href="#"` an Datenblatt-Links** – Linkziel ist Platzhalter; nur der Linktext „Datenblatt" wird übersetzt.
3. **`FeatureBlock.link`** in der Root-Seite (`/zutrittskontrolle/tueren-tore`) bleibt hart und sollte nicht in i18n.
4. **Aria-Labels** der Scroll-Buttons werden übersetzt (Accessibility).
5. **Card-Width-Klasse** `w-[calc((100%-4*1.5rem)/3.125)]` in TuerenTore/MobilerZutritt vs. `w-[280px] sm:w-[300px]` in Zufahrten – Layout-Unterschied beachten, aber **nicht Teil der i18n-Migration**.
6. **Gemeinsame Produktbilder** (`bcm-handsender.jpg`, `bcm-kfz-kennzeichen.jpg`) werden in TuerenTore und Zufahrten verwendet – beide Seiten nennen das Produkt teils unterschiedlich („Handsender – Parkplätze & Tore" vs. „Handsender – Komfortzugang"). Beide Texte separat in i18n übernehmen, **nicht zusammenführen**.
7. **PageLayout-CTA** läuft global über `common.pageCta.*` – muss in dieser Domain nicht erneut übersetzt werden.

---

## 9. Geschätzter Key-Umfang (Leaf-Keys)

| Bereich | Keys |
|--------:|-----:|
| `_meta` | 3 |
| `shared` | ~4 |
| `root` | ~17 |
| `tuerenTore` | ~50 |
| `mobilerZutritt` | ~22 |
| `fahrstuhlsteuerung` | ~13 |
| `zufahrtenParkplaetze` | ~37 |
| **Gesamt (geschätzt)** | **~146** |

---

## 10. Fazit

- 5 Seiten, davon 2 große (TuerenTore, Zufahrten), 1 mittlere (Mobiler Zutritt), 2 kleine (Root, Fahrstuhl).
- Komplexeste Seite: **`TuerenTorePage`** (8 Produktkarten + horizontaler Scroll + 4 Vorteile).
- Namespace registriert, JSON-Dateien nur als Skeleton vorhanden.
- Empfohlene Migration: klein → groß, in 5 Etappen (18a-1 bis 18a-5) + abschließendem Final-Check.
- Keine Routen-, Navigations-, Layout- oder Asset-Änderungen geplant.
