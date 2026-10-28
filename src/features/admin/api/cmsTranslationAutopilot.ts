/**
 * Übersetzungs-Automatik (CMS-Light).
 *
 * Wahrheit liegt ausschließlich in der Datenbank:
 * - `cms_translation_autopilot.is_enabled` … Automatik ein/aus
 * - `cms_locales` (is_active UND is_public) … betroffene Zielsprachen
 * - `cms_translation_jobs` (batch_id = 'auto') … offene, erledigte,
 *   fehlgeschlagene und wegen Handarbeit übersprungene Aufträge
 * - `cms_translation_runs` (scope_kind = 'auto') … Serverläufe
 *
 * Der Browser liest nur (`rpc_admin_translation_autopilot_status`) und schaltet
 * die Automatik über `rpc_admin_set_translation_autopilot`. Übersetzt wird
 * ausschließlich serverseitig; es gibt keinen Schreibweg aus dem Browser in
 * Inhalte.
 */

export interface AutopilotLocaleRow {
  locale: string;
  label_de: string | null;
  planned_waiting: number;
  planned_due: number;
  failed: number;
  skipped_manual: number;
  translated: number;
  runs_open: number;
  run_activity: string | null;
  last_success_at: string | null;
  next_due_at: string | null;
}

export interface AutopilotStatus {
  is_enabled: boolean;
  /** Nur die Verarbeitung ruht; Erkennung/Markierung läuft weiter. */
  is_paused: boolean;
  debounce_seconds: number;
  updated_at: string | null;
  locales: Array<{ locale: string; label: string | null }>;
  per_locale: AutopilotLocaleRow[];
  pending: number;
  failed: number;
  skipped_manual: number;
  translated: number;
  runs_open: number;
  last_success_at: string | null;
  last_activity_at: string | null;
}

/** Bestand je Zielsprache, direkt aus der zentralen Texteinheiten-Sicht. */
export interface LocaleCounts {
  locale: string;
  existing: number;
  missing: number;
  outdated: number;
  manual_protected: number;
  not_prepared: number;
  total: number;
}

async function client() {
  const { getCmsSupabaseClient } = await import("@/lib/cmsSupabase/client");
  return getCmsSupabaseClient();
}

export async function readAutopilotStatus(): Promise<AutopilotStatus> {
  const supabase = await client();
  const { data, error } = await supabase.rpc("rpc_admin_translation_autopilot_status");
  if (error) throw new Error(error.message);
  const row = (data ?? {}) as Partial<AutopilotStatus>;
  return {
    is_enabled: Boolean(row.is_enabled),
    is_paused: Boolean(row.is_paused),
    debounce_seconds: Number(row.debounce_seconds ?? 90),
    updated_at: row.updated_at ?? null,
    locales: Array.isArray(row.locales) ? row.locales : [],
    per_locale: Array.isArray(row.per_locale) ? row.per_locale : [],
    pending: Number(row.pending ?? 0),
    failed: Number(row.failed ?? 0),
    skipped_manual: Number(row.skipped_manual ?? 0),
    translated: Number(row.translated ?? 0),
    runs_open: Number(row.runs_open ?? 0),
    last_success_at: row.last_success_at ?? null,
    last_activity_at: row.last_activity_at ?? null,
  };
}

export async function readLocaleCounts(locale: string): Promise<LocaleCounts> {
  const supabase = await client();
  const { data, error } = await supabase.rpc("rpc_admin_translation_locale_counts", {
    p_locale: locale,
  });
  if (error) throw new Error(error.message);
  const row = (data ?? {}) as Partial<LocaleCounts>;
  return {
    locale: row.locale ?? locale,
    existing: Number(row.existing ?? 0),
    missing: Number(row.missing ?? 0),
    outdated: Number(row.outdated ?? 0),
    manual_protected: Number(row.manual_protected ?? 0),
    not_prepared: Number(row.not_prepared ?? 0),
    total: Number(row.total ?? 0),
  };
}

async function setAutopilot(args: { enabled?: boolean; paused?: boolean }) {
  const supabase = await client();
  const payload: Record<string, boolean> = {};
  if (args.enabled !== undefined) payload.p_enabled = args.enabled;
  if (args.paused !== undefined) payload.p_paused = args.paused;
  const { data, error } = await supabase.rpc("rpc_admin_set_translation_autopilot", payload);
  if (error) throw new Error(error.message);
  const row = (data ?? {}) as {
    success?: boolean;
    error?: string;
    is_enabled?: boolean;
    is_paused?: boolean;
  };
  if (!row.success) throw new Error(row.error ?? "Automatik konnte nicht geschaltet werden.");
  return { is_enabled: Boolean(row.is_enabled), is_paused: Boolean(row.is_paused) };
}

export async function setAutopilotEnabled(enabled: boolean): Promise<boolean> {
  return (await setAutopilot({ enabled })).is_enabled;
}

/**
 * Verarbeitung anhalten oder fortsetzen. Erkennung und Markierung fehlender
 * oder veralteter Texte bleiben davon unberührt.
 */
export async function setAutopilotPaused(paused: boolean): Promise<boolean> {
  return (await setAutopilot({ paused })).is_paused;
}

