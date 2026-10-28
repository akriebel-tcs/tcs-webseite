import AnwendungDetailPage, { AnwendungPageData } from "@/features/anwendungen/components/AnwendungDetailPage";
import { Accessibility, HeartPulse, Video, ShieldCheck } from "lucide-react";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";

const BidirektionaleVideo = () => {
  // Batch 19: pageKey muss auf die echte CMS-Seite zeigen (Spiegel-Regel),
  // damit `useCmsI18n` die DB-Inhalte aus `anwendungen.bidirektionale-video`
  // liest. Der i18n-rootPrefix bleibt unverändert.
  const { t, cms, loc } = useCmsI18n("anwendungen.bidirektionale-video", "anwendungen", "funktionen.bidirektionaleVideo");

  const anforderungenIcons = [
    { key: "barrierefreiheit", icon: Accessibility },
    { key: "pflege", icon: HeartPulse },
    { key: "kameras", icon: Video },
    { key: "datenschutz", icon: ShieldCheck },
  ];

  const anforderungen = anforderungenIcons.map(({ key, icon }) => ({
    icon,
    label: t(`funktionen.bidirektionaleVideo.anforderungen.${key}.label`),
    text: t(`funktionen.bidirektionaleVideo.anforderungen.${key}.text`),
  }));

  const leistungenKeys = ["video", "barrierefreiheit", "einsatz"];
  const leistungen = leistungenKeys.map((key) => ({
    title: t(`funktionen.bidirektionaleVideo.leistungen.${key}.title`),
    items: t(`funktionen.bidirektionaleVideo.leistungen.${key}.items`, { returnObjects: true }) as string[],
  }));

  const systembausteineKeys = ["innenstation", "aussenstation", "leitstelle"];
  const systembausteine = systembausteineKeys.map((key) => ({
    label: t(`funktionen.bidirektionaleVideo.systembausteine.${key}.label`),
    title: t(`funktionen.bidirektionaleVideo.systembausteine.${key}.title`),
    description: t(`funktionen.bidirektionaleVideo.systembausteine.${key}.description`),
  }));

  const data: AnwendungPageData = {
    label: t("shared.labelsCommon.anwendungsloesung"),
    headline: t("funktionen.bidirektionaleVideo.headline"),
    intro: t("funktionen.bidirektionaleVideo.intro"),
    heroImage: "",
    description: t("funktionen.bidirektionaleVideo.description"),
    anforderungen,
    leistungen,
    systembausteine,
    broschure: {
      label: t("funktionen.bidirektionaleVideo.broschure.label"),
      href: "https://www.tcsag.de/fileadmin/user_upload/TCS_DE/Metanavigation/Downloads/TCSplus/SYS09_Bidirektionale_Videosprechanlage.pdf",
    },
    verwandteAnwendungen: [
      { label: t("shared.verwandte.pflege"), href: "/anwendungen/pflege" },
      { label: t("shared.verwandte.klinik"), href: "/anwendungen/klinik" },
      { label: t("shared.verwandte.interneKommunikation"), href: "/anwendungen/interne-kommunikation" },
    ],
  };

  return <AnwendungDetailPage data={data} pageKey="anwendungen.bidirektionale-video" />;
};

export default BidirektionaleVideo;
