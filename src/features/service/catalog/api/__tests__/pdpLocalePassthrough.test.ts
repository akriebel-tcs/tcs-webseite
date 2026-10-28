import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Die kanalgebundenen Produktbasis-RPCs müssen den gewählten Sprachcode
 * unverändert erhalten (`nl` bleibt `nl`), und PDP wie Datenblatt müssen
 * denselben aufgelösten Locale verwenden.
 */

const rpc = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
  isSupabaseConfigured: () => true,
}));

import {
  getProductDatasheet,
  getProductPdp,
  loadProductDatasheetLocalized,
  loadProductPdpLocalized,
} from "../pdp";

beforeEach(() => {
  rpc.mockReset();
});

describe("PDP-Kanalvertrag: Sprachdurchgriff", () => {
  it("übergibt nl unverändert als p_locale", async () => {
    rpc.mockResolvedValue({
      data: { ok: true, pdp: { locale: "nl", headline: "Deurstation" } },
      error: null,
    });
    const payload = await getProductPdp("ADA45015-0030", "nl");
    expect(rpc).toHaveBeenCalledWith(
      "rpc_get_channel_product_pdp",
      expect.objectContaining({ p_locale: "nl" }),
    );
    expect(payload?.headline).toBe("Deurstation");
  });

  it("übergibt pl unverändert an das Datenblatt", async () => {
    rpc.mockResolvedValue({
      data: { ok: true, datasheet: { locale: "pl" } },
      error: null,
    });
    await getProductDatasheet("ADA45015-0030", "pl");
    expect(rpc).toHaveBeenCalledWith(
      "rpc_get_channel_product_datasheet",
      expect.objectContaining({ p_locale: "pl" }),
    );
  });

  it("fragt die PDP genau einmal mit der angefragten Sprache ab", async () => {
    rpc.mockResolvedValue({
      data: { ok: true, pdp: { locale: "de", headline: "deutsch" } },
      error: null,
    });
    const res = await loadProductPdpLocalized("ADA45015-0030", "nl-NL");
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(res.attempted).toEqual(["nl"]);
    expect(res.resolvedLocale).toBe("nl");
    expect(res.usedFallback).toBe(false);
  });

  it("fragt das Datenblatt genau einmal ab und stuft nicht auf de herab", async () => {
    rpc.mockResolvedValue({
      data: { ok: true, datasheet: { locale: "de" } },
      error: null,
    });
    const res = await loadProductDatasheetLocalized("nl", "ADA45015-0030");
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(res.attempted).toEqual(["nl"]);
    expect(res.resolvedLocale).toBe("nl");
    expect(res.usedFallback).toBe(false);
  });
});

