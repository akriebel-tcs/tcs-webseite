/**
 * CmsTailCta — rendert die globale Projekt-CTA-Sektion (`cta_v1`) am
 * Ende einer Seite, vollständig aus der Datenbank.
 *
 * Suchreihenfolge der Section:
 *   1. expliziter `sectionKey` aus den Props
 *   2. „standard_cta" (Standard für die meisten Seiten)
 *   3. „cta" (Altbestand, z. B. home.start/cta)
 *
 * Wenn keine passende Section existiert, gibt die Komponente `null`
 * zurück — der Aufrufer (z. B. PageLayout) kann dann einen i18n-Fallback
 * rendern oder bewusst nichts ausspielen. Auf der öffentlichen Seite gibt
 * es damit **eine einzige Wahrheit**: das Erscheinungsbild und die
 * Ein-/Ausblendregeln stammen ausschließlich aus `cms_section_fields`
 * (z. B. `show_phone`, `show_email`, `show_secondary`).
 */
import { useTranslation } from "react-i18next";

import { CtaV1 } from "@/features/cms/components/sections/CtaV1";
import {
  useCmsPageContent,
  normalizeLocale,
} from "@/features/cms/hooks/useCmsPageContent";
import { useRenderedSections } from "./CmsRenderRegistry";

interface Props {
  pageKey: string;
  /** Optionaler expliziter Section-Key. */
  sectionKey?: string;
}

const CTA_TYPES = new Set(["cta_v1", "cta"]);

export default function CmsTailCta({ pageKey, sectionKey }: Props) {
  const { i18n } = useTranslation();
  const cms = useCmsPageContent(pageKey);
  const locale = normalizeLocale(i18n.language);
  const alreadyRendered = useRenderedSections();

  // Mit explizitem sectionKey: exakt diese eine Section suchen (Legacy).
  // Ohne sectionKey: ALLE aktiven cta_v1-Sections der Seite ausspielen,
  // die noch nicht inline gerendert wurden — sortiert nach sort_order.
  // Damit erscheinen z. B. `broschure_kita` (sort 50) UND `standard_cta`
  // (sort 60) auf derselben Seite in korrekter Reihenfolge, ohne dass
  // die Page-Komponente etwas anpassen muss.
  const candidates = (sectionKey
    ? cms.sections.filter(
        (s) =>
          !s.parent_section_key &&
          s.section_key === sectionKey &&
          CTA_TYPES.has(s.section_type ?? "") &&
          !alreadyRendered.has(s.section_key),
      )
    : cms.sections.filter(
        (s) =>
          !s.parent_section_key &&
          CTA_TYPES.has(s.section_type ?? "") &&
          !alreadyRendered.has(s.section_key),
      )
  )
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  if (candidates.length === 0) return null;

  return (
    <>
      {candidates.map((sec) => {
        const children = cms.sections
          .filter((c) => c.parent_section_key === sec.section_key)
          .map((c) => ({ section_key: c.section_key, section_type: c.section_type ?? null }));
        return (
          <CtaV1
            key={`tail-cta-${sec.section_key}`}
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

/**
 * Liefert true, wenn für die Seite eine renderbare CTA-Section vorhanden ist.
 * Wird von PageLayout genutzt, um den i18n-Fallback NUR dann zu zeigen,
 * wenn die DB keinen CTA-Block hat (Übergangsphase bis 100% Abdeckung).
 */
export function useHasCmsTailCta(pageKey: string | null | undefined, sectionKey?: string): boolean {
  const cms = useCmsPageContent(pageKey ?? null);
  if (!pageKey) return false;
  return cms.sections.some(
    (s) =>
      !s.parent_section_key &&
      CTA_TYPES.has(s.section_type ?? "") &&
      (sectionKey ? s.section_key === sectionKey : true),
  );
}
