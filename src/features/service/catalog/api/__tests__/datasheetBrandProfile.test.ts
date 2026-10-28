import { describe, expect, it } from "vitest";
import { readBrandProfile } from "../datasheetBrandProfile";

/**
 * Das Markenprofil wird nur akzeptiert, wenn es gefunden, aktiv und exakt das
 * TCS-Profil ist. Preisfreigabe und Farben stammen vollständig aus der Antwort.
 */
describe("readBrandProfile", () => {
  const row = {
    found: true,
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
    address: "Genthin",
    phone: "+49 3933 87879",
    email: "info@tcsag.de",
    website: "www.tcsag.de",
    show_price: false,
    is_active: true,
  };

  it("übernimmt ein gefundenes, aktives TCS-Profil unverändert", () => {
    const outcome = readBrandProfile(row, "tcs");
    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") throw new Error("expected ok");
    expect(outcome.profile.accent_color).toBe("#002850");
    expect(outcome.profile.secondary_accent_color).toBe("#00AFD3");
    expect(outcome.profile.footer_background).toBe("#002850");
    expect(outcome.profile.logo_url).toBeNull();
    expect(outcome.profile.show_price).toBe(false);
  });

  it("lässt eine fehlende Zweitfarbe leer, ohne sie zu erfinden", () => {
    const outcome = readBrandProfile({ ...row, secondary_accent_color: null }, "tcs");
    if (outcome.status !== "ok") throw new Error("expected ok");
    expect(outcome.profile.secondary_accent_color).toBeNull();
  });

  it("gibt Preise nur bei ausdrücklicher Freigabe frei", () => {
    const outcome = readBrandProfile({ ...row, show_price: true }, "tcs");
    if (outcome.status !== "ok") throw new Error("expected ok");
    expect(outcome.profile.show_price).toBe(true);
    const missing = readBrandProfile({ ...row, show_price: null }, "tcs");
    if (missing.status !== "ok") throw new Error("expected ok");
    expect(missing.profile.show_price).toBe(false);
  });

  it("lehnt fehlend, inaktiv und fremd ab", () => {
    expect(readBrandProfile({ found: false }, "tcs").status).toBe("missing");
    expect(readBrandProfile(null, "tcs").status).toBe("missing");
    expect(readBrandProfile({ ...row, is_active: false }, "tcs").status).toBe(
      "inactive",
    );
    const foreign = readBrandProfile({ ...row, profile_key: "scantron" }, "tcs");
    expect(foreign.status).toBe("mismatch");
  });

  it("verträgt eine einelementige Ergebnisliste", () => {
    expect(readBrandProfile([row], "tcs").status).toBe("ok");
  });

  it("übernimmt Akzentschrift und Vorlagenangabe aus der Antwort", () => {
    const outcome = readBrandProfile(row, "tcs");
    if (outcome.status !== "ok") throw new Error("expected ok");
    expect(outcome.profile.accent_text_color).toBe("#FFFFFF");
    expect(outcome.profile.template_key).toBe("standard-product-sheet");
    expect(outcome.profile.template_version).toBe(1);
  });

  it("blockiert fehlende, fremde und nicht unterstützte Vorlagen", () => {
    expect(
      readBrandProfile({ ...row, template_key: null, template_version: null }, "tcs")
        .status,
    ).toBe("templateMissing");
    const foreign = readBrandProfile({ ...row, template_key: "compact-sheet" }, "tcs");
    expect(foreign.status).toBe("templateUnsupported");
    if (foreign.status !== "templateUnsupported") throw new Error("expected block");
    expect(foreign.templateKey).toBe("compact-sheet");
    expect(readBrandProfile({ ...row, template_version: 2 }, "tcs").status).toBe(
      "templateUnsupported",
    );
  });
});
