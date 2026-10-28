/**
 * Regressionstest fuer den Sprachvertrag der Bedienoberflaeche.
 *
 * Regel: Jede oeffentlich angebotene Sprache bringt ihre eigenen
 * Bedien-Texte mit (`common`, `navigation`, `service`). Fehlt ein Paket,
 * faellt die Oberflaeche stumm auf Deutsch zurueck — genau der Fehler,
 * der bei Niederlaendisch sichtbar war („Ich bin", „Mehr erfahren").
 */
import { describe, expect, it } from "vitest";
import i18n, { resources } from "@/i18n";

const PUBLIC_LOCALES = ["de", "en", "pl", "nl"] as const;
const UI_NAMESPACES = ["common", "navigation", "service"] as const;

function keys(obj: unknown, prefix = ""): string[] {
  if (!obj || typeof obj !== "object") return [prefix];
  return Object.entries(obj as Record<string, unknown>)
    .filter(([k]) => !k.startsWith("_"))
    .flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe("Sprachpakete der Bedienoberflaeche", () => {
  it.each(PUBLIC_LOCALES)("%s bringt alle Bedien-Namespaces mit", (loc) => {
    const bundle = (resources as Record<string, Record<string, unknown>>)[loc];
    expect(bundle, `Sprachpaket ${loc} fehlt`).toBeDefined();
    for (const ns of UI_NAMESPACES) {
      expect(bundle[ns], `${loc}/${ns} fehlt`).toBeDefined();
    }
  });

  it("nl deckt dieselben Bedien-Schluessel ab wie pl", () => {
    for (const ns of UI_NAMESPACES) {
      const pl = keys((resources as any).pl[ns]).sort();
      const nl = keys((resources as any).nl[ns]).sort();
      expect(nl, `Abweichung in ${ns}`).toEqual(pl);
    }
  });

  it.each(PUBLIC_LOCALES)(
    "%s liefert Persona-Prompt und Linktext ohne deutschen Rueckfall",
    (loc) => {
      const prompt = i18n.t("meta.personaPrompt", {
        ns: "navigation",
        lng: loc,
        fallbackLng: [],
      });
      const learnMore = i18n.t("ui.learnMore", {
        ns: "common",
        lng: loc,
        fallbackLng: [],
      });
      expect(prompt).toBeTruthy();
      expect(learnMore).toBeTruthy();
      if (loc !== "de") {
        expect(prompt).not.toBe("Ich bin");
        expect(learnMore).not.toBe("Mehr erfahren");
      }
    },
  );

  it("nl nutzt niederlaendische Katalog-Microcopy", () => {
    const opts = { ns: "service", lng: "nl", fallbackLng: [] } as const;
    expect(i18n.t("katalog.pdp.datasheet.print", opts)).toBe("Afdrukken");
    expect(i18n.t("katalog.filters.bool.yes", opts)).toBe("Ja");
    expect(i18n.t("katalog.filters.bool.no", opts)).toBe("Nee");
    expect(i18n.t("katalog.pdp.back", opts)).toBe("Terug naar de catalogus");
  });
});
