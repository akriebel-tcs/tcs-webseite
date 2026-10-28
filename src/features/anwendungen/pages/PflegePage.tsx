import AnwendungDetailPage, { AnwendungPageData } from "@/features/anwendungen/components/AnwendungDetailPage";
import { Accessibility, Bell, KeyRound, Monitor, Maximize } from "lucide-react";
import { useCmsPageFields, pickCmsOrFallback } from "@/features/cms/hooks/useCmsPageFields";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";

const Pflege = () => {
  const { t } = useCmsI18n("anwendungen.gesundheit.pflege", "anwendungen", "gesundheit.pflege");
  const base = "gesundheit.pflege";

  // CMS-Light Pilot-Leseanbindung (read-only). Fällt bei leerem/Draft-CMS
  // automatisch auf die bestehenden i18n/static-Werte zurück.
  const { fields: cms } = useCmsPageFields("anwendungen.pflege");

  const data: AnwendungPageData = {
    label: t("shared.labelsCommon.anwendungsloesung"),
    headline: pickCmsOrFallback(cms, "hero.headline", t(`${base}.headline`)),
    intro: pickCmsOrFallback(cms, "hero.intro", t(`${base}.intro`)),
    heroImage: "",
    description: pickCmsOrFallback(cms, "answer-first.text", t(`${base}.description`)),
    anforderungen: [
      { icon: Accessibility, label: t(`${base}.anforderungen.barrierefreiheit.label`), text: t(`${base}.anforderungen.barrierefreiheit.text`) },
      { icon: Bell, label: t(`${base}.anforderungen.notruf.label`), text: t(`${base}.anforderungen.notruf.text`) },
      { icon: KeyRound, label: t(`${base}.anforderungen.zutritt.label`), text: t(`${base}.anforderungen.zutritt.text`) },
      { icon: Monitor, label: t(`${base}.anforderungen.infotafeln.label`), text: t(`${base}.anforderungen.infotafeln.text`) },
      { icon: Maximize, label: t(`${base}.anforderungen.skalierbarkeit.label`), text: t(`${base}.anforderungen.skalierbarkeit.text`) },
    ],
    leistungen: [
      {
        title: t(`${base}.leistungen.sicherheit.title`),
        items: t(`${base}.leistungen.sicherheit.items`, { returnObjects: true }) as string[],
      },
      {
        title: t(`${base}.leistungen.assistenz.title`),
        items: t(`${base}.leistungen.assistenz.items`, { returnObjects: true }) as string[],
      },
      {
        title: t(`${base}.leistungen.orientierung.title`),
        items: t(`${base}.leistungen.orientierung.items`, { returnObjects: true }) as string[],
      },
    ],
    systembausteine: [
      { label: t(`${base}.systembausteine.aussenstation.label`), title: t(`${base}.systembausteine.aussenstation.title`), description: t(`${base}.systembausteine.aussenstation.description`) },
      { label: t(`${base}.systembausteine.leitstelle.label`), title: t(`${base}.systembausteine.leitstelle.title`), description: t(`${base}.systembausteine.leitstelle.description`) },
      { label: t(`${base}.systembausteine.bcm.label`), title: t(`${base}.systembausteine.bcm.title`), description: t(`${base}.systembausteine.bcm.description`) },
      { label: t(`${base}.systembausteine.signage.label`), title: t(`${base}.systembausteine.signage.title`), description: t(`${base}.systembausteine.signage.description`) },
    ],
    broschure: {
      label: t(`${base}.broschure.label`),
      href: "https://www.tcsag.de/fileadmin/user_upload/TCS_DE/Metanavigation/Downloads/Anwendungen/TCS_in_Pflege_und_Betreutem_Wohnen.pdf",
    },
    verwandteAnwendungen: [
      { label: t("shared.verwandte.bidirektionaleVideo"), href: "/anwendungen/bidirektionale-video" },
      { label: t("shared.verwandte.klinik"), href: "/anwendungen/klinik" },
      { label: t("shared.verwandte.wohnheim"), href: "/anwendungen/bildungseinrichtungen" },
      { label: t("shared.verwandte.interneKommunikation"), href: "/anwendungen/interne-kommunikation" },
    ],
  };

  return <AnwendungDetailPage data={data} pageKey="anwendungen.pflege" />;
};

export default Pflege;
