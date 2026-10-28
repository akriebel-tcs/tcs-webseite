import type { CmsSectionContext } from "../CmsBodyRenderer";
import { f, cf } from "./_helpers";

export function StatsV1(ctx: CmsSectionContext) {
  const title = f(ctx, "title");
  const intro = f(ctx, "intro");
  const items = ctx.children.filter((c) => (c.section_type ?? "") === "stat_v1");
  if (items.length === 0) return null;

  return (
    <section className="py-16 lg:py-24 bg-background" data-cms-section={ctx.sectionKey}>
      <div className="container mx-auto">
        {(title || intro) && (
          <div className="mb-10 max-w-3xl">
            {title && (
              <h2 className="text-2xl md:text-3xl font-heading font-normal text-foreground">
                {title}
              </h2>
            )}
            {intro && <p className="mt-4 text-muted-foreground leading-relaxed">{intro}</p>}
          </div>
        )}
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-border pt-8">
          {items.map((c) => {
            const value = cf(ctx, c.section_key, "value");
            const label = cf(ctx, c.section_key, "label");
            const desc = cf(ctx, c.section_key, "description");
            return (
              <div key={c.section_key} data-cms-section={c.section_key}>
                <dt className="text-3xl md:text-4xl font-heading text-foreground mb-1">
                  {value}
                </dt>
                {label && <dd className="text-sm text-foreground">{label}</dd>}
                {desc && <dd className="text-xs text-muted-foreground mt-1">{desc}</dd>}
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}
