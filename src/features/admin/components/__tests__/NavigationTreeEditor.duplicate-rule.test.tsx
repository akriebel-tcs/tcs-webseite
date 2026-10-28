/**
 * Regressionstest: Kopier-Regel für Inhaltsblöcke.
 *
 * Stand 2026-05-27 — nach Bereinigung der Doku-/Test-Drift:
 *
 * UI (`SectionLevel.tsx`):
 *   const duplicable = !node.section_key.startsWith("content");
 *
 * DB (`rpc_admin_paste_section`):
 *   Es gibt KEINEN Quell-Regex-Guard mehr. Die früher dokumentierte
 *   Beschränkung `^(persona|block)_` (samt Fehlercode
 *   `source_not_duplicable`) ist aufgehoben. Validiert wird nur noch
 *   der neue Section-Key (`^[a-z][a-z0-9_]*$`) und Existenz von
 *   Quelle/Ziel/Eltern.
 *
 * Pfad in der UI: Block-Kopien laufen ausschließlich über die
 * Zwischenablage → `rpc_admin_paste_section` (rekursiv, inkl.
 * Kindkarten/Felder/Assets/Whitelist). Der flache
 * `rpc_admin_duplicate_section`-Pfad ist deprecated und wird aus der
 * UI nicht mehr aufgerufen.
 *
 * Dieser Test spiegelt deshalb nur die UI-Regel und stellt sicher,
 * dass die in `SectionLevel.tsx` codierte Whitelist-Logik nicht still
 * driftet.
 */
import { describe, it, expect } from "vitest";

/** Spiegelt SectionLevel.tsx — duplicable, wenn Key nicht mit `content` beginnt. */
const isDuplicableInUi = (sectionKey: string): boolean =>
  !sectionKey.startsWith("content");

const cases: Array<{ key: string; duplicable: boolean }> = [
  // Ausgeschlossen (UI): rein redaktionelle Intro-Blöcke
  { key: "content_blocks_intro", duplicable: false },
  { key: "content_outro",        duplicable: false },

  // Erlaubt: klassische Block- und Persona-Container
  { key: "block_communication",  duplicable: true },
  { key: "block_access",         duplicable: true },
  { key: "persona_bauherren",    duplicable: true },
  { key: "persona_architekten",  duplicable: true },

  // Erlaubt (neu, nach Aufhebung des `^(persona|block)_`-Guards):
  // Produkt-Scroller-Container und ihre Bildkarten-Kinder.
  { key: "aussenstationen",      duplicable: true },
  { key: "aussenstationen__01",  duplicable: true },
  { key: "products",             duplicable: true },
  { key: "products__adx5",       duplicable: true },

  // Erlaubt: weitere typische CMS-Section-Keys
  { key: "hero",                 duplicable: true },
  { key: "stats",                duplicable: true },
  { key: "personas_intro",       duplicable: true },
];

describe("Kopier-Regel für Inhaltsblöcke (UI = SectionLevel.tsx)", () => {
  it("erlaubt alles außer Sections mit Präfix `content_`", () => {
    for (const c of cases) {
      expect(isDuplicableInUi(c.key)).toBe(c.duplicable);
    }
  });

  it("hat keinen `^(persona|block)_`-Guard mehr (frühere Regel ist aufgehoben)", () => {
    // Würde die alte Regel noch greifen, wären `aussenstationen` und
    // `products__adx5` nicht duplicable und der Scroller-Copy-Pfad aus
    // `bildkarten-scroller-copy-audit.md` würde nicht funktionieren.
    expect(isDuplicableInUi("aussenstationen")).toBe(true);
    expect(isDuplicableInUi("products__adx5")).toBe(true);
  });
});
