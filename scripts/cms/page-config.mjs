#!/usr/bin/env node
/**
 * Konfiguration aller CMS-Light-Seiten, gegliedert nach Bereichen.
 *
 * Wird vom Generator (`generate-page-migration.mjs`) und vom
 * Bereichs-Runner (`generate-bereich-sql.mjs`) gelesen.
 *
 * Konvention für `page_key`:
 *   meistens `${namespace}.${base_key}`. Bei flachen Namespaces
 *   (kontakt, signage, karriere, …) wird `base_key: ""` gesetzt — dann
 *   liest der Generator direkt vom Namespace-Root (ohne `_meta`).
 */

const COMMON_SKIP = ["seo", "subnav", "breadcrumbFallback", "_meta", "scroller", "nav"];
const HERO_TYPES = { hero: "hero" };

export const BEREICHE = {
  gebaeudekommunikation: [
    { page_key: "gebaeudekommunikation.tuersprechanlagen", route_path: "/gebaeudekommunikation/tuersprechanlagen", page_type: "T05", title_de: "Türsprechanlagen", title_en: "Door intercom systems", namespace: "gebaeudekommunikation", base_key: "tuersprechanlagen", skip: COMMON_SKIP, section_order: ["hero","ueberblick","aussenstationen","innenstationen","vorteile","snipdoo"], section_types: { hero:"hero", ueberblick:"intro", aussenstationen:"product-scroller", innenstationen:"product-scroller", vorteile:"feature-grid", snipdoo:"cta" } },
    { page_key: "gebaeudekommunikation.briefkastenanlagen", route_path: "/gebaeudekommunikation/briefkastenanlagen", page_type: "T05", title_de: "Briefkastenanlagen", title_en: "Mailbox systems", namespace: "gebaeudekommunikation", base_key: "briefkastenanlagen", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "gebaeudekommunikation.systemloesungen", route_path: "/gebaeudekommunikation/systemloesungen", page_type: "T04", title_de: "Systemlösungen", title_en: "System solutions", namespace: "gebaeudekommunikation", base_key: "systemloesungen", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "gebaeudekommunikation.grossanlagen", route_path: "/gebaeudekommunikation/grossanlagen", page_type: "T05", title_de: "Großanlagen", title_en: "Large-scale systems", namespace: "gebaeudekommunikation", base_key: "grossanlagen", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "gebaeudekommunikation.snipdoo-ip", route_path: "/gebaeudekommunikation/snipdoo-ip", page_type: "T05", title_de: "snipdoo IP", title_en: "snipdoo IP", namespace: "gebaeudekommunikation", base_key: "snipdooIp", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "gebaeudekommunikation.root", route_path: "/gebaeudekommunikation", page_type: "T03", title_de: "Gebäudekommunikation", title_en: "Building communication", namespace: "gebaeudekommunikation", base_key: "root", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "gebaeudekommunikation.beschilderung", route_path: "/gebaeudekommunikation/beschilderung", page_type: "T05", title_de: "Beschilderung", title_en: "Signage", namespace: "gebaeudekommunikation", base_key: "beschilderung", skip: COMMON_SKIP, section_types: HERO_TYPES },
  ],
  zutrittskontrolle: [
    { page_key: "zutrittskontrolle.root", route_path: "/zutrittskontrolle", page_type: "T04", title_de: "Zutrittskontrolle", title_en: "Access control", namespace: "zutrittskontrolle", base_key: "root", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "zutrittskontrolle.tueren-tore", route_path: "/zutrittskontrolle/tueren-tore", page_type: "T05", title_de: "Türen & Tore", title_en: "Doors & gates", namespace: "zutrittskontrolle", base_key: "tuerenTore", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "zutrittskontrolle.mobiler-zutritt", route_path: "/zutrittskontrolle/mobiler-zutritt", page_type: "T05", title_de: "Mobiler Zutritt", title_en: "Mobile access", namespace: "zutrittskontrolle", base_key: "mobilerZutritt", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "zutrittskontrolle.fahrstuhlsteuerung", route_path: "/zutrittskontrolle/fahrstuhlsteuerung", page_type: "T05", title_de: "Fahrstuhlsteuerung", title_en: "Elevator control", namespace: "zutrittskontrolle", base_key: "fahrstuhlsteuerung", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "zutrittskontrolle.zufahrten-parkplaetze", route_path: "/zutrittskontrolle/zufahrten-parkplaetze", page_type: "T05", title_de: "Zufahrten & Parkplätze", title_en: "Driveways & parking", namespace: "zutrittskontrolle", base_key: "zufahrtenParkplaetze", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "zutrittskontrolle.elektronische-drueckergarnitur", route_path: "/zutrittskontrolle/elektronische-drueckergarnitur", page_type: "T05", title_de: "Elektronische Drückergarnitur", title_en: "Electronic door handle", namespace: "zutrittskontrolle", base_key: "elektronischeDrueckergarnitur", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "zutrittskontrolle.elektronischer-knaufzylinder", route_path: "/zutrittskontrolle/elektronischer-knaufzylinder", page_type: "T05", title_de: "Elektronischer Knaufzylinder", title_en: "Electronic knob cylinder", namespace: "zutrittskontrolle", base_key: "knaufzylinder", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "zutrittskontrolle.bcm-handsender", route_path: "/zutrittskontrolle/bcm-handsender", page_type: "T05", title_de: "BCM Handsender", title_en: "BCM hand transmitter", namespace: "zutrittskontrolle", base_key: "handsender", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "zutrittskontrolle.funkvernetzte-offline-leser", route_path: "/zutrittskontrolle/funkvernetzte-offline-leser", page_type: "T05", title_de: "Funkvernetzte Offline-Leser", title_en: "Wireless offline readers", namespace: "zutrittskontrolle", base_key: "funkvernetzteLeser", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "zutrittskontrolle.bcm-online-leser", route_path: "/zutrittskontrolle/bcm-online-leser", page_type: "T05", title_de: "BCM Online-Leser", title_en: "BCM online readers", namespace: "zutrittskontrolle", base_key: "onlineLeser", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "zutrittskontrolle.vorhaengeschloss", route_path: "/zutrittskontrolle/vorhaengeschloss", page_type: "T05", title_de: "Elektronisches Vorhängeschloss", title_en: "Electronic padlock", namespace: "zutrittskontrolle", base_key: "vorhaengeschloss", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "zutrittskontrolle.biometrie", route_path: "/zutrittskontrolle/biometrie", page_type: "T05", title_de: "Biometrie", title_en: "Biometrics", namespace: "zutrittskontrolle", base_key: "biometrie", skip: COMMON_SKIP, section_types: HERO_TYPES },
  ],
  eingangssysteme: [
    { page_key: "eingangssysteme.root", route_path: "/entry-system", page_type: "T03", title_de: "Eingangssysteme", title_en: "Entry systems", namespace: "eingangssysteme", base_key: "root", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "eingangssysteme.design", route_path: "/entry-system/design", page_type: "T05", title_de: "Design", title_en: "Design", namespace: "eingangssysteme", base_key: "design", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "eingangssysteme.funktionalitaet", route_path: "/entry-system/funktionalitaet", page_type: "T05", title_de: "Funktionalität", title_en: "Functionality", namespace: "eingangssysteme", base_key: "funktionalitaet", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "eingangssysteme.material", route_path: "/entry-system/material", page_type: "T05", title_de: "Material", title_en: "Material", namespace: "eingangssysteme", base_key: "material", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "eingangssysteme.integrationsformen", route_path: "/entry-system/integrationsformen", page_type: "T05", title_de: "Integrationsformen", title_en: "Integration forms", namespace: "eingangssysteme", base_key: "integrationsformen", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "eingangssysteme.referenzen", route_path: "/entry-system/referenzen", page_type: "T05", title_de: "Referenzen", title_en: "References", namespace: "eingangssysteme", base_key: "referenzen", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "eingangssysteme.standards", route_path: "/entry-system/standards", page_type: "T05", title_de: "Standards", title_en: "Standards", namespace: "eingangssysteme", base_key: "standards", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "eingangssysteme.beratung", route_path: "/entry-system/beratung", page_type: "T05", title_de: "Beratung", title_en: "Consultation", namespace: "eingangssysteme", base_key: "beratung", skip: COMMON_SKIP, section_types: HERO_TYPES },
  ],
  gebaeudemanagement: [
    { page_key: "gebaeudemanagement.root", route_path: "/gebaeudemanagement", page_type: "T03", title_de: "Gebäudemanagement", title_en: "Building management", namespace: "gebaeudemanagement", base_key: "root", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "gebaeudemanagement.alarmanlagenkopplung", route_path: "/gebaeudemanagement/alarmanlagenkopplung", page_type: "T05", title_de: "Alarmanlagenkopplung", title_en: "Alarm system coupling", namespace: "gebaeudemanagement", base_key: "alarmanlagenkopplung", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "gebaeudemanagement.digital-signage", route_path: "/gebaeudemanagement/digital-signage", page_type: "T05", title_de: "Digital Signage", title_en: "Digital Signage", namespace: "gebaeudemanagement", base_key: "digitalSignage", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "gebaeudemanagement.reservieren-buchen", route_path: "/gebaeudemanagement/reservieren-buchen", page_type: "T05", title_de: "Reservieren & Buchen", title_en: "Reserve & book", namespace: "gebaeudemanagement", base_key: "reservierenBuchen", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "gebaeudemanagement.schraenke-behaelter", route_path: "/gebaeudemanagement/schraenke-behaelter", page_type: "T05", title_de: "Schränke & Behälter", title_en: "Cabinets & containers", namespace: "gebaeudemanagement", base_key: "schraenkeBehaelter", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "gebaeudemanagement.digitale-namensanzeige", route_path: "/gebaeudemanagement/digitale-namensanzeige", page_type: "T05", title_de: "Digitale Namensanzeige", title_en: "Digital name display", namespace: "gebaeudemanagement", base_key: "digitaleNamensanzeige", skip: COMMON_SKIP, section_types: HERO_TYPES },
  ],
  anwendungen: [
    { page_key: "anwendungen.root", route_path: "/anwendungen", page_type: "T02", title_de: "Anwendungen", title_en: "Applications", namespace: "anwendungen", base_key: "root", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "anwendungen.objektloesungen", route_path: "/anwendungen/objektloesungen", page_type: "T04", title_de: "Objektlösungen", title_en: "Object solutions", namespace: "anwendungen", base_key: "uebersichten.objektloesungen", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "anwendungen.bildungseinrichtungen", route_path: "/anwendungen/bildungseinrichtungen", page_type: "T04", title_de: "Bildungseinrichtungen", title_en: "Educational institutions", namespace: "anwendungen", base_key: "uebersichten.bildung", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "anwendungen.wohnbau", route_path: "/anwendungen/wohnbau", page_type: "T04", title_de: "Wohnbau", title_en: "Residential", namespace: "anwendungen", base_key: "uebersichten.wohnen", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "anwendungen.gesundheitseinrichtungen", route_path: "/anwendungen/gesundheitseinrichtungen", page_type: "T04", title_de: "Gesundheitseinrichtungen", title_en: "Healthcare facilities", namespace: "anwendungen", base_key: "uebersichten.gesundheit", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "anwendungen.oeffentliche-hand", route_path: "/anwendungen/oeffentliche-hand", page_type: "T04", title_de: "Öffentliche Hand", title_en: "Public sector", namespace: "anwendungen", base_key: "uebersichten.oeffentlich", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "anwendungen.einfamilienhaus", route_path: "/anwendungen/einfamilienhaus", page_type: "T05", title_de: "Einfamilienhaus", title_en: "Single-family house", namespace: "anwendungen", base_key: "wohnen.einfamilienhaus", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "anwendungen.mehrfamilienhaus", route_path: "/anwendungen/mehrfamilienhaus", page_type: "T05", title_de: "Mehrfamilienhaus", title_en: "Multi-family house", namespace: "anwendungen", base_key: "wohnen.mehrfamilienhaus", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "anwendungen.grossanlage", route_path: "/anwendungen/grossanlage", page_type: "T05", title_de: "Großanlage", title_en: "Large complex", namespace: "anwendungen", base_key: "wohnen.grossanlage", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "anwendungen.sanierung", route_path: "/anwendungen/sanierung", page_type: "T05", title_de: "Sanierung", title_en: "Renovation", namespace: "anwendungen", base_key: "wohnen.sanierung", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "anwendungen.pflege", route_path: "/anwendungen/pflege", page_type: "T05", title_de: "Pflege", title_en: "Care", namespace: "anwendungen", base_key: "gesundheit.pflege", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "anwendungen.klinik", route_path: "/anwendungen/klinik", page_type: "T05", title_de: "Klinik", title_en: "Clinic", namespace: "anwendungen", base_key: "gesundheit.klinik", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "anwendungen.behoerde", route_path: "/anwendungen/behoerde", page_type: "T05", title_de: "Behörde", title_en: "Public authority", namespace: "anwendungen", base_key: "oeffentlich.behoerde", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "anwendungen.feuerwehr", route_path: "/anwendungen/feuerwehr", page_type: "T05", title_de: "Feuerwehr", title_en: "Fire brigade", namespace: "anwendungen", base_key: "oeffentlich.feuerwehr", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "anwendungen.schwimmbad", route_path: "/anwendungen/schwimmbad", page_type: "T05", title_de: "Schwimmbad", title_en: "Swimming pool", namespace: "anwendungen", base_key: "oeffentlich.schwimmbad", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "anwendungen.concierge", route_path: "/anwendungen/concierge", page_type: "T05", title_de: "Concierge", title_en: "Concierge", namespace: "anwendungen", base_key: "funktionen.concierge", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "anwendungen.interne-kommunikation", route_path: "/anwendungen/interne-kommunikation", page_type: "T05", title_de: "Interne Kommunikation", title_en: "Internal communication", namespace: "anwendungen", base_key: "funktionen.interneKommunikation", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "anwendungen.digitale-namensverwaltung", route_path: "/anwendungen/digitale-namensverwaltung", page_type: "T05", title_de: "Digitale Namensverwaltung", title_en: "Digital name management", namespace: "anwendungen", base_key: "funktionen.digitaleNamensverwaltung", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "anwendungen.feuerwehrdurchsage", route_path: "/anwendungen/feuerwehrdurchsage", page_type: "T05", title_de: "Feuerwehrdurchsage", title_en: "Fire brigade announcement", namespace: "anwendungen", base_key: "funktionen.feuerwehrdurchsage", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "anwendungen.bidirektionale-video", route_path: "/anwendungen/bidirektionale-video", page_type: "T05", title_de: "Bidirektionale Video-Kommunikation", title_en: "Bidirectional video communication", namespace: "anwendungen", base_key: "funktionen.bidirektionaleVideo", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "anwendungen.mobile-tuerkommunikation", route_path: "/anwendungen/mobile-tuerkommunikation", page_type: "T05", title_de: "Mobile Türkommunikation", title_en: "Mobile door communication", namespace: "anwendungen", base_key: "funktionen.mobileTuerkommunikation", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "anwendungen.zutrittskontrolle-bcm", route_path: "/anwendungen/zutrittskontrolle-bcm", page_type: "T05", title_de: "Zutrittskontrolle BCM", title_en: "Access control BCM", namespace: "anwendungen", base_key: "funktionen.zutrittskontrolleBCM", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "anwendungen.referenzprojekte", route_path: "/anwendungen/referenzprojekte", page_type: "T04", title_de: "Referenzprojekte", title_en: "Reference projects", namespace: "anwendungen", base_key: "referenzen.list", skip: COMMON_SKIP, section_types: HERO_TYPES },
  ],
  personas: [
    { page_key: "personas.bauherr", route_path: "/personas/bauherr", page_type: "T04", title_de: "Bauherr", title_en: "Builder", namespace: "personas", base_key: "bauherr", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "personas.architekt", route_path: "/personas/architekt", page_type: "T04", title_de: "Architekt", title_en: "Architect", namespace: "personas", base_key: "architekt", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "personas.fachplaner", route_path: "/personas/fachplaner", page_type: "T04", title_de: "Fachplaner", title_en: "Specialist planner", namespace: "personas", base_key: "fachplaner", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "personas.handwerk", route_path: "/personas/handwerk", page_type: "T04", title_de: "Handwerk", title_en: "Trades", namespace: "personas", base_key: "handwerk", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "personas.fachhandel", route_path: "/personas/fachhandel", page_type: "T04", title_de: "Fachhandel", title_en: "Specialist retail", namespace: "personas", base_key: "fachhandel", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "personas.wohnungswirtschaft", route_path: "/personas/wohnungswirtschaft", page_type: "T04", title_de: "Wohnungswirtschaft", title_en: "Housing industry", namespace: "personas", base_key: "wohnungswirtschaft", skip: COMMON_SKIP, section_types: HERO_TYPES },
  ],
  service: [
    { page_key: "service.hub", route_path: "/service", page_type: "T02", title_de: "Service", title_en: "Service", namespace: "service", base_key: "hub", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "service.online-produktkatalog", route_path: "/service/online-produktkatalog", page_type: "T05", title_de: "Online-Produktkatalog", title_en: "Online product catalog", namespace: "service", base_key: "katalog", skip: [...COMMON_SKIP, "diagnostics", "v2", "filters", "pdp"], section_types: HERO_TYPES },
    { page_key: "service.planen-konfigurieren", route_path: "/planen-konfigurieren", page_type: "T05", title_de: "Planen & Konfigurieren", title_en: "Plan & configure", namespace: "service", base_key: "seiten.planenKonfigurieren", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "service.downloads", route_path: "/downloads", page_type: "T05", title_de: "Downloads", title_en: "Downloads", namespace: "service", base_key: "seiten.downloads", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "service.technischer-support", route_path: "/technischer-support", page_type: "T05", title_de: "Technischer Support", title_en: "Technical support", namespace: "service", base_key: "seiten.technischerSupport", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "service.ersatzteile", route_path: "/ersatzteile", page_type: "T05", title_de: "Ersatzteile", title_en: "Spare parts", namespace: "service", base_key: "seiten.ersatzteile", skip: COMMON_SKIP, section_types: HERO_TYPES },
  ],
  legal: [
    { page_key: "legal.impressum", route_path: "/impressum", page_type: "T19", title_de: "Impressum", title_en: "Imprint", namespace: "legal", base_key: "seiten.impressum", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "legal.datenschutz", route_path: "/datenschutz", page_type: "T19", title_de: "Datenschutz", title_en: "Privacy", namespace: "legal", base_key: "seiten.datenschutz", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "legal.agb", route_path: "/agb", page_type: "T19", title_de: "AGB", title_en: "Terms", namespace: "legal", base_key: "seiten.agb", skip: COMMON_SKIP, section_types: HERO_TYPES },
  ],
  serviceportal: [
    { page_key: "serviceportal.login", route_path: "/serviceportal", page_type: "T17", title_de: "Serviceportal Login", title_en: "Service portal login", namespace: "serviceportal", base_key: "login", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "serviceportal.passwort-vergessen", route_path: "/serviceportal/passwort-vergessen", page_type: "T17", title_de: "Passwort vergessen", title_en: "Forgot password", namespace: "serviceportal", base_key: "passwortVergessen", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "serviceportal.registrieren", route_path: "/serviceportal/registrieren", page_type: "T17", title_de: "Registrieren", title_en: "Register", namespace: "serviceportal", base_key: "registrieren", skip: COMMON_SKIP, section_types: HERO_TYPES },
  ],
  flach: [
    // Flache Namespaces (kein base_key wrapper)
    { page_key: "kontakt.root", route_path: "/kontakt", page_type: "T11", title_de: "Kontakt", title_en: "Contact", namespace: "kontakt", base_key: "", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "kontakt-bcm.root", route_path: "/kontakt/bcm", page_type: "T11", title_de: "Kontakt BCM", title_en: "Contact BCM", namespace: "kontakt-bcm", base_key: "", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "karriere.root", route_path: "/karriere", page_type: "T15", title_de: "Karriere", title_en: "Careers", namespace: "karriere", base_key: "", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "presse.root", route_path: "/presse", page_type: "T05", title_de: "Presse", title_en: "Press", namespace: "presse", base_key: "", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "signage.root", route_path: "/signage", page_type: "T05", title_de: "Signage", title_en: "Signage", namespace: "signage", base_key: "", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "wissen.akademie", route_path: "/akademie", page_type: "T05", title_de: "Akademie", title_en: "Academy", namespace: "wissen", base_key: "seiten.akademie", skip: COMMON_SKIP, section_types: HERO_TYPES },
    { page_key: "home.ueber-tcs", route_path: "/ueber-tcs", page_type: "T03", title_de: "Über TCS", title_en: "About TCS", namespace: "home", base_key: "ueberTcs", skip: COMMON_SKIP, section_types: HERO_TYPES },
  ],
};
