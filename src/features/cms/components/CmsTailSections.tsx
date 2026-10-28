/**
 * CmsTailSections — rendert FAQ- und CTA-Tail-Sections gemeinsam,
 * sortiert nach typübergreifendem `sort_order`. Damit erscheinen
 * z. B. broschure_kita (cta_v1, sort 50), faq (faq_v1, sort 55) und
 * standard_cta (cta_v1, sort 60) in exakt dieser Reihenfolge.
 *
 * Dedup über `useRenderedSections()`: bereits inline gerenderte
 * Sections werden hier nicht erneut gerendert. Inaktive Sections
 * filtert die RLS bereits aus `cms.sections` heraus.
 */
import { useTranslation } from "react-i18next";

import { CtaV1 } from "@/features/cms/components/sections/CtaV1";
import { FaqV1 } from "@/features/cms/components/sections/FaqV1";
import {
  useCmsPageContent,
  normalizeLocale,
} from "@/features/cms/hooks/useCmsPageContent";
import { useRenderedSections } from "./CmsRenderRegistry";

interface Props {
  pageKey: string;
}

const CTA_TYPES = new Set(["cta_v1", "cta"]);
const FAQ_TYPES = new Set(["faq_v1", "faq"]);

export default function CmsTailSections({ pageKey }: Props) {
  const { i18n } = useTranslation();
  const cms = useCmsPageContent(pageKey);
  const locale = normalizeLocale(i18n.language);
  const alreadyRendered = useRenderedSections();

  const candidates = cms.sections
    .filter((s) => {
      if (s.parent_section_key) return false;
      if (alreadyRendered.has(s.section_key)) return false;
      const t = s.section_type ?? "";
      return CTA_TYPES.has(t) || FAQ_TYPES.has(t);
    })
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  if (candidates.length === 0) return null;

  return (
    <>
      {candidates.map((sec) => {
        const children = cms.sections
          .filter((c) => c.parent_section_key === sec.section_key)
          .map((c) => ({
            section_key: c.section_key,
            section_type: c.section_type ?? null,
          }));
        const t = sec.section_type ?? "";
        if (FAQ_TYPES.has(t)) {
          return (
            <FaqV1
              key={`tail-${sec.section_key}`}
              pageKey={pageKey}
              cms={cms}
              locale={locale}
              sectionKey={sec.section_key}
              children={children}
              markInlineRendered={false}
            />
          );
        }
        return (
          <CtaV1
            key={`tail-${sec.section_key}`}
            pageKey={pageKey}
            cms={cms}
            locale={locale}
            sectionKey={sec.section_key}
            children={children}
            markInlineRendered={false}
          />
        );
      })}
    </>
  );
}
