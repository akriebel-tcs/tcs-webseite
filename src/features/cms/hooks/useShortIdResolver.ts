/**
 * useShortIdResolver — Lädt einmalig die Kurz-ID-Auflösung für
 * `P-<page_no>` und `B-<section_uid>` aus der CMS-DB und liefert eine
 * `ShortIdMap`, die `canonicalLink`/`resolveHref` aus
 * `@/features/cms/lib/cardCanonical` direkt verwerten können.
 *
 * Lese-Pfad ohne Schreibrechte (anon-RLS reicht). Klein und gecacht
 * pro App-Session via Module-Level-Promise — pro App ein Roundtrip.
 */
import { useEffect, useState } from "react";
import { getCmsSupabaseClient } from "@/lib/cmsSupabase/client";
import type { ShortIdMap } from "@/features/cms/lib/cardCanonical";

let cachedPromise: Promise<ShortIdMap> | null = null;

async function loadMap(): Promise<ShortIdMap> {
  const supabase = getCmsSupabaseClient();
  const pages = new Map<number, string>();
  const sections = new Map<number, { route: string; anchor?: string }>();
  try {
    const { data: pageRows } = await supabase
      .from("cms_pages")
      .select("page_no, route_path, status, is_active")
      .eq("status", "published")
      .eq("is_active", true);
    if (Array.isArray(pageRows)) {
      for (const r of pageRows as Array<{ page_no: number; route_path: string | null }>) {
        if (r.route_path) pages.set(Number(r.page_no), r.route_path);
      }
    }
    const { data: sectionRows } = await supabase
      .from("cms_sections")
      .select("section_uid, page_key, section_key, is_active");
    if (Array.isArray(sectionRows)) {
      // Sections brauchen den Route-Path ihrer Seite.
      const pageRoutesByKey = new Map<string, string>();
      const { data: pageKeyRows } = await supabase
        .from("cms_pages")
        .select("page_key, route_path, status, is_active")
        .eq("status", "published")
        .eq("is_active", true);
      if (Array.isArray(pageKeyRows)) {
        for (const r of pageKeyRows as Array<{ page_key: string; route_path: string | null }>) {
          if (r.route_path) pageRoutesByKey.set(r.page_key, r.route_path);
        }
      }
      for (const r of sectionRows as Array<{
        section_uid: number;
        page_key: string;
        section_key: string;
        is_active: boolean;
      }>) {
        if (!r.is_active) continue;
        const route = pageRoutesByKey.get(r.page_key);
        if (!route) continue;
        sections.set(Number(r.section_uid), { route, anchor: r.section_key });
      }
    }
  } catch {
    // Fail-soft: leere Map → Kurz-IDs werden als broken behandelt.
  }
  return { pages, sections };
}

export function useShortIdResolver(): ShortIdMap {
  const [map, setMap] = useState<ShortIdMap>({ pages: new Map(), sections: new Map() });
  useEffect(() => {
    if (!cachedPromise) cachedPromise = loadMap();
    let alive = true;
    cachedPromise.then((m) => { if (alive) setMap(m); });
    return () => { alive = false; };
  }, []);
  return map;
}
