import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "get_page",
  title: "CMS-Seite mit Sections lesen",
  description: "Liest eine CMS-Seite anhand ihres page_key inklusive Sections und Feldwerten.",
  inputSchema: {
    pageKey: z.string().min(1).describe("page_key der Seite, z. B. 'home' oder 'gebaeudekommunikation'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ pageKey }) => {
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!;
    const supabase = createClient(url, key, { auth: { persistSession: false } });

    const { data: page, error: pErr } = await supabase
      .from("cms_pages")
      .select("*")
      .eq("page_key", pageKey)
      .maybeSingle();
    if (pErr) return { content: [{ type: "text", text: pErr.message }], isError: true };
    if (!page) return { content: [{ type: "text", text: `Keine Seite mit page_key='${pageKey}' gefunden.` }], isError: true };

    const { data: sections, error: sErr } = await supabase
      .from("cms_sections")
      .select("id, section_key, section_type, sort_order, is_active")
      .eq("page_id", (page as any).id)
      .order("sort_order", { ascending: true });
    if (sErr) return { content: [{ type: "text", text: sErr.message }], isError: true };

    const sectionIds = (sections ?? []).map((s: any) => s.id);
    const { data: fields } = sectionIds.length
      ? await supabase
          .from("cms_section_fields")
          .select("section_id, field_key, locale, value")
          .in("section_id", sectionIds)
      : { data: [] as any[] };

    const result = { page, sections, fields };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
});
