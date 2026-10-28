/**
 * Etappe D — `cms-light-navigation-write-1`.
 *
 * Schreibwege ausschließlich über die whitelist-eingeschränkte RPC
 * `rpc_admin_update_navigation_label`. Sie kann nur `label_de` oder
 * `label_en` auf `cms_navigation_nodes` setzen — nichts anderes.
 *
 * Read-Pfad bleibt `cmsAdminNavigation.ts` (RPC `rpc_admin_read_navigation_nodes`).
 *
 * Kein direkter Tabellenschreibzugriff. Kein Update über die JS-SDK
 * .update()-Kette — bewusst nur RPC, damit das Sicherheitsmodell zentral
 * in Postgres bleibt.
 */

export type NavLocale = "de" | "en" | "pl";

export interface UpdateNavigationLabelResult {
  success: boolean;
  updated: boolean;
  error?: string;
  value?: string | null;
}

async function getClient() {
  const mod = await import("@/lib/cmsSupabase/client");
  return mod.getCmsSupabaseClient();
}

/**
 * Setzt label_de oder label_en eines Navigationsknotens.
 * Leerstring/whitespace-only wird auf NULL normalisiert (DB-seitig).
 */
export async function updateNavigationLabel(
  nodeId: string,
  locale: NavLocale,
  value: string,
): Promise<UpdateNavigationLabelResult> {
  try {
    const supabase = await getClient();
    const { data, error } = await (supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>)(
      "rpc_admin_update_navigation_label",
      {
        p_node_id: nodeId,
        p_locale: locale,
        p_value: value,
      },
    );

    if (error) {
      return { success: false, updated: false, error: error.message };
    }
    const obj = (data ?? {}) as Partial<UpdateNavigationLabelResult> & {
      value?: string | null;
    };
    return {
      success: !!obj.success,
      updated: !!obj.updated,
      error: obj.error,
      value: obj.value ?? null,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, updated: false, error: msg };
  }
}

/**
 * Etappe J.2 — Sichtbarkeit eines Navigationsknotens umschalten.
 * Whitelisted RPC `rpc_admin_set_navigation_node_active`.
 */
export async function setNavigationNodeActive(
  nodeId: string,
  isActive: boolean,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getClient();
    const { data, error } = await (supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>)(
      "rpc_admin_set_navigation_node_active",
      { p_node_id: nodeId, p_is_active: isActive },
    );
    if (error) return { success: false, error: error.message };
    const obj = (data ?? {}) as { success?: boolean; error?: string };
    return { success: !!obj.success, error: obj.error };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Etappe 1b — `show_in_public_nav` umschalten.
 * Whitelisted RPC `rpc_admin_set_navigation_node_public`.
 * Unabhängig vom `is_active`-Schalter — steuert nur die Sichtbarkeit
 * in der öffentlichen Navigation (MainNav/Footer/Persona/…).
 */
export async function setNavigationNodePublic(
  nodeId: string,
  show: boolean,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getClient();
    const { data, error } = await (supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>)(
      "rpc_admin_set_navigation_node_public",
      { p_node_id: nodeId, p_show: show },
    );
    if (error) return { success: false, error: error.message };
    const obj = (data ?? {}) as { success?: boolean; error?: string };
    return { success: !!obj.success, error: obj.error };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Untertitel (Beschreibungstext im Dropdown-Menü) eines Navigationsknotens
 * setzen — `description_de` / `description_en`.
 * Whitelisted RPC `rpc_admin_update_navigation_description`.
 */
export async function updateNavigationDescription(
  nodeId: string,
  locale: NavLocale,
  value: string,
): Promise<UpdateNavigationLabelResult> {
  try {
    const supabase = await getClient();
    const { data, error } = await (supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>)(
      "rpc_admin_update_navigation_description",
      { p_node_id: nodeId, p_locale: locale, p_value: value },
    );
    if (error) return { success: false, updated: false, error: error.message };
    const obj = (data ?? {}) as Partial<UpdateNavigationLabelResult>;
    return {
      success: !!obj.success,
      updated: !!obj.updated,
      error: obj.error,
      value: obj.value ?? null,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, updated: false, error: msg };
  }
}
