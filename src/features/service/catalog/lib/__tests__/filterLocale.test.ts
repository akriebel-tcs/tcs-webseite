import { describe, expect, it } from "vitest";
import { groupFilterOptions } from "../columnModel";
import { pickProductLocalized } from "../productLocale";

/**
 * Filterbezeichnungen und Auswahlwerte kommen aus
 * `rpc_get_localized_filter_options(p_locale)`. Die Sprachauflösung
 * (angefordert → `en` → `de`) passiert feldweise in der Produktbasis:
 * `option_key` ist der technische Wert, `option_label` die Anzeige.
 * Der Client wählt keine Sprache aus und kennt keine DE/EN-Vorrangregel.
 */

const ROWS_PL = [
  {
    field_key: "montageart",
    field_label: "Montaż",
    option_key: "AP",
    option_label: "Natynkowy",
    option_count: 12,
    sort_order: 1,
    hex_code: null,
    requested_locale: "pl",
    resolved_locale: "pl",
  },
  {
    field_key: "ip_gateway",
    field_label: "IP",
    // Feldweiser Rückfall in der DB: EN-Anzeige bei PL-Anfrage.
    option_key: "false",
    option_label: "No",
    option_count: 34,
    sort_order: 2,
    hex_code: null,
    requested_locale: "pl",
    resolved_locale: "en",
  },
  {
    field_key: "color",
    field_label: "Kolor",
    option_key: "weiss",
    option_label: "biały",
    option_count: 514,
    sort_order: 10,
    hex_code: "#ffffff",
    requested_locale: "pl",
    resolved_locale: "pl",
  },
];

describe("groupFilterOptions – Sprachvertrag der Produktbasis", () => {
  it("übernimmt Feld- und Optionsbezeichnungen unverändert", () => {
    const groups = groupFilterOptions(ROWS_PL, "pl");
    const montage = groups.find((g) => g.field === "montageart")!;
    expect(montage.label).toBe("Montaż");
    expect(montage.options[0].label).toBe("Natynkowy");
    // Technischer Filterwert bleibt unübersetzt.
    expect(montage.options[0].value).toBe("AP");
  });

  it("lässt Zahlen unverändert, übersetzt aber Ja/Nein-Anzeigen", () => {
    const groups = groupFilterOptions(ROWS_PL, "pl");
    const ip = groups.find((g) => g.field === "ip_gateway")!;
    expect(ip.options[0].label).toBe("No");
    expect(ip.options[0].value).toBe("false");
    expect(ip.options[0].count).toBe(34);
  });

  it("übernimmt Farbnamen und Farbwert aus der RPC", () => {
    const groups = groupFilterOptions(ROWS_PL, "pl");
    const color = groups.find((g) => g.field === "color")!;
    expect(color.label).toBe("Kolor");
    expect(color.options[0].label).toBe("biały");
    expect(color.options[0].swatchHex).toBe("#ffffff");
  });

  it("ein einzelner Feld-Rückfall schaltet die Sprache nicht global um", () => {
    const groups = groupFilterOptions(ROWS_PL, "pl");
    const labels = groups.flatMap((g) => g.options.map((o) => o.label));
    expect(labels).toContain("Natynkowy");
    expect(labels).toContain("biały");
  });
});

describe("pickProductLocalized – Sprachmarker", () => {
  it("nimmt den bereits lokalisierten Wert, wenn der Marker passt", () => {
    const badge = { label: "Opbouw", label_de: "Aufputz", label_locale: "nl" };
    expect(pickProductLocalized(badge, "label", "nl")).toBe("Opbouw");
  });

  it("ignoriert einen unsuffigierten Wert mit fremdem Sprachmarker, wenn en existiert", () => {
    const badge = {
      label: "Aufputz",
      label_de: "Aufputz",
      label_en: "Surface-mounted",
      label_locale: "de",
    };
    expect(pickProductLocalized(badge, "label", "pl")).toBe("Surface-mounted");
  });

  it("nimmt Deutsch erst, wenn keine andere Sprache vorliegt", () => {
    const badge = { label_de: "Weiß" };
    expect(pickProductLocalized(badge, "label", "nl")).toBe("Weiß");
  });
});
