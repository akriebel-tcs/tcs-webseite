# Architekturprüfung (nur lesend): Was steckt noch im Code statt in CMS-Light?

Keine Änderung, keine DB-Schreibvorgänge, nichts veröffentlicht. Unten die Bestandsaufnahme
mit Einordnung 1 = redaktionell (gehört in CMS-Light), 2 = technisch (gehört in den Code),
3 = Mischform / Notfall-Fallback. „Remix-fähig" heißt: Eine reine Datenänderung in CMS-Light
würde von einem zweiten Frontend automatisch übernommen.

## A. Bereits sauber DB-first (Remix-fähig)

| Bereich | Pfad | Einordnung |
| --- | --- | --- |
| Seitentexte der Standardseiten | `src/features/cms/hooks/useCmsI18n.ts` (DB vor i18n) | 1, Remix-fähig, solange der Feldschlüssel existiert |
| Haupt- und Fußnavigation (Beschriftung, Reihenfolge, Sichtbarkeit, Hierarchie) | `src/navigation/useNavigationTree.ts`, `src/components/Footer.tsx` | 1, Remix-fähig |
| Nachbarseiten-Navigation | `src/navigation/useSiblingNavigation.ts` | 1, Remix-fähig |
| Sitemap-Baum | `src/features/legal/pages/SitemapPage.tsx` | 1, Remix-fähig (Rubriktitel siehe C) |
| Bilder und Alttexte der Bausteine | `cms.asset(...)`, `CmsOptionalImage` | 1, Remix-fähig |
| Sprachen, Sichtbarkeit, Fallback-Kette | `cms_locales`, `src/navigation/localizedNav.ts`, `src/i18n/localeRegistry.ts` | 1, Remix-fähig |

## B. Bewusst technisch im Code (soll so bleiben)

- `src/app/routes.tsx`, `src/features/*/routes.tsx`: Zuordnung URL → Komponente. Reine Routing-Mechanik.
- `src/navigation/routes.ts`: URL-Konstanten inkl. Legacy-Weiterleitungen. Kein Redaktionswert.
- `src/features/cms/components/sections/*`: Layout, Raster, Interaktion der Bausteine.
- `src/components/Footer.tsx` Zeile 5/166–172: TCS-Logo als Markenbestandteil.
- Formular-, Login- und Produktkatalog-Logik der Sonderseiten (Kontakt, Kontakt-BCM, Serviceportal, Merkliste, Produktdetail).
- Interpolierte/pluralisierte Kleintexte, die `useCmsI18n` bewusst nicht überschreibt (`useCmsI18n.ts:68`).

## C. Mischform oder Notfall-Fallback (die eigentlichen Lücken)

1. **Feste Schlüssel- und Icon-Listen auf Sonderseiten** — `src/features/service/pages/DownloadsPage.tsx:16-61`
   (`QUICK_LINK_KEYS/META`, `FAQ_CATEGORY_KEYS`, `FAQ_ITEM_KEYS` i01–i23, `ORDER_KEYS/META`,
   `ACADEMY_KEYS/ICONS`, `GLOSSARY_GROUPS`). Texte sind DB-first, aber ein neuer FAQ-Eintrag,
   eine neue Schnellverlinkung oder ein anderes Icon braucht Code. **Nicht Remix-fähig.** → 1/3.
2. **Startseiten-Reihenfolge und -Whitelist** — `src/features/home/pages/HomePage.tsx:39-70`
   (`TOP_LEVEL_KEYS`, `FALLBACK_ORDER`, `switch` in `renderTopLevel`). DB-Reihenfolge gewinnt,
   aber nur für die fünf erlaubten Schlüssel plus `block_*`. Neue Startseiten-Bausteinart = Code. → 3.
3. **Breadcrumb-Sonderfälle** — `src/components/AutoBreadcrumb.tsx:30-149`
   (`SERVICE_AREA_FLAT_ROUTES`, `TUEREN_TORE_PRODUCT_ROUTES`, `BREADCRUMB_OVERRIDES`) und
   `src/navigation/breadcrumbVisibility.ts:16-19`. Elternpfade und Ausblendungen stehen im Code
   parallel zur DB. **Nicht Remix-fähig.** → 1/3.
4. **Code↔DB-Schlüsselkarten** — `src/navigation/mainNavDbMap.ts`, `src/navigation/footerDbMap.ts`.
   Nur nötig für den Code-Fallbackpfad; ein zweites Frontend müsste sie nachbauen. → 3, abbaubar.
5. **Meta- und Persona-Navigation** — `src/navigation/metaNavigation.ts:17-51`,
   `src/navigation/personaNavigation.ts:19-56`. Laut Dateikommentar noch nicht an die DB angebunden;
   Beschriftung, Reihenfolge, Ziele komplett Code + i18n. **Nicht Remix-fähig.** → 1.
6. **Bausteintyp-Katalog** — `src/features/cms/components/CmsBodyRenderer.tsx` (`normalizeType`,
   `RENDERERS`, `SKIP_TYPES`, Sonderfall `cards_v1` + `section_key === "products"`) und
   `src/features/admin/lib/rendererSlotMap.ts:29-119`. Ein unbekannter `section_type` in der DB
   rendert nichts. Der Katalog selbst gehört in die DB (`cms_section_types` existiert bereits),
   die Renderer-Implementierung in den Code. → 3.
7. **Sitemap-Rubriktitel** — `src/features/legal/pages/SitemapPage.tsx:30-36` (deutsche/englische
   Bereichsnamen fest im Code). → 1, klein.
8. **Große i18n-Inhaltsdateien als Fallback** — `src/i18n/locales/de|en/anwendungen.json` (2.186 Z.),
   `service.json`, `personas.json`, `gebaeudekommunikation.json`, `zutrittskontrolle.json`,
   `home.json`. Das sind Seiteninhalte, keine Bedienoberflächen-Texte, und damit eine zweite
   Inhaltswahrheit im Repository. Ein zweites Frontend sieht diese Werte nicht. → 3, Rückbaukandidat.
9. **Falsche Fallback-Links** — `src/navigation/footerNavigation.ts` enthält laut Kommentar bewusst
   Platzhalter (`#`) und bekannte Fehlziele. Nur im Fallbackfall sichtbar. → 3, Risiko.
10. **Sonderseiten-Register** — `docs/02-architektur/sonderseiten-register.md/.json`: alle 7 Einträge
    stehen auf „vorlaeufig_registriert"; Beschriftungen und Hinweistexte sollen erst noch nach
    `cms_section_fields` wandern. → 1/2 gemischt, dokumentierter Restpunkt.

## D. Empfehlung: gemeinsamer Daten- und Renderer-Vertrag

Ziel: ein zweites Frontend (Remix) rendert die Website ausschließlich aus CMS-Light, ohne
Repository-Wissen. Vorschlag in vier Verträgen, jeweils als eigener, beauftragbarer Schritt:

1. **Inhaltsvertrag** — CMS-Light ist alleinige Inhaltsquelle. i18n behält nur echte
   Bedienoberflächen-Texte (`common`, `navigation`-UI, Formularhinweise). Inhaltsnamensräume werden
   nach vollständiger DB-Deckung ins Archiv verschoben, nicht gelöscht, bis eine Deckungsprüfung
   je Seite 0 Lücken zeigt.
2. **Strukturvertrag** — Listenartige Inhalte (FAQ, Schnellverlinkungen, Glossar, Akademie,
   Startseiten-Bausteine) werden als echte Kind-Bausteine mit `sort_order` und `is_active` modelliert,
   statt als feste Schlüssellisten im Code. Icons als Feldwert aus einem freigegebenen Icon-Namensraum.
3. **Navigationsvertrag** — auch Meta- und Persona-Navigation sowie Breadcrumb-Elternpfade und
   Ausblendungen kommen aus `cms_navigation_nodes` (Parent-Beziehung + Flag „nicht in Breadcrumb").
   Danach entfallen `mainNavDbMap`, `footerDbMap` und die Override-Karten in `AutoBreadcrumb`.
4. **Renderervertrag** — `cms_section_types` wird führend für erlaubte Typen, Varianten und
   Bildslots; der Code hält nur die Umsetzung je Typ. Ein Abgleichtest bricht, wenn DB-Typen und
   registrierte Renderer auseinanderlaufen. Fallback-Reihenfolgen im Code werden auf einen
   Notfallpfad reduziert, der sichtbar als solcher gekennzeichnet ist.

Reihenfolge-Empfehlung: 3 (Navigation) → 2 (Struktur) → 4 (Renderer) → 1 (i18n-Rückbau), weil
Navigation und Struktur den größten Anteil der nicht Remix-fähigen Stellen auflösen.

## Offene Punkte, die ich lesend nicht abschließend klären konnte

- `MetaNavigation.tsx` habe ich nicht vollständig gelesen; die Aussage „nicht an DB angebunden"
  stammt aus den Dateikommentaren von `metaNavigation.ts`/`personaNavigation.ts`.
- Wie viel der Breadcrumb-Override-Karten durch `useDbBreadcrumb` bereits überflüssig ist.
- Ob dem zweiten Frontend dieselben öffentlichen RPCs zur Verfügung stehen.
