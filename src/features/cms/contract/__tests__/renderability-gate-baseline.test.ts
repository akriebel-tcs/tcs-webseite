import { describe, it, expect } from "vitest";
import { classifyBaselineUpdate } from "../../../../../scripts/cms/renderability-gate-baseline.mjs";

describe("renderability-gate baseline subset check", () => {
  const A = "p1|s1|cta_v1#de/missing_field/title";
  const B = "p2|s2|cta_v1#en/missing_field/cta_label";
  const C = "p3|s3|faq_v1#de/missing_field/title";
  const D = "p4|s4|cards_v1#de/missing_field/title";

  it("erlaubt reine Verkleinerung", () => {
    const r = classifyBaselineUpdate([A, B, C], [A, B]);
    expect(r.ok).toBe(true);
    expect(r.added).toEqual([]);
    expect(r.removed).toEqual([C]);
  });

  it("erlaubt unveränderte Baseline", () => {
    const r = classifyBaselineUpdate([A, B, C], [A, B, C]);
    expect(r.ok).toBe(true);
    expect(r.added).toEqual([]);
    expect(r.removed).toEqual([]);
  });

  it("verbietet gleiche Anzahl mit ausgetauschtem Fingerprint", () => {
    const r = classifyBaselineUpdate([A, B, C], [A, B, D]);
    expect(r.ok).toBe(false);
    expect(r.added).toEqual([D]);
  });

  it("verbietet kleinere Anzahl mit mindestens einem neuen Fingerprint", () => {
    // 3 alte → 2 alte (B,C entfernt) + 1 neuer (D), insgesamt kleiner
    const r = classifyBaselineUpdate([A, B, C], [A, D]);
    expect(r.ok).toBe(false);
    expect(r.added).toEqual([D]);
  });

  it("verbietet Vergrößerung", () => {
    const r = classifyBaselineUpdate([A, B], [A, B, C]);
    expect(r.ok).toBe(false);
    expect(r.added).toEqual([C]);
  });
});
