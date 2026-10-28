import { describe, expect, it } from "vitest";
import {
  datasheetDocumentTitle,
  readContractFileName,
  sanitizeFileStem,
} from "@/features/service/catalog/components/datasheetFileName";

describe("Dateiname-Vorschlag des Datenblatts", () => {
  it("liest branding.file_name aus dem Vertrag", () => {
    expect(
      readContractFileName({
        branding: { file_name: "TCS-Datenblatt-IVW6511-0145-de.pdf" },
      }),
    ).toBe("TCS-Datenblatt-IVW6511-0145-de.pdf");
  });

  it("meldet fehlenden oder leeren Wert als null", () => {
    expect(readContractFileName({ branding: { file_name: "  " } })).toBeNull();
    expect(readContractFileName({})).toBeNull();
    expect(readContractFileName(null)).toBeNull();
  });

  it("nimmt den Vertragsnamen ohne Endung als Dokumenttitel", () => {
    expect(
      datasheetDocumentTitle({
        contractFileName: "TCS-Datenblatt-IVW6511-0145-de.pdf",
        documentType: "Datenblatt",
        artikelNr: "IVW6511-0145",
        locale: "de",
        companyName: "TCS TürControlSysteme AG",
      }),
    ).toBe("TCS-Datenblatt-IVW6511-0145-de");
  });

  it("bildet den Namen sonst aus Markenpräfix, Artikelnummer und Sprache", () => {
    expect(
      datasheetDocumentTitle({
        contractFileName: null,
        documentType: "Datenblatt",
        artikelNr: "ISW6010-0145",
        locale: "de",
        companyName: "TCS TürControlSysteme AG",
      }),
    ).toBe("TCS-Datenblatt-ISW6010-0145-de");
  });

  it("nutzt das Markenpräfix des jeweiligen Ausgabekanals und die Sprache", () => {
    expect(
      datasheetDocumentTitle({
        documentType: "Datablad",
        artikelNr: "ASA110101-0010",
        locale: "da",
        companyName: "Scantron A/S",
      }),
    ).toBe("Scantron-Datablad-ASA110101-0010-da");
  });

  it("bleibt ohne Firmennamen nutzbar", () => {
    expect(
      datasheetDocumentTitle({
        documentType: "Technický list",
        artikelNr: "ISW6010-0145",
        locale: "cs",
      }),
    ).toBe("Technicky-list-ISW6010-0145-cs");
  });

  it("macht Dateinamen dateisystemsicher", () => {
    expect(sanitizeFileStem("TCS Datenblatt/Ü.pdf")).toBe("TCS-Datenblatt-U");
  });
});
