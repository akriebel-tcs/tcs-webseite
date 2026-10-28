import { usePersona } from "@/contexts/PersonaContext";
import HeroSection from "@/components/HeroSection";
import StatsSection from "@/components/StatsSection";
import ContentBlocksIntro from "@/components/ContentBlocksIntro";
import ContentBlockItem from "@/components/ContentBlockItem";
import PersonaSection from "@/components/PersonaSection";
import CTASection from "@/components/CTASection";
import BauherrenContent from "@/features/personas/bauherr/components/BauherrenContent";
import WohnungswirtschaftContent from "@/features/personas/wohnungswirtschaft/components/WohnungswirtschaftContent";
import FachplanerContent from "@/features/personas/fachplaner/components/FachplanerContent";
import HandwerkContent from "@/features/personas/handwerk/components/HandwerkContent";
import FachhandelContent from "@/features/personas/fachhandel/components/FachhandelContent";
import ArchitektenContent from "@/features/personas/architekt/components/ArchitektenContent";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";
import { Teaser2ColV1 } from "@/features/cms/components/sections/Teaser2ColV1";
import { renderPageSectionByType } from "@/features/cms/lib/renderPageSection";


import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import { CmsOptionalImage } from "@/features/cms/components/CmsOptionalImage";

const personaComponents: Record<string, React.FC> = {
  bauherren: BauherrenContent,
  architekten: ArchitektenContent,
  wohnungswirtschaft: WohnungswirtschaftContent,
  fachplaner: FachplanerContent,
  handwerk: HandwerkContent,
  fachhandel: FachhandelContent,
};

const PAGE_KEY = "home.start";

/**
 * Top-Level-Sections: Reihenfolge und Sichtbarkeit kommen aus cms_sections
 * (sort_order, is_active). Für einige Blöcke gibt es weiterhin eigene
 * Layout-Komponenten (Bühne, Zahlen, Lösungs-Intro, Zielgruppen, Abschluss-CTA);
 * alle übrigen aktiven Top-Level-Blöcke laufen über den allgemeinen
 * Baustein-Renderer `renderPageSectionByType` — genau wie auf allen anderen
 * Seiten. Kind-Sections (`*_item_*`) rendern die jeweiligen Bausteine selbst.
 */
const SPECIAL_RENDERERS: Record<string, () => JSX.Element> = {
  hero: () => <HeroSection />,
  stats: () => <StatsSection />,
  content_blocks_intro: () => <ContentBlocksIntro />,
  personas: () => <PersonaSection />,
  cta: () => <CTASection />,
};

const FALLBACK_ORDER = [
  "hero",
  "stats",
  "content_blocks_intro",
  "block_communication",
  "block_access",
  "block_entry",
  "block_signage",
  "block_solutions",
  "block_gebaeudemanagement",
  "personas",
  "cta",
];

const Index = () => {
  const { activePersona } = usePersona();
  const { cms, loc } = useCmsI18n(PAGE_KEY, undefined);
  const dbSectionCount = cms.sections.filter((s) => !s.parent_section_key && s.section_type !== "hero").length;

  if (activePersona && personaComponents[activePersona]) {
    const PersonaComponent = personaComponents[activePersona];
    return <PersonaComponent />;
  }

  const topLevel = cms.sections.filter((s) => !s.parent_section_key);
  const orderedKeys =
    topLevel.length > 0 ? topLevel.map((s) => s.section_key) : FALLBACK_ORDER;

  // Position innerhalb der block_*-Reihenfolge (für Bild-links/rechts-Wechsel
  // bei Blöcken ohne `teaser_2col_v1`-Typ und somit Legacy-Renderer).
  let blockPos = 0;

  // Spiegelregel: Reihenfolge & Sichtbarkeit aus DB, Layout/Bilder bleiben
  // im Code. Texte/Bilder ziehen die Komponenten selbst aus der DB.
  const hasRichContent = cms.hasDbContent && dbSectionCount > 0;
  return (
    <div data-cms-page={PAGE_KEY}>
      {orderedKeys.map((key) => {
        const sec = cms.sections.find((s) => s.section_key === key);

        if (key.startsWith("block_")) {
          // DB-first: wenn die Section bereits als teaser_2col_v1 modelliert
          // ist, mit dem Standard-Wechselteaser-Renderer rendern.
          if (sec?.section_type === "teaser_2col_v1") {
            return (
              <Teaser2ColV1
                key={key}
                {...{
                  pageKey: PAGE_KEY,
                  cms,
                  locale: loc,
                  sectionKey: key,
                  children: [],
                }}
              />
            );
          }
          const idx = blockPos++;
          return <ContentBlockItem key={key} sectionKey={key} positionIndex={idx} />;
        }

        const special = SPECIAL_RENDERERS[key];
        if (special) return <div key={key}>{special()}</div>;

        // Alle übrigen redaktionellen Blöcke: allgemeiner Baustein-Renderer.
        const node = renderPageSectionByType({
          pageKey: PAGE_KEY,
          sectionKey: key,
          sectionType: sec?.section_type ?? null,
          cms,
          locale: loc,
        });
        if (!node) return null;
        return <div key={key}>{node}</div>;
      })}

      <CmsOptionalImage cms={cms} variant="inline" sectionKey="inline" />
      <CmsSourceBadge
        pageKey="home.start"
        source={hasRichContent ? "db" : "fallback"}
        sectionCount={hasRichContent ? dbSectionCount : undefined}
      />
    </div>
  );
};

export default Index;
