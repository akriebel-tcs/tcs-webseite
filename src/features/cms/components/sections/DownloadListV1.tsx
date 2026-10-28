import type { CmsSectionContext } from "../CmsBodyRenderer";
import { f, cf } from "./_helpers";
import { Download } from "lucide-react";

/** Download-Liste mit n Datei-Items (Kind-Sections download_item_v1). */
export function DownloadListV1(ctx: CmsSectionContext) {
  const title = f(ctx, "title");
  const intro = f(ctx, "intro");
  const items = ctx.children.filter((c) => (c.section_type ?? "") === "download_item_v1");
  if (items.length === 0 && !title) return null;

  return (
    <section className="py-16 lg:py-24 bg-background" data-cms-section={ctx.sectionKey}>
      <div className="container mx-auto">
        {(title || intro) && (
          <div className="mb-8 max-w-3xl">
            {title && (
              <h2 className="text-2xl md:text-3xl font-heading font-normal text-foreground">
                {title}
              </h2>
            )}
            {intro && <p className="mt-4 text-muted-foreground leading-relaxed">{intro}</p>}
          </div>
        )}
        <ul className="divide-y divide-border border-y border-border">
          {items.map((c) => {
            const itTitle = cf(ctx, c.section_key, "title");
            const itDesc = cf(ctx, c.section_key, "description");
            const fileLabel = cf(ctx, c.section_key, "file_label");
            const href = cf(ctx, c.section_key, "cta_href");
            return (
              <li key={c.section_key} data-cms-section={c.section_key} className="py-4">
                <a
                  href={href || "#"}
                  className="flex items-start gap-4 group"
                  download={!!href}
                >
                  <Download className="h-5 w-5 text-primary mt-1 shrink-0" />
                  <div className="flex-1">
                    <div className="font-heading text-foreground group-hover:underline">
                      {itTitle}
                    </div>
                    {itDesc && (
                      <p className="text-sm text-muted-foreground mt-1">{itDesc}</p>
                    )}
                  </div>
                  {fileLabel && (
                    <span className="text-xs text-muted-foreground tracking-wide shrink-0">
                      {fileLabel}
                    </span>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
