import { useEffect } from "react";
import { useTranslation } from "react-i18next";

/**
 * Hält das `lang`-Attribut des `<html>`-Elements synchron zur aktuellen i18n-Sprache.
 *
 * - Initial: setzt `document.documentElement.lang` auf die geladene Sprache.
 * - Bei Sprachwechsel via `i18next` wird `lang` automatisch aktualisiert.
 *
 * Wird einmalig im App-Layout aufgerufen.
 */
export const useDocumentLang = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
    const apply = (lng: string) => {
      if (typeof document !== "undefined" && lng) {
        document.documentElement.lang = lng;
      }
    };

    apply(i18n.language ?? i18n.resolvedLanguage);
    i18n.on("languageChanged", apply);
    return () => {
      i18n.off("languageChanged", apply);
    };
  }, [i18n]);
};
