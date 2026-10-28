#!/usr/bin/env node
/**
 * build-renderer-path-map.mjs
 *
 * Erzeugt `src/features/admin/lib/rendererPathMap.generated.ts` — eine
 * read-only Tabelle `page_key -> { rendererPath, renderClass, status }`,
 * die im Admin als Diagnose-Hinweis neben dem fachlichen T-Code angezeigt
 * wird.
 *
 * Quellen (nicht verändert):
 *   - docs/04-betrieb/audit-snapshot/page-renderer-coverage.json
 *     (Feld `render_class`, `uses_generic_cms_page`, `uses_cms_body_renderer`,
 *      `is_registered_sonderseite`, `page_key`)
 *   - src/**\/routes.tsx (Pattern `CmsOnlyShell pageKey="..."`,
 *     `CmsProductSolutionShell pageKey="..."`)
 *
 * Erzeugt KEINE zweite Wahrheit über Inhalte, Reihenfolge oder Sichtbarkeit —
 * nur Renderer-Klassifikation für die Admin-Anzeige. Keine RPCs,
 * keine DB-Schreibwege.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const COVERAGE = path.join(
  ROOT,
  "docs/04-betrieb/audit-snapshot/page-renderer-coverage.json",
);
const OUT = path.join(
  ROOT,
  "src/features/admin/lib/rendererPathMap.generated.ts",
);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile() && e.name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

const shellByKey = new Map();
for (const f of walk(path.join(ROOT, "src"))) {
  const src = fs.readFileSync(f, "utf8");
  for (const m of src.matchAll(
    /<(CmsOnlyShell|CmsProductSolutionShell)\s+pageKey="([^"]+)"/g,
  )) {
    shellByKey.set(m[2], m[1]);
  }
}

const cov = JSON.parse(fs.readFileSync(COVERAGE, "utf8"));
const rows = [];
for (const p of cov.pages) {
  if (!p.page_key) continue;
  const shell = shellByKey.get(p.page_key) ?? null;
  let rendererPath;
  if (shell === "CmsOnlyShell") rendererPath = "cms_only_shell";
  else if (shell === "CmsProductSolutionShell")
    rendererPath = "product_solution_shell";
  else if (p.uses_generic_cms_page) rendererPath = "generic_cms_page";
  else if (p.render_class === "generisch_iteration")
    rendererPath = "eigene_komponente_generisch";
  else if (p.render_class === "teilweise_generisch")
    rendererPath = "eigene_komponente_teilweise";
  else rendererPath = "eigene_komponente";

  let status;
  if (
    rendererPath === "generic_cms_page" ||
    rendererPath === "cms_only_shell" ||
    rendererPath === "product_solution_shell" ||
    rendererPath === "eigene_komponente_generisch"
  )
    status = "standardisiert";
  else if (rendererPath === "eigene_komponente_teilweise") status = "gemischt";
  else status = "sonderlogik";
  // Explizit registrierte Sonderseiten (sonderseiten-register.json)
  // bleiben auch dann „sonderlogik", wenn sie generisch rendern.
  if (p.is_registered_sonderseite) status = "sonderlogik";


  rows.push({
    page_key: p.page_key,
    render_class: p.render_class,
    renderer_path: rendererPath,
    status,
  });
}

// Shell-Routen, die nicht über eigene Page-Datei laufen (z. B. T05
// Produktlösungen, T17 Service-Subpages), sind im Coverage-Report nicht
// enthalten — wir ergänzen sie hier direkt aus der Shell-Erkennung.
const knownKeys = new Set(rows.map((r) => r.page_key));
for (const [key, shell] of shellByKey) {
  if (knownKeys.has(key)) continue;
  const renderer_path =
    shell === "CmsOnlyShell" ? "cms_only_shell" : "product_solution_shell";
  rows.push({
    page_key: key,
    render_class: "shell_route_inline",
    renderer_path,
    status: "standardisiert",
  });
}


rows.sort((a, b) => a.page_key.localeCompare(b.page_key));

const ts = `// AUTO-GENERATED via scripts/admin/build-renderer-path-map.mjs
// Quelle: docs/04-betrieb/audit-snapshot/page-renderer-coverage.json + src/**/routes.tsx
// Read-only Diagnose-Tabelle für die Admin-Anzeige (T-Code vs Renderer-Pfad).
// NICHT von Hand bearbeiten. Regenerieren:
//   node scripts/admin/build-renderer-path-map.mjs
//
// Stand: ${new Date().toISOString()}

export type RendererPath =
  | "generic_cms_page"
  | "cms_only_shell"
  | "product_solution_shell"
  | "eigene_komponente_generisch"
  | "eigene_komponente_teilweise"
  | "eigene_komponente";

export type RendererStatus = "standardisiert" | "gemischt" | "sonderlogik";

export interface RendererPathEntry {
  page_key: string;
  render_class: string;
  renderer_path: RendererPath;
  status: RendererStatus;
}

export const RENDERER_PATH_MAP: Record<string, RendererPathEntry> = {
${rows
  .map(
    (r) =>
      `  ${JSON.stringify(r.page_key)}: { page_key: ${JSON.stringify(
        r.page_key,
      )}, render_class: ${JSON.stringify(r.render_class)}, renderer_path: ${JSON.stringify(
        r.renderer_path,
      )}, status: ${JSON.stringify(r.status)} },`,
  )
  .join("\n")}
};
`;

fs.writeFileSync(OUT, ts);
console.log(`wrote ${OUT} (${rows.length} pages)`);
