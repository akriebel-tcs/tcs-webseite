import { Users, Lightbulb, Heart, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import AutoBreadcrumb from "@/components/AutoBreadcrumb";
import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import { CmsOptionalImage } from "@/features/cms/components/CmsOptionalImage";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";
import { listChildItems, txChildField } from "@/features/cms/utils/cmsItemHelpers";
import { resolveCardVisibility } from "@/features/cms/lib/cardVisibility";
import { resolveHref } from "@/features/cms/lib/cardCanonical";
import { useShortIdResolver } from "@/features/cms/hooks/useShortIdResolver";
import { learnMoreFallback } from "@/i18n/uiFallbacks";



const Karriere = () => {
  const { t, cms, loc } = useCmsI18n("karriere.root", "karriere");
  const shortIdMap = useShortIdResolver();
  const dbSectionCount = cms.sections.filter((s) => !s.parent_section_key && s.section_type !== "hero").length;
  const hasRichContent = cms.hasDbContent && dbSectionCount > 0;

  // Batch 47 — card_v1-Vertrag in Sonderpfaden: Bullets/Chips/Links über
  // den zentralen Resolver. Layout/Klassen unverändert; sichtbar nur, wenn
  // aktiv + (bei Links) auflösbares Ziel.
  const buildCardExtras = (sectionKey: string, parentSectionKey: string) => {
    const vis = resolveCardVisibility({
      valueFor: (fk, l) => cms.text(sectionKey, fk, l, "") || null,
      hasImage: !!cms.asset(sectionKey, "image", ""),
      hasThumbnail: false,
      hasIconImage: !!cms.asset(sectionKey, "icon_image", ""),
      parentSectionType: "cards_v1",
      parentSectionKey,
    });
    const bullets = [0, 1, 2, 3, 4]
      .filter((i) => vis.bulletsVisible[i])
      .map((i) => cms.text(sectionKey, `bullets.${i}`, loc, "") || cms.text(sectionKey, `features.${i}`, loc, ""))
      .filter(Boolean);
    const chips = [0, 1, 2, 3, 4]
      .filter((i) => vis.chipsVisible[i])
      .map((i) => cms.text(sectionKey, `chips.${i}`, loc, ""))
      .filter(Boolean);
    const links = vis.linksVisible
      .map((visible, idx) => {
        if (!visible) return null;
        const n = idx + 1;
        const r = resolveHref(cms.text(sectionKey, `link_${n}_href`, loc, ""), shortIdMap);
        if (!r.valid) return null;
        return {
          n,
          label: cms.text(sectionKey, `link_${n}_label`, loc, "") || learnMoreFallback(loc),
          href: r.href,
        };
      })
      .filter((l): l is { n: number; label: string; href: string } => l !== null);
    return { bullets, chips, links };
  };


  const benefitsMeta = {
    team: Users,
    innovation: Lightbulb,
    balance: Heart,
    education: GraduationCap,
  } as const;
  const FALLBACK_BENEFIT_KEYS = ["team", "innovation", "balance", "education"] as const;

  const FALLBACK_JOB_KEYS = ["softwareEmbedded", "productManager", "customerSupport", "apprenticeElectronics", "workingStudent"] as const;
  const JOB_META: Record<string, { locationKey: string; typeKey: string }> = {
    softwareEmbedded: { locationKey: "harsefeld", typeKey: "fulltime" },
    productManager: { locationKey: "harsefeld", typeKey: "fulltime" },
    customerSupport: { locationKey: "harsefeldRemote", typeKey: "fulltime" },
    apprenticeElectronics: { locationKey: "harsefeld", typeKey: "apprenticeship" },
    workingStudent: { locationKey: "harsefeld", typeKey: "parttime" },
  };

  const benefitKeys = listChildItems(cms, "benefits", "card_v1", FALLBACK_BENEFIT_KEYS);
  const jobKeys = listChildItems(cms, "jobs", "card_v1", FALLBACK_JOB_KEYS);


  return (
    <>
      <AutoBreadcrumb />
      <CmsOptionalImage cms={cms} variant="hero" sectionKey="hero" />
      <section className="bg-background">
        <div className="container mx-auto pt-12 pb-10 lg:pt-20 lg:pb-14">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="text-sm text-muted-foreground tracking-wide uppercase mb-4">{t("hero.label")}</p>
            <h1 className="text-3xl lg:text-5xl font-heading font-semibold tracking-tight leading-tight max-w-3xl mb-6">
              {t("hero.headline")}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
              {t("hero.intro")}
            </p>
          </motion.div>
        </div>
      </section>

      <section className="container mx-auto py-16 lg:py-24">
        <h2 className="text-2xl font-heading font-semibold mb-4 text-center">{t("benefits.title")}</h2>
        <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
          {t("benefits.intro")}
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefitKeys.map((key) => {
            const Icon = benefitsMeta[key as keyof typeof benefitsMeta] ?? Users;
            const title = txChildField(cms, loc, "benefits", key, "title", t(`benefits.items.${key}.title`, { defaultValue: key }));
            const desc = txChildField(cms, loc, "benefits", key, "description", t(`benefits.items.${key}.desc`, { defaultValue: "" }));
            const extras = buildCardExtras(`benefits_item_${key}`, "benefits");
            return (
              <div key={key} className="text-center" data-cms-page="karriere.root" data-cms-section={`benefits_item_${key}`}>
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
                  {Icon && <Icon className="w-6 h-6 text-foreground" />}
                </div>
                <h3 className="font-medium mb-2" data-cms-field="title">{title}</h3>
                <p className="text-sm text-muted-foreground" data-cms-field="description">{desc}</p>
                {extras.bullets.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm text-muted-foreground list-disc pl-5 marker:text-primary text-left inline-block" data-cms-field="bullets">
                    {extras.bullets.map((b, bi) => <li key={bi}>{b}</li>)}
                  </ul>
                )}
                {extras.chips.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-1.5 justify-center" data-cms-field="chips">
                    {extras.chips.map((c, ci) => (
                      <li key={ci} className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2.5 py-0.5 text-[11px]">{c}</li>
                    ))}
                  </ul>
                )}
                {extras.links.length > 0 && (
                  <div className="mt-3 flex flex-col gap-1 items-center" data-cms-field="links">
                    {extras.links.map((l) => (
                      <a key={l.n} href={l.href} className="text-sm text-primary hover:underline">{l.label} →</a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

        </div>
      </section>

      <section className="bg-section-muted">
        <div className="container mx-auto py-16 lg:py-24">
          <h2 className="text-2xl font-heading font-semibold mb-4 text-center">{t("jobs.title")}</h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">{t("jobs.intro")}</p>
          <div className="max-w-3xl mx-auto space-y-4">
            {jobKeys.map((key) => {
              const meta = JOB_META[key] ?? { locationKey: "harsefeld", typeKey: "fulltime" };
              const title = txChildField(cms, loc, "jobs", key, "title", t(`jobs.items.${key}`, { defaultValue: key }));
              const extras = buildCardExtras(`jobs_item_${key}`, "jobs");
              const applyLink = extras.links[0];
              return (
                <div key={key} className="bg-background border border-border p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-foreground/20 transition-colors" data-cms-section={`jobs_item_${key}`}>
                  <div>
                    <h3 className="font-medium mb-1" data-cms-field="title">{title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t(`jobs.locations.${meta.locationKey}`)} · {t(`jobs.types.${meta.typeKey}`)}
                    </p>
                    {extras.bullets.length > 0 && (
                      <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc pl-5 marker:text-primary" data-cms-field="bullets">
                        {extras.bullets.map((b, bi) => <li key={bi}>{b}</li>)}
                      </ul>
                    )}
                    {extras.chips.length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-1.5" data-cms-field="chips">
                        {extras.chips.map((c, ci) => (
                          <li key={ci} className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2.5 py-0.5 text-[11px]">{c}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {applyLink ? (
                    <a
                      href={applyLink.href}
                      className="text-sm font-medium text-foreground border border-foreground px-5 py-2 hover:bg-foreground hover:text-background transition-colors shrink-0"
                      data-cms-field="links"
                    >
                      {applyLink.label}
                    </a>
                  ) : (
                    <button className="text-sm font-medium text-foreground border border-foreground px-5 py-2 hover:bg-foreground hover:text-background transition-colors shrink-0">
                      {t("jobs.apply")}
                    </button>
                  )}
                </div>
              );
            })}

          </div>
        </div>
      </section>


      <CmsOptionalImage cms={cms} variant="inline" sectionKey="inline" />
      <section className="container mx-auto py-16 lg:py-24 text-center">
        <h2 className="text-2xl font-heading font-semibold mb-4">{t("initiative.title")}</h2>
        <p className="text-muted-foreground max-w-xl mx-auto mb-8">
          {t("initiative.intro")} <span className="text-foreground font-medium">karriere@tcsag.de</span>.
        </p>
      </section>

    <CmsSourceBadge
      pageKey="karriere.root"
      source={hasRichContent ? "db" : "fallback"}
      sectionCount={hasRichContent ? dbSectionCount : undefined}
    />
    </>
  );
};

export default Karriere;
