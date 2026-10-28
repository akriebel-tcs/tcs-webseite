import { describe, expect, it } from "vitest";
import { normalizeDatasheet } from "./normalize";
import type { ContractDatasheet } from "./types";

const base: ContractDatasheet = {
  found: true,
  header: {
    artikel_nr: "PAAF011/007",
    title: "Audiopakke til 1 boligenhed",
    subtitle: "Audio-kompletpakke",
    serie: "PES PRO",
    price: "743.0",
    currency: "EUR",
    show_price: true,
  },
  media: {
    primary_image: { public_url: "https://example.test/a.png", title: "A", is_primary: true },
  },
  badges: [
    { key: "ap", sort: 20, label: "Frembygget", label_de: "Aufputz" },
    { key: "pro", sort: 5, label: "PRO" },
  ],
  sections: [
    {
      section_key: "features_primary",
      kind: "features",
      sort_order: 1,
      items: [{ text: "Forkonfigureret pakke", sort_order: 0 }],
    },
    {
      section_key: "technical_data",
      kind: "spec_groups",
      title: "Tekniske data",
      sort_order: 2,
      items: [
        {
          title: "",
          rows: [
            { label: "System", value: "audio" },
            { label: "Leer", value: "" },
          ],
        },
      ],
    },
    {
      section_key: "package_components",
      kind: "package_components",
      title: "Pakkekomponenter",
      sort_order: 4,
      items: [
        {
          title: "Udendørsstation V2D Audio",
          quantity: 1,
          role_key: "aussenstation",
          artikel_nr: "ASA110101-0010",
          role_label: "Udestation",
        },
      ],
    },
    {
      section_key: "scope_of_delivery",
      kind: "features",
      title: "Leveringsomfang",
      sort_order: 8,
      items: [
        { role: "aussenstation", title: "PES PRO …", anzahl: 1, artikel_nr: "ASA110101-0010" },
        { role: "smartstick_option", title: "SSTICK%", anzahl: 1, artikel_nr: "SSTICK%" },
      ],
    },
    { section_key: "empty", kind: "spec_groups", sort_order: 9, items: [] },
  ],
};

describe("normalizeDatasheet", () => {
  it("keeps contract order and real data only", () => {
    const sheet = normalizeDatasheet(base)!;
    expect(sheet.artikelNr).toBe("PAAF011/007");
    expect(sheet.serie).toBe("PES PRO");
    expect(sheet.price).toBe(743);
    expect(sheet.primaryImage?.url).toBe("https://example.test/a.png");
    expect(sheet.sections.map((section) => section.key)).toEqual([
      "features_primary",
      "technical_data",
      "package_components",
    ]);
  });

  it("drops the broken scope_of_delivery pseudo items (SSTICK%)", () => {
    const sheet = normalizeDatasheet(base)!;
    const flat = JSON.stringify(sheet);
    expect(flat).not.toContain("SSTICK%");
    expect(flat).not.toContain("[object Object]");
  });

  it("parses components with article number, title and quantity", () => {
    const sheet = normalizeDatasheet(base)!;
    const section = sheet.sections.find((entry) => entry.kind === "components");
    expect(section).toBeDefined();
    if (section?.kind !== "components") throw new Error("wrong kind");
    expect(section.items[0]).toEqual({
      artikelNr: "ASA110101-0010",
      title: "Udendørsstation V2D Audio",
      quantity: 1,
      roleLabel: "Udestation",
    });
  });

  it("drops spec rows without value and empty sections", () => {
    const sheet = normalizeDatasheet(base)!;
    const specs = sheet.sections.find((entry) => entry.kind === "specs");
    if (specs?.kind !== "specs") throw new Error("wrong kind");
    expect(specs.groups[0]!.rows).toEqual([{ label: "System", value: "audio" }]);
  });

  it("parses nested tables with columns and rows", () => {
    const sheet = normalizeDatasheet({
      ...base,
      sections: [
        {
          section_key: "variants",
          kind: "table",
          title: "Tabel",
          sort_order: 1,
          items: [
            {
              title: "T1",
              columns: ["A", "B"],
              rows: [["1", "2"], { label: "L", value: "V" }],
            },
          ],
        },
      ],
    })!;
    const section = sheet.sections[0];
    if (section?.kind !== "tables") throw new Error("wrong kind");
    expect(section.tables[0]).toEqual({
      title: "T1",
      columns: ["A", "B"],
      rows: [
        ["1", "2"],
        ["L", "V"],
      ],
    });
  });

  it("returns null for not found or missing article number", () => {
    expect(normalizeDatasheet({ found: false })).toBeNull();
    expect(normalizeDatasheet(undefined)).toBeNull();
  });

  it("marks the contract price permission", () => {
    const blocked = normalizeDatasheet({
      ...base,
      header: { ...base.header, show_price: false },
    })!;
    expect(blocked.contractAllowsPrice).toBe(false);
  });
});

describe("normalizeDatasheet — scalar cells, keyed tables and guards", () => {
  it("keeps numeric spec values including 0", () => {
    const sheet = normalizeDatasheet({
      found: true,
      header: { artikel_nr: "X1" },
      sections: [
        {
          section_key: "tech",
          kind: "spec_groups",
          items: [
            {
              rows: [
                { label: "Anzahl Klingeltasten", value: 0 },
                { label: "Menge", value: 3 },
                { label: "Leer", value: "" },
                { label: "Objekt", value: { nope: true } },
              ],
            },
          ],
        },
      ],
    } as never);
    const section = sheet!.sections[0];
    expect(section?.kind).toBe("specs");
    if (section?.kind !== "specs") throw new Error("expected specs");
    expect(section.groups[0]!.rows).toEqual([
      { label: "Anzahl Klingeltasten", value: "0" },
      { label: "Menge", value: "3" },
    ]);
  });

  it("reads object rows via {key,label} columns and keeps the labels", () => {
    const sheet = normalizeDatasheet({
      found: true,
      header: { artikel_nr: "X2" },
      sections: [
        {
          section_key: "variants",
          kind: "table",
          items: [
            {
              title: "Varianten",
              columns: [
                { key: "artikel_nr", label: "Artikelnummer" },
                { key: "tasten", label: "Tasten" },
                { key: "note", label: "Hinweis" },
              ],
              rows: [
                { artikel_nr: "ASA1", tasten: 0, note: "" },
                { artikel_nr: "ASA2", tasten: 2, note: "mit SDI" },
                { artikel_nr: "", tasten: "", note: "" },
              ],
            },
          ],
        },
      ],
    } as never);
    const section = sheet!.sections[0];
    if (section?.kind !== "tables") throw new Error("expected tables");
    expect(section.tables[0]!.columns).toEqual(["Artikelnummer", "Tasten", "Hinweis"]);
    expect(section.tables[0]!.rows).toEqual([
      ["ASA1", "0", ""],
      ["ASA2", "2", "mit SDI"],
    ]);
  });

  it("keeps numeric array cells and drops fully empty rows", () => {
    const sheet = normalizeDatasheet({
      found: true,
      header: { artikel_nr: "X3" },
      sections: [
        {
          section_key: "t",
          kind: "table",
          items: [{ columns: ["A", "B"], rows: [["Gewicht", 0], ["", null], [1, 2]] }],
        },
      ],
    } as never);
    const section = sheet!.sections[0];
    if (section?.kind !== "tables") throw new Error("expected tables");
    expect(section.tables[0]!.rows).toEqual([["Gewicht", "0"], ["1", "2"]]);
  });

  it("survives broken API objects without throwing", () => {
    const sheet = normalizeDatasheet({
      found: true,
      header: { artikel_nr: "X4" },
      badges: [null, "nope", { key: "ok", label: "OK" }] as never,
      media: { gallery: [null, { public_url: "https://x.test/i.png" }] } as never,
      sections: [
        null,
        "broken",
        { kind: "features", items: null },
        { kind: "spec_groups" },
        { kind: "features", items: ["Direkter String", { text: "Objekt" }, { nope: 1 }] },
      ] as never,
    } as never);
    expect(sheet).not.toBeNull();
    expect(sheet!.badges).toHaveLength(1);
    expect(sheet!.primaryImage?.url).toBe("https://x.test/i.png");
    const section = sheet!.sections[0];
    if (section?.kind !== "features") throw new Error("expected features");
    expect(section.items).toEqual(["Direkter String", "Objekt"]);
  });

  it("requires an explicit contract price permission", () => {
    const missing = normalizeDatasheet({
      found: true,
      header: { artikel_nr: "X5", price: 10 },
    } as never);
    expect(missing!.contractAllowsPrice).toBe(false);
    const allowed = normalizeDatasheet({
      found: true,
      header: { artikel_nr: "X5", price: 10, show_price: true },
    } as never);
    expect(allowed!.contractAllowsPrice).toBe(true);
  });

  it("handles very long Polish texts without losing cells", () => {
    const long =
      "Stacja zewnętrzna wideodomofonowa z cyfrowym przetwarzaniem mowy oraz " +
      "przygotowaniem do rozbudowy w trybie uniwersalnej magistrali TCS:BUS, " +
      "montaż natynkowy, obudowa aluminiowa, oświetlenie tabliczki nazwiskowej";
    const sheet = normalizeDatasheet({
      found: true,
      header: { artikel_nr: "PL1", title: long },
      sections: [
        { kind: "features", items: [{ text: long }] },
        { kind: "spec_groups", items: [{ title: long, rows: [{ label: long, value: 0 }] }] },
      ],
    } as never);
    expect(sheet!.title).toBe(long);
    const specs = sheet!.sections[1];
    if (specs?.kind !== "specs") throw new Error("expected specs");
    expect(specs.groups[0]!.rows[0]).toEqual({ label: long, value: "0" });
  });
});
