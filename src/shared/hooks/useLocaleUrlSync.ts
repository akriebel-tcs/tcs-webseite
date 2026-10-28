import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { normalizeAppLocale } from "@/i18n/locale";
import { readLocaleFromSearch, searchWithLocale, storeLocale } from "@/i18n/urlLocale";

/**
 * Hält Adresse (`?lang=`) und aktive Sprache deckungsgleich.
 *
 * Ein einziger Abgleich, ausschließlich über den Router:
 * - Steht in der Adresse eine andere Sprache (direkter Einstieg,
 *   Zurück/Vorwärts), gewinnt die Adresse und die Sprache wird gewechselt.
 * - Fehlt der Parameter (z. B. nach einem normalen Seitenwechsel), wird er
 *   still über den Router ergänzt.
 *
 * Der Klick im Sprachmenü läuft über `useLanguageSwitch` und setzt Adresse und
 * Sprache gemeinsam; dieser Abgleich korrigiert danach nichts mehr.
 */
export const useLocaleUrlSync = () => {
  const { i18n } = useTranslation();
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();

  // Eigener Zustand, damit der Abgleich auch bei programmatischen
  // Sprachwechseln (z. B. Rückstellung auf Deutsch) erneut läuft.
  const [lang, setLang] = useState(() =>
    normalizeAppLocale(i18n.language || i18n.resolvedLanguage),
  );

  useEffect(() => {
    const onLanguageChanged = (lng: string) => {
      const code = normalizeAppLocale(lng);
      storeLocale(code);
      setLang(code);
    };
    setLang(normalizeAppLocale(i18n.language || i18n.resolvedLanguage));
    i18n.on("languageChanged", onLanguageChanged);
    return () => {
      i18n.off("languageChanged", onLanguageChanged);
    };
  }, [i18n]);

  useEffect(() => {
    const fromUrl = readLocaleFromSearch(search);
    if (fromUrl === lang) return;
    if (fromUrl) {
      storeLocale(fromUrl);
      void i18n.changeLanguage(fromUrl);
      return;
    }
    navigate({ pathname, search: searchWithLocale(search, lang), hash }, { replace: true });
  }, [pathname, search, hash, lang, i18n, navigate]);
};
