import AnwendungDetailPage, { AnwendungPageData } from "@/features/anwendungen/components/AnwendungDetailPage";
import { KeyRound, Cloud, Fence, MapPin, Accessibility } from "lucide-react";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";

const Behoerde = () => {
  const { t, cms, loc } = useCmsI18n("anwendungen.oeffentlich.behoerde", "anwendungen", "oeffentlich.behoerde");
  const base = "oeffentlich.behoerde";

  const data: AnwendungPageData = {
    label: t("shared.labelsCommon.anwendungsloesung"),
    headline: t(`${base}.headline`),
    intro: t(`${base}.intro`),
    heroImage: "",
    description: t(`${base}.description`),
    anforderungen: [
      { icon: KeyRound, label: t(`${base}.anforderungen.zutritt.label`), text: t(`${base}.anforderungen.zutritt.text`) },
      { icon: Cloud, label: t(`${base}.anforderungen.cloud.label`), text: t(`${base}.anforderungen.cloud.text`) },
      { icon: Fence, label: t(`${base}.anforderungen.tore.label`), text: t(`${base}.anforderungen.tore.text`) },
      { icon: MapPin, label: t(`${base}.anforderungen.orientierung.label`), text: t(`${base}.anforderungen.orientierung.text`) },
      { icon: Accessibility, label: t(`${base}.anforderungen.barrierefreiheit.label`), text: t(`${base}.anforderungen.barrierefreiheit.text`) },
    ],
    leistungen: [
      {
        title: t(`${base}.leistungen.sicherheit.title`),
        items: t(`${base}.leistungen.sicherheit.items`, { returnObjects: true }) as string[],
      },
      {
        title: t(`${base}.leistungen.kommunikation.title`),
        items: t(`${base}.leistungen.kommunikation.items`, { returnObjects: true }) as string[],
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
      href: "https://www.tcsag.de/fileadmin/user_upload/TCS_DE/Metanavigation/Downloads/Anwendungen/TCS_in_Behoerden_und_Aemtern.pdf",
    },
    verwandteAnwendungen: [
      { label: t("shared.verwandte.feuerwehr"), href: "/anwendungen/feuerwehr" },
      { label: t("shared.verwandte.schule"), href: "/anwendungen/bildungseinrichtungen" },
      { label: t("shared.verwandte.schwimmbad"), href: "/anwendungen/schwimmbad" },
    ],
  };

  return <AnwendungDetailPage data={data} pageKey="anwendungen.behoerde" />;
};

export default Behoerde;
