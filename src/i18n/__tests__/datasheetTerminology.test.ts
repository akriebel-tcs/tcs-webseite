/**
 * Terminologie-Wächter für die Datenblatt-Bedienungstexte.
 *
 * Hintergrund: Die niederländischen Werte lagen in CMS-Light fälschlich als
 * „Datasheet …“ vor und überlagerten die korrekten JSON-Werte. Die Datenwerte
 * sind korrigiert; dieser Test hält zumindest die mitgelieferte Wahrheit fest,
 * damit „Datasheet“ nicht erneut als niederländischer Text einwandert.
 */
import { describe, expect, it } from "vitest";
import de from "@/i18n/locales/de/service.json";
import en from "@/i18n/locales/en/service.json";
import nl from "@/i18n/locales/nl/service.json";
import pl from "@/i18n/locales/pl/service.json";

type Ns = { katalog: { pdp: { datasheet: Record<string, unknown> } } };

const pick = (ns: unknown) => (ns as Ns).katalog.pdp.datasheet;

/** Alle Textwerte des Blocks, auch aus Untergruppen (z. B. `brand`). */
const flatValues = (value: unknown): string[] => {
  if (typeof value === "string") return [value];
  if (value && typeof value === "object")
    return Object.values(value as Record<string, unknown>).flatMap(flatValues);
  return [];
};

describe("Datenblatt-Bedienungstexte", () => {
  it("liefert für jede Sprache Titel, Schaltfläche und Hinweis", () => {
    for (const ns of [de, en, nl, pl]) {
      const d = pick(ns);
      for (const key of ["title", "open", "print", "close", "empty", "retry"]) {
        expect(typeof d[key]).toBe("string");
        expect((d[key] as string).trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("verwendet im Niederländischen „Datablad“ und nicht „Datasheet“", () => {
    const d = pick(nl);
    expect(d.title).toBe("Datablad");
    expect(d.open).toBe("Datablad bekijken");
    for (const key of ["title", "open", "empty"]) {
      expect((d[key] as string).toLowerCase()).not.toContain("datasheet");
      expect((d[key] as string).toLowerCase()).not.toContain("datenblatt");
    }
  });

  it("führt keine deutschen Rohtexte in EN/PL/NL", () => {
    for (const ns of [en, nl, pl]) {
      const d = pick(ns);
      for (const value of flatValues(d)) {
        expect(value.toLowerCase()).not.toContain("datenblatt");
        expect(value).not.toContain("Schließen");
      }
    }
  });
});
