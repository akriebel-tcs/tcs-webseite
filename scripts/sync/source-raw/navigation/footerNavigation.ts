/**
 * Footer-Navigation als reine Datenstruktur (Etappe 4d).
 *
 * Bildet 1:1 den aktuellen Ist-Stand aus `src/components/Footer.tsx` ab.
 * Noch NICHT an Footer.tsx angeschlossen, keine sichtbare Änderung.
 *
 * Wichtig:
 * - Platzhalter-Links (`href="#"`) bleiben bewusst erhalten und sind als
 *   `linkType: "placeholder"` mit `status: "placeholder"` markiert.
 * - Vorläufige/falsche Links (z.B. „snipdoo®" → /tuerkommunikation,
 *   „Einfamilienhaus" → /objektloesungen) werden NICHT korrigiert.
 *   Sie sind als `status: "pending"` mit `note` markiert.
 * - i18n-Keys sind vorbereitet, aber noch nicht aktiv übersetzt.
 *
 * Korrektur erfolgt später in einer separaten Etappe nach Content-Freigabe.
 * Siehe docs/navigation-inventory.md §5 und §7.
 */

import type { FooterColumn, NavItem } from "./types";
import { ROUTES } from "./routes";

export const footerNavigation: FooterColumn[] = [
  {
    key: "produkte",
    titleKey: "footer.produkte.title",
    items: [
      {
        key: "produkte.tuerkommunikation",
        labelKey: "footer.produkte.tuerkommunikation",
        path: ROUTES.gebaeudekommunikation.root,
        linkType: "internal",
        targetDomain: "gebaeudekommunikation",
        status: "active",
      },
      {
        key: "produkte.zutrittskontrolle",
        labelKey: "footer.produkte.zutrittskontrolle",
        path: ROUTES.zutrittskontrolle.root,
        linkType: "internal",
        targetDomain: "zutrittskontrolle",
        status: "active",
      },
      {
        key: "produkte.eingangssysteme",
        labelKey: "footer.produkte.eingangssysteme",
        path: ROUTES.eingangssysteme.root,
        linkType: "internal",
        targetDomain: "eingangssysteme",
        status: "active",
      },
      {
        key: "produkte.tcsPacks",
        labelKey: "footer.produkte.tcsPacks",
        path: ROUTES.gebaeudekommunikation.root,
        linkType: "internal",
        targetDomain: "gebaeudekommunikation",
        status: "pending",
        note: "Verlinkt aktuell auf /tuerkommunikation; spätere Ziel-Route für TCS:PACKS noch offen.",
      },
      {
        key: "produkte.snipdoo",
        labelKey: "footer.produkte.snipdoo",
        path: ROUTES.gebaeudekommunikation.snipdooIp,
        linkType: "internal",
        targetDomain: "gebaeudekommunikation",
        status: "active",
        note: "Verlinkt auf vorhandene Snipdoo-IP-Route unter /gebaeudekommunikation/snipdoo-ip.",
      },
      {
        key: "produkte.beschilderung",
        labelKey: "footer.produkte.beschilderung",
        path: ROUTES.gebaeudekommunikation.beschilderung,
        linkType: "internal",
        targetDomain: "gebaeudekommunikation",
        status: "active",
        note: "Verlinkt auf vorhandene Beschilderung-Route.",
      },
    ],
  },
  {
    key: "anwendungen",
    titleKey: "footer.anwendungen.title",
    items: [
      {
        key: "anwendungen.efh",
        labelKey: "footer.anwendungen.efh",
        path: ROUTES.anwendungen.einfamilienhaus,
        linkType: "internal",
        targetDomain: "anwendungen",
        status: "active",
        note: "Verlinkt auf vorhandene Anwendungen-Detailroute.",
      },
      {
        key: "anwendungen.mfh",
        labelKey: "footer.anwendungen.mfh",
        path: ROUTES.anwendungen.mehrfamilienhaus,
        linkType: "internal",
        targetDomain: "anwendungen",
        status: "active",
        note: "Verlinkt auf vorhandene Anwendungen-Detailroute.",
      },
      {
        key: "anwendungen.grossanlagen",
        labelKey: "footer.anwendungen.grossanlagen",
        path: ROUTES.anwendungen.grossanlage,
        linkType: "internal",
        targetDomain: "anwendungen",
        status: "active",
        note: "Verlinkt auf vorhandene Anwendungen-Detailroute.",
      },
      {
        key: "anwendungen.gewerbe",
        labelKey: "footer.anwendungen.gewerbe",
        path: ROUTES.anwendungen.objektloesungen,
        linkType: "internal",
        targetDomain: "anwendungen",
        status: "pending",
        note: "Verlinkt aktuell auf /objektloesungen; eigene Gewerbe-Seite existiert noch nicht.",
      },
      {
        key: "anwendungen.referenzen",
        labelKey: "footer.anwendungen.referenzen",
        path: ROUTES.anwendungen.referenzprojekte,
        linkType: "internal",
        targetDomain: "anwendungen",
        status: "active",
        note: "Verlinkt auf vorhandene Referenzprojekte-Route.",
      },
    ],
  },
  {
    key: "services",
    titleKey: "footer.services.title",
    items: [
      {
        key: "services.konfigurator",
        labelKey: "footer.services.konfigurator",
        path: ROUTES.service.planenKonfigurieren,
        linkType: "internal",
        targetDomain: "service",
        status: "active",
        note: "Verlinkt auf vorhandene interne Service-Route /planen-konfigurieren (Etappe footer-rest-hygiene-1).",
      },
      {
        key: "services.downloads",
        labelKey: "footer.services.downloads",
        path: ROUTES.service.downloads,
        linkType: "internal",
        targetDomain: "service",
        status: "active",
        note: "Verlinkt auf vorhandene interne Service-Route.",
      },
      {
        key: "services.akademie",
        labelKey: "footer.services.akademie",
        path: ROUTES.wissen.akademie,
        linkType: "internal",
        targetDomain: "wissen",
        status: "active",
        note: "Verlinkt auf vorhandene interne Akademie-Route.",
      },
      {
        key: "services.ersatzteile",
        labelKey: "footer.services.ersatzteile",
        path: ROUTES.service.ersatzteile,
        linkType: "internal",
        targetDomain: "service",
        status: "active",
        note: "Verlinkt auf vorhandene interne Service-Route /ersatzteile (Etappe footer-rest-hygiene-1).",
      },
      {
        key: "services.support",
        labelKey: "footer.services.support",
        path: ROUTES.service.technischerSupport,
        linkType: "internal",
        targetDomain: "service",
        status: "active",
        note: "Verlinkt auf vorhandene interne Support-Route.",
      },
    ],
  },
  {
    key: "unternehmen",
    titleKey: "footer.unternehmen.title",
    items: [
      {
        key: "unternehmen.ueberTcs",
        labelKey: "footer.unternehmen.ueberTcs",
        path: ROUTES.home.ueberTCS,
        linkType: "internal",
        targetDomain: "home",
        status: "active",
      },
      {
        key: "unternehmen.karriere",
        labelKey: "footer.unternehmen.karriere",
        path: ROUTES.meta.karriere,
        linkType: "internal",
        targetDomain: "karriere",
        status: "active",
      },
      {
        key: "unternehmen.presse",
        labelKey: "footer.unternehmen.presse",
        path: ROUTES.meta.presse,
        linkType: "internal",
        targetDomain: "presse",
        status: "active",
      },
      {
        key: "unternehmen.kontakt",
        labelKey: "footer.unternehmen.kontakt",
        path: ROUTES.meta.kontakt,
        linkType: "internal",
        targetDomain: "kontakt",
        status: "active",
      },
      {
        key: "unternehmen.datenschutz",
        labelKey: "footer.unternehmen.datenschutz",
        path: ROUTES.legal.datenschutz,
        linkType: "internal",
        targetDomain: "legal",
        status: "active",
        note: "Verlinkt auf vorhandene interne Datenschutz-Route (Etappe doc-legal-base-2).",
      },
    ],
  },
];

/**
 * Bottom-Bar des Footers (Legal-Links neben Copyright).
 * Aktuell alle drei als href="#" gepflegt.
 */
export const footerBottomNavigation: NavItem[] = [
  {
    key: "legal.impressum",
    labelKey: "footer.legal.impressum",
    path: ROUTES.legal.impressum,
    linkType: "internal",
    targetDomain: "legal",
    status: "active",
    note: "Verlinkt auf vorhandene interne Impressum-Route (Etappe doc-legal-base-2).",
  },
  {
    key: "legal.datenschutz",
    labelKey: "footer.legal.datenschutz",
    path: ROUTES.legal.datenschutz,
    linkType: "internal",
    targetDomain: "legal",
    status: "active",
    note: "Verlinkt auf vorhandene interne Datenschutz-Route (Etappe doc-legal-base-2).",
  },
  {
    key: "legal.agb",
    labelKey: "footer.legal.agb",
    path: ROUTES.legal.agb,
    linkType: "internal",
    targetDomain: "legal",
    status: "active",
    note: "Verlinkt auf vorhandene interne AGB-Route (Etappe doc-legal-base-2).",
  },
];
