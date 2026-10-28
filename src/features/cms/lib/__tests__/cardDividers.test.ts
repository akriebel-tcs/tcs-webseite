import { describe, expect, it } from "vitest";
import { resolveCardDividers, normalizeDividerSetting } from "../cardDividers";

describe("resolveCardDividers", () => {
  it("folgt global, wenn Block leer", () => {
    expect(resolveCardDividers("", "on")).toBe(true);
    expect(resolveCardDividers("", "off")).toBe(false);
    expect(resolveCardDividers(null, "")).toBe(true);
  });
  it("Block-Override schlägt global", () => {
    expect(resolveCardDividers("off", "on")).toBe(false);
    expect(resolveCardDividers("on", "off")).toBe(true);
  });
  it("normalisiert", () => {
    expect(normalizeDividerSetting("inherit")).toBe("inherit");
    expect(normalizeDividerSetting(" ON ")).toBe("on");
  });
});
