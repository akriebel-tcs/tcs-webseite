import AnwendungDetailPage, { AnwendungPageData } from "@/features/anwendungen/components/AnwendungDetailPage";
import { UserCheck, Clock, Video, Accessibility, Droplets } from "lucide-react";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";

const Klinik = () => {
  const { t, cms, loc } = useCmsI18n("anwendungen.gesundheit.klinik", "anwendungen", "gesundheit.klinik");
  const base = "gesundheit.klinik";

  const data: AnwendungPageData = {
    label: t("shared.labelsCommon.anwendungsloesung"),
    headline: t(`${base}.headline`),
    intro: t(`${base}.intro`),
    heroImage: "",
    description: t(`${base}.description`),
    anforderungen: [
      { icon: UserCheck, label: t(`${base}.anforderungen.patientenaufruf.label`), text: t(`${base}.anforderungen.patientenaufruf.text`) },
      { icon: Clock, label: t(`${base}.anforderungen.zutritt.label`), text: t(`${base}.anforderungen.zutritt.text`) },
      { icon: Video, label: t(`${base}.anforderungen.video.label`), text: t(`${base}.anforderungen.video.text`) },
      { icon: Accessibility, label: t(`${base}.anforderungen.barrierefreiheit.label`), text: t(`${base}.anforderungen.barrierefreiheit.text`) },
      { icon: Droplets, label: t(`${base}.anforderungen.hygiene.label`), text: t(`${base}.anforderungen.hygiene.text`) },
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
      href: "https://www.tcsag.de/fileadmin/user_upload/TCS_DE/Metanavigation/Downloads/Anwendungen/TCS_in_Praxis_Aerztehaus_oder_Klinik.pdf",
    },
    verwandteAnwendungen: [
      { label: t("shared.verwandte.pflege"), href: "/anwendungen/pflege" },
      { label: t("shared.verwandte.behoerde"), href: "/anwendungen/behoerde" },
      { label: t("shared.verwandte.grossanlage"), href: "/anwendungen/grossanlage" },
    ],
  };

  return <AnwendungDetailPage data={data} pageKey="anwendungen.klinik" />;
};

export default Klinik;
