/**
 * Statisches Seitenregister (Etappe cms-page-registry-static-1).
 *
 * Reine Datenstruktur als Vorbereitung für ein späteres CMS-Light-System.
 * - Wird in dieser Etappe NICHT importiert (nicht von Pages, Renderern, Navigation).
 * - Verändert die Website nicht.
 * - Verändert keine Routen, keine Navigation, keine Breadcrumbs, keine i18n.
 *
 * Begriffe und Stabilitätsregeln: docs/01-strategy/cms-id-key-modell.md
 * Seitentypen T01–T21:                docs/01-strategy/seitentyp-taxonomie.md
 *
 * Stabilitäts-Regel: `pageKey` bleibt stabil, auch wenn sich `routePath`,
 * Label oder Navigation ändern.
 */

export type PageStatus = "active" | "legacy" | "stub" | "in-progress";

export type PageType =
  | "T01" | "T02" | "T03" | "T04" | "T05" | "T06" | "T07"
  | "T08" | "T09" | "T10a" | "T10b" | "T11" | "T12" | "T13"
  | "T14" | "T15" | "T16a" | "T16b" | "T17" | "T18" | "T19"
  | "T20" | "T21";

export interface PageEntry {
  /** Global eindeutige technische ID, abgeleitet aus routes.ts-Konstantenpfad. */
  pageKey: string;
  /** Heutige URL. Veränderlich; bei Umzug wird Legacy-Eintrag separat geführt. */
  routePath: string;
  /** Verbindlicher Seitentyp aus Taxonomie T01–T21. */
  pageType: PageType;
  /** Optionale fachliche Mutter-Seite (für spätere Hierarchie-Logik). */
  parentPageKey?: string;
  /** Lebenszyklus des Eintrags. */
  status: PageStatus;
  /** Freitext-Hinweis (z. B. Legacy-Verweis, dynamische Route, TODO type review). */
  note?: string;
}

export const PAGE_REGISTRY: PageEntry[] = [
  // ---------- Home ----------
  {
    pageKey: "home.root",
    routePath: "/",
    pageType: "T01",
    status: "active",
    note: "Startseite ist Sonderfall; kein normaler T01-Domain-Hub. Container-Page (siehe i18n exemptPages); pageType T01 nur als technischer Pflichtwert gesetzt, fachlich keine Domain.",
  },
  {
    pageKey: "home.ueberTCS",
    routePath: "/ueber-tcs",
    pageType: "T18",
    status: "active",
  },

  // ---------- Meta (Kontakt / Karriere / Presse) ----------
  {
    pageKey: "meta.kontakt",
    routePath: "/kontakt",
    pageType: "T19",
    status: "active",
  },
  {
    pageKey: "meta.kontaktBcm",
    routePath: "/kontakt/bcm",
    pageType: "T19",
    parentPageKey: "meta.kontakt",
    status: "active",
    note: "Nicht in routes.ts geführt; Route in src/features/kontakt/routes.tsx.",
  },
  {
    pageKey: "meta.karriere",
    routePath: "/karriere",
    pageType: "T19",
    status: "active",
  },
  {
    pageKey: "meta.presse",
    routePath: "/presse",
    pageType: "T19",
    status: "active",
  },

  // ---------- Wissen ----------
  {
    pageKey: "wissen.akademie",
    routePath: "/akademie",
    pageType: "T10b",
    status: "active",
  },

  // ---------- Signage / Beschilderung ----------
  {
    pageKey: "signage.root",
    routePath: "/signage",
    pageType: "T01",
    status: "active",
    note: "Schwacher T01 (Übersicht/Teaser); Signage-Domain wird perspektivisch unter Gebäudekommunikation geführt.",
  },
  {
    pageKey: "gebaeudekommunikation.beschilderung",
    routePath: "/gebaeudekommunikation/beschilderung",
    pageType: "T06",
    parentPageKey: "gebaeudekommunikation.root",
    status: "active",
    note: "Page liegt in src/features/signage/, gemountet unter /gebaeudekommunikation.",
  },
  {
    pageKey: "gebaeudekommunikation.beschilderungLegacy",
    routePath: "/beschilderung",
    pageType: "T06",
    parentPageKey: "gebaeudekommunikation.beschilderung",
    status: "legacy",
    note: "Legacy-Fallback (Etappe 14e-2c) → aktiv: gebaeudekommunikation.beschilderung.",
  },

  // ---------- Service ----------
  {
    pageKey: "service.root",
    routePath: "/service",
    pageType: "T16a",
    status: "active",
  },
  {
    pageKey: "service.onlineProduktkatalog",
    routePath: "/service/online-produktkatalog",
    pageType: "T16b",
    parentPageKey: "service.root",
    status: "active",
  },
  {
    pageKey: "service.produktdetail",
    routePath: "/service/online-produktkatalog/:pdpSlug",
    pageType: "T04",
    parentPageKey: "service.onlineProduktkatalog",
    status: "active",
    note: "Dynamische Route (PDP). Inhalte/Produktdaten kommen aus externer Produktdatenbank, nicht aus dem CMS-Modell.",
  },
  {
    pageKey: "service.planenKonfigurieren",
    routePath: "/planen-konfigurieren",
    pageType: "T16b",
    parentPageKey: "service.root",
    status: "active",
    note: "Flacher Slug; mögliche spätere Konsolidierung unter /service/*.",
  },
  {
    pageKey: "service.downloads",
    routePath: "/downloads",
    pageType: "T16b",
    parentPageKey: "service.root",
    status: "active",
    note: "Flacher Slug; mögliche spätere Konsolidierung unter /service/downloads.",
  },
  {
    pageKey: "service.technischerSupport",
    routePath: "/technischer-support",
    pageType: "T16b",
    parentPageKey: "service.root",
    status: "active",
    note: "Flacher Slug.",
  },
  {
    pageKey: "service.ersatzteile",
    routePath: "/ersatzteile",
    pageType: "T16b",
    parentPageKey: "service.root",
    status: "active",
    note: "Flacher Slug.",
  },

  // ---------- Serviceportal ----------
  {
    pageKey: "serviceportal.root",
    routePath: "/serviceportal",
    pageType: "T17",
    status: "stub",
  },
  {
    pageKey: "serviceportal.registrieren",
    routePath: "/serviceportal/registrieren",
    pageType: "T17",
    parentPageKey: "serviceportal.root",
    status: "stub",
  },
  {
    pageKey: "serviceportal.passwortVergessen",
    routePath: "/serviceportal/passwort-vergessen",
    pageType: "T17",
    parentPageKey: "serviceportal.root",
    status: "stub",
  },

  // ---------- Gebäudekommunikation ----------
  {
    pageKey: "gebaeudekommunikation.root",
    routePath: "/gebaeudekommunikation",
    pageType: "T01",
    status: "active",
  },
  {
    pageKey: "gebaeudekommunikation.tuerkommunikationLegacy",
    routePath: "/tuerkommunikation",
    pageType: "T01",
    parentPageKey: "gebaeudekommunikation.root",
    status: "legacy",
    note: "Legacy-Fallback (Etappe 14d-4) → aktiv: gebaeudekommunikation.root.",
  },
  {
    pageKey: "gebaeudekommunikation.tuersprechanlagen",
    routePath: "/gebaeudekommunikation/tuersprechanlagen",
    pageType: "T03",
    parentPageKey: "gebaeudekommunikation.root",
    status: "active",
  },
  {
    pageKey: "gebaeudekommunikation.briefkastenanlagen",
    routePath: "/gebaeudekommunikation/briefkastenanlagen",
    pageType: "T03",
    parentPageKey: "gebaeudekommunikation.root",
    status: "active",
  },
  {
    pageKey: "gebaeudekommunikation.grossanlagen",
    routePath: "/gebaeudekommunikation/grossanlagen",
    pageType: "T03",
    parentPageKey: "gebaeudekommunikation.root",
    status: "active",
  },
  {
    pageKey: "gebaeudekommunikation.systemloesungen",
    routePath: "/gebaeudekommunikation/systemloesungen",
    pageType: "T02",
    parentPageKey: "gebaeudekommunikation.root",
    status: "active",
  },
  {
    pageKey: "gebaeudekommunikation.tuersprechanlagenLegacy",
    routePath: "/tuersprechanlagen",
    pageType: "T03",
    parentPageKey: "gebaeudekommunikation.tuersprechanlagen",
    status: "legacy",
    note: "Legacy-Fallback (Etappe 14d-5).",
  },
  {
    pageKey: "gebaeudekommunikation.briefkastenanlagenLegacy",
    routePath: "/briefkastenanlagen",
    pageType: "T03",
    parentPageKey: "gebaeudekommunikation.briefkastenanlagen",
    status: "legacy",
    note: "Legacy-Fallback (Etappe 14d-5).",
  },
  {
    pageKey: "gebaeudekommunikation.grossanlagenLegacy",
    routePath: "/grossanlagen",
    pageType: "T03",
    parentPageKey: "gebaeudekommunikation.grossanlagen",
    status: "legacy",
    note: "Legacy-Fallback (Etappe 14d-5).",
  },
  {
    pageKey: "gebaeudekommunikation.systemloesungenLegacy",
    routePath: "/systemloesungen",
    pageType: "T02",
    parentPageKey: "gebaeudekommunikation.systemloesungen",
    status: "legacy",
    note: "Legacy-Fallback (Etappe 14d-5).",
  },
  {
    pageKey: "gebaeudekommunikation.snipdooIp",
    routePath: "/gebaeudekommunikation/snipdoo-ip",
    pageType: "T02",
    parentPageKey: "gebaeudekommunikation.root",
    status: "active",
  },
  {
    pageKey: "gebaeudekommunikation.snipdooIpShort",
    routePath: "/snipdoo-ip",
    pageType: "T02",
    parentPageKey: "gebaeudekommunikation.snipdooIp",
    status: "legacy",
    note: "Fallback aus Etappe 14d-2.",
  },
  {
    pageKey: "gebaeudekommunikation.snipdooIpLegacy",
    routePath: "/systemtechnik/snipdoo-ip",
    pageType: "T02",
    parentPageKey: "gebaeudekommunikation.snipdooIp",
    status: "legacy",
    note: "Legacy-Fallback älter als Etappe 14d-2.",
  },

  // ---------- Zutrittskontrolle ----------
  {
    pageKey: "zutrittskontrolle.root",
    routePath: "/zutrittskontrolle",
    pageType: "T01",
    status: "active",
  },
  {
    pageKey: "zutrittskontrolle.tuerenTore",
    routePath: "/zutrittskontrolle/tueren-tore",
    pageType: "T06",
    parentPageKey: "zutrittskontrolle.root",
    status: "active",
  },
  {
    pageKey: "zutrittskontrolle.mobilerZutritt",
    routePath: "/zutrittskontrolle/mobiler-zutritt",
    pageType: "T06",
    parentPageKey: "zutrittskontrolle.root",
    status: "active",
  },
  {
    pageKey: "zutrittskontrolle.fahrstuhlsteuerung",
    routePath: "/zutrittskontrolle/fahrstuhlsteuerung",
    pageType: "T06",
    parentPageKey: "zutrittskontrolle.root",
    status: "active",
  },
  {
    pageKey: "zutrittskontrolle.zufahrtenParkplaetze",
    routePath: "/zutrittskontrolle/zufahrten-parkplaetze",
    pageType: "T06",
    parentPageKey: "zutrittskontrolle.root",
    status: "active",
  },
  {
    pageKey: "zutrittskontrolle.elektronischeDrueckergarnitur",
    routePath: "/zutrittskontrolle/elektronische-drueckergarnitur",
    pageType: "T03",
    parentPageKey: "zutrittskontrolle.root",
    status: "active",
    note: "Produktfamilie elektronische Drückergarnitur (EvoLock); produktnah, aber ohne SKU-/Spec-Tabelle und ohne Datenblatt-Download → noch keine echte T04-PDP. Bei späterer Auftrennung in einzelne SKUs als T04 zu führen.",
  },
  {
    pageKey: "zutrittskontrolle.elektronischerKnaufzylinder",
    routePath: "/zutrittskontrolle/elektronischer-knaufzylinder",
    pageType: "T03",
    parentPageKey: "zutrittskontrolle.root",
    status: "active",
    note: "Produktfamilie elektronischer Knaufzylinder; siehe Hinweis bei elektronischeDrueckergarnitur.",
  },
  {
    pageKey: "zutrittskontrolle.bcmHandsender",
    routePath: "/zutrittskontrolle/bcm-handsender",
    pageType: "T03",
    parentPageKey: "zutrittskontrolle.root",
    status: "active",
    note: "Produktfamilie BCM-Handsender; siehe Hinweis bei elektronischeDrueckergarnitur.",
  },
  {
    pageKey: "zutrittskontrolle.funkvernetzteOfflineLeser",
    routePath: "/zutrittskontrolle/funkvernetzte-offline-leser",
    pageType: "T03",
    parentPageKey: "zutrittskontrolle.root",
    status: "active",
    note: "Produktfamilie funkvernetzte Offline-Leser; siehe Hinweis bei elektronischeDrueckergarnitur.",
  },
  {
    pageKey: "zutrittskontrolle.bcmOnlineLeser",
    routePath: "/zutrittskontrolle/bcm-online-leser",
    pageType: "T03",
    parentPageKey: "zutrittskontrolle.root",
    status: "active",
    note: "Produktfamilie BCM Online-Leser; siehe Hinweis bei elektronischeDrueckergarnitur.",
  },
  {
    pageKey: "zutrittskontrolle.vorhaengeschloss",
    routePath: "/zutrittskontrolle/vorhaengeschloss",
    pageType: "T03",
    parentPageKey: "zutrittskontrolle.root",
    status: "active",
    note: "Produktfamilie elektronisches Vorhängeschloss; siehe Hinweis bei elektronischeDrueckergarnitur.",
  },
  {
    pageKey: "zutrittskontrolle.biometrie",
    routePath: "/zutrittskontrolle/biometrie",
    pageType: "T06",
    parentPageKey: "zutrittskontrolle.root",
    status: "active",
    note: "Technologie-/Funktions-Seite (Biometrie als Identifikationsverfahren), keine einzelne Produktfamilie → T06.",
  },

  // ---------- Gebäudemanagement ----------
  {
    pageKey: "gebaeudemanagement.root",
    routePath: "/gebaeudemanagement",
    pageType: "T01",
    status: "active",
  },
  {
    pageKey: "gebaeudemanagement.schraenkeBehaelter",
    routePath: "/gebaeudemanagement/schraenke-behaelter",
    pageType: "T03",
    parentPageKey: "gebaeudemanagement.root",
    status: "active",
  },
  {
    pageKey: "gebaeudemanagement.digitaleNamensanzeige",
    routePath: "/gebaeudemanagement/digitale-namensanzeige",
    pageType: "T06",
    parentPageKey: "gebaeudemanagement.root",
    status: "active",
  },
  {
    pageKey: "gebaeudemanagement.reservierenBuchen",
    routePath: "/gebaeudemanagement/reservieren-buchen",
    pageType: "T06",
    parentPageKey: "gebaeudemanagement.root",
    status: "active",
  },
  {
    pageKey: "gebaeudemanagement.digitalSignage",
    routePath: "/gebaeudemanagement/digital-signage",
    pageType: "T06",
    parentPageKey: "gebaeudemanagement.root",
    status: "active",
  },
  {
    pageKey: "gebaeudemanagement.alarmanlagenkopplung",
    routePath: "/gebaeudemanagement/alarmanlagenkopplung",
    pageType: "T06",
    parentPageKey: "gebaeudemanagement.root",
    status: "active",
  },

  // ---------- Eingangssysteme ----------
  {
    pageKey: "eingangssysteme.root",
    routePath: "/entry-system",
    pageType: "T01",
    status: "active",
  },
  {
    pageKey: "eingangssysteme.design",
    routePath: "/entry-system/design",
    pageType: "T06",
    parentPageKey: "eingangssysteme.root",
    status: "active",
    note: "Aspekt-Seite (Sonderfall Eingangssysteme – Mischform aus T06 und Hub-Unterseite).",
  },
  {
    pageKey: "eingangssysteme.funktionalitaet",
    routePath: "/entry-system/funktionalitaet",
    pageType: "T06",
    parentPageKey: "eingangssysteme.root",
    status: "active",
    note: "Aspekt-Seite (Sonderfall Eingangssysteme).",
  },
  {
    pageKey: "eingangssysteme.material",
    routePath: "/entry-system/material",
    pageType: "T06",
    parentPageKey: "eingangssysteme.root",
    status: "active",
    note: "Aspekt-Seite (Sonderfall Eingangssysteme).",
  },
  {
    pageKey: "eingangssysteme.integrationsformen",
    routePath: "/entry-system/integrationsformen",
    pageType: "T06",
    parentPageKey: "eingangssysteme.root",
    status: "active",
    note: "Aspekt-Seite (Sonderfall Eingangssysteme).",
  },
  {
    pageKey: "eingangssysteme.referenzen",
    routePath: "/entry-system/referenzen",
    pageType: "T07",
    parentPageKey: "eingangssysteme.root",
    status: "active",
    note: "Domain-spezifische Referenzliste.",
  },
  {
    pageKey: "eingangssysteme.standards",
    routePath: "/entry-system/standards",
    pageType: "T06",
    parentPageKey: "eingangssysteme.root",
    status: "active",
    note: "Aspekt-Seite (Sonderfall Eingangssysteme).",
  },
  {
    pageKey: "eingangssysteme.beratung",
    routePath: "/entry-system/beratung",
    pageType: "T19",
    parentPageKey: "eingangssysteme.root",
    status: "active",
    note: "Sonderfall – Beratungs-/Kontaktpunkt, eher Meta als Kern.",
  },

  // ---------- Anwendungen (TCS in Bauten) ----------
  {
    pageKey: "anwendungen.root",
    routePath: "/anwendungen",
    pageType: "T01",
    status: "active",
    note: "Sonderfall – fungiert auch als Einstiegs-Hub für T05.",
  },
  {
    pageKey: "anwendungen.objektloesungen",
    routePath: "/anwendungen/objektloesungen",
    pageType: "T05",
    parentPageKey: "anwendungen.root",
    status: "active",
  },
  {
    pageKey: "anwendungen.objektloesungenLegacy",
    routePath: "/objektloesungen",
    pageType: "T05",
    parentPageKey: "anwendungen.objektloesungen",
    status: "legacy",
    note: "Legacy-Fallback (Etappe 14e-7).",
  },
  {
    pageKey: "anwendungen.bildungseinrichtungen",
    routePath: "/anwendungen/bildungseinrichtungen",
    pageType: "T05",
    parentPageKey: "anwendungen.root",
    status: "active",
  },
  {
    pageKey: "anwendungen.bildungseinrichtungenLegacy",
    routePath: "/bildungseinrichtungen",
    pageType: "T05",
    parentPageKey: "anwendungen.bildungseinrichtungen",
    status: "legacy",
    note: "Legacy-Fallback (Etappe 14e-6).",
  },
  {
    pageKey: "anwendungen.einfamilienhaus",
    routePath: "/anwendungen/einfamilienhaus",
    pageType: "T05",
    parentPageKey: "anwendungen.root",
    status: "active",
  },
  {
    pageKey: "anwendungen.mehrfamilienhaus",
    routePath: "/anwendungen/mehrfamilienhaus",
    pageType: "T05",
    parentPageKey: "anwendungen.root",
    status: "active",
  },
  {
    pageKey: "anwendungen.grossanlage",
    routePath: "/anwendungen/grossanlage",
    pageType: "T05",
    parentPageKey: "anwendungen.root",
    status: "active",
    note: "Sonderfall – thematisch auch Produktkategorie, hier Einsatzfeld-Sicht.",
  },
  {
    pageKey: "anwendungen.sanierung",
    routePath: "/anwendungen/sanierung",
    pageType: "T05",
    parentPageKey: "anwendungen.root",
    status: "active",
  },
  {
    pageKey: "anwendungen.pflege",
    routePath: "/anwendungen/pflege",
    pageType: "T05",
    parentPageKey: "anwendungen.root",
    status: "active",
  },
  {
    pageKey: "anwendungen.klinik",
    routePath: "/anwendungen/klinik",
    pageType: "T05",
    parentPageKey: "anwendungen.root",
    status: "active",
  },
  {
    pageKey: "anwendungen.behoerde",
    routePath: "/anwendungen/behoerde",
    pageType: "T05",
    parentPageKey: "anwendungen.root",
    status: "active",
  },
  {
    pageKey: "anwendungen.feuerwehr",
    routePath: "/anwendungen/feuerwehr",
    pageType: "T05",
    parentPageKey: "anwendungen.root",
    status: "active",
  },
  {
    pageKey: "anwendungen.schwimmbad",
    routePath: "/anwendungen/schwimmbad",
    pageType: "T05",
    parentPageKey: "anwendungen.root",
    status: "active",
  },
  {
    pageKey: "anwendungen.concierge",
    routePath: "/anwendungen/concierge",
    pageType: "T06",
    parentPageKey: "anwendungen.root",
    status: "active",
    note: "Migrations-Empfehlung: später unter /gebaeudekommunikation/concierge.",
  },
  {
    pageKey: "anwendungen.interneKommunikation",
    routePath: "/anwendungen/interne-kommunikation",
    pageType: "T06",
    parentPageKey: "anwendungen.root",
    status: "active",
  },
  {
    pageKey: "anwendungen.digitaleNamensverwaltung",
    routePath: "/anwendungen/digitale-namensverwaltung",
    pageType: "T06",
    parentPageKey: "anwendungen.root",
    status: "active",
  },
  {
    pageKey: "anwendungen.feuerwehrdurchsage",
    routePath: "/gebaeudekommunikation/systemloesungen/bewohnerinformation-im-sonderfall",
    pageType: "T06",
    parentPageKey: "gebaeudekommunikation.systemloesungen",
    status: "active",
  },
  {
    pageKey: "anwendungen.bidirektionaleVideo",
    routePath: "/anwendungen/bidirektionale-video",
    pageType: "T06",
    parentPageKey: "anwendungen.root",
    status: "active",
  },
  {
    // Nur noch Weiterleitung: führende Seite ist N-133 / P-236
    // (`mobile-tk-preview.root`) unter /gebaeudekommunikation/mobile-tuerkommunikation.
    pageKey: "anwendungen.mobileTuerkommunikation",
    routePath: "/anwendungen/mobile-tuerkommunikation",
    pageType: "T06",
    parentPageKey: "anwendungen.root",
    status: "legacy",
  },
  {
    pageKey: "anwendungen.zutrittskontrolleBCM",
    routePath: "/anwendungen/zutrittskontrolle-bcm",
    pageType: "T06",
    parentPageKey: "anwendungen.root",
    status: "active",
    note: "Migrations-Empfehlung: später unter /zutrittskontrolle/bcm.",
  },
  {
    pageKey: "anwendungen.wohnbau",
    routePath: "/anwendungen/wohnbau",
    pageType: "T05",
    parentPageKey: "anwendungen.root",
    status: "active",
  },
  {
    pageKey: "anwendungen.gesundheitseinrichtungen",
    routePath: "/anwendungen/gesundheitseinrichtungen",
    pageType: "T05",
    parentPageKey: "anwendungen.root",
    status: "active",
  },
  {
    pageKey: "anwendungen.oeffentlicheHand",
    routePath: "/anwendungen/oeffentliche-hand",
    pageType: "T05",
    parentPageKey: "anwendungen.root",
    status: "active",
  },
  {
    pageKey: "anwendungen.referenzprojekte",
    routePath: "/anwendungen/referenzprojekte",
    pageType: "T07",
    parentPageKey: "anwendungen.root",
    status: "active",
  },
  {
    pageKey: "anwendungen.referenzprojektDetail",
    routePath: "/anwendungen/referenzprojekte/:slug",
    pageType: "T08",
    parentPageKey: "anwendungen.referenzprojekte",
    status: "active",
    note: "Dynamische Route.",
  },

  // ---------- Legal ----------
  {
    pageKey: "legal.impressum",
    routePath: "/impressum",
    pageType: "T20",
    status: "in-progress",
    note: "Inhalt redaktionell offen (_meta.status: in-progress).",
  },
  {
    pageKey: "legal.datenschutz",
    routePath: "/datenschutz",
    pageType: "T20",
    status: "in-progress",
    note: "Inhalt redaktionell offen.",
  },
  {
    pageKey: "legal.agb",
    routePath: "/agb",
    pageType: "T20",
    status: "in-progress",
    note: "Inhalt redaktionell offen.",
  },

  // ---------- System ----------
  {
    pageKey: "system.notFound",
    routePath: "*",
    pageType: "T21",
    status: "active",
    note: "Catch-all (NotFoundPage), in src/App.tsx, nicht in features/**/routes.tsx.",
  },
];
