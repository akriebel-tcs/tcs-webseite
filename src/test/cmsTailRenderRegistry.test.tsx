/**
 * Etappe 4B — Integrationstests mit ECHTEN Bausteinen:
 * `CmsRenderRegistryProvider` + `CmsTailCta` + `CmsTailFaq` + `CtaV1` + `FaqV1`.
 *
 * Nur der Renderpfad wird geprüft. Es wird KEINE Datenbank berührt: der
 * gemeinsame Seitenleser (`useCmsPageContent`) ist durch eine Attrappe mit
 * gültigen Daten ersetzt.
 *
 * Hintergrund: Vom Tail erzeugte `CtaV1`/`FaqV1` haben sich früher selbst als
 * INLINE gerendert gemeldet. Beim nächsten Render übersprang der Tail damit
 * seinen eigenen Block — CTA und FAQ verschwanden.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StrictMode, useState } from "react";
import { CmsRenderRegistryProvider } from "@/features/cms/components/CmsRenderRegistry";
import type { CmsPageContent, Viewport } from "@/features/cms/hooks/useCmsPageContent";

const readerState = vi.hoisted(() => ({
  sections: [] as Array<{
    section_key: string;
    sort_order: number;
    section_type: string | null;
    parent_section_key: string | null;
  }>,
  fields: {} as Record<string, string>,
}));

vi.mock("@/features/cms/hooks/useCmsPageContent", () => {
  const make = () => ({
    text: (s: string, f: string, _l: string, fallback = "") =>
      readerState.fields[`${s}|${f}`] ?? fallback,
    textInLocale: (s: string, f: string) => readerState.fields[`${s}|${f}`] ?? "",
    fieldKeys: (s: string) =>
      Object.keys(readerState.fields)
        .filter((k) => k.startsWith(`${s}|`))
        .map((k) => k.split("|")[1])
        .sort(),
    asset: (_s: string, _f: string, fallback = "") => fallback,
    assetSet: () => ({}),
    assetAlt: (_s: string, _f: string, _l: string, fallback = "") => fallback,
    sections: readerState.sections,
    loading: false,
    hasDbContent: true,
    error: null,
  });
  return {
    useCmsPageContent: () => make(),
    normalizeLocale: () => "de",
  };
});

const { default: CmsTailCta } = await import("@/features/cms/components/CmsTailCta");
const { default: CmsTailFaq } = await import("@/features/cms/components/CmsTailFaq");
const { default: CmsTailSections } = await import(
  "@/features/cms/components/CmsTailSections"
);
const { CtaV1 } = await import("@/features/cms/components/sections/CtaV1");
const { FaqV1 } = await import("@/features/cms/components/sections/FaqV1");
const { useCmsPageContent, normalizeLocale } = await import(
  "@/features/cms/hooks/useCmsPageContent"
);

/** Pflichtfelder eines renderbaren CTA-Blocks. */
function seedCta(key: string, title = "Lassen Sie uns Ihr Projekt gemeinsam planen") {
  readerState.fields[`${key}|title`] = title;
  readerState.fields[`${key}|cta_label`] = "Projektberatung vereinbaren";
  readerState.fields[`${key}|cta_href`] = "/kontakt";
}

/** Pflichtfelder eines renderbaren FAQ-Blocks. */
function seedFaq(key: string) {
  readerState.fields[`${key}|items`] = "eins";
  readerState.fields[`${key}|items.eins.question`] = "Wie lange dauert die Planung?";
  readerState.fields[`${key}|items.eins.answer`] = "In der Regel zwei Wochen.";
}

function section(
  section_key: string,
  section_type: string,
  sort_order: number,
  parent_section_key: string | null = null,
) {
  return { section_key, section_type, sort_order, parent_section_key };
}

type InlineKind = "cta" | "faq" | "cta-empty";

/**
 * Seiten-Gerüst wie in `PageLayout`: Provider oben, Tail-Renderer am Ende.
 * `tail="combined"` benutzt den gemeinsamen Renderer `CmsTailSections`
 * (der Pfad, den `PageLayout` real verwendet), `tail="split"` die beiden
 * Einzel-Renderer. `inlineCount` erlaubt zwei Besitzer desselben Schlüssels.
 */
function Page({
  inline,
  inlineCount = 1,
  tail = "split",
  pageKey = "anwendungen.pflege",
}: {
  inline?: InlineKind;
  inlineCount?: number;
  tail?: "split" | "combined";
  pageKey?: string;
}) {
  return (
    <CmsRenderRegistryProvider>
      <main>
        {inline
          ? Array.from({ length: inlineCount }, (_, i) => (
              <InlineBlock key={`inline-${i}`} kind={inline} pageKey={pageKey} />
            ))
          : null}
        {tail === "combined" ? (
          <CmsTailSections pageKey={pageKey} />
        ) : (
          <>
            <CmsTailFaq pageKey={pageKey} />
            <CmsTailCta pageKey={pageKey} />
          </>
        )}
      </main>
    </CmsRenderRegistryProvider>
  );
}

function InlineBlock({ kind, pageKey }: { kind: InlineKind; pageKey: string }) {
  const cms = useCmsPageContent(pageKey) as CmsPageContent;
  const locale = normalizeLocale("de");
  if (kind === "faq") {
    return (
      <FaqV1
        pageKey={pageKey}
        cms={cms}
        locale={locale}
        sectionKey="standard_faq"
        children={[]}
      />
    );
  }
  // "cta-empty": derselbe Section-Key, aber ohne Pflichtfelder ⇒ rendert null
  // und darf kein Phantom-Veto beim Tail auslösen.
  return (
    <CtaV1
      pageKey={pageKey}
      cms={cms}
      locale={locale}
      sectionKey={kind === "cta" ? "standard_cta" : "leerer_cta"}
      children={[]}
    />
  );
}

function InlineState({ kind, pageKey }: { kind: "cta" | "faq"; pageKey: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <section>
      <button type="button" onClick={() => setVisible((current) => !current)}>
        Inline {visible ? "aus" : "an"}
      </button>
      {visible ? <InlineBlock kind={kind} pageKey={pageKey} /> : null}
    </section>
  );
}

function SubtreePage({
  kind,
  tail,
}: {
  kind: "cta" | "faq";
  tail: "cta" | "faq" | "combined";
}) {
  const pageKey = "anwendungen.pflege";
  return (
    <CmsRenderRegistryProvider>
      <main>
        <InlineState kind={kind} pageKey={pageKey} />
        {tail === "cta" ? <CmsTailCta pageKey={pageKey} /> : null}
        {tail === "faq" ? <CmsTailFaq pageKey={pageKey} /> : null}
        {tail === "combined" ? <CmsTailSections pageKey={pageKey} /> : null}
      </main>
    </CmsRenderRegistryProvider>
  );
}

const CTA_TITLE = "Lassen Sie uns Ihr Projekt gemeinsam planen";
const CTA_LINK = "Projektberatung vereinbaren";
const FAQ_QUESTION = "Wie lange dauert die Planung?";

// React-Warnungen (setState während eines fremden Renders, Update ohne act,
// Endlosschleife) sollen in KEINEM dieser Tests auftreten.
let errorSpy: ReturnType<typeof vi.spyOn>;
let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  readerState.sections = [];
  for (const k of Object.keys(readerState.fields)) delete readerState.fields[k];
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
});

/** Bekanntes Testumgebungs-Rauschen ohne Bezug zum Register. */
const IGNORED_LOG = /react-i18next/;

function unexpected(spy: ReturnType<typeof vi.spyOn>): string[] {
  return spy.mock.calls
    .map((args) => args.map((a) => String(a)).join(" "))
    .filter((line) => !IGNORED_LOG.test(line));
}

afterEach(() => {
  // Erst aufräumen (sonst bleibt bei einer fehlgeschlagenen Erwartung DOM
  // aus diesem Test stehen und verfälscht den nächsten), dann prüfen.
  cleanup();
  const errors = unexpected(errorSpy);
  const warns = unexpected(warnSpy);
  errorSpy.mockRestore();
  warnSpy.mockRestore();
  expect(errors).toEqual([]);
  expect(warns).toEqual([]);
});

describe("Tail-Ausgabe bleibt über mehrere Renders erhalten", () => {
  it.each([
    ["einzelner CTA-Renderer", "cta", "cta", CTA_TITLE],
    ["einzelner FAQ-Renderer", "faq", "faq", FAQ_QUESTION],
    ["gemeinsamer Renderer mit CTA", "cta", "combined", CTA_TITLE],
    ["gemeinsamer Renderer mit FAQ", "faq", "combined", FAQ_QUESTION],
  ] as const)(
    "Teilbaum-Update 0→1→0: %s bleibt nach jedem Klick genau einmal sichtbar",
    (_name, kind, tail, visibleText) => {
      readerState.sections = [
        section("standard_faq", "faq_v1", 50),
        section("standard_cta", "cta_v1", 60),
      ];
      seedCta("standard_cta");
      seedFaq("standard_faq");

      render(<SubtreePage kind={kind} tail={tail} />);
      expect(screen.getAllByText(visibleText)).toHaveLength(1);

      fireEvent.click(screen.getByRole("button", { name: "Inline an" }));
      expect(screen.getAllByText(visibleText)).toHaveLength(1);

      fireEvent.click(screen.getByRole("button", { name: "Inline aus" }));
      expect(screen.getAllByText(visibleText)).toHaveLength(1);
    },
  );

  it("CTA und FAQ bleiben nach mehrfachem Re-Render je genau einmal vorhanden", () => {
    readerState.sections = [section("standard_faq", "faq_v1", 50), section("standard_cta", "cta_v1", 60)];
    seedCta("standard_cta");
    seedFaq("standard_faq");

    const { rerender } = render(<Page />);
    expect(screen.getAllByText(CTA_TITLE)).toHaveLength(1);
    expect(screen.getAllByText(CTA_LINK)).toHaveLength(1);
    expect(screen.getAllByText(FAQ_QUESTION)).toHaveLength(1);

    for (let i = 0; i < 3; i += 1) {
      rerender(<Page />);
      expect(screen.getAllByText(CTA_TITLE)).toHaveLength(1);
      expect(screen.getAllByText(CTA_LINK)).toHaveLength(1);
      expect(screen.getAllByText(FAQ_QUESTION)).toHaveLength(1);
    }
  });

  it("Inline-CTA verhindert weiterhin die Tail-Dopplung", () => {
    readerState.sections = [section("standard_cta", "cta_v1", 60)];
    seedCta("standard_cta");

    const { rerender } = render(<Page inline="cta" />);
    expect(screen.getAllByText(CTA_TITLE)).toHaveLength(1);
    rerender(<Page inline="cta" />);
    expect(screen.getAllByText(CTA_TITLE)).toHaveLength(1);
  });

  it("Inline-FAQ verhindert weiterhin die Tail-Dopplung", () => {
    readerState.sections = [section("standard_faq", "faq_v1", 50)];
    seedFaq("standard_faq");

    const { rerender } = render(<Page inline="faq" />);
    expect(screen.getAllByText(FAQ_QUESTION)).toHaveLength(1);
    rerender(<Page inline="faq" />);
    expect(screen.getAllByText(FAQ_QUESTION)).toHaveLength(1);
  });

  it("nicht vorhandene Section bleibt weg", () => {
    readerState.sections = [];
    seedCta("standard_cta");
    render(<Page />);
    expect(screen.queryByText(CTA_TITLE)).toBeNull();
  });

  it("Section ohne Pflichttexte rendert nichts", () => {
    readerState.sections = [section("standard_cta", "cta_v1", 60)];
    render(<Page />);
    expect(screen.queryByText(CTA_TITLE)).toBeNull();
  });

  it("Kind-Section wird nicht als eigener Tail-Block ausgespielt", () => {
    readerState.sections = [
      section("wrapper", "content_v1", 10),
      section("standard_cta", "cta_v1", 60, "wrapper"),
    ];
    seedCta("standard_cta");
    render(<Page />);
    expect(screen.queryByText(CTA_TITLE)).toBeNull();
  });

  it("leerer Inline-Render erzeugt kein Phantom-Veto für den Tail", () => {
    readerState.sections = [section("leerer_cta", "cta_v1", 60)];
    // Der Inline-Block trägt denselben Key, hat aber keine Pflichtfelder.
    seedCta("leerer_cta", "");
    readerState.fields["leerer_cta|title"] = "";

    const { rerender } = render(<Page inline="cta-empty" />);
    // Nichts renderbar, aber der Schlüssel darf auch nicht als „inline
    // vorhanden" gemeldet werden: sobald der Titel kommt, spielt der Tail aus.
    readerState.fields["leerer_cta|title"] = CTA_TITLE;
    rerender(<Page inline="cta-empty" />);
    expect(screen.getAllByText(CTA_TITLE).length).toBeGreaterThanOrEqual(1);
    // Der Inline-Block meldet sich jetzt (mit Inhalt) an — keine Dopplung.
    rerender(<Page inline="cta-empty" />);
    expect(screen.getAllByText(CTA_TITLE)).toHaveLength(1);
  });

  // Etappe 4C: EIN einziger erneuter Render ohne Inline-Ausgabe genügt.
  // Kein zweiter manueller Render, kein Zufallsrender von außen.
  it("Inline verschwindet: der Tail zieht nach EINEM Render automatisch nach (CTA)", () => {
    readerState.sections = [section("standard_cta", "cta_v1", 60)];
    seedCta("standard_cta");

    const { rerender } = render(<Page inline="cta" />);
    expect(screen.getAllByText(CTA_TITLE)).toHaveLength(1);
    rerender(<Page />);
    expect(screen.getAllByText(CTA_TITLE)).toHaveLength(1);
  });

  it("Inline verschwindet: der Tail zieht nach EINEM Render automatisch nach (FAQ)", () => {
    readerState.sections = [section("standard_faq", "faq_v1", 50)];
    seedFaq("standard_faq");

    const { rerender } = render(<Page inline="faq" />);
    expect(screen.getAllByText(FAQ_QUESTION)).toHaveLength(1);
    rerender(<Page />);
    expect(screen.getAllByText(FAQ_QUESTION)).toHaveLength(1);
  });

  it("gemeinsamer Renderer CmsTailSections zieht nach EINEM Render nach", () => {
    readerState.sections = [
      section("standard_faq", "faq_v1", 50),
      section("standard_cta", "cta_v1", 60),
    ];
    seedCta("standard_cta");
    seedFaq("standard_faq");

    const { rerender } = render(<Page inline="cta" tail="combined" />);
    expect(screen.getAllByText(CTA_TITLE)).toHaveLength(1);
    expect(screen.getAllByText(FAQ_QUESTION)).toHaveLength(1);
    rerender(<Page tail="combined" />);
    expect(screen.getAllByText(CTA_TITLE)).toHaveLength(1);
    expect(screen.getAllByText(FAQ_QUESTION)).toHaveLength(1);
  });

  it("Unmount der ganzen Seite hinterlässt keinen Eintrag für die nächste Seite", () => {
    readerState.sections = [section("standard_cta", "cta_v1", 60)];
    seedCta("standard_cta");

    const first = render(<Page inline="cta" tail="combined" />);
    expect(screen.getAllByText(CTA_TITLE)).toHaveLength(1);
    first.unmount();

    // Nächste Seite mit demselben Section-Key, jetzt ohne Inline-Ausgabe:
    // der Tail spielt sofort aus.
    render(<Page tail="combined" />);
    expect(screen.getAllByText(CTA_TITLE)).toHaveLength(1);
  });

  it("Inline wechselt leer → voll → leer, ohne Verlust und ohne Dopplung", () => {
    readerState.sections = [section("standard_cta", "cta_v1", 60)];
    seedCta("standard_cta");
    // Ohne Linktext ist der Block nicht anzeigbar — weder inline noch im Tail.
    readerState.fields["standard_cta|cta_label"] = "";

    const { rerender } = render(<Page inline="cta" tail="combined" />);
    expect(screen.queryByText(CTA_TITLE)).toBeNull();

    // leer → voll: die Inline-Ausgabe übernimmt, genau einmal.
    readerState.fields["standard_cta|cta_label"] = CTA_LINK;
    rerender(<Page inline="cta" tail="combined" />);
    expect(screen.getAllByText(CTA_TITLE)).toHaveLength(1);
    expect(screen.getAllByText(CTA_LINK)).toHaveLength(1);

    // voll → leer: kein Geist-Eintrag bleibt zurück.
    readerState.fields["standard_cta|cta_label"] = "";
    rerender(<Page inline="cta" tail="combined" />);
    expect(screen.queryByText(CTA_TITLE)).toBeNull();

    // und wieder voll: weiterhin genau einmal.
    readerState.fields["standard_cta|cta_label"] = CTA_LINK;
    rerender(<Page inline="cta" tail="combined" />);
    expect(screen.getAllByText(CTA_TITLE)).toHaveLength(1);
  });

  it("zwei Besitzer desselben Schlüssels: Aufräumen des einen löscht den anderen nicht", () => {
    readerState.sections = [section("standard_cta", "cta_v1", 60)];
    seedCta("standard_cta");

    // Zwei Inline-Ausgaben mit demselben Section-Key.
    const { rerender } = render(<Page inline="cta" inlineCount={2} tail="combined" />);
    expect(screen.getAllByText(CTA_TITLE)).toHaveLength(2);

    // Einer verschwindet: der andere hält den Eintrag, der Tail bleibt still.
    rerender(<Page inline="cta" inlineCount={1} tail="combined" />);
    expect(screen.getAllByText(CTA_TITLE)).toHaveLength(1);

    // Auch der zweite verschwindet: jetzt übernimmt der Tail — genau einmal.
    rerender(<Page tail="combined" />);
    expect(screen.getAllByText(CTA_TITLE)).toHaveLength(1);
  });

  it("StrictMode: Doppelaufrufe erzeugen weder Dopplung noch Verlust", () => {
    readerState.sections = [
      section("standard_faq", "faq_v1", 50),
      section("standard_cta", "cta_v1", 60),
    ];
    seedCta("standard_cta");
    seedFaq("standard_faq");

    const { rerender } = render(
      <StrictMode>
        <Page inline="cta" tail="combined" />
      </StrictMode>,
    );
    expect(screen.getAllByText(CTA_TITLE)).toHaveLength(1);
    expect(screen.getAllByText(FAQ_QUESTION)).toHaveLength(1);

    rerender(
      <StrictMode>
        <Page tail="combined" />
      </StrictMode>,
    );
    expect(screen.getAllByText(CTA_TITLE)).toHaveLength(1);
    expect(screen.getAllByText(FAQ_QUESTION)).toHaveLength(1);
  });


  it("mehrere CTA-Blöcke bleiben in Ordnungsreihenfolge je einmal erhalten", () => {
    readerState.sections = [section("broschure_kita", "cta_v1", 50), section("standard_cta", "cta_v1", 60)];
    seedCta("broschure_kita", "Broschüre Kita");
    seedCta("standard_cta");

    const { rerender } = render(<Page />);
    rerender(<Page />);
    expect(screen.getAllByText("Broschüre Kita")).toHaveLength(1);
    expect(screen.getAllByText(CTA_TITLE)).toHaveLength(1);
  });
});
