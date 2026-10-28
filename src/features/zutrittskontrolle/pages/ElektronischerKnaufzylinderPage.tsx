import { Link } from "react-router-dom";
import SiblingNav from "@/components/SiblingNav";
import { ArrowRight, Download, Check, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";
import AutoBreadcrumb from "@/components/AutoBreadcrumb";
import { ContentSection } from "@/components/PageLayout";

import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import CmsTailFaq from "@/features/cms/components/CmsTailFaq";
import { cardGridClass, cardGridItemClass } from "@/features/cms/lib/cardGrid";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";
import { resolveIcon } from "@/features/cms/components/iconResolver";
import { CARD_ICON_CLASS, CARD_ICON_STROKE } from "@/features/cms/lib/cardIcon";
import { resolveCardIcon } from "@/features/cms/lib/cardVisibility";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5 },
};

const ElektronischerKnaufzylinderPage = () => {
  const { t, cms, loc } = useCmsI18n("zutrittskontrolle.elektronischer-knaufzylinder", "zutrittskontrolle", "knaufzylinder");
  const dbSectionCount = cms.sections.filter((s) => !s.parent_section_key && s.section_type !== "hero").length;
  const hasRichContent = cms.hasDbContent && dbSectionCount > 0;
  const base = "knaufzylinder";
  // Batch 16: Section-Gate — `hero` Block respektiert nun is_active.
  const heroActive = cms.sections.some(s => !s.parent_section_key && s.section_key === "hero");

  const benefitChildren = cms.sections
    .filter((s) => s.parent_section_key === "benefits")
    .sort((a, b) => a.sort_order - b.sort_order);
  const useCaseChildren = cms.sections
    .filter((s) => s.parent_section_key === "useCases")
    .sort((a, b) => a.sort_order - b.sort_order);

  const benefitItems = benefitChildren.map((c) => ({
    key: c.section_key,
    title: cms.text(c.section_key, "title", loc, ""),
    desc: cms.text(c.section_key, "description", loc, "") || cms.text(c.section_key, "desc", loc, "") || cms.text(c.section_key, "text", loc, ""),
    icon: resolveCardIcon(cms, c.section_key, loc, resolveIcon, Check),
    image: cms.asset(c.section_key, "image", ""),
  }));

  const useCaseItems = useCaseChildren.map((c) => ({
    key: c.section_key,
    title: cms.text(c.section_key, "title", loc, ""),
    text: cms.text(c.section_key, "description", loc, "") || cms.text(c.section_key, "desc", loc, "") || cms.text(c.section_key, "text", loc, ""),
    icon: resolveCardIcon(cms, c.section_key, loc, resolveIcon, HelpCircle),
    image: cms.asset(c.section_key, "image", ""),
  }));

  return (
    <>
      <AutoBreadcrumb fallbackLabel={t(`${base}.hero.headline`)} />

      {heroActive && (
      <section className="bg-background">
        <div className="container mx-auto pt-12 pb-10 lg:pt-20 lg:pb-14">
          <div className="flex flex-col md:flex-row gap-10 lg:gap-16 items-center">
            <motion.div {...fadeIn} className="w-full md:w-1/2 order-1">
              <img src={cms.asset("hero", "image", "")}
                alt={t(`${base}.hero.imageAlt`)}
                className="w-full h-auto object-contain"
                data-cms-section="hero"
                data-cms-field="image"
              />
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
              <p className="text-base leading-relaxed text-muted-foreground mb-6">
                {t(`${base}.hero.description`)}
              </p>
              <p className="text-base leading-relaxed text-muted-foreground mb-8">
                {t(`${base}.hero.introText`)}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to={t(`${base}.hero.ctaUrl`)}
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-foreground text-background text-sm hover:bg-muted-foreground transition-colors"
                >
                  {t(`${base}.hero.ctaBeratung`)} <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href={t(`${base}.hero.datasheetUrl`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-8 py-3.5 border border-foreground text-foreground text-sm hover:bg-foreground hover:text-background transition-colors"
                >
                  {t(`${base}.hero.ctaDatenblatt`)} <Download className="w-4 h-4" />
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      )}

      {benefitItems.length > 0 && (
        <section className="py-16 lg:py-24 bg-section-muted">
          <div className="container mx-auto">
            <ContentSection
              label={cms.text("benefits", "label", loc, t(`${base}.vorteile.eyebrow`))}
              title={cms.text("benefits", "title", loc, t(`${base}.vorteile.headline`))}
            >
              <div className={cardGridClass("benefits", "")}>
                {benefitItems.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.key} className={`${cardGridItemClass("benefits", benefitItems.length, i)} border border-border bg-card p-6`}>
                      {item.image ? (
                        <img src={item.image} alt={item.title} className="w-full h-32 object-cover mb-4" loading="lazy" />
                      ) : Icon ? (
                        <Icon className={CARD_ICON_CLASS} strokeWidth={CARD_ICON_STROKE} aria-hidden="true" />
                      ) : null}
                      <h3 className="text-lg font-heading font-normal text-foreground mb-2 break-words">
                        {item.title}
                      </h3>
                      <p className="text-muted-foreground text-sm leading-relaxed break-words">
                        {item.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </ContentSection>
          </div>
        </section>
      )}

      {useCaseItems.length > 0 && (
        <section className="py-16 lg:py-24 bg-background">
          <div className="container mx-auto">
            <ContentSection
              label={cms.text("useCases", "label", loc, t(`${base}.anwendungen.eyebrow`))}
              title={cms.text("useCases", "title", loc, t(`${base}.anwendungen.headline`))}
            >
              <ul className={cardGridClass("useCases", "")}>
                {useCaseItems.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.key} className={`${cardGridItemClass("useCases", useCaseItems.length, i)} border border-border bg-card p-6`}>
                      {item.image ? (
                        <img src={item.image} alt={item.title} className="w-full h-32 object-cover mb-3" loading="lazy" />
                      ) : Icon ? (
                        <Icon className="w-6 h-6 text-primary mb-3" aria-hidden="true" />
                      ) : null}
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

      <section className="py-16 lg:py-24 bg-section-muted border-t border-border">
        <div className="container mx-auto text-center">
          <span className="text-xs text-muted-foreground tracking-wide mb-3 block">
            {t(`${base}.cta.label`)}
          </span>
          <h2 className="text-2xl md:text-3xl font-heading font-normal text-foreground mb-4">
            {t(`${base}.cta.title`)}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8 text-base">
            {t(`${base}.cta.subtext`)}
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

    <CmsTailFaq pageKey="zutrittskontrolle.elektronischer-knaufzylinder" />
    <SiblingNav pageKey="zutrittskontrolle.elektronischer-knaufzylinder" />
    <CmsSourceBadge
      pageKey="zutrittskontrolle.elektronischer-knaufzylinder"
      source={hasRichContent ? "db" : "fallback"}
      sectionCount={hasRichContent ? dbSectionCount : undefined}
    />
    </>
  );
};

export default ElektronischerKnaufzylinderPage;
