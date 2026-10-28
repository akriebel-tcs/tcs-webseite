/**
 * CMS-Overlay für i18next.
 *
 * Lädt einmalig (oder bei Sprachwechsel) alle veröffentlichten + aktiven
 * CMS-Felder, gruppiert sie pro Seite, übersetzt `field_key`-Punktnotation
 * zurück in geschachtelte Objekte und hängt sie via
 * `i18n.addResourceBundle(locale, namespace, { [base_key]: tree }, true, true)`
 * in die laufende i18next-Instanz.
 *
 * Effekt: jeder bestehende `t("namespace:base_key.section.field")`-Aufruf
 * liefert automatisch den CMS-Wert, sobald die Seite auf `published+active`
 * steht. Bei leeren CMS-Feldern bleibt der Original-Wert aus den i18n-JSONs
 * erhalten (kein DELETE — wir setzen nur).
 *
 * Read-only. Sicher für die öffentliche Site.
 */

import type { i18n as I18nType } from "i18next";
import { CMS_PAGE_I18N_REGISTRY } from "../registry/pageI18nRegistry";
import { isStoryblokSource } from "@/lib/content/source";
import type { AppLocale } from "@/i18n/locale";

type CmsLocale = AppLocale;

interface FieldRow {
  page_key: string;
  section_key: string;
  field_key: string;
  locale: string;
  value: string | null;
  review_status?: string | null;
}

const isIndex = (s: string) => /^\d+$/.test(s);

function setNested(target: Record<string, unknown> | unknown[], dottedPath: string, value: string) {
  const parts = dottedPath.split(".");
  let cur: Record<string, unknown> | unknown[] = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    const nextKeyIsIndex = isIndex(parts[i + 1]);
    const existing = (cur as Record<string, unknown>)[k as string];
    let child: Record<string, unknown> | unknown[];
    if (existing == null || typeof existing !== "object") {
      child = nextKeyIsIndex ? [] : {};
      (cur as Record<string, unknown>)[k as string] = child;
    } else {
      // Wenn Bedarf Array ist, vorhandenes Objekt nicht überschreiben (deep-merge)
      child = existing as Record<string, unknown> | unknown[];
    }
    cur = child;
  }
  (cur as Record<string, unknown>)[parts[parts.length - 1] as string] = value;
}

/** Wandelt verschachtelte Objekte mit rein numerischen Keys in Arrays um. */
function normalizeArrays(node: unknown): unknown {
  if (node == null || typeof node !== "object") return node;
  if (Array.isArray(node)) {
    return node.map(normalizeArrays);
  }
  const obj = node as Record<string, unknown>;
  const keys = Object.keys(obj);
  const allIndex = keys.length > 0 && keys.every(isIndex);
  if (allIndex) {
    const arr: unknown[] = [];
    for (const k of keys) arr[Number(k)] = normalizeArrays(obj[k]);
    return arr;
  }
  for (const k of keys) obj[k] = normalizeArrays(obj[k]);
  return obj;
}

async function fetchAllPublishedFields(locale: CmsLocale): Promise<FieldRow[]> {
  if (isStoryblokSource()) {
    // Storyblok: nur die Seiten der Registry laden (alle anderen Seiten lesen
    // direkt ueber useCmsPageContent); Stories in einem Aufruf, zu Zeilen abgeflacht.
    try {
      const client = await import("@/lib/storyblok/client");
      if (!client.isStoryblokConfigured()) return [];
      const { flattenPageContent } = await import("@/lib/storyblok/flatten");
      const stories = await client.fetchPagesByPageKeys(Object.keys(CMS_PAGE_I18N_REGISTRY));
      const out: FieldRow[] = [];
      for (const story of stories) {
        const pageKey = String(story.content?.page_key ?? "");
        for (const f of flattenPageContent(story.content).fields) {
          if (f.locale !== locale || f.section_key === "__page__") continue;
          out.push({ page_key: pageKey, section_key: f.section_key, field_key: f.field_key, locale: f.locale, value: f.value, review_status: null });
        }
      }
      return out;
    } catch {
      return [];
    }
  }
  try {
    const { getCmsSupabaseClient } = await import("@/lib/cmsSupabase/client");
    const supabase = getCmsSupabaseClient();
    // RLS sorgt dafür, dass nur published+active Inhalte zurückkommen.
    const { data, error } = await supabase
      .from("cms_section_fields")
      .select("page_key, section_key, field_key, locale, value, review_status")
      .eq("locale", locale);
    if (error || !data) return [];
    return data as FieldRow[];
  } catch {
    return [];
  }
}

/**
 * Wendet das CMS-Overlay einmal pro Locale an. Mehrfache Aufrufe sind
 * unschädlich (addResourceBundle mit overwrite=true).
 */
export async function applyCmsOverlay(i18n: I18nType, locale: CmsLocale): Promise<void> {
  const rows = await fetchAllPublishedFields(locale);
  if (rows.length === 0) return;

  // Pro Seite gruppieren
  const byPage = new Map<string, FieldRow[]>();
  for (const row of rows) {
    if (!row.value || row.value.length === 0) continue;
    // Maschinelle Übersetzungen dürfen sichtbar sein; veraltete
    // Maschinenwerte werden ausgelassen (Deutsch-Rückfall greift).
    if (row.review_status === "maschinell_veraltet") continue;
    const list = byPage.get(row.page_key) ?? [];
    list.push(row);
    byPage.set(row.page_key, list);
  }

  // Pro Namespace einen Tree zusammenbauen
  const byNamespace: Record<string, Record<string, unknown>> = {};
  for (const [pageKey, fields] of byPage) {
    const reg = CMS_PAGE_I18N_REGISTRY[pageKey];
    if (!reg) continue; // unbekannte Seite → nichts overlayen
    const nsTree = byNamespace[reg.namespace] ?? {};
    if (!reg.base_key) {
      // Flat namespace: direkt in nsTree mergen
      for (const f of fields) {
        const path = `${f.section_key}.${f.field_key}`;
        setNested(nsTree, path, f.value as string);
      }
    } else {
      const baseTree = (nsTree[reg.base_key] as Record<string, unknown>) ?? {};
      for (const f of fields) {
        const path = `${f.section_key}.${f.field_key}`;
        setNested(baseTree, path, f.value as string);
      }
      nsTree[reg.base_key] = baseTree;
    }
    byNamespace[reg.namespace] = nsTree;
  }

  for (const [ns, tree] of Object.entries(byNamespace)) {
    const normalized = normalizeArrays(tree) as Record<string, unknown>;
    // deep merge + overwrite (Arrays werden ersetzt, Objekte gemerged)
    i18n.addResourceBundle(locale, ns, normalized, true, true);
  }
}
