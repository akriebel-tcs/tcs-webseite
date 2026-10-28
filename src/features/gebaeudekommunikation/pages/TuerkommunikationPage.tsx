import PageLayout, { ContentSection } from "@/components/PageLayout";
import SiblingNav from "@/components/SiblingNav";
import CmsPageLayout from "@/features/cms/components/CmsPageLayout";
import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import { Link } from "react-router-dom";
import { ArrowRight, Network } from "lucide-react";
import { motion } from "framer-motion";
import { ROUTES } from "@/navigation/routes";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";
import { Teaser2ColV1 } from "@/features/cms/components/sections/Teaser2ColV1";
import { renderPageSectionByType } from "@/features/cms/lib/renderPageSection";
import { listChildItems, txChildField } from "@/features/cms/utils/cmsItemHelpers";

const FALLBACK_ANWENDUNGS_KEYS = ["pflege", "bildung", "behoerden", "gross"] as const;
const zielgruppenKeys = ["fachplaner", "installateur", "bautraeger"] as const;


const Tuerkommunikation = () => {
  const { t, cms, loc } = useCmsI18n("gebaeudekommunikation.root", "gebaeudekommunikation", "root");
  const heroSet = cms.assetSet("hero", "image");
  const dbSectionCount = cms.sections.filter((s) => !s.parent_section_key && s.section_type !== "hero").length;
  const hasRichContent = cms.hasDbContent && dbSectionCount > 0;
  const anwendungsumfelderSection = cms.sections.find(
    (section) => !section.parent_section_key && section.section_key === "anwendungsumfelder" && section.section_type === "cards_v1",
  );
  // D2b.3 Sichtbarkeits-Bindung (HARDCODED_CONTENT_WITH_ADMIN_VISIBILITY_BINDING):
  // RLS liefert nur aktive Sections; ist `snipdoo` im Admin ausgeblendet,
  // taucht sie hier nicht auf -> hartcodierter Block wird NICHT gerendert.
  // Fehlt die Section in der DB ganz, gilt dasselbe (kein stiller Public-Inhalt).
  const snipdooActive = cms.sections.some(s => s.section_key === "snipdoo");

  return (
    <CmsPageLayout pageKey="gebaeudekommunikation.root"
      label={t("root.hero.label")}
      headline={t("root.hero.headline")}
      intro={t("root.hero.intro")}
      heroImage={heroSet.desktop ?? heroSet.any ?? ""}
      heroImageDesktop={heroSet.desktop ?? ""}
      heroImageTablet={heroSet.tablet ?? ""}
      heroImageMobile={heroSet.mobile ?? ""}
    >
      {/* Übersicht aller Bereiche — DB-first über teaser_2col_v1-Sections (bereich_*). */}
      {(() => {
        const bereichSections = cms.sections.filter(
          (s) => !s.parent_section_key && s.section_type === "teaser_2col_v1" && s.section_key.startsWith("bereich_"),
        );
        const introTitle = t("root.bereiche.title");
        const introText = t("root.bereiche.intro");
        const introLabel = t("root.bereiche.label");

        if (bereichSections.length > 0) {
          return (
            <ContentSection label={introLabel} title={introTitle}>
              <p className="text-muted-foreground leading-relaxed mb-12 max-w-3xl">{introText}</p>
              <div className="space-y-4">
                {bereichSections.map((sec) => (
                  <Teaser2ColV1
                    key={sec.section_key}
                    pageKey="gebaeudekommunikation.root"
                    cms={cms}
                    locale={loc}
                    sectionKey={sec.section_key}
                    children={[]}
                  />
                ))}
              </div>
            </ContentSection>
          );
        }

        // DB-first only: ohne bereich_*-Sections wird nichts gerendert.
        return null;
      })()}

      {/* anwendungsumfelder — DB-first, kein Hardcode-Fallback (Batch 18 / Welle 4).
          Spiegelregel: Admin-Schalter aus -> Section verschwindet hier. */}
      {anwendungsumfelderSection &&
        renderPageSectionByType({
          pageKey: "gebaeudekommunikation.root",
          sectionKey: anwendungsumfelderSection.section_key,
          sectionType: anwendungsumfelderSection.section_type,
          cms,
          locale: loc,
        })}


      {/* snipdoo IP — HARDCODED_CONTENT_WITH_ADMIN_VISIBILITY_BINDING (D2b.3) */}
      {snipdooActive && (
        <ContentSection label={t("root.snipdoo.label")} title={t("root.snipdoo.title")}>
          <div className="grid lg:grid-cols-[1fr_1.4fr] gap-10 items-start">
            <div className="bg-foreground text-background p-8 lg:p-10 flex flex-col h-full">
              <Network className="w-8 h-8 mb-6" strokeWidth={1.5} />
              <h3 className="text-xl md:text-2xl font-heading font-normal mb-4 leading-tight">
                {t("root.snipdoo.card.headline")}
              </h3>
              <p className="text-sm text-background/80 leading-relaxed mb-8">
                {t("root.snipdoo.card.text")}
              </p>
              <Link
                to="/gebaeudekommunikation/snipdoo-ip"
                className="inline-flex items-center gap-2 text-sm border border-background/40 px-5 py-3 hover:bg-background hover:text-foreground transition-colors w-fit mt-auto"
              >
                {t("root.snipdoo.card.cta")} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="space-y-6">
              {zielgruppenKeys.map(key => (
                <div key={key} className="border-l-2 border-foreground pl-5 py-1">
                  <h4 className="font-heading font-medium text-foreground mb-1.5">
                    {t(`root.snipdoo.zielgruppen.${key}.title`)}
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t(`root.snipdoo.zielgruppen.${key}.text`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </ContentSection>
      )}

      {/* ------------------------------------------------------------------
          Generischer Rest-Renderer (Etappe D2 – Musterfix fuer Befundklasse
          AKTIVE_DB_SECTION_OHNE_PUBLIC_RENDERPFAD).

          Diese Page rendert oben einige Bereiche explizit (Hero ueber
          CmsPageLayout, `bereich_*` als Teaser2ColV1, `anwendungsumfelder`
          als cards_v1, hartcodierter snipdoo-Block, dazu `bereiche_intro`
          inline als ContentSection-Kopf der Bereiche-Sektion). Damit der
          Admin trotzdem weitere aktive Standard-Sections (z. B. `faq`)
          aktivieren und veroeffentlichen kann, werden hier alle uebrigen
          aktiven Top-Level-Sections generisch ueber `renderPageSectionByType`
          ausgespielt.

          Doppelrender-Schutz:
          - `hero` / `hero_v1`             — global ueber CmsPageLayout
          - `cta_v1` / `standard_cta`      — global ueber CmsTailCta (PageLayout),
                                             dazu `SKIP_TYPES` im renderPageSectionByType
          - `bereiche_intro`               — bereits inline im Bereiche-Header gerendert
          - `bereich_*`                    — bereits als Teaser2ColV1 gerendert
          - `anwendungsumfelder`           — bereits explizit als cards_v1 gerendert
          - `snipdoo`                      — bewusst hartcodierter Block ohne DB-Gegenpart
      ------------------------------------------------------------------ */}
      {(() => {
        const handledSectionKeys = new Set<string>([
          "hero",
          "bereiche_intro",
          "anwendungsumfelder",
          "snipdoo",
          "standard_cta",
        ]);
        const rest = cms.sections.filter(
          (s) =>
            !s.parent_section_key &&
            !handledSectionKeys.has(s.section_key) &&
            !s.section_key.startsWith("bereich_"),
        );
        return rest.map((s) =>
          renderPageSectionByType({
            pageKey: "gebaeudekommunikation.root",
            sectionKey: s.section_key,
            sectionType: s.section_type,
            cms,
            locale: loc,
          }),
        );
      })()}

    <CmsSourceBadge
      pageKey="gebaeudekommunikation.root"
      source={hasRichContent ? "db" : "fallback"}
      sectionCount={hasRichContent ? dbSectionCount : undefined}
    />
      <SiblingNav pageKey="gebaeudekommunikation.root" />
    </CmsPageLayout>
  );
};

export default Tuerkommunikation;
