import AnwendungDetailPage, { AnwendungPageData } from "@/features/anwendungen/components/AnwendungDetailPage";
import { Users, Monitor, Network, KeyRound, UserCog } from "lucide-react";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";

const Grossanlage = () => {
  const { t, cms, loc } = useCmsI18n("anwendungen.wohnen.grossanlage", "anwendungen", "wohnen.grossanlage");
  const base = "wohnen.grossanlage";

  const data: AnwendungPageData = {
    label: t("shared.labelsCommon.anwendungsloesung"),
    headline: t(`${base}.headline`),
    intro: t(`${base}.intro`),
    heroImage: "",
    description: t(`${base}.description`),
    anforderungen: [
      { icon: Users, label: t(`${base}.anforderungen.teilnehmer.label`), text: t(`${base}.anforderungen.teilnehmer.text`) },
      { icon: Monitor, label: t(`${base}.anforderungen.display.label`), text: t(`${base}.anforderungen.display.text`) },
      { icon: Network, label: t(`${base}.anforderungen.ip.label`), text: t(`${base}.anforderungen.ip.text`) },
      { icon: KeyRound, label: t(`${base}.anforderungen.zutritt.label`), text: t(`${base}.anforderungen.zutritt.text`) },
      { icon: UserCog, label: t(`${base}.anforderungen.concierge.label`), text: t(`${base}.anforderungen.concierge.text`) },
    ],
    leistungen: [
      {
        title: t(`${base}.leistungen.kommunikation.title`),
        items: t(`${base}.leistungen.kommunikation.items`, { returnObjects: true }) as string[],
      },
      {
        title: t(`${base}.leistungen.sicherheit.title`),
        items: t(`${base}.leistungen.sicherheit.items`, { returnObjects: true }) as string[],
      },
      {
        title: t(`${base}.leistungen.vernetzung.title`),
        items: t(`${base}.leistungen.vernetzung.items`, { returnObjects: true }) as string[],
      },
    ],
    systembausteine: [
      { label: t(`${base}.systembausteine.display.label`), title: t(`${base}.systembausteine.display.title`), description: t(`${base}.systembausteine.display.description`) },
      { label: t(`${base}.systembausteine.innenstation.label`), title: t(`${base}.systembausteine.innenstation.title`), description: t(`${base}.systembausteine.innenstation.description`) },
      { label: t(`${base}.systembausteine.bcm.label`), title: t(`${base}.systembausteine.bcm.title`), description: t(`${base}.systembausteine.bcm.description`) },
      { label: t(`${base}.systembausteine.gateway.label`), title: t(`${base}.systembausteine.gateway.title`), description: t(`${base}.systembausteine.gateway.description`) },
    ],
    verwandteAnwendungen: [
      { label: t("shared.verwandte.mehrfamilienhaus"), href: "/anwendungen/mehrfamilienhaus" },
      { label: t("shared.verwandte.behoerde"), href: "/anwendungen/behoerde" },
      { label: t("shared.verwandte.klinik"), href: "/anwendungen/klinik" },
    ],
  };

  return <AnwendungDetailPage data={data} pageKey="anwendungen.grossanlage" />;
};

export default Grossanlage;
