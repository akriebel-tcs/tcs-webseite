import { describe, expect, it, beforeEach } from "vitest";
import {
  personaIdFromPath,
  personaPath,
  personaRoutes,
} from "@/navigation/personaRoutes";
import { applyLegacyPersonaRedirect } from "@/features/personas/legacyRedirect";

describe("Eigene Seitenadressen der Zielgruppen", () => {
  it("hat für jede Zielgruppe eine Adresse mit ihrer Bezeichnung, ohne „personas“", () => {
    expect(personaRoutes.map((p) => p.slug).sort()).toEqual([
      "architekten",
      "bauherren",
      "fachhandel",
      "fachplaner",
      "handwerk",
      "wohnungswirtschaft",
    ]);
    for (const p of personaRoutes) {
      expect(personaPath(p.id)).toBe(`/${p.slug}`);
      expect(p.slug).not.toContain("persona");
    }
  });

  it("erkennt die Zielgruppe an neuer und alter Adresse", () => {
    expect(personaIdFromPath("/handwerk")).toBe("handwerk");
    expect(personaIdFromPath("/wohnungswirtschaft/")).toBe("wohnungswirtschaft");
    expect(personaIdFromPath("/personas/architekt")).toBe("architekten");
    expect(personaIdFromPath("/personas/bauherr")).toBe("bauherren");
    expect(personaIdFromPath("/produkte")).toBeNull();
    expect(personaIdFromPath("/")).toBeNull();
  });

  it("schreibt alte Adressen beim Start auf die neue Adresse um", () => {
    window.history.replaceState({}, "", "/personas/architekt?lang=de#block");
    applyLegacyPersonaRedirect();
    expect(window.location.pathname).toBe("/architekten");
    expect(window.location.search).toBe("?lang=de");
    expect(window.location.hash).toBe("#block");
  });

  it("lässt unbekannte Adressen unverändert", () => {
    window.history.replaceState({}, "", "/personas/quatsch");
    applyLegacyPersonaRedirect();
    expect(window.location.pathname).toBe("/personas/quatsch");
  });
});

beforeEach(() => {
  window.history.replaceState({}, "", "/");
});
