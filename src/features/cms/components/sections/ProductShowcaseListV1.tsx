/**
 * ProductShowcaseListV1 — Gestapelte 2-Spalten-Produktliste.
 *
 * Eingeführt im Sprint „Standardkarten-Vertrag" (2026-06-04), um den bisherigen
 * doppeldeutigen Gebrauch von `product_scroller_v1` aufzulösen:
 *   - `product_scroller_v1` = horizontaler Karten-Scroller (Renderer
 *     `ProductScrollerV1`).
 *   - `product_showcase_list_v1` = gestapelte 2-Spalten-Liste, wie bisher
 *     in `CmsProductSolutionShell.readItems` lokal nachgebaut.
 *
 * Inhalte stammen aus `card_v1`-Kindern. Container-aware über
 * `resolveCardRuntime`, ohne /kontakt-Fallback.
 */
import type { CmsSectionContext } from "../CmsBodyRenderer";
import { f, tf, cf, img, imgAlt } from "./_helpers";
import { CARD_DIVIDER_CLASS, useCardDividers } from "@/features/cms/lib/cardDividers";
import { resolveCardRuntime } from "@/features/cms/lib/cardVisibility";
import { resolveIcon } from "@/features/cms/components/iconResolver";
import { resolveHref } from "@/features/cms/lib/cardCanonical";
import { useShortIdResolver } from "@/features/cms/hooks/useShortIdResolver";
import { useTranslation } from "react-i18next";

export function ProductShowcaseListV1(ctx: CmsSectionContext) {
  const { t } = useTranslation();
  const shortIdMap = useShortIdResolver();
  const showDividers = useCardDividers(tf(ctx, "card_dividers"));

  const title = f(ctx, "title") || f(ctx, "headline");
  const intro = f(ctx, "intro");
  const label = f(ctx, "label") || f(ctx, "eyebrow");
  const items = ctx.children.filter((c) => (c.section_type ?? "") === "card_v1");
  if (items.length === 0 && !title) return null;

  return (
    <section className="py-16 lg:py-24 bg-background" data-cms-section={ctx.sectionKey}>
      <div className="container mx-auto">
        {(label || title || intro) && (
          <div className="mb-10 max-w-3xl">
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

        <div className="flex flex-col gap-10 lg:gap-14">
          {items.map((c, idx) => {
            const itTitle = cf(ctx, c.section_key, "title") || cf(ctx, c.section_key, "headline");
            const itSub = cf(ctx, c.section_key, "eyebrow") || cf(ctx, c.section_key, "subtitle");
            const itDesc = cf(ctx, c.section_key, "description") || cf(ctx, c.section_key, "beschreibung");
            const itImg = img(ctx, c.section_key);
            const itAlt = imgAlt(ctx, c.section_key) || itTitle;
            const itIconImage = img(ctx, c.section_key, "icon_image");

            const rt = resolveCardRuntime({
              valueFor: (fk, loc) => ctx.cms.text(c.section_key, fk, loc, "") || null,
              hasImage: !!itImg,
              hasThumbnail: !!img(ctx, c.section_key, "thumbnail"),
              hasIconImage: !!itIconImage,
              parentSectionType: "product_showcase_list_v1",
              parentSectionKey: ctx.sectionKey,
            });

            const bullets = rt.bullets
              .map((b, i) => (b.status === "active"
                ? cf(ctx, c.section_key, `bullets.${i}`) || cf(ctx, c.section_key, `features.${i}`)
                : ""))
              .filter(Boolean);

            const chips = rt.chips
              .map((ch, i) => (ch.status === "active" ? cf(ctx, c.section_key, `chips.${i}`) : ""))
              .filter(Boolean);

            const links = rt.links
              .map((l, i) => {
                if (l.status !== "active") return null;
                const n = i + 1;
                const rawHref = cf(ctx, c.section_key, `link_${n}_href`);
                const resolved = resolveHref(rawHref, shortIdMap);
                if (!resolved.valid) return null;
                return {
                  label: cf(ctx, c.section_key, `link_${n}_label`)
                    || t("common:ui.learnMore"),
                  href: resolved.href,
                };
              })
              .filter((l): l is { label: string; href: string } => l !== null);

            const reverse = idx % 2 === 1;
            const Icon = rt.iconVisible && rt.iconName ? resolveIcon(rt.iconName, null as never) : null;

            return (
              <article
                key={c.section_key}
                data-cms-section={c.section_key}
                className={`grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}
              >
                <div className="bg-secondary/40 aspect-[4/3] flex items-center justify-center overflow-hidden">
                  {itImg && rt.image.status === "active" ? (
                    <img
                      src={itImg}
                      alt={itAlt}
                      loading="lazy"
                      className="w-full h-full object-cover"
                      data-cms-field="image"
                    />
                  ) : itIconImage ? (
                    <img
                      src={itIconImage}
                      alt={imgAlt(ctx, c.section_key, "icon_image") || itTitle}
                      loading="lazy"
                      className="h-24 w-24 object-contain"
                      data-cms-field="icon_image"
                    />
                  ) : Icon ? (
                    <Icon className="h-20 w-20 text-primary/60" strokeWidth={1.25} aria-hidden="true" data-cms-field="icon" />
                  ) : null}
                </div>

                <div className="flex flex-col">
                  {itSub && rt.eyebrow.status === "active" && (
                    <span className="text-xs text-muted-foreground tracking-wide mb-2">{itSub}</span>
                  )}
                  {itTitle && (
                    <h3 className="text-xl md:text-2xl font-heading font-normal text-foreground mb-3">
                      {itTitle}
                    </h3>
                  )}
                  {itDesc && (
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">{itDesc}</p>
                  )}
                  {bullets.length > 0 && (
                    <ul className="space-y-2" data-cms-field="bullets">
                      {bullets.map((b, bi) => (
                        <li key={`${c.section_key}-b-${bi}`} className="text-sm text-foreground/80 flex items-start gap-2">
                          <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {chips.length > 0 && (
                    <ul className="mt-4 flex flex-wrap gap-1.5" data-cms-field="chips">
                      {chips.map((chip, ci) => (
                        <li
                          key={`${c.section_key}-c-${ci}`}
                          className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2.5 py-0.5 text-[11px]"
                        >
                          {chip}
                        </li>
                      ))}
                    </ul>
                  )}
                  {links.length > 0 && (
                    <div className={`flex flex-col gap-1 ${showDividers ? CARD_DIVIDER_CLASS : "mt-6"}`} data-cms-field="links">
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
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
