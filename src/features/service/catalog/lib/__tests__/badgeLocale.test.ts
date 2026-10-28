import { describe, expect, it } from "vitest";
import { pickProductLocalized } from "../productLocale";

/**
 * Karten-Badges der Kanal-RPC: `label` ist die Anzeige in der angeforderten
 * Sprache, `label_de`/`label_en` sind nur Herkunftsangaben. Ohne ein Feld
 * `label_<angefordert>` darf `label_en`/`label_de` den serverseitig
 * lokalisierten Wert nicht überstimmen.
 */

describe("Badge-Sprachauswahl", () => {
  const badge = {
    key: "ap",
    label: "Natynkowy",
    label_de: "Aufputz",
    label_en: "Surface-mounted",
  };

  it("nimmt bei PL den serverseitig lokalisierten Wert", () => {
    expect(pickProductLocalized(badge, "label", "pl")).toBe("Natynkowy");
  });

  it("nimmt bei NL den serverseitig lokalisierten Wert", () => {
    expect(pickProductLocalized({ ...badge, label: "Opbouw" }, "label", "nl")).toBe(
      "Opbouw",
    );
  });

  it("nutzt bei EN weiterhin das englische Feld", () => {
    expect(pickProductLocalized(badge, "label", "en")).toBe("Surface-mounted");
  });

  it("eine vorhandene PL-Spalte gewinnt gegen das Basisfeld", () => {
    expect(
      pickProductLocalized({ ...badge, label_pl: "Natynkowa" }, "label", "pl"),
    ).toBe("Natynkowa");
  });
});
