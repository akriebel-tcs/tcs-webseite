/**
 * Genau ein zentraler Sprachwechsel für die öffentliche Website.
 *
 * Warum zentral: Vorher hat der Sprachumschalter die Adresse direkt über
 * `history.pushState` geändert. React Router bekommt davon nichts mit und
 * meldete beim nächsten Abgleich weiterhin die alte Sprache aus der Adresse —
 * die Anzeige sprang deshalb ohne Neuladen auf die vorherige Sprache zurück.
 *
 * Hier läuft alles über den Router-Weg (`navigate`), damit Adresse, Router und
 * i18next denselben Stand haben. Bestehende Parameter und der Anker bleiben
 * erhalten, Zurück/Vorwärts funktioniert über den normalen Verlauf.
 */

import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { normalizeAppLocale, type AppLocale } from "@/i18n/locale";
import { searchWithLocale, storeLocale } from "@/i18n/urlLocale";

export interface UseLanguageSwitchResult {
  /** Aktive Sprache (Nutzerwahl hat Vorrang vor `resolvedLanguage`). */
  current: AppLocale;
  /** Wechselt Sprache und Adresse gemeinsam. Kein Neuladen der Seite. */
  switchLanguage: (locale: AppLocale) => Promise<void>;
}

export function useLanguageSwitch(): UseLanguageSwitchResult {
  const { i18n } = useTranslation();
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();
  const current = normalizeAppLocale(i18n.language || i18n.resolvedLanguage);

  const switchLanguage = useCallback(
    async (locale: AppLocale) => {
      const next = normalizeAppLocale(locale);
      if (next === current) return;
      storeLocale(next);
      // Adresse über den Router setzen (Verlaufseintrag: Zurück führt zur
      // vorherigen Sprache). Der Router kennt danach `?lang=` — der Abgleich
      // in `useLocaleUrlSync` stellt die Sprache nicht mehr zurück.
      navigate({ pathname, search: searchWithLocale(search, next), hash }, { replace: false });
      // Sprachwechsel abwarten, damit die sichtbare Oberfläche unmittelbar
      // nachzieht (Ressourcen/DB-Overlay ziehen anschließend nach).
      await i18n.changeLanguage(next);
    },
    [current, hash, i18n, navigate, pathname, search],
  );

  return { current, switchLanguage };
}
