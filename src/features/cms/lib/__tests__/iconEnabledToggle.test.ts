/**
 * icon_enabled-Toggle-Parität für ALLE Karten-Container.
 *
 * Stellt sicher: `icon_enabled` schaltet das Icon in jeder Karten-Variante
 * (`cards_v1.grid`, `cards_v1.scroller`, `product_scroller_v1`,
 * `card_grid_v1`, `feature_grid_v1`) sofort und identisch ein/aus —
 * unabhängig davon, ob ein Bild/Bildicon zusätzlich vorhanden ist.
 *
 * Regeln (card_v1 als Masterkarte):
 *   - `icon` leer  → Icon aus
 *   - `icon` gesetzt + `icon_enabled` = "1" oder leer → Icon an
 *   - `icon` gesetzt + `icon_enabled` = "0" → Icon aus, Name bleibt erhalten
 *
 * Bricht ein Container die Regel (z. B. Matrix entfernt Icon-Support oder
 * Resolver re-aktiviert die alte „Bild hat Vorrang"-Logik), schlägt der
 * Test rot.
 */
import { describe, it, expect } from "vitest";
import { resolveCardRuntime, type CardVisibilityInput } from "../cardVisibility";

type ContainerCase = {
  label: string;
  parentSectionType: string;
  parentSectionKey: string;
};

const CONTAINERS: ContainerCase[] = [
  { label: "cards_v1.grid", parentSectionType: "cards_v1", parentSectionKey: "features" },
  { label: "cards_v1.scroller", parentSectionType: "cards_v1", parentSectionKey: "products" },
  { label: "product_scroller_v1", parentSectionType: "product_scroller_v1", parentSectionKey: "products" },
  { label: "card_grid_v1", parentSectionType: "card_grid_v1", parentSectionKey: "produkte" },
  { label: "feature_grid_v1", parentSectionType: "feature_grid_v1", parentSectionKey: "features" },
];

function makeInput(
  fields: Record<string, string>,
  overrides: Partial<CardVisibilityInput> = {},
): CardVisibilityInput {
  return {
    valueFor: (key) => fields[key] ?? null,
    hasImage: false,
    hasThumbnail: false,
    hasIconImage: false,
    parentSectionType: null,
    parentSectionKey: null,
    ...overrides,
  };
}

describe("icon_enabled-Toggle: Parität über alle Karten-Container", () => {
  for (const c of CONTAINERS) {
    describe(c.label, () => {
      const base = {
        parentSectionType: c.parentSectionType,
        parentSectionKey: c.parentSectionKey,
      } as const;

      it("icon_enabled='1' → Icon sichtbar (ohne Bild)", () => {
        const rt = resolveCardRuntime(
          makeInput({ icon: "shield-check", icon_enabled: "1" }, base),
        );
        expect(rt.iconVisible, "iconVisible").toBe(true);
        expect(rt.iconName).toBe("shield-check");
        expect(rt.icon.status).toBe("active");
      });

      it("icon_enabled='0' → Icon aus, Name bleibt erhalten", () => {
        const rt = resolveCardRuntime(
          makeInput({ icon: "shield-check", icon_enabled: "0" }, base),
        );
        expect(rt.iconVisible, "iconVisible").toBe(false);
        expect(rt.iconName).toBe("shield-check");
        expect(rt.icon.status).toBe("disabled");
      });

      it("icon_enabled leer + Name gesetzt → Icon sichtbar (Back-Compat)", () => {
        const rt = resolveCardRuntime(
          makeInput({ icon: "shield-check" }, base),
        );
        expect(rt.iconVisible).toBe(true);
        expect(rt.icon.status).toBe("active");
      });

      it("icon leer → Icon aus, egal welcher Schalterwert", () => {
        const rt = resolveCardRuntime(
          makeInput({ icon: "", icon_enabled: "1" }, base),
        );
        expect(rt.iconVisible).toBe(false);
        expect(rt.icon.status).toBe("empty");
      });

      it("Icon koexistiert mit Bild — Toggle entscheidet, nicht das Bild", () => {
        const on = resolveCardRuntime(
          makeInput(
            { icon: "shield-check", icon_enabled: "1" },
            { ...base, hasImage: true },
          ),
        );
        expect(on.iconVisible, "Icon an trotz Bild").toBe(true);

        const off = resolveCardRuntime(
          makeInput(
            { icon: "shield-check", icon_enabled: "0" },
            { ...base, hasImage: true },
          ),
        );
        expect(off.iconVisible, "Icon aus trotz Bild").toBe(false);
      });

      it("Toggle 1 → 0 → 1 spiegelt sich sofort wider (kein Caching)", () => {
        const on1 = resolveCardRuntime(
          makeInput({ icon: "shield-check", icon_enabled: "1" }, base),
        );
        const off = resolveCardRuntime(
          makeInput({ icon: "shield-check", icon_enabled: "0" }, base),
        );
        const on2 = resolveCardRuntime(
          makeInput({ icon: "shield-check", icon_enabled: "1" }, base),
        );
        expect([on1.iconVisible, off.iconVisible, on2.iconVisible]).toEqual([
          true,
          false,
          true,
        ]);
      });
    });
  }

  it("Matrix-Wahrheit: alle 5 Karten-Container unterstützen das Icon-Modul", async () => {
    const { containerSupportFor } = await import("../cardRuntimeMatrix");
    for (const c of CONTAINERS) {
      const sup = containerSupportFor(c.parentSectionType, c.parentSectionKey);
      expect(sup.supports.icon, `${c.label} muss Icon unterstützen`).toBe(true);
    }
  });
});
