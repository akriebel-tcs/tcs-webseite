/**
 * Etappe I.5 — Bild-Upload für CMS-gepflegte Seiten.
 *
 * Schreibwege:
 *   - Datei → Supabase Storage (Bucket `cms-assets`, Policies erlauben anon
 *     in der Prototyp-Phase).
 *   - Metadaten → ausschließlich Whitelist-RPCs:
 *       rpc_admin_upsert_asset, rpc_admin_update_asset_alt,
 *       rpc_admin_delete_asset.
 *
 * Lesepfad (Admin):
 *   - rpc_admin_read_assets(page_key) → liefert alle Assets (aktiv + inaktiv).
 */

const STORAGE_BUCKET = "cms-assets";

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

export type AssetViewport = "mobile" | "tablet" | "desktop";

export interface CmsAssetRow {
  id: string;
  /** Kurze Anzeige-Nummer (A-…) für Redaktion/Prompts. */
  asset_no: number | null;
  page_key: string;
  section_key: string;
  field_key: string | null;
  asset_role: string;
  /** Bildschirmgröße der Variante. */
  viewport: AssetViewport;
  storage_path: string;
  public_url: string | null;
  file_name: string | null;
  mime_type: string | null;
  alt_de: string | null;
  alt_en: string | null;
  is_active: boolean;
  updated_at: string;
}

export async function readAssets(pageKey: string): Promise<CmsAssetRow[]> {
  const supabase = await getClient();
  const { data, error } = await (
    supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{
      data: CmsAssetRow[] | null;
      error: { message: string } | null;
    }>
  )("rpc_admin_read_assets", { p_page_key: pageKey });
  if (error) {
    console.error("[cmsAdminAssets] readAssets error:", error.message);
    return [];
  }
  return data ?? [];
}

/** Erweiterte Asset-Zeile für die Bildredaktion-Workbench: enthält Page- und Section-Kontext. */
export interface CmsAssetOverviewRow extends CmsAssetRow {
  page_title_de: string | null;
  page_title_en: string | null;
  page_status: string | null;
  page_is_active: boolean | null;
  page_route_path: string | null;
  section_type: string | null;
  section_is_active: boolean | null;
}

/**
 * Liest ALLE Assets aus `cms_assets` mitsamt Page- und Section-Kontext.
 * Nur lesend (RPC `rpc_admin_read_assets_overview`). Wird von der zentralen
 * Bildredaktion-Workbench (`AssetWorkbench`) verwendet.
 */
export async function readAssetsOverview(): Promise<CmsAssetOverviewRow[]> {
  const supabase = await getClient();
  const { data, error } = await (
    supabase.rpc as unknown as (fn: string) => Promise<{
      data: CmsAssetOverviewRow[] | null;
      error: { message: string } | null;
    }>
  )("rpc_admin_read_assets_overview");
  if (error) {
    console.error("[cmsAdminAssets] readAssetsOverview error:", error.message);
    return [];
  }
  return data ?? [];
}

export interface UploadAssetParams {
  pageKey: string;
  sectionKey: string;
  fieldKey: string;
  file: File;
  /** Bildschirmgröße der Variante. Standard: 'desktop'. */
  viewport?: AssetViewport;
}

export interface UploadAssetResult {
  success: boolean;
  error?: string;
  asset_id?: string;
  public_url?: string;
}

/**
 * Lädt eine Datei hoch und legt das Asset-Metadatum per RPC an.
 * Vorhandene Assets im selben Slot werden serverseitig deaktiviert.
 */
export async function uploadAsset(params: UploadAssetParams): Promise<UploadAssetResult> {
  const supabase = await getClient();
  const { pageKey, sectionKey, fieldKey, file, viewport = "desktop" } = params;

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${pageKey}/${sectionKey}/${fieldKey}/${viewport}/${Date.now()}-${safeName}`;

  const { error: upErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });
  if (upErr) {
    return { success: false, error: `Upload fehlgeschlagen: ${upErr.message}` };
  }

  const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
  const publicUrl = pub.publicUrl;

  const r = await callRpc("rpc_admin_upsert_asset", {
    p_page_key: pageKey,
    p_section_key: sectionKey,
    p_field_key: fieldKey,
    p_storage_path: storagePath,
    p_public_url: publicUrl,
    p_file_name: file.name,
    p_mime_type: file.type || null,
    p_asset_role: "image",
    p_viewport: viewport,
  });

  if (!r.success) {
    // Best effort: Datei wieder entfernen, damit kein Waisen-Blob bleibt.
    void supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    return { success: false, error: String(r.error ?? "RPC-Fehler") };
  }

  return {
    success: true,
    asset_id: r.asset_id as string,
    public_url: publicUrl,
  };
}

export async function updateAssetAlt(
  assetId: string,
  locale: "de" | "en" | "pl",
  value: string,
): Promise<{ success: boolean; error?: string }> {
  const r = await callRpc("rpc_admin_update_asset_alt", {
    p_asset_id: assetId,
    p_locale: locale,
    p_value: value,
  });
  return { success: Boolean(r.success), error: r.error ? String(r.error) : undefined };
}

export async function deleteAsset(
  assetId: string,
): Promise<{ success: boolean; error?: string }> {
  const r = await callRpc("rpc_admin_delete_asset", { p_asset_id: assetId });
  return { success: Boolean(r.success), error: r.error ? String(r.error) : undefined };
}
