/**
 * Kern-Regressionstests für `evaluateSectionRenderability` (Batch 56 + 56.1).
 *
 * Pflicht-Abdeckung:
 *  - cta_v1: bilingual Pflichtfelder
 *  - content_v1, rich_v1, teaser_2col_v1: bilingual anyOf
 *  - contact_block_v1: anyLocale-Variante
 *  - faq_v1: Items, inkl. deaktivierte Items via enabled/is_active/hidden/visible
 *  - Container (cards_v1/feature_grid_v1/product_scroller_v1/
 *    product_showcase_list_v1/download_list_v1): acceptedChildTypes,
 *    titleFallbackField, wrong_child_type
 *  - stats_v1, tabs_v1: kein Title-Fallback
 *  - card_v1: anyLocale über Text/Bullets/Chips/Links
 *  - Unbekannter Typ: contractKnown=false
 */
import { describe, it, expect } from "vitest";
import {
  evaluateSectionRenderability,
  factsFromFieldRows,
  SECTION_RENDERABILITY,
} from "../renderability";

function fieldFacts(values: Record<string, string>) {
  const rows = Object.entries(values).map(([k, v]) => {
    const [field_key, locale] = k.split("@");
    return { field_key, locale, value: v };
  });
  return factsFromFieldRows(rows);
}

describe("cta_v1", () => {
  it("renderfähig mit allen drei Pflichtfeldern in DE+EN", () => {
    const r = evaluateSectionRenderability("cta_v1", fieldFacts({
      "title@de": "T", "title@en": "T",
      "cta_label@de": "L", "cta_label@en": "L",
      "cta_href@de": "/x", "cta_href@en": "/x",
    }));
    expect(r.renderable).toBe(true);
  });
  it("nicht renderfähig ohne title", () => {
    const r = evaluateSectionRenderability("cta_v1", fieldFacts({
      "cta_label@de": "L", "cta_label@en": "L",
      "cta_href@de": "/x", "cta_href@en": "/x",
    }));
    expect(r.renderable).toBe(false);
    expect(r.reasonCodes).toContain("missing_required_field");
  });
});

describe("content_v1 / rich_v1 / teaser_2col_v1 — bilingual anyOf", () => {
  it("content_v1 ok mit title in DE und text in EN", () => {
    expect(
      evaluateSectionRenderability("content_v1", fieldFacts({ "title@de": "T", "text@en": "Body" })).renderable,
    ).toBe(true);
  });
  it("rich_v1 fehlend body in EN ⇒ nicht renderfähig", () => {
    const r = evaluateSectionRenderability("rich_v1", fieldFacts({ "body@de": "B" }));
    expect(r.renderable).toBe(false);
    expect(r.reasonCodes).toContain("missing_required_any_of");
  });
  it("teaser_2col_v1 ok mit title+text in beiden Sprachen", () => {
    expect(
      evaluateSectionRenderability("teaser_2col_v1", fieldFacts({
        "title@de": "T", "title@en": "T",
      })).renderable,
    ).toBe(true);
  });
});

describe("contact_block_v1 — anyLocale", () => {
  it("ok wenn nur phone in DE gepflegt ist", () => {
    expect(
      evaluateSectionRenderability("contact_block_v1", fieldFacts({ "phone@de": "+41 ..." })).renderable,
    ).toBe(true);
  });
  it("nicht renderfähig wenn nichts gepflegt ist", () => {
    const r = evaluateSectionRenderability("contact_block_v1", fieldFacts({}));
    expect(r.renderable).toBe(false);
    expect(r.reasonCodes).toContain("missing_required_any_of_any_locale");
  });
});

describe("faq_v1 — Items + Sichtbarkeit", () => {
  it("ein valides Item in DE+EN reicht", () => {
    const facts = factsFromFieldRows([], {
      faqSlugFields: [
        { slug: "a", locale: "de", field_key: "frage", value: "Q" },
        { slug: "a", locale: "de", field_key: "antwort", value: "A" },
        { slug: "a", locale: "en", field_key: "question", value: "Q" },
        { slug: "a", locale: "en", field_key: "answer", value: "A" },
      ],
    });
    expect(evaluateSectionRenderability("faq_v1", facts).renderable).toBe(true);
  });

  it("ausschließlich deaktiviertes Item ⇒ nicht renderfähig", () => {
    const facts = factsFromFieldRows([], {
      faqSlugFields: [
        { slug: "a", locale: "de", field_key: "frage", value: "Q" },
        { slug: "a", locale: "de", field_key: "antwort", value: "A" },
        { slug: "a", locale: "en", field_key: "question", value: "Q" },
        { slug: "a", locale: "en", field_key: "answer", value: "A" },
        { slug: "a", locale: "de", field_key: "enabled", value: "0" },
      ],
    });
    const r = evaluateSectionRenderability("faq_v1", facts);
    expect(r.renderable).toBe(false);
    expect(r.reasonCodes).toContain("no_valid_faq_items");
  });

  it("hidden=1 zählt wie deaktiviert", () => {
    const facts = factsFromFieldRows([], {
      faqSlugFields: [
        { slug: "a", locale: "de", field_key: "frage", value: "Q" },
        { slug: "a", locale: "de", field_key: "antwort", value: "A" },
        { slug: "a", locale: "en", field_key: "question", value: "Q" },
        { slug: "a", locale: "en", field_key: "answer", value: "A" },
        { slug: "a", locale: "de", field_key: "hidden", value: "1" },
      ],
    });
    expect(evaluateSectionRenderability("faq_v1", facts).renderable).toBe(false);
  });

  it("visible=0 zählt wie deaktiviert; zweites Item rettet die Renderfähigkeit", () => {
    const facts = factsFromFieldRows([], {
      faqSlugFields: [
        { slug: "a", locale: "de", field_key: "frage", value: "Q" },
        { slug: "a", locale: "de", field_key: "antwort", value: "A" },
        { slug: "a", locale: "en", field_key: "question", value: "Q" },
        { slug: "a", locale: "en", field_key: "answer", value: "A" },
        { slug: "a", locale: "de", field_key: "visible", value: "0" },
        { slug: "b", locale: "de", field_key: "frage", value: "Q2" },
        { slug: "b", locale: "de", field_key: "antwort", value: "A2" },
        { slug: "b", locale: "en", field_key: "question", value: "Q2" },
        { slug: "b", locale: "en", field_key: "answer", value: "A2" },
      ],
    });
    expect(evaluateSectionRenderability("faq_v1", facts).renderable).toBe(true);
  });
});

describe("Container — acceptedChildTypes + titleFallbackField", () => {
  it("cards_v1 mit 1 card_v1-Kind ist renderfähig", () => {
    const facts = factsFromFieldRows([], {
      acceptedChildrenCount: 1, totalActiveChildrenCount: 1,
    });
    expect(evaluateSectionRenderability("cards_v1", facts).renderable).toBe(true);
  });

  it("cards_v1 nur mit Container-Titel (ohne Kinder) renderfähig", () => {
    const facts = factsFromFieldRows(
      [{ field_key: "title", locale: "de", value: "Gruppe" }],
      { acceptedChildrenCount: 0, totalActiveChildrenCount: 0 },
    );
    expect(evaluateSectionRenderability("cards_v1", facts).renderable).toBe(true);
  });

  it("cards_v1 mit aktivem Kind falschen Typs ⇒ wrong_child_type", () => {
    const facts = factsFromFieldRows([], {
      acceptedChildrenCount: 0, totalActiveChildrenCount: 2,
    });
    const r = evaluateSectionRenderability("cards_v1", facts);
    expect(r.renderable).toBe(false);
    expect(r.reasonCodes).toContain("wrong_child_type");
  });

  it("download_list_v1 verlangt download_item_v1-Kinder", () => {
    const facts = factsFromFieldRows([], {
      acceptedChildrenCount: 1, totalActiveChildrenCount: 1,
    });
    expect(evaluateSectionRenderability("download_list_v1", facts).renderable).toBe(true);
  });
});

describe("stats_v1 / tabs_v1 — kein Title-Fallback", () => {
  it("stats_v1 nur mit Titel und ohne stat-Kinder ⇒ nicht renderfähig", () => {
    const facts = factsFromFieldRows(
      [{ field_key: "title", locale: "de", value: "X" }],
      { acceptedChildrenCount: 0, totalActiveChildrenCount: 0 },
    );
    const r = evaluateSectionRenderability("stats_v1", facts);
    expect(r.renderable).toBe(false);
    expect(r.reasonCodes).toContain("no_active_children");
  });
  it("stats_v1 mit 1 stat_v1-Kind renderfähig", () => {
    expect(
      evaluateSectionRenderability("stats_v1", factsFromFieldRows([], {
        acceptedChildrenCount: 1, totalActiveChildrenCount: 1,
      })).renderable,
    ).toBe(true);
  });
  it("tabs_v1 ohne tab_v1-Kind ⇒ nicht renderfähig", () => {
    expect(
      evaluateSectionRenderability("tabs_v1", factsFromFieldRows([], {
        acceptedChildrenCount: 0, totalActiveChildrenCount: 0,
      })).renderable,
    ).toBe(false);
  });
});

describe("card_v1 — relaxed anyLocale", () => {
  it("renderfähig ohne title, sobald description gepflegt ist", () => {
    expect(
      evaluateSectionRenderability("card_v1", fieldFacts({ "description@de": "D" })).renderable,
    ).toBe(true);
  });
  it("renderfähig nur mit bullets.0", () => {
    expect(
      evaluateSectionRenderability("card_v1", fieldFacts({ "bullets.0@en": "Punkt" })).renderable,
    ).toBe(true);
  });
  it("renderfähig nur mit link_1_label", () => {
    expect(
      evaluateSectionRenderability("card_v1", fieldFacts({ "link_1_label@de": "Mehr" })).renderable,
    ).toBe(true);
  });
  it("völlig leere Karte ⇒ nicht renderfähig", () => {
    expect(
      evaluateSectionRenderability("card_v1", fieldFacts({})).renderable,
    ).toBe(false);
  });
});

describe("Vertrag / Smoke", () => {
  it("cta_v1 fordert weiterhin title/cta_label/cta_href", () => {
    expect(SECTION_RENDERABILITY.cta_v1.requiredFieldsBilingual).toEqual([
      "title", "cta_label", "cta_href",
    ]);
  });
  it("Unbekannter Typ liefert contractKnown=false / renderable=true", () => {
    const r = evaluateSectionRenderability("nicht_existierend_v1", factsFromFieldRows([]));
    expect(r.contractKnown).toBe(false);
    expect(r.renderable).toBe(true);
  });
});
