/**
 * Etappe I.7 — Lebenszyklus für CMS-Seiten:
 *   - duplizieren (Inhalt komplett klonen)
 *   - archivieren / wiederherstellen (Soft-Delete)
 *   - endgültig löschen (Hard-Delete, nur archiviert + ohne Navigationsverweis)
 *
 * Schreibpfad ausschließlich über Whitelist-RPCs.
 */

async function getClient() {
  const mod = await import("@/lib/cmsSupabase/client");
  return mod.getCmsSupabaseClient();
}

type RpcResult = { data: unknown; error: { message: string } | null };

async function callRpc(fn: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const supabase = await getClient();
  const { data, error } = await (
    supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<RpcResult>
  )(fn, args);
  if (error) return { success: false, error: error.message };
  return (data ?? {}) as Record<string, unknown>;
}

export interface DuplicatePageResult {
  success: boolean;
  error?: string;
  new_page_key?: string;
  new_route_path?: string | null;
  sections_copied?: number;
  fields_copied?: number;
  whitelist_copied?: number;
  assets_copied?: number;
  nav_node_id?: string | null;
  nav_node_no?: number | null;
  nav_area?: string | null;
  nav_node_key?: string | null;
  nav_parent_id?: string | null;
}

export interface DuplicatePageNavTarget {
  /** Navigationsbereich, in dem der neue Menüknoten entstehen soll. */
  navArea: "home" | "main" | "meta" | "footer" | "footer_bottom" | "persona";
  /** node_key des Eltern-Knotens (z. B. `zutrittskontrolle`). NULL = Top-Level. */
  parentNodeKey: string | null;
  /** Optional: node_key des neuen Knotens. NULL = aus new_page_key abgeleitet. */
  nodeKey?: string | null;
}

export async function duplicatePage(
  sourcePageKey: string,
  newPageKey: string,
  newRoutePath: string | null,
  navTarget?: DuplicatePageNavTarget | null,
): Promise<DuplicatePageResult> {
  const r = await callRpc("rpc_admin_duplicate_page", {
    p_source_page_key: sourcePageKey,
    p_new_page_key: newPageKey,
    p_new_route_path: newRoutePath,
    p_nav_area: navTarget?.navArea ?? null,
    p_nav_parent_node_key: navTarget?.parentNodeKey ?? null,
    p_nav_node_key: navTarget?.nodeKey ?? null,
  });
  return r as unknown as DuplicatePageResult;
}

export interface SimpleResult {
  success: boolean;
  error?: string;
  [k: string]: unknown;
}

export async function archivePage(pageKey: string): Promise<SimpleResult> {
  return (await callRpc("rpc_admin_archive_page", { p_page_key: pageKey })) as unknown as SimpleResult;
}

export async function restorePage(pageKey: string): Promise<SimpleResult> {
  return (await callRpc("rpc_admin_restore_page", { p_page_key: pageKey })) as unknown as SimpleResult;
}

export async function deletePage(pageKey: string): Promise<SimpleResult> {
  return (await callRpc("rpc_admin_delete_page", { p_page_key: pageKey })) as unknown as SimpleResult;
}

export async function archiveNavigationNode(nodeId: string): Promise<SimpleResult> {
  return (await callRpc("rpc_admin_archive_navigation_node", {
    p_node_id: nodeId,
  })) as unknown as SimpleResult;
}

export async function deleteNavigationNode(nodeId: string): Promise<SimpleResult> {
  return (await callRpc("rpc_admin_delete_navigation_node", {
    p_node_id: nodeId,
  })) as unknown as SimpleResult;
}

export interface CreateNavigationNodeArgs {
  navArea: "home" | "main" | "meta" | "footer" | "footer_bottom" | "persona";
  parentNodeKey: string | null;
  nodeKey: string;
  pageKey: string | null;
  labelDe: string | null;
  labelEn: string | null;
  nodeType?: "page" | "group" | "external_link" | "action";
  externalUrl?: string | null;
  routePath?: string | null;
}

export interface CreateNavigationNodeResult extends SimpleResult {
  id?: string;
  node_no?: number;
  nav_area?: string;
  node_key?: string;
  page_key?: string | null;
}

export async function createNavigationNode(
  args: CreateNavigationNodeArgs,
): Promise<CreateNavigationNodeResult> {
  return (await callRpc("rpc_admin_create_navigation_node", {
    p_nav_area: args.navArea,
    p_parent_node_key: args.parentNodeKey,
    p_node_key: args.nodeKey,
    p_page_key: args.pageKey,
    p_label_de: args.labelDe,
    p_label_en: args.labelEn,
    p_node_type: args.nodeType ?? "page",
    p_external_url: args.externalUrl ?? null,
    p_route_path: args.routePath ?? null,
  })) as unknown as CreateNavigationNodeResult;
}

/**
 * Seitenschlüssel (`page_key`) einer Seite umbenennen.
 *
 * Whitelisted RPC `rpc_admin_rename_page_key`: verschiebt in einem Schritt
 * Blöcke (`cms_sections`), Texte (`cms_section_fields`), Bilder (`cms_assets`),
 * Freigaben (`cms_admin_editable_fields`) und den Navigationsknoten
 * (`cms_navigation_nodes`) auf den neuen Schlüssel. Inhalte, Reihenfolge und
 * Sichtbarkeit bleiben unverändert.
 */
export interface RenamePageKeyResult extends SimpleResult {
  noop?: boolean;
  old_page_key?: string;
  new_page_key?: string;
  updated_counts?: {
    sections: number;
    fields: number;
    assets: number;
    whitelist: number;
    navigation_nodes: number;
  };
}

export async function renamePageKey(
  oldPageKey: string,
  newPageKey: string,
): Promise<RenamePageKeyResult> {
  return (await callRpc("rpc_admin_rename_page_key", {
    p_old_page_key: oldPageKey,
    p_new_page_key: newPageKey,
  })) as unknown as RenamePageKeyResult;
}
