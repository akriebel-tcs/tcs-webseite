# i18n Textinventar · Gebäudekommunikation

> ℹ️ **Historisches Inventar.** Erstellt in Etappe 17a-0 als Vorbereitung der Gebäudekommunikation-i18n-Migration. Die Migration wurde mit Etappen 17a-1 bis 17a-6 (inkl. Final-Checks) umgesetzt. Dieses Dokument bleibt als Nachweis erhalten und wird nicht mehr nachgepflegt. Aktueller Stand: [`current-status.md`](../current-status.md), [`i18n-strategy.md`](../01-strategy/i18n-strategy.md), [`migration-log.md`](../migration-log.md).


**Etappe 17a-0 · 2026-04-21**

Vorbereitendes Inventar für die Migration der Domain Gebäudekommunikation auf den i18n-Namespace `gebaeudekommunikation`. Dieses Dokument **dokumentiert nur** — es ändert keinen Code und keine JSON.

## 1. Geprüfte Dateien

### Pages (6)

| Datei | Zeilen | Komplexität |
|---|---|---|
| `src/features/gebaeudekommunikation/pages/TuerkommunikationPage.tsx` | 176 | mittel (Root-Übersicht mit 5 Bereichen, 4 Anwendungsumfeldern, snipdoo-Teaser) |
| `src/features/gebaeudekommunikation/pages/TuersprechanlagenPage.tsx` | 309 | hoch (4 Außenstationen + 7 Innenstationen, Vorteile-Grid, snipdoo-Verweis, lokale `ProduktScroller`-Komponente) |
| `src/features/gebaeudekommunikation/pages/BriefkastenanlagenPage.tsx` | 154 | mittel (3 Montageformen, 2 FeatureBlocks, 4 smarte Funktionen, CTA) |
| `src/features/gebaeudekommunikation/pages/GrossanlagenPage.tsx` | 349 | hoch (6 Anforderungen, 4 Themenblöcke, 3 Leistungsspalten, 3 Wirtschaftlichkeit-Karten, 4 Systembausteine, Projekt-CTA) |
| `src/features/gebaeudekommunikation/pages/SystemloesungenPage.tsx` | 145 | mittel (6 Vorteile, 4 FeatureBlocks, 3 TCS:PLUS-Karten, 2 CTAs) |
| `src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx` | 505 | **sehr hoch** (eigene Hero, SubNavSticky mit 9 Anchor-Items, 3 Audience-Cards, 5 Module-Cards, 3 Inbetriebnahme-Steps, 3 Scale-Cards, 5 RoleTabs, 3 CTAs, dynamische `document.title`/Meta-Description) |

### Routing

- `src/features/gebaeudekommunikation/routes.tsx` — definiert 11 Routen (5 aktive + 6 Legacy-Fallbacks). Keine sichtbaren Texte, nicht zu migrieren.

### Hinweis zu BeschilderungPage

`BeschilderungPage` liegt in der Domain `signage` (`src/features/signage/pages/BeschilderungPage.tsx`), **nicht** in `gebaeudekommunikation`. Die Aufgabenstellung erwähnt sie nur als Verweis aus `TuerkommunikationPage`. Migration der Beschilderung erfolgt in einer eigenen späteren Etappe unter dem Namespace `signage`.

### Lokale Komponenten mit sichtbaren Texten

- `ProduktScroller` (in `TuersprechanlagenPage.tsx`, intern definiert): erhält `label`, `title`, `description` als Props sowie `aria-label="Zurück scrollen"` / `"Weiter scrollen"` für die Pfeil-Buttons.
- Externe Komponenten ohne eigene Texte (übernehmen Props): `PageLayout`, `ContentSection`, `FeatureBlock`, `SubNavSticky`, `RoleTabsBlock`, `AutoBreadcrumb`, `Button`. Diese werden nicht in dieser Domain migriert.

## 2. Texte je Seite

### 2.1 TuerkommunikationPage

- **Route**: `/gebaeudekommunikation` (aktiv) + `/tuerkommunikation` (Legacy)
- **PageLayout**: `label`, `headline`, `intro`
- **Section „Unsere Bereiche"**: `label`, `title`, Einleitungs-Paragraph
- **5 Bereich-Karten** (`bereiche`): je `label`, `title`, `text` — **`href` bleibt hart** (Routen)
- Wiederholter Link-Text: `Mehr erfahren`
- **Section „Anwendungsumfelder"**: `label`, `title`, Schluss-Paragraph
- **4 Anwendungsfeld-Karten** (`anwendungsfelder`): je `title`, `text`
- **Section „snipdoo® System"**: `label`, `title`, Karten-Headline + Karten-Text, Link `Mehr über snipdoo® IP`
- **3 Zielgruppen-Karten** (Elektrofachplaner / Elektroinstallateure / Bauträger und Verwaltungen): je `title`, `text`
- **Hart bleiben**: Produktnamen `Senso Pro`, `TASTA PRO`, `snipdoo® HOME`, `snipdoo®`, `DECT`, `IP`; Routen-`href`s; `alt={b.title}` (verwendet i18n-Wert)

### 2.2 TuersprechanlagenPage

- **Route**: `/gebaeudekommunikation/tuersprechanlagen` (aktiv) + `/tuersprechanlagen` (Legacy)
- **PageLayout**: `label`, `headline`, `intro`
- **Section „Überblick"**: `label`, `title`, 2 Paragraphen
- **ProduktScroller Außenstationen**: `label`, `title`, `description` + 2 `aria-label`s (`Zurück scrollen`, `Weiter scrollen`) + Datenblatt-Link-Text
- **4 Außenstationen-Karten** (`aussenstationen`): je `title` (Produktname — ggf. hart), `subtitle`, `description`. Wiederholter Karten-Link `Datenblatt`.
- **ProduktScroller Innenstationen**: `label`, `title`, `description`
- **7 Innenstationen-Karten** (`innenstationen`): je `title` (Produktname — ggf. hart), `subtitle`, `description`
- **Section „Vorteile"**: `label`, `title`, 4 Vorteils-Karten (je `title`, `desc`)
- **Section „Systemtechnik"**: `label`, `title`, Paragraph, Link `Mehr über snipdoo® IP erfahren`
- **Hart bleiben**: Produktnamen `PES PRO`, `CARUS ARGOS`, `ENTRY`, `KTU`, `TASTA PRO`, `SENSO PRO`, `IP TASTA`, `TASTA 7`, `SKYLINE 10 PRO`, `CARUS NEXT`, `SERIES H`, `snipdoo®`, `snipdoo® HOME`, `SIP`, `ONVIF`, `API`, `BUS`, `DIN 18040`. Hinweis: `subtitle` und `description` der Produktkarten enthalten beschreibende Texte → migrieren.

### 2.3 BriefkastenanlagenPage

- **Route**: `/gebaeudekommunikation/briefkastenanlagen` (aktiv) + `/briefkastenanlagen` (Legacy)
- **PageLayout**: `label`, `headline`, `intro`
- **Section „Montageformen"**: `label`, `title`, Einleitungs-Paragraph
- **3 Montageform-Karten** (`montageformen`): je `title`, `text`. `alt={m.title}` (i18n-Wert).
- **Section „Skalierbarkeit"**: `label`, `title`, Einleitungs-Paragraph
- **2 FeatureBlocks**: je `headline`, `text`
- **Section „Smart & individuell"**: `label`, `title`, Einleitungs-Paragraph
- **4 Smart-Funktion-Karten**: je `title`, `text`
- CTA-Button: `Anlage konfigurieren`
- **Hart bleiben**: `ENTRY`, `AUDIO:PACKS`, `VIDEO:PACKS`, `Inputz`, CTA-`href="#"`

### 2.4 GrossanlagenPage

- **Route**: `/gebaeudekommunikation/grossanlagen` (aktiv) + `/grossanlagen` (Legacy)
- **PageLayout**: `label`, `headline`, `intro`
- **Section „Anforderungen"**: `label`, `title`, Einleitungs-Paragraph
- **6 Anforderung-Karten** (`anforderungen`): je `title`, `text`
- **Section „Concierge"**: `label`, `title`, 2 Paragraphen, `alt`-Text Bild
- **Section „Zufahrtskontrolle"**: `label`, `title`, 2 Paragraphen, `alt`-Text Bild
- **Section „Funkvernetzte Offline-Leser"**: `label`, `title`, 2 Paragraphen, `alt`-Text Bild
- **Section „Digitale Namensanzeige"**: `label`, `title`, 2 Paragraphen, `alt`-Text Bild, Link `Mehr zur digitalen Namensanzeige`
- **Section „Systemleistungen"**: `label`, `title`. 3 Leistungsspalten (`leistungen`) je `title` + Listen-Items (3 pro Spalte = 9 Bullets)
- **Section „Wirtschaftlichkeit"**: `label`, `title`, 3 Karten je `title` + `text`
- **Section „Systembausteine"**: `label`, `title`, Einleitungs-Paragraph. 4 Systembausteine-Karten (`systembausteine`) je `label`, `title`, `description`. Wiederholter Link-Text `Details`. **`href` bleibt hart**.
- **Section „Projektberatung"**: `label`, `title`, Paragraph, 2 CTA-Links (`Zum Konfigurator`, `Beratung anfragen`)
- **Hart bleiben**: `e-Paper`, `IP`, `BCM`, `DIN EN 81-28`, `ERP`, `CAFM`, `TG`; Routen-`href`s

### 2.5 SystemloesungenPage

- **Route**: `/gebaeudekommunikation/systemloesungen` (aktiv) + `/systemloesungen` (Legacy)
- **PageLayout**: `label`, `headline`, `intro`
- **Section „Vorteile"**: `label`, `title`, 6 Vorteile-Karten (`vorteile`) je `title`, `text`
- **Section „Concierge"**: `label`, `title`, FeatureBlock (`headline`, `text`), `link`-Route hart
- **Section „Feuerwehr"**: `label`, `title`, FeatureBlock (`headline`, `text`)
- **Section „Interne Kommunikation"**: `label`, `title`, FeatureBlock (`headline`, `text`)
- **Section „Bidirektionale Video"**: `label`, `title`, FeatureBlock (`headline`, `text`)
- **Section „TCS:PLUS Fachplanung"**: `label`, `title`, Einleitungs-Paragraph, 3 Karten je `title`, `text`
- 2 CTA-Links: `Beratung anfragen`, `Planen & Konfigurieren`
- **Hart bleiben**: `MHHR`, `TCS:BIDI`, `TCS:PLUS`, `90 dB`, `30-stündig`, `8 Geschossen`, Routen-`href`s

### 2.6 SnipdooIpPage

- **Route**: `/gebaeudekommunikation/snipdoo-ip` (aktiv) + `/snipdoo-ip` und `/systemtechnik/snipdoo-ip` (Legacy-Fallbacks)
- **`document.title`** und **Meta-Description** (in `useEffect`): zu migrieren
- **AutoBreadcrumb** `fallbackLabel="snipdoo IP"` — als Eigenname **hart** belassen
- **SubNavSticky** (`subNavItems`): 9 Anchor-Labels (`Überblick`, `Vorteile`, `Für wen`, `Nutzung im Alltag`, `Systemaufbau`, `Inbetriebnahme`, `Anwendungen`, `Details je Zielgruppe`, `Kontakt`) — `id` bleibt hart
- **Hero**: Eyebrow, H1, H2, 2 Paragraphen, 2 CTAs (`Systemunterlagen anfordern`, `Zum Systemaufbau`)
- **Section „Systemversprechen"**: Eyebrow, H2, 2 Paragraphen
- **Section „Für wen"**: H2 + 3 Audience-Karten (`audienceCards`) je `iconLabel` (aria-label), `title`, `h3`, `text`
- **Section „Nutzung im Alltag"**: Eyebrow, H2, H3, 2 Paragraphen, Bild-`alt`
- **Section „Systemaufbau"**: Eyebrow, H2, Lead-Paragraph, Bild-`alt` (sehr lang), 5 Module-Karten (`moduleCards`) je `iconLabel`, `title`, `h3`, `text`. Eine Karte hat zusätzlich `link.label` (`Mehr zur mobilen Türkommunikation`), `link.href` bleibt hart.
- **Section „Inbetriebnahme"**: Eyebrow, H2, Einleitungs-Paragraph, 3 Steps (`inbetriebnahmeSteps`) je `title`, `text`. Schluss-Paragraph. Bild-`alt` (sehr lang).
- **Section „Anwendungen"**: Eyebrow, H2, Einleitungs-Paragraph, 3 Scale-Cards (`scaleCards`) je `title`, `h3`, `text`, `alt`
- **Section „Rollen"**: Eyebrow, H2, Einleitungs-Paragraph, 5 RoleTabs (`roleTabs`) je `id` (hart), `label`, `headline`, 2 Paragraphen
- **Section „Kontakt"**: H2, Paragraph, 3 CTA-Buttons (`Projektanfrage senden`, `Systemunterlagen herunterladen`, `Schulung / Demo buchen`) — `href` hart
- **Hart bleiben**: `snipdoo`, `snipdoo IP`, `snipdoo HOME`, `snipdoo SYSTEM`, `snipdoo CLOUD`, `snipdoo SERVER`, `snipdoo®`, `IP`, `LTE`, `PoE`, `SIP`, `ONVIF`, `Drag-and-Drop`, `Windows`, `iOS`, `Android`; alle Routen-`href`s und Anchor-`id`s

## 3. Vorgeschlagene Key-Struktur

Ein einzelner Namespace `gebaeudekommunikation` mit pro Seite einem Sub-Tree:

```
{
  "_meta": {
    "namespace": "gebaeudekommunikation",
    "status": "prepared"
  },
  "root": {
    "hero": { "label", "headline", "intro" },
    "bereicheSection": {
      "label", "title", "intro",
      "items": {
        "tuersprechanlagen": { "label", "title", "text" },
        "briefkastenanlagen": { "label", "title", "text" },
        "beschilderung":     { "label", "title", "text" },
        "grossanlagen":      { "label", "title", "text" },
        "systemloesungen":   { "label", "title", "text" }
      },
      "moreLink": "Mehr erfahren"
    },
    "anwendungsfelderSection": {
      "label", "title", "outro",
      "items": {
        "pflege":          { "title", "text" },
        "bildung":         { "title", "text" },
        "behoerden":       { "title", "text" },
        "grossGewerblich": { "title", "text" }
      }
    },
    "snipdooSection": {
      "label", "title",
      "card": { "title", "text", "moreLink" },
      "audiences": {
        "fachplaner":     { "title", "text" },
        "installateure":  { "title", "text" },
        "betreiber":      { "title", "text" }
      }
    }
  },
  "tuersprechanlagen": {
    "hero": { "label", "headline", "intro" },
    "ueberblick": { "label", "title", "p1", "p2" },
    "scrollerCommon": {
      "datenblattLabel": "Datenblatt",
      "ariaPrev": "Zurück scrollen",
      "ariaNext": "Weiter scrollen"
    },
    "aussen": {
      "label", "title", "description",
      "items": {
        "pesPro":  { "subtitle", "description" },
        "carus":   { "subtitle", "description" },
        "entry":   { "subtitle", "description" },
        "ktu":     { "subtitle", "description" }
      }
    },
    "innen": {
      "label", "title", "description",
      "items": {
        "tastaPro":  { "subtitle", "description" },
        "sensoPro":  { "subtitle", "description" },
        "ipTasta":   { "subtitle", "description" },
        "tasta7":    { "subtitle", "description" },
        "skyline10": { "subtitle", "description" },
        "carusNext": { "subtitle", "description" },
        "seriesH":   { "subtitle", "description" }
      }
    },
    "vorteile": {
      "label", "title",
      "items": {
        "qualitaet":      { "title", "desc" },
        "homeApp":        { "title", "desc" },
        "barrierefrei":   { "title", "desc" },
        "skalierbar":     { "title", "desc" }
      }
    },
    "systemtechnik": { "label", "title", "text", "moreLink" }
  },
  "briefkastenanlagen": {
    "hero": { "label", "headline", "intro" },
    "montage": {
      "label", "title", "intro",
      "items": {
        "aufputz":     { "title", "text" },
        "unterputz":   { "title", "text" },
        "freistehend": { "title", "text" }
      }
    },
    "skalierbarkeit": {
      "label", "title", "intro",
      "blocks": {
        "wohneinheiten": { "headline", "text" },
        "ausrichtung":   { "headline", "text" }
      }
    },
    "smart": {
      "label", "title", "intro",
      "items": {
        "intercom":      { "title", "text" },
        "barrierefrei":  { "title", "text" },
        "design":        { "title", "text" },
        "beschriftung":  { "title", "text" }
      },
      "ctaConfigure": "Anlage konfigurieren"
    }
  },
  "grossanlagen": {
    "hero": { "label", "headline", "intro" },
    "anforderungen": {
      "label", "title", "intro",
      "items": {
        "gemischteNutzung": { "title", "text" },
        "skalierung":       { "title", "text" },
        "concierge":        { "title", "text" },
        "zufahrt":          { "title", "text" },
        "funkOffline":      { "title", "text" },
        "namensanzeige":    { "title", "text" }
      }
    },
    "concierge":      { "label", "title", "p1", "p2", "imageAlt" },
    "zufahrt":        { "label", "title", "p1", "p2", "imageAlt" },
    "funkOffline":    { "label", "title", "p1", "p2", "imageAlt" },
    "namensanzeige":  { "label", "title", "p1", "p2", "imageAlt", "moreLink" },
    "leistungen": {
      "label", "title",
      "spalten": {
        "steuerung":       { "title", "items": [..3..] },
        "zutrittMobilitaet": { "title", "items": [..3..] },
        "kommunikation":   { "title", "items": [..3..] }
      }
    },
    "wirtschaftlichkeit": {
      "label", "title",
      "items": {
        "betriebskosten":     { "title", "text" },
        "investition":        { "title", "text" },
        "quartiersfaehig":    { "title", "text" }
      }
    },
    "systembausteine": {
      "label", "title", "intro",
      "items": {
        "concierge":      { "label", "title", "description" },
        "bcm":            { "label", "title", "description" },
        "schranken":      { "label", "title", "description" },
        "namensanzeige":  { "label", "title", "description" }
      },
      "detailsLink": "Details"
    },
    "cta": {
      "label", "title", "text",
      "ctaConfigure": "Zum Konfigurator",
      "ctaContact":   "Beratung anfragen"
    }
  },
  "systemloesungen": {
    "hero": { "label", "headline", "intro" },
    "vorteile": {
      "label", "title",
      "items": {
        "zentral":         { "title", "text" },
        "sicherheit":      { "title", "text" },
        "mhhr":            { "title", "text" },
        "ablaeufe":        { "title", "text" },
        "barrierefrei":    { "title", "text" },
        "tcsPlus":         { "title", "text" }
      }
    },
    "concierge":      { "label", "title", "blockHeadline", "blockText" },
    "feuerwehr":      { "label", "title", "blockHeadline", "blockText" },
    "interne":        { "label", "title", "blockHeadline", "blockText" },
    "bidi":           { "label", "title", "blockHeadline", "blockText" },
    "tcsPlus": {
      "label", "title", "intro",
      "items": {
        "individuell": { "title", "text" },
        "behoerden":   { "title", "text" },
        "rundum":      { "title", "text" }
      },
      "ctaContact": "Beratung anfragen",
      "ctaPlanen":  "Planen & Konfigurieren"
    }
  },
  "snipdooIp": {
    "meta": { "title", "description" },
    "subnav": {
      "ueberblick", "vorteile", "fuerWen", "alltag",
      "systemaufbau", "inbetriebnahme", "anwendungen", "rollen", "kontakt"
    },
    "hero": {
      "eyebrow", "h1", "h2", "p1", "p2",
      "ctaPrimary": "Systemunterlagen anfordern",
      "ctaSecondary": "Zum Systemaufbau"
    },
    "systemversprechen": { "eyebrow", "h2", "p1", "p2" },
    "fuerWen": {
      "h2",
      "items": {
        "installateure": { "iconLabel", "title", "h3", "text" },
        "planer":        { "iconLabel", "title", "h3", "text" },
        "betreiber":     { "iconLabel", "title", "h3", "text" }
      }
    },
    "alltag": { "eyebrow", "h2", "h3", "p1", "p2", "imageAlt" },
    "systemaufbau": {
      "eyebrow", "h2", "lead", "diagramAlt",
      "items": {
        "server":      { "iconLabel", "title", "h3", "text" },
        "software":    { "iconLabel", "title", "h3", "text" },
        "cloud":       { "iconLabel", "title", "h3", "text" },
        "app":         { "iconLabel", "title", "h3", "text", "linkLabel": "Mehr zur mobilen Türkommunikation" },
        "integration": { "iconLabel", "title", "h3", "text" }
      }
    },
    "inbetriebnahme": {
      "eyebrow", "h2", "intro", "outro", "imageAlt",
      "steps": {
        "struktur": { "title", "text" },
        "erkennen": { "title", "text" },
        "zuordnen": { "title", "text" }
      }
    },
    "anwendungen": {
      "eyebrow", "h2", "intro",
      "items": {
        "efh":     { "title", "h3", "text", "alt" },
        "mfh":     { "title", "h3", "text", "alt" },
        "gewerbe": { "title", "h3", "text", "alt" }
      }
    },
    "rollen": {
      "eyebrow", "h2", "intro",
      "tabs": {
        "bauherren":           { "label", "headline", "p1", "p2" },
        "architekten":         { "label", "headline", "p1", "p2" },
        "wohnungswirtschaft":  { "label", "headline", "p1", "p2" },
        "fachplaner":          { "label", "headline", "p1", "p2" },
        "handwerk":            { "label", "headline", "p1", "p2" }
      }
    },
    "kontakt": {
      "h2", "intro",
      "ctaPrimary":   "Projektanfrage senden",
      "ctaSecondary": "Systemunterlagen herunterladen",
      "ctaTertiary":  "Schulung / Demo buchen"
    }
  }
}
```

DE und EN müssen später strukturgleich sein.

## 4. Hinweise zu harten Daten / Eigennamen

Folgende Werte bleiben **bewusst hart** (keine i18n-Keys):

- **Produktnamen / Markennamen**: `snipdoo`, `snipdoo®`, `snipdoo IP`, `snipdoo HOME`, `snipdoo SYSTEM`, `snipdoo CLOUD`, `snipdoo SERVER`, `Senso Pro`, `SENSO PRO`, `TASTA PRO`, `TASTA 7`, `IP TASTA`, `SKYLINE 10 PRO`, `CARUS NEXT`, `CARUS ARGOS`, `PES PRO`, `SERIES H`, `ENTRY`, `KTU`, `BCM`, `TCS:PLUS`, `TCS:BIDI`, `AUDIO:PACKS`, `VIDEO:PACKS`
- **Standards / Normen**: `SIP`, `ONVIF`, `API`, `DECT`, `IP`, `BUS`, `PoE`, `LTE`, `MHHR`, `DIN 18040`, `DIN EN 81-28`, `e-Paper`, `Inputz`
- **Plattformen**: `iOS`, `Android`, `Windows`, `Drag-and-Drop`
- **Zahlen / Maße**: `90 dB`, `30-stündig`, `8 Geschossen`, `150 Endgeräte`, `1.200 Produkte`, `1 bis 16 Wohneinheiten`, `7-Zoll`, `10-Zoll`
- **Routen**: alle `href` / `to` / `link`-Werte (ROUTES-Konstanten und Strings) und alle SubNavSticky-`id`-Werte
- **AutoBreadcrumb fallbackLabel**: `"snipdoo IP"` (Eigenname)

In Karten-Texten kommen Markennamen *innerhalb* von Beschreibungen vor. Diese Beschreibungen werden migriert, die Eigennamen bleiben darin als Literale (z. B. `"... mit der snipdoo® HOME App ..."`).

## 5. Empfohlene Migrationsreihenfolge

Vom einfachsten zum komplexesten — so kann jede Etappe einzeln gebaut, geprüft und gebuildet werden:

1. **17a-1** — `BriefkastenanlagenPage` (klein, klare Struktur, ~12 Texte)
2. **17a-2** — `SystemloesungenPage` (mittel, viele FeatureBlocks aber wiederholtes Muster)
3. **17a-3** — `TuerkommunikationPage` (Root-Seite, mittel, 5 Bereiche + 4 Anwendungsumfelder + snipdoo-Teaser)
4. **17a-4** — `TuersprechanlagenPage` (lokale `ProduktScroller`-Komponente, 11 Produktkarten)
5. **17a-5** — `GrossanlagenPage` (groß, viele Sektionen, viele `imageAlt`)
6. **17a-6** — `SnipdooIpPage` (sehr groß, 9 Sektionen, RoleTabs, dynamische Meta-Tags) — **zuletzt, weil mit Abstand komplexeste Seite**
7. **17a-final-check** — DE/EN-Strukturgleichheit, keine harten deutschen Texte mehr in TSX, Build grün

Begründung: kleine Seiten zuerst etablieren das Key-Schema und die Konventionen; Schwergewichte folgen, wenn die Struktur eingespielt ist.

## 6. Keine Code-Änderungen in 17a-0

Diese Etappe hat ausschließlich diese Datei und den Eintrag in `docs/migration-log.md` erzeugt. Keine TSX-, JSON-, Routen- oder Asset-Änderung.
