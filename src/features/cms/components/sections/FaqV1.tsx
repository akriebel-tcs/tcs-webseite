/**
 * FaqV1 — rendert eine FAQ-Section aus der DB.
 *
 * Erwartetes Feld-Schema in cms_section_fields:
 *   - eyebrow            (optional)
 *   - headline           (optional)
 *   - intro              (optional)
 *   - items.<slug>.frage / items.<slug>.antwort   (DE-Schema)
 *   - items.<slug>.question / items.<slug>.answer (alternatives Schema)
 *   - items.<n>.q / items.<n>.a                   (alternatives Schema)
 *   - items.<slug>.enabled                        ("0" → Item versteckt; "" / "1" → sichtbar)
 *     Alternativen: items.<slug>.is_active ("0" versteckt), items.<slug>.hidden ("1" versteckt),
 *     items.<slug>.visible ("0" versteckt).
 *   - items.<slug>.cta_label / items.<slug>.cta_href  (optional, pro Item)
 *     Wenn beides gesetzt ist, erscheint unter der Antwort ein Link/Button.
 *     `cta_href` darf intern (`/route`) oder extern (`https://`, `mailto:`,
 *     `tel:`, `#anchor`) sein.
 *
 * Reihenfolge: alphabetisch nach Slug (deterministisch, da kein Order-Feld
 * im DB-Schema vorgesehen ist).
 */
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { CmsSectionContext } from "../CmsBodyRenderer";
import { f } from "./_helpers";
import { useMarkRendered } from "../CmsRenderRegistry";

const QUESTION_SUFFIXES = ["frage", "question", "q"] as const;
const ANSWER_SUFFIXES = ["antwort", "answer", "a"] as const;

interface FaqItem {
  slug: string;
  question: string;
  answer: string;
  ctaLabel: string;
  ctaHref: string;
}

function collectItems(ctx: CmsSectionContext): FaqItem[] {
  const keys = ctx.cms.fieldKeys(ctx.sectionKey);
  const slugs = new Set<string>();
  for (const key of keys) {
    if (!key.startsWith("items.")) continue;
    const rest = key.slice("items.".length);
    const dot = rest.lastIndexOf(".");
    if (dot <= 0) continue;
    slugs.add(rest.slice(0, dot));
  }

  const items: FaqItem[] = [];
  for (const slug of Array.from(slugs).sort()) {
    // Per-Item Sichtbarkeit. Konvention wie bei card_v1 `*_enabled`:
    //   "0" → versteckt; "" / "1" / Feld fehlt → sichtbar.
    // Akzeptiert auch alternative Bezeichner: `is_active`, `hidden`,
    // `visible` — damit Redakteure es intuitiv treffen können.
    const enabledRaw = (f(ctx, `items.${slug}.enabled`) || "").trim();
    const activeRaw = (f(ctx, `items.${slug}.is_active`) || "").trim();
    const hiddenRaw = (f(ctx, `items.${slug}.hidden`) || "").trim();
    const visibleRaw = (f(ctx, `items.${slug}.visible`) || "").trim();
    if (enabledRaw === "0" || activeRaw === "0" || hiddenRaw === "1" || visibleRaw === "0") {
      continue;
    }

    let question = "";
    for (const suf of QUESTION_SUFFIXES) {
      question = f(ctx, `items.${slug}.${suf}`);
      if (question) break;
    }
    let answer = "";
    for (const suf of ANSWER_SUFFIXES) {
      answer = f(ctx, `items.${slug}.${suf}`);
      if (answer) break;
    }
    const ctaLabel = (f(ctx, `items.${slug}.cta_label`) || "").trim();
    const ctaHref = (f(ctx, `items.${slug}.cta_href`) || "").trim();

    if (question && answer) items.push({ slug, question, answer, ctaLabel, ctaHref });
  }
  return items;
}

export function FaqV1(ctx: CmsSectionContext) {
  const eyebrow = f(ctx, "eyebrow") || f(ctx, "label");
  const headline = f(ctx, "headline") || f(ctx, "title");
  const intro = f(ctx, "intro");
  const items = collectItems(ctx);
  const canRender = items.length > 0;
  // Nur eine INLINE-Ausgabe mit echtem Inhalt meldet sich beim zentralen
  // Tail-Renderer (CmsTailFaq) an; die Tail-Ausgabe selbst
  // (`markInlineRendered: false`) und ein leerer Render melden nichts.
  useMarkRendered(canRender && ctx.markInlineRendered !== false ? ctx.sectionKey : "");

  if (!canRender) return null;

  return (
    <section className="py-16 lg:py-24 bg-background">
      <div className="container mx-auto">
        {/* Linksbündig in der Standard-Containerbreite wie alle anderen
            Section-Typen (z. B. CardsSectionV1); nur die Lesebreite bleibt
            auf max-w-3xl begrenzt. Kein `mx-auto` → keine Sonderzentrierung. */}
        <div className="max-w-3xl">
          {(eyebrow || headline || intro) && (
            <div className="mb-8 lg:mb-12" data-section-key={ctx.sectionKey}>
              {eyebrow && (
                <span className="block text-xs uppercase tracking-wider text-muted-foreground mb-3">
                  {eyebrow}
                </span>
              )}
              {headline && (
                <h2 className="text-2xl md:text-3xl font-heading font-normal text-foreground mb-4">{headline}</h2>
              )}

              {intro && (
                <p className="text-muted-foreground leading-relaxed">{intro}</p>
              )}
            </div>
          )}
          <Accordion type="single" collapsible className="w-full">
            {items.map((item) => {
              const hasCta = item.ctaLabel.length > 0 && item.ctaHref.length > 0;
              const isAnchorLike = /^(https?:\/\/|mailto:|tel:|#)/i.test(item.ctaHref);
              const isExternal = /^https?:\/\//i.test(item.ctaHref);
              return (
                <AccordionItem key={item.slug} value={item.slug}>
                  <AccordionTrigger className="text-left text-base lg:text-lg">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed whitespace-pre-line">
                    {item.answer}
                    {hasCta && (
                      <div className="mt-5">
                        {isAnchorLike ? (
                          <a
                            href={item.ctaHref}
                            className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-muted-foreground transition-colors group/faqcta"
                            {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                          >
                            {item.ctaLabel}
                            <ArrowRight className="w-4 h-4 transition-transform group-hover/faqcta:translate-x-1" />
                          </a>
                        ) : (
                          <Link
                            to={item.ctaHref}
                            className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-muted-foreground transition-colors group/faqcta"
                          >
                            {item.ctaLabel}
                            <ArrowRight className="w-4 h-4 transition-transform group-hover/faqcta:translate-x-1" />
                          </Link>
                        )}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

        </div>
      </div>
    </section>
  );
}

export default FaqV1;
