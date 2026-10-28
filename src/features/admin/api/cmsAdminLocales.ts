/**
 * Sprachverwaltung (Admin) — DB-first.
 *
 * Schreiben ausschließlich über `rpc_admin_upsert_locale`. Eine neu angelegte
 * Sprache ist absichtlich weder im CMS aktiv noch auf der Website sichtbar;
 * das wird getrennt über `rpc_admin_set_locale_visibility` entschieden.
 */
import { getCmsSupabaseClient } from "@/lib/cmsSupabase/client";
import { resetLocaleRegistryCache } from "@/i18n/localeRegistry";

const ERROR_TEXT: Record<string, string> = {
  locale_required: "Bitte einen Sprachcode angeben.",
  locale_code_invalid: "Der Sprachcode ist ungültig (Beispiele: hr, pt-br).",
  label_required: "Bitte deutschen und eigensprachlichen Namen angeben.",
  fallback_unknown: "Die gewählte Rückfallsprache ist nicht bekannt.",
};

export interface UpsertLocaleArgs {
  locale: string;
  labelDe: string;
  labelNative: string;
  fallbackLocale?: string;
  notes?: string;
}

export async function upsertLocale(args: UpsertLocaleArgs): Promise<void> {
  const supabase = getCmsSupabaseClient();
  const { data, error } = await supabase.rpc("rpc_admin_upsert_locale", {
    p_locale: args.locale.trim().toLowerCase(),
    p_label_de: args.labelDe.trim(),
    p_label_native: args.labelNative.trim(),
    p_fallback_locale: args.fallbackLocale?.trim().toLowerCase() ?? "de",
    p_notes: args.notes ?? null,
  } as never);
  if (error) throw new Error(error.message);
  const result = (data ?? {}) as { success?: boolean; error?: string };
  resetLocaleRegistryCache();
  if (!result.success) {
    throw new Error(ERROR_TEXT[result.error ?? ""] ?? "Sprache konnte nicht gespeichert werden.");
  }
}

export interface TranslationIntegrityReport {
  unbekannte_sprache: number;
  verwaiste_uebersetzung: number;
  fehlende_quelle: number;
  dubletten: number;
  altspalten_abweichung: number;
  zeilen: { seitentitel: number; navigation: number; bild_alt: number };
}

/** Prüfbericht über die Sprachtabellen (nur lesen). */
export async function readTranslationIntegrity(): Promise<TranslationIntegrityReport> {
  const supabase = getCmsSupabaseClient();
  const { data, error } = await supabase.rpc("rpc_admin_translation_integrity" as never);
  if (error) throw new Error(error.message);
  return data as unknown as TranslationIntegrityReport;
}
