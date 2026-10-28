/**
 * i18n-Initialisierung.
 *
 * - Default- und Fallback-Sprache: de
 * - Verfügbare Sprachen: de, en
 * - Statische Imports der JSON-Ressourcen (kein http-backend, kein language-detector)
 * - Namespaces: common, navigation + ein Namespace pro Feature-Domain
 *   (Etappe 15b: Grundstruktur vorbereitet, Seitentexte werden später migriert)
 *
 * Wird einmalig in src/main.tsx importiert.
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import deCommon from "./locales/de/common.json";
import enCommon from "./locales/en/common.json";
import deNavigation from "./locales/de/navigation.json";
import enNavigation from "./locales/en/navigation.json";

// Feature-Domain-Namespaces (Etappe 15b: vorbereitet, noch ohne migrierte Seitentexte)
import deHome from "./locales/de/home.json";
import enHome from "./locales/en/home.json";
import dePersonas from "./locales/de/personas.json";
import enPersonas from "./locales/en/personas.json";
import deGebaeudekommunikation from "./locales/de/gebaeudekommunikation.json";
import enGebaeudekommunikation from "./locales/en/gebaeudekommunikation.json";
import deZutrittskontrolle from "./locales/de/zutrittskontrolle.json";
import enZutrittskontrolle from "./locales/en/zutrittskontrolle.json";
import deGebaeudemanagement from "./locales/de/gebaeudemanagement.json";
import enGebaeudemanagement from "./locales/en/gebaeudemanagement.json";
import deEingangssysteme from "./locales/de/eingangssysteme.json";
import enEingangssysteme from "./locales/en/eingangssysteme.json";
import deAnwendungen from "./locales/de/anwendungen.json";
import enAnwendungen from "./locales/en/anwendungen.json";
import deSignage from "./locales/de/signage.json";
import enSignage from "./locales/en/signage.json";
import deService from "./locales/de/service.json";
import enService from "./locales/en/service.json";
import deServiceportal from "./locales/de/serviceportal.json";
import enServiceportal from "./locales/en/serviceportal.json";
import deWissen from "./locales/de/wissen.json";
import enWissen from "./locales/en/wissen.json";
import deKontakt from "./locales/de/kontakt.json";
import enKontakt from "./locales/en/kontakt.json";
import deKontaktBcm from "./locales/de/kontakt-bcm.json";
import enKontaktBcm from "./locales/en/kontakt-bcm.json";
import deKarriere from "./locales/de/karriere.json";
import enKarriere from "./locales/en/karriere.json";
import dePresse from "./locales/de/presse.json";
import enPresse from "./locales/en/presse.json";
import deLegal from "./locales/de/legal.json";
import enLegal from "./locales/en/legal.json";

// Polnisch (pl): Ausbaustufe. Vorhanden sind zunächst die reinen
// Bedien-Texte (`common`). Alle übrigen Namespaces fallen laut
// `fallbackLng` automatisch auf Deutsch zurück, bis die Redaktion die
// Inhalte in der Datenbank auf Polnisch gepflegt und freigegeben hat.
import plCommon from "./locales/pl/common.json";
// Bedien-Texte des Produktkatalogs (Filter, Sortierung, Karten, Datenblatt).
import plService from "./locales/pl/service.json";
// Bedien-/Barrierefreiheits-Texte der Navigation.
import plNavigation from "./locales/pl/navigation.json";

// Niederlaendisch (nl): gleiche Ausbaustufe wie Polnisch — Bedien-Texte
// (`common`), Katalog-Microcopy (`service`) und Navigations-/A11y-Texte
// (`navigation`). Redaktionelle Seiteninhalte kommen aus CMS-Light.
import nlCommon from "./locales/nl/common.json";
import nlService from "./locales/nl/service.json";
import nlNavigation from "./locales/nl/navigation.json";

import { DEFAULT_LANGUAGE } from "./types";
import { resolveInitialLocale } from "./urlLocale";
import { registerUiStringOverlay } from "./uiStringsOverlay";

export const resources = {
  de: {
    common: deCommon,
    navigation: deNavigation,
    home: deHome,
    personas: dePersonas,
    gebaeudekommunikation: deGebaeudekommunikation,
    zutrittskontrolle: deZutrittskontrolle,
    gebaeudemanagement: deGebaeudemanagement,
    eingangssysteme: deEingangssysteme,
    anwendungen: deAnwendungen,
    signage: deSignage,
    service: deService,
    serviceportal: deServiceportal,
    wissen: deWissen,
    kontakt: deKontakt,
    "kontakt-bcm": deKontaktBcm,
    karriere: deKarriere,
    presse: dePresse,
    legal: deLegal,
  },
  en: {
    common: enCommon,
    navigation: enNavigation,
    home: enHome,
    personas: enPersonas,
    gebaeudekommunikation: enGebaeudekommunikation,
    zutrittskontrolle: enZutrittskontrolle,
    gebaeudemanagement: enGebaeudemanagement,
    eingangssysteme: enEingangssysteme,
    anwendungen: enAnwendungen,
    signage: enSignage,
    service: enService,
    serviceportal: enServiceportal,
    wissen: enWissen,
    kontakt: enKontakt,
    "kontakt-bcm": enKontaktBcm,
    karriere: enKarriere,
    presse: enPresse,
    legal: enLegal,
  },
  pl: {
    common: plCommon,
    navigation: plNavigation,
    service: plService,
  },
  nl: {
    common: nlCommon,
    navigation: nlNavigation,
    service: nlService,
  },
} as const;

export const I18N_NAMESPACES = [
  "common",
  "navigation",
  "home",
  "personas",
  "gebaeudekommunikation",
  "zutrittskontrolle",
  "gebaeudemanagement",
  "eingangssysteme",
  "anwendungen",
  "signage",
  "service",
  "serviceportal",
  "wissen",
  "kontakt",
  "kontakt-bcm",
  "karriere",
  "presse",
  "legal",
] as const;

/**
 * Startsprache: ein gültiger `?lang=`-Parameter der Adresse ist autoritativ,
 * danach gilt der gemerkte Sprachcode (Grundform, „nl-NL" → „nl"). Es gibt
 * bewusst KEINE feste Liste erlaubter Sprachen — die Wahrheit ist
 * `cms_locales`. Eine nicht (mehr) öffentliche Sprache wird beim Start in
 * `src/main.tsx` auf Deutsch zurückgestellt.
 */
const getInitialLanguage = (): string => resolveInitialLocale(DEFAULT_LANGUAGE);


void i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  // Keine feste Sprachliste: sonst würde i18next jede Sprache aus der
  // Datenbank (z. B. „nl") sofort auf Deutsch auflösen.
  supportedLngs: false,
  ns: [...I18N_NAMESPACES],
  defaultNS: "common",
  interpolation: {
    escapeValue: false,
  },
  returnNull: false,
});


// DB-first für Bedienungstexte: die Zielsprachen kommen aus dem Sprachkatalog
// in CMS-Light. Die Dateien oben bleiben deutsche Quelle und Notfall-Rückfall.
if (typeof window !== "undefined") {
  registerUiStringOverlay(i18n);
}

export default i18n;
