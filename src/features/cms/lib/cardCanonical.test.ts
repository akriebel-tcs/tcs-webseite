/**
 * Regressionstests für `card_v1`-Linkauflösung (B-538-Standard).
 *
 * Abgedeckte Zielarten in `resolveHref`:
 *   - interner Pfad (`/…`)
 *   - externe URL (`http://`, `https://`, `mailto:`, `tel:`)
 *   - gleichseitiger Anker (`#…`)
 *   - Kurz-ID Seite (`P-123`)
 *   - Kurz-ID Baustein (`B-538`)
 *   - ungültige Werte (`""`, `"#"`, `"kontakt"`, unaufgelöste Kurz-IDs)
 *
 * Außerdem `canonicalLink` end-to-end auf einer Fake-CMS-Quelle:
 *   - `link_N_*` wird bevorzugt
 *   - `link_N_enabled = "0"` schaltet ab und fällt auf `cta_*` zurück
 *   - ungelöste Kurz-IDs liefern `visible=false, status="broken"` (kein `href="#"`)
 *   - Legacy `cta_*` und `href` greifen nur als Fallback
 */

import { describe, it, expect } from "vitest";
import {
  canonicalLink,
  resolveHref,
  type ShortIdMap,
} from "./cardCanonical";

const shortIdMap: ShortIdMap = {
  pages: new Map([[265, "/produkte/intercom"]]),
  sections: new Map([
    [538, { route: "/anwendungen/wohnbau", anchor: "card-538" }],
    [2084, { route: "/kontakt" }],
  ]),
};

// Minimal-Fake einer `useCmsPageContent`-Rückgabe: nur `text(section, field, loc, fb)`.
type Locale = "de" | "en";
type Row = Record<string, Partial<Record<Locale, string>>>;
function fakeCms(data: Record<string, Row>) {
  return {
    text(section: string, field: string, loc: Locale, fb = "") {
      return data[section]?.[field]?.[loc] ?? fb;
    },
  } as never;
}

describe("resolveHref", () => {
  it("akzeptiert interne Pfade", () => {
    expect(resolveHref("/kontakt")).toEqual({ href: "/kontakt", valid: true });
  });

  it("akzeptiert externe URLs (http, https, mailto, tel)", () => {
    expect(resolveHref("https://example.com")).toEqual({ href: "https://example.com", valid: true });
    expect(resolveHref("http://x.de")).toEqual({ href: "http://x.de", valid: true });
    expect(resolveHref("mailto:a@b.de")).toEqual({ href: "mailto:a@b.de", valid: true });
    expect(resolveHref("tel:+491234")).toEqual({ href: "tel:+491234", valid: true });
  });

  it("akzeptiert gleichseitige Anker", () => {
    expect(resolveHref("#section-1")).toEqual({ href: "#section-1", valid: true });
  });

  it("löst Kurz-IDs für Seiten (P-…) auf", () => {
    expect(resolveHref("P-265", shortIdMap)).toEqual({
      href: "/produkte/intercom",
      valid: true,
    });
    expect(resolveHref("p-265", shortIdMap)).toEqual({
      href: "/produkte/intercom",
      valid: true,
    });
  });

  it("löst Kurz-IDs für Bausteine (B-…) inkl. Anker auf", () => {
    expect(resolveHref("B-538", shortIdMap)).toEqual({
      href: "/anwendungen/wohnbau#card-538",
      valid: true,
    });
  });

  it("löst Kurz-ID für Baustein ohne Anker auf reine Route auf", () => {
    expect(resolveHref("B-2084", shortIdMap)).toEqual({
      href: "/kontakt",
      valid: true,
    });
  });

  it("markiert unaufgelöste Kurz-IDs als ungültig (kein href='#')", () => {
    expect(resolveHref("P-999", shortIdMap)).toEqual({ href: "", valid: false });
    expect(resolveHref("B-999", shortIdMap)).toEqual({ href: "", valid: false });
  });

  it("markiert leere Werte, '#' und Strings ohne Slash als ungültig", () => {
    expect(resolveHref("")).toEqual({ href: "", valid: false });
    expect(resolveHref("   ")).toEqual({ href: "", valid: false });
    expect(resolveHref("#")).toEqual({ href: "", valid: false });
    expect(resolveHref("kontakt")).toEqual({ href: "", valid: false });
  });

  it("liefert ohne ShortIdMap für P-/B-Werte ungültig", () => {
    expect(resolveHref("P-1")).toEqual({ href: "", valid: false });
    expect(resolveHref("B-1")).toEqual({ href: "", valid: false });
  });
});

describe("canonicalLink — B-538-Standardvertrag", () => {
  it("bevorzugt link_N_* gegenüber Legacy cta_*/href", () => {
    const cms = fakeCms({
      s1: {
        link_1_href: { de: "/planer" },
        link_1_label: { de: "Zum Planer" },
        cta_href: { de: "/alt" },
        cta_label: { de: "Details" },
      },
    });
    const link = canonicalLink(cms, "s1", "de");
    expect(link).toMatchObject({
      href: "/planer",
      label: "Zum Planer",
      visible: true,
      status: "ok",
    });
  });

  it("schaltet bei link_N_enabled='0' den Slot ab und fällt auf cta_* zurück", () => {
    const cms = fakeCms({
      s1: {
        link_1_enabled: { de: "0" },
        link_1_href: { de: "/planer" },
        link_1_label: { de: "Zum Planer" },
        cta_href: { de: "/kontakt" },
        cta_label: { de: "Mehr erfahren" },
      },
    });
    const link = canonicalLink(cms, "s1", "de");
    expect(link).toMatchObject({
      href: "/kontakt",
      label: "Mehr erfahren",
      visible: true,
    });
  });

  it("löst Kurz-ID im link_N_href über shortIdMap auf", () => {
    const cms = fakeCms({
      s1: {
        link_1_href: { de: "B-538" },
        link_1_label: { de: "Zum Beispiel" },
      },
    });
    const link = canonicalLink(cms, "s1", "de", { shortIdMap });
    expect(link.href).toBe("/anwendungen/wohnbau#card-538");
    expect(link.visible).toBe(true);
  });

  it("setzt visible=false / status='broken' bei ungültigem href (kein '#')", () => {
    const cms = fakeCms({
      s1: {
        link_1_href: { de: "P-9999" },
        link_1_label: { de: "Defekter Link" },
      },
    });
    const link = canonicalLink(cms, "s1", "de", { shortIdMap });
    expect(link.href).toBe("");
    expect(link.visible).toBe(false);
    expect(link.status).toBe("broken");
  });

  it("nutzt Legacy href nur, wenn Fallback-Label gesetzt ist", () => {
    const cms = fakeCms({
      s1: { href: { de: "/alt" } },
    });
    const link = canonicalLink(cms, "s1", "de", { fallbackLabel: "Mehr erfahren" });
    expect(link).toMatchObject({ href: "/alt", label: "Mehr erfahren", visible: true });
  });

  it("liefert visible=false, wenn nichts gepflegt ist", () => {
    const cms = fakeCms({ s1: {} });
    const link = canonicalLink(cms, "s1", "de");
    expect(link.visible).toBe(false);
    expect(link.status).toBe("broken");
    expect(link.href).toBe("");
  });

  it("unterstützt Index 2 und 3 (Zum Planer / Zum Konfigurator)", () => {
    const cms = fakeCms({
      s1: {
        link_2_href: { de: "/planer" },
        link_2_label: { de: "Zum Planer" },
        link_3_href: { de: "/konfigurator" },
        link_3_label: { de: "Zum Konfigurator" },
      },
    });
    expect(canonicalLink(cms, "s1", "de", { index: 2 }).href).toBe("/planer");
    expect(canonicalLink(cms, "s1", "de", { index: 3 }).href).toBe("/konfigurator");
  });
});
