/**
 * Read-only Zugriff auf das CMS-Light Navigationsmodell.
 *
 * Quelle: Supabase RPC `rpc_admin_read_navigation_nodes()` (SECURITY DEFINER).
 * - Liest ausschließlich die Tabelle `cms_navigation_nodes`.
 * - Keine Schreib-RPC, kein Drag & Drop, kein Speichern.
 * - Öffentliche Navigation (MainNavigation, MetaNavigation, Footer)
 *   bleibt unverändert codebasiert.
 */

/**
 * Verwendet den robusten CMS-Light-Wrapper mit Fallback auf das CMS-Light-
 * Projekt `uvkubrrljyzfvbvejepl`. Damit funktioniert die RPC auch dann,
 * wenn `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` im
 * veröffentlichten Build nicht verfügbar sind. Lazy import, um den
 * App-Start nicht an Modul-Initialisierung zu koppeln.
 */
async function getClient() {
  const mod = await import("@/lib/cmsSupabase/client");
  return mod.getCmsSupabaseClient();
}

export type NavArea = "home" | "main" | "meta" | "footer" | "footer_bottom" | "persona";

export interface NavigationNodeRow {
  id: string;
  /** Kurze Anzeige-Nummer (N-…) für Redaktion/Prompts. */
  node_no: number | null;
  nav_area: NavArea;
  node_key: string;
  parent_id: string | null;
  parent_node_key: string | null;
  page_key: string | null;
  label: string | null;
  /** Etappe B: separates DE-Label (Soll-Quelle für CMS-führende Navigation). */
  label_de: string | null;
  /** Etappe B: separates EN-Label. */
  label_en: string | null;
  label_pl?: string | null;
  /** Etappe B: optionaler Beschreibungstext (Mega-Menu-Teaser). */
  description_de: string | null;
  description_en: string | null;
  /** Etappe B: 'page' | 'group' | 'external_link' | 'action'. */
  node_type: string | null;
  /** Etappe B: nur bei node_type = 'external_link'. */
  external_url: string | null;
  route_path: string | null;
  sort_order: number;
  is_active: boolean;
  /**
   * Etappe `cms-light-admin-tree-pilot-node-fix-1`:
   * Steuert, ob ein Knoten in der öffentlichen Navigation (MainNav/Footer)
   * erscheinen darf, sobald die Public-Navigation aus der DB rendert.
   * Aktuell rein dokumentarisch / Admin-Anzeige — Public bleibt codebasiert.
   */
  show_in_public_nav: boolean;
}

export interface NavigationBundle {
  nodes: NavigationNodeRow[];
  source: "rpc";
  error?: string;
}

export async function readNavigationNodes(): Promise<NavigationBundle> {
  try {
    const supabase = await getClient();
    // Function is not in generated types; cast through unknown.
    const { data, error } = await (supabase.rpc as unknown as (
      fn: string,
    ) => Promise<{ data: unknown; error: { message: string } | null }>)(
      "rpc_admin_read_navigation_nodes",
    );
    if (error) {
      return { nodes: [], source: "rpc", error: error.message };
    }
    const nodes = Array.isArray(data) ? (data as NavigationNodeRow[]) : [];
    return { nodes, source: "rpc" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { nodes: [], source: "rpc", error: msg };
  }
}
