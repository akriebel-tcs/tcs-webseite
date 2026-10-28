/**
 * /diagnose — Selbsttest der Inhalte-Quelle (nur zur Fehlersuche, keine Geheimnisse).
 *
 * Zeigt, welche Quelle der Build verwendet, ob die Storyblok-Tokens im Build
 * stecken (nur ja/nein und Laenge) und ob Storyblok vom Browser aus antwortet.
 */
import { useEffect, useState } from "react";
import { contentSource } from "@/lib/content/source";

type Check = { label: string; ok: boolean | null; detail: string };

const mask = (v: string | undefined) => (v && v.trim() ? `vorhanden (${v.trim().length} Zeichen, endet auf …${v.trim().slice(-2)})` : "FEHLT");

export default function DiagnosePage() {
  const [checks, setChecks] = useState<Check[]>([]);
  useEffect(() => {
    const token = import.meta.env.VITE_STORYBLOK_TOKEN as string | undefined;
    const preview = import.meta.env.VITE_STORYBLOK_PREVIEW_TOKEN as string | undefined;
    const base: Check[] = [
      { label: "Inhalte-Quelle (VITE_CONTENT_SOURCE)", ok: contentSource() === "storyblok", detail: contentSource() },
      { label: "VITE_STORYBLOK_TOKEN im Build", ok: Boolean(token?.trim()), detail: mask(token) },
      { label: "VITE_STORYBLOK_PREVIEW_TOKEN im Build", ok: Boolean(preview?.trim()), detail: mask(preview) },
      { label: "Build-Zeitpunkt", ok: null, detail: new Date(Number(import.meta.env.VITE_BUILD_TIME ?? Date.now())).toLocaleString("de-DE") },
    ];
    setChecks(base);
    (async () => {
      const results: Check[] = [...base];
      try {
        const client = await import("@/lib/storyblok/client");
        const stories = await client.fetchPagesByPageKeys(["home.start"]);
        const home = stories[0];
        results.push({ label: "Storyblok-Antwort: Story home.start", ok: Boolean(home), detail: home ? `full_slug=${home.full_slug}, published_at=${home.published_at}` : "keine Story erhalten" });
        if (home) {
          const { flattenPageContent } = await import("@/lib/storyblok/flatten");
          const rows = flattenPageContent(home.content);
          const first = rows.assets[0];
          results.push({ label: "Abgeflachte Zeilen", ok: rows.fields.length > 0, detail: `${rows.sections.length} Sektionen, ${rows.fields.length} Felder, ${rows.assets.length} Bild-Slots` });
          results.push({ label: "Erstes Bild", ok: Boolean(first?.public_url), detail: first ? `${first.section_key}/${first.field_key} (${first.viewport}) → ${first.public_url}` : "kein Bild-Slot gefunden" });
        }
      } catch (e) {
        results.push({ label: "Storyblok-Antwort", ok: false, detail: e instanceof Error ? e.message : String(e) });
      }
      setChecks(results);
    })();
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold mb-6">Diagnose: Inhalte-Quelle</h1>
      <table className="w-full text-sm">
        <tbody>
          {checks.map((c) => (
            <tr key={c.label} className="border-b align-top">
              <td className="py-2 pr-4 whitespace-nowrap">{c.ok === null ? "•" : c.ok ? "✅" : "❌"}</td>
              <td className="py-2 pr-4 font-medium whitespace-nowrap">{c.label}</td>
              <td className="py-2 break-all text-muted-foreground">{c.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
