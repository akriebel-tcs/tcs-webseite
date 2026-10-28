#!/usr/bin/env node
/**
 * Etappe E — `cms-light-navigation-export-1`.
 *
 * Liest die aktuelle CMS-Light-Navigation aus der DB (RPC
 * `rpc_admin_read_navigation_nodes`) und schreibt einen versionierbaren
 * TypeScript-Snapshot nach `src/navigation/navigation.generated.ts`.
 *
 * Zweck: Portabilitäts-Sicherheitsnetz. Der DB-Stand ist jederzeit
 * als Code einfrierbar, deploy-bar und in einer leeren Postgres
 * via Seed-Skript wieder-herstellbar — auch ohne Supabase.
 *
 * Schreibt NICHT in die DB. Ändert NICHT die Live-Navigation.
 * Das generierte Modul wird (noch) nirgends importiert.
 *
 * Nutzung:
 *   SUPABASE_URL=...  SUPABASE_PUBLISHABLE_KEY=... \
 *     node scripts/cms/export-navigation.mjs
 *
 *   Fallback-Reihenfolge der Env-Variablen:
 *     URL : SUPABASE_URL → VITE_SUPABASE_URL
 *     KEY : SUPABASE_PUBLISHABLE_KEY → VITE_SUPABASE_PUBLISHABLE_KEY
 *           → SUPABASE_ANON_KEY
 */
import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..", "..");
const OUT_FILE = resolve(
  PROJECT_ROOT,
  "src/navigation/navigation.generated.ts",
);

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "[export-navigation] Fehlende Env: SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

console.log("[export-navigation] Lese RPC rpc_admin_read_navigation_nodes …");
const { data, error } = await supabase.rpc("rpc_admin_read_navigation_nodes");
if (error) {
  console.error("[export-navigation] RPC-Fehler:", error.message);
  process.exit(2);
}
const nodes = Array.isArray(data) ? data : [];
console.log(`[export-navigation] ${nodes.length} Knoten geladen.`);

// Stabile Sortierung für reproduzierbare Diffs.
nodes.sort((a, b) => {
  if (a.nav_area !== b.nav_area) return a.nav_area.localeCompare(b.nav_area);
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return (a.node_key || "").localeCompare(b.node_key || "");
});

const generatedAt = new Date().toISOString();
const json = JSON.stringify(nodes, null, 2);

const banner = `/**
 * AUTOGENERIERT — NICHT MANUELL EDITIEREN.
 *
 * Quelle : Supabase RPC \`rpc_admin_read_navigation_nodes()\`
 * Skript : scripts/cms/export-navigation.mjs
 * Stand  : ${generatedAt}
 * Knoten : ${nodes.length}
 *
 * Dieses Modul ist ein Snapshot des CMS-Light-Navigationsstands und
 * dient als Portabilitäts-Sicherheitsnetz (Etappe E,
 * \`cms-light-navigation-export-1\`). Es wird derzeit NICHT von der
 * Live-Navigation verwendet — diese liest weiterhin aus
 * \`src/navigation/mainNavigation.ts\` etc.
 */
`;

const ts = `${banner}
export type NavArea = "main" | "meta" | "footer" | "footer_bottom";

export interface GeneratedNavigationNode {
  id: string;
  nav_area: NavArea;
  node_key: string;
  parent_id: string | null;
  parent_node_key: string | null;
  page_key: string | null;
  label: string | null;
  label_de: string | null;
  label_en: string | null;
  description_de: string | null;
  description_en: string | null;
  node_type: string | null;
  external_url: string | null;
  route_path: string | null;
  sort_order: number;
  is_active: boolean;
}

export const NAVIGATION_SNAPSHOT_GENERATED_AT = ${JSON.stringify(generatedAt)};
export const NAVIGATION_SNAPSHOT_NODE_COUNT = ${nodes.length};

export const navigationSnapshot: GeneratedNavigationNode[] = ${json};
`;

mkdirSync(dirname(OUT_FILE), { recursive: true });
writeFileSync(OUT_FILE, ts, "utf8");
console.log(`[export-navigation] Geschrieben: ${OUT_FILE}`);
