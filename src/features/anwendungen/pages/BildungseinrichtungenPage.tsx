/**
 * BildungseinrichtungenPage (P-057) — Batch 33d.
 *
 * Rendert die Seite vollständig DB-first aus den Standard-Sections, die in
 * Batch 33a/33b/33c angelegt wurden:
 *   - hero (hero_v1) → via CmsPageLayout
 *   - 3× Einrichtungsblock (Kita / Schule / Wohnheim), je Block:
 *       - einrichtung_<id>            (teaser_2col_v1)
 *       - anforderungen_<id>          (cards_v1 + card_v1-Kinder)
 *       - leistungen_<id>_sicherheit  (cards_v1 + card_v1-Kinder)
 *       - leistungen_<id>_kommunikation (cards_v1 + card_v1-Kinder)
 *       - leistungen_<id>_orientierung  (cards_v1 + card_v1-Kinder)
 *       - broschure_<id>              (cta_v1, hier inline als Downloadlink
 *                                       gerendert — nicht als Tail-CTA)
 *   - standard_cta (cta_v1)           → via CmsTailCta in PageLayout
 *
 * Layout, Texte, Bilder, Icons, Links: alle aus der DB. Keine
 * hartcodierten Inhalte mehr. Die alten Sondercontainer `sections` und
 * `einrichtungen` sind ab Batch 33d inaktiv und liefern keine Inhalte
 * mehr (RLS filtert sie heraus).
 */
import { useTranslation } from "react-i18next";
import { BookOpen } from "lucide-react";
import SiblingNav from "@/components/SiblingNav";
import CmsPageLayout from "@/features/cms/components/CmsPageLayout";
import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import {
  useCmsPageContent,
  normalizeLocale,
  type CmsPageContent,
} from "@/features/cms/hooks/useCmsPageContent";
import { renderPageSectionByType } from "@/features/cms/lib/renderPageSection";
import type { AppLocale } from "@/i18n/locale";

const PAGE_KEY = "anwendungen.bildungseinrichtungen";

type FacilityId = "kita" | "schule" | "wohnheim";
const FACILITIES: FacilityId[] = ["kita", "schule", "wohnheim"];

interface BroschureLinkProps {
  cms: CmsPageContent;
  sectionKey: string;
  loc: AppLocale;
}

/**
 * Inline-Render für `broschure_<id>` (Section-Typ `cta_v1`).
 * Liest cta_label + cta_href direkt aus den DB-Feldern und rendert einen
 * dezenten Download-Link — KEIN voller CTA-Block (der bleibt am Seitenende
 * für `standard_cta` reserviert).
 */
function BroschureLink({ cms, sectionKey, loc }: BroschureLinkProps) {
  const label = cms.text(sectionKey, "cta_label", loc, "");
  const href =
    cms.text(sectionKey, "cta_href", loc, "") ||
    cms.text(sectionKey, "cta_link", loc, "");
  if (!label || !href) return null;
  return (
    <section
      className="pb-12 lg:pb-16 bg-background"
      data-cms-section={sectionKey}
    >
      <div className="container mx-auto">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-foreground hover:text-muted-foreground transition-colors"
          data-cms-field="cta_label"
        >
          <BookOpen className="w-4 h-4" />
          {label}
        </a>
      </div>
    </section>
  );
}

const Bildungseinrichtungen = () => {
  const cms = useCmsPageContent(PAGE_KEY);
  const { i18n } = useTranslation();
  const loc = normalizeLocale(i18n.language);

  // Render-Helper: nur rendern, wenn die Section auch aktiv im DB-Snapshot
  // vorkommt (Top-Level). RLS filtert inaktive Sections bereits aus.
  const renderTopSection = (sectionKey: string) => {
    const sec = cms.sections.find(
      (s) => !s.parent_section_key && s.section_key === sectionKey,
    );
    if (!sec) return null;
    return renderPageSectionByType({
      pageKey: PAGE_KEY,
      sectionKey,
      sectionType: sec.section_type ?? null,
      cms,
      locale: loc,
    });
  };

  const facilityBlocks = FACILITIES.map((id) => ({
    id,
    sections: [
      `einrichtung_${id}`,
      `anforderungen_${id}`,
      `leistungen_${id}_sicherheit`,
      `leistungen_${id}_kommunikation`,
      `leistungen_${id}_orientierung`,
    ],
    brochure: `broschure_${id}`,
  }));

  const dbSectionCount = cms.sections.filter(
    (s) => !s.parent_section_key && s.section_type !== "hero" && s.section_type !== "hero_v1",
  ).length;
  const hasRichContent = cms.hasDbContent && dbSectionCount > 0;

  return (
    <CmsPageLayout
      pageKey={PAGE_KEY}
      label=""
      headline=""
      intro=""
      heroImage=""
      fullWidth
    >
      {renderTopSection("uebersicht_einrichtungen")}

      {facilityBlocks.map((block) => (
        <div key={block.id} data-facility={block.id} data-cms-page={PAGE_KEY}>
          {block.sections.map((sk) => (
            <div key={sk}>{renderTopSection(sk)}</div>
          ))}
          <BroschureLink cms={cms} sectionKey={block.brochure} loc={loc} />
        </div>
      ))}

      <CmsSourceBadge
        pageKey={PAGE_KEY}
        source={hasRichContent ? "db" : "fallback"}
        sectionCount={hasRichContent ? dbSectionCount : undefined}
      />
      <SiblingNav pageKey={PAGE_KEY} />
    </CmsPageLayout>
  );
};

export default Bildungseinrichtungen;
