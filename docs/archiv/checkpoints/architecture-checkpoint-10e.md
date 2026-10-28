# Architektur-Checkpoint 10e — Anwendungen-Migration abgeschlossen

> ⚠️ **Historisches Planungs-/Checkpoint-Dokument.** Der Stand kann durch spätere Etappen überholt sein. Aktuelle Referenz sind [`code-landkarte.md`](../02-architecture/code-landkarte.md), [`i18n-strategy.md`](../01-strategy/i18n-strategy.md), [`serviceportal-status.md`](../01-strategy/serviceportal-status.md), [`current-status.md`](../current-status.md) und [`migration-log.md`](../migration-log.md).


**Datum:** 2026-04-21
**Status:** `anwendungen` technisch vollständig migriert
**Vorgänger-Checkpoints:** [5d](./architecture-checkpoint-5d.md), [8d](./architecture-checkpoint-8d.md)

---

## 1. Status

Die Feature-Domain `anwendungen` ist nach Abschluss der Etappen **10b**, **10b-cleanup**, **10c**, **10c-cleanup**, **10d** und **10d-cleanup** technisch vollständig in die Zielstruktur überführt.

Es existiert kein verbleibender Anwendungscode mehr unter `src/pages/anwendungen/` oder `src/data/`.

---

## 2. Verschobene Bereiche

| Bereich | Etappe | Anzahl Dateien |
|---|---|---|
| `AnwendungDetailPage` (gemeinsame Komponente) | 10b | 1 |
| `referenzprojekte.ts` (Datendatei) | 10b | 1 |
| Hub-/Übersichtsseiten (Anwendungen, Objektloesungen, Bildungseinrichtungen, Wohnbau, Gesundheitseinrichtungen, OeffentlicheHand) | 10b | 6 |
| Referenzseiten (ReferenzprojektePage, ReferenzprojektDetailPage) | 10b | 2 |
| Wohnbau-Detailseiten (Einfamilienhaus, Mehrfamilienhaus, Grossanlage, Sanierung) | 10c | 4 |
| Gesundheits-Detailseiten (Pflege, Klinik) | 10c | 2 |
| Öffentliche-Hand-Detailseiten (Behoerde, Feuerwehr, Schwimmbad) | 10c | 3 |
| Systemfunktionen/Grenzfälle (Concierge, InterneKommunikation, DigitaleNamensverwaltung, Feuerwehrdurchsage, BidirektionaleVideo, MobileTuerkommunikation, ZutrittskontrolleBCM) | 10d | 7 |
| **Summe** | | **26 Dateien** |

---

## 3. Aktuelle Zielstruktur

```
src/features/anwendungen/
├── components/
│   └── AnwendungDetailPage.tsx
├── data/
│   └── referenzprojekte.ts
├── pages/
│   ├── AnwendungenPage.tsx
│   ├── ObjektloesungenPage.tsx
│   ├── BildungseinrichtungenPage.tsx
│   ├── WohnbauPage.tsx
│   ├── GesundheitseinrichtungenPage.tsx
│   ├── OeffentlicheHandPage.tsx
│   ├── ReferenzprojektePage.tsx
│   ├── ReferenzprojektDetailPage.tsx
│   ├── EinfamilienhausPage.tsx
│   ├── MehrfamilienhausPage.tsx
│   ├── GrossanlagePage.tsx
│   ├── SanierungPage.tsx
│   ├── PflegePage.tsx
│   ├── KlinikPage.tsx
│   ├── BehoerdePage.tsx
│   ├── FeuerwehrPage.tsx
│   ├── SchwimmbadPage.tsx
│   ├── ConciergePage.tsx
│   ├── InterneKommunikationPage.tsx
│   ├── DigitaleNamensverwaltungPage.tsx
│   ├── FeuerwehrdurchsagePage.tsx
│   ├── BidirektionaleVideoPage.tsx
│   ├── MobileTuerkommunikationPage.tsx
│   └── ZutrittskontrolleBCMPage.tsx
└── (assets/ bewusst nicht angelegt — kein Asset-Move in 10b–10d)
```

---

## 4. Hinweise zur Migration

- `src/pages/anwendungen/` existiert nicht mehr (am Ende von 10d automatisch entfernt).
- `src/data/` existiert nicht mehr (am Ende von 10b automatisch entfernt).
- Alle `AnwendungDetailPage`-Importe zeigen auf `@/features/anwendungen/components/AnwendungDetailPage`.
- Alle `referenzprojekte`-Importe zeigen auf `@/features/anwendungen/data/referenzprojekte`.
- Verifiziert: 0 Treffer für `@/components/AnwendungDetailPage` und `@/data/referenzprojekte` im gesamten `src/`.
- Alle 24 Routen unter `/anwendungen/*`, `/objektloesungen` und `/bildungseinrichtungen` byte-identisch.

---

## 5. Bewusst unverändert

- **Routen:** alle URLs byte-identisch
- **Seitentexte:** keine Textmigration, keine Konsolidierung
- **Layouts:** keine Layoutänderung
- **Lokale Assets:** `block-objekt.jpg`, `feature-sanierung.png` bleiben in `src/assets/`
- **Externe Bild-URLs:** ~30+ `tcsag.de` / `tcsag-web.lovable.app`-URLs unverändert (kein Self-Hosting)
- **Navigation:** `mainNavigation.ts`, `footerNavigation.ts`, `personaNavigation.ts`, `metaNavigation.ts` unangetastet
- **Renderer:** `MainNavigation`, `Footer`, `MetaNavigation` unangetastet
- **i18n-Locales:** `src/i18n/locales/{de,en}/*.json` unangetastet
- **PersonaContext, PersonaSection:** unangetastet
- **Generische Komponenten:** `PageLayout`, `ContentSection`, `FeatureBlock`, `Carousel` bleiben in `src/components/`

---

## 6. Offene fachliche Punkte

Diese Themen wurden bewusst aus Etappen 10b–10d ausgeklammert und benötigen Marketing-/Produktentscheidungen vor weiterer Bearbeitung:

- **Inhaltliche Überschneidung** einiger Anwendungsseiten mit Produkt-/Systemdomains (Anwendungssicht ≠ Produktsicht — beide bleiben getrennt nebeneinander stehen).
- **`Grossanlage` (Singular)** unter `/anwendungen/grossanlage` vs. **`Grossanlagen` (Plural)** unter `/grossanlagen` (Domain `gebaeudekommunikation`) — zwei separate Seiten zu ähnlichem Thema.
- **Mobile Türkommunikation / Feuerwehrdurchsage / BidirektionaleVideo / InterneKommunikation** haben thematische Nähe zu `gebaeudekommunikation/systemloesungen` — bleiben aber als Use-Case-Sicht in `anwendungen`.
- **`ZutrittskontrolleBCM`** hat thematische Nähe zur Domain `zutrittskontrolle` — bleibt aber als Use-Case-Sicht in `anwendungen`.
- **`DigitaleNamensverwaltung`** hat thematische Nähe zu `gebaeudemanagement/DigitaleNamensanzeige` — bleibt aber als Use-Case-Sicht in `anwendungen`.
- **Referenzprojekte** (`referenzprojekte.ts`, 12 Datensätze): später ggf. Auslagerung in Supabase/Datenbank/CMS.

---

## 7. Offene technische Punkte

- **Seitentext-i18n** für Anwendungen (Namespace `anwendungen` noch nicht angelegt; bisher nur Navigation i18n DE/EN aktiv).
- **Mögliche spätere Asset-Lokalisierung**: aktuell ~30+ externe Bild-URLs, plus 2 lokale Assets, die in `anwendungen/assets/` wandern könnten (sobald Use-Case-Exklusivität geklärt ist).
- **Mögliche spätere Filter-/Datenlogik** für Referenzprojekte (Kategorien, Suche, Pagination).
- **Mögliche spätere SEO-/Slug-Strategie** (Meta-Tags, JSON-LD, Sitemap, kanonische URLs, `/de`-/`/en`-Routen).
- **Persistenter `@tanstack/query-core`-Build-Hinweis** (unverändert seit 6c, nicht migrationsbedingt).

---

## 8. Empfehlung

1. **`anwendungen` zunächst fachlich nicht weiter konsolidieren** — die Use-Case-Sicht steht bewusst neben der Produktsicht. Inhaltliche Überschneidungen sind Produktentscheidung, kein technisches Problem.
2. **Erst Strukturmigration der restlichen Seiten fertigstellen**, bevor an `anwendungen` inhaltlich weitergearbeitet wird:
   - `service` (TechnischerSupport, Akademie, Downloads, Ersatzteile, Serviceportal, PlanenKonfigurieren)
   - `wissen` (UeberTCS, Karriere, Presse)
   - `kontakt`, `legal`, Auth-Seiten (Registrieren, PasswortVergessen)
3. **Danach Navigation/Links/URL/i18n gesondert bearbeiten**:
   - Footer-Pending-Links auflösen (5 Anwendungen-Links, Bottom-Bar-Legal, Produkte-Dubletten)
   - Eingangssysteme-Subrouten finalisieren
   - Seitentext-i18n (Namespaces je Domain) aktivieren
   - `/de`-/`/en`-Routing
4. **Inhaltliche Konsolidierung** (Grossanlage, BCM, DigitaleNamensverwaltung etc.) erst nach Marketing-/Produktentscheidung — als eigene Etappenreihe nach Abschluss aller Strukturmigrationen.

---

## 9. Bezug zu vorherigen Checkpoints

- **Checkpoint 5d** (nach `zutrittskontrolle` + `eingangssysteme`): Architekturprinzipien etabliert.
- **Checkpoint 8d** (nach 5 Domains): Empfehlung war Reihenfolge `personas` → `anwendungen` → `service`/`wissen`. Personas sind in 9b/9c, Anwendungen in 10b–10d abgeschlossen.
- **Checkpoint 10e** (jetzt): 7 von voraussichtlich ~9 Feature-Domains technisch migriert (`zutrittskontrolle`, `eingangssysteme`, `gebaeudemanagement`, `gebaeudekommunikation`, `signage`, `personas`, `anwendungen`).
- **Nächster Block:** `service` (umfangreichster verbliebener Bereich) oder `wissen` (kleiner, schneller Move).
