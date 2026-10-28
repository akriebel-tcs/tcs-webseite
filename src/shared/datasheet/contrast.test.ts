import { describe, expect, it } from "vitest";
import {
  NEUTRAL_ACCENT,
  readableForeground,
  resolveBrandColors,
  validHexColor,
} from "./contrast";

describe("brand colour handling", () => {
  it("uses black on the Scantron orange for readable contrast", () => {
    expect(readableForeground("#FF6600")).toBe("#000000");
  });

  it("uses white on a dark footer", () => {
    expect(readableForeground("#383838")).toBe("#ffffff");
  });

  it("rejects invalid colours and stays neutral", () => {
    expect(validHexColor("orange")).toBeNull();
    expect(validHexColor(null)).toBeNull();
    expect(validHexColor("#abc")).toBe("#abc");
    expect(readableForeground(undefined)).toBe(readableForeground(NEUTRAL_ACCENT));
  });
});

describe("resolveBrandColors", () => {
  it("resolves the TCS profile to dark blue, cyan and white", () => {
    const colors = resolveBrandColors({
      accent_color: "#002850",
      secondary_accent_color: "#00AFD3",
      accent_text_color: "#FFFFFF",
      footer_background: "#002850",
      footer_text_color: "#FFFFFF",
    });
    expect(colors).toEqual({
      accent: "#002850",
      secondaryAccent: "#00AFD3",
      accentForeground: "#FFFFFF",
      footerBackground: "#002850",
      footerForeground: "#FFFFFF",
    });
  });

  it("keeps Scantron orange when secondary equals primary", () => {
    const colors = resolveBrandColors({
      accent_color: "#FF6600",
      secondary_accent_color: "#FF6600",
      accent_text_color: "#FFFFFF",
      footer_background: "#383838",
      footer_text_color: "#FFFFFF",
    });
    expect(colors.accent).toBe("#FF6600");
    expect(colors.secondaryAccent).toBe("#FF6600");
    expect(colors.accentForeground).toBe("#FFFFFF");
    expect(colors.footerBackground).toBe("#383838");
  });

  it("falls back to the primary accent for an invalid or missing secondary", () => {
    expect(
      resolveBrandColors({ accent_color: "#FF6600", secondary_accent_color: "orange" })
        .secondaryAccent,
    ).toBe("#FF6600");
    expect(
      resolveBrandColors({ accent_color: "#FF6600", secondary_accent_color: null })
        .secondaryAccent,
    ).toBe("#FF6600");
  });

  it("uses neutral grey when no brand colour is valid", () => {
    const colors = resolveBrandColors({});
    expect(colors.accent).toBe(NEUTRAL_ACCENT);
    expect(colors.secondaryAccent).toBe(NEUTRAL_ACCENT);
  });
});
