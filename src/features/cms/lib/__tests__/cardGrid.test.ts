import { describe, it, expect } from "vitest";
import { computeCardRows, rowSizeForIndex } from "../cardGrid";

describe("computeCardRows (max=4, Default & useCases)", () => {
  const cases: Array<[number, number[]]> = [
    [0, []],
    [1, [1]],
    [2, [2]],
    [3, [3]],
    [4, [4]],
    [5, [3, 2]],
    [6, [3, 3]],
    [7, [4, 3]],
    [8, [4, 4]],
    [9, [3, 3, 3]],
    [10, [4, 3, 3]],
    [11, [4, 4, 3]],
    [12, [4, 4, 4]],
    [13, [4, 4, 3, 2]],
    [14, [4, 4, 3, 3]],
    [15, [3, 3, 3, 3, 3]],
    [16, [4, 4, 4, 4]],
  ];
  for (const [n, expected] of cases) {
    it(`n=${n} → ${JSON.stringify(expected)}`, () => {
      expect(computeCardRows(n, 4)).toEqual(expected);
    });
  }
  it("nie eine Reihe mit nur 1 Karte (außer n=1)", () => {
    for (let n = 2; n <= 30; n++) {
      const rows = computeCardRows(n, 4);
      expect(rows.every((r) => r >= 2)).toBe(true);
      expect(rows.reduce((a, b) => a + b, 0)).toBe(n);
    }
  });
});

describe("computeCardRows (max=3, Benefits)", () => {
  const cases: Array<[number, number[]]> = [
    [3, [3]],
    [4, [2, 2]],
    [5, [3, 2]],
    [6, [3, 3]],
    [7, [3, 2, 2]],
    [8, [3, 3, 2]],
    [9, [3, 3, 3]],
  ];
  for (const [n, expected] of cases) {
    it(`benefits n=${n} → ${JSON.stringify(expected)}`, () => {
      expect(computeCardRows(n, 3)).toEqual(expected);
    });
  }
});

describe("rowSizeForIndex", () => {
  it("5 Karten: Items 0–2 sind in 3er-Reihe, Items 3–4 in 2er-Reihe", () => {
    expect(rowSizeForIndex(5, 0)).toBe(3);
    expect(rowSizeForIndex(5, 2)).toBe(3);
    expect(rowSizeForIndex(5, 3)).toBe(2);
    expect(rowSizeForIndex(5, 4)).toBe(2);
  });
  it("7 Karten: Items 0–3 in 4er-Reihe, Items 4–6 in 3er-Reihe", () => {
    expect(rowSizeForIndex(7, 3)).toBe(4);
    expect(rowSizeForIndex(7, 4)).toBe(3);
  });
});
