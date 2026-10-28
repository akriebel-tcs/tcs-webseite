/**
 * InterneKommunikationPage (P-071) — Batch 34b.
 *
 * Rendert die Seite vollständig DB-first aus den Standard-Sections, die in
 * Batch 34a angelegt und in Batch 34b aktiviert wurden:
 *   - hero (hero_v1)              → via CmsPageLayout
 *   - einrichtung_intern          (teaser_2col_v1)
 *   - anforderungen               (cards_v1 + card_v1-Kinder, Bestand)
 *   - leistungen_intern_kommunikation (cards_v1 + card_v1-Kinder)
 *   - leistungen_intern_automatik     (cards_v1 + card_v1-Kinder)
 *   - leistungen_intern_einsatz       (cards_v1 + card_v1-Kinder)
 *   - systembausteine_intern          (cards_v1 + card_v1-Kinder)
 *   - broschure_intern                (cta_v1, inline als Download-Link)
 *   - faq (faq_v1)
 *   - standard_cta (cta_v1)           → via CmsTailCta in PageLayout
 *
 * Layout, Texte, Bilder, Icons, Links: alle aus der DB. Keine hartkodierten
 * Inhalte mehr. Die alten Sondercontainer `content`, `leistungen`,
 * `systembausteine`, `broschure` (Typ content_v1) sind ab Batch 34b inaktiv
 * und werden von RLS herausgefiltert. Sie bleiben als Backup in der DB.
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

const PAGE_KEY = "anwendungen.interne-kommunikation";

const SECTION_ORDER = [
  "einrichtung_intern",
  "anforderungen",
  "leistungen_intern_kommunikation",
  "leistungen_intern_automatik",
  "leistungen_intern_einsatz",
  "systembausteine_intern",
  // broschure_intern (cta_v1) wird inline als Download-Link gerendert
  "faq",
];

interface BroschureLinkProps {
  cms: CmsPageContent;
  sectionKey: string;
  loc: AppLocale;
}

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

const InterneKommunikation = () => {
  const cms = useCmsPageContent(PAGE_KEY);
  const { i18n } = useTranslation();
  const loc = normalizeLocale(i18n.language);

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

  const dbSectionCount = cms.sections.filter(
    (s) =>
      !s.parent_section_key &&
      s.section_type !== "hero" &&
      s.section_type !== "hero_v1",
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
      {SECTION_ORDER.map((sk) => (
        <div key={sk}>{renderTopSection(sk)}</div>
      ))}

      <BroschureLink cms={cms} sectionKey="broschure_intern" loc={loc} />

      <CmsSourceBadge
        pageKey={PAGE_KEY}
        source={hasRichContent ? "db" : "fallback"}
        sectionCount={hasRichContent ? dbSectionCount : undefined}
      />
      <SiblingNav pageKey={PAGE_KEY} />
    </CmsPageLayout>
  );
};

export default InterneKommunikation;
