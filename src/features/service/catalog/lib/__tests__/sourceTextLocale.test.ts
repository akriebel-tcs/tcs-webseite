import { describe, expect, it } from "vitest";

import { pickProductTranslatedOnly } from "../productLocale";

/**
 * Stammdatenfelder (`kurzbeschreibung`, `kurztext`) liefert die Produktbasis
 * unabhängig von der angefragten Sprache deutsch. Unter einem PL-/NL-Label
 * darf dieser deutsche Text nicht erscheinen.
 */
describe("pickProductTranslatedOnly", () => {
  const payload = {
    kurzbeschreibung: "Audio AP Außenstation AD4 Touchscreen waagerecht",
  };

  it("zeigt den deutschen Stammdatentext bei Deutsch", () => {
    expect(pickProductTranslatedOnly(payload, "kurzbeschreibung", "de")).toBe(
      payload.kurzbeschreibung,
    );
  });

  it.each(["pl", "nl", "en"])(
    "unterdrückt den unübersetzten Text bei %s",
    (loc) => {
      expect(
        pickProductTranslatedOnly(payload, "kurzbeschreibung", loc),
      ).toBeNull();
    },
  );

  it("nutzt das sprachsuffigierte Feld, wenn vorhanden", () => {
    expect(
      pickProductTranslatedOnly(
        { ...payload, kurzbeschreibung_nl: "Opbouw-buitenstation AD4" },
        "kurzbeschreibung",
        "nl",
      ),
    ).toBe("Opbouw-buitenstation AD4");
  });

  it("akzeptiert einen passenden Sprachmarker", () => {
    expect(
      pickProductTranslatedOnly(
        { kurzbeschreibung: "Buitenpost", kurzbeschreibung_locale: "nl-NL" },
        "kurzbeschreibung",
        "nl",
      ),
    ).toBe("Buitenpost");
  });
});
