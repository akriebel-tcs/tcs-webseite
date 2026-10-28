import { useTranslation } from "react-i18next";
import {
  useCmsPageContent,
  normalizeLocale,
} from "@/features/cms/hooks/useCmsPageContent";

/**
 * Nur Überschrift + Intro-Text der Lösungsbereiche.
 * Die einzelnen Lösungsblöcke werden separat als ContentBlockItem gerendert,
 * damit die Reihenfolge im Admin (sort_order) 1:1 auf der Webseite landet.
 */
interface Props {
  pageKey?: string;
}

const ContentBlocksIntro: React.FC<Props> = ({ pageKey = "home.start" }) => {
  const { t, i18n } = useTranslation("home");
  const cms = useCmsPageContent(pageKey);
  const loc = normalizeLocale(i18n.language);

  const sectionHeadline =
    cms.text("content_blocks_intro", "headline", loc) ||
    cms.text("content_blocks", "headline", loc, t("contentBlocks.headline"));
  const sectionIntro =
    cms.text("content_blocks_intro", "intro", loc) ||
    cms.text("content_blocks", "intro", loc, t("contentBlocks.intro"));

  return (
    <section className="pt-20 lg:pt-28 pb-8" id="loesungen">
      <div className="container mx-auto">
        <div>
          <h2 className="text-3xl md:text-4xl lg:text-[2.75rem] font-heading font-normal text-foreground leading-tight max-w-2xl">
            {sectionHeadline}
          </h2>
          <p className="text-muted-foreground mt-5 max-w-xl text-base">{sectionIntro}</p>
        </div>
      </div>
    </section>
  );
};

export default ContentBlocksIntro;
