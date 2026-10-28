# Architektur-Checkpoint 5d

> ⚠️ **Historisches Planungs-/Checkpoint-Dokument.** Der Stand kann durch spätere Etappen überholt sein. Aktuelle Referenz sind [`code-landkarte.md`](../02-architecture/code-landkarte.md), [`i18n-strategy.md`](../01-strategy/i18n-strategy.md), [`serviceportal-status.md`](../01-strategy/serviceportal-status.md), [`current-status.md`](../current-status.md) und [`migration-log.md`](../migration-log.md).


Stand: 2026-04-20
Status: Dokumentation. Kein Produktivcode geändert.

Dieser Checkpoint dokumentiert den technischen Zwischenstand nach der Navigation-i18n-Aktivierung und der Migration der ersten beiden Feature-Domains (`zutrittskontrolle`, `eingangssysteme`).

Bezugsdokumente:
- [`docs/architecture.md`](../02-architecture/architecture.md)
- [`docs/migration-mapping.md`](../03-inventories/migration-mapping.md)
- [`docs/asset-strategy.md`](../01-strategy/asset-strategy.md)
- [`docs/navigation-inventory.md`](../03-inventories/navigation-inventory.md)
- [`docs/pilot-zutrittskontrolle-plan.md`](./pilot-zutrittskontrolle-plan.md)
- [`docs/pilot-eingangssysteme-plan.md`](./pilot-eingangssysteme-plan.md)
- [`docs/migration-log.md`](../migration-log.md)

---

## 1. Zusammenfassung des aktuellen Standes

### Migrierte Feature-Domains
- `src/features/zutrittskontrolle/` — 5 Pages (Etappe 3b/3c)
- `src/features/eingangssysteme/` — 8 Pages, 1 lokales Asset (Etappe 5b/5c)

### Noch nicht migrierte Domains (weiterhin in `src/pages/`)
- `gebaeudekommunikation` (Tuerkommunikation, Tuersprechanlagen, DigitaleNamensanzeige, Briefkastenanlagen, …)
- `gebaeudemanagement` (Gebaeudemanagement, Serviceportal, Systemtechnik/SnipdooIp)
- `signage` / `digitalsignage` / `beschilderung`
- `anwendungen` (`src/pages/anwendungen/*`, ~17 Seiten + Referenzprojekt-Detail)
- `personas` (BauherrenContent, ArchitektenContent, FachhandelContent, FachplanerContent, HandwerkContent, WohnungswirtschaftContent — aktuell als Komponenten in `src/components/`)
- `service` / `technischer-support` / `ersatzteile` / `downloads` / `akademie`
- `wissen` / `presse` / `karriere` / `kontakt` / `ueber-tcs` / `passwort-vergessen` / `registrieren`
- `objektloesungen` / `systemloesungen` / `bildungseinrichtungen` / `grossanlagen` / `schraenke-behaelter` / `planen-konfigurieren` / `reservieren-buchen`

### Zentralisierte Navigation
- `src/navigation/types.ts` — Typen (`NavItem`, `PersonaItem`, `LinkType`, `Badge`, `status`)
- `src/navigation/routes.ts` — Route-Konstanten
- `src/navigation/mainNavigation.ts` — 6 Top-Level + 29 Kinder
- `src/navigation/footerNavigation.ts` — 4 Spalten + Bottom-Bar
- `src/navigation/personaNavigation.ts` — 6 Personas
- `src/navigation/metaNavigation.ts` — 4 Meta-Links
- Renderer angeschlossen: `MainNavigation.tsx`, `Footer.tsx`, `MetaNavigation.tsx`

### i18n-Struktur
- `react-i18next` initialisiert in `src/i18n/index.ts` und `src/main.tsx`
- Aktive Namespaces: `common`, `navigation`
- `src/i18n/locales/de/navigation.json` (106 Keys, aktiv)
- `src/i18n/locales/en/navigation.json` (106 Keys, vorbereitet, identische Key-Struktur)
- Default-Sprache: `de`. Fallback: `de`. Kein LanguageDetector. Kein http-backend.

### Noch nicht aktiviert / nicht vorhanden
- Sichtbarer Sprachumschalter
- `/de`-/`/en`-Routing
- i18n-Migration der Seiteninhalte (alle Domains)
- Persona-Inhalte in i18n
- Footer-Link-Aktivierungen (12 `pending`/`placeholder`-Einträge)
- Eingangssysteme-Subroute-Aktivierungen in MainNavigation (4 `pending`-Kinder)
- Admin / CMS / Supabase / Lovable Cloud
- Produktkatalog / strukturierte Downloads / Datenbankanbindung

---

## 2. Bereits abgeschlossene technische Struktur

```
src/
├── features/
│   ├── zutrittskontrolle/
│   │   ├── pages/
│   │   │   ├── ZutrittskontrollePage.tsx
│   │   │   ├── MobilerZutrittPage.tsx
│   │   │   ├── TuerenTorePage.tsx
│   │   │   ├── ZufahrtenParkplaetzePage.tsx
│   │   │   └── FahrstuhlsteuerungPage.tsx
│   │   └── assets/  (5 Unterordner, 11 lokale Assets)
│   └── eingangssysteme/
│       ├── pages/
│       │   ├── EntrySystemPage.tsx
│       │   ├── EntryDesignPage.tsx
│       │   ├── EntryFunktionalitaetPage.tsx
│       │   ├── EntryMaterialPage.tsx
│       │   ├── EntryIntegrationsformenPage.tsx
│       │   ├── EntryReferenzenPage.tsx
│       │   ├── EntryStandardsPage.tsx
│       │   └── EntryBeratungPage.tsx
│       └── assets/
│           └── hero-entry.jpg
├── navigation/
│   ├── types.ts
│   ├── routes.ts
│   ├── mainNavigation.ts
│   ├── footerNavigation.ts
│   ├── personaNavigation.ts
│   ├── metaNavigation.ts
│   └── README.md
└── i18n/
    ├── index.ts
    ├── types.ts
    ├── README.md
    └── locales/
        ├── de/
        │   ├── common.json
        │   └── navigation.json   (106 Keys, aktiv)
        └── en/
            ├── common.json
            └── navigation.json   (106 Keys, vorbereitet)
```

---

## 3. Architekturprinzipien, die jetzt gelten

1. **Feature-Domains statt flacher pages-Struktur**: Neue oder migrierte Bereiche liegen unter `src/features/<domain>/pages/` mit `Page`-Suffix.
2. **Assets folgen Features**: Domain-exklusive Assets gehören in `src/features/<domain>/assets/`. Mehrfach genutzte Assets bleiben in `src/assets/` oder wandern nach `src/shared/assets/`.
3. **Navigation als Datenstruktur**: Sichtbare Hauptnavigation, Footer, MetaNavigation, Persona-Leiste werden aus `src/navigation/*.ts` gerendert. Renderer enthalten keine Hardcoded-Linklisten mehr.
4. **Texte in Navigation über i18n**: MainNavigation, Footer, MetaNavigation nutzen `useTranslation("navigation")`. Lokale DE-Fallback-Maps wurden entfernt.
5. **Routen bleiben vorerst unverändert**: Auch wenn Domain-Ordner deutsch heißen (`eingangssysteme`), bleiben URLs wie `/entry-system` byte-identisch. Bewusste Trennung URL ↔ Code.
6. **Keine Slug-Reform ohne separate Entscheidung**: Routen-Reorganisation (`/entry-system` → `/eingangssysteme`) ist eine eigene, ausdrücklich zu beauftragende Etappe.
7. **Externe Tools bleiben außerhalb**: Serviceportal-, Reservierungs- und sonstige externe Plattformen werden nicht in den Code integriert. Nur Verlinkung.
8. **Platzhalterlinks bleiben erhalten**: `pending`/`placeholder`-Einträge in der Navigation werden bis zur Content-/Navigationsfreigabe nicht entfernt oder umgebogen.
9. **Migration in kleinen, reversiblen Etappen**: Jede Etappe ändert nur das, was im Plan steht. Build muss nach jeder Etappe grün sein. Rollback per `git revert` möglich.
10. **Keine Textänderungen während Strukturmigration**: Strukturmigration und Textmigration sind getrennte Schritte.

---

## 4. Offene größere Themen

| Thema | Status | Bemerkung |
|---|---|---|
| Seitentexte i18n-migrieren | offen | Alle Pages außerhalb der Navigation sind hartcodiert deutsch. Pro Domain separater Namespace empfohlen. |
| `/de`-/`/en`-Routing | offen | React-Router-Konfiguration anzupassen. Erst nach Volltext-i18n sinnvoll. |
| Sichtbarer Sprachumschalter | offen | Voraussetzung: Volltext-i18n und Routing-Entscheidung. |
| Restliche Pages aus `src/pages/` migrieren | offen | Siehe Abschnitt 5. |
| Externe jimcdn.com-Bilder Eingangssysteme | offen | 42 Hotlinks. Separate Etappe „Asset-Lokalisierung Eingangssysteme". |
| Footer-Link-Aktivierungen/-Korrekturen | offen | 12 tote/Platzhalter-Einträge dokumentiert in `navigation-inventory.md`. Eigene Korrekturetappe geplant. |
| MainNavigation: Eingangssysteme-Subroute-Linkkorrektur | offen | 4 `pending`-Kinder zeigen aktuell auf `/entry-system`. |
| Persona-Inhalte aus `src/components/*Content.tsx` herauslösen | offen | Aktuell als Komponenten implementiert, gehören perspektivisch in `src/features/personas/<persona>/`. |
| Admin / CMS / Supabase Storage | offen | Noch nicht entschieden. Wenn benötigt: Lovable Cloud aktivieren. |
| Produktkatalog / strukturierte Downloads | offen | Datenbanklastiges Thema, separat zu konzipieren. |
| Bundle-Größe (>500 kB Hauptchunk) | beobachten | Build-Warnung. Code-Splitting nach Domain perspektivisch sinnvoll. |

---

## 5. Nächste mögliche Domains

| Domain | Umfang grob | Risiko grob | Asset-Komplexität | Empfehlung |
|---|---|---|---|---|
| `gebaeudemanagement` | klein bis mittel (Gebaeudemanagement.tsx, Serviceportal.tsx, ggf. SnipdooIp.tsx) | niedrig | gering | **geeignet als nächste Domain** |
| `gebaeudekommunikation` | groß (Tuerkommunikation, Tuersprechanlagen, DigitaleNamensanzeige, Briefkastenanlagen, DigitalSignage, Signage, Beschilderung, Grossanlagen) | mittel–hoch (Überschneidungen Signage/Großanlagen/Briefkasten/Türkommunikation, Persona-Bezüge) | mittel | später, **vorher planen** |
| `anwendungen` | sehr groß (~17 Pages unter `src/pages/anwendungen/` + Referenzprojekt-Detail + `src/data/referenzprojekte.ts`) | mittel (Datenstruktur, Detailroute mit Slug-Param) | mittel | später, **vorher detailliert planen** |
| `service` | mittel (TechnischerSupport, Ersatzteile, Downloads, Akademie, ReservierenBuchen, PlanenKonfigurieren) | mittel (externe Tools, Downloads, Platzhalterlinks) | gering | später, externe Tools zuerst inventarisieren |
| `wissen` | klein–mittel (UeberTCS, Presse, Karriere) | niedrig–mittel (Karriere ggf. extern) | gering | später, parallelisierbar mit `service` |

Weitere offene Bereiche, die in keine der fünf Hauptdomains passen und gesondert zugeordnet werden müssen:
- `personas/*` (aktuell `src/components/*Content.tsx`)
- `objektloesungen`, `systemloesungen`, `bildungseinrichtungen`, `grossanlagen`, `schraenke-behaelter` — Zuordnung zu `anwendungen` oder eigener Domain offen
- `kontakt`, `passwort-vergessen`, `registrieren` — Zuordnung zu `service` oder eigener Domain offen

---

## 6. Empfehlung für den nächsten Schritt

**Empfehlung: Zunächst die nächste Domain planen, nicht sofort migrieren.**

**Bevorzugte nächste Planungsdomain: `gebaeudemanagement`**
- Kleiner Umfang (3 Seiten, davon eine optional).
- Niedriges Risiko: keine bekannten Überschneidungen mit anderen Domains.
- Asset-Komplexität gering.
- Eignet sich gut, um das eingespielte Migrationsmuster (Plan → Migration → Cleanup) ein drittes Mal sauber durchzuziehen.

**Alternative: `gebaeudekommunikation`** — ausdrücklich nicht empfohlen als Nächstes, weil:
- Mehr Seiten (Tuerkommunikation, Tuersprechanlagen, DigitaleNamensanzeige, Briefkastenanlagen, ggf. DigitalSignage/Signage/Beschilderung/Grossanlagen).
- Inhaltliche Überschneidungen Signage ↔ Beschilderung ↔ DigitaleNamensanzeige sind nicht abschließend geklärt.
- Briefkastenanlagen/Großanlagen-Zuordnung zwischen `gebaeudekommunikation` und `eingangssysteme` ist im Mapping noch zu schärfen.
- Höheres Risiko, beim Move stillschweigend Inhalte umzuhängen.

**Nicht als Nächstes geeignet:**
- `anwendungen` — viele Pages, Referenzdaten, Detailroute. Erst nach detailliertem Plan und ggf. Trennung zwischen Branchen/Anwendungen/Referenzen.
- `service` / `wissen` — externe Tools (Serviceportal, Akademie, Reservieren/Buchen), Platzhalterlinks und Karriereportal müssen vorher inventarisiert werden.

**Konkreter nächster Schritt:** Etappe 6a — `docs/pilot-gebaeudemanagement-plan.md` erstellen, analog zu `pilot-eingangssysteme-plan.md`. Reine Planung, kein Code.

---

## 7. Rechnung / Leistungsdokumentation

Konzeption, Strukturierung und technische Vorbereitung der TCS-Unternehmenswebseite inkl. Feature-Domain-Architektur, Asset-Strategie, Navigationsdatenmodell, DE/EN-i18n-Grundlage sowie Migration erster Pilot-Domains.
