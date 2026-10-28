import { Link } from "react-router-dom";
import SiblingNav from "@/components/SiblingNav";
import { CARD_ICON_CLASS, CARD_ICON_STROKE } from "@/features/cms/lib/cardIcon";
import {
  ArrowRight,
  Download,
  Building2,
  HeartPulse,
  GraduationCap,
  Home,
  ShieldCheck,
  Landmark,
  Castle,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { motion } from "framer-motion";
import AutoBreadcrumb from "@/components/AutoBreadcrumb";
import { ContentSection } from "@/components/PageLayout";

import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import CmsTailFaq from "@/features/cms/components/CmsTailFaq";
import { cardGridClass, cardGridItemClass } from "@/features/cms/lib/cardGrid";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";
import { resolveIcon as resolveCmsIcon } from "@/features/cms/components/iconResolver";


// Code-Fallback (greift nur, wenn keine Kind-Karten in der DB existieren)
const BENEFIT_KEYS = ["1", "2", "3", "4", "5", "6"] as const;
const USECASE_KEYS = ["1", "2", "3", "4", "5", "6", "7"] as const;

const USECASE_ICONS_DEFAULT: Record<(typeof USECASE_KEYS)[number], LucideIcon> = {
  "1": Building2,
  "2": HeartPulse,
  "3": GraduationCap,
  "4": Home,
  "5": ShieldCheck,
  "6": Landmark,
  "7": Castle,
};

/** Lucide-Icon nach Name auflösen (z. B. "Building2" → <Building2 />). */
function resolveLucide(name: string | undefined | null, fallback: LucideIcon): LucideIcon {
  if (!name) return fallback;
  const trimmed = name.trim();
  if (!trimmed) return fallback;
  const Icon = (LucideIcons as unknown as Record<string, LucideIcon>)[trimmed];
  return Icon ?? fallback;
}

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5 },
};

const ElektronischeDrueckergarniturPage = () => {
  const { t, cms, loc } = useCmsI18n(
    "zutrittskontrolle.elektronische-drueckergarnitur",
    "zutrittskontrolle",
    "elektronischeDrueckergarnitur",
  );
  const dbSectionCount = cms.sections.filter((s) => !s.parent_section_key && s.section_type !== "hero").length;
  const hasRichContent = cms.hasDbContent && dbSectionCount > 0;
  const base = "elektronischeDrueckergarnitur";
  // Batch 17: Section-Gates — `hero`/`benefits`/`useCases` respektieren nun is_active.
  const heroActive = cms.sections.some(s => !s.parent_section_key && s.section_key === "hero");
  const benefitsActive = cms.sections.some(s => !s.parent_section_key && s.section_key === "benefits");
  const useCasesActive = cms.sections.some(s => !s.parent_section_key && s.section_key === "useCases");

  // Kind-Karten aus DB lesen (Spiegel-Regel: Reihenfolge + Sichtbarkeit kommen aus cms_sections)
  const benefitChildren = cms.sections
    .filter((s) => s.parent_section_key === "benefits")
    .sort((a, b) => a.sort_order - b.sort_order);
  const useCaseChildren = cms.sections
    .filter((s) => s.parent_section_key === "useCases")
    .sort((a, b) => a.sort_order - b.sort_order);

  // Wenn DB-Karten vorhanden: daraus rendern; sonst Code-Fallback (i18n-Felder)
  const benefitItems =
    benefitChildren.length > 0
      ? benefitChildren.map((c) => ({
          key: c.section_key,
          title: cms.text(c.section_key, "title", loc, ""),
          desc: cms.text(c.section_key, "description", loc, "") || cms.text(c.section_key, "desc", loc, "") || cms.text(c.section_key, "text", loc, ""),
          image: cms.asset(c.section_key, "image", ""),
          // Icon-Anzeige wie in den generischen Kartenrastern:
          // nur wenn `icon_enabled` = "1" und ein Icon-Name gepflegt ist.
          icon:
            cms.text(c.section_key, "icon_enabled", loc, "") === "1"
              ? resolveCmsIcon(cms.text(c.section_key, "icon", loc, ""), null as never)
              : null,
        }))
      : BENEFIT_KEYS.map((k) => ({
          key: `benefit_${k}`,
          title: t(`${base}.benefits.items.${k}.title`),
          desc: t(`${base}.benefits.items.${k}.desc`),
          image: "",
          icon: null as LucideIcon | null,
        }));


  const useCaseItems =
    useCaseChildren.length > 0
      ? useCaseChildren.map((c, i) => {
          const fallbackKey = USECASE_KEYS[i] ?? "1";
          const fallbackIcon = USECASE_ICONS_DEFAULT[fallbackKey] ?? HelpCircle;
          return {
            key: c.section_key,
            title: cms.text(c.section_key, "title", loc, ""),
            text: cms.text(c.section_key, "description", loc, "") || cms.text(c.section_key, "desc", loc, "") || cms.text(c.section_key, "text", loc, ""),
            icon: resolveLucide(cms.text(c.section_key, "icon", loc, ""), fallbackIcon),
            image: cms.asset(c.section_key, "image", ""),
          };
        })
      : USECASE_KEYS.map((k) => ({
          key: `usecase_${k}`,
          title: t(`${base}.useCases.items.${k}.title`),
          text: t(`${base}.useCases.items.${k}.text`),
          icon: USECASE_ICONS_DEFAULT[k],
          image: "",
        }));

  return (
    <div data-cms-page="zutrittskontrolle.elektronische-drueckergarnitur">
      <AutoBreadcrumb fallbackLabel={t(`${base}.hero.headline`)} />

      {/* Hero – 50/50: Bild links, Text + Buttons rechts */}
      {heroActive && (
      <section className="bg-background" data-cms-section="hero">
        <div className="container mx-auto pt-12 pb-10 lg:pt-20 lg:pb-14">
          <div className="flex flex-col md:flex-row gap-10 lg:gap-16 items-center">
            <motion.div {...fadeIn} className="w-full md:w-1/2 order-1">
              <div data-cms-field="image">
                <img
                  src={cms.asset("hero", "image", "")}
                  alt={t(`${base}.hero.imageAlt`)}
                  className="w-full h-auto object-contain"
                />
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="w-full md:w-1/2 order-2"
            >
              <span className="block text-xs uppercase tracking-wider text-muted-foreground mb-3">
                {t(`${base}.hero.eyebrow`)}
              </span>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-normal leading-tight mb-6">
                {t(`${base}.hero.headline`)}
              </h1>
              <p className="text-base leading-relaxed text-muted-foreground mb-6">
                {t(`${base}.hero.subline`)}
              </p>
              <p className="text-base leading-relaxed text-muted-foreground mb-8">
                {t(`${base}.hero.description`)}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to={t(`${base}.hero.ctaUrl`)}
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-foreground text-background text-sm hover:bg-muted-foreground transition-colors"
                >
                  {t(`${base}.hero.cta`)} <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href={t(`${base}.hero.datasheetUrl`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-8 py-3.5 border border-foreground text-foreground text-sm hover:bg-foreground hover:text-background transition-colors"
                >
                  {t(`${base}.hero.datasheetLabel`)} <Download className="w-4 h-4" />
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      )}

      {/* Vorteile */}
      {benefitsActive && (
      <section className="py-16 lg:py-24 bg-section-muted" data-cms-section="benefits">
        <div className="container mx-auto">
          <ContentSection
            label={t(`${base}.benefits.label`)}
            title={t(`${base}.benefits.title`)}
          >
            <div className={cardGridClass("benefits", "")}>
              {benefitItems.map((item, i) => (
                <div key={item.key} className={`${cardGridItemClass("benefits", benefitItems.length, i)} border border-border p-6`} data-cms-section={item.key}>
                  {item.image ? (
                    <div data-cms-field="image">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-32 object-cover mb-4"
                        loading="lazy"
                      />
                    </div>
                  ) : item.icon ? (
                    <item.icon
                      className={CARD_ICON_CLASS}
                      strokeWidth={CARD_ICON_STROKE}
                      aria-hidden="true"
                      data-cms-field="icon"
                    />
                  ) : null}

                  <h3 className="text-lg font-heading font-normal text-foreground mb-2 break-words">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed break-words">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </ContentSection>
        </div>
      </section>
      )}

      {/* Typische Einsatzbereiche */}
      {useCasesActive && (
      <section className="py-16 lg:py-24 bg-background" data-cms-section="useCases">
        <div className="container mx-auto">
          <ContentSection
            label={t(`${base}.useCases.label`)}
            title={t(`${base}.useCases.title`)}
          >
            <ul className={cardGridClass("useCases", "")}>
              {useCaseItems.map((item, i) => {
                const Icon = item.icon;
                return (
                  <li key={item.key} className={`${cardGridItemClass("useCases", useCaseItems.length, i)} border border-border bg-card p-6`} data-cms-section={item.key}>
                    <div data-cms-field="image">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-32 object-cover mb-3"
                          loading="lazy"
                        />
                      ) : (
                        <Icon className={CARD_ICON_CLASS} strokeWidth={CARD_ICON_STROKE} aria-hidden="true" />
                      )}
                    </div>
                    <h3 className="text-base font-heading font-normal text-foreground mb-2 break-words">
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed break-words">
                      {item.text}
                    </p>
                  </li>
                );
              })}
            </ul>
          </ContentSection>
        </div>
      </section>
      )}

      {/* Beratungs-CTA */}
      <section className="py-16 lg:py-24 bg-section-muted border-t border-border">
        <div className="container mx-auto text-center">
          <span className="text-xs text-muted-foreground tracking-wide mb-3 block">
            {t(`${base}.cta.label`)}
          </span>
          <h2 className="text-2xl md:text-3xl font-heading font-normal text-foreground mb-4">
            {t(`${base}.cta.title`)}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8 text-base">
            {t(`${base}.cta.text`)}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to={t(`${base}.cta.ctaUrl`)}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-foreground text-background text-sm hover:bg-muted-foreground transition-colors"
            >
              {t(`${base}.cta.button`)} <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href={t(`${base}.cta.datasheetUrl`)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3.5 border border-foreground text-foreground text-sm hover:bg-foreground hover:text-background transition-colors"
            >
              {t(`${base}.cta.datasheetLabel`)} <Download className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      <CmsTailFaq pageKey="zutrittskontrolle.elektronische-drueckergarnitur" />
      <SiblingNav pageKey="zutrittskontrolle.elektronische-drueckergarnitur" />
      <CmsSourceBadge
        pageKey="zutrittskontrolle.elektronische-drueckergarnitur"
        source={hasRichContent ? "db" : "fallback"}
        sectionCount={hasRichContent ? dbSectionCount : undefined}
      />
    </div>
  );
};

export default ElektronischeDrueckergarniturPage;
