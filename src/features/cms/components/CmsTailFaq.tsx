/**
 * CmsTailFaq — rendert eine aktive FAQ-Section (`faq_v1`) am Seitenende,
 * sofern sie nicht bereits inline von der Page-Komponente oder vom
 * `CmsBodyRenderer` ausgespielt wurde.
 *
 * Quelle der Wahrheit: `cms_sections` (RLS filtert ausgeblendete Sections
 * bereits raus, deshalb gilt: vorhanden in `cms.sections` ⇒ Admin sagt
 * sichtbar). Spiegelregel-konform: Admin-Schalter wirkt 1:1.
 *
 * Dedup: `useRenderedSections()` liefert die Section-Keys, die im aktuellen
 * Render-Pass von einer V1-Komponente bereits markiert wurden (FaqV1
 * registriert sich selbst). Steht der Key schon drin, rendern wir hier
 * nichts mehr.
 *
 * Damit muss eine Legacy-Page nichts ändern: erscheint ein FAQ-Block im
 * Admin als aktiv, taucht er auf der Public-Seite am Seitenende auf.
 */
import { useTranslation } from "react-i18next";

import { FaqV1 } from "@/features/cms/components/sections/FaqV1";
import {
  useCmsPageContent,
  normalizeLocale,
} from "@/features/cms/hooks/useCmsPageContent";
import { useRenderedSections } from "./CmsRenderRegistry";

interface Props {
  pageKey: string;
}

const FAQ_TYPES = new Set(["faq_v1", "faq"]);

export default function CmsTailFaq({ pageKey }: Props) {
  const { i18n } = useTranslation();
  const cms = useCmsPageContent(pageKey);
  const locale = normalizeLocale(i18n.language);
  const alreadyRendered = useRenderedSections();

  const candidates = cms.sections.filter(
    (s) =>
      !s.parent_section_key &&
      FAQ_TYPES.has(s.section_type ?? "") &&
      !alreadyRendered.has(s.section_key),
  );
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
        return (
          <FaqV1
            key={`tail-faq-${sec.section_key}`}
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
