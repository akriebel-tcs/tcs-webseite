# Batch 1 — Vorprüfung „Hero zentral gaten"

Stand: 2026-06-04

## 1. Wo wird Hero zentral gerendert?

- `src/components/PageLayout.tsx` — der eigentliche `<section data-cms-section="hero">`-Block (Eyebrow/Headline/Subheader/Intro + responsive Bild). Einziger Code-Ort, der den Hero-Block tatsächlich ausgibt.
- `src/features/cms/components/CmsPageLayout.tsx` — dünner Wrapper, der Hero-Texte/Bilder DB-first aus `cms_section_fields` und `cms_assets` zieht und an `PageLayout` weiterreicht.
- `src/features/cms/components/GenericCmsPage.tsx` — vollständig DB-getriebener Seiten-Renderer, baut intern auf `CmsPageLayout`.
- `src/components/HeroSection.tsx` — Sondervariante nur für `home.start`, eingebunden in `src/features/home/pages/HomePage.tsx`. HomePage gated bereits über `dbOrder` (RLS-gefilterte `cms.sections`); kein Eingriff nötig.

## 2. Wie erkennt man zuverlässig, ob die Hero-Section aktiv ist?

- RLS `cms_sections public read published` filtert auf `is_active = true`. Inaktive Sections sind im anon-Read nicht sichtbar.
- `useCmsPageContent` setzt zusätzlich `.eq("is_active", true)`. `cms.sections` enthält damit ausschließlich aktive Sections.
- Test im Layout: `cms.sections.some(s => !s.parent_section_key && s.section_key === "hero")` ⇒ Hero ist aktiv. False ⇒ Hero ist im Admin ausgeblendet (oder gar nicht in DB).
- Section-Type-Normalisierung (`hero_v1` etc.) ist hier irrelevant, weil der `section_key` global `"hero"` lautet (104 Zeilen in `cms_sections` bestätigen das, davon 13 mit `section_type='content_v1'`).

## 3. Welche Pages laufen über `CmsPageLayout`?

35 Page-Dateien (direkt) + 51 Pages über `GenericCmsPage` (transitiv). Komplette Liste:

- direkt: alle Pages in `src/features/eingangssysteme/pages/*`, `src/features/anwendungen/pages/{Anwendungen,Objektloesungen,Bildungs…,Gesundheit…,Oeffentliche…,Referenzprojekte}Page.tsx`, `src/features/gebaeudekommunikation/pages/{Tuerkommunikation,Tuersprechanlagen,Systemloesungen}Page.tsx`, `src/features/gebaeudemanagement/pages/{Gebaeudemanagement,Alarmanlagenkopplung}Page.tsx`, `src/features/zutrittskontrolle/pages/FahrstuhlsteuerungPage.tsx`, `src/features/signage/pages/*`, `src/features/service/pages/{Service,Ersatzteile,TechnischerSupport,Downloads}Page.tsx`, `src/features/produkte/pages/{ProduktHub,CategoryList}Page.tsx`, `src/features/wissen/pages/AkademiePage.tsx`.
- transitiv via `GenericCmsPage`: alle übrigen über `<GenericCmsPage pageKey="…" />` aufgesetzten Pages (siehe Inventar).

## 4. Welche Hero-Medium-Befunde würden durch einen zentralen Guard verschwinden?

23 Hero-Befunde der Klasse `PUBLIC_BLOCK_IGNORIERT_DB_VISIBILITY` mit `confidence=medium` und `section_key="hero"`. Nach Einbau des Guards + Audit-Anpassung: erwartet → 0 Hero-Befunde dieser Klasse für Pages, die `CmsPageLayout`/`GenericCmsPage` benutzen.

## 5. Seiten ohne CMS-Hero-Section / Sonderfälle

Pages, die `PageLayout` direkt importieren (ohne `CmsPageLayout`/`GenericCmsPage`) — Guard greift hier nicht automatisch, müssen einzeln betrachtet werden:

- `src/features/legal/pages/{Impressum,Datenschutz,Agb}Page.tsx`
- `src/features/service/pages/ProductDetailPage.tsx`
- `src/features/anwendungen/pages/{Anwendungen,ReferenzprojektDetail}Page.tsx`
- `src/features/anwendungen/components/AnwendungDetailPage.tsx`
- `src/features/zutrittskontrolle/pages/{Vorhaengeschloss,BcmOnlineLeser,ElektronischeDrueckergarnitur,BcmHandsender,ElektronischerKnaufzylinder,FunkvernetzteOfflineLeser}Page.tsx`

Diese Seiten haben in der DB einen `hero`-Eintrag (Stand 2026-06-04 alle `is_active=true`), würden aber im aktuellen Code beim Aus-Schalten nicht reagieren. Geplante Folge-Behandlung: Batch 2 (Codemod für Zutrittskontrolle-Sub-Pages) bzw. Migration auf `GenericCmsPage` / `CmsPageLayout`.

## Fazit

Zentraler Guard in `CmsPageLayout` ist machbar und deckt 86 Pages ab. Die ~14 verbleibenden Plain-`PageLayout`-Pages bleiben für Batch 2/3.
