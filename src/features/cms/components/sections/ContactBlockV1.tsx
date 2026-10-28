import type { CmsSectionContext } from "../CmsBodyRenderer";
import { f, tf } from "./_helpers";
import { Mail, Phone } from "lucide-react";
import { sectionBgClass } from "@/features/cms/lib/sectionBackground";

export function ContactBlockV1(ctx: CmsSectionContext) {
  const title = f(ctx, "title");
  const text = f(ctx, "text");
  const phone = f(ctx, "phone");
  const email = f(ctx, "email");
  const ctaLabel = f(ctx, "cta_label");
  const ctaHref = f(ctx, "cta_href");
  // Einheitlicher Hintergrund-Schalter `section_bg` (siehe sectionBackground.ts).
  const bgClass = sectionBgClass(tf(ctx, "section_bg"));
  if (!title && !phone && !email && !ctaHref) return null;

  return (
    <section className={`py-16 lg:py-24 ${bgClass}`} data-cms-section={ctx.sectionKey}>
      <div className="container mx-auto">
        <div className="max-w-2xl border border-border bg-card p-8">
          {title && (
            <h2 className="text-2xl md:text-3xl font-heading font-normal text-foreground mb-3">
              {title}
            </h2>
          )}
          {text && <p className="text-muted-foreground leading-relaxed mb-6">{text}</p>}
          <div className="space-y-3">
            {phone && (
              <a
                href={`tel:${phone.replace(/[^+\d]/g, "")}`}
                className="flex items-center gap-3 text-foreground hover:text-primary"
              >
                <Phone className="h-4 w-4" />
                <span>{phone}</span>
              </a>
            )}
            {email && (
              <a
                href={`mailto:${email}`}
                className="flex items-center gap-3 text-foreground hover:text-primary"
              >
                <Mail className="h-4 w-4" />
                <span>{email}</span>
              </a>
            )}
          </div>
          {ctaLabel && ctaHref && (
            <a
              href={ctaHref}
              className="inline-block mt-6 px-5 py-2 bg-primary text-primary-foreground hover:opacity-90"
            >
              {ctaLabel}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
