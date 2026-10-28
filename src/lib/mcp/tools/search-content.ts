import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "search_content",
  title: "CMS-Inhalte durchsuchen",
  description: "Volltextsuche über Feldwerte in cms_section_fields (case-insensitive ILIKE).",
  inputSchema: {
    query: z.string().min(2).describe("Suchbegriff (mind. 2 Zeichen)."),
    locale: z.string().optional().describe("Optional: Sprachcode wie 'de' oder 'en'."),
    limit: z.number().int().min(1).max(100).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, locale, limit }) => {
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!;
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    let q = supabase
      .from("cms_section_fields")
      .select("section_id, field_key, locale, value")
      .ilike("value", `%${query}%`)
      .limit(limit ?? 25);
    if (locale) q = q.eq("locale", locale);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { matches: data },
    };
  },
});
