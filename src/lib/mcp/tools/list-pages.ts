import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "list_pages",
  title: "CMS-Seiten auflisten",
  description: "Listet veröffentlichte CMS-Seiten (Slug, Titel, Seitentyp) aus der TCS-Webseite.",
  inputSchema: {
    limit: z.number().int().min(1).max(200).optional().describe("Maximale Anzahl Seiten (Default 50)."),
    onlyPublished: z.boolean().optional().describe("Nur veröffentlichte Seiten (Default true)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, onlyPublished }) => {
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!;
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    let q = supabase
      .from("cms_pages")
      .select("page_key, slug, title, page_type, is_published, is_active")
      .order("slug", { ascending: true })
      .limit(limit ?? 50);
    if (onlyPublished !== false) q = q.eq("is_published", true).eq("is_active", true);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { pages: data },
    };
  },
});
