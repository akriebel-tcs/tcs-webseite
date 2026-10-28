# Seiten-Klassifikation (Teil A1)

_Read-only Inventar. Keine Code-/DB-Änderungen._

## Übersicht

| Klasse | Anzahl |
| --- | --- |
| standardseite | 90 |
| detailseite | 11 |
| sonderseite_unregistriert | 9 |
| legacy_unklar | 1 |
| nicht_cms_route | 7 |

Risiko: grün 60 · gelb 55 · rot 3

## standardseite (90)

| route | page_key | renderer | sections | cms_% | risiko | begründung |
| --- | --- | --- | --- | --- | --- | --- |
| / | home.start | HomePage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /agb | legal.agb | AgbPage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /akademie | wissen.akademie | AkademiePage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /anwendungen | anwendungen.root | AnwendungenPage | 0 | — | gruen | Eigene Komponente, aber zentraler Renderer. |
| /anwendungen/behoerde | anwendungen.behoerde | BehoerdePage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /anwendungen/bidirektionale-video | anwendungen.bidirektionale-video | BidirektionaleVideoPage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /anwendungen/bildungseinrichtungen | — | BildungseinrichtungenPage | 0 | — | gruen | Eigene Komponente, aber zentraler Renderer. |
| /anwendungen/concierge | anwendungen.concierge | ConciergePage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /anwendungen/digitale-namensverwaltung | anwendungen.digitale-namensverwaltung | DigitaleNamensverwaltungPage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /anwendungen/einfamilienhaus | anwendungen.einfamilienhaus | EinfamilienhausPage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /anwendungen/feuerwehr | anwendungen.feuerwehr | FeuerwehrPage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /anwendungen/feuerwehrdurchsage | anwendungen.feuerwehrdurchsage | FeuerwehrdurchsagePage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /anwendungen/gesundheitseinrichtungen | — | GesundheitseinrichtungenPage | 0 | — | gruen | Eigene Komponente, aber zentraler Renderer. |
| /anwendungen/grossanlage | anwendungen.grossanlage | GrossanlagePage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /anwendungen/interne-kommunikation | — | InterneKommunikationPage | 0 | — | gruen | Eigene Komponente, aber zentraler Renderer. |
| /anwendungen/klinik | anwendungen.klinik | KlinikPage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /anwendungen/mehrfamilienhaus | anwendungen.mehrfamilienhaus | MehrfamilienhausPage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /anwendungen/mobile-tuerkommunikation | anwendungen.mobile-tuerkommunikation | MobileTuerkommunikationPage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /anwendungen/objektloesungen | — | ObjektloesungenPage | 0 | — | gruen | Eigene Komponente, aber zentraler Renderer. |
| /anwendungen/oeffentliche-hand | — | OeffentlicheHandPage | 0 | — | gruen | Eigene Komponente, aber zentraler Renderer. |
| /anwendungen/pflege | anwendungen.pflege | PflegePage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /anwendungen/referenzprojekte | — | ReferenzprojektePage | 0 | — | gruen | Eigene Komponente, aber zentraler Renderer. |
| /anwendungen/referenzprojekte/:slug | — | ReferenzprojektDetailPage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /anwendungen/sanierung | anwendungen.sanierung | SanierungPage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /anwendungen/schwimmbad | anwendungen.schwimmbad | SchwimmbadPage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /anwendungen/wohnbau | anwendungen.wohnbau | WohnbauPage | 0 | — | gruen | Wrapper um Standard-CMS-Shell. |
| /anwendungen/zutrittskontrolle-bcm | anwendungen.zutrittskontrolle-bcm | ZutrittskontrolleBCMPage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /beschilderung | gebaeudekommunikation.beschilderung | BeschilderungPage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /bildungseinrichtungen | — | BildungseinrichtungenPage | 0 | — | gruen | Eigene Komponente, aber zentraler Renderer. |
| /briefkastenanlagen | gebaeudekommunikation.briefkastenanlagen | BriefkastenanlagenPage | 0 | — | gruen | Wrapper um Standard-CMS-Shell. |
| /datenschutz | legal.datenschutz | DatenschutzPage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /downloads | service.downloads | DownloadsPage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /entry-system | eingangssysteme.root | EntrySystemPage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /entry-system/beratung | eingangssysteme.beratung | EntryBeratungPage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /entry-system/design | eingangssysteme.design | EntryDesignPage | 0 | — | gruen | Eigene Komponente, aber zentraler Renderer. |
| /entry-system/funktionalitaet | eingangssysteme.funktionalitaet | EntryFunktionalitaetPage | 0 | — | gruen | Eigene Komponente, aber zentraler Renderer. |
| /entry-system/integrationsformen | — | EntryIntegrationsformenPage | 0 | — | gruen | Eigene Komponente, aber zentraler Renderer. |
| /entry-system/material | eingangssysteme.material | EntryMaterialPage | 0 | — | gruen | Eigene Komponente, aber zentraler Renderer. |
| /entry-system/referenzen | eingangssysteme.referenzen | EntryReferenzenPage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /entry-system/standards | eingangssysteme.standards | EntryStandardsPage | 0 | — | gruen | Eigene Komponente, aber zentraler Renderer. |
| /ersatzteile | service.ersatzteile | ErsatzteilePage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /gebaeudekommunikation | gebaeudekommunikation.root | TuerkommunikationPage | 0 | — | gruen | Eigene Komponente, aber zentraler Renderer. |
| /gebaeudekommunikation/beschilderung | gebaeudekommunikation.beschilderung | BeschilderungPage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /gebaeudekommunikation/briefkastenanlagen | gebaeudekommunikation.briefkastenanlagen | BriefkastenanlagenPage | 0 | — | gruen | Wrapper um Standard-CMS-Shell. |
| /gebaeudekommunikation/grossanlagen | gebaeudekommunikation.grossanlagen | GrossanlagenPage | 0 | — | gruen | Wrapper um Standard-CMS-Shell. |
| /gebaeudekommunikation/mobile-tuerkommunikation | mobile-tk-preview.root | CmsOnlyShell | 0 | — | gruen | Reine CMS-Shell (CmsOnlyShell). |
| /gebaeudekommunikation/snipdoo-ip | gebaeudekommunikation.snipdoo-ip | SnipdooIpPage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /gebaeudekommunikation/systemloesungen | gebaeudekommunikation.systemloesungen | SystemloesungenPage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /gebaeudekommunikation/tuersprechanlagen | gebaeudekommunikation.tuersprechanlagen | TuersprechanlagenPage | 0 | — | gruen | Eigene Komponente, aber zentraler Renderer. |
| /gebaeudemanagement | gebaeudemanagement.root | GebaeudemanagementPage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /gebaeudemanagement/alarmanlagenkopplung | gebaeudemanagement.alarmanlagenkopplung | AlarmanlagenkopplungPage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /gebaeudemanagement/digital-signage | gebaeudemanagement.digital-signage | DigitalSignagePage | 0 | — | gruen | Wrapper um Standard-CMS-Shell. |
| /gebaeudemanagement/digitale-namensanzeige | gebaeudemanagement.digitale-namensanzeige | DigitaleNamensanzeigePage | 0 | — | gruen | Wrapper um Standard-CMS-Shell. |
| /gebaeudemanagement/reservieren-buchen | gebaeudemanagement.reservieren-buchen | ReservierenBuchenPage | 0 | — | gruen | Wrapper um Standard-CMS-Shell. |
| /gebaeudemanagement/schraenke-behaelter | gebaeudemanagement.schraenke-behaelter | SchraenkeBehaelterPage | 0 | — | gruen | Wrapper um Standard-CMS-Shell. |
| /grossanlagen | gebaeudekommunikation.grossanlagen | GrossanlagenPage | 0 | — | gruen | Wrapper um Standard-CMS-Shell. |
| /impressum | legal.impressum | ImpressumPage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /karriere | karriere.root | KarrierePage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /objektloesungen | — | ObjektloesungenPage | 0 | — | gruen | Eigene Komponente, aber zentraler Renderer. |
| /planen-konfigurieren | service.planen-konfigurieren | PlanenKonfigurierenPage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /presse | presse.root | PressePage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /produkte | — | ProduktHubPage | 0 | — | gruen | Eigene Komponente, aber zentraler Renderer. |
| /produkte/tuerkommunikation | — | TuerkommunikationHubPage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /service | service.hub | ServicePage | 0 | — | gruen | Wrapper um Standard-CMS-Shell. |
| /service/beratung-schulung | service.beratung-schulung | CmsOnlyShell | 0 | — | gruen | Reine CMS-Shell (CmsOnlyShell). |
| /service/datenblaetter-software | service.datenblaetter-software | CmsOnlyShell | 0 | — | gruen | Reine CMS-Shell (CmsOnlyShell). |
| /service/garantie-sicherheit | service.garantie-sicherheit | CmsOnlyShell | 0 | — | gruen | Reine CMS-Shell (CmsOnlyShell). |
| /service/installation-wartung | service.installation-wartung | CmsOnlyShell | 0 | — | gruen | Reine CMS-Shell (CmsOnlyShell). |
| /service/konfiguratoren | service.konfiguratoren | CmsOnlyShell | 0 | — | gruen | Reine CMS-Shell (CmsOnlyShell). |
| /service/planungshilfen | service.planungshilfen | CmsOnlyShell | 0 | — | gruen | Reine CMS-Shell (CmsOnlyShell). |
| /signage | signage.root | SignagePage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /snipdoo-ip | gebaeudekommunikation.snipdoo-ip | SnipdooIpPage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /systemloesungen | gebaeudekommunikation.systemloesungen | SystemloesungenPage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /systemtechnik/snipdoo-ip | gebaeudekommunikation.snipdoo-ip | SnipdooIpPage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /technischer-support | service.technischer-support | TechnischerSupportPage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /tuerkommunikation | gebaeudekommunikation.root | TuerkommunikationPage | 0 | — | gruen | Eigene Komponente, aber zentraler Renderer. |
| /tuersprechanlagen | gebaeudekommunikation.tuersprechanlagen | TuersprechanlagenPage | 0 | — | gruen | Eigene Komponente, aber zentraler Renderer. |
| /ueber-tcs | home.ueber-tcs | UeberTCSPage | 0 | — | gruen | Wrapper um Standard-CMS-Shell. |
| /zutrittskontrolle | zutrittskontrolle.root | CmsOnlyShell | 0 | — | gruen | Reine CMS-Shell (CmsOnlyShell). |
| /zutrittskontrolle/bcm-handsender | zutrittskontrolle.bcm-handsender | BcmHandsenderPage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /zutrittskontrolle/bcm-online-leser | zutrittskontrolle.bcm-online-leser | BcmOnlineLeserPage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /zutrittskontrolle/biometrie | zutrittskontrolle.biometrie | BiometriePage | 0 | — | gruen | Wrapper um Standard-CMS-Shell. |
| /zutrittskontrolle/elektronische-drueckergarnitur | zutrittskontrolle.elektronische-drueckergarnitur | ElektronischeDrueckergarniturPage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /zutrittskontrolle/elektronischer-knaufzylinder | zutrittskontrolle.elektronischer-knaufzylinder | ElektronischerKnaufzylinderPage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /zutrittskontrolle/fahrstuhlsteuerung | zutrittskontrolle.fahrstuhlsteuerung | FahrstuhlsteuerungPage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /zutrittskontrolle/funkvernetzte-offline-leser | zutrittskontrolle.funkvernetzte-offline-leser | FunkvernetzteOfflineLeserPage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /zutrittskontrolle/mobiler-zutritt | zutrittskontrolle.mobiler-zutritt | MobilerZutrittPage | 0 | — | gruen | Wrapper um Standard-CMS-Shell. |
| /zutrittskontrolle/tueren-tore | zutrittskontrolle.tueren-tore | TuerenTorePage | 0 | — | gruen | Wrapper um Standard-CMS-Shell. |
| /zutrittskontrolle/vorhaengeschloss | zutrittskontrolle.vorhaengeschloss | VorhaengeschlossPage | 0 | — | gelb | Eigene Komponente mit CMS-Hooks, aber ohne zentralen Renderer-Dispatch. |
| /zutrittskontrolle/zufahrten-parkplaetze | zutrittskontrolle.zufahrten-parkplaetze | ZufahrtenParkplaetzePage | 0 | — | gruen | Wrapper um Standard-CMS-Shell. |

## detailseite (11)

| route | page_key | renderer | sections | cms_% | risiko | begründung |
| --- | --- | --- | --- | --- | --- | --- |
| /gebaeudemanagement/bcm-buchungssystem | gebaeudemanagement.bcm-buchungssystem | CmsProductSolutionShell | 0 | — | gruen | Produkt-/Lösungsdetailseite über CmsProductSolutionShell. |
| /gebaeudemanagement/bcm-infoboard | gebaeudemanagement.bcm-infoboard | CmsProductSolutionShell | 0 | — | gruen | Produkt-/Lösungsdetailseite über CmsProductSolutionShell. |
| /zutrittskontrolle/aussenstation-adx5 | zutrittskontrolle.aussenstation-adx5 | CmsProductSolutionShell | 0 | — | gruen | Produkt-/Lösungsdetailseite über CmsProductSolutionShell. |
| /zutrittskontrolle/bcm-door-app | zutrittskontrolle.bcm-door-app | CmsProductSolutionShell | 0 | — | gruen | Produkt-/Lösungsdetailseite über CmsProductSolutionShell. |
| /zutrittskontrolle/bcm-mini-cloud | zutrittskontrolle.bcm-mini-cloud | CmsProductSolutionShell | 0 | — | gruen | Produkt-/Lösungsdetailseite über CmsProductSolutionShell. |
| /zutrittskontrolle/digitale-briefkasten | zutrittskontrolle.digitale-briefkasten | CmsProductSolutionShell | 0 | — | gruen | Produkt-/Lösungsdetailseite über CmsProductSolutionShell. |
| /zutrittskontrolle/gsm-gateway | zutrittskontrolle.gsm-gateway | CmsProductSolutionShell | 0 | — | gruen | Produkt-/Lösungsdetailseite über CmsProductSolutionShell. |
| /zutrittskontrolle/schrankschloss | zutrittskontrolle.schrankschloss | CmsProductSolutionShell | 0 | — | gruen | Produkt-/Lösungsdetailseite über CmsProductSolutionShell. |
| /zutrittskontrolle/serverschrankschloss | zutrittskontrolle.serverschrankschloss | CmsProductSolutionShell | 0 | — | gruen | Produkt-/Lösungsdetailseite über CmsProductSolutionShell. |
| /zutrittskontrolle/zufahrtskontrolle | zutrittskontrolle.zufahrtskontrolle | CmsProductSolutionShell | 0 | — | gruen | Produkt-/Lösungsdetailseite über CmsProductSolutionShell. |
| /zutrittskontrolle/zutrittssoftware | zutrittskontrolle.zutrittssoftware | CmsProductSolutionShell | 0 | — | gruen | Produkt-/Lösungsdetailseite über CmsProductSolutionShell. |

## sonderseite_unregistriert (9)

| route | page_key | renderer | sections | cms_% | risiko | begründung |
| --- | --- | --- | --- | --- | --- | --- |
| /kontakt | kontakt.root | KontaktPage | 0 | 0 | gelb | Sonderseite (Kontakt/Auth/Recht/Formular). Hartfunde: formular_submit. |
| /kontakt/bcm | — | KontaktBcmPage | 0 | 0 | gelb | Sonderseite (Kontakt/Auth/Recht/Formular). Hartfunde: formular_submit. |
| /produkte/eingangsloesungen | produkte.eingangsloesungen | CategoryListPage | 0 | 0 | gelb | Listen-Hub mit lokaler linkMap/externalActionMap — Verlinkungen sind hartcodiert. |
| /produkte/merkliste | — | MerklistePage | 0 | 0 | rot | Custom *Page ohne CMS-Shell. Hartfunde: keine. |
| /produkte/tuerkommunikation/:pdpSlug | — | ProductDetailPage | 0 | 0 | rot | Custom *Page ohne CMS-Shell. Hartfunde: keine. |
| /produkte/zutrittskontrolle | produkte.zutrittskontrolle | CategoryListPage | 0 | 0 | gelb | Listen-Hub mit lokaler linkMap/externalActionMap — Verlinkungen sind hartcodiert. |
| /serviceportal | serviceportal.login | ServiceportalPage | 0 | 0 | gelb | Sonderseite (Kontakt/Auth/Recht/Formular). Hartfunde: formular_submit. |
| /serviceportal/passwort-vergessen | serviceportal.passwort-vergessen | PasswortVergessenPage | 0 | 0 | gelb | Sonderseite (Kontakt/Auth/Recht/Formular). Hartfunde: formular_submit. |
| /serviceportal/registrieren | serviceportal.registrieren | RegistrierenPage | 0 | 0 | gelb | Sonderseite (Kontakt/Auth/Recht/Formular). Hartfunde: formular_submit. |

## legacy_unklar (1)

| route | page_key | renderer | sections | cms_% | risiko | begründung |
| --- | --- | --- | --- | --- | --- | --- |
| /service/online-produktkatalog/:pdpSlug | — | LegacyPdpRedirect | 0 | — | rot | Renderer-Datei konnte nicht aufgelöst werden. |

## nicht_cms_route (7)

| route | page_key | renderer | sections | cms_% | risiko | begründung |
| --- | --- | --- | --- | --- | --- | --- |
| /mobile-tk-preview | — | Navigate | 0 | — | gruen | Legacy-Slug-Redirect. |
| /service/online-produktkatalog | — | Navigate | 0 | — | gruen | Legacy-Slug-Redirect. |
| /zutrittskontrolle/bcm-doorapp | — | Navigate | 0 | — | gruen | Legacy-Slug-Redirect. |
| /zutrittskontrolle/bcm-minicloud | — | Navigate | 0 | — | gruen | Legacy-Slug-Redirect. |
| /zutrittskontrolle/digitale-briefkastenanlage | — | Navigate | 0 | — | gruen | Legacy-Slug-Redirect. |
| /zutrittskontrolle/elektronisches-schrankschloss | — | Navigate | 0 | — | gruen | Legacy-Slug-Redirect. |
| /zutrittskontrolle/elektronisches-serverschrankschloss | — | Navigate | 0 | — | gruen | Legacy-Slug-Redirect. |
