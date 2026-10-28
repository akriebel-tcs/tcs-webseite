import { describe, expect, it } from "vitest";
import { groupFilterOptions } from "../columnModel";
import { pickProductLocalized } from "../productLocale";

/**
 * `proposed` und `approved` werden gleich ausgespielt — es gibt kein
 * Freigabe-Gate. Filteroptionen liefert die Produktbasis über
 * `rpc_get_localized_filter_options` bereits übersetzt; für Badges und
 * andere sprachsuffigierte Felder gilt die Kette angefordert → `en` → `de`.
 */

describe("Filter- und Farblabels: kein Freigabe-Gate", () => {
  it("spielt vorgeschlagene PL-Anzeigen der RPC unverändert aus", () => {
    const groups = groupFilterOptions(
      [
        {
          field_key: "montageart",
          field_label: "Montaż",
          option_key: "aufputz",
          option_label: "Natynkowy",
          option_count: 12,
          translation_status: "proposed",
        } as unknown as Record<string, unknown>,
      ],
      "pl",
    );
    expect(groups[0]?.label).toBe("Montaż");
    expect(groups[0]?.options[0]?.label).toBe("Natynkowy");
    expect(groups[0]?.options[0]?.count).toBe(12);
  });

  it("Farbwert: label_pl mit proposed wird ausgespielt, kein approved-Gate", () => {
    const facet = {
      color_key: "weiss",
      label_de: "Weiß",
      label_en: "White",
      label_pl: "Biały",
      translation_status: "proposed",
    };
    expect(pickProductLocalized(facet, "label", "pl")).toBe("Biały");

    const approvedOnly = { ...facet, translation_status: "approved" };
    expect(pickProductLocalized(approvedOnly, "label", "pl")).toBe("Biały");

    const stale = { ...facet, label_pl_status: "stale" };
    expect(pickProductLocalized(stale, "label", "pl")).toBe("White");
  });

  it("sprachneutrales Basisfeld gewinnt nicht gegen die PL-Spalte", () => {
    const row = {
      label: "Aufputz",
      label_de: "Aufputz",
      label_en: "Surface mounted",
      label_pl: "Natynkowy",
    };
    expect(pickProductLocalized(row, "label", "pl")).toBe("Natynkowy");
  });
});
