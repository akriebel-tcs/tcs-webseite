/**
 * Etappe H — `cms-light-nav-move-1`.
 *
 * Schreibpfad ausschließlich über die whitelist-eingeschränkte RPC
 * `rpc_admin_move_navigation_node`. Sie kann nur `parent_id` und
 * `sort_order` eines Knotens ändern und sequenziert anschließend
 * alle Geschwister im Zielordner neu. Wechsel der `nav_area`,
 * Zyklen oder ungültige Eltern werden serverseitig abgelehnt.
 *
 * Read-Pfad bleibt `cmsAdminNavigation.ts`. Kein direkter
 * Tabellenschreibzugriff. Public-Site bleibt von dieser RPC
 * unberührt — Etappe F (CMS führt Navigation) ist noch nicht aktiv.
 */

async function getClient() {
  const mod = await import("@/lib/cmsSupabase/client");
  return mod.getCmsSupabaseClient();
}

export interface MoveNavigationNodeResult {
  success: boolean;
  error?: string;
  node_id?: string;
  new_parent_id?: string | null;
  new_sort_order?: number;
  nav_area?: string;
}

export async function moveNavigationNode(
  nodeId: string,
  newParentId: string | null,
  newSortOrder: number,
): Promise<MoveNavigationNodeResult> {
  try {
    const supabase = await getClient();
    const { data, error } = await (supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>)(
      "rpc_admin_move_navigation_node",
      {
        p_node_id: nodeId,
        p_new_parent_id: newParentId,
        p_new_sort_order: newSortOrder,
      },
    );

    if (error) {
      return { success: false, error: error.message };
    }
    const obj = (data ?? {}) as Partial<MoveNavigationNodeResult>;
    return {
      success: !!obj.success,
      error: obj.error,
      node_id: obj.node_id,
      new_parent_id: obj.new_parent_id ?? null,
      new_sort_order: obj.new_sort_order,
      nav_area: obj.nav_area,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}
