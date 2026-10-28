# Renderer-/Fallback-Inventar — Sprint 2g

_Generiert: 2026-09-12T06:16:05.928Z_

Read-only Inventar aller Public-Pages unter `src/features/**/pages/**` und `src/app/pages/**`. Keine DB-Änderung, kein Public-Renderer-Change.

## Klassen-Verteilung

| Klasse | Bedeutung | Anzahl |
|---|---|---:|
| G0 | vollständig generisch (CmsBodyRenderer, schlanke Hülle) | 2 |
| G1 | generisch + page-spezifische Hülle | 4 |
| S1 | Spezialrenderer, DB-first (useCmsI18n) | 47 |
| S2 | Spezialrenderer mit DB + i18n-Fallback | 15 |
| S3 | Spezialrenderer mit Hardcoding / kein useCmsI18n | 17 |
| P1 | Produktdatenbank-/Katalog-getrieben | 1 |
| L1 | Legacy / Preview / Stage | 0 |

## Risiko-Verteilung

- **medium**: 16
- **low**: 52
- **high**: 17
- **kein CMS-Light-Ziel**: 1

## D9/R2-Bezug (`content_v1 → card_v1`)

Betroffene Page-Keys aus dem Drift-Audit: **0**.
Davon im Page-Inventar erkannt: **0**.

## Vollständige Matrix

| Page-Key | Datei | Klasse | Risiko | CmsBody | useCmsI18n | useCmsPage | direct i18n | ProductDB | local assets | hard arrays | JSX-Text-Zeilen | R2 | Begründung |
|---|---|---|---|---|---|---|---|---|---|---|---:|---|---|
| … | `src/features/cms/components/GenericCmsPage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| _(unbekannt)_ | `src/features/anwendungen/components/AnwendungDetailPage.tsx` | S2 | medium | · | · | ✓ | ✓ | · | · | · | 0 | · | Spezialrenderer + i18n-Fallback gemischt |
| _(unbekannt)_ | `src/features/legal/pages/LegalSimplePage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| _(unbekannt)_ | `src/features/produkte/merkliste/MerklistePage.tsx` | S3 | high | · | · | · | ✓ | · | · | · | 0 | · | Spezialrenderer mit i18n und/oder Hardcoding (kein useCmsI18n) |
| _(unbekannt)_ | `src/features/produkte/pages/CategoryListPage.tsx` | S2 | medium | · | · | ✓ | ✓ | · | · | · | 0 | · | Spezialrenderer + i18n-Fallback gemischt |
| _(unbekannt)_ | `src/features/service/pages/ProductDetailPage.tsx` | P1 | kein CMS-Light-Ziel | · | · | · | ✓ | ✓ | · | ✓ | 0 | · | Produktdatenbank-/Katalog-Joins; hartcodierte Daten-Arrays vorhanden |
| _(unbekannt)_ | `src/app/pages/NotFoundPage.tsx` | S3 | high | · | · | · | ✓ | · | · | · | 0 | · | Spezialrenderer mit i18n und/oder Hardcoding (kein useCmsI18n) |
| anwendungen.behoerde | `src/features/anwendungen/pages/BehoerdePage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| anwendungen.bidirektionale-video | `src/features/anwendungen/pages/BidirektionaleVideoPage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| anwendungen.bildungseinrichtungen | `src/features/anwendungen/pages/BildungseinrichtungenPage.tsx` | S2 | medium | · | · | ✓ | ✓ | · | · | · | 0 | · | Spezialrenderer + i18n-Fallback gemischt |
| anwendungen.concierge | `src/features/anwendungen/pages/ConciergePage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| anwendungen.digitale-namensverwaltung | `src/features/anwendungen/pages/DigitaleNamensverwaltungPage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| anwendungen.feuerwehr | `src/features/anwendungen/pages/FeuerwehrPage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| anwendungen.feuerwehrdurchsage | `src/features/anwendungen/pages/FeuerwehrdurchsagePage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| anwendungen.gesundheitseinrichtungen | `src/features/anwendungen/pages/GesundheitseinrichtungenPage.tsx` | S2 | medium | · | · | ✓ | ✓ | · | · | · | 0 | · | Spezialrenderer + i18n-Fallback gemischt |
| anwendungen.grossanlage | `src/features/anwendungen/pages/GrossanlagePage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| anwendungen.interne-kommunikation | `src/features/anwendungen/pages/InterneKommunikationPage.tsx` | S2 | medium | · | · | ✓ | ✓ | · | · | · | 0 | · | Spezialrenderer + i18n-Fallback gemischt |
| anwendungen.kindertagesstaetten | `src/features/anwendungen/pages/KindertagesstaettenPage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| anwendungen.klinik | `src/features/anwendungen/pages/KlinikPage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| anwendungen.mehrfamilienhaus | `src/features/anwendungen/pages/MehrfamilienhausPage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| anwendungen.objektloesungen | `src/features/anwendungen/pages/ObjektloesungenPage.tsx` | S2 | medium | · | · | ✓ | ✓ | · | · | · | 0 | · | Spezialrenderer + i18n-Fallback gemischt |
| anwendungen.oeffentliche-hand | `src/features/anwendungen/pages/OeffentlicheHandPage.tsx` | S2 | medium | · | · | ✓ | ✓ | · | · | · | 0 | · | Spezialrenderer + i18n-Fallback gemischt |
| anwendungen.pflege | `src/features/anwendungen/pages/PflegePage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| anwendungen.referenzprojekte | `src/features/anwendungen/pages/ReferenzprojektePage.tsx` | S2 | medium | · | · | ✓ | ✓ | · | · | · | 0 | · | Spezialrenderer + i18n-Fallback gemischt |
| anwendungen.referenzprojekte.${project.slug} | `src/features/anwendungen/pages/ReferenzprojektDetailPage.tsx` | S1 | low | · | ✓ | ✓ | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| anwendungen.root | `src/features/anwendungen/pages/AnwendungenPage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| anwendungen.sanierung | `src/features/anwendungen/pages/SanierungPage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| anwendungen.schule | `src/features/anwendungen/pages/SchulePage.tsx` | S3 | high | · | · | · | · | · | · | · | 0 | · | nur Hardcoding, keine CMS-Anbindung erkennbar |
| anwendungen.schwimmbad | `src/features/anwendungen/pages/SchwimmbadPage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| anwendungen.wohnbau | `src/features/anwendungen/pages/WohnbauPage.tsx` | S3 | high | · | · | · | · | · | · | · | 0 | · | nur Hardcoding, keine CMS-Anbindung erkennbar |
| anwendungen.wohnheim | `src/features/anwendungen/pages/WohnheimPage.tsx` | S3 | high | · | · | · | · | · | · | · | 0 | · | nur Hardcoding, keine CMS-Anbindung erkennbar |
| anwendungen.zutrittskontrolle-bcm | `src/features/anwendungen/pages/ZutrittskontrolleBCMPage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| eingangssysteme.beratung | `src/features/eingangssysteme/pages/EntryBeratungPage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| eingangssysteme.design | `src/features/eingangssysteme/pages/EntryDesignPage.tsx` | G0 | low | ✓ | ✓ | · | · | · | · | · | 0 | · | CmsBodyRenderer + sehr schlanke Hülle |
| eingangssysteme.funktionalitaet | `src/features/eingangssysteme/pages/EntryFunktionalitaetPage.tsx` | G1 | low | ✓ | ✓ | · | · | · | · | · | 0 | · | CmsBodyRenderer + page-spezifische Hülle |
| eingangssysteme.integrationsformen | `src/features/eingangssysteme/pages/EntryIntegrationsformenPage.tsx` | G0 | low | ✓ | ✓ | ✓ | · | · | · | · | 0 | · | CmsBodyRenderer + sehr schlanke Hülle |
| eingangssysteme.material | `src/features/eingangssysteme/pages/EntryMaterialPage.tsx` | G1 | low | ✓ | ✓ | ✓ | · | · | · | · | 0 | · | CmsBodyRenderer + page-spezifische Hülle |
| eingangssysteme.referenzen | `src/features/eingangssysteme/pages/EntryReferenzenPage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| eingangssysteme.root | `src/features/eingangssysteme/pages/EntrySystemPage.tsx` | S2 | medium | · | ✓ | · | · | · | · | ✓ | 0 | · | Spezialrenderer + i18n-Fallback gemischt; hartcodierte Daten-Arrays vorhanden |
| eingangssysteme.standards | `src/features/eingangssysteme/pages/EntryStandardsPage.tsx` | G1 | low | ✓ | ✓ | · | · | · | · | · | 0 | · | CmsBodyRenderer + page-spezifische Hülle |
| gebaeudekommunikation.beschilderung | `src/features/signage/pages/BeschilderungPage.tsx` | S1 | low | · | ✓ | ✓ | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| gebaeudekommunikation.briefkastenanlagen | `src/features/gebaeudekommunikation/pages/BriefkastenanlagenPage.tsx` | S3 | high | · | · | · | · | · | · | · | 0 | · | nur Hardcoding, keine CMS-Anbindung erkennbar |
| gebaeudekommunikation.grossanlagen | `src/features/gebaeudekommunikation/pages/GrossanlagenPage.tsx` | S3 | high | · | · | · | · | · | · | · | 0 | · | nur Hardcoding, keine CMS-Anbindung erkennbar |
| gebaeudekommunikation.root | `src/features/gebaeudekommunikation/pages/TuerkommunikationPage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| gebaeudekommunikation.snipdoo-ip | `src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| gebaeudekommunikation.systemloesungen | `src/features/gebaeudekommunikation/pages/SystemloesungenPage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| gebaeudekommunikation.tuersprechanlagen | `src/features/gebaeudekommunikation/pages/TuersprechanlagenPage.tsx` | G1 | medium | ✓ | · | ✓ | ✓ | · | · | ✓ | 0 | · | CmsBodyRenderer + page-spezifische Hülle; hartcodierte Daten-Arrays vorhanden |
| gebaeudemanagement.alarmanlagenkopplung | `src/features/gebaeudemanagement/pages/AlarmanlagenkopplungPage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| gebaeudemanagement.digital-signage | `src/features/gebaeudemanagement/pages/DigitalSignagePage.tsx` | S3 | high | · | · | · | · | · | · | · | 0 | · | nur Hardcoding, keine CMS-Anbindung erkennbar |
| gebaeudemanagement.digitale-namensanzeige | `src/features/gebaeudemanagement/pages/DigitaleNamensanzeigePage.tsx` | S3 | high | · | · | · | · | · | · | · | 0 | · | nur Hardcoding, keine CMS-Anbindung erkennbar |
| gebaeudemanagement.reservieren-buchen | `src/features/gebaeudemanagement/pages/ReservierenBuchenPage.tsx` | S3 | high | · | · | · | · | · | · | · | 0 | · | nur Hardcoding, keine CMS-Anbindung erkennbar |
| gebaeudemanagement.root | `src/features/gebaeudemanagement/pages/GebaeudemanagementPage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| gebaeudemanagement.schraenke-behaelter | `src/features/gebaeudemanagement/pages/SchraenkeBehaelterPage.tsx` | S3 | high | · | · | · | · | · | · | · | 0 | · | nur Hardcoding, keine CMS-Anbindung erkennbar |
| home.start | `src/features/home/pages/HomePage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| home.ueber-tcs | `src/features/home/pages/UeberTCSPage.tsx` | S3 | high | · | · | · | · | · | · | · | 0 | · | nur Hardcoding, keine CMS-Anbindung erkennbar |
| karriere.root | `src/features/karriere/pages/KarrierePage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| kontakt-bcm.root | `src/features/kontakt/pages/KontaktBcmPage.tsx` | S2 | medium | · | ✓ | ✓ | · | · | · | ✓ | 0 | · | Spezialrenderer + i18n-Fallback gemischt; hartcodierte Daten-Arrays vorhanden |
| kontakt.root | `src/features/kontakt/pages/KontaktPage.tsx` | S2 | medium | · | ✓ | · | · | · | · | ✓ | 0 | · | Spezialrenderer + i18n-Fallback gemischt; hartcodierte Daten-Arrays vorhanden |
| legal.agb | `src/features/legal/pages/AgbPage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| legal.datenschutz | `src/features/legal/pages/DatenschutzPage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| legal.impressum | `src/features/legal/pages/ImpressumPage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| legal.sitemap | `src/features/legal/pages/SitemapPage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| presse.root | `src/features/presse/pages/PressePage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| produkte.hub | `src/features/produkte/pages/ProduktHubPage.tsx` | S2 | medium | · | · | ✓ | ✓ | · | · | · | 0 | · | Spezialrenderer + i18n-Fallback gemischt |
| produkte.tuerkommunikation | `src/features/produkte/pages/TuerkommunikationHubPage.tsx` | S2 | medium | · | · | ✓ | ✓ | · | · | · | 0 | · | Spezialrenderer + i18n-Fallback gemischt |
| service.downloads | `src/features/service/pages/DownloadsPage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| service.ersatzteile | `src/features/service/pages/ErsatzteilePage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| service.hub | `src/features/service/pages/ServicePage.tsx` | S3 | high | · | · | · | · | · | · | · | 0 | · | nur Hardcoding, keine CMS-Anbindung erkennbar |
| service.planen-konfigurieren | `src/features/service/pages/PlanenKonfigurierenPage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| service.technischer-support | `src/features/service/pages/TechnischerSupportPage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| serviceportal.login | `src/features/serviceportal/pages/ServiceportalPage.tsx` | S2 | medium | · | ✓ | · | · | · | · | ✓ | 0 | · | Spezialrenderer + i18n-Fallback gemischt; hartcodierte Daten-Arrays vorhanden |
| serviceportal.passwort-vergessen | `src/features/serviceportal/pages/PasswortVergessenPage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| serviceportal.registrieren | `src/features/serviceportal/pages/RegistrierenPage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| signage.root | `src/features/signage/pages/SignagePage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| wissen.akademie | `src/features/wissen/pages/AkademiePage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| zutrittskontrolle.bcm-handsender | `src/features/zutrittskontrolle/pages/BcmHandsenderPage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| zutrittskontrolle.bcm-online-leser | `src/features/zutrittskontrolle/pages/BcmOnlineLeserPage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| zutrittskontrolle.biometrie | `src/features/zutrittskontrolle/pages/BiometriePage.tsx` | S3 | high | · | · | · | · | · | · | · | 0 | · | nur Hardcoding, keine CMS-Anbindung erkennbar |
| zutrittskontrolle.elektronische-drueckergarnitur | `src/features/zutrittskontrolle/pages/ElektronischeDrueckergarniturPage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| zutrittskontrolle.elektronischer-knaufzylinder | `src/features/zutrittskontrolle/pages/ElektronischerKnaufzylinderPage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| zutrittskontrolle.fahrstuhlsteuerung | `src/features/zutrittskontrolle/pages/FahrstuhlsteuerungPage.tsx` | S2 | medium | · | ✓ | · | · | · | · | ✓ | 0 | · | Spezialrenderer + i18n-Fallback gemischt; hartcodierte Daten-Arrays vorhanden |
| zutrittskontrolle.funkvernetzte-offline-leser | `src/features/zutrittskontrolle/pages/FunkvernetzteOfflineLeserPage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| zutrittskontrolle.mobiler-zutritt | `src/features/zutrittskontrolle/pages/MobilerZutrittPage.tsx` | S3 | high | · | · | · | · | · | · | · | 0 | · | nur Hardcoding, keine CMS-Anbindung erkennbar |
| zutrittskontrolle.tueren-tore | `src/features/zutrittskontrolle/pages/TuerenTorePage.tsx` | S3 | high | · | · | · | · | · | · | · | 0 | · | nur Hardcoding, keine CMS-Anbindung erkennbar |
| zutrittskontrolle.vorhaengeschloss | `src/features/zutrittskontrolle/pages/VorhaengeschlossPage.tsx` | S1 | low | · | ✓ | · | · | · | · | · | 0 | · | Spezialrenderer, aber DB-first (useCmsI18n) |
| zutrittskontrolle.zufahrten-parkplaetze | `src/features/zutrittskontrolle/pages/ZufahrtenParkplaetzePage.tsx` | S3 | high | · | · | · | · | · | · | · | 0 | · | nur Hardcoding, keine CMS-Anbindung erkennbar |

## i18n-Locale-Übersicht (DE)

| Datei | Top-Level-Keys | Größe (Bytes) |
|---|---:|---:|
| `src/i18n/locales/de/anwendungen.json` | 9 | 93700 |
| `src/i18n/locales/de/gebaeudekommunikation.json` | 8 | 49806 |
| `src/i18n/locales/de/service.json` | 4 | 46347 |
| `src/i18n/locales/de/personas.json` | 8 | 41019 |
| `src/i18n/locales/de/zutrittskontrolle.json` | 14 | 40328 |
| `src/i18n/locales/de/eingangssysteme.json` | 10 | 25912 |
| `src/i18n/locales/de/gebaeudemanagement.json` | 8 | 15903 |
| `src/i18n/locales/de/home.json` | 7 | 12882 |
| `src/i18n/locales/de/navigation.json` | 7 | 12820 |
| `src/i18n/locales/de/serviceportal.json` | 8 | 9361 |
| `src/i18n/locales/de/signage.json` | 4 | 3808 |
| `src/i18n/locales/de/wissen.json` | 2 | 3575 |
| `src/i18n/locales/de/karriere.json` | 5 | 1994 |
| `src/i18n/locales/de/presse.json` | 4 | 1683 |
| `src/i18n/locales/de/legal.json` | 3 | 1214 |
| `src/i18n/locales/de/kontakt.json` | 5 | 1174 |
| `src/i18n/locales/de/kontakt-bcm.json` | 5 | 937 |
| `src/i18n/locales/de/common.json` | 6 | 863 |
