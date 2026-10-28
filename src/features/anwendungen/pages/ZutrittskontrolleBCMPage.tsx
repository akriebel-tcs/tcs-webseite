import AnwendungDetailPage, { AnwendungPageData } from "@/features/anwendungen/components/AnwendungDetailPage";
import { ShieldCheck, KeyRound, Smartphone, Lock, Car, ArrowUpDown, Monitor, Cloud } from "lucide-react";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";

const AccessControlBCMPage = () => {
  // Batch 19: pageKey auf echte CMS-Seite (Spiegel-Regel).
  const { t, cms, loc } = useCmsI18n("anwendungen.zutrittskontrolle-bcm", "anwendungen", "funktionen.zutrittskontrolleBCM");

  const anforderungenIcons = [
    { key: "zutritt", icon: KeyRound },
    { key: "oeffnung", icon: Lock },
    { key: "zufahrten", icon: Car },
    { key: "fahrstuhl", icon: ArrowUpDown },
    { key: "mobil", icon: Smartphone },
    { key: "reservieren", icon: Monitor },
    { key: "alarm", icon: ShieldCheck },
    { key: "cloud", icon: Cloud },
  ];

  const anforderungen = anforderungenIcons.map(({ key, icon }) => ({
    icon,
    label: t(`funktionen.zutrittskontrolleBCM.anforderungen.${key}.label`),
    text: t(`funktionen.zutrittskontrolleBCM.anforderungen.${key}.text`),
  }));

  const leistungenKeys = ["zutritt", "integration", "verwaltung"];
  const leistungen = leistungenKeys.map((key) => ({
    title: t(`funktionen.zutrittskontrolleBCM.leistungen.${key}.title`),
    items: t(`funktionen.zutrittskontrolleBCM.leistungen.${key}.items`, { returnObjects: true }) as string[],
  }));

  const data: AnwendungPageData = {
    label: t("funktionen.zutrittskontrolleBCM.label"),
    headline: t("funktionen.zutrittskontrolleBCM.headline"),
    intro: t("funktionen.zutrittskontrolleBCM.intro"),
    heroImage: "",
    description: t("funktionen.zutrittskontrolleBCM.description"),
    anforderungen,
    leistungen,
    verwandteAnwendungen: [
      { label: t("shared.verwandte.grossanlage"), href: "/anwendungen/grossanlage" },
      { label: t("shared.verwandte.behoerde"), href: "/anwendungen/behoerde" },
      { label: t("shared.verwandte.concierge"), href: "/anwendungen/concierge" },
      { label: t("shared.verwandte.mehrfamilienhaus"), href: "/anwendungen/mehrfamilienhaus" },
    ],
  };

  return <AnwendungDetailPage data={data} pageKey="anwendungen.zutrittskontrolle-bcm" />;
};

export default AccessControlBCMPage;
