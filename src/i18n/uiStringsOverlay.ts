/**
 * DB-first für Bedienungstexte (Buttons, Filter, Zustände).
 *
 * Wahrheit für die Zielsprachen ist der Katalog in CMS-Light
 * (`cms_ui_strings` / `cms_ui_string_translations`, gelesen über
 * `rpc_public_read_ui_strings`). Die mitgelieferten JSON-Dateien bleiben
 * ausschließlich:
 * - deutsche Quelle und Startpunkt beim Laden der Seite,
 * - stabiler Notfall-Rückfall, falls die Datenbank nicht erreichbar ist.
 *
 * Es wird zur Laufzeit keine Datei im Repository geändert; die Werte werden nur
 * im Speicher über die gebündelten Ressourcen gelegt.
 */

import type { i18n as I18nInstance } from "i18next";

import { DEFAULT_APP_LOCALE, normalizeAppLocale } from "@/i18n/locale";
import { isStoryblokSource } from "@/lib/content/source";

type NestedRecord = { [key: string]: string | NestedRecord };

const loaded = new Set<string>();
const inflight = new Map<string, Promise<boolean>>();

/** „actions.back" → { actions: { back: … } } */
export function expandDottedKeys(flat: Record<string, unknown>): NestedRecord {
  const out: NestedRecord = {};
  for (const [key, value] of Object.entries(flat)) {
    if (typeof value !== "string" || value.trim() === "") continue;
    const parts = key.split(".").filter((p) => p !== "");
    if (parts.length === 0) continue;
    let node = out;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const next = node[parts[i]];
      if (typeof next !== "object" || next === null) node[parts[i]] = {};
      node = node[parts[i]] as NestedRecord;
    }
    node[parts[parts.length - 1]] = value;
  }
  return out;
}

/** Namespaces aus der Datenbank in i18next-Bündel umwandeln. */
export function toResourceBundles(
  payload: Record<string, unknown>,
): Array<{ namespace: string; resources: NestedRecord }> {
  const out: Array<{ namespace: string; resources: NestedRecord }> = [];
  for (const [namespace, entries] of Object.entries(payload ?? {})) {
    if (typeof entries !== "object" || entries === null) continue;
    const resources = expandDottedKeys(entries as Record<string, unknown>);
    if (Object.keys(resources).length === 0) continue;
    out.push({ namespace, resources });
  }
  return out;
}

export function resetUiStringOverlayCache(): void {
  loaded.clear();
  inflight.clear();
}

async function readUiStrings(locale: string): Promise<Record<string, unknown>> {
  if (isStoryblokSource()) {
    const { readUiStringsFromStoryblok } = await import("@/lib/storyblok/uiStrings");
    return readUiStringsFromStoryblok(locale);
  }
  const { getCmsSupabaseClient } = await import("@/lib/cmsSupabase/client");
  const supabase = getCmsSupabaseClient();
  const { data, error } = await supabase.rpc("rpc_public_read_ui_strings", {
    p_locale: locale,
  });
  if (error) throw new Error(error.message);
  return (data ?? {}) as Record<string, unknown>;
}

/**
 * Legt die Bedienungstexte der Zielsprache aus der Datenbank über die
 * gebündelten Ressourcen. Fehler sind bewusst still: die Seite bleibt mit dem
 * mitgelieferten Sprachpaket bedienbar.
 */
export async function applyUiStringOverlay(
  i18n: I18nInstance,
  rawLocale: string,
): Promise<boolean> {
  const locale = normalizeAppLocale(rawLocale);
  if (locale === DEFAULT_APP_LOCALE) return false;
  if (loaded.has(locale)) return true;
  const running = inflight.get(locale);
  if (running) return running;

  const task = (async () => {
    try {
      const payload = await readUiStrings(locale);
      const bundles = toResourceBundles(payload);
      for (const bundle of bundles) {
        i18n.addResourceBundle(locale, bundle.namespace, bundle.resources, true, true);
      }
      loaded.add(locale);
      if (bundles.length > 0 && normalizeAppLocale(i18n.language) === locale) {
        await i18n.changeLanguage(locale);
      }
      return bundles.length > 0;
    } catch {
      return false;
    } finally {
      inflight.delete(locale);
    }
  })();

  inflight.set(locale, task);
  return task;
}

/** Einmalige Registrierung: beim Start und bei jedem Sprachwechsel laden. */
export function registerUiStringOverlay(i18n: I18nInstance): void {
  void applyUiStringOverlay(i18n, i18n.language);
  i18n.on("languageChanged", (lng: string) => {
    void applyUiStringOverlay(i18n, lng);
  });
}
