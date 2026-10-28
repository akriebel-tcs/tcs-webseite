import AnwendungDetailPage, { AnwendungPageData } from "@/features/anwendungen/components/AnwendungDetailPage";
import { Users, UserCog, KeyRound, Video, Smartphone, Network } from "lucide-react";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";

const Mehrfamilienhaus = () => {
  const { t, cms, loc } = useCmsI18n("anwendungen.wohnen.mehrfamilienhaus", "anwendungen", "wohnen.mehrfamilienhaus");
  const base = "wohnen.mehrfamilienhaus";

  const data: AnwendungPageData = {
    label: t("shared.labelsCommon.anwendungsloesung"),
    headline: t(`${base}.headline`),
    intro: t(`${base}.intro`),
    heroImage: "",
    description: t(`${base}.description`),
    anforderungen: [
      { icon: Users, label: t(`${base}.anforderungen.vieleEinheiten.label`), text: t(`${base}.anforderungen.vieleEinheiten.text`) },
      { icon: UserCog, label: t(`${base}.anforderungen.namensverwaltung.label`), text: t(`${base}.anforderungen.namensverwaltung.text`) },
      { icon: KeyRound, label: t(`${base}.anforderungen.zutritt.label`), text: t(`${base}.anforderungen.zutritt.text`) },
      { icon: Video, label: t(`${base}.anforderungen.video.label`), text: t(`${base}.anforderungen.video.text`) },
      { icon: Smartphone, label: t(`${base}.anforderungen.mobil.label`), text: t(`${base}.anforderungen.mobil.text`) },
      { icon: Network, label: t(`${base}.anforderungen.vernetzung.label`), text: t(`${base}.anforderungen.vernetzung.text`) },
    ],
    leistungen: [
      {
        title: t(`${base}.leistungen.kommunikation.title`),
        items: t(`${base}.leistungen.kommunikation.items`, { returnObjects: true }) as string[],
      },
      {
        title: t(`${base}.leistungen.verwaltung.title`),
        items: t(`${base}.leistungen.verwaltung.items`, { returnObjects: true }) as string[],
      },
      {
        title: t(`${base}.leistungen.skalierung.title`),
        items: t(`${base}.leistungen.skalierung.items`, { returnObjects: true }) as string[],
      },
    ],
    systembausteine: [
      { label: t(`${base}.systembausteine.aussenstation.label`), title: t(`${base}.systembausteine.aussenstation.title`), description: t(`${base}.systembausteine.aussenstation.description`) },
      { label: t(`${base}.systembausteine.innenstation.label`), title: t(`${base}.systembausteine.innenstation.title`), description: t(`${base}.systembausteine.innenstation.description`) },
      { label: t(`${base}.systembausteine.bcm.label`), title: t(`${base}.systembausteine.bcm.title`), description: t(`${base}.systembausteine.bcm.description`) },
      { label: t(`${base}.systembausteine.mobil.label`), title: t(`${base}.systembausteine.mobil.title`), description: t(`${base}.systembausteine.mobil.description`) },
    ],
    verwandteAnwendungen: [
      { label: t("shared.verwandte.grossanlage"), href: "/anwendungen/grossanlage" },
      { label: t("shared.verwandte.pflege"), href: "/anwendungen/pflege" },
      { label: t("shared.verwandte.wohnheim"), href: "/anwendungen/bildungseinrichtungen" },
      { label: t("shared.verwandte.einfamilienhaus"), href: "/anwendungen/einfamilienhaus" },
    ],
  };

  return <AnwendungDetailPage data={data} pageKey="anwendungen.mehrfamilienhaus" />;
};

export default Mehrfamilienhaus;
