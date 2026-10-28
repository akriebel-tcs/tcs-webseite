/**
 * CMS-Light Admin — Freigabeliste der bearbeitbaren Felder
 * (Whitelist `cms_admin_editable_fields`).
 *
 * Etappe `cms-light-admin-editable-fields-toggle-1`.
 *
 * - Lesen: direkter SELECT auf `cms_admin_editable_fields` (RLS erlaubt
 *   öffentliches Lesen, die Tabelle enthält nur Metadaten — keine Inhalte).
 * - Schreiben: ausschließlich über die eng begrenzte RPC
 *   `rpc_admin_set_editable_field_enabled`. Diese ändert nur die Spalte
 *   `is_enabled` einer bereits existierenden Zeile (kein INSERT, kein DELETE,
 *   keine anderen Spalten). Whitelist-Einträge werden hier also nicht
 *   neu angelegt — nur ein-/ausgeschaltet.
 *
 * Sicherheitsstatus: temporärer No-Login-Workspace-Prototyp.
 */

export type EditableFieldRow = {
  id: string;
  page_key: string;
  section_key: string;
  field_key: string;
  locale: string;
  is_enabled: boolean;
  updated_at: string | null;
};

export type EditableFieldsReadResult = {
  rows: EditableFieldRow[];
  error: string | null;
};

export type ToggleEditableFieldResult = {
  success: boolean;
  updated: boolean;
  error: string | null;
};

async function getClient() {
  const mod = await import("@/lib/cmsSupabase/client");
  return mod.getCmsSupabaseClient();
}

export async function readEditableFields(): Promise<EditableFieldsReadResult> {
  try {
    const supabase = await getClient();
    // PostgREST cappt pro Request bei 1000 Zeilen. Die Whitelist hat
    // mittlerweile > 98.000 Einträge — daher seitenweise lesen, bis
    // weniger als die Page-Size zurückkommt. Ohne ausreichend großen
    // Guard würden Seiten am Ende der Sortierung (z. B.
    // `zutrittskontrolle.*`) als „nicht in Whitelist" erscheinen und
    // ihre Felder im Admin gesperrt wirken (Beobachtung Batch nach
    // Freeze: Wechselteaser B-1619/B-1620/B-1622/B-1677).
    const PAGE_SIZE = 1000;
    // Wie viele Seiten gleichzeitig geholt werden. Bei > 115.000
    // Whitelist-Zeilen dauerte das rein sequenzielle Lesen so lange, dass
    // im Editor kurzzeitig alle Felder als „nicht in Whitelist" (gesperrt)
    // erschienen. Mit parallelen Blöcken ist die Liste deutlich schneller
    // vollständig.
    const PARALLEL = 8;
    const rows: EditableFieldRow[] = [];
    type RangeReader = {
      from: (t: string) => {
        select: (cols: string) => {
          order: (
            c: string,
            o?: { ascending: boolean },
          ) => any;
        };
      };
    };
    const readRange = async (
      from: number,
    ): Promise<{ chunk: EditableFieldRow[]; error: string | null }> => {
      const { data, error } = await (supabase as unknown as RangeReader)
        .from("cms_admin_editable_fields")
        .select("id,page_key,section_key,field_key,locale,is_enabled,updated_at")
        .order("page_key", { ascending: true })
        .order("section_key", { ascending: true })
        .order("field_key", { ascending: true })
        .order("locale", { ascending: true })
        .order("id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error) return { chunk: [], error: error.message };
      return { chunk: (Array.isArray(data) ? data : []) as EditableFieldRow[], error: null };
    };

    let offset = 0;
    // Hard-Cap gegen Endlosschleifen: 500 Seiten × 1000 = 500.000 Zeilen.
    for (let guard = 0; guard < 500 / PARALLEL; guard += 1) {
      const results = await Promise.all(
        Array.from({ length: PARALLEL }, (_, i) => readRange(offset + i * PAGE_SIZE)),
      );
      const failed = results.find((r) => r.error);
      if (failed) return { rows: [], error: failed.error };
      let done = false;
      for (const r of results) {
        rows.push(...r.chunk);
        if (r.chunk.length < PAGE_SIZE) done = true;
      }
      if (done) break;
      offset += PARALLEL * PAGE_SIZE;
    }

    // Stabil sortieren clientseitig (page > section > field > locale)
    rows.sort((a, b) =>
      a.page_key.localeCompare(b.page_key) ||
      a.section_key.localeCompare(b.section_key) ||
      a.field_key.localeCompare(b.field_key) ||
      a.locale.localeCompare(b.locale),
    );
    return { rows, error: null };
  } catch (e) {
    return { rows: [], error: e instanceof Error ? e.message : "unknown" };
  }
}

export async function setEditableFieldEnabled(args: {
  pageKey: string;
  sectionKey: string;
  fieldKey: string;
  locale: string;
  isEnabled: boolean;
}): Promise<ToggleEditableFieldResult> {
  // Sprachprüfung liegt beim Server (`cms_locales`) — keine feste Liste im Code.
  if (!args.locale || !args.locale.trim()) {
    return { success: false, updated: false, error: "locale_not_allowed" };
  }
  try {
    const supabase = await getClient();
    const { data, error } = await (supabase as unknown as {
      rpc: (
        n: string,
        p: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    }).rpc("rpc_admin_set_editable_field_enabled", {
      p_page_key: args.pageKey,
      p_section_key: args.sectionKey,
      p_field_key: args.fieldKey,
      p_locale: args.locale,
      p_is_enabled: args.isEnabled,
    });
    if (error) return { success: false, updated: false, error: error.message };
    const payload = (data ?? {}) as { success?: boolean; updated?: boolean; error?: string };
    return {
      success: !!payload.success,
      updated: !!payload.updated,
      error: payload.error ?? null,
    };
  } catch (e) {
    return {
      success: false,
      updated: false,
      error: e instanceof Error ? e.message : "unknown",
    };
  }
}
