import type { CmsSectionContext } from "../CmsBodyRenderer";
import { f } from "./_helpers";

/**
 * Rich-Text-Block. P-0: einfache Absatz-Aufteilung per `\n\n`.
 * Spätere Etappe ersetzt durch react-markdown, sobald die Inhalte
 * tatsächlich Markdown enthalten (Legal/Akademie-Seiten).
 */
export function RichV1(ctx: CmsSectionContext) {
  const title = f(ctx, "title");
  const body = f(ctx, "body");
  if (!body) return null;

  return (
    <section className="py-16 lg:py-24 bg-background" data-cms-section={ctx.sectionKey}>
      <div className="container mx-auto max-w-3xl">
        {title && (
          <h2 className="text-2xl md:text-3xl font-heading font-normal text-foreground mb-6">
            {title}
          </h2>
        )}
        <div className="prose prose-neutral max-w-none">
          {body.split(/\n{2,}/).map((para, i) => (
            <p key={i} className="text-muted-foreground leading-relaxed mb-4">
              {para}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
