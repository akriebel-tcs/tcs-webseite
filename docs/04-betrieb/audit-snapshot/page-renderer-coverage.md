# Page-Renderer-Coverage (D1)

Stand: 2026-06-05T21:56:23.573Z

Read-only Inventar aller Page-Dateien unter `src/features/**/pages/*Page.tsx`.
Klassifiziert, wie eine Seite ihre CMS-Sections rendert, und prueft, welche
aktiven DB-Sections die Page-Datei stillschweigend ignoriert.

## Zaehlung

- total_page_files: 80
- generisch_cms: 18
- generisch_iteration: 4
- teilweise_generisch: 7
- hart_codiert: 51
- registrierte_sonderseiten: 6
- pages_ohne_page_key: 3
- ignored_findings: 0
- pages_with_ignored_sections: 0

## Renderpfad je Page-Datei

| Page-Datei | page_key | Klasse | Sonderseite | DB-Top-Sections | Ignoriert |
|---|---|---|---|---:|---:|
| `src/features/admin/pages/AdminPage.tsx` | - | hart_codiert | nein | 0 | 0 |
| `src/features/anwendungen/pages/AnwendungenPage.tsx` | anwendungen.root | generisch_iteration | nein | 12 | 0 |
| `src/features/anwendungen/pages/BehoerdePage.tsx` | anwendungen.oeffentlich.behoerde | hart_codiert | nein | 0 | 0 |
| `src/features/anwendungen/pages/BidirektionaleVideoPage.tsx` | anwendungen.bidirektionale-video | hart_codiert | nein | 8 | 0 |
| `src/features/anwendungen/pages/BildungseinrichtungenPage.tsx` | anwendungen.bildungseinrichtungen | teilweise_generisch | nein | 20 | 0 |
| `src/features/anwendungen/pages/ConciergePage.tsx` | anwendungen.concierge | hart_codiert | nein | 8 | 0 |
| `src/features/anwendungen/pages/DigitaleNamensverwaltungPage.tsx` | anwendungen.digitale-namensverwaltung | hart_codiert | nein | 8 | 0 |
| `src/features/anwendungen/pages/EinfamilienhausPage.tsx` | anwendungen.wohnen.einfamilienhaus | hart_codiert | nein | 0 | 0 |
| `src/features/anwendungen/pages/FeuerwehrPage.tsx` | anwendungen.oeffentlich.feuerwehr | hart_codiert | nein | 0 | 0 |
| `src/features/anwendungen/pages/FeuerwehrdurchsagePage.tsx` | anwendungen.feuerwehrdurchsage | hart_codiert | nein | 8 | 0 |
| `src/features/anwendungen/pages/GesundheitseinrichtungenPage.tsx` | anwendungen.gesundheitseinrichtungen | teilweise_generisch | nein | 3 | 0 |
| `src/features/anwendungen/pages/GrossanlagePage.tsx` | anwendungen.wohnen.grossanlage | hart_codiert | nein | 0 | 0 |
| `src/features/anwendungen/pages/InterneKommunikationPage.tsx` | anwendungen.interne-kommunikation | teilweise_generisch | nein | 10 | 0 |
| `src/features/anwendungen/pages/KlinikPage.tsx` | anwendungen.gesundheit.klinik | hart_codiert | nein | 0 | 0 |
| `src/features/anwendungen/pages/MehrfamilienhausPage.tsx` | anwendungen.wohnen.mehrfamilienhaus | hart_codiert | nein | 0 | 0 |
| `src/features/anwendungen/pages/MobileTuerkommunikationPage.tsx` | anwendungen.mobile-tuerkommunikation | hart_codiert | nein | 6 | 0 |
| `src/features/anwendungen/pages/ObjektloesungenPage.tsx` | anwendungen.objektloesungen | teilweise_generisch | nein | 4 | 0 |
| `src/features/anwendungen/pages/OeffentlicheHandPage.tsx` | anwendungen.oeffentliche-hand | teilweise_generisch | nein | 3 | 0 |
| `src/features/anwendungen/pages/PflegePage.tsx` | anwendungen.gesundheit.pflege | hart_codiert | nein | 0 | 0 |
| `src/features/anwendungen/pages/ReferenzprojektDetailPage.tsx` | anwendungen.referenzen.detail | hart_codiert | nein | 0 | 0 |
| `src/features/anwendungen/pages/ReferenzprojektePage.tsx` | anwendungen.referenzprojekte | teilweise_generisch | nein | 4 | 0 |
| `src/features/anwendungen/pages/SanierungPage.tsx` | anwendungen.wohnen.sanierung | hart_codiert | nein | 0 | 0 |
| `src/features/anwendungen/pages/SchwimmbadPage.tsx` | anwendungen.oeffentlich.schwimmbad | hart_codiert | nein | 0 | 0 |
| `src/features/anwendungen/pages/WohnbauPage.tsx` | anwendungen.wohnbau | generisch_cms | nein | 4 | 0 |
| `src/features/anwendungen/pages/ZutrittskontrolleBCMPage.tsx` | anwendungen.zutrittskontrolle-bcm | hart_codiert | nein | 6 | 0 |
| `src/features/eingangssysteme/pages/EntryBeratungPage.tsx` | eingangssysteme.beratung | hart_codiert | nein | 5 | 0 |
| `src/features/eingangssysteme/pages/EntryDesignPage.tsx` | eingangssysteme.design | generisch_cms | nein | 5 | 0 |
| `src/features/eingangssysteme/pages/EntryFunktionalitaetPage.tsx` | eingangssysteme.funktionalitaet | generisch_cms | nein | 5 | 0 |
| `src/features/eingangssysteme/pages/EntryIntegrationsformenPage.tsx` | eingangssysteme.integrationsformen | generisch_cms | nein | 5 | 0 |
| `src/features/eingangssysteme/pages/EntryMaterialPage.tsx` | eingangssysteme.material | generisch_cms | nein | 5 | 0 |
| `src/features/eingangssysteme/pages/EntryReferenzenPage.tsx` | eingangssysteme.referenzen | hart_codiert | nein | 6 | 0 |
| `src/features/eingangssysteme/pages/EntryStandardsPage.tsx` | eingangssysteme.standards | generisch_cms | nein | 6 | 0 |
| `src/features/eingangssysteme/pages/EntrySystemPage.tsx` | eingangssysteme.root | hart_codiert | nein | 12 | 0 |
| `src/features/gebaeudekommunikation/pages/BriefkastenanlagenPage.tsx` | gebaeudekommunikation.briefkastenanlagen | generisch_cms | nein | 6 | 0 |
| `src/features/gebaeudekommunikation/pages/GrossanlagenPage.tsx` | gebaeudekommunikation.grossanlagen | generisch_cms | nein | 12 | 0 |
| `src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx` | gebaeudekommunikation.snipdoo-ip | hart_codiert | nein | 15 | 0 |
| `src/features/gebaeudekommunikation/pages/SystemloesungenPage.tsx` | gebaeudekommunikation.systemloesungen | hart_codiert | nein | 5 | 0 |
| `src/features/gebaeudekommunikation/pages/TuerkommunikationPage.tsx` | gebaeudekommunikation.root | generisch_iteration | nein | 11 | 0 |
| `src/features/gebaeudekommunikation/pages/TuersprechanlagenPage.tsx` | gebaeudekommunikation.tuersprechanlagen | generisch_iteration | nein | 11 | 0 |
| `src/features/gebaeudemanagement/pages/AlarmanlagenkopplungPage.tsx` | gebaeudemanagement.alarmanlagenkopplung | hart_codiert | nein | 4 | 0 |
| `src/features/gebaeudemanagement/pages/DigitalSignagePage.tsx` | gebaeudemanagement.digital-signage | generisch_cms | nein | 6 | 0 |
| `src/features/gebaeudemanagement/pages/DigitaleNamensanzeigePage.tsx` | gebaeudemanagement.digitale-namensanzeige | generisch_cms | nein | 7 | 0 |
| `src/features/gebaeudemanagement/pages/GebaeudemanagementPage.tsx` | gebaeudemanagement.root | hart_codiert | nein | 8 | 0 |
| `src/features/gebaeudemanagement/pages/ReservierenBuchenPage.tsx` | gebaeudemanagement.reservieren-buchen | generisch_cms | nein | 6 | 0 |
| `src/features/gebaeudemanagement/pages/SchraenkeBehaelterPage.tsx` | gebaeudemanagement.schraenke-behaelter | generisch_cms | nein | 7 | 0 |
| `src/features/home/pages/HomePage.tsx` | home.start | hart_codiert | nein | 11 | 0 |
| `src/features/home/pages/UeberTCSPage.tsx` | home.ueber-tcs | generisch_cms | nein | 8 | 0 |
| `src/features/karriere/pages/KarrierePage.tsx` | karriere.root | hart_codiert | nein | 4 | 0 |
| `src/features/kontakt/pages/KontaktBcmPage.tsx` | kontakt-bcm.root | hart_codiert | ja | 4 | 0 |
| `src/features/kontakt/pages/KontaktPage.tsx` | kontakt.root | hart_codiert | ja | 4 | 0 |
| `src/features/legal/pages/AgbPage.tsx` | legal.agb | hart_codiert | nein | 3 | 0 |
| `src/features/legal/pages/DatenschutzPage.tsx` | legal.datenschutz | hart_codiert | nein | 3 | 0 |
| `src/features/legal/pages/ImpressumPage.tsx` | legal.impressum | hart_codiert | nein | 3 | 0 |
| `src/features/presse/pages/PressePage.tsx` | presse.root | hart_codiert | nein | 3 | 0 |
| `src/features/produkte/pages/CategoryListPage.tsx` | - | teilweise_generisch | nein | 0 | 0 |
| `src/features/produkte/pages/ProduktHubPage.tsx` | produkte.hub | generisch_iteration | nein | 2 | 0 |
| `src/features/produkte/pages/TuerkommunikationHubPage.tsx` | produkte.tuerkommunikation | hart_codiert | nein | 3 | 0 |
| `src/features/service/pages/DownloadsPage.tsx` | service.downloads | hart_codiert | nein | 9 | 0 |
| `src/features/service/pages/ErsatzteilePage.tsx` | service.ersatzteile | hart_codiert | nein | 7 | 0 |
| `src/features/service/pages/PlanenKonfigurierenPage.tsx` | service.planen-konfigurieren | hart_codiert | nein | 10 | 0 |
| `src/features/service/pages/ProductDetailPage.tsx` | - | hart_codiert | ja | 0 | 0 |
| `src/features/service/pages/ServicePage.tsx` | service.hub | generisch_cms | nein | 7 | 0 |
| `src/features/service/pages/TechnischerSupportPage.tsx` | service.technischer-support | hart_codiert | nein | 6 | 0 |
| `src/features/serviceportal/pages/PasswortVergessenPage.tsx` | serviceportal.passwort-vergessen | hart_codiert | ja | 2 | 1 |
| `src/features/serviceportal/pages/RegistrierenPage.tsx` | serviceportal.registrieren | hart_codiert | ja | 2 | 1 |
| `src/features/serviceportal/pages/ServiceportalPage.tsx` | serviceportal.login | hart_codiert | ja | 2 | 1 |
| `src/features/signage/pages/BeschilderungPage.tsx` | gebaeudekommunikation.beschilderung | hart_codiert | nein | 8 | 0 |
| `src/features/signage/pages/SignagePage.tsx` | signage.root | hart_codiert | nein | 0 | 0 |
| `src/features/wissen/pages/AkademiePage.tsx` | wissen.akademie | hart_codiert | nein | 6 | 0 |
| `src/features/zutrittskontrolle/pages/BcmHandsenderPage.tsx` | zutrittskontrolle.bcm-handsender | hart_codiert | nein | 5 | 0 |
| `src/features/zutrittskontrolle/pages/BcmOnlineLeserPage.tsx` | zutrittskontrolle.bcm-online-leser | hart_codiert | nein | 5 | 0 |
| `src/features/zutrittskontrolle/pages/BiometriePage.tsx` | zutrittskontrolle.biometrie | generisch_cms | nein | 5 | 0 |
| `src/features/zutrittskontrolle/pages/ElektronischeDrueckergarniturPage.tsx` | zutrittskontrolle.elektronische-drueckergarnitur | hart_codiert | nein | 5 | 0 |
| `src/features/zutrittskontrolle/pages/ElektronischerKnaufzylinderPage.tsx` | zutrittskontrolle.elektronischer-knaufzylinder | hart_codiert | nein | 5 | 0 |
| `src/features/zutrittskontrolle/pages/FahrstuhlsteuerungPage.tsx` | zutrittskontrolle.fahrstuhlsteuerung | hart_codiert | nein | 5 | 0 |
| `src/features/zutrittskontrolle/pages/FunkvernetzteOfflineLeserPage.tsx` | zutrittskontrolle.funkvernetzte-offline-leser | hart_codiert | nein | 5 | 0 |
| `src/features/zutrittskontrolle/pages/MobilerZutrittPage.tsx` | zutrittskontrolle.mobiler-zutritt | generisch_cms | nein | 7 | 0 |
| `src/features/zutrittskontrolle/pages/TuerenTorePage.tsx` | zutrittskontrolle.tueren-tore | generisch_cms | nein | 7 | 0 |
| `src/features/zutrittskontrolle/pages/VorhaengeschlossPage.tsx` | zutrittskontrolle.vorhaengeschloss | hart_codiert | nein | 5 | 0 |
| `src/features/zutrittskontrolle/pages/ZufahrtenParkplaetzePage.tsx` | zutrittskontrolle.zufahrten-parkplaetze | generisch_cms | nein | 7 | 0 |

## Legende

- `generisch_cms`         — nutzt `<GenericCmsPage>` oder `<CmsBodyRenderer>` (rendert alle aktiven Top-Sections automatisch).
- `generisch_iteration`   — iteriert selbst ueber `cms.sections` und ruft `renderPageSectionByType` ohne Key-Whitelist auf.
- `teilweise_generisch`   — ruft `renderPageSectionByType` nur fuer ausgewaehlte section_keys/typen auf; uebrige Sections fallen durch.
- `hart_codiert`          — kein zentraler Renderer-Aufruf; alle Sections muessen explizit im Code stehen.
- Ignoriert               — aktive DB-Sections mit zentralem Renderer, die weder global (hero/cta) noch explizit behandelt werden.
