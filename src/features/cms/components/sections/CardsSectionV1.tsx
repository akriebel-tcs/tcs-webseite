import type { CmsSectionContext } from "../CmsBodyRenderer";
import { f, tf, cf, img, imgAlt } from "./_helpers";
import { cardGridClass, cardGridItemClass, cardImageAspectClass } from "@/features/cms/lib/cardGrid";
import { resolveIcon } from "@/features/cms/components/iconResolver";
import { CARD_ICON_CLASS, CARD_ICON_STROKE } from "@/features/cms/lib/cardIcon";
import { resolveCardVisibility } from "@/features/cms/lib/cardVisibility";
import { resolveHref } from "@/features/cms/lib/cardCanonical";
import { useShortIdResolver } from "@/features/cms/hooks/useShortIdResolver";
import { useTranslation } from "react-i18next";
import { CARD_DIVIDER_CLASS, useCardDividers } from "@/features/cms/lib/cardDividers";
import { sectionBgClass } from "@/features/cms/lib/sectionBackground";



/** Card-Grid (responsive 1/2/3 Spalten). Inhalte aus Kind-Sections (card_v1). */
export function CardsSectionV1(ctx: CmsSectionContext) {
  const { t } = useTranslation();
  const shortIdMap = useShortIdResolver();
  const showDividers = useCardDividers(tf(ctx, "card_dividers"));

  const title = f(ctx, "title");
  const intro = f(ctx, "intro");
  const label = f(ctx, "label");
  const cards = ctx.children.filter((c) => (c.section_type ?? "") === "card_v1");
  if (cards.length === 0 && !title) return null;

  // Batch 22: optionales Hintergrund-Feld pro Gruppe.
  // Werte: "secondary" → bg-secondary, sonst Default bg-background.
  // Damit kann der Service-Hub seinen alternierenden Stripe-Hintergrund
  // ohne Custom-Renderer beibehalten. Andere Seiten ohne dieses Feld
  // bleiben unverändert (Default = bg-background).
  // Werte: "secondary"/"muted" → bg-secondary, sonst Default bg-background.
  const sectionBgRaw = tf(ctx, "section_bg");
  // Technisches Container-Feld `card_aspect`: erzwingt ein einheitliches
  // Bildformat für alle Karten (21-9 / 16-9 / 4-3). Leer = Ableitung.
  const cardAspect = tf(ctx, "card_aspect");
  const bgClass = sectionBgClass(sectionBgRaw);


  return (
    <section className={`py-16 lg:py-24 ${bgClass}`} data-cms-section={ctx.sectionKey}>
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
        <div className={cardGridClass(ctx.sectionKey, "", cards.length)}>
          {cards.map((c, cardIndex) => {
            // Canonical-first (Sprint „Kartenmodell vereinheitlichen"):
            // `title`/`description`/`eyebrow` sind die kanonischen Felder.
            // Legacy-Aliase `headline`/`beschreibung`/`subtitle` werden nur
            // noch gelesen, wenn der canonical Wert leer ist (Migration hat
            // bereits backfilled — Fallbacks decken Restfälle ab).
            const cardTitle = cf(ctx, c.section_key, "title") || cf(ctx, c.section_key, "headline");
            const cardDesc = cf(ctx, c.section_key, "description") || cf(ctx, c.section_key, "beschreibung");
            const cardSubtitle = cf(ctx, c.section_key, "eyebrow") || cf(ctx, c.section_key, "subtitle");
            // Sprint „card_v1 Abschluss": cta_label/cta_href sind ab jetzt
            // Legacy. Klick-Ziele laufen ausschließlich über link_1..3.
            // Die DB-Migration hat cta_* nach link_1_* überführt.
            // Bildquelle: erst kanonischer `image`-Slot, dann `thumbnail`
            // als Fallback. Damit zeigt der Renderer jedes im Admin
            // aktivierte Asset — auch wenn die Karte historisch noch im
            // `thumbnail`-Slot gepflegt ist (z. B. Produkte-Hub). Spiegel-
            // Regel: was im Admin live ist, muss public sichtbar sein.
            const cardImageAsset = img(ctx, c.section_key, "image");
            const cardThumbAsset = img(ctx, c.section_key, "thumbnail");
            const cardImgSrc = cardImageAsset || cardThumbAsset;
            const cardAlt =
              (cardImageAsset ? imgAlt(ctx, c.section_key, "image") : imgAlt(ctx, c.section_key, "thumbnail")) ||
              cardTitle;
            const cardIconImage = img(ctx, c.section_key, "icon_image");
            const cardIconImageAlt = imgAlt(ctx, c.section_key, "icon_image");
            // Zentraler Resolver — gleiche Wahrheit wie Admin-Workspace.
            const vis = resolveCardVisibility({
              valueFor: (fk, loc) => ctx.cms.text(c.section_key, fk, loc, "") || null,
              hasImage: !!cardImgSrc,
              hasThumbnail: !!cardThumbAsset,
              hasIconImage: !!cardIconImage,
              parentSectionType: "cards_v1",
              parentSectionKey: ctx.sectionKey,
            });

            const cardImg = vis.imageVisible ? cardImgSrc : "";
            // Tranche 23: Lucide-Icon als 3. Fallback. Priorität: image → icon_image → icon.
            const CardLucide = vis.iconVisible ? resolveIcon(vis.iconName, null as never) : null;

            // Bulletpoints — canonical-first (`bullets.N`), Fallback `features.N`.
            // Resolver liefert `bulletsVisible` bereits canonical-first inkl. Toggle.
            const bullets = ctx.cms
              .fieldKeys(c.section_key)
              .filter((k) => /^(bullets|features)\.\d+$/.test(k))
              .map((k) => Number(k.split(".")[1]))
              .filter((n) => Number.isInteger(n) && n >= 0 && n < 5)
              .reduce<number[]>((acc, n) => (acc.includes(n) ? acc : [...acc, n]), [])
              .sort((a, b) => a - b)
              .filter((i) => vis.bulletsVisible[i])
              .map((i) => cf(ctx, c.section_key, `bullets.${i}`) || cf(ctx, c.section_key, `features.${i}`))
              .filter(Boolean);

            // Chips — separates Modul (graue Pillen). Nur wenn gepflegt.
            const chips = [0, 1, 2, 3, 4]
              .filter((i) => vis.chipsVisible[i])
              .map((i) => cf(ctx, c.section_key, `chips.${i}`))
              .filter(Boolean);

            // Links 1..3 (Sprint „card_v1 Abschluss") — gleiche Wahrheit
            // wie Admin: nur „active" rendern. Legacy `cta_label`/`cta_href`
            // bleibt als 4. Link erhalten.
            // Links 1..3 (Sprint „card_v1 Abschluss") — gleiche Wahrheit
            // wie Admin: nur „active" rendern. Kurz-IDs (P-/B-) werden über
            // den globalen Resolver in echte Pfade umgewandelt; ungültige
            // Ziele werden gar nicht erst gerendert (kein `href="#"`).
            const links = vis.linksVisible
              .map((visible, idx) => {
                if (!visible) return null;
                const n = idx + 1;
                const rawHref = cf(ctx, c.section_key, `link_${n}_href`);
                const resolved = resolveHref(rawHref, shortIdMap);
                if (!resolved.valid) return null;
                return {
                  label: cf(ctx, c.section_key, `link_${n}_label`) ||
                    t("common:ui.learnMore"),
                  href: resolved.href,
                };
              })
              .filter((l): l is { label: string; href: string } => l !== null);

            // Kein /kontakt-Fallback mehr (Sprint „Standardkarten-Vertrag"):
            // Karten ohne gültiges link_1_href zeigen öffentlich keinen Link.
            // Admin meldet sie als „Link 1 unvollständig — Ziel fehlt".

            // Batch 22: optionales Placeholder-Flag pro Karte.
            // Wenn `is_placeholder === "1"`: Karte wird ausgegraut, nicht
            // klickbar (Links werden unterdrückt), `aria-disabled` gesetzt.
            // Andere Karten ohne dieses Feld bleiben unverändert.
            const isPlaceholder = cf(ctx, c.section_key, "is_placeholder") === "1";
            const placeholderClass = isPlaceholder
              ? " opacity-60 cursor-not-allowed pointer-events-none select-none"
              : " hover:shadow-md transition-shadow";

            return (
              <article
                key={c.section_key}
                data-cms-section={c.section_key}
                aria-disabled={isPlaceholder || undefined}
                className={`${cardGridItemClass(ctx.sectionKey, cards.length, cardIndex)} border border-border bg-card overflow-hidden flex flex-col shadow-sm${placeholderClass}`}
              >
                {cardImg && (
                  <div data-cms-field="image">
                    <img
                      src={cardImg}
                      alt={cardAlt}
                      loading="lazy"
                      className={`w-full ${cardImageAspectClass(ctx.sectionKey, cards.length, cardIndex, cardAspect)} object-cover`}
                    />
                  </div>
                )}
                <div className="p-6 flex flex-col flex-1">
                  {!cardImg && cardIconImage && (
                    <img
                      src={cardIconImage}
                      alt={cardIconImageAlt || cardTitle}
                      loading="lazy"
                      className="h-10 w-10 object-contain mb-3"
                      data-cms-field="icon_image"
                    />
                  )}
                  {!cardImg && !cardIconImage && CardLucide && (
                    <CardLucide
                      className={CARD_ICON_CLASS}
                      strokeWidth={CARD_ICON_STROKE}
                      aria-hidden="true"
                      data-cms-field="icon"
                    />
                  )}

                  {cardSubtitle && (
                    <span className="text-xs text-muted-foreground tracking-wide mb-2">
                      {cardSubtitle}
                    </span>
                  )}
                  {cardTitle && (
                    <h3 className="text-lg font-heading font-normal text-foreground mb-2">
                      {cardTitle}
                    </h3>
                  )}
                  {cardDesc && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {cardDesc}
                    </p>
                  )}
                  {bullets.length > 0 && (
                    <ul className="mt-3 space-y-1 flex-1">
                      {bullets.map((feat) => (
                        <li key={feat} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-primary shrink-0" />
                          <span>{feat}</span>
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
                  {links.length > 0 && !isPlaceholder && (
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
                  )}
                  {/* Legacy cta_label/cta_href entfernt (Sprint „card_v1 Abschluss"). */}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
