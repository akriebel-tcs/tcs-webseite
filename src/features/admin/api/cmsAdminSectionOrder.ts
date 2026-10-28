/**
 * cmsAdminSectionOrder — Reihenfolge & Kopieren von Sections (Inhalts-Blöcken).
 *
 * Schreibweg: ausschließlich whitelisted RPCs:
 *   - rpc_admin_reorder_section       (Pfeile hoch/runter)
 *   - rpc_admin_set_section_position  (Position per Zahl)
 *   - rpc_admin_paste_section         (Rekursives Einfügen aus Zwischenablage:
 *                                      Section + Kindkarten + Felder DE/EN +
 *                                      Assets + Whitelist — die einzige in der
 *                                      UI noch aktive Block-Kopierfunktion.)
 *   - rpc_admin_duplicate_section     (flach, deprecated — siehe
 *                                      `duplicateSection` unten)
 *
 * Stand 2026-05-27: Die früher in einigen RPCs verankerte Beschränkung auf
 * `home.start` ist DB-seitig aufgehoben — Reorder, Set-Position, Set-Parent
 * und Paste arbeiten auf allen CMS-Seiten. Auch der frühere Quell-Regex-
 * Guard `^(persona|block)_` in `rpc_admin_paste_section` existiert nicht
 * mehr; kopierbar ist heute alles, was die UI im Klemmbrett zulässt
 * (siehe `SectionLevel.tsx`, aktuell „alles außer Sections mit Präfix
 * `content_`"). Diese Regel wird in
 * `__tests__/NavigationTreeEditor.duplicate-rule.test.tsx` gespiegelt.
 */
export type ReorderResult = {
  success: boolean;
  noop?: boolean;
  error: string | null;
};

type SbClient = {
  rpc: (
    name: string,
    params: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

async function getClient(): Promise<SbClient> {
  const mod = await import("@/lib/cmsSupabase/client");
  return mod.getCmsSupabaseClient() as unknown as SbClient;
}

export async function reorderSection(args: {
  pageKey: string;
  sectionKey: string;
  direction: "up" | "down";
}): Promise<ReorderResult> {
  try {
    const sb = await getClient();
    const { data, error } = await sb.rpc("rpc_admin_reorder_section", {
      p_page_key: args.pageKey,
      p_section_key: args.sectionKey,
      p_direction: args.direction,
    });
    if (error) return { success: false, error: error.message };
    const payload = (data ?? {}) as { success?: boolean; noop?: boolean; error?: string };
    return {
      success: !!payload.success,
      noop: !!payload.noop,
      error: payload.error ?? null,
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "unknown" };
  }
}

/**
 * Etappe K.3 — komplette Sektions-Reihenfolge in einem Rutsch anwenden.
 *
 * Erwartet die vollständige Reihenfolge einer Geschwister-Ebene und ruft
 * `rpc_admin_set_section_position` sequentiell für jeden Schlüssel auf:
 * Index 0 → Position 0, Index 1 → Position 1, … . Die RPC re-sequenziert bei
 * jedem Aufruf alle anderen aktiven Sections. Da wir aufsteigend einsetzen,
 * bleiben bereits gesetzte Positionen erhalten und am Ende stimmt die
 * gewünschte Reihenfolge.
 *
 * Die RPC sortiert innerhalb derselben Eltern-Ebene und glättet danach die
 * globale Reihenfolge per Tiefensuche. So bleiben Kindkarten direkt bei ihrem
 * Container.
 */
export async function applySectionOrder(args: {
  pageKey: string;
  orderedSectionKeys: string[];
}): Promise<{ success: boolean; error: string | null; failedAt?: string }> {
  for (let i = 0; i < args.orderedSectionKeys.length; i++) {
    const key = args.orderedSectionKeys[i];
    const r = await setSectionPosition({
      pageKey: args.pageKey,
      sectionKey: key,
      position: i,
    });
    if (!r.success) {
      return { success: false, error: r.error, failedAt: key };
    }
  }
  return { success: true, error: null };
}

export async function setSectionPosition(args: {
  pageKey: string;
  sectionKey: string;
  position: number;
}): Promise<ReorderResult> {
  try {
    const sb = await getClient();
    const { data, error } = await sb.rpc("rpc_admin_set_section_position", {
      p_page_key: args.pageKey,
      p_section_key: args.sectionKey,
      p_position: args.position,
    });
    if (error) return { success: false, error: error.message };
    const payload = (data ?? {}) as { success?: boolean; error?: string };
    return { success: !!payload.success, error: payload.error ?? null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "unknown" };
  }
}

/**
 * Etappe J.2 — Block (Section) ein-/ausblenden.
 * Whitelisted RPC `rpc_admin_set_section_active`.
 *
 * Batch 56: Beim Aktivieren prüft die RPC zuerst die Renderfähigkeit
 * (Spiegel zu `src/features/cms/contract/renderability.ts`). Schlägt das
 * fehl, liefert die RPC `error='section_not_renderable'` plus eine
 * Liste fehlender Pflichtfelder pro Sprache.
 */
export interface SetSectionActiveResult extends ReorderResult {
  reason?: "section_not_renderable" | null;
  sectionType?: string | null;
  missing?: Array<{ locale: string; field_keys: string[]; reason: string }>;
}
export async function setSectionActive(args: {
  pageKey: string;
  sectionKey: string;
  isActive: boolean;
}): Promise<SetSectionActiveResult> {
  try {
    const sb = await getClient();
    const { data, error } = await sb.rpc("rpc_admin_set_section_active", {
      p_page_key: args.pageKey,
      p_section_key: args.sectionKey,
      p_is_active: args.isActive,
    });
    if (error) return { success: false, error: error.message };
    const payload = (data ?? {}) as {
      success?: boolean;
      error?: string;
      section_type?: string;
      missing?: Array<{ locale: string; field_keys: string[]; reason: string }>;
    };
    return {
      success: !!payload.success,
      error: payload.error ?? null,
      reason: payload.error === "section_not_renderable" ? "section_not_renderable" : null,
      sectionType: payload.section_type ?? null,
      missing: payload.missing ?? [],
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "unknown" };
  }
}

/**
 * Etappe `cms-light-admin-clipboard-2` — seitenübergreifendes Einfügen
 * eines Inhaltsblocks aus der Zwischenablage.
 *
 * Versucht beim ersten Aufruf den Original-`section_key`. Liefert die DB
 * `target_section_key_exists`, kann der Aufrufer einen neuen Namen vorgeben
 * und erneut aufrufen.
 */
export async function pasteSection(args: {
  sourcePageKey: string;
  sourceSectionKey: string;
  targetPageKey: string;
  targetParentSectionKey: string | null;
  targetPosition: number;
  newSectionKey?: string | null;
}): Promise<{
  success: boolean;
  error: string | null;
  newSectionKey?: string;
  attemptedSectionKey?: string;
  sectionsCopied?: number;
  fieldsCopied?: number;
  assetsCopied?: number;
}> {
  try {
    const sb = await getClient();
    const { data, error } = await sb.rpc("rpc_admin_paste_section", {
      p_source_page_key: args.sourcePageKey,
      p_source_section_key: args.sourceSectionKey,
      p_target_page_key: args.targetPageKey,
      p_target_parent_section_key: args.targetParentSectionKey,
      p_target_position: args.targetPosition,
      p_new_section_key: args.newSectionKey ?? null,
    });
    if (error) return { success: false, error: error.message };
    const payload = (data ?? {}) as {
      success?: boolean;
      error?: string;
      new_section_key?: string;
      attempted_section_key?: string;
      sections_copied?: number;
      fields_copied?: number;
      assets_copied?: number;
    };
    return {
      success: !!payload.success,
      error: payload.error ?? null,
      newSectionKey: payload.new_section_key,
      attemptedSectionKey: payload.attempted_section_key,
      sectionsCopied: payload.sections_copied,
      fieldsCopied: payload.fields_copied,
      assetsCopied: payload.assets_copied,
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "unknown" };
  }
}

/**
 * @deprecated Flacher Direkt-Duplikat-Pfad — NICHT mehr aus der Admin-UI
 * aufrufen. Bei Container-Blöcken (z. B. `card_grid_v1`) erzeugt diese RPC
 * leere Hüllen ohne Kindkarten. Stattdessen immer den Zwischenablage-Pfad
 * `pasteSection` (→ `rpc_admin_paste_section`) verwenden, der rekursiv kopiert
 * (Section + Kindkarten + Felder DE/EN + Assets + Whitelist).
 *
 * Bleibt nur als Export bestehen, weil bestehende Tests die Funktionssignatur
 * spiegeln. In neuen UI-Pfaden ist `pasteSection` Pflicht.
 */
export async function duplicateSection(args: {
  pageKey: string;
  sourceSectionKey: string;
  newSectionKey: string;
}): Promise<ReorderResult> {
  try {
    const sb = await getClient();
    const { data, error } = await sb.rpc("rpc_admin_duplicate_section", {
      p_page_key: args.pageKey,
      p_source_section_key: args.sourceSectionKey,
      p_new_section_key: args.newSectionKey,
    });
    if (error) return { success: false, error: error.message };
    const payload = (data ?? {}) as { success?: boolean; error?: string };
    return { success: !!payload.success, error: payload.error ?? null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "unknown" };
  }
}

export type SectionRow = {
  id: string;
  page_key: string;
  section_key: string;
  section_type: string;
  /** TOC-Position innerhalb der Seite (#01) — wandert beim Umsortieren. */
  section_no: number | null;
  /** Stabile Block-Identitätsnummer (B-…) — bleibt bei Umsortierung gleich. */
  section_uid: number | null;
  sort_order: number;
  is_active: boolean;
  /** Eltern-Block (UUID) oder null = oberste Ebene. */
  parent_section_id: string | null;
  /** Convenience: Eltern-Block-Key oder null. */
  parent_section_key: string | null;
  updated_at: string;
  /**
   * Erster gefüllter DE-Text aus headline → title → label → eyebrow → intro.
   * Wird vom Admin-Baum als „menschliche" Bezeichnung statt des technischen
   * `section_key` angezeigt (z. B. „Türkommunikation" statt
   * `block_communication`). Kann null sein, wenn der Block (noch) keinen
   * Text in einem dieser Felder hat.
   */
  display_label_de: string | null;
};

/**
 * Etappe K.4 — Block X als Kind von Block Y einsetzen (oder lösen).
 *
 * Whitelisted RPC `rpc_admin_set_section_parent`. Verhindert Zyklen,
 * normalisiert anschließend die globale Reihenfolge per Tiefensuche
 * (`cms_resequence_sections_dfs`), sodass Kinder direkt hinter ihrem
 * Eltern-Block stehen — die öffentliche Website rendert sie automatisch
 * in dieser Reihenfolge. Die frühere Beschränkung auf `home.start` ist
 * DB-seitig aufgehoben (Stand 2026-05-27).
 *
 * @param newParentSectionKey  null = auf oberste Ebene zurücksetzen.
 * @param position             null = Position unter Geschwistern beibehalten.
 */
export async function setSectionParent(args: {
  pageKey: string;
  sectionKey: string;
  newParentSectionKey: string | null;
  position?: number | null;
}): Promise<ReorderResult> {
  try {
    const sb = await getClient();
    const { data, error } = await sb.rpc("rpc_admin_set_section_parent", {
      p_page_key: args.pageKey,
      p_section_key: args.sectionKey,
      p_new_parent_section_key: args.newParentSectionKey,
      p_position: args.position ?? null,
    });
    if (error) return { success: false, error: error.message };
    const payload = (data ?? {}) as { success?: boolean; error?: string };
    return { success: !!payload.success, error: payload.error ?? null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "unknown" };
  }
}

/**
 * Etappe K.2 — alle Sections einer Seite (auch inaktive) für den Strukturbaum.
 * Liest über whitelisted RPC `rpc_admin_read_page_sections`.
 */
export async function readPageSections(pageKey: string): Promise<{
  sections: SectionRow[];
  error: string | null;
}> {
  try {
    const sb = await getClient();
    const { data, error } = await sb.rpc("rpc_admin_read_page_sections", {
      p_page_key: pageKey,
    });
    if (error) return { sections: [], error: error.message };
    return { sections: (data ?? []) as SectionRow[], error: null };
  } catch (e) {
    return { sections: [], error: e instanceof Error ? e.message : "unknown" };
  }
}

/**
 * Etappe K.2 — Section löschen (Hard-Delete + Cascade).
 * Whitelisted RPC `rpc_admin_delete_section`.
 */
export async function deleteSection(args: {
  pageKey: string;
  sectionKey: string;
}): Promise<{
  success: boolean;
  fields_deleted?: number;
  whitelist_deleted?: number;
  assets_deactivated?: number;
  error: string | null;
}> {
  try {
    const sb = await getClient();
    const { data, error } = await sb.rpc("rpc_admin_delete_section", {
      p_page_key: args.pageKey,
      p_section_key: args.sectionKey,
    });
    if (error) return { success: false, error: error.message };
    const payload = (data ?? {}) as {
      success?: boolean;
      error?: string;
      fields_deleted?: number;
      whitelist_deleted?: number;
      assets_deactivated?: number;
    };
    return {
      success: !!payload.success,
      fields_deleted: payload.fields_deleted,
      whitelist_deleted: payload.whitelist_deleted,
      assets_deactivated: payload.assets_deactivated,
      error: payload.error ?? null,
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "unknown" };
  }
}

/**
 * Etappe `cms-admin-rename-card-section-key-1` — den technischen Schlüssel
 * (`section_key`) eines Blocks umbenennen. Whitelisted RPC
 * `rpc_admin_rename_section_key`. DB-seitig beschränkt auf `card_v1`
 * (Standardkarte), `teaser_2col_v1` (Wechselteaser) und `cards_v1`
 * (Kartenraster). Aktualisiert atomar `cms_sections`, `cms_section_fields`,
 * `cms_assets` und `cms_admin_editable_fields` derselben Seite.
 * Untergeordnete Karten hängen an `parent_section_id` (UUID) und bleiben
 * beim Umbenennen des Rasters unverändert verknüpft.
 *
 * Inhalte, Reihenfolge, Sichtbarkeit, Whitelist und hochgeladene Bilder
 * bleiben erhalten — es ändert sich nur der Schlüssel.
 */
export async function renameSectionKey(args: {
  pageKey: string;
  oldSectionKey: string;
  newSectionKey: string;
}): Promise<{
  success: boolean;
  error: string | null;
  updated_counts?: {
    fields: number;
    assets: number;
    whitelist: number;
    sections: number;
  };
}> {
  try {
    const sb = await getClient();
    const { data, error } = await sb.rpc("rpc_admin_rename_section_key", {
      p_page_key: args.pageKey,
      p_old_section_key: args.oldSectionKey,
      p_new_section_key: args.newSectionKey,
    });
    if (error) return { success: false, error: error.message };
    const payload = (data ?? {}) as {
      success?: boolean;
      error?: string;
      updated_counts?: {
        fields: number;
        assets: number;
        whitelist: number;
        sections: number;
      };
    };
    return {
      success: !!payload.success,
      error: payload.error ?? null,
      updated_counts: payload.updated_counts,
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "unknown" };
  }
}

