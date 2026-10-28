# Persona-Textinventar (Etappe 15f-0)

> ℹ️ **Historisches Inventar.** Erstellt in Etappe 15f-0 als Vorbereitung der Persona-i18n-Migration. Abgeschlossen mit Etappe 15f-final-check. Dieses Dokument bleibt als Nachweis erhalten und wird nicht mehr nachgepflegt. Aktueller Stand: [`current-status.md`](../current-status.md), [`i18n-strategy.md`](../01-strategy/i18n-strategy.md), [`migration-log.md`](../migration-log.md).


Stand: 2026-04-21

Dieses Dokument inventarisiert alle sichtbaren Texte in den Persona-Content-Komponenten und schlägt eine Key-Struktur für die spätere i18n-Migration (Etappe 15f-1+) vor.

**Wichtig:** In dieser Etappe wurden keine TSX-Dateien und keine JSON-Dateien geändert.

---

## 1. Geprüfte Dateien

| Persona | Hauptdatei | Zusatzdateien |
|---|---|---|
| Bauherr | `src/features/personas/bauherr/components/BauherrenContent.tsx` | – |
| Architekt | `src/features/personas/architekt/components/ArchitektenContent.tsx` | – |
| Wohnungswirtschaft | `src/features/personas/wohnungswirtschaft/components/WohnungswirtschaftContent.tsx` | `WoWiHero.tsx`, `WoWiDetailSections.tsx` (9 Sub-Sections) |
| Fachplaner | `src/features/personas/fachplaner/components/FachplanerContent.tsx` | – |
| Handwerk | `src/features/personas/handwerk/components/HandwerkContent.tsx` | – |
| Fachhandel | `src/features/personas/fachhandel/components/FachhandelContent.tsx` | – |

Alle Persona-Komponenten folgen demselben Grundaufbau (siehe Abschnitt 3). Wohnungswirtschaft ist die Sonderlage mit ausgelagertem Hero und 9 zusätzlichen Detail-Sections.

---

## 2. Textarten je Persona (gemeinsamer Grundaufbau)

| Bereich | Inhalt | Vorkommen je Persona |
|---|---|---|
| Hero – eyebrow | „Für Bauherren & Eigentümer" o. ä. | 1 |
| Hero – headline | H1 | 1 |
| Hero – intro | Fließtext unter H1 | 1 |
| Hero – imageAlt | Alt-Text für Hero-Bild | 1 |
| Stats | 4 Items mit `value` + `label` | 4 |
| Highlights – sectionHeadline | H2 über dem Highlight-Grid | 1 |
| Highlights – sectionIntro | Intro unter H2 | 1 |
| Highlights – items | 6 Items mit `title` + `desc` (Icon bleibt im TSX) | 6 |
| Solutions – sectionHeadline | H2 | 1 |
| Solutions – sectionIntro | Intro | 1 |
| Solutions – items | 4 Items mit `label` + `headline` + `text` (Bild + Link bleiben im TSX) | 4 |
| Solutions – cta | „Mehr erfahren" (gemeinsam) | 1 |
| Cases / Tools / Tipps / Partner | 3 Items mit `title` + `desc` (Sektionsname variiert je Persona) | 3 |
| Cases – sectionHeadline | H2 | 1 |
| Cases – sectionIntro | Intro | 1 |
| CTA – headline | H2 | 1 |
| CTA – intro | Fließtext | 1 |
| CTA – primary | Button-Text 1 | 1 |
| CTA – secondary | Button-Text 2 | 1 |

Telefon, E-Mail-Adressen und Bild-URLs bleiben hart im TSX (Daten, keine UI-Texte).

### 2.1 Persona-spezifische Variationen

| Persona | „Cases"-Sektion heißt | CTA-Buttons |
|---|---|---|
| Bauherr | „Typische Anwendungsfälle" | Beratungstermin vereinbaren / Konfigurator starten |
| Architekt | „Typische Projektszenarien" | Projektberatung anfragen / Muster anfordern |
| Wohnungswirtschaft | (keine separate Cases-Sektion, dafür 9 Detail-Sections) | Projektberatung anfragen / Referenzprojekte ansehen |
| Fachplaner | „Planungstools & Ressourcen" | Planungsberatung anfragen / Konfigurator starten |
| Handwerk | „Praxis-Tipps" | Schulung buchen / Technische Hotline |
| Fachhandel | „Partner-Services" | Partnerschaft anfragen / Sortiment ansehen |

### 2.2 Wohnungswirtschaft – Sonderlage

- `WoWiHero.tsx`: eigener Hero (~26 Zeilen)
- `WoWiDetailSections.tsx`: 9 zusätzliche Sektionen
  - `TuersprechanlagenSection`
  - `BarrierefreiSection`
  - `PlugPlaySection`
  - `MietershopSection`
  - `NamensanzeigeSection`
  - `ZutrittParkraumSection`
  - `GefahrenalarmierungSection`
  - `BestandsmodernisierungSection`
  - `ServiceGarantieSection`

Diese Detail-Sections sollten in der Migration als eigene Unterstruktur unter `personas.wohnungswirtschaft.detailSections.<sectionKey>` abgebildet werden.

### 2.3 Links / ROUTES (nur dokumentiert, nicht zu migrieren)

Alle Persona-Solutions verlinken über `ROUTES`-Konstanten:
- `ROUTES.gebaeudekommunikation.root`
- `ROUTES.zutrittskontrolle.root`
- `ROUTES.eingangssysteme.root`
- `ROUTES.gebaeudekommunikation.beschilderung`

Keine Hartlinks gefunden.

---

## 3. Vorgeschlagene Key-Struktur für `personas.json`

Ein Namespace, ein Wurzel-Key pro Persona. DE und EN strukturgleich.

```jsonc
{
  "_meta": {
    "namespace": "personas",
    "status": "in-progress",
    "note": "Persona-Detailtexte – Migration in Etappe 15f-1+."
  },
  "common": {
    "ctaLearnMore": "Mehr erfahren"
  },
  "bauherr": {
    "hero": {
      "eyebrow": "Für Bauherren & Eigentümer",
      "headline": "Ihr Zuhause verdient den besten Eingang",
      "intro": "...",
      "imageAlt": "..."
    },
    "stats": {
      "items": {
        "experience":   { "value": "30+",      "label": "Jahre Erfahrung" },
        "made":         { "value": "100%",     "label": "Made in Germany" },
        "app":          { "value": "24/7",     "label": "App-Zugriff" },
        "oneSystem":    { "value": "1 System", "label": "Alles aus einer Hand" }
      }
    },
    "highlights": {
      "headline": "Was TCS für Sie als Bauherr leistet",
      "intro": "...",
      "items": {
        "security":     { "title": "...", "desc": "..." },
        "app":          { "title": "...", "desc": "..." },
        "design":       { "title": "...", "desc": "..." },
        "orientation":  { "title": "...", "desc": "..." },
        "futureProof":  { "title": "...", "desc": "..." },
        "consulting":   { "title": "...", "desc": "..." }
      }
    },
    "solutions": {
      "headline": "Unsere Lösungen für Ihr Eigenheim",
      "intro": "...",
      "items": {
        "communication": { "label": "...", "headline": "...", "text": "..." },
        "access":        { "label": "...", "headline": "...", "text": "..." },
        "entry":         { "label": "...", "headline": "...", "text": "..." },
        "signage":       { "label": "...", "headline": "...", "text": "..." }
      }
    },
    "cases": {
      "headline": "Typische Anwendungsfälle",
      "intro": "...",
      "items": {
        "newBuild":     { "title": "...", "desc": "..." },
        "modernization":{ "title": "...", "desc": "..." },
        "ownerMfh":     { "title": "...", "desc": "..." }
      }
    },
    "cta": {
      "headline": "Planen Sie Ihren perfekten Eingangsbereich",
      "intro": "...",
      "primary": "Beratungstermin vereinbaren",
      "secondary": "Konfigurator starten"
    }
  },
  "architekt": { /* gleiche Struktur, items mit eigenen Keys */ },
  "wohnungswirtschaft": {
    "hero":       { /* aus WoWiHero.tsx */ },
    "stats":      { ... },
    "highlights": { ... },
    "solutions":  { ... },
    "detailSections": {
      "tuersprechanlagen":      { "headline": "...", "text": "...", "..." },
      "barrierefrei":           { ... },
      "plugPlay":               { ... },
      "mietershop":             { ... },
      "namensanzeige":          { ... },
      "zutrittParkraum":        { ... },
      "gefahrenalarmierung":    { ... },
      "bestandsmodernisierung": { ... },
      "serviceGarantie":        { ... }
    },
    "cta": { ... }
  },
  "fachplaner": {
    /* + tools statt cases */
    "tools": { "headline": "Planungstools & Ressourcen", "intro": "...", "items": { ... } }
  },
  "handwerk": {
    /* + tips statt cases */
    "tips":  { "headline": "Praxis-Tipps", "intro": "...", "items": { ... } }
  },
  "fachhandel": {
    /* + partnerServices statt cases */
    "partnerServices": { "headline": "Partner-Services", "intro": "...", "items": { ... } }
  }
}
```

### 3.1 Designprinzipien

- **Ein Namespace `personas`** – keine Aufsplittung pro Persona-Datei.
- **Sprechende Item-Keys** statt Indizes (`security`, `app`, `design` …) für stabile Referenzierung.
- **Gemeinsamer Key `personas.common.ctaLearnMore`** für „Mehr erfahren" (in allen Personas identisch).
- **Persona-spezifische Sektionen** (`cases`, `tools`, `tips`, `partnerServices`, `detailSections`) bleiben unter ihrem Persona-Namen, damit Strukturen vergleichbar sind, aber keine künstliche Vereinheitlichung erzwungen wird.
- **DE = Master-Sprache**, EN strukturgleich (keine Keys auslassen).

---

## 4. Geschätzter Migrationsumfang

| Persona | Hero | Stats | Highlights | Solutions | Cases/Tools/… | CTA | Sub-Sections | Items gesamt |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Bauherr            | 4 | 4 | 6+2 | 4+2 | 3+2 | 4 | – | ~31 |
| Architekt          | 4 | 4 | 6+2 | 4+2 | 3+2 | 4 | – | ~31 |
| Wohnungswirtschaft | 4 | 4 | 6+2 | 4+2 | – | 4 | 9 (×~3) | ~52 |
| Fachplaner         | 4 | 4 | 6+2 | 4+2 | 3+2 | 4 | – | ~31 |
| Handwerk           | 4 | 4 | 6+2 | 4+2 | 3+2 | 4 | – | ~31 |
| Fachhandel         | 4 | 4 | 6+2 | 4+2 | 3+2 | 4 | – | ~31 |
| **Summe (DE)** |  |  |  |  |  |  |  | **~207 Keys** |

EN spiegelt diese Anzahl 1:1.

---

## 5. Empfehlung für die Migration

Die Migration sollte in Teil-Etappen erfolgen, jeweils **eine Persona pro Etappe**, in dieser Reihenfolge (von einfach nach komplex):

1. **15f-1** – Bauherr (Pilot, einfachste Struktur)
2. **15f-2** – Architekt
3. **15f-3** – Fachplaner
4. **15f-4** – Handwerk
5. **15f-5** – Fachhandel
6. **15f-6** – Wohnungswirtschaft (mit `WoWiHero` und allen 9 Detail-Sections – größter Aufwand, am Ende)

Pro Etappe:
- DE-Texte nach `personas.<persona>.*` auslagern
- EN strukturgleich übersetzen
- TSX-Komponente auf `useTranslation("personas")` umstellen
- Layout, Animationen, Icons, ROUTES, Bilder unverändert lassen
- Telefon/E-Mail bleiben hart
- Build prüfen, Sprachumschalter testen

Optional vorab **15f-1a**: gemeinsamer `personas.common.ctaLearnMore` und einmalig in alle Solutions-Sections eingebaut.

---

## 6. Status

- ✅ Inventar erstellt (diese Datei)
- ✅ Key-Struktur vorgeschlagen
- ⏳ Migration folgt in Etappen 15f-1 bis 15f-6
- ❌ Keine TSX- oder JSON-Dateien in dieser Etappe geändert
