import type { CmsSectionContext } from "../CmsBodyRenderer";
import { f, tf, cf, img, imgAlt } from "./_helpers";
import { resolveIcon } from "@/features/cms/components/iconResolver";
import { CARD_ICON_CLASS, CARD_ICON_STROKE } from "@/features/cms/lib/cardIcon";
import { resolveCardRuntime } from "@/features/cms/lib/cardVisibility";
import { resolveHref } from "@/features/cms/lib/cardCanonical";
import { useShortIdResolver } from "@/features/cms/hooks/useShortIdResolver";
import { sectionBgClass } from "@/features/cms/lib/sectionBackground";


/**
 * Feature-Grid mit Icon + Titel + Text. Kind-Sections vom Typ card_v1.
 * Container-aware (Sprint „card_v1 Abschluss"): Eyebrow, Bullets, Chips
 * und Links 1..3 werden gerendert, wenn die Matrix sie unterstützt und
 * der Inhalt gepflegt + sichtbar geschaltet ist. Bild wird über
 * `image`-Modul gerendert, wenn vorhanden — sonst Icon-Image, sonst
 * Lucide-Icon.
 */
export function FeatureGridV1(ctx: CmsSectionContext) {
  const shortIdMap = useShortIdResolver();

  const title = f(ctx, "title");
  const intro = f(ctx, "intro");
  const label = f(ctx, "label");
  // Einheitlicher Hintergrund-Schalter `section_bg` (siehe sectionBackground.ts).
  const bgClass = sectionBgClass(tf(ctx, "section_bg"));
  const items = ctx.children.filter((c) => (c.section_type ?? "") === "card_v1");
  if (items.length === 0 && !title) return null;

  return (
    <section className={`py-16 lg:py-24 ${bgClass}`} data-cms-section={ctx.sectionKey}>
      <div className="container mx-auto">
        {(label || title || intro) && (
          <div className="mb-12 max-w-3xl">
            {label && (
              <span className="text-xs text-muted-foreground tracking-wide mb-2 block">{label}</span>
            )}
            {title && (
              <h2 className="text-2xl md:text-3xl font-heading font-normal text-foreground">
                {title}
              </h2>
            )}
            {intro && <p className="mt-4 text-muted-foreground leading-relaxed">{intro}</p>}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((c) => {
            const mainImg = img(ctx, c.section_key);
            const mainAlt = imgAlt(ctx, c.section_key);
            const iconImage = img(ctx, c.section_key, "icon_image");
            const iconImageAlt = imgAlt(ctx, c.section_key, "icon_image");
            const rt = resolveCardRuntime({
              valueFor: (fk, loc) => ctx.cms.text(c.section_key, fk, loc, "") || null,
              hasImage: !!mainImg,
              hasThumbnail: false,
              hasIconImage: !!iconImage,
              parentSectionType: "feature_grid_v1",
              parentSectionKey: ctx.sectionKey,
            });
            const Icon = rt.iconVisible && rt.iconName ? resolveIcon(rt.iconName, null as never) : null;

            const itEyebrow = cf(ctx, c.section_key, "eyebrow") || cf(ctx, c.section_key, "subtitle");
            const itTitle = cf(ctx, c.section_key, "title");
            const itDesc = cf(ctx, c.section_key, "description");

            const bullets = rt.bullets
              .map((b, i) => (b.status === "active"
                ? cf(ctx, c.section_key, `bullets.${i}`) || cf(ctx, c.section_key, `features.${i}`)
                : ""))
              .filter(Boolean);
            const chips = rt.chips
              .map((ch, i) => (ch.status === "active" ? cf(ctx, c.section_key, `chips.${i}`) : ""))
              .filter(Boolean);
            const links = rt.links
              .map((l, idx) => {
                if (l.status !== "active") return null;
                const n = idx + 1;
                const rawHref = cf(ctx, c.section_key, `link_${n}_href`);
                const resolved = resolveHref(rawHref, shortIdMap);
                if (!resolved.valid) return null;
                return {
                  label: cf(ctx, c.section_key, `link_${n}_label`),
                  href: resolved.href,
                };
              })
              .filter((l): l is { label: string; href: string } => l !== null);


            return (
              <div key={c.section_key} data-cms-section={c.section_key} className="flex flex-col">
                {mainImg && rt.image.status === "active" ? (
                  <img
                    src={mainImg}
                    alt={mainAlt || itTitle}
                    loading="lazy"
                    className="w-full aspect-[4/3] object-cover mb-4"
                    data-cms-field="image"
                  />
                ) : iconImage ? (
                  <img
                    src={iconImage}
                    alt={iconImageAlt || itTitle}
                    loading="lazy"
                    className="h-12 w-12 object-contain mb-4"
                    data-cms-field="icon_image"
                  />
                ) : Icon ? (
                  <Icon className={CARD_ICON_CLASS} strokeWidth={CARD_ICON_STROKE} data-cms-field="icon" />
                ) : null}
                {itEyebrow && rt.eyebrow.status === "active" && (
                  <span className="text-xs text-muted-foreground tracking-wide mb-1">
                    {itEyebrow}
                  </span>
                )}
                {itTitle && (
                  <h3 className="text-lg font-heading text-foreground mb-2">{itTitle}</h3>
                )}
                {itDesc && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{itDesc}</p>
                )}
                {bullets.length > 0 && (
                  <ul className="mt-3 space-y-1" data-cms-field="bullets">
                    {bullets.map((b) => (
                      <li key={b} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-primary shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {chips.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-1.5" data-cms-field="chips">
                    {chips.map((chip) => (
                      <li
                        key={chip}
                        className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2.5 py-0.5 text-[11px]"
                      >
                        {chip}
                      </li>
                    ))}
                  </ul>
                )}
                {links.length > 0 && (
                  <div className="mt-4 flex flex-col gap-1" data-cms-field="links">
                    {links.map((l) => (
                      <a
                        key={`${l.label}-${l.href}`}
                        href={l.href}
                        className="text-sm text-primary hover:underline self-start"
                      >
                        {l.label} →
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
