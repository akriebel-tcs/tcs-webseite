/**
 * Auswahlhilfe für „Sprache hinzufügen".
 *
 * Wichtig: Diese Liste ist KEINE zweite Wahrheit. Welche Sprachen es im CMS
 * gibt, steht ausschließlich in `cms_locales`. Der Katalog dient nur dazu, im
 * Admin bequem einen Sprachcode mit deutschem und eigensprachlichem Namen
 * auszuwählen. Eigene, gültige BCP-47-Codes sind zusätzlich erlaubt.
 */
export interface CatalogLanguage {
  /** ISO-639-1 bzw. BCP-47-Code. */
  code: string;
  /** Deutscher Name. */
  de: string;
  /** Name in der Sprache selbst. */
  native: string;
}

export const LANGUAGE_CATALOG: readonly CatalogLanguage[] = [
  { code: "af", de: "Afrikaans", native: "Afrikaans" },
  { code: "ar", de: "Arabisch", native: "العربية" },
  { code: "bg", de: "Bulgarisch", native: "Български" },
  { code: "bs", de: "Bosnisch", native: "Bosanski" },
  { code: "ca", de: "Katalanisch", native: "Català" },
  { code: "cs", de: "Tschechisch", native: "Čeština" },
  { code: "da", de: "Dänisch", native: "Dansk" },
  { code: "de", de: "Deutsch", native: "Deutsch" },
  { code: "el", de: "Griechisch", native: "Ελληνικά" },
  { code: "en", de: "Englisch", native: "English" },
  { code: "en-gb", de: "Englisch (Großbritannien)", native: "English (UK)" },
  { code: "en-us", de: "Englisch (USA)", native: "English (US)" },
  { code: "es", de: "Spanisch", native: "Español" },
  { code: "et", de: "Estnisch", native: "Eesti" },
  { code: "fa", de: "Persisch", native: "فارسی" },
  { code: "fi", de: "Finnisch", native: "Suomi" },
  { code: "fr", de: "Französisch", native: "Français" },
  { code: "he", de: "Hebräisch", native: "עברית" },
  { code: "hi", de: "Hindi", native: "हिन्दी" },
  { code: "hr", de: "Kroatisch", native: "Hrvatski" },
  { code: "hu", de: "Ungarisch", native: "Magyar" },
  { code: "id", de: "Indonesisch", native: "Bahasa Indonesia" },
  { code: "is", de: "Isländisch", native: "Íslenska" },
  { code: "it", de: "Italienisch", native: "Italiano" },
  { code: "ja", de: "Japanisch", native: "日本語" },
  { code: "ko", de: "Koreanisch", native: "한국어" },
  { code: "lt", de: "Litauisch", native: "Lietuvių" },
  { code: "lv", de: "Lettisch", native: "Latviešu" },
  { code: "mk", de: "Makedonisch", native: "Македонски" },
  { code: "ms", de: "Malaiisch", native: "Bahasa Melayu" },
  { code: "nb", de: "Norwegisch (Bokmål)", native: "Norsk bokmål" },
  { code: "nl", de: "Niederländisch", native: "Nederlands" },
  { code: "pl", de: "Polnisch", native: "Polski" },
  { code: "pt", de: "Portugiesisch", native: "Português" },
  { code: "pt-br", de: "Portugiesisch (Brasilien)", native: "Português (Brasil)" },
  { code: "ro", de: "Rumänisch", native: "Română" },
  { code: "ru", de: "Russisch", native: "Русский" },
  { code: "sk", de: "Slowakisch", native: "Slovenčina" },
  { code: "sl", de: "Slowenisch", native: "Slovenščina" },
  { code: "sr", de: "Serbisch", native: "Српски" },
  { code: "sv", de: "Schwedisch", native: "Svenska" },
  { code: "sw", de: "Swahili", native: "Kiswahili" },
  { code: "th", de: "Thailändisch", native: "ไทย" },
  { code: "tr", de: "Türkisch", native: "Türkçe" },
  { code: "uk", de: "Ukrainisch", native: "Українська" },
  { code: "vi", de: "Vietnamesisch", native: "Tiếng Việt" },
  { code: "zh", de: "Chinesisch", native: "中文" },
];

/** Grundform eines gültigen BCP-47-Codes — identisch zur Prüfung in der Datenbank. */
export const BCP47_PATTERN = /^[a-z]{2,3}(-[a-z0-9]{2,8}){0,3}$/;

export function isValidLocaleCode(raw: string): boolean {
  return BCP47_PATTERN.test(raw.trim().toLowerCase());
}

/** Katalogsuche über Code, deutschen und eigensprachlichen Namen. */
export function searchLanguageCatalog(query: string, limit = 40): CatalogLanguage[] {
  const q = query.trim().toLowerCase();
  const list = q
    ? LANGUAGE_CATALOG.filter(
        (l) =>
          l.code.includes(q) ||
          l.de.toLowerCase().includes(q) ||
          l.native.toLowerCase().includes(q),
      )
    : LANGUAGE_CATALOG;
  return list.slice(0, limit);
}
