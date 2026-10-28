/**
 * i18n Typen und Konstanten.
 *
 * Führende Sprachwahrheit ist `src/i18n/locale.ts`; diese Datei reicht sie
 * nur unter den historischen Namen weiter.
 */

import { APP_LOCALES, DEFAULT_APP_LOCALE, type AppLocale } from "./locale";

export const SUPPORTED_LANGUAGES = APP_LOCALES;

export type SupportedLanguage = AppLocale;

export const DEFAULT_LANGUAGE: SupportedLanguage = DEFAULT_APP_LOCALE;
