import { describe, expect, it } from "vitest";

import { flattenPageContent, scalarToText, splitAssetKey, splitI18nKey } from "@/lib/storyblok/flatten";
import { navNodesFromContent, routeFromStory } from "@/lib/storyblok/siteIndex";
import { buildSectionTree } from "@/features/cms/hooks/useCmsPageContent";

import gebaeudekommunikation from "@/test/fixtures/storyblok/gebaeudekommunikation.root.json";
import fritztower from "@/test/fixtures/storyblok/anwendungen.referenzprojekte.fritztower.json";
import snipdooIp from "@/test/fixtures/storyblok/gebaeudekommunikation.snipdoo-ip.json";
import navigation from "@/test/fixtures/storyblok/navigation.json";

type Fixture = { content: Record<string, unknown> };

const field = (rows: ReturnType<typeof flattenPageContent>, section: string, key: string, locale = "de") =>
  rows.fields.find((f) => f.section_key === section && f.field_key === key && f.locale === locale)?.value;

describe("Storyblok -> CMS-Light-Zeilen (flatten)", () => {
  const rows = flattenPageContent((gebaeudekommunikation as Fixture).content);

  it("liefert Sektionen in Body-Reihenfolge mit Typ und Schluessel", () => {
    const top = rows.sections.filter((s) => s.parent_section_id === null);
    expect(top[0]).toMatchObject({ section_key: "hero", section_type: "hero_v1", sort_order: 0 });
    expect(top.map((s) => s.section_key)).toContain("faq");
    const tree = buildSectionTree(rows.sections);
    const cards = tree.filter((s) => s.parent_section_key === "anwendungsumfelder");
    expect(cards.length).toBe(4);
    expect(cards[0].section_type).toBe("card_v1");
  });

  it("flacht Feld-Uebersetzungen zu Zeilen je Sprache ab", () => {
    expect(field(rows, "hero", "headline")).toBeTruthy();
    expect(field(rows, "hero", "subline", "en")).toMatch(/single-family/i);
    expect(field(rows, "hero", "subline", "pl")).toBeTruthy();
    // Nicht uebersetzbare Technikfelder haben keine Fremdsprachen-Zeilen
    expect(rows.fields.filter((f) => f.field_key === "section_bg" && f.locale !== "de")).toHaveLength(0);
  });

  it("macht aus list_item-Bloks wieder bullets.N (+ Schalter) und aus Links Pfade", () => {
    const card = rows.sections.find((s) => s.section_type === "card_v1")!.section_key;
    expect(field(rows, card, "bullets.0")).toBeTruthy();
    expect(field(rows, card, "link_1_href")).toMatch(/^\//);
    expect(field(rows, card, "link_1_enabled")).toBe("1");
    expect(field(rows, card, "link_2_enabled")).toBe("0");
  });

  it("macht aus faq_item-Bloks wieder items.<slug>.frage/antwort", () => {
    const faqFields = rows.fields.filter((f) => f.section_key === "faq" && f.field_key.startsWith("items."));
    expect(faqFields.some((f) => f.field_key.endsWith(".frage"))).toBe(true);
    expect(faqFields.some((f) => f.field_key.endsWith(".antwort") && f.locale === "en")).toBe(true);
  });

  it("liefert Bild-Slots mit Viewport und Alt-Texten", () => {
    const hero = rows.assets.filter((a) => a.section_key === "hero" && a.field_key === "image");
    expect(hero.length).toBeGreaterThan(0);
    expect(hero[0].public_url).toMatch(/^https?:\/\//);
    expect(hero.map((a) => a.viewport)).toContain("desktop");
  });

  it("ueberspringt ausgeblendete Sektionen samt Kindern", () => {
    const content = {
      body: [
        { _uid: "a", component: "content_v1", section_key: "sichtbar", title: "x" },
        {
          _uid: "b",
          component: "cards_v1",
          section_key: "weg",
          hidden: true,
          children: [{ _uid: "c", component: "card_v1", section_key: "kind", title: "y" }],
        },
      ],
    };
    const r = flattenPageContent(content);
    expect(r.sections.map((s) => s.section_key)).toEqual(["sichtbar"]);
    expect(r.fields.find((f) => f.section_key === "kind")).toBeUndefined();
  });

  it("stellt Referenzprojekt-Galerien (img_N) und Listenfelder wieder her", () => {
    const r = flattenPageContent((fritztower as Fixture).content);
    expect(r.assets.filter((a) => /^img_\d$/.test(a.field_key ?? "")).length).toBeGreaterThan(0);
    expect(field(r, "highlights", "items")).toContain("\n");
  });

  it("stellt Rollen-Tabs (tabs.<rolle>.*) und legacy_fields wieder her", () => {
    const r = flattenPageContent((snipdooIp as Fixture).content);
    const tabKeys = r.fields.filter((f) => f.section_key === "role_tabs" && f.field_key.startsWith("tabs.")).map((f) => f.field_key);
    expect(tabKeys.some((k) => /^tabs\.[^.]+\.label$/.test(k))).toBe(true);
    // Alias-Werte aus legacy_fields (z. B. headline neben title) kommen als eigene Zeilen zurueck
    const legacy = r.fields.filter((f) => f.section_key === "role_tabs" && ["eyebrow", "intro", "headline"].includes(f.field_key));
    expect(legacy.length).toBeGreaterThan(0);
  });
});

describe("Hilfsfunktionen", () => {
  it("splitI18nKey / splitAssetKey / scalarToText", () => {
    expect(splitI18nKey("title__i18n__en")).toEqual(["title", "en"]);
    expect(splitI18nKey("title")).toEqual(["title", "de"]);
    expect(splitAssetKey("image_mobile")).toEqual(["image", "mobile"]);
    expect(splitAssetKey("thumbnail")).toEqual(["thumbnail", "desktop"]);
    expect(scalarToText(true)).toBe("1");
    expect(scalarToText({ linktype: "url", url: "/kontakt", cached_url: "/kontakt" })).toBe("/kontakt");
    expect(scalarToText({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Hallo" }] }] })).toBe("Hallo");
  });

  it("routeFromStory: Ordner-Startseiten und home", () => {
    expect(routeFromStory({ full_slug: "home", slug: "home", is_startpage: true })).toBe("/");
    expect(routeFromStory({ full_slug: "anwendungen/", slug: "anwendungen", is_startpage: true })).toBe("/anwendungen");
    expect(routeFromStory({ full_slug: "anwendungen/referenzprojekte/referenzprojekte", slug: "referenzprojekte", is_startpage: true })).toBe(
      "/anwendungen/referenzprojekte",
    );
    expect(routeFromStory({ full_slug: "anwendungen/behoerde", slug: "behoerde", is_startpage: false })).toBe("/anwendungen/behoerde");
  });

  it("navNodesFromContent: Bereiche, Eltern, Sprachen, Ziele", () => {
    const nodes = navNodesFromContent((navigation as Fixture).content as { areas?: Record<string, unknown>[] });
    const areas = new Set(nodes.map((n) => n.nav_area));
    expect(areas).toEqual(new Set(["footer", "footer_bottom", "home", "main", "meta", "persona"]));
    const main = nodes.filter((n) => n.nav_area === "main");
    expect(main.filter((n) => n.parent_node_key === null).length).toBe(7);
    const bauten = main.find((n) => n.node_key === "bauten")!;
    expect(bauten.route_path).toBe("/anwendungen");
    expect(bauten.labels.en).toBe("TCS in buildings");
    expect(main.some((n) => n.parent_node_key === "bauten")).toBe(true);
  });
});
