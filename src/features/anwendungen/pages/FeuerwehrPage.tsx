import AnwendungDetailPage, { AnwendungPageData } from "@/features/anwendungen/components/AnwendungDetailPage";
import { Siren, Fence, KeyRound, Video, Shield } from "lucide-react";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";

const Feuerwehr = () => {
  const { t, cms, loc } = useCmsI18n("anwendungen.oeffentlich.feuerwehr", "anwendungen", "oeffentlich.feuerwehr");
  const base = "oeffentlich.feuerwehr";

  const data: AnwendungPageData = {
    label: t("shared.labelsCommon.anwendungsloesung"),
    headline: t(`${base}.headline`),
    intro: t(`${base}.intro`),
    heroImage: "",
    description: t(`${base}.description`),
    anforderungen: [
      { icon: Siren, label: t(`${base}.anforderungen.alarmierung.label`), text: t(`${base}.anforderungen.alarmierung.text`) },
      { icon: Fence, label: t(`${base}.anforderungen.tore.label`), text: t(`${base}.anforderungen.tore.text`) },
      { icon: KeyRound, label: t(`${base}.anforderungen.zutritt.label`), text: t(`${base}.anforderungen.zutritt.text`) },
      { icon: Video, label: t(`${base}.anforderungen.video.label`), text: t(`${base}.anforderungen.video.text`) },
      { icon: Shield, label: t(`${base}.anforderungen.robust.label`), text: t(`${base}.anforderungen.robust.text`) },
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
      href: "https://www.tcsag.de/fileadmin/user_upload/TCS_DE/Metanavigation/Downloads/Anwendungen/TCS_in_Feuerwehren.pdf",
    },
    verwandteAnwendungen: [
      { label: t("shared.verwandte.feuerwehrdurchsage"), href: "/gebaeudekommunikation/systemloesungen/bewohnerinformation-im-sonderfall" },
      { label: t("shared.verwandte.behoerde"), href: "/anwendungen/behoerde" },
      { label: t("shared.verwandte.concierge"), href: "/anwendungen/concierge" },
      { label: t("shared.verwandte.schule"), href: "/anwendungen/bildungseinrichtungen" },
    ],
  };

  return <AnwendungDetailPage data={data} pageKey="anwendungen.feuerwehr" />;
};

export default Feuerwehr;
