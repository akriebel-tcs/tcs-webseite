/**
 * Etappe G — `cms-light-pages-instance-1`.
 *
 * Lesen aller cms_pages-Datensätze inklusive ihrer Navigations-Verwendung,
 * sowie eng begrenztes Upsert (page_key + route_path + page_type) per
 * Whitelist-RPC. status / is_active werden NIE über diese RPC geändert
 * (Insert ist immer 'draft'/false). Damit bleibt die öffentliche Website
 * unverändert.
 */

async function getClient() {
  const mod = await import("@/lib/cmsSupabase/client");
  return mod.getCmsSupabaseClient();
}

export interface PageNavUsage {
  nav_area: string;
  node_key: string;
  is_active: boolean;
}

export interface CmsPageRow {
  id: string;
  page_key: string;
  /** Kurze, fortlaufende Anzeige-Nummer (für Redaktion/Prompts: „Seite 154"). */
  page_no: number | null;
  route_path: string | null;
  page_type: string | null;
  title_de: string | null;
  title_en: string | null;
  status: string;
  is_active: boolean;
  updated_at: string;
  nav_usage: PageNavUsage[];
}

export interface PagesBundle {
  pages: CmsPageRow[];
  source: "rpc";
  error?: string;
}

export async function readPagesWithNav(): Promise<PagesBundle> {
  try {
    const supabase = await getClient();
    const { data, error } = await (supabase.rpc as unknown as (
      fn: string,
    ) => Promise<{ data: unknown; error: { message: string } | null }>)(
      "rpc_admin_read_pages_with_nav",
    );
    if (error) return { pages: [], source: "rpc", error: error.message };
    const pages = Array.isArray(data) ? (data as CmsPageRow[]) : [];
    return { pages, source: "rpc" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { pages: [], source: "rpc", error: msg };
  }
}

export interface UpsertPageResult {
  success: boolean;
  action?: "inserted" | "updated";
  error?: string;
  page_key?: string;
  page_type?: string;
}

export async function upsertPage(
  pageKey: string,
  routePath: string | null,
  pageType: string,
): Promise<UpsertPageResult> {
  try {
    const supabase = await getClient();
    const { data, error } = await (supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>)(
      "rpc_admin_upsert_page",
      {
        p_page_key: pageKey,
        p_route_path: routePath,
        p_page_type: pageType,
      },
    );
    if (error) return { success: false, error: error.message };
    const obj = (data ?? {}) as Partial<UpsertPageResult>;
    return {
      success: !!obj.success,
      action: obj.action,
      error: obj.error,
      page_key: obj.page_key,
      page_type: obj.page_type,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}
