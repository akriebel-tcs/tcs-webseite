# Hartcode-Steuerbarkeits-Inventar

Stand: 2026-06-04T21:44:04.671Z. READ-ONLY. Quelle = Audit-Snapshots + statische Page-Heuristik.

## Zusammenfassung

| Kategorie | Anzahl Pages |
|---|---:|
| total | 77 |
| cms_gesteuert | 60 |
| db_first_mit_i18n_fallback | 61 |
| hartcodierter_inhalt | 3 |
| hartcodiertes_layout_erlaubt | 5 |
| admin_schalter_ohne_public_wirkung | 0 |
| public_ohne_admin_pflege | 0 |
| db_aktiv_aber_public_ignoriert | 0 |
| navigation_getrennte_wahrheit | 0 |
| copy_move_risiko | 0 |

## Priorisierung

| Klasse | Anzahl |
|---|---:|
| A | 3 |
| B | 0 |
| C | 18 |
| D | 56 |

Klassendefinition: **A** = muss vor CMS-Abschluss weg · **B** = sollte vor Übergabe weg · **C** = darf bleiben · **D** = Entscheidung Thomas.

## Befunde je Page-Datei

| Prio | page_key | Datei | aktive DB-Sections | Kategorien | Empfehlung |
|---|---|---|---:|---|---|
| A | gebaeudekommunikation.tuersprechanlagen | src/features/gebaeudekommunikation/pages/TuersprechanlagenPage.tsx | 33 | hartcodierter_inhalt, cms_gesteuert | Manuell prüfen. |
| A | produkte.hub | src/features/produkte/pages/ProduktHubPage.tsx | 5 | hartcodierter_inhalt, cms_gesteuert | Manuell prüfen. |
| A | produkte.tuerkommunikation | src/features/produkte/pages/TuerkommunikationHubPage.tsx | 41 | hartcodierter_inhalt, cms_gesteuert | Manuell prüfen. |
| C | anwendungen.wohnbau | src/features/anwendungen/pages/WohnbauPage.tsx | 8 | cms_gesteuert | Keine Aktion. |
| C | gebaeudekommunikation.briefkastenanlagen | src/features/gebaeudekommunikation/pages/BriefkastenanlagenPage.tsx | 13 | cms_gesteuert | Keine Aktion. |
| C | gebaeudekommunikation.grossanlagen | src/features/gebaeudekommunikation/pages/GrossanlagenPage.tsx | 25 | cms_gesteuert | Keine Aktion. |
| C | gebaeudemanagement.digital-signage | src/features/gebaeudemanagement/pages/DigitalSignagePage.tsx | 10 | cms_gesteuert | Keine Aktion. |
| C | gebaeudemanagement.digitale-namensanzeige | src/features/gebaeudemanagement/pages/DigitaleNamensanzeigePage.tsx | 16 | cms_gesteuert | Keine Aktion. |
| C | gebaeudemanagement.reservieren-buchen | src/features/gebaeudemanagement/pages/ReservierenBuchenPage.tsx | 11 | cms_gesteuert | Keine Aktion. |
| C | gebaeudemanagement.schraenke-behaelter | src/features/gebaeudemanagement/pages/SchraenkeBehaelterPage.tsx | 14 | cms_gesteuert | Keine Aktion. |
| C | home.ueber-tcs | src/features/home/pages/UeberTCSPage.tsx | 36 | cms_gesteuert | Keine Aktion. |
| C | kontakt-bcm.root | src/features/kontakt/pages/KontaktBcmPage.tsx | 4 | db_first_mit_i18n_fallback, cms_gesteuert, hartcodiertes_layout_erlaubt | Sonderseite (Kontaktformularseite mit eigenem Submit-Flow.). Texte sukzessive in cms_section_fields heben. |
| C | kontakt.root | src/features/kontakt/pages/KontaktPage.tsx | 4 | db_first_mit_i18n_fallback, cms_gesteuert, hartcodiertes_layout_erlaubt | Sonderseite (Kontaktformularseite mit eigenem Submit-Flow.). Texte sukzessive in cms_section_fields heben. |
| C | service.hub | src/features/service/pages/ServicePage.tsx | 3 | cms_gesteuert | Keine Aktion. |
| C | serviceportal.login | src/features/serviceportal/pages/ServiceportalPage.tsx | 2 | db_first_mit_i18n_fallback, cms_gesteuert, hartcodiertes_layout_erlaubt | Sonderseite (Auth-/Registrierungs-/Passwort-Flow, kein Standardbaustein abbildbar.). Texte sukzessive in cms_section_fields heben. |
| C | serviceportal.passwort-vergessen | src/features/serviceportal/pages/PasswortVergessenPage.tsx | 2 | db_first_mit_i18n_fallback, cms_gesteuert, hartcodiertes_layout_erlaubt | Sonderseite (Auth-/Registrierungs-/Passwort-Flow, kein Standardbaustein abbildbar.). Texte sukzessive in cms_section_fields heben. |
| C | serviceportal.registrieren | src/features/serviceportal/pages/RegistrierenPage.tsx | 2 | db_first_mit_i18n_fallback, cms_gesteuert, hartcodiertes_layout_erlaubt | Sonderseite (Auth-/Registrierungs-/Passwort-Flow, kein Standardbaustein abbildbar.). Texte sukzessive in cms_section_fields heben. |
| C | zutrittskontrolle.biometrie | src/features/zutrittskontrolle/pages/BiometriePage.tsx | 12 | cms_gesteuert | Keine Aktion. |
| C | zutrittskontrolle.mobiler-zutritt | src/features/zutrittskontrolle/pages/MobilerZutrittPage.tsx | 13 | cms_gesteuert | Keine Aktion. |
| C | zutrittskontrolle.tueren-tore | src/features/zutrittskontrolle/pages/TuerenTorePage.tsx | 18 | cms_gesteuert | Keine Aktion. |
| C | zutrittskontrolle.zufahrten-parkplaetze | src/features/zutrittskontrolle/pages/ZufahrtenParkplaetzePage.tsx | 16 | cms_gesteuert | Keine Aktion. |
| D | anwendungen.bidirektionale-video | src/features/anwendungen/pages/BidirektionaleVideoPage.tsx | 12 | db_first_mit_i18n_fallback | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | anwendungen.bildungseinrichtungen | src/features/anwendungen/pages/BildungseinrichtungenPage.tsx | 4 | db_first_mit_i18n_fallback, cms_gesteuert | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | anwendungen.concierge | src/features/anwendungen/pages/ConciergePage.tsx | 13 | db_first_mit_i18n_fallback | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | anwendungen.digitale-namensverwaltung | src/features/anwendungen/pages/DigitaleNamensverwaltungPage.tsx | 13 | db_first_mit_i18n_fallback | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | anwendungen.feuerwehrdurchsage | src/features/anwendungen/pages/FeuerwehrdurchsagePage.tsx | 11 | db_first_mit_i18n_fallback | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | anwendungen.gesundheit.klinik | src/features/anwendungen/pages/KlinikPage.tsx | 0 | db_first_mit_i18n_fallback | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | anwendungen.gesundheit.pflege | src/features/anwendungen/pages/PflegePage.tsx | 0 | db_first_mit_i18n_fallback | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | anwendungen.gesundheitseinrichtungen | src/features/anwendungen/pages/GesundheitseinrichtungenPage.tsx | 4 | db_first_mit_i18n_fallback, cms_gesteuert | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | anwendungen.interne-kommunikation | src/features/anwendungen/pages/InterneKommunikationPage.tsx | 12 | db_first_mit_i18n_fallback | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | anwendungen.mobile-tuerkommunikation | src/features/anwendungen/pages/MobileTuerkommunikationPage.tsx | 6 | db_first_mit_i18n_fallback | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | anwendungen.objektloesungen | src/features/anwendungen/pages/ObjektloesungenPage.tsx | 5 | db_first_mit_i18n_fallback, cms_gesteuert | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | anwendungen.oeffentlich.behoerde | src/features/anwendungen/pages/BehoerdePage.tsx | 0 | db_first_mit_i18n_fallback | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | anwendungen.oeffentlich.feuerwehr | src/features/anwendungen/pages/FeuerwehrPage.tsx | 0 | db_first_mit_i18n_fallback | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | anwendungen.oeffentlich.schwimmbad | src/features/anwendungen/pages/SchwimmbadPage.tsx | 0 | db_first_mit_i18n_fallback | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | anwendungen.oeffentliche-hand | src/features/anwendungen/pages/OeffentlicheHandPage.tsx | 4 | db_first_mit_i18n_fallback, cms_gesteuert | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | anwendungen.referenzen.detail | src/features/anwendungen/pages/ReferenzprojektDetailPage.tsx | 0 | db_first_mit_i18n_fallback | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | anwendungen.referenzprojekte | src/features/anwendungen/pages/ReferenzprojektePage.tsx | 3 | db_first_mit_i18n_fallback, cms_gesteuert | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | anwendungen.root | src/features/anwendungen/pages/AnwendungenPage.tsx | 22 | db_first_mit_i18n_fallback, cms_gesteuert | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | anwendungen.wohnen.einfamilienhaus | src/features/anwendungen/pages/EinfamilienhausPage.tsx | 0 | db_first_mit_i18n_fallback | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | anwendungen.wohnen.grossanlage | src/features/anwendungen/pages/GrossanlagePage.tsx | 0 | db_first_mit_i18n_fallback | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | anwendungen.wohnen.mehrfamilienhaus | src/features/anwendungen/pages/MehrfamilienhausPage.tsx | 0 | db_first_mit_i18n_fallback | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | anwendungen.wohnen.sanierung | src/features/anwendungen/pages/SanierungPage.tsx | 0 | db_first_mit_i18n_fallback | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | anwendungen.zutrittskontrolle-bcm | src/features/anwendungen/pages/ZutrittskontrolleBCMPage.tsx | 14 | db_first_mit_i18n_fallback | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | eingangssysteme.beratung | src/features/eingangssysteme/pages/EntryBeratungPage.tsx | 5 | db_first_mit_i18n_fallback, cms_gesteuert | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | eingangssysteme.design | src/features/eingangssysteme/pages/EntryDesignPage.tsx | 7 | db_first_mit_i18n_fallback, cms_gesteuert | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | eingangssysteme.funktionalitaet | src/features/eingangssysteme/pages/EntryFunktionalitaetPage.tsx | 12 | db_first_mit_i18n_fallback, cms_gesteuert | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | eingangssysteme.integrationsformen | src/features/eingangssysteme/pages/EntryIntegrationsformenPage.tsx | 9 | db_first_mit_i18n_fallback, cms_gesteuert | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | eingangssysteme.material | src/features/eingangssysteme/pages/EntryMaterialPage.tsx | 11 | db_first_mit_i18n_fallback, cms_gesteuert | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | eingangssysteme.referenzen | src/features/eingangssysteme/pages/EntryReferenzenPage.tsx | 6 | db_first_mit_i18n_fallback, cms_gesteuert | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | eingangssysteme.root | src/features/eingangssysteme/pages/EntrySystemPage.tsx | 20 | db_first_mit_i18n_fallback, cms_gesteuert | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | eingangssysteme.standards | src/features/eingangssysteme/pages/EntryStandardsPage.tsx | 9 | db_first_mit_i18n_fallback, cms_gesteuert | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | gebaeudekommunikation.beschilderung | src/features/signage/pages/BeschilderungPage.tsx | 8 | db_first_mit_i18n_fallback, cms_gesteuert | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | gebaeudekommunikation.root | src/features/gebaeudekommunikation/pages/TuerkommunikationPage.tsx | 15 | db_first_mit_i18n_fallback, cms_gesteuert | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | gebaeudekommunikation.snipdoo-ip | src/features/gebaeudekommunikation/pages/SnipdooIpPage.tsx | 21 | db_first_mit_i18n_fallback, cms_gesteuert | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | gebaeudekommunikation.systemloesungen | src/features/gebaeudekommunikation/pages/SystemloesungenPage.tsx | 18 | db_first_mit_i18n_fallback, cms_gesteuert | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | gebaeudemanagement.alarmanlagenkopplung | src/features/gebaeudemanagement/pages/AlarmanlagenkopplungPage.tsx | 4 | db_first_mit_i18n_fallback, cms_gesteuert | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | gebaeudemanagement.root | src/features/gebaeudemanagement/pages/GebaeudemanagementPage.tsx | 8 | db_first_mit_i18n_fallback, cms_gesteuert | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | home.start | src/features/home/pages/HomePage.tsx | 21 | db_first_mit_i18n_fallback, cms_gesteuert | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | karriere.root | src/features/karriere/pages/KarrierePage.tsx | 13 | db_first_mit_i18n_fallback, cms_gesteuert | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | legal.agb | src/features/legal/pages/AgbPage.tsx | 3 | db_first_mit_i18n_fallback, cms_gesteuert | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | legal.datenschutz | src/features/legal/pages/DatenschutzPage.tsx | 3 | db_first_mit_i18n_fallback, cms_gesteuert | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | legal.impressum | src/features/legal/pages/ImpressumPage.tsx | 3 | db_first_mit_i18n_fallback, cms_gesteuert | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | presse.root | src/features/presse/pages/PressePage.tsx | 8 | db_first_mit_i18n_fallback, cms_gesteuert | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | service.downloads | src/features/service/pages/DownloadsPage.tsx | 24 | db_first_mit_i18n_fallback, cms_gesteuert | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | service.ersatzteile | src/features/service/pages/ErsatzteilePage.tsx | 15 | db_first_mit_i18n_fallback, cms_gesteuert | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | service.planen-konfigurieren | src/features/service/pages/PlanenKonfigurierenPage.tsx | 31 | db_first_mit_i18n_fallback, cms_gesteuert | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | service.technischer-support | src/features/service/pages/TechnischerSupportPage.tsx | 16 | db_first_mit_i18n_fallback, cms_gesteuert | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | signage.root | src/features/signage/pages/SignagePage.tsx | 9 | db_first_mit_i18n_fallback, cms_gesteuert | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | wissen.akademie | src/features/wissen/pages/AkademiePage.tsx | 17 | db_first_mit_i18n_fallback, cms_gesteuert | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | zutrittskontrolle.bcm-handsender | src/features/zutrittskontrolle/pages/BcmHandsenderPage.tsx | 15 | db_first_mit_i18n_fallback, cms_gesteuert | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | zutrittskontrolle.bcm-online-leser | src/features/zutrittskontrolle/pages/BcmOnlineLeserPage.tsx | 17 | db_first_mit_i18n_fallback, cms_gesteuert | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | zutrittskontrolle.elektronische-drueckergarnitur | src/features/zutrittskontrolle/pages/ElektronischeDrueckergarniturPage.tsx | 19 | db_first_mit_i18n_fallback, cms_gesteuert | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | zutrittskontrolle.elektronischer-knaufzylinder | src/features/zutrittskontrolle/pages/ElektronischerKnaufzylinderPage.tsx | 17 | db_first_mit_i18n_fallback, cms_gesteuert | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | zutrittskontrolle.fahrstuhlsteuerung | src/features/zutrittskontrolle/pages/FahrstuhlsteuerungPage.tsx | 9 | db_first_mit_i18n_fallback, cms_gesteuert | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | zutrittskontrolle.funkvernetzte-offline-leser | src/features/zutrittskontrolle/pages/FunkvernetzteOfflineLeserPage.tsx | 15 | db_first_mit_i18n_fallback, cms_gesteuert | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |
| D | zutrittskontrolle.vorhaengeschloss | src/features/zutrittskontrolle/pages/VorhaengeschlossPage.tsx | 15 | db_first_mit_i18n_fallback, cms_gesteuert | i18n-Fallback nach DB-Vollabdeckung streichen (Whitelist + Migration). |