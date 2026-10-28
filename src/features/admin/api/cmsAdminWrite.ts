/**
 * CMS-Light Admin Write API — Section-Field-Editor (Whitelist).
 *
 * Etappe `cms-light-admin-section-field-editor-whitelist-1`.
 *
 * - Nutzt ausschließlich CMS-Light-Wrapper (`@/lib/cmsSupabase/client`).
 * - Kein Import von `@/lib/supabase/client` (Produktdatenbank).
 * - Kein `service_role`. Kein direktes `.update/.insert/.upsert/.delete`.
 * - Schreiben ausschließlich über die generische, aber whitelist-geschützte
 *   RPC `rpc_admin_update_section_field`. Die Whitelist liegt in der
 *   Tabelle `cms_admin_editable_fields` und wird DB-seitig geprüft.
 * - WICHTIG (Stand 2026-09-15, am Livestand geprüft): Die RPC führt ein
 *   `INSERT ... ON CONFLICT ... UPDATE` auf `cms_section_fields` aus und setzt
 *   dabei `review_status = 'geprueft'`. Frühere Kommentare („nur UPDATE",
 *   „keine Statusänderung") waren falsch. Es gibt **keine** serverseitige
 *   Konfliktprüfung (kein Versionsvergleich/CAS) und **keinen** Readback des
 *   geschriebenen Werts — beides bleibt offen.
 *
 * Sicherheitsstatus: temporärer No-Login-Workspace-Prototyp. Vor
 * Produktivbetrieb entfernen, deaktivieren oder durch Auth/Rollen ersetzen.

 *
 * Hinweis: Die alte Pilot-RPC `rpc_admin_update_pilot_pflege_field` bleibt
 * vorerst in der DB bestehen, wird aber vom Frontend nicht mehr aufgerufen.
 * Cleanup erfolgt in einer separaten Etappe.
 */

// Backwards-kompatible Typ-Aliase, damit bestehende Aufrufer (EditableField)
// unverändert bleiben können. Inhaltlich sind das jetzt die freigegebenen
// Pflege-Felder; weitere Felder werden über Whitelist-Einträge in der DB
// freigeschaltet, ohne diese Datei anfassen zu müssen.
export type PilotSectionKey = "hero" | "answer-first" | "intro";
export type PilotFieldKey = "headline" | "intro" | "text";
export type PilotLocale = "de" | "en" | "pl";

export type SaveSectionFieldResult = {
  success: boolean;
  updated: boolean;
  error: string | null;
};

// Default-Page-Key für die aktuelle Pilotseite. Sobald weitere Pilotseiten
// freigeschaltet werden, übergibt der Aufrufer einfach `pageKey` explizit.
const DEFAULT_PAGE_KEY = "anwendungen.pflege";

/**
 * Speichert einen einzelnen Feldwert über die Admin-RPC.
 *
 * Whitelist-Prüfung passiert serverseitig in `rpc_admin_update_section_field`
 * gegen `cms_admin_editable_fields`. Diese Funktion macht keine eigene
 * clientseitige Whitelist mehr — sie reicht den Aufruf nur durch und
 * mappt das Ergebnis auf einen kleinen, stabilen Result-Typ.
 */
export async function saveSectionField(args: {
  pageKey?: string;
  sectionKey: string;
  fieldKey: string;
  locale: string;
  value: string;
}): Promise<SaveSectionFieldResult> {
  if (args.locale !== "de" && args.locale !== "en" && args.locale !== "pl") {
    return { success: false, updated: false, error: "locale_not_allowed" };
  }

  try {
    const mod = await import("@/lib/cmsSupabase/client");
    const supabase = mod.getCmsSupabaseClient();
    const { data, error } = await (supabase as unknown as {
      rpc: (
        name: string,
        params: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    }).rpc("rpc_admin_update_section_field", {
      p_page_key: args.pageKey ?? DEFAULT_PAGE_KEY,
      p_section_key: args.sectionKey,
      p_field_key: args.fieldKey,
      p_locale: args.locale,
      p_value: args.value,
    });

    if (error) {
      return { success: false, updated: false, error: error.message };
    }
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

/**
 * Backwards-kompatibler Wrapper für bestehende Aufrufer (EditableField).
 * Reicht intern an `saveSectionField` mit Default-Page-Key durch. Die
 * eigentliche Freigabeprüfung erfolgt serverseitig gegen die Whitelist.
 */
export async function savePilotField(args: {
  sectionKey: PilotSectionKey;
  fieldKey: PilotFieldKey;
  locale: PilotLocale;
  value: string;
}): Promise<SaveSectionFieldResult> {
  return saveSectionField({
    pageKey: DEFAULT_PAGE_KEY,
    sectionKey: args.sectionKey,
    fieldKey: args.fieldKey,
    locale: args.locale,
    value: args.value,
  });
}

// Beibehalten für bestehende Importe; bewusste Vereinfachung: clientseitig
// gibt es keine harte Whitelist mehr, Wahrheit liegt serverseitig in
// `cms_admin_editable_fields`. Diese Helper-Funktion gibt nur noch die
// historisch erlaubten Pflege-Kombinationen zurück, damit ältere Aufrufer
// kein TypeScript-Loch bekommen.
const PILOT_PFLEGE_COMBOS: ReadonlyArray<{ section: PilotSectionKey; field: PilotFieldKey }> = [
  { section: "hero", field: "headline" },
  { section: "hero", field: "intro" },
  { section: "answer-first", field: "text" },
  { section: "intro", field: "text" },
];

export function isAllowedPilotField(section: string, field: string): boolean {
  return PILOT_PFLEGE_COMBOS.some((a) => a.section === section && a.field === field);
}
