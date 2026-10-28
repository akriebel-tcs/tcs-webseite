import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Tests für den schmalen Adapter auf das gemeinsame Datenblatt-Modul.
 *
 * Geprüft wird ausschließlich Adapterverhalten:
 *  - Inhalt kommt aus dem Kanalvertrag (Titel, Merkmale, Komponenten),
 *  - Preis nur bei Vertrag UND Markenprofil,
 *  - fehlendes, inaktives oder fremdes Markenprofil blockiert den Druck mit
 *    verständlicher Meldung und Wiederholung.
 */

const datasheet = vi.fn();
const brandProfile = vi.fn();

vi.mock("@/features/service/catalog/api/pdp", () => ({
  loadProductDatasheetLocalized: async (locale: string, artikelNr: string) => ({
    value: await datasheet(locale, artikelNr),
    requestedLocale: locale,
    resolvedLocale: locale,
    usedFallback: false,
    attempted: [locale],
  }),
}));

vi.mock("@/features/service/catalog/api/datasheetBrandProfile", () => ({
  TCS_BRAND_PROFILE_KEY: "tcs",
  loadDatasheetBrandProfile: (...args: unknown[]) => brandProfile(...args),
}));

import ProductDatasheetModal from "@/features/service/catalog/components/ProductDatasheetModal";

const contract = (showPrice: boolean) => ({
  found: true,
  header: {
    artikel_nr: "PAAF011/007",
    title: "Audiopaket für 1 Wohneinheit",
    subtitle: "Audio-Komplettpaket",
    serie: "PES PRO",
    price: 743,
    currency: "EUR",
    show_price: showPrice,
  },
  sections: [
    {
      section_key: "features_primary",
      kind: "features",
      sort_order: 1,
      items: [{ text: "Vorkonfiguriertes Paket", sort_order: 0 }],
    },
    {
      section_key: "package_components",
      kind: "components",
      title: "Paketkomponenten",
      sort_order: 4,
      items: [
        {
          artikel_nr: "ASA110101-0010",
          title: "Außenstation V2D Audio",
          quantity: 1,
          role_label: "Außenstation",
        },
        {
          artikel_nr: "ISW3030-0140",
          title: "Innenstation Audio",
          quantity: 1,
          role_label: "Innenstation",
        },
        {
          artikel_nr: "BVS20-SG",
          title: "Steuergerät",
          quantity: 1,
          role_label: "Steuergerät",
        },
      ],
    },
  ],
});

const okProfile = (showPrice: boolean) => ({
  status: "ok" as const,
  profile: {
    profile_key: "tcs",
    company_name: "TCS TürControlSysteme AG",
    logo_url: null,
    accent_color: "#002850",
    secondary_accent_color: "#00AFD3",
    accent_text_color: "#FFFFFF",
    template_key: "standard-product-sheet",
    template_version: 1,
    footer_background: "#002850",
    footer_text_color: null,
    address: "Geschwister-Scholl-Str. 7, 39307 Genthin",
    phone: "+49 3933 87879",
    email: "info@tcsag.de",
    website: "www.tcsag.de",
    show_price: showPrice,
  },
});

beforeEach(() => {
  cleanup();
  datasheet.mockReset();
  brandProfile.mockReset();
});

describe("Datenblatt-Adapter", () => {
  it("zeigt Titel, Merkmale und alle Komponenten aus dem Vertrag", async () => {
    datasheet.mockResolvedValue(contract(false));
    brandProfile.mockResolvedValue(okProfile(false));

    render(
      <ProductDatasheetModal open artikelNr="PAAF011/007" onOpenChange={() => {}} />,
    );

    expect(
      await screen.findByRole("heading", { name: "Audiopaket für 1 Wohneinheit", hidden: true }),
    ).toBeInTheDocument();
    expect(screen.getByText("Vorkonfiguriertes Paket")).toBeInTheDocument();
    expect(screen.getByText("ASA110101-0010")).toBeInTheDocument();
    expect(screen.getByText("ISW3030-0140")).toBeInTheDocument();
    expect(screen.getByText("BVS20-SG")).toBeInTheDocument();
    expect(screen.getAllByText("1×")).toHaveLength(3);
expect(
      screen.getByText("TCS TürControlSysteme AG", { exact: false }),
    ).toBeInTheDocument();
  });

  it("zeigt keinen Preis, wenn das Markenprofil ihn nicht freigibt", async () => {
    datasheet.mockResolvedValue(contract(true));
    brandProfile.mockResolvedValue(okProfile(false));

    render(
      <ProductDatasheetModal open artikelNr="PAAF011/007" onOpenChange={() => {}} />,
    );
    await screen.findByRole("heading", { name: "Audiopaket für 1 Wohneinheit", hidden: true });
    expect(screen.queryByText(/743/)).not.toBeInTheDocument();
  });

  it("zeigt den Preis nur bei Freigabe im Vertrag und im Markenprofil", async () => {
    datasheet.mockResolvedValue(contract(true));
    brandProfile.mockResolvedValue(okProfile(true));

    render(
      <ProductDatasheetModal open artikelNr="PAAF011/007" onOpenChange={() => {}} />,
    );
    await screen.findByRole("heading", { name: "Audiopaket für 1 Wohneinheit", hidden: true });
    expect(screen.getByText(/743/)).toBeInTheDocument();
  });

  it.each([
    ["missing", { status: "missing" as const }],
    ["inactive", { status: "inactive" as const }],
    ["mismatch", { status: "mismatch" as const, profileKey: "scantron" }],
    ["templateMissing", { status: "templateMissing" as const }],
    [
      "templateUnsupported",
      {
        status: "templateUnsupported" as const,
        templateKey: "compact-sheet",
        templateVersion: 2,
      },
    ],
  ])("blockiert Anzeige und Druck bei Markenprofil %s", async (_name, outcome) => {
    datasheet.mockResolvedValue(contract(false));
    brandProfile.mockResolvedValue(outcome);

    render(
      <ProductDatasheetModal open artikelNr="PAAF011/007" onOpenChange={() => {}} />,
    );

    const alert = await screen.findByRole("alert");
    expect(alert.textContent ?? "").not.toBe("");
    expect(screen.getByRole("button", { name: /erneut versuchen/i })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: /drucken/i }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("heading", { name: "Audiopaket für 1 Wohneinheit", hidden: true }),
    ).not.toBeInTheDocument();
  });

  it("lädt nach „Erneut versuchen“ neu und zeigt dann das Datenblatt", async () => {
    datasheet.mockResolvedValue(contract(false));
    brandProfile
      .mockResolvedValueOnce({ status: "error", message: "42883 | fehlt" })
      .mockResolvedValue(okProfile(false));

    render(
      <ProductDatasheetModal open artikelNr="PAAF011/007" onOpenChange={() => {}} />,
    );
    await screen.findByRole("alert");
    await userEvent.click(screen.getByRole("button", { name: /erneut versuchen/i }));

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Audiopaket für 1 Wohneinheit", hidden: true }),
      ).toBeInTheDocument(),
    );
  });

  it("meldet ein fehlendes Datenblatt ohne Erfindungen", async () => {
    datasheet.mockResolvedValue({ found: false });
    brandProfile.mockResolvedValue(okProfile(false));

    render(
      <ProductDatasheetModal open artikelNr="XYZ" onOpenChange={() => {}} />,
    );
    expect(await screen.findByText(/kein Datenblatt freigegeben/i)).toBeInTheDocument();
  });

  it("setzt weiße Schrift auf TCS-Blau aus dem Markenprofil", async () => {
    datasheet.mockResolvedValue(contract(false));
    brandProfile.mockResolvedValue(okProfile(false));

    const { container } = render(
      <ProductDatasheetModal open artikelNr="PAAF011/007" onOpenChange={() => {}} />,
    );
    await screen.findByRole("heading", { name: "Audiopaket für 1 Wohneinheit", hidden: true });

    const root = container.ownerDocument.querySelector(".ds-root") as HTMLElement;
    expect(root.style.getPropertyValue("--ds-accent").toUpperCase()).toBe("#002850");
    expect(root.style.getPropertyValue("--ds-accent-fg").toUpperCase()).toBe("#FFFFFF");
    expect(
      root.style.getPropertyValue("--ds-accent-secondary").toUpperCase(),
    ).toBe("#00AFD3");
    expect(root.style.getPropertyValue("--ds-footer-bg").toUpperCase()).toBe("#002850");
  });

  it("fällt ohne Zweitfarbe auf die Hauptfarbe zurück", async () => {
    datasheet.mockResolvedValue(contract(false));
    const legacy = okProfile(false);
    brandProfile.mockResolvedValue({
      ...legacy,
      profile: { ...legacy.profile, secondary_accent_color: null },
    });

    render(
      <ProductDatasheetModal open artikelNr="PAAF011/007" onOpenChange={() => {}} />,
    );
    await screen.findByRole("heading", { name: "Audiopaket für 1 Wohneinheit", hidden: true });

    const root = document.querySelector(".ds-root") as HTMLElement;
    expect(
      root.style.getPropertyValue("--ds-accent-secondary").toUpperCase(),
    ).toBe("#002850");
  });

  it("nutzt bei Altprofil ohne accent_text_color den Kontrastwert", async () => {
    datasheet.mockResolvedValue(contract(false));
    const legacy = okProfile(false);
    brandProfile.mockResolvedValue({
      ...legacy,
      profile: { ...legacy.profile, accent_text_color: null },
    });

    render(
      <ProductDatasheetModal open artikelNr="PAAF011/007" onOpenChange={() => {}} />,
    );
    await screen.findByRole("heading", { name: "Audiopaket für 1 Wohneinheit", hidden: true });

    const root = document.querySelector(".ds-root") as HTMLElement;
    // Kontrastwahl auf TCS-Blau ergibt Weiß.
    expect(root.style.getPropertyValue("--ds-accent-fg").toLowerCase()).toBe("#ffffff");
  });
});
