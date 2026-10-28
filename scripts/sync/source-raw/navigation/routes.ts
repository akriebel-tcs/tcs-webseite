/**
 * Zentrale Route-Konstanten (Etappe 4b).
 *
 * Werte entsprechen 1:1 dem aktuellen Ist-Stand aus `src/App.tsx` und
 * `docs/navigation-inventory.md`. Keine Slug-Reform, keine /de- oder
 * /en-Routen, keine Korrektur von Platzhalter-Links.
 *
 * "#" markiert bewusst nicht aktivierte Platzhalter (z.B. Legal-Links,
 * noch nicht freigegebene Bereiche). Diese werden NICHT in dieser Etappe
 * verändert.
 */

export const ROUTES = {
  home: {
    root: "/",
    ueberTCS: "/ueber-tcs",
  },
  gebaeudekommunikation: {
    /**
     * Aktive Root-Route für den Hauptbereich Gebäudekommunikation (Etappe 14d-4).
     * Vorgänger: `/tuerkommunikation` (jetzt Fallback `tuerkommunikationLegacy`).
     */
    root: "/gebaeudekommunikation",
    /** Legacy-Fallback-URL für bisherigen Root – bleibt für Bestandslinks erreichbar, nicht aktiv verlinken. */
    tuerkommunikationLegacy: "/tuerkommunikation",
    /**
     * Aktive Unterseiten-URLs (Etappe 14d-5): fachlich unter /gebaeudekommunikation verschachtelt.
     * Vorgänger (jetzt Legacy-Fallbacks): /tuersprechanlagen, /briefkastenanlagen, /grossanlagen, /systemloesungen.
     */
    tuersprechanlagen: "/gebaeudekommunikation/tuersprechanlagen",
    briefkastenanlagen: "/gebaeudekommunikation/briefkastenanlagen",
    /**
     * Aktive URL für Beschilderung & Wayfinding (Etappe 14e-2c):
     * fachlich unter /gebaeudekommunikation eingeordnet.
     * Vorgänger /beschilderung bleibt als Legacy-Fallback (`beschilderungLegacy`).
     */
    beschilderung: "/gebaeudekommunikation/beschilderung",
    /** Legacy-Fallback-URL (Etappe 14e-2c) – nur für Bestandslinks, nicht aktiv verlinken. */
    beschilderungLegacy: "/beschilderung",
    grossanlagen: "/gebaeudekommunikation/grossanlagen",
    systemloesungen: "/gebaeudekommunikation/systemloesungen",
    /** Legacy-Fallback-URLs (Etappe 14d-5) – nur für Bestandslinks, nicht aktiv verlinken. */
    tuersprechanlagenLegacy: "/tuersprechanlagen",
    briefkastenanlagenLegacy: "/briefkastenanlagen",
    grossanlagenLegacy: "/grossanlagen",
    systemloesungenLegacy: "/systemloesungen",
    /**
     * Aktive URL für snipdoo IP (Etappe 14d-3).
     * Fachlich dem Bereich Gebäudekommunikation zugeordnet.
     * Vorgänger:
     *  - "/snipdoo-ip" (Etappe 14d-2, jetzt Fallback `snipdooIpShort`)
     *  - "/systemtechnik/snipdoo-ip" (Legacy, jetzt `snipdooIpLegacy`)
     * Beide bleiben als Fallback-Routen erreichbar, werden aber nicht aktiv verlinkt.
     */
    snipdooIp: "/gebaeudekommunikation/snipdoo-ip",
    /** Fallback-URL aus Etappe 14d-2 – nur für Bestandslinks, nicht aktiv verlinken. */
    snipdooIpShort: "/snipdoo-ip",
    /** Legacy-Fallback-URL, nur für Bestandslinks – nicht aktiv verlinken. */
    snipdooIpLegacy: "/systemtechnik/snipdoo-ip",
  },
  zutrittskontrolle: {
    root: "/zutrittskontrolle",
    tuerenTore: "/zutrittskontrolle/tueren-tore",
    elektronischeDrueckergarnitur: "/zutrittskontrolle/elektronische-drueckergarnitur",
    mobilerZutritt: "/zutrittskontrolle/mobiler-zutritt",
    fahrstuhlsteuerung: "/zutrittskontrolle/fahrstuhlsteuerung",
    zufahrtenParkplaetze: "/zutrittskontrolle/zufahrten-parkplaetze",
  },
  gebaeudemanagement: {
    root: "/gebaeudemanagement",
    digitaleNamensanzeige: "/gebaeudemanagement/digitale-namensanzeige",
    schraenkeBehaelter: "/gebaeudemanagement/schraenke-behaelter",
    digitalSignage: "/gebaeudemanagement/digital-signage",
    reservierenBuchen: "/gebaeudemanagement/reservieren-buchen",
    bcmBuchungssystem: "/gebaeudemanagement/bcm-buchungssystem",
    bcmInfoboard: "/gebaeudemanagement/bcm-infoboard",
    /**
     * Eigene Platzhalterseite für Alarmanlagenkopplung (Etappe 14e-1).
     * Vorher zeigte der Menüpunkt auf `root`, jetzt auf eine eigene Zielroute.
     */
    alarmanlagenkopplung: "/gebaeudemanagement/alarmanlagenkopplung",
  },
  eingangssysteme: {
    root: "/entry-system",
    design: "/entry-system/design",
    funktionalitaet: "/entry-system/funktionalitaet",
    material: "/entry-system/material",
    integrationsformen: "/entry-system/integrationsformen",
    referenzen: "/entry-system/referenzen",
    standards: "/entry-system/standards",
    beratung: "/entry-system/beratung",
  },
  anwendungen: {
    root: "/anwendungen",
    wohnbau: "/anwendungen/wohnbau",
    einfamilienhaus: "/anwendungen/einfamilienhaus",
    mehrfamilienhaus: "/anwendungen/mehrfamilienhaus",
    grossanlage: "/anwendungen/grossanlage",
    sanierung: "/anwendungen/sanierung",
    pflege: "/anwendungen/pflege",
    klinik: "/anwendungen/klinik",
    behoerde: "/anwendungen/behoerde",
    feuerwehr: "/anwendungen/feuerwehr",
    schwimmbad: "/anwendungen/schwimmbad",
    concierge: "/anwendungen/concierge",
    interneKommunikation: "/anwendungen/interne-kommunikation",
    digitaleNamensverwaltung: "/anwendungen/digitale-namensverwaltung",
    feuerwehrdurchsage: "/anwendungen/feuerwehrdurchsage",
    bidirektionaleVideo: "/anwendungen/bidirektionale-video",
    mobileTuerkommunikation: "/anwendungen/mobile-tuerkommunikation",
    zutrittskontrolleBCM: "/anwendungen/zutrittskontrolle-bcm",
    gesundheitseinrichtungen: "/anwendungen/gesundheitseinrichtungen",
    oeffentlicheHand: "/anwendungen/oeffentliche-hand",
    referenzprojekte: "/anwendungen/referenzprojekte",
    /**
     * Aktive URL für Bildungseinrichtungen (Etappe 14e-6):
     * fachlich unter /anwendungen verschachtelt.
     * Vorgänger /bildungseinrichtungen bleibt als Legacy-Fallback (`bildungseinrichtungenLegacy`).
     */
    bildungseinrichtungen: "/anwendungen/bildungseinrichtungen",
    /** Legacy-Fallback-URL (Etappe 14e-6) – nur für Bestandslinks, nicht aktiv verlinken. */
    bildungseinrichtungenLegacy: "/bildungseinrichtungen",
    /**
     * Aktive URL für Objektlösungen (Etappe 14e-7):
     * fachlich unter /anwendungen verschachtelt.
     * Vorgänger /objektloesungen bleibt als Legacy-Fallback (`objektloesungenLegacy`).
     */
    objektloesungen: "/anwendungen/objektloesungen",
    /** Legacy-Fallback-URL (Etappe 14e-7) – nur für Bestandslinks, nicht aktiv verlinken. */
    objektloesungenLegacy: "/objektloesungen",
  },
  service: {
    /**
     * Aktive Root-Route für den öffentlichen Service-Hub (Service-Center).
     * Vorher zeigte der Hauptnav-Eintrag „Service" auf einen Platzhalter (#).
     * Bestehende Unterseiten bleiben unter ihren bisherigen Slugs erreichbar.
     */
    root: "/service",
    /**
     * Eigene Seite für den Online-Produktkatalog (Etappe 19c-service-nav-correction).
     * Sichtbarer Direktzugriff aus dem Service-Dropdown; späterer Anschluss
     * an einen externen Katalog/Subdomain bleibt offen.
     */
    onlineProduktkatalog: "/service/online-produktkatalog",
    planenKonfigurieren: "/planen-konfigurieren",
    downloads: "/downloads",
    technischerSupport: "/technischer-support",
    ersatzteile: "/ersatzteile",
  },
  wissen: {
    akademie: "/akademie",
  },
  serviceportal: {
    root: "/serviceportal",
    registrieren: "/serviceportal/registrieren",
    passwortVergessen: "/serviceportal/passwort-vergessen",
  },
  meta: {
    kontakt: "/kontakt",
    karriere: "/karriere",
    presse: "/presse",
  },
  signage: {
    root: "/signage",
  },
  legal: {
    impressum: "/impressum",
    datenschutz: "/datenschutz",
    agb: "/agb",
  },
  placeholder: {
    root: "#",
  },
} as const;

export type Routes = typeof ROUTES;
