/**
 * cmsAdminIconFields — liest alle Icon-Felder (`field_key = 'icon'`) aus
 * `cms_section_fields` zusammen mit dem Page-/Section-Kontext.
 *
 * Reine Lese-Operation. Genutzt von der Medien-Workbench (Bilder + Icons),
 * damit Lucide-Icons dort wie sichtbare Medienplätze gepflegt werden können.
 * Kein Schreibvorgang — Schreiben läuft (wie im Inhalte-Bereich) über
 * `saveSectionField` → `rpc_admin_update_section_field`.
 */
import { getCmsSupabaseClient } from "@/lib/cmsSupabase/client";

export interface IconFieldRow {
  page_key: string;
  page_title_de: string | null;
  page_status: string | null;
  page_is_active: boolean | null;
  page_route_path: string | null;
  section_key: string;
  section_type: string | null;
  section_is_active: boolean | null;
  parent_section_type: string | null;
  field_key: string;
  value_de: string | null;
  value_en: string | null;
}

interface RawFieldRow {
  page_key: string;
  section_key: string;
  field_key: string;
  locale: string;
  value: string | null;
}

interface RawSectionRow {
  page_key: string;
  section_key: string;
  section_type: string | null;
  is_active: boolean | null;
}

interface RawPageRow {
  page_key: string;
  title_de: string | null;
  status: string | null;
  is_active: boolean | null;
  route_path: string | null;
}

export async function readAllIconFields(): Promise<IconFieldRow[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = getCmsSupabaseClient() as any;


    // Erkennt sowohl flache `icon`-Felder (z. B. auf Kindsections) als auch
    // strukturierte `<key>.icon`-Felder in bestehenden Listen-Sections
    // (z. B. `items.system.icon`, `downloads.icon`). PostgREST `or` mit
    // `like` benötigt URL-Kodierung — `*` ist Wildcard.
    const fieldsRes = await sb
      .from("cms_section_fields")
      .select("page_key,section_key,field_key,locale,value")
      .or("field_key.eq.icon,field_key.like.*.icon")
      .in("locale", ["de", "en"]);
    const fieldsRaw = (fieldsRes.data as RawFieldRow[] | null) ?? [];

    const pageKeys = Array.from(new Set(fieldsRaw.map((r) => r.page_key)));
    if (pageKeys.length === 0) return [];

    const sectionsRes = await sb
      .from("cms_sections")
      .select("page_key,section_key,section_type,is_active")
      .in("page_key", pageKeys);
    const sectionsRaw = (sectionsRes.data as RawSectionRow[] | null) ?? [];

    const pagesRes = await sb
      .from("cms_pages")
      .select("page_key,title_de,status,is_active,route_path")
      .in("page_key", pageKeys);
    const pagesRaw = (pagesRes.data as RawPageRow[] | null) ?? [];

    const sectionByKey = new Map<string, RawSectionRow>();
    for (const s of sectionsRaw) sectionByKey.set(`${s.page_key}::${s.section_key}`, s);
    const pageByKey = new Map<string, RawPageRow>();
    for (const p of pagesRaw) pageByKey.set(p.page_key, p);

    const parentTypeFor = (page_key: string, section_key: string): string | null => {
      const dot = section_key.lastIndexOf(".");
      if (dot <= 0) return null;
      const parentKey = section_key.slice(0, dot);
      return sectionByKey.get(`${page_key}::${parentKey}`)?.section_type ?? null;
    };

    // (page_key, section_key, field_key) → { de, en }
    const byTriple = new Map<string, { de: string | null; en: string | null }>();
    for (const r of fieldsRaw) {
      const k = `${r.page_key}::${r.section_key}::${r.field_key}`;
      const cur = byTriple.get(k) ?? { de: null, en: null };
      if (r.locale === "de") cur.de = r.value;
      else if (r.locale === "en") cur.en = r.value;
      byTriple.set(k, cur);
    }

    const rows: IconFieldRow[] = [];
    for (const [k, v] of byTriple.entries()) {
      const [page_key, section_key, field_key] = k.split("::");
      const sec = sectionByKey.get(`${page_key}::${section_key}`);
      const pg = pageByKey.get(page_key);
      rows.push({
        page_key,
        page_title_de: pg?.title_de ?? null,
        page_status: pg?.status ?? null,
        page_is_active: pg?.is_active ?? null,
        page_route_path: pg?.route_path ?? null,
        section_key,
        section_type: sec?.section_type ?? null,
        section_is_active: sec?.is_active ?? null,
        parent_section_type: parentTypeFor(page_key, section_key),
        field_key,
        value_de: v.de,
        value_en: v.en,
      });
    }
    rows.sort((a, b) =>
      a.page_key.localeCompare(b.page_key) ||
      a.section_key.localeCompare(b.section_key) ||
      a.field_key.localeCompare(b.field_key),
    );
    return rows;
  } catch {
    return [];
  }
}
