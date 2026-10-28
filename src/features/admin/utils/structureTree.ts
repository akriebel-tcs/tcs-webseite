/**
 * Read-only Hilfsfunktionen für die CMS-Light Strukturansicht.
 *
 * Quelle: `src/navigation/pageRegistry.ts` (rein lesend).
 * - Keine Änderungen an Navigation, Routing, i18n.
 * - Keine Datenbank, keine RPC.
 * - Keine Schreiboperationen.
 */

import { PAGE_REGISTRY, type PageEntry } from "@/navigation/pageRegistry";

export const CMS_PILOT_PAGE_KEY = "anwendungen.pflege";

export type CmsStatus = "cms-pilot" | "code-based" | "not-cms-managed";

export interface StructureItem extends PageEntry {
  cmsStatus: CmsStatus;
  /** Zusatzhinweis für den Pilot (Draft, read-only). */
  cmsNote?: string;
}

export interface StructureGroup {
  /** Stabiler Prefix (Teil vor erstem Punkt im pageKey). */
  prefix: string;
  /** Anzeige-Titel der Gruppe. */
  label: string;
  items: StructureItem[];
}

const GROUP_ORDER: Array<{ prefix: string; label: string }> = [
  { prefix: "home", label: "Startseite" },
  { prefix: "anwendungen", label: "Anwendungen" },
  { prefix: "gebaeudekommunikation", label: "Gebäudekommunikation" },
  { prefix: "zutrittskontrolle", label: "Zutrittskontrolle" },
  { prefix: "gebaeudemanagement", label: "Gebäudemanagement" },
  { prefix: "eingangssysteme", label: "Eingangssysteme" },
  { prefix: "signage", label: "Signage" },
  { prefix: "service", label: "Service" },
  { prefix: "serviceportal", label: "Serviceportal" },
  { prefix: "wissen", label: "Wissen" },
  { prefix: "meta", label: "Unternehmen / Kontakt" },
  { prefix: "legal", label: "Rechtliches" },
  { prefix: "system", label: "System" },
];

function classifyCms(entry: PageEntry): { cmsStatus: CmsStatus; cmsNote?: string } {
  if (entry.pageKey === CMS_PILOT_PAGE_KEY) {
    return {
      cmsStatus: "cms-pilot",
      cmsNote:
        "CMS-Pilot · Draft / inactive · Inhalt read-only über CMS-Light lesbar · öffentliche Seite bleibt Fallback",
    };
  }
  return { cmsStatus: "code-based" };
}

export function buildStructureGroups(): StructureGroup[] {
  const buckets = new Map<string, StructureItem[]>();
  for (const entry of PAGE_REGISTRY) {
    const prefix = entry.pageKey.split(".")[0] ?? "sonstige";
    const item: StructureItem = { ...entry, ...classifyCms(entry) };
    if (!buckets.has(prefix)) buckets.set(prefix, []);
    buckets.get(prefix)!.push(item);
  }

  // sort items: roots first, then by routePath
  for (const list of buckets.values()) {
    list.sort((a, b) => {
      const aRoot = a.pageKey.endsWith(".root") ? 0 : 1;
      const bRoot = b.pageKey.endsWith(".root") ? 0 : 1;
      if (aRoot !== bRoot) return aRoot - bRoot;
      return a.routePath.localeCompare(b.routePath);
    });
  }

  const ordered: StructureGroup[] = [];
  const seen = new Set<string>();
  for (const g of GROUP_ORDER) {
    const items = buckets.get(g.prefix);
    if (items && items.length) {
      ordered.push({ prefix: g.prefix, label: g.label, items });
      seen.add(g.prefix);
    }
  }
  // Append unknown buckets, just in case
  for (const [prefix, items] of buckets.entries()) {
    if (!seen.has(prefix)) {
      ordered.push({ prefix, label: prefix, items });
    }
  }
  return ordered;
}
