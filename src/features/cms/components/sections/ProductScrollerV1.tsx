import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CmsSectionContext } from "../CmsBodyRenderer";
import { f, tf, cf, img, imgAlt } from "./_helpers";
import { cardAspectOverrideClass } from "@/features/cms/lib/cardGrid";
import { resolveCardRuntime } from "@/features/cms/lib/cardVisibility";
import { resolveIcon } from "@/features/cms/components/iconResolver";
import { resolveHref } from "@/features/cms/lib/cardCanonical";
import { useShortIdResolver } from "@/features/cms/hooks/useShortIdResolver";
import { useTranslation } from "react-i18next";
import { sectionBgClass } from "@/features/cms/lib/sectionBackground";

/** Horizontaler Scroller mit Produkt-/Lösungs-Cards. */
import { CARD_DIVIDER_CLASS, useCardDividers } from "@/features/cms/lib/cardDividers";

export function ProductScrollerV1(ctx: CmsSectionContext) {
  const { t } = useTranslation();
  const shortIdMap = useShortIdResolver();
  const scrollRef = useRef<HTMLDivElement>(null);
  const showDividers = useCardDividers(tf(ctx, "card_dividers"));

  const title = f(ctx, "title");
  const intro = f(ctx, "intro");
  const label = f(ctx, "label");
  // Blockhintergrund (`section_bg`, nur DE gepflegt) — analog `cards_v1`:
  // "muted"/"secondary" → grau, sonst Standard.
  const sectionBgRaw = tf(ctx, "section_bg");
  // Technisches Container-Feld `card_aspect` (21-9 / 16-9 / 4-3, leer = 4:3).
  const cardAspectClass = cardAspectOverrideClass(tf(ctx, "card_aspect")) ?? "aspect-[4/3]";
  const bgClass = sectionBgClass(sectionBgRaw);
  const items = ctx.children.filter((c) => (c.section_type ?? "") === "card_v1");
  if (items.length === 0 && !title) return null;

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const cardWidth = scrollRef.current.firstElementChild?.getBoundingClientRect().width ?? 320;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -(cardWidth + 24) : cardWidth + 24,
      behavior: "smooth",
    });
  };

  const learnMore = t("common:ui.learnMore");

  return (
    <section className={`py-16 lg:py-24 ${bgClass}`} data-cms-section={ctx.sectionKey}>
      <div className="container mx-auto">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div className="max-w-3xl">
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
          <div className="hidden md:flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => scroll("left")}
              className="w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center hover:bg-accent transition-colors"
              aria-label={t("common:ui.scrollLeft")}
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              className="w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center hover:bg-accent transition-colors"
              aria-label={t("common:ui.scrollRight")}
            >
              <ChevronRight className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>
        <div
          ref={scrollRef}
          className="flex items-stretch gap-6 overflow-x-auto pb-4 snap-x snap-mandatory -mx-4 px-4 scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {items.map((c) => {
            const itTitle = cf(ctx, c.section_key, "title") || cf(ctx, c.section_key, "headline");
            const itSub = cf(ctx, c.section_key, "eyebrow") || cf(ctx, c.section_key, "subtitle");
            const itDesc = cf(ctx, c.section_key, "description") || cf(ctx, c.section_key, "beschreibung");
            const itImg = img(ctx, c.section_key);
            const itAlt = imgAlt(ctx, c.section_key) || itTitle;

            const rt = resolveCardRuntime({
              valueFor: (fk, loc) => ctx.cms.text(c.section_key, fk, loc, "") || null,
              hasImage: !!itImg,
              hasThumbnail: !!img(ctx, c.section_key, "thumbnail"),
              hasIconImage: !!img(ctx, c.section_key, "icon_image"),
              parentSectionType: "product_scroller_v1",
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
              .map((l, idx) => {
                if (l.status !== "active") return null;
                const n = idx + 1;
                const rawHref = cf(ctx, c.section_key, `link_${n}_href`);
                const resolved = resolveHref(rawHref, shortIdMap);
                if (!resolved.valid) return null;
                return {
                  label: cf(ctx, c.section_key, `link_${n}_label`) || learnMore,
                  href: resolved.href,
                };
              })
              .filter((l): l is { label: string; href: string } => l !== null);

            // Kein /kontakt-Fallback mehr (Sprint „Standardkarten-Vertrag"):
            // Karten ohne gültiges link_1_href zeigen öffentlich keinen Link.


            return (
              <article
                key={c.section_key}
                data-cms-section={c.section_key}
                className="snap-start shrink-0 w-72 md:w-80 lg:w-[calc((100%-5.25rem)/3.5)] border border-border bg-card flex flex-col"
              >
                {itImg && rt.image.status === "active" && (
                  <div data-cms-field="image">
                    <img
                      src={itImg}
                      alt={itAlt}
                      loading="lazy"
                      className={`w-full ${cardAspectClass} object-cover`}
                    />
                  </div>
                )}
                {!itImg && img(ctx, c.section_key, "icon_image") && (
                  <div className="p-5 pb-0" data-cms-field="icon_image">
                    <img
                      src={img(ctx, c.section_key, "icon_image")}
                      alt={imgAlt(ctx, c.section_key, "icon_image") || itTitle}
                      loading="lazy"
                      className="h-10 w-10 object-contain"
                    />
                  </div>
                )}
                <div className="p-5 flex flex-col flex-1">
                  {!itImg && !img(ctx, c.section_key, "icon_image") && rt.iconVisible && rt.iconName && (() => {
                    const Ico = resolveIcon(rt.iconName, null as never);
                    return Ico ? (
                      <Ico
                        className="h-7 w-7 text-primary mb-3"
                        strokeWidth={1.75}
                        aria-hidden="true"
                        data-cms-field="icon"
                      />
                    ) : null;
                  })()}
                  {itSub && rt.eyebrow.status === "active" && (
                    <span className="text-xs text-muted-foreground tracking-wide mb-2">
                      {itSub}
                    </span>
                  )}
                  {itTitle && (
                    <h3 className="text-base font-heading text-foreground mb-2">{itTitle}</h3>
                  )}
                  {itDesc && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{itDesc}</p>
                  )}
                  {bullets.length > 0 && (
                    <ul className="mt-3 space-y-1" data-cms-field="bullets">
                      {bullets.map((b) => (
                        <li
                          key={b}
                          className="text-xs text-muted-foreground flex items-start gap-2"
                        >
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
                  <><div className="mt-auto" aria-hidden="true" /><div className={`flex flex-col gap-1 ${showDividers ? CARD_DIVIDER_CLASS : "pt-4"}`} data-cms-field="links">
                    {links.map((l) => (
                      <a
                        key={`${l.label}-${l.href}`}
                        href={l.href}
                        className="text-sm text-primary hover:underline self-start"
                      >
                        {l.label} →
                      </a>
                    ))}
                  </div></>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
