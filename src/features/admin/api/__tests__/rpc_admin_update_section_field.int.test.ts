/**
 * Integrationstests für `rpc_admin_update_section_field` (CMS-Light Admin).
 *
 * Diese Tests laufen gegen die echte CMS-Light-Datenbank über den
 * vorhandenen, lazy initialisierten Wrapper `@/lib/cmsSupabase/client`
 * (Fallback auf das Projekt `uvkubrrljyzfvbvejepl`, anon/publishable Key).
 *
 * Geprüfte Garantien (vom Client aus erreichbar):
 *  - Nicht erlaubte Felder lösen `success=false, error='field_not_allowed'`
 *    aus. Die RPC enthält ausschließlich ein UPDATE auf
 *    `cms_section_fields` (kein INSERT/UPSERT) — der negative Pfad führt
 *    weder zu einem neuen Eintrag noch zu einer Statusänderung.
 *  - Nicht erlaubte Locales liefern `locale_not_allowed` ohne Schreibwirkung.
 *  - Whitelisted Felder mit existierender Zeile liefern `success=true`
 *    (idempotenter Self-Save mit dem aktuellen Wert).
 *
 * Anti-Insert-Beweis und der `row_not_found`-Pfad sind über den anon-Key
 * NICHT direkt aus dem Client beobachtbar (RLS auf `cms_section_fields`
 * blockiert SELECTs auf draft-Seiten). Diese beiden Garantien sind
 * deterministisch im begleitenden SQL-Smoketest geprüft:
 *   `supabase/tests/rpc_admin_update_section_field.sql`
 * (Transaktion mit ROLLBACK — keine bleibenden Änderungen).
 */

import { beforeAll, describe, expect, it } from "vitest";

import {
  isCmsSupabaseConfigured,
  getCmsSupabaseClient,
} from "@/lib/cmsSupabase/client";

type RpcResult = {
  success?: boolean;
  updated?: boolean;
  error?: string;
  page_key?: string;
  section_key?: string;
  field_key?: string;
  locale?: string;
};

type PilotBundle = {
  fields?: Array<{
    page_key: string;
    section_key: string;
    field_key: string;
    locale: string;
    value: string | null;
  }>;
};

const FAKE_PAGE_KEY = `__test__.never.exists.${Date.now()}`;
const FAKE_SECTION_KEY = "__test_section__";
const FAKE_FIELD_KEY = "__test_field__";

let supabase: ReturnType<typeof getCmsSupabaseClient>;

async function callRpc(params: {
  page_key: string;
  section_key: string;
  field_key: string;
  locale: string;
  value: string;
}): Promise<RpcResult> {
  const { data, error } = await (
    supabase as unknown as {
      rpc: (
        n: string,
        p: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    }
  ).rpc("rpc_admin_update_section_field", {
    p_page_key: params.page_key,
    p_section_key: params.section_key,
    p_field_key: params.field_key,
    p_locale: params.locale,
    p_value: params.value,
  });
  if (error) {
    throw new Error(`RPC transport error: ${error.message}`);
  }
  return (data ?? {}) as RpcResult;
}

async function readPilot(): Promise<PilotBundle> {
  const { data, error } = await (
    supabase as unknown as {
      rpc: (n: string) => Promise<{ data: unknown; error: { message: string } | null }>;
    }
  ).rpc("rpc_admin_read_pilot_pflege");
  if (error) throw new Error(`read pilot error: ${error.message}`);
  return (data ?? {}) as PilotBundle;
}

describe("rpc_admin_update_section_field", () => {
  beforeAll(() => {
    if (!isCmsSupabaseConfigured()) {
      throw new Error(
        "CMS-Light Supabase nicht erreichbar — Tests können nicht laufen.",
      );
    }
    supabase = getCmsSupabaseClient();
  });

  it("liefert field_not_allowed für eine völlig unbekannte (page_key, section_key, field_key)-Kombination", async () => {
    const res = await callRpc({
      page_key: FAKE_PAGE_KEY,
      section_key: FAKE_SECTION_KEY,
      field_key: FAKE_FIELD_KEY,
      locale: "de",
      value: "should never be written",
    });
    expect(res.success).toBe(false);
    expect(res.updated).toBe(false);
    expect(res.error).toBe("field_not_allowed");
  });

  it("liefert locale_not_allowed für eine ansonsten gültige Kombination mit unzulässiger Locale (z. B. fr)", async () => {
    const res = await callRpc({
      page_key: "anwendungen.pflege",
      section_key: "hero",
      field_key: "headline",
      locale: "fr",
      value: "x",
    });
    expect(res.success).toBe(false);
    expect(res.updated).toBe(false);
    expect(res.error).toBe("locale_not_allowed");
  });

  it("liefert field_not_allowed für eine im Whitelist nicht eingetragene Kombination einer existierenden Pilotseite (kein impliziter Insert über die RPC)", async () => {
    const res = await callRpc({
      page_key: "anwendungen.pflege",
      section_key: "hero",
      field_key: "__not_in_whitelist__",
      locale: "de",
      value: "x",
    });
    expect(res.success).toBe(false);
    expect(res.updated).toBe(false);
    expect(res.error).toBe("field_not_allowed");
  });

  it("erfolgreicher Self-Save: schreibt den aktuellen Wert eines whitelisted Pflege-Feldes auf sich selbst zurück (kein Inhaltsdrift)", async () => {
    const bundle = await readPilot();
    const row = (bundle.fields ?? []).find(
      (r) =>
        r.page_key === "anwendungen.pflege" &&
        r.section_key === "hero" &&
        r.field_key === "headline" &&
        r.locale === "de",
    );
    expect(row, "Pilotfeld hero/headline/de muss in cms_section_fields existieren").toBeTruthy();
    const currentValue = row?.value ?? "";

    const res = await callRpc({
      page_key: "anwendungen.pflege",
      section_key: "hero",
      field_key: "headline",
      locale: "de",
      value: currentValue,
    });
    expect(res.success).toBe(true);
    expect(res.updated).toBe(true);
    expect(res.error ?? null).toBeNull();
    expect(res.page_key).toBe("anwendungen.pflege");
    expect(res.section_key).toBe("hero");
    expect(res.field_key).toBe("headline");
    expect(res.locale).toBe("de");

    // Nach dem Self-Save liefert der Read-Pfad denselben Wert.
    const afterBundle = await readPilot();
    const afterRow = (afterBundle.fields ?? []).find(
      (r) =>
        r.section_key === "hero" &&
        r.field_key === "headline" &&
        r.locale === "de",
    );
    expect(afterRow?.value ?? "").toBe(currentValue);
  });
});
