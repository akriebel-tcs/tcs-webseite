/**
 * Read-only CMS-Light Admin API.
 *
 * - Nutzt ausschließlich den robusten CMS-Light-Wrapper
 *   `@/lib/cmsSupabase/client` (Env mit Fallback auf das CMS-Light-Projekt
 *   `uvkubrrljyzfvbvejepl`). Kein direkter Import von
 *   `@/integrations/supabase/client`, damit der Admin auch in der
 *   veröffentlichten Preview ohne Build-Env nicht weiß crasht.
 * - Importiert NICHT den externen Produktdatenbank-Client
 *   (`@/lib/supabase/client`).
 * - Nur Lesezugriffe. Keine insert/update/upsert/delete, keine Schreib-RPCs,
 *   keine service_role.
 *
 * Pilot-Drafts werden über die read-only RPC `rpc_admin_read_pilot_pflege()`
 * gelesen. Trotz des historisch entstandenen Namens akzeptiert die RPC seit
 * Etappe `cms-light-admin-second-pilot-page-1` einen optionalen
 * `p_page_key`-Parameter und kann beliebige freigeschaltete CMS-Seiten lesen
 * (z. B. `anwendungen.gesundheitseinrichtungen`, `home`, …). Default ohne
 * Parameter ist weiterhin `anwendungen.pflege`.
 */

export type CmsLocale = "de" | "en" | "pl";

export type CmsPageRow = {
  page_key: string;
  /** Kurze Anzeige-Nummer (P-…) für Redaktion/Prompts. */
  page_no?: number | null;
  route_path: string | null;
  page_type: string | null;
  status: string | null;
  is_active: boolean | null;
};

export type CmsSectionRow = {
  page_key: string;
  section_key: string;
  /** Stabile Block-Kurz-ID (B-…) — wandert nicht beim Umsortieren. */
  section_uid?: number | null;
  /** TOC-Position (#01, #02, …) — folgt sort_order. */
  section_no?: number | null;
  section_type: string | null;
  sort_order?: number | null;
  is_active: boolean | null;
};

export type CmsFieldRow = {
  page_key: string;
  section_key: string;
  field_key: string;
  locale: string;
  value: string | null;
  /** 'geprueft' | 'maschinell' | 'maschinell_veraltet' */
  review_status?: string | null;
};

export type CmsAdminReadResult<T> = {
  data: T;
  error: string | null;
  blocked: boolean;
};

export type PilotBundle = {
  page: CmsPageRow | null;
  sections: CmsSectionRow[];
  fields: CmsFieldRow[];
  source: "rpc" | "none";
  error: string | null;
};

async function getClient() {
  const mod = await import("@/lib/cmsSupabase/client");
  return mod.getCmsSupabaseClient();
}

/**
 * Liest die Pilotseite (Default `anwendungen.pflege`) über die bestehende
 * read-only RPC. Die RPC akzeptiert seit Etappe `cms-light-admin-second-pilot-page-1`
 * einen optionalen `p_page_key`-Parameter, sodass weitere Pilotseiten
 * (z. B. `anwendungen.gesundheitseinrichtungen`) gelesen werden können,
 * ohne neue RPC anzulegen. Reine Lesefunktion, kein Schreibzugriff.
 */
export async function readPilotPflege(pageKey?: string): Promise<PilotBundle> {
  try {
    const supabase = await getClient();
    const { data, error } = await (supabase as unknown as {
      rpc: (
        name: string,
        params?: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    }).rpc(
      "rpc_admin_read_pilot_pflege",
      pageKey ? { p_page_key: pageKey } : {},
    );
    if (error) {
      return { page: null, sections: [], fields: [], source: "none", error: error.message };
    }
    const payload = (data ?? {}) as {
      page?: CmsPageRow | null;
      sections?: CmsSectionRow[];
      fields?: CmsFieldRow[];
    };
    return {
      page: payload.page ?? null,
      sections: Array.isArray(payload.sections) ? payload.sections : [],
      fields: Array.isArray(payload.fields) ? payload.fields : [],
      source: "rpc",
      error: null,
    };
  } catch (e) {
    return {
      page: null,
      sections: [],
      fields: [],
      source: "none",
      error: e instanceof Error ? e.message : "unknown",
    };
  }
}
