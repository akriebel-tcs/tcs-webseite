/**
 * Content signature (module 1.4.1): the print frame must re-paginate on every
 * real content change and must stay stable otherwise.
 */

import { describe, expect, it } from "vitest";
import { contentSignature } from "./signature";

const sheet = { artikelNr: "ISW6010-0145", title: "Innenstation", price: 217 };
const brand = { profile_key: "scantron", accent_color: "#FF6600" };
const labels = { documentType: "Datenblatt" };

describe("contentSignature", () => {
  it("is stable for equal content and independent of key order", () => {
    expect(contentSignature(sheet, brand, labels)).toBe(
      contentSignature(
        { price: 217, title: "Innenstation", artikelNr: "ISW6010-0145" },
        { accent_color: "#FF6600", profile_key: "scantron" },
        labels,
      ),
    );
  });

  it("changes when the content behind the same article number changes", () => {
    expect(contentSignature(sheet, brand, labels)).not.toBe(
      contentSignature({ ...sheet, title: "Innenstation Video" }, brand, labels),
    );
  });

  it("changes when branding changes behind the same profile key", () => {
    expect(contentSignature(sheet, brand, labels)).not.toBe(
      contentSignature(sheet, { ...brand, accent_color: "#0055AA" }, labels),
    );
  });

  it("changes when translated labels change", () => {
    expect(contentSignature(sheet, brand, labels)).not.toBe(
      contentSignature(sheet, brand, { documentType: "Datablad" }),
    );
  });

  it("changes on equal component count with other quantities or titles", () => {
    const base = [
      { artikelNr: "A", title: "Modul", quantity: 1 },
      { artikelNr: "B", title: "Stick", quantity: 1 },
    ];
    const other = [
      { artikelNr: "A", title: "Modul", quantity: 2 },
      { artikelNr: "B", title: "Stick", quantity: 1 },
    ];
    const renamed = [
      { artikelNr: "A", title: "Modul lokalisiert", quantity: 1 },
      { artikelNr: "B", title: "Stick", quantity: 1 },
    ];
    expect(contentSignature(base)).not.toBe(contentSignature(other));
    expect(contentSignature(base)).not.toBe(contentSignature(renamed));
    expect(contentSignature(base)).toBe(contentSignature([...base]));
  });

  it("ignores functions so recreated callbacks do not re-render endlessly", () => {
    expect(contentSignature({ fn: () => 1, value: 3 })).toBe(
      contentSignature({ fn: () => 2, value: 3 }),
    );
  });
});
