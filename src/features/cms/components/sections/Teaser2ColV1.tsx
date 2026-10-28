import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { CmsSectionContext } from "../CmsBodyRenderer";
import { f, tf, img, imgAlt } from "./_helpers";

/**
 * teaser_2col_v1 — Generischer 2-Spalten-Teaser (Bild + Text).
 *
 * Flags:
 *   - image_position: "left" | "right" (Default "right")
 *   - background_variant: "default" | "muted" (Default "default")
 *
 * Mobile: immer Text oben, Bild unten (DOM-Reihenfolge), order-* greift erst ab md.
 * Siehe docs/02-architektur/section-typen-katalog.md → teaser_2col_v1.
 */
export function Teaser2ColV1(ctx: CmsSectionContext) {
  const title = f(ctx, "title");
  const text = f(ctx, "text");
  if (!title && !text) return null;

  const label = f(ctx, "label");
  const ctaLabel = f(ctx, "cta_label");
  const ctaLink = f(ctx, "cta_link");
  const image = img(ctx, ctx.sectionKey);
  const alt = imgAlt(ctx, ctx.sectionKey);

  const rawPos = tf(ctx, "image_position").toLowerCase();
  const imagePosition: "left" | "right" = rawPos === "left" ? "left" : "right";

  const rawBg = tf(ctx, "background_variant").toLowerCase();
  // Hintergrund-Optionen (redaktionell wählbar):
  //   white | black-5 | black-7 | black-10 | black-13
  // Backward-Compat:
  //   "" / "default"          → weiss
  //   "muted"                 → ~10% schwarz (Altbestand)
  //   "light" / "dark"        → weiss (kein eigenes Bedienfeld am Teaser)
  const sectionBg = (() => {
    switch (rawBg) {
      case "black-5":  return "bg-black/5";
      case "black-7":  return "bg-black/[0.07]";
      case "black-10": return "bg-black/10";
      case "black-13": return "bg-black/[0.13]";
      case "muted":    return "bg-black/10";
      case "white":
      case "default":
      case "":
      default:         return "bg-white";
    }
  })();
  // Mobile/Tablet (<lg): immer Text oben, Bild unten — sonst entstehen beim
  // Stapeln zwei Bilder direkt hintereinander. Erst ab lg greift die
  // Wechsellogik image_position links/rechts.
  const textOrder = imagePosition === "left" ? "lg:order-2" : "";
  const imageOrder = imagePosition === "left" ? "lg:order-1" : "";

  // Sichtbarkeitsschalter für den Knopf (additiv, rückwärtskompatibel):
  //   leer / "1" / "true" / "ja" / "an" → sichtbar (wenn Beschriftung + Ziel gefüllt)
  //   "0" / "false" / "nein" / "aus"    → ausgeblendet
  const ctaEnabledRaw = tf(ctx, "cta_enabled").trim().toLowerCase();
  const ctaHidden = ["0", "false", "nein", "aus", "off", "no"].includes(ctaEnabledRaw);
  const hasCta = !ctaHidden && ctaLabel.length > 0 && ctaLink.length > 0;
  // cta_kind (technisches Feld, additiv):
  //   ""/"link"/unbekannt → heutiges Verhalten (Textlink mit Pfeil)
  //   "button"            → sekundärer Umriss-Button (Form wörtlich aus CtaV1),
  //                         ohne Pfeil-Icon.
  const isButtonCta = tf(ctx, "cta_kind").trim().toLowerCase() === "button";
  const ctaClass = isButtonCta
    ? "inline-block px-6 py-3 border border-foreground/40 text-foreground hover:bg-foreground/5 text-sm"
    : "inline-flex items-center gap-2 text-sm text-foreground hover:text-muted-foreground transition-colors group/link";
  // Externe / Nicht-Router-Ziele: http(s), mailto:, tel:, oder Anker (#…).
  // Diese werden über <a> statt <Link> gerendert, damit Anker-Sprünge und
  // mailto/tel sauber funktionieren.
  const isAnchorLike = /^(https?:\/\/|mailto:|tel:|#)/i.test(ctaLink);
  const isExternal = /^https?:\/\//i.test(ctaLink);

  return (
    // Full-Bleed: Section bricht aus einem evtl. vorhandenen Eltern-Container
    // (z. B. PageLayout `container mx-auto` oder ContentSection) aus, damit der
    // Wechselteaser auf ALLEN Seiten identisch Rand-zu-Rand erscheint
    // (Spiegel zu Home/Eingangssysteme, die `fullWidth` nutzen).
    // Der innere `container mx-auto` beschränkt den Inhalt weiterhin auf die
    // reguläre Lesebreite (max-w 1400, Tailwind-Padding 2rem).
    <section
      className={`relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen py-4 lg:py-6 ${sectionBg}`}
      data-cms-section={ctx.sectionKey}
    >
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div className={textOrder}>
            {label && (
              <span className="text-xs text-muted-foreground tracking-wide block mb-2">
                {label}
              </span>
            )}
            {title && (
              <h2 className="text-2xl md:text-3xl font-heading font-normal text-foreground mb-4">
                {title}
              </h2>
            )}
            {text && (
              <p className="text-muted-foreground leading-relaxed mb-8 max-w-2xl">
                {text}
              </p>
            )}
            {hasCta && (
              isAnchorLike ? (
                <a
                  href={ctaLink}
                  className={ctaClass}
                  {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  {ctaLabel}
                  {!isButtonCta && (
                    <ArrowRight className="w-4 h-4 transition-transform group-hover/link:translate-x-1" />
                  )}
                </a>
              ) : (
                <Link to={ctaLink} className={ctaClass}>
                  {ctaLabel}
                  {!isButtonCta && (
                    <ArrowRight className="w-4 h-4 transition-transform group-hover/link:translate-x-1" />
                  )}
                </Link>
              )
            )}
          </div>
          {image && (
            <div className={`group overflow-hidden ${imageOrder}`} data-cms-field="image">
              <div className="aspect-[16/9] w-full overflow-hidden">
                <img
                  src={image}
                  alt={alt}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  loading="lazy"
                />
              </div>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}
