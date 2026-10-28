import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Regressionstest für die host-spezifische Druckansicht des Datenblatt-Fensters:
 * Bedienelemente des Fensters (Schließen-X, Kopfzeile mit Druckknopf,
 * abgedunkelter Hintergrund) dürfen beim Drucken nicht erscheinen. Das
 * Seitenlayout (A4-Seitenboxen, Innenabstände, eine Fußzeile unten auf der
 * letzten Seite) gehört ausschließlich ins gemeinsame Modul.
 */

const css = readFileSync(
  "src/features/service/catalog/components/datasheetPrint.css",
  "utf8",
);

const printBlock = css.slice(css.indexOf("@media print"));

describe("Druck-CSS des Datenblatt-Fensters", () => {
  it("blendet alles im Fenster außer dem Datenblatt aus", () => {
    expect(printBlock).toContain(
      "body.ds-printing [data-ds-print-shell] > *:not([data-ds-print-root])",
    );
  });

  it("blendet den Hintergrund neben dem Fenster aus", () => {
    expect(printBlock).toContain(
      "body.ds-printing > * > *:not(:has([data-ds-print-root])):not([data-ds-print-root])",
    );
  });

  it("hält den Datenblattinhalt selbst druckbar", () => {
    expect(printBlock).toContain("body.ds-printing [data-ds-print-root]");
    expect(printBlock).not.toContain("[data-ds-print-root] {\n    display: none");
  });

  it("verändert die Bildschirmansicht nicht", () => {
    const screenPart = css.slice(0, css.indexOf("@media print"));
    expect(screenPart).not.toContain("display: none");
  });
});

describe("Seitenformat und Footer im Druck", () => {
  it("druckt A4 randlos, damit Browser-Kopf-/Fußzeilen wegbleiben", () => {
    expect(css).toMatch(/@page\s*\{[^}]*size:\s*A4[^}]*margin:\s*0;/);
  });

  it("setzt keine eigenen Seitenränder im Host (die macht die Seiten-Engine)", () => {
    expect(printBlock).not.toMatch(/padding:\s*\d+mm/);
    expect(printBlock).toMatch(/\[data-ds-print-root\][\s\S]*?padding:\s*0 !important/);
  });

  it("baut keine eigene Fußzeilen- oder Seitenkonstruktion nach", () => {
    expect(css).not.toContain("ds-print-page");
    expect(css).not.toContain("ds-page-foot");
    expect(css).not.toContain(".ds-footer");
    expect(css).not.toContain("position: fixed");
  });
});
