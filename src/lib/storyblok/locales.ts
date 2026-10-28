/**
 * Sprachregister fuer die Storyblok-Quelle.
 *
 * Storyblok kennt keine Metadaten wie `is_public` oder `fallback_locale` je
 * Sprache; die Space-Sprachen sind de (Standard), en, nl, pl, cs. Die Werte
 * entsprechen dem Stand von `cms_locales` zum Zeitpunkt der Migration.
 */
import type { LocaleRegistryRow } from "@/i18n/localeRegistry";

export const STORYBLOK_LOCALES: LocaleRegistryRow[] = [
  { locale: "de", label_de: "Deutsch", label_native: "Deutsch", is_source: true, is_active: true, is_public: true, fallback_locale: null, sort_order: 10 },
  { locale: "en", label_de: "Englisch", label_native: "English", is_source: false, is_active: true, is_public: true, fallback_locale: "de", sort_order: 20 },
  { locale: "nl", label_de: "Niederländisch", label_native: "Nederlands", is_source: false, is_active: true, is_public: true, fallback_locale: "de", sort_order: 30 },
  { locale: "pl", label_de: "Polnisch", label_native: "Polski", is_source: false, is_active: true, is_public: true, fallback_locale: "de", sort_order: 40 },
  { locale: "cs", label_de: "Tschechisch", label_native: "Čeština", is_source: false, is_active: true, is_public: true, fallback_locale: "de", sort_order: 60 },
];
