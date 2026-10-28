/**
 * Echter Interaktionstest für den Sprachumschalter der Website.
 *
 * Geprüft wird der komplette sichtbare Weg ohne Neuladen: Klick im Menü →
 * Adresse (`?lang=`), `i18n.language`, Beschriftung des Sprachknopfs und ein
 * sichtbarer Beispieltext wechseln gemeinsam. Zusätzlich Zurück/Vorwärts über
 * den Browserverlauf und der direkte Einstieg mit `?lang=`.
 *
 * Die öffentliche Sprachliste kommt in der Anwendung aus der Datenbank und ist
 * hier ersetzt — es wird keine Datenbank angesprochen.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import i18n from "@/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLocaleUrlSync } from "@/shared/hooks/useLocaleUrlSync";

vi.mock("@/i18n/usePublicLocales", () => ({
  usePublicLocales: () => ({
    loading: false,
    locales: [
      { locale: "de", label_native: "Deutsch", label_de: "Deutsch", sort_order: 1 },
      { locale: "en", label_native: "English", label_de: "Englisch", sort_order: 2 },
      { locale: "nl", label_native: "Nederlands", label_de: "Niederländisch", sort_order: 3 },
      { locale: "pl", label_native: "Polski", label_de: "Polnisch", sort_order: 4 },
    ],
  }),
}));

const Probe = () => {
  useLocaleUrlSync();
  const { t, i18n: inst } = useTranslation("common");
  const { search } = useLocation();
  return (
    <div>
      <LanguageSwitcher />
      <p data-testid="sample">{t("actions.back")}</p>
      <p data-testid="lang">{inst.language}</p>
      <p data-testid="router-search">{search}</p>
    </div>
  );
};

const setUrl = (url: string) => window.history.replaceState({}, "", url);

/** Sichtbarer Beispieltext je Sprache (aus den gebündelten Bedien-Texten). */
const SAMPLE: Record<string, string> = {
  de: "Zurück",
  en: "Back",
  nl: "Terug",
  pl: "Wróć",
};

const expectVisibleLanguage = async (code: string) => {
  await waitFor(() => {
    expect(screen.getByTestId("lang").textContent).toBe(code);
    expect(screen.getByTestId("sample").textContent).toBe(SAMPLE[code]);
    // Der Knopf zeigt den Sprachcode; die Großschreibung macht die Darstellung.
    expect(screen.getByRole("button", { name: /Sprache/ }).textContent?.trim()).toBe(code);
    expect(window.location.search).toBe(`?lang=${code}`);
    expect(screen.getByTestId("router-search").textContent).toBe(`?lang=${code}`);
  });
};

const choose = async (label: string) => {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /Sprache/ }));
  await user.click(await screen.findByRole("menuitem", { name: new RegExp(label) }));
};

describe("Sprachumschalter — echte Interaktion ohne Neuladen", () => {
  beforeEach(async () => {
    localStorage.clear();
    setUrl("/");
    await i18n.changeLanguage("de");
  });

  afterEach(async () => {
    cleanup();
    await i18n.changeLanguage("de");
  });

  it("startet mit ?lang=nl auf Niederländisch und wechselt auf Deutsch", async () => {
    setUrl("/?lang=nl");
    await i18n.changeLanguage("nl");
    render(
      <BrowserRouter>
        <Probe />
      </BrowserRouter>,
    );
    await expectVisibleLanguage("nl");

    await choose("Deutsch");
    await expectVisibleLanguage("de");
  });

  it("wechselt von Deutsch auf Polnisch", async () => {
    setUrl("/?lang=de");
    render(
      <BrowserRouter>
        <Probe />
      </BrowserRouter>,
    );
    await expectVisibleLanguage("de");

    await choose("Polski");
    await expectVisibleLanguage("pl");
  });

  it("wechselt auf Englisch und weiter auf Niederländisch", async () => {
    setUrl("/?lang=de");
    render(
      <BrowserRouter>
        <Probe />
      </BrowserRouter>,
    );
    await choose("English");
    await expectVisibleLanguage("en");

    await choose("Nederlands");
    await expectVisibleLanguage("nl");
  });

  it("ergänzt einen fehlenden Sprachparameter still", async () => {
    setUrl("/");
    render(
      <BrowserRouter>
        <Probe />
      </BrowserRouter>,
    );
    await expectVisibleLanguage("de");
  });

  it("stellt mit Zurück und Vorwärts die jeweilige Sprache wieder her", async () => {
    setUrl("/?lang=de");
    render(
      <BrowserRouter>
        <Probe />
      </BrowserRouter>,
    );
    await expectVisibleLanguage("de");

    await choose("Nederlands");
    await expectVisibleLanguage("nl");

    window.history.back();
    await expectVisibleLanguage("de");

    window.history.forward();
    await expectVisibleLanguage("nl");
  });
});
