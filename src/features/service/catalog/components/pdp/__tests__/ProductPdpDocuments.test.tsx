import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProductPdpDocuments from "../ProductPdpDocuments";
import { isPdfDocument } from "../documentKind";
import type { DocumentGroup } from "../types";

const groups: DocumentGroup[] = [
  {
    key: "manual",
    label: "Bedienungsanleitung",
    items: [
      {
        key: "d1",
        label: "Anleitung ISW6031",
        url: "https://example.com/files/anleitung.pdf",
        category: "manual",
        fileType: "pdf",
      },
      {
        key: "d2",
        label: "Stückliste",
        url: "https://example.com/files/liste.xlsx",
        category: "manual",
        fileType: "xlsx",
      },
      {
        key: "d3",
        label: "Ohne Datei",
        url: null,
        category: "manual",
        fileType: null,
      },
    ],
  },
];

describe("isPdfDocument", () => {
  it("erkennt PDF über file_type und URL-Endung", () => {
    expect(isPdfDocument({ fileType: "pdf", url: null })).toBe(true);
    expect(
      isPdfDocument({ fileType: null, url: "https://x/y.PDF?download=1" }),
    ).toBe(true);
    expect(isPdfDocument({ fileType: "xlsx", url: "https://x/y.xlsx" })).toBe(
      false,
    );
    expect(isPdfDocument({ fileType: null, url: null })).toBe(false);
  });
});

describe("ProductPdpDocuments", () => {
  it("zeigt Vorschau nur bei PDF, Öffnen bei anderen Typen, Download bei beiden", () => {
    render(<ProductPdpDocuments groups={groups} />);
    fireEvent.click(screen.getByText("Bedienungsanleitung"));

    expect(screen.getAllByRole("button", { name: /Vorschau$/ })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: /Öffnen/ })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: /Download/ })).toHaveLength(2);
  });

  it("öffnet die seitliche Vorschau mit Titel und Aktionen", () => {
    render(<ProductPdpDocuments groups={groups} />);
    fireEvent.click(screen.getByText("Bedienungsanleitung"));
    fireEvent.click(screen.getByRole("button", { name: /Vorschau$/ }));

    expect(
      screen.getByRole("link", { name: /In neuem Tab öffnen/ }),
    ).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByTitle("Anleitung ISW6031")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Vorschau schließen/ }),
    ).toBeTruthy();
  });

  it("zeigt Hinweis, wenn keine Dokumente vorhanden sind", () => {
    render(<ProductPdpDocuments groups={[]} />);
    expect(screen.queryByRole("button", { name: /Vorschau$/ })).toBeNull();
  });
});
