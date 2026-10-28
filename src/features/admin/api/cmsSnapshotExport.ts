/**
 * CMS-Light Master-Snapshot v2 (read-only).
 *
 * Erzeugt ein redaktionelles Übergabe-/Sicherungsbundle als ZIP unter
 * Lovable-Cloud-Bedingungen. Strikt read-only:
 * - nur `select(...)` über den CMS-Light-Wrapper (`@/lib/cmsSupabase/client`)
 * - keine neue RPC, keine SECURITY DEFINER, keine Edge Function
 * - keine service_role, keine Secrets
 * - keine Binärbilder, kein Live-DDL
 * - keine Produktdatenbank
 *
 * RLS-Filter:
 * Der Export bleibt RLS-gefiltert (public/aktive Inhalte; keine Drafts,
 * keine inaktiven/archivierten Zeilen). Filtermodus wird im UI, im README
 * und im manifest.json als `filter_mode: "rls_public_only"` ausgewiesen.
 *
 * Achtung: Dies ist KEIN vollständiges Datenbank-Backup. Bilder müssen
 * separat über `public_url` / `storage_path` aus der Asset-Downloadliste
 * gesichert werden.
 */

import JSZip from "jszip";

export const SNAPSHOT_TABLES = [
  "cms_pages",
  "cms_sections",
  "cms_section_fields",
  "cms_assets",
  "cms_navigation_nodes",
  "cms_admin_editable_fields",
] as const;

export type SnapshotTable = (typeof SNAPSHOT_TABLES)[number];

export type SnapshotTableInfo = {
  table: SnapshotTable;
  rowCount: number;
  error: string | null;
};

export type SnapshotPreview = {
  tables: SnapshotTableInfo[];
  generatedAt: string | null;
};

export const FILTER_MODE = "rls_public_only" as const;

export const FILTER_EXPLANATION =
  "Export erfolgt über den anonymen CMS-Light-Lesepfad. RLS-Policies lassen " +
  "nur öffentliche/aktive Inhalte sichtbar werden. Drafts, inaktive und " +
  "archivierte Zeilen sind NICHT enthalten. Vollständige DB-Stände lassen " +
  "sich unter Lovable-Cloud-Bedingungen ohne service_role nicht abziehen.";

/**
 * Bekannte DB-total-Werte (Stand: aktuelle Untersuchung der RLS-Differenz).
 * Werden im Manifest gegen die exportierten Counts gestellt, damit
 * Differenzen transparent sind. `null` = unbekannt.
 */
const KNOWN_DB_TOTALS: Record<SnapshotTable, number | null> = {
  cms_pages: 118,
  cms_sections: 1455,
  cms_section_fields: 15558,
  cms_assets: 739,
  cms_navigation_nodes: 125,
  cms_admin_editable_fields: 19130,
};

const DIFF_REASONS: Record<SnapshotTable, string> = {
  cms_pages: "RLS blendet Drafts/inaktive Seiten aus.",
  cms_sections: "RLS blendet inaktive Sektionen und Sektionen auf nicht-öffentlichen Seiten aus.",
  cms_section_fields: "RLS liefert nur Felder aktiver Sektionen auf öffentlichen Seiten.",
  cms_assets: "RLS blendet inaktive Assets und Slots ohne aktive Sektion aus.",
  cms_navigation_nodes: "RLS blendet inaktive Nodes aus.",
  cms_admin_editable_fields: "RLS = USING(true): vollständig exportierbar.",
};

async function getClient() {
  const mod = await import("@/lib/cmsSupabase/client");
  return mod.getCmsSupabaseClient();
}

// Supabase begrenzt Range standardmäßig; wir paginieren in 1000er-Blöcken.
const PAGE_SIZE = 1000;

async function fetchAllRows(
  table: SnapshotTable,
): Promise<{ rows: unknown[]; error: string | null }> {
  try {
    const supabase = await getClient();
    const all: unknown[] = [];
    let from = 0;
    for (let i = 0; i < 1000; i++) {
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await (supabase as unknown as {
        from: (t: string) => {
          select: (cols: string) => {
            range: (
              a: number,
              b: number,
            ) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
          };
        };
      })
        .from(table)
        .select("*")
        .range(from, to);
      if (error) return { rows: all, error: error.message };
      const chunk = data ?? [];
      all.push(...chunk);
      if (chunk.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
    return { rows: all, error: null };
  } catch (e) {
    return { rows: [], error: e instanceof Error ? e.message : "unknown" };
  }
}

export async function previewSnapshotCounts(): Promise<SnapshotPreview> {
  const tables: SnapshotTableInfo[] = [];
  for (const t of SNAPSHOT_TABLES) {
    try {
      const supabase = await getClient();
      const { count, error } = await (supabase as unknown as {
        from: (t: string) => {
          select: (
            cols: string,
            opts: { count: "exact"; head: true },
          ) => Promise<{ count: number | null; error: { message: string } | null }>;
        };
      })
        .from(t)
        .select("*", { count: "exact", head: true });
      tables.push({
        table: t,
        rowCount: count ?? 0,
        error: error ? error.message : null,
      });
    } catch (e) {
      tables.push({
        table: t,
        rowCount: 0,
        error: e instanceof Error ? e.message : "unknown",
      });
    }
  }
  return { tables, generatedAt: new Date().toISOString() };
}

export type MigrationFile = { name: string; content: string };

export function loadMigrationFiles(): MigrationFile[] {
  try {
    const mods = import.meta.glob("/supabase/migrations/*.sql", {
      eager: true,
      query: "?raw",
      import: "default",
    }) as Record<string, string>;
    return Object.entries(mods)
      .map(([path, content]) => ({
        name: path.split("/").pop() ?? path,
        content: typeof content === "string" ? content : String(content ?? ""),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

type AssetIndexRow = {
  page_key: string | null;
  section_key: string | null;
  field_key: string | null;
  storage_path: string | null;
  public_url: string | null;
  viewport: string | null;
  alt_de: string | null;
  alt_en: string | null;
  is_active: boolean | null;
};

function buildAssetIndex(assets: unknown[]): AssetIndexRow[] {
  return assets.map((a) => {
    const r = a as Record<string, unknown>;
    return {
      page_key: (r.page_key as string) ?? null,
      section_key: (r.section_key as string) ?? null,
      field_key: (r.field_key as string) ?? null,
      storage_path: (r.storage_path as string) ?? null,
      public_url: (r.public_url as string) ?? null,
      viewport: (r.viewport as string) ?? null,
      alt_de: ((r.alt_de as string) ?? (r.alt_text_de as string)) ?? null,
      alt_en: ((r.alt_en as string) ?? (r.alt_text_en as string)) ?? null,
      is_active: (r.is_active as boolean) ?? null,
    };
  });
}

/* -------------------------------------------------------------------------- */
/*  CSV-Helfer (UTF-8 BOM, Semikolon, Excel-freundlich)                       */
/* -------------------------------------------------------------------------- */

const BOM = "\uFEFF";

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = typeof value === "string" ? value : JSON.stringify(value);
  // Zeilenumbrüche entschärfen, damit Excel sauber liest
  s = s.replace(/\r?\n/g, " ⏎ ");
  // Doppelte Quotes verdoppeln, Wert in Quotes packen
  s = s.replace(/"/g, '""');
  return `"${s}"`;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const head = headers.map(csvEscape).join(";");
  const body = rows.map((r) => r.map(csvEscape).join(";")).join("\n");
  return BOM + head + "\n" + body + "\n";
}

function getStr(r: Record<string, unknown>, key: string): string | null {
  const v = r[key];
  return v === null || v === undefined ? null : String(v);
}

export function buildCsvFiles(data: {
  pages: unknown[];
  sections: unknown[];
  fields: unknown[];
  assets: unknown[];
  nav: unknown[];
}): Record<string, string> {
  const pages = data.pages as Record<string, unknown>[];
  const sections = data.sections as Record<string, unknown>[];
  const fields = data.fields as Record<string, unknown>[];
  const assets = data.assets as Record<string, unknown>[];
  const nav = data.nav as Record<string, unknown>[];

  // 1) cms_pages_overview.csv
  const pagesCsv = toCsv(
    [
      "page_no",
      "page_key",
      "route_path",
      "page_type",
      "title_de",
      "title_en",
      "status",
      "is_active",
      "updated_at",
    ],
    pages
      .slice()
      .sort((a, b) => Number(a.page_no ?? 0) - Number(b.page_no ?? 0))
      .map((p) => [
        p.page_no ?? "",
        p.page_key ?? "",
        p.route_path ?? "",
        p.page_type ?? "",
        p.title_de ?? "",
        p.title_en ?? "",
        p.status ?? "",
        p.is_active ?? "",
        p.updated_at ?? "",
      ]),
  );

  // 2) cms_structure_flat.csv (Seite → Sektionen, nach sort_order)
  const sectionsSorted = sections
    .slice()
    .sort((a, b) => {
      const k = String(a.page_key ?? "").localeCompare(String(b.page_key ?? ""));
      if (k !== 0) return k;
      return Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
    });
  const structureCsv = toCsv(
    [
      "page_key",
      "page_no",
      "route_path",
      "section_no",
      "section_uid",
      "section_key",
      "section_type",
      "sort_order",
      "is_active",
    ],
    sectionsSorted.map((s) => {
      const page = pages.find((p) => p.page_key === s.page_key);
      return [
        s.page_key ?? "",
        page?.page_no ?? "",
        page?.route_path ?? "",
        s.section_no ?? "",
        s.section_uid ?? "",
        s.section_key ?? "",
        s.section_type ?? "",
        s.sort_order ?? "",
        s.is_active ?? "",
      ];
    }),
  );

  // 3) cms_assets_overview.csv
  const assetsCsv = toCsv(
    [
      "asset_no",
      "page_key",
      "section_key",
      "field_key",
      "asset_role",
      "viewport",
      "locale",
      "storage_path",
      "public_url",
      "alt_de",
      "alt_en",
      "is_active",
      "sort_order",
      "updated_at",
    ],
    assets
      .slice()
      .sort((a, b) => Number(a.asset_no ?? 0) - Number(b.asset_no ?? 0))
      .map((a) => [
        a.asset_no ?? "",
        a.page_key ?? "",
        a.section_key ?? "",
        a.field_key ?? "",
        a.asset_role ?? "",
        a.viewport ?? "",
        a.locale ?? "",
        a.storage_path ?? "",
        a.public_url ?? "",
        a.alt_de ?? a.alt_text_de ?? "",
        a.alt_en ?? a.alt_text_en ?? "",
        a.is_active ?? "",
        a.sort_order ?? "",
        a.updated_at ?? "",
      ]),
  );

  // 4) cms_field_matrix.csv (eine Zeile je page/section/field, DE+EN nebeneinander)
  type FieldKey = string;
  const matrix = new Map<
    FieldKey,
    {
      page_key: string;
      section_key: string;
      field_key: string;
      de: string | null;
      en: string | null;
    }
  >();
  for (const f of fields) {
    const key = `${f.page_key}::${f.section_key}::${f.field_key}`;
    const entry = matrix.get(key) ?? {
      page_key: String(f.page_key ?? ""),
      section_key: String(f.section_key ?? ""),
      field_key: String(f.field_key ?? ""),
      de: null,
      en: null,
    };
    const val = getStr(f, "value");
    if (f.locale === "de") entry.de = val;
    else if (f.locale === "en") entry.en = val;
    matrix.set(key, entry);
  }
  const matrixRows = Array.from(matrix.values()).sort((a, b) => {
    const k = a.page_key.localeCompare(b.page_key);
    if (k !== 0) return k;
    const s = a.section_key.localeCompare(b.section_key);
    if (s !== 0) return s;
    return a.field_key.localeCompare(b.field_key);
  });
  const matrixCsv = toCsv(
    ["page_key", "section_key", "field_key", "value_de", "value_en"],
    matrixRows.map((m) => [m.page_key, m.section_key, m.field_key, m.de ?? "", m.en ?? ""]),
  );

  // 5) cms_navigation_tree.csv
  const navById = new Map<string, Record<string, unknown>>();
  for (const n of nav) {
    const id = n.id as string | undefined;
    if (id) navById.set(id, n);
  }
  const pathFor = (n: Record<string, unknown>): string => {
    const parts: string[] = [];
    let cur: Record<string, unknown> | undefined = n;
    const seen = new Set<string>();
    while (cur) {
      const key = String(cur.node_key ?? "");
      if (seen.has(key)) break;
      seen.add(key);
      parts.unshift(key);
      const pid = cur.parent_id as string | null | undefined;
      cur = pid ? navById.get(pid) : undefined;
    }
    return parts.join(" / ");
  };
  const navSorted = nav.slice().sort((a, b) => {
    const k = String(a.nav_area ?? "").localeCompare(String(b.nav_area ?? ""));
    if (k !== 0) return k;
    return Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
  });
  const navCsv = toCsv(
    [
      "node_no",
      "nav_area",
      "path",
      "node_key",
      "node_type",
      "page_key",
      "route_path",
      "external_url",
      "label_de",
      "label_en",
      "sort_order",
      "is_active",
      "show_in_public_nav",
    ],
    navSorted.map((n) => [
      n.node_no ?? "",
      n.nav_area ?? "",
      pathFor(n),
      n.node_key ?? "",
      n.node_type ?? "",
      n.page_key ?? "",
      n.route_path ?? "",
      n.external_url ?? "",
      n.label_de ?? n.label ?? "",
      n.label_en ?? "",
      n.sort_order ?? "",
      n.is_active ?? "",
      n.show_in_public_nav ?? "",
    ]),
  );

  return {
    "cms_pages_overview.csv": pagesCsv,
    "cms_structure_flat.csv": structureCsv,
    "cms_assets_overview.csv": assetsCsv,
    "cms_field_matrix.csv": matrixCsv,
    "cms_navigation_tree.csv": navCsv,
  };
}

/* -------------------------------------------------------------------------- */
/*  Asset-Downloadlisten                                                      */
/* -------------------------------------------------------------------------- */

function buildAssetDownloadFiles(assetIndex: AssetIndexRow[]): Record<string, string> {
  const urls = assetIndex
    .map((a) => a.public_url)
    .filter((u): u is string => typeof u === "string" && u.length > 0);
  const uniqueUrls = Array.from(new Set(urls)).sort();

  const txt = uniqueUrls.join("\n") + "\n";

  const csv = toCsv(
    [
      "page_key",
      "section_key",
      "field_key",
      "viewport",
      "is_active",
      "alt_de",
      "alt_en",
      "storage_path",
      "public_url",
    ],
    assetIndex.map((a) => [
      a.page_key ?? "",
      a.section_key ?? "",
      a.field_key ?? "",
      a.viewport ?? "",
      a.is_active ?? "",
      a.alt_de ?? "",
      a.alt_en ?? "",
      a.storage_path ?? "",
      a.public_url ?? "",
    ]),
  );

  const md = `# Bilder sichern (manueller Schritt)

Dieses Bundle enthält **bewusst keine Binärbilder**. Es liefert nur die
Indexlisten, mit denen die Bilder aus dem Storage-Bucket \`cms-assets\`
nachträglich heruntergeladen werden können.

## Was hier liegt

- \`asset-download-list.txt\` — eine \`public_url\` pro Zeile (eindeutig)
- \`asset-download-list.csv\` — vollständige Spalten je Bild-Slot
- \`asset-index.json\` — strukturierte Form (identisch zur Root-Datei)

## Vorschlag: wget

\`\`\`bash
wget -i asset-download-list.txt -P ./cms-assets-mirror --content-disposition
\`\`\`

## Vorschlag: curl (parallel, robust)

\`\`\`bash
xargs -a asset-download-list.txt -P 8 -I{} \\
  curl -fSL -O --create-dirs --output-dir ./cms-assets-mirror "{}"
\`\`\`

## Grenzen

- Nur \`is_active = true\` Slots auf öffentlichen Seiten sind enthalten
  (RLS-Filter, siehe \`manifest.json\` → \`filter_mode\`).
- Storage-Pfade (\`storage_path\`) sind informativ; der Download erfolgt
  über die signierte \`public_url\`.
- Kein vollständiges Storage-Backup. Verwaiste oder inaktive Dateien
  bleiben außen vor.
`;

  return {
    "asset-download-list.txt": txt,
    "asset-download-list.csv": csv,
    "DOWNLOAD_BILDER.md": md,
  };
}

/* -------------------------------------------------------------------------- */
/*  Contract / Schema / Validation                                            */
/* -------------------------------------------------------------------------- */

async function loadSectionTypesContract(): Promise<unknown> {
  try {
    const mod = await import("@/features/cms/contract/sectionTypes");
    return (mod as { SECTION_TYPE_CONTRACTS: unknown }).SECTION_TYPE_CONTRACTS;
  } catch {
    return {};
  }
}

const TABLES_CLASSIFICATION = {
  generated_at_note: "Klassifikation der 6 CMS-Light-Tabellen.",
  tables: [
    {
      table: "cms_pages",
      role: "Seitenkopf (Slug, Status, Route, Titel).",
      rls_summary: "anon read nur wenn status='published' AND is_active=true.",
      writable_via: "rpc_admin_* (Seiten-Pflege)",
    },
    {
      table: "cms_sections",
      role: "Sektions-Reihenfolge und section_type je Seite.",
      rls_summary: "anon read nur wenn is_active=true AND Seite public.",
      writable_via: "rpc_admin_* (Sektions-Pflege, sort_order)",
    },
    {
      table: "cms_section_fields",
      role: "Mehrsprachige Textfelder (de/en) je Sektion.",
      rls_summary: "anon read nur Felder aktiver Sektionen auf öffentlichen Seiten.",
      writable_via: "rpc_admin_update_section_field",
    },
    {
      table: "cms_assets",
      role: "Bild-Slots mit storage_path/public_url, Viewport, Alt-Texten.",
      rls_summary: "anon read nur is_active=true Slots mit aktiver Sektion.",
      writable_via: "rpc_admin_* (Asset-Pflege)",
    },
    {
      table: "cms_navigation_nodes",
      role: "Hauptnav, Footer, Meta, Persona, Footer-Spalten (nav_area).",
      rls_summary: "anon read nur is_active=true.",
      writable_via: "rpc_admin_* (Navigations-Pflege)",
    },
    {
      table: "cms_admin_editable_fields",
      role: "Whitelist: welches Feld ist im Admin pflegbar.",
      rls_summary: "anon read USING(true) — vollständig sichtbar.",
      writable_via: "rpc_admin_* (Whitelist-Pflege)",
    },
  ],
} as const;

const KNOWN_LIMITS_MD = `# Bekannte Grenzen dieses Master-Snapshots

## Was NICHT enthalten ist

- **Live-DDL**: keine \`pg_dump\`-Ausgabe, keine \`CREATE TABLE\`-Wahrheit
  aus der laufenden DB. Stattdessen liegen die Migrationsdateien aus dem
  Build unter \`migrations/\`.
- **Drafts / inaktive / archivierte Inhalte**: RLS blendet sie für den
  anonymen Lesepfad aus. Filtermodus = \`rls_public_only\`.
- **Binärbilder**: kein Bild liegt im ZIP. Nur \`public_url\` /
  \`storage_path\` über die Asset-Downloadlisten.
- **auth / storage / vault / realtime**: Supabase-Reserved-Schemas werden
  nicht exportiert.
- **Secrets**: keine API-Keys, kein \`service_role\`, keine \`.env\`-Werte.
- **Produktdatenbank** (\`ncvxzkwazdemivdolpzc\`): vollständig unberührt.

## Was das bedeutet

Ein bit-genauer Restore ist daraus **nicht** möglich. Das Bundle ist als
Übergabe- und Sicherungsstand gedacht, der von Menschen geprüft und
notfalls für eine teilweise Wiederherstellung verwendet werden kann.

## Sichere Option für vollständigen Export

Vollständige Sicherungen aller Zeilen (inkl. Drafts) sind unter
Lovable-Cloud-Bedingungen ohne neue Schreib-/Definer-RPC nicht möglich.
Eigene PostgreSQL-Hosting-Optionen siehe Lovable-Doku
„Deploying and hosting outside Lovable Cloud".
`;

function inferSchemaFromRows(
  rows: unknown[],
  table: SnapshotTable,
): { table: string; row_count: number; columns: Array<{ name: string; sample_types: string[]; nullable_observed: boolean }> } {
  const colMap = new Map<string, { types: Set<string>; nullable: boolean }>();
  for (const row of rows.slice(0, 200)) {
    if (!row || typeof row !== "object") continue;
    for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
      const entry = colMap.get(k) ?? { types: new Set<string>(), nullable: false };
      if (v === null || v === undefined) entry.nullable = true;
      else entry.types.add(Array.isArray(v) ? "array" : typeof v);
      colMap.set(k, entry);
    }
  }
  return {
    table,
    row_count: rows.length,
    columns: Array.from(colMap.entries()).map(([name, info]) => ({
      name,
      sample_types: Array.from(info.types).sort(),
      nullable_observed: info.nullable,
    })),
  };
}

const VALIDATION_SQL = `-- Validation-Checks für CMS-Light Master-Snapshot
-- Manuell gegen die DB ausführen (z. B. im Admin/SQL-Tool), um die
-- exportierten Counts gegen den Live-Stand zu vergleichen.

-- 1) Roh-Counts
SELECT 'cms_pages'                    AS tbl, COUNT(*) AS rows FROM public.cms_pages
UNION ALL SELECT 'cms_sections',                COUNT(*) FROM public.cms_sections
UNION ALL SELECT 'cms_section_fields',          COUNT(*) FROM public.cms_section_fields
UNION ALL SELECT 'cms_assets',                  COUNT(*) FROM public.cms_assets
UNION ALL SELECT 'cms_navigation_nodes',        COUNT(*) FROM public.cms_navigation_nodes
UNION ALL SELECT 'cms_admin_editable_fields',   COUNT(*) FROM public.cms_admin_editable_fields;

-- 2) Public-sichtbar (entspricht ungefähr Snapshot-Counts)
SELECT COUNT(*) AS public_pages
FROM public.cms_pages
WHERE status = 'published' AND is_active = true;

SELECT COUNT(*) AS active_sections_on_public_pages
FROM public.cms_sections s
WHERE s.is_active = true
  AND EXISTS (SELECT 1 FROM public.cms_pages p
              WHERE p.page_key = s.page_key
                AND p.status = 'published' AND p.is_active = true);

-- 3) Drafts (nicht im Snapshot)
SELECT page_key, status, is_active
FROM public.cms_pages
WHERE NOT (status = 'published' AND is_active = true)
ORDER BY page_key;
`;

/* -------------------------------------------------------------------------- */
/*  README / HANDOVER / RESTORE                                               */
/* -------------------------------------------------------------------------- */

function buildReadme(filterMode: string): string {
  return `CMS-Light Master-Snapshot v2
============================

Dies ist KEIN vollständiges Datenbank-Backup, sondern ein redaktionelles
Übergabe- und Sicherungsbundle ("Master-Snapshot").

Filtermodus
-----------
${filterMode} — enthält nur öffentliche/aktive CMS-Inhalte (RLS-gefiltert).
Drafts, inaktive und archivierte Zeilen sind NICHT enthalten.

Inhalt
------
- tables/*.json           Roh-Inhalt der 6 CMS-Light-Tabellen (RLS-gefiltert)
- csv/*.csv               Excel-/CSV-Strukturansichten (UTF-8 BOM, Semikolon)
- assets/                 Asset-Downloadlisten (KEINE Binärbilder)
- migrations/*.sql        Migrationsdateien aus dem Build (falls verfügbar)
- contract/               sectionTypes-Vertrag, Tabellen-Klassifikation, Grenzen
- schema/                 Aus den Daten abgeleitetes Schema (inferred, not authoritative)
- validation/             SQL-Checks und erwartete Counts
- asset-index.json        Bild-Slot-Index (root)
- manifest.json           Zeitstempel, Counts, Filtermodus, Differenzen
- HANDOVER.md             Übergabe-Hinweise
- RESTORE_LIMITS.md       Was geht / was geht nicht beim Restore
- README.txt              Diese Datei

NICHT enthalten
---------------
- Binärbilder (separat via assets/asset-download-list.txt nachladen)
- Live-DDL (kein pg_dump)
- Drafts / inaktive / archivierte Inhalte
- auth / storage / vault / realtime
- Secrets, service_role
- Produktdatenbank
`;
}

const HANDOVER_MD = `# Handover — CMS-Light Master-Snapshot v2

## Zweck

Übergabe- und Sicherungsstand des CMS-Light unter Lovable-Cloud-Bedingungen.
Inhalte sind hier für Menschen prüfbar (CSV/Excel), für Maschinen lesbar
(JSON) und für eine spätere Migration vorbereitet (Migrationen + Contract).

## Reihenfolge zum Sichten

1. \`README.txt\` lesen — Filtermodus und Grenzen verstehen.
2. \`manifest.json\` öffnen — Counts und Differenzen prüfen.
3. \`csv/cms_pages_overview.csv\` in Excel öffnen — Seiten-Bestand.
4. \`csv/cms_structure_flat.csv\` — Seiten → Sektions-Reihenfolge.
5. \`csv/cms_field_matrix.csv\` — DE/EN-Werte je Feld.
6. \`csv/cms_assets_overview.csv\` + \`assets/DOWNLOAD_BILDER.md\` — Bilder.
7. \`contract/known-limits.md\` und \`RESTORE_LIMITS.md\` — Grenzen.

## Bilder nachladen

Siehe \`assets/DOWNLOAD_BILDER.md\`. Kurzform mit \`wget\`:

\`\`\`bash
wget -i assets/asset-download-list.txt -P ./cms-assets-mirror
\`\`\`

## Was dieses Bundle NICHT ersetzt

- Echtes DB-Backup (\`pg_dump\`) — unter Lovable Cloud aktuell nicht möglich.
- Auth-/Storage-/Vault-Sicherung.
- Produktdatenbank-Sicherung.
`;

const RESTORE_LIMITS_MD = `# Restore-Grenzen

## Was geht

- **Inhaltliche Audits**: anhand der JSON-/CSV-Dateien lässt sich der
  öffentlich sichtbare CMS-Stand rekonstruieren und prüfen.
- **Teilweiser Re-Import**: einzelne Feldwerte können über die bestehenden
  Admin-RPCs (\`rpc_admin_update_section_field\` etc.) zurückgespielt werden.
- **Bilder**: über die Asset-Downloadliste lassen sich alle aktiven Bilder
  neu beschaffen und in einen neuen Storage-Bucket spielen.

## Was NICHT geht

- **Bit-genauer Restore** des Live-Standes inklusive Drafts und inaktiver
  Inhalte. Diese sind im Snapshot nicht enthalten (RLS-Filter).
- **Schema-Restore** auf eine leere DB. Es liegen die Migrations-Dateien aus
  dem Build vor, aber kein Live-DDL-Snapshot.
- **auth/storage/vault**-Restore — diese Bereiche sind explizit ausgeschlossen.

## Empfohlene Strategie

1. CMS-Light-Schema über die Migrationen unter \`migrations/\` neu aufbauen.
2. Inhalte über die JSON-Dumps in \`tables/\` einspielen (über RPCs oder
   eine kontrollierte Server-Routine, **nicht** aus dem Frontend).
3. Bilder über \`assets/asset-download-list.txt\` neu in den Bucket laden
   und \`storage_path\` / \`public_url\` neu setzen.
4. Whitelist (\`cms_admin_editable_fields\`) zuletzt einspielen.
`;

/* -------------------------------------------------------------------------- */
/*  Hauptbau                                                                  */
/* -------------------------------------------------------------------------- */

export type SnapshotResult = {
  blob: Blob;
  fileName: string;
  manifest: {
    bundle: string;
    bundle_version: string;
    filter_mode: string;
    filter_explanation: string;
    generated_at: string;
    table_counts: Record<string, number>;
    known_db_totals: Record<string, number | null>;
    diff_reasons: Record<string, string>;
    asset_index_count: number;
    migration_files: number;
    errors: Record<string, string>;
    notes: string[];
  };
};

export async function buildContentSnapshotZip(): Promise<SnapshotResult> {
  const zip = new JSZip();
  const generatedAt = new Date().toISOString();
  const tableCounts: Record<string, number> = {};
  const errors: Record<string, string> = {};

  const tablesFolder = zip.folder("tables");
  const rowsByTable: Partial<Record<SnapshotTable, unknown[]>> = {};

  for (const t of SNAPSHOT_TABLES) {
    const { rows, error } = await fetchAllRows(t);
    tableCounts[t] = rows.length;
    rowsByTable[t] = rows;
    if (error) errors[t] = error;
    tablesFolder?.file(`${t}.json`, JSON.stringify(rows, null, 2));
  }

  // Asset-Index (root, beibehalten für Rückwärtskompatibilität)
  const assetIndex = buildAssetIndex(rowsByTable.cms_assets ?? []);
  zip.file("asset-index.json", JSON.stringify(assetIndex, null, 2));

  // CSV-Ansichten
  const csvFolder = zip.folder("csv");
  const csvFiles = buildCsvFiles({
    pages: rowsByTable.cms_pages ?? [],
    sections: rowsByTable.cms_sections ?? [],
    fields: rowsByTable.cms_section_fields ?? [],
    assets: rowsByTable.cms_assets ?? [],
    nav: rowsByTable.cms_navigation_nodes ?? [],
  });
  for (const [name, content] of Object.entries(csvFiles)) {
    csvFolder?.file(name, content);
  }

  // Asset-Downloadlisten
  const assetsFolder = zip.folder("assets");
  assetsFolder?.file("asset-index.json", JSON.stringify(assetIndex, null, 2));
  const dlFiles = buildAssetDownloadFiles(assetIndex);
  for (const [name, content] of Object.entries(dlFiles)) {
    assetsFolder?.file(name, content);
  }

  // Migrationen
  const migrations = loadMigrationFiles();
  const migFolder = zip.folder("migrations");
  for (const m of migrations) {
    migFolder?.file(m.name, m.content);
  }

  // Contract
  const contractFolder = zip.folder("contract");
  const contractData = await loadSectionTypesContract();
  contractFolder?.file("sectionTypes.json", JSON.stringify(contractData, null, 2));
  contractFolder?.file(
    "tables-classification.json",
    JSON.stringify(TABLES_CLASSIFICATION, null, 2),
  );
  contractFolder?.file("known-limits.md", KNOWN_LIMITS_MD);

  // Schema (inferred)
  const schemaFolder = zip.folder("schema");
  const schemaSnapshot = {
    generated_at: generatedAt,
    inferred: true,
    not_authoritative: true,
    note:
      "Aus den JSON-Daten abgeleitetes Spaltinventar. KEIN Live-DDL und keine " +
      "Quelle der Wahrheit für Typen, Constraints oder Defaults.",
    tables: SNAPSHOT_TABLES.map((t) =>
      inferSchemaFromRows(rowsByTable[t] ?? [], t),
    ),
  };
  schemaFolder?.file("schema-snapshot.json", JSON.stringify(schemaSnapshot, null, 2));

  // Validation
  const validationFolder = zip.folder("validation");
  validationFolder?.file("validation-checks.sql", VALIDATION_SQL);
  validationFolder?.file(
    "expected-counts.json",
    JSON.stringify(
      {
        generated_at: generatedAt,
        filter_mode: FILTER_MODE,
        snapshot_counts: tableCounts,
        known_db_totals: KNOWN_DB_TOTALS,
        diff_reasons: DIFF_REASONS,
      },
      null,
      2,
    ),
  );

  // Manifest + README + Handover + Restore
  const manifest: SnapshotResult["manifest"] = {
    bundle: "CMS-Light Master-Snapshot",
    bundle_version: "v2",
    filter_mode: FILTER_MODE,
    filter_explanation: FILTER_EXPLANATION,
    generated_at: generatedAt,
    table_counts: tableCounts,
    known_db_totals: KNOWN_DB_TOTALS,
    diff_reasons: DIFF_REASONS,
    asset_index_count: assetIndex.length,
    migration_files: migrations.length,
    errors,
    notes: [
      "Kein vollständiges DB-Backup.",
      "Keine Binärbilder enthalten.",
      "Keine Drafts / inaktiven / archivierten Inhalte (RLS-gefiltert).",
      "Kein Live-DDL, keine Secrets, keine Produktdatenbank.",
      "Schema/* ist inferred und nicht autoritativ.",
    ],
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  zip.file("README.txt", buildReadme(FILTER_MODE));
  zip.file("HANDOVER.md", HANDOVER_MD);
  zip.file("RESTORE_LIMITS.md", RESTORE_LIMITS_MD);

  const blob = await zip.generateAsync({ type: "blob" });
  const stamp = generatedAt.replace(/[:.]/g, "-");
  return {
    blob,
    fileName: `cms-light-master-snapshot-v2-${stamp}.zip`,
    manifest,
  };
}

export function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
