/**
 * Bedienungstexte aus der Storyblok-Datasource `ui-strings`.
 *
 * Eintragsname = `<namespace>.<string_key>` (z. B. `service.actions.back`),
 * Wert = deutscher Quelltext, Sprach-Dimensionen `en`, `nl`, `pl`, `cs`.
 * Liefert dasselbe Format wie die fruehere RPC `rpc_public_read_ui_strings`:
 * `{ [namespace]: { [string_key]: text } }`.
 */
import { fetchDatasourceEntries } from "@/lib/storyblok/client";

export async function readUiStringsFromStoryblok(locale: string): Promise<Record<string, Record<string, string>>> {
  const entries = await fetchDatasourceEntries("ui-strings", locale === "de" ? undefined : locale);
  const out: Record<string, Record<string, string>> = {};
  for (const e of entries) {
    const text = locale === "de" ? e.value : e.dimension_value;
    if (!text || text.trim() === "") continue;
    const dot = e.name.indexOf(".");
    if (dot <= 0) continue;
    const ns = e.name.slice(0, dot);
    const key = e.name.slice(dot + 1);
    (out[ns] ??= {})[key] = text;
  }
  return out;
}

/** Kurz-IDs (`P-<nr>`, `B-<nr>`) aus der Datasource `short-ids`. */
export async function readShortIdsFromStoryblok(): Promise<Map<string, string>> {
  const entries = await fetchDatasourceEntries("short-ids");
  const map = new Map<string, string>();
  for (const e of entries) if (e.value) map.set(e.name, e.value);
  return map;
}
