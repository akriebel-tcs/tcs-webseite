import AnwendungDetailPage, { AnwendungPageData } from "@/features/anwendungen/components/AnwendungDetailPage";
import { MonitorPlay, Fence, Video, Users, Network } from "lucide-react";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";

const Concierge = () => {
  // Batch 19: pageKey auf echte CMS-Seite (Spiegel-Regel).
  const { t, cms, loc } = useCmsI18n("anwendungen.concierge", "anwendungen", "funktionen.concierge");

  const anforderungenIcons = [
    { key: "pfoertnerplatz", icon: MonitorPlay },
    { key: "schranken", icon: Fence },
    { key: "video", icon: Video },
    { key: "besucher", icon: Users },
    { key: "vernetzung", icon: Network },
  ];

  const anforderungen = anforderungenIcons.map(({ key, icon }) => ({
    icon,
    label: t(`funktionen.concierge.anforderungen.${key}.label`),
    text: t(`funktionen.concierge.anforderungen.${key}.text`),
  }));

  const leistungenKeys = ["empfang", "sicherheit", "vernetzung"];
  const leistungen = leistungenKeys.map((key) => ({
    title: t(`funktionen.concierge.leistungen.${key}.title`),
    items: t(`funktionen.concierge.leistungen.${key}.items`, { returnObjects: true }) as string[],
  }));

  const systembausteineKeys = ["leitstelle", "aussenstation", "schranken", "gateway"];
  const systembausteine = systembausteineKeys.map((key) => ({
    label: t(`funktionen.concierge.systembausteine.${key}.label`),
    title: t(`funktionen.concierge.systembausteine.${key}.title`),
    description: t(`funktionen.concierge.systembausteine.${key}.description`),
  }));

  const data: AnwendungPageData = {
    label: t("shared.labelsCommon.anwendungsloesung"),
    headline: t("funktionen.concierge.headline"),
    intro: t("funktionen.concierge.intro"),
    heroImage: "",
    description: t("funktionen.concierge.description"),
    anforderungen,
    leistungen,
    systembausteine,
    broschure: {
      label: t("funktionen.concierge.broschure.label"),
      href: "https://www.tcsag.de/fileadmin/user_upload/TCS_DE/Metanavigation/Downloads/TCSplus/SYS01_Concierge_und_Schrankenanlagen.pdf",
    },
    verwandteAnwendungen: [
      { label: t("shared.verwandte.grossanlage"), href: "/anwendungen/grossanlage" },
      { label: t("shared.verwandte.behoerde"), href: "/anwendungen/behoerde" },
      { label: t("shared.verwandte.zutrittskontrolleBCM"), href: "/anwendungen/zutrittskontrolle-bcm" },
    ],
  };

  return <AnwendungDetailPage data={data} pageKey="anwendungen.concierge" />;
};

export default Concierge;
