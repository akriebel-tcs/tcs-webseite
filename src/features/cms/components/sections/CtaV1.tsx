import type { CmsSectionContext } from "../CmsBodyRenderer";
import { f, tf, img, imgAlt } from "./_helpers";
import { useMarkRendered } from "../CmsRenderRegistry";

/**
 * CtaV1 — globaler Projekt-CTA-Block.
 *
 * Felder (alle optional außer den Pflicht-Stoppern):
 *   - title (Pflicht: ohne Titel kein Render)
 *   - text
 *   - cta_label, cta_href            → Primärbutton (Pflicht: ohne Label+Href kein Render)
 *   - cta_secondary_label, cta_secondary_href → Sekundärbutton (Label reicht; Href fällt auf "#" zurück)
 *   - phone_label, phone_href        → Telefon-Zeile (nur wenn show_phone="1" und phone_label gesetzt)
 *   - email_label, email_href        → E-Mail-Zeile (nur wenn show_email="1" und email_label gesetzt)
 *   - image (Asset)                  → Hintergrundbild
 *
 * Toggles:
 *   - show_secondary, show_phone, show_email — "1" an, sonst aus.
 *
 * Hintergrund-Variante (`background_variant`):
 *   - "light" (Default): heller Hintergrund, dunkle Buttons.
 *   - "dark":            dunkler Hintergrund, helle Buttons (Altbestand wie home.start).
 *
 * Layout:
 *   - Text-Block und Buttons sind zentriert.
 *   - Ein Button = mittig. Zwei Buttons = nebeneinander, gemeinsam mittig.
 */
function readBoolField(ctx: CmsSectionContext, fieldKey: string): boolean {
  const raw = tf(ctx, fieldKey).trim();
  return raw === "1" || raw.toLowerCase() === "true";
}

function readVariant(ctx: CmsSectionContext): "light" | "dark" {
  const raw = tf(ctx, "background_variant").trim().toLowerCase();
  return raw === "dark" ? "dark" : "light";
}

function readColor(ctx: CmsSectionContext, fieldKey: string): "auto" | "dark" | "light" {
  const raw = tf(ctx, fieldKey).trim().toLowerCase();
  if (raw === "dark") return "dark";
  if (raw === "light") return "light";
  return "auto";
}

export function CtaV1(ctx: CmsSectionContext) {
  const title = f(ctx, "title");
  const text = f(ctx, "text");
  const ctaLabel = f(ctx, "cta_label");
  const ctaHref = f(ctx, "cta_href");
  const canRender = Boolean(title && ctaLabel && ctaHref);
  // Nur eine INLINE-Ausgabe mit echtem Inhalt meldet sich als „bereits
  // gerendert", damit der Tail-Renderer (CmsTailCta) sie nicht zusätzlich
  // ausspielt. Kommt die Ausgabe vom Tail selbst (`markInlineRendered:
  // false`) oder rendert sie wegen fehlender Pflichtfelder nichts, wird
  // nichts gemeldet — der Hook wird trotzdem immer aufgerufen.
  useMarkRendered(canRender && ctx.markInlineRendered !== false ? ctx.sectionKey : "");
  if (!canRender) return null;


  const ctaSecondaryLabel = f(ctx, "cta_secondary_label");
  const ctaSecondaryHref = f(ctx, "cta_secondary_href") || "#";
  const showSecondary = readBoolField(ctx, "show_secondary");
  const hasSecondary = showSecondary && ctaSecondaryLabel.length > 0;

  const showPhone = readBoolField(ctx, "show_phone");
  const showEmail = readBoolField(ctx, "show_email");
  const phoneLabel = f(ctx, "phone_label");
  const phoneHref = f(ctx, "phone_href");
  const emailLabel = f(ctx, "email_label");
  const emailHref = f(ctx, "email_href");

  const phoneVisible = showPhone && phoneLabel.length > 0;
  const emailVisible = showEmail && emailLabel.length > 0;

  const variant = readVariant(ctx);
  const isDark = variant === "dark";

  const bg = img(ctx, ctx.sectionKey);
  const alt = imgAlt(ctx, ctx.sectionKey);

  // Farbpaletten je Variante — beide nutzen ausschließlich semantische Tokens.
  const sectionClass = isDark
    ? "relative py-20 lg:py-28 bg-foreground text-background overflow-hidden"
    : "relative py-20 lg:py-28 bg-background text-foreground overflow-hidden border-t border-border";
  // Pro-Button-Override (auto = folgt Hintergrund).
  const primaryColor = readColor(ctx, "cta_primary_color");
  const secondaryColor = readColor(ctx, "cta_secondary_color");
  // „dark" = dunkler Button (schwarzer BG, weißer Text); „light" = heller Button.
  const primaryIsDarkBtn =
    primaryColor === "dark" ? true : primaryColor === "light" ? false : !isDark;
  const secondaryIsDarkBtn =
    secondaryColor === "dark" ? true : secondaryColor === "light" ? false : !isDark;

  const primaryBtnClass = primaryIsDarkBtn
    ? "inline-block px-6 py-3 bg-foreground text-background hover:opacity-90 text-sm"
    : "inline-block px-6 py-3 bg-background text-foreground hover:opacity-90 text-sm";
  const secondaryBtnClass = secondaryIsDarkBtn
    ? "inline-block px-6 py-3 border border-foreground/40 text-foreground hover:bg-foreground/5 text-sm"
    : "inline-block px-6 py-3 border border-background/40 text-background hover:bg-background/10 text-sm";
  const textMutedClass = isDark ? "text-background/80" : "text-muted-foreground";
  const linkHoverClass = isDark ? "hover:text-background" : "hover:text-foreground";

  return (
    <section className={sectionClass} data-cms-section={ctx.sectionKey}>
      {bg && (
        <div data-cms-field="image" className="absolute inset-0">
          <img
            src={bg}
            alt={alt}
            className={
              "absolute inset-0 w-full h-full object-cover " +
              (isDark ? "opacity-20" : "opacity-10")
            }
          />
        </div>
      )}
      <div className="container mx-auto relative">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-normal mb-4">{title}</h2>
          {text && <p className={`${textMutedClass} leading-relaxed mb-8`}>{text}</p>}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-3 sm:gap-4">
            <a href={ctaHref} className={primaryBtnClass} data-cms-field="cta_label">
              {ctaLabel}
            </a>
            {hasSecondary && (
              <a
                href={ctaSecondaryHref}
                className={secondaryBtnClass}
                data-cms-field="cta_secondary_label"
              >
                {ctaSecondaryLabel}
              </a>
            )}
          </div>

          {(phoneVisible || emailVisible) && (
            <div
              className={`flex flex-col sm:flex-row sm:items-center sm:justify-center gap-3 sm:gap-8 mt-8 text-sm ${textMutedClass}`}
            >
              {phoneVisible && (
                phoneHref ? (
                  <a
                    href={phoneHref}
                    className={`${linkHoverClass} transition-colors`}
                    data-cms-field="phone_label"
                  >
                    {phoneLabel}
                  </a>
                ) : (
                  <span data-cms-field="phone_label">{phoneLabel}</span>
                )
              )}
              {emailVisible && (
                emailHref ? (
                  <a
                    href={emailHref}
                    className={`${linkHoverClass} transition-colors`}
                    data-cms-field="email_label"
                  >
                    {emailLabel}
                  </a>
                ) : (
                  <span data-cms-field="email_label">{emailLabel}</span>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
