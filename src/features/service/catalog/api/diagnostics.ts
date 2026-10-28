/**
 * Read-only Diagnose-Schicht für den Online-Produktkatalog.
 *
 * Etappe `catalog-supabase-readonly-1`: Checks ausschließlich gegen die
 * im Datenvertrag freigegebenen Quellen.
 */

import {
  supabase,
  isSupabaseConfigured,
  getEffectiveProductSupabaseUrl,
} from "@/lib/supabase/client";

export const EXPECTED_SUPABASE_PROJECT_ID = "ncvxzkwazdemivdolpzc" as const;

function getEffectiveSupabaseUrl(): string | null {
  return getEffectiveProductSupabaseUrl() || null;
}

export type CheckStatus = "ok" | "fail" | "skipped";

export interface CheckResult {
  readonly key: string;
  readonly status: CheckStatus;
  readonly message?: string;
}

export interface CatalogDiagnostics {
  readonly supabaseConfigured: boolean;
  readonly supabaseUrlPresent: boolean;
  readonly urlMatchesExpectedProject: boolean | null;
  readonly catalogContextRpc: CheckResult;
  readonly productsCatalogView: CheckResult;
  readonly productsCatalogViewHasRows: boolean | null;
  readonly productFilterOptionsView: CheckResult;
}

function evaluateProjectMatch(): boolean | null {
  const url = getEffectiveSupabaseUrl();
  if (!url) return null;
  return url.includes(EXPECTED_SUPABASE_PROJECT_ID);
}

export async function getCatalogDiagnostics(): Promise<CatalogDiagnostics> {
  const supabaseConfigured = isSupabaseConfigured();
  const supabaseUrlPresent = Boolean(getEffectiveSupabaseUrl());
  const urlMatchesExpectedProject = evaluateProjectMatch();

  if (!supabaseConfigured) {
    const skipped: CheckResult = { key: "skipped", status: "skipped" };
    return {
      supabaseConfigured,
      supabaseUrlPresent,
      urlMatchesExpectedProject,
      catalogContextRpc: { ...skipped, key: "catalogContextRpc" },
      productsCatalogView: { ...skipped, key: "productsCatalogView" },
      productsCatalogViewHasRows: null,
      productFilterOptionsView: {
        ...skipped,
        key: "productFilterOptionsView",
      },
    };
  }

  const catalogContextRpc = await safeCheck("catalogContextRpc", async () => {
    const { error } = await supabase.rpc("rpc_get_catalog_context");
    return error ? { ok: false, message: error.message } : { ok: true };
  });

  let productsCatalogViewHasRows: boolean | null = null;
  const productsCatalogView = await safeCheck(
    "productsCatalogView",
    async () => {
      const { data, error } = await supabase
        .from("api_v1_products_catalog")
        .select("*")
        .range(0, 0);
      if (error) return { ok: false, message: error.message };
      productsCatalogViewHasRows = Array.isArray(data) && data.length > 0;
      return { ok: true };
    },
  );

  // Sprachvertrag der Filter: geprüft wird die RPC, nicht mehr die alte
  // sprachlose View `product_filter_options_view`.
  const productFilterOptionsView = await safeCheck(
    "productFilterOptionsView",
    async () => {
      const { error } = await supabase.rpc("rpc_get_localized_filter_options", {
        p_locale: "de",
      });
      return error ? { ok: false, message: error.message } : { ok: true };
    },
  );


  return {
    supabaseConfigured,
    supabaseUrlPresent,
    urlMatchesExpectedProject,
    catalogContextRpc,
    productsCatalogView,
    productsCatalogViewHasRows,
    productFilterOptionsView,
  };
}

async function safeCheck(
  key: string,
  run: () => Promise<{ ok: boolean; message?: string }>,
): Promise<CheckResult> {
  try {
    const res = await run();
    return res.ok
      ? { key, status: "ok" }
      : { key, status: "fail", message: res.message };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err ?? "error");
    return { key, status: "fail", message };
  }
}
