import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import PageLayout from "@/components/PageLayout";

import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import { CmsOptionalImage } from "@/features/cms/components/CmsOptionalImage";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";
import LegalCmsBody from "@/features/legal/components/LegalCmsBody";

/**
 * Generische Rechtsseite (DB-first).
 *
 * Alle sichtbaren Texte kommen aus CMS-Light (Block `content`:
 * `label`, `headline`, `intro`, `title`, `text`). Der Code liefert nur
 * Layout und einen Platzhalter-Hinweis, solange `title`/`text` leer sind.
 */
type Props = {
  /** CMS-Light Seitenkennung, z. B. "legal.garantiebedingungen". */
  pageKey: string;
  /** Notfall-Überschrift, falls die Seite in der Datenbank fehlt. */
  fallbackHeadline: string;
  /** Notfall-Subline, falls die Seite in der Datenbank fehlt. */
  fallbackIntro?: string;
};

const LegalSimplePage = ({ pageKey, fallbackHeadline, fallbackIntro = "" }: Props) => {
  const { t, cms, loc } = useCmsI18n(pageKey, "legal");
  const dbSectionCount = cms.sections.filter(
    (s) => !s.parent_section_key && s.section_type !== "hero",
  ).length;
  const hasRichContent = cms.hasDbContent && dbSectionCount > 0;
  const bodyTitle = cms.text("content", "title", loc, "");
  const bodyText = cms.text("content", "text", loc, "");
  const hasCmsBody = bodyTitle.trim().length > 0 || bodyText.trim().length > 0;

  return (
    <>
      <CmsOptionalImage cms={cms} variant="hero" sectionKey="hero" />
      <PageLayout
        label={cms.text("content", "label", loc, "")}
        headline={cms.text("content", "headline", loc, fallbackHeadline)}
        intro={cms.text("content", "intro", loc, fallbackIntro)}
        heroImage={cms.asset("hero", "image", "")}
      >
        <div className="max-w-2xl">
          <LegalCmsBody title={bodyTitle} text={bodyText} />
          {!hasCmsBody && (
            <div className="border border-border bg-muted p-6 md:p-8 mb-8 flex gap-4">
              <AlertCircle className="w-5 h-5 text-foreground flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-foreground mb-2">{t("common.draftBadge")}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{t("common.draftIntro")}</p>
              </div>
            </div>
          )}
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">{t("common.contactCtaIntro")}</p>
          <Link
            to="/kontakt"
            className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background text-sm hover:bg-muted-foreground transition-colors"
          >
            {t("common.contactCtaButton")}
          </Link>
        </div>

        <CmsSourceBadge
          pageKey={pageKey}
          source={hasRichContent ? "db" : "fallback"}
          sectionCount={hasRichContent ? dbSectionCount : undefined}
        />
      </PageLayout>
      <CmsOptionalImage cms={cms} variant="inline" sectionKey="inline" />
    </>
  );
};

export default LegalSimplePage;
