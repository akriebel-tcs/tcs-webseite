import { resetLocaleRegistryCache } from "@/i18n/localeRegistry";
import { BUNDLED_LOCALES, DEFAULT_APP_LOCALE, normalizeAppLocale } from "@/i18n/locale";
/**
 * Sprachsichtbarkeit (CMS-Light).
 *
 * Zwei getrennte Zustände je Sprache — beide liegen in `cms_locales`, es gibt
 * keine zweite Wahrheit im Code:
 * - `is_active`  … „Im CMS bearbeitbar" (Sprache erscheint im Übersetzungs-
 *   werkzeug und in den Redaktionsfeldern).
 * - `is_public`  … „Auf der Website sichtbar" (Sprache erscheint im
 *   öffentlichen Sprachumschalter).
 *
 * Geschrieben wird ausschließlich über `rpc_admin_set_locale_visibility`.
 * Die Funktion arbeitet wiederholbar, protokolliert jede Änderung in
 * `cms_locale_visibility_audit`, schützt die Quellsprache Deutsch und
 * erzwingt: öffentlich sichtbar nur, wenn im CMS bearbeitbar.
 */

/**
 * Technisches Gate fuer die oeffentliche Freigabe.
 *
 * Eine Sprache darf jederzeit intern aktiv sein und uebersetzt werden.
 * Oeffentlich sichtbar darf sie erst werden, wenn BEIDE Textklassen der Website
 * in der Datenbank vollstaendig vorliegen:
 * - Seiteninhalte (`section_field`, `page_title`, `nav_label`,
 *   `nav_description`, `asset_alt`)
 * - Bedienungstexte (`ui_string`, Katalog `cms_ui_strings`)
 *
 * Fachliche Wahrheit ist damit die Datenbank
 * (`rpc_admin_locale_release_readiness`), nicht mehr eine Liste im Code.
 * `BUNDLED_LOCALES` bleibt nur noch der Notfall-Rueckfall der Oberflaeche.
 */
export interface PublicReleaseReadiness {
  locale: string;
  ready: boolean;
  /** Verstaendliche Erklaerung, was noch fehlt (leer, wenn bereit). */
  missing: string;
  /** Offene Seiteninhalte (aus der Datenbank). */
  contentMissing?: number;
  /** Offene Bedienungstexte (aus der Datenbank). */
  uiMissing?: number;
}

/** Nur noch Notfall-Hinweis, wenn die Datenbank nicht antwortet. */
export function bundledFallbackReadiness(locale: string): PublicReleaseReadiness {
  const code = normalizeAppLocale(locale);
  const bundled = (BUNDLED_LOCALES as readonly string[]).includes(code);
  if (code === DEFAULT_APP_LOCALE || bundled) {
    return { locale: code, ready: true, missing: "" };
  }
  return {
    locale: code,
    ready: false,
    missing:
      `Der Sprachstand für „${code.toUpperCase()}" ist gerade nicht abrufbar. ` +
      "Bitte später erneut versuchen.",
  };
}

/** Freigabereife aus der Datenbank lesen (beide Textklassen). */
export async function checkPublicReleaseReadiness(
  locale: string,
): Promise<PublicReleaseReadiness> {
  const code = normalizeAppLocale(locale);
  if (code === DEFAULT_APP_LOCALE) return { locale: code, ready: true, missing: "" };
  try {
    const { getCmsSupabaseClient } = await import("@/lib/cmsSupabase/client");
    const supabase = getCmsSupabaseClient();
    const { data, error } = await supabase.rpc("rpc_admin_locale_release_readiness", {
      p_locale: code,
    });
    if (error) throw new Error(error.message);
    const row = (data ?? {}) as {
      success?: boolean;
      ready?: boolean;
      content?: { total?: number; missing?: number };
      ui?: { total?: number; missing?: number };
    };
    if (!row.success) {
      if ((row as { error?: string }).error === "coverage_pending") {
        return {
          locale: code,
          ready: false,
          missing:
            `Der Sprachstand für „${code.toUpperCase()}" wird gerade berechnet. ` +
            "Bitte gleich noch einmal prüfen.",
        };
      }
      return bundledFallbackReadiness(code);
    }
    const contentMissing = Number(row.content?.missing ?? 0);
    const uiMissing = Number(row.ui?.missing ?? 0);
    if (row.ready) {
      return { locale: code, ready: true, missing: "", contentMissing, uiMissing };
    }
    const parts: string[] = [];
    if (contentMissing > 0) parts.push(`${contentMissing} Seiteninhalte`);
    if (uiMissing > 0) parts.push(`${uiMissing} Bedienungstexte`);
    return {
      locale: code,
      ready: false,
      contentMissing,
      uiMissing,
      missing:
        `Für „${code.toUpperCase()}" fehlen noch ` +
        (parts.length > 0 ? parts.join(" und ") : "Übersetzungen") +
        ". Die Sprache kann intern bearbeitet und übersetzt werden; auf der Website " +
        "sichtbar wird sie erst, wenn beide Bereiche vollständig übersetzt sind.",
    };
  } catch {
    return bundledFallbackReadiness(code);
  }
}

export interface LocaleVisibility {
  locale: string;
  is_active: boolean;
  is_public: boolean;
}

export async function setLocaleVisibility(args: {
  locale: string;
  isActive?: boolean;
  isPublic?: boolean;
  reason?: string;
}): Promise<LocaleVisibility> {
  if (args.isPublic === true) {
    const readiness = await checkPublicReleaseReadiness(args.locale);
    if (!readiness.ready) throw new Error(readiness.missing);
  }

  const { getCmsSupabaseClient } = await import("@/lib/cmsSupabase/client");
  const supabase = getCmsSupabaseClient();
  const { data, error } = await supabase.rpc("rpc_admin_set_locale_visibility", {
    p_locale: args.locale,
    p_is_active: args.isActive ?? null,
    p_is_public: args.isPublic ?? null,
    p_reason: args.reason ?? null,
  });
  resetLocaleRegistryCache();
  if (error) throw new Error(visibilityErrorHint(error.message));
  const row = (Array.isArray(data) ? data[0] : data) as LocaleVisibility | undefined;
  if (!row) throw new Error("Sprache konnte nicht gespeichert werden.");
  return row;
}

/** Serverfehler in verständliches Deutsch übersetzen. */
export function visibilityErrorHint(raw: string): string {
  if (raw.includes("locale_unknown")) return "Diese Sprache ist in der Sprachliste nicht bekannt.";
  if (raw.includes("locale_required")) return "Es wurde keine Sprache übergeben.";
  return `Nicht gespeichert: ${raw}`;
}
