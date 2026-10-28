/**
 * CmsOptionalImage — rendert ein CMS-Bild nur dann, wenn der Slot in der
 * Datenbank tatsächlich ein aktives Asset enthält. Ohne aktives Asset wird
 * gar nichts ausgegeben (kein Platzhalter, kein leerer Container).
 *
 * Ziel: Seiten, die heute kein Bild haben (z. B. Karriere, Kontakt, Presse,
 * Legal, Serviceportal, Über TCS, Home), können vom Admin später ein Bild
 * erhalten — ohne dass dafür Code angefasst werden muss.
 */
import { useTranslation } from "react-i18next";
import type { CmsPageContent } from "@/features/cms/hooks/useCmsPageContent";
import { normalizeAppLocale } from "@/i18n/locale";

type Variant = "hero" | "inline";

interface Props {
  cms: CmsPageContent;
  sectionKey: string;
  fieldKey?: string;
  variant?: Variant;
  altFallback?: string;
  className?: string;
}

export function CmsOptionalImage({
  cms,
  sectionKey,
  fieldKey = "image",
  variant = "inline",
  altFallback = "",
  className,
}: Props) {
  const { i18n } = useTranslation();
  const locale = normalizeAppLocale(i18n.language);

  const url = cms.asset(sectionKey, fieldKey, "");
  if (!url) return null;
  const alt = cms.assetAlt(sectionKey, fieldKey, locale, altFallback);

  if (variant === "hero") {
    return (
      <section className={className ?? "w-full"}>
        <img
          src={url}
          alt={alt}
          loading="eager"
          className="h-[280px] w-full object-cover sm:h-[360px] md:h-[440px]"
        />
      </section>
    );
  }
  return (
    <section className={className ?? "container mx-auto px-4 py-8"}>
      <img
        src={url}
        alt={alt}
        loading="lazy"
        className="h-auto w-full rounded-lg object-cover"
      />
    </section>
  );
}
